import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGNS,CATALOG,ORIGINAL_CAMPAIGNS,getCampaign} from '../public/game/campaigns/index.js';
import {createStoryState,availableChoices,viewGame,previewAction,validateSave} from '../public/game/engine.js';
import {startCombat,remapCombatPlayers} from '../public/game/combat.js';
import {campaignForLength} from '../public/game/campaigns/epic-tools.js';
import {roster,ok,atGate,act,winCombat,completeRoute,reachableGateMaximum} from './helpers.mjs';

test('nine actual stories have 3 Basic and 5 Epic optional encounters, totaling 45 distinct authored enemies',()=>{
  assert.equal(CAMPAIGNS.length,9);const ids=new Set(),names=new Set();
  for(const base of CAMPAIGNS){
    const before=JSON.stringify(base.nodes),epic=getCampaign(base.id,'epic');
    assert.equal(base.encounterEdition,24);assert.equal(base.encounterCatalog.length,3);assert.equal(epic.encounterCatalog.length,5);
    assert.equal(Object.values(base.nodes).filter(n=>n.encounter).length,3);assert.equal(Object.values(epic.nodes).filter(n=>n.encounter).length,5);
    assert.deepEqual(epic.encounterCatalog.filter(row=>!row.epicOnly).map(row=>row.id),base.encounterCatalog.map(row=>row.id));
    assert.equal(campaignForLength(epic,'basic'),base);assert.equal(JSON.stringify(base.nodes),before);
    assert.equal(reachableGateMaximum(base).maximum,3);assert.equal(reachableGateMaximum(epic).maximum,5);
    for(const entry of epic.encounterCatalog){
      const encounter=epic.nodes[entry.arenaId].encounter,gate=epic.nodes[entry.gateId];
      assert.ok(!ids.has(encounter.id));assert.ok(!names.has(encounter.enemyName));ids.add(encounter.id);names.add(encounter.enemyName);
      assert.equal(gate.encounterGate,encounter.id);assert.equal(encounter.optional,true);
      assert.notDeepEqual(encounter.intro,gate.text,'A committed battle must not repeat the approach screen and offer unavailable exits.');
      const avoid=gate.choices.find(choice=>choice.id===`avoid-${entry.id}`);
      assert.equal(avoid.automatic,true);assert.equal(avoid.requires,undefined);assert.equal(avoid.useItems,undefined);assert.equal(avoid.consumeItems,undefined);
      assert.ok(!avoid.outcomes.success.harm&&!avoid.outcomes.success.harmAll);
      const negotiation=gate.choices.find(choice=>choice.id===`negotiate-${entry.id}`);
      assert.deepEqual(Object.keys(negotiation.outcomes).sort(),['critical','failure','fumble','success']);
      assert.equal(negotiation.outcomes.critical.encounterResolution.method,'negotiated');
      assert.equal(negotiation.outcomes.success.encounterResolution.method,'negotiated');
      assert.ok(Object.values(negotiation.outcomes).some(outcome=>!outcome.encounterResolution),'A risky option must honestly expose its possible fight.');
      assert.equal(encounter.actions.basic.length,4);assert.equal(encounter.actions.ability.length,4);
      for(const prose of [...encounter.actions.basic,...encounter.actions.ability])assert.ok(typeof prose==='string'&&prose.length>=12);
    }
  }
  assert.equal(ids.size,45);assert.equal(names.size,45);
  for(const row of CATALOG){assert.equal(row.combatCount,3);assert.deepEqual(row.lengthModes.map(mode=>mode.encounterCount),[3,5]);assert.ok(row.lengthModes.every(mode=>mode.optionalEncounters));assert.equal(row.encounterCatalog,undefined);}
  assert.ok(Buffer.byteLength(JSON.stringify(CATALOG))<65000,'No plot or enemy roster belongs in room catalog snapshots.');
});

for(const base of CAMPAIGNS)for(const length of ['basic','epic']){
  const campaign=getCampaign(base.id,length);
  test(`${base.id}/${length}: an actual zero-combat ending and a ${length==='epic'?5:3}-combat ending both exist, solo and four players`,()=>{
    for(const count of [1,4])for(const fight of [false,true]){
      const {game}=completeRoute(campaign,{count,fight});
      assert.equal(game.phase,'ended');assert.notEqual(game.nodeId,'__all_dead__');
      assert.equal(game.completedCombats.length,fight?campaign.encounterCatalog.length:0);
      assert.equal(Object.keys(game.combatRecords).length,game.completedCombats.length);
      assert.ok(Object.keys(game.encounterResolutions).length<=campaign.encounterCatalog.length);
      const restored=validateSave({game},CAMPAIGNS).game;
      assert.deepEqual(restored.encounterResolutions,game.encounterResolutions);assert.deepEqual(restored.completedCombats,game.completedCombats);
      assert.ok(Buffer.byteLength(JSON.stringify(game))<256*1024,'A full Epic route still fits the existing room budget.');
    }
  });
  test(`${base.id}/${length}: ordinary successful attacks survive every encounter even when every enemy strike hits, with 1–4 players`,()=>{
    for(const count of [1,2,3,4]){
      const {game}=completeRoute(campaign,{count,fight:true,attackDie:12,enemyDie:20});
      assert.equal(game.completedCombats.length,campaign.encounterCatalog.length);assert.ok(game.players.every(player=>player.life==='alive'&&player.health>=1));
      const attacks=game.journal.filter(entry=>entry.combat&&entry.combatAction==='basic');assert.ok(attacks.length);assert.ok(attacks.every(entry=>entry.grade==='success'));
    }
  });
}

for(const base of CAMPAIGNS){
  const campaign=getCampaign(base.id,'epic');
  for(const entry of campaign.encounterCatalog)test(`${base.id}/${entry.id}: bypass, four negotiation grades, tools, real battle and saves stay distinct`,()=>{
    const encounter=campaign.nodes[entry.arenaId].encounter;
    const initial=atGate(campaign,entry),beforeSpark=initial.sparks;
    const bypassed=ok(act(initial,campaign,{choiceId:`avoid-${entry.id}`,grade:'critical',damage:999,encounterResolution:{id:entry.id,method:'victory'},completedCombats:[entry.id]})).game;
    assert.equal(bypassed.combat,null);assert.deepEqual(bypassed.completedCombats,[]);assert.deepEqual(bypassed.combatRecords,{});
    assert.equal(bypassed.encounterResolutions[entry.id].method,'bypassed');assert.equal(bypassed.flags[encounter.victoryFlag],undefined);assert.equal(bypassed.sparks,beforeSpark);
    assert.equal(bypassed.lastResult.encounterResolution.method,'bypassed');assert.ok(!bypassed.lastResult.combat);assert.equal(bypassed.lastResult.roll,null);
    const restored=validateSave(bypassed,CAMPAIGNS).game;assert.equal(restored.combat,null);assert.deepEqual(restored.encounterResolutions,bypassed.encounterResolutions);assert.deepEqual(restored.lastResult.encounterResolution,bypassed.lastResult.encounterResolution);
    assert.equal(act(bypassed,campaign,{choiceId:`avoid-${entry.id}`}).ok,false,'The same encounter cannot be resolved twice.');
    startCombat(restored,campaign);assert.equal(restored.combat,null,'Loading or rendering a peaceful arena cannot spawn a retrospective fight.');
    const view=viewGame(restored,campaign,'p0');assert.ok(view.scene.choices.length);assert.equal(view.combat,null);
    const talk=campaign.nodes[entry.gateId].choices.find(choice=>choice.id===`negotiate-${entry.id}`),grades=new Set();
    for(let die=1;die<=20;die++){
      const result=ok(act(initial,campaign,{choiceId:talk.id},die)).game,grade=result.lastResult.grade;if(grades.has(grade))continue;grades.add(grade);
      const authored=talk.outcomes[grade].encounterResolution;
      if(authored){assert.equal(result.combat,null);assert.equal(result.encounterResolutions[entry.id].method,authored.method);assert.equal(result.completedCombats.length,0);}
      else{assert.equal(result.combat.id,entry.id);assert.equal(result.encounterResolutions[entry.id],undefined);}
      assert.deepEqual(validateSave(result,CAMPAIGNS).game.encounterResolutions,result.encounterResolutions);
    }
    assert.equal(grades.size,4);
    const tool=campaign.nodes[entry.gateId].choices.find(choice=>choice.id===`tool-${entry.id}`);
    if(tool){
      assert.ok(!availableChoices(initial,campaign).some(choice=>choice.id===tool.id));
      const equipped=structuredClone(initial);equipped.inventory=[...new Set([...(tool.useItems||[]),...(tool.consumeItems||[])])];
      if(tool.requires?.item)equipped.inventory.push(tool.requires.item);
      assert.ok(availableChoices(equipped,campaign).some(choice=>choice.id===tool.id));
      const used=ok(act(equipped,campaign,{choiceId:tool.id})).game;
      assert.equal(used.combat,null);assert.equal(used.encounterResolutions[entry.id].method,'tool');
      for(const id of tool.consumeItems||[])assert.ok(!used.inventory.includes(id));
    }
    for(const count of [1,2,3,4]){
      const gate=atGate(campaign,entry,count),fighting=ok(act(gate,campaign,{choiceId:`fight-${entry.id}`,encounterResolution:{id:entry.id,method:'bypassed'}})).game;
      assert.equal(fighting.combat.id,entry.id);assert.equal(fighting.combat.enemyMaxHealth,2+count*(encounter.hpPerPlayer===2?2:4));assert.equal(fighting.encounterResolutions[entry.id],undefined);
      assert.deepEqual(viewGame(validateSave(fighting,CAMPAIGNS).game,campaign,'p0').combat,viewGame(fighting,campaign,'p0').combat);
      const actor=fighting.players[fighting.activeIndex],jobIndex=campaign.classes.findIndex(job=>job.id===actor.classId);
      assert.ok(viewGame(fighting,campaign,actor.id).combat.actions.basic.description.includes(encounter.actions.basic[jobIndex]));
      for(const person of fighting.players){
        const slot=campaign.classes.findIndex(job=>job.id===person.classId),actions=viewGame(fighting,campaign,person.id).combat.actions;
        assert.ok(actions.basic.description.includes(encounter.actions.basic[slot]));assert.ok(actions.ability.description.includes(encounter.actions.ability[slot]));
      }
      const ability=ok(act(fighting,campaign,{combatAction:'ability',...(['ally','self'].includes(campaign.classes[jobIndex].ability.target)?{targetId:actor.id}:{})},[20,1,1,1,1])).game;
      assert.ok(ability.lastResult.text.includes(encounter.actions.ability[jobIndex]));
      const won=winCombat(fighting,campaign);assert.equal(won.phase,'playing');assert.equal(won.combat,null);assert.deepEqual(won.completedCombats,[entry.id]);assert.equal(won.encounterResolutions[entry.id].method,'victory');assert.equal(won.flags[encounter.victoryFlag],true);
      const saved=validateSave(won,CAMPAIGNS).game;assert.equal(saved.combat,null);assert.equal(saved.combatRecords[entry.id].result,'victory');assert.deepEqual(saved.encounterResolutions,won.encounterResolutions);
      startCombat(saved,campaign);assert.equal(saved.combat,null,'An actual victory cannot replay either.');
    }
  });
}

test('old nine active/victorious fights import at the exact same scene without inserting earlier new encounters',()=>{
  for(const original of ORIGINAL_CAMPAIGNS)for(const length of ['basic','epic']){
    const old=campaignForLength(original,length),arena=Object.values(old.nodes).find(node=>node.encounter);
    let game=createStoryState(old,roster(old,2),{storyLength:length});game.nodeId=arena.id;game.visited=[old.start,arena.id];startCombat(game,old);
    const ongoing=validateSave(game,CAMPAIGNS).game;assert.equal(ongoing.nodeId,arena.id);assert.equal(ongoing.combat.id,arena.encounter.id);assert.equal(ongoing.combat.enemyHealth,game.combat.enemyHealth);assert.deepEqual(ongoing.encounterResolutions,{});
    const continued=winCombat(ongoing,getCampaign(original.id,length));assert.equal(continued.nodeId,arena.id);assert.deepEqual(continued.completedCombats,[arena.encounter.id]);assert.equal(continued.encounterResolutions[arena.encounter.id].method,'victory');
    game=winCombat(game,old);const imported=validateSave(game,CAMPAIGNS).game;assert.equal(imported.nodeId,arena.id);assert.equal(imported.combat,null);assert.deepEqual(imported.completedCombats,[arena.encounter.id]);assert.deepEqual(imported.encounterResolutions,{});
  }
});

test('resolution maps are bounded to story IDs, cannot override active fights, and remap attribution into a new lobby',()=>{
  const campaign=getCampaign('last-train','epic'),entry=campaign.encounterCatalog[0];
  const bypassed=ok(act(atGate(campaign,entry,4),campaign,{choiceId:`avoid-${entry.id}`})).game;
  const dirty=structuredClone(bypassed);dirty.encounterResolutions.fake={method:'victory',sceneId:entry.arenaId,actorId:'fake'};dirty.encounterResolutions[entry.id].actorId='fake';
  const clean=validateSave(dirty,CAMPAIGNS).game;assert.equal(Object.keys(clean.encounterResolutions).length,1);assert.equal(clean.encounterResolutions[entry.id].actorId,null);
  const mixed=structuredClone(bypassed);mixed.completedCombats=[entry.id];assert.throws(()=>validateSave(mixed,CAMPAIGNS),/함께 기록/);
  const fighting=ok(act(atGate(campaign,entry),campaign,{choiceId:`fight-${entry.id}`})).game;
  const conflicted={...bypassed,combat:fighting.combat};assert.throws(()=>validateSave(conflicted,CAMPAIGNS),/전투 위치/);
  remapCombatPlayers(bypassed,{p0:'new0',p1:'new1',p2:'new2',p3:'new3'});assert.equal(bypassed.encounterResolutions[entry.id].actorId,'new0');assert.equal(bypassed.lastResult.actorId,'new0');assert.equal(bypassed.journal.at(-1).actorId,'new0');
  const badLength=structuredClone(clean);badLength.storyLength='basic';badLength.nodeId=campaign.encounterCatalog.find(row=>row.epicOnly).gateId;assert.throws(()=>validateSave(badLength,CAMPAIGNS));
});

test('an optional encounter still permits actual death, all-party defeat, survivor victory and later resurrection',()=>{
  const campaign=getCampaign('last-train','epic'),entry=campaign.encounterCatalog.find(row=>row.epicOnly);
  let solo=ok(act(atGate(campaign,entry),campaign,{choiceId:`fight-${entry.id}`})).game;solo.players[0].health=1;
  solo=ok(act(solo,campaign,{combatAction:'basic'},1)).game;assert.equal(solo.nodeId,'__all_dead__');assert.equal(solo.combatRecords[entry.id].result,'defeat');assert.equal(solo.completedCombats.length,0);assert.equal(solo.encounterResolutions[entry.id],undefined);
  let party=ok(act(atGate(campaign,entry,2),campaign,{choiceId:`fight-${entry.id}`})).game;const casualty=party.players[party.activeIndex];casualty.health=1;
  party=ok(act(party,campaign,{combatAction:'basic'},[1,1,1])).game;assert.equal(party.players.find(p=>p.id===casualty.id).life,'dead');
  party=winCombat(party,campaign);assert.equal(party.phase,'playing');assert.equal(party.players.find(p=>p.id===casualty.id).life,'dead','Victory cannot resurrect a casualty for free.');
  const returnPoint=Object.values(campaign.nodes).find(node=>node.resurrection&&!node.resurrection.requires&&!node.encounter);
  assert.ok(returnPoint);party.nodeId=returnPoint.id;party.visited.push(returnPoint.id);party.sparks=4;
  const preview=previewAction(party,campaign,party.players[party.activeIndex].id,{reviveId:casualty.id});assert.equal(preview.ok,true,preview.error);
  party=ok(act(party,campaign,{reviveId:casualty.id},20)).game;
  assert.equal(party.players.find(p=>p.id===casualty.id).life,'alive');assert.equal(party.players.find(p=>p.id===casualty.id).revivals,1);
});
