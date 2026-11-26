import { musicTheme } from '../public/game/scene-sound.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createStoryState as createGame, availableChoices, applyAction, conditionMatches } from '../public/game/engine.js';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const errors=[];const rows=[];
const check=(value,message)=>{if(!value)errors.push(message);};
const moods=new Set(['calm','mystery','tension','danger','hope','grief']);
const stats=new Set(['might','agility','wit','heart']);
const stock=['이야기가 흘러갑니다','선택에 따라 운명이 바뀝니다','TODO','PLACEHOLDER','undefined'];
check(CAMPAIGNS.length===9,'Nine campaigns required');
check(new Set(CAMPAIGNS.map(c=>c.id)).size===9,'Campaign IDs must be unique');
const allParagraphs=new Map();
for(const c of CAMPAIGNS){
 const nodes=Object.values(c.nodes),playable=nodes.filter(n=>!n.ending),ends=nodes.filter(n=>n.ending);
 check(Object.keys(c.items||{}).length>=3,`${c.id}: at least three usable items`);
 check(playable.length>=16,`${c.id}: too few playable scenes`);check(ends.length===5,`${c.id}: five normal endings`);
 check(c.deathEnding?.text?.length>=2,`${c.id}: death ending missing`);
 check(c.classes?.length===4,`${c.id}: four campaign-specific professions required`);
 check(playable.filter(n=>n.encounter).length>=1,`${c.id}: contextual combat missing`);
 for(const job of c.classes||[]){check(Boolean(job.basic?.name)&&Boolean(job.ability?.name),`${c.id}/${job.id}: basic and one ability required`);check(Object.values(job.stats||{}).reduce((s,n)=>s+n,0)===5,`${c.id}/${job.id}: invalid fixed stats`);}
 check(c.roles?.length===4,`${c.id}: four character roles required`);
 check(Boolean(c.playModes?.solo)&&Boolean(c.playModes?.group),`${c.id}: solo/group reading descriptions missing`);
 const modeChoices=nodes.flatMap(n=>n.choices||[]);
 check(modeChoices.filter(a=>a.requires?.partyMax===1).length>=2,`${c.id}: two solo-specific choices required`);
 check(modeChoices.filter(a=>a.requires?.partyMin===2).length>=2,`${c.id}: two group-specific choices required`);
 check(Boolean(c.nodes[c.start].partyText?.solo)&&Boolean(c.nodes[c.start].partyText?.group),`${c.id}: mode-specific opening required`);
 check(Object.keys(c.clues||{}).length>=6,`${c.id}: at least six grounded clues`);
 check(playable.filter(n=>n.resurrection).length>=2,`${c.id}: at least two revival opportunities`);
 check(fs.existsSync(path.join(root,`public/game/art/${c.id}.webp`)),`${c.id}: art missing`);
 for(const mood of moods)check(fs.existsSync(path.join(root,`public/game/audio/${musicTheme(c.id)}-${mood}.mp3`)),`${c.id}: ${mood} audio missing`);
 let choiceCount=0,harmful=0,conditional=0;
 for(const [id,node] of Object.entries(c.nodes)){
  check(node.id===id,`${c.id}/${id}: id mismatch`);
  check(node.text?.length>=2,`${c.id}/${id}: needs at least two authored paragraphs`);
  if(node.partyText)for(const mode of ['solo','group']){
   check(Array.isArray(node.partyText[mode])&&node.partyText[mode].length>=2,`${c.id}/${id}/${mode}: incomplete introduction`);
   for(const paragraph of node.partyText[mode]||[])check(typeof paragraph==='string'&&!stock.some(s=>paragraph.includes(s)),`${c.id}/${id}/${mode}: placeholder prose`);
  }
  check(moods.has(node.mood),`${c.id}/${id}: unsupported mood`);
  check([0,1,2,3].includes(node.art),`${c.id}/${id}: invalid art quadrant`);
  for(const paragraph of node.text||[]){
   check(!stock.some(s=>paragraph.includes(s)),`${c.id}/${id}: placeholder prose`);
   if(paragraph.length>45){check(!allParagraphs.has(paragraph),`${c.id}/${id}: paragraph reused from ${allParagraphs.get(paragraph)}`);allParagraphs.set(paragraph,`${c.id}/${id}`);}
  }
  if(!node.ending)for(const field of ['summary','objective','stakes'])check(Boolean(node[field]),`${c.id}/${id}: missing ${field}`);
  if(node.ending){check((node.choices||[]).length===0,`${c.id}/${id}: ending has story choices`);continue;}
  check(node.choices.length>=1&&node.choices.length<=5,`${c.id}/${id}: needs1–5 raw choices`);
  for(const count of [1,2,3,4]){
   const game=createGame(c,c.classes.slice(0,count).map((job,i)=>({id:`p${i}`,classId:job.id})));
   game.nodeId=id;game.inventory=Object.keys(c.items);game.clues=Object.keys(c.clues);game.flags=Object.fromEntries(Object.keys(c.flags).map(flag=>[flag,true]));
   check(availableChoices(game,c).length<=4,`${c.id}/${id}: more than four visible choices for ${count} players`);
  }
  check(new Set(node.choices.map(x=>x.id)).size===node.choices.length,`${c.id}/${id}: duplicate action ID`);
  for(const detail of node.details||[])if(detail.clue)check(Object.hasOwn(c.clues,detail.clue),`${c.id}/${id}: unknown detail clue ${detail.clue}`);
  const entityIds=new Set((node.entities||[]).map(e=>e.id));
  for(const choice of node.choices){
   choiceCount++;if(choice.requires)conditional++;
   if(!choice.automatic)check(stats.has(choice.stat)&&Number.isInteger(choice.dc)&&choice.dc>=6&&choice.dc<=20,`${c.id}/${id}/${choice.id}: invalid D20 stats`);
   if(choice.target)check(entityIds.has(choice.target),`${c.id}/${id}/${choice.id}: absent target ${choice.target}`);
   for(const kind of choice.automatic?['success']:['critical','success','failure','fumble']){
    const o=choice.outcomes?.[kind];check(Boolean(o?.text),`${c.id}/${id}/${choice.id}: missing ${kind}`);if(!o)continue;
    check(Object.hasOwn(c.nodes,o.next),`${c.id}/${id}/${choice.id}: broken edge ${o.next}`);
    check(o.next!==id,`${c.id}/${id}/${choice.id}: repeated scene on failure`);
    for(const clue of o.clues||[])check(Object.hasOwn(c.clues,clue),`${c.id}/${id}/${choice.id}: unknown clue ${clue}`);
    for(const flag of [...(o.set||[]),...(o.unset||[])])check(Object.hasOwn(c.flags,flag),`${c.id}/${id}/${choice.id}: unknown memory ${flag}`);
    for(const key of ['harm','harmAll','heal'])if(o[key]!=null)check(Number.isInteger(o[key])&&o[key]>=0&&o[key]<=3,`${c.id}/${id}: invalid damage/heal`);
    if(o.harm||o.harmAll){harmful++;check(Boolean(o.lossText)&&Boolean(o.survivorArrival),`${c.id}/${id}/${choice.id}/${kind}: missing death/continuation prose`);}
   }
  }
 }
 check(harmful>=3,`${c.id}: needs real authored dangers`);check(conditional>=1,`${c.id}: no conditional choice`);
 const visited=new Set(),stack=new Set();
 function visit(id){if(stack.has(id)){check(false,`${c.id}: cycle at ${id}`);return;}if(visited.has(id))return;visited.add(id);stack.add(id);for(const a of c.nodes[id]?.choices||[])for(const o of Object.values(a.outcomes||{}))visit(o.next);stack.delete(id);}
 visit(c.start);for(const id of Object.keys(c.nodes))check(visited.has(id),`${c.id}: unreachable scene ${id}`);
 rows.push({id:c.id,title:c.title,professions:c.classes.length,combats:playable.filter(n=>n.encounter).length,playable:playable.length,endings:ends.length+1,choices:choiceCount,clues:Object.keys(c.clues).length,revivalSites:playable.filter(n=>n.resurrection).length});
}
for(const id of ['dice','success','mixed','failure','clue','reveal','transition','attack','ability','enemy','victory'])check(fs.existsSync(path.join(root,`public/game/audio/${id}.mp3`)),`Missing ${id}.mp3`);
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
check(html.includes('/game/app.js'),'New frontend missing');
check(!html.includes('dice3d'),'New frontend should not load cosmetic dice engine');
check(fs.existsSync(path.join(root,'public/legacy.html')),'Original entry page not preserved');
check(fs.existsSync(path.join(root,'public/offline.html')),'Build offline entry before shipping');
if(errors.length){console.error(`v22 content QA failed (${errors.length})`);errors.forEach(e=>console.error(' - '+e));process.exit(1);}
console.table(rows);
console.log(`v22 Content QA OK: ${rows.reduce((s,r)=>s+r.playable,0)} playable scenes, ${rows.reduce((s,r)=>s+r.endings,0)} ending templates (including 9 early party-death endings).`);
