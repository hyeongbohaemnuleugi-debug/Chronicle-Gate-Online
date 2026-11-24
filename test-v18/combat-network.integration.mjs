/** Actual Socket.IO clients: themed jobs, combat authority and portable mid-fight saves. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Server } from 'socket.io';
import { io as connectClient } from 'socket.io-client';
import { attachTableService } from '../game-server/table-service.js';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v18-combat-network-'));
const campaign = CAMPAIGNS.find(c => c.id === 'deep-sea');
const otherCampaign = CAMPAIGNS.find(c => c.id === 'last-train');
const marks = [];
let running = null, requestSerial = 0;
const mark = text => { marks.push(text); console.log(`OK ${text}`); };
const success = result => { assert.equal(result?.ok, true, result?.error); return result; };
function ack(socket, event, payload = {}) {
  return new Promise((resolve, reject) => socket.timeout(3500).emit(event, payload, (error, result) => {
    if (error) return reject(new Error(`${event}: acknowledgement timed out`));
    if (!result || typeof result !== 'object') return reject(new Error(`${event}: invalid response`));
    resolve(result);
  }));
}
const sync = async socket => success(await ack(socket, 'table:sync')).state;
function broadcast(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('table:state', handle); reject(new Error('Expected state broadcast timed out')); }, 3500);
    function handle(state) { if (predicate(state)) { clearTimeout(timer); socket.off('table:state', handle); resolve(state); } }
    socket.on('table:state', handle);
  });
}
async function startServer() {
  const server = http.createServer((_request, response) => { response.writeHead(404); response.end(); });
  const io = new Server(server, { serveClient: false, maxHttpBufferSize: 100000 });
  const context = { server, io, sockets: [], dice: [], rollCount: 0 };
  context.service = attachTableService(io, { storageDir, roll: () => { context.rollCount++; return context.dice.length ? context.dice.shift() : 12; } });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  context.url = `http://127.0.0.1:${server.address().port}/table`;
  return context;
}
async function client(context) {
  const socket = connectClient(context.url, { transports: ['websocket'], forceNew: true, reconnection: false, autoConnect: false, timeout: 3000 });
  context.sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Connection timed out')); }, 3500);
    socket.once('connect', () => { clearTimeout(timer); resolve(); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
    socket.connect();
  });
  return socket;
}
async function stopServer(context) {
  if (!context) return;
  for (const socket of context.sockets) socket.disconnect();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => context.io.close(resolve));
  context.service.close();
  if (context.server.listening) await new Promise(resolve => context.server.close(resolve));
}
function noCredentials(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) { assert.ok(!['token', 'tokenHash', 'password', 'socketId'].includes(key), `Credential leak: ${key}`); noCredentials(item); }
}
function routeToFight(c, nodeId = c.start, pathSoFar = []) {
  const node = c.nodes[nodeId];
  if (node.encounter) return pathSoFar;
  if (node.ending) return null;
  for (const choice of node.choices || []) {
    if (choice.requires || choice.useItems?.length || choice.consumeItems?.length) continue;
    const next = choice.outcomes?.[choice.automatic ? 'success' : 'critical']?.next;
    if (!next || pathSoFar.some(step => step.nodeId === next)) continue;
    const found = routeToFight(c, next, [...pathSoFar, { nodeId, choiceId: choice.id }]);
    if (found) return found;
  }
  return null;
}
function snapshot(game) {
  const combat = game.combat;
  return {
    scene: game.scene.id, phase: game.phase, activePlayerId: game.activePlayerId,
    players: game.players.map(({ id, classId, health, life }) => ({ id, classId, health, life })),
    combat: combat && {
      id: combat.id, round: combat.round, enemy: combat.enemy, intent: combat.intent,
      actedIds: combat.actedIds, usedAbilityIds: combat.usedAbilityIds, statuses: combat.statuses,
      vulnerable: combat.vulnerable, staggered: combat.staggered, log: combat.log,
    },
  };
}
function normalizeIds(value, ids) {
  if (typeof value === 'string') return ids.has(value) ? ids.get(value) : value;
  if (Array.isArray(value)) return value.map(item => normalizeIds(item, ids));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [ids.get(key) || key, normalizeIds(item, ids)]));
  return value;
}
function resultDetails(result) {
  return Object.fromEntries(['combat', 'combatEvent', 'damage', 'targetId', 'enemyRolls', 'deaths', 'roll', 'total', 'dc', 'bonus'].map(key => [key, result?.[key]]));
}

try {
  assert.equal(campaign.classes.length, 4, 'Campaign class data is required.');
  running = await startServer();
  let sockets = await Promise.all(Array.from({ length: 4 }, () => client(running)));
  const credentials = [];
  const foreignClass = otherCampaign.classes[0].id;
  assert.equal((await ack(sockets[0], 'table:create', { name: '잘못된 직업', classId: foreignClass, campaignId: campaign.id })).ok, false);
  credentials[0] = success(await ack(sockets[0], 'table:create', { name: '아린', classId: campaign.classes[2].id, campaignId: campaign.id }));
  const code = credentials[0].code;
  assert.equal((await ack(sockets[1], 'table:join', { code, name: '다른 세계 직업', classId: foreignClass })).ok, false);
  credentials[1] = success(await ack(sockets[1], 'table:join', { code, name: '도윤' }));
  assert.equal(credentials[1].state.players.find(p => p.id === credentials[1].playerId).classId, campaign.classes[0].id, 'Joining before knowing the campaign should pick an unused job.');
  credentials[2] = success(await ack(sockets[2], 'table:join', { code, name: '서린', classId: campaign.classes[1].id }));
  credentials[3] = success(await ack(sockets[3], 'table:join', { code, name: '유진', classId: campaign.classes[3].id }));
  assert.equal((await ack(sockets[0], 'table:class', { classId: foreignClass })).ok, false);
  const slots = [2, 0, 1, 3];
  success(await ack(sockets[0], 'table:campaign', { campaignId: otherCampaign.id }));
  let state = await sync(sockets[0]);
  assert.deepEqual(state.players.map(p => p.classId), slots.map(i => otherCampaign.classes[i].id));
  success(await ack(sockets[0], 'table:campaign', { campaignId: campaign.id }));
  state = await sync(sockets[0]);
  assert.deepEqual(state.players.map(p => p.classId), slots.map(i => campaign.classes[i].id));
  assert.equal((await ack(sockets[1], 'table:campaign', { campaignId: otherCampaign.id })).ok, false);
  mark('cross-campaign jobs are rejected; joining without a job works; host campaign changes preserve profession slots');

  success(await ack(sockets[0], 'table:start'));
  state = await sync(sockets[0]);
  const indexFor = id => credentials.findIndex(entry => entry.playerId === id);
  const actorSocket = s => sockets[indexFor(s.game.activePlayerId)];
  const route = routeToFight(campaign); assert.ok(route && route.length > 0);
  for (const step of route) {
    assert.equal(state.game.scene.id, step.nodeId);
    running.dice = [20];
    const socket = actorSocket(state);
    success(await ack(socket, 'table:act', { choiceId: step.choiceId, revision: state.game.revision, requestId: `story-${requestSerial++}` }));
    state = await sync(socket);
  }
  assert.ok(state.game.combat);
  assert.equal(state.game.combat.enemy.maxHealth, 18);
  assert.deepEqual(state.game.scene.choices, []);
  const fightingActor = state.game.activePlayerId;
  const currentSocket = actorSocket(state);
  const offTurnIndex = (indexFor(fightingActor) + 1) % 4;
  const initialRolls = running.rollCount, initialHealth = state.game.combat.enemy.health;
  assert.equal((await ack(sockets[offTurnIndex], 'table:act', { combatAction: 'basic', playerId: fightingActor, roll: 20, damage: 999, revision: state.game.revision, requestId: 'forged-seat' })).ok, false);
  assert.equal(running.rollCount, initialRolls);
  assert.equal((await ack(currentSocket, 'table:act', { choiceId: campaign.nodes[state.game.scene.id].choices[0].id, revision: state.game.revision, requestId: 'story-bypass' })).ok, false);
  const beforeHelp = success(await ack(currentSocket, 'table:preview', { combatAction: 'basic' }));
  success(await ack(sockets[offTurnIndex], 'table:assist', { revision: state.game.revision }));
  assert.equal((await ack(currentSocket, 'table:act', { combatAction: 'basic', revision: beforeHelp.plan.revision, requestId: 'stale-combat' })).ok, false);
  assert.equal(running.rollCount, initialRolls);
  const fresh = success(await ack(currentSocket, 'table:preview', { combatAction: 'basic' }));
  assert.equal(fresh.plan.type, 'combat'); assert.equal(fresh.plan.assistance, 1);
  running.dice = [1];
  const forged = { combatAction: 'basic', revision: fresh.plan.revision, requestId: 'only-one-combat-roll', roll: 20, total: 999, bonus: 999, damage: 999, enemyHealth: 0 };
  const accepted = success(await ack(currentSocket, 'table:act', forged));
  state = await sync(currentSocket);
  assert.equal(state.game.lastResult.roll, 1);
  assert.equal(state.game.lastResult.damage, 0);
  assert.equal(state.game.combat.enemy.health, initialHealth);
  assert.equal(running.rollCount, initialRolls + 1);
  assert.deepEqual(success(await ack(currentSocket, 'table:act', forged)), accepted);
  assert.equal(running.rollCount, initialRolls + 1);
  mark('real combat gates story actions and ignores forged actor/dice/damage; stale and repeated requests cannot reroll');

  const firstRound = state.game.combat.round;
  while (state.game.combat.round === firstRound) {
    const who = state.game.players.find(p => p.id === state.game.activePlayerId);
    const job = campaign.classes.find(c => c.id === who.classId);
    const utility = !['strike', 'drain'].includes(job.ability.type) && !state.game.combat.usedAbilityIds.includes(who.id);
    const payload = utility ? { combatAction: 'ability', ...(['ally', 'self'].includes(job.ability.target) ? { targetId: who.id } : {}) } : { combatAction: 'basic' };
    running.dice = utility ? [20, 20, 20, 20] : [2, 20, 20, 20, 20];
    const socket = actorSocket(state);
    success(await ack(socket, 'table:act', { ...payload, revision: state.game.revision, requestId: `combat-${requestSerial++}` }));
    state = await sync(socket);
    assert.ok(state.game.combat, 'This setup must remain mid-fight.');
  }
  assert.ok(state.game.combat.usedAbilityIds.length >= 1);
  assert.ok(state.game.lastResult.enemyRolls.length >= 1);
  const ownerId = state.game.combat.usedAbilityIds[0], ownerIndex = indexFor(ownerId);
  const helperIndex = state.game.activePlayerId === ownerId ? (ownerIndex + 1) % 4 : ownerIndex;
  success(await ack(sockets[helperIndex], 'table:assist', { revision: state.game.revision }));
  state = await sync(sockets[0]);
  const portable = success(await ack(sockets[0], 'table:export')).save;
  assert.equal(portable.format, 'chronicle-gate-v19'); assert.equal(portable.game.schema, 17);
  assert.deepEqual(portable.game.assists, [credentials[helperIndex].playerId]);
  noCredentials(portable);
  assert.equal((await ack(sockets[1], 'table:export')).ok, false);
  const beforeReconnect = snapshot(state.game);
  const observerIndex = (ownerIndex + 1) % 4;
  const disconnected = broadcast(sockets[observerIndex], s => s.players.find(p => p.id === ownerId)?.connected === false);
  sockets[ownerIndex].disconnect(); await disconnected;
  sockets[ownerIndex] = await client(running);
  const resumed = success(await ack(sockets[ownerIndex], 'table:resume', { code, playerId: ownerId, token: credentials[ownerIndex].token }));
  assert.deepEqual(snapshot(resumed.state.game), beforeReconnect);
  assert.equal(resumed.state.game.combat.actions.ability.available, false);
  mark('mid-fight reconnect preserves enemy health, shields, targets and spent skills; host exports v18 without credentials');

  const beforeRestart = success(await ack(sockets[0], 'table:export')).save;
  const beforeRestartView = await sync(sockets[0]);
  await stopServer(running); running = null;
  running = await startServer();
  sockets = await Promise.all(Array.from({ length: 4 }, () => client(running)));
  for (let i = 0; i < 4; i++) success(await ack(sockets[i], 'table:resume', { code, playerId: credentials[i].playerId, token: credentials[i].token }));
  state = await sync(sockets[0]);
  assert.deepEqual(snapshot(state.game), snapshot(beforeRestartView.game));
  const diskRestored = success(await ack(sockets[0], 'table:export')).save;
  assert.deepEqual(diskRestored.game.assists, beforeRestart.game.assists);
  assert.deepEqual(resultDetails(state.game.lastResult), resultDetails(beforeRestart.game.lastResult));
  const ownerRestored = await sync(sockets[ownerIndex]);
  assert.equal(ownerRestored.game.combat.actions.ability.available, false);
  assert.equal(state.storage, 'disk');
  mark('fresh service/disk restore preserves the precise combat phase, one-use skills, last enemy rolls and pending assistance');

  const importedSockets = await Promise.all(Array.from({ length: 4 }, () => client(running)));
  const importedSeats = [];
  importedSeats[0] = success(await ack(importedSockets[0], 'table:create', { name: '복원 아린', campaignId: otherCampaign.id, classId: otherCampaign.classes[0].id }));
  for (let i = 1; i < 4; i++) importedSeats[i] = success(await ack(importedSockets[i], 'table:join', { code: importedSeats[0].code, name: `복원 동료${i}` }));
  const broken = structuredClone(beforeRestart); broken.game.combat.enemyHealth = 9999;
  assert.equal((await ack(importedSockets[0], 'table:import', { save: broken })).ok, false);
  assert.equal((await sync(importedSockets[0])).game, null);
  assert.equal((await ack(importedSockets[1], 'table:import', { save: beforeRestart })).ok, false);
  success(await ack(importedSockets[0], 'table:import', { save: beforeRestart }));
  let imported = await sync(importedSockets[0]);
  const importedSave = success(await ack(importedSockets[0], 'table:export')).save;
  const oldMap = new Map(credentials.map((c, i) => [c.playerId, `seat-${i}`]));
  const newMap = new Map(importedSeats.map((c, i) => [c.playerId, `seat-${i}`]));
  assert.deepEqual(normalizeIds(snapshot(imported.game), newMap), normalizeIds(snapshot(beforeRestartView.game), oldMap));
  assert.deepEqual(normalizeIds(importedSave.game.assists, newMap), normalizeIds(beforeRestart.game.assists, oldMap));
  assert.deepEqual(normalizeIds(resultDetails(importedSave.game.lastResult), newMap), normalizeIds(resultDetails(beforeRestart.game.lastResult), oldMap));
  assert.deepEqual(imported.game.players.map(p => p.classId), beforeRestart.game.players.map(p => p.classId));
  assert.equal(imported.campaignId, campaign.id);
  noCredentials(importedSave);
  mark('portable mid-combat import rejects corrupt state and remaps every seat reference, targets, assists and combat roll metadata');

  const importedIndex = id => importedSeats.findIndex(c => c.playerId === id);
  // Move away from the host's turn, then demonstrate that a disconnected peer
  // neither blocks the fight nor grants an unlimited safe pass to connected players.
  assert.equal((await ack(importedSockets[0], 'table:pass', { revision: imported.game.revision })).ok, false);
  if (imported.game.activePlayerId === importedSeats[0].playerId) {
    running.dice = [2, 1, 1, 1, 1];
    success(await ack(importedSockets[0], 'table:act', { combatAction: 'basic', revision: imported.game.revision, requestId: 'move-host-turn' }));
    imported = await sync(importedSockets[0]);
  }
  const awayId = imported.game.activePlayerId, awayIndex = importedIndex(awayId);
  assert.notEqual(awayIndex, 0);
  const waiting = broadcast(importedSockets[0], s => s.players.find(p => p.id === awayId)?.connected === false);
  importedSockets[awayIndex].disconnect(); imported = await waiting;
  const unauthorizedIndex = [1, 2, 3].find(i => i !== awayIndex);
  assert.equal((await ack(importedSockets[unauthorizedIndex], 'table:pass', { revision: imported.game.revision })).ok, false);
  const roundBeforePass = imported.game.combat.round;
  running.dice = [1, 1, 1, 1];
  success(await ack(importedSockets[0], 'table:pass', { revision: imported.game.revision }));
  imported = await sync(importedSockets[0]);
  assert.notEqual(imported.game.activePlayerId, awayId);
  while (imported.game.combat.round === roundBeforePass) {
    const socket = importedSockets[importedIndex(imported.game.activePlayerId)];
    running.dice = [2, 1, 1, 1, 1];
    success(await ack(socket, 'table:act', { combatAction: 'basic', revision: imported.game.revision, requestId: `after-pass-${requestSerial++}` }));
    imported = await sync(socket);
  }
  assert.ok(imported.game.lastResult.enemyRolls.length > 0);
  importedSockets[awayIndex] = await client(running);
  const returned = success(await ack(importedSockets[awayIndex], 'table:resume', { code: importedSeats[0].code, playerId: awayId, token: importedSeats[awayIndex].token }));
  assert.equal(returned.state.players.length, 4);
  assert.equal(returned.state.game.combat.actions.ability.available, !returned.state.game.combat.usedAbilityIds.includes(awayId));
  mark('connected actors cannot skip combat; host can pass a disconnected seat and enemy rounds still execute');

  console.log(`V18 COMBAT NETWORK PASS: ${marks.length} groups; actual four-client Socket.IO, themed classes, server dice, reconnect, disk save and portable combat restore.`);
} catch (error) {
  console.error('V18 COMBAT NETWORK FAILED:', error.stack || error);
  process.exitCode = 1;
} finally {
  await stopServer(running).catch(error => { console.error('Cleanup failed:', error.message); process.exitCode = 1; });
  fs.rmSync(storageDir, { recursive: true, force: true });
}
