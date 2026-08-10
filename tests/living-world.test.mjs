import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('exploration data is embedded directly in server.js and no external exploration-data import remains', () => {
  assert.ok(server.includes('function explorationTemplate(campaignId)'));
  assert.ok(server.includes('const EXPLORATION_APPROACHES = ['));
  assert.ok(server.includes('const SIDE_QUESTS = ['));
  assert.ok(!server.includes("from './exploration-data.js'"));
  for (const campaign of CAMPAIGNS) assert.ok(server.includes(`${campaign.id}: { name:`));
});

test('main quest keeps six systemic approaches, yielding at least 36 two-step routes', () => {
  for (const id of ['investigate','observe','infiltrate','force','negotiate','endure']) {
    assert.ok(server.includes(`id:'${id}'`));
  }
  assert.ok(server.includes('Math.pow(EXPLORATION_APPROACHES.length,launches)'));
});

test('ordinary NPCs keep non-dialogue actions and side quests', () => {
  for (const action of ['talk','trade','steal','threaten','fight','bribe','inspect','askQuest','follow']) assert.ok(server.includes(`'${action}'`));
  for (const quest of ['사라진 꾸러미','묻힌 소문','경비의 부탁','금지된 기록','깨끗하지 않은 의뢰']) assert.ok(server.includes(quest));
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
