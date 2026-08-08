import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS, ITEMS_BY_CAMPAIGN, STAT_NAMES } from '../campaign-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('each campaign has six equippable items with valid stat bonuses', () => {
  for (const campaign of CAMPAIGNS) {
    const items = campaign.items || ITEMS_BY_CAMPAIGN[campaign.id] || [];
    assert.equal(items.length, 6, `${campaign.id} item count`);
    assert.equal(new Set(items.map(item => item.id)).size, 6, `${campaign.id} unique item ids`);
    for (const item of items) {
      assert.ok(['weapon','armor','charm','tool'].includes(item.slot), `${item.id} slot`);
      assert.ok(STAT_NAMES.includes(item.stat), `${item.id} stat`);
      assert.ok(Number(item.bonus) >= 2, `${item.id} bonus`);
      assert.ok(Number(item.price) > 0, `${item.id} price`);
      assert.ok(item.passive?.length >= 8, `${item.id} passive description`);
    }
  }
});

test('campaigns include shops, rest stops, jobs, gambling and loot events', () => {
  for (const campaign of CAMPAIGNS) {
    const facilities = campaign.events.map(event => event.facility?.type).filter(Boolean);
    for (const kind of ['restaurant','inn','shop','quest','gamble']) assert.ok(facilities.includes(kind), `${campaign.id} missing ${kind}`);
    assert.ok(campaign.events.some(event => event.lootReward), `${campaign.id} missing loot event`);
    assert.ok(campaign.events.some(event => event.coinReward), `${campaign.id} missing coin reward event`);
  }
});

test('server contains authoritative coin, equipment and reward handlers', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /socket\.on\('facility:action'/);
  assert.match(server, /socket\.on\('item:equip'/);
  assert.match(server, /effectiveAbilityTotal/);
  assert.match(server, /rollReward/);
  assert.match(server, /equipmentStatBonus/);
});

test('client renders coin inventory equipment and facility UI', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(html, /id="economyPanel"/);
  assert.match(html, /id="facilityPanel"/);
  assert.match(app, /renderEconomyPanel/);
  assert.match(app, /renderFacilityPanel/);
  assert.match(app, /data-equip-item/);
});
