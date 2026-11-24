/** Concrete ending and item-use witnesses through the real engine; not exhaustive enumeration. */
import fs from 'node:fs';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {VERSION,createGame,previewAction,applyAction,availableChoices} from '../public/game/engine.js';

class Heap{
 values=[];
 push(value){let i=this.values.length;this.values.push(value);while(i){const p=(i-1)>>1;if(this.values[p].priority<=value.priority)break;this.values[i]=this.values[p];i=p;}this.values[i]=value;}
 pop(){const root=this.values[0],last=this.values.pop();if(this.values.length){let i=0;while(i*2+1<this.values.length){let j=i*2+1;if(j+1<this.values.length&&this.values[j+1].priority<this.values[j].priority)j++;if(last.priority<=this.values[j].priority)break;this.values[i]=this.values[j];i=j;}this.values[i]=last;}return root;}
 get length(){return this.values.length;}
}
const roster=(c,count=4)=>c.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id}));
const compact=game=>{game.journal=[];game.chronicle=[];game.lastResult=null;game.arrival=null;return game;};
const key=game=>JSON.stringify([game.nodeId,Object.keys(game.flags).filter(k=>game.flags[k]).sort(),[...game.clues].sort(),[...game.inventory].sort(),game.pressure,game.sparks,game.activeIndex,game.players.map(p=>[p.health,p.life])]);
const step=(game,next,action)=>({sceneId:game.nodeId,scene:action.sceneTitle,action:next.lastResult.action,choiceId:action.id||null,grade:next.lastResult.grade,roll:next.lastResult.roll,result:next.lastResult.text,changes:next.lastResult.changes||[],nextSceneId:next.nodeId,nextScene:next.lastResult.nextSceneTitle||null});
function traceList(trace){const out=[];while(trace){out.push(trace.step);trace=trace.previous;}return out.reverse();}
function normalize(entry,campaign){
 let {game,trace}=entry,turns=0;
 while(game.combat&&turns++<100){
  let first=true;
  const result=applyAction(game,campaign,game.players[game.activeIndex].id,{combatAction:'basic',revision:game.revision},{roll:()=>{const n=first?20:1;first=false;return n;}});
  if(!result.ok)throw new Error(result.error);
  trace={previous:trace,step:step(game,result.game,{id:'combat:basic',sceneTitle:campaign.nodes[game.nodeId].title})};game=compact(result.game);
 }
 if(game.combat)throw new Error(`${campaign.id}: combat did not terminate`);
 if(game.phase==='playing')for(const detail of campaign.nodes[game.nodeId].details||[]){
  if(game.detailsRead[`${game.nodeId}:${detail.id}`])continue;
  const result=applyAction(game,campaign,game.players[game.activeIndex].id,{detailId:detail.id,revision:game.revision});
  if(!result.ok)throw new Error(result.error);
  trace={previous:trace,step:step(game,result.game,{id:`observe:${detail.id}`,sceneTitle:campaign.nodes[game.nodeId].title})};game=compact(result.game);
 }
 return {game,trace};
}
function distances(campaign,targets){
 const distance=new Map(targets.map(id=>[id,0]));let changed=true;
 while(changed){changed=false;for(const node of Object.values(campaign.nodes))for(const choice of node.choices||[])for(const result of Object.values(choice.outcomes)){
  if(!distance.has(result.next))continue;const d=distance.get(result.next)+1;
  if(!distance.has(node.id)||distance.get(node.id)>d){distance.set(node.id,d);changed=true;}
 }}return distance;
}
function optimisticReachability(campaign,target,count){
 const cache=new Map();
 return game=>{
  // Health, pressure, consumed objects and negative predicates must not make
  // this upper bound stricter than actual play. Seats, unlike survivors, stay fixed.
  const flags=Object.keys(game.flags).filter(id=>game.flags[id]).sort();
  const clues=[...game.clues].sort(),items=[...game.inventory].sort();
  const cacheKey=JSON.stringify([game.nodeId,flags,clues,items]);
  if(cache.has(cacheKey))return cache.get(cacheKey);
  const possible={flags:new Set(flags),clues:new Set(clues),items:new Set(items)};
  const reached=new Set([game.nodeId]);let changed=true;
  const remember=value=>{cache.set(cacheKey,value);return value;};
  const include=(set,values=[])=>{for(const value of values)if(!set.has(value)){set.add(value);changed=true;}};
  const condition=requires=>{
   if(!requires)return true;
   if(Array.isArray(requires))return requires.every(condition);
   if(requires.all&&!requires.all.every(condition))return false;
   if(requires.any&&!requires.any.some(condition))return false;
   if(requires.flag&&!possible.flags.has(requires.flag))return false;
   if(requires.clue&&!possible.clues.has(requires.clue))return false;
   if(requires.item&&!possible.items.has(requires.item))return false;
   if(requires.partyMin!=null&&count<requires.partyMin)return false;
   if(requires.partyMax!=null&&count>requires.partyMax)return false;
   // Even reviving every seat cannot satisfy a larger living-party requirement.
   if(requires.aliveMin!=null&&count<requires.aliveMin)return false;
   return true;
  };
  // Union all possible future branches, including mutually exclusive grades.
  // This may retain impossible routes, but cannot discard a route merely because
  // it requires a future pickup. A missed, now-unreachable pickup cannot reappear.
  while(changed){
   changed=false;
   for(const id of reached){
    if(target.ending===id)return remember(true);
    const node=campaign.nodes[id];if(!node)continue;
    if(node.encounter?.victoryFlag)include(possible.flags,[node.encounter.victoryFlag]);
    for(const detail of node.details||[]){
     include(possible.clues,detail.clue?[detail.clue]:detail.clues);
     include(possible.items,detail.gainItems);
    }
    for(const choice of node.choices||[]){
     if(!condition(choice.requires))continue;
     const used=[...(choice.useItems||[]),...(choice.consumeItems||[])];
     if(!used.every(item=>possible.items.has(item)))continue;
     if(target.choice&&target.nodeId===id&&target.choice===choice.id)return remember(true);
     if(target.item&&used.includes(target.item))return remember(true);
     for(const outcome of Object.values(choice.outcomes)){
      include(possible.flags,outcome.set);
      include(possible.clues,outcome.clues);
      include(possible.items,outcome.gainItems);
      include(reached,[outcome.next]);
     }
    }
   }
  }
  return remember(false);
 };
}
function witness(campaign,target,count=4){
 const targetNodes=target.ending?[target.ending]:target.choice?[target.nodeId]:Object.values(campaign.nodes).filter(node=>(node.choices||[]).some(c=>[...(c.useItems||[]),...(c.consumeItems||[])].includes(target.item))).map(n=>n.id);
 const distance=distances(campaign,targetNodes),queue=new Heap(),seen=new Set();let serial=0,optimisticPruned=0;
 const canStillReach=optimisticReachability(campaign,target,count);
 const stats=()=>({statesTried:seen.size,optimisticPruned});
 const add=(game,trace)=>{
  if(!distance.has(game.nodeId))return;
  if(!canStillReach(game)){optimisticPruned++;return;}
  queue.push({game,trace,priority:distance.get(game.nodeId)*100000+serial++});
 };
 add(createGame(campaign,roster(campaign,count)),null);
 const limit=12000;
 while(queue.length&&seen.size<limit){
  const {game,trace}=normalize(queue.pop(),campaign),id=key(game);if(seen.has(id))continue;seen.add(id);
  if(target.ending&&game.nodeId===target.ending)return {...stats(),trace:traceList(trace),finalInventory:game.inventory,finalFlags:Object.keys(game.flags).filter(k=>game.flags[k]),completedCombats:game.completedCombats};
  if(game.phase!=='playing')continue;
  for(const choice of availableChoices(game,campaign)){
   const preview=previewAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id});if(!preview.ok)throw new Error(preview.error);
   const plan=preview.plan,dice=plan.automatic?[null]:[20,Math.max(2,Math.min(19,plan.dc-plan.bonus)),Math.max(2,Math.min(19,plan.dc-plan.bonus-1)),1];
   for(const die of new Set(dice)){
    const result=applyAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id,revision:game.revision},{roll:die});
    if(!result.ok)throw new Error(`${campaign.id}/${game.nodeId}/${choice.id}: ${result.error}`);
    const nextTrace={previous:trace,step:step(game,result.game,{id:choice.id,sceneTitle:campaign.nodes[game.nodeId].title})};
    if(target.choice&&game.nodeId===target.nodeId&&choice.id===target.choice)return {...stats(),trace:traceList(nextTrace),finalFlags:Object.keys(result.game.flags).filter(k=>result.game.flags[k]),completedCombats:result.game.completedCombats};
    if(target.item&&[...(choice.useItems||[]),...(choice.consumeItems||[])].includes(target.item))return {...stats(),trace:traceList(nextTrace),inventoryBefore:game.inventory,inventoryAfter:result.game.inventory,consumed:result.game.lastResult.lostItems.some(item=>item.id===target.item)};
    add(compact(result.game),nextTrace);
   }
  }
 }
 return {...stats(),error:queue.length?'Search budget reached':'No route found'};
}

const report={version:VERSION,generatedAt:new Date().toISOString(),method:'Concrete target-directed routes through the actual engine. Every normal ending is witnessed separately with one, two, three and four players; item uses with four; each authored solo/group choice with its matching party size. All safe observations are read; story checks try representative rolls for each reachable grade; combat uses player natural 20 and enemy natural 1. Each search is capped at 12,000 states. Before queueing, an optimistic fixed-point reachability check unions all possible future gains from reachable observations, outcomes and combat victories, requiring only potentially attainable positive prerequisites and fixed party sizes. Negative conditions, consumption, pressure and injury are ignored by this pruning; it proves only that some branches cannot reach the target, never that a route succeeds. Actual successful witnesses still require applyAction for every event. The separate trace retains each actual event while search-only log copies are cleared to bound memory. A witness is one valid route, not exhaustive proof of prose quality, tactics or every death/revival combination. Death, revival, low-health narration and mode callbacks are separately tested by tests-v18. Profession-specific opening paths, combinations and parallel actions are separately covered by tests-v19; these witnesses begin at the shared main story.',scenarios:[],issues:[]};
for(const campaign of CAMPAIGNS){
 const row={id:campaign.id,title:campaign.title,endings:[],soloEndings:[],twoPlayerEndings:[],threePlayerEndings:[],items:[],partyBranches:[]};
 for(const node of Object.values(campaign.nodes).filter(n=>n.ending)){
  for(const [partySize,field] of [[1,'soloEndings'],[2,'twoPlayerEndings'],[3,'threePlayerEndings'],[4,'endings']]){
   const result=witness(campaign,{ending:node.id},partySize);row[field].push({id:node.id,title:node.title,partySize,...result});
   if(result.error)report.issues.push(`${campaign.id}/${node.id}/${partySize} players: ${result.error}`);
   else if(!result.completedCombats.length)report.issues.push(`${campaign.id}/${node.id}/${partySize} players: ending bypasses combat`);
  }
 }
 for(const [id,item] of Object.entries(campaign.items)){
  const result=witness(campaign,{item:id});row.items.push({id,name:item.name,...result});if(result.error)report.issues.push(`${campaign.id}/${id}: ${result.error}`);
 }
 for(const node of Object.values(campaign.nodes))for(const choice of node.choices||[]){
  const mode=choice.requires?.partyMax===1?'solo':choice.requires?.partyMin===2?'group':null;if(!mode)continue;
  const partySize=mode==='solo'?1:4,result=witness(campaign,{choice:choice.id,nodeId:node.id},partySize);
  row.partyBranches.push({nodeId:node.id,choiceId:choice.id,label:choice.label,mode,partySize,...result});
  if(result.error)report.issues.push(`${campaign.id}/${node.id}/${choice.id}: ${result.error}`);
 }
 report.scenarios.push(row);
 const routes=[...row.soloEndings,...row.twoPlayerEndings,...row.threePlayerEndings,...row.endings];
 console.log(`${campaign.id}: ${routes.filter(r=>!r.error).length}/${routes.length} ending routes across 1–4 players, ${row.items.filter(r=>!r.error).length}/${row.items.length} item uses, ${row.partyBranches.filter(r=>!r.error).length}/${row.partyBranches.length} mode choices witnessed`);
}
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../NARRATIVE_REACHABILITY_V21.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(report.issues.length){console.error(report.issues.join('\n'));process.exitCode=1;}
