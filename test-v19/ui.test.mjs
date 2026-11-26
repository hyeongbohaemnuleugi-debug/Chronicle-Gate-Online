/** Functional DOM checks only; no browser, layout, image or audio quality claims.
 * Runs the real app/client/engine and authored first chapters in jsdom.
 * Only unavailable browser platform APIs are substituted. The online check uses
 * a real HTTP server and real Socket.IO clients in the same Node process.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {JSDOM,VirtualConsole} from 'jsdom';
import {build} from 'esbuild';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {attachTableService} from '../game-server/table-service.js';
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState as createGame,applyAction,previewAction,viewGame} from '../public/game/engine.js';
import {OPENINGS} from '../public/game/opening.js';
import {startCombat} from '../public/game/combat.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const bundled=await build({entryPoints:[new URL('../public/game/app.js',import.meta.url).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome100',logLevel:'silent'});
const code=bundled.outputFiles[0].text,story=CAMPAIGNS[0],saveKey='chronicle-v14-local';
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(condition,label='UI condition',timeout=2500){const end=Date.now()+timeout;while(Date.now()<end){if(condition())return;await pause();}assert.fail(`Timed out: ${label}`);}
function query(app,selector){const value=app.doc.querySelector(selector);assert.ok(value,`Missing ${selector}`);return value;}
async function settled(app){await pause();await until(()=>!app.doc.body.classList.contains('is-busy'),'action completed');await pause();}
async function click(app,selector){const el=query(app,selector);assert.ok(!el.disabled,`Disabled ${selector}`);el.click();await settled(app);}
function input(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('input',{bubbles:true}));}
async function change(app,selector,value){const el=query(app,selector);el.value=value;el.dispatchEvent(new app.w.Event('change',{bubbles:true}));await settled(app);}
async function submit(app,selector){query(app,selector).dispatchEvent(new app.w.Event('submit',{bubbles:true,cancelable:true}));await settled(app);}
const stored=app=>JSON.parse(app.w.localStorage.getItem(saveKey));
const envelope=game=>({schema:game.schema,campaignId:game.campaignId,players:game.players.map(({id,name,classId})=>({id,name,classId,connected:true})),game,messages:[]});
const people=(count=2)=>story.classes.slice(0,count).map((job,i)=>({id:`reader-${i}`,name:`동료 ${i+1}`,classId:job.id,connected:true}));
const ok=result=>{assert.equal(result?.ok,true,result?.error);return result;};

async function openApp({save=null,network=null,die=20}={}){
  const errors=[],media=[],audioRequests=[],console=new VirtualConsole();
  console.on('jsdomError',error=>errors.push(error.message));console.on('error',(...args)=>errors.push(args.map(String).join(' ')));
  const dom=new JSDOM(html,{url:network?.url||'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console}),w=dom.window;
  w.addEventListener('error',event=>errors.push(event.error?.message||event.message));
  w.addEventListener('unhandledrejection',event=>errors.push(event.reason?.message||String(event.reason)));
  w.scrollTo=()=>{};w.ResizeObserver=class{observe(){}disconnect(){}};
  Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(array){array.fill(die-1);return array;}});
  Object.defineProperty(w.HTMLDialogElement.prototype,'showModal',{configurable:true,value(){this.open=true;}});
  Object.defineProperty(w.HTMLDialogElement.prototype,'close',{configurable:true,value(){this.open=false;this.dispatchEvent(new w.Event('close'));}});
  w.Image=class{constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}set src(value){this._src=value;w.queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
  w.Audio=class extends w.EventTarget{constructor(src){super();this.src=src;this.dataset={};this.paused=true;this.volume=0;media.push(this);audioRequests.push(src);}play(){this.paused=false;if(!this.loop)w.queueMicrotask(()=>this.dispatchEvent(new w.Event('ended')));return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(name){if(name==='src')this.src='';}};
  w.URL.createObjectURL=()=> 'blob:download-test';w.URL.revokeObjectURL=()=>{};
  Object.defineProperty(w.HTMLAnchorElement.prototype,'click',{configurable:true,value(){}});
  if(network)w.io=network.connect;
  if(save)w.localStorage.setItem(saveKey,JSON.stringify(save));
  w.eval(code);await until(()=>w.document.querySelectorAll('.campaign-card').length===9,'catalog');await pause();
  assert.deepEqual(errors,[]);
  return {w,doc:w.document,errors,media,audioRequests,close:()=>w.close()};
}
async function lobby(app,count=2){
  await click(app,'[data-action="create"]');await click(app,'[data-mode="local"]');await change(app,'#local-count',String(count));
  for(let i=0;i<count;i++)input(app,`[data-local-row]:nth-child(${i+1}) input`,`동료 ${i+1}`);
  await submit(app,'#entry-form');
  assert.equal(query(app,'[name="story-length"][value="basic"]').checked,true);
}
async function choose(app,id='safe'){await click(app,`.choices [data-choice="${id}"]`);await click(app,'[data-action="confirm-action"]');}
async function resume(app){await click(app,'[data-action="resume"]');await click(app,'[data-action="resume-local"]');}
function assertNoOtherOpening(app,mineId,persons){
  const text=app.doc.body.textContent;
  for(const person of persons.filter(p=>p.id!==mineId)){
    const authored=OPENINGS[story.id].professions[person.classId];
    assert.ok(!text.includes(authored.role.secret),'Another profession’s role secret reached the DOM.');
    for(const stage of authored.stages){assert.ok(!text.includes(stage.text[0]),'Another profession’s private scene reached the DOM.');for(const choice of stage.choices)for(const result of Object.values(choice.outcomes))assert.ok(!text.includes(result.text),'Another profession’s private result reached the DOM.');}
  }
}

test('the length selector replaces the start-mode bypass and both lengths require distinct professions',async()=>{
  const app=await openApp();
  try{
    await lobby(app,2);const ids=stored(app).players.map(p=>p.id);
    await change(app,`[data-local-class="${ids[1]}"]`,story.classes[0].id);
    assert.equal(query(app,'[data-action="start"]').disabled,true);
    assert.match(query(app,'.opening-job-warning').textContent,/서로 다른 직업/);
    assert.ok(query(app,`[data-local-class="${ids[1]}"]`).textContent.includes('동료 1 선택'));
    assert.equal(app.doc.querySelector('[name="opening-mode"]'),null);
    await click(app,'[name="story-length"][value="epic"]');
    assert.equal(query(app,'[data-action="start"]').disabled,true);
    await change(app,`[data-local-class="${ids[1]}"]`,story.classes[1].id);
    await click(app,'[data-action="start"]');
    assert.equal(stored(app).game.phase,'opening');assert.equal(stored(app).game.storyLength,'epic');
    assert.equal(stored(app).game.opening.joined,false);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('four local readers finish two scenes each; handoff clears private DOM before the actual public meeting',async()=>{
  const app=await openApp();
  try{
    await lobby(app,4);await click(app,'[data-action="start"]');
    const persons=stored(app).game.players;
    for(const [index,person] of persons.entries()){
      const authored=OPENINGS[story.id].professions[person.classId];
      assert.ok(query(app,'#opening-receive-title').textContent.includes(person.name));
      assert.equal(app.doc.querySelector('.prose-main'),null,'No private prose may exist below the receive screen.');
      assert.equal(app.doc.querySelector('.choices'),null);
      for(const p of persons)assert.ok(!app.doc.body.textContent.includes(OPENINGS[story.id].professions[p.classId].role.secret));
      assertNoOtherOpening(app,null,persons);
      await click(app,'[data-action="opening-receive"]');
      assert.equal(query(app,'.prose-main>p').textContent,authored.stages[0].text[0]);
      assert.equal(app.doc.querySelectorAll('.choices [data-choice]').length,2);
      assert.equal(app.doc.querySelector('.opening-progress .life-meter'),null,'Public progress cannot show private injury or bonuses.');
      assertNoOtherOpening(app,person.id,persons);
      await click(app,'[data-action="secret"]');await click(app,'[data-action="open-secret"]');
      assert.equal(query(app,'.secret-content>p').textContent,authored.role.secret);
      assert.equal(app.doc.querySelector('[data-action="reveal"]'),null);
      await click(app,'#info-dialog [data-close="info-dialog"]');
      await choose(app);
      assert.equal(query(app,'#scene-title').textContent,authored.stages[1].title,'The same person keeps the second scene.');
      assert.equal(app.doc.querySelector('[data-action="opening-receive"]'),null);
      const g1=stored(app).game,first=viewGame(g1,story,person.id).opening.mine.history[0];
      assert.equal(query(app,'.last-result>p').textContent,first.text);
      assert.equal(query(app,'.prose-main>p').textContent,authored.stages[1].text[0]);
      await choose(app);
      const g2=stored(app).game,second=viewGame(g2,story,person.id).opening.mine.history[1];
      assert.equal(query(app,'.last-result>p').textContent,second.text);
      if(index<3){
        assert.equal(g2.phase,'opening');assert.ok(app.doc.querySelector('[data-action="opening-next"]'));
        await click(app,'[data-action="opening-next"]');
        assert.equal(query(app,'#info-dialog').innerHTML,'');assert.equal(query(app,'#preview-dialog').innerHTML,'');
        assertNoOtherOpening(app,null,persons);
      }else{
        assert.equal(g2.phase,'playing');
        assert.ok(app.doc.querySelector('[data-action="opening-meeting"]'),'The final reader sees their result before the public meeting.');
      }
    }
    await click(app,'[data-action="opening-meeting"]');
    const joined=stored(app).game,view=viewGame(joined,story,persons[3].id);
    assert.deepEqual([...app.doc.querySelectorAll('.meeting-accounts>p')].map(p=>p.textContent),view.opening.meeting.text);
    assertNoOtherOpening(app,null,persons);
    await click(app,'[data-action="opening-main"]');
    assert.equal(query(app,'.turn-pill').textContent,'당신의 차례');
    assert.equal(query(app,'.party-member.active b').textContent,persons[0].name+'나');
    assert.deepEqual([...app.doc.querySelectorAll('.prose-main>p')].map(p=>p.textContent),OPENINGS[story.id].meeting.startText.group);
    assert.equal(query(app,'.meeting-notebook').open,false);
    assert.ok(query(app,'.meeting-notebook').textContent.includes(view.opening.meeting.text[1]));
    for(const person of persons)assert.ok(!app.doc.body.textContent.includes(OPENINGS[story.id].professions[person.classId].role.secret));
    await click(app,'[data-action="secret"]');
    assert.equal(app.doc.querySelector('.personal-opening-history'),null,'Re-reading also requires opening one’s private card.');
    await click(app,'[data-action="open-secret"]');
    assert.deepEqual([...app.doc.querySelectorAll('.personal-opening-history article>p')].map(p=>p.textContent),viewGame(joined,story,persons[0].id).opening.mine.history.map(h=>h.text));
    assertNoOtherOpening(app,persons[0].id,persons);
    await click(app,'#info-dialog [data-close="info-dialog"]');await click(app,`[data-seat="${persons[1].id}"]`);
    assert.equal(app.doc.querySelector('.personal-opening-history'),null,'Changing the reader clears the previous closed private card.');
    assertNoOtherOpening(app,null,persons);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('music stays neutral before a local handoff; an actual death selects grief once and observation keeps it without a bright cue',async()=>{
  let app=await openApp();
  try{
    await lobby(app,2);await click(app,'[data-action="start"]');
    assert.deepEqual(app.audioRequests,[],'A quiet page does not request music.');
    await click(app,'#sound-toggle');
    assert.deepEqual(app.audioRequests,[`/game/audio/${story.id}-calm.mp3?v=20000`]);
    await click(app,'[data-action="opening-receive"]');
    const current=stored(app).game,scene=viewGame(current,story,current.players[0].id).scene;
    assert.ok(app.audioRequests.includes(`/game/audio/${story.id}-${scene.mood}.mp3?v=20000`));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
  const g=createGame(story,people());g.players[0].health=1;
  app=await openApp({save:envelope(g),die:1});
  try{
    await resume(app);await click(app,'#sound-toggle');
    const before=app.audioRequests.length;
    await choose(app,'group-hold-door');
    assert.equal(stored(app).game.players[0].life,'dead');
    const requests=app.audioRequests.slice(before);
    assert.ok(requests.includes(`/game/audio/${story.id}-grief.mp3?v=20000`));
    assert.equal(requests.filter(src=>src.includes('/death.mp3')).length,1);
    assert.ok(!requests.some(src=>/\/(success|failure|victory)\.mp3/.test(src)),'Death owns the result cue even when the roll has a grade.');
    const afterDeath=app.audioRequests.length;
    await click(app,'[data-detail]');await click(app,'[data-action="confirm-action"]');
    assert.equal(stored(app).game.lastResult.grade,'observe');
    assert.deepEqual(app.audioRequests.slice(afterDeath),[],'An observation neither restarts grief nor inserts a bright clue/transition cue.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('two real combat actions with identical receipt values each sound once; revealing a card does not replay the attack',async()=>{
  const persons=people(4).map(p=>({...p,name:'같은 이름',classId:story.classes[0].id}));
  const g=createGame(story,persons),node=Object.values(story.nodes).find(n=>n.encounter);
  g.nodeId=node.id;g.visited=[story.start,node.id];startCombat(g,story);
  const app=await openApp({save:envelope(g),die:12});
  try{
    await resume(app);await click(app,'#sound-toggle');
    const receipts=[];
    for(let i=0;i<2;i++){
      await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
      receipts.push(stored(app).game.lastResult);
    }
    assert.deepEqual(receipts[0],receipts[1],'The fixture must produce genuinely identical values from two distinct actions.');
    assert.equal(app.audioRequests.filter(src=>src.includes('/attack.mp3')).length,2);
    await click(app,'[data-action="secret"]');await click(app,'[data-action="open-secret"]');await click(app,'[data-action="reveal"]');
    assert.equal(app.audioRequests.filter(src=>src.includes('/attack.mp3')).length,2,'A new reveal journal entry does not make the old combat receipt new.');
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('resuming a partially completed first chapter selects the unfinished reader and requires receiving the device again',async()=>{
  let g=createGame(story,people(),{openingMode:'separate'});
  for(let i=0;i<2;i++)g=ok(applyAction(g,story,'reader-0',{choiceId:'safe',revision:viewGame(g,story,'reader-0').actionRevision})).game;
  let save=envelope(g);
  for(let pass=0;pass<2;pass++){
    const app=await openApp({save});
    try{
      await resume(app);
      assert.ok(query(app,'#opening-receive-title').textContent.includes('동료 2'));
      assert.equal(app.doc.querySelector('.prose-main'),null);
      assertNoOtherOpening(app,null,g.players);
      await click(app,'[data-action="opening-receive"]');
      assert.equal(query(app,'#scene-title').textContent,OPENINGS[story.id].professions[g.players[1].classId].stages[pass].title);
      assertNoOtherOpening(app,'reader-1',g.players);
      if(pass===0){await choose(app,'risk');save=stored(app);assert.equal(save.game.opening.states[1].records.length,1);}
      assert.deepEqual(app.errors,[]);
    }finally{app.close();}
  }
});

test('solo opening receipts lead to the main scene and its first dice preview includes and consumes the earned preparation once',async()=>{
  const app=await openApp();
  try{
    await lobby(app,1);await click(app,'[data-action="start"]');
    assert.equal(app.doc.querySelector('[data-action="opening-receive"]'),null,'Solo readers open their own first chapter immediately.');
    assert.equal(query(app,'.opening-progress h2').textContent,'이야기가 이어질 곳');
    await choose(app,'risk');await choose(app,'risk');
    const finished=stored(app).game,id=finished.players[0].id;
    assert.equal(finished.players[0].openingBonus,2);
    assert.equal(query(app,'.last-result>p').textContent,viewGame(finished,story,id).opening.mine.history[1].text);
    await click(app,'[data-action="opening-meeting"]');await click(app,'[data-action="opening-main"]');
    assert.deepEqual([...app.doc.querySelectorAll('.prose-main>p')].map(p=>p.textContent),OPENINGS[story.id].meeting.startText.solo);
    const view=viewGame(finished,story,id),choice=view.scene.choices.find(c=>!c.automatic),plan=ok(previewAction(finished,story,id,{choiceId:choice.id})).plan;
    await click(app,`.choices [data-choice="${choice.id}"]`);
    assert.match(query(app,'.bonus-breakdown').textContent,/첫 장에서 얻은 준비 \+2/);
    assert.equal(Number(query(app,'.dice-equation>div:nth-of-type(2)>b').textContent),plan.bonus);
    await click(app,'[data-action="confirm-action"]');
    const after=stored(app).game;
    assert.equal(after.players[0].openingBonus,0);assert.equal(after.opening.states[0].bonusSpent,true);
    assert.ok(after.lastResult.changes.includes('첫 장에서 얻은 준비 +2 사용 완료'));
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>error?reject(error):resolve(result)));
async function networkHarness(){
  const server=http.createServer((_request,response)=>response.end('test')),io=new Server(server,{serveClient:false}),sockets=[];let rolls=0;
  const storageDir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v19-ui-'));
  const service=attachTableService(io,{storageDir,roll:()=>{rolls++;return 20;}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}`;
  const socket=(namespace='/table',options={})=>{const client=connect(url+namespace,{...options,transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false});sockets.push(client);return client;};
  return {url,connect:socket,sockets,get rolls(){return rolls;},async peer(){const client=socket();client.connect();await once(client,'connect',{signal:AbortSignal.timeout(3500)});return client;},async close(){service.close();for(const client of sockets)client.disconnect();await new Promise(resolve=>io.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(storageDir,{recursive:true,force:true});}};
}

test('real online peer progress preserves my preview; the host sees only progress and explicitly defers a disconnected reader',async()=>{
  const net=await networkHarness();let app;
  try{
    app=await openApp({network:net});
    await click(app,'[data-action="create"]');input(app,'#player-name','방장');await submit(app,'#entry-form');
    const credentials=JSON.parse(app.w.sessionStorage.getItem('chronicle-v14-online'));
    const peer=await net.peer(),peerCredentials=ok(await ack(peer,'table:join',{code:credentials.code,name:'먼 길의 동료',classId:story.classes[1].id}));
    await until(()=>app.doc.querySelectorAll('.lobby-person').length===2,'peer enters lobby');
    await click(app,'[data-action="start"]');
    await click(app,'#sound-toggle');
    assert.equal(app.doc.querySelector('[data-action="opening-receive"]'),null,'Online readers already have their own device.');
    await click(app,'.choices [data-choice="risk"]');
    const ownPreview=query(app,'#preview-dialog').innerHTML;
    const peerBefore=ok(await ack(peer,'table:sync')).state;
    ok(await ack(peer,'table:act',{choiceId:'risk',revision:peerBefore.game.actionRevision,requestId:'peer-first'}));
    await until(()=>app.doc.querySelector(`[data-opening-player="${peerCredentials.playerId}"]>p`)?.textContent.includes('1 / 2'),'peer public progress');
    assert.equal(query(app,'#preview-dialog').open,true);assert.equal(query(app,'#preview-dialog').innerHTML,ownPreview);
    assert.equal(net.rolls,1);assertNoOtherOpening(app,credentials.playerId,[{id:credentials.playerId,classId:story.classes[0].id},{id:peerCredentials.playerId,classId:story.classes[1].id}]);
    assert.equal(app.audioRequests.filter(src=>src.includes('/success.mp3')).length,0,'A peer’s result cannot play my private result cue.');
    await click(app,'[data-action="confirm-action"]');
    assert.equal(query(app,'#scene-title').textContent,OPENINGS[story.id].professions[story.classes[0].id].stages[1].title);
    assert.equal(net.rolls,2);
    assert.equal(app.audioRequests.filter(src=>src.includes('/success.mp3')).length,1);
    net.sockets[0].disconnect();await until(()=>query(app,'#connection').textContent.includes('재연결'),'host disconnected');
    const beforeReconnect=app.audioRequests.length;net.sockets[0].connect();
    await until(()=>query(app,'#connection').textContent.includes('온라인'),'host resumed');await settled(app);
    assert.equal(app.audioRequests.filter(src=>src.includes('/success.mp3')).length,1,'Reconnect must not sound the old success again.');
    assert.deepEqual(app.audioRequests.slice(beforeReconnect),[],'The same music resumes its existing owner on reconnect.');
    await click(app,'.choices [data-choice="risk"]');const secondPreview=query(app,'#preview-dialog').innerHTML;
    peer.disconnect();
    await until(()=>app.doc.querySelector(`[data-opening-defer="${peerCredentials.playerId}"]`),'host defer button after disconnect');
    assert.equal(query(app,'#preview-dialog').open,true);assert.equal(query(app,'#preview-dialog').innerHTML,secondPreview,'Presence changes do not invalidate my personal choice.');
    await click(app,'#preview-dialog [data-close="preview-dialog"]');await choose(app,'safe');
    await click(app,`[data-opening-defer="${peerCredentials.playerId}"]`);
    assert.match(query(app,'#info-dialog').textContent,/준비 보너스를 얻지는 않습니다/);
    await click(app,'[data-action="opening-defer-confirm"]');
    assert.ok(query(app,'.meeting-accounts').textContent.includes(OPENINGS[story.id].professions[story.classes[1].id].deferred));
    assert.equal(app.doc.querySelector('[data-opening-defer]'),null);assert.equal(net.rolls,2);
    assert.ok(!app.doc.body.textContent.includes(OPENINGS[story.id].professions[story.classes[1].id].role.secret));
    await click(app,'[data-action="opening-main"]');assert.ok(app.doc.querySelector('.turn-pill'));
    assert.deepEqual(app.errors,[]);
  }finally{await net.close();app?.close();}
});

test('a slower online reader retains the first shared scene after a peer advances, and can reread the same meeting after restoring the save',async()=>{
  const net=await networkHarness();let app,restored;
  try{
    const fast=await net.peer(),owner=ok(await ack(fast,'table:create',{campaignId:story.id,name:'먼저 온 동료',classId:story.classes[0].id}));
    app=await openApp({network:net});
    await click(app,'[data-action="join"]');input(app,'#join-code',owner.code);input(app,'#player-name','천천히 읽는 동료');await submit(app,'#entry-form');
    await change(app,'#lobby-class',story.classes[1].id);
    const reader=JSON.parse(app.w.sessionStorage.getItem('chronicle-v14-online')),slow=net.sockets.at(-1);
    ok(await ack(fast,'table:start',{openingMode:'separate'}));
    await until(()=>app.doc.querySelector('.opening-story'),'private opening reaches the reader');
    for(let i=0;i<2;i++){
      const state=ok(await ack(fast,'table:sync')).state;
      ok(await ack(fast,'table:act',{choiceId:'safe',revision:state.game.actionRevision,requestId:`early-arrival-${i}`}));
    }
    await choose(app);await choose(app);
    assert.ok(app.doc.querySelector('[data-action="opening-meeting"]'));
    const personalReceipt=query(app,'.last-result>p').textContent;
    const before=ok(await ack(fast,'table:sync')).state;
    assert.equal(before.game.activePlayerId,owner.playerId);
    const nextState=once(slow,'table:state',{signal:AbortSignal.timeout(3500)});
    ok(await ack(fast,'table:act',{choiceId:'question',revision:before.game.actionRevision,requestId:'first-main-choice'}));
    const [advanced]=await nextState;await settled(app);
    assert.notEqual(advanced.game.scene.id,story.start,'The peer must actually leave the initial common scene.');
    assert.equal(query(app,'.last-result>p').textContent,personalReceipt,'The still-open private receipt remains readable during peer actions.');
    await click(app,'[data-action="opening-meeting"]');
    const start=query(app,'.meeting-story [data-meeting-start]');
    assert.equal(start.dataset.meetingStart,story.start);
    assert.equal(start.querySelector('h2').textContent,story.nodes[story.start].title);
    assert.equal(start.querySelector('.meeting-start-location').textContent,story.nodes[story.start].location);
    assert.equal(start.querySelector('.eyebrow').textContent,'우리가 함께 시작한 장면');
    assert.deepEqual([...start.querySelectorAll('.meeting-start-prose>p')].map(p=>p.textContent),OPENINGS[story.id].meeting.startText.group);
    assert.equal(start.querySelector('[data-choice]'),null,'The preserved introduction cannot execute an obsolete choice.');
    assert.match(query(app,'[data-action="opening-main"]').textContent,/지금 이어지는 장면으로/);
    assert.deepEqual([...app.doc.querySelectorAll('.meeting-accounts>p')].map(p=>p.textContent),advanced.game.opening.meeting.text);
    const participants=[{id:owner.playerId,classId:story.classes[0].id},{id:reader.playerId,classId:story.classes[1].id}];
    assertNoOtherOpening(app,null,participants);
    await click(app,'[data-action="opening-main"]');
    assert.equal(query(app,'#scene-title').textContent,advanced.game.scene.title);
    assert.equal(query(app,'.meeting-notebook').open,false);
    await click(app,'.meeting-notebook>summary');
    assert.equal(query(app,'.meeting-notebook').open,true);
    assert.deepEqual([...app.doc.querySelectorAll('.meeting-notebook .meeting-start-prose>p')].map(p=>p.textContent),OPENINGS[story.id].meeting.startText.group);
    const portable=ok(await ack(fast,'table:export')).save;
    restored=await openApp({save:envelope(portable.game)});await resume(restored);
    assert.equal(query(restored,'#scene-title').textContent,advanced.game.scene.title);
    await click(restored,'.meeting-notebook>summary');
    assert.deepEqual([...restored.doc.querySelectorAll('.meeting-notebook .meeting-start-prose>p')].map(p=>p.textContent),OPENINGS[story.id].meeting.startText.group);
    assert.deepEqual([...restored.doc.querySelectorAll('.meeting-notebook .meeting-accounts>p')].map(p=>p.textContent),advanced.game.opening.meeting.text);
    assertNoOtherOpening(restored,null,participants);
    assert.deepEqual(app.errors,[]);assert.deepEqual(restored.errors,[]);
  }finally{await net.close();app?.close();restored?.close();}
});
