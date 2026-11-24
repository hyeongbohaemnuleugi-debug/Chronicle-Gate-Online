import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../public/game/audio.js';
import { AUDIO_LOOPS } from '../public/game/audio-loops.js';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const near = (a, b, epsilon = 1e-5) => assert.ok(Math.abs(a - b) <= epsilon, `${a} differs from ${b}`);

function harness({ protocol = 'https:', fetchResponse, decode, playback } = {}) {
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
      const points = AUDIO_LOOPS[request.key];
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
  const saved = new Map();
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

test('silent startup performs no fetch/decode and guarded native loops need no frame or per-loop callback', async () => {
  const h = harness();
  try {
    assert.equal(h.mixer.backend, 'buffer'); h.mixer.scene('last-train', 'calm'); h.mixer.effect('dice'); await flush();
    assert.equal(h.contextCount, 0); assert.equal(h.requests.length, 0); assert.equal(h.media.length, 0);
    h.mixer.setVolumes(0, 0); await h.mixer.enable(); await flush(); assert.equal(h.requests.length, 0);
    h.mixer.setVolumes(.25, .45); await flush();
    const source = h.sources[0], points = AUDIO_LOOPS['last-train-calm'];
    assert.equal(source.loop, true); near(source.loopStart, points.startFrame / points.sampleRate); near(source.loopEnd, points.endFrame / points.sampleRate);
    near(source.starts[0].offset, source.loopStart); assert.ok(source.loopEnd < source.buffer.duration);
    assert.equal(h.requests[0].url, '/game/audio/last-train-calm.mp3?v=20000');
    h.step(1255); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
    h.step(180_000, false);
    for (let i = 0; i < 30; i++) h.mixer.scene('last-train', 'calm');
    assert.equal(h.requests.length, 1); assert.equal(h.sources.length, 1); assert.equal(source.starts.length, 1); assert.equal(source.stops, 0); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  } finally { h.mixer.destroy(); }
});

test('different scenes wait for decoding, then use audio-clock equal-power fades with no midpoint energy hole', async () => {
  const gate = deferred(); const h = harness({ decode: (request, buffer) => request.key.endsWith('grief') ? gate.promise.then(() => buffer) : buffer });
  try {
    const original = await running(h); h.mixer.scene('last-train', 'grief'); await flush();
    assert.equal(h.live().length, 1); assert.equal(original.stops, 0);
    gate.resolve(); await flush(); assert.equal(h.live().length, 2);
    const next = h.sources.at(-1), oldCurve = lastCurve(original.target.gain), nextCurve = lastCurve(next.target.gain);
    assert.equal(oldCurve.duration, 1.25); assert.equal(nextCurve.duration, 1.25);
    for (let i = 0; i < oldCurve.curve.length; i++) near(oldCurve.curve[i] ** 2 + nextCurve.curve[i] ** 2, 1, 1e-6);
    near(oldCurve.curve[32], Math.SQRT1_2); near(nextCurve.curve[32], Math.SQRT1_2);
    h.step(1255); assert.equal(original.stops, 1); assert.equal(h.live()[0], next); assert.equal(h.frames.size, 0);
  } finally { h.mixer.destroy(); }
});

test('an obsolete fetch or decode never starts over a newer scene, including A to B to A', async () => {
  const fetchGate = deferred(), decodeGate = deferred(); let gated = true;
  const h = harness({ fetchResponse: (request, response) => request.key.endsWith('danger') ? fetchGate.promise.then(() => response) : response,
    decode: (request, buffer) => gated && request.key.endsWith('grief') ? decodeGate.promise.then(() => buffer) : buffer });
  try {
    const original = await running(h);
    h.mixer.scene('last-train', 'danger'); await flush(); h.mixer.scene('last-train', 'calm');
    assert.equal(h.requests[1].signal.aborted, true); fetchGate.resolve(); await flush(); assert.equal(h.decodeCalls.includes('last-train-danger'), false);
    h.mixer.scene('last-train', 'grief'); await flush(); h.mixer.scene('last-train', 'calm'); gated = false; decodeGate.resolve(); await flush();
    assert.equal(h.sources.length, 1); assert.equal(h.live()[0], original); assert.equal(original.stops, 0); assert.equal(h.mixer.diagnostics.pendingTrack, null);
  } finally { h.mixer.destroy(); }
});

test('wall timers cannot cut an old voice while a device interruption has stalled the audio clock', async () => {
  const h = harness();
  try {
    const old = await running(h); h.mixer.scene('last-train', 'danger'); await flush();
    h.contexts[0].state = 'interrupted'; h.step(5000);
    assert.equal(old.stops, 0); assert.equal(h.live().length, 2); assert.equal(h.timers.size, 1);
    h.contexts[0].state = 'running'; h.step(1255);
    assert.equal(old.stops, 1); assert.equal(h.live().length, 1); assert.equal(h.timers.size, 0);
  } finally { h.mixer.destroy(); }
});

test('reversing an audible fade reuses the playing sources and cancels old gain automation', async () => {
  const h = harness();
  try {
    const calm = await running(h); h.mixer.scene('last-train', 'danger'); await flush(); h.step(350);
    const danger = h.sources.at(-1), calmBefore = lastCurve(calm.target.gain), at = h.contexts[0].currentTime;
    h.mixer.scene('last-train', 'calm');
    assert.equal(h.sources.length, 2); assert.equal(h.requests.length, 2); assert.equal(calm.stops, 0); assert.equal(danger.stops, 0);
    assert.ok(calm.target.gain.calls.some(call => call.kind === 'hold' && call.time === at));
    assert.notEqual(lastCurve(calm.target.gain), calmBefore); assert.ok(lastCurve(calm.target.gain).curve[0] > .5);
    h.step(1255); assert.equal(h.live()[0], calm); assert.equal(danger.stops, 1);
  } finally { h.mixer.destroy(); }
});

test('a third scene queues behind the current fade without a cut or third BGM source', async () => {
  const h = harness();
  try {
    const calm = await running(h); h.mixer.scene('last-train', 'danger'); await flush(); h.step(200);
    const danger = h.sources.at(-1); h.mixer.scene('last-train', 'grief'); await flush();
    assert.equal(h.live().length, 2); assert.equal(h.sources.length, 2); assert.equal(calm.stops, 0); assert.equal(danger.stops, 0);
    assert.equal(h.mixer.diagnostics.queuedTrack, 'last-train-grief');
    h.step(1055); assert.equal(calm.stops, 1); assert.equal(h.live().length, 2); assert.equal(h.sources.length, 3);
    assert.equal(h.sources.at(-1).buffer.key, 'last-train-grief');
    h.step(1255); assert.equal(h.live().length, 1); assert.equal(h.live()[0].buffer.key, 'last-train-grief');
  } finally { h.mixer.destroy(); }
});

test('a delayed cleanup timer cannot discard a requested return to an older scene', async () => {
  const h = harness();
  try {
    await running(h); h.mixer.scene('last-train', 'danger'); await flush(); h.step(2000, false);
    h.mixer.scene('last-train', 'calm'); await flush();
    assert.ok(h.live().length <= 2); h.step(1255); assert.equal(h.live()[0].buffer.key, 'last-train-calm');
    assert.equal(h.requests.length, 2, 'return uses a previously decoded buffer');
  } finally { h.mixer.destroy(); }
});

test('visibility pause resumes at the saved musical offset and does not replay SFX or fetch cached music', async () => {
  const h = harness();
  try {
    const first = await running(h); h.step(9_000); h.mixer.effect('attack');
    const expected = first.loopStart + (h.contexts[0].currentTime - first.starts[0].when) % (first.loopEnd - first.loopStart);
    h.mixer.pause(); assert.equal(h.live().length, 0); assert.equal(h.effects().length, 0); assert.equal(h.timers.size, 0);
    h.step(20_000); h.mixer.resume(); await flush();
    near(h.sources.at(-1).starts[0].offset, expected); assert.equal(h.requests.length, 1); assert.equal(h.media.length, 1);
    h.mixer.pause(); const count = h.requests.length; h.mixer.scene('snow-radio', 'grief'); assert.equal(h.requests.length, count);
    h.mixer.resume(); await flush(); assert.equal(h.sources.at(-1).buffer.key, 'snow-radio-grief');
  } finally { h.mixer.destroy(); }
});

test('volume and dice ducking automate only the master gain and do not restart tracks or lower SFX', async () => {
  const h = harness();
  try {
    await running(h); h.mixer.effect('dice'); const master = h.gains[0].gain, effect = h.media[0];
    h.mixer.duck(true); near(lastCurve(master).curve.at(-1), .25 * .55); assert.equal(lastCurve(master).duration, .12);
    assert.equal(effect.volume, .45); assert.equal(h.mixer.preferences.music, .25);
    h.step(150); h.mixer.setVolumes(.4, .6); near(lastCurve(master).curve.at(-1), .4 * .55); assert.equal(effect.volume, .6);
    h.mixer.duck(false); near(lastCurve(master).curve.at(-1), .4); assert.equal(lastCurve(master).duration, .28);
    assert.equal(h.sources.length, 1); assert.equal(h.requests.length, 1); assert.equal(h.frames.size, 0);
  } finally { h.mixer.destroy(); }
});

test('load failure and timeout retain the existing song, abort stalled work, and require explicit retry', async () => {
  const gate = deferred(); let unavailable = true;
  const h = harness({ fetchResponse: (request, response) => request.key.endsWith('danger') ? gate.promise.then(() => response) : request.key.endsWith('grief') && unavailable ? { ok: false } : response });
  try {
    const first = await running(h); h.mixer.scene('last-train', 'grief'); await flush();
    for (let i = 0; i < 20; i++) h.mixer.scene('last-train', 'grief');
    assert.equal(h.requests.length, 2); assert.equal(h.live()[0], first); assert.equal(first.stops, 0);
    unavailable = false; await h.mixer.enable(); await flush(); assert.equal(h.requests.length, 3); h.step(1255);
    h.mixer.scene('last-train', 'danger'); await flush(); h.step(12000); assert.equal(h.requests.at(-1).signal.aborted, true);
    for (let i = 0; i < 20; i++) h.mixer.scene('last-train', 'danger');
    assert.equal(h.requests.length, 4); assert.equal(h.live()[0].buffer.key, 'last-train-grief');
    gate.resolve(); await flush(); assert.equal(h.sources.length, 2); assert.equal(h.mixer.diagnostics.pendingTrack, null);
  } finally { h.mixer.destroy(); }
});

test('decoded cache stays bounded as many stories are visited and recent tracks reuse their buffer', async () => {
  const h = harness();
  try {
    await running(h);
    for (const theme of ['glass-hotel', 'moon-market', 'deep-sea', 'dragon-banquet', 'clock-city', 'snow-radio']) {
      h.mixer.scene(theme, 'calm'); await flush(); h.step(1255);
      assert.ok(h.mixer.diagnostics.cachedTracks <= 3); assert.ok(h.mixer.diagnostics.cachedBytes <= 16 * 1024 * 1024); assert.equal(h.live().length, 1);
    }
    const count = h.requests.length; h.mixer.scene('clock-city', 'calm'); await flush(); assert.equal(h.requests.length, count);
  } finally { h.mixer.destroy(); }
  assert.equal(h.mixer.diagnostics.cachedBytes, 0); assert.equal(h.live().length, 0);
});

test('mute, disable and destroy stop all voices and pending work; a late response cannot resurrect sound', async () => {
  const gate = deferred(); const h = harness({ fetchResponse: (request, response) => request.key.endsWith('grief') ? gate.promise.then(() => response) : response });
  await running(h); h.mixer.scene('last-train', 'grief'); await flush(); h.mixer.effect('dice');
  h.mixer.setVolumes(0, 0); assert.equal(h.live().length, 0); assert.equal(h.effects().length, 0); assert.equal(h.requests.at(-1).signal.aborted, true); assert.equal(h.timers.size, 0);
  h.mixer.disable(); h.mixer.setVolumes(.25, .45); h.mixer.scene('clock-city', 'calm'); await flush(); assert.equal(h.requests.length, 2);
  h.mixer.destroy(); gate.resolve(); await flush(); h.mixer.resume(); h.mixer.effect('death'); await h.mixer.enable();
  assert.equal(h.contexts[0].closes, 1); assert.equal(h.sources.length, 1); assert.equal(h.requests.length, 2); assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
});

test('death and revival still preempt other effects and keep v19 cue and v17 ordinary-effect caches', async () => {
  const h = harness();
  try {
    h.mixer.setVolumes(0, .4); await h.mixer.enable();
    for (let i = 0; i < 10; i++) h.mixer.effect('attack'); assert.equal(h.effects().length, 4);
    h.mixer.effect('death'); assert.equal(h.effects().length, 1); assert.equal(h.effects()[0].initialSrc, '/game/audio/death.mp3?v=19000');
    h.mixer.effect('revive'); assert.equal(h.effects().length, 1); assert.equal(h.effects()[0].initialSrc, '/game/audio/revive.mp3?v=19000');
    assert.equal(h.requests.length, 0); assert.ok(h.media.slice(0, 4).every(item => item.initialSrc.endsWith('attack.mp3?v=17000')));
  } finally { h.mixer.destroy(); }
});

test('direct-file compatibility uses guarded same-phase overlap without fetch or an AudioContext', async () => {
  const h = harness({ protocol: 'file:' });
  try {
    h.mixer.scene('last-train', 'calm'); await h.mixer.enable(); await flush(); h.step(1250);
    assert.equal(h.mixer.backend, 'media'); assert.equal(h.contextCount, 0); assert.equal(h.requests.length, 0);
    const old = h.media[0], points = AUDIO_LOOPS['last-train-calm'], end = points.endFrame / points.sampleRate;
    near(old.currentTime, points.startFrame / points.sampleRate);
    old.currentTime = end - 1.5; old.dispatchEvent(new Event('timeupdate'));
    assert.equal(h.media.length, 2); assert.equal(h.media[1].preload, 'auto'); assert.equal(h.media[1].plays, 0);
    old.currentTime = end - .15; old.dispatchEvent(new Event('timeupdate')); await flush();
    const next = h.media[1]; near(next.currentTime, .35); assert.equal(next.plays, 1);
    h.step(120); near(old.volume + next.volume, .25); h.step(120);
    assert.equal(old.src, ''); assert.equal(next.src, '/game/audio/last-train-calm.mp3?v=20000');
    assert.equal(h.media.filter(item => item.src && item.loop).length, 1);
    h.mixer.duck(true); h.step(120); near(next.volume, .25 * .55); h.mixer.duck(false); h.step(280); near(next.volume, .25);
  } finally { h.mixer.destroy(); }
  assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0); assert.ok(h.media.every(item => !item.src));
});

test('file fallback discards its preloaded loop spare when the scene changes or the page pauses', async () => {
  const h = harness({ protocol: 'file:' });
  try {
    h.mixer.scene('last-train', 'calm'); await h.mixer.enable(); await flush(); h.step(1250);
    const old = h.media[0], points = AUDIO_LOOPS['last-train-calm']; old.currentTime = points.endFrame / points.sampleRate - 1;
    old.dispatchEvent(new Event('timeupdate')); const spare = h.media[1]; h.mixer.scene('last-train', 'grief'); await flush();
    assert.equal(spare.src, ''); assert.ok(h.media.filter(item => item.src && item.loop).length <= 2);
    h.mixer.pause(); assert.ok(h.media.every(item => item.paused)); assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  } finally { h.mixer.destroy(); }
});
