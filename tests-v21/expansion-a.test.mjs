/** Authored v21 continuations: earned full-game routes, four grades, recovery and lethal boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState as createGame,applyAction,availableChoices,previewAction,viewGame,gradeRoll,validateSave} from '../public/game/engine.js';
const configs={
 'last-train':{entry:'bridge',enter:'read-unsent-mail',scenes:['return-mail','address-desk','reply-booth','last-announcement'],prepare:'trace-return-stamps',item:'return-notices',use:'use-return-notices',first:'call-confirmed-family',second:'ask-final-run',end1:'deliver-last-hello',end2:'close-last-service',ending1:'ending-letter-home',ending2:'ending-last-service',safe:['carry-mail-forward','leave-uncertain-addresses','keep-line-open','bring-mail-home'],oldEnd:'ending-home',harmNode:'reply-booth',harmChoice:'call-confirmed-family'},
 'glass-hotel':{entry:'roof',enter:'check-last-shift',scenes:['service-lockers','spare-rooms','staff-breakfast','morning-switch'],prepare:'read-shift-cards',item:'rest-room-key',use:'open-rest-room',first:'ask-who-wants-rest',second:'accept-returned-keys',end1:'open-rest-house',end2:'close-hotel-doors',ending1:'ending-rest-house',ending2:'ending-hotel-closed',safe:['look-for-empty-rooms','leave-room-locked','leave-staff-time','entrust-unfinished-morning'],oldEnd:'ending-settlement',harmNode:'spare-rooms',harmChoice:'release-spare-latch'},
 'moon-market':{entry:'council',enter:'follow-left-memories',scenes:['pledge-counter','echo-alley','unclaimed-shelf','lantern-return'],prepare:'read-pawn-register',item:'pawn-receipts',use:'use-pawn-receipts',first:'ask-return-wishes',second:'respect-sealed-memories',end1:'send-return-lanterns',end2:'keep-unopened-house',ending1:'ending-return-lanterns',ending2:'ending-unopened-house',safe:['keep-bottles-sealed','leave-unmatched-bottles','postpone-memory-choice','let-moon-leave'],oldEnd:'ending-sky',harmNode:'echo-alley',harmChoice:'match-outside-marks'},
};
const roster=(c,n)=>c.classes.slice(0,n).map((job,i)=>({id:`a-reader-${i}`,name:`독자 ${i+1}`,classId:job.id}));
const actor=g=>g.players[g.activeIndex].id;
function step(g,c,payload,roll=20){const r=applyAction(g,c,actor(g),{...payload,revision:g.revision},{roll});assert.equal(r.ok,true,`${c.id}/${g.nodeId}/${payload.choiceId||payload.detailId||payload.combatAction}: ${r.error}`);return r.game;}
function observe(g,c){for(const detail of c.nodes[g.nodeId].details||[])if(!g.detailsRead[`${g.nodeId}:${detail.id}`])g=step(g,c,{detailId:detail.id});return g;}
function clearCombat(g,c){for(let i=0;g.combat&&i<40;i++){let first=true;g=step(g,c,{combatAction:'basic'},()=>{const n=first?20:1;first=false;return n;});}assert.ok(!g.combat);return g;}
function startBranch(c,n){let g=createGame(c,roster(c,n));const cfg=configs[c.id];for(let i=0;g.nodeId!==cfg.entry&&i<30;i++){g=observe(clearCombat(g,c),c);const first=availableChoices(g,c)[0];assert.ok(first);g=step(g,c,{choiceId:first.id});assert.notEqual(g.phase,'ended','the preserved path must reach its original final scene');}assert.equal(g.nodeId,cfg.entry);assert.equal(g.completedCombats.length,1);g=step(g,c,{choiceId:cfg.enter});assert.equal(g.nodeId,cfg.scenes[0]);return g;}
function preparedStates(c,n){const cfg=configs[c.id];const out=[];let g=observe(startBranch(c,n),c);out.push(structuredClone(g));g=step(g,c,{choiceId:cfg.prepare});g=observe(g,c);out.push(structuredClone(g));assert.ok(g.inventory.includes(cfg.item),'the new item came from a real detail action');g=step(g,c,{choiceId:cfg.use});assert.ok(g.lastResult.usedItems.some(i=>i.id===cfg.item));g=observe(g,c);out.push(structuredClone(g));return out;}
for(const [id,cfg] of Object.entries(configs)){
 const c=CAMPAIGNS.find(x=>x.id===id);
 for(const count of [1,4]){
  test(`${id}: ${count} players earn the new item, resolve combat and reach both new endings`,()=>{
   const states=preparedStates(c,count);
   for(const [choice,endingChoice,endingId] of [[cfg.first,cfg.end1,cfg.ending1],[cfg.second,cfg.end2,cfg.ending2]]){
    let g=step(structuredClone(states[2]),c,{choiceId:choice});g=observe(g,c);
    const choices=availableChoices(g,c).map(a=>a.id);assert.ok(choices.includes(endingChoice));
    assert.ok(!choices.includes(endingChoice===cfg.end1?cfg.end2:cfg.end1),'incompatible new ending has no blanket unlock');
    g=step(g,c,{choiceId:endingChoice});assert.equal(g.phase,'ended');assert.equal(g.nodeId,endingId);assert.equal(g.completedCombats.length,1);
    assert.ok(cfg.scenes.every(scene=>g.visited.includes(scene)));
    const imported=validateSave({format:'chronicle-gate-v18',game:g},CAMPAIGNS).game;assert.equal(imported.nodeId,endingId);
    assert.ok(viewGame(g,c,g.players[0].id).scene.text.length>=2);
   }
  });
  test(`${id}: ${count} players who skip every new observation retain the old-ending route`,()=>{
   let g=startBranch(c,count);assert.ok(!g.inventory.includes(cfg.item));
   for(const [index,choiceId] of cfg.safe.entries()){
    if(index===cfg.safe.length-1){const visible=availableChoices(g,c).map(a=>a.id);assert.ok(!visible.includes(cfg.end1));assert.ok(!visible.includes(cfg.end2));}
    g=step(g,c,{choiceId});
   }
   assert.equal(g.nodeId,cfg.oldEnd);assert.equal(g.phase,'ended');assert.equal(g.completedCombats.length,1);assert.ok(!g.inventory.includes(cfg.item));
  });
 }
 test(`${id}: the four new risky choices resolve all four genuine D20 grades from earned source states`,()=>{
  const states=preparedStates(c,4);let count=0;
  for(const g of states)for(const action of c.nodes[g.nodeId].choices.filter(a=>!a.automatic)){
   const plan=previewAction(g,c,actor(g),{choiceId:action.id}).plan;assert.ok(plan);
   for(const grade of ['critical','success','failure','fumble']){
    const die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+plan.bonus,plan.dc)===grade);assert.ok(die,`${action.id}/${grade}`);
    const after=step(structuredClone(g),c,{choiceId:action.id},die);assert.equal(after.lastResult.grade,grade);assert.equal(after.nodeId,action.outcomes[grade].next);assert.equal(after.lastResult.text,action.outcomes[grade].text);count++;
   }
  }
  assert.equal(count,16);
 });
 test(`${id}: a late lethal fumble has no false survivor movement and leaves a one-survivor route`,()=>{
  for(const count of [1,2]){
   // Location, clues, inventory and completed combat are all earned before this health boundary fixture.
   const g=preparedStates(c,count).find(g=>g.nodeId===cfg.harmNode);assert.ok(g);
   g.players[g.activeIndex].health=1;const action=c.nodes[g.nodeId].choices.find(a=>a.id===cfg.harmChoice),fumble=action.outcomes.fumble;
   const after=step(g,c,{choiceId:action.id},1);assert.equal(after.lastResult.deaths.length,1);
   assert.ok(after.lastResult.text.startsWith(fumble.lossText));
   if(count===1){assert.equal(after.nodeId,'__all_dead__');assert.ok(!after.lastResult.text.includes(fumble.survivorArrival));}
   else{
    assert.equal(after.players.filter(p=>p.life!=='dead').length,1);assert.ok(after.lastResult.text.includes(fumble.survivorArrival));
    let rest=after;while(rest.phase!=='ended'){const safe=cfg.safe[cfg.scenes.indexOf(rest.nodeId)];assert.ok(safe);rest=step(rest,c,{choiceId:safe});}
    assert.equal(rest.nodeId,cfg.oldEnd);
   }
  }
 });
}
