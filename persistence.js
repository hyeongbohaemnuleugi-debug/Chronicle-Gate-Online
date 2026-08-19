import fs from 'fs';
import path from 'path';

const rawUrl = process.env.SUPABASE_URL?.trim();
const secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const supabaseEnabled = Boolean(rawUrl && secretKey);
const explicitLocalDir = (process.env.CHRONICLE_DATA_DIR || process.env.RENDER_DISK_PATH || '').trim() || (fs.existsSync('/var/data') ? '/var/data' : '');
const localPersistenceEnabled = Boolean(explicitLocalDir);

export const persistenceMode = supabaseEnabled ? 'supabase' : (localPersistenceEnabled ? 'persistent-disk' : 'memory');
export const persistenceEnabled = Boolean(supabaseEnabled || localPersistenceEnabled);

const restBase = rawUrl ? `${rawUrl.replace(/\/$/, '')}/rest/v1` : null;
const pendingTimers = new Map();
const writeChains = new Map();
const localStoreDir = explicitLocalDir || path.join(process.cwd(), '.chronicle-data');
const localRoomFile = path.join(localStoreDir, 'room-sessions.json');
const localEventFile = path.join(localStoreDir, 'session-events.json');
let localLoaded = false;
const localRoomSnapshots = new Map();
let localSessionEvents = [];

function ensureLocalStoreLoaded() {
  if (localLoaded || supabaseEnabled || !localPersistenceEnabled) return;
  localLoaded = true;
  try {
    fs.mkdirSync(localStoreDir, { recursive: true });
    if (fs.existsSync(localRoomFile)) {
      const parsed = JSON.parse(fs.readFileSync(localRoomFile, 'utf8'));
      for (const row of Array.isArray(parsed) ? parsed : []) {
        if (row?.room_code) localRoomSnapshots.set(String(row.room_code).toUpperCase(), row);
      }
    }
    if (fs.existsSync(localEventFile)) {
      const parsed = JSON.parse(fs.readFileSync(localEventFile, 'utf8'));
      localSessionEvents = Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('[room persistence] local store load failed:', error.message);
  }
}

function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
}

function saveLocalStore() {
  if (supabaseEnabled || !localPersistenceEnabled) return;
  try {
    writeJsonAtomically(localRoomFile, [...localRoomSnapshots.values()].sort((a, b) => String(a.room_code).localeCompare(String(b.room_code))));
    writeJsonAtomically(localEventFile, localSessionEvents.slice(-4000));
  } catch (error) {
    console.error('[room persistence] local store save failed:', error.message);
  }
}

function headers(extra = {}) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(pathname, options = {}) {
  if (!supabaseEnabled) return { ok: false, disabled: true };
  const response = await fetch(`${restBase}${pathname}`, {
    ...options,
    headers: headers(options.headers),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase REST ${response.status}: ${body.slice(0, 500)}`);
  }
  const text = await response.text();
  return { ok: true, data: text ? JSON.parse(text) : null };
}

function serializableRoom(room) {
  return {
    ...room,
    players: (room.players || []).map(({ socketId, ...player }) => ({
      ...player,
      connected: false,
    })),
  };
}

function hydrateRoomFromRow(row) {
  if (!row?.state) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
  const room = row.state;
  room.players = (room.players || []).map(player => ({ ...player, socketId: null, connected: false }));
  room.createdAt ||= Date.now();
  room.lastActiveAt ||= room.createdAt;
  room.revision = Math.max(Number(room.revision || 1), Number(row.revision || 1));
  room.chat ||= [];
  room.deck ||= [];
  room.discard ||= [];
  room.lastResolution ||= null;
  room.storyHistory ||= [];
  room.lastStoryAction ||= null;
  room.ending ||= null;
  room.activeChoice ||= null;
  room.currentEvent ||= null;
  room.choiceVotes ||= {};
  room.voteEndsAt ||= null;
  room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0);
  room.pendingTurnAdvance = Boolean(room.pendingTurnAdvance);
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : 0;
  room.abandonVote ||= null;
  room.monster ||= null;
  room.threat = Number(room.threat || 0);
  room.story = Number(room.story || 0);
  room.dcPenalty = Number(room.dcPenalty || 0);
  return room;
}

function allRoomRows(limit = 200) {
  ensureLocalStoreLoaded();
  return [...localRoomSnapshots.values()]
    .filter(row => row?.room_code && row?.state)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, Math.max(1, Math.min(500, Number(limit || 200))));
}

function enqueueWrite(roomCode, operation) {
  const previous = writeChains.get(roomCode) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(operation)
    .catch(error => console.error(`[room persistence] ${roomCode}:`, error.message));
  writeChains.set(roomCode, next);
  next.finally(() => {
    if (writeChains.get(roomCode) === next) writeChains.delete(roomCode);
  });
  return next;
}

export async function saveRoomSnapshot(room) {
  if (!persistenceEnabled || !room) return;
  const payload = {
    room_code: room.code,
    state: serializableRoom(room),
    revision: Number(room.revision || 1),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
  return enqueueWrite(room.code, async () => {
    if (supabaseEnabled) {
      await request('/rpc/save_chronicle_room', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_room_code: payload.room_code,
          p_state: payload.state,
          p_revision: payload.revision,
          p_expires_at: payload.expires_at,
        }),
      });
      return;
    }
    ensureLocalStoreLoaded();
    localRoomSnapshots.set(payload.room_code, payload);
    saveLocalStore();
  });
}

export function scheduleRoomSave(room, delay = 180) {
  if (!persistenceEnabled || !room) return;
  clearTimeout(pendingTimers.get(room.code));
  const timer = setTimeout(() => {
    pendingTimers.delete(room.code);
    void saveRoomSnapshot(room);
  }, Math.max(0, delay));
  pendingTimers.set(room.code, timer);
}

export async function flushRoomSave(room) {
  if (!persistenceEnabled || !room) return;
  const timer = pendingTimers.get(room.code);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(room.code);
  }
  await saveRoomSnapshot(room);
  await writeChains.get(room.code)?.catch(() => {});
}

export async function loadRoomSnapshot(roomCode) {
  if (!persistenceEnabled) return null;
  const normalizedCode = String(roomCode || '').toUpperCase().trim();
  try {
    if (supabaseEnabled) {
      const encoded = encodeURIComponent(normalizedCode);
      const { data } = await request(`/room_sessions?room_code=eq.${encoded}&select=state,expires_at,revision&limit=1`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const row = Array.isArray(data) ? data[0] : null;
      return hydrateRoomFromRow(row);
    }
    ensureLocalStoreLoaded();
    return hydrateRoomFromRow(localRoomSnapshots.get(normalizedCode) || null);
  } catch (error) {
    console.error('[room persistence] room load failed:', error.message);
    return null;
  }
}

export async function roomSnapshotExists(roomCode) {
  if (!persistenceEnabled) return false;
  const normalizedCode = String(roomCode || '').toUpperCase().trim();
  try {
    if (supabaseEnabled) {
      const encoded = encodeURIComponent(normalizedCode);
      const { data } = await request(`/room_sessions?room_code=eq.${encoded}&select=room_code,expires_at&limit=1`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const row = Array.isArray(data) ? data[0] : null;
      return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() >= Date.now()));
    }
    ensureLocalStoreLoaded();
    const row = localRoomSnapshots.get(normalizedCode);
    return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() >= Date.now()));
  } catch (error) {
    console.error('[room persistence] room existence check failed:', error.message);
    return false;
  }
}

export async function appendSessionEvent(roomCode, type, payload = {}) {
  if (!persistenceEnabled) return;
  try {
    if (supabaseEnabled) {
      await request('/session_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ room_code: roomCode, event_type: type, payload }),
      });
      return;
    }
    ensureLocalStoreLoaded();
    localSessionEvents.push({ room_code: roomCode, event_type: type, payload, ts: new Date().toISOString() });
    if (localSessionEvents.length > 4000) localSessionEvents = localSessionEvents.slice(-4000);
    saveLocalStore();
  } catch (error) {
    console.error('[room persistence] event log failed:', error.message);
  }
}

export async function findResumableRoomSnapshotsByName(playerName, limit = 100) {
  if (!persistenceEnabled) return [];
  const exact = String(playerName || '').trim();
  if (!exact) return [];
  try {
    const rows = supabaseEnabled
      ? (await request(`/room_sessions?select=room_code,state,expires_at,updated_at&order=updated_at.desc&limit=${Math.max(1, Math.min(200, Number(limit || 100)))}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })).data
      : allRoomRows(Math.max(200, Number(limit || 100) * 3));
    const now = Date.now();
    return (Array.isArray(rows) ? rows : []).filter(row => {
      if (!row?.state) return false;
      if (row.expires_at && new Date(row.expires_at).getTime() < now) return false;
      const room = row.state;
      if (!room.campaignId || ['lobby', 'ending'].includes(room.phase)) return false;
      if (room.abandonVote || room.sessionClosed) return false;
      const matches = (room.players || []).filter(player => String(player?.name || '').trim() === exact);
      return matches.length === 1;
    }).slice(0, Math.max(1, Math.min(200, Number(limit || 100))));
  } catch (error) {
    console.error('[room persistence] resumable room lookup failed:', error.message);
    return [];
  }
}

export async function findResumableRoomSnapshotsByAccount(accountId, limit = 100) {
  const exact = String(accountId || '').trim();
  if (!persistenceEnabled || !exact) return [];
  try {
    const rows = supabaseEnabled
      ? (await request(`/room_sessions?select=room_code,state,expires_at,updated_at&order=updated_at.desc&limit=${Math.max(1, Math.min(200, Number(limit || 100)))}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })).data
      : allRoomRows(Math.max(200, Number(limit || 100) * 3));
    const now = Date.now();
    return (Array.isArray(rows) ? rows : []).filter(row => {
      if (!row?.state) return false;
      if (row.expires_at && new Date(row.expires_at).getTime() < now) return false;
      const room = row.state;
      if (!room.campaignId || ['lobby', 'ending'].includes(room.phase)) return false;
      if (room.abandonVote || room.sessionClosed) return false;
      return (room.players || []).some(player => String(player?.accountId || '') === exact);
    }).slice(0, Math.max(1, Math.min(200, Number(limit || 100))));
  } catch (error) {
    console.error('[room persistence] resumable account lookup failed:', error.message);
    return [];
  }
}
