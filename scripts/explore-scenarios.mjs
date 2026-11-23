/** Reachability explorer: exact rules, bounded state exploration, no LLM or mocked story effects. */
import fs from 'node:fs';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createGame, previewAction, applyAction, availableChoices, viewGame } from '../public/game/engine.js';
const roster=['guardian','scout','scholar','envoy'].map((classId,i)=>({id:`p${i}`,name:`플레이어${i+1}`,classId}));
const report=[];let issues=[];
for(const campaign of CAMPAIGNS){
 const queue=[createGame(campaign,roster)],seen=new Set(),endings=new Set(),endingStates=new Set(),edges=new Set();
 const touched=new Set(),deadSeen=new Set(),revivedSeen=new Set();let completed=0;
 const cap=35000;
 while(queue.length&&seen.size<cap){
  const game=queue.pop();
  const key=JSON.stringify([game.nodeId,Object.keys(game.flags).sort(),[...game.clues].sort(),game.pressure,game.sparks,game.activeIndex,game.players.map(p=>[p.health,p.revivals]),Object.keys(game.reviveAttempts||{}).sort()]);
  if(seen.has(key))continue;seen.add(key);touched.add(game.nodeId);
  game.players.forEach(p=>{if(p.life==='dead')deadSeen.add(p.id);if(p.revivals>0)revivedSeen.add(p.id);});
  if(game.phase==='ended'){endings.add(game.nodeId);endingStates.add(key);completed++;continue;}
  const actor=game.players[game.activeIndex];
  const node=campaign.nodes[game.nodeId];
  // Evaluate both skipping observation and reading all safe scene details.
  const variants=[game];let observed=game;
  for(const detail of node.details||[]){
   if(observed.detailsRead[`${game.nodeId}:${detail.id}`])continue;
   const result=applyAction(observed,campaign,actor.id,{detailId:detail.id,revision:observed.revision});
   if(!result.ok){issues.push(`${campaign.id}/${game.nodeId}/detail: ${result.error}`);continue;}observed=result.game;
  }
  if(observed!==game)variants.push(observed);
  for(const state of variants){
   const options=availableChoices(state,campaign);
   if(!options.length){issues.push(`${campaign.id}/${game.nodeId}: reachable deadlock`);continue;}
   const actions=options.map(c=>({choiceId:c.id}));
   const site=viewGame(state,campaign,actor.id).scene.resurrection;
   if(site?.available&&state.sparks>=(site.sparkCost??1))for(const id of site.eligibleIds)actions.push({reviveId:id});
   for(const payload of actions){
    const preview=previewAction(state,campaign,actor.id,payload);
    if(!preview.ok){issues.push(`${campaign.id}/${game.nodeId}/${payload.choiceId||'revive'}: ${preview.error}`);continue;}
    const plan=preview.plan;
    const dice=plan.automatic?[null]:[1,Math.max(2,Math.min(19,plan.dc-plan.bonus-1)),Math.max(2,Math.min(19,plan.dc-plan.bonus)),20];
    for(const roll of new Set(dice)){
     const result=applyAction(state,campaign,actor.id,{...payload,revision:state.revision},{roll});
     if(!result.ok){issues.push(`${campaign.id}/${game.nodeId}/${payload.choiceId||'revive'}: ${result.error}`);continue;}
     const next=result.game;edges.add(`${game.nodeId}/${payload.choiceId||'revive'}:${next.lastResult.grade}->${next.nodeId}`);
     // History is presentational; removing it prevents needless memory blow-up.
     next.journal=[];next.lastResult=null;queue.push(next);
    }
   }
  }
 }
 const ordinary=Object.values(campaign.nodes).filter(n=>n.ending).map(n=>n.id);
 for(const end of ordinary)if(!endings.has(end))issues.push(`${campaign.id}: normal ending ${end} not reached${queue.length?' within exploration budget':''}`);
 report.push({id:campaign.id,title:campaign.title,statesExplored:seen.size,transitionVariants:edges.size,endingStateVariants:endingStates.size,endingsReached:[...endings].sort(),normalEndingCount:ordinary.length,visitedSceneCount:touched.size,deathObserved:deadSeen.size>0,revivalObserved:revivedSeen.size>0,exhaustive:queue.length===0});
 console.log(`${campaign.id}: ${seen.size} states, ${edges.size} transitions, ${endingStates.size} final state variants, ${endings.size} ending templates${queue.length?' (bounded)':''}`);
}
const result={generatedAt:new Date().toISOString(),method:'Bounded exact-rule state exploration, four fixed characters; includes successful/mixed/failed/critical checks, reading/skipping details and available revival attempts. Counts are tested state variants, not unique written endings. Maximum 35,000 states per campaign.',scenarios:report,issues:[...new Set(issues)]};
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../SCENARIO_REACHABILITY.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
if(result.issues.length){console.error(result.issues.slice(0,60).join('\n'));process.exitCode=1;}
