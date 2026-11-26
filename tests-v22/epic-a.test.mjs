import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CAMPAIGNS} from '../public/game/campaigns/index.js';
import {EPIC_A} from '../public/game/campaigns/epic-a.js';
import {composeEpic, campaignForLength} from '../public/game/campaigns/epic-tools.js';
import {createStoryState, applyAction, availableChoices, previewAction, gradeRoll, viewGame, validateSave} from '../public/game/engine.js';

const cfgs = {
 'last-train': {prefix:'et', hub:'bridge', endings:['new-stop','take-living','night-shift'], newEnter:'read-unsent-mail', prep:'trace-return-stamps', itemUse:'use-return-notices', decision:'reply-booth', routes:[['call-confirmed-family','deliver-last-hello','ending-letter-home'],['ask-final-run','close-last-service','ending-last-service']]},
 'glass-hotel': {prefix:'eh', hub:'roof', endings:['return-hours','restart-hotel','break-contract'], newEnter:'check-last-shift', prep:'read-shift-cards', itemUse:'open-rest-room', decision:'staff-breakfast', routes:[['ask-who-wants-rest','open-rest-house','ending-rest-house'],['accept-returned-keys','close-hotel-doors','ending-hotel-closed']]},
 'moon-market': {prefix:'em', hub:'council', endings:['shared-landing','travel-market','free-sky'], newEnter:'follow-left-memories', prep:'read-pawn-register', itemUse:'use-pawn-receipts', decision:'unclaimed-shelf', routes:[['ask-return-wishes','send-return-lanterns','ending-return-lanterns'],['respect-sealed-memories','keep-unopened-house','ending-unopened-house']]}
};
const actor = g => g.players[g.activeIndex].id;
const roster = (c,n) => c.classes.slice(0,n).map((job,i)=>({id:`epic-a-${i}`,name:`독자 ${i+1}`,classId:job.id}));
const bases = Object.fromEntries(Object.keys(EPIC_A).map(id=>[id,{...LEGACY_CAMPAIGNS.find(x=>x.id===id),epicSpec:EPIC_A[id]}]));
const stories = Object.fromEntries(Object.entries(bases).map(([id,base])=>[id,composeEpic(base,EPIC_A[id])]));
const step = (g,c,payload,roll=20) => { const r=applyAction(g,c,actor(g),{...payload,revision:g.revision},{roll}); assert.equal(r.ok,true,`${c.id}/${g.nodeId}/${JSON.stringify(payload)}: ${r.error}`); return r.game; };
function observed(g,c) { for(const d of c.nodes[g.nodeId]?.details||[]) if(!g.detailsRead[`${g.nodeId}:${d.id}`]) g=step(g,c,{detailId:d.id}); return g; }
function cleared(g,c) { for(let i=0;g.combat&&i<40;i++){let first=true;g=step(g,c,{combatAction:'basic'},()=>{const d=first?20:1; first=false; return d;});}assert.equal(g.combat,null);return g; }
function walk(c,n,route='a',skipItem=false,observeDetails=true) {
 const cfg=cfgs[c.id],states=[]; let g=createStoryState(c,roster(c,n));
 for(let steps=0;g.nodeId!==cfg.hub&&steps<100;steps++) {
  g=cleared(g,c);if(observeDetails)g=observed(g,c);states.push(structuredClone(g));
  const choices=availableChoices(g,c); assert.ok(choices.length,`stuck at ${g.nodeId}`);
  let choice=choices[0];
  if(g.nodeId===`${cfg.prefix}1-return`&&c.id==='moon-market') choice=choices.find(x=>x.id==='ask-moon');
  if(g.nodeId===`${cfg.prefix}1-04`||g.nodeId===`${cfg.prefix}2-04`) choice=choices[route==='b'?1:0];
  if(g.nodeId===`${cfg.prefix}1-07`) choice=choices[skipItem?1:0];
  const itemChoice=choices.find(x=>x.useItems?.some(id=>id.startsWith('epic-')));
  if(itemChoice) choice=itemChoice;
  g=step(g,c,{choiceId:choice.id});
  assert.notEqual(g.phase,'ended',`${c.id} unexpectedly ended before final hub`);
 }
 assert.equal(g.nodeId,cfg.hub);g=cleared(g,c);if(observeDetails)g=observed(g,c);
 return {g,states};
}
const additionalCount = (g,cfg) => g.visited.filter(id=>new RegExp(`^${cfg.prefix}[12]-\\d`).test(id)).length;
function shortestCounts(c,spec){
 const extra=new Set(spec.chapters.flatMap(ch=>ch.scenes.map(n=>n.id))), distance=new Map([[c.start,extra.has(c.start)?1:0]]),queue=[c.start];
 while(queue.length){const id=queue.shift();for(const a of c.nodes[id].choices||[])for(const o of Object.values(a.outcomes)){const d=distance.get(id)+(extra.has(o.next)?1:0);if(d<(distance.get(o.next)??Infinity)){distance.set(o.next,d);queue.push(o.next);}}}
 return Object.fromEntries(Object.values(c.nodes).filter(n=>n.ending).map(n=>[n.id,distance.get(n.id)]));
}

for(const [id,spec] of Object.entries(EPIC_A)) {
 const c=stories[id],cfg=cfgs[id],base=bases[id];
 test(`${id}: authored composition leaves Basic intact and every ending visits at least 24 extra scenes`,()=>{
  const before=JSON.stringify(base.nodes);composeEpic(base,spec);assert.equal(JSON.stringify(base.nodes),before);
  assert.equal(campaignForLength(c,'basic'),base);
  const counts=shortestCounts(c,spec);assert.equal(Object.keys(counts).length,5);
  for(const [ending,count] of Object.entries(counts)) assert.equal(count,24,`${ending}: ${count}`);
  assert.equal(spec.chapters.reduce((n,ch)=>n+ch.scenes.length,0),26);
  for(const ch of spec.chapters){
   assert.ok(!c.nodes[ch.return.id].encounter,'combat must not repeat at the return');
   assert.deepEqual(c.nodes[ch.return.id].choices,base.nodes[ch.at].choices);
   const branch=ch.scenes.find(n=>new Set(n.choices.map(a=>Object.values(a.outcomes)[0].next)).size===2);
   assert.ok(branch,'a chapter has a real route split');
   for(const n of ch.scenes){
    assert.equal(n.text.length,2); for(const p of n.text)assert.ok(p.length>=90&&p.length<=170,`${n.id} paragraph length`);
    assert.ok(n.summary&&n.objective&&n.stakes&&n.location); assert.ok(n.choices.length>=2&&n.choices.length<=3);
    assert.ok(n.choices.some(a=>!a.requires&&!a.useItems?.length&&!a.consumeItems?.length),'a normal onward choice needs no item');
    for(const a of n.choices) for(const [grade,o] of Object.entries(a.outcomes)){
      assert.ok(c.nodes[o.next]); for(const f of [...o.set||[],...o.unset||[]]) assert.ok(c.flags[f],`unknown ${f}`);
      for(const clue of o.clues||[]) assert.ok(c.clues[clue]); for(const item of o.gainItems||[])assert.ok(c.items[item]);
      assert.ok(!o.harm&&!o.harmAll,'the new authored chapters do not force injury');
      if(!a.automatic)assert.deepEqual(Object.keys(a.outcomes),['critical','success','failure','fumble']);
    }
   }
  }
 });
 for(const n of [1,2,3,4]) {
  test(`${id}: ${n} players earn the Epic item and reach all five endings through the real engine`,()=>{
   const {g}=walk(c,n);assert.equal(g.completedCombats.length,1);assert.equal(additionalCount(g,cfg),24);
   const itemId=Object.keys(spec.items)[0];assert.ok(g.inventory.includes(itemId));
   const flag=Object.keys(spec.flags).find(x=>x.endsWith('_map_used')||x.endsWith('_clock_used')||x.endsWith('_spool_used'));assert.ok(g.flags[flag]);
   for(const choiceId of cfg.endings){const after=step(structuredClone(g),c,{choiceId});assert.equal(after.phase,'ended');assert.equal(additionalCount(after,cfg),24);const v=viewGame(after,c,after.players[0].id);assert.ok(v.scene.text.length>2);}
   let extended=step(structuredClone(g),c,{choiceId:cfg.newEnter});extended=observed(extended,c);extended=step(extended,c,{choiceId:cfg.prep});extended=observed(extended,c);extended=step(extended,c,{choiceId:cfg.itemUse});extended=observed(extended,c);assert.equal(extended.nodeId,cfg.decision);
   for(const [decision,end,ending] of cfg.routes){let after=step(structuredClone(extended),c,{choiceId:decision});after=observed(after,c);after=step(after,c,{choiceId:end});assert.equal(after.nodeId,ending);assert.equal(after.phase,'ended');assert.equal(after.completedCombats.length,1);assert.equal(additionalCount(after,cfg),24);const loaded=validateSave({format:'chronicle-gate-v18',game:after},[base]);assert.ok(loaded.game,loaded.error);assert.equal(loaded.game.storyLength,'epic');assert.equal(loaded.game.nodeId,ending);}
  });
 }
 test(`${id}: alternate branches, no item, no observations and unconditional choices retain 24 scene route`,()=>{
  const {g}=walk(c,1,'b',true,false);assert.equal(additionalCount(g,cfg),24);assert.ok(!g.inventory.includes(Object.keys(spec.items)[0]));assert.ok(g.visited.includes(`${cfg.prefix}1-05b`));assert.ok(g.visited.includes(`${cfg.prefix}2-05b`));assert.ok(!g.visited.includes(`${cfg.prefix}1-05a`));
  const after=step(g,c,{choiceId:cfg.endings[1]});assert.equal(after.phase,'ended');
 });
 test(`${id}: each authored risky action resolves all four grades from earned source state`,()=>{
  const {states}=walk(c,4);let count=0;
  for(const g of states.filter(g=>new RegExp(`^${cfg.prefix}[12]-\\d`).test(g.nodeId)))for(const a of c.nodes[g.nodeId].choices.filter(x=>!x.automatic)){
   assert.equal(new Set(Object.values(a.outcomes).map(o=>o.text)).size,4);
   const structural=o=>JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k])=>!['text','next'].includes(k))));
   assert.notEqual(structural(a.outcomes.critical),structural(a.outcomes.success));assert.notEqual(structural(a.outcomes.failure),structural(a.outcomes.fumble));
   const preview=previewAction(g,c,actor(g),{choiceId:a.id}).plan;assert.ok(preview);
   for(const grade of ['critical','success','failure','fumble']){
    const die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+preview.bonus,preview.dc)===grade);assert.ok(die);
    const after=step(structuredClone(g),c,{choiceId:a.id},die);assert.equal(after.lastResult.grade,grade);assert.equal(after.nodeId,a.outcomes[grade].next);assert.equal(after.lastResult.text,a.outcomes[grade].text);count++;
   }
  }
  assert.equal(count,16);
 });
 test(`${id}: earned resting scenes restore only a living actor and prose keeps causal core for solo and group`,()=>{
  const {states}=walk(c,2);const resting=states.find(g=>c.nodes[g.nodeId].choices.some(a=>a.outcomes.success?.heal));assert.ok(resting);
  const fixture=structuredClone(resting);fixture.players[fixture.activeIndex].health=1;
  const action=c.nodes[fixture.nodeId].choices.find(a=>a.outcomes.success?.heal);const after=step(fixture,c,{choiceId:action.id});assert.equal(after.players[fixture.activeIndex].health,2);
  for(const ch of spec.chapters)for(const node of ch.scenes.filter(n=>n.partyText))for(const count of [1,4]){const g=createStoryState(c,roster(c,count));g.nodeId=node.id;const v=viewGame(g,c,g.players[0].id);for(const paragraph of node.text)assert.ok(v.scene.text.includes(paragraph));}
 });
}
