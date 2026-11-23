/* Compact original MP3 assets. A silent page creates no audio requests. */
const clamp = (v, fallback = .5) => Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : fallback;
const MOODS = new Set(['mystery','calm','tension','danger','hope']);
const SFX = new Set(['dice','success','mixed','failure','clue','reveal','transition','attack','ability','enemy','victory']);
export function createAudio(onChange = () => {}) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('cg-v14-audio') || '{}'); } catch {}
  // Every visit starts quiet. The saved volume is retained without surprise playback.
  const prefs = { enabled:false, music:clamp(saved.music ?? .35), effects:clamp(saved.effects ?? .55) };
  let current = null, previous = null, desired = null, transition = 0;
  let isPaused = false;
  const activeEffects = new Set();
  const persist = () => { try { localStorage.setItem('cg-v14-audio', JSON.stringify(prefs)); } catch {} onChange({...prefs}); };
  const dispose = el => { if (!el) return; el.pause(); el.removeAttribute('src'); el.load(); };
  function crossfade(next, old, token) {
    const start = performance.now(), duration = 650;
    function frame(now) {
      if (token !== transition) return;
      const progress = Math.min(1, (now-start)/duration);
      next.volume = prefs.enabled && !isPaused ? prefs.music * progress : 0;
      if (old) old.volume = prefs.music * (1-progress);
      if (progress < 1) requestAnimationFrame(frame);
      else { dispose(old); if(previous === old) previous = null; }
    }
    requestAnimationFrame(frame);
  }
  async function playDesired() {
    if (!prefs.enabled || isPaused || !desired || prefs.music === 0) return;
    if (current?.dataset.key === desired) { current.volume=prefs.music; if(current.paused){try{await current.play();}catch{}} return; }
    const token = ++transition;
    if (previous) dispose(previous);
    const old=current, next=new Audio(`/game/audio/${desired}.mp3?v=16000`);
    next.dataset.key=desired; next.loop=true; next.volume=0; next.preload='none';
    current=next; previous=old;
    next.addEventListener('error',()=>{ if(current===next){current=null;dispose(old);} },{once:true});
    try {
      await next.play();
      if(token!==transition){dispose(next);return;}
      crossfade(next,old,token);
    } catch {
      if(current===next) current=old;
      previous=null; dispose(next);
    }
  }
  return {
    get preferences(){return {...prefs};},
    async enable(){prefs.enabled=true;persist();await playDesired();return prefs.enabled;},
    disable(){prefs.enabled=false;++transition;dispose(previous);previous=null;if(current)current.pause();for(const e of activeEffects)dispose(e);activeEffects.clear();persist();},
    async toggle(){if(prefs.enabled)this.disable();else await this.enable();return prefs.enabled;},
    setVolumes(music,effects){
      prefs.music=clamp(music,prefs.music);prefs.effects=clamp(effects,prefs.effects);
      if(current)current.volume=prefs.enabled&&!isPaused?prefs.music:0;
      if(prefs.music===0){++transition;dispose(previous);previous=null;current?.pause();}
      if(prefs.effects===0){for(const e of activeEffects)dispose(e);activeEffects.clear();}
      persist();if(prefs.music>0)void playDesired();
    },
    scene(campaignId,mood='mystery'){
      if(!/^[a-z0-9-]+$/.test(campaignId||''))return;
      desired=`${campaignId}-${MOODS.has(mood)?mood:'mystery'}`;
      void playDesired();
    },
    effect(name){
      if(!prefs.enabled||isPaused||prefs.effects===0||!SFX.has(name))return;
      // Avoid a pile-up of simultaneous one-shots on reconnection.
      if(activeEffects.size>=4)return;
      const el=new Audio(`/game/audio/${name}.mp3?v=16000`);el.preload='none';el.volume=prefs.effects;activeEffects.add(el);
      const cleanup=()=>{activeEffects.delete(el);dispose(el);};
      el.addEventListener('ended',cleanup,{once:true});el.addEventListener('error',cleanup,{once:true});
      el.play().catch(cleanup);
    },
    pause(){isPaused=true;if(current)current.pause();if(previous)previous.pause();for(const el of activeEffects)dispose(el);activeEffects.clear();},
    resume(){isPaused=false;void playDesired();},
    destroy(){++transition;dispose(current);dispose(previous);for(const el of activeEffects)dispose(el);activeEffects.clear();}
  };
}
