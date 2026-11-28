import test from 'node:test';
import assert from 'node:assert/strict';
import { ENCOUNTERS_A } from '../public/game/campaigns/encounters-a.js';
import { getCampaign } from '../public/game/campaigns/index.js';

const humanIds = new Set([
  'train-track-blockade', 'hotel-night-security', 'market-pier-enforcers',
  'sea-quarantine-team', 'feast-royal-guard'
]);

function reachable(campaign, from, to) {
  const pending = [from], seen = new Set();
  while (pending.length) {
    const id = pending.pop();
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const choice of campaign.nodes[id]?.choices || []) {
      for (const outcome of Object.values(choice.outcomes || {})) if (outcome.next) pending.push(outcome.next);
    }
  }
  return false;
}

// An item must be obtainable before this particular gate. Tracking consumption
// catches a plausible-looking tactic which can only use an item gained later.
function canBringItemToGate(campaign, gate, item) {
  const pending = [[campaign.start, false]], seen = new Set();
  while (pending.length) {
    let [id, held] = pending.pop();
    if (id === gate) { if (held) return true; continue; }
    const key = `${id}/${held}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const node = campaign.nodes[id];
    if (!node) continue;
    if ((node.details || []).some(detail => (detail.gainItems || []).includes(item))) held = true;
    for (const choice of node.choices || []) {
      if (choice.requires?.item === item && !held) continue;
      for (const outcome of Object.values(choice.outcomes || {})) {
        const spent = (choice.consumeItems || []).includes(item) || (outcome.consumeItems || []).includes(item);
        const gained = (outcome.gainItems || []).includes(item);
        if (outcome.next) pending.push([outcome.next, gained || (held && !spent)]);
      }
    }
  }
  return false;
}

test('first five campaigns have 20 distinct new foes, with one genuinely human opponent per Basic story', () => {
  assert.equal(Object.keys(ENCOUNTERS_A).length, 5);
  const ids = new Set(), names = new Set(), foundHumans = new Set();
  for (const content of Object.values(ENCOUNTERS_A)) {
    assert.equal(content.shared.length, 2);
    assert.equal(content.epic.length, 2);
    const humans = content.shared.filter(spec => humanIds.has(spec.id));
    assert.equal(humans.length, 1);
    foundHumans.add(humans[0].id);
    assert.doesNotMatch(JSON.stringify(humans[0]), /녹슨 사냥개|린넨 짐승|동전두꺼비|유리등 해파리|찬장도깨비/);
    for (const spec of [...content.shared, ...content.epic]) {
      assert.ok(!ids.has(spec.id)); ids.add(spec.id);
      assert.ok(!names.has(spec.enemyName)); names.add(spec.enemyName);
      assert.equal(spec.gateText.length, 2);
      assert.equal(spec.intro.length, 2);
      assert.notDeepEqual(spec.intro, spec.gateText);
      assert.notEqual(spec.intro[1], spec.enemyDescription, 'Battle prose must not repeat a bestiary entry.');
      assert.ok(spec.intro.every(line => typeof line === 'string' && line.length >= 24));
      assert.equal(new Set(spec.intents.map(intent => intent.name)).size, 3);
      assert.ok(spec.intents.every(intent => !intent.text.includes('동료')), 'Enemy targeting must also read correctly in solo play.');
      assert.equal(spec.actions.basic.length, 4);
      assert.equal(spec.actions.ability.length, 4);
    }
  }
  assert.equal(ids.size, 20);
  assert.deepEqual(foundHumans, humanIds);
});

for (const [storyId, content] of Object.entries(ENCOUNTERS_A)) {
  test(`${storyId}: tactics have obtainable items and callbacks occur after the encounter`, () => {
    for (const mode of ['basic', 'epic']) {
      const campaign = getCampaign(storyId, mode);
      const specs = [...content.shared, ...(mode === 'epic' ? content.epic : [])];
      const newIds = new Set(specs.map(spec => spec.id));
      const coreEntry = campaign.encounterCatalog.find(entry => !newIds.has(entry.id));
      for (const spec of [...specs, { ...content.core, id: coreEntry.id }]) {
        const entry = campaign.encounterCatalog.find(entry => entry.id === spec.id);
        assert.ok(entry, spec.id);
        assert.ok(reachable(campaign, entry.arenaId, spec.followupAt), `${spec.id} recalls an unreachable later scene.`);
        for (const method of ['victory', 'negotiated', 'bypassed', ...(spec.tool ? ['tool'] : [])]) {
          assert.ok(spec.echoes?.[method]?.length >= 20, `${spec.id}/${method} needs its own later consequence.`);
        }
        assert.ok(!spec.bypass.effects?.harm && !spec.bypass.effects?.harmAll);
        assert.deepEqual(Object.keys(spec.negotiate.outcomes).sort(), ['critical', 'failure', 'fumble', 'success']);
        assert.equal(spec.negotiate.outcomes.fumble.method, 'fight');
        assert.equal(spec.negotiate.outcomes.failure.method, 'bypassed');
        if (spec.tool) {
          const item = spec.tool.requires.item;
          assert.ok(campaign.items[item], `${spec.id} references unknown ${item}`);
          assert.ok(canBringItemToGate(campaign, entry.gateId, item), `${spec.id}/${mode}: ${item} is only found after its use.`);
          if (spec.tool.consumeItems?.length) assert.match(spec.tool.label, /소모/, 'The item cost must be visible before committing.');
        }
      }
    }
  });
}

test('human additions preserve fixed station headcount and palace routes without a carried sample', () => {
  const inspectors = ENCOUNTERS_A['deep-sea'].shared[0];
  assert.match(inspectors.gateText.join(' '), /2인용 점검정/);
  assert.match(inspectors.gateText.join(' '), /두 외부 요원/);
  assert.match(inspectors.aftermathText.join(' '), /점검정으로 돌아간다/);
  assert.doesNotMatch(inspectors.aftermathText.join(' '), /확인 표식이 붙었다/);
  const guards = ENCOUNTERS_A['dragon-banquet'].shared[0];
  assert.match(guards.gateText.join(' '), /도란이 미리 준비한 공용 시험 시료/);
  assert.match(guards.gateText.join(' '), /자료만 있는 일행/);
  assert.equal(guards.tool.requires.item, 'salt-vial');
  assert.equal(guards.tool.consumeItems, undefined, 'Showing a sealed sample must not silently use up its later comparison test.');
});

test('37 source arrival corrections are actually applied before the newly inserted approaches', () => {
  let count = 0;
  for (const storyId of ['last-train', 'glass-hotel', 'deep-sea']) {
    const edits = ENCOUNTERS_A[storyId].continuityEdits;
    assert.ok(edits.length > 0);
    for (const mode of ['basic', 'epic']) {
      const campaign = getCampaign(storyId, mode);
      const prose = Object.values(campaign.nodes).flatMap(node =>
        (node.choices || []).flatMap(choice => Object.values(choice.outcomes || {}).map(outcome => outcome.text || '')));
      for (const edit of edits) {
        assert.ok(!prose.includes(edit.from), `${storyId}/${mode}: old interior arrival still appears before a gate.`);
        assert.ok(prose.includes(edit.to), `${storyId}/${mode}: corrected arrival was dropped.`);
      }
    }
    count += edits.length;
  }
  assert.equal(count, 37);
});
