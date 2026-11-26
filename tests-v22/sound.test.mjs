import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {SCENE_SOUNDS,BASIC_SCENE_SOUNDS,musicTheme,createSceneSoundDirector,SOUND_LEVELS} from '../public/game/scene-sound.js';
import {createMediaAudio} from '../public/game/audio-fallback.js';
const view=(id='tunnel',sound='knock',result=null)=>({campaignId:'last-train',storyLength:'basic',scene:{id,sound},lastResult:result});
test('scene sound follows the actual reading surface once; redraw, observation and reconnect do not repeat it',()=>{
 const played=[],d=createSceneSoundDirector(n=>played.push(n));
 d.update(view(),{allowEffects:true,scope:'room'});d.update(view(),{allowEffects:true,scope:'room'});
 d.update(view('tunnel','knock',{grade:'observe'}),{allowEffects:true,scope:'room',eventKey:'observe'});assert.deepEqual(played,['knock']);
 d.update(view('cellar','scream'),{allowEffects:false,scope:'room'});d.update(view('cellar','scream'),{allowEffects:true,scope:'room'});assert.deepEqual(played,['knock']);
 d.reset();d.update(view(),{allowEffects:true,scope:'room'});assert.equal(played.length,2);
});
test('private covers cannot consume or leak cues, and result reveal does not consume the next scene cue',()=>{
 const played=[],d=createSceneSoundDirector(n=>played.push(n));
 d.update(view(),{allowEffects:true,privateCover:true});assert.deepEqual(played,[]);
 d.update(view(),{allowEffects:true});assert.deepEqual(played,['knock']);
 const next=view('next','water',{sound:'scream',grade:'fumble'});
 d.update(next,{allowEffects:true,eventKey:'roll',resultOnly:true});assert.deepEqual(played,['knock','scream']);
 d.update(next,{allowEffects:true,eventKey:'roll'});assert.deepEqual(played,['knock','scream','water']);
 d.update(next,{allowEffects:true,eventKey:'roll'});assert.equal(played.length,3);
});
test('death, revival, grief and unknown names never add a contextual jump scare',()=>{
 const played=[],d=createSceneSoundDirector(n=>played.push(n));
 for(const [i,opts] of [{mood:'grief'},{},{},{}].entries()){
  const result=i===1?{deaths:['동료'],sound:'scream'}:i===2?{revivedId:'p0',sound:'scream'}:{sound:'../../unknown'};
  d.update(view(`room${i}`,i===3?'not-allowed':'scream',result),{allowEffects:true,eventKey:`r${i}`,...opts});
 }
 assert.deepEqual(played,[]);
});
test('original contextual files are complete and hash checked; available FFmpeg also verifies decoding and levels',t=>{
 const decoderAvailable=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0;
 if(!decoderAvailable)t.diagnostic('FFmpeg is not installed: exact delivered hashes and MPEG framing checked; optional decoded-level check omitted.');
 const manifest=JSON.parse(fs.readFileSync(new URL('../scripts/foley-v22.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(manifest.files).sort(),[...SCENE_SOUNDS].sort());let bytes=0;
 for(const [name,meta] of Object.entries(manifest.files)){
  const file=new URL(`../public/game/audio/${name}.mp3`,import.meta.url),data=fs.readFileSync(file);bytes+=data.length;
  assert.equal(data.length,meta.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),meta.sha256);
  if(!decoderAvailable){assert.ok(data.some((byte,i)=>byte===255&&i+1<data.length&&(data[i+1]&224)===224),`${name}: MPEG sync word`);continue;}
  const decoded=spawnSync('ffmpeg',['-v','error','-i',file.pathname,'-f','f32le','-ac','1','-ar','44100','-'],{maxBuffer:4*1024*1024});assert.equal(decoded.status,0,decoded.stderr.toString());
  const pcm=decoded.stdout;let peak=0,energy=0;for(let i=0;i<pcm.length;i+=4){const v=pcm.readFloatLE(i);assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}
  assert.ok(peak>.1&&peak<.82,`${name}: clipping/silence`);assert.ok(Math.sqrt(energy/(pcm.length/4))>.01,`${name}: audible content`);assert.ok(Math.abs(pcm.length/4/44100-meta.seconds)<.1);
 }
 assert.ok(bytes<400000);
});
test('all seven original stories have explicit contextual mappings and horror reuses existing guarded music loops',()=>{
 assert.equal(Object.keys(BASIC_SCENE_SOUNDS).length,7);
 for(const mapping of Object.values(BASIC_SCENE_SOUNDS)){assert.ok(Object.keys(mapping).length>=4);for(const sound of Object.values(mapping))assert.ok(SCENE_SOUNDS.includes(sound));}
 assert.equal(musicTheme('hollow-apartment'),'glass-hotel');assert.equal(musicTheme('drowned-broadcast'),'snow-radio');
 for(const id of ['hollow-apartment','drowned-broadcast'])for(const mood of ['calm','mystery','tension','danger','hope','grief'])assert.ok(fs.existsSync(new URL(`../public/game/audio/${musicTheme(id)}-${mood}.mp3`,import.meta.url)));
});
test('contextual one-shots are bounded to one, respect separate volume, and death cancels them',async()=>{
 const media=[],timers=new Map();let n=0;
 class Media extends EventTarget{constructor(src){super();this.src=src;this.dataset={};this.volume=0;media.push(this);}play(){return Promise.resolve();}pause(){this.stopped=true;}load(){}removeAttribute(){this.src='';}}
 const a=createMediaAudio(()=>{},{Audio:Media,storage:{getItem:()=>null,setItem(){}},setTimer:(fn)=>{timers.set(++n,fn);return n;},clearTimer:id=>timers.delete(id),requestFrame:()=>0,cancelFrame(){},now:()=>0});
 assert.equal(a.effect('knock'),false);await a.enable();a.setVolumes(.2,.4);
 assert.equal(a.effect('knock'),true);const first=media.at(-1);assert.match(first.src,/knock.mp3\?v=22000/);
 a.effect('scream');assert.equal(first.stopped,true);const scream=media.at(-1);assert.equal(scream.volume,.4*SOUND_LEVELS.scream);
 a.setVolumes(.2,.7);assert.equal(scream.volume,.7*SOUND_LEVELS.scream);
 a.effect('death');assert.equal(scream.stopped,true);assert.match(media.at(-1).src,/death.mp3\?v=19000/);
 a.disable();assert.equal(a.effect('murmur'),false);a.destroy();assert.equal(timers.size,0);
});
