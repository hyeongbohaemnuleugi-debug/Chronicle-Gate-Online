import {finishNetworkOpenings} from '../tests-v22/helpers.mjs';
/** Real app/client/engine with deterministic canvas time; this is not browser visual QA. */
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
const bundle=await build({entryPoints:[new URL('../public/game/app.js',import.meta.url).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome100',logLevel:'silent'});
const code=bundle.outputFiles[0].text,story=CAMPAIGNS[0],saveKey='chronicle-v14-local';
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(fn,label='condition'){const end=Date.now()+3500;while(Date.now()<end){if(fn())return;await pause();}assert.fail(`Timed out: ${label}`);}
const query=(app,selector)=>{const node=app.doc.querySelector(selector);assert.ok(node,`Missing ${selector}`);return node;};
async function settle(app){await pause();await until(()=>!app.doc.body.classList.contains('is-busy'),'request settled');await pause();}
async function click(app,selector){const node=query(app,selector);assert.ok(!node.disabled,`Disabled ${selector}`);node.click();await settle(app);}
function input(app,selector,value){const node=query(app,selector);node.value=value;node.dispatchEvent(new app.w.Event('input',{bubbles:true}));}
async function submit(app){query(app,'#entry-form').dispatchEvent(new app.w.Event('submit',{bubbles:true,cancelable:true}));await settle(app);}
const people=(count=2)=>story.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id,connected:true}));
const envelope=game=>({schema:game.schema,campaignId:game.campaignId,players:game.players.map(({id,name,classId})=>({id,name,classId,connected:true})),game,messages:[]});
const stored=app=>JSON.parse(app.w.localStorage.getItem(saveKey));
const ok=r=>{assert.equal(r?.ok,true,r?.error);return r;};
async function openApp({save=null,network=null,die=14,canvas=true,motion='auto',osReduced=false}={}){
  const errors=[],audioRequests=[],frames=new Map();let time=0,id=0,entropy=0;
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));console.on('error',(...args)=>errors.push(args.map(String).join(' ')));
  const dom=new JSDOM(html,{url:network?.url||'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console}),w=dom.window;
  w.addEventListener('error',event=>errors.push(event.error?.message||event.message));w.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  w.scrollTo=()=>{};w.ResizeObserver=class{observe(){}disconnect(){}};
  Object.defineProperty(w.performance,'now',{value:()=>time});
  w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
  w.matchMedia=()=>({matches:osReduced,addEventListener(){},removeEventListener(){}});
  if(canvas){w.CanvasRenderingContext2D=class{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});}
  Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(array){entropy++;array.fill(die-1);return array;}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.Image=class{constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}set src(value){this._src=value;w.queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
  w.Audio=class extends w.EventTarget{constructor(src){super();this.src=src;this.dataset={};this.paused=true;this.volume=0;this.currentTime=0;this.duration=30;audioRequests.push(src);}play(){this.paused=false;if(!this.loop)w.queueMicrotask(()=>this.dispatchEvent(new w.Event('ended')));return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(name){if(name==='src')this.src='';}};
  w.URL.createObjectURL=()=> 'blob:download';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
  if(network)w.io=network.connect;if(save)w.localStorage.setItem(saveKey,JSON.stringify(save));w.localStorage.setItem('cg-v20-dice-motion',motion);
  w.eval(code);await until(()=>w.document.querySelectorAll('.campaign-card').length===9,'catalog');assert.deepEqual(errors,[]);
  return {w,doc:w.document,errors,audioRequests,frames,get entropy(){return entropy;},
    step(ms){time+=ms;for(const [key,fn] of [...frames])if(frames.delete(key))fn(time);},
    close(){w.dispatchEvent(new w.Event('beforeunload'));w.close();}};
}
async function resume(app){await click(app,'[data-action="resume"]');await click(app,'[data-action="resume-local"]');}
async function act(app,id){await click(app,`.choices [data-choice="${id}"]`);await click(app,'[data-action="confirm-action"]');}
async function revealAndContinue(app){await click(app,'[data-dice-control="skip"]');await click(app,'[data-dice-control="continue"]');}

test('a local roll commits once, withholds the next prose and reveals the exact face before following the next seat',async()=>{
  const app=await openApp({save:envelope(createGame(story,people()))});try{
    await resume(app);await click(app,'#sound-toggle');const before=stored(app).game,oldTitle=query(app,'#scene-title').textContent;
    const entropy=app.entropy;await act(app,'question');const after=stored(app).game;
    assert.equal(after.turn,before.turn+1);assert.equal(app.entropy,entropy+1);
    assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');assert.equal(query(app,'#scene-title').textContent,oldTitle);
    assert.ok(!app.doc.body.textContent.includes(after.lastResult.text),'The new receipt must not be present beneath the rolling die.');
    assert.equal(app.doc.querySelector('.dice-final-equation'),null);assert.equal(app.doc.querySelector('.dice-final-grade'),null);
    query(app,'.choices [data-choice="question"]').click();await settle(app);assert.equal(stored(app).game.turn,after.turn,'Old controls cannot send a second action through the modal.');
    app.step(850);assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');app.step(850);
    assert.equal(query(app,'canvas').getAttribute('aria-label'),`D20 ${after.lastResult.roll}`);
    assert.ok(query(app,'.dice-final-equation').textContent.includes(`= ${after.lastResult.total} · 목표 ${after.lastResult.dc}`));
    assert.equal(query(app,'.dice-final-story').textContent,after.lastResult.narrativeText||after.lastResult.text);
    assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,1);
    await click(app,'[data-dice-control="continue"]');
    assert.equal(query(app,'#scene-title').textContent,story.nodes[after.nodeId].title);assert.equal(query(app,'#dice-dialog').textContent,'');
    assert.equal(stored(app).game.turn,after.turn);assert.equal(app.entropy,entropy+1);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('safe observation, reduced motion, missing canvas and a restored receipt never fabricate an animated reroll',async()=>{
  const initial=createGame(story,people(1));
  for(const options of [{motion:'reduce'},{osReduced:true},{canvas:false}]){
    const app=await openApp({save:envelope(initial),...options});try{
      await resume(app);const entropy=app.entropy;
      await click(app,'[data-detail]');await click(app,'[data-action="confirm-action"]');
      assert.equal(app.entropy,entropy);assert.equal(app.doc.querySelector('#dice-dialog'),null);
      await act(app,'question');assert.equal(app.entropy,entropy+1);assert.equal(app.doc.querySelector('#dice-dialog'),null);
      assert.equal(query(app,'.result-roll-stamp').textContent,'D20 14');assert.deepEqual(app.errors,[]);
      const reopened=await openApp({save:stored(app)});try{await resume(reopened);assert.equal(reopened.doc.querySelector('#dice-dialog'),null);}finally{reopened.close();}
    }finally{app.close();}
  }
});

test('the last private roll stays private, then leads through its receipt and the actual meeting',async()=>{
  let game=createGame(story,people(),{openingMode:'separate'});
  for(let i=0;i<2;i++)game=ok(applyAction(game,story,'p0',{choiceId:'safe',revision:viewGame(game,story,'p0').actionRevision})).game;
  game=ok(applyAction(game,story,'p1',{choiceId:'safe',revision:viewGame(game,story,'p1').actionRevision})).game;
  const app=await openApp({save:envelope(game),die:20});try{
    await resume(app);await click(app,'[data-action="opening-receive"]');await act(app,'risk');
    const joined=stored(app).game,personal=viewGame(joined,story,'p1').opening.mine.history.at(-1);
    assert.equal(joined.phase,'playing');assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');
    assert.ok(!app.doc.body.textContent.includes(personal.text));assert.equal(app.doc.querySelector('.meeting-accounts'),null);
    assert.ok(!app.doc.body.textContent.includes(OPENINGS[story.id].professions[story.classes[0].id].role.secret));
    await click(app,'[data-dice-control="skip"]');assert.equal(query(app,'.dice-final-story').textContent,personal.text);
    await click(app,'[data-dice-control="continue"]');assert.equal(query(app,'.last-result>p').textContent,personal.text);
    assert.ok(app.doc.querySelector('[data-action="opening-meeting"]'));
    await click(app,'[data-action="opening-meeting"]');assert.equal(app.doc.querySelectorAll('.meeting-accounts>p').length,3);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('identical real combat receipts get one die each, while revealing a card does not replay the preceding roll',async()=>{
  const persons=people(4).map(p=>({...p,name:'같은 이름',classId:story.classes[0].id}));
  const game=createGame(story,persons),node=Object.values(story.nodes).find(n=>n.encounter);
  game.nodeId=node.id;game.visited=[story.start,node.id];startCombat(game,story);
  const app=await openApp({save:envelope(game),die:12});try{
    await resume(app);await click(app,'#sound-toggle');const receipts=[];
    for(let i=0;i<2;i++){
      await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
      assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');receipts.push(stored(app).game.lastResult);await revealAndContinue(app);
    }
    assert.deepEqual(receipts[0],receipts[1]);assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,2);
    assert.equal(app.audioRequests.filter(src=>src.includes('/attack.mp3')).length,2);
    await click(app,'[data-action="secret"]');await click(app,'[data-action="open-secret"]');await click(app,'[data-action="reveal"]');
    assert.equal(query(app,'#dice-dialog').open,false);assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,2);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('a lethal roll keeps death private until reveal, then grief and death override the ordinary fumble cue exactly once',async()=>{
  const game=createGame(story,people());game.players[0].health=1;
  const app=await openApp({save:envelope(game),die:1});try{
    await resume(app);await click(app,'#sound-toggle');const before=app.audioRequests.length;
    await act(app,'group-hold-door');assert.equal(stored(app).game.players[0].life,'dead');
    assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');
    assert.ok(!app.audioRequests.slice(before).some(src=>src.includes('-grief.mp3')||src.includes('/death.mp3')));
    await click(app,'[data-dice-control="skip"]');
    assert.equal(query(app,'.dice-final-grade').textContent,'대실패');assert.equal(query(app,'canvas').getAttribute('aria-label'),'D20 1');
    const after=app.audioRequests.slice(before);assert.ok(after.some(src=>src.includes('-grief.mp3')));
    assert.equal(after.filter(src=>src.includes('/death.mp3')).length,1);
    assert.ok(!after.some(src=>/\/(success|failure|victory)\.mp3/.test(src)));
    await click(app,'[data-dice-control="continue"]');assert.equal(app.audioRequests.filter(src=>src.includes('/death.mp3')).length,1);
    assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>error?reject(error):resolve(result)));
async function networkHarness(){
  const server=http.createServer((_request,response)=>response.end('test')),io=new Server(server,{serveClient:false}),sockets=[];let rolls=0,die=20;
  const storageDir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v20-dice-ui-'));
  const service=attachTableService(io,{storageDir,roll:()=>{rolls++;return die;}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}`;
  const socket=(namespace='/table',options={})=>{const client=connect(url+namespace,{...options,transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false});sockets.push(client);return client;};
  return {url,connect:socket,sockets,service,setDie(value){die=value;},get rolls(){return rolls;},async peer(){const client=socket();client.connect();await once(client,'connect',{signal:AbortSignal.timeout(3500)});return client;},async close(){service.close();for(const client of sockets)client.disconnect();await new Promise(resolve=>io.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(storageDir,{recursive:true,force:true});}};
}

test('four online players preserve three shared rolls in order, ignore reveal redraws, and never replay on reconnect',async()=>{
  const net=await networkHarness();let app;try{
    const first=await net.peer(),a=ok(await ack(first,'table:create',{campaignId:story.id,name:'먼저 행동한 동료',classId:story.classes[0].id}));
    const second=await net.peer();ok(await ack(second,'table:join',{code:a.code,name:'다음 동료',classId:story.classes[1].id}));
    const third=await net.peer();ok(await ack(third,'table:join',{code:a.code,name:'세 번째 동료',classId:story.classes[2].id}));
    app=await openApp({network:net});await click(app,'[data-action="join"]');input(app,'#join-code',a.code);input(app,'#player-name','주사위를 보는 동료');await submit(app);
    ok(await ack(first,'table:start',{storyLength:'basic'}));await finishNetworkOpenings(net.sockets,ack);
    await until(()=>app.doc.querySelector('[data-action="opening-meeting"], [data-action="opening-main"]'),'private receipt or shared meeting');
    if(app.doc.querySelector('[data-action="opening-meeting"]'))await click(app,'[data-action="opening-meeting"]');
    await click(app,'[data-action="opening-main"]');
    await click(app,'#sound-toggle');
    const initial=ok(await ack(first,'table:sync')).state;
    ok(await ack(first,'table:act',{choiceId:'question',revision:initial.game.actionRevision,requestId:'first-roll'}));
    await until(()=>app.doc.querySelector('#dice-dialog')?.open,'first shared roll');
    const afterA=ok(await ack(second,'table:sync')).state;
    const choice=afterA.game.scene.choices.find(c=>!c.automatic);assert.ok(choice);
    ok(await ack(second,'table:act',{choiceId:choice.id,revision:afterA.game.actionRevision,requestId:'second-roll'}));
    const afterB=ok(await ack(second,'table:sync')).state;
    ok(await ack(second,'table:reveal',{revision:afterB.game.revision}));
    const beforeC=ok(await ack(third,'table:sync')).state,nextChoice=beforeC.game.scene.choices.find(c=>!c.automatic);assert.ok(nextChoice);
    ok(await ack(third,'table:act',{choiceId:nextChoice.id,revision:beforeC.game.actionRevision,requestId:'third-roll'}));
    const afterC=ok(await ack(third,'table:sync')).state;assert.equal(net.rolls,3);
    ok(await ack(first,'table:chat',{text:'세 사람의 선택을 차례로 읽어요'}));await pause();await pause();
    assert.equal(query(app,'.dice-actor').textContent,'먼저 행동한 동료의 행동');
    for(const receipt of [afterB.game.lastResult,afterC.game.lastResult])assert.ok(!app.doc.body.textContent.includes(receipt.text));
    await click(app,'[data-dice-control="skip"]');assert.equal(query(app,'.dice-final-story').textContent,afterA.game.lastResult.narrativeText||afterA.game.lastResult.text);
    await click(app,'[data-dice-control="continue"]');await until(()=>app.doc.querySelector('#dice-dialog')?.dataset.phase==='rolling','queued second shared roll');
    assert.equal(query(app,'.dice-actor').textContent,'다음 동료의 행동');assert.ok(!app.doc.body.textContent.includes(afterC.game.lastResult.text));
    await click(app,'[data-dice-control="skip"]');assert.equal(query(app,'.dice-final-story').textContent,afterB.game.lastResult.narrativeText||afterB.game.lastResult.text);
    await click(app,'[data-dice-control="continue"]');await until(()=>app.doc.querySelector('#dice-dialog')?.dataset.phase==='rolling','queued third shared roll');
    assert.equal(query(app,'.dice-actor').textContent,'세 번째 동료의 행동');
    await click(app,'[data-dice-control="skip"]');assert.equal(query(app,'.dice-final-story').textContent,afterC.game.lastResult.narrativeText||afterC.game.lastResult.text);
    await click(app,'[data-dice-control="continue"]');
    assert.equal(query(app,'#scene-title').textContent,afterC.game.scene.title);assert.equal(net.rolls,3);
    assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,3);
    const own=net.sockets.at(-1);own.disconnect();await until(()=>query(app,'#connection').textContent.includes('재연결'),'disconnected');own.connect();
    await until(()=>query(app,'#connection').textContent.includes('온라인'),'resumed');await settle(app);
    assert.equal(query(app,'#dice-dialog').open,false);assert.equal(net.rolls,3);assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,3);assert.deepEqual(app.errors,[]);
  }finally{await net.close();app?.close();}
});

test('a peer’s private dice and progress cannot open my die or reveal that private result',async()=>{
  const net=await networkHarness();let app;try{
    app=await openApp({network:net});await click(app,'[data-action="create"]');input(app,'#player-name','방장');await submit(app);
    const credentials=JSON.parse(app.w.sessionStorage.getItem('chronicle-v14-online'));
    const peer=await net.peer();ok(await ack(peer,'table:join',{code:credentials.code,name:'친구',classId:story.classes[1].id}));
    await until(()=>app.doc.querySelectorAll('.lobby-person').length===2,'peer joins');await click(app,'[data-action="start"]');
    const first=ok(await ack(peer,'table:sync')).state;ok(await ack(peer,'table:act',{choiceId:'risk',revision:first.game.actionRevision,requestId:'private-roll'}));
    const result=ok(await ack(peer,'table:sync')).state.game.lastResult;await pause();await pause();
    assert.equal(app.doc.querySelector('#dice-dialog'),null);assert.ok(!app.doc.body.textContent.includes(result.text));assert.equal(net.rolls,1);
    await act(app,'risk');assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');await revealAndContinue(app);
    assert.equal(net.rolls,2);assert.ok(!app.doc.body.textContent.includes(result.text));assert.deepEqual(app.errors,[]);
  }finally{await net.close();app?.close();}
});

for(const waitingAt of ['receipt','meeting'])test(`a main-story death received during the ${waitingAt} sounds only when that reader enters the main story`,async()=>{
  const net=await networkHarness();let app;try{
    const fast=await net.peer(),owner=ok(await ack(fast,'table:create',{campaignId:story.id,name:'먼저 읽는 동료',classId:story.classes[0].id}));
    app=await openApp({network:net});await click(app,'[data-action="join"]');input(app,'#join-code',owner.code);input(app,'#player-name','천천히 읽는 동료');await submit(app);
    ok(await ack(fast,'table:start',{openingMode:'separate'}));await until(()=>app.doc.querySelector('.opening-story'),'individual opening');
    await click(app,'#sound-toggle');
    for(let i=0;i<2;i++){const state=ok(await ack(fast,'table:sync')).state;ok(await ack(fast,'table:act',{choiceId:'safe',revision:state.game.actionRevision,requestId:`arrive-${i}`}));}
    await act(app,'safe');await act(app,'risk');await revealAndContinue(app);
    assert.ok(app.doc.querySelector('[data-action="opening-meeting"]'),'The reader keeps the last private receipt.');
    const personalText=query(app,'.last-result>p').textContent;
    if(waitingAt==='meeting')await click(app,'[data-action="opening-meeting"]');
    // Arrange the low-health server fixture only. The fatal authored choice,
    // dice, state broadcasting and both readers still use the real engine and sockets.
    net.service.rooms.get(owner.code).game.players[0].health=1;
    const before=app.audioRequests.length,initial=ok(await ack(fast,'table:sync')).state;net.setDie(1);
    ok(await ack(fast,'table:act',{choiceId:'group-hold-door',revision:initial.game.actionRevision,requestId:'lethal-main-action'}));
    const advanced=ok(await ack(fast,'table:sync')).state;assert.equal(advanced.game.players[0].life,'dead');await pause();await pause();
    assert.equal(query(app,'#dice-dialog').open,false,'The main roll cannot interrupt an earlier reading surface.');
    assert.ok(!app.audioRequests.slice(before).some(src=>src.includes('-grief.mp3')||src.includes('/death.mp3')),'No main-story loss cue may get ahead of the story being read.');
    if(waitingAt==='receipt'){
      assert.equal(query(app,'.last-result>p').textContent,personalText);
      await click(app,'[data-action="opening-meeting"]');
    }
    assert.ok(app.doc.querySelector('.meeting-accounts'));
    const mood=advanced.game.opening.meeting.startScene.mood;
    assert.ok(app.audioRequests.some(src=>src.includes(`/${story.id}-${mood}.mp3`)));
    assert.ok(!app.audioRequests.slice(before).some(src=>src.includes('-grief.mp3')||src.includes('/death.mp3')));
    await click(app,'[data-action="opening-main"]');
    assert.equal(query(app,'#scene-title').textContent,advanced.game.scene.title);
    assert.ok(app.audioRequests.slice(before).some(src=>src.includes('-grief.mp3')));
    assert.equal(app.audioRequests.filter(src=>src.includes('/death.mp3')).length,1,'The newly displayed result sounds once when entering the main story.');
    ok(await ack(fast,'table:chat',{text:'같이 이어가요'}));await pause();await pause();
    assert.equal(app.audioRequests.filter(src=>src.includes('/death.mp3')).length,1,'An unchanged receipt is not replayed after entry.');
    assert.deepEqual(app.errors,[]);
  }finally{await net.close();app?.close();}
});
