import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('canonical choices are context-linked and expose opportunity/risk rather than generic filler',()=>{
  for(const c of CAMPAIGNS){
    const canonical=c.storyBeats.filter(b=>!b.branchScene);
    assert.equal(canonical.length,(c.acts?.length || 5) * 6);
    for(const b of canonical){
      assert.ok(b.choices.length>=6 && b.choices.length<=8,`${c.id}/${b.id}`);
      for(const ch of b.choices){
        assert.ok(ch.opportunity?.length>0 || ch.isTravel,`${c.id}/${b.id}/${ch.label}: opportunity`);
        assert.ok(ch.risk?.length>0 || ch.isTravel,`${c.id}/${b.id}/${ch.label}: risk`);
        assert.ok(ch.next?.success && ch.next?.failure);
        assert.notEqual(ch.next.success,ch.next.failure);
      }
    }
  }
});

test('each campaign has a two-stage consequence graph before canonical rejoin',()=>{
  for(const c of CAMPAIGNS){
    const layer1=c.storyBeats.filter(b=>b.nodeRole==='action-consequence');
    const layer2=c.storyBeats.filter(b=>b.nodeRole==='action-consequence-2');
    assert.ok(layer1.length>=300,`${c.id}: layer1`);
    assert.ok(layer2.length>=1800,`${c.id}: layer2`);
    const ids=new Set(c.storyBeats.map(b=>b.id));
    for(const b of layer1.slice(0,50)) for(const ch of b.choices){
      assert.ok(ids.has(ch.next.success)); assert.ok(ids.has(ch.next.failure)); assert.notEqual(ch.next.success,ch.next.failure);
    }
  }
});

test('client does not advertise exact stat/DC unless insight passives reveal them',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/판정은 선택 후 공개/);
  assert.match(app,/statInsight\?\.insightDeep/);
  assert.match(app,/기회 ·/);
});

test('server contains repeated-approach pressure and fatal high-risk outcomes',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/function approachPressure/);
  assert.match(server,/같은 방식이 읽히고 있다/);
  assert.match(server,/function maybeFatalStoryFailure/);
  assert.match(server,/player\.dead = true/);
});
