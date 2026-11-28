import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { CAMPAIGNS, getCampaign } from '../public/game/campaigns/index.js';
import { BATTLE_APPEARANCES, battleAppearance } from '../public/game/battle-assets.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('scripts/battle-art/manifest-v23.json', root), 'utf8'));

test('every real encounter name resolves to its own illustration in Basic and Epic', () => {
  assert.equal(Object.keys(BATTLE_APPEARANCES).length, 45);
  const ids = new Set();
  for (const source of CAMPAIGNS) for (const length of ['basic','epic']) {
    const campaign = getCampaign(source.id, length);
    const encounters = Object.values(campaign.nodes).filter(node => node.encounter).map(node => node.encounter);
    assert.equal(encounters.length, length==='epic'?5:3);
    for (const encounter of encounters) {
      const appearance = battleAppearance(encounter.id);
      assert.equal(appearance.name, encounter.enemyName);
      assert.equal(appearance.campaignId, campaign.id);
      assert.match(appearance.src, /^\/game\/art\/enemies\/[a-z0-9-]+\.webp\?v=(?:23000|24000)$/);
      assert.ok(appearance.alt.length > 20, 'meaningful setting-specific alternate text');
      ids.add(appearance.id);
    }
  }
  assert.equal(ids.size, 45);
  assert.equal(battleAppearance('../../unsafe').src, '');
});

test('nine delivered transparent WebP sprites match hashes and their compact real byte budget', () => {
  const hashes = new Set(); let total = 0;
  assert.equal(manifest.entries.length, 9);
  for (const entry of manifest.entries) {
    const bytes = fs.readFileSync(new URL(entry.file, root));
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(digest, entry.sha256, entry.id);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(bytes.subarray(0,4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8,12).toString(), 'WEBP');
    assert.equal(bytes.subarray(12,16).toString(), 'VP8X');
    assert.ok(bytes[20] & 0x10, `${entry.id}: alpha channel preserved`);
    assert.equal(bytes.readUIntLE(24,3)+1, entry.width);
    assert.equal(bytes.readUIntLE(27,3)+1, entry.height);
    assert.ok(entry.width <= 384 && entry.height <= 384);
    assert.ok(bytes.length > 5000 && bytes.length < 80000);
    assert.ok(fs.existsSync(new URL(entry.reference, root)), 'existing style reference retained');
    hashes.add(digest); total += bytes.length;
  }
  assert.equal(hashes.size,9,'every encounter has a distinct drawing');
  assert.equal(total,manifest.totalBytes);
  assert.ok(total <= 500000,`sprite budget ${total}`);
});
