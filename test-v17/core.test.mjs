import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSES, createGame, viewGame, availableChoices, previewAction, applyAction,
  gradeRoll, assist, revealSecret, passTurn, validateSave,
} from '../public/game/engine.js';

// Explicit small adventure: behavioral tests never assert implementation source strings.
const outcome = (text, next, extra = {}) => ({ text, next, ...extra });
const terminal = (id, title) => ({ id, title, ending:true, text:[title], choices:[], art:3 });
const automatic = (id, next, extra={}) => ({ id,label:id,intent:'choose',automatic:true,outcomes:{success:outcome(id,next)},...extra });
const fixture = {
  id:'test-chamber',title:'검증용 연구실',start:'entry',objective:'일행이 증거를 가지고 나온다.',pressureMax:8,
  roles:Array.from({length:4},(_,i)=>({title:`역할 ${i}`,secret:`비공개 ${i}`,goal:`목표 ${i}`,reveal:`공개해도 되는 사실 ${i}`})),
  clues:{key:{title:'안전 표식',text:'수동 차단 장치가 남아 있다.'}},
  flags:{ally:'관리인이 일행을 믿는다',clearance:'보관 기록 열람권을 얻었다'},
  deathEnding:{title:'연구실에서 끊긴 목소리',text:['남은 구조 요청이 없다.'],art:2,mood:'danger'},
  nodes:{
    entry:{id:'entry',title:'흔들리는 연구실',text:['천장 아래에는 관리인 서하와 제어 장치가 있다.'],art:0,
      entities:[{id:'keeper',label:'관리인 서하',kind:'person',aliases:['관리인','서하']},{id:'pillar',label:'천장 기둥',kind:'object',aliases:['기둥']},{id:'panel',label:'제어 장치',kind:'object',aliases:['제어판']}],
      details:[{id:'notice',label:'안전 표식 읽기',text:'차단 장치를 찾는 표식이다.',clue:'key'}],
      choices:[
        {id:'talk',label:'관리인에게 기록을 묻는다',intent:'talk',target:'keeper',keywords:['관리인','서하','기록','질문'],stat:'heart',dc:12,risk:'교섭이 틀어지면 우회로로 밀려난다.',outcomes:{critical:outcome('관리인이 원본 기록과 열람권을 내준다. 함께 기록실로 간다.','lab',{set:['ally','clearance'],clues:['key']}),success:outcome('관리인이 기록을 내준다. 내용을 확인하려 기록실로 간다.','lab',{set:['ally'],clues:['key']}),failure:outcome('관리인이 기록 제공을 거절한다. 다른 출구를 찾아 우회 통로로 간다.','ward',{pressure:1}),fumble:outcome('관리인이 경보를 켜고 문을 닫는다. 일행은 별실로 피한다.','chapel',{pressure:2,harm:1})}},
        {id:'force',label:'천장 기둥을 힘으로 밀어 문을 연다',intent:'force',target:'pillar',keywords:['기둥','천장','밀어'],stat:'might',dc:12,risk:'기둥이 무너지면 행동한 인물이 사망할 수 있다.',outcomes:{critical:outcome('기둥을 안전하게 고정하자 관리인이 구조에 동참한다. 함께 기록실로 간다.','lab',{set:['ally']}),success:outcome('기둥을 받쳐 길을 열고 기록실로 간다.','lab'),failure:outcome('문은 열리지 않는다. 팔을 다친 채 작은 우회 통로를 찾는다.','ward',{harm:1,pressure:1}),fumble:outcome('기둥에 깔려 사망하고 동료들이 시신을 별실로 옮긴다.','chapel',{harm:3,pressure:1})}},
        {id:'overload',label:'제어 장치에 과부하를 걸어 버틴다',intent:'use',target:'panel',keywords:['제어','과부하'],stat:'wit',dc:18,risk:'실패하면 일행 전체에 치명적인 감전 피해가 온다.',outcomes:{critical:outcome('비상 전원과 안전 표식이 살아나 기록실 문이 열린다.','lab',{clues:['key']}),success:outcome('비상 전원이 열렸다.','lab'),failure:outcome('일행이 전기 충격을 받고 우회 통로로 물러난다.','ward',{harmAll:1}),fumble:outcome('방 전체에 고전압이 흘렀다.','chapel',{harmAll:3})}},
      ]},
    lab:{id:'lab',title:'기록실',text:['기록이 남아 있다.'],choices:[automatic('good-end','good',{requires:{flag:'ally',clue:'key'}}),automatic('continue','other-chapel')]},
    ward:{id:'ward',title:'우회 통로',text:['상처를 안고 이동한다.'],choices:[automatic('continue','other-chapel')]},
    chapel:{id:'chapel',title:'기억 회복실',text:['동료의 기억으로 귀환을 시도할 수 있다.'],resurrection:{label:'기억 회복 장치',text:'익숙한 목소리가 돌아온다.',dc:12,sparkCost:1,pressureCost:2},choices:[automatic('continue','other-chapel'),{id:'repair',label:'회복 장치의 배선을 고친다',target:'device',intent:'use',keywords:['배선','장치'],stat:'wit',dc:10,outcomes:{critical:outcome('배선이 안정되고 경보까지 꺼져 예비 회복실로 간다.','other-chapel',{pressure:-1}),success:outcome('길이 열려 예비 회복실로 간다.','other-chapel'),failure:outcome('경보가 울려 예비 회복실로 피한다.','other-chapel',{pressure:1}),fumble:outcome('배선에 불꽃이 튄다. 급히 예비 회복실로 피한다.','other-chapel',{pressure:2,harm:1})}}]},
    'other-chapel':{id:'other-chapel',title:'남은 기억 보관실',text:['두 번째 장치가 있다.'],resurrection:{label:'예비 회복 장치',text:'기억에 응답한다.',dc:12,sparkCost:1,pressureCost:2},choices:[automatic('finish','ordinary')]},
    good:terminal('good','증거와 함께 귀환'),ordinary:terminal('ordinary','남은 사람들의 귀환'),
  },
};
const people = [
  {id:'p0',name:'아린',classId:'guardian',connected:true},
  {id:'p1',name:'도윤',classId:'scout',connected:true},
  {id:'p2',name:'서린',classId:'scholar',connected:true},
  {id:'p3',name:'유진',classId:'envoy',connected:true},
];
const fresh = (count=4) => createGame(fixture,people.slice(0,count));
function act(game,id,payload,die=12,campaign=fixture){
  const result=applyAction(game,campaign,id,{revision:game.revision,...payload},{roll:()=>die});
  assert.equal(result.ok,true,result.error);
  return result.game;
}
function deadCompanion(){return act(fresh(),'p0',{choiceId:'force'},1);}


test('four classes have fixed distinct specialties and imported stats cannot replace them',()=>{
  const game=fresh();const view=viewGame(game,fixture,'p0');
  assert.equal(CLASSES.length,4);
  for(const [i,stat] of ['might','agility','wit','heart'].entries()){
    assert.equal(view.players[i].stats[stat],3);
    assert.equal(Object.values(view.players[i].stats).reduce((a,b)=>a+b,0),5);
    assert.equal(view.players[i].health,3);
  }
  const forged=structuredClone(game);forged.players[0].stats={might:999};forged.players[0].token='secret';
  const restored=validateSave(forged,[fixture]).game;
  assert.equal(viewGame(restored,fixture,'p0').players[0].stats.might,3);
  assert.equal(restored.players[0].token,undefined);
  assert.deepEqual(createGame(fixture,people).players.map(p=>p.classId),game.players.map(p=>p.classId));
});

test('D20 boundaries: natural one fumbles, natural twenty is critical, all other totals have one threshold',()=>{
  assert.equal(gradeRoll(1,99,5),'fumble');
  assert.equal(gradeRoll(20,-10,90),'critical');
  assert.equal(gradeRoll(12,12,12),'success');
  assert.equal(gradeRoll(11,11,12),'failure');
  assert.equal(gradeRoll(10,10,12),'failure');
  assert.equal(gradeRoll(9,9,12),'failure');
  for(const die of [0,21,1.2,NaN,undefined]){
    const game=fresh(),before=JSON.stringify(game);
    const result=applyAction(game,fixture,'p0',{choiceId:'force'},{roll:die});
    assert.equal(result.ok,false);assert.equal(JSON.stringify(game),before);
  }
});

test('safe observation is available off-turn without RNG, pressure or turn consumption',()=>{
  const original=fresh();let rolls=0;
  const result=applyAction(original,fixture,'p2',{detailId:'notice',revision:1},{roll:()=>{rolls++;return 1;}});
  assert.equal(result.ok,true,result.error);
  assert.equal(rolls,0);assert.equal(result.game.turn,0);assert.equal(result.game.activeIndex,0);
  assert.equal(result.game.pressure,0);assert.equal(result.game.nodeId,'entry');
  assert.deepEqual(result.game.clues,['key']);assert.equal(original.clues.length,0);
  assert.equal(viewGame(result.game,fixture,'p0').scene.details[0].read,true);
  assert.equal(previewAction(result.game,fixture,'p1',{detailId:'notice'}).ok,false);
  assert.equal(previewAction(original,fixture,'p0',{text:'주변을 둘러본다'}).ok,false);
});

test('free text and typed preparation are rejected even if a valid choice or detail is also forged',()=>{
  const game=fresh(),before=JSON.stringify(game);
  for(const payload of [{text:'관리인 서하에게 기록을 묻는다'},{text:'주변을 둘러본다',detailId:'notice'},{choiceId:'force',text:'override'},{choiceId:'force',flashback:'미리 준비했다'},{}]){
    let rolled=false;const result=applyAction(game,fixture,'p0',payload,{roll:()=>{rolled=true;return 20;}});
    assert.equal(result.ok,false);assert.equal(rolled,false);assert.equal(JSON.stringify(game),before);
  }
  assert.equal(previewAction(game,fixture,'p1',{choiceId:'talk'}).ok,false);
  assert.equal(previewAction(game,fixture,'intruder',{detailId:'notice'}).ok,false);
});

test('all four results apply distinct authored routes or consequences with an honest 100 percent preview',()=>{
  const base=fresh(),plan=previewAction(base,fixture,'p0',{choiceId:'talk'}).plan;
  assert.deepEqual(plan.gradeChances,{critical:5,success:45,failure:45,fumble:5});
  assert.equal(plan.outcomes.reduce((sum,row)=>sum+row.chance,0),100);
  const critical=act(base,'p0',{choiceId:'talk'},20);
  const success=act(base,'p0',{choiceId:'talk'},12);
  const failed=act(base,'p0',{choiceId:'talk'},9);
  const fumbled=act(base,'p0',{choiceId:'talk'},1);
  assert.deepEqual([critical.nodeId,success.nodeId,failed.nodeId,fumbled.nodeId],['lab','lab','ward','chapel']);
  assert.equal(critical.flags.clearance,true);assert.equal(success.flags.clearance,undefined);
  assert.equal(success.flags.ally,true);assert.equal(failed.flags.ally,undefined);
  assert.equal(success.clues[0],'key');assert.equal(failed.clues.length,0);
  assert.deepEqual([critical.lastResult.grade,success.lastResult.grade,failed.lastResult.grade,fumbled.lastResult.grade],['critical','success','failure','fumble']);
  assert.equal(new Set([critical,success,failed,fumbled].map(g=>g.lastResult.text)).size,4);
  assert.equal(fumbled.players[0].health,2);assert.equal(failed.players[0].health,3);
  for(const current of [critical,success,failed,fumbled]){
    assert.equal(current.arrival.toSceneId,current.nodeId);
    assert.equal(viewGame(current,fixture,'p1').scene.arrival.text,current.lastResult.text);
  }
});

test('gated decisions need their actual prerequisites and automatic choices do not call dice',()=>{
  const success=act(fresh(),'p0',{choiceId:'talk'},12);
  assert.ok(availableChoices(success,fixture).some(c=>c.id==='good-end'));
  const lacking=structuredClone(success);lacking.clues=[];
  assert.ok(!availableChoices(lacking,fixture).some(c=>c.id==='good-end'));
  assert.equal(previewAction(lacking,fixture,'p1',{choiceId:'good-end'}).ok,false);
  let rolls=0;const result=applyAction(success,fixture,'p1',{choiceId:'good-end',spendSpark:true,usePreparation:true,revision:success.revision},{roll:()=>{rolls++;return 1;}});
  assert.equal(result.ok,true,result.error);assert.equal(rolls,0);
  assert.equal(result.game.phase,'ended');assert.equal(result.game.sparks,success.sparks);
  assert.equal(result.game.players[1].focus,true);assert.equal(result.game.lastResult.grade,'automatic');
});

test('assistance is limited, distinct, once per action, and changes the preview total',()=>{
  let game=fresh();
  assert.equal(assist(game,'p0').ok,false);
  game=assist(game,'p1').game;
  assert.equal(assist(game,'p1').ok,false);
  game=assist(game,'p2').game;
  assert.equal(assist(game,'p3').ok,false);
  const plan=previewAction(game,fixture,'p0',{choiceId:'force'}).plan;
  assert.equal(plan.assistance,2);assert.equal(plan.bonus,5);
  game=act(game,'p0',{choiceId:'force'},12);
  assert.deepEqual(game.assists,[]);
  assert.equal(game.activeIndex,1);
});

test('spark, one-use preparation and critical rewards are applied once with clear preview costs',()=>{
  let game=fresh();
  const request={choiceId:'force',spendSpark:true,usePreparation:true};
  const preview=previewAction(game,fixture,'p0',request).plan;
  assert.equal(preview.bonus,8);assert.equal(preview.spendSpark,true);
  assert.equal(previewAction(game,fixture,'p0',{choiceId:'force',flashback:'준비'}).ok,false);
  game=act(game,'p0',request,12);
  assert.equal(game.sparks,1);assert.equal(game.players[0].focus,false);
  const critical=act(fresh(),'p0',{choiceId:'force'},20);
  assert.equal(critical.sparks,3);assert.equal(critical.lastResult.grade,'critical');
  const noSparks=fresh();noSparks.sparks=0;
  assert.equal(previewAction(noSparks,fixture,'p0',request).ok,false);
  const usedFlashback=fresh();usedFlashback.players[0].focus=false;
  assert.equal(previewAction(usedFlashback,fixture,'p0',request).ok,false);
});

test('stale revision and illegal graph edges fail without changing state or consuming resources',()=>{
  const game=fresh(),snapshot=JSON.stringify(game);
  const stale=applyAction(game,fixture,'p0',{choiceId:'talk',revision:0,spendSpark:true},{roll:20});
  assert.equal(stale.ok,false);assert.equal(JSON.stringify(game),snapshot);
  const broken=structuredClone(fixture);broken.nodes.entry.choices[0].outcomes.success.next='missing';
  assert.equal(applyAction(game,broken,'p0',{choiceId:'talk',spendSpark:true},{roll:20}).ok,false);
  const loop=structuredClone(fixture);loop.nodes.entry.choices[0].outcomes.critical.next='entry';
  assert.equal(applyAction(game,loop,'p0',{choiceId:'talk',spendSpark:true},{roll:20}).ok,false);
  assert.equal(JSON.stringify(game),snapshot);
});

test('maximum pressure raises subsequent targets but does not erase player choice',()=>{
  const game=fresh();game.pressure=8;
  const preview=previewAction(game,fixture,'p0',{choiceId:'talk'});
  assert.equal(preview.plan.dc,13);assert.equal(preview.plan.pressurePenalty,1);
  assert.equal(availableChoices(game,fixture).length,3);
});

test('lethal harm is telegraphed, kills the acting character, and survivors continue',()=>{
  const game=fresh(),plan=previewAction(game,fixture,'p0',{choiceId:'force'}).plan;
  assert.equal(plan.harmRisk,3);assert.match(plan.risk,/사망/);
  const next=act(game,'p0',{choiceId:'force'},1);
  assert.equal(next.players[0].health,0);assert.equal(next.players[0].life,'dead');
  assert.equal(next.phase,'playing');assert.equal(next.activeIndex,1);
  assert.ok(next.lastResult.deaths.includes('아린'));
  assert.equal(viewGame(next,fixture,'p0').canAct,false);
  assert.equal(previewAction(next,fixture,'p0',{choiceId:'continue'}).ok,false);
});

test('a dead character can reveal a secret and give exactly one ghost assist',()=>{
  let game=deadCompanion();
  assert.equal(viewGame(game,fixture,'p0').canAssist,true);
  game=assist(game,'p0').game;
  assert.equal(game.players[0].echoUsed,true);assert.equal(viewGame(game,fixture,'p0').canAssist,false);
  game=revealSecret(game,fixture,'p0').game;
  assert.equal(game.players[0].revealed,true);assert.equal(game.sparks,3);
  assert.equal(revealSecret(game,fixture,'p0').ok,false);
  game=act(game,'p1',{choiceId:'repair'},12);
  assert.equal(assist(game,'p0').ok,false);
  assert.equal(viewGame(game,fixture,'p1').players[0].revealedText,fixture.roles[0].reveal);
});

test('turn rotation skips dead and disconnected players, with host-controlled disconnected handoff',()=>{
  let game=fresh();game.players[1].life='dead';game.players[1].health=0;game.players[2].connected=false;
  assert.equal(passTurn(game,'p1').ok,false);
  game=passTurn(game,'p0').game;assert.equal(game.activeIndex,3);
  game.players[3].connected=false;
  assert.equal(passTurn(game,'p0').ok,false);
  game=passTurn(game,'p0',{allowDisconnected:true}).game;
  assert.equal(game.activeIndex,0);
});

test('total-party death ends immediately and includes the place and individual fates',()=>{
  const game=act(fresh(),'p0',{choiceId:'overload'},1),view=viewGame(game,fixture,'p0');
  assert.equal(game.nodeId,'__all_dead__');assert.equal(game.phase,'ended');
  assert.ok(game.players.every(p=>p.health===0&&p.life==='dead'));
  assert.equal(view.scene.title,'연구실에서 끊긴 목소리');assert.equal(view.scene.choices.length,0);
  assert.ok(view.scene.text.some(t=>t.includes('흔들리는 연구실')));
  assert.ok(view.scene.text.some(t=>t.includes('살아남은 사람: 없음')));
  assert.equal(passTurn(game,'p0').ok,false);assert.equal(assist(game,'p1').ok,false);
  const restored=validateSave({game},[fixture]).game;
  assert.equal(restored.nodeId,'__all_dead__');assert.equal(restored.phase,'ended');
});

test('successful resurrection spends costs and restores two HP without moving the scene',()=>{
  const game=deadCompanion();const before=structuredClone(game);
  const preview=previewAction(game,fixture,'p1',{reviveId:'p0'});
  assert.equal(preview.ok,true,preview.error);assert.equal(preview.plan.sparkCost,1);assert.equal(preview.plan.pressureCost,2);
  const next=act(game,'p1',{reviveId:'p0'},12);
  assert.equal(next.nodeId,'chapel');assert.equal(next.players[0].life,'alive');assert.equal(next.players[0].health,2);
  assert.equal(next.players[0].revivals,1);assert.equal(next.sparks,before.sparks-1);
  assert.equal(next.pressure,before.pressure+2);assert.equal(next.turn,before.turn+1);
  assert.equal(next.players[0].echoUsed,false);assert.equal(next.reviveAttempts['chapel:p0'],true);
  assert.equal(game.players[0].life,'dead');
});

test('critical resurrection restores full HP; failures and fumbles have distinct costs and cannot repeat',()=>{
  const base=deadCompanion();
  const critical=act(base,'p1',{reviveId:'p0'},20);
  assert.equal(critical.lastResult.grade,'critical');assert.equal(critical.players[0].health,3);
  const ordinaryFailure=act(base,'p1',{reviveId:'p0'},9);assert.equal(ordinaryFailure.lastResult.grade,'failure');assert.equal(ordinaryFailure.pressure,base.pressure+3);
  let failed=act(base,'p1',{reviveId:'p0'},1);
  assert.equal(failed.players[0].life,'dead');assert.equal(failed.players[0].revivals,0);
  assert.equal(failed.sparks,1);assert.equal(failed.pressure,base.pressure+4);
  assert.equal(previewAction(failed,fixture,'p2',{reviveId:'p0'}).ok,false);
  assert.ok(!viewGame(failed,fixture,'p2').scene.resurrection.eligibleIds.includes('p0'));
  failed=act(failed,'p2',{choiceId:'continue'},12);
  assert.equal(failed.nodeId,'other-chapel');
  assert.equal(previewAction(failed,fixture,'p3',{reviveId:'p0'}).ok,true);
});

test('resurrection has no free or infinite retry, and a second lifetime resurrection is forbidden',()=>{
  const noTokens=deadCompanion();noTokens.sparks=0;
  assert.equal(previewAction(noTokens,fixture,'p1',{reviveId:'p0'}).ok,false);
  const outside=deadCompanion();outside.nodeId='ward';
  assert.equal(previewAction(outside,fixture,'p1',{reviveId:'p0'}).ok,false);
  let revived=act(deadCompanion(),'p1',{reviveId:'p0'},12);
  revived=act(revived,'p2',{choiceId:'continue'});
  revived.players[0].life='dead';revived.players[0].health=0;
  assert.equal(previewAction(revived,fixture,'p3',{reviveId:'p0'}).ok,false);
  const afterFailure=act(deadCompanion(),'p1',{reviveId:'p0'},1);
  const restored=validateSave({game:afterFailure},[fixture]).game;
  assert.equal(restored.reviveAttempts['chapel:p0'],true);
  assert.equal(previewAction(restored,fixture,'p2',{reviveId:'p0'}).ok,false);
});

test('private views contain only the requesting player secret until a deliberate reveal',()=>{
  const game=fresh(),first=viewGame(game,fixture,'p0'),second=viewGame(game,fixture,'p1');
  assert.equal(first.secret.secret,'비공개 0');assert.equal(second.secret.secret,'비공개 1');
  assert.ok(!JSON.stringify(first).includes('비공개 1'));
  assert.ok(!JSON.stringify(second).includes('비공개 0'));
  assert.ok(first.players.every(p=>p.revealedText===null));
  const revealed=revealSecret(game,fixture,'p0').game;
  assert.ok(JSON.stringify(viewGame(revealed,fixture,'p1')).includes('공개해도 되는 사실 0'));
  assert.ok(!JSON.stringify(viewGame(revealed,fixture,'p1')).includes('비공개 0'));
});

test('save restoration filters unknown flags, clues, secrets and forged combat state',()=>{
  const raw=act(fresh(),'p0',{choiceId:'talk'},12);
  raw.flags.madeUp=true;raw.clues.push('madeUp');raw.token='credential';raw.players[0].secret='injected';
  raw.players[1].health=0;raw.players[1].life='alive';raw.activeIndex=1;raw.sparks=999;raw.pressure=-99;
  raw.assists=['made-up-player'];raw.revived=true;
  const restored=validateSave({format:'chronicle-gate-v14',game:raw},[fixture]).game;
  assert.equal(restored.flags.madeUp,undefined);assert.deepEqual(restored.clues,['key']);
  assert.equal(restored.token,undefined);assert.equal(restored.players[0].secret,undefined);
  assert.equal(restored.players[1].life,'dead');assert.notEqual(restored.activeIndex,1);
  assert.equal(restored.sparks,4);assert.equal(restored.pressure,0);assert.deepEqual(restored.assists,[]);
});

test('invalid save schemas, inherited scene keys, duplicate IDs and impossible TPKs are rejected',()=>{
  for(const mutate of [
    g=>g.schema=12,g=>g.campaignId='unknown',g=>g.nodeId='missing',g=>g.nodeId='__proto__',g=>g.nodeId='constructor',
    g=>g.players=[],g=>g.players[1].id=g.players[0].id,g=>g.players[0].id='<p0>',g=>g.players[0].id='__proto__',g=>g.players[0].id='constructor',g=>g.players[0].classId='admin',
    g=>g.nodeId='__all_dead__',
  ]){
    const invalid=fresh();mutate(invalid);
    assert.throws(()=>validateSave(invalid,[fixture]));
  }
});
