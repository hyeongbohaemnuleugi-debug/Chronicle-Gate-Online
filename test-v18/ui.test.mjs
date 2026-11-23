/**
 * DOM integration, NOT a browser, visual, media decoding, or layout test.
 * The actual bundled app, client, engine, and seven campaigns run in jsdom.
 * Platform-only substitutes cover dialog open/close, ResizeObserver, Image load,
 * and explicit IntersectionObserver notifications (no layout is inferred),
 * Audio playback, scrolling, and browser downloads (Blob URLs/anchor activation),
 * which jsdom cannot implement visually. Downloaded Blob content is read back.
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
import { createGame, applyAction, previewAction, availableChoices, getClasses, gradeRoll, viewGame } from '../public/game/engine.js';
import { startCombat } from '../public/game/combat.js';
import { chronicleText } from '../public/game/narrative.js';

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
async function openApp(saved=null,{rolls=[],defaultRoll=12,withIntersectionObserver=false,failedImages=[]}={}){
  const errors=[],media=[],imageRequests=[],intersections=[],downloads=[],objectURLs=new Map();
  const virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error.message));
  virtualConsole.on('error',(...args)=>errors.push(args.map(String).join(' ')));
  const dom=new JSDOM(html,{url:'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;
  w.addEventListener('error',event=>errors.push(event.error?.message||event.message));
  w.addEventListener('unhandledrejection',event=>errors.push(event.reason?.message||String(event.reason)));
  w.scrollTo=()=>{};
  w.URL.createObjectURL=blob=>{const url=`blob:chronicle-test-${objectURLs.size+1}`;objectURLs.set(url,blob);return url;};
  w.URL.revokeObjectURL=url=>objectURLs.delete(url);
  Object.defineProperty(w.HTMLAnchorElement.prototype,'click',{configurable:true,value(){downloads.push({name:this.download,href:this.href,blob:objectURLs.get(this.href)});}});
  // Deterministic entropy only: the real client still runs secureDie and the real rules resolve it.
  Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(array){const die=rolls.length?rolls.shift():defaultRoll;for(let i=0;i<array.length;i++)array[i]=die-1;return array;}});
  w.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
  if(withIntersectionObserver)w.IntersectionObserver=class {
    constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();intersections.push(this);}
    observe(target){this.targets.add(target);}
    unobserve(target){this.targets.delete(target);}
    disconnect(){this.targets.clear();}
    notify(target,isIntersecting=true){this.callback([{target,isIntersecting,intersectionRatio:isIntersecting?1:0}]);}
  };
  Object.defineProperty(w.HTMLDialogElement.prototype,'showModal',{configurable:true,value(){this.open=true;}});
  Object.defineProperty(w.HTMLDialogElement.prototype,'close',{configurable:true,value(){this.open=false;this.dispatchEvent(new w.Event('close'));}});
  w.Image=class {
    constructor(){this.naturalWidth=1536;this.naturalHeight=1024;this.onload=null;this.onerror=null;}
    set src(value){this._src=value;imageRequests.push(value);w.queueMicrotask(()=>failedImages.includes(new URL(value,'https://chronicle.test').pathname)?this.onerror?.():this.onload?.());}
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
  return {w,doc:w.document,errors,media,imageRequests,intersections,downloads,close:()=>dom.window.close()};
}
function query(app,selector){const element=app.doc.querySelector(selector);assert.ok(element,`Missing element: ${selector}`);return element;}
async function settled(app){await pause();await until(()=>!app.doc.body.classList.contains('is-busy'),'UI action completed');await pause();}
async function click(app,selector){const element=query(app,selector);assert.ok(!element.disabled,`Disabled control: ${selector}`);element.click();await settled(app);}
function input(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('input',{bubbles:true}));}
async function change(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('change',{bubbles:true}));await settled(app);}
async function submit(app,selector){query(app,selector).dispatchEvent(new app.w.Event('submit',{bubbles:true,cancelable:true}));await settled(app);}
function stored(app){return JSON.parse(app.w.localStorage.getItem(saveKey));}
const imagePaths=app=>app.imageRequests.map(src=>new URL(src,'https://chronicle.test').pathname);
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
function savedEnvelope(game){return {schema:17,campaignId:game.campaignId,players:game.players.map(({id,name,classId,connected})=>({id,name,classId,connected})),game,messages:[]};}
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
    const node=campaign.nodes[campaign.start];
    assert.equal(query(app,'[data-context="summary"] dd').textContent,node.summary);
    assert.equal(query(app,'[data-context="objective"] dd').textContent,node.objective);
    assert.equal(query(app,'[data-context="stakes"] dd').textContent,node.stakes);
    assert.equal(query(app,'.scene-orientation').tagName,'DETAILS');
    assert.equal(query(app,'.scene-orientation').open,false);
    assert.equal(query(app,'#tab-journal').textContent,'연대기');
    assert.ok(!app.doc.body.textContent.includes(campaign.roles[0].secret),'Unopened private card leaked into the rendered page.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('solo and group introductions follow chosen seats, keep private cards private, and survive losing a companion',async()=>{
  const opening=campaign.nodes[campaign.start];
  assert.ok(campaign.playModes?.solo&&campaign.playModes?.group,'The story needs authored solo and group introductions.');
  assert.notEqual(campaign.playModes.solo,campaign.playModes.group);
  assert.ok(opening.partyText?.solo?.length&&opening.partyText?.group?.length);
  assert.notDeepEqual(opening.partyText.solo,opening.partyText.group,'The two modes need different actual prose.');
  const rendered={},saves={};
  for(const count of [1,2]){
    const mode=count===1?'solo':'group',app=await openApp();
    try{
      await click(app,'[data-action="create"]');await click(app,'[data-mode="local"]');
      input(app,'[data-local-row]:first-child input','하린');
      for(const size of [1,2,count]){
        await change(app,'#local-count',String(size));
        const note=query(app,'#entry-dialog [data-play-mode]');
        assert.equal(note.dataset.playMode,size===1?'solo':'group');
        assert.equal(note.dataset.partySize,String(size));
        assert.equal(note.querySelector('p').textContent,campaign.playModes[size===1?'solo':'group']);
        assert.equal(query(app,'[data-local-row]:first-child input').value,'하린','Changing the count must preserve the entered name.');
      }
      if(count===2)input(app,'[data-local-row]:nth-child(2) input','가온');
      await submit(app,'#entry-form');
      const lobbyNote=query(app,'#lobby-view [data-play-mode]');
      assert.equal(lobbyNote.dataset.playMode,mode);
      assert.equal(lobbyNote.querySelector('p').textContent,campaign.playModes[mode]);
      for(const role of campaign.roles)assert.ok(!app.doc.body.textContent.includes(role.secret),'An introduction must not reveal a private role card.');
      await click(app,'[data-action="start"]');
      const game=stored(app).game,view=viewGame(game,campaign,game.players[0].id);
      assert.equal(view.storyMode,mode);assert.equal(view.partySize,count);
      rendered[mode]=[...query(app,'.prose-main').querySelectorAll(':scope>p')].map(p=>p.textContent);
      assert.deepEqual(rendered[mode],opening.partyText[mode].slice(0,3));
      assert.deepEqual(rendered[mode],view.scene.reading.paragraphs.slice(0,3));
      assert.equal(query(app,'.chronicle-party').dataset.storyMode,mode);
      assert.equal(query(app,'.chronicle-party').dataset.partySize,String(count));
      const buttons=[...app.doc.querySelectorAll('.choices [data-choice]')];
      assert.ok(buttons.length<=4,'A mode adds at most one contextual choice to the existing three.');
      assert.deepEqual(buttons.map(button=>button.dataset.choice),view.scene.choices.map(choice=>choice.id));
      await click(app,'[data-action="secret"]');await click(app,'[data-action="open-secret"]');
      assert.ok(query(app,'#info-dialog').textContent.includes(campaign.roles[0].secret));
      for(const role of campaign.roles.slice(1))assert.ok(!app.doc.body.textContent.includes(role.secret),'Opening my card must not expose another character’s secret.');
      saves[mode]=game;assert.deepEqual(app.errors,[]);
    }finally{app.close();}
  }
  assert.notDeepEqual(rendered.solo,rendered.group);
  const shared=saves.group;
  shared.players[1].health=0;shared.players[1].life='dead';shared.players[1].connected=false;
  const app=await openApp(savedEnvelope(shared));
  try{
    await resumeLocal(app);
    assert.equal(app.doc.querySelectorAll('.party-member.fallen').length,1);
    assert.equal(query(app,'.chronicle-party').textContent,'2명이 함께 시작한 이야기');
    assert.equal(query(app,'.chronicle-party').dataset.storyMode,'group');
    assert.deepEqual([...query(app,'.prose-main').querySelectorAll(':scope>p')].map(p=>p.textContent),rendered.group,'A shared story must not become the solo version after a companion dies.');
    for(const role of campaign.roles)assert.ok(!app.doc.body.textContent.includes(role.secret));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('DOM observation preserves the turn and can be reopened without repeating the action',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);const before=stored(app).game;
    query(app,'.scene-orientation').open=true;
    await click(app,'[data-detail]');
    assert.equal(query(app,'#preview-dialog').open,true);
    assert.match(query(app,'#preview-dialog').textContent,/주사위 없이/);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.turn,before.turn);assert.equal(after.activeIndex,before.activeIndex);
    assert.equal(after.nodeId,before.nodeId);assert.equal(after.pressure,before.pressure);
    assert.equal(after.lastResult.grade,'observe');assert.equal(after.journal.length,before.journal.length+1);
    assert.equal(query(app,'.scene-orientation').open,true,'A reader-opened fold survives same-scene state changes.');
    assert.equal(after.chronicle.length,0,'Observations belong to the full log, not the reading chronicle.');
    assert.match(query(app,'[data-detail]').textContent,/✓/);
    await click(app,'[data-detail]');
    assert.equal(query(app,'#info-dialog').open,true);
    assert.match(query(app,'#info-dialog').textContent,new RegExp(campaign.nodes[campaign.start].details[0].label));
    assert.equal(stored(app).game.journal.length,after.journal.length);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('authored choices replace all free-action inputs and require a preview before advancing',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);const before=stored(app).game;
    assert.equal(app.doc.querySelector('#free-action, #action-form, #flashback'),null);
    assert.ok(!query(app,'#game-view').textContent.includes('당신만의 방법'));
    const choice=availableChoices(before,campaign).find(c=>!c.automatic);
    assert.ok(choice,'Opening scene needs a freely available authored roll.');
    await click(app,`.choices [data-choice="${choice.id}"]`);
    assert.equal(query(app,'#preview-dialog').open,true);
    assert.match(query(app,'#preview-dialog').textContent,/D20/);
    assert.ok(query(app,'#preview-dialog').textContent.includes(choice.label));
    assert.equal(stored(app).game.revision,before.revision);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.notEqual(after.nodeId,before.nodeId);assert.equal(after.turn,before.turn+1);
    assert.ok(after.lastResult.roll>=1&&after.lastResult.roll<=20);
    assert.equal(after.activeIndex,1);assert.match(query(app,'.party-member.active').textContent,/동료 2/);
    assert.equal(app.doc.querySelector('#free-action, #action-form, #flashback'),null);
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
    assert.ok([...app.doc.querySelectorAll('.choices [data-choice]')].every(button=>button.disabled));
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
    const revived=['critical','success'].includes(after.lastResult.grade);
    assert.equal(after.players[1].life,revived?'alive':'dead');
    assert.equal(after.players[1].revivals,revived?1:0);
    assert.equal(after.chronicle.at(-1).kind,'revival');
    assert.equal(query(app,'[data-chronicle-kind="revival"] p').textContent,after.chronicle.at(-1).text);
    assert.equal(app.doc.querySelectorAll('[data-revive="fixture-1"]').length,0);
    assert.equal(query(app,'#preview-dialog').open,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('an actual engine-produced total-party death save renders a terminal story without active choices',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      if(node.encounter)continue;
      const choice=(node.choices||[]).find(c=>!c.requires&&!(c.useItems||[]).length&&!(c.consumeItems||[]).length&&c.outcomes?.fumble?.harmAll>=1);
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
    assert.ok(app.media.some(a=>new URL(a.src,'https://chronicle.test').pathname.endsWith(`/${campaign.id}-mystery.mp3`)));
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
    assert.equal(after.chronicle.length,0);
    assert.equal(app.doc.querySelector('[data-chronicle-kind="combat"]'),null,'Ordinary combat hits must not fill the chronicle.');
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
    assert.equal(app.doc.querySelector('#action-form'),null);
    assert.ok(query(app,'.scene-prose').textContent.includes(viewGame(after,fixture.story,after.players[0].id).scene.reading.paragraphs[0]));
    assert.equal(after.chronicle.at(-1).kind,'combat');
    const receipt=query(app,'.result-details');assert.equal(receipt.open,false);
    assert.equal(query(app,'.last-result>p').textContent,after.lastResult.narrativeText||after.lastResult.text);
    if(after.lastResult.narrativeText&&after.lastResult.narrativeText!==after.lastResult.text)assert.ok(receipt.textContent.includes(after.lastResult.text));
    assert.equal([...app.doc.querySelectorAll('[data-chronicle-kind="combat"] p')].at(-1).textContent,after.chronicle.at(-1).text);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('victory stays ahead of the scene after observation instead of replaying the earlier approach to battle',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      if(node.encounter||node.ending)continue;
      const before=storyFixture(story,node);
      for(const choice of availableChoices(before,story)){
        const next=story.nodes[choice.outcomes?.critical?.next];
        if(!next?.encounter||!next.details?.length||choice.automatic)continue;
        const entered=applyAction(before,story,'fixture-0',{choiceId:choice.id,revision:before.revision},{roll:20});
        if(entered.ok&&entered.game.combat){sample={story,node:next,game:entered.game};break;}
      }
      if(sample)break;
    }
    if(sample)break;
  }
  assert.ok(sample,'A real choice must reach a battle with an observable aftermath.');
  let game=sample.game;
  const arrival=game.arrival;
  assert.ok(arrival?.text);
  while(game.combat.enemyHealth>3){
    const hit=applyAction(game,sample.story,game.players[game.activeIndex].id,{combatAction:'basic',revision:game.revision},{roll:20});
    assert.equal(hit.ok,true,hit.error);game=hit.game;
  }
  let observedSave,victory;
  const app=await openApp(savedEnvelope(game),{defaultRoll:20});
  try{
    await resumeLocal(app);
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    const won=stored(app).game;
    assert.equal(won.lastResult.combatEvent,'victory');
    victory=won.lastResult.narrativeText||won.lastResult.text;
    assert.equal(query(app,'.last-result>p').textContent,victory);
    assert.equal(app.doc.querySelector('.scene-arrival'),null);
    await click(app,`[data-detail="${sample.node.details[0].id}"]`);await click(app,'[data-action="confirm-action"]');
    observedSave=stored(app).game;
    assert.equal(observedSave.lastResult.grade,'observe');
    assert.deepEqual(observedSave.arrival,arrival,'The engine keeps the old approach for history, so the reader must choose the newer real result.');
    const passage=query(app,'.last-result>p');
    assert.equal(passage.textContent,victory);
    assert.notEqual(passage.textContent,arrival.text);
    assert.equal(app.doc.querySelector('.scene-arrival'),null,'An observation after victory must not jump back to approaching the enemy.');
    assert.ok(passage.compareDocumentPosition(query(app,'#scene-title'))&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(query(app,'.observation-result p').textContent,observedSave.lastResult.text);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
  const restored=await openApp(savedEnvelope(observedSave));
  try{
    await resumeLocal(restored);
    assert.equal(query(restored,'.last-result>p').textContent,victory);
    assert.equal(restored.doc.querySelector('.scene-arrival'),null);
    assert.deepEqual(restored.errors,[]);
  }finally{restored.close();}
});

test('the enemy round can kill the last survivor and replace combat with the death ending',async()=>{
  const fixture=combatFixture(campaign,{health:[1,0]});
  const app=await openApp(savedEnvelope(fixture.game),{rolls:[2,20]});
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


test('v18 home presents the chronicle masthead and factual story, class and encounter labels',async()=>{
  const app=await openApp();
  try{
    assert.match(query(app,'#home-title').textContent,/CHRONICLE.*GATE/);
    assert.ok(query(app,'.hero-invitation svg'));
    assert.equal(query(app,'.hero-art').dataset.artPriority,'high');
    for(const story of CAMPAIGNS){
      const card=query(app,`[data-campaign="${story.id}"]`);
      const scenes=Object.values(story.nodes).filter(n=>!n.ending).length;
      const endings=Object.values(story.nodes).filter(n=>n.ending).length;
      assert.ok(card.textContent.includes(`${scenes}개 장면`));
      assert.ok(card.textContent.includes(`${endings}개 결말`));
      assert.ok(card.textContent.includes('전용 직업 4개'));
      assert.ok(card.textContent.includes('1번의 전투'));
      assert.equal(card.querySelector('[data-art]').dataset.artPriority,'defer');
    }
    assert.equal(app.doc.querySelectorAll('.chronicle-promise>div').length,3);
    assert.ok(query(app,'.site-footer').textContent.includes('v18'));
    assert.match(html,/styles\.css\?v=18000/);
    assert.match(html,/app\.js\?v=18000/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('art observer defers offscreen atlases, fetches on intersection, and reuses the cached image',async()=>{
  const app=await openApp(null,{withIntersectionObserver:true});
  try{
    assert.deepEqual(imagePaths(app),[`/game/art/${campaign.id}.webp`]);
    const observer=app.intersections[0];
    const second=CAMPAIGNS[1];
    const frame=query(app,`[data-campaign="${second.id}"] [data-art]`);
    assert.ok(observer.targets.has(frame));
    observer.notify(frame,false);await settled(app);
    assert.equal(app.imageRequests.length,1);
    observer.notify(frame);await settled(app);
    assert.equal(app.imageRequests.length,2);
    assert.ok(frame.classList.contains('art-ready'));
    assert.ok(!observer.targets.has(frame));
    for(const src of app.imageRequests)assert.equal(new URL(src,'https://chronicle.test').searchParams.get('v'),'17000');
    assert.ok(frame.style.backgroundImage.includes('v=17000'));
    observer.notify(frame);await settled(app);
    assert.equal(app.imageRequests.length,2,'Repeated notifications should reuse the already-loaded atlas.');
    await click(app,`[data-campaign="${second.id}"]`);
    assert.equal(app.imageRequests.length,2,'Selecting a cached cover as the hero should not create another Image request.');
    assert.ok(query(app,'.hero-art').classList.contains('art-ready'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('the no-IntersectionObserver fallback loads only nearby cover rectangles on scroll',async()=>{
  const app=await openApp();
  try{
    assert.deepEqual(imagePaths(app),[`/game/art/${campaign.id}.webp`]);
    const nearby=query(app,`[data-campaign="${CAMPAIGNS[1].id}"] [data-art]`);
    const distant=query(app,`[data-campaign="${CAMPAIGNS[2].id}"] [data-art]`);
    nearby.getBoundingClientRect=()=>({top:250,bottom:490,width:400,height:240,left:20,right:420});
    distant.getBoundingClientRect=()=>({top:4000,bottom:4240,width:400,height:240,left:20,right:420});
    app.w.dispatchEvent(new app.w.Event('scroll'));
    await until(()=>app.imageRequests.length===2,'fallback atlas near viewport');
    await settled(app);
    assert.ok(nearby.classList.contains('art-ready'));
    assert.ok(!distant.classList.contains('art-ready'));
    assert.equal(imagePaths(app)[1],`/game/art/${CAMPAIGNS[1].id}.webp`);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('hidden home covers cannot be fetched by a delayed observer callback during play',async()=>{
  const app=await openApp(null,{withIntersectionObserver:true});
  try{
    const pending=query(app,`[data-campaign="${CAMPAIGNS[4].id}"] [data-art]`);
    await localTable(app,2);
    app.intersections[0].notify(pending);
    await settled(app);
    assert.deepEqual(imagePaths(app),[`/game/art/${campaign.id}.webp`]);
    assert.equal(query(app,'.scene-art').dataset.artPriority,'high');
    assert.ok(query(app,'.scene-art').classList.contains('art-ready'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('failed art is identified accessibly while the actual story and controls remain usable',async()=>{
  const app=await openApp(null,{withIntersectionObserver:true,failedImages:[`/game/art/${campaign.id}.webp`]});
  try{
    assert.ok(query(app,'.hero-art').classList.contains('art-unavailable'));
    assert.match(query(app,'.hero-art').getAttribute('aria-label'),/불러오지 못했습니다/);
    await localTable(app,2);
    assert.ok(query(app,'.scene-art').classList.contains('art-unavailable'));
    const data=stored(app).game;
    assert.ok(query(app,'.scene-prose').textContent.includes(viewGame(data,campaign,data.players[0].id).scene.reading.paragraphs[0]));
    assert.ok(app.doc.querySelectorAll('[data-choice]').length>0);
    assert.equal(app.imageRequests.length,1,'State changes must not repeatedly fetch a known failed atlas.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('v18 principal text tokens meet 4.5:1 contrast and the stylesheet keeps readable text sizes',()=>{
  const css=fs.readFileSync(path.join(root,'public/game/styles.css'),'utf8');
  const color=name=>{
    const match=css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`,'i'));
    assert.ok(match,`Missing color token ${name}`);return match[1];
  };
  const luminance=hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  };
  const ratio=(foreground,background)=>{
    const a=luminance(foreground),b=luminance(background);
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  };
  for(const [foreground,background] of [['ink','night'],['muted','surface'],['soft','surface'],['gold','surface'],['paper-ink','paper'],['paper-muted','paper'],['paper-gold','paper']]){
    const contrast=ratio(color(foreground),color(background));
    assert.ok(contrast>=4.5,`${foreground} on ${background}: ${contrast.toFixed(2)}:1`);
  }
  const pixelSizes=[...css.matchAll(/font-size:\s*([0-9.]+)px/g)].map(m=>Number(m[1]));
  assert.ok(pixelSizes.length>150,'Expected the actual v18 stylesheet.');
  assert.ok(pixelSizes.every(size=>size>=12),'Functional text must not shrink below 12px.');
  assert.match(css,/\.scene-prose\s*\{[^}]*font-size:\s*18px/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:reduce\)/);
  assert.ok(!/@import|https?:\/\//.test(css),'Styles must not fetch fonts or other external assets.');
});

function storyFixture(story,node=story.nodes[story.start]){
  const game=createGame(story,fixturePeople(story));
  game.nodeId=node.id;game.visited=[...new Set([story.start,node.id])];
  return game;
}
async function check(app,selector,checked=true){
  const element=query(app,selector);assert.equal(element.type,'checkbox');
  assert.equal(element.disabled,false);element.checked=checked;
  element.dispatchEvent(new app.w.Event('change',{bubbles:true}));await settled(app);
}
const labels={critical:'대성공',success:'성공',failure:'실패',fumble:'대실패'};
function assertFourOutcomes(app,plan){
  const rows=[...app.doc.querySelectorAll('[data-outcome-grade]')];
  assert.deepEqual(rows.map(row=>row.dataset.outcomeGrade),['critical','success','failure','fumble']);
  const displayed=Object.fromEntries(rows.map(row=>[row.dataset.outcomeGrade,Number(row.querySelector('[data-chance]').dataset.chance)]));
  assert.deepEqual(displayed,plan.gradeChances);
  assert.equal(Object.values(displayed).reduce((sum,value)=>sum+value,0),100);
  for(const outcome of plan.outcomes){
    const row=rows.find(row=>row.dataset.outcomeGrade===outcome.grade);
    assert.ok(row.textContent.includes(labels[outcome.grade]));
    const detail=query(app,`[data-outcome-detail="${outcome.grade}"]`);
    assert.ok(detail.textContent.includes(outcome.text));
    for(const change of outcome.changes)assert.ok(detail.textContent.includes(change));
  }
  assert.equal(query(app,'.outcome-details').open,false,'Long outcome details should not overwhelm the first preview.');
  assert.ok(!query(app,'#preview-dialog').textContent.includes('대가 있는 성공'));
}

test('each of the four story grades has an accurate preview and displays the actual resulting changes',async()=>{
  const original=storyFixture(campaign);
  const choice=availableChoices(original,campaign).find(c=>!c.automatic);
  const plan=previewAction(original,campaign,'fixture-0',{choiceId:choice.id}).plan;
  assert.ok(plan);
  const gradeDie=grade=>Array.from({length:20},(_,index)=>index+1).find(die=>gradeRoll(die,die+plan.bonus,plan.dc)===grade);
  const observed={};
  for(const grade of ['critical','success','failure','fumble']){
    const roll=gradeDie(grade);assert.ok(roll,`${grade} should be reachable in the authored opening choice.`);
    const app=await openApp(savedEnvelope(original),{defaultRoll:roll});
    try{
      await resumeLocal(app);
      await click(app,`.choices [data-choice="${choice.id}"]`);
      assertFourOutcomes(app,plan);
      await click(app,'[data-action="confirm-action"]');
      const after=stored(app).game;observed[grade]=after;
      assert.equal(after.lastResult.grade,grade);
      assert.equal(query(app,'.result-grade').textContent,labels[grade]);
      assert.ok(query(app,'.last-result').classList.contains(`grade-${grade}`));
      assert.ok(query(app,'.last-result>p').textContent.includes(after.lastResult.text));
      assert.ok(query(app,'.result-next').textContent.includes(after.lastResult.nextSceneTitle));
      assert.ok(query(app,'.result-changes').textContent.trim());
      const live=campaign.nodes[after.nodeId];
      assert.equal(query(app,'[data-context="summary"] dd').textContent,live.summary);
      assert.equal(query(app,'[data-context="objective"] dd').textContent,live.objective);
      assert.ok(query(app,'.last-result').compareDocumentPosition(query(app,'.scene-orientation'))&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
      assert.ok(query(app,'.scene-prose').compareDocumentPosition(query(app,'.scene-orientation'))&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
      assert.equal(query(app,'.scene-orientation').open,false);
      assert.equal(query(app,'.result-details').open,false);
      assert.equal(query(app,'.result-changes').closest('details'),query(app,'.result-details'));
      assert.deepEqual(app.errors,[]);
    }finally{app.close();}
  }
  const effects=game=>JSON.stringify({nodeId:game.nodeId,pressure:game.pressure,flags:game.flags,inventory:game.inventory,clues:game.clues,health:game.players.map(p=>p.health)});
  assert.notEqual(effects(observed.critical),effects(observed.success),'Critical must change the authored world, not only the result heading.');
  assert.notEqual(effects(observed.fumble),effects(observed.failure),'Fumble must differ from ordinary failure mechanically.');
});

test('preparation is a one-use checkbox that changes the real bonus only after confirmation',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);
    const before=stored(app).game,actorId=before.players[0].id;
    const choice=availableChoices(before,campaign).find(c=>!c.automatic);
    const baseline=previewAction(before,campaign,actorId,{choiceId:choice.id}).plan;
    await check(app,'#use-preparation');
    await click(app,`.choices [data-choice="${choice.id}"]`);
    assert.match(query(app,'.bonus-breakdown').textContent,/준비한 수단 \+2/);
    assert.equal(stored(app).game.players[0].focus,true);
    const prepared=previewAction(before,campaign,actorId,{choiceId:choice.id,usePreparation:true}).plan;
    assert.equal(prepared.bonus,baseline.bonus+2);assertFourOutcomes(app,prepared);
    await click(app,'[data-close="preview-dialog"]');
    assert.equal(stored(app).game.players[0].focus,true,'Cancelling a preview must preserve the once-per-character preparation.');
    assert.equal(query(app,'#use-preparation').checked,true);
    await click(app,`.choices [data-choice="${choice.id}"]`);await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.players[0].focus,false);assert.equal(after.lastResult.preparation,true);
    assert.equal(after.lastResult.bonus,prepared.bonus);
    await click(app,`[data-seat="${actorId}"]`);await click(app,'[data-close="info-dialog"]');
    assert.equal(query(app,'#use-preparation').disabled,true);
    assert.match(query(app,'.preparation-option').textContent,/이미 사용/);
    assert.equal(app.doc.querySelector('#flashback'),null);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('safe observation really acquires an authored item without spending the turn',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      if(node.encounter||node.ending)continue;
      const detail=(node.details||[]).find(d=>d.gainItems?.length);
      if(detail){sample={story,node,detail};break;}
    }
    if(sample)break;
  }
  assert.ok(sample,'An actual authored observation must award a usable item.');
  const original=storyFixture(sample.story,sample.node);
  const app=await openApp(savedEnvelope(original));
  try{
    await resumeLocal(app);
    assert.equal(query(app,'.inventory-panel .panel-heading>span').textContent,'0개');
    await click(app,`[data-detail="${sample.detail.id}"]`);await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.turn,original.turn);assert.equal(after.nodeId,original.nodeId);
    assert.equal(after.activeIndex,original.activeIndex);
    for(const itemId of sample.detail.gainItems){
      assert.ok(after.inventory.includes(itemId));
      const item=sample.story.items[itemId];
      assert.ok(query(app,`[data-inventory-item="${itemId}"]`).textContent.includes(item.name));
      assert.ok(query(app,'[data-item-change="gained"]').parentElement.textContent.includes(item.name));
    }
    assert.equal(query(app,'.inventory-panel').contains(query(app,'#notebook-body')),false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

function consumableSample(){
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      if(node.encounter||node.ending)continue;
      for(const choice of node.choices||[]){
        if(!choice.consumeItems?.length||!choice.lockedHint)continue;
        const game=storyFixture(story,node);
        game.inventory=[...new Set([...(choice.useItems||[]),...choice.consumeItems])];
        const clue=Object.keys(story.clues||{})[0];if(clue)game.clues=[clue];
        if(!availableChoices(game,story).some(c=>c.id===choice.id))continue;
        return {story,node,choice,game,clue};
      }
    }
  }
  assert.fail('No authored consumable choice can be exercised with its required items.');
}

test('the bag exposes only authored item actions, explains missing items and atomically consumes them',async()=>{
  const sample=consumableSample(),itemId=sample.choice.consumeItems[0];
  const missing=JSON.parse(JSON.stringify(sample.game));missing.inventory=[];
  const locked=await openApp(savedEnvelope(missing));
  try{
    await resumeLocal(locked);
    assert.equal(locked.doc.querySelector(`.choices [data-choice="${sample.choice.id}"]`),null);
    assert.ok(query(locked,`[data-locked-choice="${sample.choice.id}"]`).textContent.includes(sample.choice.lockedHint));
    assert.equal(locked.doc.querySelector('[data-inventory-choice]'),null);
    assert.deepEqual(locked.errors,[]);
  }finally{locked.close();}
  const app=await openApp(savedEnvelope(sample.game));
  try{
    await resumeLocal(app);
    const item=query(app,`[data-inventory-item="${itemId}"]`);
    assert.match(item.querySelector('.item-availability').textContent,/이 장면에서 쓸 수 있음/);
    assert.ok(query(app,`.choices [data-choice="${sample.choice.id}"]`).textContent.includes(sample.story.items[itemId].name));
    await click(app,`[data-inventory-choice="${itemId}"][data-choice="${sample.choice.id}"]`);
    assert.equal(query(app,'.preview-action').textContent,sample.choice.label);
    for(const id of sample.choice.consumeItems){
      assert.ok(query(app,'.item-consume-warning').textContent.includes(sample.story.items[id].name));
      assert.ok(stored(app).game.inventory.includes(id),'Preview must not consume any item.');
    }
    const plan=previewAction(sample.game,sample.story,'fixture-0',{choiceId:sample.choice.id}).plan;
    if(!plan.automatic)assertFourOutcomes(app,plan);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    for(const id of sample.choice.consumeItems){
      assert.ok(!after.inventory.includes(id));assert.ok(after.spentItems.includes(id));
      assert.equal(app.doc.querySelector(`[data-inventory-item="${id}"]`),null);
      assert.ok(query(app,'.result-changes').textContent.includes(sample.story.items[id].name));
    }
    assert.ok(app.doc.querySelector('[data-item-change="used"]'));
    assert.ok(app.doc.querySelector('[data-item-change="lost"]'));
    if(sample.clue)assert.ok(after.clues.includes(sample.clue),'Consuming an object must not erase a permanent clue.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('an owned item without an available use has no arbitrary use-item button',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    for(const node of Object.values(story.nodes)){
      if(node.ending||node.encounter)continue;
      for(const id of Object.keys(story.items||{})){
        const game=storyFixture(story,node);game.inventory=[id];
        if(availableChoices(game,story).some(c=>[...(c.useItems||[]),...(c.consumeItems||[])].includes(id)))continue;
        sample={story,node,id,game};break;
      }
      if(sample)break;
    }
    if(sample)break;
  }
  assert.ok(sample,'Expected an item that is useful in a different authored scene.');
  const app=await openApp(savedEnvelope(sample.game));
  try{
    await resumeLocal(app);
    const item=query(app,`[data-inventory-item="${sample.id}"]`);
    assert.equal(item.querySelector('[data-choice]'),null);
    assert.ok(!item.textContent.includes('이 장면에서 쓸 수 있음'));
    assert.ok(item.textContent.includes(sample.story.items[sample.id].useHint));
    assert.equal(app.doc.querySelector('[data-action="use-item"]'),null);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('the actual journey remains visible before the next scene after observation, without a repeated arrival',async()=>{
  let sample;
  for(const story of CAMPAIGNS){
    const original=storyFixture(story);
    for(const choice of availableChoices(original,story)){
      const plan=previewAction(original,story,'fixture-0',{choiceId:choice.id}).plan;
      if(!plan||plan.automatic)continue;
      const roll=Array.from({length:18},(_,index)=>index+2).find(d=>gradeRoll(d,d+plan.bonus,plan.dc)==='success');
      if(!roll)continue;
      const next=story.nodes[choice.outcomes.success.next];
      if(!next||next.ending||next.encounter||!next.details?.length)continue;
      sample={story,original,choice,roll,next};break;
    }
    if(sample)break;
  }
  assert.ok(sample,'An opening authored choice should reach a scene that can be observed.');
  let savedObservation;
  const app=await openApp(savedEnvelope(sample.original),{defaultRoll:sample.roll});
  try{
    await resumeLocal(app);
    await click(app,`.choices [data-choice="${sample.choice.id}"]`);await click(app,'[data-action="confirm-action"]');
    const arrived=stored(app).game,arrival=arrived.arrival;
    assert.equal(arrival.toSceneId,sample.next.id);assert.equal(arrival.fromSceneId,sample.original.nodeId);
    const journey=arrived.lastResult.narrativeText||arrived.lastResult.text;
    assert.equal(query(app,'.last-result>p').textContent,journey);
    assert.equal(app.doc.querySelector('.scene-arrival'),null,'A visible choice result must not be followed by another arrival summary.');
    await click(app,`[data-detail="${sample.next.details[0].id}"]`);await click(app,'[data-action="confirm-action"]');
    const observed=stored(app).game;
    assert.deepEqual(observed.arrival,arrival);
    const passage=query(app,'.last-result>p');
    assert.equal(passage.textContent,journey,'A safe observation must not replace the passage explaining how we got here.');
    assert.equal(passage.closest('details'),null,'The journey belongs in the visible reading flow.');
    assert.ok(passage.compareDocumentPosition(query(app,'#scene-title'))&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal([...query(app,'.story-paper').querySelectorAll('p')].filter(p=>p.textContent===journey).length,1);
    assert.equal(app.doc.querySelector('.scene-arrival'),null);
    const observation=query(app,'.observation-result');
    assert.equal(observation.open,true);assert.equal(observation.querySelector('p').textContent,observed.lastResult.text);
    assert.ok(query(app,'.prose-main').compareDocumentPosition(observation)&app.w.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(query(app,'[data-context="summary"] dd').textContent,sample.next.summary);
    savedObservation=observed;
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
  const restored=await openApp(savedEnvelope(savedObservation));
  try{
    await resumeLocal(restored);
    const latestChoice=savedObservation.journal.findLast(entry=>entry.nextSceneTitle===sample.next.title);
    assert.equal(query(restored,'.last-result>p').textContent,latestChoice.narrativeText||latestChoice.text,'The reading order must also survive a restored save.');
    assert.equal(restored.doc.querySelector('.scene-arrival'),null);
    assert.deepEqual(restored.errors,[]);
  }finally{restored.close();}
  const withoutReceipts={...savedObservation,journal:[]};
  const legacy=await openApp(savedEnvelope(withoutReceipts));
  try{
    await resumeLocal(legacy);
    const passage=query(legacy,'.scene-arrival p');
    assert.equal(passage.textContent,savedObservation.arrival.text);
    assert.equal(passage.closest('details'),null,'The saved arrival remains visible even if the detailed receipt is missing.');
    assert.ok(passage.compareDocumentPosition(query(legacy,'#scene-title'))&legacy.w.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.deepEqual(legacy.errors,[]);
  }finally{legacy.close();}
});

test('combat uses the same four outcome labels and fumble really damages the acting character',async()=>{
  const fixture=combatFixture();
  const plan=previewAction(fixture.game,fixture.story,'fixture-0',{combatAction:'basic'}).plan;
  const app=await openApp(savedEnvelope(fixture.game),{defaultRoll:1});
  try{
    await resumeLocal(app);
    await click(app,'[data-combat="basic"]');assertFourOutcomes(app,plan);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.lastResult.grade,'fumble');
    assert.equal(after.players[0].health,fixture.game.players[0].health-1);
    assert.equal(after.combat.enemyHealth,fixture.game.combat.enemyHealth);
    assert.equal(query(app,'.result-grade').textContent,'대실패');
    assert.match(query(app,'.result-changes').textContent,/생명.*1/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('chat remains the only in-game text entry and its draft survives a safe observation',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);await click(app,'[data-tab="chat"]');
    const message='먼저 표를 확인한 다음 함께 결정하자.';
    input(app,'#chat-input',message);
    const before=stored(app).game;
    await click(app,'[data-detail]');await click(app,'[data-action="confirm-action"]');
    assert.equal(query(app,'#chat-input').value,message);
    assert.equal(app.doc.querySelectorAll('#game-view textarea').length,1);
    await submit(app,'#chat-form');
    assert.equal(query(app,'#chat-input').value,'');
    assert.ok(query(app,'.chat-messages').textContent.includes(message));
    assert.equal(stored(app).game.turn,before.turn);
    await click(app,'[data-action="help"]');
    assert.ok(!query(app,'#info-dialog').textContent.includes('자유 입력'));
    assert.ok(!query(app,'#info-dialog').textContent.includes('회상'));
    assert.match(query(app,'#info-dialog').textContent,/대성공·성공·실패·대실패/);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

function blobText(app,blob){
  return new Promise((resolve,reject)=>{const reader=new app.w.FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsText(blob);});
}

test('the chronicle reads real choices forward and downloads a public TXT distinct from the JSON save',async()=>{
  const app=await openApp();
  try{
    await localTable(app,2);
    await click(app,'[data-detail]');await click(app,'[data-action="confirm-action"]');
    const observation=stored(app).game.lastResult.text;
    for(let turn=0;turn<2;turn++){
      await click(app,'.choices [data-choice]');await click(app,'[data-action="confirm-action"]');
    }
    const saved=stored(app),g=saved.game,view=viewGame(g,campaign,g.players[g.activeIndex].id);
    assert.equal(g.chronicle.length,2);
    const entries=[...app.doc.querySelectorAll('[data-chronicle-id]')];
    assert.deepEqual(entries.map(el=>el.dataset.chronicleId),g.chronicle.map(event=>event.id));
    assert.deepEqual(entries.map(el=>el.querySelector('p').textContent),g.chronicle.map(event=>event.text));
    assert.ok(!query(app,'.chronicle-list').textContent.includes(observation));
    assert.equal(query(app,'.full-journal').open,false);
    assert.ok(query(app,'.full-journal').textContent.includes(observation));
    await click(app,'.session-actions [data-action="export-chronicle"]');
    const txt=app.downloads.at(-1);assert.match(txt.name,/^chronicle-gate-v18-.*\.txt$/);
    assert.equal(txt.blob.type,'text/plain;charset=utf-8');
    const text=await blobText(app,txt.blob);
    assert.equal(text,chronicleText(view));
    assert.match(text,/아직 이어지는 이야기/);
    assert.ok(text.indexOf(g.chronicle[0].text)<text.indexOf(g.chronicle[1].text));
    assert.ok(text.includes(view.scene.reading.paragraphs[0]));
    for(const role of campaign.roles)assert.ok(!text.includes(role.secret),'TXT must not expose unopened private role secrets.');
    assert.ok(!/"(?:resumeToken|hostToken|secret)"\s*:/.test(text));
    await click(app,'.session-actions [data-action="export"]');
    const json=app.downloads.at(-1);assert.match(json.name,/^chronicle-gate-v18-.*\.json$/);
    assert.equal(json.blob.type,'application/json');
    const progress=JSON.parse(await blobText(app,json.blob));
    assert.equal(progress.game.nodeId,g.nodeId);
    assert.equal(progress.game.schema,17);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('a real ending keeps every paragraph and personal fate while folding the long epilogue',async()=>{
  const story=CAMPAIGNS.find(s=>s.id==='last-train');
  const people=getClasses(story).map((job,i)=>({id:`reader-${i}`,name:`기록자${i+1}`,classId:job.id}));
  let g=createGame(story,people);g.nodeId='bridge';g.visited=[story.start,'bridge'];
  g.flags={signed:true,names_kept:true,meal_shared:true,broadcast:true};
  g.players[3].health=0;g.players[3].life='dead';
  const result=applyAction(g,story,g.players[0].id,{choiceId:'take-living',revision:g.revision});
  assert.equal(result.ok,true,result.error);g=result.game;
  const app=await openApp(savedEnvelope(g));
  try{
    await resumeLocal(app);
    const restored=stored(app).game,view=viewGame(restored,story,restored.players[0].id),reading=view.scene.reading;
    const prose=query(app,'.scene-prose'),fold=query(app,'.story-traces');
    assert.equal(fold.open,false);
    assert.equal(fold.querySelector('summary').textContent,'이 선택이 남긴 흔적');
    assert.deepEqual([...query(app,'.prose-main').querySelectorAll(':scope>p')].map(el=>el.textContent),reading.paragraphs.slice(0,3));
    assert.equal(reading.personal.length,4);
    for(const paragraph of [...reading.paragraphs,...reading.echoes,...reading.personal])assert.ok(prose.textContent.includes(paragraph),'No authored paragraph may be lost or automatically shortened.');
    for(const paragraph of [...reading.echoes,...reading.personal])assert.ok(fold.textContent.includes(paragraph));
    assert.equal(query(app,'.story-fate').textContent,reading.fate);
    assert.equal(query(app,'.story-fate').closest('details'),null,'Survival and death remain visible at the ending.');
    assert.match(reading.fate,/희생된 사람: 기록자4/);
    assert.ok(!query(app,'.prose-main').textContent.includes(reading.personal[0]));
    fold.open=true;
    await click(app,'[data-tab="clues"]');
    assert.equal(query(app,'.story-traces').open,true,'Reading the notebook must not close an opened epilogue.');
    await click(app,'.ending-actions [data-action="export-chronicle"]');
    const text=await blobText(app,app.downloads.at(-1).blob);
    assert.match(text,/마지막 장/);
    for(const paragraph of [...reading.paragraphs,...reading.echoes,...reading.personal,reading.fate])assert.ok(text.includes(paragraph));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('a legacy save with a missing early journal shows only surviving events and an honest partial notice',async()=>{
  let g=createGame(campaign,fixturePeople(campaign));
  for(let i=0;i<2;i++){
    const choice=availableChoices(g,campaign)[0];
    const result=applyAction(g,campaign,g.players[g.activeIndex].id,{choiceId:choice.id,revision:g.revision},{roll:20});
    assert.equal(result.ok,true,result.error);g=result.game;
  }
  const lost=g.chronicle[0].text,kept=g.journal.at(-1);
  delete g.chronicle;delete g.chroniclePartial;
  g.version='17.0.0';g.journal=[kept];
  const app=await openApp(savedEnvelope(g));
  try{
    await resumeLocal(app);
    assert.equal(stored(app).game.chroniclePartial,true);
    assert.equal(query(app,'.chronicle-partial').textContent,'현재 보관된 선택부터 연대기가 이어집니다.');
    const entries=[...app.doc.querySelectorAll('[data-chronicle-id]')];
    assert.equal(entries.length,1);assert.equal(entries[0].querySelector('p').textContent,kept.text);
    assert.ok(!query(app,'.chronicle-list').textContent.includes(lost),'An older missing event must not be fabricated.');
    await click(app,'.session-actions [data-action="export-chronicle"]');
    const text=await blobText(app,app.downloads.at(-1).blob);
    assert.match(text,/일부 기록은 남아 있지 않습니다/);
    assert.ok(text.includes(kept.text));assert.ok(!text.includes(lost));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});
