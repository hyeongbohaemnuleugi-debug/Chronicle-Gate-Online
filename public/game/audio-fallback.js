/* Media-element compatibility path for file:// and browsers without Web Audio.
 * Guarded regions are overlapped before the file boundary. This is deliberately
 * best effort: precise loops belong to the AudioBuffer path in audio.js. */
import { AUDIO_LOOPS, AUDIO_VERSION } from './audio-loops.js';
const clamp = (value, fallback = .5) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;
const MOODS = new Set(['mystery', 'calm', 'tension', 'danger', 'hope', 'grief']);
const SFX = new Set(['dice', 'success', 'mixed', 'failure', 'clue', 'reveal', 'transition', 'attack', 'ability', 'enemy', 'victory', 'death', 'revive']);
const PRIORITY_EFFECTS = new Set(['death', 'revive']);
const FADE_MS = 1250;
const START_TIMEOUT_MS = 8000;
const EFFECT_TIMEOUT_MS = 10000;

/** Runtime overrides make playback ownership and cleanup testable without speakers. */
export function createMediaAudio(onChange = () => {}, runtime = {}) {
  const Media = runtime.Audio || globalThis.Audio;
  const now = runtime.now || (() => performance.now());
  const requestFrame = runtime.requestFrame || (callback => requestAnimationFrame(callback));
  const cancelFrame = runtime.cancelFrame || (id => globalThis.cancelAnimationFrame?.(id));
  const setTimer = runtime.setTimer || ((callback, duration) => setTimeout(callback, duration));
  const clearTimer = runtime.clearTimer || (id => clearTimeout(id));
  let storage = runtime.storage;
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch {} }
  let saved = {};
  try { saved = JSON.parse(storage?.getItem('cg-v14-audio') || '{}'); } catch {}
  const prefs = { enabled: false, music: clamp(saved?.music ?? .25), effects: clamp(saved?.effects ?? .45) };
  let current = null, previous = null, desired = null, blockedDesired = null, loopSpare = null;
  let transition = 0, frameId = null, startTimer = null, pending = null, fade = null;
  let isPaused = false, destroyed = false, ducked = false, duckLevel = 1, duckFrame = null;
  const activeEffects = new Map();
  const disposed = new WeakSet();
  const musicListeners = new WeakSet();
  const level = () => prefs.enabled && !isPaused && !destroyed ? prefs.music * duckLevel : 0;
  const persist = () => {
    try { storage?.setItem('cg-v14-audio', JSON.stringify(prefs)); } catch {}
    onChange({ ...prefs });
  };
  const dispose = element => {
    if (!element || disposed.has(element)) return;
    disposed.add(element);
    element.pause();
    element.removeAttribute('src');
    element.load();
  };
  const clearStartTimer = () => {
    if (startTimer !== null) clearTimer(startTimer);
    startTimer = null;
  };
  const stopFrame = () => {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
    fade = null;
  };
  function cancelPending() {
    clearStartTimer();
    if (!pending) return;
    const request = pending;
    pending = null;
    current = request.resume ? request.next : request.old;
    previous = null;
    if (request.resume) request.next.pause();
    else dispose(request.next);
  }
  function settleMusic(normalize = true) {
    ++transition;
    cancelPending();
    stopFrame();
    dispose(previous);
    previous = null;
    dispose(loopSpare); loopSpare = null;
    if (current && normalize) current.volume = level();
  }
  function stopEffects() {
    for (const [element, timer] of activeEffects) {
      clearTimer(timer);
      dispose(element);
    }
    activeEffects.clear();
  }
  function updateFade(time) {
    if (!fade) return;
    const progress = Math.min(1, Math.max(0, (time - fade.start) / fade.duration));
    const smooth = progress * progress * (3 - 2 * progress);
    fade.next.volume = level() * smooth;
    if (fade.old) fade.old.volume = level() * fade.oldRatio * (1 - smooth);
    if (progress === 1) {
      const old = fade.old;
      fade = null;
      dispose(old);
      if (previous === old) previous = null;
    }
  }
  function crossfade(next, old, token, duration = FADE_MS) {
    const oldRatio = old && level() > 0 ? clamp(old.volume / level(), 1) : 0;
    fade = { next, old, start: now(), oldRatio, duration };
    function step(time) {
      if (token !== transition || !fade || destroyed) return;
      frameId = null;
      updateFade(time);
      if (fade) frameId = requestFrame(step);
    }
    frameId = requestFrame(step);
  }
  function failStart(request) {
    if (request.token !== transition || pending !== request) return;
    clearStartTimer();
    pending = null;
    ++transition;
    current = request.resume ? null : request.old;
    previous = null;
    blockedDesired = desired;
    dispose(request.next);
    if (current) current.volume = level();
  }
  function startPlayback(next, old, resume = false, loop = false) {
    const points = AUDIO_LOOPS[next.dataset.key];
    if (resume && points) {
      const start = points.startFrame / points.sampleRate, end = points.endFrame / points.sampleRate;
      if (next.currentTime >= end) { try { next.currentTime = start + (next.currentTime - end) % (end - start); } catch {} }
    }
    const request = { next, old, resume, loop, token: ++transition };
    pending = request;
    current = next;
    previous = resume ? null : old;
    next.volume = 0;
    startTimer = setTimer(() => failStart(request), START_TIMEOUT_MS);
    if (!musicListeners.has(next)) {
      musicListeners.add(next);
      next.addEventListener('error', () => {
        if (pending?.next === next) failStart(pending);
        else if (current === next) {
          ++transition;
          stopFrame();
          const fallback = previous;
          previous = null;
          current = fallback;
          dispose(next);
          if (current) current.volume = level();
          blockedDesired = desired;
        }
      }, { once: true });
    }
    let attempt;
    try { attempt = next.play(); } catch { failStart(request); return; }
    Promise.resolve(attempt).then(() => {
      if (request.token !== transition || pending !== request) return;
      clearStartTimer();
      pending = null;
      if (loop && old) {
        // Both files contain the same periodic music around their guard region.
        // Align after play() resolves so startup latency does not consume silence.
        const points = AUDIO_LOOPS[next.dataset.key];
        const linked = points.startFrame / points.sampleRate + old.currentTime - points.endFrame / points.sampleRate;
        try { next.currentTime = Math.max(0, Math.min(points.endFrame / points.sampleRate - .001, linked)); } catch {}
      }
      crossfade(next, resume ? null : old, request.token, loop ? 240 : FADE_MS);
    }, () => failStart(request));
  }
  function makeMusic(key, preload = 'none') {
    const element = new Media(`/game/audio/${key}.mp3?v=${AUDIO_VERSION}`);
    element.dataset.key = key; element.loop = true; element.preload = preload;
    const points = AUDIO_LOOPS[key];
    if (points) {
      const seek = () => { try { element.currentTime = points.startFrame / points.sampleRate; } catch {} };
      seek(); element.addEventListener('loadedmetadata', seek, { once: true });
      element.addEventListener('timeupdate', () => {
        if (current !== element || pending || fade || isPaused || !prefs.enabled || !level() || destroyed) return;
        const remaining = points.endFrame / points.sampleRate - element.currentTime;
        if (remaining > 2 || blockedDesired === desired) return;
        if (!loopSpare) {
          loopSpare = makeMusic(key, 'auto'); loopSpare.volume = 0;
          loopSpare.load();
        }
        if (remaining > .35) return;
        const next = loopSpare; loopSpare = null;
        startPlayback(next, element, false, true);
      });
    }
    return element;
  }
  function playDesired() {
    if (!prefs.enabled || isPaused || destroyed || !desired || prefs.music === 0 || !Media) return;
    if (pending?.next.dataset.key === desired) return;
    if (current?.dataset.key === desired && !current.paused) {
      // A receipt redraw must not jump to full volume halfway through a fade.
      if (!fade) current.volume = level();
      return;
    }
    if (blockedDesired === desired) return;
    settleMusic(false);
    if (current?.dataset.key === desired) {
      startPlayback(current, null, true);
      return;
    }
    const old = current;
    const next = makeMusic(desired);
    startPlayback(next, old);
  }
  return {
    get backend() { return 'media'; },
    get preferences() { return { ...prefs }; },
    async enable() {
      if (destroyed) return false;
      prefs.enabled = true;
      blockedDesired = null;
      persist();
      playDesired();
      // Do not hold the settings dialog open for a stalled media promise.
      return true;
    },
    disable() {
      prefs.enabled = false;
      if (duckFrame !== null) cancelFrame(duckFrame); duckFrame = null; duckLevel = ducked ? .55 : 1;
      settleMusic();
      if (current) { current.pause(); current.volume = 0; }
      stopEffects();
      persist();
    },
    async toggle() {
      if (prefs.enabled) this.disable(); else await this.enable();
      return prefs.enabled;
    },
    setVolumes(music, effects) {
      if (destroyed) return;
      prefs.music = clamp(music, prefs.music);
      prefs.effects = clamp(effects, prefs.effects);
      if (prefs.music === 0) {
        settleMusic();
        if (current) { current.pause(); current.volume = 0; }
      } else if (fade) updateFade(now());
      else if (current && !pending) current.volume = level();
      if (prefs.effects === 0) stopEffects();
      else for (const element of activeEffects.keys()) element.volume = prefs.effects;
      persist();
      if (prefs.music > 0) playDesired();
    },
    scene(campaignId, mood = 'mystery') {
      if (destroyed || !/^[a-z0-9-]+$/.test(campaignId || '')) return;
      const next = `${campaignId}-${MOODS.has(mood) ? mood : 'mystery'}`;
      if (desired !== next) blockedDesired = null;
      desired = next;
      playDesired();
    },
    duck(active) {
      if (destroyed || ducked === Boolean(active)) return;
      ducked = Boolean(active);
      if (duckFrame !== null) cancelFrame(duckFrame);
      const from = duckLevel, target = ducked ? .55 : 1, start = now(), duration = ducked ? 120 : 280;
      if (!prefs.enabled || isPaused) { duckLevel = target; duckFrame = null; return; }
      const step = time => {
        duckFrame = null;
        if (destroyed) return;
        const progress = Math.min(1, Math.max(0, (time - start) / duration));
        duckLevel = from + (target - from) * progress;
        if (fade) updateFade(time); else if (current && !pending) current.volume = level();
        if (progress < 1) duckFrame = requestFrame(step);
      };
      duckFrame = requestFrame(step);
    },
    effect(name) {
      if (!prefs.enabled || isPaused || destroyed || prefs.effects === 0 || !SFX.has(name) || !Media) return false;
      // A new death or revival takes ownership of the one-shot mix immediately.
      if (PRIORITY_EFFECTS.has(name)) stopEffects();
      if (activeEffects.size >= 4) return false;
      const version = PRIORITY_EFFECTS.has(name) ? '19000' : '17000';
      const element = new Media(`/game/audio/${name}.mp3?v=${version}`);
      element.preload = 'none';
      element.loop = false;
      element.volume = prefs.effects;
      const cleanup = () => {
        if (!activeEffects.has(element)) return;
        clearTimer(activeEffects.get(element));
        activeEffects.delete(element);
        dispose(element);
      };
      activeEffects.set(element, setTimer(cleanup, EFFECT_TIMEOUT_MS));
      element.addEventListener('ended', cleanup, { once: true });
      element.addEventListener('error', cleanup, { once: true });
      try { Promise.resolve(element.play()).catch(cleanup); } catch { cleanup(); }
      return true;
    },
    pause() {
      if (destroyed) return;
      isPaused = true;
      if (duckFrame !== null) cancelFrame(duckFrame); duckFrame = null; duckLevel = ducked ? .55 : 1;
      settleMusic();
      if (current) { current.pause(); current.volume = 0; }
      stopEffects();
    },
    resume() {
      if (destroyed) return;
      isPaused = false;
      blockedDesired = null;
      playDesired();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (duckFrame !== null) cancelFrame(duckFrame); duckFrame = null;
      prefs.enabled = false;
      settleMusic();
      dispose(current);
      current = null;
      desired = null;
      stopEffects();
    },
  };
}
