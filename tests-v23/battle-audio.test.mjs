import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createAudio} from '../public/game/audio.js';
import {BATTLE_EFFECTS,BATTLE_SOUND_LEVELS,battleSoundUrl} from '../public/game/battle-audio-assets.js';

const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function harness(protocol='https:',playback=null){
  const media=[],timers=new Map(),requests=[],contexts=[];let serial=0;
  class Media extends EventTarget{
    constructor(src){super();this.src=src;this.originalSrc=src;this.dataset={};this.paused=true;this.volume=0;this.currentTime=0;media.push(this);}
    play(){this.paused=false;return playback?playback(this):Promise.resolve();}
    pause(){this.paused=true;}
    load(){this.loads=(this.loads||0)+1;}
    removeAttribute(name){if(name==='src')this.src='';}
  }
  class Context{
    constructor(){this.currentTime=0;this.state='suspended';this.destination={};contexts.push(this);}
    createGain(){return {gain:{value:0,cancelAndHoldAtTime(){},cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setValueCurveAtTime(){}},connect(){},disconnect(){}};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  const audio=createAudio(()=>{},{protocol,Audio:Media,AudioContext:Context,
    fetch:async(...args)=>{requests.push(args);throw new Error('SFX must not fetch a music buffer');},
    storage:{getItem:()=>null,setItem(){}},
    setTimer:(fn,duration)=>{const id=++serial;timers.set(id,{fn,duration});return id;},
    clearTimer:id=>timers.delete(id),requestFrame:()=>0,cancelFrame(){},now:()=>0,
  });
  return {audio,media,timers,requests,contexts,live:()=>media.filter(m=>m.src&&!m.paused)};
}

test('thirteen original battle assets have immutable cache URLs and decoded quiet boundaries',t=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../scripts/battle-audio-v23.json',import.meta.url),'utf8'));
  assert.equal(BATTLE_EFFECTS.length,13);
  assert.deepEqual(Object.keys(manifest.files),[...BATTLE_EFFECTS]);
  const hasDecoder=spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status===0;
  if(!hasDecoder)t.diagnostic('FFmpeg unavailable: hashes, declared levels and asset sizes still checked; PCM decoding omitted.');
  let bytes=0;
  for(const name of BATTLE_EFFECTS){
    const row=manifest.files[name],file=new URL(`../${row.path}`,import.meta.url),content=fs.readFileSync(file);
    bytes+=content.length;assert.equal(content.length,row.bytes);
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'),row.sha256);
    assert.equal(battleSoundUrl(name),`/game/audio/sfx/${name}.mp3?v=23000`);
    assert.ok(BATTLE_SOUND_LEVELS[name]>0&&BATTLE_SOUND_LEVELS[name]<=.85);
    assert.ok(row.seconds>=.3&&row.seconds<=1.5);
    if(!hasDecoder)continue;
    const decoded=spawnSync('ffmpeg',['-v','error','-i',file.pathname,'-f','f32le','-ac','1','-ar','32000','-'],{maxBuffer:1024*1024});
    assert.equal(decoded.status,0,decoded.stderr.toString());
    const pcm=decoded.stdout,count=pcm.length/4;let peak=0,energy=0,head=0,tail=0;
    for(let i=0;i<count;i++){
      const value=pcm.readFloatLE(i*4);assert.ok(Number.isFinite(value));
      peak=Math.max(peak,Math.abs(value));energy+=value*value;
      if(i<256)head=Math.max(head,Math.abs(value));
      if(i>=count-256)tail=Math.max(tail,Math.abs(value));
    }
    assert.ok(Math.abs(count/32000-row.seconds)<.05,`${name}: duration`);
    assert.ok(peak>.1&&peak<.8,`${name}: no clipping or silent cue`);
    assert.ok(Math.sqrt(energy/count)>.015,`${name}: audible energy`);
    assert.ok(head<.012&&tail<.012,`${name}: no cut edge (${head}, ${tail})`);
  }
  assert.equal(bytes,manifest.totalBytes);assert.ok(bytes<100000);
  for(const invalid of ['../../death','battle-fake','battle-hit?loud=true','https://example.com/evil',''])assert.equal(battleSoundUrl(invalid),null);
});

for(const protocol of ['https:','file:']){
  test(`${protocol}: battle SFX are lazy, allowlisted, separately leveled and release on end`,async()=>{
    const h=harness(protocol),a=h.audio;
    try{
      for(const name of BATTLE_EFFECTS)assert.equal(a.effect(name),false);
      assert.equal(h.media.length,0);assert.equal(h.requests.length,0);
      await a.enable();a.setVolumes(0,.4);
      for(const name of BATTLE_EFFECTS){
        assert.equal(a.effect(name),true,name);
        const m=h.media.at(-1);assert.equal(m.src,battleSoundUrl(name));
        assert.equal(m.preload,'none');assert.equal(m.loop,false);
        assert.equal(m.volume,.4*BATTLE_SOUND_LEVELS[name]);
        m.dispatchEvent(new Event('ended'));assert.equal(h.live().length,0);assert.equal(h.timers.size,0);
      }
      for(const name of ['battle-unknown','../../death','toString'])assert.equal(a.effect(name),false);
      a.setVolumes(0,0);const count=h.media.length;assert.equal(a.effect('battle-hit'),false);assert.equal(h.media.length,count);
      a.setVolumes(0,.3);a.effect('battle-hit');const hit=h.media.at(-1);a.setVolumes(0,.6);assert.equal(hit.volume,.6*BATTLE_SOUND_LEVELS['battle-hit']);
      assert.equal(h.requests.length,0,'battle one-shots never request BGM buffers');
      a.disable();assert.equal(h.live().length,0);assert.equal(h.timers.size,0);
    }finally{a.destroy();}
  });

  test(`${protocol}: four one-shot ceiling, battle cancellation and scoped casualties leave unrelated cues alone`,async()=>{
    const h=harness(protocol),a=h.audio;await a.enable();
    try{
      a.effect('wind');const wind=h.media.at(-1);
      for(const name of ['battle-swing','battle-hit','battle-enemy'])assert.equal(a.effect(name),true);
      assert.equal(a.effect('battle-hurt'),false);assert.equal(h.live().length,4);
      a.stopBattleEffects();assert.deepEqual(h.live(),[wind]);assert.equal(h.timers.size,1);
      a.effect('death',{scope:'battle'});const casualty=h.media.at(-1);assert.equal(wind.paused,true);
      a.stopBattleEffects();assert.equal(casualty.paused,true);assert.equal(h.timers.size,0);
      a.effect('death');const storyDeath=h.media.at(-1);a.stopBattleEffects();assert.deepEqual(h.live(),[storyDeath]);
      a.effect('battle-defeat');const defeat=h.media.at(-1);assert.equal(storyDeath.paused,true);assert.deepEqual(h.live(),[defeat]);
      a.pause();assert.equal(h.live().length,0);assert.equal(h.timers.size,0);assert.equal(a.effect('battle-hit'),false);
      a.resume();a.effect('battle-hit');a.effect('battle-victory');assert.equal(h.live().length,1);assert.match(h.live()[0].src,/battle-victory/);
    }finally{a.destroy();}
    assert.equal(h.timers.size,0);
  });

  test(`${protocol}: stale media rejection and error/timeout callbacks cannot kill a later battle cue`,async()=>{
    let rejectFirst;let call=0;
    const h=harness(protocol,()=>++call===1?new Promise((_,no)=>{rejectFirst=no;}):Promise.resolve()),a=h.audio;await a.enable();
    try{
      a.effect('battle-swing');const old=h.media.at(-1);a.stopBattleEffects();
      a.effect('battle-hit');const current=h.media.at(-1);
      rejectFirst(new Error('late media failure'));await flush();
      old.dispatchEvent(new Event('ended'));old.dispatchEvent(new Event('error'));assert.deepEqual(h.live(),[current]);assert.equal(h.timers.size,1);
      current.dispatchEvent(new Event('error'));assert.equal(h.live().length,0);assert.equal(h.timers.size,0);
      a.effect('battle-enemy');const timeout=[...h.timers.values()][0];assert.equal(timeout.duration,10000);timeout.fn();
      assert.equal(h.live().length,0);assert.equal(h.timers.size,0);
    }finally{a.destroy();}
  });
}
