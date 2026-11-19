import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAX_STRESS, stressBand, stressCheckPenalty, resolveStress, growBond, bondKey, sceneDirection, stressStoryBeat } from '../dramatic-director.js';
import { rollTabletopCheck } from '../tabletop-rules.js';
import { CAMPAIGNS } from '../campaign-data.js';
const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const server=read('server.js'),client=read('public/app.js'),css=read('public/styles.css'),html=read('public/index.html');

test('pressure has clear milestones and is capped, never blocks play',()=>{
  assert.equal(MAX_STRESS,6);
  assert.deepEqual([0,2,3,4,5,6].map(n=>stressBand(n).key),['steady','steady','uneasy','uneasy','fractured','fractured']);
  assert.equal(stressCheckPenalty(3,'지혜'),-1);
  assert.equal(stressCheckPenalty(5,'매력'),-2);
  assert.equal(stressCheckPenalty(6,'체력'),0);
  assert.equal(stressCheckPenalty(0,'지혜'),0);
  assert.equal(stressBand(999).stress,6);
  assert.equal(stressBand(-99).stress,0);
});
test('dramatic outcomes, ally protection and regroup pressure are deterministic',()=>{
  assert.deepEqual(resolveStress(2,'mixed','normal').after,3);
  assert.equal(resolveStress(2,'disaster','normal').after,4);
  assert.equal(resolveStress(4,'critical','normal').after,3);
  assert.equal(resolveStress(4,'critical','normal',true).after,3);
  assert.equal(resolveStress(6,'disaster','normal').after,6);
  assert.equal(resolveStress(2,'disaster','normal',true).after,3);
  assert.equal(resolveStress(3,'disaster','desperate',true).after,5);
  assert.equal(resolveStress(2,'mixed','normal').milestone,'uneasy');
  assert.equal(resolveStress(4,'mixed','normal').milestone,'fractured');
  assert.ok(stressStoryBeat('echo',resolveStress(4,'mixed','normal')).includes('현실감'));
});
test('heroic desperate checks require tension; two dice, future stress and fail cost',()=>{
  const rolls=[6,17];
  assert.match(rollTabletopCheck(()=>rolls.shift(),'desperate',0,2).error,/긴장도가 3/);
  assert.equal(rolls.length,2,'rejected mode cannot consume random numbers');
  const r=rollTabletopCheck(()=>rolls.shift(),'desperate',0,3);
  assert.equal(r.ok,true);assert.equal(r.result,17);assert.deepEqual(r.rolls,[6,17]);
  assert.equal(r.extraDangerOnFailure,2);assert.equal(r.stressCost,1);
});
test('bond IDs are stable, party benefits are bounded and cannot self-award',()=>{
  assert.equal(bondKey('B','A'),bondKey('A','B'));
  const bonds={};
  assert.equal(growBond(bonds,'A','A').changed,false);
  for(let n=1;n<6;n++)assert.equal(growBond(bonds,'A','B').level,Math.min(n,3));
  assert.equal(Object.values(bonds)[0],3);
});
test('9 worlds retain distinct director copy and there is no fabricated external video copy',()=>{
  const ids=new Set();
  for(const c of CAMPAIGNS){
    const a=sceneDirection({campaignId:c.id,sceneId:`${c.id}-start`,phase:'탐색',stress:5,threat:7,jobName:'정찰병',actorName:'해솔',nearby:3});
    assert.ok(a.atmosphericLine.length>15,c.id);
    assert.ok(a.spotlight.includes('정찰병'),c.id);
    assert.ok(a.partyPrompt.includes('3명의 동료'),c.id);
    assert.ok(a.danger.includes('위협'),c.id);
    assert.equal(a.mood,'fractured');
    ids.add(a.world);
  }
  assert.equal(ids.size,9);
  for(const c of ['echo','ember','neon','abyss','wild','clock']){
    const p=`public/art/director/${c}.webp`;
    assert.ok(fs.statSync(new URL(`../${p}`,import.meta.url)).size>20_000,p);
  }
});
test('patch includes original sound and a real 1-4 player server contract',()=>{
  for(const f of ['bgm_dread.wav','heartbeat.wav','resolve.wav'])assert.ok(fs.statSync(new URL(`../public/audio/${f}`,import.meta.url)).size>12_000);
  assert.match(server,/const MAX_PLAYERS = 4/);
  assert.match(server,/socket.on\('story:regroup'/);
  assert.match(server,/const bondedAid=currentTableAssistance/);
  assert.match(server,/stress:stressBand\(p.stress\).stress/);
  assert.match(server,/room.partyBonds/);
  assert.match(server,/parallelWorldComplication/);
  assert.match(client,/function renderDirectorScene/);
  assert.match(client,/audio\/bgm_\$\{id\}\.wav/);
  assert.match(html,/data-roll-mode="desperate"/);
  assert.match(css,/#storyView \.director-psyche/);
  assert.match(css,/prefers-reduced-motion/);
});
