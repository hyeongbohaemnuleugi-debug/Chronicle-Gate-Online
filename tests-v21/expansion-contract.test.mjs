/** Release compatibility and authored expansion contracts; current content is not the baseline. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEGACY_CAMPAIGNS as CAMPAIGNS,LEGACY_CATALOG as CATALOG} from '../public/game/campaigns/index.js';
import {VERSION,createStoryState as createGame,validateSave,viewGame,availableChoices} from '../public/game/engine.js';
import {ENDING_MOODS,selectMusic} from '../public/game/music-director.js';
import {chronicleText} from '../public/game/narrative.js';

const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/v20-story-contract.json',import.meta.url),'utf8'));
const oldSaves=JSON.parse(fs.readFileSync(new URL('./fixtures/v20-saves.json',import.meta.url),'utf8')).saves;
const oldFor=id=>baseline.campaigns.find(c=>c.id===id);
const roster=(c,count)=>c.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id}));
const structural=o=>Object.fromEntries(Object.entries(o).filter(([key])=>!['text','arrival','lossText','survivorArrival'].includes(key)));
const fields=['stat','dc','automatic','requires','useItems','consumeItems'];

test('all seven worlds gain four real scenes, two distinct ordinary endings and one usable item without replacing old choices',()=>{
  assert.equal(VERSION,'24.1.0');assert.equal(CAMPAIGNS.length,7);
  let playable=0,ordinary=0;
  for(const c of CAMPAIGNS){
    const old=oldFor(c.id),nodes=Object.values(c.nodes),scenes=nodes.filter(n=>!n.ending),ends=nodes.filter(n=>n.ending);
    assert.equal(c.start,old.start);assert.equal(scenes.length,old.playableCount+4,c.id);assert.equal(ends.length,old.endingIds.length+2,c.id);
    assert.equal(Object.keys(c.items).length,old.itemIds.length+1,c.id);
    for(const id of old.itemIds)assert.ok(c.items[id],`${c.id}/${id}: old held object removed`);
    for(const [id,prior] of Object.entries(old.nodes)){
      const current=c.nodes[id];assert.ok(current,`${c.id}/${id}: existing save location removed`);
      assert.equal(Boolean(current.ending),prior.ending,`${c.id}/${id}: existing ending changed its type`);
      for(const action of prior.choices){
        const next=current.choices.find(a=>a.id===action.id);assert.ok(next,`${c.id}/${id}/${action.id}: old action removed`);
        for(const field of fields)assert.deepEqual(next[field],action[field],`${c.id}/${id}/${action.id}: ${field}`);
        assert.deepEqual(Object.fromEntries(Object.entries(next.outcomes).map(([grade,o])=>[grade,structural(o)])),action.outcomes,`${c.id}/${id}/${action.id}: old dice rules or destination changed`);
      }
    }
    const catalog=CATALOG.find(item=>item.id===c.id);assert.equal(catalog.sceneCount,scenes.length);assert.equal(catalog.endingCount,5);
    playable+=scenes.length;ordinary+=ends.length;
  }
  assert.equal(playable,115);assert.equal(ordinary,35);
});

for(const c of CAMPAIGNS){
  const old=oldFor(c.id),added=Object.values(c.nodes).filter(node=>!old.nodeIds.includes(node.id));
  test(`${c.id}: new pages stay concise, have a safe onward route and support solo, group and a lone survivor`,()=>{
    for(const node of added){
      assert.ok(node.text.length>=2&&node.text.length<=4,`${node.id}: use short paragraphs`);
      for(const text of node.text)assert.ok(text.length>=20&&text.length<=250,`${node.id}: paragraph length ${text.length}`);
      for(const mode of Object.values(node.partyText||{}))for(const text of mode)assert.ok(text.length>=20&&text.length<=250,`${node.id}: mode paragraph too short/long`);
      if(node.ending){assert.equal(node.choices.length,0);continue;}
      assert.ok(node.choices.some(a=>!a.requires&&!a.useItems?.length&&!a.consumeItems?.length),`${node.id}: a missing clue or item must not block all progress`);
      for(const count of [1,2,3,4]){
        const game=createGame(c,roster(c,count));game.nodeId=node.id;
        if(count>1)game.players.slice(1).forEach(p=>{p.health=0;p.life='dead';});
        assert.ok(availableChoices(game,c).length>0,`${node.id}/${count}: lone survivor is blocked`);
        assert.equal(viewGame(game,c,'p0').storyMode,count===1?'solo':'group');
      }
      assert.ok(node.details?.length,`${node.id}: include something grounded to inspect`);
    }
    assert.ok(added.some(node=>node.partyText&&node.partyText.solo.join(' ')!==node.partyText.group.join(' ')),'an expansion has an authored solo/group perspective');
  });

  test(`${c.id}: new endings have stated prerequisite chains and a deliberate music mood`,()=>{
    const endings=added.filter(node=>node.ending);
    assert.equal(endings.length,2);assert.notEqual(endings[0].text.join(' '),endings[1].text.join(' '));
    for(const ending of endings){
      const incoming=Object.values(c.nodes).flatMap(node=>(node.choices||[]).flatMap(action=>Object.values(action.outcomes).filter(o=>o.next===ending.id).map(outcome=>({node,action,outcome}))));
      assert.ok(incoming.length,`${ending.id}: no incoming authored choice`);
      assert.ok(incoming.some(({action})=>action.requires||action.useItems?.length||action.consumeItems?.length),`${ending.id}: no choice/evidence/item requirement`);
      assert.ok(['calm','mystery','tension','danger','hope','grief'].includes(ENDING_MOODS[c.id]?.[ending.id]));
      const view={campaignId:c.id,scene:{id:ending.id,mood:ending.mood,ending:true},ending:true,players:[{id:'p0',health:3,life:'alive'}]};
      assert.equal(selectMusic(view).mood,ENDING_MOODS[c.id][ending.id]);
      assert.equal(selectMusic({...view,players:[...view.players,{id:'p1',health:0,life:'dead'}]}).mood,'grief');
    }
  });
}

test('fifteen actual v20 saves retain their scene, completed ending, earned objects and private opening in v21',()=>{
  assert.equal(oldSaves.length,15);
  for(const fixture of oldSaves){
    const old=fixture.save.game,{game,campaign}=validateSave(fixture.save,CAMPAIGNS);
    assert.equal(game.nodeId,old.nodeId,fixture.campaignId);assert.equal(game.phase,old.phase);
    for(const key of ['inventory','spentItems','flags','clues','completedCombats','chronicle','chroniclePartial'])assert.deepEqual(game[key],old[key],`${fixture.campaignId}/${fixture.kind}/${key}`);
    assert.deepEqual(game.players.map(p=>[p.id,p.classId,p.health,p.life,p.revivals]),old.players.map(p=>[p.id,p.classId,p.health,p.life,p.revivals]));
    const view=viewGame(game,campaign,game.players[0].id);
    if(fixture.kind==='completed'){
      assert.equal(view.ending,true);assert.equal(view.canAct,false);assert.equal(view.scene.choices.length,0);
      for(const entry of old.chronicle)assert.ok(chronicleText(view).includes(entry.text));
    }else if(fixture.kind==='private-opening'){
      assert.equal(view.opening.active,true);assert.equal(view.opening.mine.history.length,1);
      assert.deepEqual(game.opening.states,old.opening.states);
    }else assert.ok(view.scene.choices.length>0,'old paused story still has authored progress');
  }
});
