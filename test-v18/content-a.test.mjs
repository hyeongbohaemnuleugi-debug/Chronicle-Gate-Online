/** Real-engine checks for the four Stories A campaigns. Item-use routes start
 * with a fresh party, earn their inventory and resolve the actual encounters.
 * No browser, simulated transport or injected item possession is involved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createGame, applyAction, availableChoices, previewAction, viewGame, validateSave, gradeRoll } from '../public/game/engine.js';
const EXPECTED={
 'last-train':{gate:'ledger',risk:15,choices:28,scenes:['platform','carriage','kiosk','dining','baggage','ledger','brake','signal','tunnel','witness','switch','bridge']},
 'glass-hotel':{gate:'archive',risk:19,choices:28,scenes:['entrance','reception','service','ballroom','security','laundry','archive','workshop','stair','mirrorhall','vault','roof']},
 'moon-market':{gate:'auction',risk:16,choices:29,scenes:['bridge','tea','scales','stalls','repair','fish','auction','backstage','witness','ledger','crane','council']},
 'dragon-banquet':{gate:'tasting',risk:17,choices:28,scenes:['gate','kitchen','salon','pantry','ovens','gallery','tasting','council','dragon','chimney','bell','banquet']},
};
const campaigns=CAMPAIGNS.filter(c=>Object.hasOwn(EXPECTED,c.id));
const roster=(c,count=4)=>c.classes.slice(0,count).map((job,index)=>({id:`reader-${index}`,name:`동료 ${index+1}`,classId:job.id}));
const grades=['critical','success','failure','fumble'];
function mechanical(outcome){return JSON.stringify(Object.fromEntries(Object.entries(outcome).filter(([key])=>!['text','arrival','lossText','survivorArrival'].includes(key)).sort(([a],[b])=>a.localeCompare(b))));}
function next(game,campaign,payload,roll=20){const result=applyAction(game,campaign,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll});assert.equal(result.ok,true,`${campaign.id}/${game.nodeId}: ${result.error}`);return result.game;}
function clearAndObserve(game,campaign){
 for(let count=0;game.combat&&count<40;count++){
  let first=true;game=next(game,campaign,{combatAction:'basic'},()=>{const die=first?20:1;first=false;return die;});
 }
 assert.equal(Boolean(game.combat),false,'combat must resolve under the declared test rolls');
 for(const detail of campaign.nodes[game.nodeId]?.details||[])if(!game.detailsRead[`${game.nodeId}:${detail.id}`])game=next(game,campaign,{detailId:detail.id});
 return game;
}
const traversals=new Map();
function traverse(campaign,count=4){
 const traversalKey=`${campaign.id}:${count}`;
 if(traversals.has(traversalKey))return traversals.get(traversalKey);
 const queue=[createGame(campaign,roster(campaign,count))],seen=new Set(),byChoice=new Map(),endings=new Set();let steps=0;
 while(queue.length){
  let game=queue.shift();
  if(game.phase==='ended'){if(game.nodeId!=='__all_dead__'){endings.add(game.nodeId);assert.equal(game.completedCombats.length,1,'normal end must retain the resolved encounter');}continue;}
  game=clearAndObserve(game,campaign);
  const key=JSON.stringify([game.nodeId,Object.keys(game.flags).sort(),game.clues.slice().sort(),game.inventory.slice().sort(),game.spentItems.slice().sort()]);
  if(seen.has(key))continue;seen.add(key);assert.ok(++steps<15000,'content traversal exceeded a reasonable acyclic state budget');
  for(const action of availableChoices(game,campaign)){
   const location=`${game.nodeId}/${action.id}`;
   if(!byChoice.has(location))byChoice.set(location,structuredClone(game));
   const result=next(game,campaign,{choiceId:action.id});result.journal=[];queue.push(result);
  }
 }
 const found={byChoice,endings,states:seen.size};traversals.set(traversalKey,found);return found;
}
for(const campaign of campaigns){
 const expected=EXPECTED[campaign.id],playable=Object.values(campaign.nodes).filter(n=>!n.ending);
 test(`${campaign.id}: every risky choice has four complete authored consequences`,()=>{
  assert.deepEqual(playable.map(n=>n.id).sort(),expected.scenes.slice().sort(),'migration-stable scene IDs changed');
  assert.equal(playable.reduce((sum,n)=>sum+n.choices.length,0),expected.choices+4);
  assert.equal(playable.flatMap(n=>n.choices).filter(a=>!a.automatic).length,expected.risk+4);
  const checkItem=id=>assert.ok(campaign.items[id],`unknown item ${id}`);
  for(const node of playable){
   for(const field of ['summary','objective','stakes'])assert.ok(typeof node[field]==='string'&&node[field].length>=12,`${node.id}: missing plain ${field}`);
   assert.ok(node.choices.length>0&&node.choices.length<=5,`${node.id}: raw choice count`);
   for(const count of [1,2,4]){
    const state=createGame(campaign,roster(campaign,count));state.nodeId=node.id;state.inventory=Object.keys(campaign.items);state.clues=Object.keys(campaign.clues);state.flags=Object.fromEntries(Object.keys(campaign.flags).map(id=>[id,true]));
    assert.ok(availableChoices(state,campaign).length<=4,`${node.id}: too many visible choices for ${count} players`);
   }
   assert.equal(new Set(node.choices.map(a=>a.id)).size,node.choices.length);
   assert.ok(node.choices.some(a=>!(a.useItems?.length||a.consumeItems?.length)&&!a.requires),`${node.id}: no unconditional item-free progression`);
   for(const detail of node.details||[])for(const id of detail.gainItems||[])checkItem(id);
   for(const action of node.choices){
    for(const id of [...(action.useItems||[]),...(action.consumeItems||[])])checkItem(id);
    if(action.useItems?.length||action.consumeItems?.length)assert.ok(action.lockedHint,`${node.id}/${action.id}: explain the missing item`);
    assert.equal(Object.hasOwn(action.outcomes,'mixed'),false);
    if(!action.automatic){
     assert.deepEqual(Object.keys(action.outcomes).sort(),grades.slice().sort());
     assert.notEqual(mechanical(action.outcomes.critical),mechanical(action.outcomes.success),`${node.id}/${action.id}: critical has no authored mechanical difference`);
     assert.notEqual(mechanical(action.outcomes.fumble),mechanical(action.outcomes.failure),`${node.id}/${action.id}: fumble has no authored mechanical difference`);
     assert.equal(new Set(grades.map(g=>action.outcomes[g].text)).size,4,'different grades must have independent prose');
    }
    for(const outcome of Object.values(action.outcomes)){
     assert.ok(campaign.nodes[outcome.next],`${node.id}/${action.id}: missing next ${outcome.next}`);
     assert.ok(typeof outcome.text==='string'&&outcome.text.length>20);
     for(const id of [...(outcome.gainItems||[]),...(outcome.loseItems||[])])checkItem(id);
     for(const id of outcome.clues||[])assert.ok(campaign.clues[id],`unknown clue ${id}`);
     for(const id of [...(outcome.set||[]),...(outcome.unset||[])])assert.ok(campaign.flags[id],`unknown flag ${id}`);
    }
   }
  }
 });
 test(`${campaign.id}: all paths stay acyclic and normal endings cannot bypass combat`,()=>{
  const stack=new Set(),visited=new Set(),arrived=new Set();
  function visit(id,passedGate){
   assert.ok(!stack.has(id),`cycle at ${id}`);
   const node=campaign.nodes[id];passedGate ||= id===expected.gate;
   if(node.ending){assert.ok(passedGate,`${id} bypasses the combat gate`);arrived.add(id);return;}
   const key=`${id}:${passedGate}`;if(visited.has(key))return;visited.add(key);stack.add(id);
   for(const action of node.choices)for(const outcome of Object.values(action.outcomes))visit(outcome.next,passedGate);
   stack.delete(id);
  }
  visit(campaign.start,false);assert.equal(arrived.size,3);assert.ok(campaign.nodes[expected.gate].encounter);
  assert.ok(campaign.deathEnding.text.length>=2);
 });
 test(`${campaign.id}: every party item is earned and usable in an actual playthrough`,t=>{
  const reached=traverse(campaign);assert.equal(reached.endings.size,3,'all three normal endings are reachable through actual rules');
  const items=Object.entries(campaign.items);assert.ok(items.length>=3);
  for(const [itemId,item] of items){
   const consumers=playable.flatMap(node=>node.choices.filter(action=>[...(action.useItems||[]),...(action.consumeItems||[])].includes(itemId)).map(action=>({node,action})));
   assert.ok(consumers.length,`${itemId}: collectible with no use`);
   const target=consumers.find(({node,action})=>reached.byChoice.has(`${node.id}/${action.id}`));assert.ok(target,`${itemId}: no source-to-use route`);
   const before=structuredClone(reached.byChoice.get(`${target.node.id}/${target.action.id}`));assert.ok(before.inventory.includes(itemId));
   const actor=before.players[before.activeIndex].id,view=viewGame(before,campaign,actor);
   assert.equal(view.inventory.find(item=>item.id===itemId)?.usableHere,true);
   const preview=previewAction(before,campaign,actor,{choiceId:target.action.id});assert.equal(preview.ok,true);assert.ok(preview.plan.itemNames.includes(item.name));
   const after=next(before,campaign,{choiceId:target.action.id});
   assert.ok(after.lastResult.usedItems.some(item=>item.id===itemId),'lastResult must explain which held item was used');
   if(target.action.consumeItems?.includes(itemId)){
    assert.ok(!after.inventory.includes(itemId));assert.ok(after.spentItems.includes(itemId));
    const imported=validateSave({format:'chronicle-gate-v17',game:after},CAMPAIGNS).game;
    assert.ok(!imported.inventory.includes(itemId),'new-save import must not recreate a spent item from a retained clue');
   }else assert.ok(after.inventory.includes(itemId),'reusable tool should remain in the bag');
  }
  t.diagnostic(`${reached.states} distinct reachable states; ${items.length} earned item uses; ${reached.endings.size} normal endings after actual combat`);
 });
 test(`${campaign.id}: actual dice resolve every outcome and a real early-party catastrophe`,()=>{
  const reached=traverse(campaign),solo=traverse(campaign,1);let resolved=0;
  for(const node of playable)for(const action of node.choices.filter(a=>!a.automatic)){
   const state=(action.requires?.partyMax===1?solo:reached).byChoice.get(`${node.id}/${action.id}`);assert.ok(state,`${node.id}/${action.id}: unreachable risky choice`);
   const actor=state.players[state.activeIndex].id;
   const preview=previewAction(state,campaign,actor,{choiceId:action.id});assert.equal(preview.ok,true);
   assert.equal(preview.plan.outcomes.length,4);
   for(const grade of grades){
    const die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+preview.plan.bonus,preview.plan.dc)===grade);assert.ok(die,`${action.id}: ${grade} impossible`);
    const result=next(state,campaign,{choiceId:action.id},die);assert.equal(result.lastResult.grade,grade);
    if(action.outcomes[grade].harmAll===3){assert.equal(result.nodeId,'__all_dead__');assert.ok(result.players.every(p=>p.life==='dead'));}
    else if(result.nodeId!=='__all_dead__')assert.equal(result.nodeId,action.outcomes[grade].next);
    resolved++;
   }
  }
  assert.equal(resolved,(expected.risk+4)*4);
 });
}
