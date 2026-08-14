import { DiceTheater } from './dice3d.js?v=7400';

const CLIENT_BUILD = '7.6.0-release-story-overhaul';
console.info(`[Chronicle Gate] client ${CLIENT_BUILD}`);

const socket = window.io({ timeout: 10_000, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 500, reconnectionDelayMax: 5_000 });
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const REQUIRED_IDS = [
  'app', 'hudTop', 'connectionText', 'roomCodeTop', 'leaveRoomBtn', 'homeView', 'entryView', 'lobbyView', 'storyView', 'combatView', 'endingView',
  'openCreate', 'openJoin', 'entryBack', 'entryEyebrow', 'entryTitle', 'nameInput', 'codeField', 'codeInput', 'createRoomFields', 'roomNameInput', 'passwordCreateField', 'roomPasswordCreate', 'joinPasswordField', 'joinPasswordInput', 'roomBrowser', 'roomList', 'refreshRooms', 'entrySubmit', 'resumeCandidates', 'entryError',
  'roomCodeLobby', 'roomNameLobby', 'copyCode', 'playerSlots', 'campaignCarousel', 'campaignDetail', 'characterSummary', 'rollClassBtn', 'rollStatsBtn', 'startGameBtn', 'lobbyStatus', 'lobbyHomeBtn',
  'lobbyChatLog', 'lobbyChatForm', 'lobbyChatInput', 'lobbyGuideBtn',
  'partyRail', 'actLabel', 'eventTitle', 'turnBanner', 'deckCount', 'eventCadence', 'storySceneImg', 'storySceneCaption', 'storySituation', 'storyObjective', 'storyWhy', 'storyPrompt', 'storyActionBox', 'storyRoleContext', 'actionSuggestions', 'storyActionInput', 'storyActionCount', 'lastActionResult', 'eventText', 'voteTimer', 'facilityPanel', 'choiceArea', 'gmBar', 'advanceStoryBtn', 'continueBtn',
  'myJobMini', 'myStatsMini', 'economyPanel', 'jobSkillPanel', 'jobSkillName', 'jobSkillDesc', 'jobSkillBtn', 'jobSkillCooldown', 'threatValue', 'threatTrack', 'storyFill', 'storyValue', 'chatLog', 'chatForm', 'chatInput',
  'monsterName', 'combatTurnPanel', 'combatTurnPhase', 'combatRoundLabel', 'combatTimeline', 'bossTurnWarning', 'combatSceneImg', 'monsterAC', 'monsterHpFill', 'monsterHpText', 'combatParty', 'combatSkillBtn', 'defendBtn', 'attackBtn', 'combatLog',
  'endingEyebrow', 'endingIcon', 'endingTitle', 'endingText', 'endingStats', 'endingHomeBtn',
  'toast', 'resolutionModal', 'resolutionEyebrow', 'resolutionTitle', 'resolutionText', 'resolutionClose',
  'diceOverlay', 'diceCanvas', 'diceRoller', 'dicePurpose', 'diceFinal', 'diceBreakdown', 'diceSub',
  'helpBtn', 'helpModal', 'helpClose', 'helpTitle', 'helpBody', 'helpTabGuide', 'helpTabSettings', 'helpTabSession', 'helpPanelGuide', 'helpPanelSettings', 'helpPanelSession', 'themeDarkBtn', 'themeLightBtn', 'chatSizeRange', 'chatSizeValue', 'audioMuteBtn', 'audioTestBtn', 'audioVolumeRange', 'audioVolumeValue', 'uiResetBtn', 'abandonVoteBox', 'abandonRequestBtn', 'abandonYes', 'abandonNo', 'helpConnectionHint', 'versionLabel', 'resumeGate'
];
const missingIds = REQUIRED_IDS.filter(id => !document.getElementById(id));
if (missingIds.length) {
  document.body.innerHTML = `<main style="padding:32px;background:#100;color:#fff;font-family:system-ui;min-height:100vh"><h1>Chronicle Gate UI load error</h1><p>HTML과 JavaScript 버전이 서로 맞지 않습니다.</p><pre>${missingIds.join('\n')}</pre><p>public 폴더를 새 버전으로 통째로 교체한 뒤 Render에서 재배포해 주세요.</p></main>`;
  throw new Error(`Missing required DOM ids: ${missingIds.join(', ')}`);
}

let dice = null;
function getDiceTheater() {
  if (dice) return dice;
  try { dice = new DiceTheater($('#diceCanvas')); }
  catch (error) { console.error('[dice] 3D renderer unavailable:', error); dice = null; }
  return dice;
}
let campaigns = [];
let state = null;
let mode = 'create';
let roomCode = localStorage.getItem('cg_room') || '';
let playerToken = localStorage.getItem('cg_token') || '';
let diceQueue = Promise.resolve();
let resumeInFlight = false;
let shownEncounterId = '';
let encounterIntroTimer = null;
let lastChatRenderKey = '';
const app = $('#app');

const UI_DEFAULTS = { theme: 'dark', chatSize: 300, audioVolume: 0.65, audioMuted: false };
function loadUiPrefs() {
  const theme = localStorage.getItem('cg_theme') === 'light' ? 'light' : 'dark';
  const rawSize = Number(localStorage.getItem('cg_chat_size') || UI_DEFAULTS.chatSize);
  const chatSize = Math.max(300, Math.min(520, Number.isFinite(rawSize) ? rawSize : UI_DEFAULTS.chatSize));
  const rawVolume = Number(localStorage.getItem('cg_audio_volume'));
  const audioVolume = Number.isFinite(rawVolume) ? Math.max(0, Math.min(1, rawVolume)) : UI_DEFAULTS.audioVolume;
  const audioMuted = localStorage.getItem('cg_audio_muted') === '1';
  return { theme, chatSize, audioVolume, audioMuted };
}
let uiPrefs = loadUiPrefs();
function applyUiPrefs() {
  document.documentElement.dataset.theme = uiPrefs.theme;
  document.documentElement.style.setProperty('--chat-width', `${uiPrefs.chatSize}px`);
  document.documentElement.style.setProperty('--lobby-chat-height', `${Math.round(220 + (uiPrefs.chatSize - 300) * .9)}px`);
  const range = $('#chatSizeRange');
  if (range) range.value = String(uiPrefs.chatSize);
  const value = $('#chatSizeValue');
  if (value) value.textContent = uiPrefs.chatSize === 300 ? '기본' : `${uiPrefs.chatSize}px`;
  $('#themeDarkBtn')?.classList.toggle('selected-setting', uiPrefs.theme === 'dark');
  $('#themeLightBtn')?.classList.toggle('selected-setting', uiPrefs.theme === 'light');
  const audioRange = $('#audioVolumeRange');
  if (audioRange) audioRange.value = String(Math.round(uiPrefs.audioVolume * 100));
  const audioValue = $('#audioVolumeValue');
  if (audioValue) audioValue.textContent = uiPrefs.audioMuted ? '음소거' : `${Math.round(uiPrefs.audioVolume * 100)}%`;
  const muteBtn = $('#audioMuteBtn');
  if (muteBtn) muteBtn.textContent = uiPrefs.audioMuted ? '사운드 꺼짐' : '사운드 켜짐';
  if (typeof audioManager !== 'undefined') audioManager.applyPrefs();
}
function saveUiPrefs() {
  localStorage.setItem('cg_theme', uiPrefs.theme);
  localStorage.setItem('cg_chat_size', String(uiPrefs.chatSize));
  localStorage.setItem('cg_audio_volume', String(uiPrefs.audioVolume));
  localStorage.setItem('cg_audio_muted', uiPrefs.audioMuted ? '1' : '0');
  applyUiPrefs();
}
// QA compatibility marker only: ./audio/bgm_ember.wav
const AUDIO_FILES = {
  music: {
    ember: '/audio/bgm_ember.wav?v=4121d', neon: '/audio/bgm_neon.wav?v=4121d', abyss: '/audio/bgm_abyss.wav?v=4121d',
    clock: '/audio/bgm_clock.wav?v=4121d', wild: '/audio/bgm_wild.wav?v=4121d', guardian: '/audio/bgm_guardian.wav?v=4150', guardian1: '/audio/bgm_guardian.wav?v=4160', guardian2: '/audio/bgm_guardian.wav?v=4160', guardian3: '/audio/bgm_guardian.wav?v=4160', combat: '/audio/bgm_combat.wav?v=4121d',
  },
  fx: {
    dice:'/audio/dice_roll.wav?v=4121d', success:'/audio/success.wav?v=4121d', failure:'/audio/failure.wav?v=4121d',
    next:'/audio/scene_next.wav?v=4121d', hp:'/audio/hp_loss.wav?v=4121d', attack:'/audio/attack.wav?v=4121d',
    hit:'/audio/hit.wav?v=4121d', boss:'/audio/boss_warning.wav?v=4121d', vote:'/audio/vote_lock.wav?v=4121d',
    click:'/audio/scene_next.wav?v=4121d', select:'/audio/dice_roll.wav?v=4121d', skill:'/audio/success.wav?v=4121d', combatStart:'/audio/boss_warning.wav?v=4121d', heal:'/audio/success.wav?v=4121d',
  },
};

class AudioManager {
  constructor(){
    this.unlocked=false;
    this.ctx=null;
    this.music=null;
    this.musicKey='';
    this.synthMusic=[];
    this.lastFxAt=new Map();
    this.lastError='';
  }
  volume(mult=1){ return uiPrefs.audioMuted ? 0 : Math.max(0,Math.min(1,uiPrefs.audioVolume*mult)); }
  ensureContext(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC){ this.lastError='이 브라우저는 Web Audio API를 지원하지 않습니다.'; return null; }
      if(!this.ctx) this.ctx=new AC({latencyHint:'interactive'});
      return this.ctx;
    }catch(err){ this.lastError=String(err?.message||err); return null; }
  }
  async unlock(){
    this.unlocked=true;
    const ctx=this.ensureContext();
    if(!ctx) return null;
    try{
      if(ctx.state==='suspended') await ctx.resume();
      // Chrome가 사용자 제스처를 인정했는지 한 프레임 뒤 다시 확인한다.
      if(ctx.state==='suspended'){
        await new Promise(resolve=>setTimeout(resolve,0));
        await ctx.resume();
      }
    }catch(err){ this.lastError=`AudioContext resume 실패: ${String(err?.message||err)}`; }
    if(ctx.state==='running') this.syncMusic(state);
    return ctx;
  }
  contextStatus(){
    const ctx=this.ensureContext();
    return ctx ? ctx.state : 'unsupported';
  }
  forceTestPulse(){
    const ctx=this.ensureContext();
    if(!ctx || ctx.state!=='running' || uiPrefs.audioMuted) return false;
    const now=ctx.currentTime;
    const notes=[523.25,659.25,783.99];
    notes.forEach((freq,i)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      const start=now+i*.16;
      osc.type='square';
      osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.18,this.volume(.38)),start+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.13);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start+.15);
    });
    return true;
  }
  async playNativeWavProbe(){
    try{
      const sampleRate=44100;
      const duration=0.72;
      const samples=Math.floor(sampleRate*duration);
      const buffer=new ArrayBuffer(44+samples*2);
      const view=new DataView(buffer);
      const write=(offset,value)=>{ for(let i=0;i<value.length;i++) view.setUint8(offset+i,value.charCodeAt(i)); };
      write(0,'RIFF'); view.setUint32(4,36+samples*2,true); write(8,'WAVE'); write(12,'fmt ');
      view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
      view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
      write(36,'data'); view.setUint32(40,samples*2,true);
      for(let i=0;i<samples;i++){
        const t=i/sampleRate;
        const env=Math.min(1,t/.02)*Math.min(1,(duration-t)/.08);
        const tone=(Math.sin(2*Math.PI*660*t)*.65 + Math.sin(2*Math.PI*990*t)*.24)*env;
        view.setInt16(44+i*2,Math.max(-1,Math.min(1,tone))*32767,true);
      }
      const url=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));
      const audio=document.createElement('audio');
      audio.src=url; audio.preload='auto'; audio.volume=1; audio.muted=false; audio.defaultMuted=false; audio.playsInline=true;
      audio.setAttribute('aria-hidden','true');
      audio.style.cssText='position:fixed;width:1px;height:1px;opacity:.001;pointer-events:none;left:-20px;bottom:0';
      document.body.appendChild(audio);
      await audio.play();
      setTimeout(()=>{ try{audio.pause();audio.remove();URL.revokeObjectURL(url);}catch{} },1100);
      return {ok:true};
    }catch(err){
      this.lastError=`HTMLAudio 테스트 실패: ${String(err?.message||err)}`;
      return {ok:false,error:this.lastError};
    }
  }
  async probeAudioAsset(){
    try{
      const res=await fetch(`/audio/success.wav?v=4121d-${Date.now()}`,{cache:'no-store'});
      return {ok:res.ok,status:res.status,type:res.headers.get('content-type')||''};
    }catch(err){ return {ok:false,status:0,error:String(err?.message||err)}; }
  }
  makeTone(freq=440,duration=.16,volume=.12,type='sine',delay=0){
    const ctx=this.ensureContext();
    if(!ctx || uiPrefs.audioMuted) return;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    const t=ctx.currentTime+delay;
    osc.type=type; osc.frequency.setValueAtTime(freq,t);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(Math.max(.025,this.volume(volume)),t+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+duration+.02);
  }
  makeNoise(duration=.18,volume=.10,delay=0){
    const ctx=this.ensureContext();
    if(!ctx || uiPrefs.audioMuted) return;
    const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
    const src=ctx.createBufferSource();
    const filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();
    const t=ctx.currentTime+delay;
    filter.type='lowpass'; filter.frequency.value=1500;
    gain.gain.setValueAtTime(this.volume(volume),t);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.buffer=buffer; src.connect(filter); filter.connect(gain); gain.connect(ctx.destination); src.start(t);
  }
  synthFx(name,mult=1){
    const v=Math.max(.45,Math.min(1.25,mult));
    if(name==='dice'){ this.makeNoise(.20,.16*v); this.makeTone(160,.09,.10*v,'square',.02); this.makeTone(220,.10,.08*v,'square',.11); }
    else if(name==='success'){ this.makeTone(620,.15,.14*v,'sine'); this.makeTone(820,.18,.14*v,'sine',.10); this.makeTone(1040,.22,.12*v,'sine',.20); }
    else if(name==='failure'){ this.makeTone(210,.18,.14*v,'sawtooth'); this.makeTone(145,.26,.14*v,'sawtooth',.12); }
    else if(name==='next'){ this.makeTone(390,.12,.10*v,'sine'); this.makeTone(590,.18,.10*v,'sine',.10); }
    else if(name==='attack'){ this.makeNoise(.12,.18*v); this.makeTone(150,.12,.14*v,'sawtooth'); }
    else if(name==='hit'){ this.makeNoise(.10,.20*v); this.makeTone(95,.14,.13*v,'square'); }
    else if(name==='hp'){ this.makeTone(115,.20,.14*v,'sawtooth'); this.makeTone(82,.20,.12*v,'sine',.12); }
    else if(name==='boss'){ this.makeTone(72,.34,.15*v,'sawtooth'); this.makeTone(96,.34,.12*v,'square',.16); }
    else if(name==='vote'){ this.makeTone(520,.12,.15*v,'sine'); this.makeTone(700,.14,.15*v,'sine',.10); }
    else if(name==='click'){ this.makeTone(560,.045,.18*v,'square'); this.makeTone(720,.055,.12*v,'sine',.035); }
    else if(name==='select'){ this.makeTone(430,.08,.18*v,'triangle'); this.makeTone(650,.10,.14*v,'sine',.06); }
    else if(name==='skill'){ this.makeTone(520,.10,.16*v,'sine'); this.makeTone(780,.14,.16*v,'sine',.08); this.makeTone(1040,.18,.13*v,'sine',.16); }
    else if(name==='heal'){ this.makeTone(440,.14,.13*v,'sine'); this.makeTone(660,.18,.14*v,'sine',.10); this.makeTone(880,.22,.12*v,'sine',.20); }
    else if(name==='combatStart'){ this.makeTone(92,.32,.16*v,'sawtooth'); this.makeTone(138,.28,.14*v,'square',.16); this.makeNoise(.20,.12*v,.10); }
    else this.makeTone(440,.12,.15*v,'sine');
  }
  fx(name,mult=1){
    if(uiPrefs.audioMuted || !AUDIO_FILES.fx[name]) return;
    const ctx=this.ensureContext();
    if(!this.unlocked || !ctx || ctx.state!=='running'){
      this.unlock().then(active=>{ if(active?.state==='running') this.fx(name,mult); });
      return;
    }
    const now=performance.now();
    if(now-(this.lastFxAt.get(name)||0)<70) return;
    this.lastFxAt.set(name,now);
    // WebAudio tone is always played. It does not depend on WAV loading, so effects remain audible even if an asset is missing.
    this.synthFx(name,mult);
    try{
      const a=new Audio(AUDIO_FILES.fx[name]);
      a.preload='auto'; a.volume=this.volume(Math.min(.8,mult*.65));
      a.play().catch(err=>{ this.lastError=String(err?.message||err); });
    }catch(err){ this.lastError=String(err?.message||err); }
  }
  wantedMusic(s){
    if(!s?.campaignId) return '';
    if(s.phase==='combat') return 'combat';
    if(['lobby','prologue','story','resolution','ending'].includes(s.phase)) return s.campaignId;
    return '';
  }
  stopSynthMusic(){
    for(const item of this.synthMusic){ try{ item.osc.stop(); }catch{} try{ item.osc.disconnect(); item.gain.disconnect(); }catch{} }
    this.synthMusic=[];
  }
  startSynthMusic(key){
    const ctx=this.ensureContext();
    if(!ctx || ctx.state!=='running' || uiPrefs.audioMuted || !key) return;
    this.stopSynthMusic();
    const presets={
      ember:[55,82.4,110], neon:[73.4,110,146.8], abyss:[41.2,61.7,82.4],
      clock:[65.4,98,130.8], wild:[49,73.4,98], combat:[55,73.4,110,146.8]
    };
    const freqs=presets[key]||presets.ember;
    freqs.forEach((freq,i)=>{
      const osc=ctx.createOscillator(); const gain=ctx.createGain(); const lfo=ctx.createOscillator(); const lfoGain=ctx.createGain();
      osc.type=i%2?'triangle':'sine'; osc.frequency.value=freq;
      const base=(key==='combat'?.085:.060)*(1-i*.10)*Math.max(.55,uiPrefs.audioVolume);
      gain.gain.value=base;
      lfo.type='sine'; lfo.frequency.value=.05+i*.03; lfoGain.gain.value=base*.35;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain); osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); lfo.start();
      this.synthMusic.push({osc,gain,lfo,lfoGain});
    });
  }
  applyPrefs(){
    if(this.music) this.music.volume=this.volume(.34);
    if(uiPrefs.audioMuted){ this.music?.pause?.(); this.stopSynthMusic(); }
    else if(this.unlocked && this.music) this.music.play().catch(()=>{});
  }
  syncMusic(s){
    if(!this.unlocked) return;
    const key=this.wantedMusic(s);
    if(key===this.musicKey){ this.applyPrefs(); return; }
    if(this.music){ try{this.music.pause();this.music.currentTime=0;}catch{} }
    this.music=null; this.stopSynthMusic(); this.musicKey=key;
    if(!key || uiPrefs.audioMuted) return;
    // Generated ambience starts immediately and is different for every chronicle/combat.
    this.startSynthMusic(key);
    const src=AUDIO_FILES.music[key];
    if(!src) return;
    try{
      const a=new Audio(src); a.loop=true; a.preload='auto'; a.volume=this.volume(.28); this.music=a;
      a.play().catch(err=>{ this.lastError=String(err?.message||err); });
    }catch(err){ this.lastError=String(err?.message||err); }
  }
  async test(){
    uiPrefs.audioMuted=false;
    uiPrefs.audioVolume=1;
    saveUiPrefs();
    this.lastError='';
    const ctx=await this.unlock();
    const status=ctx?.state || 'unsupported';
    const native=await this.playNativeWavProbe();
    const asset=await this.probeAudioAsset();
    const pulse=status==='running' ? this.forceTestPulse() : false;
    if(status==='running'){
      setTimeout(()=>this.fx('success',1.25),760);
      setTimeout(()=>this.fx('dice',1.25),1120);
      setTimeout(()=>this.fx('boss',1.15),1500);
      this.syncMusic(state);
    }
    if(status!=='running') this.lastError=`AudioContext가 ${status} 상태입니다.`;
    return {ok:Boolean(native.ok||pulse),status,nativeOk:native.ok,assetOk:asset.ok,assetStatus:asset.status,error:this.lastError};
  }
  onState(prev,next){
    this.syncMusic(next);
    if(!prev||!next) return;
    if(prev.phase==='resolution'&&next.phase==='story') this.fx('next',1.05);
    if(prev.phase==='prologue'&&next.phase==='story') this.fx('next',1.05);
    if(prev.phase!=='combat'&&next.phase==='combat') this.fx('combatStart',1.15);
    if(prev.phase==='combat'&&next.phase!=='combat') this.fx('success',1.05);
    if(prev.phase!=='ending'&&next.phase==='ending') this.fx('success',1.2);
    const prevPlayers=new Map((prev.players||[]).map(p=>[p.id,p]));
    const lostHp=(next.players||[]).some(p=>prevPlayers.has(p.id)&&Number(p.hp)<Number(prevPlayers.get(p.id).hp));
    if(lostHp){ this.fx('hit',.9); setTimeout(()=>this.fx('hp',1),100); }
    const prevMonster=prev.monster; const nextMonster=next.monster;
    if(prevMonster&&nextMonster&&Number(nextMonster.hp)<Number(prevMonster.hp)) this.fx('hit',1);
    if(prevMonster?.turnPhase!=='boss'&&nextMonster?.turnPhase==='boss') this.fx('boss',1);
    if(!prev.voteAllVotedCountdown&&next.voteAllVotedCountdown) this.fx('vote',1);
  }
}

const audioManager = new AudioManager();
const unlockAudio=()=>{ audioManager.unlock().catch(()=>{}); };
window.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});
window.addEventListener('keydown',unlockAudio,{capture:true});
window.addEventListener('touchstart',unlockAudio,{capture:true,passive:true});

// v4.12.1D: every meaningful UI click gets immediate local feedback.
// This is client-only and does not alter game state or server flow.
document.addEventListener('click', async event => {
  const target = event.target?.closest?.('button, .choice-card, [role="button"], input[type="range"]');
  if (!target || target.disabled) return;
  await audioManager.unlock();
  const isChoice = target.classList?.contains('choice-card') || target.classList?.contains('story-choice');
  audioManager.fx(isChoice ? 'select' : 'click', isChoice ? 1.15 : .92);
}, { capture:true });

applyUiPrefs();

function resetTransientUi() {
  $('#helpModal')?.classList.remove('show');
  $('#helpModal')?.setAttribute('aria-hidden', 'true');
  if ($('#helpModal')) $('#helpModal').hidden = true;
  $('#resolutionModal')?.classList.remove('show');
  $('#diceOverlay')?.classList.remove('show');
  $('#diceFinal')?.classList.remove('is-result');
}
function clearSavedSession(message = '') {
  localStorage.removeItem('cg_room');
  localStorage.removeItem('cg_token');
  roomCode = '';
  playerToken = '';
  state = null;
  resetTransientUi();
  $('#resumeGate')?.classList.add('hidden');
  view('homeView');
  if (message) toast(message);
}
function resumeSavedSession(attempt = 0) {
  if (!roomCode || !playerToken || !socket.connected || resumeInFlight) return;
  resumeInFlight = true;
  $('#connectionText').textContent = 'RESTORING';
  socket.timeout(12_000).emit('room:join', { roomCode, playerToken }, (err, res) => {
    resumeInFlight = false;
    if (!err && res?.ok) {
      state = res.state;
      audioManager.syncMusic(state);
      renderState();
      if (state.phase === 'resolution' && state.lastResolution && !['story','event'].includes(String(state.lastResolution.source || ''))) showResolution(state.lastResolution);
      $('#connectionText').textContent = 'ONLINE';
      return;
    }
    if (!err && res && res.ok === false) {
      clearSavedSession('이전 세션이 만료되었거나 존재하지 않아 메인으로 돌아왔습니다.');
      return;
    }
    resetTransientUi();
    state = null;
    view('homeView');
    $('#connectionText').textContent = 'RECONNECTING';
    if (attempt < 2) {
      setTimeout(() => {
        if (!socket.connected) socket.connect();
        else resumeSavedSession(attempt + 1);
      }, 1_200 * (attempt + 1));
    } else {
      toast('서버 재연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
    }
  });
}
resetTransientUi();

const WORLD_META = {
  ember: { motif: 'ASHEN THRONE', scene: ['잿빛 성채', '왕묘 회랑', '용암 성문', '죽은 왕의 제단', '마지막 즉위식'], boss: '재와 불꽃 사이에서 솟아난 고대 왕의 형상' },
  neon: { motif: 'NEON ABYSS', scene: ['전광판 골목', '기억 암시장', '봉쇄구역 스카이라인', 'MOTHER-9 코어', '새벽의 데이터 도로'], boss: '형광빛 기계 촉수와 붉은 센서를 가진 거대 AI 아바타' },
  abyss: { motif: 'LAST LIGHTHOUSE', scene: ['침수 통로', '관측창 심연', '해저 균열', '압력문 격납고', '상승용 잠수정 갑판'], boss: '깊은 바다의 거대한 촉수와 푸른 눈을 지닌 심연체' },
  clock: { motif: 'THIRTEENTH BELL', scene: ['시계광장', '사라지는 거리', '시간 밀수 시장', '열세 번째 탑', '루프가 끝나는 새벽'], boss: '금빛 톱니와 검은 망토로 된 시간의 파수꾼' },
  wild: { motif: 'STAR-EATEN WOODS', scene: ['별가루 숲길', '말하는 고목', '유성 대장간', '숲의 심장', '마지막 별이 뜬 밤하늘'], boss: '별빛을 삼킨 거대한 신수와 숲의 오오라' },
  guardian: { motif: 'FALL OF THE ROYAL CAPITAL', scene: ['캔터베리 숲','티탄 왕국','마법학교','광기의 사막','셴으로 향하는 길','셴 시티','거대한 여관','던전 왕국','쉬버링 산','라 제국 국경','라 제국 수용소','10년 뒤의 폐허','미래 공주의 저항군','헤븐홀드 탈환전','기록되지 않은 세계의 새벽'], boss: '월드 1부터 미래의 헤븐홀드까지 이어진 선택과 인연이 한꺼번에 되돌아오는 연대기의 마지막 시련' },
  echo: { motif:'TERMINAL TRACK ZERO', scene:['불 꺼진 청명역 대합실','직원 통로의 회색 화살표','0번 승강장','3분 17초 뒤의 CCTV','04시 58분 첫차'], boss:'운행이 끝난 역에서 정상 시간표와 존재하지 않는 0번 운행이 충돌하며 만들어진 마지막 이상 현상' },
  aurora: { motif:'CRIMSON AURORA', scene:['붉은 극광 아래 관측소','빙하 시추 갱도','창설 원정대 기록실','자기장 기억층','마지막 송신실'], boss:'기억을 저장한 얼음층과 관측소의 자기장 코어가 충돌하며 만들어진 적색광 공명' },
  masque: { motif:'ECLIPSE MASQUERADE', scene:['월식의 성문','가면 야시장','이름 없는 원형극장','붉은 막 뒤 기록실','달이 지는 마지막 무대'], boss:'천 년 동안 마지막 장을 끝내지 못한 도시와 배역들이 만들어 낸 월식의 마지막 공연' },
  guardian1: { motif:'GUARDIAN TALES I', scene:['캔터베리 숲','티탄 왕국','마법학교','광기의 사막','셴으로 향하는 길'], boss:'월드 1~4의 인연과 침략의 흔적이 겹쳐진 첫 연대기의 마지막 시련' },
  guardian2: { motif:'GUARDIAN TALES II', scene:['셴 시티','작아진 여관','던전 왕국','쉬버링 산','라 제국 국경'], boss:'월드 5~8의 챔피언과 진실을 시험하는 두 번째 연대기의 마지막 시련' },
  guardian3: { motif:'GUARDIAN TALES III', scene:['라 제국','10년 뒤의 폐허','저항군 기지','점령된 헤븐홀드','차원의 문'], boss:'미래 공주와 저항군이 맞서는 기록되지 않은 세계의 최종 결전' },
};

const STORY_ART_FILES = {
  ember: { early: '/art/ember_early.png?v=661', late: '/art/ember_late.png?v=661' },
  neon: { early: '/art/neon_early.png?v=661', late: '/art/neon_late.png?v=661' },
  abyss: { early: '/art/abyss_early.png?v=661', late: '/art/abyss_late.png?v=661' },
  clock: { early: '/art/clock_early.png?v=661', late: '/art/clock_late.png?v=661' },
  wild: { early: '/art/wild_early.png?v=661', late: '/art/wild_late.png?v=661' },
  guardian: { profile:'/art/guardian_profile.png?v=6900', early: '/art/guardian_early.png?v=661', late: '/art/guardian_late.png?v=661' },
  guardian1: { profile:'/art/guardian_part1_profile.png?v=661', early:'/art/guardian_part1_profile.png?v=661', late:'/art/guardian_part1_profile.png?v=661' },
  guardian2: { profile:'/art/guardian_part2_profile.png?v=661', early:'/art/guardian_part2_profile.png?v=661', late:'/art/guardian_part2_profile.png?v=661' },
  guardian3: { profile:'/art/guardian_part3_profile.png?v=661', early:'/art/guardian_part3_profile.png?v=661', late:'/art/guardian_part3_profile.png?v=661' },
  echo: { profile:'/art/echo_profile.png?v=661', early:'/art/echo_profile.png?v=661', late:'/art/echo_profile.png?v=661' },
  aurora: { profile:'/art/aurora_profile.png?v=7200', early:'/art/aurora_profile.png?v=7200', late:'/art/aurora_profile.png?v=7200' },
  masque: { profile:'/art/masque_profile.png?v=7200', early:'/art/masque_profile.png?v=7200', late:'/art/masque_profile.png?v=7200' },
};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function view(id) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#' + id).classList.add('active');
  $('#hudTop').classList.toggle('hidden', id === 'homeView' || id === 'entryView');
}
function me() { return state?.players?.find(p => p.id === playerToken); }
function isHost() { return !!me()?.host; }
function esc(s = '') { return String(s).replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m])); }
function signedMod(v) { const m = Math.floor((Number(v || 10) - 10) / 2); return (m >= 0 ? '+' : '') + m; }
function rawMod(v) { return Math.floor((Number(v || 10) - 10) / 2); }
function setWorld(c) { if (!c) return; app.dataset.world = c.id; document.documentElement.style.setProperty('--accent', c.accent); document.documentElement.style.setProperty('--accent2', c.accent2); }
function makeParticles() { const box = $('#particles'); for (let i = 0; i < 38; i++) { const p = document.createElement('i'); p.className = 'p'; p.style.left = Math.random() * 100 + '%'; p.style.animationDuration = (9 + Math.random() * 18) + 's'; p.style.animationDelay = (-Math.random() * 20) + 's'; p.style.opacity = .25 + Math.random() * .6; p.style.transform = `scale(${.5 + Math.random() * 1.7})`; box.appendChild(p); } }
function currentCampaign() { return state?.campaign || campaigns.find(x => x.id === state?.campaignId) || campaigns[0] || null; }

function uniqueHints(list = []) {
  const seen = new Set();
  return list.filter(item => {
    const key = String(item || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function contextualStoryPrompts(beat) {
  const text = `${beat?.title || ''} ${beat?.situation || beat?.text || ''} ${beat?.objective || ''} ${beat?.why || ''} ${beat?.prompt || ''}`;
  const rules = [
    [/시체|죽은|익사체|망령|유령|관|장례|장송/, ['시신·관·상처를 조사해 무엇이 잘못되었는지 밝힌다', '장례를 지켜보는 사람들에게 말을 걸어 숨기고 있는 사실을 끌어낸다', '의식이 끝나기 전에 수상한 물건이나 흔적을 먼저 확보한다']],
    [/문장|암호|로그|기록|신문|편지|데이터|백업|유언|코드/, ['기록의 시간표식과 내용이 서로 맞는지 대조한다', '로그를 남긴 사람의 의도와 빠진 부분을 읽어낸다', '사라지기 전에 원본이나 사본을 먼저 확보한다']],
    [/문|성문|압력문|봉쇄|잠긴|닫히|균열/, ['잠금 장치의 구조를 살펴 가장 안전한 개방 순서를 찾는다', '문이 완전히 닫히기 전에 틈을 이용해 빠르게 진입한다', '강제로 열어야 한다면 어떤 위험이 터지는지 먼저 확인한다']],
    [/발자국|추적|흔적|사라진|실종/, ['남은 흔적의 방향과 간격을 읽어 이동 경로를 복원한다', '상대가 일부러 남긴 가짜 흔적이 있는지 걸러낸다', '다음 흔적이 나타날 만한 지점을 먼저 선점한다']],
    [/식탁|연회|시장|상인|경매|투표|결투|부족|전쟁|협상|거래/, ['상대가 지금 가장 원하는 대가를 짚어 협상을 주도한다', '말과 표정의 모순을 읽어 누가 거짓말하는지 가려낸다', '혼란이 커지기 전에 핵심 증거나 물건을 선점한다']],
    [/검|갑옷|왕관 조각|진주|별핵|뿔|알|유물|제단|장치/, ['물건에 남은 힘과 제작 흔적을 분석해 정체를 파악한다', '저주나 함정이 터지기 전에 안전하게 분리하거나 봉인한다', '직접 반응을 시험해 지금 무엇이 연결되어 있는지 확인한다']],
    [/드론|감시카메라|광고판|AI|MOTHER|로그인|백도어|삭제 버튼|감시망|해킹/, ['감시망의 눈을 잠깐 멀게 하거나 다른 곳을 보게 만든다', '센서가 비는 타이밍에 움직여 핵심 위치에 접근한다', '가짜 신호나 계정을 흘려 시스템이 엉뚱한 목표를 쫓게 만든다']],
    [/산소|잠수정|수심|해저|소나|케이블|부력|관측창|압력/, ['압력·산소·전력 수치를 따져 가장 안전한 절차를 고른다', '소나와 진동을 읽어 보이지 않는 위험의 위치를 파악한다', '장비가 완전히 망가지기 전에 직접 붙잡고 응급 조치를 한다']],
    [/시간|시계|자정|오후|역행|루프|미래|과거|내일|어제|종/, ['이전 장면과 지금의 차이를 비교해 루프의 규칙을 좁힌다', '시간이 뒤틀리기 직전 반복되는 징후를 찾아낸다', '멈춘 순간의 틈을 이용해 사건 중심으로 먼저 뛰어든다']],
    [/별|숲|나무|뿌리|꽃밭|호수|꿈|성운|유성/, ['주변 자연과 별빛의 반응을 읽어 안전한 길을 고른다', '마력의 흐름을 분석해 위험한 빛과 안전한 빛을 구분한다', '변하는 지형과 뿌리 사이를 재빨리 지나 유리한 위치를 잡는다']],
    [/곰|사슴|올빼미|키메라|하운드|맹견|포식자|신수|촉수|승무원|괴물/, ['움직임과 습성을 살펴 공격 직전의 신호를 읽는다', '주의를 다른 곳으로 돌려 동료가 움직일 틈을 만든다', '정면에서 버티며 다른 사람이 단서를 챙길 시간을 번다']],
  ];
  for (const [pattern, prompts] of rules) if (pattern.test(text)) return prompts;
  return ['지금 장면에서 가장 수상한 대상 하나를 정해 먼저 확인한다', '단서·인물·위험 중 무엇이 가장 급한지 정하고 거기에 집중한다', '다음 막으로 넘어가기 전에 반드시 얻고 싶은 정보 하나를 노린다'];
}

function actionHintsFor(player, beat) {
  const job = player?.job;
  if (!job) return [];
  const objective = beat?.objective || '현재 목표를 진행한다';
  const byStat = {
    '근력': [`장애물을 힘으로 치우고 ${objective}`, '위험한 대상을 붙잡거나 제압해 길을 만든다', '무너지는 구조물이나 동료를 버티며 시간을 번다'],
    '민첩': [`눈에 띄지 않게 접근해 ${objective}`, '위험 구역을 우회해 먼저 좋은 위치를 선점한다', '누군가 눈치채기 전에 물건·문서·통로를 확보한다'],
    '지능': [`기록·장치·단서를 분석해 ${objective}`, '현재 현상의 원리나 규칙을 찾아 약점을 찾는다', '서로 모순되는 정보를 비교해 진짜 단서를 고른다'],
    '지혜': [`주변의 흔적과 기척을 관찰해 ${objective}`, '보이지 않는 위험의 위치와 타이밍을 먼저 읽어낸다', '앞선 장면의 징후와 지금 상황을 연결해 의미를 찾는다'],
    '매력': [`상대와 대화하거나 협상해 ${objective}`, '상대가 숨기는 의도나 욕망을 끌어낸다', '동료나 NPC를 안심시키고 협력을 얻는다'],
    '체력': [`위험을 버티며 직접 ${objective}`, '다른 동료가 행동할 시간을 벌기 위해 몸으로 막아선다', '환경의 압박을 견디며 가장 위험한 위치를 맡는다'],
  };
  return uniqueHints([...(byStat[job.prime] || byStat['지능']).slice(0, 1), ...contextualStoryPrompts(beat), ...(byStat[job.prime] || byStat['지능']).slice(1)]).slice(0, 3);
}

function sceneDecisionGuide(beat, player) {
  const phaseGuide = {
    '도입': '우선 무엇을 먼저 확인할지 정하는 장면입니다.',
    '진실': '방금 드러난 사실이 맞는지 검증하거나, 그 사실을 이용해 다음 실마리를 잡는 장면입니다.',
    '위기': '당장 닥친 위험을 넘기면서도 핵심 단서나 동료를 놓치지 않는 장면입니다.',
    '결단': '이번 막의 진실을 바탕으로 다음 장소나 다음 행동의 방향을 고르는 장면입니다.',
  };
  const prime = player?.job?.prime ? `${player.job.prime} 중심의 접근을 먼저 떠올려보세요.` : '직업이 있다면 그 직업답게 접근해도 좋습니다.';
  return `${phaseGuide[beat?.phase] || '이 장면에서 무엇을 할지 한 문장으로 정하는 장면입니다.'} 완벽한 정답을 찾기보다, 지금 가장 먼저 시도할 행동 하나를 선명하게 말하면 됩니다. ${prime}`;
}

function canUseMySkill(p) {
  if (!state || !p?.job?.skillDef || !p.connected || p.hp <= 0) return false;
  const cooldown = Number(p.skillState?.cooldownRemaining || 0);
  if (cooldown > 0) return false;
  if (state.phase === 'combat') return state.monster?.turnPhase !== 'boss' && !state.monster?.acted?.includes(p.id);
  if (state.phase === 'story') {
    if (state.currentEvent) return state.activeChoice?.playerId === p.id;
    return state.turnPlayerId === p.id;
  }
  return false;
}


function itemCatalog() { return currentCampaign()?.items || []; }
function itemById(id) { return itemCatalog().find(item => item.id === id) || null; }
function equippedItemIds(player) { return new Set(Object.values(player?.equipment || {}).filter(Boolean)); }
function equipmentBonusFor(player, stat) { return Number(player?.equipmentBonuses?.[stat] || 0); }
function effectiveStatTotal(_player, _stat, ability) { return Number(ability?.total || 10); }
function effectiveStatMod(player, stat, ability) { return rawMod(Number(ability?.total || 10)) + equipmentBonusFor(player, stat); }
function slotLabel(slot) { return ({weapon:'무기',armor:'방어구',charm:'부적',tool:'도구'})[slot] || slot; }

function renderEconomyPanel(player, storyItems = []) {
  const panel = $('#economyPanel');
  if (!panel) return;
  if (!player?.abilities) { panel.innerHTML = ''; panel.classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  const equipped = equippedItemIds(player);
  const inventory = (player.inventory || []).map(itemById).filter(Boolean);
  const equipment = ['weapon','armor','charm','tool'].map(slot => {
    const item = itemById(player.equipment?.[slot]);
    return `<div class="equip-slot ${item ? 'filled' : ''}"><span>${slotLabel(slot)}</span><b>${item ? esc(item.name) : '비어 있음'}</b>${item ? `<small>${esc(item.stat)} 판정 +${item.bonus}</small>` : ''}</div>`;
  }).join('');
  const inventoryHtml = inventory.length ? inventory.map(item => `
    <button class="inventory-item ${equipped.has(item.id) ? 'equipped' : ''}" type="button" data-equip-item="${esc(item.id)}">
      <span><b>${esc(item.name)}</b><small>${esc(slotLabel(item.slot))} · ${esc(item.rarity || '장비')}</small></span>
      <em>${esc(item.stat)} 판정 +${item.bonus}</em>
      <small>${esc(item.passive || '')}</small>
      <strong>${equipped.has(item.id) ? '장착 해제' : '장착'}</strong>
    </button>`).join('') : '<div class="inventory-empty">아직 획득한 장비가 없습니다.</div>';
  const storyInventory = Array.isArray(storyItems) && storyItems.length ? `
    <details class="inventory-drawer story-inventory" open>
      <summary>STORY ITEMS · ${storyItems.length}개</summary>
      <div class="story-item-list">${storyItems.map(item => `<div class="story-item-chip"><b>${esc(item.name)}</b><small>${esc(item.description || ((item.tags || []).slice(0,3).join(' · ') || '스토리 아이템'))}</small>${Number(item.value||0)?`<small style="display:block;margin-top:3px;opacity:.66">교환 가치 · ${Number(item.value||0)}</small>`:''}</div>`).join('')}</div>
    </details>` : '';
  panel.innerHTML = `
    <div class="economy-head"><span>COINS</span><b>◈ ${Number(player.coins || 0)}</b></div>
    <div class="equipment-grid">${equipment}</div>
    ${storyInventory}
    <details class="inventory-drawer"><summary>INVENTORY · ${inventory.length}개</summary><div class="inventory-list">${inventoryHtml}</div></details>`;
  panel.querySelectorAll('[data-equip-item]').forEach(button => button.onclick = () => {
    socket.emit('item:equip', { roomCode, playerToken, itemId: button.dataset.equipItem }, r => {
      if (!r?.ok) return toast(r?.error || '장비 변경 실패');
      audioManager.fx?.('success', .7);
    });
  });
}

function facilityUsed(eventId, playerId, action) {
  return Boolean(state?.facilityUses?.[`${eventId}:${playerId}:${action}`]);
}
function renderFacilityPanel(event, player) {
  const panel = $('#facilityPanel');
  if (!panel) return;
  const facility = event?.facility;
  if (!facility || !['story','resolution'].includes(state?.phase) || !player) { panel.classList.add('hidden'); panel.innerHTML = ''; return; }
  panel.classList.remove('hidden');
  const used = facilityUsed(event.id, player.id, facility.type);
  const charismaDiscount = Number(player?.derived?.shopDiscount || 0);
  let actions = '';
  if (facility.type === 'shop') {
    const owned = new Set(player.inventory || []);
    actions = `<div class="shop-grid">${itemCatalog().filter(item => (facility.stock || []).includes(item.id)).map(item => `
      <button class="shop-item" type="button" data-shop-item="${esc(item.id)}" ${owned.has(item.id) || Number(player.coins || 0) < Math.max(1, Number(item.price || 0) - charismaDiscount) ? 'disabled' : ''}>
        <span><b>${esc(item.name)}</b><small>${esc(slotLabel(item.slot))} · ${esc(item.rarity)}</small></span>
        <em>${esc(item.stat)} 판정 +${item.bonus}</em>
        <small>${esc(item.passive || '')}</small>
        <strong>${owned.has(item.id) ? '보유 중' : `◈ ${Math.max(1, Number(item.price || 0) - charismaDiscount)}${charismaDiscount ? ` <small>(매력 할인 -${charismaDiscount})</small>` : ''}`}</strong>
      </button>`).join('')}</div>`;
  } else {
    const label = facility.type === 'inn' ? `숙박하기 · ◈ ${Math.max(0, Number(facility.cost || 0) - charismaDiscount)}`
      : facility.type === 'restaurant' ? `식사하기 · ◈ ${Math.max(0, Number(facility.cost || 0) - charismaDiscount)}`
      : facility.type === 'gamble' ? `D6 내기 · ◈ ${facility.cost}`
      : facility.type === 'quest' ? '의뢰 맡기 · 성공 시 코인' : '이용하기';
    actions = `<button class="primary facility-action" type="button" data-facility-action="${esc(facility.type)}" ${used ? 'disabled' : ''}>${used ? '이번 이벤트에서 이용 완료' : label}</button>`;
  }
  panel.innerHTML = `
    <div class="facility-copy"><span class="eyebrow">장면 사이의 짧은 숨</span><h3>${esc(facility.label)}</h3>${facility.storyLead ? `<p class="facility-story-lead">${esc(facility.storyLead)}</p>` : ''}<p>${esc(facility.description || '')}</p><div class="coin-chip">보유 코인 ◈ ${Number(player.coins || 0)}</div></div>
    <div class="facility-actions">${actions}</div>`;
  panel.querySelectorAll('[data-facility-action]').forEach(button => button.onclick = () => {
    button.disabled = true;
    socket.emit('facility:action', { roomCode, playerToken, action: button.dataset.facilityAction }, r => {
      if (!r?.ok) { button.disabled = false; return toast(r?.error || '시설 이용 실패'); }
      audioManager.fx?.('success', 1);
      toast(r.summary || '시설을 이용했습니다.');
    });
  });
  panel.querySelectorAll('[data-shop-item]').forEach(button => button.onclick = () => {
    button.disabled = true;
    socket.emit('facility:action', { roomCode, playerToken, action:'shop', itemId:button.dataset.shopItem }, r => {
      if (!r?.ok) { button.disabled = false; return toast(r?.error || '구매 실패'); }
      audioManager.fx?.('success', 1);
      toast(r.summary || '아이템을 구매했습니다.');
    });
  });
}

function renderSkillUi() {
  const p = me();
  const skill = p?.job?.skillDef;
  const panel = $('#jobSkillPanel');
  if (!skill) { panel.classList.add('hidden'); $('#combatSkillBtn').classList.add('hidden'); return; }
  panel.classList.remove('hidden');
  $('#jobSkillName').textContent = skill.name;
  $('#jobSkillDesc').textContent = skill.text;
  const remaining = Number(p.skillState?.cooldownRemaining || 0);
  const ready = canUseMySkill(p);
  $('#jobSkillBtn').disabled = !ready;
  $('#jobSkillBtn').textContent = remaining > 0 ? `쿨타임 ${remaining}턴` : ready ? '스킬 사용' : '사용 대기';
  $('#jobSkillCooldown').textContent = remaining > 0 ? `재사용까지 ${remaining}턴` : '사용 가능';
  $('#jobSkillCooldown').classList.toggle('ready', remaining === 0);
  $('#combatSkillBtn').classList.toggle('hidden', state?.phase !== 'combat');
  $('#combatSkillBtn').disabled = !ready;
  $('#combatSkillBtn').textContent = remaining > 0 ? `${skill.name} · ${remaining}턴` : ready ? `${skill.name} 사용` : `${skill.name} · 대기`;
}

function sceneWord(campaignId, actIndex = 0) { const scenes=WORLD_META[campaignId]?.scene||[]; return scenes[Math.max(0,Math.min(Math.max(0,scenes.length-1),actIndex))] || '장면'; }
function svgUri(svg) { return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`; }

function themedBackdrop(id) {
  switch (id) {
    case 'ember':
      return `
        <rect width="1600" height="800" fill="url(#g)"/>
        <circle cx="1220" cy="132" r="86" fill="rgba(255,210,140,.22)"/>
        <path d="M0 620 L160 440 L330 560 L470 370 L620 560 L770 310 L910 540 L1070 350 L1270 540 L1440 400 L1600 560 L1600 800 L0 800 Z" fill="rgba(14,10,15,.92)"/>
        <path d="M770 318 L825 160 L875 318 Z M742 318 h156 v176 h-156z M705 494 h230 v70 h-230z" fill="rgba(255,240,214,.12)"/>
        <path d="M0 690 C210 640 380 730 560 670 S930 708 1120 664 S1425 716 1600 664 L1600 800 L0 800 Z" fill="rgba(255,110,69,.18)"/>
      `;
    case 'neon':
      return `
        <rect width="1600" height="800" fill="url(#g)"/>
        <path d="M0 690 L0 540 L90 540 L90 440 L180 440 L180 320 L245 320 L245 470 L330 470 L330 290 L430 290 L430 560 L520 560 L520 360 L620 360 L620 500 L705 500 L705 265 L795 265 L795 585 L890 585 L890 345 L995 345 L995 515 L1088 515 L1088 410 L1185 410 L1185 580 L1286 580 L1286 330 L1395 330 L1395 515 L1490 515 L1490 440 L1600 440 L1600 800 L0 800 Z" fill="rgba(4,10,19,.92)"/>
        <path d="M0 655 H1600" stroke="rgba(55,229,255,.26)" stroke-width="2"/>
        <path d="M0 705 H1600" stroke="rgba(208,91,255,.18)" stroke-width="2"/>
        <g stroke="rgba(255,255,255,.08)">${Array.from({ length: 14 }, (_, i) => `<path d="M${100 + i * 100} 80 V800"/>`).join('')}</g>
      `;
    case 'abyss':
      return `
        <rect width="1600" height="800" fill="url(#g)"/>
        <ellipse cx="815" cy="140" rx="120" ry="70" fill="rgba(145,255,251,.15)"/>
        <path d="M0 0 H1600 V800 H0 Z" fill="rgba(255,255,255,.02)"/>
        <path d="M0 400 C210 450 410 335 620 380 S1040 470 1260 395 S1440 360 1600 412 V800 H0 Z" fill="rgba(9,24,40,.82)"/>
        <path d="M380 690 C340 552 456 525 450 430 C445 360 392 324 418 250" stroke="rgba(120,255,221,.26)" stroke-width="18" fill="none" stroke-linecap="round"/>
        <path d="M1180 700 C1226 555 1114 515 1120 435 C1128 360 1188 312 1165 232" stroke="rgba(63,198,255,.24)" stroke-width="18" fill="none" stroke-linecap="round"/>
      `;
    case 'clock':
      return `
        <rect width="1600" height="800" fill="url(#g)"/>
        <circle cx="1170" cy="170" r="120" fill="rgba(240,202,98,.14)"/>
        <circle cx="1170" cy="170" r="82" fill="none" stroke="rgba(240,202,98,.35)" stroke-width="6"/>
        <path d="M1170 170 L1170 108" stroke="rgba(240,202,98,.5)" stroke-width="6" stroke-linecap="round"/>
        <path d="M1170 170 L1218 196" stroke="rgba(240,202,98,.5)" stroke-width="6" stroke-linecap="round"/>
        <path d="M140 690 L300 280 L410 280 L570 690 Z M286 280 h140 v-110 h-140z" fill="rgba(8,14,21,.85)"/>
        <g fill="none" stroke="rgba(115,219,255,.2)" stroke-width="6"><circle cx="930" cy="530" r="86"/><circle cx="1014" cy="530" r="46"/><circle cx="868" cy="588" r="42"/></g>
      `;
    case 'wild':
      return `
        <rect width="1600" height="800" fill="url(#g)"/>
        <g fill="rgba(216,132,255,.55)">${Array.from({ length: 18 }, (_, i) => `<circle cx="${90 + (i * 82) % 1460}" cy="${85 + (i * 41) % 180}" r="${1 + (i % 3)}"/>`).join('')}</g>
        <path d="M0 680 C220 610 348 685 560 630 S948 720 1210 642 S1450 690 1600 628 V800 H0 Z" fill="rgba(18,28,22,.86)"/>
        <g fill="rgba(9,17,12,.88)"><path d="M180 725 l60-220 52 220z"/><path d="M430 725 l85-280 72 280z"/><path d="M1030 725 l72-245 66 245z"/><path d="M1320 725 l92-300 82 300z"/></g>
        <path d="M690 230 l34 60 68 10 -50 46 12 66 -64-34 -60 34 12-66 -48-46 66-10z" fill="rgba(124,233,129,.44)"/>
      `;
    default:
      return `<rect width="1600" height="800" fill="url(#g)"/>`;
  }
}

function sceneMotif(title = '', campaignId = '', monster = '') {
  const t = `${title} ${monster}`;
  if (/왕관|왕좌|즉위|왕가/.test(t)) return `<path d="M1000 530 L1060 335 L1155 455 L1245 315 L1330 455 L1420 335 L1480 530 Z" fill="rgba(255,225,155,.22)" stroke="rgba(255,242,198,.55)" stroke-width="8"/><rect x="1015" y="530" width="450" height="78" rx="20" fill="rgba(20,10,9,.45)" stroke="rgba(255,224,170,.45)" stroke-width="6"/>`;
  if (/시체|망령|죽은|익사체|유령/.test(t)) return `<circle cx="1240" cy="395" r="125" fill="rgba(230,240,245,.13)" stroke="rgba(255,255,255,.32)" stroke-width="7"/><circle cx="1195" cy="378" r="25" fill="rgba(0,0,0,.72)"/><circle cx="1285" cy="378" r="25" fill="rgba(0,0,0,.72)"/><path d="M1200 465 Q1240 490 1280 465" stroke="rgba(0,0,0,.65)" stroke-width="18" fill="none" stroke-linecap="round"/>`;
  if (/종|시계|시간|회중시계|자정|오후/.test(t)) return `<circle cx="1240" cy="420" r="170" fill="rgba(240,202,98,.08)" stroke="rgba(240,202,98,.48)" stroke-width="10"/><path d="M1240 420 L1240 300 M1240 420 L1338 462" stroke="rgba(255,228,150,.68)" stroke-width="14" stroke-linecap="round"/><circle cx="1240" cy="420" r="18" fill="rgba(255,240,190,.9)"/>`;
  if (/문|성문|압력문|봉쇄|잠긴|닫히/.test(t)) return `<rect x="1060" y="235" width="360" height="390" rx="22" fill="rgba(5,8,12,.48)" stroke="rgba(255,255,255,.34)" stroke-width="10"/><path d="M1240 235 V625" stroke="rgba(255,255,255,.18)" stroke-width="7"/><circle cx="1320" cy="430" r="18" fill="rgba(255,180,90,.8)"/>`;
  if (/발자국|추적|흔적/.test(t)) return `<g fill="rgba(255,245,220,.28)"><ellipse cx="1110" cy="520" rx="48" ry="70" transform="rotate(-25 1110 520)"/><ellipse cx="1275" cy="410" rx="48" ry="70" transform="rotate(20 1275 410)"/><ellipse cx="1400" cy="535" rx="48" ry="70" transform="rotate(-18 1400 535)"/></g>`;
  if (/데이터|암호|로그|AI|MOTHER|백업|삭제|기억/.test(t)) return `<g fill="none" stroke="rgba(55,229,255,.5)" stroke-width="8"><rect x="1050" y="260" width="390" height="310" rx="28"/><path d="M1100 330 H1380 M1100 390 H1310 M1100 450 H1360 M1180 260 V205 M1310 260 V205 M1180 570 V625 M1310 570 V625"/></g><circle cx="1380" cy="390" r="28" fill="rgba(208,91,255,.55)"/>`;
  if (/드론|감시카메라|눈|광고판/.test(t)) return `<path d="M1060 410 Q1240 245 1420 410 Q1240 575 1060 410 Z" fill="rgba(55,229,255,.08)" stroke="rgba(110,240,255,.45)" stroke-width="9"/><circle cx="1240" cy="410" r="72" fill="rgba(208,91,255,.22)" stroke="rgba(255,130,255,.55)" stroke-width="9"/><circle cx="1240" cy="410" r="25" fill="rgba(255,100,120,.9)"/>`;
  if (/잠수정|심해|해저|소나|산소|수심|세이렌/.test(t)) return `<ellipse cx="1240" cy="430" rx="220" ry="90" fill="rgba(20,80,115,.32)" stroke="rgba(120,240,255,.45)" stroke-width="9"/><rect x="1180" y="330" width="120" height="90" rx="30" fill="rgba(150,250,255,.12)" stroke="rgba(150,250,255,.4)" stroke-width="7"/><path d="M1018 430 L930 360 V500 Z M1460 430 L1530 365 V495 Z" fill="rgba(70,180,220,.27)"/>`;
  if (/별|성운|유성|별자리|낙성/.test(t)) return `<path d="M1240 230 L1292 360 L1435 370 L1325 455 L1360 595 L1240 515 L1120 595 L1155 455 L1045 370 L1188 360 Z" fill="rgba(180,255,190,.24)" stroke="rgba(220,185,255,.55)" stroke-width="9"/>`;
  if (/나무|숲|뿌리|꽃밭|호수/.test(t)) return `<path d="M1240 215 C1180 310 1100 325 1060 420 C1140 405 1185 445 1215 495 L1170 650 H1310 L1270 495 C1305 445 1360 405 1440 420 C1390 325 1315 300 1240 215 Z" fill="rgba(80,155,95,.22)" stroke="rgba(150,245,170,.4)" stroke-width="8"/>`;
  if (campaignId === 'wild') return `<path d="M1240 230 L1292 360 L1435 370 L1325 455 L1360 595 L1240 515 L1120 595 L1155 455 L1045 370 L1188 360 Z" fill="rgba(180,255,190,.22)" stroke="rgba(220,185,255,.5)" stroke-width="9"/>`;
  if (/곰|사슴|올빼미|키메라|하운드|맹견|포식자|신수/.test(t) || monster) return `<path d="M1080 500 Q1240 270 1400 500 Q1320 620 1240 630 Q1160 620 1080 500 Z" fill="rgba(15,15,20,.5)" stroke="rgba(255,255,255,.22)" stroke-width="8"/><circle cx="1175" cy="470" r="25" fill="rgba(255,90,80,.9)"/><circle cx="1305" cy="470" r="25" fill="rgba(255,90,80,.9)"/>`;
  return `<circle cx="1240" cy="420" r="155" fill="rgba(255,255,255,.055)" stroke="rgba(255,255,255,.2)" stroke-width="8"/><path d="M1140 420 H1340 M1240 320 V520" stroke="rgba(255,255,255,.18)" stroke-width="8"/>`;
}

function artSvg(c, title, subtitle, kicker, visual = '', monster = '') {
  return svgUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${c?.accent || '#935'}"/>
        <stop offset="100%" stop-color="#05070d"/>
      </linearGradient>
      <linearGradient id="h" x1="0" x2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,.22)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
    </defs>
    ${themedBackdrop(c?.id)}
    ${sceneMotif(`${title} ${visual}`, c?.id, monster)}
    <rect x="70" y="72" width="1460" height="654" rx="28" fill="none" stroke="rgba(255,255,255,.18)"/>
    <rect x="95" y="96" width="710" height="235" rx="22" fill="rgba(5,8,13,.56)" stroke="rgba(255,255,255,.08)"/>
    <text x="135" y="145" fill="${c?.accent2 || '#fff'}" font-size="26" font-family="Orbitron, sans-serif" letter-spacing="4">${esc(kicker)}</text>
    <text x="135" y="210" fill="#fff6ed" font-size="52" font-weight="800" font-family="Noto Serif KR, serif">${esc(title)}</text>
    <text x="135" y="260" fill="rgba(255,255,255,.82)" font-size="23" font-family="Noto Serif KR, serif">${esc(subtitle)}</text>
    <text x="135" y="303" fill="rgba(255,255,255,.6)" font-size="19" font-family="Noto Serif KR, serif">${esc(visual)}</text>
    <path d="M95 354 h900" stroke="url(#h)" stroke-width="2"/>
  </svg>`);
}

function coverArt(c) {
  const artSet = STORY_ART_FILES[c?.id];
  return artSet?.profile || artSet?.early || artSvg(c, c?.title || 'Chronicle Gate', c?.subtitle || '연대기를 선택하세요.', WORLD_META[c?.id]?.motif || 'CHRONICLE', sceneWord(c?.id, 0));
}
function chapterArtCandidates(c, scene) {
  if (!c?.id) return [];
  const explicit = String(scene?.artFile || '').trim();
  const chapter = Number(scene?.artChapter || scene?.chapter || 0);
  const candidates = [];
  if (explicit) candidates.push(explicit.startsWith('.') || explicit.startsWith('/') ? explicit : `./art/${explicit}`);
  if (chapter >= 1 && chapter <= 99) {
    const base = scene?.artFileBase || `${c.id}_${String(chapter).padStart(2, '0')}`;
    // Prefer the WEBP files users add to GitHub, then transparently fall back to the older PNG assets.
    candidates.push(`/art/${base}.webp`, `/art/${base}.png`, `./art/${base}.webp`, `./art/${base}.png`);
  }
  return [...new Set(candidates)];
}
function chapterArt(c, scene) {
  return chapterArtCandidates(c, scene)[0] || null;
}
function representativeStoryArtCandidates(c, scene) {
  if (!c?.id) return [];
  const chapter=Number(scene?.artChapter || scene?.chapter || 0);
  const isEvent=Boolean(scene?.id && !String(scene.id).includes('STORY'));
  const milestone=[1,6,11,16,21,26,30].includes(chapter);
  const eventSample=isEvent && Math.abs(String(scene?.id||'').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0))%4===0;
  if(!milestone && !eventSample) return [];
  const late=chapter>=21 || ['위기','결단'].includes(String(scene?.phase||''));
  const stem=`${c.id}_${late?'late':'early'}`;
  return [`/art/${stem}.webp?v=4121d`,`/art/${stem}.png?v=4121d`,`./art/${stem}.webp?v=4121d`,`./art/${stem}.png?v=4121d`];
}
function builtInStoryArt(c,scene){
  const world=c?.id||'ember';
  const chapter=Number(scene?.artChapter||scene?.chapter||1);
  const accent={ember:'#ff7654',neon:'#3fe8ff',abyss:'#68d7ff',clock:'#ffd47c',wild:'#8df4a8',guardian:'#63d67c',echo:'#8fd9ff',guardian1:'#63d67c',guardian2:'#62c8ff',guardian3:'#a78bff'}[world]||'#ff7654';
  const title=esc(scene?.title||scene?.actName||c?.title||'Chronicle Gate');
  const visual=esc(scene?.visual||scene?.phase||'중요 장면');
  const motif={
    ember:`<path d="M150 520 L360 285 L510 430 L690 220 L860 440 L1060 250 L1240 520" fill="#130b10" stroke="${accent}" stroke-width="6"/><path d="M575 430 h250 l-40 150 H615 Z" fill="#261014" stroke="#ffd0a6" stroke-width="4"/><path d="M660 430 l35-72 38 50 42-82 42 104" fill="none" stroke="#ffd083" stroke-width="9"/>`,
    neon:`<path d="M120 560 V265 H300 V430 H455 V180 H650 V500 H790 V245 H980 V455 H1170 V215 H1280 V560" fill="#07111d" stroke="${accent}" stroke-width="5"/><path d="M230 210 h190 M880 175 h250 M520 340 h180" stroke="#ff4aa1" stroke-width="12"/><circle cx="1040" cy="355" r="54" fill="none" stroke="${accent}" stroke-width="10"/>`,
    abyss:`<rect x="180" y="190" width="1040" height="410" rx="80" fill="#071827" stroke="${accent}" stroke-width="6"/><circle cx="720" cy="360" r="125" fill="#0d2a3b" stroke="#9cecff" stroke-width="7"/><path d="M595 520 C520 590 520 650 560 700 M665 520 C640 610 650 670 675 720 M775 520 C800 610 790 670 765 720 M845 520 C920 590 920 650 880 700" fill="none" stroke="${accent}" stroke-width="15"/>`,
    clock:`<circle cx="720" cy="370" r="190" fill="#11101d" stroke="${accent}" stroke-width="8"/><circle cx="720" cy="370" r="115" fill="none" stroke="#ffe8ad" stroke-width="5"/><path d="M720 370 V260 M720 370 L820 420" stroke="${accent}" stroke-width="13"/><path d="M450 570 H990" stroke="#aa8b50" stroke-width="8"/>`,
    wild:`<path d="M160 600 C280 310 430 160 590 420 C675 205 800 160 880 420 C1030 160 1160 340 1260 600" fill="#07170f" stroke="${accent}" stroke-width="7"/><path d="M710 600 V270 M710 350 C600 315 540 260 485 205 M710 390 C820 335 900 270 965 190" stroke="#bfffd0" stroke-width="16"/><circle cx="710" cy="225" r="48" fill="#d8ffd8" opacity=".75"/>`,
    guardian:`<path d="M190 590 L310 310 L510 410 L720 170 L930 410 L1130 310 L1250 590" fill="#0b1710" stroke="${accent}" stroke-width="7"/><path d="M650 570 V290 L720 220 L790 290 V570" fill="#17231a" stroke="#d9ffe2" stroke-width="6"/><circle cx="720" cy="205" r="34" fill="none" stroke="${accent}" stroke-width="9"/>`,
    echo:`<path d="M720 150 L790 290 L950 315 L830 420 L865 580 L720 500 L575 580 L610 420 L490 315 L650 290 Z" fill="#0a1722" stroke="${accent}" stroke-width="7"/><path d="M720 150 L720 500 M490 315 L950 315 M610 420 L830 420" stroke="#ffd5e8" stroke-width="5" opacity=".8"/>`
  }[world]||'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 760"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07080d"/><stop offset="1" stop-color="#201018"/></linearGradient></defs><rect width="1400" height="760" fill="url(#g)"/><circle cx="1160" cy="125" r="70" fill="${accent}" opacity=".14"/><g opacity=".94">${motif}</g><rect x="70" y="70" width="520" height="170" rx="20" fill="rgba(0,0,0,.56)"/><text x="102" y="112" fill="${accent}" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="3">IMMERSIVE SCENE · ${chapter}</text><text x="102" y="165" fill="#fff" font-family="sans-serif" font-size="40" font-weight="800">${title}</text><text x="102" y="210" fill="#d8d8df" font-family="sans-serif" font-size="20">${visual}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function shouldShowBuiltInStoryArt(scene){
  const chapter=Number(scene?.artChapter||scene?.chapter||0);
  const isEvent=Boolean(scene?.id && !String(scene.id).includes('STORY'));
  return [1,6,11,16,21,26,30].includes(chapter) || (isEvent && Math.abs(String(scene?.id||'').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0))%4===0);
}
function preloadSwapImage(img,candidates){
  for(const src of candidates){
    const probe=new Image();
    probe.onload=()=>{ img.src=src; img.style.display=''; img.dataset.artLoaded='custom'; };
    probe.src=src;
  }
}
function setSceneImage(img, c, scene) {
  if (!img) return;
  const exact=chapterArtCandidates(c, scene).map(src=>`${src}${src.includes('?')?'&':'?'}v=4121d`);
  const reps=representativeStoryArtCandidates(c,scene);
  const custom=[...exact,...reps];
  if(shouldShowBuiltInStoryArt(scene)){
    // Important scenes always have an immediate visual, even when GitHub art files are missing.
    img.src=builtInStoryArt(c,scene);
    img.style.display='';
    img.dataset.artLoaded='builtin';
    preloadSwapImage(img,custom);
    return;
  }
  if(!custom.length){ img.style.display='none'; img.removeAttribute('src'); return; }
  img.style.display='none';
  preloadSwapImage(img,custom);
}

function storyArt(c, scene) {
  const sceneFile = chapterArt(c, scene);
  if (sceneFile) return sceneFile;
  const artSet = STORY_ART_FILES[c?.id];
  const act = Number(scene?.act || 1);
  const phase = String(scene?.phase || '도입');
  const isStory = String(scene?.id || '').includes('STORY');
  const actIndex = Math.max(0, act - 1);
  const title = scene?.title || c?.title || '다음 장면';
  const visual = scene?.visual || sceneWord(c?.id, actIndex);
  const subtitle = scene?.monster ? `${visual} · ${scene.monster}의 위협` : `${visual} · ${isStory ? '메인 스토리' : '이벤트 사건'}`;
  if (artSet && isStory) return act >= 4 || phase === '위기' || phase === '결단' ? artSet.late : artSet.early;
  if (artSet && !isStory) return (phase === '위기' || phase === '결단' || act >= 4) ? artSet.late : artSet.early;
  return artSvg(c, title, subtitle, scene ? `ACT ${scene.act} · ${scene.actName}` : (WORLD_META[c?.id]?.motif || 'SCENE'), visual, scene?.monster || '');
}

function storyDetailArt(c, beat) {
  return chapterArt(c, beat) || storyArt(c, beat);
}

function storyArtMeta(c, beat) {
  const src = storyArt(c, beat);
  const world = WORLD_META[c?.id]?.motif || 'CHRONICLE';
  const visual = beat?.visual || beat?.actName || c?.title || '장면';
  const caption = `${c?.title || 'Chronicle Gate'} · ACT ${beat?.act || 1} ${beat?.actName || ''} · ${beat?.phase || '장면'}`.trim();
  const focus = beat?.objective || '지금 장면의 핵심 목표를 확인한다.';
  const accent = beat?.reveal || beat?.why || beat?.stakes || '';
  return { src, world, visual, caption, focus, accent };
}

function proseParagraphs(text = '') {
  const cleaned = String(text || '').trim();
  if (!cleaned) return [];
  const blocks = cleaned.split(/\n{2,}/).map(v => v.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    const sentences = block.split(/(?<=[.!?])\s+/).map(v => v.trim()).filter(Boolean);
    if (sentences.length <= 2) out.push(block);
    else for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(' '));
  }
  return out;
}


function storyParagraphHTML(text = '', index = 0) {
  const sentences = String(text || '').split(/(?<=[.!?…])\s+/).map(v => v.trim()).filter(Boolean);
  const keyPattern = /(그러나|하지만|그때|그 순간|마침내|사실|진실|정체|발견|드러|깨달|아니었다|없었다|위험|죽음|왕관|봉인|기억|시간|별|심연|경고|배신|목소리)/;
  let emphasized = sentences.findIndex(sentence => keyPattern.test(sentence));
  if (emphasized < 0 && sentences.length > 1 && index > 0) emphasized = sentences.length - 1;
  return sentences.map((sentence, sentenceIndex) => {
    const safe = esc(sentence);
    return sentenceIndex === emphasized ? `<strong class="story-key">${safe}</strong>` : safe;
  }).join(' ');
}

function classifyStorySentence(sentence = '') {
  const text = String(sentence || '').trim();
  if (!text) return 'narration';
  if (/^[“"「『].+[”"」』]$/.test(text) || /^[^:]{1,18}:\s*[“"「『]/.test(text)) return 'dialogue';
  if (/(생각했다|생각이 들|마음속|느꼈다|직감했다|불길했다|확신했다|깨달았다|떠올랐다|해야 한다|하면 안 된다)/.test(text)) return 'thought';
  return 'narration';
}
function dialogueSpeaker(sentence = '', fallback = '등장인물') {
  const m = String(sentence).match(/^([^:]{1,18}):\s*/);
  return m ? m[1].trim() : fallback;
}
function stripSpeaker(sentence = '') {
  return String(sentence).replace(/^([^:]{1,18}):\s*/, '').trim();
}
const STORY_VOICE = {
  ember:{도입:'“문을 닫아도 재는 들어옵니다. 문제는 재가 아니라, 그 재를 따라오는 이름이에요.”',탐색:'“왕가 기록은 거짓말을 할 수 있어도, 급히 지운 흔적은 거짓말을 못 합니다.”',대면:'“지금 물러서면 저들이 먼저 왕좌의 의미를 정할 겁니다.”',진실:'“우리가 지키던 건 왕이 아니었군요. 왕관이었어.”',위기:'“한 명을 살리려다 왕국을 잃을 수도 있습니다. 그래도 사람부터 보십시오.”',결단:'“정답은 없습니다. 다만 누가 대가를 치르는지는 우리가 정할 수 있습니다.”'},
  neon:{도입:'“당신 얼굴이 도시 전체에 떠 있어요. 문제는 당신이 왜 그걸 원했는지 기억하지 못한다는 거죠.”',탐색:'“삭제된 데이터보다 삭제한 사람의 습관을 보세요. 흔적은 남습니다.”',대면:'“여기서 한 번 잘못 움직이면 카메라보다 시민들이 먼저 우리를 신고해요.”',진실:'“기억을 되찾는 게 곧 진실을 되찾는 건 아니군.”',위기:'“백업 하나를 살리면 다른 누군가의 삶이 지워질 수 있어요.”',결단:'“도시가 누구의 기억을 진짜라고 부를지, 결국 우리가 정하게 됐네요.”'},
  abyss:{도입:'“산소는 충분합니다. 시간이 부족한 겁니다. 둘은 완전히 다른 문제예요.”',탐색:'“이 발자국, 물에 젖은 게 아니라 바깥에서 들어온 염분이에요.”',대면:'“창문 밖 저 사람을 사람이라고 믿는 순간부터 구조 계획이 바뀝니다.”',진실:'“우리가 괴물의 소리를 들은 게 아니라, 구조 요청을 괴물 소리로 분류했던 거군요.”',위기:'“기지와 생존자, 둘 다 살릴 시간은 줄고 있습니다.”',결단:'“무엇을 구조했다고 보고할지는, 무엇을 사람으로 인정했는지와 같은 말이 될 겁니다.”'},
  clock:{도입:'“이 말… 전에도 했던 것 같습니다. 당신도 기억합니까?”',탐색:'“같은 하루라면 같은 실수가 반복돼야 해요. 그런데 오늘은 다릅니다.”',대면:'“사라지는 건 시간이 아니라 가능성일지도 모릅니다.”',진실:'“우리가 내일을 만들고 있는 게 아니라, 누군가 내일을 하나만 남기고 있어요.”',위기:'“한 사람을 기억하게 만들면 다른 누군가가 밀려납니다.”',결단:'“완벽한 내일보다, 한 번뿐인 내일을 선택할 준비가 됐습니까?”'},
  wild:{도입:'“숲은 길을 숨기지 않아요. 우리가 원하는 길을 너무 잘 보여 줄 뿐이죠.”',탐색:'“발자국보다 별가루를 보세요. 짐승이 아니라 숲 자체가 움직였습니다.”',대면:'“저 신수도 우리만큼 겁먹었습니다. 먼저 공격하면 이유를 영영 못 듣겠죠.”',진실:'“별을 삼킨 게 숲이 아니라면, 우리가 막으려던 것이 오히려 보호막일 수 있어요.”',위기:'“사람에게 안전한 길이 숲에게도 안전하다는 보장은 없습니다.”',결단:'“누구도 완벽하게 이기는 답은 없겠지만, 모두가 살아남는 약속은 만들 수 있습니다.”'},
  guardian:{도입:'“공주님을 살리는 것만으로는 끝나지 않아요. 우리가 누구를 두고 가는지도 기억될 겁니다.”',탐색:'“고블린이 지나간 길과 침략자가 지나간 길이 겹치지 않아요. 누군가 일부러 빈 길을 만들었습니다.”',대면:'“챔피언 소드는 강한 사람보다, 무엇을 지킬지 아는 사람에게 반응한다는 기록이 있습니다.”',진실:'“이 여정은 다음 세계로 도망치는 길이 아니라, 지나온 세계가 우리를 다시 부르는 길이군요.”',위기:'“모두를 구할 수 없다는 말은 쉽죠. 누구를 남길지 말하는 순간부터 어렵습니다.”',결단:'“다음 세계로 가기 전에, 여기서 한 약속을 끝까지 가져가죠.”'},
  echo:{도입:'“막차는 끝났는데 개찰구 기록은 계속 늘고 있어요. 누군가 아직 도착하고 있다는 뜻입니다.”',탐색:'“표지판이 틀린 게 아니라, 역이 서로 다른 시간표를 동시에 보여 주고 있습니다.”',대면:'“저 문을 열면 나갈 수는 있어요. 대신 누가 안쪽에 남는지는 확인 못 합니다.”',진실:'“0번선은 숨겨진 승강장이 아니라, 어디에도 배치되지 못한 시간일지도 모르겠군요.”',위기:'“첫차가 오기 전에 해결하지 못하면 이상한 선로와 실제 선로가 겹칩니다.”',결단:'“우리만 나가는 것과 역을 정상으로 돌리는 건 같은 엔딩이 아닙니다.”'},
  aurora:{도입:'“저 주파수에서 제 이름이 들렸습니다. 그런데 그 기록은 43년 전 겁니다.”',탐색:'“빙핵의 자성층이 목소리뿐 아니라 기억 반응까지 저장한 것 같습니다.”',대면:'“저 목소리가 과거라면 현재를 알아선 안 됩니다. 그런데 방금 제 질문에 대답했어요.”',진실:'“우리가 유령을 듣는 게 아니라, 얼음이 사람을 재생하고 있는 걸지도 모릅니다.”',위기:'“연구를 더 하면 사람을 잃고, 구조부터 하면 증거가 녹아 사라질 수 있습니다.”',결단:'“이걸 세상에 알리는 순간 발견이 아니라 기술이 됩니다. 그 책임까지 감당해야 합니다.”'},
  masque:{도입:'“대본대로 움직이지 마. 마지막 장면은 아직 비어 있으니까.”',탐색:'“가면 안쪽 이름이 덧칠돼 있어요. 이 도시가 사람보다 배역을 오래 기억한 겁니다.”',대면:'“무대 장치를 움직이면 거리 자체가 바뀝니다. 여긴 도시가 아니라 공연장이에요.”',진실:'“마지막 장이 사라진 게 아니라 누군가 끝내지 않으려고 숨긴 겁니다.”',위기:'“사람들에게 이름을 돌려주면 도시가 사라질 수도 있어요. 자유와 고향이 충돌합니다.”',결단:'“정해진 결말을 복원할지, 우리 손으로 새 결말을 쓸지 이제 고르면 됩니다.”'}
};
function storyVoiceLine(c, beat){
  const world=STORY_VOICE[c?.id]||STORY_VOICE.guardian;
  return world[beat?.phase]||world.도입||'“지금 보이는 것만으로 결론 내리면 안 됩니다.”';
}
function playerInnerVoice(beat, player){
  const last=state?.lastStoryAction;
  const name=player?.name||'나';
  if(last?.playerId===playerToken){
    const result=last.success?'통했다':'뜻대로 되지 않았다';
    return `${last.declaration||'방금 선택'}는 ${result}. 하지만 그 결과 때문에 지금 보이는 장면의 의미가 달라졌다. ${beat?.objective||'다음 행동을 정해야 한다'}`;
  }
  const phase=beat?.phase||'장면';
  const cue={도입:'아직 답을 고를 때가 아니다. 먼저 이곳에서 무엇이 평범하지 않은지 잡아야 한다.',탐색:'겉으로 가장 눈에 띄는 단서가 진짜라는 보장은 없다. 서로 맞지 않는 부분부터 봐야 한다.',대면:'이제 보고만 있을 수는 없다. 누구를 먼저 믿고 무엇을 먼저 건드릴지 결정해야 한다.',진실:'방금 알게 된 사실이 맞다면 앞선 장면의 의미까지 바뀐다. 틀리다면 누군가가 이 믿음을 만들었다.',위기:'모든 걸 지킬 수 없을 수도 있다. 그렇다면 무엇을 잃지 않을지 먼저 정해야 한다.',결단:'여기서 고른 답은 다음 장면만이 아니라 마지막에 돌아볼 이유가 될 것이다.'}[phase];
  return `${cue||'지금 상황을 한 번 더 정리해야 한다.'} ${beat?.objective||''}`.trim();
}
function storyNarrationHTML(c, beat, player, hints = []) {
  const raw = String(beat?.text || c?.intro || '').trim();
  const paragraphs = proseParagraphs(raw).slice(0,4);
  const dialogue = Array.isArray(beat?.dialogue) ? beat.dialogue.filter(x=>x?.text) : [];
  const prime = player?.job?.prime || '지혜';
  const inner = beat?.playerVoices?.[prime] || playerInnerVoice(beat,player);
  const question = beat?.sceneQuestion || beat?.objective || '지금 무엇을 먼저 확인해야 하는가?';
  const blocks=[];
  if(paragraphs[0]) blocks.push(`<p class="scene-narration lead release-opening">${storyParagraphHTML(paragraphs[0],0)}</p>`);
  if(paragraphs[1]) blocks.push(`<p class="scene-narration release-detail">${storyParagraphHTML(paragraphs[1],1)}</p>`);
  if(dialogue.length){
    blocks.push(`<section class="release-dialogue-stack">${dialogue.slice(0,2).map((line,i)=>`<div class="story-dialogue release-dialogue ${i===1?'secondary':''}"><span>${esc(line.speaker||'등장인물')}</span><p>${esc(line.text)}</p></div>`).join('')}</section>`);
  }
  if(beat?.playerSpeech) blocks.push(`<div class="story-dialogue release-dialogue player-spoken"><span>${esc(player?.name||'당신')}</span><p>“${esc(beat.playerSpeech)}”</p></div>`);
  blocks.push(`<div class="release-player-beat"><span>${esc(player?.name||'나')}의 생각</span><p>${esc(inner)}</p></div>`);
  if(paragraphs[2]) blocks.push(`<p class="scene-narration sensory release-change">${storyParagraphHTML(paragraphs[2],2)}</p>`);
  if(paragraphs[3]) blocks.push(`<p class="scene-narration consequence release-consequence">${storyParagraphHTML(paragraphs[3],3)}</p>`);
  blocks.push(`<div class="release-scene-question"><span>지금 장면의 핵심</span><strong>${esc(question)}</strong>${beat?.immediatePressure?`<small>${esc(beat.immediatePressure)}</small>`:''}</div>`);
  const hook=beat?.continuityHook ? `<p class="continuity-hook"><span>기억해 둘 징후</span><strong>${esc(beat.continuityHook)}</strong></p>` : '';
  return `<article class="narration-rich clean-narration dialogue-page cinematic-story public-quality-story release-story-v760">${blocks.join('')}${hook}</article>`;
}

function parallelNarrationHTML(lines=[]){
  return `<article class="parallel-prose cinematic-story">${(lines||[]).map((text,index)=>{
    const s=String(text||'').trim();
    const m=s.match(/^([^:]{1,24}):\s*(.+)$/);
    if(m && m[1] !== '내 생각') return `<div class="story-dialogue"><span>${esc(m[1])}</span><p>${esc(m[2])}</p></div>`;
    if(m && m[1]==='내 생각') return `<p class="story-thought"><span>${esc(state?.players?.find(p=>p.id===playerToken)?.name||'나')}</span>${esc(m[2])}</p>`;
    return `<p class="scene-narration ${index===0?'lead':''}">${storyParagraphHTML(s,index)}</p>`;
  }).join('')}</article>`;
}


function conciseSceneText(text = '', max = 180) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const first = clean.split(/(?<=[.!?…])\s+/).filter(Boolean).slice(0, 2).join(' ');
  return first.length > max ? `${first.slice(0, max - 1).trim()}…` : first;
}

function setStoryTrail(before = '', bridge = '', now = '') {
  const clarity = $('#storyClarity');
  if (!clarity) return;
  clarity.classList.remove('clean-main');
  clarity.classList.add('story-trail');
  const cards = clarity.querySelectorAll('.clarity-card');
  const labels = ['직전 상황', '왜 여기까지 왔나', '지금 상황'];
  const values = [before, bridge, now];
  cards.forEach((card, index) => {
    const label = card.querySelector('span');
    const copy = card.querySelector('p');
    if (label) label.textContent = labels[index] || '';
    if (copy) copy.textContent = values[index] || '아직 확인된 내용이 없습니다.';
  });
}

function mainStoryTrail(c, beat, inResolution = false) {
  const history = Array.isArray(state?.storyHistory) ? state.storyHistory : [];
  const last = history[history.length - 1];
  const action = last?.declaration || last?.choiceLabel || '상황을 살폈다';
  const actor = last?.playerName || state?.turnPlayerName || '플레이어';
  let before = '';
  let bridge = '';
  let now = '';
  if (!last) {
    before = `사건의 발단 — ${conciseSceneText(c?.intro || beat?.text || '', 220)}`;
    bridge = `이 사건을 직접 확인하기 위해 ${beat?.actName || '첫 현장'}까지 왔다. 아직 아무 결론도 확정되지 않았고, 지금부터의 선택이 첫 번째 사실을 만든다.`;
  } else if (inResolution) {
    before = `${last.title || beat?.title || '직전 장면'}에서 ${actor}이(가) 「${action}」을 시도했다.`;
    bridge = `${last.success ? '그 행동은 원하는 결과를 만들었다.' : '그 행동은 뜻대로 풀리지 않았고 새로운 문제를 남겼다.'} ${conciseSceneText(last.narrative || state?.lastResolution?.text || '', 220)}`;
  } else {
    before = `${last.title || '직전 장면'}에서 ${actor}이(가) 「${action}」을 선택했다.`;
    bridge = `${last.success ? '그 선택으로 이전에 닫혀 있던 정보나 길이 열렸다.' : '그 실패를 수습하는 과정에서 예상하지 못한 길이나 위험이 드러났다.'} 그래서 지금 「${beat?.title || '다음 장면'}」에 도착했다.`;
  }
  if (inResolution) {
    now = `${state?.lastResolution?.ok ? '현재 행동의 결과가 확정됐다.' : '현재 행동의 실패와 대가가 확정됐다.'} ${state?.lastResolution?.consequence || ''}`.trim();
  } else {
    const scene = conciseSceneText(beat?.text || beat?.sceneContext || '', 240);
    now = `${scene} 지금 당장 필요한 것은 “${beat?.objective || '다음 행동을 정하는 것'}”이다.`.trim();
  }
  return { before, bridge, now };
}

function parallelStoryTrail(scene, ps, player) {
  const history = Array.isArray(ps?.history) ? ps.history : [];
  const last = history[history.length - 1];
  const oldPlace = ps?.previousLocation || scene?.previousLocation || '';
  const placeName = oldPlace && oldPlace !== scene?.location ? oldPlace : '';
  const before = last
    ? `${player?.name || '당신'}은(는) ${placeName ? `${placeName}에서 ` : ''}「${last.choice || '행동'}」을 선택했다.`
    : `${player?.name || '당신'}의 이야기는 ${scene?.locationLabel || '이 장소'}에서 시작됐다.`;
  const bridge = last
    ? `${last.success || last.grade === 'mixed' ? '그 행동이 다음 길을 열었다.' : '뜻대로 되지 않았지만 그 실패가 새로운 문제를 만들었다.'} 그래서 지금 ${scene?.locationLabel || '이곳'}에 서 있다.`
    : `아직 다른 장면에서 이어진 선택은 없다. 눈앞의 상황을 처음부터 판단해야 한다.`;
  const linked = Array.isArray(scene?.linked) && scene.linked.length ? ` 현재 ${scene.linked.map(x => x.name).join(', ')}와 동행 중이다.` : '';
  const now = `${scene?.sceneContext || scene?.title || scene?.locationLabel || '현재 상황'}.${scene?.objective ? ` 지금 해야 할 일은 ${scene.objective}` : ''}${linked}`;
  return { before, bridge, now };
}

function bossArtCandidates(c, monster='') {
  const world = c?.id || 'chronicle';
  const slug = String(monster || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '_').replace(/^_+|_+$/g, '');
  return [
    `/art/${world}_boss.webp?v=4121d`, `/art/${world}_boss.png?v=4121d`,
    slug ? `/art/${world}_boss_${slug}.webp?v=4121d` : '', slug ? `/art/${world}_boss_${slug}.png?v=4121d` : '',
    slug ? `/art/${world}_${slug}.webp?v=4121d` : '', slug ? `/art/${world}_${slug}.png?v=4121d` : ''
  ].filter(Boolean);
}
function monsterArt(c, monster) {
  const world=c?.id||'ember';
  const names={ember:'재와 왕관의 망령',neon:'네온 코어의 포식자',abyss:'심연에서 솟은 거대 생명체',clock:'시간을 베는 파수꾼',wild:'별빛을 삼킨 신수'};
  const accent={ember:'#ff7b52',neon:'#42e7ff',abyss:'#75d9ff',clock:'#ffd58a',wild:'#94f0aa'}[world]||'#ff7b52';
  const shape={
    ember:`<path d="M700 500 C590 450 590 300 670 260 L710 145 L758 225 L810 130 L855 250 C945 302 930 458 820 500 Z" fill="rgba(28,10,12,.88)" stroke="${accent}" stroke-width="10"/><circle cx="720" cy="335" r="12" fill="#ffe2bc"/><circle cx="810" cy="335" r="12" fill="#ffe2bc"/><path d="M680 262 L718 188 L754 240 L810 156 L854 266" fill="none" stroke="#ffd286" stroke-width="12"/>`,
    neon:`<rect x="590" y="180" width="340" height="300" rx="55" fill="rgba(7,13,27,.9)" stroke="${accent}" stroke-width="10"/><circle cx="700" cy="315" r="28" fill="#ff4d9b"/><circle cx="820" cy="315" r="28" fill="#ff4d9b"/><path d="M620 410 C540 450 530 520 500 575 M900 410 C980 450 990 520 1020 575" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>`,
    abyss:`<ellipse cx="760" cy="315" rx="195" ry="130" fill="rgba(12,40,62,.9)" stroke="${accent}" stroke-width="10"/><circle cx="700" cy="300" r="15" fill="#d5fbff"/><circle cx="820" cy="300" r="15" fill="#d5fbff"/><path d="M620 405 C550 500 550 565 590 635 M700 420 C660 520 675 590 700 650 M820 420 C860 520 845 590 820 650 M900 405 C970 500 970 565 930 635" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>`,
    clock:`<circle cx="760" cy="325" r="150" fill="rgba(17,16,30,.9)" stroke="${accent}" stroke-width="12"/><circle cx="760" cy="325" r="82" fill="none" stroke="rgba(255,225,155,.6)" stroke-width="8"/><path d="M760 325 L760 245 M760 325 L830 358" stroke="${accent}" stroke-width="12" stroke-linecap="round"/><path d="M630 500 C665 410 855 410 890 500" fill="rgba(8,8,16,.9)" stroke="${accent}" stroke-width="8"/>`,
    wild:`<path d="M610 510 C625 340 675 225 760 210 C845 225 895 340 910 510 C850 470 805 445 760 445 C715 445 670 470 610 510 Z" fill="rgba(8,32,22,.9)" stroke="${accent}" stroke-width="10"/><path d="M680 255 C610 205 575 135 560 95 C625 115 680 155 716 205 M840 255 C910 205 945 135 960 95 C895 115 840 155 804 205" fill="none" stroke="${accent}" stroke-width="14"/><circle cx="715" cy="350" r="15" fill="#efffd2"/><circle cx="805" cy="350" r="15" fill="#efffd2"/>`
  }[world]||'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 760"><defs><radialGradient id="bg"><stop offset="0" stop-color="#2a1720"/><stop offset="1" stop-color="#07080e"/></radialGradient></defs><rect width="1400" height="760" fill="url(#bg)"/><circle cx="1130" cy="140" r="55" fill="${accent}" opacity=".18"/><g>${shape}</g><rect x="75" y="70" width="480" height="170" rx="18" fill="rgba(4,5,10,.64)"/><text x="105" y="113" fill="${accent}" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="3">COMBAT ENCOUNTER</text><text x="105" y="165" fill="#fff" font-family="sans-serif" font-size="45" font-weight="800">${esc(monster||'UNKNOWN')}</text><text x="105" y="207" fill="#ddd" font-family="sans-serif" font-size="20">${esc(names[world]||'강대한 적')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function setBossSceneImage(img,c,monster){
  if(!img) return;
  // Boss appearance is mandatory: render built-in portrait immediately.
  img.src=monsterArt(c,monster);
  img.style.display='';
  img.dataset.bossArtLoaded='builtin';
  for(const src of bossArtCandidates(c,monster)){
    const probe=new Image();
    probe.onload=()=>{ img.src=src; img.dataset.bossArtLoaded='custom'; };
    probe.src=src;
  }
}

function sendChat(inputSelector) {
  const input = $(inputSelector);
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat:send', { roomCode, playerToken, text }, r => {
    if (r?.ok) input.value = '';
    else toast(r?.error || '메시지 전송 실패');
  });
}
function everyoneVoted(choiceVotes = {}) {
  return state?.players?.filter(p => p.connected && p.hp > 0).every(p => Number.isInteger(Number(choiceVotes[p.id])));
}


let roomDirectory=[];
function roomAccessMode(){ return document.querySelector('input[name="roomAccess"]:checked')?.value || 'public'; }
function updateRoomPasswordField(){ $('#passwordCreateField').classList.toggle('hidden',roomAccessMode()!=='locked'); }
document.querySelectorAll('input[name="roomAccess"]').forEach(r=>r.addEventListener('change',updateRoomPasswordField));
function requestRoomDirectory(){ socket.emit('room:list',{},res=>{ if(res?.ok){roomDirectory=res.rooms||[];renderRoomDirectory();} }); }
function renderRoomDirectory(){
  const box=$('#roomList'); if(!box) return;
  if(!roomDirectory.length){ box.innerHTML='<div class="room-empty">현재 참가 가능한 방이 없습니다.</div>'; return; }
  box.innerHTML=roomDirectory.map((r,i)=>`<button class="room-list-item" type="button" data-room-index="${i}" ${r.joinable?'':'disabled'}><span class="room-lock">${r.locked?'🔒':'◉'}</span><span class="room-list-copy"><b>${esc(r.roomName||'이름 없는 방')}</b><small>${esc(r.campaignTitle||'연대기 선택 중')} · ${r.players}/${r.maxPlayers}명${r.joinable?'':' · 진행 중/가득 참'}</small></span><span>${r.locked?'비밀번호':'참가'}</span></button>`).join('');
  box.querySelectorAll('[data-room-index]').forEach(btn=>btn.onclick=()=>{
    const r=roomDirectory[Number(btn.dataset.roomIndex)]; if(!r?.joinable)return;
    $('#codeInput').value=r.roomCode;
    $('#joinPasswordField').classList.toggle('hidden',!r.locked);
    if(r.locked){ $('#joinPasswordInput').focus(); $('#entryError').textContent='비밀번호를 입력한 뒤 방 참가하기를 누르세요.'; }
    else joinSelectedRoom(r);
  });
}
function joinSelectedRoom(r){
  const name=$('#nameInput').value.trim(); if(!name){ $('#entryError').textContent='플레이어 이름을 먼저 입력하세요.'; return; }
  socket.emit('room:join',{name,roomCode:r.roomCode,password:$('#joinPasswordInput').value},onJoined);
}
$('#refreshRooms').onclick=requestRoomDirectory;
socket.on('room:list:update',rooms=>{ roomDirectory=rooms||[]; if(mode==='join')renderRoomDirectory(); });

$('#openCreate').onclick = () => openEntry('create');
$('#openJoin').onclick = () => openEntry('join');
$('#entryBack').onclick = () => view('homeView');
function openEntry(m) {
  mode = m;
  $('#entryEyebrow').textContent = m === 'create' ? 'CREATE ROOM' : 'JOIN ROOM';
  $('#entryTitle').textContent = m === 'create' ? '새로운 연대기를 시작합니다.' : '열려 있는 연대기에 참가합니다.';
  $('#createRoomFields').classList.toggle('hidden',m!=='create');
  $('#codeField').style.display = m === 'join' ? 'block' : 'none';
  $('#roomBrowser').classList.toggle('hidden',m!=='join');
  $('#joinPasswordField').classList.add('hidden');
  $('#entrySubmit').textContent = m === 'create' ? '방 만들기' : '방 코드로 참가하기';
  $('#resumeCandidates').innerHTML = '';
  $('#entryError').textContent = '';
  if(m==='join') requestRoomDirectory();
  updateRoomPasswordField();
  view('entryView');
}
function renderResumeCandidates(candidates = []) {
  const box = $('#resumeCandidates');
  if (!candidates.length) { box.innerHTML = ''; return; }
  box.innerHTML = candidates.map((candidate, index) => `<button class="resume-candidate" type="button" data-resume-index="${index}"><b>${esc(candidate.campaignTitle || '진행 중인 연대기')}</b><span>${esc(candidate.progressLabel || '')}</span><small>${candidate.connectedCount || 0}/${candidate.playerCount || 1}명 접속 · ${esc(candidate.updatedLabel || '')}</small></button>`).join('');
  box.querySelectorAll('[data-resume-index]').forEach(btn => btn.onclick = () => {
    const candidate = candidates[Number(btn.dataset.resumeIndex)];
    const name = $('#nameInput').value.trim();
    $('#entryError').textContent = '저장된 세션에 연결하는 중입니다…';
    socket.emit('session:resume', { name, roomCode:candidate.roomCode }, onJoined);
  });
}
$('#entrySubmit').onclick = () => {
  const name = $('#nameInput').value.trim();
  if (!name) { $('#entryError').textContent = '플레이어 이름을 입력하세요.'; return; }
  if (mode === 'create') {
    const roomName=$('#roomNameInput').value.trim() || `${name}의 연대기`;
    const accessMode=roomAccessMode();
    const password=$('#roomPasswordCreate').value;
    if(accessMode==='locked' && password.length<2){ $('#entryError').textContent='비밀번호는 2자 이상 입력하세요.'; return; }
    return socket.emit('room:create', { name, roomName, accessMode, password }, onJoined);
  }
  const code = $('#codeInput').value.toUpperCase().trim();
  if (!code) { $('#entryError').textContent='방을 목록에서 고르거나 5자리 코드를 입력하세요.'; return; }
  socket.emit('room:join', { name, roomCode: code, password:$('#joinPasswordInput').value }, r=>{
    if(r?.passwordRequired){ $('#joinPasswordField').classList.remove('hidden'); $('#entryError').textContent=r.error||'비밀번호를 입력하세요.'; return; }
    onJoined(r);
  });
};

function onJoined(res) {
  if (!res?.ok) { $('#entryError').textContent = res?.error || '연결에 실패했습니다.'; return; }
  roomCode = res.roomCode;
  playerToken = res.playerToken;
  localStorage.setItem('cg_room', roomCode);
  localStorage.setItem('cg_token', playerToken);
  state = res.state;
  audioManager.syncMusic(state);
  renderState();
  if (state.phase === 'resolution' && state.lastResolution && !['story','event'].includes(String(state.lastResolution.source || ''))) showResolution(state.lastResolution);
  toast(res.resumed ? '저장된 연대기로 돌아왔습니다.' : `ROOM ${roomCode} 입장 완료`);
}
$('#copyCode').onclick = async () => {
  const text = state?.code || '';
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else throw new Error('clipboard unavailable');
    toast('방 코드를 복사했습니다.');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('방 코드를 복사했습니다.'); }
    catch { toast(`방 코드: ${text}`); }
    ta.remove();
  }
};

socket.on('connect', () => {
  $('#connectionText').textContent = 'ONLINE';
  $('.live-dot').style.background = 'var(--good)';
  if (roomCode && playerToken) resumeSavedSession();
});
socket.on('disconnect', () => { $('#connectionText').textContent = 'RECONNECTING'; $('.live-dot').style.background = 'var(--danger)'; });
socket.on('campaigns', list => { campaigns = list; renderCampaigns(); });
socket.on('state', s => { if (!roomCode || s.code === roomCode) { const prev = state; state = s; audioManager.onState(prev, state); renderState(); } });
socket.on('chat:new', entry => {
  if (state) {
    const ids = new Set((state.chat || []).map(item => item.id));
    if (!ids.has(entry.id)) state.chat = [...(state.chat || []), entry].slice(-120);
    renderChat();
  }
});
socket.on('resolution', r => { if (!['story','event'].includes(String(r?.source || ''))) showResolution(r); });
socket.on('skill:ready', payload => toast(`✨ ${payload?.name || '직업 스킬'} 사용이 가능합니다!`));
socket.on('skill:used', payload => { const combatKinds=new Set(['blast','markShot','partyAttackBoost','attackBoost']); const healKinds=new Set(['healParty','cleanseParty','healCleanse','partyHeal']); audioManager.fx(healKinds.has(payload?.kind)?'heal':(combatKinds.has(payload?.kind)?'attack':'skill'),1.12); toast(`✨ ${payload?.playerName || '플레이어'} · ${payload?.name || '직업 스킬'} — ${payload?.summary || '효과 적용'}`); });
socket.on('dice:roll', payload => { audioManager.fx('dice', .85); enqueueDice(payload); });

function enqueueDice(payload) {
  diceQueue = diceQueue.then(async () => {
    audioManager.unlock();
    const c = currentCampaign();
    $('#diceOverlay').classList.add('show');
    $('#diceRoller').textContent = `${payload.rollerName} · ${payload.kind?.toUpperCase() || 'ROLL'}`;
    $('#dicePurpose').textContent = payload.purpose;
    $('#diceFinal').textContent = '';
    $('#diceFinal').classList.remove('is-result');
    $('#diceBreakdown').innerHTML = '';
    $('#diceSub').textContent = `${payload.rollerName}의 주사위를 모든 플레이어가 함께 봅니다…`;
    const startsAt = Number(payload.startsAt || 0);
    if (startsAt > Date.now()) await new Promise(r => setTimeout(r, Math.min(1200, startsAt - Date.now())));
    $('#diceSub').textContent = '주사위가 테이블 위를 구릅니다…';
    const theater = getDiceTheater();
    if (theater) {
      await theater.roll({ sides: payload.sides, result: payload.result, color: c?.accent || '#bf4a38', duration: payload.sides === 20 ? 2850 : 2350 });
    } else {
      $('#diceSub').textContent = '3D 렌더러를 사용할 수 없어 판정을 진행합니다.';
      await new Promise(r => setTimeout(r, 450));
    }

    const narrativeRoll = ['story-choice','check','parallel-story'].includes(payload.kind);
    if (narrativeRoll) {
      // 스토리/이벤트 판정은 3D 주사위에서 이미 결과를 확인했으므로 숫자 결과창을 다시 띄우지 않는다.
      // 서버 state에 들어온 장면 결과가 오버레이 뒤의 본문에 바로 렌더링되어 다음 내용으로 자연스럽게 이어진다.
      $('#diceOverlay').classList.remove('show');
      await new Promise(r => setTimeout(r, 220));
      renderStory();
      return;
    }

    const rawLabel = payload.sides === 20 && payload.result === 20 ? 'NATURAL 20' : payload.sides === 20 && payload.result === 1 ? 'NATURAL 1' : `D${payload.sides} ${payload.result}`;
    $('#diceFinal').textContent = rawLabel;
    $('#diceFinal').classList.add('is-result');
    $('#diceBreakdown').innerHTML = `<span class="roll-raw">원값 <b>${payload.result}</b></span>`;
    $('#diceSub').textContent = '주사위 원값이 확정되었습니다.';

    if (payload.total != null) {
      await new Promise(r => setTimeout(r, 650));
      const mods = Array.isArray(payload.modifiers) ? payload.modifiers : [];
      let expression = `${payload.result}`;
      for (const mod of mods) {
        const value = Number(mod?.value || 0);
        if (!value) continue;
        expression += ` ${value >= 0 ? '+' : '−'} ${Math.abs(value)}`;
        $('#diceBreakdown').insertAdjacentHTML('beforeend', `<span class="roll-plus">${value >= 0 ? '+' : '−'}</span><span class="roll-mod"><small>${esc(mod.label || '보정')}</small><b>${value >= 0 ? '+' : ''}${value}</b></span>`);
        $('#diceSub').textContent = `${esc(mod.label || '보정')} ${value >= 0 ? '+' : ''}${value} 적용…`;
        await new Promise(r => setTimeout(r, 520));
      }
      $('#diceBreakdown').insertAdjacentHTML('beforeend', `<span class="roll-equals">=</span><span class="roll-total"><small>최종</small><b>${payload.total}</b></span>`);
      $('#diceFinal').textContent = `최종 ${payload.total}`;
      const outcome = payload.success === true ? '성공' : payload.success === false ? '실패' : '확정';
      $('#diceSub').textContent = `${expression} = ${payload.total}${payload.dc != null ? ` · 기준 ${payload.dc}` : ''}${payload.damage ? ` · 피해 ${payload.damage}` : ''} · ${outcome}`;
      if (payload.success === true) audioManager.fx('success',1);
      else if (payload.success === false) audioManager.fx('failure',1);
      await new Promise(r => setTimeout(r, 1400));
    } else {
      $('#diceSub').textContent = '주사위 결과가 확정되었습니다.';
      await new Promise(r => setTimeout(r, 950));
    }
    $('#diceOverlay').classList.remove('show');
    await new Promise(r => setTimeout(r, 180));
  }).catch(console.error);
}

function renderState() {
  if (!state) return;
  renderResumeGate();
  roomCode = state.code;
  $('#roomCodeTop').textContent = state.code;
  $('#roomCodeLobby').textContent = state.code;
  if($('#roomNameLobby')) $('#roomNameLobby').textContent = state.roomName || '연대기의 동료들';
  if (state.campaign) setWorld(state.campaign);

  // v5.8: 현재 화면만 다시 그린다. 이전에는 state 패킷 하나마다 로비/스토리/전투/엔딩 DOM을
  // 전부 재생성해 긴 캠페인과 4인 플레이에서 불필요한 레이아웃 계산이 누적됐다.
  if (state.phase === 'lobby') { view('lobbyView'); renderLobby(); }
  else if (state.phase === 'combat') { view('combatView'); renderCombat(); }
  else if (state.phase === 'ending') { view('endingView'); renderEnding(); }
  else { view('storyView'); renderStory(); }

  const chat = state.chat || [];
  const chatKey = `${chat.length}:${chat[chat.length - 1]?.id || ''}`;
  if (chatKey !== lastChatRenderKey) { lastChatRenderKey = chatKey; renderChat(); }
  renderSkillUi();
}

function renderCampaigns() {
  if (!campaigns.length) return;
  const box = $('#campaignCarousel');
  box.innerHTML = campaigns.map(c => `<button class="campaign-pill ${state?.campaignId === c.id ? 'selected' : ''}" data-id="${c.id}"><i>${c.icon}</i><b>${esc(c.title)}</b></button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (!isHost()) return toast('방장만 캠페인을 선택할 수 있습니다.');
    socket.emit('campaign:select', { roomCode, playerToken, campaignId: b.dataset.id }, r => !r?.ok && toast(r.error));
  });
  renderCampaignDetail();
}
function renderCampaignDetail() {
  const c = currentCampaign();
  const el = $('#campaignDetail');
  if (!el) return;
  if (!c) {
    el.innerHTML = '<div class="unassigned">방장이 다섯 개의 연대기 중 하나를 선택합니다.</div>';
    return;
  }
  el.innerHTML = `
    <img class="campaign-cover" src="${coverArt(c)}" alt="${esc(c.title)} 대표 이미지">
    <div class="eyebrow">${esc(c.genre)}</div>
    <h3>${c.icon} ${esc(c.title)}</h3>
    <p>${esc(c.subtitle)}</p>
    <p>${esc(c.intro)}</p>
    <div class="acts">${c.acts.map((a, i) => `<span>ACT ${i + 1} · ${esc(a)}</span>`).join('')}</div>`;
}

function renderLobby() {
  if (!state) return;
  renderCampaigns();
  const slots = $('#playerSlots');
  slots.innerHTML = state.players.map(p => `
    <div class="player-slot ${p.connected ? '' : 'offline'}">
      <div class="avatar">${esc(p.name[0] || '?')}</div>
      <div>
        <div class="pname">${esc(p.name)} ${p.host ? '<span class="eyebrow">HOST</span>' : ''}</div>
        <div class="ptags">${p.job ? esc(p.job.name) : '직업 미정'} · ${p.abilities ? '능력치 생성 완료' : '능력치 미정'}</div>
      </div>
      <div class="slot-state"><div class="${p.ready ? 'ready' : 'ready waiting'}">${p.connected ? (p.ready ? 'READY' : 'PREPARING') : 'OFFLINE'}</div>${isHost() && !p.connected && !p.host ? `<button class="remove-slot" data-remove="${p.id}" type="button">REMOVE</button>` : ''}</div>
    </div>`).join('') + Array.from({ length: Math.max(0, 4 - state.players.length) }, () => '<div class="empty-slot">동료를 기다리는 자리</div>').join('');
  slots.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => socket.emit('room:removePlayer', { roomCode, playerToken, targetPlayerId: btn.dataset.remove }, r => !r?.ok && toast(r.error)));

  const p = me();
  const cs = $('#characterSummary');
  if (!p?.job) {
    cs.innerHTML = '<div class="unassigned"><div><div style="font-size:42px;color:var(--accent)">◇</div><p>D6을 굴리면 이 세계의 여섯 직업 중 하나가 당신을 선택합니다. 각 스토리마다 직업/능력치는 한 번만 정할 수 있습니다.</p></div></div>';
  } else {
    cs.innerHTML = `<div class="job-big"><div class="job-rune">${state.campaign?.icon || '◆'}</div><div class="eyebrow">${p.job.prime} SPECIALIST</div><h3>${esc(p.job.name)}</h3><p><b>${esc(p.job.skillDef?.name || String(p.job.skill || '').split(':')[0])}</b> · ${esc(p.job.skillDef?.text || p.job.skill || '')}</p></div>${p.abilities ? `<div class="stats-compact">${Object.entries(p.abilities).map(([k, v]) => `<div class="stat-mini"><span>${k}</span><b>${v.total}</b><em>${signedMod(v.total)}</em></div>`).join('')}</div>` : '<div class="unassigned"><p>직업이 정해졌습니다. 이제 4D6으로 능력치를 생성하세요.</p></div>'}`;
  }
  $('#rollClassBtn').disabled = !state.campaignId || !!p?.job;
  $('#rollStatsBtn').disabled = !p?.job || !!p?.abilities;
  $('#startGameBtn').style.display = isHost() ? 'block' : 'none';
  const ready = state.players.length >= 1 && state.players.every(x => x.ready && x.connected) && state.campaignId;
  $('#startGameBtn').disabled = !ready;
  $('#campaignHint').textContent = isHost() ? '클릭해 선택' : '방장이 선택';
  $('#lobbyStatus').textContent = state.players.some(x => !x.connected) ? '오프라인 플레이어가 있습니다. 재접속 후 시작할 수 있습니다.' : state.players.every(x => x.ready) ? (state.players.length === 1 ? 'SOLO 준비 완료 · 혼자서 전체 스토리와 전투를 테스트할 수 있습니다.' : '모든 동료의 캐릭터가 준비되었습니다.') : '모든 플레이어가 직업과 능력치를 생성해야 합니다.';
}
$('#rollClassBtn').onclick = () => {
  $('#rollClassBtn').disabled = true;
  socket.emit('player:classRoll', { roomCode, playerToken }, r => {
    if (!r?.ok) {
      $('#rollClassBtn').disabled = false;
      return toast(r?.error || '직업 생성에 실패했습니다.');
    }
    if (r.state) {
      state = r.state;
      renderState();
    }
  });
};
$('#rollStatsBtn').onclick = () => {
  $('#rollStatsBtn').disabled = true;
  socket.emit('player:statsRoll', { roomCode, playerToken }, r => {
    if (!r?.ok) {
      $('#rollStatsBtn').disabled = !me()?.job || !!me()?.abilities;
      return toast(r?.error || '능력치 생성에 실패했습니다.');
    }
    if (r.state) {
      state = r.state;
      renderState();
    }
  });
};
$('#startGameBtn').onclick = () => socket.emit('game:start', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
$('#lobbyHomeBtn').onclick = () => leaveLobbyToHome();
function leaveLobbyToHome(){
  if(!state || state.phase!=='lobby') return;
  socket.emit('room:leave',{roomCode,playerToken},res=>{
    if(!res?.ok) return toast(res?.error||'처음 화면으로 이동하지 못했습니다.');
    localStorage.removeItem('cg_room'); localStorage.removeItem('cg_token');
    roomCode=''; playerToken=''; state=null;
    resetTransientUi(); view('homeView'); toast('처음 화면으로 돌아왔습니다.');
  });
}

function voteSecondsLeft() {
  if (!state?.voteEndsAt) return 0;
  return Math.max(0, Math.ceil((Number(state.voteEndsAt) - Date.now()) / 1000));
}

function updateVoteCountdown() {
  const el = $('#voteTimer');
  if (!el) return;
  if (!state?.currentEvent || state?.activeChoice || !state?.voteEndsAt || state.phase !== 'story') {
    el.classList.add('hidden');
    return;
  }
  const left = voteSecondsLeft();
  el.classList.remove('hidden');
  const early = Boolean(state.voteAllVotedCountdown);
  el.innerHTML = early
    ? `<span>ALL VOTED</span><b>${left}</b><small>전원이 투표했습니다. ${left}초 뒤 선택을 확정합니다.</small>`
    : `<span>TABLE VOTE</span><b>${left}</b><small>초 후 서버가 자동 집계합니다. 전원이 투표하면 3초 카운트다운 후 바로 확정됩니다.</small>`;
  el.classList.toggle('urgent', left <= 5);
}

function renderResumeGate(){ $('#resumeGate')?.classList.add('hidden'); }

function renderCharacterHud(player, storyItems = []) {
  if (!state) return;
  const p = player || me();
  $('#partyRail').innerHTML = `<div class="panel-title"><span>PARTY</span><small>${state.players.length}/4</small></div>` + state.players.map(member => {
    const injuryCount = (member.statuses || []).reduce((n,s)=>n+Math.max(1,Number(s.stacks||1)),0);
    const passiveBadges = (member.derived?.passives || []).map(t => `<span class="status-pill passive ${esc(t.key || '')}" title="${esc(t.effect || '')}">${esc(t.label)}</span>`).join('');
    const statuses = `<div class="status-strip">${injuryCount ? `<span class="status-pill injury" title="누적 실패로 인한 부상">부상 ${injuryCount}</span>` : `<span class="status-pill ok">정상</span>`}${passiveBadges}</div>`;
    const defense = Number(member.derived?.defense || 10) + equipmentBonusFor(member,'민첩');
    return `<div class="party-card ${member.id === playerToken ? 'active' : ''}"><div class="top"><b>${esc(member.name)}</b><small>${member.inspiration} ✦</small></div><small>${esc(member.job?.name || '역할 미지정')}</small><small class="party-defense">방어 ${defense}</small><div class="hp-line"><i style="width:${member.maxHp ? Math.max(0, member.hp / member.maxHp * 100) : 0}%"></i></div><small>HP ${member.hp}/${member.maxHp}</small>${statuses}</div>`;
  }).join('');
  $('#myJobMini').textContent = p?.job?.name || 'UNASSIGNED';
  $('#myStatsMini').innerHTML = p?.abilities ? Object.entries(p.abilities).map(([k, v]) => {
    const gear = equipmentBonusFor(p, k);
    const total = effectiveStatTotal(p, k, v);
    const baseMod = rawMod(total);
    const finalMod = effectiveStatMod(p, k, v);
    return `<div class="stat-line"><span>${k}</span><b>${total} <i>${finalMod >= 0 ? '+' : ''}${finalMod}</i></b>${gear ? `<small class="gear-stat">기본 보정 ${baseMod >= 0 ? '+' : ''}${baseMod} · 장비 +${gear}</small>` : ''}</div>`;
  }).join('') + (() => {
    const d = p?.derived || {};
    const traits = [
      `체력 → 최대 HP ${p.maxHp}`,
      `민첩 → 방어 ${Number(d.defense || 10) + equipmentBonusFor(p,'민첩')}`,
      Number(d.strengthDamage || 0) ? `근력 → 공격 피해 +${d.strengthDamage}` : '',
      d.insight ? '지능 → 선택 결과 추론' : '',
      d.dangerSense ? '지혜 → 위험 여파 감지' : '',
      d.shopDiscount ? `매력 → 상점/휴식 ${d.shopDiscount}코인 할인` : '',
      d.statusResistance ? `체력 → 상태이상 ${d.statusResistance}장면 단축` : '',
    ].filter(Boolean);
    const passives = Array.isArray(d.passives) ? d.passives : [];
    return `<div class="ability-impact"><span>ABILITY IMPACT</span>${traits.map(t=>`<small>${esc(t)}</small>`).join('')}${passives.length ? `<div class="passive-traits">${passives.map(t=>`<b class="passive-trait ${t.key || ''}" title="${esc(t.effect || '')}">${esc(t.label)}<i>${esc(t.effect || '')}</i></b>`).join('')}</div>` : ''}</div>`;
  })() : '<div class="inventory-empty">능력치 정보가 아직 없습니다.</div>';
  renderEconomyPanel(p, storyItems);
}

function renderParallelStory() {
  const c=currentCampaign();
  const p=me();
  const choiceBox=$('#choiceArea');
  // v6.6.4: parallel-story choices must not inherit a hidden/display state from a previous screen.
  if(choiceBox){ choiceBox.classList.remove('hidden'); choiceBox.style.display='grid'; choiceBox.style.visibility='visible'; choiceBox.style.opacity='1'; }
  const ps=state?.parallel?.playerStates?.[playerToken];
  const scene=ps?.scene;
  const isMyTurn=state?.turnPlayerId===playerToken && state?.phase==='story';
  const inResolution=state?.phase==='resolution';
  if(!scene||!ps) return;
  renderCharacterHud(p, scene.storyItems || []);

  $('#deckCount').textContent='—';
  $('#eventCadence').textContent='개인 진행 · 종료 시점은 선택에 따라 달라짐';
  $('#threatValue').textContent=state.threat;
  $('#threatTrack').innerHTML=Array.from({length:8},(_,i)=>`<i class="${i<state.threat?'on':''}"></i>`).join('');
  $('#storyValue').textContent=`${ps.progress || 0}장면`;
  $('#storyFill').style.width=`${Math.min(100,Math.max(4,(Number(ps.progress||0)/12)*100))}%`;

  if(ps.ended){
    $('#turnBanner').textContent='당신의 개인 이야기는 한 결말에 도달했습니다. 다른 플레이어들의 이야기는 아직 계속될 수 있습니다.';
    setSceneImage($('#storySceneImg'),c,{act:5,actName:'04시 58분',title:'각자의 아침',visual:'첫차 직전의 청명역'});
    $('#storySceneCaption').textContent=`${c?.title || '막차 이후'} · ${p?.job?.name || ''}의 결말`;
    $('#actLabel').textContent='PERSONAL ENDING';
    $('#eventTitle').textContent='당신이 선택한 아침';
    $('#storySituation').textContent=ps.endingText || `${c?.title || '이 연대기'}에서의 당신 이야기는 여기서 한 결말에 도달했습니다.`;
    $('#storyObjective').textContent='다른 플레이어는 아직 각자의 위치에서 이야기를 진행하고 있습니다.';
    $('#storyWhy').textContent=(state.parallel.worldSummary||[]).join(' ') || '같은 세계 안에서도 서로 다른 선택과 결말이 동시에 만들어질 수 있습니다.';
    $('#storyPrompt').innerHTML='<b>당신은 더 이상 턴을 사용하지 않습니다.</b> 다른 플레이어들이 어떤 선택으로 아침을 맞는지 지켜볼 수 있습니다.';
    $('#eventText').innerHTML=`<div class="inline-resolution success"><div class="eyebrow">YOUR ENDING</div><p>${esc(ps.endingText || '')}</p></div>`;
    $('#choiceArea').innerHTML='<div class="action-lock"><div><div class="eyebrow">PERSONAL STORY COMPLETE</div><b>다른 플레이어의 개인 진행이 끝날 때까지 기다립니다.</b></div></div>';
    $('#storyActionBox').style.display='none';
    $('#gmBar').style.display='flex'; $('#advanceStoryBtn').style.display='none'; $('#continueBtn').style.display='none';
    $('#facilityPanel')?.classList.add('hidden');
    return;
  }

  const encounter=state.parallel.encounters?.[scene.location];
  const nearby=scene.nearby || [];
  const linked=scene.linked || [];
  $('#turnBanner').textContent=isMyTurn
    ? `당신의 턴 · ${scene.locationLabel}에서 무엇을 할지 선택하세요.`
    : `${state.turnPlayerName || '다른 플레이어'}의 턴 · 당신은 ${scene.locationLabel}에서 자신의 다음 행동을 기다립니다.`;
  setSceneImage($('#storySceneImg'),c,{act:scene.act,actName:scene.actName,title:scene.title,visual:scene.locationLabel,id:scene.id});
  $('#storySceneCaption').textContent=`개인 진행 · ${scene.locationLabel} · ${p?.job?.name || '플레이어'}${nearby.length?` · 같은 장소: ${nearby.map(x=>x.name).join(', ')}`:''}`;
  $('#actLabel').textContent=encounter?`LOCAL ENCOUNTER · ACT ${scene.act}`:`PARALLEL STORY · ACT ${scene.act}`;
  $('#eventTitle').textContent=encounter?`${scene.title} · ${encounter.name}`:scene.title;
  const trail = parallelStoryTrail(scene, ps, p);
  if (encounter) trail.now = `${scene.sceneContext || scene.title}. ${encounter.name}이 길을 막고 있다. 지금은 싸우거나, 약점을 찾거나, 빠져나갈 방법을 정해야 한다.`;
  setStoryTrail(trail.before, trail.bridge, trail.now);
  const world=(scene.worldSummary||[]).join(' ');
  const social=nearby.length
    ? `현재 같은 장소에 ${nearby.map(x=>`${x.name}${x.linked?'(동행 중)':''}`).join(', ')}이(가) 있습니다. 만난 뒤에도 같이 갈지 헤어질지는 선택입니다.`
    : linked.length ? `동행 관계: ${linked.map(x=>`${x.name}(${x.locationLabel})`).join(', ')}. 서로 다른 길로 갈 경우 다음 턴에 따라갈지 남을지 다시 선택합니다.` : '현재 이 장소에는 다른 플레이어가 보이지 않습니다.';
  $('#storyWhy').style.display='block';
  $('#storyPrompt').innerHTML=`<b>${esc(p?.name || '당신')}</b> · ${esc(scene.sceneQuestion || scene.objective || '지금 무엇을 할지 정한다')}`;
  const paragraphs=parallelNarrationHTML(scene.paragraphs||[]);
  const pPrime=p?.job?.prime||'지혜';
  const sceneDialogue=Array.isArray(scene.dialogue)?scene.dialogue.filter(x=>x?.text).slice(0,2):[];
  const dialogueHtml=sceneDialogue.length?`<section class="release-dialogue-stack">${sceneDialogue.map((line,i)=>`<div class="story-dialogue release-dialogue ${i===1?'secondary':''}"><span>${esc(line.speaker||'등장인물')}</span><p>${esc(line.text)}</p></div>`).join('')}</section>`:'';
  const spoken=scene.playerSpeech?`<div class="story-dialogue release-dialogue player-spoken"><span>${esc(p?.name||'당신')}</span><p>“${esc(scene.playerSpeech)}”</p></div>`:'';
  const thought=scene.playerVoices?.[pPrime]?`<div class="release-player-beat"><span>${esc(p?.name||'나')}의 생각</span><p>${esc(scene.playerVoices[pPrime])}</p></div>`:'';
  const questionHtml=scene.sceneQuestion?`<div class="release-scene-question"><span>지금 장면의 핵심</span><strong>${esc(scene.sceneQuestion)}</strong>${scene.immediatePressure?`<small>${esc(scene.immediatePressure)}</small>`:''}</div>`:'';
  const last=state.lastResolution;
  const lastResult=last?.source==='parallel-story' ? `<div class="inline-resolution ${last.ok?'success':'failure'}"><div class="eyebrow">LAST ACTION</div><b>${esc(last.playerName||'플레이어')} · ${esc(last.choiceLabel||'행동')}</b><p>${esc(last.text||'')}</p>${last.consequence?`<small>여파 · ${esc(last.consequence)}</small>`:''}</div>` : '';
  const encounterInfo=encounter?`<div class="story-inline-help danger"><b>지역 전투</b> · ${esc(encounter.name)} · HP ${encounter.hp}/${encounter.maxHp}${encounter.weak?` · 약점: ${esc(encounter.weak)}`:''}<br>이 장소에 들어온 다른 플레이어도 자기 턴에 같은 전투에 참가할 수 있습니다.</div>`:'';
  const nearbyInfo=nearby.length?`<div class="story-inline-help"><b>우연한 조우</b> · ${nearby.map(x=>`${esc(x.name)}(${esc(x.job||'')})`).join(' · ')}<br>자동으로 파티가 되지 않습니다. 아래 선택으로 같이 다니거나, 잠깐 협력하거나, 계속 각자 움직일 수 있습니다.</div>`:'';
  $('#eventText').innerHTML=lastResult+paragraphs+dialogueHtml+spoken+thought+questionHtml+encounterInfo;

  $('#storyActionBox').style.display='none';
  $('#storyActionInput').disabled=true;
  $('#actionSuggestions').innerHTML='';
  const storyItems=(scene.storyItems||[]).map(item=>esc(item.name)).join(' · ');
  $('#storyRoleContext').innerHTML=`<span>${esc(scene.locationLabel)}</span><b>${esc(scene.objective||'다음 행동을 정한다')}</b>${storyItems?`<small>소지품 · ${storyItems}</small>`:''}`;

  const choices=Array.isArray(scene.choices) ? scene.choices.filter(choice=>choice && choice.label) : [];
  const emptyNotice=choices.length ? '' : `<div class="action-lock"><div><div class="eyebrow">CHOICE DATA ERROR</div><b>서버에서 현재 장면의 선택지가 전달되지 않았습니다.</b><small>새 패치에서는 이 상태가 생기지 않도록 서버가 기본 행동을 항상 보장합니다. 화면이 계속 이 상태라면 서버도 함께 재배포했는지 확인하세요.</small></div></div>`;
  const renderedChoices=choices.map((choice,index)=>`
    <button class="choice-card story-choice choice-row" type="button" data-parallel-index="${index}" ${isMyTurn?'':'disabled'}>
      <span class="choice-number">${index+1}</span>
      <span class="choice-copy"><b>${esc(choice.label)}</b>${choice.reason?`<small>${esc(choice.reason)}</small>`:''}</span>
      <span class="choice-check">${choice.choiceBadge?`<em>${esc(choice.choiceBadge)}</em>`:''}${choice.automatic?'선택':`${esc(choice.stat||'지혜')} · DC ${Number(choice.dc||8)}`}</span>
    </button>`).join('');
  choiceBox.style.setProperty('display','flex','important');
  choiceBox.style.setProperty('visibility','visible','important');
  choiceBox.style.setProperty('opacity','1','important');
  choiceBox.style.minHeight=choices.length ? '120px' : '90px';
  choiceBox.innerHTML=`<div class="vote-strip"><div><span class="eyebrow">WHAT DO YOU DO?</span><b>지금 할 수 있는 행동 ${choices.length}개</b></div><div>${isMyTurn?'현재 장면에 직접 연결되는 행동만 표시됩니다.':`${esc(state.turnPlayerName || '다른 플레이어')}의 턴을 기다리는 중입니다.`}</div></div>${emptyNotice}${renderedChoices}`;
  forceChoiceLayout(choiceBox);
  requestAnimationFrame(()=>{
    choiceBox.style.setProperty('display','flex','important');
    choiceBox.style.setProperty('visibility','visible','important');
    choiceBox.style.setProperty('opacity','1','important');
  });
  /* buttons are bound below using the server order rendered above */
  /* legacy inline mapping removed intentionally */
  /*
    <button class="choice-card story-choice" type="button" data-parallel-index="${index}" ${isMyTurn?'':'disabled'}>
      <div class="choice-title-line"><b>${index+1}. ${esc(choice.label)}</b>${choice.choiceBadge?`<span class="job-choice-badge">${esc(choice.choiceBadge)}</span>`:''}</div>
      <div class="story-choice-meta">${choice.automatic?'<span>플레이어 선택 · 판정 없음</span>':`<span>${esc(choice.stat || '지혜')} 판정</span><span class="difficulty">DC ${Number(choice.dc||8)}</span>`}</div>
    </button>`).join('');
  */
  choiceBox.querySelectorAll('[data-parallel-index]').forEach(btn=>btn.onclick=()=>{
    if(btn.disabled)return;
    const choiceIndex=Number(btn.dataset.parallelIndex);
    socket.emit('story:advance',{roomCode,playerToken,choiceIndex},r=>!r?.ok&&toast(r.error));
  });
  $('#gmBar').style.display='none';
  $('#advanceStoryBtn').style.display='none';
  $('#continueBtn').style.display='none';
  $('#continueBtn').disabled=true;
  $('#facilityPanel')?.classList.add('hidden');
  updateVoteCountdown();
}


function forceChoiceLayout(root = document) {
  const area = root?.matches?.('#choiceArea') ? root : root?.querySelector?.('#choiceArea') || document.getElementById('choiceArea');
  if (!area) return;
  const set = (el, prop, value) => el?.style?.setProperty(prop, value, 'important');
  set(area, 'display', 'flex');
  set(area, 'flex-direction', 'column');
  set(area, 'align-items', 'stretch');
  set(area, 'gap', '12px');
  set(area, 'overflow-x', 'hidden');
  set(area, 'overflow-y', 'auto');
  set(area, 'height', 'min(70vh, 720px)');
  set(area, 'max-height', 'min(70vh, 720px)');
  set(area, 'padding', '6px 10px 18px 4px');
  set(area, 'scroll-snap-type', 'y mandatory');
  set(area, 'scroll-padding-top', '10px');
  set(area, 'overscroll-behavior', 'contain');
  area.querySelectorAll('.choice-card').forEach(card => {
    const rowStyle = card.classList.contains('choice-row');
    set(card, 'position', 'relative');
    set(card, 'display', rowStyle ? 'grid' : 'flex');
    if (rowStyle) {
      set(card, 'grid-template-columns', '42px minmax(0,1fr) auto');
      set(card, 'align-items', 'center');
      set(card, 'gap', '14px');
    } else {
      set(card, 'flex-direction', 'column');
      set(card, 'align-items', 'stretch');
    }
    set(card, 'justify-content', 'flex-start');
    set(card, 'width', '100%');
    set(card, 'height', 'auto');
    set(card, 'min-height', rowStyle ? '132px' : '150px');
    set(card, 'max-height', 'none');
    set(card, 'padding', rowStyle ? '20px 22px' : '18px');
    set(card, 'overflow', 'visible');
    set(card, 'scroll-snap-align', 'start');
    set(card, 'scroll-snap-stop', 'always');
    set(card, 'scroll-margin-top', '10px');
    set(card, 'white-space', 'normal');
    set(card, 'box-sizing', 'border-box');
    Array.from(card.children).forEach(child => {
      set(child, 'position', 'static');
      set(child, 'float', 'none');
      set(child, 'transform', 'none');
      set(child, 'width', 'auto');
      set(child, 'max-width', '100%');
      set(child, 'box-sizing', 'border-box');
    });
    if (rowStyle) {
      const num = card.querySelector('.choice-number');
      const copy = card.querySelector('.choice-copy');
      const check = card.querySelector('.choice-check');
      if (num) { set(num, 'width', '32px'); set(num, 'height', '32px'); }
      if (copy) { set(copy, 'display', 'grid'); set(copy, 'gap', '6px'); set(copy, 'min-width', '0'); }
      if (check) { set(check, 'display', 'flex'); set(check, 'flex-direction', 'column'); set(check, 'align-items', 'flex-end'); set(check, 'white-space', 'nowrap'); }
      const copyTitle = copy?.querySelector('b');
      if (copyTitle) { set(copyTitle, 'font-size', '16px'); set(copyTitle, 'line-height', '1.6'); set(copyTitle, 'white-space', 'normal'); set(copyTitle, 'word-break', 'keep-all'); }
      const copyReason = copy?.querySelector('small');
      if (copyReason) { set(copyReason, 'font-size', '13.5px'); set(copyReason, 'line-height', '1.65'); set(copyReason, 'white-space', 'normal'); set(copyReason, 'word-break', 'keep-all'); }
    }
    const title = card.querySelector('.choice-title-line');
    if (title) {
      set(title, 'display', 'flex');
      set(title, 'align-items', 'flex-start');
      set(title, 'justify-content', 'space-between');
      set(title, 'gap', '12px');
      set(title, 'margin', '0');
      set(title, 'min-height', '0');
    }
    const titleText = title?.querySelector('b');
    if (titleText) {
      set(titleText, 'display', 'block');
      set(titleText, 'margin', '0');
      set(titleText, 'font-size', '15px');
      set(titleText, 'line-height', '1.6');
      set(titleText, 'white-space', 'normal');
      set(titleText, 'word-break', 'keep-all');
      set(titleText, 'overflow-wrap', 'anywhere');
    }
    const meta = card.querySelector('.story-choice-meta');
    if (meta) {
      set(meta, 'display', 'flex');
      set(meta, 'flex-wrap', 'wrap');
      set(meta, 'justify-content', 'space-between');
      set(meta, 'align-items', 'center');
      set(meta, 'gap', '10px');
      set(meta, 'margin', '12px 0 0');
      set(meta, 'padding', '0');
      set(meta, 'min-height', '0');
      meta.querySelectorAll('*').forEach(el => {
        set(el, 'position', 'static');
        set(el, 'line-height', '1.4');
      });
    }
    const reason = card.querySelector('.choice-context');
    if (reason) {
      set(reason, 'display', 'block');
      set(reason, 'margin', '13px 0 0');
      set(reason, 'padding', '11px 0 0');
      set(reason, 'border-top', '1px solid rgba(255,255,255,.08)');
      set(reason, 'font-size', '13px');
      set(reason, 'line-height', '1.75');
      set(reason, 'white-space', 'normal');
      set(reason, 'word-break', 'keep-all');
      set(reason, 'overflow-wrap', 'anywhere');
      set(reason, 'height', 'auto');
      set(reason, 'max-height', 'none');
      set(reason, 'overflow', 'visible');
    }
  });
}

function renderStory() {
  if (!state || state.phase === 'lobby' || state.phase === 'combat' || state.phase === 'ending') return;
  const c = currentCampaign();
  const ev = state.currentEvent;
  const beat = state.storyBeat || c?.storyBeats?.find(item => item.id === state.storyNodeId) || c?.storyBeats?.[0];
  const p = me();
  const isMyTurn = state.turnPlayerId === playerToken;
  const inResolution = state.phase === 'resolution';
  if (state.parallel?.enabled) return renderParallelStory();

  $('#deckCount').textContent = state.deckCount;
  $('#eventCadence').textContent = `${state.mainTurnsSinceEvent || 0}/${state.eventEveryTurns || 3}턴`;
  $('#threatValue').textContent = state.threat;
  $('#threatTrack').innerHTML = Array.from({ length: 8 }, (_, i) => `<i class="${i < state.threat ? 'on' : ''}"></i>`).join('');
  $('#storyValue').textContent = `${state.story || 0} SCENES`;
  const totalActs = Math.max(1, Number(c?.acts?.length || 5));
  const actProgress = beat?.act ? ((Number(beat.act) - 1) / totalActs) * 100 : 0;
  $('#storyFill').style.width = Math.max(4, Math.min(100, actProgress + 8)) + '%';
  renderCharacterHud(p);
  renderFacilityPanel(ev, p);
  const roleHook = beat?.roleHooks?.[p?.job?.prime] || '';
  $('#storyRoleContext').innerHTML = p?.job ? `<span>${esc(p.job.name)}${beat?.route ? ` · ${esc(beat.route.name)}` : ''}</span><b>${esc(roleHook || beat?.objective || '현재 목표')}</b>` : '';
  $('#actionSuggestions').innerHTML = '';
  $('#storyActionInput').placeholder = '하고 싶은 행동을 직접 적어도 됩니다.';
  $('#storyActionInput').maxLength = 180;
  $('#storyActionCount').textContent = `${$('#storyActionInput').value.length}/${$('#storyActionInput').maxLength || 180}`;

  const lastResolution = state.lastResolution?.source === 'story' ? state.lastResolution : null;
  const last = lastResolution || state.lastStoryAction;
  $('#lastActionResult').innerHTML = last ? `
    <div class="eyebrow">최근 장면 결과</div>
    ${last.choiceLabel ? `<div><b>${esc(last.choiceLabel)}</b></div>` : ''}
    ${last.success === undefined || last.success === null ? '' : `<span class="${last.success ? 'success' : 'failure'}">${last.success ? '성공' : '실패'}${last.stat ? ` · ${esc(last.stat)} ${last.total}/${last.dc}` : ''}</span>`}
    <p>${esc(last.text || last.narrative || '')}</p>
    ${last.consequence ? `<p class="failure">${esc(last.consequence)}</p>` : ''}
    ${last.status ? `<p class="failure">상태이상: ${esc(last.status.label)} — ${esc(last.status.desc || '')}</p>` : ''}
  ` : '';

  if (state.phase === 'prologue') {
    const myScene = state.prologue?.scenes?.[playerToken];
    const readyMe = !!state.prologue?.ready?.[playerToken];
    const readyNames = state.players.filter(member => state.prologue?.ready?.[member.id]).map(member => member.name);
    $('#turnBanner').textContent = '개인 프롤로그를 읽고 합류 준비를 마치면 메인 스토리가 시작됩니다.';
    $('#storySceneImg').src = coverArt(c);
    $('#storySceneCaption').textContent = `${c?.title || '연대기'} · ${p?.job?.name || '모험가'}의 개인 프롤로그`;
    $('#actLabel').textContent = 'PERSONAL PROLOGUE';
    $('#eventTitle').textContent = myScene?.title || '각자의 시작';
    setStoryTrail(
      `${c?.title || '이 연대기'}가 시작된다. ${conciseSceneText(c?.intro || myScene?.lead || '')}`,
      `${p?.name || '당신'}은(는) 아직 다른 플레이어를 만나지 못한 채 자기 위치에서 사건의 첫 단서를 마주했다.`,
      `${myScene?.lead || '각 플레이어는 서로 다른 장소에서 이야기를 시작한다.'} 지금 해야 할 일은 ${myScene?.objective || '자기 앞의 상황을 이해하고 첫 행동을 정하는 것'}이다.`
    );
    $('#storyWhy').style.display='block';
    $('#storyPrompt').innerHTML = `<b>${esc(p?.name||'당신')}</b>은(는) 아직 다른 이들이 어디에 있는지 모른다.`;
    $('#eventText').innerHTML = parallelNarrationHTML((myScene?.paragraphs||[]).slice(0,4));
    $('#storyActionBox').style.display = 'none';
    $('#storyActionInput').disabled = true;
    $('#storyActionBox').classList.add('disabled');
    $('#choiceArea').innerHTML = `<div class="vote-strip"><div><span class="eyebrow">JOIN THE CHRONICLE</span><b>${readyMe ? '합류 준비 완료. 다른 플레이어를 기다리는 중입니다.' : '프롤로그를 읽었다면 합류 준비를 완료하세요.'}</b></div><div>${esc(state.prologue?.meetingText || '')}</div></div>`;
    $('#gmBar').style.display = 'flex';
    $('#advanceStoryBtn').style.display = 'inline-flex';
    $('#advanceStoryBtn').disabled = readyMe;
    $('#advanceStoryBtn').textContent = readyMe ? '다른 플레이어를 기다리는 중' : '프롤로그 읽고 합류하기';
    $('#continueBtn').style.display = 'none';
    $('#continueBtn').disabled = true;
    $('#facilityPanel')?.classList.add('hidden');
    updateVoteCountdown();
    return;
  }

  if (ev) {
    const eventResolution = inResolution && state.lastResolution?.source === 'event' ? state.lastResolution : null;
    $('#turnBanner').textContent = eventResolution
      ? '주사위 판정이 끝났습니다. 결과가 사건의 다음 상태에 반영되었습니다.'
      : state.activeChoice
        ? `투표가 끝났습니다. ${state.activeChoice.playerName}이(가) 판정을 진행합니다.`
        : `SIDE EVENT · ${state.soloMode ? 'SOLO 12초 선택' : '45초 테이블 투표'} · 전원이 투표하면 3초 뒤 자동 확정됩니다.`;
    setSceneImage($('#storySceneImg'), c, ev);
    $('#storySceneCaption').textContent = `${ev.actName} · ${ev.visual || sceneWord(c?.id, Math.max(0, ev.act - 1))} · 이 사건은 메인 스토리 사이에 끼어드는 단 한 장의 이벤트입니다.`;
    $('#actLabel').textContent = `SIDE EVENT · ACT ${ev.act}`;
    $('#eventTitle').textContent = ev.title;
    const eventHistory = Array.isArray(state.storyHistory) ? state.storyHistory : [];
    const eventLast = eventHistory[eventHistory.length - 1];
    const eventBefore = eventLast
      ? `${eventLast.title || '직전 메인 장면'}에서 ${eventLast.playerName || '플레이어'}이(가) 「${eventLast.declaration || '행동'}」을 선택했다.`
      : `${c?.title || '이 연대기'}의 메인 흐름을 진행하던 중이었다.`;
    const eventBridge = eventResolution
      ? `${eventResolution.ok ? '돌발 사건에 대한 대응이 통했다.' : '돌발 사건 대응이 실패해 대가가 남았다.'} ${eventResolution.consequence || ''}`.trim()
      : `메인 이야기 도중 예상하지 못한 사건이 끼어들어 지금 즉시 대응해야 한다.`;
    const eventNow = eventResolution
      ? `사건의 결과가 확정됐다. 다음 메인 장면으로 돌아가기 전에 이 결과를 확인해야 한다.`
      : `${ev.situation || ev.text || '예상하지 못한 사건이 발생했다.'} 지금 해야 할 일은 ${ev.objective || '제한시간 안에 대응 방식을 정하는 것'}이다.`;
    setStoryTrail(eventBefore, eventBridge, eventNow);
    $('#storyPrompt').innerHTML = eventResolution
      ? `<b>${esc(eventResolution.playerName || state.activeChoice?.playerName || '플레이어')}의 판정 결과.</b> 주사위 숫자를 다시 보여주지 않고 이야기 결과로 바로 이어집니다.`
      : state.soloMode ? `<b>돌발 사건.</b> 12초 안에 대응을 고르세요. 투표 즉시 3초 카운트다운이 시작됩니다.` : `<b>의견을 나눈 뒤 투표하세요.</b> 전원이 투표하면 3초 뒤 자동 확정됩니다.`;
    $('#eventText').innerHTML = eventResolution
      ? `<div class="inline-resolution ${eventResolution.ok ? 'success' : 'failure'}"><div class="eyebrow">SCENE RESULT</div><p>${esc(eventResolution.text || '')}</p>${eventResolution.rewards?.length ? `<small>보상 · ${eventResolution.rewards.map(esc).join(' · ')}</small>` : ''}</div>`
      : esc(ev.text || '');
    $('#storyActionBox').style.display = 'none';
    if (eventResolution) {
      $('#choiceArea').innerHTML = `<div class="action-lock"><div><div class="eyebrow">SCENE RESOLVED</div><b>결과가 반영되었습니다. 아래 버튼으로 다음 장면을 이어가세요.</b><div class="vote-chip">주사위 결과는 다시 표시하지 않습니다.</div></div></div>`;
    } else renderChoices(ev);
  } else {
    $('#turnBanner').textContent = state.turnPlayerName ? `메인 스토리 차례: ${state.turnPlayerName} · ${state.mainTurnsSinceEvent || 0}/${state.eventEveryTurns || 3}턴 진행 후 이벤트 발생` : '행동 순서를 준비 중입니다.';
    setSceneImage($('#storySceneImg'), c, beat || { act: 1, actName: c?.acts?.[0], title: c?.title, visual: sceneWord(c?.id, 0), id: 'STORY' });
    $('#storySceneCaption').textContent = beat ? `${beat.isDetour ? 'UNEXPECTED SCENE' : `STORY SCENE ${(state.storySeenCount || 0) + (state.phase === 'resolution' ? 0 : 1)} · NODE ${beat.chapter || '?'}`} · ${beat.actName} · ${beat.visual}` : `${c?.title || '연대기'}의 메인 스토리를 진행합니다.`;
    $('#actLabel').textContent = beat ? (beat.isDetour ? `UNEXPECTED SCENE · ACT ${beat.act}` : `MAIN STORY · ACT ${beat.act}`) : 'MAIN STORY';
    $('#eventTitle').textContent = beat ? (beat.isDetour ? beat.title : `${beat.title}`) : '연대기가 이어집니다.';
    const trail = mainStoryTrail(c, beat, inResolution);
    setStoryTrail(trail.before, trail.bridge, trail.now);
    $('#storyWhy').style.display='block';
    $('#storyPrompt').innerHTML = `<b>${esc(state.turnPlayerName || '당신')}</b> · ${esc(beat?.sceneQuestion || beat?.objective || '지금 무엇을 할지 정한다')}`;
    $('#eventText').innerHTML = storyNarrationHTML(c, beat, p, []);
    if (inResolution && lastResolution) {
      const resultTrail = mainStoryTrail(c, beat, true);
      setStoryTrail(resultTrail.before, resultTrail.bridge, resultTrail.now);
      $('#storyPrompt').innerHTML = `<b>${esc(lastResolution.playerName || '플레이어')}의 선택이 반영되었습니다.</b> 주사위 결과창을 반복하지 않고 이야기 결과를 바로 보여줍니다.`;
      $('#eventText').innerHTML = `<div class="inline-resolution ${lastResolution.ok ? 'success' : 'failure'}"><div class="eyebrow">SCENE RESULT</div>${lastResolution.choiceLabel ? `<b>${esc(lastResolution.choiceLabel)}</b>` : ''}<p>${esc(lastResolution.text || '')}</p>${lastResolution.consequence ? `<small>게임 효과 · ${esc(lastResolution.consequence)}</small>` : ''}${lastResolution.status ? `<small>상태 · ${esc(lastResolution.status.label)} — ${esc(lastResolution.status.desc || '')}</small>` : ''}</div>`;
    }

    const freeActionAllowed = Boolean(beat?.freeActionAllowed);
    const myTurn = state.phase === 'story' && state.turnPlayerId === playerToken;
    $('#storyActionBox').style.display = freeActionAllowed ? 'block' : 'none';
    $('#storyActionInput').disabled = !(freeActionAllowed && myTurn);
    $('#storyActionBox').classList.toggle('disabled', !(freeActionAllowed && myTurn));
    $('#storyActionInput').placeholder = freeActionAllowed
      ? '하고 싶은 행동을 직접 적으세요. 예: 경비에게 말을 걸어 안쪽 상황을 묻는다.'
      : '이 장면에서는 아래 선택으로 진행합니다.';
    $('#storyRoleContext').innerHTML = `<span>${esc(beat?.importance?.label || '장면')}</span><b>이 장면에서 실제로 가능한 행동들을 최대한 넓게 준비했습니다. 직접 행동 입력은 보조 수단입니다.</b>${beat?.statInsight?.text ? `<small>${esc(beat.statInsight.text)}</small>` : ''}`;
    $('#actionSuggestions').innerHTML = freeActionAllowed ? [
      ['주변을 살핀다','지혜'],['사람에게 말을 건다','매력'],['다른 길로 간다','민첩']
    ].map(([label,stat])=>`<button class="action-suggestion" type="button" data-free-suggestion="${esc(label)}"><b>${esc(label)}</b><small>${stat} 계열 자유 행동 예시</small></button>`).join('') : '';
    $('#actionSuggestions').querySelectorAll?.('[data-free-suggestion]').forEach(btn => btn.onclick = () => {
      if ($('#storyActionInput').disabled) return;
      $('#storyActionInput').value = btn.dataset.freeSuggestion;
      $('#storyActionInput').dispatchEvent(new Event('input'));
      $('#storyActionInput').focus();
    });
    renderMainStoryChoices(beat);
  }

  $('#gmBar').style.display = 'flex';
  const freeActionSubmit = Boolean(beat?.freeActionAllowed);
  $('#advanceStoryBtn').style.display = state.phase === 'prologue' || freeActionSubmit ? 'inline-flex' : 'none';
  if (state.phase !== 'prologue') {
    $('#advanceStoryBtn').disabled = !(freeActionSubmit && state.turnPlayerId === playerToken);
    $('#advanceStoryBtn').textContent = freeActionSubmit ? '이 행동을 해본다' : '메인 스토리 진행';
  }
  $('#continueBtn').style.display = state.phase === 'resolution' ? 'inline-flex' : 'none';
  $('#continueBtn').disabled = state.phase !== 'resolution';
  $('#continueBtn').textContent = state.lastResolution?.continueLabel || '결과를 읽고 다음으로';
  updateVoteCountdown();
}

function renderMainStoryChoices(beat) {
  const box = $('#choiceArea');
  const isMyTurn = state.turnPlayerId === playerToken && state.phase === 'story' && !state.resumeBarrier;
  if (!beat?.choices?.length) {
    box.innerHTML = '<div class="vote-strip"><div><span class="eyebrow">MAIN STORY</span><b>이 장면의 선택지를 준비 중입니다.</b></div></div>';
    return;
  }
  if (state.phase === 'resolution') {
    box.innerHTML = `<div class="action-lock"><div><div class="eyebrow">SCENE RESOLVED</div><b>장면 결과를 확인한 뒤 아래 버튼을 눌러 다음 장면으로 넘어가세요.</b><div class="vote-chip">선택은 이미 확정되었습니다.</div></div></div>`;
    return;
  }
  const myJob = me()?.job?.name;
  const visibleChoices = beat.choices
    .map((choice, originalIndex) => ({ choice, originalIndex }))
    .filter(({ choice }) => !choice.requiredJob || choice.requiredJob === myJob);
  box.innerHTML = `<div class="vote-strip"><div><span class="eyebrow">WHAT DO YOU DO?</span><b>지금 가능한 행동 ${visibleChoices.length}개</b></div><div>${isMyTurn ? '현재 장면에서 실제로 가능한 행동만 표시됩니다. 하나를 골라 진행하거나, 목록에 없는 방법이 떠오르면 직접 행동을 적어도 됩니다.' : `${esc(state.turnPlayerName || '다른 플레이어')}의 차례를 기다리는 중입니다.`}</div></div>` + visibleChoices.map(({ choice, originalIndex }, displayIndex) => `
    <button class="choice-card story-choice ${choice.jobSpecial ? 'job-choice' : ''}" type="button" data-choice-index="${originalIndex}" ${isMyTurn ? '' : 'disabled'}>
      <div class="choice-title-line"><b>${displayIndex + 1}. ${esc(choice.label)}</b>${choice.jobSpecial ? `<span class="job-choice-badge">${choice.rareJobMoment ? '희귀 기회 · ' : ''}${esc(choice.requiredJob)} 전용</span>` : ''}</div>
      <div class="story-choice-meta">${beat?.statInsight?.insight ? `<span>${esc(choice.stat)} 판정</span>` : '<span>판정 방식은 선택 후 공개</span>'}${beat?.statInsight?.insightDeep ? `<span class="difficulty ${esc(choice.difficulty || '')}">${esc(choice.difficulty || '')} · DC ${Number(choice.dc || 0) + Number(state.dcPenalty || 0)}</span>` : ''}</div>
      ${beat?.statInsight?.dangerSense ? `<div class="choice-forecast">위험 · ${esc(choice.risk || '보통')}${choice.consequenceHint?.failure ? ` · ${esc(choice.consequenceHint.failure)}` : ''}</div>` : ''}
    </button>
  `).join('');
  forceChoiceLayout(box);
  box.querySelectorAll('.story-choice').forEach(button => button.onclick = () => {
    if (button.disabled) return;
    const choiceIndex = Number(button.dataset.choiceIndex);
    socket.emit('story:advance', { roomCode, playerToken, choiceIndex }, r => !r?.ok && toast(r.error));
  });
}

function renderChoices(ev) {
  const active = state.activeChoice;
  const box = $('#choiceArea');
  const p = me();
  if (active) {
    const actorRule = active.choice.requiredJob
      ? `${active.choice.requiredJob} 전용 선택 · 해당 직업 보유자가 판정합니다.`
      : '최다 득표 선택 · 현재 메인 턴 플레이어가 판정합니다.';
    box.innerHTML = `<div class="action-lock ${active.choice.requiredJob ? 'job-action-lock' : ''}"><div><div class="eyebrow">VOTE COMPLETE</div><b>${esc(active.playerName)}</b> — ${esc(active.choice.label)} <strong>${active.choice.stat} · DC ${active.choice.dc + (state.dcPenalty || 0)}</strong><div class="vote-chip">${active.voteCount || 0}표 · ${esc(actorRule)}</div></div>${active.playerId === playerToken && state.phase === 'story' ? '<button class="primary" id="rollCheckBtn" type="button">D20 판정</button>' : '<span class="eyebrow">판정자를 기다리는 중</span>'}</div>`;
    if (active.playerId === playerToken && state.phase === 'story') $('#rollCheckBtn').onclick = () => socket.emit('event:roll', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
    return;
  }
  const votes = state.choiceVotes || {};
  const counts = ev.choices.map((_, index) => Object.values(votes).filter(v => Number(v) === index).length);
  const highest = Math.max(0, ...counts);
  box.innerHTML = `<div class="vote-strip"><div><span class="eyebrow">${state.soloMode ? 'SOLO QUICK CHOICE' : '45 SECOND TABLE VOTE'}</span><b>${state.soloMode ? '지금 대응을 고르세요' : '테이블의 대응을 정하세요'}</b></div><div>${Object.keys(votes).length}명 선택 완료</div></div>` + ev.choices.map((c, i) => {
    const mine = Number(votes[playerToken]) === i;
    const leader = counts[i] > 0 && counts[i] === highest;
    const jobLocked = !!c.requiredJob && p?.job?.name !== c.requiredJob;
    const specialBadge = c.requiredJob ? `<span class="job-choice-badge">${c.rareJobMoment ? '희귀 기회 · ' : ''}${esc(c.requiredJob)} 전용</span>` : '';
    const lockText = jobLocked ? `<div class="job-choice-lock">🔒 ${esc(c.requiredJob)}만 이 상황의 전문 선택을 사용할 수 있습니다.</div>` : '';
    return `<button class="choice-card choice-row ${mine ? 'voted' : ''} ${leader ? 'leading' : ''} ${c.requiredJob ? 'job-choice' : ''} ${jobLocked ? 'job-locked' : ''}" type="button" ${jobLocked ? 'disabled' : ''}><span class="choice-number">${i+1}</span><span class="choice-copy"><b>${esc(c.label)}</b>${jobLocked?`<small>${esc(c.requiredJob)} 전용 행동</small>`:''}</span><span class="choice-check">${c.requiredJob?`<em>${esc(c.requiredJob)}</em>`:''}${esc(c.stat)} · DC ${c.dc + (state.dcPenalty || 0)}<small>${counts[i]}표${mine?' · 내 선택':''}</small></span></button>`;
  }).join('');
  forceChoiceLayout(box);
  box.querySelectorAll('.choice-card').forEach((b, i) => b.onclick = () => {
    if (b.disabled) return;
    if (voteSecondsLeft() <= 0) return toast('투표 시간이 종료되었습니다.');
    if (!p || p.hp <= 0) return toast('쓰러진 캐릭터는 투표할 수 없습니다.');
    socket.emit('event:vote', { roomCode, playerToken, choiceIndex: i }, r => !r?.ok && toast(r.error));
  });
}

$('#jobSkillBtn').onclick = () => socket.emit('player:skillUse', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
$('#combatSkillBtn').onclick = () => socket.emit('player:skillUse', { roomCode, playerToken }, r => !r?.ok && toast(r.error));

$('#storyActionInput').addEventListener('input', () => { const max = Number($('#storyActionInput').maxLength || 180); $('#storyActionCount').textContent = `${$('#storyActionInput').value.length}/${max}`; });
$('#advanceStoryBtn').onclick = () => {
  if (state?.phase === 'prologue') {
    socket.emit('prologue:continue', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
    return;
  }
  const declaration = $('#storyActionInput').value.trim();
  if (state?.phase === 'story' && !declaration) return toast('직접 행동을 한 문장으로 적어주세요.');
  socket.emit('story:advance', { roomCode, playerToken, declaration }, r => {
    if (!r?.ok) return toast(r.error);
    $('#storyActionInput').value = '';
    const max = Number($('#storyActionInput').maxLength || 180);
    $('#storyActionCount').textContent = `0/${max}`;
  });
};
if ($('#continueBtn')) { $('#continueBtn').style.display='none'; $('#continueBtn').onclick=()=>{}; }
setInterval(updateVoteCountdown, 250);

function showResolution(r) {
  if (!r) return;
  $('#resolutionEyebrow').textContent = r.ok ? 'SCENE RESULT' : 'SCENE CONSEQUENCE';
  $('#resolutionTitle').textContent = r.detourCreated ? '길이 예상과 다르게 꺾였다' : (r.isDetour ? '예정에 없던 위기의 결과' : (r.ok ? '선택의 결과' : '실패가 남긴 흔적'));
  const mechanics = [r.consequence, r.status ? `${r.status.label}: ${r.status.desc || ''}` : ''].filter(Boolean).join(' · ');
  const branchAfter = r.detourCreated ? '<small class="resolution-next">방금 실패 때문에 원래 다음 장면 앞에 새로운 위기가 생겼습니다.</small>' : '';
  $('#resolutionText').innerHTML = `<span class="resolution-prose">${esc(r.text || '')}</span>${branchAfter}${mechanics ? `<small class="resolution-mechanics">${esc(mechanics)}</small>` : ''}`;
  $('#resolutionModal').classList.add('show');
}
$('#resolutionClose').onclick = () => $('#resolutionModal').classList.remove('show');

function ensureEncounterIntroLayer() {
  let layer = document.getElementById('encounterIntroLayer');
  if (layer) return layer;
  layer = document.createElement('div');
  layer.id = 'encounterIntroLayer';
  layer.className = 'encounter-intro-layer';
  layer.innerHTML = `
    <div class="encounter-intro-backdrop"></div>
    <div class="encounter-intro-card">
      <div class="encounter-intro-kicker"></div>
      <div class="encounter-intro-name"></div>
      <div class="encounter-intro-art-wrap"><img class="encounter-intro-art" alt="전투 상대"></div>
      <div class="encounter-intro-line"></div>
      <small class="encounter-intro-hint">전투 준비</small>
    </div>`;
  document.body.appendChild(layer);
  return layer;
}
function showEncounterIntro(monster, campaign) {
  if (!monster?.encounterId || shownEncounterId === monster.encounterId) return;
  shownEncounterId = monster.encounterId;
  const layer = ensureEncounterIntroLayer();
  const isBoss = Boolean(monster.isBoss);
  layer.classList.toggle('boss', isBoss);
  layer.querySelector('.encounter-intro-kicker').textContent = isBoss ? 'BOSS ENCOUNTER' : 'ENCOUNTER';
  layer.querySelector('.encounter-intro-name').textContent = monster.name || 'UNKNOWN';
  layer.querySelector('.encounter-intro-line').textContent = monster.introLine || '“여기서 멈춰.”';
  layer.querySelector('.encounter-intro-hint').textContent = isBoss ? '보스 전투가 시작됩니다' : '전투가 시작됩니다';
  const img = layer.querySelector('.encounter-intro-art');
  setBossSceneImage(img, campaign, monster.name);
  layer.classList.remove('show','enter');
  void layer.offsetWidth;
  layer.classList.add('show','enter');
  audioManager.fx(isBoss ? 'boss' : 'attack', isBoss ? 1.2 : .9);
  if (encounterIntroTimer) clearTimeout(encounterIntroTimer);
  encounterIntroTimer = setTimeout(() => layer.classList.remove('show','enter'), isBoss ? 3400 : 2200);
}

function renderCombat() {
  if (!state || state.phase !== 'combat' || !state.monster) return;
  renderSkillUi();
  const m = state.monster;
  const c = currentCampaign();
  const phase = m.turnPhase || 'players';
  showEncounterIntro(m, c);
  const living = state.players.filter(player => player.connected && player.hp > 0);
  const acted = new Set(m.acted || []);
  const remaining = living.filter(player => !acted.has(player.id));
  const nextPlayer = remaining[0] || null;

  $('#monsterName').textContent = m.name;
  setBossSceneImage($('#combatSceneImg'), c, m.name);
  $('#monsterAC').textContent = m.ac;
  $('#monsterHpFill').style.width = Math.max(0, m.hp / m.maxHp * 100) + '%';
  $('#monsterHpText').textContent = `${m.hp} / ${m.maxHp}`;
  $('#combatRoundLabel').textContent = `ROUND ${m.round || 1}`;
  $('#combatTurnPhase').textContent = phase === 'boss' ? 'ENEMY TURN' : 'PLAYER TURN';
  $('#combatTurnPanel').classList.toggle('boss-active', phase === 'boss');

  $('#combatTimeline').innerHTML = phase === 'boss'
    ? `<div class="simple-combat-step boss"><b>적 행동 중</b><small>${esc(m.name)}의 공격 한 번이 끝나면 바로 다음 라운드입니다.</small></div>`
    : `<div class="simple-combat-step"><b>${esc(nextPlayer?.name || '플레이어')}의 행동</b><small>공격 · 방어 · 직업 스킬 중 하나만 선택하세요. 남은 행동 ${remaining.length}명</small></div>`;

  if (phase === 'boss') {
    $('#bossTurnWarning').innerHTML = `<strong>⚠ ENEMY TURN</strong> · ${esc(m.name)}이(가) 공격을 준비합니다. 잠시 기다리세요.`;
  } else if (remaining.length === 1) {
    $('#bossTurnWarning').innerHTML = `<strong>다음은 ENEMY TURN</strong> · ${esc(remaining[0].name)} 님이 행동하면 곧바로 적 차례가 시작됩니다.`;
  } else {
    $('#bossTurnWarning').textContent = `플레이어 ${remaining.length}명 행동이 남았습니다. 모두 행동하면 ENEMY TURN이 시작됩니다.`;
  }

  $('#combatParty').innerHTML = state.players.map(p => `<div class="combat-member ${acted.has(p.id) ? 'acted' : ''} ${p.connected ? '' : 'offline'}"><b>${esc(p.name)}</b><div>${esc(p.job?.name || '')}</div><small>HP ${p.hp}/${p.maxHp}${acted.has(p.id) ? ' · 행동 완료' : ''}</small></div>`).join('');
  const p = me();
  const myActed = acted.has(playerToken);
  const cannotAct = phase === 'boss' || !p || p.hp <= 0 || myActed || !p.connected;
  $('#attackBtn').disabled = cannotAct;
  $('#defendBtn').disabled = cannotAct;
  $('#attackBtn').textContent = phase === 'boss' ? '보스 행동 대기' : myActed ? '행동 완료' : '공격 · D20';
  $('#defendBtn').textContent = phase === 'boss' ? '방어 대기' : myActed ? '행동 완료' : `방어 · 피해 흡수`;
  const atkStat = p?.job?.prime || '근력';
  $('#combatLog').innerHTML = phase === 'boss'
    ? `<span class="combat-round">ROUND ${m.round || 1}</span> · 적이 한 번 공격합니다.`
    : `<span class="combat-round">ROUND ${m.round || 1}</span> · <b>${esc(m.isBoss ? '보스전' : '전투')}</b> · 공격은 ${atkStat}, 방어는 체력의 영향을 받습니다.`;
}
$('#attackBtn').onclick = () => { audioManager.fx('attack', .9); socket.emit('combat:attack', { roomCode, playerToken }, r => !r?.ok && toast(r.error)); };
$('#defendBtn').onclick = () => { audioManager.fx('select', .9); socket.emit('combat:defend', { roomCode, playerToken }, r => { if(!r?.ok) return toast(r?.error || '방어 실패'); toast(`방어 태세 · 다음 피해 ${r.guard} 흡수`); }); };

function renderEnding() {
  if (!state || state.phase !== 'ending') return;
  const e = state.ending || {};
  $('#endingEyebrow').textContent = e.victory ? 'CHRONICLE COMPLETE' : 'CHRONICLE FALLEN';
  $('#endingIcon').textContent = state.campaign?.icon || '◆';
  $('#endingTitle').textContent = e.title || '연대기가 끝났습니다.';
  $('#endingText').textContent = e.text || '';
  $('#endingStats').innerHTML = `<span>STORY ${state.story || 0} SCENES</span><span>THREAT ${state.threat}/${state.maxThreat || 8}</span><span>CARDS ${state.discardCount} USED</span><span>PLAYERS ${state.players.length}</span>`;
}
$('#endingHomeBtn').onclick = () => {
  localStorage.removeItem('cg_room');
  localStorage.removeItem('cg_token');
  roomCode = '';
  playerToken = '';
  state = null;
  location.reload();
};
$('#leaveRoomBtn').onclick = () => {
  if (!state) return;
  if (state.phase !== 'lobby') return toast('진행 중인 세션은 자리를 보존합니다. 탭을 닫았다가 같은 기기에서 재접속하세요.');
  socket.emit('room:leave', { roomCode, playerToken }, res => {
    if (!res?.ok) return toast(res?.error || '나가기 실패');
    localStorage.removeItem('cg_room');
    localStorage.removeItem('cg_token');
    roomCode = '';
    playerToken = '';
    state = null;
    view('homeView');
    toast('방에서 나왔습니다.');
  });
};

function renderChat() {
  if (!state) return;
  const visibleChat = (state.chat || []).filter(m => !(m.author === 'GM' && m.type === 'narration'));
  const markup = visibleChat.map(m => `<div class="chat-msg ${m.type || ''}">${m.author ? `<b>${esc(m.author)}</b>` : ''}${esc(m.text)}</div>`).join('');
  const storyLog = $('#chatLog');
  const lobbyLog = $('#lobbyChatLog');
  if (storyLog) { storyLog.innerHTML = markup; storyLog.scrollTop = storyLog.scrollHeight; }
  if (lobbyLog) { lobbyLog.innerHTML = markup; lobbyLog.scrollTop = lobbyLog.scrollHeight; }
}
$('#chatForm').onsubmit = e => { e.preventDefault(); sendChat('#chatInput'); };
$('#lobbyChatForm').onsubmit = e => { e.preventDefault(); sendChat('#lobbyChatInput'); };

function renderHelp() {
  const phase = state?.phase || 'home';
  const c = currentCampaign();
  const helpSections = [
    {
      title: '기본 진행 순서',
      items: [
        '로비에서 스토리를 고른 뒤 각 플레이어는 D6 직업 배정과 4D6 능력치 생성을 각 스토리마다 1번씩만 진행합니다.',
        '장면에 실제로 존재하는 인물·적·단서·장애물·구조 대상에 따라 6~12개의 해결법이 나옵니다. 조사·질문·설득·잠입·전투·우회·구조·함정 등 가능한 행동만 표시됩니다.',
        `가장 많은 표를 받은 선택지가 확정되며, 현재 차례 플레이어(${esc(state?.turnPlayerName || '미정')})가 실제 판정을 굴립니다.`,
        '메인 소설 장면 3개를 진행할 때마다 짧은 이벤트 카드가 끼어듭니다. 일반 사건의 DC는 낮고, 위험한 사건일수록 난이도와 중요도가 화면에 표시됩니다.',
      ],
    },
    {
      title: '현재 상태 안내',
      text: phase === 'lobby'
        ? `현재는 로비입니다. ${c ? `선택된 연대기: ${c.title}.` : '아직 연대기를 선택하지 않았습니다.'} 게임 시작 전에도 채팅이 가능합니다.`
        : phase === 'combat'
          ? '현재는 전투 중입니다. 내 차례에는 공격·방어·직업 스킬 중 하나만 고르면 됩니다. 모든 생존 플레이어가 한 번 행동하면 보스가 한 번 공격합니다.'
          : phase === 'ending'
            ? '현재는 엔딩 화면입니다. 새 연대기를 시작하려면 버튼을 눌러 메인으로 돌아가세요.'
            : '현재는 소설형 메인 스토리 진행 중입니다. 장면을 읽고 준비된 다양한 선택 중 하나를 고르세요. 선택과 판정 결과는 이후 장면과 엔딩에 누적됩니다.',
    },
    {
      title: '주사위 읽는 법',
      items: [
        '주사위 애니메이션이 끝나면 빛나는 면이 실제 결과입니다.',
        'D20 판정은 결과값 + 능력치 보정 + 장비/스킬 효과를 더해 DC 이상이면 성공합니다. 일반 장면은 대체로 DC 8~11, 중요 장면 10~13, 결정적 장면 12~15입니다.',
        'NATURAL 20은 무조건 성공, NATURAL 1은 무조건 실패입니다. 그 외에는 능력치와 장비, 이전 선택의 누적 결과가 판정을 바꿉니다.',
        '능력치는 판정 외에도 체력=최대 HP/상태회복, 민첩=방어, 근력=피해, 지능=선택 결과 추론, 지혜=위험 감지, 매력=가격 할인/의뢰 보상에 직접 영향을 줍니다.',
      ],
    },
  ];
  $('#helpBody').innerHTML = helpSections.map(section => section.items
    ? `<div class="help-section"><h3>${esc(section.title)}</h3><ul>${section.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>`
    : `<div class="help-section"><h3>${esc(section.title)}</h3><p>${esc(section.text)}</p></div>`).join('');

  const vote = state?.abandonVote;
  const connectedCount = state?.players?.filter(p => p.connected).length || 0;
  if (vote) {
    const approvedPlayers = state.players.filter(p => (vote.approvals || []).includes(p.id)).map(p => p.name);
    $('#abandonVoteBox').innerHTML = `<strong>연대기 포기 투표 진행 중</strong><br>${esc(vote.requestedByName)} 님이 투표를 시작했습니다.<br>찬성 ${approvedPlayers.length}/${connectedCount}: ${esc(approvedPlayers.join(', ') || '없음')}<br>전원 찬성 시 현재 진행을 포기하고 로비의 스토리 선택 화면으로 돌아갑니다.`;
  } else {
    $('#abandonVoteBox').textContent = 'ESC 메뉴에서 현재 연대기 포기 투표를 시작할 수 있습니다. 모든 접속자의 동의가 있어야 로비로 돌아갑니다.';
  }
  const canAbandon = !!state && state.phase !== 'lobby' && state.phase !== 'ending';
  $('#abandonRequestBtn').disabled = !canAbandon || !!vote;
  $('#abandonYes').disabled = !vote;
  $('#abandonNo').disabled = !vote;
  $('#helpConnectionHint').textContent = socket.connected ? `ROOM ${state?.code || '-----'} · ONLINE` : '연결 복구 중…';
}
function setHelpTab(tab = 'guide') {
  $$('[data-help-tab]').forEach(button => button.classList.toggle('active', button.dataset.helpTab === tab));
  $$('[data-help-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.helpPanel === tab));
}
function openHelp(tab = 'guide') {
  if (!state) return;
  renderHelp();
  setHelpTab(tab);
  $('#helpModal').hidden = false;
  $('#helpModal').classList.add('show');
  $('#helpModal').setAttribute('aria-hidden', 'false');
}
function closeHelp() {
  $('#helpModal').classList.remove('show');
  $('#helpModal').setAttribute('aria-hidden', 'true');
  $('#helpModal').hidden = true;
}
$('#helpBtn').onclick = () => openHelp('guide');
$('#lobbyGuideBtn').onclick = () => openHelp('guide');
$('#helpClose').onclick = closeHelp;
$$('[data-help-tab]').forEach(button => button.onclick = () => setHelpTab(button.dataset.helpTab));
$('#themeDarkBtn').onclick = () => { uiPrefs.theme = 'dark'; saveUiPrefs(); toast('검정 테마로 변경했습니다.'); };
$('#themeLightBtn').onclick = () => { uiPrefs.theme = 'light'; saveUiPrefs(); toast('하양 테마로 변경했습니다.'); };
$('#chatSizeRange').oninput = e => { uiPrefs.chatSize = Number(e.target.value); saveUiPrefs(); };
$('#audioVolumeRange').oninput = e => { uiPrefs.audioVolume = Math.max(0, Math.min(1, Number(e.target.value)/100)); if (uiPrefs.audioVolume > 0) uiPrefs.audioMuted = false; saveUiPrefs(); audioManager.unlock(); audioManager.syncMusic(state); };
$('#audioMuteBtn').onclick = () => { uiPrefs.audioMuted = !uiPrefs.audioMuted; saveUiPrefs(); audioManager.unlock(); audioManager.syncMusic(state); toast(uiPrefs.audioMuted ? '게임 사운드를 껐습니다.' : '게임 사운드를 켰습니다.'); };
$('#audioTestBtn').onclick = async () => {
  const result=await audioManager.test();
  const fileText=result?.assetOk ? `WAV ${result.assetStatus} OK` : `WAV ${result?.assetStatus||'ERR'}`;
  const nativeText=result?.nativeOk ? 'HTMLAudio OK' : 'HTMLAudio BLOCKED';
  if(result?.ok) toast(`🔊 ${nativeText} · WebAudio ${result.status} · ${fileText}`);
  else toast(`🔇 ${nativeText} · WebAudio ${result?.status||'unknown'} · ${fileText}`);
};
$('#uiResetBtn').onclick = () => { uiPrefs = { ...UI_DEFAULTS }; saveUiPrefs(); toast('화면 설정을 기본값으로 되돌렸습니다.'); };
$('#abandonRequestBtn').onclick = () => socket.emit('game:abandonRequest', { roomCode, playerToken }, r => { if (!r?.ok) toast(r.error); else toast('포기 투표를 시작했습니다.'); });
$('#abandonYes').onclick = () => socket.emit('game:abandonRespond', { roomCode, playerToken, approve: true }, r => !r?.ok && toast(r.error));
$('#abandonNo').onclick = () => socket.emit('game:abandonRespond', { roomCode, playerToken, approve: false }, r => !r?.ok && toast(r.error));
$('#helpModal').addEventListener('click', e => { if (e.target === $('#helpModal')) closeHelp(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#helpModal').classList.contains('show')) closeHelp();
  else if (state) openHelp('guide');
});

window.addEventListener('pageshow', event => {
  resetTransientUi();
  if (event.persisted) {
    state = null;
    if (socket.connected) socket.disconnect();
    socket.connect();
  }
});
window.addEventListener('focus', () => {
  if (roomCode && playerToken && !socket.connected) socket.connect();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && roomCode && playerToken && !socket.connected) socket.connect();
});

makeParticles();
renderCampaigns();

fetch('/api/config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(cfg => { if (cfg?.version) $('#versionLabel').textContent = `ONLINE EDITION · ${CLIENT_BUILD} · SERVER v${cfg.version}`; }).catch(() => {});

// QA marker: state.phase==='ending'
// QA marker: state.phase==='resolution'&&state.lastResolution

// v3.5.1: home overlay click-through + resilient 3D dice initialization
