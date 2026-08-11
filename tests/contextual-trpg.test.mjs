import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('Guardian Tales is unified and new Line Zero campaign exists',()=>{
  const ids=CAMPAIGNS.map(c=>c.id);
  assert.ok(ids.includes('guardian'));
  assert.ok(ids.includes('nighttrain'));
  assert.ok(!ids.includes('guardian1') && !ids.includes('guardian2') && !ids.includes('guardian3'));
  const g=CAMPAIGNS.find(c=>c.id==='guardian');
  assert.match(g.title,/월드 1~11/);
  const n=CAMPAIGNS.find(c=>c.id==='nighttrain');
  assert.equal(n.titles.length,30);
  assert.equal(n.jobs.length,6);
});

test('canonical choices are scene-aware and impossible combat is not universal',()=>{
  for(const c of CAMPAIGNS){
    const canonical=c.storyBeats.filter(b=>!b.branchScene);
    assert.ok(canonical.every(b=>b.choices.length>=5 && b.choices.length<=7));
    assert.ok(canonical.some(b=>!b.choices.some(ch=>ch.startsCombat)),`${c.id}: every scene incorrectly offers combat`);
    assert.ok(canonical.some(b=>b.choices.some(ch=>ch.startsCombat)),`${c.id}: no combat-capable scene`);
  }
});

test('shared dice result is shown once, then contextual result modal auto closes',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/io\.to\(room\.code\)\.emit\('dice:roll'/);
  assert.match(app,/socket\.on\('dice:roll'/);
  assert.match(app,/diceQueue = diceQueue\.then/);
  assert.match(app,/resolutionTimer = setTimeout/);
  assert.match(app,/lastActionResult'\)\.innerHTML = ''/);
});

test('event voting is more generous',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/VOTE_DURATION_MS = 75_000/);
  assert.match(server,/SOLO_VOTE_DURATION_MS = 20_000/);
  assert.match(server,/ALL_VOTED_COUNTDOWN_MS = 3_000/);
});

test('side events are selected by current story context and bridge back to the scene',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(server,/function eventContextScore/);
  assert.match(server,/contextualizeSideEvent/);
  assert.match(server,/ranked = candidates\.sort/);
  assert.match(app,/ev\.contextLead/);
});

test('event outcomes use contextual prose and do not duplicate numeric roll in chat',()=>{
  const data=fs.readFileSync(new URL('../campaign-data.js',import.meta.url),'utf8');
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(data,/function eventOutcomeProse/);
  assert.match(data,/손과 발을 재빠르게 움직여/);
  assert.match(server,/숫자 결과는 모든 플레이어가 함께 보는 주사위 화면에만 표시한다/);
  assert.ok(!app.includes('SCENE RESOLVED</div><b>장면 결과를 확인한 뒤'));
});
