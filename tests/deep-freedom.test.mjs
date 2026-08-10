import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('short action vocabulary is available and fights are not boss-only',()=>{
  for (const c of CAMPAIGNS) {
    const canonical=c.storyBeats.filter(b=>!b.branchScene);
    const labels=new Set(canonical.flatMap(b=>b.choices.map(x=>x.label)));
    for (const verb of ['조사','싸운','설득','훔친','미행']) assert.ok([...labels].some(label=>label.includes(verb)),`${c.id}: ${verb}`);
    assert.ok(canonical.some(b=>b.choices.some(x=>x.startsCombat)),`${c.id}: no normal combat action`);
    assert.ok(canonical.some(b=>b.choices.some(x=>x.isTravel)),`${c.id}: no travel choice`);
  }
});

test('every canonical action has distinct success and failure consequence nodes',()=>{
  for (const c of CAMPAIGNS) for (const b of c.storyBeats.filter(x=>!x.branchScene)) {
    const targets=[];
    for (const ch of b.choices) {
      assert.notEqual(ch.next.success,ch.next.failure);
      targets.push(ch.next.success,ch.next.failure);
    }
    assert.equal(new Set(targets).size,targets.length,`${c.id}/${b.id}: consequence collision`);
  }
});

test('client shows compact injuries and enemy turn wording',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/부상 \$\{injuryCount\}/);
  assert.doesNotMatch(app,/remainingScenes\}장면/);
  assert.match(app,/ENEMY TURN/);
});
