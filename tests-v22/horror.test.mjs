import test from 'node:test';
import assert from 'node:assert/strict';
import {getCampaign,CAMPAIGNS} from '../public/game/campaigns/index.js';
import {EPIC_HORROR} from '../public/game/campaigns/epic-horror.js';
import {OPENINGS_HORROR} from '../public/game/campaigns/openings-horror.js';
import {createGame,createStoryState,applyAction,availableChoices,previewAction,viewGame,gradeRoll,validateSave} from '../public/game/engine.js';
const ids=Object.keys(EPIC_HORROR),grades=['critical','success','failure','fumble'];
const roster=(c,n)=>c.classes.slice(0,n).map((job,i)=>({id:`h${i}`,name:`참가자 ${i+1}`,classId:job.id}));
const actor=g=>g.players[g.activeIndex].id;
const step=(g,c,payload,roll=20)=>{const r=applyAction(g,c,actor(g),{...payload,revision:g.revision},{roll});assert.equal(r.ok,true,`${c.id}/${g.nodeId}: ${r.error}`);return r.game;};
const combatRoll=first=>{let ready=true;return()=>{const n=ready?first:1;ready=false;return n;};};
function clearCombat(g,c){let safety=40;while(g.combat&&safety--)g=step(g,c,{combatAction:'basic'},combatRoll(20));assert.equal(g.combat,null);return g;}
const primary={
 'hollow-apartment':{hub:'threshold',combat:'service-corridor',revives:['doorstore','waiting-room'],presets:{ledger:'recover-alarm',roof:'ring-plan','apt-e1-nursery':'glass','apt-e2-knocks':'low-handle'},endings:[['bring-home'],['sound-last-alarm'],['look-last-way','become-warden'],['look-last-way','burn-frame'],['look-last-way','answer-home']],itemFlags:['apt_epic_true_heights','apt_epic_low_exit']},
 'drowned-broadcast':{hub:'final-console',combat:'studio',revives:['record-room','old-news'],presets:{archive:'separate-noise','antenna-base':'align-weather','bc-e1-deafbooth':'splice','bc-e1-tail':'strip','bc-e2-shadow':'shade'},endings:[['close-station'],['air-last-news'],['manual-choices','send-sea'],['manual-choices','keep-night'],['manual-choices','start-raw']],itemFlags:['bc_epic_first_call_heard','bc_epic_blank_tail','bc_epic_camera_blinded']},
};
function choose(g,c,route=[0,0],encounters='fight'){
 const cfg=primary[c.id],choices=availableChoices(g,c);assert.ok(choices.length,`${g.nodeId}: no action`);
 const gate=c.nodes[g.nodeId].encounterGate;
 if(gate){const choice=choices.find(a=>a.id===`${encounters}-${gate}`);assert.ok(choice,`${g.nodeId}: explicit ${encounters} choice`);return choice;}
 const forks=EPIC_HORROR[c.id].chapters.map(ch=>ch.scenes.find(n=>n.id.endsWith('-fork'))?.id);
 const which=forks.indexOf(g.nodeId);if(which>=0)return choices[route[which]];
 const originalHub=EPIC_HORROR[c.id].chapters.find(ch=>ch.return.id===g.nodeId)?.at;
 const preferred=cfg.presets[originalHub||g.nodeId];return choices.find(a=>a.id===preferred)||choices.find(a=>a.automatic)||choices[0];
}
function walk(c,count=4,route=[0,0],stop=primary[c.id].hub,initial=null,encounters='fight'){
 let g=initial||createStoryState(c,roster(c,count));const states=[];let safety=100;
 while(g.nodeId!==stop&&g.phase!=='ended'&&safety--){g=clearCombat(g,c);states.push(structuredClone(g));const choice=choose(g,c,route,encounters);g=step(g,c,{choiceId:choice.id});}
 assert.equal(g.nodeId,stop);g=clearCombat(g,c);states.push(structuredClone(g));return{g,states};
}
function shortest(c,spec){
 const extra=new Set(spec.chapters.flatMap(ch=>ch.scenes.map(n=>n.id))),dist=new Map([[c.start,0]]),q=[c.start];
 while(q.length){const id=q.shift();for(const ch of c.nodes[id].choices||[])for(const o of Object.values(ch.outcomes)){const d=dist.get(id)+(extra.has(o.next)?1:0);if(d<(dist.get(o.next)??Infinity)){dist.set(o.next,d);q.push(o.next);}}}
 return Object.fromEntries(Object.values(c.nodes).filter(n=>n.ending).map(n=>[n.id,dist.get(n.id)]));
}
for(const id of ids){
 const base=getCampaign(id),epic=getCampaign(id,'epic'),cfg=primary[id],spec=EPIC_HORROR[id];
 test(`${id}: each of five Epic endings requires 24 extra scenes and both genuine splits`,()=>{
  // The 19 original investigation scenes remain, with three approach gates and two new arenas.
  assert.equal(Object.values(base.nodes).filter(n=>!n.ending).length,24);assert.equal(Object.keys(base.items).length,5);
  assert.equal(base.encounterCatalog.length,3);assert.equal(epic.encounterCatalog.length,5);
  assert.ok(base.encounterCatalog.every(entry=>base.nodes[entry.arenaId].encounter.optional));
  assert.deepEqual(Object.values(shortest(epic,spec)),[24,24,24,24,24]);
  assert.equal(spec.chapters.reduce((n,ch)=>n+ch.scenes.length,0),26);
  for(const chapter of spec.chapters){assert.equal(chapter.scenes.length,13);assert.ok(chapter.scenes.some(n=>new Set(n.choices.map(a=>Object.values(a.outcomes)[0].next)).size===2));assert.equal(epic.nodes[chapter.return.id].encounter,undefined);}
 });
 for(const length of ['basic','epic'])for(const count of [1,4])test(`${id}/${length}/${count}: fighting and peaceful routes earn items and resolve all five different endings`,()=>{
  const c=getCampaign(id,length);
  for(const encounters of ['fight','avoid']){
  const {g}=walk(c,count,[0,0],cfg.hub,null,encounters);assert.equal(g.completedCombats.length,encounters==='fight'?(length==='epic'?5:3):0);
  assert.equal(Object.keys(g.encounterResolutions).length,length==='epic'?5:3);
  assert.ok(Object.values(g.encounterResolutions).every(entry=>entry.method===(encounters==='fight'?'victory':'bypassed')));
  if(length==='epic'){const extra=new Set(spec.chapters.flatMap(ch=>ch.scenes.map(n=>n.id)));assert.equal(g.visited.filter(n=>extra.has(n)).length,24);for(const f of cfg.itemFlags)assert.ok(g.flags[f],f);}
  const ended=new Set();for(const choices of cfg.endings){let copy=structuredClone(g);for(const choiceId of choices)copy=step(copy,c,{choiceId});assert.equal(copy.phase,'ended');assert.ok(c.nodes[copy.nodeId].ending);ended.add(copy.nodeId);const save=validateSave(copy,CAMPAIGNS).game;assert.equal(save.nodeId,copy.nodeId);assert.equal(save.storyLength,length);}
  assert.equal(ended.size,5);
  }
 });
 test(`${id}: both alternate Epic routes rejoin physically and retain 24 authored steps`,()=>{
  const extra=new Set(spec.chapters.flatMap(ch=>ch.scenes.map(n=>n.id)));
  for(const route of [[0,1],[1,0],[1,1]]){const {g}=walk(epic,2,route);assert.equal(g.visited.filter(n=>extra.has(n)).length,24);assert.equal(g.completedCombats.length,5);for(let i=0;i<2;i++){const fork=spec.chapters[i].scenes.find(n=>n.id.endsWith('-fork'));assert.ok(g.visited.includes(fork.choices[route[i]].outcomes.success.next));assert.ok(!g.visited.includes(fork.choices[1-route[i]].outcomes.success.next));}}
 });
 test(`${id}: every risky story choice executes four grades from reached source states`,()=>{
  const states=new Map();for(const route of [[0,0],[1,1]])for(const state of walk(epic,4,route).states)states.set(state.nodeId,state);
  let results=0;for(const state of states.values())for(const choice of availableChoices(state,epic).filter(a=>!a.automatic)){
   const preview=previewAction(state,epic,actor(state),{choiceId:choice.id});assert.ok(preview.ok);
   assert.equal(new Set(grades.map(g=>choice.outcomes[g].text)).size,4);
   for(const grade of grades){const die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+preview.plan.bonus,preview.plan.dc)===grade);assert.ok(die,`${state.nodeId}/${grade}`);const after=step(structuredClone(state),epic,{choiceId:choice.id},die);assert.equal(after.lastResult.grade,grade);assert.equal(after.nodeId,choice.outcomes[grade].next);assert.equal(after.lastResult.text,choice.outcomes[grade].text);results++;}
  }assert.ok(results>=100);
 });
 test(`${id}: all new damaging outcomes use death-compatible text for one death or total loss`,()=>{
  const states=new Map();for(const route of [[0,0],[1,1]])for(const state of walk(epic,4,route).states)states.set(state.nodeId,state);
  let covered=0;for(const state of states.values())for(const choice of availableChoices(state,epic))for(const [grade,outcome]of Object.entries(choice.outcomes))if(outcome.harm||outcome.harmAll){
   const fixture=structuredClone(state);fixture.players[fixture.activeIndex].health=1;
   const die=grade==='fumble'?1:20;const died=step(fixture,epic,{choiceId:choice.id},die);assert.equal(died.players[fixture.activeIndex].life,'dead');assert.ok(died.lastResult.text.includes(outcome.lossText));assert.ok(died.lastResult.text.includes(outcome.survivorArrival));assert.equal(died.nodeId,outcome.next);
   const last=structuredClone(fixture);for(const p of last.players)if(p.id!==actor(last)){p.health=0;p.life='dead';}const all=step(last,epic,{choiceId:choice.id},die);assert.equal(all.nodeId,'__all_dead__');assert.equal(all.phase,'ended');assert.ok(!all.lastResult.text.includes(outcome.survivorArrival));covered++;
  }assert.ok(covered>=6);
 });
 test(`${id}: actual combat death can fail the first revival and return at the second at a cost`,()=>{
  let g=createStoryState(base,roster(base,2));let safety=60;
  const coreId=base.nodes[cfg.combat].encounter.id;
  // Reach the original revival-bearing battle by actually bypassing prior optional opponents.
  while(g.nodeId!==cfg.combat&&safety--){
   const gate=base.nodes[g.nodeId].encounterGate;
   const choice=choose(g,base,[0,0],gate===coreId?'fight':'avoid');
   g=step(g,base,{choiceId:choice.id});
  }
  assert.equal(g.nodeId,cfg.combat);assert.equal(g.combat?.id,coreId);
  assert.ok(Object.values(g.encounterResolutions).every(entry=>entry.method==='bypassed'));
  safety=40;while(g.combat&&safety--){const dies=actor(g)==='h0';g=step(g,base,{combatAction:'basic'},combatRoll(dies?1:12));}
  assert.equal(g.players[0].life,'dead');assert.equal(g.players[1].life,'alive');
  g=walk(base,2,[0,0],cfg.revives[0],g,'avoid').g;const first=base.nodes[g.nodeId],detail=first.details.find(d=>d.clue);g=step(g,base,{detailId:detail.id});
  const sparks=g.sparks,pressure=g.pressure;g=step(g,base,{reviveId:'h0'},2);assert.equal(g.players[0].life,'dead');assert.equal(g.sparks,sparks-first.resurrection.sparkCost);assert.equal(g.pressure,Math.min(base.pressureMax,pressure+first.resurrection.pressureCost+1));assert.equal(previewAction(g,base,actor(g),{reviveId:'h0'}).ok,false);
  g=walk(base,2,[0,0],cfg.revives[1],g,'avoid').g;const before=g.sparks;g=step(g,base,{reviveId:'h0'},20);assert.equal(g.players[0].life,'alive');assert.equal(g.players[0].revivals,1);assert.equal(g.players[0].health,3);assert.equal(g.sparks,before-1);
 });
 test(`${id}: a party can die in the first battle before Epic completion`,()=>{
  let g=createStoryState(epic,roster(epic,1)),safety=40;while(!g.combat&&safety--)g=step(g,epic,{choiceId:choose(g,epic).id});assert.ok(g.combat);
  while(g.combat&&safety--)g=step(g,epic,{combatAction:'basic'},1);assert.equal(g.phase,'ended');assert.equal(g.nodeId,'__all_dead__');assert.ok(g.visited.length<24);assert.equal(viewGame(g,epic,'h0').ending,true);
 });
 for(const job of base.classes)for(const roll of [20,12,2,1])test(`${job.id}: both private risky stages resolve and truly arrive (D20=${roll})`,()=>{
  let g=createGame(base,[{id:'private',name:'도착자',classId:job.id}]);assert.equal(g.phase,'opening');
  for(let i=0;i<2;i++){const v=viewGame(g,base,'private');const r=applyAction(g,base,'private',{choiceId:'risk',revision:v.actionRevision},{roll});assert.equal(r.ok,true,r.error);g=r.game;}
  assert.equal(g.phase,'playing');assert.equal(g.nodeId,base.start);assert.ok(g.players[0].health>0);assert.equal(g.opening.states[0].records.length,2);assert.ok(OPENINGS_HORROR[id].professions[job.id].stages[1].objective.includes(id==='hollow-apartment'?'현관':'접수대'));
 });
}
