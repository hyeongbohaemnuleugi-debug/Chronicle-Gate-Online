import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS, STAT_NAMES } from '../campaign-data.js';

test('campaign catalog is complete and unique', () => {
  assert.equal(CAMPAIGNS.length, 5);
  assert.equal(new Set(CAMPAIGNS.map(c => c.id)).size, 5);
  assert.equal(STAT_NAMES.length, 6);
});

for (const campaign of CAMPAIGNS) {
  test(`${campaign.id}: exactly 30 unique one-copy events`, () => {
    assert.equal(campaign.events.length, 30);
    assert.equal(new Set(campaign.events.map(e => e.id)).size, 30);
    assert.equal(new Set(campaign.events.map(e => e.title)).size, 30);
    assert.equal(campaign.storyBeats.length, 20);
    assert.equal(new Set(campaign.storyBeats.map(b => b.id)).size, 20);
    for (const beat of campaign.storyBeats) {
      assert.ok(beat.situation?.length >= 80);
      assert.equal(Object.keys(beat.roleHooks || {}).length, 6);
      assert.ok(beat.objective?.length > 10);
      assert.ok(beat.why?.length > 10);
      assert.ok(beat.prompt?.length > 10);
      if (beat.roleplayPrompt) {
        assert.ok(beat.roleplayPrompt.key);
        assert.ok(beat.roleplayPrompt.responseTemplate?.includes('{{value}}'));
      } else {
        assert.equal(beat.choices?.length, 3);
        for (const choice of beat.choices) {
          assert.ok(STAT_NAMES.includes(choice.stat));
          assert.ok(choice.dc >= 10 && choice.dc <= 18);
          assert.ok(choice.detail?.length > 10);
          assert.ok(choice.success?.length > 10);
          assert.ok(choice.failure?.length > 10);
        }
      }
    }
  });

  test(`${campaign.id}: contextual choices, jobs and acts are valid`, () => {
    assert.equal(campaign.jobs.length, 6);
    for (const job of campaign.jobs) {
      assert.ok(job.skillDef?.name, `${campaign.id} ${job.name}: skillDef missing`);
      assert.ok(Number.isInteger(job.skillDef.cooldown) && job.skillDef.cooldown >= 2 && job.skillDef.cooldown <= 4, `${campaign.id} ${job.name}: invalid cooldown`);
      assert.ok(job.skillDef.kind, `${campaign.id} ${job.name}: skill kind missing`);
    }
    assert.equal(campaign.acts.length, 5);
    const allChoiceLabels = [];
    for (const event of campaign.events) {
      assert.ok(event.act >= 1 && event.act <= 5);
      assert.ok(event.choices.length === 3 || event.choices.length === 4);
      assert.ok(event.visual && event.visual.length > 2);
      assert.ok(event.situation?.length > 10);
      assert.ok(event.objective?.length > 10);
      assert.ok(event.why?.length > 10);
      assert.ok(event.stakes?.length > 10);
      for (const choice of event.choices) {
        assert.ok(STAT_NAMES.includes(choice.stat));
        assert.ok(choice.dc >= 10 && choice.dc <= 20);
        assert.ok(choice.successEffect?.type);
        assert.ok(choice.failureEffect?.type);
        assert.ok(choice.label.includes(event.title), `${event.id} choice must reference its event situation`);
        allChoiceLabels.push(choice.label);
        if (choice.requiredJob) assert.ok(campaign.jobs.some(job => job.name === choice.requiredJob));
      }
    }
    assert.equal(new Set(allChoiceLabels).size, allChoiceLabels.length, 'choice labels should not repeat within a campaign');
  });
}
