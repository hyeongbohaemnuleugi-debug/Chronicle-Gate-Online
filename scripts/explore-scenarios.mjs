/** Concrete ending and item-use witnesses through the real engine; not exhaustive enumeration. */
import fs from 'node:fs';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createGame,previewAction,applyAction,availableChoices} from '../public/game/engine.js';

class Heap{
 values=[];
 push(value){let i=this.values.length;this.values.push(value);while(i){const p=(i-1)>>1;if(this.values[p].priority<=value.priority)break;this.values[i]=this.values[p];i=p;}this.values[i]=value;}
 pop(){const root=this.values[0],last=this.values.pop();if(this.values.length){let i=0;while(i*2+1<this.values.length){let j=i*2+1;if(j+1<this.values.length&&this.values[j+1].priority<this.values[j].priority)j++;if(last.priority<=this.values[j].priority)break;this.values[i]=this.values[j];i=j;}this.values[i]=last;}return root;}
 get length(){return this.values.length;}
}
const roster=c=>c.classes.map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id}));
const compact=game=>{game.journal=[];game.lastResult=null;game.arrival=null;return game;};
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
function witness(campaign,target){
 const targetNodes=target.ending?[target.ending]:Object.values(campaign.nodes).filter(node=>(node.choices||[]).some(c=>[...(c.useItems||[]),...(c.consumeItems||[])].includes(target.item))).map(n=>n.id);
 const distance=distances(campaign,targetNodes),queue=new Heap(),seen=new Set();let serial=0;
 const add=(game,trace)=>{if(!distance.has(game.nodeId))return;queue.push({game,trace,priority:distance.get(game.nodeId)*100000+serial++});};
 add(createGame(campaign,roster(campaign)),null);
 const limit=12000;
 while(queue.length&&seen.size<limit){
  const {game,trace}=normalize(queue.pop(),campaign),id=key(game);if(seen.has(id))continue;seen.add(id);
  if(target.ending&&game.nodeId===target.ending)return {statesTried:seen.size,trace:traceList(trace),finalInventory:game.inventory,finalFlags:Object.keys(game.flags).filter(k=>game.flags[k]),completedCombats:game.completedCombats};
  if(game.phase!=='playing')continue;
  for(const choice of availableChoices(game,campaign)){
   const preview=previewAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id});if(!preview.ok)throw new Error(preview.error);
   const plan=preview.plan,dice=plan.automatic?[null]:[20,Math.max(2,Math.min(19,plan.dc-plan.bonus)),Math.max(2,Math.min(19,plan.dc-plan.bonus-1)),1];
   for(const die of new Set(dice)){
    const result=applyAction(game,campaign,game.players[game.activeIndex].id,{choiceId:choice.id,revision:game.revision},{roll:die});
    if(!result.ok)throw new Error(`${campaign.id}/${game.nodeId}/${choice.id}: ${result.error}`);
    const nextTrace={previous:trace,step:step(game,result.game,{id:choice.id,sceneTitle:campaign.nodes[game.nodeId].title})};
    if(target.item&&[...(choice.useItems||[]),...(choice.consumeItems||[])].includes(target.item))return {statesTried:seen.size,trace:traceList(nextTrace),inventoryBefore:game.inventory,inventoryAfter:result.game.inventory,consumed:result.game.lastResult.lostItems.some(item=>item.id===target.item)};
    add(compact(result.game),nextTrace);
   }
  }
 }
 return {statesTried:seen.size,error:queue.length?'Search budget reached':'No route found'};
}

const report={version:'17.0.0',generatedAt:new Date().toISOString(),method:'Concrete target-directed routes through the actual engine with four fixed campaign professions. All safe observations are read; story checks try representative rolls for each reachable grade; combat uses player natural 20 and enemy natural 1. Each search is capped at 12,000 states. A witness establishes one valid path, not all possible prose, tactics, death/revival combinations or exhaustive coverage. Party death and revival are separately tested by tests-v17.',scenarios:[],issues:[]};
for(const campaign of CAMPAIGNS){
 const row={id:campaign.id,title:campaign.title,endings:[],items:[]};
 for(const node of Object.values(campaign.nodes).filter(n=>n.ending)){
  const result=witness(campaign,{ending:node.id});row.endings.push({id:node.id,title:node.title,...result});
  if(result.error)report.issues.push(`${campaign.id}/${node.id}: ${result.error}`);
  else if(!result.completedCombats.length)report.issues.push(`${campaign.id}/${node.id}: ending bypasses combat`);
 }
 for(const [id,item] of Object.entries(campaign.items)){
  const result=witness(campaign,{item:id});row.items.push({id,name:item.name,...result});if(result.error)report.issues.push(`${campaign.id}/${id}: ${result.error}`);
 }
 report.scenarios.push(row);
 console.log(`${campaign.id}: ${row.endings.filter(r=>!r.error).length}/${row.endings.length} normal endings, ${row.items.filter(r=>!r.error).length}/${row.items.length} item uses witnessed (${[...row.endings,...row.items].reduce((n,r)=>n+r.statesTried,0)} candidate states)`);
}
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../NARRATIVE_REACHABILITY_V17.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(report.issues.length){console.error(report.issues.join('\n'));process.exitCode=1;}
