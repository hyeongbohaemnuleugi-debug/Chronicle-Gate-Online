import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS, ITEMS_BY_CAMPAIGN, STAT_NAMES, ECONOMY_FACILITY_TEMPLATES, ECONOMY_FACILITY_THEMES } from '../campaign-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('each campaign has six equippable items with direct modifier bonuses', () => {
  for (const campaign of CAMPAIGNS) {
    const items = campaign.items || ITEMS_BY_CAMPAIGN[campaign.id] || [];
    assert.ok(items.length >= 6, `${campaign.id} item count`);
    assert.equal(new Set(items.map(item => item.id)).size, items.length, `${campaign.id} unique item ids`);
    for (const item of items) {
      assert.ok(['weapon','armor','charm','tool'].includes(item.slot), `${item.id} slot`);
      assert.ok(STAT_NAMES.includes(item.stat), `${item.id} stat`);
      assert.ok([1,2].includes(Number(item.bonus)), `${item.id} modifier bonus`);
      assert.ok(Number(item.price) >= 7, `${item.id} price should remain expensive`);
      assert.ok(item.passive?.length >= 8, `${item.id} passive description`);
    }
  }
});

test('economy facilities are probabilistic templates with narrative themes', () => {
  for (const kind of ['restaurant','inn','shop','quest','gamble']) assert.ok(ECONOMY_FACILITY_TEMPLATES[kind], `missing ${kind}`);
  for (const campaign of CAMPAIGNS) {
    assert.ok(campaign.events.some(event => event.facilityEligible), `${campaign.id} needs eligible facility events`);
    assert.ok(campaign.events.some(event => event.lootItemId), `${campaign.id} missing contextual loot event`);
    assert.ok(campaign.events.some(event => event.coinReward), `${campaign.id} missing contextual coin reward event`);
    for (const kind of ['restaurant','inn','shop','quest','gamble']) {
      const theme = ECONOMY_FACILITY_THEMES[campaign.id]?.[kind];
      assert.ok(theme?.storyLead?.length > 20, `${campaign.id} ${kind} needs prose lead`);
    }
  }
});

test('server uses direct modifier gear, rare starting money, random facilities and contextual loot', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /socket\.on\('facility:action'/);
  assert.match(server, /socket\.on\('item:equip'/);
  assert.match(server, /function effectiveAbilityMod/);
  assert.match(server, /coins = 1/);
  assert.match(server, /maybeAttachFacility/);
  assert.match(server, /lootItemId/);
  assert.doesNotMatch(server, /margin >= 10\) \{\s*const got = grantItem/);
});

test('client renders coin inventory equipment and prose facility UI', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(html, /id="economyPanel"/);
  assert.match(html, /id="facilityPanel"/);
  assert.match(app, /renderEconomyPanel/);
  assert.match(app, /renderFacilityPanel/);
  assert.match(app, /판정 \+\$\{item\.bonus\}/);
  assert.match(app, /facility-story-lead/);
});
