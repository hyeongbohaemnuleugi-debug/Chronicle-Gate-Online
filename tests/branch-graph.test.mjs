\import test from 'node:test';
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
    assert.ok(steps <= 30, `${campaign.id}: graph did not terminate`);
  }
  assert.equal(id, '__ENDING__', `${campaign.id}: graph did not reach ending`);
  return seen;
}

for (const campaign of CAMPAIGNS) {
  test(`${campaign.id}: authored graph has valid forward edges`, () => {
    const ids = new Set(campaign.storyBeats.map(b => b.id));
    const pos = new Map(campaign.storyBeats.map((b, i) => [b.id, i]));
    assert.equal(ids.size, 30);
    for (const beat of campaign.storyBeats) {
      assert.equal(beat.artChapter, beat.chapter);
      for (const choice of beat.choices) {
        for (const key of ['success', 'failure']) {
          const target = choice.next?.[key];
          assert.ok(target, `${beat.id}/${choice.id}: missing ${key} target`);
          if (target !== '__ENDING__') {
            assert.ok(ids.has(target), `${beat.id}: missing ${target}`);
            assert.ok(pos.get(target) > pos.get(beat.id), `${beat.id}: backward edge to ${target}`);
          }
        }
      }
    }
  });

  test(`${campaign.id}: different opening choices expose different route nodes`, () => {
    const entry = campaign.storyBeats[0];
    const targets = entry.choices.map(c => c.next.success);
    assert.equal(new Set(targets).size, 3);
  });

  test(`${campaign.id}: representative playthroughs never repeat`, () => {
    for (let choiceIndex = 0; choiceIndex < 3; choiceIndex++) {
      const selector = beat => beat.choices[Math.min(choiceIndex, beat.choices.length - 1)];
      selector.successFor = () => choiceIndex !== 1;
      const seen = walk(campaign, selector);
      assert.ok(seen.size >= 20 && seen.size <= 30, `${campaign.id}: unexpected route length ${seen.size}`);
    }
  });
}
