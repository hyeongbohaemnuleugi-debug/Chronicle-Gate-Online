import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS } from '../campaign-data.js';

function walk(campaign, selector) {
  const byId = new Map(campaign.storyBeats.map(b => [b.id, b]));
  const seen = new Set();
  let id = campaign.storyBeats[0].id;
  let steps = 0;
  while (id && id !== '__ENDING__') {
    assert.ok(byId.has(id), `${campaign.id}: missing node ${id}`);
    assert.ok(!seen.has(id), `${campaign.id}: repeated node ${id}`);
    seen.add(id);
    const beat = byId.get(id);
    const choice = selector(beat, steps);
    assert.ok(choice, `${beat.id}: no choice`);
    const success = selector.successFor ? selector.successFor(beat, steps) : true;
    id = choice.next?.[success ? 'success' : 'failure'];
    steps += 1;
    assert.ok(steps <= 80, `${campaign.id}: graph did not terminate`);
  }
  assert.equal(id, '__ENDING__', `${campaign.id}: graph did not reach ending`);
  return seen;
}

for (const campaign of CAMPAIGNS) {
  test(`${campaign.id}: deep branch graph has valid unique edges`, () => {
    const ids = new Set(campaign.storyBeats.map(b => b.id));
    assert.equal(ids.size, campaign.storyBeats.length);
    assert.ok(campaign.storyBeats.length >= 400, `${campaign.id}: expected hundreds of consequence nodes`);
    const canonical = campaign.storyBeats.filter(b => !b.branchScene);
    assert.equal(canonical.length, 30);
    for (const beat of campaign.storyBeats) {
      for (const choice of beat.choices || []) {
        for (const key of ['success','failure']) {
          const target = choice.next?.[key];
          assert.ok(target, `${beat.id}/${choice.id}: missing ${key}`);
          if (target !== '__ENDING__') assert.ok(ids.has(target), `${beat.id}: missing ${target}`);
        }
      }
    }
  });

  test(`${campaign.id}: opening actions produce distinct consequence scenes`, () => {
    const entry = campaign.storyBeats[0];
    assert.ok(entry.choices.length >= 6);
    assert.equal(new Set(entry.choices.map(c => c.next.success)).size, entry.choices.length);
    assert.equal(new Set(entry.choices.map(c => c.next.failure)).size, entry.choices.length);
  });

  test(`${campaign.id}: representative playthroughs terminate without repeats`, () => {
    for (let choiceIndex=0; choiceIndex<3; choiceIndex++) {
      const selector = beat => beat.choices[Math.min(choiceIndex, beat.choices.length-1)];
      selector.successFor = (_beat, step) => (step + choiceIndex) % 3 !== 1;
      const seen=walk(campaign,selector);
      assert.ok(seen.size >= 15 && seen.size <= 80, `${campaign.id}: unexpected route ${seen.size}`);
    }
  });
}
