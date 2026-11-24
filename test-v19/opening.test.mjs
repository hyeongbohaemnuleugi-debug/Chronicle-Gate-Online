import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createGame, viewGame, previewAction, applyAction, validateSave, assist, revealSecret, passTurn, deferOpening } from '../public/game/engine.js';
import { OPENINGS, actionRevision, remapOpeningPlayers } from '../public/game/opening.js';
import { chronicleText } from '../public/game/narrative.js';
import { startCombat } from '../public/game/combat.js';

const clone = value => structuredClone(value);
const people = (campaign, indexes) => indexes.map((slot, i) => ({id:`p${i}`,name:`참가자${i+1}`,classId:campaign.classes[slot].id}));
const start = (campaign, indexes=[0,1,2,3]) => createGame(campaign,people(campaign,indexes),{openingMode:'separate'});
const act = (game,campaign,id,choiceId='safe',roll=10) => {
  const preview=previewAction(game,campaign,id,{choiceId});assert.equal(preview.ok,true,preview.error);
  const result=applyAction(game,campaign,id,{choiceId,revision:preview.plan.revision},{roll});assert.equal(result.ok,true,result.error);return result.game;
};
const combinations=(list,n)=>n===0?[[]]:list.flatMap((value,index)=>combinations(list.slice(index+1),n-1).map(tail=>[value,...tail]));

test('all 28 professions have two grounded stages, safe choices and four distinct dice results',()=>{
  let stages=0,outcomes=0;
  for(const campaign of CAMPAIGNS){
    const authored=OPENINGS[campaign.id];assert.ok(authored);
    assert.deepEqual(Object.keys(authored.professions).sort(),campaign.classes.map(job=>job.id).sort());
    for(const mode of ['solo','group'])assert.equal(authored.meeting.startText[mode].length,2);
    for(const job of campaign.classes){
      const origin=authored.professions[job.id];assert.equal(origin.stages.length,2);
      for(const key of ['title','secret','goal','reveal','deadEpilogue'])assert.ok(origin.role[key]?.trim(),`${job.id}/${key}`);
      assert.ok(origin.deferred?.trim());
      origin.stages.forEach((stage,index)=>{
        stages++;assert.ok(stage.location&&stage.objective&&stage.title);assert.equal(stage.text.length,2);
        assert.equal(stage.choices.length,2);assert.equal(new Set(stage.choices.map(choice=>choice.id)).size,2);
        assert.deepEqual(stage.choices.map(choice=>choice.id).sort(),['risk','safe']);
        const risky=stage.choices.find(choice=>!choice.automatic),safe=stage.choices.find(choice=>choice.automatic);
        assert.equal(job.stats[risky.stat],3);assert.ok(risky.dc>=10&&risky.dc<=13);
        assert.deepEqual(Object.keys(risky.outcomes).sort(),['critical','failure','fumble','success']);
        assert.equal(new Set(Object.values(risky.outcomes).map(result=>result.text)).size,4);
        assert.equal(risky.outcomes.critical.bonus,2);assert.equal(risky.outcomes.success.bonus,1);
        for(const choice of [risky,safe])for(const [grade,outcome] of Object.entries(choice.outcomes)){
          outcomes++;assert.ok(outcome.text.length>25);assert.ok(outcome.report.length>5&&outcome.report.length<=100,`${job.id}/${index}/${grade}: long report`);
          assert.ok(!/[<>]|\*\*/.test(outcome.text));
          assert.ok(!['gainItems','clues','set','next'].some(key=>key in outcome),'Opening cannot acquire main-story evidence or jump its graph');
          if(outcome.harm){assert.equal(index,1);assert.equal(grade,'fumble');assert.equal(outcome.harm,1);}
          assert.ok(!outcome.text.includes(origin.role.secret));assert.ok(!outcome.report.includes(origin.role.secret));
        }
        assert.deepEqual(Object.keys(safe.outcomes),['success']);assert.equal(safe.outcomes.success.bonus||0,0);assert.equal(safe.outcomes.success.harm||0,0);
      });
    }
  }
  assert.equal(stages,56);assert.equal(outcomes,280);
});

test('every 1/2/3/4-person profession combination reaches an explicit meeting with no absent role',()=>{
  let parties=0;
  for(const campaign of CAMPAIGNS)for(const n of [1,2,3,4])for(const slots of combinations([0,1,2,3],n)){
    parties++;let game=start(campaign,slots);
    assert.equal(game.phase,'opening');assert.equal(game.schema,19);
    for(const player of game.players){
      const view=viewGame(game,campaign,player.id);assert.equal(view.canAct,true);
      assert.deepEqual(view.secret,OPENINGS[campaign.id].professions[player.classId].role);
      assert.equal(view.opening.total,n);assert.equal(view.opening.participants.length,n);
    }
    for(let stage=0;stage<2;stage++)for(const player of [...game.players].reverse())game=act(game,campaign,player.id);
    assert.equal(game.phase,'playing');assert.equal(game.opening.joined,true);assert.equal(game.nodeId,campaign.start);
    assert.equal(game.turn,0);assert.equal(game.clues.length,0);assert.equal(game.inventory.length,0);assert.deepEqual(game.flags,{});
    assert.equal(game.journal.length,n+1);assert.equal(game.chronicle.length,n+1);
    const view=viewGame(game,campaign,game.players[0].id);
    assert.equal(view.opening.active,false);assert.equal(view.opening.meeting.text.length,n+1);
    assert.deepEqual(view.scene.reading.paragraphs,OPENINGS[campaign.id].meeting.startText[n===1?'solo':'group']);
    assert.deepEqual(view.opening.meeting.startScene,{id:campaign.start,title:campaign.nodes[campaign.start].title,location:campaign.nodes[campaign.start].location,text:view.scene.reading.paragraphs});
    assert.deepEqual(view.opening.meeting.participants.map(p=>p.className),slots.map(slot=>campaign.classes[slot].name));
    assert.equal(view.canAct,true);assert.equal(view.scene.id,campaign.start);
    const copyText=chronicleText(view);
    for(const player of game.players)assert.ok(!copyText.includes(OPENINGS[campaign.id].professions[player.classId].role.secret));
    const restored=validateSave({game},CAMPAIGNS).game;
    assert.deepEqual(viewGame(restored,campaign,game.players[0].id).opening,view.opening);
    assert.equal(chronicleText(viewGame(restored,campaign,game.players[0].id)),copyText);
  }
  assert.equal(parties,105);
});

test('slower readers retain the first shared scene after a teammate advances and after save restore',()=>{
  const campaign=CAMPAIGNS.find(item=>item.id==='clock-city');let game=start(campaign,[0,1]);
  for(const id of ['p0','p1']){game=act(game,campaign,id);game=act(game,campaign,id);}
  const firstMeeting=clone(viewGame(game,campaign,'p1').opening.meeting);
  game=act(game,campaign,'p0','tram-first',20);
  const advanced=viewGame(game,campaign,'p1');assert.equal(advanced.scene.id,'tram');
  assert.deepEqual(advanced.opening.meeting.startScene,firstMeeting.startScene);
  assert.deepEqual(advanced.opening.meeting.text,firstMeeting.text);
  const readingCopy=chronicleText(advanced);
  for(const paragraph of firstMeeting.startScene.text)assert.ok(readingCopy.includes(paragraph));
  assert.ok(readingCopy.indexOf(firstMeeting.text[0])<readingCopy.indexOf(firstMeeting.startScene.text[0]));
  assert.ok(readingCopy.indexOf(firstMeeting.startScene.text[0])<readingCopy.indexOf(game.lastResult.text));
  const restored=viewGame(validateSave(game,CAMPAIGNS).game,campaign,'p1');
  assert.deepEqual(restored.opening.meeting.startScene,firstMeeting.startScene);
  // A caller cannot alter the authored introduction through a prior view.
  advanced.opening.meeting.startScene.text[0]='변조한 본문';
  assert.deepEqual(viewGame(game,campaign,'p1').opening.meeting.startScene,firstMeeting.startScene);
});

test('each grade and safe result uses its authored outcome, preview odds and real die without mutating its input',()=>{
  for(const campaign of CAMPAIGNS)for(let slot=0;slot<4;slot++)for(let stage=0;stage<2;stage++)for(const [choiceId,roll,grade] of [['risk',20,'critical'],['risk',10,'success'],['risk',2,'failure'],['risk',1,'fumble'],['safe',null,'automatic']]){
    let game=start(campaign,[slot]);if(stage)game=act(game,campaign,'p0');
    const before=JSON.stringify(game),payload={choiceId};
    const preview=previewAction(game,campaign,'p0',payload);assert.equal(preview.ok,true);assert.equal(JSON.stringify(game),before);
    assert.equal(preview.plan.outcomes.reduce((n,outcome)=>n+outcome.chance,0),100);
    let calls=0;const result=applyAction(game,campaign,'p0',{...payload,revision:preview.plan.revision},{roll:()=>{calls++;return roll;}});
    assert.equal(result.ok,true,result.error);assert.equal(JSON.stringify(game),before);assert.equal(calls,choiceId==='safe'?0:1);
    const view=viewGame(result.game,campaign,'p0'),actual=view.opening.mine.history.at(-1);
    const expected=OPENINGS[campaign.id].professions[game.players[0].classId].stages[stage].choices.find(choice=>choice.id===choiceId).outcomes[grade==='automatic'?'success':grade];
    assert.equal(actual.grade,grade);assert.equal(actual.text,expected.text);assert.equal(actual.report,expected.report);
    assert.equal(result.game.players[0].health,3-(expected.harm||0));assert.ok(result.game.players[0].health>=2);
    assert.equal(view.opening.mine.preparation,expected.bonus||0);
  }
});

test('teammates can preview and act concurrently, but own stale/repeated/foreign actions fail',()=>{
  const campaign=CAMPAIGNS[0];let game=start(campaign);
  const plans=game.players.map(player=>previewAction(game,campaign,player.id,{choiceId:'risk'}).plan);
  const playerViews=game.players.map(player=>viewGame(game,campaign,player.id));
  for(let i=0;i<4;i++){
    const before=game;const result=applyAction(game,campaign,`p${i}`,{choiceId:'risk',revision:plans[i].revision},{roll:20});
    assert.equal(result.ok,true,result.error);game=result.game;
    assert.equal(actionRevision(game,`p${i}`),'opening:2');
    assert.equal(applyAction(game,campaign,`p${i}`,{choiceId:'risk',revision:plans[i].revision},{roll:20}).ok,false);
    for(let j=i+1;j<4;j++)assert.equal(viewGame(game,campaign,`p${j}`).actionRevision,playerViews[j].actionRevision);
    assert.notEqual(game,before);
  }
  const original=JSON.stringify(game);let rolls=0;
  for(const payload of [{choiceId:'no-choice'},{choiceId:'risk',text:'자유행동'},{choiceId:'risk',spendSpark:true},{choiceId:'risk',usePreparation:true},{combatAction:'attack'},{detailId:'poster'},null,[]]){
    const result=applyAction(game,campaign,'p0',payload&&{...payload,revision:'opening:2'},{roll:()=>{rolls++;return 20;}});assert.equal(result.ok,false);
  }
  assert.equal(previewAction(game,campaign,'unknown',{choiceId:'risk'}).ok,false);
  for(const invalid of [0,21,NaN,3.5,'20',()=>{throw new Error('bad RNG');}])assert.equal(applyAction(game,campaign,'p0',{choiceId:'risk',revision:'opening:2'},{roll:invalid}).ok,false);
  assert.equal(rolls,0);assert.equal(JSON.stringify(game),original);
  assert.equal(assist(game,'p1').ok,false);assert.equal(revealSecret(game,campaign,'p1').ok,false);assert.equal(passTurn(game,'p1').ok,false);
});

test('before meeting the view and reading copy include only the viewer’s actual scenes and choices',()=>{
  const campaign=CAMPAIGNS[1];let game=start(campaign);
  game=act(game,campaign,'p1','risk',1);game=act(game,campaign,'p1','risk',20);
  const own=viewGame(game,campaign,'p1'),other=viewGame(game,campaign,'p0');
  assert.equal(own.canAct,false);assert.equal(own.opening.mine.history.length,2);assert.equal(own.scene.id,'opening:waiting');
  assert.equal(other.canAct,true);assert.equal(other.opening.mine.history.length,0);assert.equal(other.players[1].health,null);assert.equal(other.players[1].openingBonus,null);assert.equal(other.journal.length,0);assert.equal(other.chronicle.length,0);
  assert.equal(other.opening.participants.find(p=>p.id==='p1').completed,2);
  for(const entry of own.opening.mine.history){assert.ok(!JSON.stringify(other).includes(entry.text));assert.ok(!chronicleText(other).includes(entry.report));}
  assert.ok(!JSON.stringify(other).includes(own.secret.secret));assert.equal(other.opening.meeting,undefined);
});

test('partial saves reconstruct only authorized data and keep private history after player ID remapping',()=>{
  const campaign=CAMPAIGNS[3];let game=start(campaign,[3,0,2]);
  game=act(game,campaign,'p2','risk',20);game=act(game,campaign,'p0','safe');
  const saved=clone(game);saved.opening.states[0].fakeText='injected prose';saved.opening.states[0].records[0].text='injected prose';saved.players[0].openingBonus=999;
  const restored=validateSave(saved,CAMPAIGNS).game;
  assert.equal(restored.phase,'opening');assert.equal(restored.players[0].openingBonus,0);assert.equal(restored.players[2].openingBonus,2);
  assert.ok(!JSON.stringify(restored).includes('injected prose'));
  assert.deepEqual(viewGame(restored,campaign,'p2').opening.mine,viewGame(game,campaign,'p2').opening.mine);
  const ids={p0:'new0',p1:'new1',p2:'new2'};remapOpeningPlayers(restored,ids);restored.players.forEach(player=>{player.id=ids[player.id];});
  assert.equal(viewGame(restored,campaign,'new2').opening.mine.stage,1);
  assert.equal(viewGame(restored,campaign,'new1').opening.mine.stage,0);
  for(const mutate of [
    save=>delete save.opening,save=>save.opening.states.pop(),save=>save.opening.states[1].playerId='p0',
    save=>save.opening.states[0].records[0].choiceId='unknown',save=>save.opening.states[0].records[0].roll=20,
    save=>save.opening.states[2].records[0].roll=0,save=>save.opening.states[2].records[0].stage=1,
    save=>save.opening.joined=true,save=>save.opening.states[0].bonusSpent=true,save=>save.nodeId='__proto__',
    save=>save.schema=17,save=>save.players[1].classId=save.players[0].classId,
  ]){const invalid=clone(game);mutate(invalid);assert.throws(()=>validateSave(invalid,CAMPAIGNS));}
});

test('only a disconnected unfinished character can be deferred, without fabricated choices or rewards',()=>{
  const campaign=CAMPAIGNS[4];let game=start(campaign,[0,2]);game=act(game,campaign,'p0');game=act(game,campaign,'p0');
  assert.equal(deferOpening(game,campaign,'p1').ok,false);
  assert.equal(deferOpening(game,campaign,'missing').ok,false);
  game.players[0].connected=false;assert.equal(deferOpening(game,campaign,'p0').ok,false);game.players[0].connected=true;
  game.players[1].connected=false;
  const result=deferOpening(game,campaign,'p1');assert.equal(result.ok,true);game=result.game;
  assert.equal(game.phase,'playing');assert.equal(game.players[1].openingBonus,0);assert.equal(game.players[1].health,3);
  assert.deepEqual(game.opening.states[1].records,[]);assert.equal(game.activeIndex,0);
  const view=viewGame(game,campaign,'p1');assert.equal(view.opening.mine.deferred,true);assert.equal(view.opening.mine.history.length,0);
  assert.ok(view.opening.meeting.text[2].includes(OPENINGS[campaign.id].professions[game.players[1].classId].deferred));
  assert.deepEqual(validateSave(game,CAMPAIGNS).game.opening,game.opening);
  game.players[1].connected=true;assert.deepEqual(viewGame(game,campaign,'p1').secret,OPENINGS[campaign.id].professions[game.players[1].classId].role);
  assert.equal(deferOpening(game,campaign,'p1').ok,false);
});

test('earned preparation applies exactly once to the first risky main-story action, never to observation or safe travel',()=>{
  const campaign=CAMPAIGNS[0];let game=start(campaign,[2]);game=act(game,campaign,'p0','risk',20);game=act(game,campaign,'p0','risk',10);
  assert.equal(game.players[0].openingBonus,2);
  const detail=campaign.nodes[campaign.start].details[0];
  game=applyAction(game,campaign,'p0',{detailId:detail.id,revision:game.revision}).game;assert.equal(game.players[0].openingBonus,2);
  const view=viewGame(game,campaign,'p0'),risky=view.scene.choices.find(choice=>!choice.automatic);
  const preview=previewAction(game,campaign,'p0',{choiceId:risky.id});assert.equal(preview.ok,true);
  assert.equal(preview.plan.openingPreparation,2);assert.equal(preview.plan.bonus,preview.plan.classBonus+2);
  const baseline=clone(game);baseline.players[0].openingBonus=0;
  assert.equal(preview.plan.bonus-previewAction(baseline,campaign,'p0',{choiceId:risky.id}).plan.bonus,2);
  const result=applyAction(game,campaign,'p0',{choiceId:risky.id,revision:game.revision},{roll:10});assert.equal(result.ok,true);game=result.game;
  assert.equal(game.players[0].openingBonus,0);assert.equal(game.opening.states[0].bonusSpent,true);
  assert.ok(game.lastResult.changes.some(line=>line.includes('첫 장에서 얻은 준비 +2')));
  const restored=validateSave(game,CAMPAIGNS).game;assert.equal(restored.players[0].openingBonus,0);assert.equal(restored.opening.states[0].bonusSpent,true);
});

test('legacy saves and explicit together mode retain their previous story and seat roles',()=>{
  const campaign=CAMPAIGNS[0],players=people(campaign,[3,1]);
  const legacy=createGame(campaign,players);assert.equal(legacy.schema,17);assert.equal(legacy.phase,'playing');assert.equal(legacy.opening,undefined);
  assert.deepEqual(viewGame(legacy,campaign,'p0').secret,campaign.roles[0]);
  assert.deepEqual(validateSave(legacy,CAMPAIGNS).game.players,legacy.players);
  assert.throws(()=>createGame(campaign,people(campaign,[0,0]),{openingMode:'separate'}),/서로 다른 직업/);
  assert.doesNotThrow(()=>createGame(campaign,people(campaign,[0,0]),{openingMode:'together'}));
});

test('the new background remains consistent in combat and the party-death ending without spending story preparation',()=>{
  for(const campaign of CAMPAIGNS){
    let game=start(campaign,[1,3]);
    for(const id of ['p0','p1']){game=act(game,campaign,id,'risk',20);game=act(game,campaign,id,'safe');}
    const encounter=Object.values(campaign.nodes).find(node=>node.encounter);
    game.nodeId=encounter.id;game.visited.push(encounter.id);startCombat(game,campaign);
    const actor=game.players[game.activeIndex],payload={combatAction:'basic'};
    const preview=previewAction(game,campaign,actor.id,payload);assert.equal(preview.ok,true,preview.error);
    assert.equal(preview.plan.bonus,campaign.classes.find(job=>job.id===actor.classId).stats[preview.plan.stat]);
    const result=applyAction(game,campaign,actor.id,{...payload,revision:game.revision},{roll:20});assert.equal(result.ok,true,result.error);
    assert.equal(result.game.players.find(p=>p.id===actor.id).openingBonus,2);
    game=result.game;game.combat=null;game.nodeId='__all_dead__';game.phase='ended';game.deathSceneTitle=encounter.title;
    game.players.forEach(player=>{player.health=0;player.life='dead';});
    const view=viewGame(game,campaign,'p0');assert.equal(view.ending,true);
    for(const player of game.players){
      const role=OPENINGS[campaign.id].professions[player.classId].role;
      assert.ok(view.scene.reading.personal.some(paragraph=>paragraph.includes(role.deadEpilogue)));
    }
    const restored=validateSave(game,CAMPAIGNS).game;assert.equal(restored.phase,'ended');assert.equal(restored.opening.joined,true);
    assert.equal(restored.players.every(player=>player.life==='dead'),true);
  }
});
