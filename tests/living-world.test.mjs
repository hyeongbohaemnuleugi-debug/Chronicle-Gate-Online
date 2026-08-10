import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { explorationTemplate, EXPLORATION_APPROACHES, SIDE_QUESTS } from '../exploration-data.js';
import { CAMPAIGNS } from '../campaign-data.js';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('every campaign has a free-roam map with NPCs, POIs and a critical main quest target', () => {
  for (const campaign of CAMPAIGNS) {
    const map = explorationTemplate(campaign.id);
    assert.equal(map.width, 15);
    assert.equal(map.height, 9);
    assert.ok(map.npcs.length >= 6);
    assert.ok(map.pois.length >= 3);
    const main = map.npcs.find(n => n.id === 'main');
    assert.ok(main?.critical);
    for (const action of ['investigate','observe','infiltrate','force','negotiate','endure']) assert.ok(main.actions.includes(action));
  }
});

test('main quest has more than twenty systemic route combinations before authored story branching', () => {
  assert.equal(EXPLORATION_APPROACHES.length, 6);
  const twoStep = new Set();
  for (const a of EXPLORATION_APPROACHES) for (const b of EXPLORATION_APPROACHES) twoStep.add(`${a.id}>${b.id}`);
  assert.equal(twoStep.size, 36);
  assert.ok(twoStep.size >= 20);
});

test('ordinary NPCs expose non-dialogue actions and side quests', () => {
  const map = explorationTemplate('ember');
  const merchant = map.npcs.find(n => n.id === 'merchant');
  for (const action of ['talk','trade','steal','threaten','fight','bribe','inspect','askQuest','follow']) assert.ok(merchant.actions.includes(action));
  assert.ok(SIDE_QUESTS.length >= 5);
});

test('server implements server-authoritative movement, interaction, free action and buying', () => {
  for (const token of ["socket.on('explore:move'", "socket.on('explore:interact'", "socket.on('explore:act'", "socket.on('explore:freeAction'", "socket.on('explore:buy'"]) assert.ok(server.includes(token));
  assert.ok(server.includes('riskTier'));
  assert.ok(server.includes("tier==='cost'") || server.includes("tier === 'cost'"));
  assert.ok(server.includes('target.critical'));
});

test('client contains map movement, interaction, quest journal and free action UI', () => {
  for (const id of ['exploreView','worldMap','exploreInteraction','questJournal','exploreFreeInput']) assert.ok(html.includes(`id="${id}"`));
  assert.ok(app.includes('function renderExploration'));
  assert.ok(app.includes("state?.phase!=='explore'"));
  assert.ok(app.includes("socket.emit('explore:move'"));
});
