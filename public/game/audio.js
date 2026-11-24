/* Same-origin, pre-rendered music. A quiet page creates no audio requests. */
const clamp = (value, fallback = .5) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;
const MOODS = new Set(['mystery', 'calm', 'tension', 'danger', 'hope', 'grief']);
const SFX = new Set(['dice', 'success', 'mixed', 'failure', 'clue', 'reveal', 'transition', 'attack', 'ability', 'enemy', 'victory', 'death', 'revive']);
const PRIORITY_EFFECTS = new Set(['death', 'revive']);
const FADE_MS = 1250;
const START_TIMEOUT_MS = 8000;
const EFFECT_TIMEOUT_MS = 10000;

/** Runtime overrides make playback ownership and cleanup testable without speakers. */
export function createAudio(onChange = () => {}, runtime = {}) {
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
  let current = null, previous = null, desired = null, blockedDesired = null;
  let transition = 0, frameId = null, startTimer = null, pending = null, fade = null;
  let isPaused = false, destroyed = false;
  const activeEffects = new Map();
  const disposed = new WeakSet();
  const musicListeners = new WeakSet();
  const level = () => prefs.enabled && !isPaused && !destroyed ? prefs.music : 0;
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
    const progress = Math.min(1, Math.max(0, (time - fade.start) / FADE_MS));
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
  function crossfade(next, old, token) {
    const oldRatio = old && prefs.music > 0 ? clamp(old.volume / prefs.music, 1) : 0;
    fade = { next, old, start: now(), oldRatio };
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
  function startPlayback(next, old, resume = false) {
    const request = { next, old, resume, token: ++transition };
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
      crossfade(next, resume ? null : old, request.token);
    }, () => failStart(request));
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
    const next = new Media(`/game/audio/${desired}.mp3?v=19000`);
    next.dataset.key = desired;
    next.loop = true;
    next.preload = 'none';
    startPlayback(next, old);
  }
  return {
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
      prefs.enabled = false;
      settleMusic();
      dispose(current);
      current = null;
      desired = null;
      stopEffects();
    },
  };
}
