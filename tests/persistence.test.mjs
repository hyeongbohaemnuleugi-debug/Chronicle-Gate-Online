import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

test('Supabase REST persistence uses apikey only and round-trips snapshots', async (t) => {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({ method: req.method, url: req.url, headers: req.headers, body });
    assert.equal(req.headers.apikey, 'sb_secret_test_key');
    assert.equal(req.headers.authorization, undefined);

    if (req.method === 'GET' && req.url.startsWith('/rest/v1/room_sessions')) {
      const state = {
        code: 'ABCDE', createdAt: Date.now(), phase: 'lobby', campaignId: null,
        players: [{ id: 'p1', name: 'A', host: true, connected: false, ready: false }],
        deck: [], discard: [], chat: [], revision: 7,
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ state, expires_at: new Date(Date.now() + 60_000).toISOString(), revision: 7 }]));
      return;
    }
    res.writeHead(204); res.end();
  });
  const port = await listen(server);
  t.after(() => server.close());

  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_key';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const persistence = await import(`../persistence.js?test=${Date.now()}`);
  assert.equal(persistence.persistenceEnabled, true);

  const room = {
    code: 'ABCDE', revision: 8, createdAt: Date.now(), phase: 'lobby', campaignId: null,
    players: [{ id: 'p1', socketId: 'socket-secret', name: 'A', host: true, connected: true, ready: false }],
    deck: [], discard: [], chat: [],
  };
  await persistence.saveRoomSnapshot(room);
  const save = calls.find(c => c.url === '/rest/v1/rpc/save_chronicle_room');
  assert.ok(save, 'save_chronicle_room RPC should be called');
  const payload = JSON.parse(save.body);
  assert.equal(payload.p_room_code, 'ABCDE');
  assert.equal(payload.p_revision, 8);
  assert.equal(payload.p_state.players[0].socketId, undefined);
  assert.equal(payload.p_state.players[0].connected, false);

  const loaded = await persistence.loadRoomSnapshot('ABCDE');
  assert.equal(loaded.code, 'ABCDE');
  assert.equal(loaded.players[0].connected, false);
  assert.equal(loaded.players[0].socketId, null);
  assert.equal(loaded.revision, 7);

  const exists = await persistence.roomSnapshotExists('ABCDE');
  assert.equal(exists, true);
  await persistence.appendSessionEvent('ABCDE', 'qa_test', { ok: true });
  assert.ok(calls.some(c => c.url === '/rest/v1/session_events'));
});
