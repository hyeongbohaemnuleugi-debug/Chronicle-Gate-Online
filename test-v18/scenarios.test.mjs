import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_CAMPAIGNS as CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createStoryState as createGame, applyAction, availableChoices, previewAction, viewGame } from '../public/game/engine.js';
const roster=campaign=>campaign.classes.map((c,i)=>({id:`p${i}`,name:`동료${i+1}`,classId:c.id}));
function clearCombat(game,campaign){
 let turns=0;
 while(game.combat&&turns++<40){
  // A successful route through the fight: player rolls 20, declared enemy responses roll 1.
  let first=true;
  const result=applyAction(game,campaign,game.players[game.activeIndex].id,{combatAction:'basic',revision:game.revision},{roll:()=>{const die=first?20:1;first=false;return die;}});
  assert.ok(result.ok,result.error);game=result.game;
 }
 assert.equal(Boolean(game.combat),false,'combat must resolve');return game;
}
function observe(game,campaign){
 for(const detail of campaign.nodes[game.nodeId]?.details||[]){
  const result=applyAction(game,campaign,game.players[game.activeIndex].id,{detailId:detail.id,revision:game.revision});
  if(result.ok)game=result.game;
 }
 return game;
}
function reach(campaign,predicate){
 const queue=[createGame(campaign,roster(campaign))],seen=new Set();
 while(queue.length){
  let game=queue.shift();if(game.phase==='ended')continue;
  game=clearCombat(game,campaign);
  game=observe(game,campaign);
  const key=JSON.stringify([game.nodeId,Object.keys(game.flags).sort(),game.clues.slice().sort(),game.inventory.slice().sort()]);
  if(seen.has(key))continue;seen.add(key);
  if(predicate(game))return game;
  for(const choice of availableChoices(game,campaign)){
   const result=applyAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id,revision:game.revision},{roll:20});
   assert.ok(result.ok,result.error);result.game.journal=[];queue.push(result.game);
  }
 }
 return null;
}
for(const campaign of CAMPAIGNS){
 test(`${campaign.id}: an actual four-person play route can end early in total-party death`,()=>{
  let game;
  if(campaign.id==='snow-radio'){
   game=reach(campaign,g=>g.nodeId==='transmitter');assert.ok(game,'reach transmitter');
   for(const id of ['split','share-power']){
    const result=applyAction(game,campaign,game.players[game.activeIndex].id,{choiceId:id,revision:game.revision},{roll:1});
    assert.ok(result.ok,result.error);game=result.game;
   }
  }else{
   game=reach(campaign,g=>availableChoices(g,campaign).some(c=>c.outcomes?.fumble?.harmAll===3));
   assert.ok(game,'reachable catastrophic shortcut');assert.deepEqual(game.players.map(p=>p.health),[3,3,3,3]);
   const choice=availableChoices(game,campaign).find(c=>c.outcomes?.fumble?.harmAll===3);
   const actor=game.players[game.activeIndex].id;
   const preview=previewAction(game,campaign,actor,{choiceId:choice.id});assert.equal(preview.plan.groupHarm,3);assert.match(preview.plan.risk,/사망|전멸/);
   const win=applyAction(game,campaign,actor,{choiceId:choice.id,revision:game.revision},{roll:20});assert.ok(win.ok);assert.ok(win.game.players.every(p=>p.life==='alive'));
   const loss=applyAction(game,campaign,actor,{choiceId:choice.id,revision:game.revision},{roll:1});assert.ok(loss.ok,loss.error);game=loss.game;
  }
  assert.equal(game.phase,'ended');assert.equal(game.nodeId,'__all_dead__');assert.ok(game.players.every(p=>p.health===0&&p.life==='dead'));
  const view=viewGame(game,campaign,'p0');assert.equal(view.scene.title,campaign.deathEnding.title);assert.equal(view.canAct,false);assert.equal(view.scene.choices.length,0);
 });
 test(`${campaign.id}: seeded playthroughs progress with saved consequences and no loops`,()=>{
  const endings=new Set();
  for(let seed=1;seed<=240;seed++){
   let state=seed*1709+71;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
   const count=1+(seed%4);let game=createGame(campaign,roster(campaign).slice(0,count));
   for(let step=0;step<90&&game.phase!=='ended';step++){
    if(game.combat){
     const actor=game.players[game.activeIndex].id;
     const view=viewGame(game,campaign,actor);
     const useAbility=view.combat.actions.ability.available&&random()<.6;
     const payload={combatAction:useAbility?'ability':'basic',revision:game.revision};
     if(useAbility&&view.combat.actions.ability.target==='ally')payload.targetId=view.combat.targetOptions.slice().sort((a,b)=>a.health-b.health)[0].id;
     const result=applyAction(game,campaign,actor,payload,{roll:()=>1+Math.floor(random()*20)});
     assert.ok(result.ok,result.error);game=result.game;continue;
    }
    if(random()<.75)game=observe(game,campaign);
    const actor=game.players[game.activeIndex].id;
    const choices=availableChoices(game,campaign);assert.ok(choices.length,`${campaign.id}/${game.nodeId}: no choices`);
    const choice=choices[Math.floor(random()*choices.length)];
    const result=applyAction(game,campaign,actor,{choiceId:choice.id,revision:game.revision},{roll:1+Math.floor(random()*20)});
    assert.ok(result.ok,`${campaign.id}/${game.nodeId}: ${result.error}`);game=result.game;
   }
   assert.equal(game.phase,'ended',`${campaign.id}: unfinished seed${seed}`);
   assert.equal(new Set(game.visited).size,game.visited.length);
   if(game.nodeId!=='__all_dead__')assert.equal(game.completedCombats.length,1,'normal ending requires an actual combat victory');
   endings.add(game.nodeId);
  }
  assert.ok(endings.size>=3,`${campaign.id}: should expose several outcomes, got ${[...endings]}`);
 });
}
