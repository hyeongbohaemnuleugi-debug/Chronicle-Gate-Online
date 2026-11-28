import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAudio } from '../public/game/audio.js';
import { AUDIO_LOOPS } from '../public/game/audio-loops.js';
import { HORROR_LOOPS } from '../public/game/horror-loops.js';
import { MUSIC_LOOPS, resolveMusicAsset, musicAssetUrl } from '../public/game/music-assets.js';
import { selectMusic } from '../public/game/music-director.js';
import { getCampaign } from '../public/game/campaigns/index.js';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const near = (a, b, epsilon = 1e-5) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

function harness({ protocol = 'https:', fetchResponse, decode, playback, savedPreferences } = {}) {
  let wall = 0, nextId = 0, contextCount = 0;
  const requests = [], decodeCalls = [], contexts = [], sources = [], gains = [], media = [], timers = new Map(), frames = new Map(), records = new Map();
  class Param {
    constructor(value = 1) { this.value = value; this.calls = []; }
    cancelAndHoldAtTime(time) { this.calls.push({ kind: 'hold', time }); }
    cancelScheduledValues(time) { this.calls.push({ kind: 'cancel', time }); }
    setValueAtTime(value, time) { this.value = value; this.calls.push({ kind: 'value', value, time }); }
    setValueCurveAtTime(curve, time, duration) { this.calls.push({ kind: 'curve', curve: [...curve], time, duration }); }
  }
  class Context {
    constructor(options) { this.currentTime = 0; this.state = 'suspended'; this.options = options; this.destination = {}; this.closes = 0; this.resumes = 0; contextCount++; contexts.push(this); }
    createGain() { const gain = { gain: new Param(), connects: [], disconnected: false, connect(target) { this.connects.push(target); }, disconnect() { this.disconnected = true; } }; gains.push(gain); return gain; }
    createBufferSource() {
      const source = { buffer: null, loop: false, starts: [], stops: 0, disconnected: false, connect(target) { this.target = target; }, disconnect() { this.disconnected = true; }, start(when, offset) { assert.ok(this.buffer, 'a source must have its decoded buffer'); this.starts.push({ when, offset }); }, stop() { this.stops++; } };
      sources.push(source); return source;
    }
    async decodeAudioData(bytes) {
      const request = records.get(new Uint8Array(bytes)[0]); decodeCalls.push(request.key);
      const points = MUSIC_LOOPS[request.key];
      const buffer = { key: request.key, sampleRate: 32000, length: points.sourceFrames, numberOfChannels: 1, duration: points.sourceFrames / points.sampleRate };
      return decode ? decode(request, buffer) : buffer;
    }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.closes++; this.state = 'closed'; return Promise.resolve(); }
  }
  class Media extends EventTarget {
    constructor(src) { super(); this.src = src; this.initialSrc = src; this.dataset = {}; this.currentTime = 0; this.volume = 0; this.paused = true; this.loop = false; this.plays = 0; this.loads = 0; media.push(this); }
    play() { this.paused = false; this.plays++; return playback ? playback(this) : Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    load() { this.loads++; }
  }
  const fetcher = async (url, options) => {
    const key = url.match(/\/([^/]+)\.mp3\?/)[1], id = requests.length + 1;
    const request = { url, key, id, signal: options.signal }; requests.push(request); records.set(id, request);
    const response = { ok: true, arrayBuffer: async () => Uint8Array.of(id).buffer };
    return fetchResponse ? fetchResponse(request, response) : response;
  };
  const saved = new Map(savedPreferences ? [['cg-v14-audio', JSON.stringify(savedPreferences)]] : []);
  const mixer = createAudio(() => {}, { Audio: Media, AudioContext: Context, protocol, fetch: fetcher,
    now: () => wall, setTimer: (fn, delay) => { const id = ++nextId; timers.set(id, { fn, at: wall + delay }); return id; }, clearTimer: id => timers.delete(id),
    requestFrame: fn => { const id = ++nextId; frames.set(id, fn); return id; }, cancelFrame: id => frames.delete(id),
    storage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
  });
  const step = (ms, callbacks = true) => {
    wall += ms;
    for (const context of contexts) if (context.state === 'running') context.currentTime += ms / 1000;
    if (callbacks) {
      for (const [id, timer] of [...timers]) if (timer.at <= wall && timers.delete(id)) timer.fn();
      for (const [id, fn] of [...frames]) if (frames.delete(id)) fn(wall);
    }
  };
  return { mixer, requests, decodeCalls, contexts, sources, gains, media, timers, frames, step, get contextCount() { return contextCount; }, live: () => sources.filter(source => !source.stops), effects: () => media.filter(element => element.src && !element.loop && !element.paused) };
}
const lastCurve = param => param.calls.filter(call => call.kind === 'curve').at(-1);
const running = async (h, theme = 'last-train', mood = 'calm') => { h.mixer.scene(theme, mood); await h.mixer.enable(); await flush(); h.step(1255); return h.sources.at(-1); };


const horrors = ['hollow-apartment', 'drowned-broadcast'];
const originals = ['last-train','glass-hotel','moon-market','deep-sea','dragon-banquet','clock-city','snow-radio'];
const moods = ['calm','mystery','tension','danger','hope','grief'];
const expectedKeys = id => {
  const prefix=id==='hollow-apartment'?'horror-apartment':'horror-broadcast';
  return {calm:`${prefix}-ambient`,mystery:`${prefix}-ambient`,tension:`${prefix}-tension`,danger:`${prefix}-danger`,hope:'horror-shared-relief',grief:'horror-shared-grief'};
};
const actualLive = h => h.mixer.backend==='buffer' ? h.live().map(s=>s.buffer.key) : h.media.filter(m=>m.src&&m.loop&&!m.paused).map(m=>m.dataset.key);
const currentKey = h => actualLive(h).at(-1);

for (const protocol of ['https:', 'file:']) {
 test(`${protocol} changing story keeps both default and saved volume preferences and uses the same music gain`, async () => {
  for (const savedPreferences of [undefined, { music: .37, effects: .62 }]) {
   const h = harness({ protocol, savedPreferences });
   const music = savedPreferences?.music ?? .25, effects = savedPreferences?.effects ?? .45;
   const currentLevel = () => protocol === 'https:'
    ? lastCurve(h.gains[0].gain).curve.at(-1)
    : h.media.find(element => element.src && element.loop && !element.paused).volume;
   try {
    assert.deepEqual(h.mixer.preferences, { enabled: false, music, effects });
    await h.mixer.enable();
    for (const campaign of ['last-train', ...horrors, 'snow-radio']) {
     for (const mood of ['mystery', 'danger', 'grief']) {
      h.mixer.scene(campaign, mood); await flush(); h.step(1255);
      assert.deepEqual(h.mixer.preferences, { enabled: true, music, effects });
      near(currentLevel(), music);
     }
    }
   } finally { h.mixer.destroy(); }
  }
 });
}

for(const protocol of ['https:','file:'])for(const campaignId of horrors){
 test(`${protocol} ${campaignId}: every mood uses the dedicated score and investigation does not restart calm`,async()=>{
  const h=harness({protocol}),keys=expectedKeys(campaignId);
  try{
   h.mixer.scene(campaignId,'calm');assert.equal(h.requests.length,0);assert.equal(h.media.length,0);
   await h.mixer.enable();await flush();h.step(1255);assert.equal(currentKey(h),keys.calm);
   const sourceCount=h.sources.length,requestCount=h.requests.length,mediaCount=h.media.length;
   for(let i=0;i<12;i++)h.mixer.scene(campaignId,i%2?'mystery':'calm');await flush();
   assert.equal(h.sources.length,sourceCount);assert.equal(h.requests.length,requestCount);assert.equal(h.media.length,mediaCount);
   for(const mood of ['tension','danger','hope','grief','mystery']){
    h.mixer.scene(campaignId,mood);await flush();h.step(1255);
    assert.equal(currentKey(h),keys[mood]);assert.equal(actualLive(h).length,1);
   }
   const urls=protocol==='file:'?h.media.map(m=>m.initialSrc):h.requests.map(r=>r.url);
   assert.ok(urls.every(url=>url.startsWith('/game/audio/horror-')&&url.endsWith('?v=24100')));
   if(protocol==='https:'){
    assert.ok(h.mixer.diagnostics.cachedTracks<=3);assert.ok(h.mixer.diagnostics.cachedBytes<=16*1024*1024);
    assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
   }else{assert.equal(h.contextCount,0);assert.equal(h.requests.length,0);}
  }finally{h.mixer.destroy();}
  assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
 });
}

test('the seven original campaigns keep all 42 asset URLs, authored loops and cache identities',()=>{
 for(const id of originals)for(const mood of moods){
  const asset=resolveMusicAsset(id,mood),key=`${id}-${mood}`;
  assert.equal(asset.key,key);assert.equal(asset.url,`/game/audio/${key}.mp3?v=20000`);assert.equal(asset.version,'20000');
  assert.equal(asset.loop,AUDIO_LOOPS[key]);
 }
 assert.equal(resolveMusicAsset('../hollow-apartment','calm'),null);
 assert.equal(resolveMusicAsset(null,'calm'),null);
 for(const id of horrors)assert.equal(resolveMusicAsset(id,'unknown').key,expectedKeys(id).mystery);
});

test('all eight original horror files have guard regions and every authored Basic/Epic scene resolves to them',()=>{
 assert.deepEqual(Object.keys(HORROR_LOOPS).sort(),[...new Set(horrors.flatMap(id=>Object.values(expectedKeys(id))))].sort());
 for(const [key,p] of Object.entries(HORROR_LOOPS)){
  assert.equal(p.sampleRate,32000);assert.ok(p.startFrame>=16000);assert.ok(p.sourceFrames-p.endFrame>=16000);
  assert.ok((p.endFrame-p.startFrame)/p.sampleRate>=40);assert.ok((p.endFrame-p.startFrame)/p.sampleRate<=56);
  assert.ok(fs.existsSync(new URL(`../public/game/audio/${key}.mp3`,import.meta.url)));
  assert.equal(musicAssetUrl(key),`/game/audio/${key}.mp3?v=24100`);
 }
 for(const id of horrors)for(const length of ['basic','epic']){
  const campaign=getCampaign(id,length);
  for(const scene of Object.values(campaign.nodes)){
   const selected=selectMusic({campaignId:id,scene,players:[{id:'p',health:3,life:'alive'}]});
   assert.ok(HORROR_LOOPS[resolveMusicAsset(id,selected.mood).key],`${id}/${length}/${scene.id}`);
  }
 }
});

for(const protocol of ['https:','file:']){
 test(`${protocol} horror score guards loop smoothly, pause resumes, and mute never requests another score`,async()=>{
  const h=harness({protocol}),key='horror-apartment-ambient',p=HORROR_LOOPS[key];
  try{
   h.mixer.scene('hollow-apartment','mystery');await h.mixer.enable();await flush();h.step(1255);
   if(protocol==='https:'){
    const source=h.sources.at(-1);near(source.loopStart,p.startFrame/p.sampleRate);near(source.loopEnd,p.endFrame/p.sampleRate);
    h.step(3_600_000,false);h.mixer.scene('hollow-apartment','calm');await flush();
    assert.equal(h.requests.length,1);assert.equal(source.starts.length,1);assert.equal(source.stops,0);assert.equal(h.frames.size,0);
    const expected=source.loopStart+(h.contexts[0].currentTime-source.starts[0].when)%(source.loopEnd-source.loopStart);
    h.mixer.pause();h.step(10_000);h.mixer.resume();await flush();near(h.sources.at(-1).starts[0].offset,expected);assert.equal(h.requests.length,1);
   }else{
    const old=h.media[0],end=p.endFrame/p.sampleRate;near(old.currentTime,p.startFrame/p.sampleRate);
    old.currentTime=end-1.5;old.dispatchEvent(new Event('timeupdate'));
    assert.equal(h.media.length,2);assert.equal(h.media[1].preload,'auto');assert.equal(h.media[1].plays,0);
    old.currentTime=end-.15;old.dispatchEvent(new Event('timeupdate'));await flush();h.step(240);
    const next=h.media[1];near(next.currentTime,p.startFrame/p.sampleRate-.15);assert.equal(old.src,'');assert.equal(currentKey(h),key);
    next.currentTime=12;h.mixer.pause();h.mixer.resume();await flush();near(next.currentTime,12);assert.equal(h.media.length,2);
   }
   h.mixer.setVolumes(0,0);const requests=h.requests.length,media=h.media.length;
   h.mixer.scene('drowned-broadcast','danger');await flush();assert.equal(h.requests.length,requests);assert.equal(h.media.length,media);assert.equal(actualLive(h).length,0);
   h.mixer.setVolumes(.25,.45);await flush();h.step(1255);assert.equal(currentKey(h),'horror-broadcast-danger');
  }finally{h.mixer.destroy();}
 });
}

test('longer horror buffers still respect the existing three-entry and 16 MiB memory ceilings',async()=>{
 const h=harness();
 try{
  await h.mixer.enable();
  for(const id of horrors)for(const mood of ['calm','tension','danger','hope','grief']){
   h.mixer.scene(id,mood);await flush();h.step(1255);
   assert.equal(actualLive(h).length,1);assert.ok(h.mixer.diagnostics.cachedTracks<=3);assert.ok(h.mixer.diagnostics.cachedBytes<=16*1024*1024);
  }
  const count=h.requests.length;h.mixer.scene('hollow-apartment','grief');await flush();assert.equal(h.requests.length,count,'shared grief remains the same buffer across the two horrors');
 }finally{h.mixer.destroy();}
 assert.equal(h.mixer.diagnostics.cachedBytes,0);
});

for(const protocol of ['https:','file:']){
 test(`${protocol} narrative danger, death, revival, partial success and private cover stay inside the horror palette`,async()=>{
  const h=harness({protocol}),campaignId='drowned-broadcast';
  const alive={id:'p',health:3,life:'alive'},dead={id:'q',health:0,life:'dead'};
  const base={campaignId,scene:{id:'studio',mood:'mystery'},players:[alive],lastResult:null};
  const cases=[
   [{...base,lastResult:{grade:'critical'}},{},'horror-broadcast-ambient'],
   [{...base,lastResult:{grade:'mixed'}},{},'horror-broadcast-ambient'],
   [{...base,pressure:{value:8,max:10}},{},'horror-broadcast-tension'],
   [{...base,combat:{round:1}},{},'horror-broadcast-danger'],
   [{...base,combat:{round:1},players:[alive,dead],lastResult:{grade:'failure',deaths:['q']}},{},'horror-shared-grief'],
   [{...base,lastResult:{grade:'success',revivedId:'q'}},{},'horror-shared-relief'],
   [{...base,lastResult:{grade:'failure',revivedId:null}},{},'horror-shared-grief'],
   [{...base,players:[dead],scene:{id:'__all_dead__',ending:true,mood:'hope'}},{},'horror-shared-grief'],
   [{...base},{privateCover:true},'horror-broadcast-ambient'],
   [{...base,ending:true,scene:{id:'unknown-ending',ending:true,mood:'hope'},players:[alive,dead]},{},'horror-shared-grief'],
  ];
  try{
   await h.mixer.enable();
   for(const [view,options,key] of cases){
    h.mixer.scene(campaignId,selectMusic(view,options).mood);await flush();h.step(1255);assert.equal(currentKey(h),key);
   }
  }finally{h.mixer.destroy();}
 });
}

test('a missing horror file stays silent on entry and cannot request the old hotel or snow music',async()=>{
 const h=harness({fetchResponse:()=>({ok:false})});
 try{
  h.mixer.scene('hollow-apartment','calm');await h.mixer.enable();await flush();
  for(let i=0;i<12;i++)h.mixer.scene('hollow-apartment','mystery');await flush();
  assert.deepEqual(h.requests.map(x=>x.url),['/game/audio/horror-apartment-ambient.mp3?v=24100']);assert.equal(h.live().length,0);
 }finally{h.mixer.destroy();}
});

for(const protocol of ['https:','file:'])for(const failure of ['slow','reject','timeout']){
 test(`${protocol} entering horror from an original score fades the old music during ${failure} loading`,async()=>{
  const gate=deferred();
  const h=harness({protocol,
   fetchResponse:(request,response)=>request.key.startsWith('horror-')?(failure==='reject'?{ok:false}:gate.promise.then(()=>response)):response,
   playback:element=>element.initialSrc.includes('/horror-')?(failure==='reject'?Promise.reject(new Error('Unavailable')):gate.promise):Promise.resolve(),
  });
  try{
   h.mixer.scene('last-train','calm');await h.mixer.enable();await flush();h.step(1255);
   const old=protocol==='https:'?h.sources[0]:h.media[0];
   h.mixer.scene('hollow-apartment','mystery');await flush();
   if(protocol==='https:'){
    assert.equal(old.stops,0,'a genre change must ramp down, not hard-stop the old voice');
    assert.equal(lastCurve(old.target.gain).duration,.35);assert.equal(lastCurve(old.target.gain).curve.at(-1),0);
   }else{
    assert.ok(old.src&&old.volume>0,'a failed or slow play does not hard-cut the old media element');
    h.step(175);assert.ok(old.volume>0&&old.volume<.25);
   }
   h.step(355);
   if(protocol==='https:'){assert.equal(old.stops,1);assert.equal(h.live().length,0);}
   else{assert.equal(old.src,'');assert.equal(old.paused,true);}
   if(failure==='slow'){
    gate.resolve();await flush();h.step(1255);assert.equal(currentKey(h),'horror-apartment-ambient');
   }else{
    if(failure==='timeout'){h.step(12000);gate.resolve();await flush();}
    for(let i=0;i<5;i++)h.mixer.scene('hollow-apartment','calm');await flush();
    assert.equal(actualLive(h).length,0,'failed horror entry is quiet, not the previous bright score');
   }
   const urls=protocol==='https:'?h.requests.map(x=>x.url):h.media.map(x=>x.initialSrc);
   assert.deepEqual(urls,['/game/audio/last-train-calm.mp3?v=20000','/game/audio/horror-apartment-ambient.mp3?v=24100']);
  }finally{h.mixer.destroy();gate.resolve();await flush();}
  assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
 });
}

for(const protocol of ['https:','file:']){
 test(`${protocol} an old horror score remains safe during another horror's failed load`,async()=>{
  const h=harness({protocol,
   fetchResponse:(request,response)=>request.key==='horror-broadcast-danger'?{ok:false}:response,
   playback:element=>element.initialSrc.includes('horror-broadcast-danger')?Promise.reject(new Error('Unavailable')):Promise.resolve(),
  });
  try{
   h.mixer.scene('hollow-apartment','calm');await h.mixer.enable();await flush();h.step(1255);
   h.mixer.scene('drowned-broadcast','danger');await flush();h.step(1255);
   assert.equal(currentKey(h),'horror-apartment-ambient');assert.equal(actualLive(h).length,1);
  }finally{h.mixer.destroy();}
 });
}

test('returning to the original story during its horror-entry fade cancels the obsolete load without muting the chosen story',async()=>{
 const gate=deferred(),h=harness({fetchResponse:(request,response)=>request.key.startsWith('horror-')?gate.promise.then(()=>response):response});
 try{
  const original=await running(h);h.mixer.scene('hollow-apartment','calm');await flush();h.step(100);
  h.mixer.scene('last-train','calm');await flush();gate.resolve();await flush();h.step(1255);
  assert.equal(currentKey(h),'last-train-calm');assert.equal(h.live()[0],original);assert.equal(original.stops,0);
  assert.equal(lastCurve(original.target.gain).curve.at(-1),1);assert.equal(h.requests[1].signal.aborted,true);
 }finally{h.mixer.destroy();}
});

for(const protocol of ['https:','file:']){
 test(`${protocol} a rapid second horror scene includes the retiring genre voice in the two-track limit`,async()=>{
  const h=harness({protocol});
  try{
   h.mixer.scene('last-train','calm');await h.mixer.enable();await flush();h.step(1255);
   h.mixer.scene('hollow-apartment','calm');await flush();h.step(100);
   assert.ok(actualLive(h).length<=2);
   h.mixer.scene('drowned-broadcast','danger');await flush();
   assert.ok(actualLive(h).length<=2,'retiring old genre + first horror + second horror must never make three playing tracks');
   if(protocol==='file:')assert.equal(h.media[0].src,'','a detached genre-fade element is also cleaned on a new scene');
   h.step(1300);assert.ok(actualLive(h).length<=2);h.step(1300);
   assert.equal(currentKey(h),'horror-broadcast-danger');assert.equal(actualLive(h).length,1);
   h.mixer.pause();assert.equal(actualLive(h).length,0);assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
  }finally{h.mixer.destroy();}
 });
}

for(const protocol of ['https:','file:']){
 test(`${protocol} horror to original to failed horror cannot leave the intermediate bright score playing`,async()=>{
  const h=harness({protocol,
   fetchResponse:(request,response)=>request.key==='horror-broadcast-danger'?{ok:false}:response,
   playback:element=>element.initialSrc.includes('horror-broadcast-danger')?Promise.reject(new Error('Unavailable')):Promise.resolve(),
  });
  try{
   h.mixer.scene('hollow-apartment','calm');await h.mixer.enable();await flush();h.step(1255);
   h.mixer.scene('last-train','hope');await flush();h.step(150);
   const intermediate=protocol==='https:'?h.sources.find(x=>x.buffer.key==='last-train-hope'):h.media.find(x=>x.dataset.key==='last-train-hope');
   h.mixer.scene('drowned-broadcast','danger');await flush();h.step(360);h.step(1500);
   assert.ok(actualLive(h).every(key=>key.startsWith('horror-')),'no intermediate original track can survive the new horror entry');
   if(protocol==='https:'){
    assert.equal(intermediate.stops,1);assert.equal(currentKey(h),'horror-apartment-ambient');
    assert.equal(lastCurve(h.live()[0].target.gain).curve.at(-1),1);
   }else{assert.equal(intermediate.src,'');}
  }finally{h.mixer.destroy();}
  assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
 });
}
