const rawUrl = process.env.SUPABASE_URL?.trim();
const secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

export const persistenceEnabled = Boolean(rawUrl && secretKey);
const restBase = rawUrl ? `${rawUrl.replace(/\/$/, '')}/rest/v1` : null;
const pendingTimers = new Map();
const writeChains = new Map();

function headers(extra = {}) {
  return {
    apikey: secretKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, options = {}) {
  if (!persistenceEnabled) return { ok: false, disabled: true };
  const response = await fetch(`${restBase}${path}`, {
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
    players: room.players.map(({ socketId, ...player }) => ({
      ...player,
      connected: false,
    })),
  };
}

function enqueueWrite(roomCode, operation) {
  const previous = writeChains.get(roomCode) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(operation)
    .catch(error => console.error(`[supabase] ${roomCode}:`, error.message));
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
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  return enqueueWrite(room.code, async () => {
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
  try {
    const encoded = encodeURIComponent(roomCode);
    const { data } = await request(`/room_sessions?room_code=eq.${encoded}&select=state,expires_at,revision&limit=1`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const row = Array.isArray(data) ? data[0] : null;
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
    room.ending ||= null;
    room.activeChoice ||= null;
    room.currentEvent ||= null;
    room.monster ||= null;
    room.threat = Number(room.threat || 0);
    room.story = Number(room.story || 0);
    room.dcPenalty = Number(room.dcPenalty || 0);
    return room;
  } catch (error) {
    console.error('[supabase] room load failed:', error.message);
    return null;
  }
}

export async function roomSnapshotExists(roomCode) {
  if (!persistenceEnabled) return false;
  try {
    const encoded = encodeURIComponent(roomCode);
    const { data } = await request(`/room_sessions?room_code=eq.${encoded}&select=room_code,expires_at&limit=1`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const row = Array.isArray(data) ? data[0] : null;
    return Boolean(row && (!row.expires_at || new Date(row.expires_at).getTime() >= Date.now()));
  } catch (error) {
    console.error('[supabase] room existence check failed:', error.message);
    return false;
  }
}

export async function appendSessionEvent(roomCode, type, payload = {}) {
  if (!persistenceEnabled) return;
  try {
    await request('/session_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ room_code: roomCode, event_type: type, payload }),
    });
  } catch (error) {
    console.error('[supabase] event log failed:', error.message);
  }
}
