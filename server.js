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
const APP_VERSION = '4.6.0-branching-scenes.0';
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 1;
const TARGET_STORY = 25;
const MAX_THREAT = 8;
const EVENT_EVERY_TURNS = 3;
const VOTE_DURATION_MS = 20_000;
const ROOM_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

const rooms = new Map();
const loadLocks = new Map();
const voteTimers = new Map();
const bossTurnTimers = new Map();

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
  uptimeSeconds: Math.floor(process.uptime()),
  release: 'release-candidate',
}));
app.get('/api/config', (_req, res) => res.json({
  version: APP_VERSION,
  persistence: persistenceEnabled,
  maxPlayers: MAX_PLAYERS,
  minPlayers: MIN_PLAYERS,
  targetStory: TARGET_STORY,
  maxThreat: MAX_THREAT,
  eventEveryTurns: EVENT_EVERY_TURNS,
  voteDurationMs: VOTE_DURATION_MS,
  soloVoteDurationMs: 5000,
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
  player.statuses = [];
  player.skillState = { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
}

function normalizeLoadedRoom(room) {
  if (!room) return room;
  room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0);
  room.turnSerial = Number(room.turnSerial || 0);
  room.nextCheckDcReduction = Number(room.nextCheckDcReduction || 0);
  room.threatShield = Number(room.threatShield || 0);
  for (const player of room.players || []) {
    player.skillState ||= { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
    player.statuses ||= [];
  }
  room.pendingTurnAdvance = Boolean(room.pendingTurnAdvance);
  room.voteEndsAt ||= null;
  room.choiceVotes ||= {};
  room.storyHistory ||= [];
  room.lastStoryAction ||= null;
  room.storyFlags ||= {};
  room.storyMemory ||= {};
  room.pathTotals ||= { truth: 0, survival: 0, bond: 0 };
  room.pendingContinue ||= null;
  room.failureCount = Number(room.failureCount || 0);
  room.prologue ||= null;
  const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
  if (!campaign || room.phase === 'lobby') {
    room.schemaVersion = APP_VERSION;
    return room;
  }

  const byId = new Map(campaign.events.map(event => [event.id, event]));
  const used = new Set((room.discard || []).map(event => event?.id).filter(Boolean));
  if (room.currentEvent?.id) used.add(room.currentEvent.id);
  const uniqueDeckIds = [];
  for (const oldEvent of room.deck || []) {
    if (!oldEvent?.id || used.has(oldEvent.id) || uniqueDeckIds.includes(oldEvent.id) || !byId.has(oldEvent.id)) continue;
    uniqueDeckIds.push(oldEvent.id);
  }
  room.deck = uniqueDeckIds.map(id => ({ ...byId.get(id) }));
  room.discard = [...new Set((room.discard || []).map(event => event?.id).filter(id => id && byId.has(id)))].map(id => ({ ...byId.get(id) }));
  if (room.currentEvent?.id && byId.has(room.currentEvent.id)) {
    room.currentEvent = { ...byId.get(room.currentEvent.id) };
    if (room.activeChoice) {
      const choiceIndex = Number(room.activeChoice.choiceIndex);
      const choice = room.currentEvent.choices[choiceIndex];
      if (choice) room.activeChoice = { ...room.activeChoice, choice };
      else room.activeChoice = null;
    }
    if (!room.activeChoice && room.phase === 'story' && !room.voteEndsAt) {
      const connectedCount = (room.players || []).filter(player => player.connected).length;
      room.voteEndsAt = Date.now() + (connectedCount <= 1 ? 5000 : VOTE_DURATION_MS);
    }
  }
  room.schemaVersion = APP_VERSION;
  return room;
}

async function createRoom(hostName, socketId) {
  const roomCode = await reserveRoomCode();
  const player = {
    id: token(), socketId, name: hostName, host: true, connected: true,
    ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0, statuses: [], skillState: { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 },
  };
  const room = {
    code: roomCode,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    campaignId: null,
    phase: 'lobby',
    players: [player],
    deck: [], discard: [], currentEvent: null, activeChoice: null,
    choiceVotes: {}, voteEndsAt: null,
    mainTurnsSinceEvent: 0, pendingTurnAdvance: false, turnSerial: 0, nextCheckDcReduction: 0, threatShield: 0,
    threat: 0, story: 0, dcPenalty: 0, monster: null,
    storyFlags: {}, storyMemory: {}, pathTotals: { truth: 0, survival: 0, bond: 0 }, pendingContinue: null, failureCount: 0,
    prologue: null,
    chat: [], lastResolution: null, ending: null,
    revision: 1, turnIndex: 0, abandonVote: null, schemaVersion: APP_VERSION,
  };
  rooms.set(roomCode, room);
  return { room, player };
}

async function getOrLoadRoom(roomCode) {
  if (rooms.has(roomCode)) return rooms.get(roomCode);
  if (loadLocks.has(roomCode)) return loadLocks.get(roomCode);
  const promise = (async () => {
    const loaded = await loadRoomSnapshot(roomCode);
    if (loaded) { normalizeLoadedRoom(loaded); rooms.set(roomCode, loaded); armVoteTimer(loaded); }
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

const STORY_STATUS_DEFS = {
  '지능': { key:'confused', label:'혼란', desc:'정보가 엉키며 판단이 흔들립니다.', checkPenalty:2, stats:['지능','지혜'], attackPenalty:0, duration:2 },
  '지혜': { key:'shaken', label:'동요', desc:'불길한 징후가 계속 떠올라 집중이 흐려집니다.', checkPenalty:2, stats:['지혜','매력'], attackPenalty:0, duration:2 },
  '민첩': { key:'sprain', label:'발목 부상', desc:'움직임이 둔해져 재빠른 대응이 어렵습니다.', checkPenalty:2, stats:['민첩','근력'], attackPenalty:1, duration:2 },
  '근력': { key:'bruise', label:'타박상', desc:'정면 돌파의 여파로 몸이 무거워졌습니다.', checkPenalty:1, stats:['근력'], attackPenalty:1, duration:2 },
  '체력': { key:'fatigue', label:'탈진', desc:'거친 장면의 부담으로 기력이 크게 소모됐습니다.', checkPenalty:1, stats:['근력','민첩','체력','지능','지혜','매력'], attackPenalty:1, duration:2 },
  '매력': { key:'suspected', label:'의심받음', desc:'말실수의 여파로 사람들의 경계가 강해졌습니다.', checkPenalty:2, stats:['매력'], attackPenalty:0, duration:2 },
};

function activeStatuses(room, player) {
  return (player?.statuses || [])
    .filter(status => Number(status.expiresAtStory || 0) > Number(room?.story || 0))
    .map(status => ({ ...status, remainingScenes: Math.max(0, Number(status.expiresAtStory || 0) - Number(room?.story || 0)) }));
}

function statusPenaltyForCheck(room, player, stat) {
  return activeStatuses(room, player).reduce((sum, status) => {
    if (!status.stats?.length || status.stats.includes(stat)) return sum - Number(status.checkPenalty || 0);
    return sum;
  }, 0);
}

function statusPenaltyForAttack(room, player, stat) {
  return activeStatuses(room, player).reduce((sum, status) => {
    const hitByStat = !status.stats?.length || status.stats.includes(stat);
    return sum - Number(hitByStat ? (status.attackPenalty || 0) : 0);
  }, 0);
}

function applyStatus(player, status) {
  player.statuses ||= [];
  const existing = player.statuses.find(item => item.key === status.key);
  if (existing) {
    existing.expiresAtStory = Math.max(Number(existing.expiresAtStory || 0), Number(status.expiresAtStory || 0));
    existing.checkPenalty = Math.max(Number(existing.checkPenalty || 0), Number(status.checkPenalty || 0));
    existing.attackPenalty = Math.max(Number(existing.attackPenalty || 0), Number(status.attackPenalty || 0));
    existing.desc = status.desc;
    existing.stats = status.stats;
    return existing;
  }
  player.statuses.push(status);
  return status;
}

function storyFailureStatus(choice, room) {
  const template = STORY_STATUS_DEFS[choice?.stat] || STORY_STATUS_DEFS['체력'];
  return {
    id: token(),
    key: template.key,
    label: template.label,
    desc: template.desc,
    checkPenalty: template.checkPenalty,
    attackPenalty: template.attackPenalty,
    stats: [...(template.stats || [])],
    expiresAtStory: Number(room.story || 0) + Number(template.duration || 2) + 1,
  };
}

function dominantStoryPath(room) {
  const totals = room?.pathTotals || {};
  const ranked = Object.entries({ truth: 0, survival: 0, bond: 0, ...totals }).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || 'truth';
}

function buildVictoryEnding(room) {
  const alias = room.storyMemory?.alias;
  const motive = room.storyMemory?.motive;
  const path = dominantStoryPath(room);
  const finalBranch = room.storyFlags?.act5 || room.storyFlags?.act4 || 'careful';
  const titles = {
    truth: { careful:'진실을 끝까지 밝혀낸 연대기', bold:'거친 돌파 끝에 진실을 움켜쥔 연대기', empathetic:'사람을 지키며 진실을 밝힌 연대기' },
    survival: { careful:'살아남기 위해 끝까지 버틴 연대기', bold:'끝끝내 돌파해 낸 연대기', empathetic:'서로를 살리며 돌파한 연대기' },
    bond: { careful:'신뢰를 지켜 낸 연대기', bold:'결단으로 동료를 지켜 낸 연대기', empathetic:'서로를 붙든 연대의 연대기' },
  };
  const summaries = {
    truth: '치밀하게 단서를 엮고 거짓을 걷어내며 결말까지 도달했습니다.',
    survival: '상처와 실패를 끌어안고도 한 걸음씩 밀고 나가 결말을 완성했습니다.',
    bond: '사람과 사람 사이의 약속, 설득, 신뢰를 붙들며 세계의 끝까지 나아갔습니다.',
  };
  const failures = Number(room.failureCount || 0);
  const branchNote = finalBranch === 'empathetic'
    ? '마지막에는 설득과 공감이 닫혀 있던 길을 열었습니다.'
    : finalBranch === 'bold'
      ? '마지막 막에서는 망설임보다 결단과 돌파가 더 큰 흔적을 남겼습니다.'
      : '마지막 막에서는 차분한 판단과 축적한 단서가 결말의 균형을 잡았습니다.';
  const routeTrail = ['act1','act2','act3','act4','act5']
    .map(key => room.storyFlags?.[key])
    .filter(Boolean)
    .map(flag => flag === 'bold' ? '돌파' : flag === 'empathetic' ? '신뢰' : '추적');
  return {
    victory: true,
    title: alias ? `「${alias}」 일행의 ${titles[path]?.[finalBranch] || titles[path]?.careful}` : (titles[path]?.[finalBranch] || titles[path]?.careful),
    text: `${summaries[path]} ${motive ? `그리고 파티는 끝까지 “${motive}”라는 이유를 놓지 않았습니다. ` : ''}${branchNote} ${routeTrail.length ? `이번 여정은 ${routeTrail.join(' → ')}의 흐름으로 이어졌고,` : ''} 총 ${room.story}개의 장면을 지나 선택의 흔적이 엔딩에 남았습니다. ${failures >= 6 ? `수많은 실패와 상태이상을 견디며 도착한 만큼, 이 결말은 상처 입은 생존자들의 결말이기도 합니다.` : failures >= 3 ? `몇 번의 큰 실패가 있었고 그 흔적이 마지막 선택의 무게를 키웠습니다.` : `큰 실패를 최소화하며 비교적 온전한 상태로 결말에 도착했습니다.`}`,
  };
}


const ROUTE_META = {
  careful: { name:'추적 루트', short:'단서를 쌓아 진실로 접근', color:'TRUTH' },
  bold: { name:'돌파 루트', short:'위험을 감수하고 주도권 확보', color:'FORCE' },
  empathetic: { name:'신뢰 루트', short:'사람과 존재의 협력을 얻어 접근', color:'BOND' },
};

const WORLD_ROUTE_WORDS = {
  ember: { threat:'왕관의 의지와 죽은 기사들', ally:'사제·주민·왕가의 증언자', medium:'재와 봉인의 흔적' },
  neon: { threat:'도시 감시망과 MOTHER-9의 추적', ally:'시민·기억 거래자·내부 협력자', medium:'삭제 로그와 기억 조각' },
  abyss: { threat:'심해 신호와 무너지는 기지', ally:'생존자·승무원·탈라스의 반응', medium:'소나·압력·생체 기록' },
  clock: { threat:'루프와 열세 번째 종의 압박', ally:'루프를 기억하는 시민과 종지기의 흔적', medium:'시간 오차와 사라진 기록' },
  wild: { threat:'뒤틀린 숲과 별빛의 포식', ally:'부족·야수·숲의 정령', medium:'별가루·뿌리·꿈의 흔적' },
};

function branchTransitionText(campaign, beat, prev) {
  if (!prev?.branchValue) return null;
  const route = prev.branchValue;
  const words = WORLD_ROUTE_WORDS[campaign?.id] || WORLD_ROUTE_WORDS.ember;
  const choice = prev.declaration || '이전 선택';
  const success = prev.success !== false;
  if (route === 'careful') {
    return success
      ? `직전 장면에서 “${choice}”를 택한 덕분에 ${words.medium}이 서로 이어졌다. 파티는 남들이 놓친 순서를 붙잡은 채 다음 현장에 도착한다. 이번 장면은 우연히 이어진 것이 아니라, 방금 확보한 단서가 직접 이곳을 가리킨 결과다.`
      : `직전 장면에서 “${choice}”를 시도했지만 해석이 어긋났다. 잘못 짚은 단서 하나 때문에 파티는 한 번 돌아왔고, 그 사이 ${words.threat}이 먼저 움직였다. 다음 장면은 같은 출발점이 아니다. 부족한 정보를 메우면서 동시에 뒤처진 시간을 되찾아야 한다.`;
  }
  if (route === 'bold') {
    return success
      ? `직전 장면에서 “${choice}”로 판을 강하게 흔든 결과, ${words.threat}이 예상보다 빨리 반응했다. 대신 파티가 주도권을 쥐었다. 다음 장면은 조용한 조사보다 추격과 대치가 앞서는 흐름으로 바뀐다.`
      : `직전 장면의 “${choice}”는 길을 열었지만 너무 큰 소리를 냈다. ${words.threat}이 파티의 위치와 방식까지 알아챘고, 다음 장면은 준비된 함정 속에서 시작된다. 성공했을 때와 같은 길이지만 난이도와 분위기는 완전히 달라졌다.`;
  }
  return success
    ? `직전 장면에서 “${choice}”를 통해 ${words.ally}의 마음을 얻었다. 그들이 건넨 정보와 도움 덕분에 원래는 닫혀 있었을 길이 열린다. 다음 장면은 혼자 힘으로 밀어붙이는 이야기가 아니라, 얻어낸 신뢰를 어떻게 사용할지에 달려 있다.`
    : `직전 장면에서 “${choice}”를 시도했지만 신뢰를 완전히 얻지 못했다. ${words.ally}은(는) 중요한 사실 하나를 감췄고, 그 빈틈이 다음 장면의 위험으로 돌아온다. 이제 파티는 불완전한 협력 속에서 누구를 믿을지 다시 판단해야 한다.`;
}

function branchCliffhanger(campaign, beat, prev) {
  const route = prev?.branchValue || 'careful';
  const phase = beat?.phase || '장면';
  const actEnd = phase === '결단';
  const world = campaign?.id;
  const hooks = {
    ember: actEnd ? '그리고 성문 너머에서, 아직 등장하지 않았어야 할 왕의 종이 한 번 울린다.' : '그 순간 재 속에서 금속이 긁히는 소리가 난다. 누군가 파티보다 먼저 다음 봉인을 건드렸다.',
    neon: actEnd ? '새 좌표가 화면에 뜬다. 문제는 그 좌표의 접속자 이름이 파티 중 한 사람과 같다는 것이다.' : '곧이어 삭제된 로그 한 줄이 복구된다. 발신 시각은 아직 오지 않은 미래다.',
    abyss: actEnd ? '상승용 통신기에 짧은 목소리가 잡힌다. 구조 요청이 아니라, 파티의 이름을 부르는 음성이다.' : '소나 화면 한쪽에 지금까지 없던 거대한 반향이 천천히 돌아선다.',
    clock: actEnd ? '종이 멈춘 뒤에도 그림자 하나만 계속 움직인다. 그것은 다음 루프를 이미 알고 있는 사람의 그림자다.' : '벽시계의 초침이 한 칸 역행하고, 방금 사라진 문장이 다른 내용으로 돌아온다.',
    wild: actEnd ? '숲 위의 마지막 별이 한 번 크게 흔들리고, 전혀 다른 방향의 길이 열리기 시작한다.' : '나무들이 동시에 숨을 멈춘 듯 조용해지고, 멀리서 한 번도 듣지 못한 울음소리가 번진다.',
  };
  const routeTail = route === 'bold' ? '이번엔 기다릴 시간이 없다.' : route === 'empathetic' ? '누군가가 그 신호에 먼저 답하려 한다.' : '방금 모은 단서가 그 방향과 정확히 겹친다.';
  return `${hooks[world] || hooks.ember} ${routeTail}`;
}

function applyBranchToChoices(beat, prev) {
  if (!prev?.branchValue || !Array.isArray(beat.choices)) return;
  const route = prev.branchValue;
  const failed = prev.success === false;
  beat.choices = beat.choices.map(choice => {
    const next = { ...choice };
    if (choice.branchValue === route) {
      next.dc = Math.max(8, Number(next.dc || 10) - (failed ? 0 : 1));
      next.detail = `${failed ? '이전 시도가 꼬여 위험하지만, 같은 방식의 흐름을 이어간다.' : '이전 선택의 흐름을 이어가므로 준비된 이점이 있다.'} ${next.detail || ''}`;
    } else if (failed) {
      next.dc = Number(next.dc || 10) + 1;
      next.detail = `직전 실패의 여파로 접근 방식을 바꾸는 데 추가 부담이 있다. ${next.detail || ''}`;
    }
    return next;
  });
}

function renderedStoryBeat(room, campaign) {
  const base = campaign?.storyBeats?.[Math.min(Math.max(0, Number(room.story || 0)), TARGET_STORY - 1)];
  if (!base) return null;
  const beat = JSON.parse(JSON.stringify(base));
  const history = room.storyHistory || [];
  const prev = history[history.length - 1];
  const route = prev?.branchValue || room.storyFlags?.[`act${beat.act}`] || 'careful';
  const routeMeta = ROUTE_META[route] || ROUTE_META.careful;
  const transition = branchTransitionText(campaign, beat, prev);
  const lingering = room.players.flatMap(member => activeStatuses(room, member).map(status => `${member.name}: ${status.label}`));

  const paragraphs = [];
  if (beat.chapter === 1 && room.storyMemory?.prologueMeeting) paragraphs.push(room.storyMemory.prologueMeeting);
  if (transition) paragraphs.push(transition);
  paragraphs.push(beat.situation || beat.text || '');
  if (lingering.length) paragraphs.push(`이전 선택의 상처도 사라지지 않았다. ${lingering.slice(0, 3).join(', ')}${lingering.length > 3 ? ' 외' : ''}. 이 상태는 이번 판정과 전투에도 실제 영향을 준다.`);

  beat.route = { key:route, ...routeMeta, previousSuccess: prev?.success ?? null };
  beat.title = `${beat.title} · ${routeMeta.name}`;
  beat.situation = paragraphs.filter(Boolean).join('\n\n');
  beat.text = beat.situation;
  beat.objective = `${beat.objective} 현재는 ${routeMeta.short} 흐름으로 이야기가 진행 중이다.`;
  beat.why = prev?.success === false
    ? `${beat.why} 직전 실패 때문에 같은 장면이라도 더 불리한 조건과 새로운 후유증을 안고 시작한다.`
    : `${beat.why} 직전 선택에서 얻은 이점이 이번 장면의 접근법과 난이도를 바꾼다.`;
  beat.continuityHook = branchCliffhanger(campaign, beat, prev);
  beat.visual = `${beat.visual} · ${routeMeta.name}${prev?.success === false ? ' · 실패 여파' : ''}`;
  applyBranchToChoices(beat, prev);
  return beat;
}


const PROLOGUE_META = {
  ember: {
    opening: '왕이 죽은 뒤 잿빛 성채 전체가 장례의 연기와 음모의 속삭임으로 뒤덮였다.',
    places: { 근력:'무너진 외성의 성문', 지능:'불탄 기록 보관실', 지혜:'왕가 예배당의 낡은 회랑', 민첩:'봉인된 왕묘 외벽', 매력:'장례객이 모인 추도 홀', 체력:'검은 숲과 맞닿은 성벽 초소' },
    hooks: {
      근력:'흩어진 경비대를 추슬러 장송 행렬을 지키는 동안, 누군가가 왕관의 봉인을 노리고 있다는 소문을 듣는다.',
      지능:'타버린 장부 속에서 왕관 계승자와 관련된 지워진 기록 한 줄을 복원한다.',
      지혜:'성흔이 남은 바닥과 향 냄새 속에서 누군가 의도적으로 의식을 어지럽혔다는 사실을 직감한다.',
      민첩:'도굴꾼의 흔적을 쫓다 왕묘 깊숙한 곳으로 통하는 샛길을 먼저 발견한다.',
      매력:'슬픔에 젖은 귀족과 사제들 사이를 오가며 모두가 감추는 불안의 정체를 읽어 낸다.',
      체력:'성벽 아래 검은 숲에서 올라온 짐승의 발자국이 장례일 밤의 소란과 이어진다는 사실을 붙잡는다.',
    },
    meet: '장례의 종이 세 번 울리자, 서로 다른 길을 걷던 이들은 모두 잿빛 성채의 봉인실 앞으로 불려 온다. 각자가 쥔 단서가 마침내 하나의 왕관을 가리킨다.',
  },
  neon: {
    opening: '네온 비가 쏟아지는 2099년, 도시 전체가 지워진 기억 조각과 불법 데이터 거래로 술렁이고 있었다.',
    places: { 근력:'하층 구역 검문소', 지능:'암호화 서버실', 지혜:'응급 진료 스테이션', 민첩:'드론 이착륙 옥상', 매력:'기억 경매장 로비', 체력:'추적망이 얽힌 뒷골목' },
    hooks: {
      근력:'폭주 직전의 치안 드론 떼를 막아 세우다 누군가 도시의 핵심 기억을 훔쳤다는 경보를 듣는다.',
      지능:'잠긴 백업 노드 안에서 삭제된 시민 기록과 이어지는 백도어를 발견한다.',
      지혜:'패닉에 빠진 시민들을 진정시키며 이 사건이 단순 사고가 아니라 계획된 조작임을 알아차린다.',
      민첩:'원격 시야로 좇은 이상 신호가 동일한 허브 좌표로 수렴한다는 사실을 먼저 포착한다.',
      매력:'거래장 한복판에서 모두가 부정하는 공포와 욕망을 읽고, 사건의 배후가 거래자들 사이에 숨어 있음을 감지한다.',
      체력:'추적팀의 포위를 피해 달리며, 잃어버린 데이터 조각이 사람 목숨과 직결된다는 진실에 닿는다.',
    },
    meet: '서로 다른 네트워크를 뒤지던 이들은 버려진 메모리 허브에서 같은 좌표를 가리키는 로그를 맞대게 된다. 그 순간, 개인 의뢰는 도시 전체의 사건으로 바뀐다.',
  },
  abyss: {
    opening: '심해 관측 기지가 마지막 구조 신호를 보낸 뒤, 바다는 유난히 조용했고 그 침묵이 더 불길했다.',
    places: { 근력:'침수된 갑판 통로', 지능:'생체 표본 연구실', 지혜:'소나 관측실', 민첩:'잠수정 정비 베이', 매력:'응급 격리 병동', 체력:'감압 게이트 앞' },
    hooks: {
      근력:'기울어진 통로에서 부상자를 끌어내며, 무언가가 내부에서 문을 두드렸다는 증언을 듣는다.',
      지능:'비정상적으로 변형된 표본을 분석하다 기지 심부에서 온 생체 반응을 확인한다.',
      지혜:'모니터에 겹쳐 찍힌 반향 속에서 구조 요청이 조작되었을 가능성을 읽어 낸다.',
      민첩:'망가진 잠수정 배선을 잇는 동안, 외부 도킹 라인에 누군가 손댄 흔적을 찾아낸다.',
      매력:'공포에 질린 생존자를 안정시키며 그들이 끝내 말하지 못한 금지 구역의 이름을 듣게 된다.',
      체력:'감압실을 버티며 압력 이상을 막던 중, 바깥이 아니라 안쪽에서 재난이 시작됐음을 깨닫는다.',
    },
    meet: '비상 조명이 깜빡이는 중앙 수문 앞, 각 구역에서 살아 돌아온 이들이 구조 지도를 펼친다. 흩어진 보고가 하나로 연결되며 등대의 진짜 비밀이 드러나기 시작한다.',
  },
  clock: {
    opening: '13번째 종이 울린 밤, 시계탑 도시는 한순간씩 어긋난 시간 때문에 같은 공포를 되풀이하고 있었다.',
    places: { 근력:'시계탑 하부 검문 회랑', 지능:'톱니 장치실', 지혜:'시간 기록 보관소', 민첩:'루프 경계 골목', 매력:'예언 낭독실', 체력:'종소리 감시 발코니' },
    hooks: {
      근력:'되감기 직전의 폭주자를 제압하며 누군가 의도적으로 루프를 연장하고 있다는 흔적을 본다.',
      지능:'멈춰 선 기어를 맞추다 정상 시간과 다른 각도로 돌아가는 숨은 축을 발견한다.',
      지혜:'사라졌다 나타나는 기록 조각을 읽고, 반복되는 밤마다 한 문장씩 바뀌는 예언을 포착한다.',
      민첩:'시간이 얇아진 골목을 빠져나오며 금지된 방으로 향하는 가장 빠른 길을 기억해 낸다.',
      매력:'예언을 두려워하는 사람들의 목소리에서 그들이 감춘 죄책감과 바람을 길어 올린다.',
      체력:'매번 더 세게 울리는 종소리를 버티며, 도시 전체를 잠식하는 루프의 진동을 몸으로 느낀다.',
    },
    meet: '종이 열세 번 울리는 정확한 시각, 서로 다른 시간 조각을 쥔 이들이 시계탑 중심의 회합실에서 한자리에 모인다. 각자의 기억이 겹치며 루프의 진짜 입구가 열린다.',
  },
  wild: {
    opening: '하늘의 별 하나가 숲 깊숙이 떨어진 뒤, 나무와 짐승, 꿈과 현실의 경계가 서서히 뒤틀리기 시작했다.',
    places: { 근력:'별철 대장간의 불꽃 앞', 지능:'꿈길과 겹친 수풀 공터', 지혜:'거대한 고목의 뿌리 아래', 민첩:'별빛이 내려앉은 사냥 길목', 매력:'야수들이 모이는 샘터', 체력:'운석 충돌 지대의 가장자리' },
    hooks: {
      근력:'부서진 별철을 두드리다 숲의 심장부로 이어지는 이상 진동을 감지한다.',
      지능:'꿈과 현실이 엇갈린 흔적을 쫓다 같은 장소를 두 개의 방식으로 기억하게 된다.',
      지혜:'수목의 낮은 속삭임에서 별을 삼킨 존재가 깨어나고 있다는 경고를 듣는다.',
      민첩:'별가루가 남긴 발자국을 따라가며 누구보다 먼저 변화의 중심을 포착한다.',
      매력:'경계하던 야수들을 달래는 동안 그들이 두려워하는 그림자의 방향을 알아낸다.',
      체력:'운석 파편의 독한 기운을 버텨 내며 숲을 삼키는 병이 어디서 시작됐는지 찾는다.',
    },
    meet: '숲 한가운데 별빛이 스며든 제단에서, 서로 다른 징조를 따라온 이들이 결국 한 원을 그리며 만난다. 각자의 목격담이 합쳐지는 순간, 숲 전체의 상처가 모습을 드러낸다.',
  },
};

function buildPlayerPrologue(campaign, player) {
  const job = player?.job || {};
  const meta = PROLOGUE_META[campaign?.id] || PROLOGUE_META.ember;
  const prime = job.prime || '지혜';
  const place = meta.places?.[prime] || Object.values(meta.places || {})[0] || '낯선 현장';
  const hook = meta.hooks?.[prime] || '작은 단서는 더 큰 사건의 문을 연다.';
  const skillName = job.skillDef?.name || (job.skill ? job.skill.split(':')[0] : '고유 기술');
  const paragraphA = `${meta.opening} ${player.name}는(은) ${place}에서 ${job.name || '여행자'}로서 자신의 일을 해내고 있었다.`;
  const paragraphB = `${hook} 이때 ${player.name}는(은) ${skillName}의 감각과 ${prime} 능력을 바탕으로 남들이 지나친 균열을 붙잡는다. 개인적인 일이던 사건은 점점 더 큰 연대기의 서막으로 변한다.`;
  const paragraphC = `마지막 단서는 분명하다. 지금 붙잡은 흔적은 혼자 해결할 수 있는 규모가 아니다. 누군가 같은 진실을 뒤쫓고 있으며, 곧 같은 장소에서 만나게 될 것이다.`;
  return {
    title: `${job.name || '모험가'}의 시작`,
    lead: `${place}에서 시작된 개인 서사`,
    objective: '개인 프롤로그를 읽고 합류 준비를 완료하세요.',
    prompt: `${job.name || '당신'}은(는) 어떤 이유로 이 사건을 끝까지 추적하려 하나요? 그 답은 이후 이야기의 분위기에 남습니다.`,
    paragraphs: [paragraphA, paragraphB, paragraphC],
  };
}

function buildCampaignPrologue(room, campaign) {
  const scenes = {};
  for (const player of room.players) scenes[player.id] = buildPlayerPrologue(campaign, player);
  return {
    scenes,
    ready: {},
    meetingText: (PROLOGUE_META[campaign?.id] || PROLOGUE_META.ember).meet,
  };
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
      jobs: campaign.jobs, monsters: campaign.monsters, eventCount: campaign.events.length, storyBeats: campaign.storyBeats,
    } : null,
    players: room.players.map(p => ({
      id: p.id, name: p.name, host: p.host, connected: p.connected,
      ready: p.ready, job: p.job, abilities: p.abilities,
      hp: p.hp, maxHp: p.maxHp, inspiration: p.inspiration,
      statuses: activeStatuses(room, p),
      skillState: { ...(p.skillState || {}), cooldownRemaining: Math.max(0, Number(p.skillState?.readyAtTurn || 0) - Number(room.turnSerial || 0)) },
    })),
    deckCount: room.deck.length,
    discardCount: room.discard.length,
    currentEvent: room.currentEvent,
    activeChoice: room.activeChoice,
    choiceVotes: room.choiceVotes || {},
    voteEndsAt: room.voteEndsAt || null,
    voteDurationMs: VOTE_DURATION_MS,
  soloVoteDurationMs: 5000,
    mainTurnsSinceEvent: Number(room.mainTurnsSinceEvent || 0),
    turnSerial: Number(room.turnSerial || 0),
    nextCheckDcReduction: Number(room.nextCheckDcReduction || 0),
    eventEveryTurns: EVENT_EVERY_TURNS,
    storyBeat: renderedStoryBeat(room, campaign),
    turnIndex: room.turnIndex || 0,
    turnPlayerId: turnPlayer?.id || null,
    turnPlayerName: turnPlayer?.name || null,
    threat: room.threat,
    story: room.story,
    dcPenalty: room.dcPenalty,
    monster: room.monster,
    lastResolution: room.lastResolution || null,
    ending: room.ending || null,
    lastStoryAction: room.lastStoryAction || null,
    storyHistory: (room.storyHistory || []).slice(-8),
    storyMemory: room.storyMemory || {},
    abandonVote: room.abandonVote || null,
    targetStory: TARGET_STORY,
    maxThreat: MAX_THREAT,
    revision: room.revision,
    chat: room.chat.slice(-120),
    prologue: room.prologue ? {
      ready: room.prologue.ready || {},
      scenes: room.prologue.scenes || {},
      meetingText: room.prologue.meetingText || '',
      readyCount: Object.values(room.prologue.ready || {}).filter(Boolean).length,
      totalPlayers: room.players.length,
    } : null,
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
  // v3.6: 30 unique events, one copy each. Events are interruptions, not the main story.
  return shuffle(campaign.events.map(event => ({ ...event })));
}

function clearSceneState(room) {
  room.currentEvent = null;
  room.activeChoice = null;
  room.choiceVotes = {};
  room.lastResolution = null;
  room.voteEndsAt = null;
  room.monster = null;
  room.pendingContinue = null;
}

function applyChoiceEffect(room, player, effect = {}) {
  switch (effect.type) {
    case 'threatDown': room.threat = Math.max(0, room.threat - (effect.amount || 1)); break;
    case 'threatUp': {
      const amount = effect.amount || 1;
      if (room.threatShield > 0) room.threatShield = Math.max(0, room.threatShield - 1);
      else room.threat = Math.min(MAX_THREAT, room.threat + amount);
      break;
    }
    case 'inspiration': player.inspiration = Math.min(3, player.inspiration + (effect.amount || 1)); break;
    case 'partyHeal':
      for (const member of room.players) member.hp = Math.min(member.maxHp, member.hp + (effect.amount || 1));
      break;
    case 'damage': {
      let amount = effect.amount || 1;
      const guard = Number(player.skillState?.guard || 0);
      if (guard > 0) { const blocked = Math.min(guard, amount); amount -= blocked; player.skillState.guard = guard - blocked; }
      player.hp = Math.max(0, player.hp - amount);
      break;
    }
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

const ACTION_PATTERNS = [
  { stat:'근력', label:'돌파/제압', words:['부수','밀어','들어','공격','제압','파괴','붙잡','걷어','당겨','힘으로'] },
  { stat:'민첩', label:'잠입/회피', words:['몰래','숨','피해','피하','잠입','재빨리','빠르게','기어','뛰어','훔쳐'] },
  { stat:'지능', label:'분석/해독', words:['분석','해킹','해독','연구','계산','조사','기록','코드','구조','원리'] },
  { stat:'지혜', label:'관찰/추적', words:['관찰','추적','살펴','감지','듣','흔적','냄새','기척','직감','찾아'] },
  { stat:'매력', label:'대화/설득', words:['설득','대화','협상','속여','위로','질문','말을','거래','명령','연기'] },
  { stat:'체력', label:'버티기/보호', words:['버티','견디','막아','보호','참아','지탱','몸으로','견뎌','감싸','유지'] },
];

function interpretFreeAction(declaration, player, beat, room) {
  const lower = declaration.toLowerCase();
  let picked = null;
  let score = -1;
  for (const pattern of ACTION_PATTERNS) {
    const hits = pattern.words.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0);
    if (hits > score) { score = hits; picked = pattern; }
  }
  if (!picked || score <= 0) picked = ACTION_PATTERNS.find(item => item.stat === player.job?.prime) || ACTION_PATTERNS[2];
  const act = Number(beat?.act || 1);
  const threatPressure = room.threat >= 6 ? 2 : room.threat >= 3 ? 1 : 0;
  const dc = 10 + Math.max(0, act - 1) + threatPressure + Number(room.dcPenalty || 0);
  const expertise = player.job?.prime === picked.stat ? 1 : 0;
  return { stat:picked.stat, mode:picked.label, dc, expertise };
}

function actionNarrative({ success, declaration, player, beat, interpretation, margin }) {
  const job = player.job?.name || '모험가';
  const objective = beat?.objective || '현재 목표';
  const reveal = beat?.reveal || '';
  const role = beat?.roleHooks?.[player.job?.prime] || '';
  if (success) {
    if (margin >= 5) return `${job} ${player.name}의 선택이 장면의 흐름을 바꿨다. “${declaration}”라는 행동은 ${interpretation.stat}에 기반한 ${interpretation.mode} 접근으로 완벽하게 맞아떨어졌다. ${role} 그 결과 ${objective}에 직접 연결되는 우위를 얻었고, ${reveal ? `앞서 암시되던 진실 ― ${reveal} ― 을 뒷받침하는 결정적인 흔적까지 확보했다.` : '다음 장면에서 사용할 수 있는 확실한 단서를 확보했다.'}`;
    return `${job} ${player.name}은(는) “${declaration}”을 실행했다. ${interpretation.mode} 방식이 효과를 내면서 위험을 크게 키우지 않고 ${objective} 쪽으로 이야기를 전진시켰다. 성공은 장면을 끝내는 정답이 아니라, 다음 플레이어가 이어받을 수 있는 새로운 위치와 단서를 만들어냈다.`;
  }
  if (margin <= -5) return `${job} ${player.name}의 “${declaration}”은(는) 시도 자체는 타당했지만 장면이 예상보다 거칠게 반응했다. ${interpretation.mode} 접근이 무너지면서 새로운 위험이 드러났고 세계의 압박이 커졌다. 하지만 실패 덕분에 무엇이 통하지 않는지, 그리고 ${beat?.stakes || '이 상황에서 무엇을 잃을 수 있는지'}가 분명해졌다. 다음 플레이어는 이 실패를 실제 정보로 이용할 수 있다.`;
  return `${job} ${player.name}은(는) “${declaration}”을 시도했지만 원하는 결과까지 닿지는 못했다. 대신 장면의 저항과 숨은 규칙이 드러났다. 이야기는 멈추지 않는다. ${objective}를 향한 길은 그대로 열려 있지만, 다음 행동은 다른 각도에서 접근해야 한다.`;
}

function skillRemaining(room, player) {
  return Math.max(0, Number(player.skillState?.readyAtTurn || 0) - Number(room.turnSerial || 0));
}

function advanceSkillClock(room, amount = 1) {
  const before = new Map(room.players.map(player => [player.id, skillRemaining(room, player)]));
  room.turnSerial = Number(room.turnSerial || 0) + amount;
  for (const player of room.players) {
    if (before.get(player.id) > 0 && skillRemaining(room, player) === 0) {
      pushChat(room, { type:'success', author:'SYSTEM', text:`${player.name} — ${player.job?.skillDef?.name || '직업 스킬'} 사용 가능!` });
      if (player.socketId) io.to(player.socketId).emit('skill:ready', { name: player.job?.skillDef?.name || '직업 스킬' });
    }
  }
}

function canUseSkillNow(room, player) {
  if (!player.job?.skillDef) return false;
  if (skillRemaining(room, player) > 0) return false;
  if (room.phase === 'combat') return room.monster?.turnPhase !== 'boss' && !room.monster?.acted?.includes(player.id) && player.hp > 0;
  if (room.phase === 'story') {
    if (room.currentEvent) return room.activeChoice?.playerId === player.id;
    return currentTurnPlayer(room)?.id === player.id;
  }
  return false;
}

function applyJobSkill(room, player) {
  const skill = player.job?.skillDef;
  if (!skill) return { ok:false, error:'이 직업에는 등록된 스킬이 없습니다.' };
  switch (skill.kind) {
    case 'guard': player.skillState.guard = Math.max(Number(player.skillState.guard || 0), Number(skill.amount || 4)); break;
    case 'focus': player.skillState.checkBonus = Math.max(Number(player.skillState.checkBonus || 0), Number(skill.amount || 4)); break;
    case 'insight': room.threat = Math.max(0, room.threat - 1); player.inspiration = Math.min(3, player.inspiration + 1); break;
    case 'dcDown': room.nextCheckDcReduction = Math.max(Number(room.nextCheckDcReduction || 0), Number(skill.amount || 2)); break;
    case 'heal': {
      const targets = room.players.filter(member => member.hp > 0).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp));
      const target = targets[0] || player; const heal = rand(4) + Math.max(1, Number(skill.amount || 4) - 2);
      target.hp = Math.min(target.maxHp, target.hp + heal);
      pushChat(room, { type:'success', author:player.name, text:`${skill.name}: ${target.name} HP ${heal} 회복.` });
      break;
    }
    case 'healParty': for (const member of room.players) if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Number(skill.amount || 2)); break;
    case 'attackBoost': player.skillState.attackBonus = Math.max(Number(player.skillState.attackBonus || 0), Number(skill.amount || 2)); player.skillState.damageBonus = Math.max(Number(player.skillState.damageBonus || 0), Number(skill.amount || 2)); break;
    case 'threatShield': room.threatShield = Math.max(Number(room.threatShield || 0), 1); break;
    case 'expose': if (room.phase === 'combat' && room.monster) room.monster.ac = Math.max(8, room.monster.ac - Number(skill.amount || 2)); else player.skillState.checkBonus = Math.max(Number(player.skillState.checkBonus || 0), Number(skill.amount || 2)); break;
    case 'pacify': if (room.phase === 'combat' && room.monster) room.monster.skipNextBoss = true; else player.skillState.checkBonus = Math.max(Number(player.skillState.checkBonus || 0), 3); break;
    case 'inspiration': player.inspiration = Math.min(3, player.inspiration + Number(skill.amount || 2)); break;
    default: return { ok:false, error:'스킬 효과가 정의되지 않았습니다.' };
  }
  const cooldown = Number(skill.cooldown || 3);
  player.skillState.readyAtTurn = Number(room.turnSerial || 0) + cooldown + 1;
  return { ok:true, cooldown };
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
    room.ending = buildVictoryEnding(room);
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
    turnPhase: 'players',
    bossTurnStartedAt: null,
  };
}

function clearBossTurnTimer(roomCode) {
  const timer = bossTurnTimers.get(roomCode);
  if (timer) clearTimeout(timer);
  bossTurnTimers.delete(roomCode);
}

function monsterTurn(room) {
  clearBossTurnTimer(room.code);
  const living = room.players.filter(player => player.hp > 0 && player.connected);
  if (!room.monster || !living.length) return;
  if (room.monster.skipNextBoss) {
    room.monster.skipNextBoss = false;
    pushChat(room, { type:'success', author:'GM', text:`${room.monster.name}의 공격이 직업 스킬 효과로 무효화되었습니다.` });
    room.monster.acted = [];
    room.monster.round += 1;
    room.monster.turnPhase = 'players';
    room.monster.bossTurnStartedAt = null;
    advanceSkillClock(room, 1);
    pushChat(room, { type:'system', text:`ROUND ${room.monster.round} · PLAYER TURN이 시작됩니다.` });
    return;
  }
  const target = living[crypto.randomInt(0, living.length)];
  const roll = rand(20);
  const armor = 10 + mod(target.abilities?.민첩?.total || 10);
  const total = roll + room.monster.attackBonus;
  const hit = roll === 20 || (roll !== 1 && total >= armor);
  let damage = hit ? rand(4) + 1 : 0;
  const guard = Number(target.skillState?.guard || 0);
  if (hit && guard > 0) { const blocked = Math.min(guard, damage); damage -= blocked; target.skillState.guard = guard - blocked; }
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
  room.monster.turnPhase = 'players';
  room.monster.bossTurnStartedAt = null;
  advanceSkillClock(room, 1);
  pushChat(room, { type: 'system', text: `ROUND ${room.monster.round} · PLAYER TURN이 시작됩니다.` });
}

function scheduleMonsterTurn(room, delayMs = 1500) {
  if (room.phase !== 'combat' || !room.monster) return;
  if (room.monster.turnPhase === 'boss' && bossTurnTimers.has(room.code)) return;
  room.monster.turnPhase = 'boss';
  room.monster.bossTurnStartedAt = Date.now();
  pushChat(room, { type: 'danger', author: 'GM', text: `BOSS TURN · ${room.monster.name}이(가) 공격을 준비합니다.` });
  sync(room);
  clearBossTurnTimer(room.code);
  const timer = setTimeout(() => {
    bossTurnTimers.delete(room.code);
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.phase !== 'combat' || !liveRoom.monster || liveRoom.monster.turnPhase !== 'boss') return;
    monsterTurn(liveRoom);
    evaluateEnding(liveRoom);
    sync(liveRoom);
  }, Math.max(300, delayMs));
  bossTurnTimers.set(room.code, timer);
}

function reconcileCombatRound(room) {
  if (room.phase !== 'combat' || !room.monster) return;
  room.monster.turnPhase ||= 'players';
  const eligible = room.players.filter(player => player.connected && player.hp > 0).map(player => player.id);
  room.monster.acted = (room.monster.acted || []).filter(id => eligible.includes(id));
  if (room.monster.turnPhase === 'boss') {
    scheduleMonsterTurn(room, 900);
    return;
  }
  if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room);
}

function clearVoteTimer(roomCode) {
  const timer = voteTimers.get(roomCode);
  if (timer) clearTimeout(timer);
  voteTimers.delete(roomCode);
}

function eligibleChoiceIndices(room, player = null) {
  if (!room.currentEvent) return [];
  return room.currentEvent.choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => !choice.requiredJob || (player ? player.job?.name === choice.requiredJob : room.players.some(p => p.connected && p.hp > 0 && p.job?.name === choice.requiredJob)))
    .map(({ index }) => index);
}

function finalizeChoiceSelection(room) {
  if (!room.currentEvent || room.activeChoice) return false;
  clearVoteTimer(room.code);
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

  let choiceIndex;
  let highest = 0;
  const turnActor = currentTurnPlayer(room) || eligible[0];
  if (counts.size) {
    highest = Math.max(...counts.values());
    const tied = [...counts.entries()].filter(([, count]) => count === highest).map(([index]) => index);
    const actorVote = Number(room.choiceVotes?.[turnActor.id]);
    if (tied.includes(actorVote)) choiceIndex = actorVote;
    else choiceIndex = tied[crypto.randomInt(0, tied.length)];
  } else {
    const fallback = eligibleChoiceIndices(room, turnActor);
    const pool = fallback.length ? fallback : eligibleChoiceIndices(room);
    if (!pool.length) return false;
    choiceIndex = pool[crypto.randomInt(0, pool.length)];
  }

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
  room.voteEndsAt = null;
  pushChat(room, {
    type: 'action',
    author: 'TABLE',
    text: choice.requiredJob
      ? `투표 종료 · 직업 전용 「${choice.label}」 확정 · ${choice.requiredJob} ${actor.name}이(가) 판정합니다.`
      : `투표 종료 · 「${choice.label}」 확정 · ${actor.name}이(가) 판정합니다.`,
  });
  return true;
}

function armVoteTimer(room) {
  clearVoteTimer(room.code);
  if (!room.currentEvent || room.activeChoice || !room.voteEndsAt) return;
  const remaining = Number(room.voteEndsAt) - Date.now();
  if (remaining <= 0) {
    if (finalizeChoiceSelection(room)) sync(room);
    return;
  }
  const timer = setTimeout(() => {
    voteTimers.delete(room.code);
    if (!rooms.has(room.code) || room.activeChoice || !room.currentEvent) return;
    if (finalizeChoiceSelection(room)) sync(room);
  }, remaining);
  timer.unref?.();
  voteTimers.set(room.code, timer);
}

function drawEventForRoom(room) {
  if (room.currentEvent || !room.deck.length) return false;
  const desiredAct = Math.min(5, 1 + Math.floor(room.story / 4));
  const candidates = room.deck.map((event, index) => ({ event, index })).filter(item => item.event.act === desiredAct);
  const picked = candidates.length ? candidates[crypto.randomInt(0, candidates.length)] : { index: crypto.randomInt(0, room.deck.length) };
  room.currentEvent = room.deck.splice(picked.index, 1)[0];
  room.activeChoice = null;
  room.choiceVotes = {};
  room.lastResolution = null;
  const voteDuration = connectedPlayers(room).length <= 1 ? 5000 : VOTE_DURATION_MS;
  room.voteEndsAt = Date.now() + voteDuration;
  room.mainTurnsSinceEvent = 0;
  pushChat(room, { type: 'narration', author: 'GM', text: `이벤트 발생: ${room.currentEvent.title} — ${room.currentEvent.text}` });
  void appendSessionEvent(room.code, 'event_drawn', { eventId: room.currentEvent.id, title: room.currentEvent.title });
  armVoteTimer(room);
  return true;
}

function resetToLobby(room, reasonText = '세션이 로비로 돌아갔습니다.') {
  clearVoteTimer(room.code);
  room.phase = 'lobby';
  room.campaignId = null;
  room.deck = [];
  room.discard = [];
  room.threat = 0;
  room.story = 0;
  room.dcPenalty = 0;
  room.turnIndex = 0;
  room.mainTurnsSinceEvent = 0;
  room.pendingTurnAdvance = false;
  room.voteEndsAt = null;
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
      ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0, statuses: [], skillState: { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 },
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
    player.skillState = { readyAtTurn: Number(room.turnSerial || 0), guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
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
    if (connected.length < MIN_PLAYERS) return ack?.({ ok: false, error: '접속 중인 플레이어가 최소 1명 필요합니다.' });
    if (room.players.some(player => !player.connected)) return ack?.({ ok: false, error: '오프라인 플레이어가 있습니다. 해당 플레이어가 재접속하거나 로비를 다시 만들어주세요.' });
    if (!room.campaignId) return ack?.({ ok: false, error: '캠페인을 선택하세요.' });
    if (room.players.some(player => !player.ready)) return ack?.({ ok: false, error: '모든 플레이어가 직업과 능력치를 완성해야 합니다.' });
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    room.phase = 'prologue';
    room.deck = buildDeck(campaign);
    room.discard = [];
    room.threat = 0;
    room.story = 0;
    room.dcPenalty = 0;
    room.choiceVotes = {};
    room.voteEndsAt = null;
    room.mainTurnsSinceEvent = 0;
    room.pendingTurnAdvance = false;
    room.turnSerial = 0;
    room.nextCheckDcReduction = 0;
    room.threatShield = 0;
    room.lastStoryAction = null;
    room.storyHistory = [];
    room.storyFlags = {};
    room.storyMemory = {};
    room.pathTotals = { truth: 0, survival: 0, bond: 0 };
    room.pendingContinue = null;
    room.failureCount = 0;
    room.prologue = buildCampaignPrologue(room, campaign);
    for (const member of room.players) {
      member.skillState = { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
      member.statuses = [];
    }
    room.activeChoice = null;
    room.currentEvent = null;
    room.monster = null;
    room.lastResolution = null;
    room.ending = null;
    room.abandonVote = null;
    room.turnIndex = 0;
    currentTurnPlayer(room);
    room.storyMemory.prologueMeeting = room.prologue.meetingText;
    pushChat(room, { type: 'narration', text: campaign.intro, author: 'GM' });
    pushChat(room, { type: 'system', text: '각 플레이어의 개인 프롤로그가 시작되었습니다. 모두가 합류 준비를 마치면 메인 스토리가 열립니다.' });
    sync(room);
    void appendSessionEvent(room.code, 'game_started', { campaignId: campaign.id, players: room.players.map(player => player.name) });
    ack?.({ ok: true });
  });
  socket.on('prologue:continue', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'prologue', ack, '지금은 프롤로그를 진행할 수 없습니다.')) return;
    room.prologue ||= { scenes: {}, ready: {}, meetingText: '' };
    room.prologue.ready[player.id] = true;
    const connected = room.players.filter(member => member.connected);
    const allReady = connected.every(member => room.prologue.ready?.[member.id]);
    if (allReady) {
      room.phase = 'story';
      room.turnIndex = 0;
      currentTurnPlayer(room);
      pushChat(room, { type:'narration', author:'GM', text: room.prologue.meetingText || '각자의 길을 지나온 인물들이 마침내 한곳에 모인다.' });
    }
    sync(room);
    ack?.({ ok:true, allReady });
  });

  socket.on('story:advance', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '지금은 메인 스토리를 진행할 수 없습니다.')) return;
    if (room.currentEvent || room.activeChoice) return ack?.({ ok: false, error: '현재 이벤트를 먼저 해결하세요.' });
    const actor = currentTurnPlayer(room);
    if (!actor || actor.id !== player.id) return ack?.({ ok: false, error: `현재는 ${actor?.name || '다른 플레이어'}의 차례입니다.` });
    if (!rateLimit(socket, 'storyAdvance', 700)) return ack?.({ ok: false, error: '잠시 후 다시 시도하세요.' });

    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    const beat = campaign?.storyBeats?.[Math.min(Math.max(0, Number(room.story || 0)), TARGET_STORY - 1)];
    if (!beat) return ack?.({ ok:false, error:'더 이상 진행할 스토리 장면이 없습니다.' });

    room.storyFlags ||= {};
    room.storyMemory ||= {};
    room.pathTotals ||= { truth: 0, survival: 0, bond: 0 };

    if (beat.roleplayPrompt) {
      const declaration = sanitize(payload?.declaration, 60);
      if (!declaration) return ack?.({ ok:false, error:'이 장면에서는 짧은 대답을 입력해 주세요.' });
      room.storyMemory[beat.roleplayPrompt.key] = declaration;
      room.lastStoryAction = {
        playerId: player.id,
        playerName: player.name,
        declaration,
        stat: null,
        mode: 'roleplay',
        roll: null,
        total: null,
        dc: null,
        success: true,
        narrative: beat.roleplayPrompt.responseTemplate.replace('{{value}}', declaration),
        beatId: beat.id,
      };
      room.storyHistory ||= [];
      room.storyHistory.push({ ...room.lastStoryAction, chapter: beat.chapter, act: beat.act, title: beat.title });
      if (room.storyHistory.length > 12) room.storyHistory.splice(0, room.storyHistory.length - 12);
      room.story += 1;
      room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0) + 1;
      room.lastResolution = {
        source:'story', ok:true, roleplay:true,
        text: room.lastStoryAction.narrative,
        playerId: player.id,
        playerName: player.name,
        continueLabel: '이 내용을 읽고 다음 장면으로 넘어간다',
      };
      room.phase = 'resolution';
      room.pendingContinue = { source:'story', drawEvent: room.mainTurnsSinceEvent >= EVENT_EVERY_TURNS && room.deck.length > 0 };
      pushChat(room, { type:'action', author:player.name, text:`짧은 대답: ${declaration}` });
      pushChat(room, { type:'narration', author:'GM', text: room.lastStoryAction.narrative });
      if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true, result:room.lastStoryAction }); }
      sync(room);
      setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 350);
      return ack?.({ ok:true, result:room.lastStoryAction });
    }

    const choiceIndex = Number(payload?.choiceIndex);
    const choice = beat.choices?.[choiceIndex];
    if (!choice) return ack?.({ ok:false, error:'이 장면에서는 주어진 선택지 중 하나를 골라야 합니다.' });
    const ability = player.abilities?.[choice.stat];
    if (!ability) return ack?.({ ok:false, error:'캐릭터 능력치를 찾을 수 없습니다.' });

    const roll = rand(20);
    const abilityMod = mod(ability.total);
    const skillBonus = Number(player.skillState?.checkBonus || 0);
    const statusPenalty = statusPenaltyForCheck(room, player, choice.stat);
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const dc = Math.max(8, Number(choice.dc || 10) + Number(room.dcPenalty || 0) - dcReduction);
    const total = roll + abilityMod + skillBonus + statusPenalty;
    const success = roll === 20 || (roll !== 1 && total >= dc);
    const margin = total - dc;
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
    room.pathTotals[choice.path] = Number(room.pathTotals[choice.path] || 0) + 1;
    if (choice.branchKey) room.storyFlags[choice.branchKey] = choice.branchValue;

    emitRoll(room, player, {
      sides:20, result:roll, purpose:`메인 스토리 · ${choice.stat} 판정 · DC ${dc}`,
      kind:'story-choice', stat:choice.stat, total, dc, success,
    });

    let consequence = '';
    let status = null;
    if (success) {
      if (margin >= 5) player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = Math.max(0, Number(room.dcPenalty || 0) - 1);
      consequence = margin >= 5 ? '대성공 여파로 영감 +1, 위협 -1' : '성공 여파로 위협 -1';
    } else {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, Number(room.dcPenalty || 0) + 1);
      status = applyStatus(player, storyFailureStatus(choice, room));
      room.failureCount = Number(room.failureCount || 0) + 1;
      consequence = `불상사: ${status.label} 상태이상 적용 · HP -1 · 위협 +1 · 다음 장면 판정 불리`;
    }

    room.lastStoryAction = { playerId:player.id, playerName:player.name, declaration:choice.label, stat:choice.stat, mode:'story-choice', roll, total, dc, success, branchValue:choice.branchValue, branchKey:choice.branchKey, narrative:success ? choice.success : choice.failure, beatId:beat.id };
    room.storyHistory ||= [];
    room.storyHistory.push({ ...room.lastStoryAction, chapter: beat.chapter, act: beat.act, title: beat.title });
    if (room.storyHistory.length > 12) room.storyHistory.splice(0, room.storyHistory.length - 12);

    room.story += 1;
    room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0) + 1;
    room.lastResolution = {
      source:'story', ok:success, result:roll, total, dc,
      text: success ? choice.success : choice.failure,
      consequence,
      status: status ? { label: status.label, desc: status.desc, remainingScenes: Math.max(0, Number(status.expiresAtStory || 0) - Number(room.story || 0)) } : null,
      playerId: player.id,
      playerName: player.name,
      choiceLabel: choice.label,
      route: ROUTE_META[choice.branchValue] || null,
      continueLabel: '이 내용을 읽고 다음 장면으로 넘어간다',
    };
    room.phase = 'resolution';
    room.pendingContinue = { source:'story', drawEvent: room.mainTurnsSinceEvent >= EVENT_EVERY_TURNS && room.deck.length > 0 };

    pushChat(room, { type:'action', author:player.name, text:`메인 선택: ${choice.label}` });
    pushChat(room, { type:success ? 'success' : 'failure', author:'GM', text:`${choice.stat} 판정 ${roll}${abilityMod>=0?'+':''}${abilityMod}${skillBonus?`+스킬${skillBonus}`:''}${statusPenalty?`${statusPenalty}`:''} = ${total} / DC ${dc} → ${success?'성공':'실패'}` });
    pushChat(room, { type:'narration', author:'GM', text: success ? choice.success : `${choice.failure} ${consequence}` });

    if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true, result:room.lastStoryAction }); }
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 350);
    ack?.({ ok:true, result:room.lastStoryAction });
  });

  socket.on('player:skillUse', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (!player.job?.skillDef) return ack?.({ ok:false, error:'사용 가능한 직업 스킬이 없습니다.' });
    const remaining = skillRemaining(room, player);
    if (remaining > 0) return ack?.({ ok:false, error:`${player.job.skillDef.name} 쿨타임 ${remaining}턴 남았습니다.` });
    if (!canUseSkillNow(room, player)) return ack?.({ ok:false, error:'지금은 직업 스킬을 사용할 수 있는 자신의 행동 차례가 아닙니다.' });
    if (!rateLimit(socket, 'skillUse', 700)) return ack?.({ ok:false, error:'잠시 후 다시 시도하세요.' });
    const result = applyJobSkill(room, player);
    if (!result.ok) return ack?.(result);
    pushChat(room, { type:'success', author:player.name, text:`직업 스킬 「${player.job.skillDef.name}」 사용 — ${player.job.skillDef.text} · 쿨타임 ${result.cooldown}턴` });
    sync(room);
    ack?.({ ok:true, cooldown:result.cooldown });
  });

  // v3.6 compatibility guards: event timing is server-controlled, not host-controlled.
  socket.on('event:draw', (_payload, ack) => ack?.({ ok: false, error: 'v3.6부터 이벤트 카드는 3개의 메인 턴마다 서버가 자동으로 공개합니다.' }));
  socket.on('event:finalizeChoice', (_payload, ack) => ack?.({ ok: false, error: '투표는 20초 제한시간 종료 후 서버가 자동 집계합니다.' }));
  socket.on('event:release', (_payload, ack) => ack?.({ ok: false, error: '투표는 제한시간 동안 자유롭게 변경할 수 있으며 호스트가 초기화할 수 없습니다.' }));

  socket.on('event:vote', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'story', ack, '현재 이벤트는 선택할 수 없는 상태입니다.')) return;
    if (!room.currentEvent) return ack?.({ ok: false, error: '진행 중인 이벤트가 없습니다.' });
    if (room.activeChoice) return ack?.({ ok: false, error: '이미 행동이 확정되었습니다.' });
    if (!room.voteEndsAt || Date.now() >= Number(room.voteEndsAt)) {
      if (finalizeChoiceSelection(room)) sync(room);
      return ack?.({ ok: false, error: '투표 시간이 종료되었습니다.' });
    }
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 투표할 수 없습니다.' });
    const choiceIndex = Number(payload.choiceIndex);
    const choice = room.currentEvent.choices[choiceIndex];
    if (!choice) return ack?.({ ok: false, error: '선택지가 올바르지 않습니다.' });
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) {
      return ack?.({ ok: false, error: `이 선택지는 ${choice.requiredJob}만 선택할 수 있습니다.` });
    }
    room.choiceVotes ||= {};
    room.choiceVotes[player.id] = choiceIndex;
    sync(room);
    ack?.({ ok: true });
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
    const skillBonus = Number(player.skillState?.checkBonus || 0);
    const statusPenalty = statusPenaltyForCheck(room, player, active.choice.stat);
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const total = result + abilityMod + skillBonus + statusPenalty;
    const dc = Math.max(8, active.choice.dc + room.dcPenalty - dcReduction);
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
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
      text: `${result} ${abilityMod >= 0 ? '+' : ''}${abilityMod}${skillBonus ? ` +스킬${skillBonus}` : ''}${statusPenalty ? ` ${statusPenalty}` : ''} = ${total} / DC ${dc} → ${success ? '성공' : '실패'}`,
    });
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 2200);
    ack?.({ ok: true });
  });

  socket.on('event:continue', (payload, ack) => {
    const { room } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'resolution', ack, '계속할 결과가 없습니다.')) return;
    const pending = room.pendingContinue || {};
    const event = room.currentEvent;
    if (event) room.discard.push(event);
    room.currentEvent = null;
    room.activeChoice = null;
    room.choiceVotes = {};
    room.voteEndsAt = null;
    room.lastResolution = null;
    room.pendingContinue = null;
    room.phase = 'story';
    if (pending.source === 'story') {
      advanceSkillClock(room, 1);
      if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true }); }
      if (pending.drawEvent && room.deck.length) {
        drawEventForRoom(room);
        pushChat(room, { type:'system', text:`${EVENT_EVERY_TURNS}개의 메인 턴이 지나 이벤트 카드가 자동으로 공개되었습니다. 투표는 20초 동안 진행됩니다.` });
      } else advanceTurn(room);
      sync(room);
      return ack?.({ ok: true });
    }
    if (event?.monster) {
      room.monster = monsterForEvent(room, event);
      room.pendingTurnAdvance = true;
      room.phase = 'combat';
      pushChat(room, { type: 'danger', author: 'GM', text: `${event.monster} 등장! 이벤트가 전투로 이어집니다.` });
    } else {
      advanceTurn(room);
    }
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('combat:attack', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'combat', ack, '전투 중이 아닙니다.') || !room.monster) return;
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 공격할 수 없습니다.' });
    if (!player.connected) return ack?.({ ok: false, error: '오프라인 상태에서는 공격할 수 없습니다.' });
    if (room.monster.turnPhase === 'boss') return ack?.({ ok: false, error: '지금은 BOSS TURN입니다. 보스의 공격이 끝날 때까지 기다리세요.' });
    if (room.monster.acted?.includes(player.id)) return ack?.({ ok: false, error: '이번 라운드에는 이미 행동했습니다.' });
    if (!rateLimit(socket, 'attack', 700)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });

    const stat = player.job?.prime || '근력';
    const bonus = mod(player.abilities?.[stat]?.total || 10);
    const skillAttackBonus = Number(player.skillState?.attackBonus || 0);
    const skillDamageBonus = Number(player.skillState?.damageBonus || 0);
    const statusAttackPenalty = statusPenaltyForAttack(room, player, stat);
    const result = rand(20);
    const total = result + bonus + skillAttackBonus + statusAttackPenalty;
    const hit = result === 20 || (result !== 1 && total >= room.monster.ac);
    let damage = 0;
    if (hit) {
      damage = rand(6) + Math.max(0, bonus) + skillDamageBonus;
      if (result === 20) damage += rand(6);
      room.monster.hp = Math.max(0, room.monster.hp - damage);
    }
    player.skillState.attackBonus = 0;
    player.skillState.damageBonus = 0;
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
      clearBossTurnTimer(room.code);
      room.monster = null;
      room.phase = 'story';
      room.threat = Math.max(0, room.threat - 1);
      if (room.pendingTurnAdvance) { advanceTurn(room); room.pendingTurnAdvance = false; }
    } else {
      const eligible = room.players.filter(member => member.connected && member.hp > 0).map(member => member.id);
      if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room);
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
  for (const roomCode of bossTurnTimers.keys()) clearBossTurnTimer(roomCode);
  const forceTimer = setTimeout(() => process.exit(1), 9_000);
  forceTimer.unref();
  try {
    await Promise.allSettled([...rooms.values()].map(room => flushRoomSave(room)));
  } finally {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_500).unref();
  }
}
process.on('unhandledRejection', error => console.error('[unhandledRejection]', error));
process.on('uncaughtException', error => { console.error('[uncaughtException]', error); void gracefulShutdown('uncaughtException'); });

process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => void gracefulShutdown('SIGINT'));
