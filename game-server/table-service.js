import { validStoryLength } from '../public/game/campaigns/epic-tools.js';
/** Local, bounded story tables. No Supabase, account API or third-party service is used. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CAMPAIGNS, CATALOG, getCampaign } from '../public/game/campaigns/index.js';
import { createGame, viewGame, previewAction, applyAction, assist, revealSecret, passTurn, validateSave, getClasses, normalizeClassId, cleanText, actionRevision, deferOpening } from '../public/game/engine.js';
import { remapOpeningPlayers } from '../public/game/opening.js';
import { remapClassId } from '../public/game/professions.js';
import { remapCombatPlayers } from '../public/game/combat.js';

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const bounded = (value, fallback, minimum, maximum) => Number.isFinite(Number(value)) && String(value).trim() !== '' ? Math.min(maximum, Math.max(minimum, Math.floor(Number(value)))) : fallback;
const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

export function attachTableService(io, options = {}) {
  const namespace = io.of('/table');
  const rooms = new Map(), diskFiles = new Map(), persistedHashes = new Map();
  const broadcastKeys = new Map(), checkpointKeys = new Map(), timers = new Set();
  const clock = typeof options.now === 'function' ? options.now : Date.now;
  const configured = options.storageDir ?? process.env.CHRONICLE_V22_DATA_DIR ?? process.env.CHRONICLE_V21_DATA_DIR ?? process.env.CHRONICLE_V20_DATA_DIR ?? process.env.CHRONICLE_V19_DATA_DIR ?? process.env.CHRONICLE_V18_DATA_DIR ?? process.env.CHRONICLE_V17_DATA_DIR ?? process.env.CHRONICLE_V16_DATA_DIR ?? process.env.CHRONICLE_V15_DATA_DIR ?? process.env.CHRONICLE_V14_DATA_DIR ?? (process.env.CHRONICLE_DATA_DIR ? path.join(process.env.CHRONICLE_DATA_DIR, 'v14-tables') : '');
  const storageDir = configured || (process.env.NODE_ENV === 'production' ? '' : path.resolve('.chronicle-v14'));
  const roll = options.roll || (() => crypto.randomInt(1, 21));
  const maxRooms = bounded(options.maxRooms ?? process.env.CHRONICLE_MAX_ROOMS, 32, 1, 128);
  const ttl = positive(options.ttl, bounded(process.env.CHRONICLE_ROOM_TTL_HOURS, 24, 1, 168) * 60 * 60 * 1000);
  const chatTtl = positive(options.chatTtl, bounded(process.env.CHRONICLE_CHAT_TTL_MINUTES, 30, 1, 120) * 60 * 1000);
  const maxRoomBytes = bounded(options.maxRoomBytes, bounded(process.env.CHRONICLE_MAX_ROOM_KB, 256, 64, 1024) * 1024, 1024, 1024 * 1024);
  const maxChatMessages = 30;
  const unseatedSocketTtl = positive(options.unseatedSocketTtl, 60_000);
  const limits = Object.freeze({ maxRooms, roomTtlMs: ttl, chatTtlMs: chatTtl, maxChatMessages, maxRoomBytes });
  let storageError = false, closed = false;
  if (storageDir) {
    try { fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 }); }
    catch (error) { storageError = true; console.error('[table storage]', error.code || 'unavailable'); }
  }
  const fileFor = code => path.join(storageDir, `${code}.json`);
  const storage = () => storageDir && !storageError ? 'disk' : 'memory';
  const totalRooms = () => new Set([...rooms.keys(), ...diskFiles.keys()]).size;
  function later(callback, milliseconds) {
    const timer = setTimeout(() => { timers.delete(timer); if (!closed) callback(); }, milliseconds);
    timer.unref?.(); timers.add(timer); return timer;
  }
  function cancelTimer(timer) { if (timer) { clearTimeout(timer); timers.delete(timer); } }
  function pruneChat(room) {
    const before = room.messages || [], cutoff = clock() - chatTtl;
    room.messages = before.filter(message => message && Number.isFinite(message.at) && message.at > cutoff).slice(-maxChatMessages);
    return room.messages.length !== before.length;
  }
  function snapshot(room) {
    return {
      format: 'chronicle-table-room', schema: 17, code: room.code, hostId: room.hostId, campaignId: room.campaignId, storyLength:room.game?.storyLength || room.storyLength || 'basic',
      players: room.players.map(({ id, name, classId, tokenHash }) => ({ id, name, classId, tokenHash, connected: false })),
      game: room.game ? { ...room.game, players: room.game.players.map(player => ({ ...player, connected: false })) } : null,
      messages: room.messages, updatedAt: room.updatedAt,
      ...(room.historyTrimmed ? { historyTrimmed: room.historyTrimmed } : {}),
    };
  }
  // Only expendable history is discarded. Health, flags, secrets, encounters and
  // every other piece of current game state must fit intact or the request fails.
  function fitRoom(room) {
    pruneChat(room);
    let data = JSON.stringify(snapshot(room));
    while (Buffer.byteLength(data) > maxRoomBytes && room.messages.length) {
      room.messages = room.messages.slice(Math.max(1, Math.ceil(room.messages.length / 4)));
      data = JSON.stringify(snapshot(room));
    }
    while (Buffer.byteLength(data) > maxRoomBytes && room.game?.journal?.length > 1) {
      const count = Math.min(room.game.journal.length - 1, Math.max(1, Math.ceil(room.game.journal.length / 4)));
      room.game = { ...room.game, journal: room.game.journal.slice(count) };
      room.historyTrimmed = (room.historyTrimmed || 0) + count;
      data = JSON.stringify(snapshot(room));
    }
    if (Buffer.byteLength(data) > maxRoomBytes) throw new Error('저장 상태가 이 서버의 방 용량 한도를 넘었습니다. 현재 방은 유지됩니다. 파일로 보관한 뒤 오프라인에서 이어 주세요.');
    return data;
  }
  function persist(room, { touch = true } = {}) {
    if (touch) room.updatedAt = clock();
    const data = fitRoom(room);
    if (!storageDir) return;
    const digest = hash(data);
    if (persistedHashes.get(room.code) === digest) return;
    let temp;
    try {
      temp = `${fileFor(room.code)}.${crypto.randomBytes(6).toString('hex')}.tmp`;
      fs.writeFileSync(temp, data, { mode: 0o600, flag: 'wx' });
      fs.renameSync(temp, fileFor(room.code));
      persistedHashes.set(room.code, digest);
      diskFiles.set(room.code, { updatedAt: room.updatedAt, bytes: Buffer.byteLength(data) });
      storageError = false;
    } catch (error) {
      storageError = true;
      if (temp) try { fs.unlinkSync(temp); } catch {}
      console.error('[table save]', error.code || 'failed');
    }
  }
  function ownedSnapshot(code) {
    if (!storageDir || !codePattern.test(code)) return null;
    let fd;
    try {
      const filename = fileFor(code), stat = fs.lstatSync(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMPORT_BYTES) return null;
      fd = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      const raw = JSON.parse(fs.readFileSync(fd, 'utf8'));
      if (raw.storyLength !== undefined && !validStoryLength(raw.storyLength)) return null;
      if (raw.format !== undefined && raw.format !== 'chronicle-table-room') return null;
      if (![14, 15, 17].includes(raw.schema) || raw.code !== code || !getCampaign(raw.campaignId) || !Number.isFinite(raw.updatedAt) || raw.updatedAt < 0) return null;
      if (!Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > 4 || !Array.isArray(raw.messages)) return null;
      if (raw.players.some(player => !player || typeof player.id !== 'string' || player.id.length > 100 || !player.id || typeof player.name !== 'string' || !/^[a-f0-9]{64}$/.test(player.tokenHash))) return null;
      if (new Set(raw.players.map(player => player.id)).size !== raw.players.length || !raw.players.some(player => player.id === raw.hostId)) return null;
      if (raw.game && (raw.game.campaignId !== raw.campaignId || !Array.isArray(raw.game.players) || raw.game.players.length !== raw.players.length || raw.game.players.some(player => !raw.players.some(seat => seat.id === player.id)))) return null;
      return { raw, bytes: stat.size };
    } catch { return null; }
    finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  function removeRoomFile(code) {
    const found = ownedSnapshot(code);
    if (found) {
      try { fs.unlinkSync(fileFor(code)); }
      catch (error) {
        if (error.code !== 'ENOENT') {
          storageError = true; diskFiles.set(code, { updatedAt: found.raw.updatedAt, bytes: found.bytes });
          console.error('[table cleanup]', error.code || 'failed'); return false;
        }
      }
    }
    diskFiles.delete(code); persistedHashes.delete(code); checkpointKeys.delete(code);
    return true;
  }
  function scanDisk() {
    if (!storageDir) return;
    let entries;
    try { entries = fs.readdirSync(storageDir, { withFileTypes: true }); }
    catch { return; }
    const present = new Set();
    for (const entry of entries) {
      if (!entry.isFile() || !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}\.json$/.test(entry.name)) continue;
      const code = entry.name.slice(0, -5), found = ownedSnapshot(code);
      if (!found) continue;
      present.add(code);
      const active = rooms.get(code);
      if (!active?.players.some(player => player.connected) && clock() - Math.max(found.raw.updatedAt, active?.updatedAt || 0) > ttl) {
        rooms.delete(code); removeRoomFile(code); continue;
      }
      diskFiles.set(code, { updatedAt: found.raw.updatedAt, bytes: found.bytes });
    }
    for (const code of diskFiles.keys()) if (!present.has(code)) diskFiles.delete(code);
  }
  function getRoom(code) {
    if (!codePattern.test(code)) return null;
    if (rooms.has(code)) {
      const room = rooms.get(code);
      if (!room.players.some(player => player.connected) && clock() - room.updatedAt > ttl) { rooms.delete(code); removeRoomFile(code); return null; }
      return room;
    }
    const found = ownedSnapshot(code);
    if (!found) return null;
    const raw = found.raw;
    if (clock() - raw.updatedAt > ttl) { removeRoomFile(code); return null; }
    if (rooms.size >= maxRooms) return null;
    try {
      raw.players = raw.players.map((player, index) => ({ ...player, name: cleanText(player.name, 18), connected: false, socketId: null, classId: normalizeClassId(getCampaign(raw.campaignId), player.classId, index) }));
      if (raw.game) { raw.game = validateSave(raw.game, CAMPAIGNS).game; raw.game.players.forEach(player => { player.connected = false; }); }
      raw.messages = raw.messages.filter(message => message && typeof message.id === 'string' && Number.isFinite(message.at)).map(message => ({ id: cleanText(message.id, 100), name: cleanText(message.name, 18), text: cleanText(message.text, 400), at: message.at }));
      raw.handled = {};
      fitRoom(raw); rooms.set(code, raw); persist(raw, { touch: false }); return raw;
    } catch (error) { console.error('[table load]', error.code || 'invalid snapshot'); return null; }
  }
  function setPresence(room) {
    if (!room.game) return false;
    let changed = false;
    for (const player of room.game.players) {
      const connected = room.players.some(other => other.id === player.id && other.connected);
      if (player.connected !== connected) changed = true;
      player.connected = connected;
    }
    if (changed) room.game.revision++;
    return changed;
  }
  function publicState(room, meId, { includeCatalog = false } = {}) {
    pruneChat(room);
    const people = room.game ? room.game.players : room.players;
    return {
      mode: 'online', code: room.code, meId, hostId: room.hostId, connected: true, campaignId: room.campaignId, storyLength:room.game?.storyLength || room.storyLength || 'basic',
      ...(includeCatalog ? { catalog: CATALOG } : {}), capabilities: { checkpoints: true, parallelOpenings: true, storyLengths: true },
      players: people.map(({ id, name, classId, connected }) => ({ id, name, classId, connected })),
      game: room.game ? viewGame(room.game, getCampaign(room.campaignId), meId) : null,
      messages: room.messages, storage: storage(), historyTrimmed: room.historyTrimmed || 0,
      canStart: room.hostId === meId && !room.game && room.players.length >= 1 && room.players.every(player => player.connected),
    };
  }
  const portableSave = room => ({ format: 'chronicle-gate-v22', savedAt: new Date(clock()).toISOString(), game: room.game });
  function checkpoint(room) {
    if (!room.game) return;
    const host = room.players.find(player => player.id === room.hostId && player.connected);
    const socket = host?.socketId && namespace.sockets.get(host.socketId);
    if (!socket) return;
    const key = `${socket.id}:${room.game.revision}`;
    if (checkpointKeys.get(room.code) === key) return;
    checkpointKeys.set(room.code, key);
    socket.emit('table:checkpoint', { code: room.code, save: portableSave(room) });
  }
  function broadcast(room) {
    pruneChat(room);
    const key = JSON.stringify([room.code, room.hostId, room.campaignId, room.game?.storyLength || room.storyLength || 'basic', room.game?.revision ?? -1, room.players.map(({ id, name, classId, connected }) => [id, name, classId, connected]), room.messages.map(message => message.id), storage(), room.historyTrimmed || 0]);
    for (const player of room.players) {
      const socket = player.socketId && namespace.sockets.get(player.socketId);
      if (socket && broadcastKeys.get(socket.id) !== key) { broadcastKeys.set(socket.id, key); socket.emit('table:state', publicState(room, player.id)); }
    }
    checkpoint(room);
  }
  function commitGame(room, game, changes = {}) {
    const candidate = { ...room, ...changes, game, messages: room.messages.slice() };
    fitRoom(candidate);
    Object.assign(room, candidate);
    persist(room); broadcast(room);
  }
  function remember(room, playerId, requestId, response) {
    if (typeof requestId !== 'string' || !requestId || requestId.length > 80) return;
    room.handled ||= {};
    room.handled[`${playerId}:${requestId}`] = response;
    const keys = Object.keys(room.handled);
    if (keys.length > 100) delete room.handled[keys[0]];
  }
  function makeCode() {
    for (let count = 0; count < 100; count++) {
      let code = ''; for (let index = 0; index < 6; index++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!rooms.has(code) && (!storageDir || !fs.existsSync(fileFor(code)))) return code;
    }
    throw new Error('잠시 후 다시 방을 만들어 주세요.');
  }
  function seat(socket, room, player, token) {
    if (player.socketId && player.socketId !== socket.id) {
      const previous = namespace.sockets.get(player.socketId);
      if (previous) { previous.data.roomCode = null; previous.data.playerId = null; previous.emit('table:notice', '다른 창에서 이 캐릭터로 접속했습니다.'); previous.disconnect(); }
    }
    cancelTimer(socket.data.unseatedTimer); socket.data.unseatedTimer = null;
    player.socketId = socket.id; player.connected = true;
    socket.data.roomCode = room.code; socket.data.playerId = player.id;
    socket.join(room.code); setPresence(room); persist(room); broadcast(room);
    return { ok: true, code: room.code, playerId: player.id, ...(token ? { token } : {}), state: publicState(room, player.id, { includeCatalog: true }) };
  }
  function authenticate(socket) {
    const room = socket.data.roomCode ? getRoom(socket.data.roomCode) : null;
    const player = room?.players.find(other => other.id === socket.data.playerId && other.socketId === socket.id);
    if (!room || !player) throw new Error('먼저 방에 참가해 주세요.');
    return { room, player };
  }
  function hostOnly(room, player) { if (room.hostId !== player.id) throw new Error('방장만 할 수 있습니다.'); }
  function noCurrentSeat(socket) { if (socket.data.roomCode) throw new Error('현재 테이블에서 나간 뒤 새 테이블에 참가해 주세요.'); }
  function ensureFresh(room, payload) {
    if (!room.game) throw new Error('아직 이야기를 시작하지 않았습니다.');
    if (payload.revision !== room.game.revision) throw new Error('장면이 갱신되었습니다. 행동을 다시 확인해 주세요.');
  }
  function requirePlayer(payload, campaign, players = []) {
    const name = cleanText(payload.name, 18);
    if (!name) throw new Error('플레이어 이름을 입력해 주세요.');
    const classes = getClasses(campaign);
    const classId = payload.classId || classes.find(job => !players.some(player => player.classId === job.id))?.id || classes[0].id;
    if (!classes.some(job => job.id === classId)) throw new Error('이 이야기에서 선택할 수 없는 직업입니다. 대기실에서 해당 이야기의 직업을 골라 주세요.');
    return { name, classId };
  }
  const createRate = new Map();
  function sweepNow() {
    if (closed) return;
    for (const [code, room] of rooms) {
      if (!room.players.some(player => player.connected) && clock() - room.updatedAt > ttl) { rooms.delete(code); removeRoomFile(code); continue; }
      if (pruneChat(room)) { persist(room, { touch: false }); broadcast(room); }
    }
    scanDisk();
    for (const [ip, list] of createRate) if (!list.some(time => time > clock() - 60_000)) createRate.delete(ip);
  }
  scanDisk();
  namespace.on('connection', socket => {
    if (closed) { socket.disconnect(true); return; }
    const recent = [];
    const armIdle = () => { cancelTimer(socket.data.unseatedTimer); socket.data.unseatedTimer = later(() => { if (!socket.data.roomCode) socket.disconnect(true); }, unseatedSocketTtl); };
    armIdle();
    function event(name, handler) {
      socket.on(name, (payload = {}, ack = () => {}) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          if (closed) throw new Error('서버가 종료 중입니다. 잠시 후 다시 연결해 주세요.');
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('요청 형식이 올바르지 않습니다.');
          const now = clock(); while (recent.length && recent[0] < now - 10_000) recent.shift();
          if (recent.length >= 40) throw new Error('너무 빠릅니다. 잠시 기다려 주세요.');
          recent.push(now);
          reply(handler(payload) || { ok: true });
        } catch (error) { reply({ ok: false, error: cleanText(error.message, 200) }); }
      });
    }
    event('table:create', payload => {
      noCurrentSeat(socket); sweepNow();
      const ip = socket.handshake.address;
      const recentRate = (createRate.get(ip) || []).filter(time => time > clock() - 60_000);
      if (recentRate.length >= 8) throw new Error('방을 너무 자주 만들었습니다. 1분 뒤 다시 시도해 주세요.');
      if (totalRooms() >= maxRooms) throw new Error('테이블이 가득 찼습니다. 잠시 후 다시 시도해 주세요.');
      const campaign = getCampaign(payload.campaignId);
      if (!campaign) throw new Error('시나리오를 선택해 주세요.');
      const { name, classId } = requirePlayer(payload, campaign);
      const code = makeCode(), token = crypto.randomBytes(32).toString('hex');
      const player = { id: crypto.randomUUID(), name, classId, tokenHash: hash(token), connected: true, socketId: socket.id };
      const room = { code, hostId: player.id, campaignId: campaign.id, storyLength:'basic', players: [player], game: null, messages: [], handled: {}, updatedAt: clock() };
      fitRoom(room); rooms.set(code, room); recentRate.push(clock()); createRate.set(ip, recentRate);
      return seat(socket, room, player, token);
    });
    event('table:join', payload => {
      noCurrentSeat(socket);
      const room = getRoom(cleanText(payload.code, 6).toUpperCase());
      if (!room) throw new Error('방을 찾을 수 없습니다. 6자리 코드를 확인해 주세요.');
      if (room.game) throw new Error('이미 시작한 방입니다. 원래 참가자는 이어하기를 사용해 주세요.');
      if (room.players.length >= 4) throw new Error('테이블은 최대 4명까지 참가할 수 있습니다.');
      const { name, classId } = requirePlayer(payload, getCampaign(room.campaignId), room.players);
      const token = crypto.randomBytes(32).toString('hex');
      const player = { id: crypto.randomUUID(), name, classId, tokenHash: hash(token), connected: true, socketId: socket.id };
      fitRoom({ ...room, players: [...room.players, player], messages: room.messages.slice() });
      room.players.push(player); return seat(socket, room, player, token);
    });
    event('table:resume', payload => {
      noCurrentSeat(socket);
      const room = getRoom(cleanText(payload.code, 6).toUpperCase());
      const player = room?.players.find(other => other.id === payload.playerId);
      if (!player || typeof payload.token !== 'string' || payload.token.length > 128 || !safeEqual(player.tokenHash, hash(payload.token))) throw new Error('이어하기 정보를 확인할 수 없습니다. 방이 만료되었거나 서버가 재시작되었을 수 있습니다.');
      return seat(socket, room, player);
    });
    event('table:sync', () => { const { room, player } = authenticate(socket); return { ok: true, state: publicState(room, player.id, { includeCatalog: true }) }; });
    event('table:campaign', payload => {
      const { room, player } = authenticate(socket); hostOnly(room, player);
      if (room.game) throw new Error('진행 중에는 이야기를 바꿀 수 없습니다.');
      if (!getCampaign(payload.campaignId)) throw new Error('없는 시나리오입니다.');
      if (room.campaignId === payload.campaignId) return { ok: true };
      room.players.forEach((person, index) => { person.classId = remapClassId(getCampaign(room.campaignId), getCampaign(payload.campaignId), person.classId, index); });
      room.campaignId = payload.campaignId; persist(room); broadcast(room); return { ok: true };
    });
    event('table:class', payload => {
      const { room, player } = authenticate(socket);
      if (room.game) throw new Error('직업은 시작 전에 선택할 수 있습니다.');
      if (!getClasses(getCampaign(room.campaignId)).some(job => job.id === payload.classId)) throw new Error('이 이야기에서 선택할 수 없는 직업입니다.');
      if (player.classId === payload.classId) return { ok: true };
      player.classId = payload.classId; persist(room); broadcast(room); return { ok: true };
    });
    event('table:length', payload => {
      const {room,player}=authenticate(socket);hostOnly(room,player);
      if(room.game)throw new Error('이야기 길이는 시작 전에 정해 주세요.');
      if(!validStoryLength(payload.storyLength))throw new Error('기본 또는 서사시를 선택해 주세요.');
      if(room.storyLength===payload.storyLength)return {ok:true};
      room.storyLength=payload.storyLength;persist(room);broadcast(room);return {ok:true};
    });
    event('table:start', payload => {
      const { room, player } = authenticate(socket); hostOnly(room, player);
      if (room.game) throw new Error('이미 시작했습니다.');
      if (room.players.some(person => !person.connected)) throw new Error('모든 참가자가 연결된 뒤 시작해 주세요.');
      const storyLength=payload.storyLength ?? room.storyLength ?? 'basic';
      if(!validStoryLength(storyLength))throw new Error('기본 또는 서사시를 선택해 주세요.');
      commitGame(room, createGame(getCampaign(room.campaignId), room.players, { storyLength }),{storyLength}); return { ok: true };
    });
    event('table:preview', payload => {
      const { room, player } = authenticate(socket); if (!room.game) throw new Error('이야기를 시작해 주세요.');
      return previewAction(room.game, getCampaign(room.campaignId), player.id, payload);
    });
    event('table:act', payload => {
      const { room, player } = authenticate(socket);
      const previous = typeof payload.requestId === 'string' ? room.handled?.[`${player.id}:${payload.requestId}`] : null;
      if (previous) { socket.emit('table:state', publicState(room, player.id)); return previous; }
      if (!room.game) throw new Error('아직 이야기를 시작하지 않았습니다.');
      if (payload.revision !== actionRevision(room.game, player.id)) throw new Error('당신이 진행할 장면이 바뀌었습니다. 행동을 다시 확인해 주세요.');
      const result = applyAction(room.game, getCampaign(room.campaignId), player.id, payload, { roll });
      if (!result.ok) return result;
      commitGame(room, result.game);
      const response = { ok: true, revision: room.game.revision };
      remember(room, player.id, payload.requestId, response); return response;
    });
    event('table:opening-defer', payload => {
      const { room, player } = authenticate(socket); hostOnly(room, player); ensureFresh(room, payload);
      const result = deferOpening(room.game, getCampaign(room.campaignId), payload.playerId);
      if (!result.ok) return result;
      commitGame(room, result.game); return { ok:true };
    });
    for (const [name, action] of [['table:assist', assist], ['table:reveal', (game, id) => revealSecret(game, getCampaign(game.campaignId), id)], ['table:pass', passTurn]]) event(name, payload => {
      const { room, player } = authenticate(socket); ensureFresh(room, payload);
      const result = name === 'table:pass' ? passTurn(room.game, player.id, { allowDisconnected: room.hostId === player.id, campaign: getCampaign(room.campaignId), roll }) : action(room.game, player.id);
      if (!result.ok) return result;
      commitGame(room, result.game); return { ok: true };
    });
    event('table:export', () => {
      const { room, player } = authenticate(socket); hostOnly(room, player);
      if (!room.game) throw new Error('시작한 이야기만 저장할 수 있습니다.');
      return { ok: true, save: portableSave(room) };
    });
    event('table:import', payload => {
      const { room, player } = authenticate(socket); hostOnly(room, player);
      if (room.game) throw new Error('진행 중인 이야기에 덮어쓸 수 없습니다. 새 방의 대기실에서 불러와 주세요.');
      if (Buffer.byteLength(JSON.stringify(payload.save) || '') > MAX_IMPORT_BYTES) throw new Error('저장 파일은 2MB 이하만 불러올 수 있습니다.');
      const { game, campaign } = validateSave(payload.save, CAMPAIGNS);
      if (game.players.length !== room.players.length) throw new Error(`저장 파일은 ${game.players.length}명입니다. 같은 인원이 입장한 뒤 불러와 주세요.`);
      const revivedMap = {};
      game.players.forEach((person, index) => { for (const [key, value] of Object.entries(game.reviveAttempts || {})) { const suffix = `:${person.id}`; if (key.endsWith(suffix)) revivedMap[`${key.slice(0, -suffix.length)}:${room.players[index].id}`] = value; } });
      game.reviveAttempts = revivedMap;
      const playerIds = Object.fromEntries(game.players.map((person, index) => [person.id, room.players[index].id]));
      remapCombatPlayers(game, playerIds);
      remapOpeningPlayers(game, playerIds);
      game.players = game.players.map((person, index) => ({ ...person, id: room.players[index].id, name: room.players[index].name, connected: room.players[index].connected }));
      const players = room.players.map((person, index) => ({ ...person, classId: game.players[index].classId }));
      commitGame(room, game, { campaignId: campaign.id, storyLength:game.storyLength, players }); return { ok: true };
    });
    event('table:chat', payload => {
      const { room, player } = authenticate(socket);
      const text = cleanText(payload.text, 400); if (!text) return { ok: true };
      const candidate = { ...room, messages: [...room.messages, { id: crypto.randomUUID(), name: player.name, text, at: clock() }] };
      fitRoom(candidate); Object.assign(room, candidate); persist(room); broadcast(room); return { ok: true };
    });
    event('table:leave', () => {
      const { room, player } = authenticate(socket);
      socket.leave(room.code); socket.data.roomCode = null; socket.data.playerId = null; broadcastKeys.delete(socket.id); armIdle();
      if (room.game) { player.connected = false; player.socketId = null; }
      else room.players = room.players.filter(person => person.id !== player.id);
      if (room.hostId === player.id) { const nextHost = room.players.find(person => person.connected) || room.players[0]; if (nextHost) room.hostId = nextHost.id; }
      if (!room.players.length) { rooms.delete(room.code); removeRoomFile(room.code); }
      else { setPresence(room); persist(room); broadcast(room); }
      return { ok: true };
    });
    socket.on('disconnect', () => {
      cancelTimer(socket.data.unseatedTimer); broadcastKeys.delete(socket.id);
      if (closed) return;
      try {
        const { room, player } = authenticate(socket); player.connected = false; player.socketId = null;
        setPresence(room); persist(room); broadcast(room);
        // Give a reconnecting host 15 seconds before promoting an available peer.
        if (room.hostId === player.id) later(() => {
          if (rooms.get(room.code) !== room) return;
          if (room.hostId === player.id && !player.connected) { const nextHost = room.players.find(person => person.connected); if (nextHost) { room.hostId = nextHost.id; persist(room); broadcast(room); } }
        }, 15_000);
      } catch {}
    });
  });
  const sweep = setInterval(sweepNow, positive(options.sweepInterval, 60_000)); sweep.unref?.();
  return {
    rooms, catalog: CATALOG, limits, sweepNow,
    get storage() { return storage(); },
    status: () => ({ rooms: rooms.size, diskRooms: diskFiles.size, totalRooms: totalRooms(), storage: storage(), storageError, limits }),
    close() {
      if (closed) return;
      closed = true; clearInterval(sweep); for (const timer of timers) clearTimeout(timer); timers.clear();
      // Shutdown and restart do not renew an inactive room's expiration time.
      for (const room of rooms.values()) persist(room, { touch: false });
      broadcastKeys.clear(); checkpointKeys.clear();
    },
  };
}
