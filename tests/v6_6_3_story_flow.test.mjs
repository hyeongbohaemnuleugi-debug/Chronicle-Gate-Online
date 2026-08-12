import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const campaignData = fs.readFileSync(new URL('../campaign-data.js', import.meta.url), 'utf8');

test('parallel subway restores broad valid choices instead of aggressive seven-choice curation', () => {
  assert.match(server, /const choices=\[\.\.\.dynamic,\.\.\.base\]\.slice\(0,14\)/);
  assert.doesNotMatch(server, /const choices=parallelCurateChoices\(room,campaign,player,node,dynamic,base\)/);
});

test('all canonical campaigns use fuller multi-paragraph scene prose', () => {
  assert.match(campaignData, /return \[baseText, second, third, pressure\]\.filter\(Boolean\)\.join\('\\n\\n'\)/);
  for (const c of CAMPAIGNS) {
    for (const beat of c.storyBeats || []) {
      const paragraphs = String(beat.text || '').split(/\n\n+/).filter(Boolean);
      assert.ok(paragraphs.length >= 3, `${c.id} ${beat.id} should have at least 3 prose paragraphs`);
    }
  }
});

test('canonical story choices stay broad but phase-aware', () => {
  for (const c of CAMPAIGNS) {
    for (const beat of c.storyBeats || []) {
      assert.ok((beat.choices || []).length >= 6, `${c.id} ${beat.id} has too few choices`);
      assert.ok((beat.choices || []).length <= 9, `${c.id} ${beat.id} has too many choices`);
    }
  }
  assert.match(campaignData, /const phasePriority=\{/);
});
