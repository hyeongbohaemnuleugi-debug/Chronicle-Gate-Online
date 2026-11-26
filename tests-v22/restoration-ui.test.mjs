/** Real app/client/engine save import. The canvas/audio surfaces are instrumented;
 * this checks receipts and ownership, not browser visual appearance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {build} from 'esbuild';
import {LEGACY_CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState,applyAction} from '../public/game/engine.js';
import {SCENE_SOUNDS} from '../public/game/scene-sound.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const built=await build({entryPoints:[new URL('../public/game/app.js',import.meta.url).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome100',logLevel:'silent'});
const story=LEGACY_CAMPAIGNS.find(c=>c.id==='last-train'),key='chronicle-v14-local';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(fn,label){const untilAt=Date.now()+3500;while(Date.now()<untilAt){if(fn())return;await tick();}assert.fail(`Timed out: ${label}`);}
const q=(app,selector)=>{const node=app.doc.querySelector(selector);assert.ok(node,`Missing ${selector}`);return node;};
async function click(app,selector){const node=q(app,selector);assert.ok(!node.disabled);node.click();await tick();await until(()=>!app.doc.body.classList.contains('is-busy'),'request settles');await tick();}
function sourceSave(){
 const player={id:'return-reader',name:'돌아온 독자',classId:story.classes[0].id};
 let game=createStoryState(story,[player]);
 for(const payload of [{detailId:'read-ticket'},{choiceId:'question'}]){
  const r=applyAction(game,story,player.id,{...payload,revision:game.revision},{roll:20});assert.equal(r.ok,true,r.error);game=r.game;
 }
 assert.deepEqual(game.inventory,['ticket-note']);assert.equal(game.nodeId,'carriage');
 return {format:'chronicle-gate-v22',game};
}
async function openApp(save){
 const errors=[],audio=[],frames=new Map();let id=0,entropy=0;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
 w.addEventListener('error',e=>errors.push(e.error?.message||e.message));
 w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 w.scrollTo=()=>{};w.ResizeObserver=class{observe(){}disconnect(){}};
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.CanvasRenderingContext2D=class{};
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
 Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(array){entropy++;array.fill(13);return array;}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Image=class{constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}set src(value){w.queueMicrotask(()=>this.onload?.());}};
 w.Audio=class extends w.EventTarget{constructor(src){super();this.src=src;this.dataset={};this.volume=0;this.currentTime=0;this.duration=30;audio.push(src);}play(){if(!this.loop)w.queueMicrotask(()=>this.dispatchEvent(new w.Event('ended')));return Promise.resolve();}pause(){}load(){}removeAttribute(){this.src='';}};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.localStorage.setItem(key,JSON.stringify({schema:save.game.schema,campaignId:save.game.campaignId,players:save.game.players,game:save.game,messages:[]}));
 w.eval(built.outputFiles[0].text);
 await until(()=>w.document.querySelectorAll('.campaign-card').length>=7,'catalog');
 return {w,doc:w.document,errors,audio,get entropy(){return entropy;},stored(){return JSON.parse(w.localStorage.getItem(key));},close(){w.dispatchEvent(new w.Event('beforeunload'));w.close();}};
}
const effectNames=['dice','success','mixed','failure','clue','reveal','transition','attack','ability','enemy','victory','death','revive',...SCENE_SOUNDS];
const effects=urls=>urls.filter(src=>effectNames.some(name=>src.includes(`/audio/${name}.mp3`)));

test('importing an older rolled local save is silent, preserves the saved state, and the next genuine roll still animates',async()=>{
 const saved=sourceSave(),app=await openApp(saved);
 try{
  await click(app,'[data-action="resume"]');await click(app,'[data-action="resume-local"]');await click(app,'#sound-toggle');
  assert.equal(q(app,'#scene-title').textContent,story.nodes.carriage.title);
  assert.equal(Boolean(app.doc.querySelector('#dice-dialog')?.open),false);
  await click(app,'.choices [data-choice="share-meal"]');await click(app,'[data-action="confirm-action"]');
  assert.equal(app.stored().game.nodeId,'dining');
  const beforeEffects=effects(app.audio).length,beforeEntropy=app.entropy;
  const input=q(app,'#save-file');
  Object.defineProperty(input,'files',{configurable:true,value:[{size:JSON.stringify(saved).length,text:async()=>JSON.stringify(saved)}]});
  input.dispatchEvent(new app.w.Event('change',{bubbles:true}));
  await until(()=>app.stored().game.nodeId==='carriage','old scene restored');await tick();await tick();
  assert.equal(Boolean(app.doc.querySelector('#dice-dialog')?.open),false,'A saved roll must not be presented as a fresh roll.');
  assert.equal(effects(app.audio).length,beforeEffects,'Import must not replay either outcome or contextual effects.');
  assert.equal(app.entropy,beforeEntropy,'Import does not roll new dice.');
  assert.equal(q(app,'#scene-title').textContent,story.nodes.carriage.title);
  assert.deepEqual(app.stored().game.inventory,saved.game.inventory);
  assert.equal(app.stored().game.turn,saved.game.turn);
  assert.equal(app.stored().game.lastResult.roll,20);
  assert.equal(app.stored().restored,undefined,'The presentation marker is ephemeral and is not saved.');
  await click(app,'.choices [data-choice="sensor-check"]');await click(app,'[data-action="confirm-action"]');
  assert.equal(q(app,'#dice-dialog').dataset.phase,'rolling');
  assert.equal(app.entropy,beforeEntropy+1);assert.equal(app.stored().game.turn,saved.game.turn+1);
  assert.equal(app.stored().game.lastResult.roll,14);
  assert.equal(app.audio.filter(src=>src.includes('/dice.mp3')).length,1);
  await click(app,'[data-dice-control="skip"]');await click(app,'[data-dice-control="continue"]');
  assert.equal(q(app,'#scene-title').textContent,story.nodes.baggage.title);
  assert.equal(app.stored().game.nodeId,'baggage');assert.deepEqual(app.errors,[]);
 }finally{app.close();}
});
