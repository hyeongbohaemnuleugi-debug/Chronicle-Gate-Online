import assert from 'node:assert/strict';
import {createStoryState,availableChoices,applyAction,previewAction} from '../public/game/engine.js';

export const roster=(campaign,count=1)=>campaign.classes.slice(0,count).map((job,index)=>({id:`p${index}`,name:`동료 ${index+1}`,classId:job.id,connected:true}));
export const ok=result=>{assert.equal(result?.ok,true,result?.error);return result;};
export function atGate(campaign,entry,count=1){
  const game=createStoryState(campaign,roster(campaign,count),{storyLength:campaign.lengthMode});
  game.nodeId=entry.gateId;game.visited=[...new Set([campaign.start,entry.gateId])];game.arrival=null;
  return game;
}
export function act(game,campaign,payload,roll=20){
  const dice=Array.isArray(roll)?[...roll]:null;
  return applyAction(game,campaign,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll:()=>dice?(dice.length?dice.shift():1):roll});
}
export function winCombat(game,campaign,{attackDie=20,enemyDie=1,trace=[]}={}){
  let guard=60;
  while(game.combat&&game.phase==='playing'&&guard--){
    trace.push({sceneId:game.nodeId,combatAction:'basic',die:attackDie});
    game=ok(act(game,campaign,{combatAction:'basic'},[attackDie,enemyDie,enemyDie,enemyDie,enemyDie])).game;
  }
  assert.ok(guard>0,'The battle must terminate.');
  return game;
}
export function reachableGateMaximum(campaign){
  const memo=new Map(),active=new Set();
  function visit(id){
    if(memo.has(id))return memo.get(id);
    assert.ok(!active.has(id),`Scene cycle at ${campaign.id}/${id}`);active.add(id);
    const node=campaign.nodes[id];assert.ok(node,`Missing ${id}`);
    const next=[...new Set((node.choices||[]).flatMap(choice=>Object.values(choice.outcomes||{}).map(outcome=>outcome.next)))];
    const result=(node.encounterGate?1:0)+(next.length?Math.max(...next.map(visit)):0);
    active.delete(id);memo.set(id,result);return result;
  }
  visit(campaign.start);return {maximum:memo.get(campaign.start),at:id=>memo.has(id)?memo.get(id):visit(id)};
}
/** Find and execute a complete route with real inventory, flags, rolls and HP.
 * The graph only orders candidates; it never manufactures state or skips scenes.
 */
export function completeRoute(campaign,{count=1,fight=false,attackDie=20,enemyDie=1,limit=12000}={}){
  const target=fight?campaign.encounterCatalog.length:0,remaining=reachableGateMaximum(campaign);
  const seen=new Set();let explored=0;
  function search(input,steps){
    assert.ok(++explored<=limit,`Route search budget exceeded: ${campaign.id}/${campaign.lengthMode}`);
    let game=input,trace=[...steps];
    if(game.combat){if(!fight)return null;game=winCombat(game,campaign,{attackDie,enemyDie,trace});}
    if(game.phase==='ended')return game.nodeId!=='__all_dead__'&&game.completedCombats.length===target?{game,steps:trace,explored}:null;
    const node=campaign.nodes[game.nodeId];
    if(fight&&game.completedCombats.length+remaining.at(game.nodeId)<target)return null;
    // Observations never roll, never advance the turn and can collect a real item.
    for(const detail of node.details||[]){
      if(game.detailsRead[`${node.id}:${detail.id}`])continue;
      const result=act(game,campaign,{detailId:detail.id});
      if(result.ok){trace.push({sceneId:node.id,detailId:detail.id,die:20});game=result.game;}
    }
    const signature=JSON.stringify([game.nodeId,game.activeIndex,game.pressure,game.inventory,game.clues,Object.keys(game.flags).sort(),game.players.map(p=>p.health),game.completedCombats]);
    if(seen.has(signature))return null;seen.add(signature);
    let choices=availableChoices(game,campaign);
    if(node.encounterGate)choices=choices.filter(choice=>choice.id===`${fight?'fight':'avoid'}-${node.encounterGate}`);
    else choices=[...choices].sort((a,b)=>Math.max(...Object.values(b.outcomes).map(o=>remaining.at(o.next)))-Math.max(...Object.values(a.outcomes).map(o=>remaining.at(o.next))));
    for(const choice of choices){
      const plan=previewAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id});
      if(!plan.ok)continue;
      const grades=new Set();
      for(const die of choice.automatic?[20]:[20,12,8,2,1]){
        const result=act(game,campaign,{choiceId:choice.id},die);
        if(!result.ok||grades.has(result.game.lastResult.grade))continue;grades.add(result.game.lastResult.grade);
        const found=search(result.game,[...trace,{sceneId:game.nodeId,choiceId:choice.id,die}]);
        if(found)return found;
      }
    }
    return null;
  }
  const result=search(createStoryState(campaign,roster(campaign,count),{storyLength:campaign.lengthMode}),[]);
  assert.ok(result,`${campaign.id}/${campaign.lengthMode}/${count}: an actual ${target}-battle ending route must exist`);
  return result;
}
