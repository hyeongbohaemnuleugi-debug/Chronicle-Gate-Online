import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CAMPAIGNS,getCampaign} from '../public/game/campaigns/index.js';
import {SCENE_SOUNDS,BASIC_SCENE_SOUNDS} from '../public/game/scene-sound.js';
import {CHARACTERS} from '../public/game/characters.js';
const grades=['critical','success','failure','fumble'];
const mechanical=o=>JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k])=>!['text','arrival','lossText','survivorArrival','sound'].includes(k))));
for(const base of CAMPAIGNS)for(const length of ['basic','epic'])test(`${base.id}/${length}: every transition, item, risky grade and contextual sound is internally valid`,()=>{
 const c=getCampaign(base.id,length),itemIds=new Set(Object.keys(c.items||{})),soundIds=new Set(SCENE_SOUNDS);
 assert.equal(c.classes.length,4);assert.ok(CHARACTERS[c.id].length>=2);
 for(const job of c.classes){assert.equal(Object.values(job.stats).reduce((a,b)=>a+b,0),5);assert.equal(Math.max(...Object.values(job.stats)),3);assert.ok(job.basic.name&&job.ability.name);}
 const nodes=Object.values(c.nodes);assert.equal(nodes.filter(n=>n.ending).length,5);assert.ok(nodes.filter(n=>n.resurrection).length>=2);assert.ok(nodes.some(n=>n.encounter));
 for(const n of nodes){
  assert.equal(n.id,Object.keys(c.nodes).find(id=>c.nodes[id]===n));assert.ok(n.text?.length>=2,`${n.id}: complete prose`);assert.ok(n.art>=0&&n.art<4,`${n.id}: art quadrant`);
  if(n.sound)assert.ok(soundIds.has(n.sound));
  if(!n.ending){assert.ok(n.location&&n.objective&&n.summary,`${n.id}: orientation`);assert.ok(n.choices.length>0);}
  for(const choice of n.choices||[]){
   assert.ok(choice.label);for(const item of [...choice.useItems||[],...choice.consumeItems||[]])assert.ok(itemIds.has(item),`${n.id}: ${item}`);
   if(!choice.automatic){assert.deepEqual(Object.keys(choice.outcomes).sort(),grades.slice().sort());assert.equal(new Set(grades.map(g=>choice.outcomes[g].text)).size,4);if(n.epic){assert.notEqual(mechanical(choice.outcomes.critical),mechanical(choice.outcomes.success));assert.notEqual(mechanical(choice.outcomes.failure),mechanical(choice.outcomes.fumble));}}
   for(const outcome of Object.values(choice.outcomes||{})){
    assert.ok(c.nodes[outcome.next],`${n.id}/${choice.id} -> ${outcome.next}`);assert.ok(outcome.text?.length>12);
    if(outcome.sound)assert.ok(soundIds.has(outcome.sound));
    if(outcome.harm||outcome.harmAll)assert.ok(outcome.lossText&&outcome.survivorArrival,`${n.id}/${choice.id}: death-compatible prose`);
    for(const item of [...outcome.gainItems||[],...outcome.loseItems||[]])assert.ok(itemIds.has(item));
    for(const clue of outcome.clues||[])assert.ok(c.clues[clue],`${n.id}: unknown clue ${clue}`);
    for(const flag of [...outcome.set||[],...outcome.unset||[]])assert.ok(c.flags[flag],`${n.id}: unknown flag ${flag}`);
   }
  }
 }
 for(const [nodeId,sound] of Object.entries(BASIC_SCENE_SOUNDS[c.id]||{})){assert.ok(c.nodes[nodeId],`unbound sound ${nodeId}`);assert.ok(soundIds.has(sound));}
 assert.ok(fs.existsSync(new URL(`../public/game/art/${c.id}.webp`,import.meta.url)));
});
