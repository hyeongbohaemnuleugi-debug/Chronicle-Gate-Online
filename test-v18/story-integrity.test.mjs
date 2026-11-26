/** Authored-data contracts catch mismatched branches and unusable quest objects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CAMPAIGNS as CAMPAIGNS,LEGACY_CATALOG as CATALOG} from '../public/game/campaigns/index.js';
import {createStoryState as createGame,applyAction,previewAction,viewGame,availableChoices} from '../public/game/engine.js';
const grades=['critical','success','failure','fumble'];
const effectKeys=['next','set','unset','clues','pressure','harm','harmAll','heal','gainItems','loseItems'];
const effects=o=>JSON.stringify(Object.fromEntries(effectKeys.filter(key=>o[key]!==undefined).map(key=>[key,o[key]])));
function conditions(value,campaign,label){
 if(!value)return;if(Array.isArray(value)){value.forEach(x=>conditions(x,campaign,label));return;}
 for(const key of ['all','any'])if(value[key])value[key].forEach(x=>conditions(x,campaign,label));
 for(const key of ['item','notItem'])if(value[key])assert.ok(Object.hasOwn(campaign.items||{},value[key]),`${label}: unknown item predicate ${value[key]}`);
 for(const key of ['clue','notClue'])if(value[key])assert.ok(Object.hasOwn(campaign.clues||{},value[key]),`${label}: unknown clue predicate ${value[key]}`);
 for(const key of ['flag','notFlag'])if(value[key])assert.ok(Object.hasOwn(campaign.flags||{},value[key]),`${label}: unknown flag predicate ${value[key]}`);
 for(const key of ['partyMin','partyMax','aliveMin'])if(value[key]!=null)assert.ok(Number.isInteger(value[key])&&value[key]>=1&&value[key]<=4,`${label}: invalid party predicate ${key}`);
}
for(const campaign of CAMPAIGNS){
 test(`${campaign.id}: every risky choice is independently authored in all four grades`,()=>{
  let risky=0;
  for(const node of Object.values(campaign.nodes)){
   if(!node.ending){for(const key of ['summary','objective','stakes'])assert.ok(typeof node[key]==='string'&&node[key].trim().length>=8,`${campaign.id}/${node.id}: missing clear ${key}`);}
   assert.ok(node.text?.length>=2,`${node.id}: two narrative paragraphs required`);
   for(const paragraph of node.text)assert.ok(!/TODO|PLACEHOLDER|undefined/.test(paragraph));
   for(const detail of node.details||[])for(const item of detail.gainItems||[])assert.ok(Object.hasOwn(campaign.items||{},item),`${node.id}: unknown pickup ${item}`);
   conditions(node.resurrection?.requires,campaign,node.id);
   for(const callback of [...(node.callbacks||[]),...(node.epilogues||[])])conditions(callback.when,campaign,node.id);
   for(const choice of node.choices||[]){
    const label=`${campaign.id}/${node.id}/${choice.id}`;conditions(choice.requires,campaign,label);
    const keys=choice.automatic?['success']:grades;if(!choice.automatic)risky++;
    assert.ok(!Object.hasOwn(choice.outcomes,'mixed'),`${label}: mixed remains active`);
    for(const key of keys){
     const result=choice.outcomes[key];assert.ok(result?.text?.length>=20,`${label}/${key}: missing detailed result`);
     assert.ok(Object.hasOwn(campaign.nodes,result.next),`${label}/${key}: broken next scene`);
     assert.notEqual(result.next,node.id,`${label}: repeated scene`);
     for(const item of [...(result.gainItems||[]),...(result.loseItems||[])])assert.ok(Object.hasOwn(campaign.items||{},item),`${label}: unknown item ${item}`);
     for(const flag of [...(result.set||[]),...(result.unset||[])])assert.ok(Object.hasOwn(campaign.flags||{},flag),`${label}: unlabeled state ${flag}`);
     for(const clue of result.clues||[])assert.ok(Object.hasOwn(campaign.clues||{},clue),`${label}: absent clue ${clue}`);
    }
    if(!choice.automatic){
     assert.equal(new Set(grades.map(g=>choice.outcomes[g].text)).size,4,`${label}: duplicated four-result prose`);
     assert.notEqual(effects(choice.outcomes.critical),effects(choice.outcomes.success),`${label}: critical only renamed`);
     assert.notEqual(effects(choice.outcomes.fumble),effects(choice.outcomes.failure),`${label}: fumble only renamed`);
    }
    for(const id of [...(choice.useItems||[]),...(choice.consumeItems||[])])assert.ok(Object.hasOwn(campaign.items||{},id),`${label}: unknown use item`);
    if((choice.useItems||[]).length||(choice.consumeItems||[]).length)assert.ok(choice.lockedHint,`${label}: missing explanation of item gate`);
   }
  }
  assert.ok(risky>=10,`${campaign.id}: too few meaningful risky actions`);
 });
 test(`${campaign.id}: every inventory object has an earned source and an actual contextual use`,()=>{
  const entries=Object.entries(campaign.items||{});assert.ok(entries.length>=3);
  const found=new Set(),used=new Set();
  for(const node of Object.values(campaign.nodes)){
   for(const detail of node.details||[])for(const id of detail.gainItems||[])found.add(id);
   for(const choice of node.choices||[]){
    for(const id of [...(choice.useItems||[]),...(choice.consumeItems||[])])used.add(id);
    for(const outcome of Object.values(choice.outcomes||{}))for(const id of outcome.gainItems||[])found.add(id);
   }
  }
  for(const [id,item] of entries){
   assert.ok(item.name&&item.description&&item.useHint,`${id}: incomplete bag entry`);
   assert.ok(found.has(id),`${id}: no earned pickup`);assert.ok(used.has(id),`${id}: no authored use`);
   for(const clue of item.legacyClues||[])assert.ok(Object.hasOwn(campaign.clues,clue));
   for(const flag of item.legacyFlags||[])assert.ok(Object.hasOwn(campaign.flags,flag));
  }
  const game=createGame(campaign,campaign.classes.map((job,i)=>({id:`p${i}`,name:`동료${i}`,classId:job.id})));
  const v=viewGame(game,campaign,'p0');assert.ok(v.scene.summary&&v.scene.objective&&v.scene.stakes);
  assert.ok(!CATALOG.find(c=>c.id===campaign.id).items,'static lobby catalog must not transmit every inventory definition');
 });
}

test('the clock-city opening makes both rescues actual decisions with four possible results',()=>{
 const campaign=CAMPAIGNS.find(c=>c.id==='clock-city'),node=campaign.nodes[campaign.start];
 assert.match(node.text.join(' '),/윤/);assert.match(node.text.join(' '),/전차/);assert.match(node.text.join(' '),/정오|열두 시|12시/);
 const game=createGame(campaign,campaign.classes.map((job,i)=>({id:`p${i}`,classId:job.id})));
 assert.ok(node.choices.slice(0,2).every(choice=>!choice.automatic));
 for(const choice of node.choices.slice(0,2)){
  const p=previewAction(game,campaign,'p0',{choiceId:choice.id});assert.equal(p.ok,true,p.error);assert.equal(p.plan.outcomes.length,4);
  for(const roll of [20,12,2,1]){
   const r=applyAction(game,campaign,'p0',{choiceId:choice.id,revision:game.revision},{roll});assert.equal(r.ok,true,r.error);
   assert.ok(viewGame(r.game,campaign,'p1').scene.arrival.text);assert.ok(r.game.lastResult.nextSceneTitle);
  }
 }
});
