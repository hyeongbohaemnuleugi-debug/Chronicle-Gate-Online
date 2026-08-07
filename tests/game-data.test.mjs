import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS, STAT_NAMES } from '../campaign-data.js';

test('campaign catalog is complete and unique', () => {
  assert.equal(CAMPAIGNS.length, 5);
  assert.equal(new Set(CAMPAIGNS.map(c => c.id)).size, 5);
  assert.equal(STAT_NAMES.length, 6);
});

for (const campaign of CAMPAIGNS) {
  test(`${campaign.id}: 30 unique events become a 60-card deck`, () => {
    assert.equal(campaign.events.length, 30);
    assert.equal(new Set(campaign.events.map(e => e.id)).size, 30);
    assert.equal(new Set(campaign.events.map(e => e.title)).size, 30);
    const deck = campaign.events.flatMap(e => [{ ...e, copy: 1 }, { ...e, copy: 2 }]);
    assert.equal(deck.length, 60);
    const counts = new Map();
    for (const card of deck) counts.set(card.id, (counts.get(card.id) || 0) + 1);
    for (const count of counts.values()) assert.equal(count, 2);
  });

  test(`${campaign.id}: jobs, acts and choices are valid`, () => {
    assert.equal(campaign.jobs.length, 6);
    assert.equal(campaign.acts.length, 5);
    for (const event of campaign.events) {
      assert.ok(event.act >= 1 && event.act <= 5);
      assert.ok(event.choices.length === 3 || event.choices.length === 4);
      for (const choice of event.choices) {
        assert.ok(STAT_NAMES.includes(choice.stat));
        assert.ok(choice.dc >= 10 && choice.dc <= 20);
        assert.ok(choice.successEffect?.type);
        assert.ok(choice.failureEffect?.type);
        if (choice.requiredJob) assert.ok(campaign.jobs.some(job => job.name === choice.requiredJob));
      }
    }
  });
}
