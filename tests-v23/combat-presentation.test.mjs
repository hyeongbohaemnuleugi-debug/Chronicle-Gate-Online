import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../public/game/engine.js';
import { remapCombatPlayers } from '../public/game/combat.js';
import { buildCombatPresentation } from '../public/game/combat-presentation.js';
import { CAMPAIGNS, getCampaign } from '../public/game/campaigns/index.js';

function fixture(types = ['strike'], intent = {}) {
  const stats = ['might','agility','wit','heart'];
  const classes = stats.map((stat, i) => {
    const type = types[i % types.length];
    return { id: `test-${i}-${type}`, name: `직업 ${i}`, description: '판정 검증용', stats: Object.fromEntries(stats.map((key,j)=>[key,j===i?3:1])),
      basic: { name: '기본 공격', stat, text: '앞을 막은 장치를 친다.' },
      ability: { name: `${type} 기술`, type, stat, target: ['heal','guard'].includes(type)?'ally':type==='rally'?'all':'enemy', text: '직업 기술을 쓴다.', description: '전투마다 한 번.' } };
  });
  const encounter = { id: 'test-mechanism', nodeId: 'arena', title: '출구 앞 대치', intro: ['기계가 일행을 막아선다.'], enemyName: '통제 기계', enemyDescription: '문을 가로막은 금속 기계.',
    victoryText: '기계가 멈췄다.', defeatText: '마지막 동료가 쓰러졌다.', victoryFlag: 'clear',
    intents: [{ name: '금속 집게', text: '집게가 가까워진다.', target: 'all', damage: 2, dc: 12, ...intent }] };
  return { id:'presentation-fixture', title:'전투 연출 검증', start:'arena', pressureMax:8, classes,
    roles:classes.map((c,i)=>({title:`역할 ${i}`,secret:'비밀',goal:'탈출',reveal:'고백'})), clues:{}, flags:{clear:'제압'},
    deathEnding:{title:'마지막 장',text:['일행이 쓰러졌다.'],ending:true,choices:[]},
    nodes:{arena:{id:'arena',title:'잠긴 문',text:['전투 뒤 열린 문이 보인다.'],mood:'mystery',encounter,entities:[],details:[],choices:[{id:'exit',label:'밖으로 간다',automatic:true,outcomes:{success:{text:'밖으로 나왔다.',next:'ending'}}}]},
      ending:{id:'ending',title:'탈출',text:['끝.'],ending:true,choices:[]}} };
}
function start(campaign = fixture(), count = 2) {
  return engine.createStoryState(campaign, campaign.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:'같은 이름',classId:job.id,connected:true})));
}
const view = (game,campaign) => engine.viewGame(game,campaign,game.players[game.activeIndex].id);
function action(game,campaign,payload={combatAction:'basic'},rolls=[8]) {
  const dice=[...rolls];
  const response=engine.applyAction(game,campaign,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll:()=>{assert.ok(dice.length,'Unexpected engine die');return dice.shift();}});
  assert.equal(response.ok,true,response.error);assert.equal(dice.length,0,'All declared dice must be needed');
  const before=view(game,campaign),after=view(response.game,campaign),frozen=JSON.stringify({before,after});
  const plan=buildCombatPresentation(before,after);
  assert.ok(plan);assert.equal(JSON.stringify({before,after}),frozen,'Presentation may not mutate committed views');
  return {next:response.game,plan,before,after};
}
const has = (plan,type) => plan.events.some(event=>event.type===type);
const event = (plan,type) => plan.events.find(event=>event.type===type);

for(const count of [1,2,3,4]) test(`${count} players: a real enemy phase appears only after every living seat acts`,()=>{
  const campaign=fixture();let game=start(campaign,count);
  for(let seat=0;seat<count;seat++) {
    const {next,plan}=action(game,campaign,{combatAction:'basic'},seat===count-1?[8,...Array(count).fill(1)]:[8]);
    assert.equal(plan.actorId,`p${seat}`);assert.equal(has(plan,'enemy-attack'),seat===count-1);
    assert.equal(event(plan,'enemy-hit').amount,2);
    assert.equal(plan.events.filter(row=>row.type==='dodge').length,seat===count-1?count:0);
    game=next;
  }
});

test('success, critical and miss have distinct impact sounds and authoritative health',()=>{
  const campaign=fixture(),game=start(campaign,2);
  for(const [die,type,sound,amount] of [[8,'enemy-hit','battle-hit',2],[20,'enemy-hit','battle-critical',3],[2,'miss','battle-miss',0]]) {
    const {plan}=action(game,campaign,{combatAction:'basic'},[die]);
    assert.equal(event(plan,type).sound,sound);assert.equal(event(plan,type).amount,amount);
    assert.equal(event(plan,type).enemyHealth,10-amount);assert.equal(has(plan,'enemy-attack'),false);
  }
});

test('fumble hurts the actual actor with duplicate names, never the enemy',()=>{
  const campaign=fixture(),game=start(campaign,3);game.activeIndex=1;
  const {next,plan}=action(game,campaign,{combatAction:'basic'},[1]);
  assert.equal(plan.actorId,'p1');assert.equal(event(plan,'fumble').targetId,'p1');assert.equal(event(plan,'fumble').health,2);
  assert.equal(event(plan,'fumble').sound,'battle-fumble');assert.equal(has(plan,'enemy-hit'),false);
  assert.deepEqual(next.players.map(p=>p.health),[3,2,3]);assert.deepEqual(next.lastResult.deathIds,[]);
});

test('solo fumble death ends early without a fabricated counterattack or victory',()=>{
  const campaign=fixture(),game=start(campaign,1);game.players[0].health=1;
  const {next,plan}=action(game,campaign,{combatAction:'basic'},[1]);
  assert.equal(next.combat,null);assert.equal(plan.outcome,'defeat');
  assert.deepEqual(plan.events.map(row=>row.type),['attack','fumble','death','defeat']);
  assert.equal(event(plan,'death').sound,null);assert.equal(event(plan,'defeat').sound,'battle-defeat');
});

test('a fallen actor remains correctly identified while surviving companions keep playing',()=>{
  const campaign=fixture(),game=start(campaign,3);game.players[0].health=1;
  const {next,plan}=action(game,campaign,{combatAction:'basic'},[1]);
  assert.equal(next.phase,'playing');assert.equal(plan.outcome,null);
  assert.equal(event(plan,'death').targetId,'p0');assert.equal(event(plan,'death').sound,'death');
  assert.equal(has(plan,'enemy-attack'),false);
});

test('full and partial shield absorption are separate from real health damage',()=>{
  const campaign=fixture(),game=start(campaign,2);
  game.combat.actedIds=['p0'];game.activeIndex=1;game.combat.shields={p0:2,p1:1};
  const {plan}=action(game,campaign,{combatAction:'basic'},[8,20,20]);
  assert.deepEqual(plan.events.filter(row=>row.type==='shield').map(row=>[row.targetId,row.blocked,row.shield]),[['p0',2,0],['p1',1,0]]);
  assert.deepEqual(plan.events.filter(row=>row.type==='player-hit').map(row=>[row.targetId,row.amount,row.health]),[['p1',1,2]]);
  assert.equal(plan.events.filter(row=>row.type==='dodge').length,0);
});

test('overkill reports actual health removed, then death, then final defeat',()=>{
  const campaign=fixture(),game=start(campaign,1);game.players[0].health=1;
  const {next,plan}=action(game,campaign,{combatAction:'basic'},[2,20]);
  assert.equal(next.lastResult.enemyRolls[0].damage,2,'Original damage rules remain intact');
  assert.equal(next.lastResult.enemyRolls[0].healthDamage,1);
  assert.equal(event(plan,'player-hit').amount,1);assert.equal(event(plan,'player-hit').health,0);
  assert.ok(plan.events.findIndex(row=>row.type==='death')>plan.events.findIndex(row=>row.type==='player-hit'));
  assert.equal(plan.events.at(-1).type,'defeat');
});

test('an automatic healing ability updates HP before its shield absorbs the counterattack',()=>{
  const campaign=fixture(['heal']),game=start(campaign,1);game.players[0].health=1;
  const {next,plan}=action(game,campaign,{combatAction:'ability',targetId:'p0'},[20]);
  assert.equal(next.lastResult.roll,null);assert.equal(event(plan,'heal').health,2);
  assert.equal(event(plan,'enemy-hit').amount,1);
  const shieldEvents=plan.events.filter(row=>row.type==='shield');
  assert.deepEqual(shieldEvents.map(row=>[row.amount,row.blocked,row.shield]),[[1,0,1],[1,1,0]]);
  assert.equal(event(plan,'player-hit').health,1);
  assert.ok(plan.events.indexOf(event(plan,'heal'))<plan.events.indexOf(event(plan,'enemy-attack')));
});

test('drain heals only on a hit and guard records the actual capped addition',()=>{
  const drain=fixture(['drain']),game=start(drain,2);game.players[0].health=1;
  assert.equal(event(action(game,drain,{combatAction:'ability'},[8]).plan,'heal').health,2);
  assert.equal(has(action(game,drain,{combatAction:'ability'},[2]).plan,'heal'),false);
  const guard=fixture(['guard']),guardGame=start(guard,2);guardGame.combat.shields.p1=2;
  const {plan}=action(guardGame,guard,{combatAction:'ability',targetId:'p1'},[]);
  assert.equal(event(plan,'shield').amount,1);assert.equal(event(plan,'shield').shield,3);
});

test('stun cancels the real phase, with no enemy impact, dodge or random die',()=>{
  const campaign=fixture(['stun']),game=start(campaign,1);
  const {next,plan}=action(game,campaign,{combatAction:'ability'},[]);
  assert.equal(next.lastResult.enemyPhase,'stunned');assert.equal(has(plan,'enemy-stunned'),true);
  assert.equal(has(plan,'enemy-attack'),false);assert.equal(has(plan,'player-hit'),false);assert.equal(has(plan,'dodge'),false);
  assert.equal(plan.events.filter(row=>row.sound==='battle-stun').length,1);
});

test('expose and rally name only the statuses actually granted',()=>{
  const expose=fixture(['expose']);assert.equal(event(action(start(expose,2),expose,{combatAction:'ability'},[]).plan,'expose').value,2);
  const rally=fixture(['rally']),game=start(rally,4);game.players[3].health=0;game.players[3].life='dead';
  const {plan}=action(game,rally,{combatAction:'ability'},[]);
  assert.deepEqual(plan.events.filter(row=>row.type==='boost').map(row=>row.targetId),['p0','p1','p2']);
});

test('finishing blow retains the prior encounter, clamps impact to remaining HP, then recovery and victory',()=>{
  const campaign=fixture(),game=start(campaign,2);game.combat.enemyHealth=1;game.players[0].health=1;game.players[1].health=0;game.players[1].life='dead';
  const {next,plan}=action(game,campaign,{combatAction:'basic'},[20]);
  assert.equal(next.combat,null);assert.equal(plan.encounterId,'test-mechanism');assert.equal(plan.outcome,'victory');
  assert.equal(event(plan,'enemy-hit').amount,1);assert.equal(event(plan,'enemy-hit').enemyHealth,0);
  assert.equal(has(plan,'enemy-attack'),false);assert.equal(event(plan,'recovery').health,2);
  assert.equal(plan.events.at(-1).type,'victory');assert.equal(next.players[1].life,'dead');
});

test('a disconnected pass grants only a shield and may finish the actual enemy phase',()=>{
  const campaign=fixture(),game=start(campaign,1);game.players[0].connected=false;
  const response=engine.passTurn(game,'p0',{allowDisconnected:true,campaign,roll:20});assert.equal(response.ok,true,response.error);
  const plan=buildCombatPresentation(view(game,campaign),view(response.game,campaign));
  assert.equal(plan.events[0].type,'ability');assert.equal(plan.events[0].sound,null);assert.equal(has(plan,'enemy-hit'),false);
  assert.equal(event(plan,'shield').amount,1);assert.equal(has(plan,'enemy-attack'),true);
});

test('save import preserves safe receipt metadata and remaps every referenced seat exactly once',()=>{
  const campaign=fixture(['heal']),game=start(campaign,2);game.players[1].health=1;
  const {next}=action(game,campaign,{combatAction:'ability',targetId:'p1'},[]);
  const restored=engine.validateSave({game:next},[campaign]).game;
  assert.equal(restored.lastResult.actorId,'p0');assert.deepEqual(restored.lastResult.supportEffects,next.lastResult.supportEffects);
  const mapping={p0:'seat-a',p1:'seat-b'};remapCombatPlayers(restored,mapping);
  assert.equal(restored.lastResult.actorId,'seat-a');assert.equal(restored.lastResult.targetId,'seat-b');
  assert.ok(restored.lastResult.supportEffects.every(effect=>effect.targetId==='seat-b'));
  assert.equal(restored.lastResult,restored.journal.at(-1));
});

test('save import rejects arbitrary effect types, foreign identities and unsafe text',()=>{
  const campaign=fixture(['heal']),game=start(campaign,2);
  const {next}=action(game,campaign,{combatAction:'ability',targetId:'p1'},[]);
  const raw=structuredClone(next),receipt=raw.journal.at(-1);
  receipt.supportEffects=[{type:'<script>',targetId:'p0',health:0},{type:'heal',targetId:'outsider',health:0},{type:'guard',targetId:'p1',amount:999,shield:999}];
  receipt.enemyIntentName='<script>\u0000';receipt.deathIds=['outsider','p1','p1'];
  const restored=engine.validateSave({game:raw},[campaign]).game.lastResult;
  assert.deepEqual(restored.supportEffects,[{type:'guard',targetId:'p1',amount:3,shield:3}]);
  assert.deepEqual(restored.deathIds,['p1']);assert.equal(restored.enemyIntentName,'script');
});

test('new combat receipts ignore forged presentation and damage payloads',()=>{
  const campaign=fixture(),game=start(campaign,2);
  const {next,plan}=action(game,campaign,{combatAction:'basic',actorId:'p1',encounterId:'fake',damage:999,presentationVersion:1,enemyPhase:'stunned',deathIds:['p1'],supportEffects:[{type:'heal',targetId:'p0',amount:3}]},[2]);
  assert.equal(next.lastResult.actorId,'p0');assert.equal(next.lastResult.encounterId,'test-mechanism');
  assert.equal(has(plan,'miss'),true);assert.equal(has(plan,'heal'),false);assert.equal(has(plan,'enemy-stunned'),false);
});

test('old receipts use prior seat identity and do not rely on ambiguous names',()=>{
  const campaign=fixture(),game=start(campaign,3);game.activeIndex=1;
  const {before,after}=action(game,campaign,{combatAction:'basic'},[1]);
  const legacy=structuredClone(after);for(const key of ['presentationVersion','actorId','encounterId','selfDamage','actorHealthAfter','supportEffects','deathIds','enemyHealthBefore','enemyHealthAfter'])delete legacy.lastResult[key];
  const plan=buildCombatPresentation(before,legacy);
  assert.equal(plan.actorId,'p1');assert.equal(event(plan,'fumble').health,2);
});

test('presence updates and noncombat receipts never manufacture a new battle sequence',()=>{
  const campaign=fixture(),game=start(campaign,2);
  const {after}=action(game,campaign,{combatAction:'basic'},[8]);
  assert.equal(buildCombatPresentation(after,after),null);
  const presence={...after,revision:after.revision+1};assert.equal(buildCombatPresentation(after,presence),null);
  assert.equal(buildCombatPresentation(after,{...after,revision:after.revision+1,lastResult:{combat:false}}),null);
  assert.equal(buildCombatPresentation(after,{...after,campaignId:'elsewhere',revision:after.revision+1}),null);
});

test('every actual enemy presents its encounter in Basic and Epic, solo and four seats',()=>{
  for(const original of CAMPAIGNS)for(const length of ['basic','epic'])for(const count of [1,4]) {
    const campaign=getCampaign(original.id,length);
    for(const arena of Object.values(campaign.nodes).filter(node=>node.encounter)){
    const atArena={...campaign,start:arena.id};
    const game=engine.createStoryState(atArena,atArena.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료${i}`,classId:job.id,connected:true})),{storyLength:length});
    const {plan}=action(game,atArena,{combatAction:'basic'},count===1?[8,1]:[8]);
    assert.equal(plan.encounterId,arena.encounter.id);assert.equal(plan.enemyName,arena.encounter.enemyName);
    assert.equal(event(plan,'enemy-hit').enemyHealth,2+count*(arena.encounter.hpPerPlayer===2?2:4)-2);
    }
  }
});

test('victory recovery, casualty IDs and enemy impact data survive a save import and seat remap',()=>{
  const campaign=fixture(),victory=start(campaign,1);victory.players[0].health=1;victory.combat.enemyHealth=1;
  const won=action(victory,campaign,{combatAction:'basic'},[20]).next;
  const restoredWin=engine.validateSave({game:won},[campaign]).game;remapCombatPlayers(restoredWin,{p0:'new-seat'});
  assert.deepEqual(restoredWin.lastResult.recovery,[{targetId:'new-seat',amount:1,health:2}]);
  const defeat=start(campaign,1);defeat.players[0].health=1;
  const lost=action(defeat,campaign,{combatAction:'basic'},[2,20]).next;
  const restoredLoss=engine.validateSave({game:lost},[campaign]).game;
  assert.deepEqual(restoredLoss.lastResult.enemyRolls,lost.lastResult.enemyRolls);
  remapCombatPlayers(restoredLoss,{p0:'new-seat'});
  assert.deepEqual(restoredLoss.lastResult.deathIds,['new-seat']);assert.equal(restoredLoss.lastResult.enemyRolls[0].targetId,'new-seat');
  assert.equal(restoredLoss.lastResult.enemyRolls[0].healthDamage,1);
});
