import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGNS,CATALOG,getCampaign} from '../public/game/campaigns/index.js';
import {createGame,createStoryState,viewGame,applyAction,validateSave,availableChoices} from '../public/game/engine.js';
import {campaignForLength,composeEpic} from '../public/game/campaigns/epic-tools.js';
import {appendChronicle,EPIC_CHRONICLE_LIMIT} from '../public/game/narrative.js';
import {OPENINGS} from '../public/game/opening.js';
import {roster,ok} from './helpers.mjs';

function shortestAdded(campaign,spec){
 const added=new Set(spec.chapters.flatMap(ch=>ch.scenes.map(s=>s.id)));
 const dist=new Map([[campaign.start,0]]),queue=[campaign.start];
 while(queue.length){const id=queue.shift(),node=campaign.nodes[id];for(const choice of node.choices||[])for(const outcome of Object.values(choice.outcomes||{})){
  const d=dist.get(id)+(added.has(outcome.next)?1:0);
  if(!dist.has(outcome.next)||dist.get(outcome.next)>d){dist.set(outcome.next,d);queue.push(outcome.next);}
 }}return Object.values(campaign.nodes).filter(n=>n.ending).map(n=>[n.id,dist.get(n.id)]);
}
test('nine stories expose small Basic/Epic catalog metadata without downloading plot data into room snapshots',()=>{
 assert.equal(CAMPAIGNS.length,9);assert.equal(CATALOG.length,9);
 for(const c of CATALOG){assert.deepEqual(c.lengthModes.map(m=>m.id),['basic','epic']);assert.equal(c.classes.length,4);assert.equal(c.nodes,undefined);assert.equal(c.epicSpec,undefined);assert.ok(Number(c.lengthModes[1].estimatedMinutes.split('–')[0])>=60);}
 assert.ok(Buffer.byteLength(JSON.stringify(CATALOG))<65000);
});
for(const base of CAMPAIGNS){
 test(`${base.id}: Epic composition preserves Basic, mandatory encounters and every ending, with 24 additional steps on every ordinary path`,()=>{
  const before=JSON.stringify(base.nodes),epic=getCampaign(base.id,'epic');
  assert.equal(JSON.stringify(base.nodes),before);assert.equal(getCampaign(base.id),base);
  assert.equal(campaignForLength(epic,'basic'),base);assert.equal(getCampaign(base.id,'epic'),epic);
  for(const [id,steps] of shortestAdded(epic,base.epicSpec)){assert.ok(Number.isFinite(steps)&&steps>=24,`${id}: ${steps}`);assert.ok(base.nodes[id].ending);}
  for(const chapter of base.epicSpec.chapters){assert.deepEqual(epic.nodes[chapter.return.id].choices,base.nodes[chapter.at].choices);assert.equal(epic.nodes[chapter.return.id].encounter,undefined);assert.deepEqual(epic.nodes[chapter.at].encounter,base.nodes[chapter.at].encounter);}
 });
 for(const mode of ['basic','epic']) for(const count of [1,2,3,4]) test(`${base.id}/${mode}/${count}: new games always start privately, then meet, and survive save round-trips`,()=>{
  const people=roster(base,count);let game=createGame(base,people,{storyLength:mode,openingMode:'together'});
  assert.equal(game.phase,'opening');assert.equal(game.storyLength,mode);assert.equal(game.schema,22);
  // Reverse order demonstrates that private progress is independent of the shared turn.
  for(const person of [...people].reverse())for(let stage=0;stage<2;stage++){
   const own=viewGame(game,base,person.id),choice=own.scene.choices.find(c=>c.automatic);
   assert.ok(choice);assert.equal(own.canAct,true);
   game=ok(applyAction(game,base,person.id,{choiceId:choice.id,revision:own.actionRevision})).game;
   game=validateSave(game,CAMPAIGNS).game;
  }
  assert.equal(game.phase,'playing');assert.equal(game.nodeId,base.start);assert.equal(game.opening.joined,true);
  assert.ok(availableChoices(game,base).length||game.combat);
  const view=viewGame(game,base,people[0].id);assert.equal(view.storyLength,mode);assert.ok(view.opening.meeting.text.length>=count+1);
  assert.deepEqual(view.scene.reading.paragraphs,OPENINGS[base.id].meeting.startText[count===1?'solo':'group']);
 });
}
test('v21 shared-story saves remain Basic at the exact scene, without retroactive private openings',()=>{
 const base=CAMPAIGNS[0],old=createStoryState(base,roster(base,2));old.schema=17;old.version='21.0.0';delete old.storyLength;
 old.nodeId='bridge';old.visited=[base.start,'bridge'];old.flags.trusted=true;
 const restored=validateSave(old,CAMPAIGNS).game;assert.equal(restored.storyLength,'basic');assert.equal(restored.nodeId,'bridge');assert.equal(restored.opening,undefined);assert.equal(restored.flags.trusted,true);
});
test('unknown lengths, missing Epic nodes and duplicate professions cannot become new sessions',()=>{
 const base=CAMPAIGNS[0];assert.throws(()=>createGame(base,roster(base,2),{storyLength:'endless'}));
 const persons=roster(base,2);persons[1].classId=persons[0].classId;assert.throws(()=>createGame(base,persons),/서로 다른 직업/);
 const old=createStoryState(base,roster(base,1));old.storyLength='unknown';assert.throws(()=>validateSave(old,CAMPAIGNS));
});
test('Epic keeps a full bounded chronicle beyond forty choices while Basic retains its existing cap',()=>{
 for(const mode of ['basic','epic']){const game={storyLength:mode};for(let i=0;i<80;i++)appendChronicle(game,{id:`e${i}`,grade:'success',sceneTitle:'이어서',action:'문을 열었다',text:`${i}번째 방을 지나 다음 복도로 향했다.`});assert.equal(game.chronicle.length,mode==='epic'?80:40);assert.equal(Boolean(game.chroniclePartial),mode==='basic');assert.ok(game.chronicle.length<=EPIC_CHRONICLE_LIMIT);}
});
