/** Actual app/client/engine with a deterministic media clock; no visual/listening claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState} from '../public/game/engine.js';
import {startCombat} from '../public/game/combat.js';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const bundle=await build({entryPoints:[new URL('../public/game/app.js',import.meta.url).pathname],bundle:true,write:false,format:'iife',platform:'browser',target:'chrome100',logLevel:'silent'});
const code=bundle.outputFiles[0].text;
const durations=JSON.parse(fs.readFileSync(new URL('../scripts/battle-audio-v23.json',import.meta.url),'utf8')).files;
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(fn,label){for(let i=0;i<100;i++){if(fn())return;await tick();}assert.fail(`Missing ${label}`);}
function savedGame(campaignId='last-train',{count=2,classIndex=0,health=3,enemyHealth=null}={}){
 const story=CAMPAIGNS.find(c=>c.id===campaignId),players=Array.from({length:count},(_,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:story.classes[(classIndex+i)%4].id,connected:true}));
 const game=createStoryState(story,players),node=Object.values(story.nodes).find(n=>n.encounter);
 game.nodeId=node.id;game.visited=[story.start,node.id];game.players.forEach(p=>p.health=health);startCombat(game,story);if(enemyHealth!==null)game.combat.enemyHealth=enemyHealth;
 return {schema:game.schema,campaignId:game.campaignId,players,game,messages:[]};
}
async function app({campaignId,seed={},die=12,motion='full',sound=true}={}){
 const errors=[],media=[],played=[],clock=new Map();let now=0,serial=0;
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://chronicle.test/?offline=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window,doc=w.document;
 w.setTimeout=(fn,ms=0,...args)=>{const id=++serial;clock.set(id,{at:now+Number(ms),fn:()=>fn(...args)});return id;};w.clearTimeout=id=>clock.delete(id);
 w.requestAnimationFrame=fn=>w.setTimeout(()=>fn(now),16);w.cancelAnimationFrame=w.clearTimeout;
 Object.defineProperty(w.performance,'now',{value:()=>now});
 w.scrollTo=()=>{};w.ResizeObserver=class{observe(){}disconnect(){}};w.Element.prototype.animate=()=>({cancel(){}});w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.Image=class{constructor(){this.naturalWidth=1536;this.naturalHeight=1024;}set src(value){this._src=value;w.queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
 Object.defineProperty(w.crypto,'getRandomValues',{configurable:true,value(a){a.fill(die-1);return a;}});
 w.Audio=class extends w.EventTarget{
  constructor(src){super();this.src=src;this.originalSrc=src;this.dataset={};this.paused=true;this.currentTime=0;this.volume=0;this.loop=false;media.push(this);}
  play(){this.paused=false;const name=this.src.split('/').at(-1).split('.mp3')[0];played.push({name,at:now,element:this,stage:doc.querySelector('#battle-stage')?.dataset.battleEvent||null});
   if(!this.loop){this.timer=w.setTimeout(()=>{this.paused=true;this.dispatchEvent(new w.Event('ended'));},(durations[name]?.seconds||1.5)*1000);}
   return Promise.resolve();}
  pause(){this.paused=true;if(this.timer)w.clearTimeout(this.timer);}
  load(){}removeAttribute(name){if(name==='src')this.src='';}
 };
 w.localStorage.setItem('chronicle-v14-local',JSON.stringify(savedGame(campaignId,seed)));w.localStorage.setItem('cg-v20-dice-motion',motion);
 w.eval(code);await until(()=>doc.querySelector('.campaign-card'),'catalog');
 const a={w,doc,errors,media,played,clock,get now(){return now;},get live(){return media.filter(m=>m.src&&!m.paused&&!m.loop);},
  async click(selector){const el=doc.querySelector(selector);assert.ok(el,selector);assert.ok(!el.disabled,`enabled ${selector}`);el.click();await until(()=>!doc.body.classList.contains('is-busy'),'request');await flush();},
  async advance(ms){const end=now+ms;let count=0;while(true){const next=[...clock].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;assert.ok(++count<10000,'finite callbacks');clock.delete(next[0]);now=next[1].at;next[1].fn();await flush();}now=end;await flush();},
  async action(kind='basic'){await this.click(`[data-combat="${kind}"]`);await this.click('[data-action="confirm-action"]');},
  async complete(){for(let i=0;doc.body.classList.contains('battle-presenting')&&i<100;i++)await this.advance(100);assert.equal(doc.body.classList.contains('battle-presenting'),false);},
  close(){w.dispatchEvent(new w.Event('beforeunload'));w.close();},
 };
 await a.click('[data-action="resume"]');await a.click('[data-action="resume-local"]');if(sound)await a.click('#sound-toggle');await a.advance(1500);played.length=0;return a;
}
const cues=a=>a.played.filter(r=>!r.element.loop).map(r=>r.name);

test('reduced motion retains the primary support, fumble, and lethal outcome sounds exactly once',async()=>{
 const cases=[
  {campaignId:'moon-market',seed:{classIndex:2,health:2},kind:'ability',expected:'battle-heal'},
  {seed:{classIndex:0},kind:'ability',expected:'battle-shield'},
  {seed:{classIndex:3,count:1},kind:'ability',expected:'battle-stun'},
  {seed:{classIndex:2},kind:'ability',expected:'battle-skill'},
  {die:1,expected:'battle-fumble'},
  {die:1,seed:{count:1,health:1},expected:'battle-defeat'},
 ];
 for(const row of cases){const a=await app({...row,motion:'reduce'});try{await a.action(row.kind);await a.complete();assert.deepEqual(cues(a),[row.expected],row.expected);assert.deepEqual(a.errors,[]);}finally{a.close();}}
});

test('realistic cue durations preserve attack → impact and do not replay after notebook redraw',async()=>{
 const a=await app();try{
  await a.action();assert.deepEqual(cues(a),['battle-swing']);await a.advance(240);assert.deepEqual(cues(a),['battle-swing','battle-hit']);assert.equal(a.live.length,2,'short impact overlaps only the swing tail');
  assert.deepEqual(a.played.map(r=>r.stage),['attack','enemy-hit']);await a.complete();await a.advance(800);assert.equal(a.live.length,0);
  await a.click('[data-tab="clues"]');await a.click('[data-tab="journal"]');assert.deepEqual(cues(a),['battle-swing','battle-hit']);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('horror grief begins at the actual death event; fumble is not a hit and defeat tail survives scene return',async()=>{
 const a=await app({campaignId:'hollow-apartment',seed:{count:1,health:1},die:1});try{
  await a.action();assert.deepEqual(cues(a),['battle-swing']);assert.equal(a.played.some(r=>r.name.includes('grief')),false);
  await a.advance(240);assert.equal(a.doc.querySelector('#battle-stage').dataset.battleEvent,'fumble');assert.deepEqual(cues(a),['battle-swing','battle-fumble']);assert.equal(a.played.some(r=>r.name.includes('grief')),false);
  await a.advance(480);assert.equal(a.doc.querySelector('#battle-stage').dataset.battleEvent,'death');assert.equal(a.played.find(r=>r.name.includes('grief'))?.stage,'death');
  await a.advance(550);assert.equal(a.doc.querySelector('#battle-stage').dataset.battleEvent,'defeat');assert.deepEqual(cues(a),['battle-swing','battle-fumble','battle-defeat']);
  const finale=a.played.find(r=>r.name==='battle-defeat').element;
  await a.advance(1000);assert.equal(a.doc.body.classList.contains('battle-presenting'),false);assert.equal(finale.paused,false,'normal completion preserves the last400ms tail');
  await a.advance(401);assert.equal(finale.paused,true);assert.equal(a.live.length,0);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('hide cancels active battle tails and resume does not replay the committed result',async()=>{
 const a=await app();try{
  await a.action();assert.equal(a.live.length,1);
  Object.defineProperty(a.doc,'hidden',{configurable:true,value:true});a.doc.dispatchEvent(new a.w.Event('visibilitychange'));await flush();
  assert.equal(a.doc.body.classList.contains('battle-presenting'),false);assert.equal(a.live.length,0);const before=cues(a).slice();
  await a.advance(2000);Object.defineProperty(a.doc,'hidden',{configurable:true,value:false});a.doc.dispatchEvent(new a.w.Event('visibilitychange'));await a.advance(1500);
  assert.deepEqual(cues(a),before);assert.equal(a.doc.querySelector('[data-battle-enemy-hp]').value,8);assert.equal(a.doc.querySelector('[data-combat="basic"]').disabled,false);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});

test('muted action changes the authoritative board without allocating battle media',async()=>{
 const a=await app({sound:false});try{const before=a.media.length;await a.action();await a.complete();assert.deepEqual(cues(a),[]);assert.equal(a.media.length,before);assert.equal(a.doc.querySelector('[data-battle-enemy-hp]').value,8);assert.deepEqual(a.errors,[]);}finally{a.close();}
});

test('the global mute button stays usable during battle and re-enabling never repeats its result',async()=>{
 const a=await app();try{
  await a.action();assert.deepEqual(cues(a),['battle-swing']);assert.equal(a.live.length,1);
  await a.click('#sound-toggle');assert.equal(a.live.length,0);assert.equal(a.doc.querySelector('#sound-toggle').getAttribute('aria-pressed'),'false');
  const created=a.media.length;await a.complete();assert.equal(a.media.length,created);assert.deepEqual(cues(a),['battle-swing']);
  await a.click('#sound-toggle');await a.advance(1500);assert.deepEqual(cues(a),['battle-swing']);assert.equal(a.doc.querySelector('[data-battle-enemy-hp]').value,8);assert.deepEqual(a.errors,[]);
 }finally{a.close();}
});
