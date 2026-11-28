import {finishNetworkOpenings} from '../tests-v22/helpers.mjs';
/** Real app/client/engine + Socket.IO. Timers/Canvas are controlled only for presentation; not visual QA. */
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
async function openApp({save=null,network=null,die=12,canvas=false,motion='auto',osReduced=false,motionSupport=true}={}){
  const errors=[],audioRequests=[],frames=new Map(),battleTimers=new Map(),stageScrolls=[];let time=0,id=0,entropy=0;
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message));console.on('error',(...args)=>errors.push(args.map(String).join(' ')));
  const dom=new JSDOM(html,{url:network?.url||'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console}),w=dom.window;
  w.addEventListener('error',event=>errors.push(event.error?.message||event.message));w.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  const realSetTimeout=w.setTimeout.bind(w),realClearTimeout=w.clearTimeout.bind(w);let battleTimerId=100000;
  w.setTimeout=(fn,delay,...args)=>{if(delay>=180&&delay<=1200){const key=++battleTimerId;battleTimers.set(key,()=>fn(...args));return key;}return realSetTimeout(fn,delay,...args);};
  w.clearTimeout=key=>{if(!battleTimers.delete(key))realClearTimeout(key);};
  if(motionSupport)w.Element.prototype.animate=()=>({cancel(){}});
  w.Element.prototype.scrollIntoView=function(options){if(this.id==='battle-stage')stageScrolls.push({options,event:this.dataset.battleEvent||null,health:this.querySelector('[data-battle-enemy-hp]')?.value});};
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
  return {w,doc:w.document,errors,audioRequests,frames,battleTimers,stageScrolls,stepBattle(){const [id,fn]=battleTimers.entries().next().value||[];if(fn){battleTimers.delete(id);fn();}},get entropy(){return entropy;},
    step(ms){time+=ms;for(const [key,fn] of [...frames])if(frames.delete(key))fn(time);},
    close(){w.dispatchEvent(new w.Event('beforeunload'));w.close();}};
}
async function resume(app){await click(app,'[data-action="resume"]');await click(app,'[data-action="resume-local"]');}
async function act(app,id){await click(app,`.choices [data-choice="${id}"]`);await click(app,'[data-action="confirm-action"]');}
async function revealAndContinue(app){await click(app,'[data-dice-control="skip"]');await click(app,'[data-dice-control="continue"]');}

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

function combatGame(count=2,{enemyHealth=null,health=3}={}){
  const game=createGame(story,people(count)),node=Object.values(story.nodes).find(node=>node.encounter);
  game.nodeId=node.id;game.visited=[story.start,node.id];game.players.forEach(p=>p.health=health);startCombat(game,story);
  if(enemyHealth!==null)game.combat.enemyHealth=enemyHealth;
  return game;
}
async function finishBattle(app){
  let steps=0;
  while(app.doc.body.classList.contains('battle-presenting')&&steps++<100){app.stepBattle();await pause();}
  assert.ok(steps<100,'Presentation must always complete.');await settle(app);
}

test('real local action keeps before HP on the battlefield until the impact and blocks a second action',async()=>{
  const game=combatGame(2),app=await openApp({save:envelope(game)});try{
    await resume(app);assert.ok(query(app,'.battle-layout'));assert.equal(app.doc.querySelector('.scene-visual,.story-paper'),null);
    assert.equal(app.doc.querySelectorAll('[data-fighter-id]').length,2);
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    assert.equal(stored(app).game.combat.enemyHealth,8);assert.equal(query(app,'[data-battle-enemy-hp]').value,10);
    assert.equal(app.stageScrolls.length,1);assert.equal(app.stageScrolls[0].options.block,'center');assert.equal(app.stageScrolls[0].options.behavior,'instant');assert.equal(app.stageScrolls[0].event,null,'The stage is brought into view before the first attack event.');assert.equal(app.stageScrolls[0].health,10,'The focus change precedes the committed impact.');
    assert.equal(query(app,'#battle-stage').dataset.battleEvent,'attack');assert.equal(query(app,'[data-combat="basic"]').disabled,true);
    query(app,'[data-combat="basic"]').click();await settle(app);assert.equal(stored(app).game.turn,1);
    app.stepBattle();assert.equal(query(app,'[data-battle-enemy-hp]').value,8);
    await finishBattle(app);assert.equal(query(app,'[data-combat="basic"]').disabled,false);
    assert.equal(query(app,'[data-battle-turn]').textContent,'당신의 차례');assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('D20 judgement is shown once before the attack, and casualty prose waits for the battlefield',async()=>{
  const game=combatGame(1,{health:1}),app=await openApp({save:envelope(game),canvas:true,die:1});try{
    await resume(app);await click(app,'#sound-toggle');
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    assert.equal(stored(app).game.combat,null);assert.equal(query(app,'#dice-dialog').dataset.phase,'rolling');
    assert.equal(query(app,'[data-fighter-hp]').value,1);assert.equal(query(app,'#battle-stage').dataset.battleEvent,undefined);
    await click(app,'[data-dice-control="skip"]');assert.equal(query(app,'.dice-final-grade').textContent,'대실패');
    assert.ok(!query(app,'.dice-final-story').textContent.includes('전원 사망'));assert.ok(!app.audioRequests.some(src=>src.includes('/battle-defeat.mp3')));
    await click(app,'[data-dice-control="continue"]');assert.equal(query(app,'#battle-stage').dataset.battleEvent,'attack');
    app.stepBattle();assert.equal(query(app,'[data-fighter-hp]').value,0);assert.equal(query(app,'#battle-stage').dataset.battleEvent,'fumble');
    app.stepBattle();assert.equal(query(app,'#battle-stage').dataset.battleEvent,'death');
    app.stepBattle();assert.equal(query(app,'#battle-stage').dataset.battleEvent,'defeat');assert.equal(query(app,'[data-battle-outcome]').hidden,false);
    assert.equal(app.audioRequests.filter(src=>src.includes('/dice.mp3')).length,1);assert.equal(app.audioRequests.filter(src=>src.includes('/battle-defeat.mp3')).length,1);
    assert.ok(!app.audioRequests.some(src=>src.includes('/battle-hit.mp3')||src.includes('/victory.mp3')));
    await finishBattle(app);assert.equal(app.doc.querySelector('.battle-screen'),null);assert.ok(app.doc.querySelector('.ending-card'));assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('victory holds its enemy sprite at zero HP before the original story returns, with no repeat on redraw',async()=>{
  const game=combatGame(1,{enemyHealth:1}),app=await openApp({save:envelope(game),die:20});try{
    await resume(app);await click(app,'#sound-toggle');
    await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');
    assert.equal(stored(app).game.combat,null);assert.ok(app.doc.querySelector('.battle-enemy-sprite'));
    app.stepBattle();assert.equal(query(app,'[data-battle-enemy-hp]').value,0);
    while(query(app,'#battle-stage').dataset.battleEvent!=='victory'){app.stepBattle();await pause();}
    assert.ok(query(app,'[data-battle-enemy]').classList.contains('is-defeated'));
    await finishBattle(app);assert.equal(app.doc.querySelector('.battle-screen'),null);assert.ok(app.doc.querySelector('.story-paper'));
    const count=app.audioRequests.filter(src=>src.includes('/battle-')).length;
    await click(app,'[data-tab="clues"]');assert.equal(app.audioRequests.filter(src=>src.includes('/battle-')).length,count);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
});

test('skip or hiding the page promptly commits the saved view without another roll or a stranded input lock',async()=>{
  for(const method of ['skip','hidden']){
    const game=combatGame(2),app=await openApp({save:envelope(game)});try{
      await resume(app);await click(app,'[data-combat="basic"]');await click(app,'[data-action="confirm-action"]');const entropy=app.entropy;
      if(method==='skip')await click(app,'[data-battle-skip]');
      else {Object.defineProperty(app.doc,'hidden',{configurable:true,value:true});app.doc.dispatchEvent(new app.w.Event('visibilitychange'));await settle(app);}
      assert.equal(app.doc.body.classList.contains('battle-presenting'),false);assert.equal(query(app,'[data-battle-enemy-hp]').value,8);
      assert.equal(query(app,'[data-combat="basic"]').disabled,false);assert.equal(app.entropy,entropy);assert.deepEqual(app.errors,[]);
    }finally{app.close();}
  }
});

test('reduced motion applies an automatic guard once with its own cue; restored combat never replays it',async()=>{
  const game=combatGame(2),app=await openApp({save:envelope(game),motion:'reduce'});let save;
  try{
    await resume(app);await click(app,'#sound-toggle');assert.ok(app.doc.querySelector('.battle-screen.reduce-motion'));
    const before=app.entropy;await click(app,'[data-combat="ability"]');await click(app,'[data-action="confirm-action"]');
    assert.equal(app.doc.body.classList.contains('battle-presenting'),false);assert.equal(app.entropy,before);
    assert.equal(app.stageScrolls.length,0,'Reduced motion does not add a new automatic scroll.');
    assert.equal(app.audioRequests.filter(src=>src.includes('/battle-shield.mp3')).length,1);assert.equal(app.audioRequests.filter(src=>src.includes('/battle-hit.mp3')).length,0);
    save=stored(app);assert.deepEqual(app.errors,[]);
  }finally{app.close();}
  const resumed=await openApp({save});try{
    await resume(resumed);await click(resumed,'#sound-toggle');assert.equal(resumed.doc.body.classList.contains('battle-presenting'),false);
    assert.equal(resumed.audioRequests.filter(src=>src.includes('/battle-')).length,0);assert.equal(resumed.entropy,0);assert.deepEqual(resumed.errors,[]);
  }finally{resumed.close();}
});

test('four online seats queue attacks and an automatic skill in arrival order, then reconnect silently',async()=>{
  const net=await networkHarness();let app;try{
    const first=await net.peer(),owner=ok(await ack(first,'table:create',{campaignId:story.id,name:'첫 동료',classId:story.classes[0].id}));
    const second=await net.peer();ok(await ack(second,'table:join',{code:owner.code,name:'둘째 동료',classId:story.classes[2].id}));
    const third=await net.peer();ok(await ack(third,'table:join',{code:owner.code,name:'셋째 동료',classId:story.classes[1].id}));
    app=await openApp({network:net});await click(app,'[data-action="join"]');input(app,'#join-code',owner.code);input(app,'#player-name','지켜보는 동료');await submit(app);
    const saved=combatGame(4);[saved.players[1].classId,saved.players[2].classId]=[saved.players[2].classId,saved.players[1].classId];
    ok(await ack(first,'table:import',{save:{game:saved}}));await until(()=>app.doc.querySelector('.battle-screen'),'restored battlefield');await click(app,'#sound-toggle');net.setDie(12);
    const initial=ok(await ack(first,'table:sync')).state;
    ok(await ack(first,'table:act',{combatAction:'basic',revision:initial.game.actionRevision,requestId:'attack-one'}));await until(()=>app.doc.body.classList.contains('battle-presenting'),'first attack animation');
    const beforeSecond=ok(await ack(second,'table:sync')).state;
    ok(await ack(second,'table:act',{combatAction:'ability',revision:beforeSecond.game.actionRevision,requestId:'automatic-two'}));
    const beforeThird=ok(await ack(third,'table:sync')).state;
    ok(await ack(third,'table:act',{combatAction:'basic',revision:beforeThird.game.actionRevision,requestId:'attack-three'}));
    ok(await ack(first,'table:chat',{text:'자동 기술도 차례대로 확인해요'}));await pause();await pause();
    assert.equal(query(app,'[data-battle-enemy-hp]').value,18);assert.ok(query(app,'[data-battle-caption]').textContent.includes('첫 동료'));
    await finishBattle(app);const final=ok(await ack(third,'table:sync')).state;
    assert.equal(query(app,'[data-battle-enemy-hp]').value,final.game.combat.enemy.health);assert.equal(net.rolls,2);
    assert.equal(app.audioRequests.filter(src=>src.includes('/battle-swing.mp3')).length,2);assert.equal(app.audioRequests.filter(src=>src.includes('/battle-skill.mp3')).length,1);
    const cues=app.audioRequests.filter(src=>/\/battle-(swing|skill)\.mp3/.test(src)).map(src=>src.match(/battle-(swing|skill)/)[1]);assert.deepEqual(cues,['swing','skill','swing']);
    const count=app.audioRequests.filter(src=>src.includes('/battle-')).length;
    const own=net.sockets.at(-1);own.disconnect();await until(()=>query(app,'#connection').textContent.includes('재연결'),'disconnect');own.connect();await until(()=>query(app,'#connection').textContent.includes('온라인'),'reconnect');await settle(app);
    assert.equal(app.doc.body.classList.contains('battle-presenting'),false);assert.equal(app.audioRequests.filter(src=>src.includes('/battle-')).length,count);assert.deepEqual(app.errors,[]);
  }finally{await net.close();app?.close();}
});

