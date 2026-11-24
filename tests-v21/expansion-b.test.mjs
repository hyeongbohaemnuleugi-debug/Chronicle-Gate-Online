/** Earn every new sea/snow ending through real play; fixtures only lower health for death boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createGame,applyAction,availableChoices,previewAction,gradeRoll,validateSave,viewGame} from '../public/game/engine.js';
import {chronicleText} from '../public/game/narrative.js';

const campaign=id=>CAMPAIGNS.find(c=>c.id===id);
const roster=(c,size)=>c.classes.slice(0,size).map((job,i)=>({id:`p${i}`,name:`탐험자${i+1}`,classId:job.id}));
function perform(game,c,payload,roll=20){
 const response=applyAction(game,c,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll});
 assert.equal(response.ok,true,`${c.id}/${game.nodeId}/${JSON.stringify(payload)}: ${response.error}`);
 return response.game;
}
function fight(game,c){
 let turns=0;
 while(game.combat&&turns++<45){
  let first=true;
  game=perform(game,c,{combatAction:'basic'},()=>{const die=first?20:1;first=false;return die;});
 }
 assert.equal(Boolean(game.combat),false,'real combat must reach victory');
 assert.equal(game.phase,'playing');
 return game;
}
function choose(game,c,id,grade='critical'){
 game=fight(game,c);
 const options=availableChoices(game,c);
 assert.ok(options.length<=4,`${game.nodeId}: too many visible choices`);
 const choice=options.find(a=>a.id===id);
 assert.ok(choice,`${c.id}/${game.nodeId}: unavailable ${id} (available: ${options.map(a=>a.id)})`);
 let die=20;
 if(!choice.automatic){
  const plan=previewAction(game,c,game.players[game.activeIndex].id,{choiceId:id}).plan;
  die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+plan.bonus,plan.dc)===grade);
  assert.ok(die,`${id}: ${grade} must be attainable`);
 }
 return perform(game,c,{choiceId:id},die);
}
function path(game,c,ids){for(const id of ids)game=choose(game,c,id);return game;}
function startSea(size){
 const c=campaign('deep-sea');
 return path(createGame(c,roster(c,size)),c,['brief','answer','patients','warm','hear-outside']);
}
function seaReady(size){
 const c=campaign('deep-sea');
 return path(startSea(size),c,['repair-relay','ask-return','listen-cycle','private','count','offer-return-water']);
}
function startSnow(size){
 const c=campaign('snow-radio');
 return path(createGame(c,roster(c,size)),c,['power-first','crank','rescue-route','person-first','records','check-post-room']);
}
function snowReady(size,lettersOnly=false){
 const c=campaign('snow-radio');
 return path(startSnow(size),c,[...(lettersOnly?['leave-case','seal-letters']:['repair-case','ask-before-carry']),'low-power','listen-all','private-handover']);
}
function assertEnding(game,c,id){
 assert.equal(game.phase,'ended');assert.equal(game.nodeId,id);assert.equal(game.completedCombats.length,1);
 const reloaded=validateSave({format:'chronicle-gate-v18',game},CAMPAIGNS).game;
 assert.deepEqual(reloaded.flags,game.flags);assert.deepEqual(reloaded.inventory,game.inventory);
 assert.deepEqual(reloaded.chronicle,game.chronicle);
 const view=viewGame(reloaded,c,'p0'),reading=chronicleText(view);
 assert.ok(reading.includes(c.nodes[id].title));
 for(const event of game.chronicle)assert.ok(reading.includes(event.text));
 assert.equal(game.chroniclePartial,false,'expanded play must fit the existing chronicle without losing its beginning');
 return view;
}

for(const size of [1,2,3,4]){
 test(`deep-sea ${size}p: repaired relay and answered return request lead to voluntary release`,()=>{
  const c=campaign('deep-sea');let game=seaReady(size);
  assert.ok(game.inventory.includes('sea_water_relay'));assert.ok(game.flags.sea_return_requested);
  game=path(game,c,['prepare-outlet','let-go']);assertEnding(game,c,'ending-open-water');
  assert.ok(game.flags.sea_release_chosen);assert.ok(!game.flags.sea_watch_agreed);
  assert.ok(game.inventory.includes('sea_water_relay'),'release does not silently consume a relay kept by the party');
 });
 test(`deep-sea ${size}p: earned relay is actually left with willing responders`,()=>{
  const c=campaign('deep-sea');let game=path(seaReady(size),c,['prepare-outlet','offer-watch']);
  assertEnding(game,c,'ending-deep-watch');assert.ok(game.flags.sea_watch_agreed);
  assert.ok(!game.inventory.includes('sea_water_relay'));assert.ok(game.clues.includes('sea_free_reply'));
 });
 test(`snow-radio ${size}p: permission and actual transfer precede the carried-voices ending`,()=>{
  const c=campaign('snow-radio');let game=snowReady(size);
  assert.ok(game.inventory.includes('snow_carry_case'));assert.ok(game.flags.snow_move_permission);
  assert.ok(!game.flags.snow_anchors_carried);
  game=path(game,c,['move-anchors','escort-voices']);assertEnding(game,c,'ending-carried-voices');
  assert.ok(game.flags.snow_anchors_carried);assert.ok(!game.flags.snow_letters_packed);
 });
 test(`snow-radio ${size}p: private letters require permission and packing, without inventing anchor transport`,()=>{
  const c=campaign('snow-radio');let game=snowReady(size,true);
  assert.ok(!game.inventory.includes('snow_carry_case'));assert.ok(!game.flags.snow_move_permission);
  game=path(game,c,['pack-letters','deliver-letters']);assertEnding(game,c,'ending-kept-letters');
  assert.ok(game.flags.snow_private_delivery);assert.ok(!game.flags.snow_anchors_carried);
 });
}

test('deep-sea: failing to repair the relay leaves a coherent old route and cannot forge a request',()=>{
 const c=campaign('deep-sea');let game=choose(startSea(1),c,'repair-relay','failure');
 assert.ok(!game.inventory.includes('sea_water_relay'));
 assert.ok(!availableChoices(game,c).some(a=>a.id==='ask-return'));
 game=path(game,c,['go-reactor','isolate','count']);
 assert.equal(game.nodeId,'council');assert.ok(!availableChoices(game,c).some(a=>a.id==='offer-return-water'));
 game=choose(game,c,'quiet');assertEnding(game,c,'ending-harbor');
});

test('deep-sea: failed pressure preparation cannot offer either new release ending',()=>{
 const c=campaign('deep-sea');
 for(const grade of ['failure','fumble']){
  let game=choose(seaReady(4),c,'prepare-outlet',grade);
  assert.ok(!game.flags.sea_outlet_ready);
  assert.deepEqual(availableChoices(game,c).map(a=>a.id),['choose-safe-ascent']);
  game=choose(game,c,'choose-safe-ascent');const view=assertEnding(game,c,'ending-harbor');
  assert.ok(view.scene.reading.echoes.some(text=>text.includes('방류 요청으로 남겼다')));
 }
});

test('deep-sea: an unanswered watch request becomes release, never compulsory service',()=>{
 const c=campaign('deep-sea');
 for(const grade of ['failure','fumble']){
  let game=path(seaReady(1),c,['prepare-outlet']);
  game=choose(game,c,'offer-watch',grade);assertEnding(game,c,'ending-open-water');
  assert.ok(!game.flags.sea_watch_agreed);assert.ok(game.inventory.includes('sea_water_relay'));
 }
});

test('snow-radio: equipment alone cannot grant permission or reveal private endings',()=>{
 const c=campaign('snow-radio');let game=path(startSnow(1),c,['repair-case']);
 game=choose(game,c,'ask-before-carry','failure');
 assert.ok(game.inventory.includes('snow_carry_case'));assert.ok(!game.flags.snow_move_permission);
 game=path(game,c,['low-power','archive-copy']);
 assert.equal(game.nodeId,'decision');assert.ok(!availableChoices(game,c).some(a=>a.id==='private-handover'));
 game=choose(game,c,'sleep');assertEnding(game,c,'ending-silence');
});

test('snow-radio: an unsafe transfer preserves the original anchors and returns to the old waiting ending',()=>{
 const c=campaign('snow-radio');
 for(const grade of ['failure','fumble']){
  let game=choose(snowReady(4),c,'move-anchors',grade);
  assert.ok(!game.flags.snow_anchors_carried);assert.ok(game.flags.anchors_protected);
  assert.deepEqual(availableChoices(game,c).map(a=>a.id),['wait-in-warmth']);
  game=choose(game,c,'wait-in-warmth');const view=assertEnding(game,c,'ending-silence');
  assert.ok(view.scene.reading.echoes.some(text=>text.includes('아직 완료 표시를 하지 않았다')));
 }
});

test('all new risky actions use four actual outcomes in earned states and retain their effects after saves',()=>{
 const sea=campaign('deep-sea'),snow=campaign('snow-radio');
 const rows=[
  [sea,startSea(4),'repair-relay'],
  [sea,()=>path(startSea(4),sea,['repair-relay']),'ask-return'],
  [sea,()=>seaReady(4),'prepare-outlet'],
  [sea,()=>path(seaReady(4),sea,['prepare-outlet']),'offer-watch'],
  [snow,startSnow(4),'repair-case'],
  [snow,()=>path(startSnow(4),snow,['repair-case']),'ask-before-carry'],
  [snow,()=>path(startSnow(4),snow,['leave-case']),'seal-letters'],
  [snow,()=>snowReady(4),'move-anchors']
 ];
 for(const [c,build,id] of rows){
  const state=typeof build==='function'?build():build;
  for(const grade of ['critical','success','failure','fumble']){
   const after=choose(state,c,id,grade);assert.equal(after.lastResult.grade,grade);
   const outcome=c.nodes[state.nodeId].choices.find(a=>a.id===id).outcomes[grade];
   assert.equal(after.nodeId,outcome.next);assert.equal(after.chronicle.at(-1).text,outcome.text);
   for(const flag of outcome.set||[])assert.ok(after.flags[flag]);
   for(const item of outcome.gainItems||[])assert.ok(after.inventory.includes(item));
   for(const item of outcome.loseItems||[])assert.ok(!after.inventory.includes(item));
   const loaded=validateSave({format:'chronicle-gate-v18',game:after},CAMPAIGNS).game;
   assert.deepEqual(loaded.flags,after.flags);assert.deepEqual(loaded.inventory,after.inventory);
  }
 }
});

test('new harmful outcomes never move a dead actor onward, including an actual solo wipe',()=>{
 const rows=[
  ['deep-sea',startSea,'repair-relay'],['deep-sea',seaReady,'prepare-outlet'],
  ['snow-radio',startSnow,'repair-case'],['snow-radio',snowReady,'move-anchors']
 ];
 for(const [id,build,action] of rows)for(const size of [1,4]){
  const c=campaign(id),game=build(size),node=c.nodes[game.nodeId];
  // Only the death-boundary condition is injected. Route, combat, item and permission were earned.
  game.players[game.activeIndex].health=1;
  const outcome=node.choices.find(a=>a.id===action).outcomes.fumble;
  const preview=previewAction(game,c,game.players[game.activeIndex].id,{choiceId:action});
  const after=choose(game,c,action,'fumble');assert.ok(after.lastResult.deaths.length);
  assert.ok(after.lastResult.text.startsWith(outcome.lossText));
  assert.equal(after.lastResult.text.includes(outcome.survivorArrival),size>1);
  assert.equal(after.nodeId,size===1?'__all_dead__':outcome.next);
  assert.equal(after.lastResult.text,preview.plan.outcomes.find(o=>o.grade==='fumble').text);
  assert.equal(after.chronicle.at(-1).text,after.lastResult.text);
 }
});
