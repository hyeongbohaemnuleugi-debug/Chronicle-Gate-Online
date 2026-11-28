import { SCENE_SOUNDS, SOUND_LEVELS } from './scene-sound.js';
/* Buffered music runs on the audio clock. Rendering a page never restarts it. */
import { MUSIC_LOOPS, resolveMusicAsset, musicAssetUrl, isHorrorScore } from './music-assets.js';
import { createMediaAudio } from './audio-fallback.js';

const SFX = new Set(['dice', 'success', 'mixed', 'failure', 'clue', 'reveal', 'transition', 'attack', 'ability', 'enemy', 'victory', 'death', 'revive', ...SCENE_SOUNDS]);
const PRIORITY_EFFECTS = new Set(['death', 'revive']);
const FADE_SECONDS = 1.25;
const LOAD_TIMEOUT_MS = 12000;
const EFFECT_TIMEOUT_MS = 10000;
const CACHE_LIMIT = 3;
const CACHE_BYTES = 16 * 1024 * 1024;
const clamp = (value, fallback = .5) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;
const own = (value, key, fallback) => Object.hasOwn(value, key) ? value[key] : fallback;

/** The media-element fallback also keeps double-click file:// play available. */
export function createAudio(onChange = () => {}, runtime = {}) {
  const Context = own(runtime, 'AudioContext', globalThis.AudioContext || globalThis.webkitAudioContext);
  const fetcher = own(runtime, 'fetch', globalThis.fetch?.bind(globalThis));
  const protocol = own(runtime, 'protocol', globalThis.location?.protocol || 'https:');
  if (!Context || !fetcher || protocol === 'file:') return createMediaAudio(onChange, runtime);

  const effectNames = new WeakMap();
  const Media = runtime.Audio || globalThis.Audio;
  const setTimer = runtime.setTimer || ((callback, duration) => setTimeout(callback, duration));
  const clearTimer = runtime.clearTimer || (id => clearTimeout(id));
  const loops = runtime.loops || MUSIC_LOOPS;
  let storage = runtime.storage;
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch {} }
  let saved = {};
  try { saved = JSON.parse(storage?.getItem('cg-v14-audio') || '{}'); } catch {}
  const prefs = { enabled: false, music: clamp(saved?.music ?? .25), effects: clamp(saved?.effects ?? .45) };
  let context = null, master = null, contextReady = Promise.resolve();
  let desired = null, blockedDesired = null, isPaused = false, destroyed = false, ducked = false;
  let pending = null, queued = null, requestSerial = 0, mixSerial = 0, mixTimer = null, mixEndsAt = 0;
  let voices = [], masterEnvelope = null;
  const cache = new Map(), offsets = new Map(), effects = new Map(), disposedMedia = new WeakSet();
  const allowed = () => prefs.enabled && !isPaused && !destroyed && prefs.music > 0;
  const masterLevel = () => allowed() ? prefs.music * (ducked ? .55 : 1) : 0;
  const persist = () => { try { storage?.setItem('cg-v14-audio', JSON.stringify(prefs)); } catch {} onChange({ ...prefs }); };
  const cacheSize = () => [...cache.values()].reduce((sum, item) => sum + item.buffer.length * item.buffer.numberOfChannels * 4, 0);
  function trimCache() {
    while (cache.size > CACHE_LIMIT || cacheSize() > CACHE_BYTES) {
      const key = [...cache.keys()].find(key => !voices.some(voice => voice.key === key));
      if (key === undefined) break; // At most two active voices; each authored track is short and mono.
      cache.delete(key);
    }
  }
  function cached(key) {
    const item = cache.get(key);
    if (item) { cache.delete(key); cache.set(key, item); }
    return item;
  }
  const valueAt = (envelope, time, fallback = 0) => {
    if (!envelope) return fallback;
    const position = Math.max(0, Math.min(1, (time - envelope.start) / envelope.duration)) * (envelope.curve.length - 1);
    const index = Math.floor(position), fraction = position - index;
    return envelope.curve[index] * (1 - fraction) + envelope.curve[Math.min(index + 1, envelope.curve.length - 1)] * fraction;
  };
  function automate(param, oldEnvelope, curve, seconds, time = context.currentTime) {
    const held = valueAt(oldEnvelope, time, param.value || 0);
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
    else param.cancelScheduledValues(time);
    param.setValueAtTime(held, time);
    param.setValueCurveAtTime(curve, time, seconds);
    return { curve, start: time, duration: seconds };
  }
  const curveBetween = (from, to, count = 33) => Float32Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1), smooth = t * t * (3 - 2 * t);
    return from + (to - from) * smooth;
  });
  function updateMaster(seconds = .08) {
    if (!master || !context) return;
    const time = context.currentTime, from = valueAt(masterEnvelope, time, master.gain.value);
    masterEnvelope = automate(master.gain, masterEnvelope, curveBetween(from, masterLevel()), seconds, time);
  }
  function wakeContext() {
    if (!context) {
      try { context = new Context({ sampleRate: 32000, latencyHint: 'playback' }); }
      catch { context = new Context(); }
      master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    }
    // Call resume synchronously from enable/the settings gesture. Always enqueue
    // it after a pending suspend, even if state has not changed to suspended yet.
    try { contextReady = Promise.resolve(context.resume()).then(() => undefined); }
    catch (error) { contextReady = Promise.reject(error); }
    contextReady.catch(() => {});
    updateMaster();
  }
  function disposeVoice(voice) {
    if (!voice || voice.disposed) return;
    voice.disposed = true;
    try { voice.source.stop(); } catch {}
    try { voice.source.disconnect(); voice.gain.disconnect(); } catch {}
  }
  function cancelMix() {
    ++mixSerial;
    if (mixTimer !== null) clearTimer(mixTimer);
    mixTimer = null;
  }
  function cancelLoad() {
    ++requestSerial;
    if (!pending) return;
    const request = pending; pending = null;
    clearTimer(request.timer); request.controller.abort();
  }
  function sourceOffset(voice) {
    const length = voice.end - voice.start;
    const elapsed = Math.max(0, context.currentTime - voice.startedAt);
    return voice.start + ((voice.offset - voice.start + elapsed) % length + length) % length;
  }
  function stopMusic() {
    cancelLoad(); cancelMix(); queued = null;
    for (const voice of voices) { offsets.set(voice.key, sourceOffset(voice)); disposeVoice(voice); }
    while (offsets.size > CACHE_LIMIT) offsets.delete(offsets.keys().next().value);
    voices = []; mixEndsAt = 0;
    if (context) {
      updateMaster(.02);
      try { Promise.resolve(context.suspend()).catch(() => {}); } catch {}
    }
    trimCache();
  }
  function finishMix(token) {
    if (token !== mixSerial || destroyed) return;
    mixTimer = null;
    // Device interruptions can freeze the audio clock while wall-clock timers
    // continue. Never release a voice before its audible ramp has completed.
    if (context.currentTime < mixEndsAt - .0001) {
      mixTimer = setTimer(() => finishMix(token), Math.max(100, (mixEndsAt - context.currentTime) * 1000 + 5));
      return;
    }
    const main = voices.at(-1)?.retiring ? null : voices.at(-1);
    for (const voice of voices) if (voice !== main) disposeVoice(voice);
    voices = main ? [main] : []; mixEndsAt = 0;
    trimCache();
    const next = queued; queued = null;
    if (next && next.key === desired && allowed()) activate(next);
  }
  function retireOtherGenre() {
    // Loading a horror score may fail or take seconds. Do not leave a bright
    // score from the previous story playing throughout that wait. This uses
    // the same audio-clock envelope and cleanup ownership as a normal fade.
    if (!voices.some(voice => !isHorrorScore(voice.key) && !voice.retiring)) return;
    cancelMix();
    const time = context.currentTime, seconds = .35;
    for (const voice of voices) {
      const from = valueAt(voice.envelope, time, voice.gain.gain.value);
      const keepDark = isHorrorScore(voice.key);
      voice.envelope = automate(voice.gain.gain, voice.envelope, curveBetween(from, keepDark ? 1 : 0), seconds, time);
      voice.retiring = !keepDark;
    }
    // H1 -> original -> H2 may happen inside an unfinished fade. Keep the
    // already-playing dark voice as the owner; never preserve the original
    // merely because it happened to be the last source in that old fade.
    voices = [...voices.filter(voice => !isHorrorScore(voice.key)), ...voices.filter(voice => isHorrorScore(voice.key))];
    mixEndsAt = time + seconds;
    const token = mixSerial;
    mixTimer = setTimer(() => finishMix(token), seconds * 1000 + 5);
  }
  function activate(item) {
    if (!allowed() || item.key !== desired || !context) return;
    const time = context.currentTime;
    if (voices.length > 1 && time >= mixEndsAt) finishMix(mixSerial);
    if (voices.at(-1)?.key === item.key && !voices.at(-1)?.retiring) return;
    let next = voices.find(voice => voice.key === item.key);
    if (!next && voices.length > 1) {
      // A rapid third scene waits for the current audio-clock fade, rather than
      // cutting an audible voice or allocating a third simultaneous BGM.
      queued = item; return;
    }
    queued = null; cancelMix();
    const old = voices.find(voice => voice !== next) || null;
    if (!next) {
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = item.buffer; source.loop = true;
      source.loopStart = item.start; source.loopEnd = item.end;
      gain.gain.value = 0; source.connect(gain); gain.connect(master);
      const savedOffset = offsets.get(item.key);
      const offset = Number.isFinite(savedOffset) ? item.start + ((savedOffset - item.start) % (item.end - item.start) + item.end - item.start) % (item.end - item.start) : item.start;
      source.start(time, offset); offsets.delete(item.key);
      next = { key: item.key, source, gain, start: item.start, end: item.end, startedAt: time, offset, envelope: null, disposed: false };
    }
    next.retiring = false;
    const nextFrom = valueAt(next.envelope, time, next.gain.gain.value);
    const oldFrom = old ? valueAt(old.envelope, time, old.gain.gain.value) : 0;
    const angle = old ? Math.atan2(nextFrom, oldFrom || 0) : 0;
    const radius = old ? Math.hypot(nextFrom, oldFrom) : 0;
    const nextCurve = new Float32Array(65), oldCurve = new Float32Array(65);
    for (let i = 0; i < nextCurve.length; i++) {
      const t = i / (nextCurve.length - 1), theta = angle + (Math.PI / 2 - angle) * t;
      const energy = radius + (1 - radius) * t;
      nextCurve[i] = old ? Math.sin(theta) * energy : nextFrom + (1 - nextFrom) * Math.sin(Math.PI * t / 2);
      oldCurve[i] = old ? Math.cos(theta) * energy : 0;
    }
    nextCurve[nextCurve.length - 1] = 1; oldCurve[oldCurve.length - 1] = 0;
    next.envelope = automate(next.gain.gain, next.envelope, nextCurve, FADE_SECONDS, time);
    if (old) old.envelope = automate(old.gain.gain, old.envelope, oldCurve, FADE_SECONDS, time);
    voices = old ? [old, next] : [next]; mixEndsAt = time + FADE_SECONDS;
    const token = mixSerial;
    // The timer only releases silent nodes / starts a queued transition. Audible
    // gain ramps and every repeated loop continue without JS callbacks.
    mixTimer = setTimer(() => finishMix(token), FADE_SECONDS * 1000 + 5);
    trimCache();
  }
  function validPoints(key, buffer) {
    const points = loops[key];
    if (!points || !Number.isFinite(points.sampleRate) || points.sampleRate <= 0) throw new Error('Missing authored loop region');
    const start = points.startFrame / points.sampleRate, end = points.endFrame / points.sampleRate;
    if (!(start >= 0 && end > start && end <= buffer.duration && buffer.numberOfChannels <= 2 && buffer.duration < 90)) throw new Error('Invalid decoded loop region');
    return { key, buffer, start, end };
  }
  function playDesired() {
    if (!allowed() || !desired || !context) return;
    const playing = voices.find(voice => voice.key === desired);
    if (playing) {
      if (voices.at(-1) !== playing || playing.retiring) activate({ key: playing.key, buffer: playing.source.buffer, start: playing.start, end: playing.end });
      return;
    }
    if (pending?.key === desired || queued?.key === desired || blockedDesired === desired) return;
    const existing = cached(desired);
    if (existing) { activate(existing); return; }
    cancelLoad();
    const request = { key: desired, token: requestSerial, controller: new AbortController(), timer: null };
    pending = request;
    const failed = () => {
      if (pending !== request) return;
      clearTimer(request.timer); pending = null; blockedDesired = request.key;
      request.controller.abort();
    };
    request.timer = setTimer(failed, LOAD_TIMEOUT_MS);
    (async () => {
      try {
        const response = await fetcher(musicAssetUrl(request.key), { signal: request.controller.signal, cache: 'force-cache', credentials: 'same-origin' });
        if (!response.ok) throw new Error('Music could not be loaded');
        const bytes = await response.arrayBuffer();
        if (pending !== request || !allowed() || desired !== request.key) return;
        if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('Music asset exceeds its budget');
        const buffer = await context.decodeAudioData(bytes);
        await contextReady;
        if (pending !== request || !allowed() || desired !== request.key || destroyed) return;
        const item = validPoints(request.key, buffer);
        clearTimer(request.timer); pending = null;
        cache.delete(item.key); cache.set(item.key, item); trimCache();
        activate(item);
      } catch { failed(); }
    })();
  }
  function disposeMedia(element) {
    if (!element || disposedMedia.has(element)) return;
    disposedMedia.add(element); element.pause(); element.removeAttribute('src'); element.load();
  }
  function stopEffects() {
    for (const [element, timer] of effects) { clearTimer(timer); disposeMedia(element); }
    effects.clear();
  }
  return {
    get backend() { return 'buffer'; },
    get preferences() { return { ...prefs }; },
    get diagnostics() { return { cachedTracks: cache.size, cachedBytes: cacheSize(), playingTracks: voices.length, pendingTrack: pending?.key || null, queuedTrack: queued?.key || null }; },
    async enable() {
      if (destroyed) return false;
      prefs.enabled = true; blockedDesired = null; persist();
      try { wakeContext(); playDesired(); } catch { blockedDesired = desired; }
      return true;
    },
    disable() { if (destroyed) return; prefs.enabled = false; stopMusic(); stopEffects(); persist(); },
    async toggle() { if (prefs.enabled) this.disable(); else await this.enable(); return prefs.enabled; },
    setVolumes(music, effectLevel) {
      if (destroyed) return;
      prefs.music = clamp(music, prefs.music); prefs.effects = clamp(effectLevel, prefs.effects);
      if (!prefs.music) stopMusic();
      else {
        if (prefs.enabled && !isPaused) { try { if (!context || context.state !== 'running') wakeContext(); } catch {} }
        updateMaster(); playDesired();
      }
      if (!prefs.effects) stopEffects(); else for (const element of effects.keys()) element.volume = prefs.effects * (SOUND_LEVELS[effectNames.get(element)] ?? 1);
      persist();
    },
    scene(campaignId, mood = 'mystery') {
      const asset = resolveMusicAsset(campaignId, mood);
      if (destroyed || !asset) return;
      const key = asset.key;
      if (key !== desired) { desired = key; blockedDesired = null; queued = null; cancelLoad(); }
      if (isHorrorScore(key)) retireOtherGenre();
      playDesired();
    },
    duck(active) {
      if (destroyed || ducked === Boolean(active)) return;
      ducked = Boolean(active); updateMaster(ducked ? .12 : .28);
    },
    stopSceneEffects(){for(const [element,timer] of effects){if(SCENE_SOUNDS.includes(effectNames.get(element))){clearTimer(timer);effects.delete(element);disposeMedia(element);}}},
    effect(name) {
      if (!prefs.enabled || isPaused || destroyed || prefs.effects <= 0 || !SFX.has(name) || !Media) return false;
      if (PRIORITY_EFFECTS.has(name)) stopEffects();
      else if(SCENE_SOUNDS.includes(name)) for(const [other,timer] of effects){if(SCENE_SOUNDS.includes(effectNames.get(other))){clearTimer(timer);effects.delete(other);disposeMedia(other);}}
      if (effects.size >= 4) return false;
      const version = SCENE_SOUNDS.includes(name) ? '22000' : PRIORITY_EFFECTS.has(name) ? '19000' : '17000';
      const element = new Media(`/game/audio/${name}.mp3?v=${version}`);
      effectNames.set(element,name);
      element.preload = 'none'; element.loop = false; element.volume = prefs.effects * (SOUND_LEVELS[effectNames.get(element)] ?? 1);
      const cleanup = () => { if (!effects.has(element)) return; clearTimer(effects.get(element)); effects.delete(element); disposeMedia(element); };
      effects.set(element, setTimer(cleanup, EFFECT_TIMEOUT_MS));
      element.addEventListener('ended', cleanup, { once: true }); element.addEventListener('error', cleanup, { once: true });
      try { Promise.resolve(element.play()).catch(cleanup); } catch { cleanup(); }
      return true;
    },
    pause() { if (destroyed) return; isPaused = true; stopMusic(); stopEffects(); },
    resume() {
      if (destroyed) return;
      isPaused = false; blockedDesired = null;
      if (prefs.enabled) { try { wakeContext(); playDesired(); } catch { blockedDesired = desired; } }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; prefs.enabled = false; stopMusic(); stopEffects(); cache.clear(); offsets.clear();
      if (context) { try { Promise.resolve(context.close()).catch(() => {}); } catch {} }
      desired = null;
    },
  };
}
