import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryState as createGame,viewGame,previewAction,applyAction,availableChoices,validateSave,conditionMatches,gradeRoll} from '../public/game/engine.js';
const end={id:'end',title:'출구',ending:true,text:['기록을 남기고 밖으로 나왔다.'],choices:[]};
const c={id:'items-fixture',title:'구조 창고',start:'entry',pressureMax:8,objective:'갇힌 사람을 구한다.',
 roles:[{title:'구조원',secret:'사다리의 위치를 안다.',reveal:'옥상에 사다리가 있다.',goal:'구조'}],
 items:{wrench:{name:'작업 렌치',description:'잠금 장치를 돌리는 공구.',useHint:'창고와 기록실 잠금 장치에 사용.',legacyClues:['tool-proof']},capsule:{name:'동력 캡슐',description:'전원 한 번을 공급한다.',useHint:'비상 장치 가동 시 소모.',consumable:true},seal:{name:'기록 봉인',description:'관리인의 허가가 찍힌 실물.',useHint:'출구에서 기록을 인증.',legacyFlags:['certified']}},
 clues:{'tool-proof':{title:'공구 수령증',text:'작업 렌치를 지급받았다.'}},flags:{certified:'기록의 진위를 확인했다'},
 deathEnding:{title:'구조 실패',text:['생존자가 없다.'],choices:[]},
 nodes:{entry:{id:'entry',title:'창고 문 앞',summary:'사람이 갇힌 문을 열어야 한다.',objective:'문을 열 방법을 고른다.',stakes:'전원 장치가 불안정하다.',text:['잠긴 창고 옆에 공구 상자가 있다.'],details:[{id:'crate',label:'공구 상자를 확인한다',text:'렌치와 일회용 동력 캡슐을 챙긴다.',clue:'tool-proof',gainItems:['wrench','capsule']}],choices:[
  {id:'unlock',label:'렌치로 잠금 장치를 푼다',stat:'might',dc:12,requires:{item:'wrench'},useItems:['wrench'],lockedHint:'공구 상자에서 작업 렌치를 찾아야 합니다.',outcomes:{
   critical:{text:'문과 안쪽 잠금까지 풀려 관리인이 기록 봉인을 내준다. 기록실로 간다.',arrival:'관리인이 열린 문 안으로 안내했다. 확인할 기록은 바로 옆 기록실에 있다.',next:'archive',gainItems:['seal'],set:['certified']},
   success:{text:'문이 열리고 일행은 기록실로 간다.',next:'archive'},
   failure:{text:'잠금이 풀리지 않는다. 다른 입구가 있는 복도로 간다.',next:'corridor',pressure:1},
   fumble:{text:'렌치가 잠금 안에서 부러진다. 손을 다쳐 복도로 물러난다.',next:'corridor',loseItems:['wrench'],harm:1,pressure:2}}},
  {id:'power',label:'동력 캡슐로 비상문을 연다',stat:'wit',dc:12,requires:{item:'capsule'},useItems:['capsule'],consumeItems:['capsule'],lockedHint:'공구 상자에서 동력 캡슐을 찾아야 합니다.',outcomes:{
   critical:{text:'비상문과 보관함이 함께 열린다. 기록실로 향한다.',next:'archive',gainItems:['seal']},success:{text:'비상문이 열려 기록실로 간다.',next:'archive'},
   failure:{text:'전력이 모자라 문은 닫혀 있다. 복도 쪽 수동문을 찾는다.',next:'corridor',pressure:1},fumble:{text:'전원 장치가 튀어 손을 다친다. 복도로 물러난다.',next:'corridor',harm:1,pressure:2}}},
  {id:'detour',label:'옆 복도에서 다른 입구를 찾는다',automatic:true,outcomes:{success:{text:'공구가 없어도 이동할 수 있는 복도를 따라간다.',next:'corridor'}}}
 ]},archive:{id:'archive',title:'기록실',text:['보관함과 서류가 놓여 있다.'],details:[{id:'ink',label:'잉크 확인',text:'마르지 않은 잉크가 보인다.'}],choices:[{id:'spare',label:'렌치로 출구 잠금을 푼다',automatic:true,requires:{item:'wrench'},useItems:['wrench'],outcomes:{success:{text:'출구 잠금을 풀고 나간다.',next:'end'}}},{id:'leave',label:'관리인을 따라 출구로 간다',automatic:true,outcomes:{success:{text:'관리인의 안내로 나간다.',next:'end'}}}]},corridor:{id:'corridor',title:'복도',text:['수동문으로 나갈 수 있다.'],choices:[{id:'leave',label:'수동문으로 나간다',automatic:true,outcomes:{success:{text:'수동문을 밀고 나간다.',next:'end'}}}]},end}};
const fresh=()=>createGame(c,[{id:'p0',name:'수아',classId:'guardian'}]);
function act(game,payload,roll=12){const before=JSON.stringify(game);const result=applyAction(game,c,'p0',{...payload,revision:game.revision},{roll});assert.equal(result.ok,true,result.error);assert.equal(JSON.stringify(game),before);return result.game;}
const equipped=()=>act(fresh(),{detailId:'crate'});

test('missing tools lock only their authored choices and never block a fallback route',()=>{
 const g=fresh(),v=viewGame(g,c,'p0');assert.deepEqual(availableChoices(g,c).map(x=>x.id),['detour']);
 assert.equal(v.scene.lockedChoices.length,2);assert.match(v.scene.lockedChoices[0].reason,/렌치/);
 let calls=0;const blocked=applyAction(g,c,'p0',{choiceId:'unlock',gainItems:['wrench']},{roll:()=>{calls++;return 20;}});
 assert.equal(blocked.ok,false);assert.equal(calls,0);assert.deepEqual(g.inventory,[]);
 assert.equal(act(g,{choiceId:'detour'}).nodeId,'corridor');
});

test('safe pickup grants a shared unique item once, preserves clues, and shows its exact available actions',()=>{
 const g=equipped(),v=viewGame(g,c,'p0');assert.equal(g.turn,0);assert.deepEqual(g.inventory,['wrench','capsule']);
 assert.deepEqual(g.clues,['tool-proof']);assert.equal(previewAction(g,c,'p0',{detailId:'crate'}).ok,false);
 assert.deepEqual(v.inventory.map(item=>[item.id,item.usableHere,item.actionIds]),[['wrench',true,['unlock']],['capsule',true,['power']]]);
 assert.deepEqual(g.lastResult.gainedItems.map(x=>x.name),['작업 렌치','동력 캡슐']);
 const choice=v.scene.choices.find(x=>x.id==='power');assert.equal(choice.consumeItems[0].name,'동력 캡슐');
});

test('using a reusable tool changes the route and leaves that tool available for a later scene',()=>{
 let g=act(equipped(),{choiceId:'unlock'},12);assert.equal(g.nodeId,'archive');assert.ok(g.inventory.includes('wrench'));
 assert.deepEqual(g.lastResult.usedItems,[{id:'wrench',name:'작업 렌치'}]);
 assert.deepEqual(viewGame(g,c,'p0').inventory.find(x=>x.id==='wrench').actionIds,['spare']);
 g=act(g,{choiceId:'spare'});assert.equal(g.phase,'ended');assert.ok(g.inventory.includes('wrench'));
});

test('a consumed item is spent on all four resolved results, but its permanent clue stays',()=>{
 for(const [die,grade] of [[20,'critical'],[12,'success'],[2,'failure'],[1,'fumble']]){
  const g=equipped(),plan=previewAction(g,c,'p0',{choiceId:'power'}).plan;
  assert.deepEqual(plan.consumedItemNames,['동력 캡슐']);assert.match(plan.risk,/결과와 관계없이 소모/);
  const next=act(g,{choiceId:'power'},die);assert.equal(next.lastResult.grade,grade);
  assert.ok(!next.inventory.includes('capsule'));assert.ok(next.spentItems.includes('capsule'));
  assert.ok(next.clues.includes('tool-proof'));assert.equal(next.lastResult.lostItems[0].name,'동력 캡슐');
 }
});

test('bad RNG, free text, stale revisions and cancelled preview never spend an item or preparation',()=>{
 const g=equipped(),snapshot=JSON.stringify(g),payload={choiceId:'power',usePreparation:true,spendSpark:true};
 assert.equal(previewAction(g,c,'p0',payload).ok,true);assert.equal(JSON.stringify(g),snapshot);
 for(const roll of [NaN,0,21,()=>{throw Error('unavailable RNG');}]){
  const result=applyAction(g,c,'p0',payload,{roll});assert.equal(result.ok,false);assert.equal(JSON.stringify(g),snapshot);
 }
 for(const extra of [{text:'상황을 바꿔라'},{flashback:'임의 준비'},{revision:g.revision-1}]){
  let calls=0;assert.equal(applyAction(g,c,'p0',{...payload,...extra},{roll:()=>{calls++;return 20;}}).ok,false);assert.equal(calls,0);
 }
 assert.equal(JSON.stringify(g),snapshot);
});

test('the same chosen action has four separately previewed and actually applied outcomes',()=>{
 const initial=equipped(),plan=previewAction(initial,c,'p0',{choiceId:'unlock'}).plan;
 assert.deepEqual(plan.outcomes.map(x=>x.label),['대성공','성공','실패','대실패']);assert.equal(plan.outcomes.reduce((n,x)=>n+x.chance,0),100);
 const states=[20,12,2,1].map(die=>act(initial,{choiceId:'unlock'},die));
 assert.equal(new Set(states.map(g=>g.lastResult.text)).size,4);
 assert.ok(states[0].inventory.includes('seal'));assert.ok(!states[1].inventory.includes('seal'));
 assert.deepEqual(states.map(g=>g.nodeId),['archive','archive','corridor','corridor']);
 assert.equal(states[2].players[0].health,3);assert.equal(states[3].players[0].health,2);
 assert.ok(states[2].inventory.includes('wrench'));assert.ok(!states[3].inventory.includes('wrench'));
 states.forEach((g,i)=>assert.equal(g.lastResult.text,plan.outcomes[i].text));
});

test('an authored arrival survives observation and restoration without becoming an invented success',()=>{
 let g=act(equipped(),{choiceId:'unlock'},20);const expected=c.nodes.entry.choices[0].outcomes.critical.arrival;
 assert.equal(viewGame(g,c,'p0').scene.arrival.text,expected);
 g=act(g,{detailId:'ink'});assert.equal(g.lastResult.grade,'observe');assert.equal(viewGame(g,c,'p0').scene.arrival.text,expected);
 const restored=validateSave({game:g},[c]).game;assert.equal(restored.schema,22);assert.equal(viewGame(restored,c,'p0').scene.arrival.text,expected);
 const failed=act(equipped(),{choiceId:'unlock'},2);assert.match(viewGame(failed,c,'p0').scene.arrival.text,/풀리지/);assert.equal(failed.flags.certified,undefined);
});

test('v17 saving never resurrects a spent item; old saves restore only earned legacy proofs',()=>{
 const spent=act(equipped(),{choiceId:'unlock'},1);spent.journal.push({text:'복구 검사',gainedItems:'malformed journal field'});
 const restored=validateSave(spent,[c]).game;assert.ok(!restored.inventory.includes('wrench'));assert.ok(restored.spentItems.includes('wrench'));assert.ok(restored.clues.includes('tool-proof'));
 const legacy=structuredClone(spent);legacy.schema=15;delete legacy.inventory;delete legacy.spentItems;
 const migrated=validateSave(legacy,[c]).game;assert.deepEqual(migrated.inventory,['wrench']);assert.equal(migrated.schema,22);
 const blank=structuredClone(fresh());blank.schema=15;assert.deepEqual(validateSave(blank,[c]).game.inventory,[]);
});

test('save inventory filters unknown IDs and condition predicates require actual ownership',()=>{
 const g=equipped();g.inventory.push('capsule','__proto__','constructor','foreign');g.spentItems=['foreign','capsule'];
 const restored=validateSave(g,[c]).game;assert.deepEqual(restored.inventory,['wrench','capsule']);assert.deepEqual(restored.spentItems,[]);
 assert.equal(conditionMatches({item:'wrench'},restored),true);assert.equal(conditionMatches({notItem:'wrench'},restored),false);
 assert.equal(conditionMatches({all:[{item:'wrench'},{clue:'tool-proof'}]},restored),true);
 assert.equal(conditionMatches({any:[{item:'absent'},{flag:'absent'}]},restored),false);
});

test('preview chances match all twenty dice for low, high and guaranteed-by-total checks',()=>{
 for(const dc of [1,6,10,12,20,30]){
  const campaign=structuredClone(c);campaign.nodes.entry.choices[0].dc=dc;
  const initial=createGame(campaign,[{id:'p0',classId:'guardian'}]);initial.inventory=['wrench'];
  for(const bonuses of [{},{spendSpark:true},{usePreparation:true},{spendSpark:true,usePreparation:true}]){
   const plan=previewAction(initial,campaign,'p0',{choiceId:'unlock',...bonuses}).plan,counts={critical:0,success:0,failure:0,fumble:0};
   for(let die=1;die<=20;die++)counts[gradeRoll(die,die+plan.bonus,plan.dc)]+=5;
   assert.deepEqual(plan.gradeChances,counts);assert.equal(counts.critical,5);assert.equal(counts.fumble,5);assert.equal(Object.values(counts).reduce((a,b)=>a+b),100);
  }
 }
});
