import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { CAMPAIGNS, STAT_NAMES } from './campaign-data.js';
import {
  appendSessionEvent,
  loadRoomSnapshot,
  persistenceEnabled,
  roomSnapshotExists,
  scheduleRoomSave,
  flushRoomSave,
} from './persistence.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  serveClient: true,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 100_000,
});
const PORT = Number(process.env.PORT || 3000);
const APP_VERSION = '3.5.1';
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const TARGET_STORY = 20;
const MAX_THREAT = 8;
const ROOM_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

const rooms = new Map();
const loadLocks = new Map();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Chronicle-Version', APP_VERSION);
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});
app.use(express.static('public', {
  maxAge: 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.(?:html|js|css|svg)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));
app.use('/vendor', express.static('node_modules/three/build', { maxAge: '7d', immutable: true }));
app.get('/health', (_req, res) => res.json({
  ok: true,
  version: APP_VERSION,
  rooms: rooms.size,
  persistence: persistenceEnabled ? 'supabase' : 'memory',
  timestamp: new Date().toISOString(),
}));
app.get('/api/config', (_req, res) => res.json({
  version: APP_VERSION,
  persistence: persistenceEnabled,
  maxPlayers: MAX_PLAYERS,
  minPlayers: MIN_PLAYERS,
  targetStory: TARGET_STORY,
  maxThreat: MAX_THREAT,
}));

const rand = sides => crypto.randomInt(1, sides + 1);
const token = () => crypto.randomBytes(16).toString('hex');
const mod = value => Math.floor((Number(value || 10) - 10) / 2);
const roll4d6 = () => {
  const rolls = [rand(6), rand(6), rand(6), rand(6)].sort((a, b) => a - b);
  return { rolls, total: rolls[1] + rolls[2] + rolls[3] };
};
const sanitize = (value, max = 30) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  for (let i = 0; i < 5; i += 1) output += alphabet[crypto.randomInt(0, alphabet.length)];
  return output;
}

async function reserveRoomCode() {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const candidate = randomRoomCode();
    if (rooms.has(candidate)) continue;
    if (await roomSnapshotExists(candidate)) continue;
    return candidate;
  }
  throw new Error('고유한 방 코드를 생성하지 못했습니다.');
}

function campaignPublic() {
  return CAMPAIGNS.map(({ events, titles, ...campaign }) => ({
    ...campaign,
    eventCount: events.length,
  }));
}

function blankPlayerRuntime(player) {
  player.ready = false;
  player.job = null;
  player.abilities = null;
  player.hp = 0;
  player.maxHp = 0;
  player.inspiration = 0;
}

async function createRoom(hostName, socketId) {
  const roomCode = await reserveRoomCode();
  const player = {
    id: token(), socketId, name: hostName, host: true, connected: true,
    ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0,
  };
  const room = {
    code: roomCode,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    campaignId: null,
    phase: 'lobby',
    players: [player],
    deck: [], discard: [], currentEvent: null, activeChoice: null,
    choiceVotes: {},
    threat: 0, story: 0, dcPenalty: 0, monster: null,
    chat: [], lastResolution: null, ending: null,
    revision: 1, turnIndex: 0, abandonVote: null,
  };
  rooms.set(roomCode, room);
  return { room, player };
}

async function getOrLoadRoom(roomCode) {
  if (rooms.has(roomCode)) return rooms.get(roomCode);
  if (loadLocks.has(roomCode)) return loadLocks.get(roomCode);
  const promise = (async () => {
    const loaded = await loadRoomSnapshot(roomCode);
    if (loaded) rooms.set(roomCode, loaded);
    return loaded;
  })().finally(() => loadLocks.delete(roomCode));
  loadLocks.set(roomCode, promise);
  return promise;
}

function currentTurnPlayer(room) {
  if (!room?.players?.length) return null;
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : 0;
  const start = ((room.turnIndex % room.players.length) + room.players.length) % room.players.length;
  for (let step = 0; step < room.players.length; step += 1) {
    const index = (start + step) % room.players.length;
    const candidate = room.players[index];
    if (!candidate.connected) continue;
    if (room.phase !== 'lobby' && candidate.maxHp > 0 && candidate.hp <= 0) continue;
    room.turnIndex = index;
    return candidate;
  }
  room.turnIndex = start;
  return room.players[start] || room.players[0] || null;
}

function advanceTurn(room) {
  if (!room?.players?.length) return null;
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : -1;
  const start = room.turnIndex;
  for (let step = 1; step <= room.players.length; step += 1) {
    const index = (start + step + room.players.length) % room.players.length;
    const candidate = room.players[index];
    if (!candidate.connected) continue;
    if (room.phase !== 'lobby' && candidate.maxHp > 0 && candidate.hp <= 0) continue;
    room.turnIndex = index;
    return candidate;
  }
  return currentTurnPlayer(room);
}

function connectedPlayers(room) {
  return room.players.filter(player => player.connected);
}

function storyEligiblePlayers(room) {
  return room.players.filter(player => player.connected && player.hp > 0);
}

function publicRoom(room) {
  const campaign = CAMPAIGNS.find(c => c.id === room.campaignId);
  const turnPlayer = currentTurnPlayer(room);
  return {
    code: room.code,
    phase: room.phase,
    campaignId: room.campaignId,
    campaign: campaign ? {
      id: campaign.id, title: campaign.title, genre: campaign.genre,
      subtitle: campaign.subtitle, intro: campaign.intro, acts: campaign.acts,
      icon: campaign.icon, accent: campaign.accent, accent2: campaign.accent2,
      jobs: campaign.jobs, monsters: campaign.monsters, eventCount: campaign.events.length,
    } : null,
    players: room.players.map(p => ({
      id: p.id, name: p.name, host: p.host, connected: p.connected,
      ready: p.ready, job: p.job, abilities: p.abilities,
      hp: p.hp, maxHp: p.maxHp, inspiration: p.inspiration,
    })),
    deckCount: room.deck.length,
    discardCount: room.discard.length,
    currentEvent: room.currentEvent,
    activeChoice: room.activeChoice,
    choiceVotes: room.choiceVotes || {},
    turnIndex: room.turnIndex || 0,
    turnPlayerId: turnPlayer?.id || null,
    turnPlayerName: turnPlayer?.name || null,
    threat: room.threat,
    story: room.story,
    dcPenalty: room.dcPenalty,
    monster: room.monster,
    lastResolution: room.lastResolution || null,
    ending: room.ending || null,
    abandonVote: room.abandonVote || null,
    targetStory: TARGET_STORY,
    maxThreat: MAX_THREAT,
    revision: room.revision,
    chat: room.chat.slice(-120),
  };
}

function sync(room) {
  room.lastActiveAt = Date.now();
  room.revision = Number(room.revision || 0) + 1;
  io.to(room.code).emit('state', publicRoom(room));
  scheduleRoomSave(room);
}

function pushChat(room, entry) {
  room.chat.push({ id: token(), ts: Date.now(), ...entry });
  if (room.chat.length > 180) room.chat.splice(0, room.chat.length - 180);
}

function emitRoll(room, roller, roll) {
  io.to(room.code).emit('dice:roll', {
    rollerId: roller.id,
    rollerName: roller.name,
    ts: Date.now(),
    ...roll,
  });
}

function getPlayer(room, playerToken) {
  return room.players.find(player => player.id === playerToken);
}

function requireMember(socket, payload, ack) {
  const roomCode = String(payload?.roomCode || '').toUpperCase().trim();
  const room = rooms.get(roomCode);
  const player = room && getPlayer(room, payload?.playerToken);
  if (!room || !player) {
    ack?.({ ok: false, error: '방 또는 플레이어 정보가 올바르지 않습니다.' });
    return {};
  }
  if (player.socketId !== socket.id || !player.connected) {
    ack?.({ ok: false, error: '현재 연결과 플레이어 토큰이 일치하지 않습니다.' });
    return {};
  }
  return { room, player };
}

function requireHost(socket, payload, ack) {
  const result = requireMember(socket, payload, ack);
  if (!result.room) return {};
  if (!result.player.host) {
    ack?.({ ok: false, error: '방장만 할 수 있습니다.' });
    return {};
  }
  return result;
}

function requirePhase(room, phase, ack, message = '현재 단계에서는 할 수 없습니다.') {
  if (room.phase !== phase) {
    ack?.({ ok: false, error: message });
    return false;
  }
  return true;
}

function rateLimit(socket, key, intervalMs) {
  socket.data.rate ||= new Map();
  const now = Date.now();
  const last = socket.data.rate.get(key) || 0;
  if (now - last < intervalMs) return false;
  socket.data.rate.set(key, now);
  return true;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildDeck(campaign) {
  const deck = [];
  for (const event of campaign.events) {
    deck.push({ ...event, copy: 1 });
    deck.push({ ...event, copy: 2 });
  }
  return shuffle(deck);
}

function clearSceneState(room) {
  room.currentEvent = null;
  room.activeChoice = null;
  room.choiceVotes = {};
  room.lastResolution = null;
  room.monster = null;
}

function applyChoiceEffect(room, player, effect = {}) {
  switch (effect.type) {
    case 'threatDown': room.threat = Math.max(0, room.threat - (effect.amount || 1)); break;
    case 'threatUp': room.threat = Math.min(MAX_THREAT, room.threat + (effect.amount || 1)); break;
    case 'inspiration': player.inspiration = Math.min(3, player.inspiration + (effect.amount || 1)); break;
    case 'partyHeal':
      for (const member of room.players) member.hp = Math.min(member.maxHp, member.hp + (effect.amount || 1));
      break;
    case 'damage': player.hp = Math.max(0, player.hp - (effect.amount || 1)); break;
    case 'dcUp': room.dcPenalty = Math.min(2, room.dcPenalty + (effect.amount || 1)); break;
    case 'dcReset': room.dcPenalty = 0; break;
    case 'loseInspiration': {
      const holder = room.players.find(member => member.inspiration > 0);
      if (holder) holder.inspiration -= 1;
      break;
    }
    default: break;
  }
}

function evaluateEnding(room) {
  if (room.phase === 'ending') return true;
  const living = room.players.some(player => player.hp > 0);
  if (!living || room.threat >= MAX_THREAT) {
    room.phase = 'ending';
    room.ending = {
      victory: false,
      title: '연대기는 검은 잉크로 닫혔다.',
      text: !living
        ? '모든 영웅이 쓰러졌습니다. 하지만 실패 역시 다음 세션의 전설이 됩니다.'
        : '세계의 위협이 한계를 넘어섰습니다. 여러분의 선택이 만든 비극적인 결말입니다.',
    };
    clearSceneState(room);
    return true;
  }
  if (room.story >= TARGET_STORY) {
    room.phase = 'ending';
    room.ending = {
      victory: true,
      title: '당신들의 연대기가 완성되었다.',
      text: `총 ${room.story}개의 장면을 지나 결말에 도달했습니다. 남은 카드와 다른 선택지는 다음 플레이에서 새로운 이야기가 됩니다.`,
    };
    clearSceneState(room);
    return true;
  }
  return false;
}

function promoteHostIfNeeded(room) {
  const host = room.players.find(player => player.host);
  if (host?.connected) return;
  const next = room.players.find(player => player.connected);
  if (!next) return;
  for (const player of room.players) player.host = false;
  next.host = true;
  pushChat(room, { type: 'system', text: `${next.name} 님이 새 방장이 되었습니다.` });
}

function monsterForEvent(room, event) {
  const campaign = CAMPAIGNS.find(c => c.id === room.campaignId);
  const index = Math.max(0, campaign.monsters.indexOf(event.monster));
  const scale = Math.max(0, room.players.length - 2);
  const hp = 10 + index * 5 + scale * 4;
  return {
    name: event.monster,
    ac: 11 + index,
    hp,
    maxHp: hp,
    attackBonus: 2 + Math.floor(index / 2),
    round: 1,
    acted: [],
  };
}

function monsterTurn(room) {
  const living = room.players.filter(player => player.hp > 0 && player.connected);
  if (!room.monster || !living.length) return;
  const target = living[crypto.randomInt(0, living.length)];
  const roll = rand(20);
  const armor = 10 + mod(target.abilities?.민첩?.total || 10);
  const total = roll + room.monster.attackBonus;
  const hit = roll === 20 || (roll !== 1 && total >= armor);
  const damage = hit ? rand(4) + 1 : 0;
  if (hit) target.hp = Math.max(0, target.hp - damage);
  emitRoll(room, { id: 'gm-monster', name: room.monster.name }, {
    sides: 20,
    result: roll,
    purpose: `${target.name} 공격 · 방어 ${armor}`,
    kind: 'monster',
    total,
    dc: armor,
    success: hit,
    damage,
  });
  pushChat(room, {
    type: hit ? 'danger' : 'success',
    author: 'GM',
    text: hit
      ? `${room.monster.name}의 공격이 ${target.name}에게 ${damage} 피해를 입혔습니다.`
      : `${target.name}이 ${room.monster.name}의 공격을 피했습니다.`,
  });
  room.monster.acted = [];
  room.monster.round += 1;
}

function reconcileCombatRound(room) {
  if (room.phase !== 'combat' || !room.monster) return;
  const eligible = room.players.filter(player => player.connected && player.hp > 0).map(player => player.id);
  room.monster.acted = (room.monster.acted || []).filter(id => eligible.includes(id));
  if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) monsterTurn(room);
}

function finalizeChoiceSelection(room) {
  if (!room.currentEvent || room.activeChoice) return false;
  const eligible = storyEligiblePlayers(room);
  if (!eligible.length) return false;
  const counts = new Map();
  for (const player of eligible) {
    const voted = Number(room.choiceVotes?.[player.id]);
    const choice = room.currentEvent.choices[voted];
    if (!Number.isInteger(voted) || !choice) continue;
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) continue;
    counts.set(voted, (counts.get(voted) || 0) + 1);
  }
  if (!counts.size) return false;
  const highest = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, count]) => count === highest).map(([index]) => index).sort((a, b) => a - b);
  const turnActor = currentTurnPlayer(room) || eligible[0];
  const actorVote = Number(room.choiceVotes?.[turnActor.id]);
  const choiceIndex = tied.includes(actorVote) ? actorVote : tied[0];
  const choice = room.currentEvent.choices[choiceIndex];
  let actor = turnActor;
  if (choice.requiredJob) {
    actor = eligible.find(player => player.job?.name === choice.requiredJob && Number(room.choiceVotes?.[player.id]) === choiceIndex)
      || eligible.find(player => player.job?.name === choice.requiredJob);
    if (!actor) return false;
  }
  room.activeChoice = {
    playerId: actor.id,
    playerName: actor.name,
    choiceIndex,
    choice,
    voteCount: highest,
  };
  pushChat(room, {
    type: 'action',
    author: 'TABLE',
    text: choice.requiredJob
      ? `직업 전용 선택 「${choice.label}」 확정 · ${choice.requiredJob} ${actor.name}이(가) 행동합니다.`
      : `투표 결과 「${choice.label}」 선택 · 행동자 ${actor.name}`,
  });
  return true;
}

function resetToLobby(room, reasonText = '세션이 로비로 돌아갔습니다.') {
  room.phase = 'lobby';
  room.campaignId = null;
  room.deck = [];
  room.discard = [];
  room.threat = 0;
  room.story = 0;
  room.dcPenalty = 0;
  room.turnIndex = 0;
  room.abandonVote = null;
  room.ending = null;
  clearSceneState(room);
  for (const player of room.players) blankPlayerRuntime(player);
  pushChat(room, { type: 'system', text: reasonText });
}

function allConnectedApproved(room) {
  const approvals = new Set(room.abandonVote?.approvals || []);
  return connectedPlayers(room).every(player => approvals.has(player.id));
}

function resolveAbandonVoteIfReady(room) {
  if (!room.abandonVote) return false;
  if (!allConnectedApproved(room)) return false;
  resetToLobby(room, '참가자 전원의 동의로 현재 연대기를 포기하고 로비로 돌아왔습니다.');
  return true;
}

io.on('connection', socket => {
  socket.emit('campaigns', campaignPublic());

  socket.on('room:create', async (payload = {}, ack) => {
    try {
      const name = sanitize(payload.name || '방장', 18) || '방장';
      const { room, player } = await createRoom(name, socket.id);
      socket.join(room.code);
      pushChat(room, { type: 'system', text: `${name} 님이 방을 만들었습니다.` });
      scheduleRoomSave(room, 0);
      void appendSessionEvent(room.code, 'room_created', { hostName: name });
      ack?.({ ok: true, roomCode: room.code, playerToken: player.id, state: publicRoom(room) });
    } catch (error) {
      console.error('[room:create]', error);
      ack?.({ ok: false, error: '방 생성 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.' });
    }
  });

  socket.on('room:join', async (payload = {}, ack) => {
    const roomCode = String(payload.roomCode || '').toUpperCase().trim();
    if (!ROOM_PATTERN.test(roomCode)) return ack?.({ ok: false, error: '5자리 방 코드를 확인하세요.' });
    const room = await getOrLoadRoom(roomCode);
    if (!room) return ack?.({ ok: false, error: '존재하지 않거나 만료된 방입니다.' });

    const existing = payload.playerToken && getPlayer(room, payload.playerToken);
    if (existing) {
      const oldSocketId = existing.socketId;
      if (oldSocketId && oldSocketId !== socket.id) io.sockets.sockets.get(oldSocketId)?.leave(room.code);
      existing.socketId = socket.id;
      existing.connected = true;
      socket.join(room.code);
      pushChat(room, { type: 'system', text: `${existing.name} 님이 다시 연결되었습니다.` });
      promoteHostIfNeeded(room);
      reconcileCombatRound(room);
      resolveAbandonVoteIfReady(room);
      sync(room);
      void appendSessionEvent(room.code, 'player_reconnected', { playerName: existing.name });
      return ack?.({ ok: true, roomCode: room.code, playerToken: existing.id, state: publicRoom(room) });
    }

    if (room.players.length >= MAX_PLAYERS) return ack?.({ ok: false, error: '이 방은 이미 4명입니다.' });
    if (room.phase !== 'lobby') return ack?.({ ok: false, error: '이미 모험이 시작된 방입니다. 기존 플레이어만 재접속할 수 있습니다.' });
    const name = sanitize(payload.name || `플레이어 ${room.players.length + 1}`, 18) || `플레이어 ${room.players.length + 1}`;
    const player = {
      id: token(), socketId: socket.id, name, host: room.players.length === 0, connected: true,
      ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0,
    };
    room.players.push(player);
    socket.join(room.code);
    pushChat(room, { type: 'system', text: `${name} 님이 참가했습니다.` });
    sync(room);
    void appendSessionEvent(room.code, 'player_joined', { playerName: name });
    return ack?.({ ok: true, roomCode: room.code, playerToken: player.id, state: publicRoom(room) });
  });

  socket.on('room:leave', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (room.phase !== 'lobby') return ack?.({ ok: false, error: '모험 시작 후에는 나가더라도 재접속 슬롯이 유지됩니다.' });
    room.players = room.players.filter(member => member.id !== player.id);
    socket.leave(room.code);
    if (!room.players.length) {
      rooms.delete(room.code);
      return ack?.({ ok: true });
    }
    pushChat(room, { type: 'system', text: `${player.name} 님이 방을 나갔습니다.` });
    promoteHostIfNeeded(room);
    currentTurnPlayer(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('room:removePlayer', (payload, ack) => {
    const { room, player } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '로비에서만 플레이어를 정리할 수 있습니다.')) return;
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target) return ack?.({ ok: false, error: '플레이어를 찾을 수 없습니다.' });
    if (target.id === player.id) return ack?.({ ok: false, error: '자신은 EXIT 버튼으로 나갈 수 있습니다.' });
    if (target.connected) return ack?.({ ok: false, error: '접속 중인 플레이어는 강제로 제거할 수 없습니다.' });
    room.players = room.players.filter(member => member.id !== target.id);
    pushChat(room, { type: 'system', text: `${target.name} 님의 오프라인 슬롯을 정리했습니다.` });
    currentTurnPlayer(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('campaign:select', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '로비에서만 캠페인을 바꿀 수 있습니다.')) return;
    const campaign = CAMPAIGNS.find(item => item.id === payload.campaignId);
    if (!campaign) return ack?.({ ok: false, error: '캠페인을 찾을 수 없습니다.' });
    room.campaignId = campaign.id;
    room.turnIndex = 0;
    room.abandonVote = null;
    room.choiceVotes = {};
    for (const player of room.players) blankPlayerRuntime(player);
    room.ending = null;
    pushChat(room, { type: 'system', text: `캠페인이 「${campaign.title}」로 선택되었습니다.` });
    sync(room);
    void appendSessionEvent(room.code, 'campaign_selected', { campaignId: campaign.id });
    ack?.({ ok: true });
  });

  socket.on('player:classRoll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '캐릭터 생성은 로비에서만 가능합니다.')) return;
    if (!room.campaignId) return ack?.({ ok: false, error: '캠페인을 먼저 선택하세요.' });
    if (player.job) return ack?.({ ok: false, error: '현재 캠페인에서는 이미 직업을 배정받았습니다.' });
    if (!rateLimit(socket, 'class', 800)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    const result = rand(6);
    player.job = campaign.jobs[result - 1];
    player.hp = player.maxHp = player.job.baseHp;
    player.abilities = null;
    player.ready = false;
    emitRoll(room, player, { sides: 6, result, purpose: '직업 배정', kind: 'class' });
    sync(room);
    ack?.({ ok: true, result });
  });

  socket.on('player:statsRoll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '능력치 생성은 로비에서만 가능합니다.')) return;
    if (!player.job) return ack?.({ ok: false, error: '직업을 먼저 배정받으세요.' });
    if (player.abilities) return ack?.({ ok: false, error: '현재 캠페인에서는 이미 능력치를 생성했습니다.' });
    if (!rateLimit(socket, 'stats', 1000)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const abilities = {};
    for (const stat of STAT_NAMES) abilities[stat] = roll4d6();
    player.abilities = abilities;
    player.ready = true;
    emitRoll(room, player, { sides: 6, result: rand(6), purpose: '능력치 생성 · 4D6 × 6', kind: 'stats' });
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('game:start', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '이미 세션이 시작되었습니다.')) return;
    const connected = room.players.filter(player => player.connected);
    if (connected.length < MIN_PLAYERS) return ack?.({ ok: false, error: '접속 중인 플레이어가 최소 2명 필요합니다.' });
    if (room.players.some(player => !player.connected)) return ack?.({ ok: false, error: '오프라인 플레이어가 있습니다. 해당 플레이어가 재접속하거나 로비를 다시 만들어주세요.' });
    if (!room.campaignId) return ack?.({ ok: false, error: '캠페인을 선택하세요.' });
    if (room.players.some(player => !player.ready)) return ack?.({ ok: false, error: '모든 플레이어가 직업과 능력치를 완성해야 합니다.' });
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    room.phase = 'story';
    room.deck = buildDeck(campaign);
    room.discard = [];
    room.threat = 0;
    room.story = 0;
    room.dcPenalty = 0;
    room.choiceVotes = {};
    room.activeChoice = null;
    room.currentEvent = null;
    room.monster = null;
    room.lastResolution = null;
    room.ending = null;
    room.abandonVote = null;
    room.turnIndex = 0;
    currentTurnPlayer(room);
    pushChat(room, { type: 'narration', text: campaign.intro, author: 'GM' });
    sync(room);
    void appendSessionEvent(room.code, 'game_started', { campaignId: campaign.id, players: room.players.map(player => player.name) });
    ack?.({ ok: true });
  });

  socket.on('event:draw', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '지금은 이벤트를 뽑을 수 없습니다.')) return;
    if (room.currentEvent) return ack?.({ ok: false, error: '현재 이벤트를 먼저 해결하세요.' });
    if (!room.deck.length) {
      const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
      room.deck = buildDeck(campaign);
      room.discard = [];
    }
    const desiredAct = Math.min(5, 1 + Math.floor(room.story / 4));
    const candidates = room.deck.map((event, index) => ({ event, index })).filter(item => item.event.act === desiredAct);
    const picked = candidates.length ? candidates[crypto.randomInt(0, candidates.length)] : { index: room.deck.length - 1 };
    room.currentEvent = room.deck.splice(picked.index, 1)[0];
    room.activeChoice = null;
    room.choiceVotes = {};
    room.lastResolution = null;
    pushChat(room, { type: 'narration', author: 'GM', text: `${room.currentEvent.title} — ${room.currentEvent.text}` });
    sync(room);
    void appendSessionEvent(room.code, 'event_drawn', { eventId: room.currentEvent.id, title: room.currentEvent.title, copy: room.currentEvent.copy });
    ack?.({ ok: true });
  });

  socket.on('event:vote', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '현재 이벤트는 선택할 수 없는 상태입니다.')) return;
    if (!room.currentEvent) return ack?.({ ok: false, error: '진행 중인 이벤트가 없습니다.' });
    if (room.activeChoice) return ack?.({ ok: false, error: '이미 행동이 확정되었습니다.' });
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 투표할 수 없습니다.' });
    const choiceIndex = Number(payload.choiceIndex);
    const choice = room.currentEvent.choices[choiceIndex];
    if (!choice) return ack?.({ ok: false, error: '선택지가 올바르지 않습니다.' });
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) {
      return ack?.({ ok: false, error: `이 선택지는 ${choice.requiredJob}만 선택할 수 있습니다.` });
    }
    room.choiceVotes ||= {};
    room.choiceVotes[player.id] = choiceIndex;
    const eligible = storyEligiblePlayers(room);
    const everyoneVoted = eligible.length > 0 && eligible.every(member => Number.isInteger(Number(room.choiceVotes[member.id])));
    if (everyoneVoted) finalizeChoiceSelection(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('event:finalizeChoice', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '지금은 선택을 확정할 수 없습니다.')) return;
    if (!room.currentEvent) return ack?.({ ok: false, error: '진행 중인 이벤트가 없습니다.' });
    if (room.activeChoice) return ack?.({ ok: false, error: '이미 선택이 확정되었습니다.' });
    if (!finalizeChoiceSelection(room)) return ack?.({ ok: false, error: '먼저 한 개 이상의 투표가 필요합니다.' });
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('event:release', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack)) return;
    if (room.activeChoice && (player.host || room.activeChoice.playerId === player.id)) {
      room.activeChoice = null;
      room.choiceVotes = {};
      sync(room);
      return ack?.({ ok: true });
    }
    if (!room.activeChoice && player.host) {
      room.choiceVotes = {};
      sync(room);
      return ack?.({ ok: true });
    }
    return ack?.({ ok: false, error: '해제할 행동이 없습니다.' });
  });

  socket.on('event:roll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '이미 판정이 끝났습니다.')) return;
    if (!rateLimit(socket, 'check', 700)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const active = room.activeChoice;
    if (!active || active.playerId !== player.id) return ack?.({ ok: false, error: '이 판정의 행동자가 아닙니다.' });
    const ability = player.abilities?.[active.choice.stat];
    if (!ability) return ack?.({ ok: false, error: '능력치가 없습니다.' });

    const result = rand(20);
    const abilityMod = mod(ability.total);
    const total = result + abilityMod;
    const dc = active.choice.dc + room.dcPenalty;
    const success = result === 20 || (result !== 1 && total >= dc);
    emitRoll(room, player, {
      sides: 20, result, purpose: `${active.choice.stat} 판정 · DC ${dc}`,
      kind: 'check', stat: active.choice.stat, total, dc, success,
    });

    const effect = success ? active.choice.successEffect : active.choice.failureEffect;
    applyChoiceEffect(room, player, effect);
    if (success && !effect) {
      player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = 0;
    } else if (!success && !effect) {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, room.dcPenalty + 1);
    }

    room.lastResolution = {
      ok: success, result, total, dc,
      text: success ? active.choice.success : active.choice.failure,
      playerId: player.id,
    };
    room.phase = 'resolution';
    pushChat(room, {
      type: success ? 'success' : 'failure', author: player.name,
      text: `${result} ${abilityMod >= 0 ? '+' : ''}${abilityMod} = ${total} / DC ${dc} → ${success ? '성공' : '실패'}`,
    });
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 2200);
    ack?.({ ok: true });
  });

  socket.on('event:continue', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'resolution', ack, '계속할 결과가 없습니다.')) return;
    const event = room.currentEvent;
    if (event) room.discard.push(event);
    room.story += 1;
    room.currentEvent = null;
    room.activeChoice = null;
    room.choiceVotes = {};
    room.phase = 'story';
    advanceTurn(room);
    if (evaluateEnding(room)) {
      sync(room);
      return ack?.({ ok: true });
    }
    if (event?.monster) {
      room.monster = monsterForEvent(room, event);
      room.phase = 'combat';
      pushChat(room, { type: 'danger', author: 'GM', text: `${event.monster} 등장! 전투가 시작됩니다.` });
    }
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('combat:attack', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'combat', ack, '전투 중이 아닙니다.') || !room.monster) return;
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 공격할 수 없습니다.' });
    if (!player.connected) return ack?.({ ok: false, error: '오프라인 상태에서는 공격할 수 없습니다.' });
    if (room.monster.acted?.includes(player.id)) return ack?.({ ok: false, error: '이번 라운드에는 이미 행동했습니다.' });
    if (!rateLimit(socket, 'attack', 700)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });

    const stat = player.job?.prime || '근력';
    const bonus = mod(player.abilities?.[stat]?.total || 10);
    const result = rand(20);
    const total = result + bonus;
    const hit = result === 20 || (result !== 1 && total >= room.monster.ac);
    let damage = 0;
    if (hit) {
      damage = rand(6) + Math.max(0, bonus);
      if (result === 20) damage += rand(6);
      room.monster.hp = Math.max(0, room.monster.hp - damage);
    }
    room.monster.acted ||= [];
    room.monster.acted.push(player.id);

    emitRoll(room, player, {
      sides: 20, result, purpose: `${room.monster.name} 공격 · AC ${room.monster.ac}`,
      kind: 'attack', total, dc: room.monster.ac, success: hit, damage,
    });
    pushChat(room, {
      type: hit ? 'success' : 'failure', author: player.name,
      text: `${room.monster.name} 공격 ${hit ? `명중! ${damage} 피해` : '실패'}`,
    });

    const monsterName = room.monster.name;
    if (room.monster.hp <= 0) {
      pushChat(room, { type: 'success', author: 'GM', text: `${monsterName}이(가) 쓰러졌습니다.` });
      room.monster = null;
      room.phase = 'story';
      room.threat = Math.max(0, room.threat - 1);
    } else {
      const eligible = room.players.filter(member => member.connected && member.hp > 0).map(member => member.id);
      if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) monsterTurn(room);
    }

    evaluateEnding(room);
    sync(room);
    void appendSessionEvent(room.code, 'combat_attack', { playerName: player.name, monster: monsterName, roll: result, hit, damage });
    ack?.({ ok: true });
  });

  socket.on('chat:send', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (!rateLimit(socket, 'chat', 250)) return ack?.({ ok: false, error: '메시지를 너무 빠르게 보내고 있습니다.' });
    const text = sanitize(payload.text, 240);
    if (!text) return ack?.({ ok: false, error: '메시지가 비어 있습니다.' });
    pushChat(room, { type: player.host && payload.narration ? 'narration' : 'chat', author: player.name, text });
    io.to(room.code).emit('chat:new', room.chat[room.chat.length - 1]);
    scheduleRoomSave(room);
    ack?.({ ok: true });
  });

  socket.on('game:abandonRequest', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (room.phase === 'lobby') return ack?.({ ok: false, error: '이미 로비입니다.' });
    room.abandonVote = {
      requestedBy: player.id,
      requestedByName: player.name,
      approvals: [player.id],
      requestedAt: Date.now(),
    };
    pushChat(room, { type: 'system', text: `${player.name} 님이 연대기 포기 투표를 시작했습니다. ESC 안내서에서 찬반을 선택하세요.` });
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('game:abandonRespond', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (!room.abandonVote) return ack?.({ ok: false, error: '진행 중인 포기 투표가 없습니다.' });
    const approve = payload?.approve !== false;
    if (!approve) {
      pushChat(room, { type: 'system', text: `${player.name} 님이 포기 투표를 거절했습니다. 현재 연대기를 계속 진행합니다.` });
      room.abandonVote = null;
      sync(room);
      return ack?.({ ok: true });
    }
    const approvals = new Set(room.abandonVote.approvals || []);
    approvals.add(player.id);
    room.abandonVote.approvals = [...approvals];
    if (resolveAbandonVoteIfReady(room)) {
      sync(room);
      return ack?.({ ok: true, reset: true });
    }
    sync(room);
    return ack?.({ ok: true });
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.find(member => member.socketId === socket.id);
      if (!player) continue;
      player.connected = false;
      player.socketId = null;
      pushChat(room, { type: 'system', text: `${player.name} 님의 연결이 끊겼습니다.` });
      promoteHostIfNeeded(room);
      reconcileCombatRound(room);
      resolveAbandonVoteIfReady(room);
      sync(room);
      break;
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms) {
    if (room.players.every(player => !player.connected) && now - (room.lastActiveAt || room.createdAt) > 1000 * 60 * 60 * 12) rooms.delete(roomCode);
  }
}, 1000 * 60 * 30).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chronicle Gate Online running on 0.0.0.0:${PORT} · persistence=${persistenceEnabled ? 'supabase' : 'memory'}`);
});

let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal}: flushing ${rooms.size} room snapshot(s)`);
  const forceTimer = setTimeout(() => process.exit(1), 9_000);
  forceTimer.unref();
  try {
    await Promise.allSettled([...rooms.values()].map(room => flushRoomSave(room)));
  } finally {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_500).unref();
  }
}
process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => void gracefulShutdown('SIGINT'));
