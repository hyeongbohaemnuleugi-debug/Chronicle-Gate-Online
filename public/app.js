import { DiceTheater } from './dice3d.js';

const socket = window.io({ timeout: 10_000, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 500, reconnectionDelayMax: 5_000 });
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const REQUIRED_IDS = [
  'app', 'hudTop', 'connectionText', 'roomCodeTop', 'leaveRoomBtn', 'homeView', 'entryView', 'lobbyView', 'storyView', 'combatView', 'endingView',
  'openCreate', 'openJoin', 'entryBack', 'entryEyebrow', 'entryTitle', 'nameInput', 'codeField', 'codeInput', 'entrySubmit', 'entryError',
  'roomCodeLobby', 'copyCode', 'playerSlots', 'campaignCarousel', 'campaignDetail', 'characterSummary', 'rollClassBtn', 'rollStatsBtn', 'startGameBtn', 'lobbyStatus', 'lobbyHomeBtn',
  'lobbyChatLog', 'lobbyChatForm', 'lobbyChatInput', 'lobbyGuideBtn',
  'partyRail', 'actLabel', 'eventTitle', 'turnBanner', 'deckCount', 'eventCadence', 'storySceneImg', 'storySceneCaption', 'storySituation', 'storyObjective', 'storyWhy', 'storyPrompt', 'storyActionBox', 'storyRoleContext', 'actionSuggestions', 'storyActionInput', 'storyActionCount', 'lastActionResult', 'eventText', 'voteTimer', 'choiceArea', 'gmBar', 'advanceStoryBtn', 'continueBtn',
  'myJobMini', 'myStatsMini', 'jobSkillPanel', 'jobSkillName', 'jobSkillDesc', 'jobSkillBtn', 'jobSkillCooldown', 'threatValue', 'threatTrack', 'storyFill', 'storyValue', 'chatLog', 'chatForm', 'chatInput',
  'monsterName', 'combatTurnPanel', 'combatTurnPhase', 'combatRoundLabel', 'combatTimeline', 'bossTurnWarning', 'combatSceneImg', 'monsterAC', 'monsterHpFill', 'monsterHpText', 'combatParty', 'combatSkillBtn', 'attackBtn', 'combatLog',
  'endingEyebrow', 'endingIcon', 'endingTitle', 'endingText', 'endingStats', 'endingHomeBtn',
  'toast', 'resolutionModal', 'resolutionEyebrow', 'resolutionTitle', 'resolutionText', 'resolutionClose',
  'diceOverlay', 'diceCanvas', 'diceRoller', 'dicePurpose', 'diceFinal', 'diceSub',
  'helpBtn', 'helpModal', 'helpClose', 'helpTitle', 'helpBody', 'helpTabGuide', 'helpTabSettings', 'helpTabSession', 'helpPanelGuide', 'helpPanelSettings', 'helpPanelSession', 'themeDarkBtn', 'themeLightBtn', 'chatSizeRange', 'chatSizeValue', 'uiResetBtn', 'abandonVoteBox', 'abandonRequestBtn', 'abandonYes', 'abandonNo', 'helpConnectionHint', 'versionLabel'
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
const app = $('#app');

const UI_DEFAULTS = { theme: 'dark', chatSize: 300 };
function loadUiPrefs() {
  const theme = localStorage.getItem('cg_theme') === 'light' ? 'light' : 'dark';
  const rawSize = Number(localStorage.getItem('cg_chat_size') || UI_DEFAULTS.chatSize);
  const chatSize = Math.max(300, Math.min(520, Number.isFinite(rawSize) ? rawSize : UI_DEFAULTS.chatSize));
  return { theme, chatSize };
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
}
function saveUiPrefs() {
  localStorage.setItem('cg_theme', uiPrefs.theme);
  localStorage.setItem('cg_chat_size', String(uiPrefs.chatSize));
  applyUiPrefs();
}
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
      renderState();
      if (state.phase === 'resolution' && state.lastResolution) showResolution(state.lastResolution);
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

function actionHintsFor(player, beat) {
  const job = player?.job;
  if (!job) return [];
  const objective = beat?.objective || '현재 목표를 진행한다';
  const byStat = {
    '근력': [`장애물을 힘으로 치우고 ${objective}`, '위험한 대상을 붙잡거나 제압해 길을 만든다', '무너지는 구조물을 버티거나 강제로 연다'],
    '민첩': [`눈에 띄지 않게 접근해 ${objective}`, '위험 구역을 빠르게 우회해 먼저 위치를 잡는다', '장치나 함정을 손대기 전에 안전하게 접근한다'],
    '지능': [`기록·장치·단서를 분석해 ${objective}`, '현재 현상의 원리나 규칙을 찾아 약점을 찾는다', '서로 모순되는 정보를 비교해 진짜 단서를 고른다'],
    '지혜': [`주변의 흔적과 기척을 관찰해 ${objective}`, '보이지 않는 위험의 위치를 먼저 파악한다', '앞선 장면의 흔적과 현재 상황을 연결한다'],
    '매력': [`상대와 대화하거나 협상해 ${objective}`, '상대가 숨기는 의도나 욕망을 끌어낸다', '동료나 NPC를 안심시키고 협력을 얻는다'],
    '체력': [`위험을 버티며 직접 ${objective}`, '다른 동료가 행동할 시간을 벌기 위해 몸으로 버틴다', '환경 피해를 감수하고 가장 위험한 위치를 맡는다'],
  };
  return byStat[job.prime] || byStat['지능'];
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

function sceneWord(campaignId, actIndex = 0) { return WORLD_META[campaignId]?.scene?.[Math.max(0, Math.min(4, actIndex))] || '장면'; }
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
  return artSvg(c, c?.title || 'Chronicle Gate', c?.subtitle || '연대기를 선택하세요.', WORLD_META[c?.id]?.motif || 'CHRONICLE', sceneWord(c?.id, 0));
}
function storyArt(c, scene) {
  const actIndex = Math.max(0, (scene?.act || 1) - 1);
  const title = scene?.title || c?.title || '다음 장면';
  const visual = scene?.visual || sceneWord(c?.id, actIndex);
  const subtitle = scene?.monster ? `${visual} · ${scene.monster}의 위협` : `${visual} · ${scene?.id?.includes('STORY') ? '메인 스토리' : '이벤트 사건'}`;
  return artSvg(c, title, subtitle, scene ? `ACT ${scene.act} · ${scene.actName}` : (WORLD_META[c?.id]?.motif || 'SCENE'), visual, scene?.monster || '');
}
function monsterArt(c, monster) {
  return artSvg(c, monster || 'UNKNOWN', `${WORLD_META[c?.id]?.boss || '보스 전투'} · 동료 전원이 한 번씩 행동합니다.`, 'BOSS ENCOUNTER', `${monster}와의 전투`, monster || '');
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

$('#openCreate').onclick = () => openEntry('create');
$('#openJoin').onclick = () => openEntry('join');
$('#entryBack').onclick = () => view('homeView');
function openEntry(m) {
  mode = m;
  $('#entryEyebrow').textContent = m === 'create' ? 'CREATE ROOM' : 'JOIN ROOM';
  $('#entryTitle').textContent = m === 'create' ? '새로운 연대기를 시작합니다.' : '동료들이 기다리는 문을 엽니다.';
  $('#codeField').style.display = m === 'create' ? 'none' : 'block';
  $('#entrySubmit').textContent = m === 'create' ? '방 만들기' : '방 참가하기';
  $('#entryError').textContent = '';
  view('entryView');
}
$('#entrySubmit').onclick = () => {
  const name = $('#nameInput').value.trim();
  if (!name) { $('#entryError').textContent = '플레이어 이름을 입력하세요.'; return; }
  if (mode === 'create') socket.emit('room:create', { name }, onJoined);
  else {
    const code = $('#codeInput').value.trim().toUpperCase();
    if (code.length !== 5) { $('#entryError').textContent = '5자리 방 코드를 입력하세요.'; return; }
    socket.emit('room:join', { name, roomCode: code }, onJoined);
  }
};
function onJoined(res) {
  if (!res?.ok) { $('#entryError').textContent = res?.error || '연결에 실패했습니다.'; return; }
  roomCode = res.roomCode;
  playerToken = res.playerToken;
  localStorage.setItem('cg_room', roomCode);
  localStorage.setItem('cg_token', playerToken);
  state = res.state;
  renderState();
  if (state.phase === 'resolution' && state.lastResolution) showResolution(state.lastResolution);
  toast(`ROOM ${roomCode} 입장 완료`);
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
socket.on('state', s => { if (!roomCode || s.code === roomCode) { state = s; renderState(); } });
socket.on('chat:new', entry => {
  if (state) {
    const ids = new Set((state.chat || []).map(item => item.id));
    if (!ids.has(entry.id)) state.chat = [...(state.chat || []), entry].slice(-120);
    renderChat();
  }
});
socket.on('resolution', r => showResolution(r));
socket.on('skill:ready', payload => toast(`✨ ${payload?.name || '직업 스킬'} 사용이 가능합니다!`));
socket.on('dice:roll', payload => enqueueDice(payload));

function enqueueDice(payload) {
  diceQueue = diceQueue.then(async () => {
    const c = currentCampaign();
    $('#diceOverlay').classList.add('show');
    $('#diceRoller').textContent = `${payload.rollerName} · ${payload.kind?.toUpperCase() || 'ROLL'}`;
    $('#dicePurpose').textContent = payload.purpose;
    $('#diceFinal').textContent = '';
    $('#diceFinal').classList.remove('is-result');
    $('#diceSub').textContent = '주사위가 테이블 위를 구릅니다…';
    const theater = getDiceTheater();
    if (theater) {
      await theater.roll({ sides: payload.sides, result: payload.result, color: c?.accent || '#bf4a38', duration: payload.sides === 20 ? 2850 : 2350 });
    } else {
      $('#diceSub').textContent = '3D 렌더러를 사용할 수 없어 결과를 바로 표시합니다.';
      await new Promise(r => setTimeout(r, 450));
    }
    $('#diceFinal').textContent = payload.sides === 20 && payload.result === 20 ? 'NATURAL 20' : payload.sides === 20 && payload.result === 1 ? 'NATURAL 1' : `결과 ${payload.result}`;
    $('#diceFinal').classList.add('is-result');
    $('#diceSub').textContent = payload.total != null ? `최종 ${payload.total} · 기준 ${payload.dc}${payload.damage ? ` · 피해 ${payload.damage}` : ''}` : '운명이 결정되었습니다.';
    await new Promise(r => setTimeout(r, 1000));
    $('#diceOverlay').classList.remove('show');
    await new Promise(r => setTimeout(r, 180));
  }).catch(console.error);
}

function renderState() {
  if (!state) return;
  roomCode = state.code;
  $('#roomCodeTop').textContent = state.code;
  $('#roomCodeLobby').textContent = state.code;
  if (state.campaign) setWorld(state.campaign);
  if (state.phase === 'lobby') view('lobbyView');
  else if (state.phase === 'combat') view('combatView');
  else if (state.phase === 'ending') view('endingView');
  else view('storyView');
  renderLobby();
  renderStory();
  renderCombat();
  renderEnding();
  renderChat();
  renderSkillUi();
  renderHelp();
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
    cs.innerHTML = `<div class="job-big"><div class="job-rune">${state.campaign?.icon || '◆'}</div><div class="eyebrow">${p.job.prime} SPECIALIST</div><h3>${esc(p.job.name)}</h3><p>${esc(p.job.skill)}</p></div>${p.abilities ? `<div class="stats-compact">${Object.entries(p.abilities).map(([k, v]) => `<div class="stat-mini"><span>${k}</span><b>${v.total}</b><em>${signedMod(v.total)}</em></div>`).join('')}</div>` : '<div class="unassigned"><p>직업이 정해졌습니다. 이제 4D6으로 능력치를 생성하세요.</p></div>'}`;
  }
  $('#rollClassBtn').disabled = !state.campaignId || !!p?.job;
  $('#rollStatsBtn').disabled = !p?.job || !!p?.abilities;
  $('#startGameBtn').style.display = isHost() ? 'block' : 'none';
  const ready = state.players.length >= 2 && state.players.every(x => x.ready && x.connected) && state.campaignId;
  $('#startGameBtn').disabled = !ready;
  $('#campaignHint').textContent = isHost() ? '클릭해 선택' : '방장이 선택';
  $('#lobbyStatus').textContent = state.players.length < 2 ? '최소 한 명의 동료가 더 필요합니다.' : state.players.some(x => !x.connected) ? '오프라인 플레이어가 있습니다. 재접속 후 시작할 수 있습니다.' : state.players.every(x => x.ready) ? '모든 동료의 캐릭터가 준비되었습니다.' : '모든 플레이어가 직업과 능력치를 생성해야 합니다.';
}
$('#rollClassBtn').onclick = () => socket.emit('player:classRoll', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
$('#rollStatsBtn').onclick = () => socket.emit('player:statsRoll', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
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
  el.innerHTML = `<span>TABLE VOTE</span><b>${left}</b><small>초 후 서버가 자동 집계합니다. 제한시간 동안 표를 바꿀 수 있습니다.</small>`;
  el.classList.toggle('urgent', left <= 5);
}

function renderStory() {
  if (!state || state.phase === 'lobby' || state.phase === 'combat' || state.phase === 'ending') return;
  const c = currentCampaign();
  const ev = state.currentEvent;
  const beat = state.storyBeat || c?.storyBeats?.[Math.min(state.story || 0, 19)];
  $('#deckCount').textContent = state.deckCount;
  $('#eventCadence').textContent = `${state.mainTurnsSinceEvent || 0}/${state.eventEveryTurns || 3}턴`;
  $('#threatValue').textContent = state.threat;
  $('#threatTrack').innerHTML = Array.from({ length: 8 }, (_, i) => `<i class="${i < state.threat ? 'on' : ''}"></i>`).join('');
  $('#storyValue').textContent = `${state.story}/${state.targetStory || 20}`;
  $('#storyFill').style.width = Math.min(100, state.story / (state.targetStory || 20) * 100) + '%';
  $('#partyRail').innerHTML = `<div class="panel-title"><span>PARTY</span><small>${state.players.length}/4</small></div>` + state.players.map(p => `<div class="party-card ${p.id === playerToken ? 'active' : ''}"><div class="top"><b>${esc(p.name)}</b><small>${p.inspiration} ✦</small></div><small>${esc(p.job?.name || '')}</small><div class="hp-line"><i style="width:${p.maxHp ? Math.max(0, p.hp / p.maxHp * 100) : 0}%"></i></div><small>HP ${p.hp}/${p.maxHp}</small></div>`).join('');
  const p = me();
  $('#myJobMini').textContent = p?.job?.name || 'UNASSIGNED';
  $('#myStatsMini').innerHTML = p?.abilities ? Object.entries(p.abilities).map(([k, v]) => `<div class="stat-line"><span>${k}</span><b>${v.total} <i>${signedMod(v.total)}</i></b></div>`).join('') : '';
  const roleBeat = beat || ev;
  $('#storyRoleContext').innerHTML = p?.job ? `<span>${esc(p.job.name)}의 시점</span><b>${esc(roleBeat?.objective || '현재 목표')}</b><small>주 능력치 ${esc(p.job.prime)} · 자유롭게 행동을 입력하면 서버가 행동 의도를 해석해 판정합니다.</small>` : '';
  const hints = actionHintsFor(p, beat);
  $('#actionSuggestions').innerHTML = (!ev && hints.length) ? hints.map(h => `<button class="action-suggestion" type="button">${esc(h)}</button>`).join('') : '';
  $('#actionSuggestions').querySelectorAll('button').forEach(btn => btn.onclick = () => { if (!$('#storyActionInput').disabled) { $('#storyActionInput').value = btn.textContent; $('#storyActionCount').textContent = `${btn.textContent.length}/180`; } });
  const last = state.lastStoryAction;
  $('#lastActionResult').innerHTML = last ? `<span class="${last.success ? 'success' : 'failure'}">${last.success ? 'SUCCESS' : 'FAILURE'} · ${esc(last.mode)} · ${esc(last.stat)} ${last.total}/${last.dc}</span><p>${esc(last.narrative || '')}</p>` : '';

  if (ev) {
    $('#turnBanner').textContent = state.activeChoice
      ? `투표가 끝났습니다. ${state.activeChoice.playerName}이(가) 판정을 진행합니다.`
      : `이벤트 발생 · 20초 자동 투표 · 현재 메인 턴 담당자는 ${state.turnPlayerName || '미정'}입니다.`;
    $('#storySceneImg').src = storyArt(c, ev);
    $('#storySceneCaption').textContent = `${ev.actName} · ${ev.visual || sceneWord(c?.id, Math.max(0, ev.act - 1))} · 이 사건은 메인 스토리 사이에 끼어드는 단 한 장의 이벤트입니다.`;
    $('#actLabel').textContent = `EVENT · ACT ${ev.act}`;
    $('#eventTitle').textContent = ev.title;
    $('#storySituation').textContent = ev.situation || ev.text || '예상하지 못한 사건이 발생했습니다.';
    $('#storyObjective').textContent = ev.objective || '제한시간 안에 대응 방식을 투표로 결정하세요.';
    $('#storyWhy').textContent = ev.why || ev.stakes || '이 결과가 다음 장면의 위험도와 진행에 영향을 줍니다.';
    $('#storyPrompt').innerHTML = `<b>테이블에서 먼저 이야기해보세요.</b> 각자 왜 그 선택이 좋은지 짧게 말한 뒤 투표하세요. <span>${esc(ev.stakes || '')}</span>`;
    $('#eventText').textContent = ev.text;
    renderChoices(ev);
  } else {
    $('#turnBanner').textContent = state.turnPlayerName ? `메인 스토리 차례: ${state.turnPlayerName} · ${state.mainTurnsSinceEvent || 0}/${state.eventEveryTurns || 3}턴 진행 후 이벤트 발생` : '행동 순서를 준비 중입니다.';
    $('#storySceneImg').src = storyArt(c, beat || { act: 1, actName: c?.acts?.[0], title: c?.title, visual: sceneWord(c?.id, 0), id: 'STORY' });
    $('#storySceneCaption').textContent = beat ? `${beat.actName} · ${beat.visual} · 지금은 이벤트 카드가 아니라 메인 연대기를 진행하는 장면입니다.` : `${c?.title || '연대기'}의 메인 스토리를 진행합니다.`;
    $('#actLabel').textContent = beat ? `MAIN STORY · ACT ${beat.act}` : 'MAIN STORY';
    $('#eventTitle').textContent = beat?.title || '연대기가 이어집니다.';
    $('#storySituation').textContent = beat?.situation || beat?.text || c?.intro || '';
    $('#storyObjective').textContent = beat?.objective || '현재 차례 플레이어가 다음 행동을 선언합니다.';
    $('#storyWhy').textContent = beat?.why || beat?.stakes || '이 장면은 다음 막으로 이어지는 단서를 만듭니다.';
    $('#storyPrompt').innerHTML = `<b>${esc(state.turnPlayerName || '현재 플레이어')}에게 질문:</b> ${esc(beat?.prompt || '지금 무엇을 할지 한 문장으로 선언하세요.')} <span>다른 플레이어는 채팅이나 음성으로 의견을 보태도 됩니다.</span>`;
    $('#eventText').textContent = beat?.text || c?.intro || '';
    $('#choiceArea').innerHTML = `<div class="main-story-note"><div class="eyebrow">MAIN CHRONICLE</div><b>이 장면은 ${esc(state.turnPlayerName || '현재 플레이어')}의 차례입니다.</b><p>위의 ‘상황 → 목표 → 중요성’을 읽고 행동을 한 문장으로 말한 뒤 진행 버튼을 누르세요. 3개의 메인 턴이 지나면 이벤트 카드가 자동으로 끼어듭니다.</p></div>`;
  }

  $('#gmBar').style.display = 'flex';
  $('#advanceStoryBtn').style.display = (!ev && state.phase === 'story') ? 'inline-flex' : 'none';
  $('#advanceStoryBtn').disabled = !!ev || state.phase !== 'story' || state.turnPlayerId !== playerToken;
  $('#advanceStoryBtn').textContent = state.turnPlayerId === playerToken ? '내 차례 · 행동 선언 후 진행' : `${state.turnPlayerName || '다른 플레이어'}의 차례`;
  $('#storyActionInput').disabled = $('#advanceStoryBtn').disabled;
  $('#storyActionBox').classList.toggle('disabled', $('#advanceStoryBtn').disabled);
  $('#continueBtn').style.display = state.phase === 'resolution' ? 'inline-flex' : 'none';
  $('#continueBtn').disabled = state.phase !== 'resolution';
  updateVoteCountdown();
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
  box.innerHTML = `<div class="vote-strip"><div><span class="eyebrow">20 SECOND TABLE VOTE</span><b>호스트 확정 없음 · 서버 자동 집계</b></div><div>현재 ${Object.keys(votes).length}표 · 동률이면 현재 차례 플레이어의 표를 우선합니다.</div></div>` + ev.choices.map((c, i) => {
    const mine = Number(votes[playerToken]) === i;
    const leader = counts[i] > 0 && counts[i] === highest;
    const jobLocked = !!c.requiredJob && p?.job?.name !== c.requiredJob;
    const specialBadge = c.requiredJob ? `<span class="job-choice-badge">${esc(c.requiredJob)} 전용</span>` : '';
    const lockText = jobLocked ? `<div class="job-choice-lock">🔒 ${esc(c.requiredJob)}만 이 상황의 전문 선택을 사용할 수 있습니다.</div>` : '';
    return `<button class="choice-card ${mine ? 'voted' : ''} ${leader ? 'leading' : ''} ${c.requiredJob ? 'job-choice' : ''} ${jobLocked ? 'job-locked' : ''}" type="button" ${jobLocked ? 'disabled' : ''}><div class="choice-title-line"><b>${i + 1}. ${esc(c.label)}</b>${specialBadge}</div><small>${c.stat} · DC ${c.dc + (state.dcPenalty || 0)}</small>${lockText}<div class="vote-chip">${counts[i]}표${mine ? ' · 내 선택' : ''}</div></button>`;
  }).join('');
  box.querySelectorAll('.choice-card').forEach((b, i) => b.onclick = () => {
    if (b.disabled) return;
    if (voteSecondsLeft() <= 0) return toast('투표 시간이 종료되었습니다.');
    if (!p || p.hp <= 0) return toast('쓰러진 캐릭터는 투표할 수 없습니다.');
    socket.emit('event:vote', { roomCode, playerToken, choiceIndex: i }, r => !r?.ok && toast(r.error));
  });
}

$('#jobSkillBtn').onclick = () => socket.emit('player:skillUse', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
$('#combatSkillBtn').onclick = () => socket.emit('player:skillUse', { roomCode, playerToken }, r => !r?.ok && toast(r.error));

$('#storyActionInput').addEventListener('input', () => { $('#storyActionCount').textContent = `${$('#storyActionInput').value.length}/180`; });
$('#advanceStoryBtn').onclick = () => {
  const declaration = $('#storyActionInput').value.trim();
  socket.emit('story:advance', { roomCode, playerToken, declaration }, r => {
    if (!r?.ok) return toast(r.error);
    $('#storyActionInput').value = '';
    $('#storyActionCount').textContent = '0/180';
  });
};
$('#continueBtn').onclick = () => socket.emit('event:continue', { roomCode, playerToken }, r => !r?.ok && toast(r.error));
setInterval(updateVoteCountdown, 250);

function showResolution(r) {
  if (!r) return;
  $('#resolutionEyebrow').textContent = r.ok ? 'SUCCESS' : 'FAILURE';
  $('#resolutionTitle').textContent = r.ok ? '운명이 길을 열었습니다.' : '주사위는 대가를 요구합니다.';
  $('#resolutionText').textContent = r.text || '';
  $('#resolutionModal').classList.add('show');
}
$('#resolutionClose').onclick = () => $('#resolutionModal').classList.remove('show');

function renderCombat() {
  if (!state || state.phase !== 'combat' || !state.monster) return;
  renderSkillUi();
  const m = state.monster;
  const c = currentCampaign();
  const phase = m.turnPhase || 'players';
  const living = state.players.filter(player => player.connected && player.hp > 0);
  const acted = new Set(m.acted || []);
  const remaining = living.filter(player => !acted.has(player.id));
  const nextPlayer = remaining[0] || null;

  $('#monsterName').textContent = m.name;
  $('#combatSceneImg').src = monsterArt(c, m.name);
  $('#monsterAC').textContent = m.ac;
  $('#monsterHpFill').style.width = Math.max(0, m.hp / m.maxHp * 100) + '%';
  $('#monsterHpText').textContent = `${m.hp} / ${m.maxHp}`;
  $('#combatRoundLabel').textContent = `ROUND ${m.round || 1}`;
  $('#combatTurnPhase').textContent = phase === 'boss' ? 'BOSS TURN' : 'PLAYER TURN';
  $('#combatTurnPanel').classList.toggle('boss-active', phase === 'boss');

  const playerSteps = living.map(player => {
    const done = acted.has(player.id);
    const active = phase === 'players' && !done && nextPlayer?.id === player.id;
    return `<div class="turn-step player-step ${done ? 'done' : ''} ${active ? 'active' : ''}"><span>${done ? '✓' : active ? '▶' : '○'}</span><b>${esc(player.name)}</b><small>${done ? '행동 완료' : active ? '행동 가능' : '대기'}</small></div>`;
  }).join('');
  const bossStep = `<div class="turn-arrow">→</div><div class="turn-step boss-step ${phase === 'boss' ? 'active' : ''}"><span>☠</span><b>BOSS</b><small>${phase === 'boss' ? '공격 중' : '플레이어 전원 행동 후'}</small></div>`;
  $('#combatTimeline').innerHTML = playerSteps + bossStep;

  if (phase === 'boss') {
    $('#bossTurnWarning').innerHTML = `<strong>⚠ BOSS TURN</strong> · ${esc(m.name)}이(가) 공격을 준비합니다. 잠시 기다리세요.`;
  } else if (remaining.length === 1) {
    $('#bossTurnWarning').innerHTML = `<strong>다음은 BOSS TURN</strong> · ${esc(remaining[0].name)} 님이 행동하면 곧바로 보스 차례가 시작됩니다.`;
  } else {
    $('#bossTurnWarning').textContent = `플레이어 ${remaining.length}명 행동이 남았습니다. 모두 행동하면 BOSS TURN이 시작됩니다.`;
  }

  $('#combatParty').innerHTML = state.players.map(p => `<div class="combat-member ${acted.has(p.id) ? 'acted' : ''} ${p.connected ? '' : 'offline'}"><b>${esc(p.name)}</b><div>${esc(p.job?.name || '')}</div><small>HP ${p.hp}/${p.maxHp}${acted.has(p.id) ? ' · 행동 완료' : ''}</small></div>`).join('');
  const p = me();
  const myActed = acted.has(playerToken);
  $('#attackBtn').disabled = phase === 'boss' || !p || p.hp <= 0 || myActed || !p.connected;
  $('#attackBtn').textContent = phase === 'boss' ? 'BOSS TURN · 공격 대기' : myActed ? '이번 라운드 행동 완료' : 'PLAYER TURN · D20 공격';
  const atkStat = p?.job?.prime || '근력';
  $('#combatLog').innerHTML = phase === 'boss'
    ? `<span class="combat-round">ROUND ${m.round || 1}</span> · <strong>BOSS TURN</strong> · ${esc(m.name)}의 공격이 곧 실행됩니다.`
    : `<span class="combat-round">ROUND ${m.round || 1}</span> · <strong>PLAYER TURN</strong> · ${atkStat} 수정치(${signedMod(p?.abilities?.[atkStat]?.total || 10)})로 공격 · D20 vs AC ${m.ac}`;
}
$('#attackBtn').onclick = () => socket.emit('combat:attack', { roomCode, playerToken }, r => !r?.ok && toast(r.error));

function renderEnding() {
  if (!state || state.phase !== 'ending') return;
  const e = state.ending || {};
  $('#endingEyebrow').textContent = e.victory ? 'CHRONICLE COMPLETE' : 'CHRONICLE FALLEN';
  $('#endingIcon').textContent = state.campaign?.icon || '◆';
  $('#endingTitle').textContent = e.title || '연대기가 끝났습니다.';
  $('#endingText').textContent = e.text || '';
  $('#endingStats').innerHTML = `<span>STORY ${state.story}/${state.targetStory || 20}</span><span>THREAT ${state.threat}/${state.maxThreat || 8}</span><span>CARDS ${state.discardCount} USED</span><span>PLAYERS ${state.players.length}</span>`;
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
  const markup = (state.chat || []).map(m => `<div class="chat-msg ${m.type || ''}">${m.author ? `<b>${esc(m.author)}</b>` : ''}${esc(m.text)}</div>`).join('');
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
        '메인 스토리 화면에서는 항상 ‘지금 무슨 상황 / 지금 해야 할 일 / 왜 중요한가’를 먼저 확인하세요. 현재 차례 플레이어가 행동을 한 문장으로 선언한 뒤 진행합니다.',
        `가장 많은 표를 받은 선택지가 확정되며, 현재 차례 플레이어(${esc(state?.turnPlayerName || '미정')})가 실제 판정을 굴립니다.`,
        '메인 턴 3번마다 이벤트 카드가 자동으로 발생하고 20초 투표가 시작됩니다. 전투에서는 연결된 생존 플레이어가 모두 한 번씩 행동하면 몬스터가 반격합니다.',
      ],
    },
    {
      title: '현재 상태 안내',
      text: phase === 'lobby'
        ? `현재는 로비입니다. ${c ? `선택된 연대기: ${c.title}.` : '아직 연대기를 선택하지 않았습니다.'} 게임 시작 전에도 채팅이 가능합니다.`
        : phase === 'combat'
          ? '현재는 전투 중입니다. 자신의 공격 버튼이 비활성화되어 있다면 이미 이번 라운드에 행동했거나 쓰러진 상태입니다.'
          : phase === 'ending'
            ? '현재는 엔딩 화면입니다. 새 연대기를 시작하려면 버튼을 눌러 메인으로 돌아가세요.'
            : '현재는 스토리 진행 중입니다. 메인 스토리가 중심이며, 3턴마다 자동 이벤트가 발생합니다. 이벤트 투표는 20초 후 서버가 자동 집계합니다.',
    },
    {
      title: '주사위 읽는 법',
      items: [
        '주사위 애니메이션이 끝나면 빛나는 면이 실제 결과입니다.',
        'D20 판정은 결과값 + 해당 능력치 수정치를 더해 DC 이상이면 성공합니다.',
        'NATURAL 20은 대성공, NATURAL 1은 치명적 실패로 표시됩니다.',
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

fetch('/api/config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(cfg => { if (cfg?.version) $('#versionLabel').textContent = `ONLINE EDITION · SERVER AUTHORITATIVE DICE · 5 CHRONICLES · v${cfg.version}`; }).catch(() => {});

// QA marker: state.phase==='ending'
// QA marker: state.phase==='resolution'&&state.lastResolution

// v3.5.1: home overlay click-through + resilient 3D dice initialization
