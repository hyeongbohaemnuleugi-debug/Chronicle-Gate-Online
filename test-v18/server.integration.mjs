import {finishNetworkOpenings} from '../tests-v22/helpers.mjs';
import {OPENINGS} from '../public/game/opening.js';
/**
 * Real local HTTP + Socket.IO integration checks for the v17 resource contract.
 * Four clients exercise ordinary play, chat, portable saves and reconnection.
 * A real loopback HTTP server is configured as Supabase and records every call;
 * neither fetch nor Socket.IO transport is stubbed. This establishes zero calls
 * for these flows, not a guarantee about any host's future traffic or quota.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import { attachTableService } from '../game-server/table-service.js';
import { LEGACY_CAMPAIGNS as CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createStoryState as createGame } from '../public/game/engine.js';

const campaign = CAMPAIGNS[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
function ack(socket, event, payload = {}) {
  return new Promise((resolve, reject) => socket.timeout(3500).emit(event, payload, (error, response) => {
    if (error) return reject(new Error(`${event}: acknowledgement timed out`));
    if (!response || typeof response !== 'object') return reject(new Error(`${event}: invalid acknowledgement`));
    resolve(response);
  }));
}
const success = response => { assert.equal(response.ok, true, response.error); return response; };
const sync = async socket => success(await ack(socket, 'table:sync')).state;
async function client(base, clients) {
  const socket = connect(base + '/table', { transports: ['websocket'], forceNew: true, autoConnect: false, reconnection: false, timeout: 3000 });
  clients.push(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Socket.IO connection timed out')); }, 3500);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
    socket.connect();
  });
  return socket;
}
function nextState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const handler = value => { if (predicate(value)) { clearTimeout(timer); socket.off('table:state', handler); resolve(value); } };
    const timer = setTimeout(() => { socket.off('table:state', handler); reject(new Error('Expected table state was not broadcast')); }, 3500);
    socket.on('table:state', handler);
  });
}
function noCredentials(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!['token', 'tokenHash', 'socketId', 'password', 'serviceRoleKey'].includes(key), `private key leaked: ${key}`);
    noCredentials(child);
  }
}
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}
async function closeHTTP(server) {
  if (!server?.listening) return;
  server.closeIdleConnections?.();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

await test('four-player default service never calls configured Supabase during play, saves, chat or restart', { timeout: 25_000 }, async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v18-online-'));
  const requests = [];
  const fakeSupabase = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url });
    request.resume(); response.writeHead(200, { 'content-type': 'application/json' }); response.end('[]');
  });
  const fakeURL = await listen(fakeSupabase);
  const envNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'CHRONICLE_LEGACY_MODE'];
  const originalEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  process.env.SUPABASE_URL = fakeURL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-real-service-role-key';
  process.env.SUPABASE_ANON_KEY = 'test-only-not-a-real-anon-key';
  delete process.env.CHRONICLE_LEGACY_MODE;
  let running, rolls = 0;
  const clients = [], broadcasts = [], checkpoints = [], credentials = [];
  try {
    // Import after configuration so accidental eager account initialization is observable.
    const { startHttpService } = await import('../game-server/http-service.js');
    const start = () => startHttpService({ port: 0, host: '127.0.0.1', tableOptions: { storageDir: temporary, roll: () => { rolls++; return 12; } } });
    running = await start();
    const health = await (await fetch(running.url + '/health')).json();
    assert.equal(health.ok, true); assert.equal(health.version, '22.1.0');
    assert.deepEqual(health.supabase, { enabled: false, requests: 0 });
    const catalog = await (await fetch(running.url + '/api/table/catalog')).json();
    assert.equal(catalog.ok, true); assert.equal(catalog.campaigns.length, 9);
    assert.ok(catalog.campaigns.every(story => story.classes.length === 4 && !story.nodes && !story.roles));
    const seats = await Promise.all(Array.from({ length: 4 }, () => client(running.url, clients)));
    for (let index = 0; index < seats.length; index++) {
      seats[index].on('table:state', state => broadcasts.push({ index, state }));
      seats[index].on('table:checkpoint', checkpoint => checkpoints.push({ index, checkpoint }));
    }
    credentials[0] = success(await ack(seats[0], 'table:create', { campaignId: campaign.id, name: '아린', classId: campaign.classes[0].id }));
    const code = credentials[0].code;
    assert.equal(credentials[0].state.catalog.length, 9, 'initial seating includes the catalog exactly where clients need it');
    for (let index = 1; index < 4; index++) {
      credentials[index] = success(await ack(seats[index], 'table:join', { code, name: ['아린', '도윤', '서린', '유진'][index], classId: campaign.classes[index].id }));
      assert.equal(credentials[index].state.catalog.length, 9);
    }
    success(await ack(seats[0], 'table:start'));
  await finishNetworkOpenings(seats,ack);
    let state = await sync(seats[0]);
    assert.equal(state.catalog.length, 9, 'explicit resync is allowed to include a complete catalog');
    assert.equal(state.players.length, 4); assert.equal(state.storage, 'disk');
    assert.equal(state.capabilities?.checkpoints, true);
    assert.equal(checkpoints.length, 9, 'start and eight private choices each create one private host checkpoint');
    const openingCheckpoints=checkpoints.length;
    success(await ack(seats[1], 'table:assist', { revision: state.game.revision }));
    state = await sync(seats[0]);
    assert.equal(checkpoints.length, openingCheckpoints+1, 'a changed assistance revision should create a fresh checkpoint');
    const opening = state.game.scene.choices.find(choice => !choice.automatic);
    assert.ok(opening, 'fixture has a dice-based opening action');
    const plan = success(await ack(seats[0], 'table:preview', { choiceId: opening.id })).plan;
    const submitted = { choiceId: opening.id, revision: plan.revision, requestId: 'v17-first-action', roll: 20, total: 999 };
    success(await ack(seats[0], 'table:act', submitted));
    state = await sync(seats[0]);
    assert.equal(rolls, 1); assert.equal(state.game.lastResult.roll, 12, 'server, not submitted client dice, determines the roll');
    assert.notEqual(state.game.scene.id, campaign.start);
    assert.equal(checkpoints.length, openingCheckpoints+2, 'resolved action should create one additional checkpoint');
    success(await ack(seats[0], 'table:act', submitted));
    assert.equal(rolls, 1); assert.equal(checkpoints.length, openingCheckpoints+2, 'idempotent action retry must not duplicate a save transfer');
    for (let index = 0; index < 4; index++) {
      const personal = await sync(seats[index]);
      assert.equal(personal.game.secret.secret, OPENINGS[campaign.id].professions[campaign.classes[index].id].role.secret);
      for (let other = 0; other < 4; other++) if (index !== other) assert.ok(!JSON.stringify(personal).includes(OPENINGS[campaign.id].professions[campaign.classes[other].id].role.secret), 'unrevealed role secret leaked');
      noCredentials(personal);
    }
    // 32 chats are spread across four sockets, below the per-socket abuse limit.
    for (let number = 0; number < 32; number++) success(await ack(seats[number % 4], 'table:chat', { text: `resource-check-${number}: 다음 행동을 의논합니다.` }));
    state = await sync(seats[0]);
    assert.equal(state.messages.length, 30); assert.match(state.messages[0].text, /resource-check-2:/);
    assert.match(state.messages.at(-1).text, /resource-check-31:/);
    assert.equal(checkpoints.length, openingCheckpoints+2, 'chat-only broadcasts must not upload/download another full saved game');
    assert.ok(checkpoints.every(event => event.index === 0), 'a non-host received the private saved game');
    for (const { checkpoint } of checkpoints) {
      assert.equal(checkpoint.code, code); assert.equal(checkpoint.save.format, 'chronicle-gate-v22');
      noCredentials(checkpoint.save);
    }
    assert.equal((await ack(seats[1], 'table:export')).ok, false, 'private portable save remains host-only');
    const exported = success(await ack(seats[0], 'table:export')).save;
    noCredentials(exported);
    assert.equal(exported.game.nodeId, state.game.scene.id);
    assert.ok(broadcasts.length >= 4 * 34, 'test actually observed repeated four-client broadcasts');
    for (const { state: snapshot } of broadcasts) {
      assert.equal(Object.hasOwn(snapshot, 'catalog'), false, 'normal table:state must not resend the static 31 KB catalog');
      assert.ok(snapshot.messages.length <= 30); noCredentials(snapshot);
    }
    const playing = broadcasts.filter(event => event.state.game);
    const maxBytes = Math.max(...playing.map(event => Buffer.byteLength(JSON.stringify(event.state))));
    assert.ok(maxBytes < 30_000, `opening-session broadcast grew to ${maxBytes} bytes`);
    t.diagnostic(`${broadcasts.length} personalized broadcasts; largest opening/chat state=${maxBytes} bytes; catalog=${Buffer.byteLength(JSON.stringify(catalog.campaigns))} bytes sent only on explicit initial/sync responses`);
    const disconnected = nextState(seats[0], snapshot => snapshot.players.find(player => player.id === credentials[3].playerId)?.connected === false);
    seats[3].disconnect(); await disconnected;
    const returned = await client(running.url, clients);
    assert.equal((await ack(returned, 'table:resume', { code, playerId: credentials[3].playerId, token: 'not-the-issued-token' })).ok, false);
    const resume = success(await ack(returned, 'table:resume', { code, playerId: credentials[3].playerId, token: credentials[3].token }));
    assert.equal(resume.state.players.length, 4); assert.equal(resume.state.game.scene.id, exported.game.nodeId);
    assert.ok(checkpoints.length >= 5, 'presence revisions should update the host recovery checkpoint');
    assert.ok(checkpoints.every(event => event.index === 0));
    for (const socket of clients) socket.disconnect();
    await tick(); await running.close(); running = null;
    const diskFile = path.join(temporary, `${code}.json`);
    assert.ok(fs.existsSync(diskFile), 'local snapshot should persist after service shutdown');
    assert.ok(fs.statSync(diskFile).size <= 256 * 1024);
    const diskText = fs.readFileSync(diskFile, 'utf8');
    for (const credential of credentials) assert.ok(!diskText.includes(credential.token), 'raw rejoin token must not be saved');
    running = await start();
    const restored = await client(running.url, clients);
    const restoredCheckpoints = [];
    restored.on('table:checkpoint', checkpoint => restoredCheckpoints.push(checkpoint));
    const restoredState = success(await ack(restored, 'table:resume', { code, playerId: credentials[0].playerId, token: credentials[0].token })).state;
    assert.equal(restoredState.players.length, 4); assert.equal(restoredState.game.scene.id, exported.game.nodeId);
    assert.equal(restoredState.messages.length, 30);
    assert.equal(restoredCheckpoints.length, 1, 'resumed host must receive a current checkpoint after restart');
    assert.equal(success(await ack(restored, 'table:export')).save.game.journal.length, exported.game.journal.length);
    const futureHost = await client(running.url, clients);
    const futureCheckpoints = [];
    futureHost.on('table:checkpoint', checkpoint => futureCheckpoints.push(checkpoint));
    success(await ack(futureHost, 'table:resume', { code, playerId: credentials[1].playerId, token: credentials[1].token }));
    assert.equal(futureCheckpoints.length, 0, 'a resumed non-host must not receive a save');
    const transferred = nextState(futureHost, snapshot => snapshot.hostId === credentials[1].playerId);
    success(await ack(restored, 'table:leave')); await transferred; await tick();
    assert.equal(futureCheckpoints.length, 1, 'new host needs the existing game checkpoint immediately after handoff');
    noCredentials(futureCheckpoints[0].save);
    assert.equal(success(await ack(futureHost, 'table:export')).save.game.journal.length, exported.game.journal.length);
    const after = await (await fetch(running.url + '/health')).json();
    assert.deepEqual(after.supabase, { enabled: false, requests: 0 });
    assert.deepEqual(requests, [], 'the real configured loopback Supabase endpoint received traffic');
  } finally {
    for (const socket of clients) socket.disconnect();
    await tick(); if (running) await running.close(); await closeHTTP(fakeSupabase);
    for (const name of envNames) if (originalEnv[name] === undefined) delete process.env[name]; else process.env[name] = originalEnv[name];
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

await test('room capacity, disk expiry and short-lived chat stay bounded with a deterministic clock', { timeout: 15_000 }, async () => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v18-limits-'));
  let clock = Date.now();
  const server = http.createServer((_request, response) => { response.writeHead(404); response.end(); });
  const io = new Server(server, { serveClient: false, maxHttpBufferSize: 2 * 1024 * 1024 });
  const service = attachTableService(io, { storageDir, maxRooms: 2, ttl: 1000, chatTtl: 200, maxRoomBytes: 64 * 1024, now: () => clock, sweepInterval: 60_000 });
  const clients = [];
  try {
    const url = await listen(server);
    const [first, second, third] = await Promise.all(Array.from({ length: 3 }, () => client(url, clients)));
    const create = (socket, name) => ack(socket, 'table:create', { name, campaignId: campaign.id, classId: campaign.classes[0].id });
    const a = success(await create(first, '만료될 탁자'));
    const b = success(await create(second, '연결 중인 탁자'));
    assert.equal((await create(third, '용량 초과')).ok, false, 'new room beyond configured capacity must be rejected');
    assert.equal(service.rooms.size, 2);
    assert.equal(service.limits.maxRooms, 2); assert.equal(service.limits.roomTtlMs, 1000);
    assert.equal(service.limits.chatTtlMs, 200); assert.equal(service.limits.maxChatMessages, 30);
    assert.equal(service.limits.maxRoomBytes, 64 * 1024);
    success(await ack(second, 'table:chat', { text: '잠시 뒤 사라질 논의' }));
    assert.equal((await sync(second)).messages.length, 1);
    clock += 201; await service.sweepNow();
    assert.equal((await sync(second)).messages.length, 0, 'expired chat should disappear while the room remains connected');
    assert.ok(service.rooms.has(b.code));
    // Wait for the actual server-side disconnect before advancing the fake clock.
    const serverSocket = [...io.of('/table').sockets.values()].find(socket => socket.data.playerId === a.playerId);
    assert.ok(serverSocket);
    const left = new Promise(resolve => serverSocket.once('disconnect', resolve));
    first.disconnect(); await left;
    clock += 1001; await service.sweepNow();
    assert.equal(service.rooms.has(a.code), false, 'disconnected idle room should expire');
    assert.equal(fs.existsSync(path.join(storageDir, `${a.code}.json`)), false, 'expired snapshot should leave the disk budget');
    assert.equal(service.rooms.has(b.code), true, 'a connected party must not expire mid-session');
    const c = success(await create(third, '회수된 자리'));
    assert.ok(service.rooms.has(c.code)); assert.equal(service.rooms.size, 2);
    // A legitimate old save may contain far more prose than a bounded room can
    // retain. Import must preserve its world/players and newest journal entry,
    // while trimming old prose instead of writing a megabyte snapshot.
    const oldGame = createGame(campaign, [{ id: 'old-player', name: '원래 동료', classId: campaign.classes[0].id, connected: true }]);
    oldGame.clues = [Object.keys(campaign.clues)[0]];
    oldGame.journal = Array.from({ length: 200 }, (_, index) => ({ id: `old-${index}`, sceneTitle: '앞선 모험', actor: '원래 동료', action: `record-${index}`, text: '기'.repeat(1800), grade: 'success', roll: 12, total: 15, dc: 12, bonus: 3 }));
    assert.ok(Buffer.byteLength(JSON.stringify(oldGame)) > 1_000_000, 'fixture must exercise an oversized, multilingual save');
    success(await ack(third, 'table:import', { save: { format: 'chronicle-gate-v15', game: oldGame } }));
    const compact = success(await ack(third, 'table:export')).save.game;
    assert.equal(compact.nodeId, oldGame.nodeId); assert.deepEqual(compact.clues, oldGame.clues);
    assert.equal(compact.players[0].id, c.playerId); assert.equal(compact.players[0].health, 3);
    assert.ok(compact.journal.length > 0 && compact.journal.length < 200, 'old journal should be compacted to the configured byte budget');
    assert.equal(compact.journal.at(-1).action, 'record-199'); assert.equal(compact.journal.at(-1).text, '기'.repeat(1800));
    assert.ok(fs.statSync(path.join(storageDir, `${c.code}.json`)).size <= 64 * 1024, 'room snapshot exceeds its configured budget after import');
    const status = service.status(); assert.equal(status.rooms, 2); assert.equal(status.diskRooms, 2);
    assert.equal(status.storage, 'disk'); assert.equal(status.storageError, false);
  } finally {
    for (const socket of clients) socket.disconnect();
    await tick(); service.close(); await new Promise(resolve => io.close(resolve)); await closeHTTP(server);
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});

await test('actual createClient consumes private checkpoints without automatic export requests', { timeout: 15_000 }, async t => {
  // Only Web Storage/location and the same-origin io factory are provided by
  // this Node harness. createClient, Socket.IO and every game rule are real.
  const { startHttpService } = await import('../game-server/http-service.js');
  const { createClient } = await import('../public/game/client.js');
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v18-client-'));
  const running = await startHttpService({ port: 0, host: '127.0.0.1', tableOptions: { storageDir, roll: () => 12 } });
  const globals = ['location', 'localStorage', 'sessionStorage', 'io'];
  const descriptors = new Map(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const local = new Map(), session = new Map(), storageWrites = [], outgoing = [], notices = [], clients = [];
  let hostSocket, api;
  const storage = (map, name) => ({
    getItem(key) { return map.get(String(key)) ?? null; },
    setItem(key, value) { map.set(String(key), String(value)); storageWrites.push({ storage: name, key: String(key), value: String(value) }); },
    removeItem(key) { map.delete(String(key)); },
  });
  const install = (name, value) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  install('location', { protocol: 'http:', search: '' });
  install('localStorage', storage(local, 'local')); install('sessionStorage', storage(session, 'session'));
  install('io', (namespace, options) => {
    const socket = connect(running.url + namespace, { ...options, forceNew: true });
    socket.onAnyOutgoing(event => outgoing.push(event)); hostSocket = socket; clients.push(socket); return socket;
  });
  const key = 'chronicle-v14-online-backup';
  const backup = () => JSON.parse(local.get(key) || 'null');
  const backupWrites = () => storageWrites.filter(write => write.storage === 'local' && write.key === key).length;
  try {
    api = await createClient(() => {}, notice => notices.push(notice));
    await tick();
    const credentials = await api.create({ name: '자동 저장 방장', campaignId: campaign.id, classId: campaign.classes[0].id });
    const peer = await client(running.url, clients);
    success(await ack(peer, 'table:join', { code: credentials.code, name: '저장을 돕는 동료', classId: campaign.classes[1].id }));
    await api.start({storyLength:'basic'});
    await finishNetworkOpenings([hostSocket,peer],ack);
    await tick();
    assert.equal(api.state.capabilities.checkpoints, true); assert.equal(api.state.catalog.length, 9, 'client should preserve its local catalog when server state omits it');
    assert.ok(backup()?.game, 'host never consumed its first checkpoint');
    assert.equal(backup().format, 'chronicle-gate-v22'); assert.equal(backup().game.revision, api.state.game.revision);
    const firstRevision = backup().game.revision;
    success(await ack(peer, 'table:assist', { revision: api.state.game.revision }));
    await tick();
    assert.ok(backup().game.revision > firstRevision); assert.equal(backup().game.revision, api.state.game.revision);
    const choice = api.state.game.scene.choices.find(item => !item.automatic);
    success(await api.preview({ choiceId: choice.id })); await api.act({ choiceId: choice.id });
    assert.equal(backup().game.nodeId, api.state.game.scene.id); assert.equal(backup().game.revision, api.state.game.revision);
    const latestWriteCount = backupWrites(), latestRevision = backup().game.revision;
    for (let number = 0; number < 5; number++) await api.chat(`저장 중복 방지 ${number}`);
    assert.equal(backupWrites(), latestWriteCount, 'chat should not rewrite an identical checkpoint');
    assert.equal(backup().game.revision, latestRevision);
    assert.equal(outgoing.filter(event => event === 'table:export').length, 0, 'v17 client must not request exports automatically for state updates');
    const manual = await api.exportSave();
    assert.equal(outgoing.filter(event => event === 'table:export').length, 1, 'an explicit user export still works');
    assert.equal(manual.game.nodeId, backup().game.nodeId); noCredentials(backup());
    // Reconnection uses the actual client recovery handler and its session key.
    const serverSocket = [...running.io.of('/table').sockets.values()].find(socket => socket.data.playerId === credentials.playerId);
    const left = new Promise(resolve => serverSocket.once('disconnect', resolve));
    hostSocket.disconnect(); await left; assert.equal(api.state.connected, false);
    const returned = nextState(hostSocket, state => state.connected && state.meId === credentials.playerId && state.game);
    hostSocket.connect(); await returned; await tick();
    assert.equal(api.state.connected, true); assert.equal(backup().game.revision, api.state.game.revision);
    assert.ok(backup().game.revision > latestRevision);
    assert.equal(outgoing.filter(event => event === 'table:export').length, 1, 'rejoin checkpoint must also avoid an automatic export RPC');
    const onlineNode = backup().game.nodeId;
    await api.leave();
    assert.equal(session.has('chronicle-v14-online'), false); assert.ok(local.has(key), 'leaving a room should retain recovery data');
    await api.recoverBackup();
    assert.equal(api.state.mode, 'local'); assert.equal(api.state.game.scene.id, onlineNode); assert.equal(api.state.players.length, 2);
    assert.deepEqual(notices, []);
    t.diagnostic(`${backupWrites()} actual localStorage checkpoint writes; 0 automatic export RPCs; explicit export and local recovery passed`);
  } finally {
    api?.dispose(); for (const socket of clients) socket.disconnect(); await tick(); await running.close();
    for (const name of globals) { const descriptor = descriptors.get(name); if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});

await test('connection budget rejects overflow and reclaims a socket that never joins a room', { timeout: 8000 }, async () => {
  const { startHttpService } = await import('../game-server/http-service.js');
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v18-connections-'));
  const running = await startHttpService({ port: 0, host: '127.0.0.1', tableOptions: { storageDir, maxConnections: 2, unseatedSocketTtl: 300 } });
  const clients = [];
  try {
    const first = await client(running.url, clients);
    success(await ack(first, 'table:create', { name: '자리에 앉은 동료', campaignId: campaign.id, classId: campaign.classes[0].id }));
    const waiting = await client(running.url, clients);
    const dropped = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Unseated socket was not reclaimed')), 1800);
      waiting.once('disconnect', () => { clearTimeout(timer); resolve(); });
    });
    await assert.rejects(client(running.url, clients), /websocket|connect|transport/i, 'third live connection should exceed the configured Engine.IO budget');
    const health = await (await fetch(running.url + '/health')).json();
    assert.equal(health.limits.maxConnections, 2); assert.equal(health.limits.unseatedSocketTtlMs, 300);
    await dropped; assert.equal(first.connected, true, 'TTL must not disconnect an active room participant');
    const replacement = await client(running.url, clients);
    assert.equal(replacement.connected, true, 'expired unseated connection should free its slot');
    assert.equal((await sync(first)).players.length, 1);
  } finally {
    for (const socket of clients) socket.disconnect(); await tick(); await running.close();
    fs.rmSync(storageDir, { recursive: true, force: true });
  }
});
