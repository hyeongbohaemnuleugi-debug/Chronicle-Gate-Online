import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('Guardian Tales trilogy is one continuous 15-act campaign',()=>{
  const ids=CAMPAIGNS.map(c=>c.id);
  assert.ok(ids.includes('guardian'));
  assert.ok(!ids.includes('guardian1') && !ids.includes('guardian2') && !ids.includes('guardian3'));
  const g=CAMPAIGNS.find(c=>c.id==='guardian');
  assert.equal(g.acts.length,15);
  assert.equal(g.events.length,90);
  assert.equal(g.storyBeats.filter(b=>!b.branchScene).length,90);
  assert.ok(g.items.length>=18);
});

test('new Glass Star Archive campaign is complete',()=>{
  const c=CAMPAIGNS.find(c=>c.id==='echo');
  assert.ok(c);
  assert.equal(c.acts.length,5);
  assert.equal(c.events.length,30);
  assert.equal(c.jobs.length,6);
  assert.equal(c.storyBeats.filter(b=>!b.branchScene).length,30);
});

test('canonical choices write explicit causal outcomes and remain context diverse',()=>{
  for(const c of CAMPAIGNS){
    for(const beat of c.storyBeats.filter(b=>!b.branchScene)){
      assert.ok(beat.choices.length>=6);
      assert.equal(new Set(beat.choices.map(ch=>ch.label)).size,beat.choices.length);
      for(const ch of beat.choices){
        assert.match(ch.detail,/다음 장면/);
        assert.ok(/다음 장면|후속/.test(ch.success),`${c.id}/${beat.id}/${ch.id} success continuity`);
        assert.ok(/다음 장면|후속/.test(ch.failure),`${c.id}/${beat.id}/${ch.id} failure continuity`);
      }
    }
  }
});

test('client render path is phase-gated and dice GPU load is capped',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const dice=fs.readFileSync(new URL('../public/dice3d.js',import.meta.url),'utf8');
  assert.match(app,/state\.phase === 'story'/);
  assert.match(app,/lastChatRenderKey/);
  assert.match(dice,/Math\.min\((?:window\.)?devicePixelRatio(?: \|\| 1)?, 1\.5\)/);
  assert.match(dice,/shadow\.mapSize\.set\(512, 512\)/);
});
