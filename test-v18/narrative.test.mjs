/** A reading copy must reflect real events, survive saves and keep private data out. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState as createGame,applyAction,viewGame,availableChoices,validateSave} from '../public/game/engine.js';
import {appendChronicle,restoreChronicle,chronicleText,CHRONICLE_LIMIT} from '../public/game/narrative.js';

const roster=(campaign,count=4)=>campaign.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`독자${i+1}`,classId:job.id}));
const perform=(game,campaign,payload,roll=20)=>{
  const result=applyAction(game,campaign,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll});
  assert.equal(result.ok,true,result.error);return result.game;
};
const event=(id,extra={})=>({id,sceneTitle:'등불을 남긴 밤',actor:'서하',action:'문에 등불을 건다',grade:'success',text:'문에 걸어 둔 등불이 눈 속에서도 보인다. 돌아오는 길에 그 불빛을 다시 찾는다.',...extra});

test('a completed real adventure records choices and combat resolution without observation or hit spam',()=>{
  const campaign=CAMPAIGNS[0];let game=createGame(campaign,roster(campaign));
  const actions=[];let combats=0,steps=0;
  while(game.phase==='playing'&&steps++<70){
    if(game.combat){
      const before=game.chronicle.length;let first=true;
      game=perform(game,campaign,{combatAction:'basic'},()=>{const die=first?20:1;first=false;return die;});
      if(game.lastResult.combatEvent==='victory'){
        combats++;assert.equal(game.chronicle.length,before+1);
        assert.equal(game.chronicle.at(-1).text,game.lastResult.narrativeText);
      }else assert.equal(game.chronicle.length,before);
      continue;
    }
    for(const detail of campaign.nodes[game.nodeId].details||[]){
      if(game.detailsRead[`${game.nodeId}:${detail.id}`])continue;
      const before=game.chronicle.length;game=perform(game,campaign,{detailId:detail.id});
      assert.equal(game.chronicle.length,before,'observation should remain in the full log');
    }
    const choice=availableChoices(game,campaign)[0];assert.ok(choice);
    game=perform(game,campaign,{choiceId:choice.id});actions.push(game.lastResult.action);
    assert.equal(game.chronicle.at(-1).text,game.lastResult.text);
    assert.equal(game.chronicle.at(-1).action,choice.label);
  }
  assert.equal(game.phase,'ended');assert.notEqual(game.nodeId,'__all_dead__');
  assert.equal(combats,1);assert.equal(game.chronicle.length,actions.length+1);
  assert.deepEqual(game.chronicle.filter(e=>e.kind==='choice').map(e=>e.action),actions);
  const restored=validateSave({format:'chronicle-gate-v18',game},CAMPAIGNS).game;
  assert.deepEqual(restored.chronicle,game.chronicle);assert.equal(restored.chroniclePartial,false);
  const view=viewGame(restored,campaign,'p0'),text=chronicleText(view);
  assert.ok(text.includes('마지막 장'));assert.ok(text.includes(campaign.nodes[game.nodeId].title));
  for(const entry of game.chronicle)assert.ok(text.includes(entry.text));
  for(const paragraph of [...view.scene.reading.paragraphs,...view.scene.reading.echoes,...view.scene.reading.personal,view.scene.reading.fate])assert.ok(text.includes(paragraph));
  assert.ok(!text.includes(campaign.roles[0].secret));
});

test('legacy saves recover only actual available events and explicitly mark missing history',()=>{
  const campaign=CAMPAIGNS[0];let game=createGame(campaign,roster(campaign,1));
  game=perform(game,campaign,{choiceId:availableChoices(game,campaign)[0].id});
  const actual=game.lastResult.text,legacy=structuredClone(game);delete legacy.chronicle;delete legacy.chroniclePartial;
  legacy.version='17.0.0';
  const recovered=validateSave({format:'chronicle-gate-v17',game:legacy},CAMPAIGNS).game;
  assert.equal(recovered.chronicle.length,1);assert.equal(recovered.chronicle[0].text,actual);
  assert.equal(recovered.chroniclePartial,false);
  legacy.journal=[];
  const missing=validateSave(legacy,CAMPAIGNS).game;
  assert.deepEqual(missing.chronicle,[]);assert.equal(missing.chroniclePartial,true);
  assert.match(chronicleText(viewGame(missing,campaign,'p0')),/일부 기록은 남아 있지 않습니다/);
  assert.ok(!chronicleText(viewGame(missing,campaign,'p0')).includes(actual));
});

test('deaths, failed and successful revival attempts and combat conclusions are retained as events',()=>{
  const game={chronicle:[],chroniclePartial:false};
  appendChronicle(game,event('observe',{grade:'observe'}));
  appendChronicle(game,event('hit',{combat:true,combatEvent:'attack'}));
  appendChronicle(game,event('death',{combat:true,combatEvent:'attack',deaths:['서하'],narrativeText:'서하의 목소리가 끊긴다. 남은 사람은 문을 지킨다.'}));
  appendChronicle(game,event('failed-return',{grade:'failure',action:'서하 부활 · 기억의 등불'}));
  appendChronicle(game,event('return',{revivedId:'p0',action:'서하 부활 · 기억의 등불'}));
  appendChronicle(game,event('win',{combat:true,combatEvent:'victory',narrativeText:'문을 막던 그림자가 사라진다. 돌아온 서하가 등불을 집어 든다.'}));
  assert.deepEqual(game.chronicle.map(e=>e.kind),['combat','revival','revival','combat']);
  assert.deepEqual(game.chronicle.map(e=>e.id),['death','failed-return','return','win']);
  assert.equal(game.chronicle[0].text,'서하의 목소리가 끊긴다. 남은 사람은 문을 지킨다.');
});

test('bounded chronicle import removes unknown fields and never silently cuts narrative sentences',()=>{
  const game={chronicle:[],chroniclePartial:false};
  for(let i=0;i<CHRONICLE_LIMIT+3;i++)appendChronicle(game,event(`entry-${i}`));
  assert.equal(game.chronicle.length,CHRONICLE_LIMIT);assert.equal(game.chronicle[0].id,'entry-3');assert.equal(game.chroniclePartial,true);
  appendChronicle(game,event('too-long',{text:'가'.repeat(701)}));
  assert.equal(game.chronicle.length,CHRONICLE_LIMIT);assert.ok(!game.chronicle.some(e=>e.id==='too-long'));
  const row={...event('safe'),kind:'choice',token:'DO_NOT_EXPORT',secret:'PRIVATE_SECRET',credentials:{password:'PASSWORD'},html:'<script>'};
  const restored=restoreChronicle({chronicle:[row,row,{...row,id:'long',text:'나'.repeat(701)},{...row,id:'invalid',kind:'credentials'}]},[]);
  assert.equal(restored.chronicle.length,1);assert.equal(restored.chroniclePartial,true);
  assert.deepEqual(Object.keys(restored.chronicle[0]).sort(),['id','kind','sceneTitle','actor','action','grade','text'].sort());
  const reading={paragraphs:['새 장면의 시작.'],echoes:['앞서 남긴 등불이 다시 보인다.'],personal:['동료의 후일담. '.repeat(180)],fate:'살아남은 사람: 서하.'};
  const output=chronicleText({title:'등불의 기록',players:[{name:'서하',token:'PLAYER_TOKEN'}],chronicle:restored.chronicle,scene:{title:'돌아온 문',reading},secret:'PRIVATE_SECRET',token:'DO_NOT_EXPORT',ending:true});
  for(const forbidden of ['DO_NOT_EXPORT','PRIVATE_SECRET','PASSWORD','PLAYER_TOKEN'])assert.ok(!output.includes(forbidden));
  assert.ok(output.includes(reading.personal[0].trim()),'keep the complete long ending in TXT');
  assert.ok(!output.includes('…'));
});
