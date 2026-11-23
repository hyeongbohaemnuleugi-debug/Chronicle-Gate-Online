/**
 * DOM integration, NOT a browser, visual, media decoding, or layout test.
 * The actual bundled app, client, engine, and seven campaigns run in jsdom.
 * Platform-only substitutes cover dialog open/close, ResizeObserver, Image load,
 * Audio playback and scrolling, which jsdom cannot implement visually.
 * D20 entropy is fixed for reproducible control-flow checks; RNG fairness is not tested here.
 * There are no mocked game rules, transports, campaign content or UI handlers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from 'esbuild';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createGame, applyAction, getClasses } from '../public/game/engine.js';
import { startCombat } from '../public/game/combat.js';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const bundle=await build({entryPoints:[path.join(root,'public/game/app.js')],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome100',logLevel:'silent'});
const code=bundle.outputFiles[0].text;
const campaign=CAMPAIGNS[0];
const saveKey='chronicle-v14-local';
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(predicate,message='condition',timeout=1500){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){if(predicate())return;await pause();}
  assert.fail(`Timed out waiting for ${message}`);
}
async function openApp(saved=null,{rolls=[],defaultRoll=12}={}){
  const errors=[],media=[];
  const virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error.message));
  virtualConsole.on('error',(...args)=>errors.push(args.map(String).join(' ')));
  const dom=new JSDOM(html,{url:'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  w.addEventListener('error',event=>errors.push(event.error?.message||event.message));
  w.addEventListener('unhandledrejection',event=>errors.push(event.reason?.message||String(event.reason)));
  w.scrollTo=()=>{};
  // Deterministic entropy only: the real client still runs secureDie and the real rules resolve it.
  Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(array){const die=rolls.length?rolls.shift():defaultRoll;for(let i=0;i<array.length;i++)array[i]=die-1;return array;}});
  w.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
  Object.defineProperty(w.HTMLDialogElement.prototype,'showModal',{configurable:true,value(){this.open=true;}});
  Object.defineProperty(w.HTMLDialogElement.prototype,'close',{configurable:true,value(){this.open=false;this.dispatchEvent(new w.Event('close'));}});
  w.Image=class {
    constructor(){this.naturalWidth=1536;this.naturalHeight=1024;this.onload=null;this.onerror=null;}
    set src(value){this._src=value;w.queueMicrotask(()=>this.onload?.());}
    get src(){return this._src;}
  };
  w.Audio=class extends w.EventTarget {
    constructor(src){super();this.src=src;this.dataset={};this.volume=0;this.paused=true;this.loop=false;media.push(this);}
    play(){this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
    load(){}
    removeAttribute(name){if(name==='src')this.src='';}
  };
  if(saved)w.localStorage.setItem(saveKey,JSON.stringify(saved));
  w.eval(code);
  await until(()=>w.document.querySelectorAll('.campaign-card').length===7,'seven campaign cards');
  await pause();
  assert.deepEqual(errors,[],'App startup raised a runtime error.');
  return {w,doc:w.document,errors,media,close:()=>dom.window.close()};
}
function query(app,selector){const element=app.doc.querySelector(selector);assert.ok(element,`Missing element: ${selector}`);return element;}
async function settled(app){await pause();await until(()=>!app.doc.body.classList.contains('is-busy'),'UI action completed');await pause();}
async function click(app,selector){const element=query(app,selector);assert.ok(!element.disabled,`Disabled control: ${selector}`);element.click();await settled(app);}
function input(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('input',{bubbles:true}));}
async function change(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('change',{bubbles:true}));await settled(app);}
async function submit(app,selector){query(app,selector).dispatchEvent(new app.w.Event('submit',{bubbles:true,cancelable:true}));await settled(app);}
function stored(app){return JSON.parse(app.w.localStorage.getItem(saveKey));}
async function localTable(app,count=2,{start=true}={}){
  await click(app,'[data-action="create"]');
  await click(app,'[data-mode="local"]');
  await change(app,'#local-count',String(count));
  for(let i=0;i<count;i++)input(app,`[data-local-row]:nth-child(${i+1}) input`,`동료 ${i+1}`);
  await submit(app,'#entry-form');
  assert.equal(query(app,'#lobby-view').hidden,false);
  assert.equal(app.doc.querySelectorAll('.lobby-person').length,count);
  assert.equal(query(app,'#entry-dialog').open,false);
  if(!start)return;
  await click(app,'[data-action="start"]');
  assert.equal(query(app,'#game-view').hidden,false);
  assert.equal(query(app,'#scene-title').textContent,campaign.nodes[campaign.start].title);
}
async function resumeLocal(app){await click(app,'[data-action="resume"]');await click(app,'[data-action="resume-local"]');}
function savedEnvelope(game){return {schema:15,campaignId:game.campaignId,players:game.players.map(({id,name,classId,connected})=>({id,name,classId,connected})),game,messages:[]};}
const fixturePeople=story=>getClasses(story).slice(0,2).map((job,i)=>({id:`fixture-${i}`,name:['하린','가온'][i],classId:job.id,connected:true}));

for(const count of [2,4])test(`actual DOM handlers create and start a local ${count}-player table`,async()=>{
  const app=await openApp();
  try{
    await localTable(app,count);
    const data=stored(app);
    assert.equal(data.game.players.length,count);
    assert.equal(new Set(data.game.players.map(p=>p.id)).size,count);
    assert.equal(new Set(data.game.players.map(p=>p.roleIndex)).size,count);
    assert.equal(app.doc.querySelectorAll('.party-member').length,count);
    assert.equal(query(app,'.turn-pill').textContent,'당신의 차례');
    assert.ok(!app.doc.body.textContent.includes(campaign.roles[0].secret),'Unopened private card leaked into the rendered page.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('DOM observation preserves the turn and can be reopened without repeating the action',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);const before=stored(app).game;
    await click(app,'[data-detail]');
    assert.equal(query(app,'#preview-dialog').open,true);
    assert.match(query(app,'#preview-dialog').textContent,/주사위 없이/);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.turn,before.turn);assert.equal(after.activeIndex,before.activeIndex);
    assert.equal(after.nodeId,before.nodeId);assert.equal(after.pressure,before.pressure);
    assert.equal(after.lastResult.grade,'observe');assert.equal(after.journal.length,before.journal.length+1);
    assert.match(query(app,'[data-detail]').textContent,/✓/);
    await click(app,'[data-detail]');
    assert.equal(query(app,'#info-dialog').open,true);
    assert.match(query(app,'#info-dialog').textContent,new RegExp(campaign.nodes[campaign.start].details[0].label));
    assert.equal(stored(app).game.journal.length,after.journal.length);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('unknown typed actions show grounded hints and preserve input; confirmed choices advance turns',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);const before=stored(app).game;
    const declaration='황제에게 승차권 기록을 묻는다';
    input(app,'#free-action',declaration);await submit(app,'#action-form');
    assert.equal(query(app,'#info-dialog').open,true);
    assert.match(query(app,'#info-title').textContent,/어떤 목표/);
    assert.ok(app.doc.querySelectorAll('.clarification-list p').length>0);
    assert.equal(query(app,'#free-action').value,declaration);
    assert.equal(stored(app).game.revision,before.revision);
    await click(app,'[data-close="info-dialog"]');
    const choice=campaign.nodes[campaign.start].choices.find(c=>!c.automatic);
    await click(app,`[data-choice="${choice.id}"]`);
    assert.equal(query(app,'#preview-dialog').open,true);
    assert.match(query(app,'#preview-dialog').textContent,/D20/);
    assert.ok(query(app,'#preview-dialog').textContent.includes(choice.label));
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.notEqual(after.nodeId,before.nodeId);assert.equal(after.turn,before.turn+1);
    assert.ok(after.lastResult.roll>=1&&after.lastResult.roll<=20);
    assert.equal(after.activeIndex,1);assert.match(query(app,'.party-member.active').textContent,/동료 2/);
    assert.equal(query(app,'#free-action').value,'');
    assert.equal(query(app,'#preview-dialog').open,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('private role cards, explicit reveal, local seat switching and assistance use real handlers',async()=>{
  const app=await openApp();
  try{
    await localTable(app,4);
    await click(app,'[data-action="secret"]');
    assert.ok(!query(app,'#info-dialog').textContent.includes(campaign.roles[0].secret));
    await click(app,'[data-action="open-secret"]');
    assert.ok(query(app,'#info-dialog').textContent.includes(campaign.roles[0].secret));
    await click(app,'[data-action="reveal"]');
    assert.equal(stored(app).game.players[0].revealed,true);assert.equal(stored(app).game.sparks,3);
    const ids=stored(app).game.players.map(p=>p.id);
    await click(app,`[data-seat="${ids[1]}"]`);
    await click(app,'[data-action="open-secret"]');
    assert.ok(query(app,'#info-dialog').textContent.includes(campaign.roles[1].secret));
    assert.ok(!query(app,'#info-dialog').textContent.includes(campaign.roles[0].secret));
    await click(app,'[data-close="info-dialog"]');
    assert.equal(query(app,'#free-action').disabled,true);
    await click(app,'[data-action="assist"]');
    assert.deepEqual(stored(app).game.assists,[ids[1]]);
    await click(app,`[data-seat="${ids[0]}"]`);await click(app,'[data-close="info-dialog"]');
    const choice=campaign.nodes[campaign.start].choices.find(c=>!c.automatic);
    await click(app,`[data-choice="${choice.id}"]`);
    assert.match(query(app,'.bonus-breakdown').textContent,/동료 \+1/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('local saved story restores a dead companion and the resurrection UI spends the actual costs',async()=>{
  const story=CAMPAIGNS.find(c=>Object.values(c.nodes).some(n=>n.resurrection&&!n.resurrection.requires&&!n.encounter));
  const node=Object.values(story.nodes).find(n=>n.resurrection&&!n.resurrection.requires&&!n.encounter);
  const game=createGame(story,fixturePeople(story));game.nodeId=node.id;game.visited=[...new Set([story.start,node.id])];
  game.players[1].health=0;game.players[1].life='dead';game.sparks=4;
  const app=await openApp(savedEnvelope(game));
  try{
    await resumeLocal(app);
    assert.equal(query(app,'#scene-title').textContent,node.title);
    assert.equal(app.doc.querySelectorAll('.party-member.fallen').length,1);
    assert.match(query(app,'.life-dead').textContent,/사망/);
    await click(app,'[data-revive="fixture-1"]');
    assert.match(query(app,'#preview-dialog').textContent,/부활/);
    assert.match(query(app,'#preview-dialog').textContent,/소모/);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.sparks,4-(node.resurrection.sparkCost??1));
    assert.equal(after.reviveAttempts[`${node.id}:fixture-1`],true);
    assert.equal(after.turn,1);assert.equal(after.nodeId,node.id);
    const revived=after.lastResult.grade!=='failure';
    assert.equal(after.players[1].life,revived?'alive':'dead');
    assert.equal(after.players[1].revivals,revived?1:0);
    assert.equal(app.doc.querySelectorAll('[data-revive="fixture-1"]').length,0);
    assert.equal(query(app,'#preview-dialog').open,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('an actual engine-produced total-party death save renders a terminal story without active choices',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      const choice=(node.choices||[]).find(c=>!c.requires&&c.outcomes?.failure?.harmAll>=1);
      if(choice){sample={story,node,choice};break;}
    }
    if(sample)break;
  }
  assert.ok(sample,'No authored party-wide hazard exists.');
  const game=createGame(sample.story,fixturePeople(sample.story));game.nodeId=sample.node.id;game.visited=[...new Set([sample.story.start,sample.node.id])];
  game.players.forEach(p=>p.health=1);
  const result=applyAction(game,sample.story,'fixture-0',{choiceId:sample.choice.id,revision:game.revision},{roll:1});
  assert.equal(result.ok,true,result.error);assert.equal(result.game.phase,'ended');assert.equal(result.game.nodeId,'__all_dead__');
  const app=await openApp(savedEnvelope(result.game));
  try{
    await resumeLocal(app);
    assert.equal(app.doc.querySelectorAll('[data-choice]').length,0);
    assert.equal(app.doc.querySelectorAll('#action-form').length,0);
    assert.equal(app.doc.querySelectorAll('.party-member.fallen').length,2);
    assert.ok(query(app,'.scene-prose').textContent.includes('살아남은 사람: 없음'));
    assert.ok(query(app,'.ending-card'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('sound is opt-in and volume controls retain distinct music and effects settings',async()=>{
  const app=await openApp();
  try{
    assert.equal(app.media.length,0,'Muted startup must not begin Audio playback.');
    await click(app,'#sound-toggle');
    assert.equal(query(app,'#sound-toggle').getAttribute('aria-pressed'),'true');
    assert.ok(app.media.some(a=>a.src.endsWith(`/${campaign.id}-mystery.wav`)));
    await click(app,'[data-action="audio-settings"]');
    input(app,'#music-volume','20');input(app,'#effects-volume','70');
    const settings=JSON.parse(app.w.localStorage.getItem('cg-v14-audio'));
    assert.equal(settings.music,.2);assert.equal(settings.effects,.7);
    await click(app,'[data-action="toggle-audio"]');
    assert.equal(query(app,'#sound-toggle').getAttribute('aria-pressed'),'false');
    assert.ok(app.media.every(a=>a.paused));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

function combatFixture(story=campaign,{classIds=null,health=null}={}){
  const node=Object.values(story.nodes).find(n=>n.encounter);
  assert.ok(node,'Story has no battle.');
  const people=fixturePeople(story);
  if(classIds)people.forEach((p,i)=>p.classId=classIds[i]);
  const game=createGame(story,people);game.nodeId=node.id;game.visited=[...new Set([story.start,node.id])];
  if(health)game.players.forEach((p,i)=>{p.health=health[i];p.life=health[i]>0?'alive':'dead';});
  startCombat(game,story);
  assert.ok(game.combat);
  return {story,node,game};
}

test('campaign switching remaps all chosen class slots and exposes only that story professions',async()=>{
  const app=await openApp();
  try{
    assert.equal(new Set(CAMPAIGNS.flatMap(c=>getClasses(c).map(p=>p.id))).size,28);
    await localTable(app,4,{start:false});
    const before=stored(app),oldJobs=getClasses(campaign),target=CAMPAIGNS[2],newJobs=getClasses(target);
    assert.deepEqual(before.players.map(p=>p.classId),oldJobs.map(c=>c.id));
    await change(app,`[data-local-class="${before.players[1].id}"]`,oldJobs[3].id);
    assert.equal(stored(app).players[1].classId,oldJobs[3].id);
    await change(app,'#lobby-campaign',target.id);
    assert.deepEqual(stored(app).players.map(p=>p.classId),[newJobs[0].id,newJobs[3].id,newJobs[2].id,newJobs[3].id]);
    for(const select of app.doc.querySelectorAll('[data-local-class]'))assert.deepEqual([...select.options].map(o=>o.value),newJobs.map(c=>c.id));
    assert.ok(query(app,'.lobby-people .profession-detail').textContent.includes(newJobs[0].basic.name));
    assert.ok(query(app,'.lobby-people .profession-detail').textContent.includes(newJobs[0].ability.name));
    await click(app,'[data-action="start"]');
    assert.equal(stored(app).game.campaignId,target.id);
    assert.ok(query(app,'.party-profession').textContent.includes(newJobs[0].basic.name));
    assert.ok(query(app,'.party-profession').textContent.includes(newJobs[0].ability.name));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('unknown online room is joined without inventing a generic profession choice',async()=>{
  const app=await openApp();
  try{
    await click(app,'[data-action="join"]');
    assert.ok(query(app,'#join-code'));assert.ok(query(app,'#player-name'));
    assert.equal(app.doc.querySelector('#player-class'),null);
    assert.equal(query(app,'#entry-dialog').querySelector('.class-primer'),null);
    assert.match(query(app,'#entry-dialog').textContent,/직업은 방에 들어간 뒤/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('combat DOM exposes enemy HP, announced targets and exactly two actions; basic attacks advance a real round',async()=>{
  const fixture=combatFixture();const app=await openApp(savedEnvelope(fixture.game));
  try{
    await resumeLocal(app);
    assert.equal(app.doc.querySelectorAll('[data-combat]').length,2);
    assert.equal(app.doc.querySelectorAll('[data-choice], [data-detail], [data-revive], #action-form').length,0);
    assert.equal(query(app,'.enemy-health-bar').value,10);
    const targetId=fixture.game.combat.intentTargetIds[0];
    assert.ok(query(app,'.intent-targets').textContent.includes(fixture.game.players.find(p=>p.id===targetId).name));
    await click(app,'[data-combat="basic"]');
    assert.match(query(app,'#preview-dialog').textContent,/적|라운드/);
    await click(app,'[data-action="confirm-action"]');
    let after=stored(app).game;
    assert.equal(after.combat.enemyHealth,8);assert.equal(after.activeIndex,1);assert.equal(after.combat.round,1);
    assert.equal(after.lastResult.combat,true);assert.equal(after.lastResult.roll,12);
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    after=stored(app).game;
    assert.equal(after.combat.enemyHealth,6);assert.equal(after.combat.round,2);
    assert.ok(after.lastResult.enemyRolls.length>0);
    assert.ok(query(app,'.enemy-rolls').textContent.includes('D20'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('ally ability target selection applies real shields and stays spent after a save restore',async()=>{
  const story=CAMPAIGNS.find(c=>getClasses(c).some(p=>p.ability.target==='ally'));
  const job=getClasses(story).find(p=>p.ability.target==='ally');
  const other=getClasses(story).find(p=>p.id!==job.id);
  const fixture=combatFixture(story,{classIds:[job.id,other.id],health:[3,2]});
  let saved;
  const app=await openApp(savedEnvelope(fixture.game));
  try{
    await resumeLocal(app);
    assert.equal(query(app,'#combat-target').options.length,2);
    await change(app,'#combat-target','fixture-1');
    await click(app,'[data-combat="ability"]');
    assert.match(query(app,'#preview-dialog').textContent,/사용 횟수|고유|기술/);
    await click(app,'[data-action="confirm-action"]');
    saved=stored(app);
    assert.ok(saved.game.combat.usedAbilityIds.includes('fixture-0'));
    assert.equal(saved.game.combat.enemyHealth,9);
    assert.equal(saved.game.combat.shields['fixture-1'],job.ability.type==='guard'?2:1);
    if(job.ability.type==='heal')assert.equal(saved.game.players[1].health,3);
    await click(app,'[data-seat="fixture-0"]');await click(app,'[data-close="info-dialog"]');
    assert.equal(query(app,'[data-combat="ability"]').disabled,true);
    assert.match(query(app,'[data-combat="ability"]').textContent,/사용 완료/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
  const resumed=await openApp(saved);
  try{
    await resumeLocal(resumed);
    await click(resumed,'[data-seat="fixture-0"]');await click(resumed,'[data-close="info-dialog"]');
    assert.equal(query(resumed,'[data-combat="ability"]').disabled,true);
    assert.match(query(resumed,'[data-combat="ability"]').textContent,/사용 완료/);
    assert.deepEqual(resumed.errors,[]);
  }finally{resumed.close();}
});

test('dead seat cannot attack during combat but may spend one ghost assist',async()=>{
  const fixture=combatFixture(campaign,{health:[3,0]});
  const app=await openApp(savedEnvelope(fixture.game));
  try{
    await resumeLocal(app);
    await click(app,'[data-seat="fixture-1"]');await click(app,'[data-close="info-dialog"]');
    assert.equal(query(app,'[data-combat="basic"]').disabled,true);
    assert.equal(query(app,'[data-combat="ability"]').disabled,true);
    assert.match(query(app,'.death-notice').textContent,/사망/);
    await click(app,'[data-action="assist"]');
    assert.equal(stored(app).game.players[1].echoUsed,true);
    assert.equal(query(app,'[data-action="assist"]').disabled,true);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('combat victory removes the battle panel and returns to the authored current scene',async()=>{
  const fixture=combatFixture();let game=fixture.game;
  while(game.combat.enemyHealth>3){
    const result=applyAction(game,fixture.story,game.players[game.activeIndex].id,{combatAction:'basic',revision:game.revision},{roll:20});
    assert.equal(result.ok,true,result.error);game=result.game;
  }
  assert.equal(game.combat.enemyHealth,1);
  const app=await openApp(savedEnvelope(game),{defaultRoll:20});
  try{
    await resumeLocal(app);
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.combat,null);assert.equal(after.nodeId,fixture.node.id);
    assert.ok(after.completedCombats.includes(fixture.node.encounter.id));
    assert.equal(after.lastResult.combatEvent,'victory');
    assert.equal(app.doc.querySelector('.combat-panel'),null);
    assert.ok(app.doc.querySelectorAll('[data-choice]').length>0);
    assert.ok(query(app,'#action-form'));
    assert.ok(query(app,'.scene-prose').textContent.includes(fixture.node.text[0]));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('the enemy round can kill the last survivor and replace combat with the death ending',async()=>{
  const fixture=combatFixture(campaign,{health:[1,0]});
  const app=await openApp(savedEnvelope(fixture.game),{rolls:[1,20]});
  try{
    await resumeLocal(app);
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.phase,'ended');assert.equal(after.nodeId,'__all_dead__');
    assert.equal(after.lastResult.combatEvent,'defeat');
    assert.equal(app.doc.querySelectorAll('[data-combat], #action-form').length,0);
    assert.ok(query(app,'.ending-card'));assert.match(query(app,'.scene-prose').textContent,/살아남은 사람: 없음/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
