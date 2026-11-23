/** A lethal result cannot narrate a dead character walking into the next room. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {LOSS_PASSAGES} from '../public/game/campaigns/loss-passages.js';
import {createGame,applyAction,previewAction,availableChoices,viewGame,validateSave,gradeRoll} from '../public/game/engine.js';

const roster=(c,count)=>c.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`독자${i+1}`,classId:job.id}));
function satisfy(game,requires){
  if(!requires)return;
  if(Array.isArray(requires)){requires.forEach(c=>satisfy(game,c));return;}
  for(const c of requires.all||[])satisfy(game,c);
  if(requires.any?.length)satisfy(game,requires.any[0]);
  if(requires.flag)game.flags[requires.flag]=true;
  if(requires.notFlag)delete game.flags[requires.notFlag];
  if(requires.clue&&!game.clues.includes(requires.clue))game.clues.push(requires.clue);
  if(requires.notClue)game.clues=game.clues.filter(id=>id!==requires.notClue);
  if(requires.item&&!game.inventory.includes(requires.item))game.inventory.push(requires.item);
  if(requires.notItem)game.inventory=game.inventory.filter(id=>id!==requires.notItem);
  if(requires.pressureAtLeast!=null)game.pressure=requires.pressureAtLeast;
  if(requires.pressureAtMost!=null)game.pressure=Math.min(game.pressure,requires.pressureAtMost);
}
function focusedState(c,node,choice,allLow=false){
  const count=choice.requires?.partyMax===1?1:4,game=createGame(c,roster(c,count));
  game.nodeId=node.id;game.visited=[...new Set([c.start,node.id])];
  game.inventory=Object.keys(c.items);game.clues=Object.keys(c.clues);game.combat=null;
  satisfy(game,choice.requires);
  game.players.forEach((p,i)=>p.health=allLow||i===0?1:3);
  assert.ok(availableChoices(game,c).some(a=>a.id===choice.id));return game;
}

for(const c of CAMPAIGNS){
  test(`${c.id}: every damaging grade has an authored death scene and an accurate conditional onward route`,()=>{
    const expected=new Set();let checked=0;
    for(const node of Object.values(c.nodes))for(const choice of node.choices||[])for(const [grade,outcome] of Object.entries(choice.outcomes)){
      if(!outcome.harm&&!outcome.harmAll)continue;
      const key=`${node.id}/${choice.id}/${grade}`;expected.add(key);
      assert.ok(outcome.lossText?.length>=15,`${key}: missing lethal passage`);
      assert.ok(outcome.survivorArrival?.length>=15,`${key}: missing survivor route`);
      assert.ok(outcome.lossText.length+outcome.survivorArrival.length<500,`${key}: reading passage too long`);
      for(const allLow of [false,true]){
        const game=focusedState(c,node,choice,allLow),preview=previewAction(game,c,'p0',{choiceId:choice.id});
        assert.equal(preview.ok,true,preview.error);
        const plan=preview.plan,die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+plan.bonus,plan.dc)===grade);
        assert.ok(die,`${key}: grade unavailable`);
        const result=applyAction(game,c,'p0',{choiceId:choice.id,revision:game.revision},{roll:die});assert.equal(result.ok,true,result.error);
        const after=result.game,died=after.lastResult.deaths,allDead=after.players.every(p=>p.life==='dead');
        assert.ok(died.length,`${key}: low-health test did not exercise actual death`);
        const text=after.lastResult.text;
        assert.ok(text.startsWith(outcome.lossText));
        for(const name of died)assert.ok(text.includes(name));
        assert.equal(text.includes(outcome.survivorArrival),!allDead,`${key}: survivor movement at the wrong time`);
        assert.equal(after.arrival.text,text,'arrival must preserve the actual death branch');
        assert.equal(preview.plan.outcomes.find(p=>p.grade===grade).text,text,'preview must account for current health');
        assert.equal(after.chronicle.at(-1).text,text,'reading log must keep the actual result');
        assert.ok(text.length<=700,'never silently drop an authored death from the bounded chronicle');
        if(allDead){
          assert.equal(after.nodeId,'__all_dead__');assert.equal(after.deathSceneTitle,node.title);
          assert.ok(!after.lastResult.changes.some(line=>line.startsWith('다음 장면:')));
          assert.ok(!preview.plan.outcomes.find(p=>p.grade===grade).changes.some(line=>line.startsWith('다음 장면:')));
        }else assert.equal(after.nodeId,outcome.next);
        const restored=validateSave({format:'chronicle-gate-v18',game:after},CAMPAIGNS).game;
        assert.equal(restored.lastResult.text,text);assert.equal(restored.chronicle.at(-1).text,text);
        checked++;
      }
    }
    assert.ok(checked>0);assert.deepEqual(Object.keys(LOSS_PASSAGES[c.id]||{}).sort(),[...expected].sort(),'missing or orphaned damage passage');
  });
}

test('actual solo tram route ends at the tram when a second injury kills the character',()=>{
  const c=CAMPAIGNS.find(c=>c.id==='clock-city');let game=createGame(c,roster(c,1));
  function act(payload,roll=1){const r=applyAction(game,c,'p0',{...payload,revision:game.revision},{roll});assert.equal(r.ok,true,r.error);game=r.game;}
  act({detailId:'tool-pouch'});act({choiceId:'tram-first'});assert.equal(game.players[0].health,2);assert.equal(game.nodeId,'tram');
  const plan=previewAction(game,c,'p0',{choiceId:'brake'}).plan;
  act({choiceId:'brake'});
  assert.equal(game.players[0].health,0);assert.equal(game.nodeId,'__all_dead__');
  assert.equal(game.deathSceneTitle,c.nodes.tram.title);assert.equal(viewGame(game,c,'p0').scene.location,c.nodes.tram.title);
  const original=c.nodes.tram.choices.find(a=>a.id==='brake').outcomes.fumble;
  assert.ok(game.lastResult.text.startsWith(original.lossText));assert.ok(!game.lastResult.text.includes(original.survivorArrival));
  assert.equal(plan.outcomes.find(o=>o.grade==='fumble').text,game.lastResult.text);
});
