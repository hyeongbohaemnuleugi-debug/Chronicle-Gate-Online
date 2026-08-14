import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { CAMPAIGNS, STAT_NAMES, ITEMS_BY_CAMPAIGN, ECONOMY_FACILITY_TEMPLATES, ECONOMY_FACILITY_THEMES } from './campaign-data.js';
import {
  appendSessionEvent,
  loadRoomSnapshot,
  persistenceEnabled,
  roomSnapshotExists,
  scheduleRoomSave,
  flushRoomSave,
  findResumableRoomSnapshotsByName,
} from './persistence.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  serveClient: true,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 100_000,
});
const PORT = Number(process.env.PORT || 3000);
const APP_VERSION = '7.2.2-complete-replacement';
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 1;
const TARGET_STORY = 30;
const MAX_THREAT = 8;
const EVENT_EVERY_TURNS = 3;
const VOTE_DURATION_MS = 45_000;
const SOLO_VOTE_DURATION_MS = 12_000;
const ALL_VOTED_COUNTDOWN_MS = 3_000;
const ROOM_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

const rooms = new Map();
const loadLocks = new Map();
const voteTimers = new Map();
const bossTurnTimers = new Map();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Chronicle-Version', APP_VERSION);
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});
app.use(express.static('public', {
  maxAge: 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.(?:html|js|css|svg)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));
app.use('/vendor', express.static('node_modules/three/build', { maxAge: '7d', immutable: true }));
app.get('/health', (_req, res) => res.json({
  ok: true,
  version: APP_VERSION,
  rooms: rooms.size,
  persistence: persistenceEnabled ? 'supabase' : 'memory',
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.floor(process.uptime()),
  release: 'release-candidate',
}));
app.get('/api/config', (_req, res) => res.json({
  version: APP_VERSION,
  persistence: persistenceEnabled,
  maxPlayers: MAX_PLAYERS,
  minPlayers: MIN_PLAYERS,
  targetStory: TARGET_STORY,
  maxThreat: MAX_THREAT,
  eventEveryTurns: EVENT_EVERY_TURNS,
  voteDurationMs: VOTE_DURATION_MS,
  soloVoteDurationMs: SOLO_VOTE_DURATION_MS,
  allVotedCountdownMs: ALL_VOTED_COUNTDOWN_MS,
}));

const rand = sides => crypto.randomInt(1, sides + 1);
const token = () => crypto.randomBytes(16).toString('hex');
const mod = value => Math.floor((Number(value || 10) - 10) / 2);
const statPath = stat => ({ '지능':'careful', '지혜':'careful', '근력':'bold', '민첩':'bold', '매력':'empathetic', '체력':'empathetic' }[stat] || 'careful');
const roll4d6 = () => {
  const rolls = [rand(6), rand(6), rand(6), rand(6)].sort((a, b) => a - b);
  return { rolls, total: rolls[1] + rolls[2] + rolls[3] };
};
const sanitize = (value, max = 30) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  for (let i = 0; i < 5; i += 1) output += alphabet[crypto.randomInt(0, alphabet.length)];
  return output;
}

async function reserveRoomCode() {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const candidate = randomRoomCode();
    if (rooms.has(candidate)) continue;
    return candidate;
  }
  throw new Error('고유한 방 코드를 생성하지 못했습니다.');
}

function campaignPublic() {
  return CAMPAIGNS.map(({ events, titles, storyBeats, ...campaign }) => ({
    ...campaign,
    eventCount: events.length,
    storyBeatCount: storyBeats.length,
  }));
}

function blankPlayerRuntime(player) {
  player.ready = false;
  player.job = null;
  player.abilities = null;
  player.hp = 0;
  player.maxHp = 0;
  player.inspiration = 0;
  player.statuses = [];
  player.skillState = { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
  player.coins = 1;
  player.inventory = [];
  player.equipment = { weapon: null, armor: null, charm: null, tool: null };
}

function normalizeEconomyPlayer(player) {
  player.coins = Math.max(0, Number(player.coins ?? 1));
  player.inventory = Array.isArray(player.inventory) ? [...new Set(player.inventory.filter(Boolean))] : [];
  player.equipment ||= { weapon: null, armor: null, charm: null, tool: null };
  for (const slot of ['weapon','armor','charm','tool']) if (!(slot in player.equipment)) player.equipment[slot] = null;
}

function campaignItemCatalog(campaignId) {
  return ITEMS_BY_CAMPAIGN[campaignId] || [];
}
function findCampaignItem(campaignId, itemId) {
  return campaignItemCatalog(campaignId).find(item => item.id === itemId) || null;
}
function equippedItems(room, player) {
  return Object.values(player.equipment || {}).map(id => findCampaignItem(room.campaignId, id)).filter(Boolean);
}
function equipmentStatBonus(room, player, stat) {
  // Gear bonuses now increase the D20 modifier directly instead of changing the raw ability score.
  return equippedItems(room, player).filter(item => item.stat === stat).reduce((sum, item) => sum + Number(item.bonus || 0), 0);
}
function effectiveAbilityTotal(_room, player, stat) {
  return Number(player.abilities?.[stat]?.total || 10);
}
function effectiveAbilityMod(room, player, stat) {
  return mod(effectiveAbilityTotal(room, player, stat)) + equipmentStatBonus(room, player, stat);
}
function grantCoins(player, amount) {
  const value = Math.max(0, Number(amount || 0));
  player.coins = Math.max(0, Number(player.coins || 0) + value);
  return value;
}
function spendCoins(player, amount) {
  const value = Math.max(0, Number(amount || 0));
  if (Number(player.coins || 0) < value) return false;
  player.coins -= value;
  return true;
}
function grantItem(room, player, itemId = null) {
  const catalog = campaignItemCatalog(room.campaignId);
  const item = itemId ? catalog.find(entry => entry.id === itemId) : null;
  if (!item) return { duplicate:false, coins:0, item:null };
  if (player.inventory.includes(item.id)) return { duplicate:true, coins:0, item };
  player.inventory.push(item.id);
  return { duplicate:false, coins:0, item };
}
function rollReward(room, player, { margin = 0, natural = 0, lootItemId = null, coinBonus = 0 } = {}) {
  const rewards = [];
  if (coinBonus > 0) {
    grantCoins(player, coinBonus);
    rewards.push(`사건 보수 · 코인 +${coinBonus}`);
  }
  // Equipment never drops just because a generic roll was high. It requires a scene-authored loot item.
  if (lootItemId && (natural === 20 || margin >= 7)) {
    const dropChance = natural === 20 ? 0.70 : 0.38;
    if (crypto.randomInt(0, 1000) < Math.floor(dropChance * 1000)) {
      const got = grantItem(room, player, lootItemId);
      if (got.item && !got.duplicate) rewards.push(`상황 보상 · ${got.item.name} 발견`);
    }
  }
  return rewards;
}


// v6.1.0 LIVING STORY
const AGENCY_VERSION = 2;
const SCENE_IMPORTANCE = {
  ordinary: { label:'일반 장면', dcMin:7, dcMax:9, choiceTarget:4, freeAction:true, consequence:'보이는 선택은 힌트일 뿐입니다. 직접 행동을 말해도 되며, 작은 실패는 이야기를 막지 않습니다.' },
  important: { label:'중요 장면', dcMin:8, dcMax:11, choiceTarget:4, freeAction:true, consequence:'위험이 분명한 장면입니다. 정해진 답 대신 직접 방법을 선언할 수 있습니다.' },
  pivotal: { label:'결정적 장면', dcMin:10, dcMax:13, choiceTarget:3, freeAction:true, consequence:'큰 분기나 엔딩이 걸린 장면입니다. 선택 수는 적지만 자유 행동은 그대로 허용됩니다.' },
};

function approachPressure(room, player, choice) {
  room.approachRhythm ||= {};
  const prev = room.approachRhythm[player?.id] || { stat:null, action:null, streak:0 };
  const sameStat = prev.stat === choice?.stat;
  const sameAction = prev.action === choice?.actionType;
  if (sameStat) {
    const nextStreak = Math.max(1, Number(prev.streak || 0));
    return { dc:Math.min(2, Math.max(0, nextStreak - 1) + (sameAction && nextStreak >= 2 ? 1 : 0)), label:'같은 방식이 읽히고 있다' };
  }
  if (Number(prev.streak || 0) >= 3) return { dc:-1, label:'예상 밖의 방식으로 전환' };
  return { dc:0, label:'' };
}
function rememberApproach(room, player, choice) {
  room.approachRhythm ||= {};
  const prev = room.approachRhythm[player?.id] || { stat:null, action:null, streak:0 };
  const same = prev.stat === choice?.stat;
  room.approachRhythm[player.id] = {
    stat:choice?.stat || null,
    action:choice?.actionType || null,
    streak:same ? Math.min(6, Number(prev.streak || 0) + 1) : 1,
  };
}
function fatalFailureReason(campaign, choice) {
  const world = campaign?.id;
  const action = String(choice?.actionType || '');
  const byAction = {
    fight:'치명상을 입고 끝내 다시 일어나지 못했다.',
    sneak:'들키지 않으려던 마지막 한 걸음이 함정과 낭떠러지, 혹은 적의 칼끝으로 이어졌다.',
    steal:'훔치려던 순간 퇴로가 막혔고, 그 대가는 물건 하나보다 훨씬 컸다.',
    threaten:'협박은 상대를 꺾지 못했다. 오히려 먼저 칼을 뽑게 만들었다.',
    'travel-a':'선택한 길은 돌아올 수 없는 위험 구역으로 이어졌다.',
    'travel-b':'우회로라고 믿었던 길이 가장 위험한 곳으로 파티를 끌고 갔다.',
  };
  const worldLine = {
    ember:'잿빛 성채는 쓰러진 이름을 오래 기억했다.', neon:'도시는 죽음을 기록했지만 기억은 곧 편집되기 시작했다.',
    abyss:'심해는 시신조차 쉽게 돌려주지 않았다.', clock:'다음 반복에도 그 자리는 비어 있었다.', wild:'숲은 한 사람의 발자국을 조용히 덮었다.',
    guardian1:'모험은 계속됐지만 한 자리만은 끝내 비어 있었다.', guardian2:'일행은 떠났고, 남겨진 이름 하나가 다음 길의 의미를 바꿨다.', guardian3:'폐허의 미래는 또 하나의 이름을 잃었다.'
  }[world] || '연대기는 그 죽음을 다음 장면까지 품고 갔다.';
  return `${byAction[action] || '무리한 선택의 대가가 치명적인 결과로 돌아왔다.'} ${worldLine}`;
}
function maybeFatalStoryFailure(room, campaign, player, choice, roll, margin) {
  if (!choice?.fatalRisk) return null;
  const severe = Number(roll) === 1 || Number(margin) <= -8;
  if (!severe) return null;
  const injuryStacks = (player?.statuses || []).reduce((sum,s)=>sum + Number(s.stack || s.stacks || 1),0);
  if (Number(player.hp || 0) > 2 && injuryStacks < 3 && Number(margin) > -10) return null;
  player.hp = 0;
  player.dead = true;
  player.deathReason = fatalFailureReason(campaign, choice);
  return player.deathReason;
}

function rawAbility(player, stat) {
  return Number(player?.abilities?.[stat]?.total || 10);
}
function rawAbilityMod(player, stat) {
  return mod(rawAbility(player, stat));
}
function abilityTraitFor(stat, score) {
  const tables = {
    '근력': { low:['허약','근력 공격 피해 -1'], high:['강골','근력 공격 피해 +1'], elite:['괴력','근력 공격 피해 +2'] },
    '민첩': { low:['굼뜸','방어 -1'], high:['날렵함','방어 +1'], elite:['번개반사','방어 +2 · 공격 명중 +1'] },
    '지능': { low:['멍청이','지능 판정 특성 -1'], high:['영리함','중요한 조사 선택의 의도를 읽음'], elite:['천재','지능 판정 특성 +1 · 선택 의도 심층 표시'] },
    '지혜': { low:['눈치 없음','지혜 판정 특성 -1'], high:['예리한 감각','실패 위험을 미리 감지'], elite:['직감','지혜 판정 특성 +1 · 실패 위험 심층 표시'] },
    '매력': { low:['비호감','매력 판정 특성 -1'], high:['호감형','상점/휴식 1코인 할인'], elite:['타고난 협상가','매력 판정 특성 +1 · 상점/휴식 2코인 할인'] },
    '체력': { low:['병약','최대 HP 감소 · 방어 태세 -1'], high:['튼튼함','상태이상 지속 감소 · 방어 태세 +1'], elite:['강인함','상태이상 지속 크게 감소 · 방어 태세 +2'] },
  };
  const row = tables[stat];
  if (!row) return null;
  if (score <= 5) return { stat, key:'low', label:row.low[0], effect:row.low[1] };
  if (score >= 18) return { stat, key:'elite', label:row.elite[0], effect:row.elite[1] };
  if (score >= 15) return { stat, key:'high', label:row.high[0], effect:row.high[1] };
  return null;
}
function traitCheckBonus(player, stat) {
  const score = rawAbility(player, stat);
  if (score <= 5 && ['지능','지혜','매력'].includes(stat)) return -1;
  if (score >= 18 && ['지능','지혜','매력'].includes(stat)) return 1;
  return 0;
}
function derivedAbilityImpact(player) {
  const str = rawAbility(player, '근력');
  const dex = rawAbility(player, '민첩');
  const int = rawAbility(player, '지능');
  const wis = rawAbility(player, '지혜');
  const cha = rawAbility(player, '매력');
  const con = rawAbility(player, '체력');
  const dexTraitDefense = dex <= 5 ? -1 : dex >= 18 ? 2 : dex >= 15 ? 1 : 0;
  const strengthTraitDamage = str <= 5 ? -1 : str >= 18 ? 2 : str >= 15 ? 1 : 0;
  const guardTrait = con <= 5 ? -1 : con >= 18 ? 2 : con >= 15 ? 1 : 0;
  const passives = STAT_NAMES.map(stat => abilityTraitFor(stat, rawAbility(player, stat))).filter(Boolean);
  return {
    strengthDamage: Math.max(-1, mod(str)) + strengthTraitDamage,
    defense: 10 + mod(dex) + dexTraitDefense,
    initiative: mod(dex),
    combatHitBonus: dex >= 18 ? 1 : 0,
    guardBonus: guardTrait,
    insight: int >= 15,
    insightDeep: int >= 18,
    dangerSense: wis >= 15,
    dangerSenseDeep: wis >= 18,
    shopDiscount: cha >= 18 ? 2 : cha >= 15 ? 1 : 0,
    questCoinBonus: cha >= 18 ? 1 : 0,
    statusResistance: con >= 18 ? 2 : con >= 15 ? 1 : 0,
    maxHpBonus: Math.max(-2, mod(con) * 2),
    passives,
  };
}
function recomputeDerivedVitals(player, { preserveRatio = false } = {}) {
  if (!player?.job || !player?.abilities) return;
  const oldMax = Math.max(1, Number(player.maxHp || player.job.baseHp || 10));
  const oldHp = Math.max(0, Number(player.hp || 0));
  const derived = derivedAbilityImpact(player);
  const nextMax = Math.max(6, Number(player.job.baseHp || 10) + Number(derived.maxHpBonus || 0));
  player.maxHp = nextMax;
  if (preserveRatio) player.hp = Math.max(0, Math.min(nextMax, Math.round(nextMax * oldHp / oldMax)));
  else player.hp = nextMax;
  player.derivedVitalsVersion = AGENCY_VERSION;
}
function sceneImportanceKey(beat) {
  const phase = String(beat?.phase || '');
  const title = String(beat?.title || '');
  const act = Number(beat?.act || 1);
  if (phase === '결단' || /최후|마지막|왕관|운명|결전|선택|심판|챔피언 소드|헤븐홀드/.test(title) || (act >= 5 && phase === '위기')) return 'pivotal';
  if (['진실','위기','대면'].includes(phase) || /배신|구조|붕괴|침공|봉인|실종|재판|살인/.test(title)) return 'important';
  return 'ordinary';
}
function normalizeStoryDc(beat, dc) {
  const key = sceneImportanceKey(beat);
  const rule = SCENE_IMPORTANCE[key];
  return Math.max(rule.dcMin, Math.min(rule.dcMax, Number(dc || 10)));
}
function difficultyLabel(dc) {
  if (dc <= 8) return '쉬움';
  if (dc <= 10) return '보통';
  if (dc <= 12) return '어려움';
  return '극한';
}
function routeFromStat(stat) {
  if (['지능','지혜'].includes(stat)) return 'careful';
  if (['근력','민첩'].includes(stat)) return 'bold';
  return 'empathetic';
}
function choicePathFromRoute(route) {
  return route === 'careful' ? 'truth' : route === 'bold' ? 'survival' : 'bond';
}
function routeTemplateChoice(beat, route) {
  return (beat?.choices || []).find(c => c.branchValue === route) || beat?.choices?.[0] || null;
}
function alternateActionLabel(stat, beat) {
  const objective = String(beat?.objective || '현재 목표');
  const map = {
    '근력': `주변 구조물을 이용해 판 자체를 바꾸고 ${objective}에 강제로 길을 만든다`,
    '민첩': `정면을 피하고 측면으로 먼저 움직여 ${objective}에 유리한 위치를 잡는다`,
    '지능': `지금까지 나온 단서들을 다시 조합해 ${objective}의 숨은 규칙을 찾아낸다`,
    '지혜': `바로 움직이지 않고 주변의 반응과 위험 신호를 끝까지 읽어 ${objective}의 함정을 피한다`,
    '매력': `관련 인물의 이해관계를 건드려 ${objective}의 조건 자체를 협상으로 바꾼다`,
    '체력': `위험을 받아내며 시간을 벌어 동료들이 ${objective}에 접근할 틈을 만든다`,
  };
  return map[stat] || `다른 관점에서 ${objective}를 해결할 방법을 찾는다`;
}
function inferSceneAffordances(beat) {
  const explicit = beat?.affordances || {};
  const text = [beat?.title, beat?.phase, beat?.objective, beat?.situation, beat?.text, beat?.visual, beat?.why, beat?.stakes]
    .filter(Boolean).join(' ');
  const hasPerson = /사람|인물|경비|상인|주민|생존자|증언자|아이|공주|로레인|귀족|사제|군중|병사|기사|추적자|침략자|고블린|도굴꾼|브로커|의무관|조종사|연구원|파수꾼|부족|사냥꾼|동료|누군가|목소리|상대/.test(text);
  const hasHostile = /적|적대|공격|습격|전투|싸움|결투|괴물|짐승|추적자|침략자|고블린|경비대가 .*막|길을 막|위협하는 존재|포위|매복|사냥감/.test(text);
  const hasObstacle = /문|벽|봉쇄|잔해|장애|잠금|봉인|기계|장치|구조물|통로|계단|방벽|문턱|균열|붕괴|막혀|폐쇄|가로막/.test(text);
  const hasClue = /단서|기록|흔적|문양|로그|지도|메시지|증거|비밀|이상|모순|신호|자국|문장|기억|정보|규칙|원인/.test(text);
  const hasStealthPressure = /감시|경계|추적|시야|센서|포탑|몰래|숨|발각|봉쇄|경비|드론/.test(text);
  const hasRescue = /구조|부상|다친|살리|피난|보호|위험에 처|갇힌|생존자|동료|시간을 벌/.test(text);
  const hasItem = /물건|열쇠|상자|장부|지도|무기|왕관|조각|데이터|기록물|장치|보관|소지/.test(text);
  return {
    text,
    hasPerson: explicit.hasPerson ?? hasPerson, hasHostile: explicit.hasHostile ?? hasHostile,
    hasObstacle: explicit.hasObstacle ?? hasObstacle, hasClue: explicit.hasClue ?? hasClue,
    hasStealthPressure: explicit.hasStealthPressure ?? hasStealthPressure, hasRescue: explicit.hasRescue ?? hasRescue,
    hasItem: explicit.hasItem ?? hasItem,
    person:explicit.person||'', hostile:explicit.hostile||'', obstacle:explicit.obstacle||'', clue:explicit.clue||'', rescue:explicit.rescue||'', item:explicit.item||''
  };
}
function choiceFitsScene(choice, ctx) {
  if (!choice || choice.requiredJob || choice.isTravel) return true;
  const action = String(choice.actionType || '');
  if (!action || action.startsWith('follow-') || action.startsWith('chain-') || action.startsWith('travel-')) return true;
  if (action === 'fight') return ctx.hasHostile;
  if (['persuade','threaten','trade','tail'].includes(action)) return ctx.hasPerson;
  if (action === 'steal') return ctx.hasPerson || ctx.hasItem;
  if (['sneak','hide'].includes(action)) return ctx.hasStealthPressure || ctx.hasHostile || ctx.hasObstacle;
  if (action === 'break') return ctx.hasObstacle || ctx.hasHostile;
  if (action === 'trap') return ctx.hasHostile || ctx.hasStealthPressure || ctx.hasObstacle;
  if (action === 'help') return ctx.hasPerson || ctx.hasRescue;
  return true;
}
function sceneFocus(beat) {
  return String(beat?.objective || beat?.title || '현재 상황').replace(/[.!?]+$/g,'').slice(0,72);
}
function shortActionLabel(actionType, stat, ctx={}) {
  const obj=(name,verb,fallback)=>name?`${name}${/[가-힣]$/.test(name)&&((name.charCodeAt(name.length-1)-0xAC00)%28!==0)?'을':'를'} ${verb}`:fallback;
  const map = {
    investigate: obj(ctx.clue,'본다','단서를 본다'), observe:'주변을 살핀다', wait:'기다린다',
    bypass: obj(ctx.obstacle,'우회한다','우회한다'), sneak:'몰래 들어간다', hide:'몸을 숨긴다',
    fight: ctx.hostile?`${ctx.hostile}와 싸운다`:'맞서 싸운다', break:obj(ctx.obstacle,'연다','길을 연다'),
    persuade: ctx.person?`${ctx.person}와 말한다`:'설득한다', trade:ctx.person?`${ctx.person}과 거래한다`:'거래한다',
    threaten:ctx.person?`${ctx.person}을 압박한다`:'압박한다', tail:ctx.person?`${ctx.person}을 따라간다`:'뒤를 밟는다',
    steal:obj(ctx.item,'챙긴다','물건을 챙긴다'), help:obj(ctx.rescue||ctx.person,'돕는다','사람을 돕는다'),
    endure:'버틴다', trap:'함정을 만든다', 'travel-a':'다음 곳으로 간다'
  };
  if (map[actionType]) return map[actionType];
  if (stat === '지능') return obj(ctx.clue,'본다','단서를 본다');
  if (stat === '지혜') return '주변을 살핀다';
  if (stat === '민첩') return ctx?.hasStealthPressure ? '몰래 움직인다' : '우회한다';
  if (stat === '매력' && ctx?.hasPerson) return `${ctx.person||'상대'}와 말한다`;
  if (stat === '근력') return ctx?.hasHostile ? `${ctx.hostile||'적'}와 싸운다` : '길을 연다';
  if (stat === '체력') return ctx?.hasRescue ? obj(ctx.rescue,'돕는다','사람을 돕는다') : '버틴다';
  return '다른 방법을 찾는다';
}

function freeActionIntent(text='') {
  const t=String(text).toLowerCase();
  if (/싸우|공격|때리|베어|쏘|죽이|제압/.test(t)) return 'fight';
  if (/설득|대화|말하|협상|질문|물어|거래|흥정|위로/.test(t)) return 'talk';
  if (/훔치|가져가|빼앗|소매치기/.test(t)) return 'steal';
  if (/미행|뒤를 밟|따라가/.test(t)) return 'tail';
  if (/숨|몰래|잠입|들키지/.test(t)) return 'sneak';
  if (/부수|파괴|밀어|열어|뚫|치워/.test(t)) return 'break';
  if (/돕|구조|구해|보호|치료/.test(t)) return 'help';
  if (/조사|살펴|관찰|확인|읽|분석|찾/.test(t)) return 'investigate';
  return 'other';
}
function validateFreeAction(declaration, beat) {
  const ctx=inferSceneAffordances(beat);
  const intent=freeActionIntent(declaration);
  if (intent==='fight' && !(ctx.hasHostile || ctx.hasPerson)) return {ok:false,error:'지금 장면에는 싸울 대상이 없습니다. 다른 행동을 말해 주세요.'};
  if (intent==='talk' && !ctx.hasPerson) return {ok:false,error:'지금 장면에는 대화할 사람이 없습니다. 주변을 조사하거나 다른 행동을 말해 주세요.'};
  if (intent==='steal' && !(ctx.hasItem || ctx.hasPerson)) return {ok:false,error:'지금 장면에는 훔치거나 가져갈 대상이 보이지 않습니다.'};
  if (intent==='tail' && !ctx.hasPerson) return {ok:false,error:'지금 장면에는 뒤를 밟을 대상이 없습니다.'};
  if (intent==='break' && !(ctx.hasObstacle || ctx.hasHostile)) return {ok:false,error:'지금 장면에는 부수거나 억지로 열 대상이 없습니다.'};
  if (intent==='help' && !(ctx.hasRescue || ctx.hasPerson)) return {ok:false,error:'지금 장면에는 당장 도울 대상이 보이지 않습니다.'};
  return {ok:true,ctx,intent};
}
function contextualGeneratedAction(stat, beat, ctx, variant=0) {
  const focus = sceneFocus(beat);
  const table = {
    '지능': [
      {actionType:'investigate', label:`현장의 단서와 모순을 다시 맞춰 ${focus}의 원인을 좁힌다`},
      {actionType:'trap', label:`주변 조건을 계산해 위험이 움직일 경로를 미리 제한한다`},
    ],
    '지혜': [
      {actionType:'observe', label:`바로 움직이지 않고 기척과 변화를 읽어 가장 안전한 다음 수를 찾는다`},
      {actionType:'wait', label:`상황이 먼저 반응하게 기다린 뒤 드러난 틈을 이용한다`},
    ],
    '민첩': ctx.hasStealthPressure
      ? [{actionType:'sneak', label:`감시와 시야가 비는 순간을 골라 들키지 않고 유리한 위치로 이동한다`},{actionType:'bypass', label:`정면을 피하고 위험 구간을 우회해 ${focus}에 먼저 접근한다`}]
      : [{actionType:'bypass', label:`정면을 피하고 지형의 빈틈을 이용해 ${focus}에 접근한다`},{actionType:'bypass', label:`가장 위험한 지점을 건드리지 않고 측면 경로를 확보한다`}],
    '근력': ctx.hasHostile
      ? [{actionType:'fight', label:`눈앞의 적대 세력을 정면으로 밀어내고 길을 연다`, startsCombat:true, fatalRisk:true},{actionType:'break', label:`주변 구조물을 힘으로 바꿔 상대의 유리한 판을 무너뜨린다`, fatalRisk:true}]
      : [{actionType:'break', label:`막힌 구조물이나 장애물을 힘으로 치워 ${focus}에 길을 만든다`, fatalRisk:true},{actionType:'break', label:`주변 구조를 강제로 바꿔 지금 막힌 동선을 새로 만든다`, fatalRisk:true}],
    '체력': ctx.hasRescue || ctx.hasPerson
      ? [{actionType:'help', label:`위험을 대신 받아내며 사람들을 보호하고 움직일 시간을 번다`},{actionType:'endure', label:`가장 위험한 구간을 버텨 동료들이 ${focus}에 집중할 시간을 만든다`}]
      : [{actionType:'endure', label:`환경의 압박을 몸으로 버티며 ${focus}을 위한 시간을 확보한다`},{actionType:'endure', label:`피로와 위험을 감수하고 가장 불안정한 구간을 직접 지탱한다`}],
    '매력': ctx.hasPerson
      ? [{actionType:'persuade', label:`관련 인물의 이해관계를 짚어 협조하는 편이 이득이 되도록 설득한다`},{actionType:'trade', label:`상대가 원하는 대가를 제시해 충돌 없이 정보나 통로를 얻는다`}]
      : [],
  };
  const options = table[stat] || [];
  return options.length ? options[variant % options.length] : null;
}
function choiceConsequenceHint(choice, importanceKey) {
  const route = choice?.branchValue || routeFromStat(choice?.stat);
  const success = route === 'careful' ? '단서·정보 우위' : route === 'bold' ? '위치·속도 우위' : '관계·지원 우위';
  const failure = importanceKey === 'pivotal' ? '큰 분기 변화 가능' : importanceKey === 'important' ? '위협·상태 변화 가능' : '작은 불리함 또는 우회';
  return { success, failure };
}
function prepareAgencyBeat(room, beat) {
  if (!beat) return beat;
  const importanceKey = sceneImportanceKey(beat);
  const rule = SCENE_IMPORTANCE[importanceKey];
  beat.importance = { key:importanceKey, label:rule.label, consequence:rule.consequence };
  beat.freeActionAllowed = Boolean(rule.freeAction);
  const sceneCtx = inferSceneAffordances(beat);
  beat.choices = Array.isArray(beat.choices) ? beat.choices.filter(choice => choiceFitsScene(choice, sceneCtx)).map(choice => {
    const normalized = { ...choice };
    normalized.dc = normalizeStoryDc(beat, choice.dc);
    const memory = room.agencyMemory || {};
    const momentum = normalized.branchValue === 'careful' ? Number(memory.clues || 0)
      : normalized.branchValue === 'bold' ? Number(memory.position || 0)
      : Number(memory.rapport || 0);
    if (momentum >= 4) {
      normalized.dc = Math.max(SCENE_IMPORTANCE[importanceKey].dcMin, normalized.dc - 1);
      normalized.detail = `${normalized.detail || ''} · 이전 선택들이 쌓여 이 접근에 실제 우위가 생겼습니다.`.trim();
      normalized.memoryAdvantage = true;
    }
    normalized.difficulty = difficultyLabel(normalized.dc);
    normalized.label = shortActionLabel(normalized.actionType, normalized.stat, sceneCtx);
    normalized.consequenceHint = choiceConsequenceHint(normalized, importanceKey);
    return normalized;
  }) : [];

  const actor = currentTurnPlayer(room);
  const targetChoiceCount = Number(rule.choiceTarget || 5);
  const visibleForActor = () => beat.choices.filter(choice => !choice.requiredJob || choice.requiredJob === actor?.job?.name);
  const usedStats = new Set(visibleForActor().map(choice => choice.stat));
  const preferredStats = ['지능','지혜','민첩','매력','근력','체력'];
  const actorBest = actor?.abilities
    ? Object.entries(actor.abilities).sort((a,b)=>Number(b[1]?.total||0)-Number(a[1]?.total||0)).map(([s])=>s)
    : [];
  const statOrder = [...new Set([...actorBest, ...preferredStats])].filter(stat => stat !== '매력' || sceneCtx.hasPerson);
  let generatedIndex = 0;
  while (visibleForActor().length < targetChoiceCount && generatedIndex < 18) {
    const stat = statOrder[generatedIndex % statOrder.length];
    generatedIndex += 1;
    if (usedStats.has(stat) && generatedIndex <= statOrder.length) continue;
    const route = routeFromStat(stat);
    const template = routeTemplateChoice(beat, route) || beat.choices[0];
    if (!template) break;
    const dc = normalizeStoryDc(beat, Number(template.dc || 10) + (generatedIndex % 3 === 0 ? 1 : 0));
    const generated = contextualGeneratedAction(stat, beat, sceneCtx, generatedIndex - 1);
    if (!generated) continue;
    beat.choices.push({
      ...template,
      id:`${beat.id || 'scene'}-option-${stat}-${generatedIndex}`,
      label:shortActionLabel(generated.actionType, stat, sceneCtx),
      detail:`현재 장면에서 실제로 가능한 ${stat} 계열 접근입니다. 성공하면 같은 목표를 다른 경로로 진전시키고, 실패해도 그 행동 때문에 생긴 후속 상황으로 이어집니다.`,
      actionType:generated.actionType,
      startsCombat:Boolean(generated.startsCombat),
      fatalRisk:Boolean(generated.fatalRisk),
      stat,
      dc,
      difficulty:difficultyLabel(dc),
      branchValue:route,
      path:choicePathFromRoute(route),
      agencyGenerated:true,
      consequenceHint:choiceConsequenceHint({branchValue:route,stat}, importanceKey),
    });
    usedStats.add(stat);
  }

  const visible = visibleForActor();
  if (visible.length > targetChoiceCount) {
    const kept=[]; const seenActions=new Set();
    for (const choice of visible) {
      const key=choice.requiredJob ? `job:${choice.requiredJob}` : (choice.actionType || choice.stat);
      if (seenActions.has(key) && kept.length < targetChoiceCount - 1) continue;
      kept.push(choice); seenActions.add(key);
      if (kept.length >= targetChoiceCount) break;
    }
    if (kept.length < targetChoiceCount) {
      for (const choice of visible) { if (!kept.includes(choice)) kept.push(choice); if (kept.length >= targetChoiceCount) break; }
    }
    const hiddenJob = beat.choices.filter(choice => choice.requiredJob && choice.requiredJob !== actor?.job?.name);
    beat.choices = [...kept, ...hiddenJob];
  }

  if (actor) {
    const derived = derivedAbilityImpact(actor);
    beat.statInsight = {
      actorId:actor.id,
      insight:derived.insight,
      dangerSense:derived.dangerSense,
      text: derived.insight && derived.dangerSense
        ? '높은 지능과 지혜 덕분에 선택의 난이도뿐 아니라 성공/실패가 남길 방향까지 더 선명하게 읽힙니다.'
        : derived.insight ? '높은 지능 덕분에 일부 선택의 성공 방향을 미리 추론할 수 있습니다.'
        : derived.dangerSense ? '높은 지혜 덕분에 어떤 선택의 실패가 더 위험한지 감지할 수 있습니다.'
        : '',
    };
  }
  return beat;
}
function applyAgencyMemory(room, player, choice, success, margin, declaration='') {
  room.agencyMemory ||= { actions:[], clues:0, position:0, rapport:0, scars:0 };
  const route = choice?.branchValue || routeFromStat(choice?.stat);
  if (success) {
    if (route === 'careful') room.agencyMemory.clues += margin >= 5 ? 2 : 1;
    else if (route === 'bold') room.agencyMemory.position += margin >= 5 ? 2 : 1;
    else room.agencyMemory.rapport += margin >= 5 ? 2 : 1;
  } else room.agencyMemory.scars += margin <= -5 ? 2 : 1;
  room.agencyMemory.actions.push({ beatId:room.storyNodeId, playerId:player.id, stat:choice?.stat, route, success, declaration:String(declaration || choice?.label || '').slice(0,120) });
  if (room.agencyMemory.actions.length > 24) room.agencyMemory.actions.splice(0, room.agencyMemory.actions.length - 24);
}


function normalizeLoadedRoom(room) {
  if (!room) return room;
  room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0);
  room.turnSerial = Number(room.turnSerial || 0);
  room.nextCheckDcReduction = Number(room.nextCheckDcReduction || 0);
  room.threatShield = Number(room.threatShield || 0);
  for (const player of room.players || []) {
    player.skillState ||= { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
    player.statuses ||= [];
    normalizeEconomyPlayer(player);
    if (player.job && player.abilities && Number(player.derivedVitalsVersion || 0) < AGENCY_VERSION) recomputeDerivedVitals(player, { preserveRatio:true });
  }
  room.pendingTurnAdvance = Boolean(room.pendingTurnAdvance);
  room.voteEndsAt ||= null;
  room.voteAllVotedCountdown = Boolean(room.voteAllVotedCountdown);
  room.choiceVotes ||= {};
  room.agencyMemory ||= { actions:[], clues:0, position:0, rapport:0, scars:0 };
  room.storyHistory ||= [];
  room.lastStoryAction ||= null;
  room.storyFlags ||= {};
  room.storyMemory ||= {};
  room.pathTotals ||= { truth: 0, survival: 0, bond: 0 };
  room.pendingContinue ||= null;
  room.pendingAfterCombat ||= null;
  room.jobStory ||= {};
  room.failureCount = Number(room.failureCount || 0);
  room.prologue ||= null;
  room.storyDetour ||= null;
  room.narrativeState ||= { boon: null, lastRoute: null, routeStreak: 0, detours: 0 };
  room.narrativeLedger ||= { threads: [], routeShifts: [], jobThreads: {} };
  room.storySeenIds ||= [];
  room.lastResolvedStoryBeat ||= null;
  room.facilityUses ||= {};
  room.facilityEncounterCount = Number(room.facilityEncounterCount || 0);
  room.lastFacilityEventSerial = Number(room.lastFacilityEventSerial ?? -99);
  const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
  if (campaign?.parallelStory?.enabled && room.phase !== 'lobby') {
    if (!room.parallel?.enabled) initializeParallelStory(room, campaign);
    room.parallel.worldFlags ||= {}; room.parallel.links ||= {}; room.parallel.offers ||= {}; room.parallel.encounters ||= {}; room.parallel.incidentLog ||= [];
    for (const player of room.players || []) {
      if (!room.parallel.playerStates?.[player.id]) {
        const nodeId=campaign.parallelStory.startByJob?.[player.job?.name] || campaign.parallelStory.startFallback;
        const node=campaign.parallelStory.nodes?.[nodeId];
        room.parallel.playerStates[player.id]={nodeId,location:node?.location||'concourse',previousLocation:null,progress:0,history:[],flags:{},items:parallelStartItemsFor(player),outcomeThreads:[],pathTotals:{truth:0,survival:0,bond:0},ended:false,ending:null,endingText:null,pendingTravel:null,support:0,lastPersonalResult:null,sharedRevision:0};
      }
      const ps=room.parallel.playerStates[player.id];
      ps.flags ||= {}; ps.items = Array.isArray(ps.items) ? [...new Set(ps.items.filter(id=>PARALLEL_STORY_ITEM_DEFS[id]))] : parallelStartItemsFor(player);
      ps.outcomeThreads = Array.isArray(ps.outcomeThreads) ? ps.outcomeThreads : []; ps.pathTotals ||= {truth:0,survival:0,bond:0};
      // v6.5.1 migration: remove accidental story-item objects from the generic equipment inventory.
      if(Array.isArray(player.inventory)) player.inventory = player.inventory.filter(item=>typeof item==='string');
    }
  }
  if (!campaign || room.phase === 'lobby') {
    room.schemaVersion = APP_VERSION;
    return room;
  }

  // v4.12: story progress is node-based, not chapter-number based.
  // A valid session follows explicit next edges stored on each choice. We never search for an arbitrary
  // "unseen chapter" and never advance by chapter + 1.
  const validStoryIds = new Set(campaign.storyBeats.map(beat => beat.id));
  room.storySeenIds = [...new Set((room.storySeenIds || []).filter(id => validStoryIds.has(id)))];
  for (const item of room.storyHistory || []) {
    if (!item?.isDetour && item?.beatId && validStoryIds.has(item.beatId) && !room.storySeenIds.includes(item.beatId)) room.storySeenIds.push(item.beatId);
  }
  room.story = room.storySeenIds.length;
  room.storyComplete = Boolean(room.storyComplete);
  room.storyGraphVersion = 1;
  if (!room.storyNodeId && !room.storyComplete) {
    // Legacy-save migration: derive the next node only from the last resolved scene's declared edge.
    // New sessions always have storyNodeId from the start and do not use numeric chapter recovery.
    const last = [...(room.storyHistory || [])].reverse().find(item => item?.beatId && !item?.isDetour && validStoryIds.has(item.beatId));
    if (last) {
      const lastBeat = campaign.storyBeats.find(beat => beat.id === last.beatId);
      const selected = lastBeat?.choices?.find(choice => choice.id === last.choiceId || choice.label === last.declaration);
      const candidate = selected?.next?.[last.success ? 'success' : 'failure'];
      if (candidate === '__ENDING__') room.storyComplete = true;
      else if (candidate && validStoryIds.has(candidate) && !room.storySeenIds.includes(candidate)) room.storyNodeId = candidate;
    }
    if (!room.storyNodeId && !room.storyComplete && room.storySeenIds.length === 0) room.storyNodeId = campaign.storyBeats[0]?.id || null;
  }

  const byId = new Map(campaign.events.map(event => [event.id, event]));
  const used = new Set((room.discard || []).map(event => event?.id).filter(Boolean));
  if (room.currentEvent?.id) used.add(room.currentEvent.id);
  const uniqueDeckIds = [];
  for (const oldEvent of room.deck || []) {
    if (!oldEvent?.id || used.has(oldEvent.id) || uniqueDeckIds.includes(oldEvent.id) || !byId.has(oldEvent.id)) continue;
    uniqueDeckIds.push(oldEvent.id);
  }
  room.deck = uniqueDeckIds.map(id => ({ ...byId.get(id) }));
  room.discard = [...new Set((room.discard || []).map(event => event?.id).filter(id => id && byId.has(id)))].map(id => ({ ...byId.get(id) }));
  if (room.currentEvent?.id && byId.has(room.currentEvent.id)) {
    room.currentEvent = { ...byId.get(room.currentEvent.id) };
    if (room.activeChoice) {
      const choiceIndex = Number(room.activeChoice.choiceIndex);
      const choice = room.currentEvent.choices[choiceIndex];
      if (choice) room.activeChoice = { ...room.activeChoice, choice };
      else room.activeChoice = null;
    }
    if (!room.activeChoice && room.phase === 'story' && !room.voteEndsAt) {
      const connectedCount = (room.players || []).filter(player => player.connected).length;
      room.voteEndsAt = Date.now() + (connectedCount <= 1 ? SOLO_VOTE_DURATION_MS : VOTE_DURATION_MS);
    }
  }
  room.schemaVersion = APP_VERSION;
  return room;
}

async function createRoom(hostName, socketId) {
  const roomCode = await reserveRoomCode();
  const player = {
    id: token(), socketId, name: hostName, host: true, connected: true,
    ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0, statuses: [], skillState: { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 }, coins: 1, inventory: [], equipment: { weapon:null, armor:null, charm:null, tool:null },
  };
  const room = {
    code: roomCode,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    campaignId: null,
    phase: 'lobby',
    players: [player],
    deck: [], discard: [], currentEvent: null, activeChoice: null,
    choiceVotes: {}, voteEndsAt: null,
    mainTurnsSinceEvent: 0, pendingTurnAdvance: false, turnSerial: 0, nextCheckDcReduction: 0, threatShield: 0,
    threat: 0, story: 0, dcPenalty: 0, monster: null,
    storyFlags: {}, storyMemory: {}, pathTotals: { truth: 0, survival: 0, bond: 0 }, pendingContinue: null, failureCount: 0,
    prologue: null,
    storyDetour: null,
    narrativeState: { boon: null, lastRoute: null, routeStreak: 0, detours: 0 },
    narrativeLedger: { threads: [], routeShifts: [], jobThreads: {} },
    storySeenIds: [],
    storyNodeId: null, storyComplete: false, storyGraphVersion: 1,
    lastResolvedStoryBeat: null,
    chat: [], lastResolution: null, ending: null, facilityUses: {},
    revision: 1, turnIndex: 0, abandonVote: null, schemaVersion: APP_VERSION,
  };
  rooms.set(roomCode, room);
  return { room, player };
}

async function getOrLoadRoom(roomCode) { return rooms.get(roomCode) || null; }

function currentTurnPlayer(room) {
  if (!room?.players?.length) return null;
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : 0;
  const start = ((room.turnIndex % room.players.length) + room.players.length) % room.players.length;
  for (let step = 0; step < room.players.length; step += 1) {
    const index = (start + step) % room.players.length;
    const candidate = room.players[index];
    if (!candidate.connected) continue;
    if (room.phase !== 'lobby' && candidate.maxHp > 0 && candidate.hp <= 0) continue;
    if (room.parallel?.enabled && room.parallel.playerStates?.[candidate.id]?.ended) continue;
    room.turnIndex = index;
    return candidate;
  }
  room.turnIndex = start;
  return room.players[start] || room.players[0] || null;
}

function advanceTurn(room) {
  if (!room?.players?.length) return null;
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : -1;
  const start = room.turnIndex;
  for (let step = 1; step <= room.players.length; step += 1) {
    const index = (start + step + room.players.length) % room.players.length;
    const candidate = room.players[index];
    if (!candidate.connected) continue;
    if (room.phase !== 'lobby' && candidate.maxHp > 0 && candidate.hp <= 0) continue;
    if (room.parallel?.enabled && room.parallel.playerStates?.[candidate.id]?.ended) continue;
    room.turnIndex = index;
    return candidate;
  }
  return currentTurnPlayer(room);
}

function connectedPlayers(room) {
  return room.players.filter(player => player.connected);
}

function storyEligiblePlayers(room) {
  return room.players.filter(player => player.connected && player.hp > 0);
}


// v6.5.0 - AFTER LAST TRAIN parallel-character sandbox
function pairKey(a,b){ return [String(a),String(b)].sort().join(':'); }
const PARALLEL_STORY_ITEM_DEFS={
  echo_story_toolkit:{id:'echo_story_toolkit',name:'절연 공구 세트',tags:['tool','circuit','maintenance'],value:2},
  echo_story_tester:{id:'echo_story_tester',name:'휴대용 회로 테스터',tags:['tool','circuit','tester'],value:3},
  echo_story_flashlight:{id:'echo_story_flashlight',name:'점검용 손전등',tags:['tool','light'],value:2},
  echo_story_battery:{id:'echo_story_battery',name:'예비 건전지',tags:['battery','trade'],value:1},
  echo_story_radio:{id:'echo_story_radio',name:'역무용 무전기',tags:['radio','authority'],value:3},
  echo_story_scanner:{id:'echo_story_scanner',name:'주파수 스캐너',tags:['radio','scanner','delivery'],value:3},
  echo_story_keyring:{id:'echo_story_keyring',name:'직원 키링',tags:['key','authority'],value:2},
  echo_story_master_key:{id:'echo_story_master_key',name:'비상 마스터키',tags:['master_key','key','authority'],value:5},
  echo_story_keycard:{id:'echo_story_keycard',name:'보안카드',tags:['keycard','key','security'],value:4},
  echo_story_signal_key:{id:'echo_story_signal_key',name:'신호 복구키',tags:['signal_key','key','signal'],value:5},
  echo_story_access_token:{id:'echo_story_access_token',name:'구형 점검 토큰',tags:['access_token','key','trade'],value:3},
  echo_story_locker_token:{id:'echo_story_locker_token',name:'327번 보관함 토큰',tags:['locker_token','key'],value:2},
  echo_story_medkit:{id:'echo_story_medkit',name:'휴대용 구급가방',tags:['medical','tool'],value:3},
  echo_story_water:{id:'echo_story_water',name:'생수',tags:['consumable','trade'],value:1},
  echo_story_bar:{id:'echo_story_bar',name:'셔터 고정봉',tags:['bar','force','tool'],value:2},
  echo_story_route_note:{id:'echo_story_route_note',name:'배달 경로 메모',tags:['route','delivery'],value:1},
  echo_story_parcel:{id:'echo_story_parcel',name:'0번 승강장 배송물',tags:['parcel','delivery'],value:4},
  echo_story_future_drive:{id:'echo_story_future_drive',name:'미래 기록 저장장치',tags:['evidence_drive','evidence','data'],value:5},
  echo_story_zero_ticket:{id:'echo_story_zero_ticket',name:'0번 승차권',tags:['zero_ticket','ticket','anomaly'],value:6},
  echo_story_root_key:{id:'echo_story_root_key',name:'운행 루트 코어키',tags:['root_key','signal','anomaly'],value:7},

  // v7.0.0 - job-bound story tools for every main chronicle.
  ember_rune_wedge:{id:'ember_rune_wedge',name:'왕실 룬 쐐기',campaignId:'ember',tags:['story-item','tool','access','charm'],value:4,storyOnly:true},
  ember_ember_cup:{id:'ember_ember_cup',name:'불씨 판독잔',campaignId:'ember',tags:['story-item','evidence','charm','tool'],value:3,storyOnly:true},
  ember_blood_thread:{id:'ember_blood_thread',name:'성흔 은실',campaignId:'ember',tags:['story-item','evidence','navigation'],value:3,storyOnly:true},
  ember_grave_hook:{id:'ember_grave_hook',name:'왕묘 갈고리',campaignId:'ember',tags:['story-item','tool','access','force'],value:3,storyOnly:true},
  ember_silver_oil:{id:'ember_silver_oil',name:'백은 성유',campaignId:'ember',tags:['story-item','medical','charm'],value:3,storyOnly:true},

  neon_ghost_deck_story:{id:'neon_ghost_deck_story',name:'망분리 침투덱',campaignId:'neon',tags:['story-item','tool','data','access','signal'],value:5,storyOnly:true},
  neon_value_meter:{id:'neon_value_meter',name:'감정 가치계',campaignId:'neon',tags:['story-item','data','evidence','trade'],value:3,storyOnly:true},
  neon_scout_drone:{id:'neon_scout_drone',name:'초소형 정찰드론',campaignId:'neon',tags:['story-item','signal','navigation','tool'],value:4,storyOnly:true},
  neon_nanopatch:{id:'neon_nanopatch',name:'나노패치 키트',campaignId:'neon',tags:['story-item','medical','tool'],value:3,storyOnly:true},
  neon_trace_jammer:{id:'neon_trace_jammer',name:'추적 차단기',campaignId:'neon',tags:['story-item','signal','tool'],value:4,storyOnly:true},

  abyss_oxygen_reel:{id:'abyss_oxygen_reel',name:'예비 산소 릴',campaignId:'abyss',tags:['story-item','medical','route'],value:4,storyOnly:true},
  abyss_bio_sampler:{id:'abyss_bio_sampler',name:'생체 샘플러',campaignId:'abyss',tags:['story-item','evidence','tool'],value:3,storyOnly:true},
  abyss_pressure_kit:{id:'abyss_pressure_kit',name:'압력 공구 키트',campaignId:'abyss',tags:['story-item','tool','access','force'],value:4,storyOnly:true},
  abyss_sonar_pinger:{id:'abyss_sonar_pinger',name:'휴대 소나 핑거',campaignId:'abyss',tags:['story-item','signal','navigation'],value:4,storyOnly:true},
  abyss_trauma_pack:{id:'abyss_trauma_pack',name:'고압 응급키트',campaignId:'abyss',tags:['story-item','medical'],value:3,storyOnly:true},

  clock_afterchalk:{id:'clock_afterchalk',name:'잔상 분필',campaignId:'clock',tags:['story-item','temporal','evidence'],value:3,storyOnly:true},
  clock_gear_key:{id:'clock_gear_key',name:'정밀 태엽키',campaignId:'clock',tags:['story-item','temporal','tool','access'],value:4,storyOnly:true},
  clock_sealed_notebook:{id:'clock_sealed_notebook',name:'봉인 잉크 노트',campaignId:'clock',tags:['story-item','temporal','evidence','data'],value:3,storyOnly:true},
  clock_empty_minute_bottle:{id:'clock_empty_minute_bottle',name:'빈 시간병',campaignId:'clock',tags:['story-item','temporal','trade','artifact'],value:4,storyOnly:true},
  clock_tower_pass:{id:'clock_tower_pass',name:'종탑 순찰패',campaignId:'clock',tags:['story-item','access','temporal'],value:4,storyOnly:true},

  wild_star_compass:{id:'wild_star_compass',name:'별궤적 나침침',campaignId:'wild',tags:['story-item','navigation','charm'],value:3,storyOnly:true},
  wild_tree_knot:{id:'wild_tree_knot',name:'수목언어 매듭',campaignId:'wild',tags:['story-item','charm','evidence'],value:3,storyOnly:true},
  wild_calm_sachet:{id:'wild_calm_sachet',name:'진정 향낭',campaignId:'wild',tags:['story-item','charm','medical'],value:3,storyOnly:true},
  wild_star_tongs:{id:'wild_star_tongs',name:'별철 집게',campaignId:'wild',tags:['story-item','tool','force'],value:3,storyOnly:true},
  wild_healing_herbs:{id:'wild_healing_herbs',name:'별빛 약초낭',campaignId:'wild',tags:['story-item','medical','charm'],value:3,storyOnly:true},

  guardian_royal_seal_story:{id:'guardian_royal_seal_story',name:'왕실 비상인장',campaignId:'guardian',tags:['story-item','access','evidence'],value:4,storyOnly:true},
  guardian_field_map:{id:'guardian_field_map',name:'캔터베리 야전지도',campaignId:'guardian',tags:['story-item','navigation'],value:3,storyOnly:true},
  guardian_rune_scope_story:{id:'guardian_rune_scope_story',name:'룬 판독경',campaignId:'guardian',tags:['story-item','tool','evidence'],value:4,storyOnly:true},
  guardian_royal_letter:{id:'guardian_royal_letter',name:'왕실 긴급서신',campaignId:'guardian',tags:['story-item','access','evidence','trade'],value:4,storyOnly:true},
  guardian_field_medbag:{id:'guardian_field_medbag',name:'야전 구급낭',campaignId:'guardian',tags:['story-item','medical'],value:3,storyOnly:true},

  aurora_polar_scope:{id:'aurora_polar_scope',name:'극광 편광경',campaignId:'aurora',tags:['story-item','tool','evidence','signal'],value:4,storyOnly:true},
  aurora_ice_probe:{id:'aurora_ice_probe',name:'빙핵 채취봉',campaignId:'aurora',tags:['story-item','tool','evidence'],value:4,storyOnly:true},
  aurora_shortwave_receiver:{id:'aurora_shortwave_receiver',name:'아날로그 단파수신기',campaignId:'aurora',tags:['story-item','signal','radio','evidence'],value:5,storyOnly:true},
  aurora_rescue_reel:{id:'aurora_rescue_reel',name:'구난 로프릴',campaignId:'aurora',tags:['story-item','tool','force','navigation'],value:4,storyOnly:true},
  aurora_heat_marker:{id:'aurora_heat_marker',name:'열표식 막대',campaignId:'aurora',tags:['story-item','navigation','signal'],value:3,storyOnly:true},

  masque_blank_mask:{id:'masque_blank_mask',name:'빈 배역가면',campaignId:'masque',tags:['story-item','charm','access','trade'],value:4,storyOnly:true},
  masque_mercury_lens:{id:'masque_mercury_lens',name:'수은 복원경',campaignId:'masque',tags:['story-item','tool','evidence'],value:4,storyOnly:true},
  masque_star_sand_map:{id:'masque_star_sand_map',name:'별모래 지도천',campaignId:'masque',tags:['story-item','navigation','evidence'],value:4,storyOnly:true},
  masque_stage_key:{id:'masque_stage_key',name:'무대 도르래키',campaignId:'masque',tags:['story-item','tool','access','force'],value:4,storyOnly:true},
  masque_prop_pouch:{id:'masque_prop_pouch',name:'소품 바꿔치기 주머니',campaignId:'masque',tags:['story-item','trade','tool'],value:3,storyOnly:true},
};
const PARALLEL_JOB_START_ITEMS={
  '시설기사':['echo_story_toolkit','echo_story_tester','echo_story_radio'],
  '야간 역무원':['echo_story_radio','echo_story_keyring'],
  '보안요원':['echo_story_keyring','echo_story_bar','echo_story_flashlight'],
  '심야 배달원':['echo_story_route_note','echo_story_scanner'],
  '민원 상담사':[],
  '응급구조사':['echo_story_medkit','echo_story_radio'],

  '룬 기사':['ember_rune_wedge'], '재의 마도사':['ember_ember_cup'], '성흔 추적자':['ember_blood_thread'],
  '왕묘 도굴꾼':['ember_grave_hook'], '백은 사제':['ember_silver_oil'], '검은 숲 사냥꾼':[],

  '고스트 해커':['neon_ghost_deck_story'], '증강 집행자':[], '기억 브로커':['neon_value_meter'],
  '드론 조종사':['neon_scout_drone'], '스트리트 메딕':['neon_nanopatch'], '데이터 사냥꾼':['neon_trace_jammer'],

  '심해 잠수사':['abyss_oxygen_reel'], '해양 생물학자':['abyss_bio_sampler'], '잠수정 기관사':['abyss_pressure_kit'],
  '소나 관측관':['abyss_sonar_pinger'], '해군 구조요원':[], '심해 의무관':['abyss_trauma_pack'],

  '시간 감식관':['clock_afterchalk'], '기계 시계공':['clock_gear_key'], '역행 검사':[],
  '예언 기록자':['clock_sealed_notebook'], '시간 밀수꾼':['clock_empty_minute_bottle'], '종소리 파수꾼':['clock_tower_pass'],

  '별사냥꾼':['wild_star_compass'], '숲의 주술사':['wild_tree_knot'], '야수 길잡이':['wild_calm_sachet'],
  '유성 대장장이':['wild_star_tongs'], '꿈의 방랑자':[], '별빛 치유사':['wild_healing_herbs'],

  '캔터베리 수호기사':['guardian_royal_seal_story'], '왕실 정찰병':['guardian_field_map'],
  '고대유적 연구원':['guardian_rune_scope_story'], '숲의 길잡이':[], '왕실 외교관':['guardian_royal_letter'],
  '야전 의무병':['guardian_field_medbag'],

  '극지 기상관':['aurora_polar_scope'], '빙하 지질학자':['aurora_ice_probe'],
  '단파 통신기사':['aurora_shortwave_receiver'], '설상 구조대원':['aurora_rescue_reel'],
  '설원 길잡이':['aurora_heat_marker'], '극지 의무연구원':[],

  '유랑 배우':['masque_blank_mask'], '가면 복원사':['masque_mercury_lens'],
  '사막 길잡이':['masque_star_sand_map'], '무대 장치공':['masque_stage_key'],
  '소품 도둑':['masque_prop_pouch'], '등불 수호자':[],
};
const PARALLEL_CAMPAIGN_SUPPLY_POOL={
  ember:['ember_rune_wedge','ember_ember_cup','ember_blood_thread','ember_grave_hook','ember_silver_oil'],
  neon:['neon_ghost_deck_story','neon_value_meter','neon_scout_drone','neon_nanopatch','neon_trace_jammer'],
  abyss:['abyss_oxygen_reel','abyss_bio_sampler','abyss_pressure_kit','abyss_sonar_pinger','abyss_trauma_pack'],
  clock:['clock_afterchalk','clock_gear_key','clock_sealed_notebook','clock_empty_minute_bottle','clock_tower_pass'],
  wild:['wild_star_compass','wild_tree_knot','wild_calm_sachet','wild_star_tongs','wild_healing_herbs'],
  guardian:['guardian_royal_seal_story','guardian_field_map','guardian_rune_scope_story','guardian_royal_letter','guardian_field_medbag'],
  aurora:['aurora_polar_scope','aurora_ice_probe','aurora_shortwave_receiver','aurora_rescue_reel','aurora_heat_marker'],
  masque:['masque_blank_mask','masque_mercury_lens','masque_star_sand_map','masque_stage_key','masque_prop_pouch'],
};

const PARALLEL_JOB_TAGS={
  '시설기사':['engineer','tool','circuit','maintenance'],
  '야간 역무원':['staff','authority','radio'],
  '보안요원':['security','key','force'],
  '심야 배달원':['courier','delivery','route'],
  '민원 상담사':['social','negotiation'],
  '응급구조사':['medical','rescue'],
};

function parallelStoryItemTagsFromName(name=''){
  const t=String(name);
  const tags=new Set(['story-item']);
  if(/키|열쇠|카드|배지|인장|권한|토큰|초대장/.test(t)) tags.add('key'), tags.add('access');
  if(/지도|나침반|항로|좌표|경로|스코프/.test(t)) tags.add('route'), tags.add('navigation');
  if(/무전|신호|소나|스캐너|전파|안테나/.test(t)) tags.add('signal'), tags.add('radio');
  if(/로그|기록|장부|데이터|메시지|증거|쪽지|명령서/.test(t)) tags.add('evidence'), tags.add('data');
  if(/약|구급|산소|회복|진주|씨앗/.test(t)) tags.add('medical');
  if(/검$|검날|검편|칼|폭파|무기|챔피언 파편|망치|고정봉/.test(t)) tags.add('force');
  if(/반지|부적|왕관|리본|목걸이|매듭/.test(t)) tags.add('charm');
  if(/공구|테스터|렌즈|도구/.test(t)) tags.add('tool');
  if(/시계|태엽|시간/.test(t)) tags.add('temporal');
  if(/캡슐|표본|별|핵|조각|씨앗|진주|뿔|파편|왕관/.test(t) || tags.size===1) tags.add('artifact');
  return [...tags];
}
function parallelStableItemId(campaignId,name){
  let h=2166136261;
  for(const ch of String(name)){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
  return `story_${campaignId}_${h.toString(36)}`;
}
function parallelRegisterCampaignStoryItems(){
  for(const campaign of CAMPAIGNS){
    if(campaign.id==='echo') continue;
    for(const node of Object.values(campaign.parallelStory?.nodes||{})){
      const name=String(node?.affordances?.item||'').trim();
      if(!name) continue;
      const id=parallelStableItemId(campaign.id,name);
      if(!PARALLEL_STORY_ITEM_DEFS[id]) PARALLEL_STORY_ITEM_DEFS[id]={
        id,name,campaignId:campaign.id,tags:parallelStoryItemTagsFromName(name),value:3,storyOnly:true
      };
    }
  }
}
parallelRegisterCampaignStoryItems();
function parallelCampaignSceneItem(campaign,node){
  const name=String(node?.affordances?.item||'').trim();
  if(!name) return null;
  const id=parallelStableItemId(campaign.id,name);
  return PARALLEL_STORY_ITEM_DEFS[id] || null;
}
function parallelItemUseKind(item,node){
  const tags=new Set(item?.tags||[]);
  const text=`${node?.title||''} ${node?.phase||''} ${node?.objective||''} ${(node?.text||[]).join(' ')} ${node?.affordances?.obstacle||''} ${node?.affordances?.clue||''} ${node?.affordances?.person||''}`;
  if(tags.has('access') && /문|잠금|봉인|관문|출입|격리|방벽|게이트|수용소|교실|요새|통로|코어/.test(text)) return 'access';
  if((tags.has('radio')||tags.has('signal')) && /신호|무전|방송|통신|전파|소나|관제|CCTV|전광판|서버|AI|드론|열차|선로|안테나|극광|자기장|송신|관측/.test(text)) return 'signal';
  if(tags.has('navigation') && /길|통로|숲|항로|선로|협곡|사막|경로|추적|지도|폐허|산|바다|빙하|설원|사구|극장|도시/.test(text)) return 'route';
  if((tags.has('evidence')||tags.has('data')) && (node?.affordances?.hasClue || /기록|단서|진실|증언|대화|협상|조사|원인/.test(text))) return 'evidence';
  if(tags.has('medical') && (node?.affordances?.hasRescue || /부상|다친|구조|환자|생존자|피난|산소|치료/.test(text))) return 'medical';
  if(tags.has('force') && (node?.affordances?.hasHostile || node?.affordances?.hasObstacle || /적|괴물|전투|방벽|문|장애|봉쇄/.test(text))) return 'force';
  if(tags.has('charm') && /망령|저주|마법|별|시간|기억|왕관|봉인|균열|정령|신수|가면|배역|공연|극장|월식|본명/.test(text)) return 'charm';
  if(tags.has('tool') && /장치|기계|설비|회로|문|잠금|서버|신호|장비|유적|격벽|배관|제단|대장간|관측|안테나|시추|빙핵|무대|도르래|가면|등불/.test(text)) return 'tool';
  if(tags.has('trade') && (node?.affordances?.hasPerson || /상인|브로커|귀족|부족|대표|주민|협상|거래|시장/.test(text))) return 'evidence';
  if(tags.has('temporal') && /시간|시계|루프|과거|미래|종|초침|기억/.test(text)) return 'artifact';
  if(tags.has('artifact') && String(node?.affordances?.item||'')===String(item?.name||'') && (node?.affordances?.hasClue||node?.affordances?.hasObstacle||node?.affordances?.hasPerson)) return 'artifact';
  return null;
}
function parallelItemRouteChoice(node,kind){
  const choices=node?.choices||[];
  const patterns={
    access:/우회|열|통과|들어|문|봉인/, signal:/듣|신호|분석|확인|기록|소나|방송/, route:/우회|간다|향한다|따라|길|추적/, evidence:/조사|확인|분석|묻|말|설득|기록/, medical:/돕|구조|보호|치료/, force:/싸|부수|돌파|막|연다/, charm:/확인|조사|말|봉인|진실/, tool:/분석|조사|열|우회|장치/, artifact:/확인|조사|분석|진실|봉인|대조/
  };
  return choices.find(c=>patterns[kind]?.test(String(c.label||''))) || choices[0] || null;
}
function parallelStoryItem(id){ return PARALLEL_STORY_ITEM_DEFS[id] || null; }
const PARALLEL_ITEM_CAMPAIGN_USE={
  ember:'왕가의 봉인·서약·증언·망령과 관련된 장면에서 빛을 발합니다.',
  neon:'데이터·보안망·기억 거래·감시 장치가 실제로 있는 장면에서 사용할 수 있습니다.',
  abyss:'산소·압력·소나·격벽·구조 대상이 있는 심해 장면에서 유용합니다.',
  clock:'시계·루프·시간 흔적·보존된 기록이 있는 장면에서 사용할 수 있습니다.',
  wild:'숲의 길·정령·짐승·별빛 생태와 직접 상호작용할 때 사용할 수 있습니다.',
  guardian:'지역 이동·유적·왕실 권한·동료 구조처럼 여행 중 생기는 실제 문제에 사용합니다.',
  echo:'역무 설비·잠금 장치·무전·신호·구조처럼 현실적인 지하철 상황에서만 사용할 수 있습니다.',
  aurora:'극지 관측·구조·통신·빙하 조사 현장에서 실제 장비가 필요한 상황에 사용합니다.',
  masque:'가면·무대·사막 이동·공연 기록과 이름의 규칙을 다루는 상황에 사용합니다.'
};
const PARALLEL_STORY_ITEM_LORE={
  echo_story_toolkit:'절연 손잡이가 달린 드라이버, 니퍼, 접점 집게를 한 주머니에 묶은 역 시설용 공구 세트다. 전기가 완전히 내려가지 않은 설비를 급히 점검하거나 배선과 패널을 손볼 때 역 시설팀이 들고 다닌다.',
  echo_story_tester:'전선이나 배전함에 대면 전압과 회로 연결 상태를 작은 표시창으로 보여 주는 휴대 계측기다. 겉보기에는 멀쩡한 설비가 실제로 살아 있는지 확인할 때 쓰인다.',
  echo_story_flashlight:'역무원과 보안 인력이 야간 점검 때 쓰는 긴 손전등이다. 좁은 점검구와 선로 가장자리까지 비추도록 빛이 멀리 뻗고, 바닥에 세워 비상등처럼 사용할 수도 있다.',
  echo_story_battery:'역 안의 휴대 장비에 공통으로 들어가는 예비 건전지 묶음이다. 오래된 무전기나 손전등이 갑자기 꺼졌을 때 몇 분이라도 더 버티게 해 주는 소모품이다.',
  echo_story_radio:'역무원끼리 승강장, 역무실, 시설실 상황을 주고받는 업무용 무전기다. 일반 휴대전화가 잡히지 않는 지하 구역에서도 역 내부 중계기를 통해 짧은 음성 연락을 주고받을 수 있다.',
  echo_story_scanner:'여러 주파수를 빠르게 훑어 현재 송신 중인 채널을 찾아내는 소형 스캐너다. 정해진 채널표가 없을 때도 누군가 보내는 전파나 반복 신호를 잡아낼 수 있다.',
  echo_story_keyring:'직원 전용문과 간단한 설비함에 쓰이는 여러 열쇠가 번호표와 함께 묶여 있다. 어떤 열쇠가 어느 문 것인지는 오래 근무한 직원들이 번호만 보고도 구분한다.',
  echo_story_master_key:'비상 시 여러 직원 구역을 한 번에 열 수 있도록 역장이 보관하는 공용 열쇠다. 평소에는 봉인된 보관함에 들어가 있으며 분실 시 전 구역 잠금 교체가 필요할 정도로 중요한 물건이다.',
  echo_story_keycard:'보안실, CCTV실, 일부 기계실의 전자 잠금을 해제하는 직원용 출입 카드다. 카드 안에는 발급 부서와 권한 단계가 기록되어 있어 리더기에 접촉하면 출입 기록도 남는다.',
  echo_story_signal_key:'고장 난 신호 설비를 수동 복구 모드로 전환할 때 꽂는 금속 키다. 일반 직원은 만질 일이 거의 없고, 신호 담당자가 점검이나 비상 복구 때만 사용한다.',
  echo_story_access_token:'오래된 점검 설비에서 직원 인증 대신 쓰던 금속 토큰이다. 신형 카드 시스템으로 바뀐 뒤 대부분 폐기됐지만 일부 구형 장치에는 아직 이 규격이 남아 있다.',
  echo_story_locker_token:'327번 보관함의 기계식 잠금을 여는 작은 황동 토큰이다. 분실물 보관 체계가 전산화되기 전부터 쓰이던 오래된 물건이라 지금은 거의 남아 있지 않다.',
  echo_story_medkit:'붕대, 소독제, 압박 패드, 기도 확보 도구가 들어 있는 휴대용 응급 가방이다. 구급대가 도착하기 전 출혈과 쇼크를 막는 데 필요한 기본 처치품이 한 세트로 들어 있다.',
  echo_story_water:'역 자판기에서 흔히 파는 생수 한 병이다. 특별한 장비는 아니지만 오래 걷거나 긴장으로 탈수된 사람에게는 생각보다 중요한 물건이 된다.',
  echo_story_bar:'셔터가 내려오거나 비상문이 닫힐 때 틈을 고정하기 위해 쓰는 두꺼운 금속 봉이다. 정비 중 문이 갑자기 움직이지 않도록 받쳐 두는 용도로 제작됐다.',
  echo_story_route_note:'배달원이 손으로 적어 둔 심야 배송 동선 메모다. 직원 통로, 엘리베이터, 일반인이 모르는 지름길이 짧은 기호와 시간표로 정리되어 있다.',
  echo_story_parcel:'수취 장소가 ‘0번 승강장’으로 적힌 밀봉 배송 상자다. 보통 역 주소 표기와 형식이 다르고, 발신인 정보도 제대로 남아 있지 않아 내용물보다 배송 기록 자체가 수상하다.',
  echo_story_future_drive:'아직 기록되지 않았어야 할 시간대의 CCTV와 운행 로그가 저장된 소형 저장장치다. 파일 시간 정보가 현재 시각보다 앞서 있어 정상적인 장비로는 설명하기 어렵다.',
  echo_story_zero_ticket:'노선도에도 없는 0번 승강장이 인쇄된 낡은 승차권이다. 종이 재질과 인쇄 방식은 오래됐지만 날짜 부분만 현재 시각에 맞춰 선명하게 찍혀 있다.',
  echo_story_root_key:'역의 운행 경로를 직접 지정하던 구형 제어 장치의 핵심 키다. 정상 노선과 점검선을 구분하는 물리적 설정을 바꿀 수 있어 오래전부터 일반 직원의 접근이 금지됐다.',

  ember_rune_wedge:'왕실 석문과 제단에 새겨진 룬 홈에 끼우는 검은 금속 쐐기다. 왕가의 장인들이 봉인 상태를 고정하거나 잠깐 해제할 때 사용했으며, 표면에는 왕실 문장과 오래된 서약문이 새겨져 있다.',
  ember_ember_cup:'바닥에 남은 재와 불씨를 담아 색과 연기의 변화를 읽는 작은 은잔이다. 궁정 마도사들은 화재인지 주술인지, 혹은 망령이 지나간 흔적인지를 구분할 때 이 잔을 사용했다.',
  ember_blood_thread:'성흔에 반응하도록 축성된 가느다란 은실이다. 피나 오래된 맹세의 흔적 가까이 가져가면 미세하게 당겨지는 성질이 있어 실종자나 서약의 흔적을 추적하는 데 쓰인다.',
  ember_grave_hook:'왕묘 관리인들이 무너진 석관 뚜껑과 좁은 납골실 문을 당겨 여는 데 쓰던 짧은 갈고리다. 두꺼운 줄과 결합하면 사람이 들어가기 어려운 틈의 물건도 끌어낼 수 있다.',
  ember_silver_oil:'백은 가루와 성유를 섞어 만든 사제용 기름이다. 상처를 씻거나 제단과 무기에 바르면 망령의 냉기와 사악한 잔재가 가까이 있을 때 표면이 희미하게 빛난다.',

  neon_ghost_deck_story:'외부망과 물리적으로 끊긴 보안 장치에 직접 연결하도록 만든 불법 침투 단말기다. 케이블을 꽂으면 내부 메모리와 권한 구조를 로컬에서 분석할 수 있어 고스트 해커들이 흔적을 남기지 않으려 할 때 사용한다.',
  neon_value_meter:'기억 조각과 데이터 계약의 진위, 복제 횟수, 암시장 시세를 빠르게 비교해 주는 손바닥 크기의 감정 장치다. 브로커들은 거래 전에 캡슐을 여기에 대어 위조 여부와 가치부터 확인한다.',
  neon_scout_drone:'손바닥보다 조금 큰 접이식 정찰드론이다. 좁은 환기구와 위험 구역을 먼저 날아다니며 영상과 거리 정보를 조종자에게 보내도록 설계됐다.',
  neon_nanopatch:'상처 위에 붙이면 미세 섬유가 피부를 조이고 출혈을 막는 일회용 의료 패치 세트다. 거리 메딕들은 병원에 갈 수 없는 사람의 응급 처치에 이걸 자주 사용한다.',
  neon_trace_jammer:'근처 위치 태그와 추적 비콘에 짧은 잡음을 뿌려 신호를 흐리게 만드는 휴대 장치다. 완전히 흔적을 지우지는 못하지만 추적자의 위치 계산을 잠시 틀리게 만들 수 있다.',

  abyss_oxygen_reel:'얇은 산소 호스와 소형 보조 탱크가 릴에 감겨 있는 비상 호흡 장비다. 주 호흡선이 끊겼을 때 대원 한두 명이 가까운 격벽이나 잠수정까지 이동할 시간을 벌어 준다.',
  abyss_bio_sampler:'물이나 점액, 조직을 오염 없이 채취해 밀봉하는 심해 연구용 샘플러다. 끝부분의 작은 흡입관으로 위험한 생물에 직접 손대지 않고도 시료를 얻을 수 있다.',
  abyss_pressure_kit:'고압 배관과 잠수정 외벽을 임시로 손볼 수 있는 렌치, 실링 패치, 압력 게이지가 들어 있는 정비 키트다. 누수와 균열을 완전히 고치기보다는 붕괴까지의 시간을 벌기 위한 장비다.',
  abyss_sonar_pinger:'짧은 음파를 발사하고 돌아오는 반향을 작은 화면에 표시하는 휴대 소나 장비다. 시야가 거의 없는 심해에서 벽의 거리, 빈 통로, 움직이는 물체의 방향을 확인하기 위해 사용한다.',
  abyss_trauma_pack:'저체온, 감압 손상, 심한 출혈에 대응하도록 압박 붕대와 보온제, 자동 주입기가 들어 있는 심해용 응급키트다. 일반 구급가방보다 밀폐와 방수에 특화되어 있다.',

  clock_afterchalk:'바닥이나 벽에 선을 그어 두면 시간이 되감겨도 희미한 잔상이 남는 특수 분필이다. 시간 감식관들은 반복된 공간에서 이전 루프와 현재 위치를 비교할 때 이 흔적을 기준으로 삼는다.',
  clock_gear_key:'시계탑 내부의 태엽 장치와 오래된 자동문을 조정하는 정밀 키다. 끝부분 톱니가 여러 단계로 변형되어 하나의 키로 다양한 크기의 태엽축을 돌릴 수 있다.',
  clock_sealed_notebook:'적은 글자가 시간이 되감겨도 쉽게 사라지지 않도록 특수 잉크와 봉인지를 사용한 기록 노트다. 예언 기록자들은 반복되는 하루에서 반드시 다음 루프까지 남겨야 할 사실을 여기에 적는다.',
  clock_empty_minute_bottle:'안쪽이 은빛 막으로 코팅된 작은 유리병이다. 시간 밀수꾼들은 특정 순간의 잔향을 잠시 가둬 두었다가 거래하거나 다른 장소에서 풀어내기 위해 이런 병을 사용한다.',
  clock_tower_pass:'종탑 관리인에게 지급되는 황동 순찰패다. 일반 시민이 들어갈 수 없는 계단과 기계실을 드나들 수 있다는 신분 표식이자, 야간 순찰 기록을 남기는 표찰이기도 하다.',

  wild_star_compass:'자기 북쪽이 아니라 하늘의 별흔과 숲의 미세한 빛을 따라 바늘이 움직이는 나침반이다. 별사냥꾼들은 길이 사라지는 깊은 숲에서 밤하늘이 보이지 않아도 방향을 잡기 위해 사용한다.',
  wild_tree_knot:'서로 다른 나무껍질 끈을 특정 순서로 묶어 만든 주술 매듭이다. 숲의 주술사들은 나무의 상처나 오래된 수목령 앞에 걸어 두고 바람과 떨림의 변화를 읽어 숲의 반응을 살핀다.',
  wild_calm_sachet:'달콤한 수액, 말린 별꽃, 짐승이 익숙해하는 약초를 넣은 향낭이다. 길잡이들은 놀란 야수에게 사람 냄새를 덜 자극적으로 느끼게 하거나 부상한 동물을 진정시키는 데 쓴다.',
  wild_star_tongs:'유성에서 떨어진 금속을 집어 올릴 수 있도록 끝부분이 두껍게 보강된 대장장이 집게다. 뜨겁거나 마력이 남은 별철을 맨손으로 건드리지 않고 옮기고 가공할 때 사용한다.',
  wild_healing_herbs:'별빛을 오래 받은 약초를 말려 작은 가죽낭에 넣어 둔 치료 재료다. 짓이겨 상처에 붙이거나 뜨거운 물에 우려 마시면 통증과 열을 가라앉히는 데 도움이 된다.',

  guardian_royal_seal_story:'캔터베리 왕실이 긴급 명령에 사용하는 작은 금속 인장이다. 경비대와 지방 관리에게 왕실의 공식 권한을 증명할 때 사용되며, 전쟁 중에는 피난로와 보급 창고를 열도록 명령하는 표식이 된다.',
  guardian_field_map:'캔터베리 주변의 숲길, 옛 성벽, 군용 보급로가 손으로 표시된 접이식 야전지도다. 일반 지도에 없는 정찰대 길과 위험 구역이 메모되어 있어 이동 계획을 짤 때 유용하다.',
  guardian_rune_scope_story:'유적 표면의 희미한 마력 흔적과 지워진 룬을 확대해 보는 단안경이다. 연구원들은 오래된 문양이 장식인지 실제 장치의 일부인지 구분하기 위해 렌즈를 여러 겹 돌려 맞춘다.',
  guardian_royal_letter:'왕실 봉인이 찍힌 긴급 서신이다. 각 지역의 관리와 동맹 세력에게 지원을 요청하거나 왕실의 의도를 설명하기 위해 작성된 공식 문서라 함부로 개봉하거나 위조하기 어렵다.',
  guardian_field_medbag:'전투 중 기사와 민간인을 급히 치료하기 위한 붕대, 소독약, 지혈끈, 진통제가 들어 있는 야전 구급낭이다. 무겁지 않아 이동하면서도 응급 처치를 할 수 있게 구성되어 있다.',
  aurora_polar_scope:'적색 극광이 내는 여러 방향의 빛을 겹쳐 보도록 만든 두꺼운 편광 관측경이다. 기상관들은 눈으로는 한 덩어리처럼 보이는 극광을 층별로 나누고, 자기폭풍이 어느 방향에서 번지는지 읽을 때 사용한다.',
  aurora_ice_probe:'빙하 깊은 층을 깨뜨리지 않고 길쭉한 얼음 시료를 뽑아내는 채취봉이다. 손잡이에는 층의 깊이와 온도를 기록하는 눈금이 붙어 있어 오래된 기포와 광물 띠가 언제 생겼는지 현장에서 바로 비교할 수 있다.',
  aurora_shortwave_receiver:'디지털 중계망과 독립적으로 작동하는 낡은 단파 수신기다. 주파수 다이얼을 손으로 돌려 먼 기지의 송신이나 수십 년 전 방식의 비상 방송을 잡아내며, 배터리와 안테나만 살아 있으면 통신망이 끊겨도 소리를 들을 수 있다.',
  aurora_rescue_reel:'얼음벽과 크레바스 구조용 강선 로프가 자동 감김 장치에 들어 있는 장비다. 구조대원이 허리 고리에 걸고 사용하며, 눈보라 속에서 사람을 끌어올리거나 미끄러운 경사를 안전하게 건널 때 몸을 고정한다.',
  aurora_heat_marker:'눈 속에서도 몇 시간 동안 붉은 열을 내는 극지용 표식 막대다. 길이 묻히는 설원에서 돌아갈 방향을 남기거나, 구조 대상의 위치를 멀리서 식별하도록 일정 간격으로 꽂아 둔다.',
  masque_blank_mask:'아직 어떤 배역의 표정도 새기지 않은 흰 목제 가면이다. 나실라트의 배우들은 첫 공연 전 이 가면을 쓰고 자신의 이름을 잠시 내려놓으며, 이후 맡게 된 역할에 맞춰 색과 문양을 더한다.',
  masque_mercury_lens:'가면 표면의 덧칠과 균열 아래를 비춰 보는 작은 은빛 렌즈다. 복원사들은 수은을 입힌 얇은 유리판을 기울여 오래된 안료층과 지워진 배우의 서명을 찾아낸다.',
  masque_star_sand_map:'밤하늘의 별자리와 사구의 높낮이를 금실로 수놓은 검은 천 지도다. 모래바람 때문에 길이 매일 바뀌는 사막에서 천을 별빛에 맞춰 펼치면 다음 우물과 폐허의 방향을 잡을 수 있다.',
  masque_stage_key:'대형 원형극장의 도르래와 무대문을 돌리는 굵은 황동 키다. 무대 장치공은 이 키를 축에 꽂아 커튼, 승강판, 지하 통로를 움직이며 공연 중에도 장치를 손으로 복구할 수 있다.',
  masque_prop_pouch:'바닥이 두 겹으로 된 배우용 소품 주머니다. 겉칸에는 동전과 작은 소품을, 안쪽 숨은 칸에는 바꿔치기할 가면 조각이나 쪽지를 넣을 수 있어 오래된 유랑극단과 소매치기 모두 애용한다.',

};
function parallelStoryItemDescription(item){
  if(!item) return '';
  if(PARALLEL_STORY_ITEM_LORE[item.id]) return PARALLEL_STORY_ITEM_LORE[item.id];
  const tags=new Set(item.tags||[]); const n=String(item.name||'이 물건');
  if(tags.has('medical')) return `${n}은(는) 현장에서 부상자나 지친 사람을 응급 처치하기 위해 챙기는 휴대 의료품이다.`;
  if(tags.has('access')||tags.has('key')||tags.has('master_key')||tags.has('keycard')) return `${n}은(는) 특정 문이나 설비를 열 수 있도록 발급되거나 제작된 출입용 물건이다.`;
  if(tags.has('signal')||tags.has('radio')) return `${n}은(는) 눈에 보이지 않는 신호를 듣거나 보내기 위해 사용하는 휴대 통신 장비다.`;
  if(tags.has('navigation')||tags.has('route')) return `${n}은(는) 익숙하지 않은 장소에서 길과 위치를 파악하기 위해 사용하는 이동 보조 물건이다.`;
  if(tags.has('evidence')||tags.has('data')) return `${n}은(는) 현장에서 얻은 기록이나 흔적을 보관하고 다른 정보와 비교하기 위한 물건이다.`;
  if(tags.has('force')) return `${n}은(는) 무거운 장치나 장애물을 다루기 위해 현장 작업자가 사용하는 튼튼한 도구다.`;
  if(tags.has('charm')||tags.has('artifact')||tags.has('temporal')) return `${n}은(는) 이 세계의 특수한 현상과 관련되어 전승이나 전문 작업에 사용되는 물건이다.`;
  return `${n}은(는) 이 세계의 사람들이 특정 작업을 위해 실제로 휴대하거나 거래하는 물건이다.`;
}
function parallelStoryItemUsableWhen(item){
  // Internal scene matching still uses tags. This text is intentionally no longer exposed as a game-rule description.
  return '';
}
function parallelStartItemsFor(player){ return [...(PARALLEL_JOB_START_ITEMS[player?.job?.name]||[])]; }
function parallelStoryItems(room,player){
  const ps=parallelPlayerState(room,player);
  if(!ps) return [];
  ps.items = Array.isArray(ps.items) ? [...new Set(ps.items.filter(id=>PARALLEL_STORY_ITEM_DEFS[id]))] : parallelStartItemsFor(player);
  return ps.items;
}
function parallelHasStoryItem(room,player,id){ return parallelStoryItems(room,player).includes(id); }
function parallelGrantStoryItem(room,player,id){
  if(!parallelStoryItem(id)) return false;
  const items=parallelStoryItems(room,player);
  if(items.includes(id)) return false;
  items.push(id); parallelPlayerState(room,player).items=items; return true;
}
function parallelConsumeStoryItem(room,player,id){
  const items=parallelStoryItems(room,player); const idx=items.indexOf(id);
  if(idx<0) return false; items.splice(idx,1); parallelPlayerState(room,player).items=items; return true;
}
function parallelPlayerTags(room,player){
  const ps=parallelPlayerState(room,player);
  const world=room?.parallel?.worldFlags || {};
  const tags=new Set([...(PARALLEL_JOB_TAGS[player?.job?.name]||[])]);
  for(const id of parallelStoryItems(room,player)) for(const tag of (parallelStoryItem(id)?.tags||[])) tags.add(String(tag));
  for(const id of (player?.inventory||[])){
    const lower=String(id||'').toLowerCase();
    if(lower.includes('radio')) tags.add('radio');
    if(lower.includes('key')) tags.add('key');
    if(lower.includes('med')) tags.add('medical');
    if(lower.includes('tool')||lower.includes('tester')||lower.includes('flash')) tags.add('tool');
  }
  if(world.master_key) tags.add('master_key'), tags.add('key');
  if(world.future_item) tags.add('parcel');
  if(ps?.flags?.locker327 || ps?.flags?.locker327_open) tags.add('locker_token'), tags.add('key');
  return tags;
}
function parallelChoiceVisible(room,campaign,player,choice,node=null){
  if(!choice) return false;
  const ps=parallelPlayerState(room,player); const tags=parallelPlayerTags(room,player); const world=room?.parallel?.worldFlags||{};
  const list=v=>Array.isArray(v)?v:(v==null||v==='')?[]:[v];
  const reqJobs=list(choice.requiredJobs||choice.requiredJob); if(reqJobs.length&&!reqJobs.includes(player?.job?.name)) return false;
  const reqTags=list(choice.requiredTags||choice.requiredTag); if(reqTags.some(tag=>!tags.has(String(tag)))) return false;
  const anyTags=list(choice.requiredAnyTag||choice.requiredAnyTags); if(anyTags.length&&!anyTags.some(tag=>tags.has(String(tag)))) return false;
  const forbid=list(choice.forbiddenTags||choice.forbiddenTag); if(forbid.some(tag=>tags.has(String(tag)))) return false;
  const reqItems=list(choice.requiredItems||choice.requiredItem); if(reqItems.some(id=>!parallelHasStoryItem(room,player,id))) return false;
  const reqFlags=list(choice.requiredFlags||choice.requiredFlag); if(reqFlags.some(flag=>!ps?.flags?.[flag])) return false;
  const reqWorld=list(choice.requiredWorldFlags||choice.requiredWorldFlag); if(reqWorld.some(flag=>!world?.[flag])) return false;
  const anyWorld=list(choice.requiredAnyWorldFlag||choice.requiredAnyWorldFlags); if(anyWorld.length&&!anyWorld.some(flag=>world?.[flag])) return false;
  const hideFlags=list(choice.hideIfFlags||choice.hideIfFlag); if(hideFlags.some(flag=>ps?.flags?.[flag])) return false;
  if(Number.isFinite(Number(choice.minClockTick)) && Number(room.parallel?.clockTick||0)<Number(choice.minClockTick)) return false;
  if(Number.isFinite(Number(choice.maxClockTick)) && Number(room.parallel?.clockTick||0)>Number(choice.maxClockTick)) return false;
  if(Number(choice.costCoins||0)>Number(player?.coins||0)) return false;
  return true;
}
function parallelAddAcquisitionChoices(room,campaign,player,node){
  if(campaign?.id!=='echo') return [];
  const ps=parallelPlayerState(room,player); if(!ps||!node) return [];
  const tags=parallelPlayerTags(room,player); const world=room.parallel?.worldFlags||{}; const loc=ps.location||node.location; const out=[];
  const add=c=>out.push({kind:c.kind||'parallel-base',path:c.path||statPath(c.stat||'지혜'),choiceBadge:c.choiceBadge||'아이템',automatic:c.automatic!==false,...c});
  if(loc==='concourse'){
    if(!parallelHasStoryItem(room,player,'echo_story_water') && Number(player.coins||0)>=1) add({id:'shop:water',label:'자판기에서 생수를 산다',stat:'매력',dc:7,next:'concourse',costCoins:1,grantItem:'echo_story_water',success:'자판기에서 생수를 한 병 뽑았다.',choiceBadge:'구매'});
    if(!parallelHasStoryItem(room,player,'echo_story_battery') && Number(player.coins||0)>=1) add({id:'shop:battery',label:'자판기에서 건전지를 산다',stat:'지능',dc:7,next:'concourse',costCoins:1,grantItem:'echo_story_battery',success:'비상용 건전지를 확보했다.',choiceBadge:'구매'});
    if((world.public_call||ps.flags?.missing_passenger) && parallelHasStoryItem(room,player,'echo_story_water') && !parallelHasStoryItem(room,player,'echo_story_access_token')) add({id:'barter:cleaner',label:'청소원과 물물교환한다',stat:'매력',dc:7,next:'concourse',consumeItem:'echo_story_water',grantItem:'echo_story_access_token',success:'생수를 건네고 오래된 점검 토큰을 받았다. 직원용 설비 일부가 이 토큰에 반응한다.',choiceBadge:'물물교환'});
  }
  if(loc==='service'){
    if(!parallelHasStoryItem(room,player,'echo_story_flashlight')&&!ps.flags?.picked_flashlight) add({id:'pickup:flashlight',automatic:false,label:'바닥의 손전등을 줍는다',stat:'지혜',dc:7,next:'service',grantItem:'echo_story_flashlight',flag:'picked_flashlight',success:'벽 아래 굴러간 점검용 손전등을 주웠다.',failure:'손전등은 찾았지만 켜지지 않는다. 배터리를 바꾸면 쓸 수 있을 것 같다.',choiceBadge:'줍기'});
    if(!parallelHasStoryItem(room,player,'echo_story_battery')&&!ps.flags?.picked_battery) add({id:'pickup:battery',automatic:false,label:'공구함에서 건전지를 찾는다',stat:'지능',dc:8,next:'service',grantItem:'echo_story_battery',flag:'picked_battery',success:'공구함 안쪽에서 밀봉된 예비 건전지를 찾았다.',failure:'건전지는 하나뿐이고 상태가 좋지 않다. 그래도 한 번은 쓸 수 있다.',choiceBadge:'탐색 획득'});
  }
  if(loc==='maintenance'){
    if((tags.has('access_token')||tags.has('keycard')||tags.has('master_key'))&&!parallelHasStoryItem(room,player,'echo_story_tester')) add({id:'cabinet:tester',label:'점검 캐비닛을 연다',stat:'지능',dc:7,next:'maintenance',grantItem:'echo_story_tester',success:'점검 토큰이 승인되며 회로 테스터가 든 캐비닛이 열렸다.',choiceBadge:'아이템 해금'});
  }
  if(loc==='office'){
    if(tags.has('authority')&&!parallelHasStoryItem(room,player,'echo_story_master_key')) add({id:'legal:masterkey',label:'키 보관함을 연다',stat:'지혜',dc:7,next:'office',grantItem:'echo_story_master_key',success:'직원 권한으로 비상 마스터키를 꺼냈다.',choiceBadge:'직업 권한'});
    if(!tags.has('authority')&&tags.has('tool')&&!parallelHasStoryItem(room,player,'echo_story_master_key')&&!ps.flags?.stole_master_key) add({id:'steal:masterkey',automatic:false,label:'키 보관함을 몰래 연다',stat:'민첩',dc:10,next:'office',grantItem:'echo_story_master_key',flag:'stole_master_key',worldFlag:'theft_recorded',threatDelta:2,success:'잠금 장치를 건드려 마스터키를 가져왔다. CCTV 기록에는 이 행동이 남았다.',failure:'보관함은 열었지만 경보 기록도 함께 남았다.',choiceBadge:'훔치기'});
  }
  if(loc==='platform1'){
    if(tags.has('medical')&&!parallelHasStoryItem(room,player,'echo_story_keycard')&&!world.rescued_passenger) add({id:'rescue:keycard',automatic:false,label:'쓰러진 사람을 치료한다',stat:'체력',dc:8,next:'platform1',grantItem:'echo_story_keycard',worldFlag:'rescued_passenger',heal:1,success:'호흡을 안정시키자 그는 시설팀 보안카드를 건넸다. “신호실 문에 이게 필요할 겁니다.”',failure:'의식은 돌아왔고 보안카드를 건네받았지만 환자는 움직이기 어렵다.',choiceBadge:'구조 보상'});
  }
  if(loc==='lostfound'){
    if((tags.has('locker_token')||tags.has('keycard')||tags.has('master_key')||tags.has('tool'))&&!parallelHasStoryItem(room,player,'echo_story_future_drive')) add({id:'locker:future',automatic:false,label:'327번 보관함을 연다',stat:'지능',dc:8,next:'lostfound',grantItem:'echo_story_future_drive',flag:'locker327_open',worldFlag:'evidence',success:'327번 안에서 아직 생성되지 않은 CCTV 파일이 든 저장장치를 확보했다.',failure:'잠금은 풀었지만 파일 일부가 깨져 있다. 그래도 시간 정보는 남았다.',choiceBadge:'아이템 해금'});
    if(!parallelHasStoryItem(room,player,'echo_story_keycard')&&tags.has('tool')&&!ps.flags?.stole_keycard) add({id:'steal:keycard',automatic:false,label:'보관된 보안카드를 챙긴다',stat:'민첩',dc:9,next:'lostfound',grantItem:'echo_story_keycard',flag:'stole_keycard',worldFlag:'theft_recorded',threatDelta:1,success:'분실물 봉투에서 보안카드를 빼냈다. 당장은 쓸 수 있지만 기록에는 남는다.',failure:'카드는 얻었지만 봉투 훼손 흔적을 감출 수 없었다.',choiceBadge:'훔치기'});
  }
  if(loc==='platform0'){
    if(!parallelHasStoryItem(room,player,'echo_story_zero_ticket')&&!ps.flags?.picked_zero_ticket) add({id:'pickup:zero-ticket',automatic:false,label:'빈 좌석의 승차권을 줍는다',stat:'지혜',dc:9,next:'platform0',grantItem:'echo_story_zero_ticket',flag:'picked_zero_ticket',success:'목적지가 없는 0번 승차권을 주웠다. 표면에는 현재 시간과 다른 시각이 번갈아 나타난다.',failure:'승차권을 집는 순간 열차 문이 한 번 닫혔다 열렸다. 표는 손에 남았다.',choiceBadge:'위험한 줍기'});
  }
  if(loc==='signal'){
    if(tags.has('signal_key')&&tags.has('circuit')&&!world.root_signal) add({id:'route:oldcontrol',label:'복구키로 폐쇄 제어실을 연다',stat:'지능',dc:7,next:'oldcontrol',success:'복구키와 회로 테스터가 동시에 반응하며 지도에 없던 제어실 문이 열렸다.',choiceBadge:'특수 루트'});
  }
  if(loc==='sealedroom' && !parallelHasStoryItem(room,player,'echo_story_root_key')) add({id:'pickup:rootkey',automatic:false,label:'루트 코어키를 회수한다',stat:'지능',dc:9,next:'sealedroom',grantItem:'echo_story_root_key',worldFlag:'root_key_found',success:'보관함에서 운행 루트 코어키를 꺼냈다. 정상 운행표와 0번 운행표를 모두 건드릴 수 있는 물건이다.',failure:'경보가 켜졌지만 코어키는 손에 넣었다.',choiceBadge:'핵심 아이템'});
  return out;
}
function parallelUniversalItemChoices(room,campaign,player,node){
  if(!campaign || campaign.id==='echo' || !node) return [];
  const ps=parallelPlayerState(room,player); if(!ps) return [];
  const out=[]; const sceneItem=parallelCampaignSceneItem(campaign,node); const aff=node.affordances||{};
  const add=c=>out.push({kind:c.kind||'parallel-base',path:c.path||statPath(c.stat||'지혜'),...c});
  const hasPerson=Boolean(aff.hasPerson||aff.person);
  const hasHostile=Boolean(aff.hasHostile||aff.hostile);
  const hasRescue=Boolean(aff.hasRescue||aff.rescue);
  const sceneText=`${node.title||''} ${node.objective||''} ${(node.text||[]).join(' ')} ${aff.person||''} ${aff.item||''}`;

  // Scene-authored items are obtained in ways that make sense for the current situation.
  if(sceneItem && !parallelHasStoryItem(room,player,sceneItem.id)){
    if(!hasPerson && !hasHostile){
      add({id:`pickup:${sceneItem.id}`,label:`${sceneItem.name}을 찾아 챙긴다`,stat:'지혜',dc:7,automatic:false,grantItem:sceneItem.id,
        success:`현장을 뒤져 ${sceneItem.name}을 확보했다. 맞는 장소에서 쓰면 일반 행동보다 훨씬 안전한 해결법이 열린다.`,
        failure:`${sceneItem.name}은 손에 넣었지만 찾는 동안 흔적과 시간을 남겼다.`,choiceBadge:'현장 획득'});
    }
    if(hasPerson && Number(player?.coins||0)>=Math.max(1,Math.min(3,Number(sceneItem.value||2)))){
      const price=Math.max(1,Math.min(3,Number(sceneItem.value||2)));
      add({id:`buy:${sceneItem.id}`,label:`${sceneItem.name}을 구매한다`,stat:'매력',dc:7,automatic:true,costCoins:price,grantItem:sceneItem.id,
        success:`코인 ${price}개를 내고 ${sceneItem.name}을 정식으로 넘겨받았다. 거래 기록 덕분에 이후 소유권을 문제 삼기 어렵다.`,choiceBadge:`구매 · ${price}코인`});
    }
    const barter=parallelStoryItems(room,player)
      .map(id=>parallelStoryItem(id)).filter(item=>item && item.id!==sceneItem.id && item.campaignId===campaign.id && Number(item.value||0)<=Number(sceneItem.value||3))
      .sort((a,b)=>Number(a.value||0)-Number(b.value||0))[0];
    if(hasPerson && barter){
      add({id:`barter:${sceneItem.id}:${barter.id}`,label:`${barter.name}과 물물교환한다`,stat:'매력',dc:8,automatic:false,consumeItem:barter.id,grantItem:sceneItem.id,
        success:`상대는 ${barter.name}의 쓰임을 알아보고 ${sceneItem.name}과 맞바꿨다. 돈 대신 이전 선택에서 얻은 물건이 새 길을 만들었다.`,
        failure:`교환 조건이 맞지 않았다. ${barter.name}은 잃지 않았지만 상대가 무엇을 원하는지는 알아냈다.`,choiceBadge:'물물교환'});
    }
    if(hasRescue && hasPerson){
      add({id:`reward:${sceneItem.id}`,label:`사람을 도와 ${sceneItem.name}을 부탁한다`,stat:'체력',dc:8,automatic:false,grantItem:sceneItem.id,
        success:`눈앞의 사람을 먼저 도운 대가로 ${sceneItem.name}을 넘겨받았다.`,
        failure:`도움은 줬지만 지금 당장 물건을 넘겨받지는 못했다. 대신 다음에 다시 부탁할 명분이 생겼다.`,choiceBadge:'구조 보상'});
    }
    // Theft only appears when an item is plausibly physically present and there is someone/something to hide it from.
    if((hasPerson||hasHostile) && /보관|장부|열쇠|키|배지|조각|표본|캡슐|장비|상인|브로커|연회|시장|초소|연구|보급|창고|가방|서랍|제단|수레|공방|극장|무대|관측소|시추|격납고/.test(sceneText)){
      add({id:`steal:${sceneItem.id}`,label:`${sceneItem.name}을 몰래 챙긴다`,stat:'민첩',dc:hasHostile?10:9,automatic:false,grantItem:sceneItem.id,threatDelta:1,
        success:`시선을 피해 ${sceneItem.name}을 확보했다. 물건은 얻었지만 누군가 없어졌다는 사실을 나중에 알아챌 수 있다.`,
        failure:`손을 뻗는 순간 경계가 높아졌다. 물건은 얻지 못했고 이 장소에서의 행동이 더 어려워졌다.`,choiceBadge:'훔치기'});
    }
  }

  // In addition to the scene's key item, one practical tool can surface through a context-appropriate acquisition route.
  const pool=(PARALLEL_CAMPAIGN_SUPPLY_POOL[campaign.id]||[]).filter(id=>!parallelHasStoryItem(room,player,id));
  if(pool.length){
    const actIndex=Math.max(0,Number(node.act||1)-1);
    const supplyId=pool[(actIndex + Number(ps.progress||0)) % pool.length];
    const supply=parallelStoryItem(supplyId);
    const guarded=/경비|검문|감시|봉쇄|수용소|경계|병사|추적|순찰|보안|경매/.test(sceneText);
    const cache=/창고|보급|연구실|정비|격납고|초소|여관|대장간|작업실|유적|캠프|폐허|사무실|관측소|시추|공방|극장|무대|분장실|등불회랑/.test(sceneText);
    const merchant=/상인|브로커|시장|행상|상점|경매|공방|거래|보급관|주민|대표/.test(sceneText);
    if(supply && merchant && Number(player?.coins||0)>=Math.max(1,Math.min(2,Number(supply.value||2)))){
      const price=Math.max(1,Math.min(2,Number(supply.value||2)));
      add({id:`supply-buy:${supply.id}:${ps.nodeId}`,label:`${supply.name}을 산다`,stat:'매력',dc:7,automatic:true,costCoins:price,grantItem:supply.id,
        success:`이 장소에서 실제로 취급하는 ${supply.name}을 코인 ${price}개에 샀다. 이후 맞는 상황에서만 전용 선택지가 열린다.`,choiceBadge:`도구 구매 · ${price}코인`});
    } else if(supply && hasPerson){
      const offer=parallelStoryItems(room,player).map(id=>parallelStoryItem(id)).filter(x=>x&&x.campaignId===campaign.id&&x.id!==supply.id).sort((a,b)=>Number(a.value||0)-Number(b.value||0))[0];
      if(offer) add({id:`supply-barter:${supply.id}:${offer.id}:${ps.nodeId}`,label:`${offer.name}과 ${supply.name}을 바꾼다`,stat:'매력',dc:8,automatic:false,consumeItem:offer.id,grantItem:supply.id,
        success:`상대가 ${offer.name}의 가치를 인정해 ${supply.name}과 교환했다.`,failure:'상대가 교환을 거절했다. 두 물건은 그대로 남았다.',choiceBadge:'도구 물물교환'});
    } else if(supply && cache && !guarded){
      add({id:`supply-find:${supply.id}:${ps.nodeId}`,label:`주변에서 ${supply.name}을 찾는다`,stat:'지혜',dc:8,automatic:false,grantItem:supply.id,
        success:`현장의 보급품과 잔해를 뒤져 ${supply.name}을 확보했다.`,failure:`도구는 찾았지만 상태를 확인하느라 시간을 썼다.`,choiceBadge:'도구 발견'});
    } else if(supply && cache && guarded){
      add({id:`supply-steal:${supply.id}:${ps.nodeId}`,label:`${supply.name}을 몰래 빼낸다`,stat:'민첩',dc:10,automatic:false,grantItem:supply.id,threatDelta:1,
        success:`감시가 느슨해진 순간 ${supply.name}을 빼냈다. 도구는 얻었지만 분실 사실이 뒤늦게 드러날 수 있다.`,failure:'감시에 걸릴 뻔해 손을 뗐다. 이 장소의 경계만 더 높아졌다.',choiceBadge:'도구 훔치기'});
    }
  }

  // Owned story tools only surface when the scene actually gives them something relevant to interact with.
  for(const id of parallelStoryItems(room,player)){
    const item=parallelStoryItem(id); if(!item || item.campaignId!==campaign.id) continue;
    const kind=parallelItemUseKind(item,node); if(!kind) continue;
    if(ps.flags?.[`used_${id}_${ps.nodeId}`]) continue;
    const route=parallelItemRouteChoice(node,kind); if(!route) continue;
    const target=aff.obstacle||aff.clue||aff.person||aff.hostile||'현재 문제';
    const labels={access:`${item.name}으로 ${target}을 연다`,signal:`${item.name}으로 신호를 확인한다`,route:`${item.name}으로 안전한 길을 잡는다`,evidence:`${item.name}을 현재 단서와 대조한다`,medical:`${item.name}으로 구조를 돕는다`,force:`${item.name}으로 ${target}을 돌파한다`,charm:`${item.name}의 반응을 확인한다`,tool:`${item.name}으로 ${target}을 다룬다`,artifact:`${item.name}을 현상에 시험한다`};
    add({id:`use:${id}:${ps.nodeId}`,label:labels[kind],stat:route.stat||'지능',dc:Math.max(7,Number(route.dc||9)-2),automatic:false,
      nextSuccess:route.nextSuccess||route.next?.success||route.next, nextFailure:route.nextFailure||route.next?.failure||route.nextSuccess||route.next,
      flag:`used_${id}_${ps.nodeId}`,choiceBadge:'스토리 도구',
      success:`${item.name}이 지금 상황에 정확히 맞았다. ${target}을 맨손으로 해결할 때보다 낮은 위험으로 처리했고, 그 방식 자체가 이후 기록에 남는다.`,
      failure:`${item.name}을 써도 완전히 해결되지는 않았다. 하지만 도구가 없었을 때보다 손실을 줄였고 다음 시도에 쓸 정보를 남겼다.`});
  }
  return out;
}

function parallelEchoCapabilityChoices(room,campaign,player,node){
  if(campaign?.id!=='echo') return [];
  const ps=parallelPlayerState(room,player); if(!ps||!node) return [];
  const tags=parallelPlayerTags(room,player); const loc=ps.location||node.location; const extra=[];
  const add=c=>extra.push({kind:'parallel-base',path:c.path||statPath(c.stat),choiceBadge:c.choiceBadge||'상황 대응',...c});
  if(tags.has('radio')&&['service','office','signal','concourse','track'].includes(loc)&&!ps.flags?.[`radio_scan_${loc}`]) add({id:`echo:radio:${loc}`,label:'무전 주파수를 듣는다',stat:'지혜',dc:8,next:loc==='track'?'signal':loc==='service'?'office':loc,success:'잡음 사이로 실제 동선과 겹치지 않는 한 문장이 잡혔다. 무전망이 역 안의 다른 경로를 가리킨다.',failure:'내용은 흐렸지만 같은 채널이 반복 송신되고 있음을 확인했다.',flag:`radio_scan_${loc}`,worldFlag:'radio_link',choiceBadge:'무전 장비'});
  if((tags.has('master_key')||tags.has('key')||tags.has('keycard'))&&loc==='platform0gate'&&!room.parallel?.worldFlags?.zero_gate_open) add({id:'echo:key:platform0',automatic:true,label:tags.has('master_key')?'마스터키로 0번 방화문을 연다':'열쇠로 0번 방화문을 연다',stat:'지혜',dc:7,next:'platform0',success:'잠금 장치가 해제되며 0번 방화문이 먼저 열렸다.',worldFlag:'zero_gate_open',flag:'used_key_platform0',choiceBadge:'열쇠 사용'});
  if((tags.has('tool')||tags.has('circuit'))&&['maintenance','signal','platform0gate','cctv'].includes(loc)&&!ps.flags?.[`diagnose_${loc}`]) add({id:`echo:tool:${loc}`,label:'장비로 설비를 진단한다',stat:'지능',dc:8,next:loc==='platform0gate'?'service':loc,success:'배선과 장치의 실제 연결이 드러나며 숨은 경로를 읽어냈다.',failure:'완전한 원인은 못 찾았지만 이상 설비가 어디와 이어지는지는 확인했다.',flag:`diagnose_${loc}`,worldFlag:loc==='signal'?'normal_signal':'evidence',choiceBadge:'장비 사용'});
  if(tags.has('medical')&&['platform1','concourse','track','exit'].includes(loc)&&!ps.flags?.[`medical_${loc}`]) add({id:`echo:medical:${loc}`,label:'구급가방으로 상태를 안정시킨다',stat:'체력',dc:8,next:loc,success:'호흡과 동선을 정리해 더 큰 혼란을 막았다.',failure:'완벽한 처치는 아니지만 당장 버틸 수 있을 만큼 상태를 붙잡았다.',flag:`medical_${loc}`,heal:1,choiceBadge:'응급 장비',path:'bond'});
  if(tags.has('bar')&&['exit','concourse','platform0gate'].includes(loc)&&!ps.flags?.[`brace_${loc}`]) add({id:`echo:brace:${loc}`,label:'고정봉으로 문을 버틴다',stat:'근력',dc:8,next:loc,success:'셔터와 문이 잠시 멈추며 다른 사람도 지나갈 시간을 벌었다.',failure:'완전 고정은 아니지만 닫히는 속도를 늦췄다.',flag:`brace_${loc}`,worldFlag:loc==='exit'?'exit_open':(loc==='concourse'?'gate_open':'zero_gate_open'),choiceBadge:'도구 사용',path:'survival'});
  if(tags.has('parcel')&&['platform0','signal','lostfound'].includes(loc)&&!ps.flags?.[`parcel_${loc}`]) add({id:`echo:parcel:${loc}`,label:'배송물의 수령 정보를 대조한다',stat:'지능',dc:8,next:loc==='lostfound'?'signal':loc,success:'배송지 표기가 현재 역사 구조와 어긋난다는 점이 단서가 되었다.',failure:'인쇄 일부만 읽혔지만 0번 경로와 연결된 주소라는 건 확실하다.',flag:`parcel_${loc}`,worldFlag:'evidence',choiceBadge:'소지품 활용'});
  if(tags.has('master_key')&&tags.has('keycard')&&loc==='office'&&!ps.flags?.sealed_room_found) add({id:'echo:sealed-room',label:'이중 잠금문을 연다',stat:'지능',dc:7,next:'sealedroom',success:'마스터키와 보안카드가 동시에 승인되며 폐쇄 점검실이 열렸다.',flag:'sealed_room_found',choiceBadge:'아이템 전용 루트'});
  if(tags.has('root_key')&&loc==='oldcontrol'&&!room.parallel?.worldFlags?.root_signal) add({id:'echo:root-route',label:'코어키로 두 운행표를 묶는다',stat:'지능',dc:10,next:'oldcontrol',success:'정상 첫차와 0번 운행표가 하나의 제어 화면에 잡혔다. 이제 어느 쪽도 일방적으로 역을 덮어쓰지 못한다.',worldFlag:'root_signal',choiceBadge:'핵심 아이템'});
  if(tags.has('evidence_drive')&&['signal','cctv'].includes(loc)&&!ps.flags?.future_drive_used) add({id:'echo:future-drive',label:'미래 기록을 대조한다',stat:'지능',dc:7,next:loc,success:'저장장치의 미래 타임코드와 현재 신호를 겹쳐 안전한 조작 순서를 찾아냈다.',flag:'future_drive_used',worldFlag:'evidence',choiceBadge:'단서 아이템'});
  if(tags.has('zero_ticket')&&loc==='platform0'&&Number(room.parallel?.clockTick||0)>=10) add({id:'ending:zero-passenger',label:'0번 승차권으로 열차에 탄다',stat:'지혜',dc:10,next:'train',success:'승차권이 개찰되자 빈 열차가 처음으로 목적지를 표시했다.',ending:'zero_passenger',choiceBadge:'비밀 엔딩'});
  if(room.parallel?.worldFlags?.root_signal&&room.parallel?.worldFlags?.normal_signal&&room.parallel?.worldFlags?.zero_sealed&&room.parallel?.worldFlags?.evidence&&loc==='oldcontrol') add({id:'ending:all-clear',label:'청명역 운행을 완전히 정상화한다',stat:'지능',dc:11,next:'train',success:'두 운행표의 충돌이 멈추고 역의 모든 시계가 같은 시간을 가리켰다.',ending:'all_clear',choiceBadge:'진엔딩 조건'});
  return extra;
}
function parallelApplyChoiceRewards(room,campaign,player,choice){
  if(!player||!choice) return [];
  const notes=[];
  const cost=Math.max(0,Number(choice.costCoins||0)); if(cost){ player.coins=Math.max(0,Number(player.coins||0)-cost); notes.push(`코인 -${cost}`); }
  const consume=[...(choice.consumeItems||[])]; if(choice.consumeItem) consume.push(choice.consumeItem);
  for(const id of consume) if(parallelConsumeStoryItem(room,player,id)) notes.push(`${parallelStoryItem(id)?.name||id} 사용`);
  const grants=[...(choice.grantItems||[])]; if(choice.grantItem) grants.push(choice.grantItem);
  for(const id of grants) if(parallelGrantStoryItem(room,player,id)) notes.push(`${parallelStoryItem(id)?.name||id} 획득`);
  const heal=Math.max(0,Number(choice.heal||0)); if(heal){ player.hp=Math.min(Number(player.maxHp||player.hp||0),Number(player.hp||0)+heal); notes.push(`HP +${heal}`); }
  const threat=Number(choice.threatDelta||0); if(threat){ room.threat=Math.max(0,Math.min(MAX_THREAT,Number(room.threat||0)+threat)); notes.push(`위협 ${threat>0?'+':''}${threat}`); }
  return notes;
}
function parallelTransferItem(room,from,to,itemId){
  if(!parallelHasStoryItem(room,from,itemId)) return false;
  if(!parallelConsumeStoryItem(room,from,itemId)) return false;
  parallelGrantStoryItem(room,to,itemId); return true;
}
function parallelEnabled(room,campaign=CAMPAIGNS.find(c=>c.id===room?.campaignId)){
  return Boolean(room?.parallel?.enabled && campaign?.parallelStory?.enabled);
}
function initializeParallelStory(room,campaign){
  const cfg=campaign?.parallelStory;
  if(!cfg?.enabled) return null;
  const playerStates={};
  for(const player of room.players){
    const nodeId=cfg.startByJob?.[player.job?.name] || cfg.startFallback;
    const node=cfg.nodes?.[nodeId] || cfg.nodes?.[cfg.startFallback];
    playerStates[player.id]={
      nodeId, location:node?.location || 'concourse', previousLocation:null, progress:0, history:[], flags:{}, items:parallelStartItemsFor(player), outcomeThreads:[], pathTotals:{truth:0,survival:0,bond:0},
      ended:false, ending:null, endingText:null, pendingTravel:null, support:0, lastPersonalResult:null,
    };
  }
  room.parallel={
    enabled:true, mode:'split-party', clockTick:0, clockStart:cfg.clockStart || '00:47', clockLimit:Number(cfg.clockLimit||30),
    playerStates, worldFlags:{}, links:{}, offers:{}, encounters:{}, incidentLog:[],
  };
  return room.parallel;
}
function parallelPlayerState(room,player){ return room?.parallel?.playerStates?.[player?.id] || null; }
function parallelNode(room,campaign,player){
  const ps=parallelPlayerState(room,player);
  return ps ? campaign?.parallelStory?.nodes?.[ps.nodeId] || null : null;
}
function parallelNearby(room,player){
  const ps=parallelPlayerState(room,player);
  if(!ps) return [];
  return (room.players||[]).filter(other=>other.id!==player.id && other.connected && other.hp>0 && !room.parallel.playerStates?.[other.id]?.ended && room.parallel.playerStates?.[other.id]?.location===ps.location);
}
function parallelLinked(room,a,b){ return room.parallel?.links?.[pairKey(a,b)] === 'together'; }
function parallelLinkedPlayers(room,player){ return (room.players||[]).filter(other=>other.id!==player.id && parallelLinked(room,player.id,other.id)); }
// v7.2.5: companionship is a connected group, not only a single pair.
// If A travels with B and B travels with C, all three must share the same current scene
// until an explicit split breaks the corresponding link.
function parallelLinkedGroup(room,player){
  if(!player) return [];
  const byId=new Map((room.players||[]).map(p=>[p.id,p]));
  const seen=new Set([player.id]);
  const queue=[player.id];
  while(queue.length){
    const id=queue.shift();
    for(const other of (room.players||[])){
      if(seen.has(other.id)||other.id===id) continue;
      if(parallelLinked(room,id,other.id)){ seen.add(other.id); queue.push(other.id); }
    }
  }
  return [...seen].map(id=>byId.get(id)).filter(Boolean);
}
function parallelLinkedGroupMates(room,player){ return parallelLinkedGroup(room,player).filter(p=>p.id!==player.id); }
function parallelLocationLabel(campaign,key){ return campaign?.parallelStory?.locations?.[key] || key || '알 수 없는 장소'; }
function parallelWorldSummary(room){
  const f=room.parallel?.worldFlags || {};
  const out=[];
  if(f.power_restored) out.push('비상등과 일부 개찰구가 다시 켜졌다.');
  if(f.blackout) out.push('역 전체가 한때 완전히 암전됐다.');
  if(f.public_call) out.push('역 전체 방송망에 사람의 목소리가 남았다.');
  if(f.radio_link) out.push('역무용 무전망에서 다른 사람의 신호가 잡힌다.');
  if(f.gate_open) out.push('대합실 개찰구 하나가 열린 채 고정돼 있다.');
  if(f.zero_gate_open) out.push('0번 승강장 방화문이 완전히 닫히지 않는다.');
  if(f.normal_signal) out.push('정상 첫차 신호가 우선권을 되찾았다.');
  if(f.zero_sealed) out.push('0번 운행 신호가 크게 약해졌다.');
  if(f.rescue_route) out.push('점검선과 대합실 사이 비상 구조 통로가 열렸다.');
  if(f.exit_open) out.push('1번 출구 셔터가 다른 사람도 통과할 수 있게 고정돼 있다.');
  if(f.evidence) out.push('0번 운행을 증명할 기록이 확보됐다.');
  if(Number(room.parallel?.clockTick||0)>=24) out.push('첫차 운행 준비 방송이 역 곳곳에서 시작됐다.');
  return out.slice(-5);
}
const PARALLEL_OUTCOME_VOICE={
  ember:{success:'당신의 선택은 하나의 증언이나 권리로 굳어졌다.',mixed:'원하는 것을 얻었지만 누군가 그 대가를 기억한다.',failure:'실패 자체가 정치적 약점이나 새로운 증언으로 남았다.'},
  neon:{success:'확보한 정보 우위가 다음 구역의 보안 패턴을 바꾼다.',mixed:'자료는 얻었지만 추적 흔적이나 거래 빚이 함께 남았다.',failure:'막힌 접근 경로가 오히려 누가 감시하고 있는지 드러냈다.'},
  abyss:{success:'확보한 시간과 자원이 다음 구역의 구조 가능성을 넓혔다.',mixed:'문제는 넘겼지만 산소·압력·부상 중 하나가 다음 장면으로 따라온다.',failure:'실패한 조작의 물리적 여파가 다른 통로나 구조 대상에 영향을 준다.'},
  clock:{success:'이번 루프에서 얻은 확실한 사실 하나가 다음 선택의 기준이 된다.',mixed:'결과는 얻었지만 다른 시간대에 작은 빚이 생겼다.',failure:'실패한 순간 자체가 다음 루프에서 사용할 수 있는 정보가 됐다.'},
  wild:{success:'숲은 행동을 받아들였고 주변 생물의 태도가 조금 달라졌다.',mixed:'길은 열렸지만 숲의 다른 존재가 그 변화를 감지했다.',failure:'거절당한 방식이 무엇을 싫어하는지 알려 주는 새로운 단서가 됐다.'},
  guardian:{success:'이 지역에서 만든 인연이나 통로가 다음 여정에 실제 자산으로 남았다.',mixed:'앞으로 나아갔지만 누군가에게 도움을 빚지거나 다른 길 하나를 포기했다.',failure:'막힌 길 때문에 다른 지역·사람과 연결되는 우회 여정이 생겼다.'},
  echo:{success:'역의 규칙 하나를 정확히 짚어 다음 이동에 사용할 수 있게 됐다.',mixed:'길은 열렸지만 문·신호·기록 중 하나에 이상 흔적이 남았다.',failure:'실패한 행동 덕분에 역이 어떤 조건에서 반응하는지 하나 더 알아냈다.'}
};
const PARALLEL_SCENE_COLOR={
  ember:['재 냄새 속에서 갑옷 고리가 한 번 울렸다. 누군가 이 선택을 지켜보고 있었다.','왕가의 문장이 있는 쪽에서 바닥의 재가 아주 조금 움직였다.'],
  neon:['근처 광고판이 한 프레임 깨지며 방금 행동을 다른 각도의 영상으로 되풀이했다.','감시 드론 하나가 지나쳤다가 다시 돌아와 같은 자리를 훑었다.'],
  abyss:['기지 벽을 타고 낮은 진동이 지나갔다. 멀리 있는 무언가도 이 변화를 감지한 듯했다.','소나의 빈 화면 한쪽에 아주 작은 반향이 새로 생겼다.'],
  clock:['멀리서 초침 하나가 거꾸로 움직이는 소리가 들렸다.','같은 순간을 기억하는 듯한 누군가가 길 건너에서 잠깐 파티를 바라봤다.'],
  wild:['나뭇잎이 서로 스치며 방금 선택을 따라 말하듯 짧은 소리를 냈다.','별가루가 발자국 주위에 모였다가 다음 길 쪽으로 흩어졌다.'],
  guardian:['멀리서 들리던 전투음 사이로 동료의 신호가 한 번 돌아왔다.','지나온 세계에서 얻은 인연 하나가 지금 선택에 작게 반응했다.'],
  echo:['안내방송이 한 박자 늦게 따라 나오며 방금 지나온 위치의 이름을 다시 읽었다.','꺼진 전광판에 현재 위치가 아닌 다음 위치의 시간이 한 프레임 나타났다.'],
  aurora:['붉은 극광이 한 번 맥박치듯 밝아지며 아날로그 계기의 바늘이 동시에 흔들렸다.','오래된 수신기에서 방금 선택과 닮은 문장이 43년 전 목소리로 짧게 재생됐다.'],
  masque:['무대 어딘가에서 보이지 않는 관객이 한 번 박수를 쳤다.','가까운 가면 하나의 표정이 빛의 각도와 상관없이 잠깐 달라졌다.']
};
function parallelImmersiveOutcome(room,campaign,player,node,choice,grade,nextId){
  const actor=player?.name||'플레이어';
  const action=String(choice?.label||'행동');
  const next=nextId && nextId!=='__ENDING__' ? campaign?.parallelStory?.nodes?.[nextId] : null;
  const colorPool=PARALLEL_SCENE_COLOR[campaign?.id]||PARALLEL_SCENE_COLOR.guardian;
  const seed=(Number(parallelPlayerState(room,player)?.progress||0)+String(node?.id||'').length+String(action).length)%colorPool.length;
  const color=colorPool[seed];
  const gradeText=grade==='critical'
    ? `${actor}의 판단은 예상보다 멀리 닿았다. 단순히 문제를 넘긴 것이 아니라 다음 장면에서 먼저 움직일 이유와 단서를 함께 만들었다.`
    : grade==='success'
      ? `${actor}가 하려던 일이 의도한 방향으로 이어졌다. 눈앞의 상황도 그 선택에 맞춰 실제로 변했다.`
      : grade==='mixed'
        ? `${actor}는 원하는 결과에 손을 뻗는 데 성공했지만, 그 순간 다른 문제 하나도 함께 움직였다. 얻은 것과 잃은 것이 동시에 다음 장면으로 따라간다.`
        : grade==='disaster'
          ? `${actor}의 시도는 크게 어긋났다. 하지만 실패한 자리에서 무엇이 이 장소를 움직이는지 가장 위험한 방식으로 드러났다.`
          : `${actor}의 첫 시도는 막혔다. 그렇다고 이야기가 제자리로 돌아간 것은 아니다. 막힌 이유와 새로 열린 우회로가 다음 선택의 조건이 됐다.`;
  const move=next ? `그 결과 이야기는 “${node?.title||'현재 장면'}”에 머물지 않고 “${next.title}” 쪽으로 넘어가기 시작했다.` : '';
  const linked=parallelLinkedGroupMates(room,player).filter(p=>!parallelPlayerState(room,p)?.ended);
  const group=linked.length ? ` 함께 이동 중인 ${linked.map(p=>p.name).join(', ')}도 같은 변화를 보지만, 다음 행동은 각자의 턴에서 직접 결정한다.` : '';
  return `“${action}”을 선택한 순간, ${gradeText} ${color} ${move}${group}`.replace(/\s+/g,' ').trim();
}
function parallelCombatAttemptText(player,choice,enc){
  const actor=player?.name||'플레이어', enemy=enc?.name||'적';
  const lines={
    force:`${actor}는 물러서지 않고 ${enemy}의 정면을 붙잡아 힘으로 전열을 깨뜨리려 했다.`,
    quick:`${actor}는 ${enemy}의 시선이 다른 곳으로 향한 짧은 순간에 옆으로 파고들어 빠른 공격을 노렸다.`,
    analyze:`${actor}는 공격부터 하지 않고 ${enemy}의 발, 시선, 반복 동작을 따라가며 약점이 생기는 순간을 찾았다.`,
    watch:`${actor}는 거리를 유지한 채 ${enemy}가 먼저 움직이도록 두고 공격 직전의 신호를 읽으려 했다.`,
    defend:`${actor}는 몸을 낮추고 통로를 막아 ${enemy}의 다음 공격을 받아내면서 동료가 움직일 시간을 만들려 했다.`,
    distract:`${actor}는 일부러 소리와 움직임을 크게 만들어 ${enemy}의 시선을 자신에게 묶고 동료에게 공격할 틈을 만들려 했다.`,
    flee:`${actor}는 승부를 고집하지 않고 ${enemy}의 시야가 끊기는 순간을 골라 안전한 경로로 빠져나가려 했다.`
  };
  return lines[choice?.action]||`${actor}는 ${enemy}에게 지금 가능한 공격을 시도했다.`;
}

function parallelOutcomeThread(room,campaign,player,node,choice,grade,success){
  const ps=parallelPlayerState(room,player); if(!ps) return null;
  const aff=node?.affordances||{}; const target=aff.clue||aff.person||aff.obstacle||aff.hostile||aff.item||node?.title||'현재 사건';
  const tier=success ? 'success' : (grade==='mixed'?'mixed':'failure');
  const voice=PARALLEL_OUTCOME_VOICE[campaign?.id]||PARALLEL_OUTCOME_VOICE.guardian;
  const thread={id:`${ps.nodeId}:${Date.now()}:${ps.progress||0}`,sourceNode:ps.nodeId,sourceTitle:node?.title||'',choiceLabel:choice?.label||'',grade:tier,target,path:choice?.path||statPath(choice?.stat||'지혜'),text:voice[tier],resolved:false};
  ps.outcomeThreads ||= []; ps.outcomeThreads.push(thread); if(ps.outcomeThreads.length>8) ps.outcomeThreads.splice(0,ps.outcomeThreads.length-8);
  ps.pathTotals ||= {truth:0,survival:0,bond:0}; ps.pathTotals[thread.path]=Number(ps.pathTotals[thread.path]||0)+1;
  return thread;
}
function parallelLatestOpenThread(room,player){
  const ps=parallelPlayerState(room,player); return [...(ps?.outcomeThreads||[])].reverse().find(t=>!t.resolved) || null;
}
function parallelThreadNarrative(room,campaign,player){
  const thread=parallelLatestOpenThread(room,player); if(!thread) return '';
  const gradeLabel=thread.grade==='success'?'성공의 여파':thread.grade==='mixed'?'부분 성공의 대가':'실패가 남긴 길';
  return `${gradeLabel} · 이전에 “${thread.choiceLabel}”을 선택한 결과, ${thread.target}에 관한 상황이 지금 장면까지 이어졌다. ${thread.text}`;
}
function parallelOutcomeFollowupChoices(room,campaign,player,node){
  const ps=parallelPlayerState(room,player); const thread=parallelLatestOpenThread(room,player); if(!ps||!thread||thread.sourceNode===ps.nodeId) return [];
  const aff=node?.affordances||{}; const target=aff.clue||aff.obstacle||aff.person||aff.hostile||aff.item||'지금 상황';
  const base=(node.choices||[]).filter(c=>parallelChoiceVisible(room,campaign,player,c,node));
  const nextFor=(patterns)=>base.find(c=>patterns.test(String(c.label||''))) || base[0];
  const out=[]; const add=(id,label,stat,dc,path,route,successText,failureText)=>{ if(!route) return; out.push({id,kind:'parallel-base',label,stat,dc,path,choiceBadge:'이전 선택의 여파',nextSuccess:route.nextSuccess||route.next?.success||route.next,nextFailure:route.nextFailure||route.next?.failure||route.nextSuccess||route.next,success:successText,failure:failureText,resolveThreadId:thread.id}); };
  if(thread.grade==='success'){
    const r=nextFor(/확인|조사|분석|묻|말|우회|간다|향한다/);
    add(`thread:press:${thread.id}`,`${thread.target}에서 얻은 우위를 이어간다`,'지혜',7,thread.path,r,`앞선 성공을 이용해 ${target}에 먼저 대응했다. 이전 선택이 실제 다음 장면의 유리한 출발점이 됐다.`,`우위를 제대로 살리진 못했지만 앞서 얻은 정보 덕분에 큰 손실은 피했다.`);
  } else if(thread.grade==='mixed'){
    const r1=nextFor(/돕|보호|확인|조사|기록/); const r2=nextFor(/우회|간다|향한다|싸|돌파/);
    add(`thread:repair:${thread.id}`,`앞선 선택의 대가를 먼저 수습한다`,'지혜',7,'bond',r1,`이전 선택에서 남은 대가를 정리하고 ${target}에 접근했다. 덕분에 뒤의 위험 하나가 줄었다.`,`수습이 완벽하진 않았지만 무엇이 아직 문제인지 분명해졌다.`);
    add(`thread:risk:${thread.id}`,`대가를 감수하고 그대로 밀고 간다`,'체력',9,'survival',r2,`남은 부담을 안고도 속도를 택했다. ${target}에 먼저 도달했지만 이 선택은 이후 위험 기록에 남는다.`,`무리한 진행 때문에 부담이 커졌지만 다른 우회 단서를 발견했다.`);
  } else {
    const r1=nextFor(/확인|조사|분석|기록|듣/); const r2=nextFor(/우회|간다|향한다|돌아/);
    add(`thread:learn:${thread.id}`,`실패한 흔적을 다시 분석한다`,'지능',7,'truth',r1,`실패 원인을 되짚어 ${target}과 연결되는 새 단서를 찾았다. 실패가 다음 진행의 정보가 됐다.`,`원인을 모두 밝히진 못했지만 같은 실수를 반복하지 않을 기준을 얻었다.`);
    add(`thread:detour:${thread.id}`,`막힌 방법을 버리고 다른 길을 택한다`,'민첩',8,'survival',r2,`실패한 접근을 버리고 다른 경로로 ${target}에 접근했다. 이야기는 막히지 않고 다른 방향으로 이어졌다.`,`우회도 쉽지 않았지만 새로운 장소나 사람의 존재를 알아냈다.`);
  }
  return out.slice(0,2);
}
function parallelDynamicChoices(room,campaign,player,node){
  const ps=parallelPlayerState(room,player);
  if(!ps) return [];
  const encounter=room.parallel?.encounters?.[ps.location];
  if(encounter && encounter.hp>0){
    const nearby=parallelNearby(room,player);
    return [
      {id:'combat:force',kind:'parallel-combat',action:'force',label:`${encounter.name}을 정면으로 막는다`,stat:'근력',dc:encounter.dc,path:'survival'},
      {id:'combat:quick',kind:'parallel-combat',action:'quick',label:'옆으로 파고들어 공격한다',stat:'민첩',dc:Math.max(7,encounter.dc-1),path:'survival'},
      {id:'combat:analyze',kind:'parallel-combat',action:'analyze',label:'움직임의 약점을 찾는다',stat:'지능',dc:Math.max(7,encounter.dc-1),path:'truth'},
      {id:'combat:watch',kind:'parallel-combat',action:'watch',label:'거리를 두고 패턴을 읽는다',stat:'지혜',dc:Math.max(7,encounter.dc-1),path:'truth'},
      {id:'combat:defend',kind:'parallel-combat',action:'defend',label:'공격을 버티며 길을 지킨다',stat:'체력',dc:Math.max(7,encounter.dc-1),path:'bond'},
      ...(nearby.length?[{id:'combat:distract',kind:'parallel-combat',action:'distract',label:'동료에게 공격할 틈을 만든다',stat:'매력',dc:8,path:'bond'}]:[]),
      {id:'combat:flee',kind:'parallel-combat',action:'flee',label:'싸움을 피하고 빠져나간다',stat:'민첩',dc:9,path:'survival'},
    ];
  }
  const dynamic=[];
  const nearby=parallelNearby(room,player);
  const incoming=Object.values(room.parallel?.offers||{}).filter(o=>o?.to===player.id && o.location===ps.location);
  for(const offer of incoming){
    const from=room.players.find(p=>p.id===offer.from);
    if(!from) continue;
    dynamic.push({id:`social:accept:${offer.from}`,kind:'parallel-social',automatic:true,action:'accept',targetId:offer.from,label:`${from.name}와 같이 다닌다`,stat:'매력',dc:7,path:'bond'});
    dynamic.push({id:`social:assist:${offer.from}`,kind:'parallel-social',automatic:true,action:'assist',targetId:offer.from,label:`${from.name}와 잠깐 협력한다`,stat:'지혜',dc:7,path:'bond'});
    dynamic.push({id:`social:decline:${offer.from}`,kind:'parallel-social',automatic:true,action:'decline',targetId:offer.from,label:`${from.name}와 각자 움직인다`,stat:'지혜',dc:7,path:'survival'});
  }
  for(const other of nearby){
    if(parallelLinked(room,player.id,other.id)){
      dynamic.push({id:`social:split:${other.id}`,kind:'parallel-social',automatic:true,action:'split',targetId:other.id,label:`${other.name}와 여기서 헤어진다`,stat:'지혜',dc:7,path:'survival'});
      dynamic.push({id:`social:coordinate:${other.id}`,kind:'parallel-social',automatic:true,action:'coordinate',targetId:other.id,label:`${other.name}와 역할을 나눈다`,stat:'매력',dc:7,path:'bond'});
    } else if(!room.parallel.offers?.[pairKey(player.id,other.id)]){
      dynamic.push({id:`social:offer:${other.id}`,kind:'parallel-social',automatic:true,action:'offer',targetId:other.id,label:`${other.name}에게 같이 가자고 한다`,stat:'매력',dc:7,path:'bond'});
    }
  }
  if(ps.pendingTravel){
    const leader=room.players.find(p=>p.id===ps.pendingTravel.from);
    dynamic.unshift({id:`travel:follow:${ps.pendingTravel.from}`,kind:'parallel-social',automatic:true,action:'follow',targetId:ps.pendingTravel.from,label:`${leader?.name||'동료'}를 따라 ${parallelLocationLabel(campaign,ps.pendingTravel.location)}로 간다`,stat:'민첩',dc:7,path:'bond'});
    dynamic.unshift({id:'travel:stay',kind:'parallel-social',automatic:true,action:'stay',label:'여기 남아 따로 움직인다',stat:'지혜',dc:7,path:'survival'});
  }
  dynamic.push(...parallelOutcomeFollowupChoices(room,campaign,player,node));
  dynamic.push(...parallelUniversalItemChoices(room,campaign,player,node));
  dynamic.push(...parallelAddAcquisitionChoices(room,campaign,player,node));
  dynamic.push(...parallelEchoCapabilityChoices(room,campaign,player,node));
  const ownTransferable=parallelStoryItems(room,player).filter(id=>!['echo_story_root_key'].includes(id)).slice(0,3);
  for(const other of nearby){
    for(const itemId of ownTransferable){
      if(parallelHasStoryItem(room,other,itemId)) continue;
      const item=parallelStoryItem(itemId);
      dynamic.push({id:`transfer:${other.id}:${itemId}`,kind:'parallel-item-transfer',automatic:true,targetId:other.id,itemId,label:`${other.name}에게 ${item?.name||'물건'}을 건넨다`,stat:'매력',dc:7,path:'bond',choiceBadge:'아이템 전달'});
      break;
    }
  }
  if(Number(room.parallel?.clockTick||0)>=18 && node?.location!=='train'){
    dynamic.push({id:'urgent:firsttrain',kind:'parallel-move',label:'첫차 안내를 따라간다',stat:'지혜',dc:9,next:'train',path:'survival'});
    if(node?.location!=='signal') dynamic.push({id:'urgent:signal',kind:'parallel-move',label:'신호실로 향한다',stat:'민첩',dc:9,next:'signal',path:'truth'});
  }
  return dynamic.filter(choice=>parallelChoiceVisible(room,campaign,player,choice,node));
}
function parallelAffordanceSummary(node){
  const aff=node?.affordances || {};
  const parts=[];
  if(aff.hasClue && aff.clue) parts.push(`조사 가능한 단서로 ${aff.clue}가 남아 있다`);
  if(aff.hasPerson && aff.person) parts.push(`${aff.person}이(가) 이 장면 안에 있어 직접 말을 걸거나 반응을 살필 수 있다`);
  if(aff.hasHostile && aff.hostile) parts.push(`${aff.hostile}이(가) 현재 이동이나 행동을 위협하고 있다`);
  if(aff.hasObstacle && aff.obstacle) parts.push(`${aff.obstacle}이(가) 진행 경로를 막거나 다른 접근을 요구한다`);
  if(aff.hasRescue && aff.rescue) parts.push(`${aff.rescue}이(가) 도움을 필요로 하는 상태다`);
  if(aff.hasItem && aff.item) parts.push(`${aff.item}이(가) 현장에서 확인하거나 확보할 수 있는 위치에 있다`);
  return parts.join('. ')+(parts.length?' .':'');
}
function parallelSceneContext(node,campaign){
  const aff=node?.affordances || {};
  const visible=[];
  if(aff.hasClue && aff.clue) visible.push(`단서: ${aff.clue}`);
  if(aff.hasPerson && aff.person) visible.push(`인물: ${aff.person}`);
  if(aff.hasHostile && aff.hostile) visible.push(`위협: ${aff.hostile}`);
  if(aff.hasObstacle && aff.obstacle) visible.push(`장애물: ${aff.obstacle}`);
  if(aff.hasRescue && aff.rescue) visible.push(`구조 대상: ${aff.rescue}`);
  if(aff.hasItem && aff.item) visible.push(`물건: ${aff.item}`);
  if(!visible.length) return `${node?.title || campaign?.title || '현재 장면'} · ${node?.phase || '진행'}`;
  return `${node?.title || campaign?.title || '현재 장면'} · ${visible.slice(0,4).join(' · ')}`;
}
function parallelChoiceReason(choice,node){
  const aff=node?.affordances || {};
  const type=String(choice?.actionType || choice?.type || '');
  const label=String(choice?.label || '');
  if(choice?.kind==='parallel-social') return '같은 장소에 실제로 다른 플레이어가 있어 합류·협력·분리를 선택할 수 있다.';
  if(choice?.kind==='parallel-item-transfer') return '같은 장소의 플레이어에게 현재 가진 스토리 아이템을 직접 넘길 수 있다.';
  if(choice?.choiceBadge && /아이템|열쇠|장비|도구|소지품/.test(String(choice.choiceBadge))) return '현재 소지한 물건과 이 장소의 장치 또는 장애물이 서로 맞아 사용할 수 있다.';
  if(/investigate|inspect-item/.test(type) || /로그|기록|단서|조사|살핀|본다/.test(label)){
    if(aff.clue) return `${aff.clue}가 이 현장에 실제로 남아 있어 직접 확인할 수 있다.`;
    if(aff.item) return `${aff.item}이 눈앞에 있어 상태와 용도를 확인할 수 있다.`;
    return '현재 장면에 눈으로 확인할 수 있는 흔적이나 기록이 남아 있다.';
  }
  if(/question|persuade|trade|tail|threaten/.test(type) || /묻는다|말한다|설득|거래|따라간|압박/.test(label)){
    if(aff.person) return `${aff.person}이 현재 이 장소에 있으므로 직접 대화하거나 행동을 추적할 수 있다.`;
    return '현재 장면에 상호작용할 수 있는 인물이 있다.';
  }
  if(/fight/.test(type) || /싸운다|공격|막는다/.test(label)){
    if(aff.hostile) return `${aff.hostile}이 지금 이 장소의 진행을 위협하고 있다.`;
    return '현재 장면에 실제 적대 대상이 있다.';
  }
  if(/help|protect/.test(type) || /돕는다|지킨다|구조/.test(label)){
    if(aff.rescue) return `${aff.rescue}이 위험에 처해 있어 지금 개입할 수 있다.`;
    if(aff.person) return `${aff.person}이 위험에 노출되어 있어 보호하거나 도울 수 있다.`;
    return '현재 장면에 도움을 필요로 하는 대상이 있다.';
  }
  if(/bypass|break|sneak|hide|distract|trap/.test(type) || /우회|부순|몰래|숨긴|시선을|함정/.test(label)){
    if(aff.obstacle) return `${aff.obstacle}이 길을 막고 있어 우회·돌파·은밀 접근 같은 방법을 고려할 수 있다.`;
    if(aff.hostile) return `${aff.hostile}의 경계가 있어 정면 대응 외의 접근도 가능하다.`;
    return '현재 이동 경로에 경계나 장애 요소가 있어 다른 접근 방식을 택할 수 있다.';
  }
  if(/take-item|steal/.test(type) || /챙긴다|훔친다|가져간다/.test(label)){
    if(aff.item) return `${aff.item}이 현재 접근 가능한 위치에 있지만, 확보 방식에 따라 위험이나 대가가 생길 수 있다.`;
    return '현재 장면에 확보 가능한 물건이 있다.';
  }
  if(/observe|listen|wait/.test(type) || /주변|듣는다|기다린다/.test(label)) return '주변 상황이 계속 변하고 있어 즉시 움직이지 않고 관찰해도 새로운 정보가 나올 수 있다.';
  if(/travel/.test(type) || /간다|향한다|돌아간다|들어간다|나간다/.test(label)) return '현재 장면에서 연결된 이동 경로가 확인되어 다음 장소로 움직일 수 있다.';
  if(choice?.reason) return String(choice.reason);
  return '현재 장면의 사람·단서·위험·이동 경로 중 하나와 직접 연결된 행동이다.';
}
function parallelSceneNarrative(room,campaign,player,node){
  if(!node) return [];
  if(campaign?.id!=='echo'){
    const out=[...(node?.text||[])];
    const prime=player?.job?.prime;
    const hook=node?.roleHooks?.[prime];
    if(hook) out.push(`${player.job?.name || '당신'}의 관점에서는 ${hook}`);
    const affordance=parallelAffordanceSummary(node);
    if(affordance) out.push(`지금 현장에서 행동으로 이어질 만한 요소도 분명하다. ${affordance}`);
    const nearby=parallelNearby(room,player); const linked=parallelLinkedPlayers(room,player).filter(p=>parallelPlayerState(room,p)?.location===parallelPlayerState(room,player)?.location);
    if(linked.length) {
      out.push(`${linked.map(p=>p.name).join(', ')}와 함께 움직이는 중이다. 헤어지기를 선택하기 전까지 같은 사건과 같은 장면을 공유하지만, 각자의 턴과 판정은 따로 진행된다.`);
      const groupIds=new Set([player.id,...linked.map(p=>p.id)]);
      const shared=[...(room.parallel?.sharedSceneLog||[])].reverse().find(x=>groupIds.has(x.by) && x.to===node?.id);
      if(shared?.from && shared.from!==shared.to){ const prev=campaign?.parallelStory?.nodes?.[shared.from]; out.push(`조금 전 ${shared.byName||'동료'}의 선택으로 “${prev?.title||'이전 장면'}”에서 지금의 “${node.title}”로 상황이 넘어왔다. 동행 중이어도 이야기는 매 행동 뒤 계속 전진한다.`); }
    }
    else if(nearby.length) out.push(`이 장소에는 ${nearby.map(p=>p.name).join(', ')}도 도착해 있다. 함께 움직일지, 잠깐 역할을 나눌지, 다시 각자의 길로 갈지는 플레이어들이 직접 정한다.`);
    else out.push('아직 이 장소에는 다른 플레이어가 보이지 않는다. 지금 선택한 길이 다른 사람의 동선과 겹치면 뒤의 장면에서 자연스럽게 마주칠 수 있다.');
    return out.filter(Boolean).slice(0,9);
  }
  const ps=parallelPlayerState(room,player);
  const loc=ps?.location || node.location;
  const job=player?.job?.name || '플레이어';
  const world=room.parallel?.worldFlags || {};
  const ambient={
    maintenance:'형광등 한 줄이 낮게 떨리고, 분전반 안쪽에서는 전원이 끊긴 뒤에도 작은 릴레이 소리가 일정한 간격으로 이어진다. 바닥의 케이블 표시와 실제 배선 방향이 미묘하게 어긋나 있다.',
    office:'유리창 너머 대합실은 비어 있는데 역무실 내부 장비 몇 개만 퇴근 처리를 무시한 채 켜져 있다. 프린터에는 뽑힌 적 없는 점검표 한 장이 반쯤 걸려 있고, 시계 초침은 움직이지 않는다.',
    concourse:'광고판 불빛이 꺼진 대합실은 낮보다 훨씬 넓어 보인다. 자동 개찰구의 붉은 X가 사람의 움직임과 상관없이 순서대로 켜졌다 꺼지고, 셔터 너머에서는 역 바깥 소리 대신 같은 역사 안의 잔향이 돌아온다.',
    service:'직원 통로는 폭이 좁고 천장이 낮다. 비상등 사이사이에 원래 없던 회색 화살표가 이어지고, 한쪽 벽에는 최근 누군가 밀고 지나간 듯 공구함 자국이 길게 남아 있다.',
    platform1:'운행이 끝난 승강장에는 열차가 없지만 선로 쪽 바람은 아직 멈추지 않았다. 전광판의 두 시간이 번갈아 나타날 때마다 안전문 유리에 다른 방향의 터널 불빛이 잠깐 비친다.',
    platform0gate:'0번 방화문 앞 공기는 다른 층보다 한결 차갑다. 문틀과 경첩은 분명 실제 설비인데 자산 번호만 깔끔하게 비어 있다. 안쪽 안내음은 정상 승강장과 같은 박자로 반복된다.',
    platform0:'0번 승강장은 지나치게 정상적이다. 깨끗한 바닥, 켜진 안전문, 규칙적인 안내음까지 모두 익숙하지만 광고판의 날짜와 선로 방향은 청명역의 어느 기록과도 맞지 않는다.',
    cctv:'모니터 여러 대가 서로 다른 시간을 비춘다. 대부분은 현재와 같지만 4번 화면만 정확히 몇 분 앞서 움직이고, 화면 속 문이 열릴 때 실제 방 안에서도 아주 약한 전자음이 따라온다.',
    lostfound:'분실물 보관실에는 이름표와 접수 시간이 붙은 봉투들이 빼곡하다. 이상한 것은 몇 장의 접수 시간이 아직 오지 않은 시각이라는 점이다. 금속 보관함 손잡이는 방금 누가 잡았던 것처럼 미지근하다.',
    signal:'신호실 벽을 가득 채운 선로도가 두 개의 경로를 동시에 표시한다. 정상 첫차 노선 위로 회색 0번 경로가 얇게 겹쳐지고, 둘 중 하나를 건드릴 때마다 역 다른 곳의 조명이 반응한다.',
    track:'점검선은 사람 한 명이 겨우 비킬 폭이다. 멀리 작업등이 천천히 가까워지고, 레일 옆 표지판은 정상 번호와 회색 0을 번갈아 보여 준다. 여기서는 선택 하나가 실제 선로 안전과 직결된다.',
    exit:'셔터 틈 사이로 들어오는 빛은 처음으로 진짜 새벽빛처럼 보인다. 하지만 역 안쪽 무전과 발소리는 여전히 이어지고, 지금 밖으로 나가면 다시 들어올 수 있을지 누구도 확신할 수 없다.',
    train:'첫차의 전조등이 터널 끝에서 커지고 있다. 정상 안내방송과 아주 낮은 0번 방송이 겹쳐 들리며, 지금까지 열어 둔 문과 남겨 둔 사람, 확보한 물건이 마지막 선택의 의미를 바꾼다.',
    sealedroom:'폐쇄 점검실은 오래 사용되지 않은 먼지 냄새와 새 전자 장비의 열기가 동시에 난다. 선반에는 폐기된 신호 부품과 봉인 스티커가 붙은 기록 상자가 놓여 있다.',
    oldcontrol:'구형 신호 제어실의 화면은 현대 신호실과 다르게 물리 스위치와 오래된 CRT로 구성돼 있다. 그런데 그 낡은 화면에도 0번 경로가 선명하게 들어와 있다.'
  }[loc];
  const role={
    '시설기사':'시설기사인 당신에게는 작은 차이가 더 먼저 보인다. 정상 설비라면 있어야 할 표시와 소리가 몇 군데 빠져 있고, 반대로 없어야 할 전원이 살아 있다.',
    '야간 역무원':'야간 역무원인 당신은 평소 막차 뒤의 역사 소리를 알고 있다. 그래서 지금 들리는 안내음과 장비 반응 중 무엇이 평소와 다른지 더 선명하게 구분된다.',
    '보안요원':'보안요원인 당신은 먼저 퇴로와 사각지대를 확인한다. 누군가 숨어 있을 만한 곳과 문이 갑자기 닫혔을 때 버틸 위치가 자연스럽게 눈에 들어온다.',
    '심야 배달원':'심야 배달원인 당신은 출입문과 지름길부터 본다. 안내 표지보다 실제로 사람이 드나들 법한 흔적이 더 믿을 만하게 느껴진다.',
    '민원 상담사':'민원 상담사인 당신은 장비보다 사람이 남긴 흔적과 말의 모순에 먼저 민감하다. 누군가 있었다면 무엇을 보고 당황했을지, 어디로 움직였을지 생각하게 된다.',
    '응급구조사':'응급구조사인 당신은 위험보다 먼저 사람의 상태와 이동 가능성을 본다. 피난 경로와 쉬어 갈 공간, 다쳤을 때 버틸 수 있는 장소가 자연스럽게 눈에 들어온다.'
  }[job];
  const shared=[];
  if(world.power_restored) shared.push('누군가 복구한 비상 전원 덕분에 멀리 있는 표지 몇 개가 다시 읽힌다.');
  if(world.public_call) shared.push('조금 전 사용된 역사 방송의 잔향이 다른 스피커에서도 늦게 따라 나온다.');
  if(world.evidence) shared.push('이미 확보된 기록과 지금 눈앞의 상황을 비교하면 같은 숫자와 시간이 반복되고 있음을 알 수 있다.');
  if(world.zero_gate_open) shared.push('0번 승강장 방화문이 완전히 닫히지 않은 상태라 역의 공기 흐름과 소리가 이전과 달라졌다.');
  const out=[...(node.text||[])];
  const carry=parallelThreadNarrative(room,campaign,player); if(carry) out.push(carry);
  if(ambient) out.push(ambient);
  if(role) out.push(role);
  if(shared.length) out.push(shared.slice(-2).join(' '));
  const linked=parallelLinkedPlayers(room,player).filter(p=>parallelPlayerState(room,p)?.location===ps?.location);
  if(linked.length){
    out.push(`${linked.map(p=>p.name).join(', ')}와 같은 구역을 함께 이동하고 있다. 누구의 턴에서든 새 장면으로 넘어가면 동행자 전원의 최신 장면도 함께 바뀐다.`);
    const groupIds=new Set([player.id,...linked.map(p=>p.id)]);
    const move=[...(room.parallel?.sharedSceneLog||[])].reverse().find(x=>groupIds.has(x.by) && x.to===node?.id && x.from && x.from!==x.to);
    if(move){ const prev=campaign?.parallelStory?.nodes?.[move.from]; out.push(`조금 전 ${move.byName||'동료'}의 선택으로 “${prev?.title||'이전 장면'}”에서 “${node.title}”로 상황이 넘어왔다. 역은 같은 장면을 반복하는 대신 그 선택에 맞춰 다음 경로를 다시 만들고 있다.`); }
  }
  return out.filter(Boolean).slice(0,8);
}
function parallelChoiceScore(choice,node){
  const label=String(choice?.label||'');
  const context=`${node?.title||''} ${node?.objective||''} ${(node?.text||[]).join(' ')}`;
  let score=0;
  if(choice?.kind==='parallel-social') score+=90;
  if(choice?.kind==='parallel-item-transfer') score+=65;
  if(choice?.choiceBadge==='특수 루트'||choice?.choiceBadge==='아이템 전용 루트'||choice?.choiceBadge==='핵심 아이템'||choice?.choiceBadge==='진엔딩 조건'||choice?.choiceBadge==='비밀 엔딩') score+=100;
  else if(choice?.choiceBadge) score+=35;
  if(/확인|조사|살핀|듣|분석|기록|대조/.test(label)) score+=18;
  if(/간다|돌아|들어간|나간|향한다|따라/.test(label)) score+=8;
  if(/싸|막|피한다|치료|구조|부른다/.test(label)) score+=12;
  const words=label.replace(/[0-9·]/g,' ').split(/\s+/).map(w=>w.replace(/[을를이가와과에로만은는]/g,'')).filter(w=>w.length>=2);
  for(const word of words) if(context.includes(word)) score+=12;
  if(choice?.automatic) score+=3;
  return score;
}
function parallelChoiceIntent(choice,node){
  const label=String(choice?.label||'').replace(/\s+/g,' ').trim();
  const aff=node?.affordances||{};
  let action='other';
  if(choice?.kind==='parallel-social') action=`social:${choice.action||'talk'}:${choice.targetId||''}`;
  else if(choice?.kind==='parallel-item-transfer') action=`transfer:${choice.targetId||''}:${choice.itemId||''}`;
  else if(/물물교환|바꾼다/.test(label)) action='trade:barter';
  else if(/구매|산다/.test(label)) action='trade:buy';
  else if(/훔|몰래.*챙|몰래.*빼/.test(label)) action='acquire:steal';
  else if(/줍|찾아 챙|주변에서.*찾/.test(label)) action='acquire:find';
  else if(/건넨다/.test(label)) action='transfer';
  else if(/묻|말한다|설득|협상|대화/.test(label)) action='talk';
  else if(/싸|공격|정면.*막|돌파|부순/.test(label)) action='combat';
  else if(/돕|구조|치료|보호|수습/.test(label)) action='help';
  else if(/우회|다른 길|돌아간다|향한다|간다|들어간다|나간다|따라간다/.test(label)) action='move';
  else if(/확인|조사|살핀|분석|기록|대조|듣|본다|읽/.test(label)) action='inspect';
  else if(/기다|숨|관찰/.test(label)) action='wait';
  const targets=[aff.person,aff.clue,aff.obstacle,aff.hostile,aff.item].filter(Boolean);
  let target=targets.find(t=>label.includes(String(t))) || '';
  if(!target){
    const cleaned=label.replace(/^(주변에서|앞선 선택의 대가를|막힌 방법을 버리고|실패한 흔적을|현재|다시)\s*/,'').replace(/(을|를|에게|와|과|으로|로)?\s*(확인한다|조사한다|살핀다|분석한다|본다|듣는다|묻는다|말한다|설득한다|협상한다|우회한다|간다|향한다|돌파한다|구조한다|돕는다|구매한다|산다|훔친다|챙긴다|찾는다).*$/,'').trim();
    if(cleaned.length>=2) target=cleaned.slice(0,24);
  }
  if(action==='talk' && aff.person) target=aff.person;
  if(action==='inspect' && aff.clue) target=aff.clue;
  if(action==='combat' && aff.hostile) target=aff.hostile;
  return `${action}|${target}`;
}
function parallelCurateChoices(room,campaign,player,node,dynamic,base){
  const encounter=room.parallel?.encounters?.[parallelPlayerState(room,player)?.location];
  if(encounter?.hp>0) return dynamic.slice(0,7);
  const all=[...dynamic,...base].filter(Boolean);
  const ranked=[...all].sort((a,b)=>parallelChoiceScore(b,node)-parallelChoiceScore(a,node));
  const bestByIntent=new Map();
  for(const choice of ranked){
    const key=parallelChoiceIntent(choice,node);
    const prev=bestByIntent.get(key);
    if(!prev || parallelChoiceScore(choice,node)>parallelChoiceScore(prev,node)) bestByIntent.set(key,choice);
  }
  let pool=[...bestByIntent.values()].sort((a,b)=>parallelChoiceScore(b,node)-parallelChoiceScore(a,node));
  // Keep at most two acquisition/trade options in one scene so freedom does not become a wall of near-identical item buttons.
  let acquisition=0, social=0; const selected=[];
  for(const c of pool){
    const intent=parallelChoiceIntent(c,node);
    if(/^(trade|acquire):/.test(intent) && acquisition>=2) continue;
    if(/^social:/.test(intent) && social>=3) continue;
    if(/^(trade|acquire):/.test(intent)) acquisition++;
    if(/^social:/.test(intent)) social++;
    selected.push(c);
    if(selected.length>=10) break;
  }
  // Preserve meaningful action diversity when the scene has it.
  const categories=new Set(selected.map(c=>parallelChoiceIntent(c,node).split('|')[0]));
  for(const wanted of ['inspect','talk','move','help','combat']){
    if(categories.has(wanted)) continue;
    const candidate=pool.find(c=>parallelChoiceIntent(c,node).startsWith(`${wanted}|`) && !selected.includes(c));
    if(candidate && selected.length<10){ selected.push(candidate); categories.add(wanted); }
  }
  return selected.slice(0,10);
}
function parallelRenderedScene(room,campaign,player){
  const ps=parallelPlayerState(room,player);
  if(!ps) return null;
  const node=parallelNode(room,campaign,player);
  if(!node) return null;
  const base=(node.choices||[])
    .map((choice,index)=>({id:`base:${index}`,...choice,kind:choice.kind||'parallel-base',path:choice.path||statPath(choice.stat)}))
    .filter(choice=>parallelChoiceVisible(room,campaign,player,choice,node));
  const dynamic=parallelDynamicChoices(room,campaign,player,node);
  // v6.6.4: valid contextual choices must never collapse to an empty scene.
  // Keep role/item-gated choices when available, but always preserve ordinary scene actions as a safe baseline.
  const choices=parallelCurateChoices(room,campaign,player,node,dynamic,base);
  if(!choices.length){
    const fallback=(node.choices||[])
      .filter(choice=>!choice.requiredJob && !choice.requiredJobs && !choice.requiredTag && !choice.requiredTags && !choice.requiredAnyTag && !choice.requiredAnyTags && !choice.requiredFlag && !choice.requiredFlags && !choice.requiredWorldFlag && !choice.requiredWorldFlags)
      .map((choice,index)=>({id:`fallback:${index}`,...choice,kind:choice.kind||'parallel-base',path:choice.path||statPath(choice.stat)}));
    choices.push(...fallback.slice(0,8));
  }
  const explainedChoices=choices.map(choice=>({...choice,reason:parallelChoiceReason(choice,node)}));
  return {
    id:ps.nodeId, title:node.title, phase:node.phase, act:node.act, actName:campaign.acts?.[Math.max(0,Number(node.act||1)-1)] || node.phase,
    location:ps.location, locationLabel:parallelLocationLabel(campaign,ps.location), objective:node.objective,
    sceneContext:parallelSceneContext(node,campaign), affordanceSummary:parallelAffordanceSummary(node),
    paragraphs:parallelSceneNarrative(room,campaign,player,node), choices:explainedChoices, freeActionAllowed:false,
    nearby:parallelNearby(room,player).map(p=>({id:p.id,name:p.name,job:p.job?.name,linked:parallelLinked(room,player.id,p.id)})),
    linked:parallelLinkedPlayers(room,player).map(p=>({id:p.id,name:p.name,location:room.parallel.playerStates?.[p.id]?.location,locationLabel:parallelLocationLabel(campaign,room.parallel.playerStates?.[p.id]?.location)})),
    worldSummary:parallelWorldSummary(room), clockTick:Number(room.parallel.clockTick||0), ended:Boolean(ps.ended), ending:ps.ending,
    storyItems:parallelStoryItems(room,player).map(id=>{ const item=parallelStoryItem(id); return {id,name:item?.name||id,tags:[...(item?.tags||[])],description:parallelStoryItemDescription(item),usableWhen:parallelStoryItemUsableWhen(item),value:Number(item?.value||0)}; }),
  };
}
function parallelSetNodeRaw(room,campaign,player,nextId){
  const ps=parallelPlayerState(room,player); if(!ps) return false;
  const next=campaign?.parallelStory?.nodes?.[nextId]; if(!next) return false;
  const oldLocation=ps.location;
  ps.previousLocation=oldLocation; ps.nodeId=nextId; ps.location=next.location||ps.location; ps.pendingTravel=null;
  return oldLocation!==ps.location;
}
function parallelSetNode(room,campaign,player,nextId,{syncLinked=false}={}){
  const ps=parallelPlayerState(room,player); if(!ps) return;
  const oldNodeId=ps.nodeId;
  const oldLocation=ps.location;
  // If the party chose to travel together, move the entire linked component even if an
  // older bug left one member on a stale location. Location equality must not decide
  // whether a declared travelling companion advances with the group.
  const companions=syncLinked ? parallelLinkedGroupMates(room,player).filter(other=>{
    const ops=parallelPlayerState(room,other); return ops && !ops.ended;
  }) : [];
  const moved=parallelSetNodeRaw(room,campaign,player,nextId);
  if(syncLinked){
    const revision=Number(room.parallel.sharedSceneRevision||0)+1;
    room.parallel.sharedSceneRevision=revision;
    ps.sharedRevision=revision;
    for(const other of companions){
      parallelSetNodeRaw(room,campaign,other,nextId);
      const ops=parallelPlayerState(room,other); if(ops) ops.sharedRevision=revision;
    }
    const newPs=parallelPlayerState(room,player);
    if(newPs){
      room.parallel.lastSharedScene={by:player.id,nodeId:newPs.nodeId,location:newPs.location,revision};
      room.parallel.sharedSceneLog ||= [];
      room.parallel.sharedSceneLog.push({by:player.id,byName:player.name,from:oldNodeId,to:newPs.nodeId,location:newPs.location,revision,ts:Date.now()});
      if(room.parallel.sharedSceneLog.length>24) room.parallel.sharedSceneLog.splice(0,room.parallel.sharedSceneLog.length-24);
    }
  } else if(moved){
    for(const linked of parallelLinkedGroupMates(room,player)){
      const lps=parallelPlayerState(room,linked);
      if(lps && !lps.ended && lps.location===oldLocation) lps.pendingTravel={from:player.id,location:parallelPlayerState(room,player)?.location,nodeId:nextId};
    }
  }
}
function parallelSyncLinkedScene(room,campaign,player){
  const ps=parallelPlayerState(room,player); if(!ps) return;
  for(const other of parallelLinkedGroupMates(room,player)){
    const ops=parallelPlayerState(room,other); if(!ops||ops.ended) continue;
    // A linked group explicitly chose to travel together, so its story scene is shared.
    // Do not require the stale pre-sync location to match; that requirement was what
    // left some companions behind on the joining scene.
    ops.nodeId=ps.nodeId; ops.location=ps.location; ops.pendingTravel=null;
  }
}
function parallelStartEncounter(room,campaign,player,key){
  const ps=parallelPlayerState(room,player); const def=campaign?.parallelStory?.enemies?.[key];
  if(!ps||!def) return null;
  const existing=room.parallel.encounters?.[ps.location];
  if(existing?.hp>0) return existing;
  const enc={id:crypto.randomUUID(),key,name:def.name,hp:def.hp,maxHp:def.hp,dc:def.dc,damage:def.damage,weak:def.weak,exposed:false,assist:0,round:1};
  room.parallel.encounters[ps.location]=enc;
  return enc;
}
function parallelApplySocial(room,campaign,player,choice){
  const ps=parallelPlayerState(room,player); const target=room.players.find(p=>p.id===choice.targetId); const key=target?pairKey(player.id,target.id):null;
  if(choice.action==='offer' && target){ room.parallel.offers[key]={from:player.id,to:target.id,location:ps.location}; return `${target.name}에게 함께 움직이자고 제안했다. 결정은 ${target.name}의 차례에 맡겨진다.`; }
  if(choice.action==='accept' && target){
    room.parallel.links[key]='together'; delete room.parallel.offers[key];
    const tps=parallelPlayerState(room,target);
    if(tps && tps.location===ps.location){
      ps.nodeId=tps.nodeId; ps.location=tps.location; ps.pendingTravel=null;
      parallelSyncLinkedScene(room,campaign,target);
      room.parallel.sharedSceneRevision=Number(room.parallel.sharedSceneRevision||0)+1;
      const revision=room.parallel.sharedSceneRevision;
      for(const member of parallelLinkedGroup(room,target)){ const mps=parallelPlayerState(room,member); if(mps) mps.sharedRevision=revision; }
      room.parallel.lastSharedScene={by:target.id,nodeId:tps.nodeId,location:tps.location,revision};
      room.parallel.sharedSceneLog ||= [];
      room.parallel.sharedSceneLog.push({by:target.id,byName:target.name,from:null,to:tps.nodeId,location:tps.location,revision,ts:Date.now()});
    }
    return `${target.name}와 같은 길을 함께 가기로 했다. 이제 헤어지기를 선택하기 전까지 두 사람은 같은 최신 장면으로 함께 이동하며, 각자의 턴과 판정은 따로 진행된다.`;
  }
  if(choice.action==='assist' && target){ delete room.parallel.offers[key]; ps.support=Math.min(2,Number(ps.support||0)+1); const tps=parallelPlayerState(room,target); if(tps)tps.support=Math.min(2,Number(tps.support||0)+1); return `${target.name}와 이번 문제만 함께 해결하기로 했다. 두 사람은 다음 판정에 도움을 얻는다.`; }
  if(choice.action==='decline' && target){ delete room.parallel.offers[key]; return `${target.name}와 지금은 각자 움직이기로 했다. 서로의 이야기는 다른 길에서 계속된다.`; }
  if(choice.action==='split' && target){ delete room.parallel.links[key]; delete room.parallel.offers[key]; return `${target.name}와 여기서 헤어져 각자 다른 방향을 맡기로 했다.`; }
  if(choice.action==='coordinate' && target){ ps.support=Math.min(2,Number(ps.support||0)+1); const tps=parallelPlayerState(room,target); if(tps)tps.support=Math.min(2,Number(tps.support||0)+1); return `${target.name}와 역할을 나눴다. 한 사람의 발견이 다른 사람의 다음 행동을 돕는다.`; }
  if(choice.action==='follow' && ps.pendingTravel){ const dest=ps.pendingTravel; ps.pendingTravel=null; parallelSetNode(room,campaign,player,dest.nodeId); return `${target?.name||'동료'}가 간 길을 따라 ${parallelLocationLabel(campaign,dest.location)}로 이동했다.`; }
  if(choice.action==='stay'){ ps.pendingTravel=null; return '동료를 따라가지 않고 현재 장소에 남아 자기 방식으로 조사를 계속하기로 했다.'; }
  return '각자의 판단을 확인했다.';
}
function parallelCombatAction(room,campaign,player,choice,roll,total,dc){
  const ps=parallelPlayerState(room,player); const enc=room.parallel.encounters?.[ps.location];
  if(!enc) return {ok:true,text:'위협은 이미 사라졌다.',consequence:'전투 종료'};
  const success=roll===20 || (roll!==1 && total>=dc);
  let text=''; let consequence=''; let fled=false;
  if(choice.action==='flee'){
    if(success){ const fallback=ps.location==='platform0'?'platform0gate':ps.location==='track'?'platform1':'concourse'; const targetNode=Object.entries(campaign.parallelStory.nodes).find(([,n])=>n.location===fallback)?.[0] || 'concourse'; parallelSetNode(room,campaign,player,targetNode,{syncLinked:true}); text=`${enc.name}의 시야에서 벗어나 ${parallelLocationLabel(campaign,fallback)} 쪽으로 빠져나왔다.`; consequence='전투 이탈'; fled=true; }
    else text=`${enc.name}이 퇴로를 막아 빠져나가지 못했다.`;
  } else if(choice.action==='analyze' || choice.action==='watch'){
    if(success){ enc.exposed=true; enc.assist=Math.min(2,Number(enc.assist||0)+1); text=`${enc.name}의 움직임에서 반복되는 틈을 찾아냈다. 다음 공격이 쉬워진다.`; consequence='약점 노출'; }
    else text=`패턴을 읽으려 했지만 ${enc.name}이 예상보다 빠르게 거리를 좁혔다.`;
  } else if(choice.action==='defend'){
    if(success){ player.skillState.guard=Math.max(Number(player.skillState?.guard||0),3); text=`${enc.name}의 공격을 받아내며 통로를 지켰다.`; consequence='다음 피해 최대 3 방어'; }
    else text='자세를 잡았지만 공격의 방향을 완전히 읽지 못했다.';
  } else if(choice.action==='distract'){
    if(success){ enc.assist=Math.min(3,Number(enc.assist||0)+2); text=`${enc.name}의 시선을 끌어 같은 장소의 동료가 움직일 틈을 만들었다.`; consequence='동료 공격 보정'; }
    else text='시선을 끌었지만 오히려 자신에게 공격이 집중됐다.';
  } else {
    if(success){ const damage=3+(roll===20?2:0)+(enc.exposed?1:0); enc.hp=Math.max(0,enc.hp-damage); enc.exposed=false; enc.assist=Math.max(0,Number(enc.assist||0)-1); text=`${enc.name}의 빈틈을 파고들어 ${damage} 피해를 입혔다.`; consequence=`적 HP ${enc.hp}/${enc.maxHp}`; }
    else text=`공격을 시도했지만 ${enc.name}이 몸을 비틀어 피했다.`;
  }
  if(enc.hp<=0){
    delete room.parallel.encounters[ps.location]; room.parallel.worldFlags[`cleared_${enc.key}`]=true; room.threat=Math.max(0,room.threat-1);
    const lootMap={shadow:'echo_story_access_token',conductor:'echo_story_zero_ticket',maintenanceTrain:'echo_story_signal_key'};
    const loot=lootMap[enc.key]; const got=loot?parallelGrantStoryItem(room,player,loot):false;
    return {ok:true,text:`${text} ${enc.name}은 더 이상 길을 막지 못했다.${got?` ${parallelStoryItem(loot)?.name}을 확보했다.`:''}`,consequence:`전투 승리 · 위협 -1${got?` · ${parallelStoryItem(loot)?.name} 획득`:''}`,success:true};
  }
  if(!fled){
    const guard=Math.max(0,Number(player.skillState?.guard||0)); const raw=Math.max(1,Number(enc.damage||2)-(success&&choice.action==='defend'?2:0)); const taken=Math.max(0,raw-guard);
    player.skillState.guard=Math.max(0,guard-raw);
    player.hp=Math.max(0,player.hp-taken);
    if(taken>0) consequence += `${consequence?' · ':''}반격 HP -${taken}`;
    if(player.hp<=0){ player.dead=true; player.deathReason=`${enc.name}과의 싸움에서 쓰러졌다.`; ps.ended=true; ps.ending='fallen'; ps.endingText=player.deathReason; }
  }
  enc.round=Number(enc.round||1)+1;
  return {ok:success,text,consequence,success};
}
function parallelEndingText(code,player,room){
  const f=room.parallel?.worldFlags||{};
  const bond=parallelLinkedPlayers(room,player).map(p=>p.name);
  const base={escaped:'셔터 너머 실제 아침 거리로 빠져나왔다.',first_train:'정상 첫차에 올라 청명역을 벗어났다.',witness:'0번 운행의 기록을 손에 쥔 채 역을 빠져나왔다.',sealed:'0번 경로를 닫는 데 끝까지 남았다가 마지막 순간 밖으로 나왔다.',observer:'두 열차가 겹치지 않고 사라지는 순간을 끝까지 지켜봤다.',zero_passenger:'0번 승차권을 사용해 지도에 없는 열차에 올랐다. 그 뒤의 도착 기록은 남지 않았다.',all_clear:'정상 운행표와 0번 경로를 모두 정리해 청명역을 하나의 현실로 되돌렸다.',thief_escape:'훔친 접근 수단으로 가장 빠른 길을 열어 역을 빠져나왔지만 CCTV 기록은 지워지지 않았다.',station_keeper:'루트 코어를 직접 붙잡고 다른 사람들이 나갈 때까지 역의 두 경로를 유지했다.'}[code]||'청명역의 새벽을 살아서 맞았다.';
  const shared=[]; if(f.zero_sealed)shared.push('0번 신호는 봉쇄됐다'); if(f.evidence)shared.push('증거가 남았다'); if(f.rescued_passenger)shared.push('남은 승객을 구했다'); if(bond.length)shared.push(`${bond.join(', ')}와 끝까지 연결된 선택을 남겼다`);
  return `${player.name}은(는) ${base}${shared.length?` ${shared.join(' · ')}.`:''}`;
}
const PARALLEL_CAMPAIGN_ENDINGS={
  ember:{truth:['재판대 위의 왕국','증언과 서약을 끝까지 모아 왕좌보다 정통성을 먼저 세웠다.'],survival:['왕관을 거부한 섭정','무너지는 권력 속에서 살아남을 질서를 먼저 만들고 왕관의 욕망에서 한 발 물러섰다.'],bond:['두 번째 서약','귀족과 망령, 생존자 사이에 새로운 약속을 만들어 왕국을 한 사람의 희생 없이 이어 갔다.'],fracture:['재 속의 휴전','모든 문제를 풀지는 못했지만 내전을 멈출 만큼의 진실과 생존자를 남겼다.']},
  neon:{truth:['원본 없는 진실','기억의 진위를 가르는 대신 누가 편집했는지와 누가 동의했는지를 공개했다.'],survival:['추적망 밖의 시민','도시 통제망을 완전히 무너뜨리기보다 사람들이 기억을 가지고 빠져나갈 통로를 만들었다.'],bond:['서로의 백업','완벽한 원본 대신 서로의 증언을 보존하는 시민 네트워크를 남겼다.'],fracture:['깨진 백업본','일부 기억은 잃었지만 MOTHER-9가 독점하던 기억의 권한에 균열을 냈다.']},
  abyss:{truth:['심연과의 첫 문장','탈라스의 신호를 위협이 아닌 언어로 읽어 첫 접촉의 기록을 수면 위로 가져갔다.'],survival:['산소가 남은 상승','모든 연구를 포기하더라도 사람과 잠수정을 우선해 살아 돌아오는 길을 만들었다.'],bond:['구조 대상은 둘이었다','인간 생존자와 심해 생명 어느 한쪽도 버리지 않는 구조 결정을 남겼다.'],fracture:['불완전한 부상','기지는 잃었지만 생존자와 경고 기록을 지켜 다음 잠수를 가능하게 했다.']},
  clock:{truth:['기억하는 내일','반복을 완벽히 지우지 않고 루프의 규칙을 기억한 채 내일로 넘어갔다.'],survival:['한 번뿐인 하루','미래의 완벽함보다 다시 반복되지 않는 불완전한 하루를 선택했다.'],bond:['이름을 나눈 도시','사라지는 사람들의 기억을 여러 사람에게 나누어 누구도 완전히 지워지지 않게 했다.'],fracture:['금 간 초침','루프는 끝났지만 일부 시간이 돌아오지 않았다. 도시는 그 빈틈까지 역사로 받아들였다.']},
  wild:{truth:['별의 순환을 읽은 자','별이 숲을 먹는 것이 아니라 숲과 하늘 사이를 순환하고 있음을 밝혀냈다.'],survival:['새 길을 낸 숲','모든 갈등을 풀기보다 부족과 짐승이 함께 살아남을 새로운 이동 경로를 남겼다.'],bond:['숲과 맺은 약속','부족·정령·신수의 요구를 연결해 어느 한쪽의 승리보다 오래 갈 약속을 만들었다.'],fracture:['반쪽짜리 별자리','숲은 완전히 회복되지 않았지만 별 하나와 부족 하나를 잃는 최악의 미래는 피했다.']},
  guardian:{truth:['세계들의 지도','각 지역에서 얻은 증거와 관계를 이어 침략의 경로와 세계 사이의 연결을 밝혀냈다.'],survival:['돌아가는 길을 지킨 수호자','모든 전장을 이기기보다 사람들이 왕국으로 돌아올 길과 지역의 자립을 남겼다.'],bond:['경계 너머의 동료들','서로 다른 세계에서 만든 인연이 마지막에 하나의 연합이 되어 귀환 이후의 질서를 바꿨다.'],fracture:['흩어진 세계의 약속','모든 세계를 구하지는 못했지만 끊어질 뻔한 몇 개의 연결과 사람들을 지켜냈다.']}
};
function parallelCampaignPersonalEnding(campaign,player,ps){
  const totals=ps?.pathTotals||{}; const history=ps?.history||[];
  const failures=history.filter(h=>h.grade==='failure'||h.grade==='disaster').length;
  const key=failures>=Math.max(3,Math.ceil(history.length/2))?'fracture':(['truth','survival','bond'].sort((a,b)=>Number(totals[b]||0)-Number(totals[a]||0))[0]||'truth');
  const [title,text]=(PARALLEL_CAMPAIGN_ENDINGS[campaign?.id]?.[key]||['각자의 결말',`${campaign?.title||'이 이야기'}에서 자신만의 길을 남겼다.`]);
  return `${player.name} · ${title} — ${text}`;
}
function parallelEvaluateEnding(room,campaign){
  if(!parallelEnabled(room,campaign)) return false;
  const active=room.players.filter(p=>p.hp>0 && !parallelPlayerState(room,p)?.ended);
  if(active.length) return false;
  const lines=room.players.map(p=>parallelPlayerState(room,p)?.endingText || `${p.name}의 행방은 기록에 남지 않았다.`);
  const survivors=room.players.filter(p=>p.hp>0).length;
  room.storyComplete=true; room.phase='ending';
  const endingTitle=campaign?.id==='echo' ? '종착역 0번선 · 각자의 아침' : `${campaign?.title || '연대기'} · 서로 다른 결말`;
  const endingLead=campaign?.id==='echo' ? '같은 역 안에 있었지만 모두가 같은 길을 걷지는 않았다.' : '같은 세계에서 시작했지만 각자의 선택과 동선은 달랐고, 만남과 이별 역시 플레이어들의 결정으로 남았다.';
  room.ending={victory:survivors>0,title:endingTitle,text:`${endingLead}\n\n${lines.join('\n')}\n\n${parallelWorldSummary(room).join(' ')}`};
  return true;
}
function parallelAdvance(room,campaign,player,payload,ack){
  const ps=parallelPlayerState(room,player); if(!ps||ps.ended) return ack?.({ok:false,error:'이 플레이어의 이야기는 이미 끝났습니다.'});
  // Repair stale linked-party state from the newest scene revision, not from whichever
  // member happens to take the next turn. This prevents a later turn from pulling the
  // whole party back to the scene where they first joined.
  const group=parallelLinkedGroup(room,player).filter(p=>!parallelPlayerState(room,p)?.ended);
  if(group.length>1){
    let canonical=null;
    for(const member of group){
      const mps=parallelPlayerState(room,member); if(!mps) continue;
      const candidate={player:member,ps:mps,revision:Number(mps.sharedRevision||0),progress:Number(mps.progress||0)};
      if(!canonical || candidate.revision>canonical.revision || (candidate.revision===canonical.revision && candidate.progress>canonical.progress)) canonical=candidate;
    }
    const marker=room.parallel?.lastSharedScene;
    if(marker && group.some(p=>p.id===marker.by) && campaign?.parallelStory?.nodes?.[marker.nodeId] && Number(marker.revision||0)>=Number(canonical?.revision||0)){
      canonical={player:group.find(p=>p.id===marker.by)||player,ps:{nodeId:marker.nodeId,location:marker.location,sharedRevision:Number(marker.revision||0)},revision:Number(marker.revision||0),progress:Number(canonical?.progress||0)};
    }
    if(canonical?.ps?.nodeId && campaign?.parallelStory?.nodes?.[canonical.ps.nodeId]){
      for(const member of group){
        const mps=parallelPlayerState(room,member); if(!mps) continue;
        mps.nodeId=canonical.ps.nodeId;
        mps.location=canonical.ps.location||campaign.parallelStory.nodes[canonical.ps.nodeId]?.location||mps.location;
        mps.sharedRevision=Number(canonical.revision||mps.sharedRevision||0);
        mps.pendingTravel=null;
      }
    }
  }
  const scene=parallelRenderedScene(room,campaign,player); if(!scene) return ack?.({ok:false,error:'개인 장면을 찾을 수 없습니다.'});
  const choiceIndex=Number(payload?.choiceIndex); const choice=scene.choices?.[choiceIndex];
  if(!choice) return ack?.({ok:false,error:'선택지가 올바르지 않습니다.'});
  const automatic=Boolean(choice.automatic);
  const ability=player.abilities?.[choice.stat]; if(!automatic && !ability) return ack?.({ok:false,error:'능력치가 없습니다.'});
  const roll=automatic?null:rand(20); const base=automatic?0:mod(effectiveAbilityTotal(room,player,choice.stat)); const gear=automatic?0:equipmentStatBonus(room,player,choice.stat); const support=Math.min(2,Number(ps.support||0)); const encounter=room.parallel.encounters?.[ps.location]; const encounterAssist=choice.kind==='parallel-combat'?Math.min(2,Number(encounter?.assist||0)):0; const status=automatic?0:statusPenaltyForCheck(room,player,choice.stat); const total=automatic?null:roll+base+gear+support+encounterAssist+status; const dc=Math.max(7,Number(choice.dc||8)); const success=automatic?true:(roll===20 || (roll!==1 && total>=dc)); const grade=automatic?'success':storyOutcomeGrade(roll,total,dc);
  ps.support=0;
  if(!automatic) emitRoll(room,player,{sides:20,result:roll,purpose:`${scene.title} · ${choice.stat} 판정 · DC ${dc}`,kind:'parallel-story',stat:choice.stat,total,dc,success,modifiers:[{label:`${choice.stat} 보정`,value:base},{label:'장비',value:gear},{label:'협력',value:support+encounterAssist},{label:'상태',value:status}].filter(m=>m.value)});
  let narrative=''; let consequence='';
  if(choice.kind==='parallel-social'){
    narrative=parallelApplySocial(room,campaign,player,choice); consequence='관계와 동선이 갱신됨';
  } else if(choice.kind==='parallel-item-transfer'){
    const target=room.players.find(p=>p.id===choice.targetId); const item=parallelStoryItem(choice.itemId);
    if(target&&parallelTransferItem(room,player,target,choice.itemId)){ narrative=`${target.name}에게 ${item?.name||'물건'}을 건넸다. 이제 그 플레이어의 선택지에도 이 물건을 쓰는 방법이 열릴 수 있다.`; consequence='아이템 전달'; }
    else { narrative='물건을 전달하지 못했다.'; consequence='변화 없음'; }
  } else if(choice.kind==='parallel-combat'){
    const beforeEncounter=room.parallel.encounters?.[ps.location];
    const attempt=parallelCombatAttemptText(player,choice,beforeEncounter);
    const r=parallelCombatAction(room,campaign,player,choice,roll,total,dc);
    narrative=`${attempt} ${r.text}`; consequence=r.consequence;
  } else {
    narrative=success ? (choice.success||`${choice.label}에 성공했다.`) : (choice.failure||`${choice.label}을 시도했지만 대가가 남았다.`);
    if(!success && grade==='mixed') narrative=`${choice.success||narrative} 하지만 작은 대가가 남았다.`;
    const storyPass=success || grade==='mixed';
    if(storyPass && choice.flag) ps.flags[choice.flag]=true;
    if(storyPass && choice.worldFlag) room.parallel.worldFlags[choice.worldFlag]=true;
    if(storyPass && choice.buff) ps.support=Math.min(2,Number(ps.support||0)+1);
    if(storyPass && campaign.id!=='echo' && ['take-item','steal'].includes(String(choice.actionType||''))){
      const sceneItem=parallelCampaignSceneItem(campaign,parallelNode(room,campaign,player));
      if(sceneItem) choice.grantItem ||= sceneItem.id;
    }
    const rewardNotes=storyPass?parallelApplyChoiceRewards(room,campaign,player,choice):[];
    if(choice.resolveThreadId){ const t=(ps.outcomeThreads||[]).find(x=>x.id===choice.resolveThreadId); if(t) t.resolved=true; }
    const createdThread=parallelOutcomeThread(room,campaign,player,parallelNode(room,campaign,player),choice,grade,success);
    if(Number(choice.threatDelta||0)) room.threat=Math.max(0,Math.min(MAX_THREAT,room.threat+Number(choice.threatDelta||0)));
    if(!success && grade!=='mixed'){
      const status=storyFailureStatus(choice,room,player); const applied=applyStatus(player,status);
      consequence=[consequence,`${applied.label} ${applied.stacks>1?`x${applied.stacks}`:''}`.trim()].filter(Boolean).join(' · ');
      if(grade==='disaster' && roll!==1){ player.hp=Math.max(0,player.hp-1); consequence=[consequence,'큰 실패 HP -1'].filter(Boolean).join(' · '); }
    }
    const nextId=storyPass ? (choice.nextSuccess || choice.next) : (choice.nextFailure || choice.nextSuccess || choice.next);
    narrative=`${narrative} ${parallelImmersiveOutcome(room,campaign,player,parallelNode(room,campaign,player),choice,grade,nextId)}`.trim();
    if(nextId==='__ENDING__'){
      ps.ended=true; ps.ending='completed';
      ps.endingText=parallelCampaignPersonalEnding(campaign,player,ps);
      narrative=`${narrative} ${ps.endingText}`;
    } else if(nextId) parallelSetNode(room,campaign,player,nextId,{syncLinked:true});
    if(choice.combat) parallelStartEncounter(room,campaign,player,choice.combat);
    if(choice.ending){ ps.ended=true; ps.ending=choice.ending; ps.endingText=parallelEndingText(choice.ending,player,room); narrative=`${narrative} ${ps.endingText}`; }
    const priorConsequence=consequence;
    if(success){ room.threat=Math.max(0,room.threat-(roll===20?1:0)); consequence=[roll===20?'대성공 · 위협 -1':'성공',priorConsequence].filter(Boolean).join(' · '); }
    else { room.threat=Math.min(MAX_THREAT,room.threat+1); consequence=[grade==='mixed'?'부분 성공 · 위협 +1':'실패 · 위협 +1',priorConsequence].filter(Boolean).join(' · '); if(roll===1){ player.hp=Math.max(0,player.hp-1); consequence+=' · HP -1'; } }
    if(rewardNotes.length) consequence=[consequence,...rewardNotes].filter(Boolean).join(' · ');
  }
  ps.progress=Number(ps.progress||0)+1; ps.history.push({nodeId:scene.id,choice:choice.label,success,grade,path:choice.path||statPath(choice.stat||'지혜'),roll,total,dc,ts:Date.now()}); if(ps.history.length>20)ps.history.splice(0,ps.history.length-20);
  ps.lastPersonalResult={choiceLabel:choice.label,text:narrative,consequence,success:success||grade==='mixed',grade};
  room.parallel.clockTick=Number(room.parallel.clockTick||0)+1;
  room.parallel.incidentLog.push({playerId:player.id,playerName:player.name,location:ps.location,choice:choice.label,text:narrative,ts:Date.now()}); if(room.parallel.incidentLog.length>40)room.parallel.incidentLog.splice(0,room.parallel.incidentLog.length-40);
  room.story=Object.values(room.parallel.playerStates).reduce((sum,s)=>sum+Number(s.progress||0),0);
  room.lastResolution={source:'parallel-story',ok:success||grade==='mixed',outcomeGrade:grade,result:roll,total,dc,playerId:player.id,playerName:player.name,choiceLabel:choice.label,text:narrative,consequence};
  room.phase='story'; room.pendingContinue=null;
  pushChat(room,{type:'action',author:player.name,text:`${parallelLocationLabel(campaign,scene.location)} · ${choice.label}`});
  pushChat(room,{type:success?'success':'failure',author:'GM',text:automatic?'플레이어의 관계·이동 선택이 그대로 반영되었습니다.':`${choice.stat} 판정 ${total} / DC ${dc} → ${grade==='critical'?'대성공':grade==='success'?'성공':grade==='mixed'?'부분 성공':grade==='disaster'?'큰 실패':'실패'}`});
  advanceSkillClock(room,1);
  if(parallelEvaluateEnding(room,campaign)){ sync(room); return ack?.({ok:true,ending:true}); }
  advanceTurn(room);
  sync(room); ack?.({ok:true,result:ps.lastPersonalResult});
}

const STORY_STATUS_DEFS = {
  '지능': { key:'confused', label:'혼란', desc:'정보가 엉키며 판단이 흔들립니다.', checkPenalty:2, stats:['지능','지혜'], attackPenalty:0, duration:2 },
  '지혜': { key:'shaken', label:'동요', desc:'불길한 징후가 계속 떠올라 집중이 흐려집니다.', checkPenalty:2, stats:['지혜','매력'], attackPenalty:0, duration:2 },
  '민첩': { key:'sprain', label:'발목 부상', desc:'움직임이 둔해져 재빠른 대응이 어렵습니다.', checkPenalty:2, stats:['민첩','근력'], attackPenalty:1, duration:2 },
  '근력': { key:'bruise', label:'타박상', desc:'정면 돌파의 여파로 몸이 무거워졌습니다.', checkPenalty:1, stats:['근력'], attackPenalty:1, duration:2 },
  '체력': { key:'fatigue', label:'탈진', desc:'거친 장면의 부담으로 기력이 크게 소모됐습니다.', checkPenalty:1, stats:['근력','민첩','체력','지능','지혜','매력'], attackPenalty:1, duration:2 },
  '매력': { key:'suspected', label:'의심받음', desc:'말실수의 여파로 사람들의 경계가 강해졌습니다.', checkPenalty:2, stats:['매력'], attackPenalty:0, duration:2 },
};

function activeStatuses(room, player) {
  return (player?.statuses || [])
    .filter(status => Number(status.expiresAtStory || 0) > Number(room?.story || 0))
    .map(status => ({ ...status, stacks: Math.max(1, Number(status.stacks || 1)), remainingScenes: Math.max(0, Number(status.expiresAtStory || 0) - Number(room?.story || 0)) }));
}

function statusPenaltyForCheck(room, player, stat) {
  return activeStatuses(room, player).reduce((sum, status) => {
    if (!status.stats?.length || status.stats.includes(stat)) return sum - Number(status.checkPenalty || 0) * Math.max(1, Number(status.stacks || 1));
    return sum;
  }, 0);
}

function statusPenaltyForAttack(room, player, stat) {
  return activeStatuses(room, player).reduce((sum, status) => {
    const hitByStat = !status.stats?.length || status.stats.includes(stat);
    return sum - Number(hitByStat ? (status.attackPenalty || 0) : 0) * Math.max(1, Number(status.stacks || 1));
  }, 0);
}

function applyStatus(player, status) {
  player.statuses ||= [];
  const existing = player.statuses.find(item => item.key === status.key);
  if (existing) {
    existing.stacks = Math.min(5, Math.max(1, Number(existing.stacks || 1)) + 1);
    existing.expiresAtStory = Math.max(Number(existing.expiresAtStory || 0), Number(status.expiresAtStory || 0));
    existing.checkPenalty = Math.max(Number(existing.checkPenalty || 0), Number(status.checkPenalty || 0));
    existing.attackPenalty = Math.max(Number(existing.attackPenalty || 0), Number(status.attackPenalty || 0));
    existing.desc = status.desc;
    existing.stats = status.stats;
    return existing;
  }
  status.stacks = 1;
  player.statuses.push(status);
  return status;
}

function storyFailureStatus(choice, room, player = null) {
  const template = STORY_STATUS_DEFS[choice?.stat] || STORY_STATUS_DEFS['체력'];
  const resistance = player ? derivedAbilityImpact(player).statusResistance : 0;
  const duration = Math.max(1, Number(template.duration || 2) - resistance);
  return {
    id: token(),
    key: template.key,
    label: template.label,
    desc: resistance ? `${template.desc} 높은 체력 덕분에 회복이 더 빠릅니다.` : template.desc,
    checkPenalty: template.checkPenalty,
    attackPenalty: template.attackPenalty,
    stats: [...(template.stats || [])],
    expiresAtStory: Number(room.story || 0) + duration + 1,
  };
}

function dominantStoryPath(room) {
  const totals = room?.pathTotals || {};
  const ranked = Object.entries({ truth: 0, survival: 0, bond: 0, ...totals }).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || 'truth';
}

const CAMPAIGN_ENDING_VARIANTS = {
  ember: {
    careful:{title:'왕관 없는 새벽', text:'왕관의 거짓과 봉인의 원리를 끝까지 밝혀낸 끝에, 누구도 왕관의 욕망을 이어받지 않는 길을 열었습니다. 왕국은 불완전하지만 처음으로 스스로의 선택을 시작합니다.'},
    bold:{title:'재 위에 선 새로운 질서', text:'위험을 정면으로 감수하며 왕관과 왕좌의 힘을 꺾었습니다. 왕국은 큰 상처를 입었지만 누가 지배할지보다 누가 책임질지가 새로운 질서의 기준이 됩니다.'},
    empathetic:{title:'죽은 자와 산 자의 두 번째 맹세', text:'망령과 인간, 적대 세력 사이의 약속을 끝까지 붙들었습니다. 왕관은 완전히 사라지지 않았지만 한 사람의 희생이 아닌 공동의 봉인으로 다시 잠듭니다.'},
  },
  neon: {
    careful:{title:'기억의 소유권', text:'삭제와 조작의 근원을 밝혀 시민들이 자신의 기억을 직접 선택하고 보관할 수 있는 체계를 열었습니다. 루멘-9는 더 이상 하나의 AI만이 진실을 결정하지 않습니다.'},
    bold:{title:'루멘-9 리부트', text:'도시의 통제 구조를 강제로 끊고 위험한 재시작을 선택했습니다. 많은 것이 흔들렸지만, 처음으로 도시의 미래가 예측 불가능한 인간의 선택에 맡겨졌습니다.'},
    empathetic:{title:'서로 기억해 주는 도시', text:'개인의 기억보다 관계와 증언을 지키는 길을 선택했습니다. 완벽한 원본은 찾지 못했지만, 사람들은 서로의 삶을 증명하며 새로운 도시 기록을 만들어 갑니다.'},
  },
  abyss: {
    careful:{title:'심연의 언어', text:'세이렌과 탈라스 사이의 신호를 끝까지 해독해 공격과 구조 요청을 구분해 냈습니다. 인간은 처음으로 심해 생명과 협상 가능한 존재가 됩니다.'},
    bold:{title:'마지막 잠수정의 상승', text:'붕괴하는 기지와 압력을 뚫고 생존자들을 끌어냈습니다. 뒤에는 잃어버린 연구기지가 남았지만, 살아 돌아온 증언이 심연의 진실을 세상에 남깁니다.'},
    empathetic:{title:'구조 대상은 하나가 아니었다', text:'인간과 탈라스 어느 한쪽도 버리지 않는 길을 택했습니다. 가장 느리고 위험한 선택이었지만 수면 위로 올라온 것은 구조대만이 아니었습니다.'},
  },
  clock: {
    careful:{title:'한 번뿐인 내일', text:'루프의 규칙과 대가를 밝혀 시간을 완전히 지우지 않고 내일로 넘어가는 길을 만들었습니다. 완벽한 하루 대신 다시는 반복되지 않는 하루가 시작됩니다.'},
    bold:{title:'부서진 열세 번째 종', text:'열세 번째 탑의 장치를 정면으로 파괴해 반복을 끝냈습니다. 재앙의 일부는 현실이 되었지만 도시는 처음으로 결과를 받아들이고 앞으로 나아갑니다.'},
    empathetic:{title:'기억을 나눈 도시', text:'사라지는 사람들의 기억을 서로에게 나누어 한 사람의 희생 없이 루프의 무게를 분산했습니다. 도시의 역사는 완벽하지 않지만 아무도 완전히 잊히지 않습니다.'},
  },
  wild: {
    careful:{title:'별을 돌려보낸 숲', text:'별과 숲의 순환을 이해해 마지막 별을 하늘로 되돌릴 방법을 찾아냈습니다. 숲은 힘을 잃는 대신 스스로 살아가는 법을 다시 배웁니다.'},
    bold:{title:'새로운 별자리', text:'별핵의 힘을 직접 다루어 기존 질서를 깨고 새로운 별자리를 만들었습니다. 숲과 하늘은 이전과 다른 규칙으로 이어지지만 멸망은 피했습니다.'},
    empathetic:{title:'숲과 맺은 마지막 약속', text:'부족과 야수, 숲의 의지를 모두 듣고 누구도 완전히 승리하지 않는 합의를 만들었습니다. 마지막 별은 사라지지 않고 숲과 하늘 사이의 약속이 됩니다.'},
  },  guardian: {
    careful:{title:'유적의 진실을 품은 수호자', text:'챔피언 소드의 시험을 힘보다 판단과 기록으로 풀어내며, 캔터베리가 왜 이 검을 남겼는지 끝까지 이해했습니다. 검은 파티를 받아들였고, 공주는 다음 여정을 단순한 도주가 아니라 왕국을 되찾기 위한 첫 걸음으로 선택합니다.'},
    bold:{title:'숲을 가른 첫 번째 수호자', text:'고블린과 용병, 침략자의 잔당과 유적 수호 시험을 정면으로 돌파했습니다. 많은 상처를 남겼지만 마지막 순간 검을 먼저 쥐기보다 동료를 지키는 선택으로 챔피언 소드의 인정을 얻었습니다.'},
    empathetic:{title:'공주가 기억한 이름들', text:'숲에서 만난 주민, 하얀 짐승, 로레인과 공주의 관계를 끝까지 놓지 않았습니다. 챔피언 소드는 한 사람의 힘이 아니라 지켜낸 관계에 반응했고, 파티는 더 많은 동료와 약속을 안고 다음 세계를 향합니다.'},
  },

};


CAMPAIGN_ENDING_VARIANTS.guardian1 = {
  careful:{title:'첫 연대기의 기록자',text:'캔터베리에서 광기의 사막까지 이어진 사건을 단서와 판단으로 엮어, 침략이 세계마다 다른 얼굴을 하고 있다는 사실을 밝혔습니다.'},
  bold:{title:'네 세계를 돌파한 수호자',text:'숲과 기계도시, 학교와 사막을 정면으로 헤쳐 나가며 다음 챔피언을 향한 길을 열었습니다.'},
  empathetic:{title:'공주가 모은 첫 번째 동료들',text:'월드 1~4에서 만난 사람을 가능한 한 지키며, 다음 여행에서 다시 손을 내밀 동료와 약속을 남겼습니다.'}
};
CAMPAIGN_ENDING_VARIANTS.guardian2 = {
  careful:{title:'갈라진 세계의 진실',text:'셴의 수련, 작은 여관, 던전, 설산의 사건을 관통하는 모순을 밝혀 라 제국으로 이어지는 위험을 먼저 알아챘습니다.'},
  bold:{title:'챔피언들의 전진',text:'월드 5~8의 위기와 시험을 돌파하며 흩어진 챔피언들의 힘을 하나의 원정대로 모았습니다.'},
  empathetic:{title:'눈 속에서도 남은 약속',text:'경쟁자와 작은 존재, 모험가와 누명 쓴 사람들을 외면하지 않았고 그 관계가 라 제국으로 향하는 길의 버팀목이 되었습니다.'}
};
CAMPAIGN_ENDING_VARIANTS.guardian3 = {
  careful:{title:'기록되지 않은 세계의 증언',text:'라 제국과 10년 뒤 미래의 기록을 끝까지 확인해, 기사의 부재와 침략자의 계획이 만든 시간을 이해한 채 마지막 문 앞에 섰습니다.'},
  bold:{title:'헤븐홀드 탈환',text:'저항군과 동맹을 이끌고 점령된 헤븐홀드를 정면으로 되찾아, 미래가 반드시 패배로 끝나는 것은 아니라는 사실을 증명했습니다.'},
  empathetic:{title:'두 공주에게 남긴 약속',text:'작은 공주와 미래 공주, 과거와 미래 어느 한쪽도 단순한 정답으로 취급하지 않고 마지막 선택의 대가를 스스로 짊어졌습니다.'}
};

CAMPAIGN_ENDING_VARIANTS.guardian = {
  careful:{title:'월드 1에서 미래까지 이어진 증언',text:'캔터베리 숲에서 시작한 단서들을 라 제국과 10년 뒤의 기록까지 끝까지 연결해 침략자의 계획과 기사의 부재가 만든 역사를 이해했습니다. 챔피언 소드의 첫 빛과 헤븐홀드의 마지막 문이 하나의 여정으로 이어집니다.'},
  bold:{title:'헤븐홀드까지 멈추지 않은 수호자',text:'캔터베리의 폐허부터 셴, 던전, 설산, 라 제국과 미래 전장까지 정면으로 돌파했습니다. 앞 세계의 상처와 동료들이 마지막 탈환전에 실제 힘으로 합류했습니다.'},
  empathetic:{title:'두 공주와 모든 세계에 남긴 약속',text:'작은 공주와 미래 공주, 숲의 주민과 챔피언, 난민과 저항군을 하나의 긴 관계로 이어 왔습니다. 마지막 선택은 어느 한 시간을 버리는 답이 아니라 지금까지 지킨 사람들의 기억을 함께 남기는 약속이 되었습니다.'}
};
CAMPAIGN_ENDING_VARIANTS.echo = {
  careful:{title:'서로 다른 원본들의 기록',text:'하나의 절대적인 기억을 강요하지 않고 모순되는 증언을 함께 남겼습니다. 아스테라는 완벽한 진실 대신 검증 가능한 기록을 선택합니다.'},
  bold:{title:'깨진 성좌 아래의 새벽',text:'기억 편집 시스템의 중심을 끊어 도시가 스스로 기억을 되찾게 했습니다. 일부 기록은 사라졌지만 누구도 다시 한 사람의 원본에 종속되지 않습니다.'},
  empathetic:{title:'기억은 서로에게 남는다',text:'삭제된 주민과 죽은 탐사대, 현재의 파티가 서로의 증언을 보존하도록 연결했습니다. 유리별이 없어도 기억이 사람 사이에서 살아남는 도시가 시작됩니다.'}
};
CAMPAIGN_ENDING_VARIANTS.aurora = {
  careful:{title:'붉은 하늘의 보관소',text:'빙하의 기억층을 파괴하지 않고 관측소의 기록과 함께 봉인하는 길을 택했습니다. 수십 년의 목소리는 사라지지 않았고, 누구도 마음대로 소유할 수 없는 공동 기록으로 남았습니다.'},
  bold:{title:'극광 아래 공개된 밤',text:'제7관측소가 숨겨 온 연구와 창설 원정대의 기록을 전 세계 송신망에 공개했습니다. 관측소는 기능을 잃었지만 붉은 하늘 아래 감춰졌던 진실은 다시 지워질 수 없게 되었습니다.'},
  empathetic:{title:'살아 있는 사람부터',text:'완벽한 연구 성과보다 눈보라 속 생존자와 구조대를 우선했습니다. 기억층의 일부는 잃었지만, 살아 돌아온 사람들이 서로의 증언을 이어 다음 조사와 책임을 시작했습니다.'},
};
CAMPAIGN_ENDING_VARIANTS.masque = {
  careful:{title:'이름을 되찾은 월식',text:'가면과 원고의 규칙을 끝까지 추적해 마지막 장면을 원래의 형태로 복원했습니다. 월식이 끝나자 사람들은 맡은 배역이 아니라 자신의 이름으로 서로를 부르기 시작했습니다.'},
  bold:{title:'찢어진 마지막 장',text:'천 년 동안 도시를 묶어 둔 마지막 원고를 무대 위에서 찢고 즉흥적인 결말을 선택했습니다. 나실라트의 오래된 질서는 무너졌지만 누구도 다시 정해진 배역으로 돌아가지 않았습니다.'},
  empathetic:{title:'사막을 걷는 새 극단',text:'도시를 끝내거나 영원히 보존하는 대신, 주민들이 원하는 이름과 배역을 스스로 고르게 했습니다. 월식 뒤에도 극단은 남았고, 움직이는 공연과 함께 도시의 기억을 사막 밖으로 옮기기 시작했습니다.'},
};


function actionLegacy(room) {
  const history = room.storyHistory || [];
  const counts = {};
  for (const h of history) {
    const key = String(h.choiceId || h.declaration || '').toLowerCase();
    const type = key.includes('FIGHT') || /싸운/.test(h.declaration||'') ? 'fight'
      : key.includes('STEAL') || /훔친/.test(h.declaration||'') ? 'steal'
      : key.includes('PERSUADE') || /설득/.test(h.declaration||'') ? 'persuade'
      : key.includes('TAIL') || /미행/.test(h.declaration||'') ? 'tail'
      : key.includes('HELP') || /돕/.test(h.declaration||'') ? 'help'
      : key.includes('INVESTIGATE') || /조사/.test(h.declaration||'') ? 'investigate' : 'other';
    counts[type] = Number(counts[type] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const top = ranked[0]?.[0] || 'other';
  return ({fight:['피로 길을 연 자들','힘으로 길을 만든 선택이 가장 오래 남았습니다.'],steal:['금지된 것을 손에 넣은 자들','남의 문과 주머니를 열어 얻은 비밀이 결말의 모양을 바꿨습니다.'],persuade:['말로 전쟁을 늦춘 자들','칼보다 대화가 더 많은 문을 열었습니다.'],tail:['그림자를 끝까지 좇은 자들','누군가의 뒤를 놓치지 않은 집요함이 숨은 진실을 끌어냈습니다.'],help:['끝까지 사람을 놓지 않은 자들','살려 둔 사람과 지켜 낸 약속이 마지막 순간 돌아왔습니다.'],investigate:['모순을 끝까지 파고든 자들','작은 흔적을 버리지 않은 선택이 거대한 거짓을 무너뜨렸습니다.'],other:['예측할 수 없는 자들','한 가지 방식에 갇히지 않은 선택들이 전혀 다른 결말을 만들었습니다.']})[top];
}
function tragicEnding(room) {
  const dead = room.players.filter(p=>Number(p.hp||0)<=0);
  const reasons = dead.map(p=>p.deathReason).filter(Boolean);
  const world = room.campaignId;
  const titles = {
    ember:['재가 이름을 덮은 밤','왕관보다 먼저 끝난 연대기'], neon:['삭제된 마지막 사용자','도시가 기억하지 못한 죽음'], abyss:['수면에 닿지 못한 이름들','심연이 돌려주지 않은 사람들'],
    clock:['다음 반복에 없는 사람들','열세 번째 종 뒤의 빈자리'], wild:['숲이 삼킨 발자국','별빛 아래 남은 마지막 흔적'], guardian:['시간을 건넌 여정의 빈자리','헤븐홀드에 돌아오지 못한 이름들'], guardian1:['모험이 끝난 자리','캔터베리로 돌아오지 못한 사람들'], guardian2:['다음 세계에 닿지 못한 동료들','여정에서 사라진 이름'], guardian3:['미래가 되돌려주지 않은 사람들','헤븐홀드에 남은 빈자리']
  }[world] || ['끝나 버린 연대기','돌아오지 못한 사람들'];
  const seed=(dead.length + Number(room.failureCount||0) + Number(room.threat||0))%titles.length;
  return {
    victory:false,title:titles[seed],
    text: reasons.length ? `${reasons.join(' ')} 살아남은 기록은 이 죽음을 지우지 않는다. 이 결말 역시 플레이어들의 선택이 만든 하나의 연대기다.` : '파티는 더 이상 앞으로 나아갈 수 없었다. 그러나 어디에서 무엇을 선택했는지가 이 패배의 모양을 만들었다.'
  };
}
function buildVictoryEnding(room) {
  const alias = room.storyMemory?.alias;
  const motive = room.storyMemory?.motive;
  const path = dominantStoryPath(room);
  const finalActKey = Object.keys(room.storyFlags || {}).filter(k=>/^act\d+$/.test(k)).sort((a,b)=>Number(b.slice(3))-Number(a.slice(3)))[0];
  const finalBranch = (finalActKey && room.storyFlags?.[finalActKey]) || 'careful';
  const titles = {
    truth: { careful:'진실을 끝까지 밝혀낸 연대기', bold:'거친 돌파 끝에 진실을 움켜쥔 연대기', empathetic:'사람을 지키며 진실을 밝힌 연대기' },
    survival: { careful:'살아남기 위해 끝까지 버틴 연대기', bold:'끝끝내 돌파해 낸 연대기', empathetic:'서로를 살리며 돌파한 연대기' },
    bond: { careful:'신뢰를 지켜 낸 연대기', bold:'결단으로 동료를 지켜 낸 연대기', empathetic:'서로를 붙든 연대의 연대기' },
  };
  const summaries = {
    truth: '치밀하게 단서를 엮고 거짓을 걷어내며 결말까지 도달했습니다.',
    survival: '상처와 실패를 끌어안고도 한 걸음씩 밀고 나가 결말을 완성했습니다.',
    bond: '사람과 사람 사이의 약속, 설득, 신뢰를 붙들며 세계의 끝까지 나아갔습니다.',
  };
  const failures = Number(room.failureCount || 0);
  const campaignEnding = CAMPAIGN_ENDING_VARIANTS[room.campaignId]?.[finalBranch] || null;
  const branchNote = finalBranch === 'empathetic'
    ? '마지막에는 설득과 공감이 닫혀 있던 길을 열었습니다.'
    : finalBranch === 'bold'
      ? '마지막 막에서는 망설임보다 결단과 돌파가 더 큰 흔적을 남겼습니다.'
      : '마지막 막에서는 차분한 판단과 축적한 단서가 결말의 균형을 잡았습니다.';
  const routeTrail = ['act1','act2','act3','act4','act5']
    .map(key => room.storyFlags?.[key])
    .filter(Boolean)
    .map(flag => flag === 'bold' ? '돌파' : flag === 'empathetic' ? '신뢰' : '추적');
  const jobLegacies = Object.entries(room.jobStory || {})
    .filter(([name, entry]) => name !== 'last' && Number(entry?.success || 0) >= 2 && entry?.ending)
    .sort((a, b) => Number(b[1].secrets || 0) - Number(a[1].secrets || 0))
    .slice(0, 3)
    .map(([name, entry]) => `${name}: ${entry.ending}`);
  const legacyText = jobLegacies.length ? ` 직업 전용 선택으로 열린 결말의 흔적도 남았습니다. ${jobLegacies.join(' · ')}.` : '';
  const [legacyTitle, legacySentence] = actionLegacy(room);
  const deadNames = room.players.filter(p=>p.dead).map(p=>p.name);
  const casualtyText = deadNames.length ? ` 하지만 ${deadNames.join(', ')}의 죽음은 승리 속에서도 지워지지 않았다.` : '';
  const routeCode = routeTrail.map(x=>x==='돌파'?'B':x==='신뢰'?'E':'C').join('');
  return {
    victory: true,
    title: alias ? `「${alias}」 · ${campaignEnding?.title || titles[path]?.[finalBranch] || titles[path]?.careful} — ${legacyTitle}` : `${campaignEnding?.title || titles[path]?.[finalBranch] || titles[path]?.careful} — ${legacyTitle}`,
    text: `${campaignEnding?.text ? `${campaignEnding.text} ` : ''}${summaries[path]} ${motive ? `그리고 파티는 끝까지 “${motive}”라는 이유를 놓지 않았습니다. ` : ''}${branchNote} ${routeTrail.length ? `이번 여정은 ${routeTrail.join(' → ')}의 흐름으로 이어졌고,` : ''} 총 ${room.story}개의 실제 분기 장면을 지나 선택의 흔적이 엔딩에 남았습니다. ${legacySentence} 루트 기록 ${routeCode || 'NONE'}.${legacyText}${casualtyText} ${failures >= 6 ? `수많은 실패와 상태이상을 견디며 도착한 만큼, 이 결말은 상처 입은 생존자들의 결말이기도 합니다.` : failures >= 3 ? `몇 번의 큰 실패가 있었고 그 흔적이 마지막 선택의 무게를 키웠습니다.` : `큰 실패를 최소화하며 비교적 온전한 상태로 결말에 도착했습니다.`}`,
  };
}


const ROUTE_META = {
  careful: { name:'추적 루트', short:'단서를 쌓아 진실로 접근', color:'TRUTH' },
  bold: { name:'돌파 루트', short:'위험을 감수하고 주도권 확보', color:'FORCE' },
  empathetic: { name:'신뢰 루트', short:'사람과 존재의 협력을 얻어 접근', color:'BOND' },
};

const WORLD_ROUTE_WORDS = {
  ember: { threat:'왕관의 의지와 죽은 기사들', ally:'사제와 주민들', medium:'재와 봉인의 흔적' },
  neon: { threat:'도시 감시망과 MOTHER-9', ally:'시민과 내부 협력자들', medium:'삭제 로그와 기억 조각' },
  abyss: { threat:'심해 신호와 무너지는 기지', ally:'생존자와 승무원들', medium:'소나와 생체 기록' },
  clock: { threat:'열세 번째 종과 뒤틀린 시간', ally:'루프를 기억하는 사람들', medium:'시간 오차와 사라진 기록' },
  wild: { threat:'뒤틀린 숲과 별빛의 포식', ally:'부족과 야수와 숲의 정령', medium:'별가루와 뿌리의 흔적' },  guardian: { threat:'침략자 잔당과 숲의 혼란', ally:'작은 공주·로레인·숲의 생존자', medium:'왕실 표식과 고대 유적의 룬' },

};

const WORLD_PROSE = {
  ember: {
    carefulSuccess:'재 냄새 사이로 흩어져 있던 흔적들이 하나씩 맞물렸다. 벽면의 긁힌 자국, 반쯤 타버린 인장, 발끝에 밟힌 검은 가루가 모두 같은 방향을 가리켰다.',
    carefulFail:'단서는 분명해 보였지만 한 조각이 거짓이었다. 뒤늦게 그것을 알아챘을 때는 이미 복도 저편의 쇠사슬 소리가 가까워지고 있었다.',
    boldSuccess:'망설임 없이 밀어붙인 덕분에 상대가 준비를 끝내기 전에 틈이 열렸다. 무너진 문 너머로 뜨거운 재가 쏟아졌지만 길은 살아 있었다.',
    boldFail:'문은 열렸지만 그 소리는 성채 전체를 깨웠다. 어둠 속에서 갑옷이 부딪히는 소리가 번졌고, 파티는 더 이상 숨어 움직일 수 없게 되었다.',
    empatheticSuccess:'경계하던 눈빛이 조금씩 풀렸다. 끝내 누군가가 입을 열었고, 그 한마디가 지도에 없던 길 하나를 드러냈다.',
    empatheticFail:'상대는 고개를 끄덕였지만 끝까지 중요한 부분을 말하지 않았다. 빈말과 침묵 사이에 남은 틈이 오히려 더 불길했다.',
  },
  neon: {
    carefulSuccess:'잡음투성이 로그를 겹쳐 보자 삭제된 시간대가 하나의 패턴으로 이어졌다. 광고판의 깜빡임조차 우연이 아니었다.',
    carefulFail:'복구한 로그 하나가 미끼였다. 화면이 붉게 번지는 순간 추적 신호가 역으로 파티의 위치를 찍었다.',
    boldSuccess:'보안망이 재설정되기 전에 틈을 파고들었다. 경보는 울렸지만 중요한 좌표는 이미 손에 들어와 있었다.',
    boldFail:'문은 뚫렸지만 도시가 즉시 반응했다. 드론의 붉은 센서가 골목 끝에서 하나둘 켜졌다.',
    empatheticSuccess:'상대의 표정이 아주 잠깐 무너졌다. 그 짧은 순간에 거짓말보다 진짜 기억이 먼저 튀어나왔다.',
    empatheticFail:'대화는 이어졌지만 상대는 감정을 팔듯 진실도 조금씩 잘라 말했다. 가장 필요한 부분만 비어 있었다.',
  },
  abyss: {
    carefulSuccess:'소나의 미세한 반향과 압력 기록이 겹쳤다. 보이지 않던 움직임이 지도 위에서 한 줄의 궤적으로 떠올랐다.',
    carefulFail:'반향 하나를 잘못 읽었다. 기지가 흔들리고 나서야 그 신호가 바깥이 아니라 벽 안쪽에서 왔다는 걸 알았다.',
    boldSuccess:'침수 구역을 정면으로 가로질러 시간을 벌었다. 물은 허리까지 차올랐지만 필요한 장비와 사람은 놓치지 않았다.',
    boldFail:'억지로 밀어붙인 순간 배관이 터졌다. 차가운 물과 금속 파편이 쏟아지며 이동 경로가 더 좁아졌다.',
    empatheticSuccess:'겁에 질린 생존자의 호흡이 조금씩 가라앉았다. 마침내 그가 금지 구역의 이름과 마지막 목격자를 말했다.',
    empatheticFail:'생존자는 말을 시작했지만 공포가 먼저 목을 막았다. 중요한 이름 하나가 끝내 나오지 않았다.',
  },
  clock: {
    carefulSuccess:'기록의 어긋난 시각들을 다시 맞추자 반복되는 오차가 하나의 규칙으로 보이기 시작했다. 종소리보다 먼저 움직이는 것이 있었다.',
    carefulFail:'시간표는 맞았지만 기준이 틀렸다. 창밖 풍경이 한 번 접히고 나서야 파티는 자신들이 한 장면 늦었다는 걸 깨달았다.',
    boldSuccess:'멈춘 순간을 억지로 비집고 들어가며 루프의 틈을 붙잡았다. 한순간뿐이었지만 다음 문이 닫히기 전에 넘어갈 수 있었다.',
    boldFail:'시간을 억지로 밀어낸 대가로 기억 일부가 흐려졌다. 방금 전까지 분명했던 얼굴 하나가 낯설어졌다.',
    empatheticSuccess:'서로 다른 기억을 말로 맞춰 보자 사라졌던 부분이 조금씩 돌아왔다. 누군가의 증언이 시간보다 오래 남았다.',
    empatheticFail:'서로의 기억은 닮았지만 끝내 같은 장면이 아니었다. 작은 불일치가 다음 선택을 더 어렵게 만들었다.',
  },
  wild: {
    carefulSuccess:'별가루의 방향과 뿌리의 움직임을 따라가자 숲이 숨겨 둔 길이 모습을 드러냈다. 나무들은 거짓말하지 않았다.',
    carefulFail:'별가루는 길처럼 보였지만 포식자가 남긴 흔적이었다. 숲의 침묵이 너무 늦게 경고를 보냈다.',
    boldSuccess:'가시덤불과 뒤틀린 뿌리를 밀어내며 길을 만들었다. 상처는 남았지만 숲이 닫히기 전에 중심부로 들어갔다.',
    boldFail:'숲을 억지로 가르자 숲도 반응했다. 뒤에서 길이 닫히고, 앞에서는 짐승의 울음이 가까워졌다.',
    empatheticSuccess:'경계하던 야수가 먼저 눈을 피했다. 그 뒤를 따라가자 사람이 만들 수 없는 안전한 길이 나타났다.',
    empatheticFail:'야수는 공격하지 않았지만 끝내 가까이 오지도 않았다. 믿음이 완성되지 않은 채 어둠만 길어졌다.',
  },
};


WORLD_ROUTE_WORDS.guardian1 = { threat:'침략자와 각 세계의 혼란', ally:'작은 공주와 첫 챔피언들', medium:'챔피언 소드와 세계별 단서' };
WORLD_ROUTE_WORDS.guardian2 = { threat:'갈라진 세계의 시험과 침략자의 영향', ally:'셴·여관·던전·설산의 동료들', medium:'수련 기록과 모험가들의 증언' };
WORLD_ROUTE_WORDS.guardian3 = { threat:'침략자 13군단과 무너진 미래', ally:'미래 공주·저항군·라 제국 협력자', medium:'10년의 기록과 차원 흔적' };
WORLD_PROSE.guardian1 = WORLD_PROSE.guardian || WORLD_PROSE.ember;
WORLD_PROSE.guardian2 = WORLD_PROSE.guardian || WORLD_PROSE.clock;
WORLD_PROSE.guardian3 = WORLD_PROSE.guardian || WORLD_PROSE.clock;

// v5.8.0 unified campaign aliases and new-world prose
WORLD_ROUTE_WORDS.guardian = { threat:'침략자와 갈라진 세계, 그리고 무너진 미래', ally:'작은 공주·챔피언·미래 공주와 여정에서 지킨 사람들', medium:'챔피언 소드·세계별 증언·10년의 기록' };
WORLD_ROUTE_WORDS.echo = { threat:'기억을 훔치는 성좌와 편집된 도시 기록', ally:'죽은 탐사대의 증언과 삭제된 구역의 주민들', medium:'유리별·원본 기억·서로 모순되는 증언' };
WORLD_PROSE.echo = WORLD_PROSE.clock || WORLD_PROSE.neon || WORLD_PROSE.ember;
WORLD_ROUTE_WORDS.aurora = { threat:'적색 자기폭풍과 반복되는 창설 원정대의 기억', ally:'구조대·생존 연구원·기록 속 원정대', medium:'극광 스펙트럼·빙핵·아날로그 송신' };
WORLD_ROUTE_WORDS.masque = { threat:'강요되는 배역과 월식이 끝날수록 닫히는 도시', ally:'가면 없는 아이·유랑 배우·야시장 사람들', medium:'가면 조각·원고·본명표와 무대 장치' };
WORLD_PROSE.aurora = {
  carefulSuccess:'붉은 극광을 층별로 나누고 관측 로그를 맞대자, 잡음처럼 보이던 파형이 43년 전 원정대의 송신 순서와 정확히 겹쳤다.',
  carefulFail:'관측값 하나를 현재 시각으로 착각했다. 안테나가 다시 울릴 때서야 그 파형이 지금이 아니라 오래된 기억층에서 재생된 것임을 알아챘다.',
  boldSuccess:'눈보라가 관측소를 덮기 전에 위험 구역을 가로질렀다. 얼음 아래 장치와 구조 대상에 먼저 닿으면서 사건의 주도권을 잡았다.',
  boldFail:'서둘러 얼음층을 건드린 순간 붉은 섬광과 함께 지층 전체가 공명했다. 길은 열렸지만 다른 구역의 기록과 사람들까지 동시에 깨어났다.',
  empatheticSuccess:'혼란스러운 생존자의 말에서 시간 순서가 맞지 않는 부분을 차분히 골라냈다. 그의 기억과 오래된 무전이 같은 사건을 서로 다른 시점에서 말하고 있었다.',
  empatheticFail:'사람을 진정시키는 데는 성공했지만 그가 들었다는 목소리를 누구의 것으로 믿어야 할지는 남았다. 잘못된 이름 하나가 다음 구조 경로를 흔들었다.',
};
WORLD_PROSE.masque = {
  carefulSuccess:'가면 안쪽의 긁힌 이름과 원고의 지워진 대사를 맞추자, 현재 공연이 천 년 전 초연의 순서를 일부러 바꾸고 있다는 사실이 드러났다.',
  carefulFail:'복원한 문장 하나가 배우의 대사가 아니라 무대 지시문이었다. 잘못 읽은 순간 주변 사람들이 새로운 배역으로 반응하기 시작했다.',
  boldSuccess:'공연의 순서를 무시하고 무대 뒤 통로를 먼저 열었다. 관객들이 술렁였지만 아무도 보지 못했던 마지막 장의 일부를 확보했다.',
  boldFail:'막을 억지로 올리자 도시 전체의 종이 울렸다. 가면 쓴 사람들이 동시에 고개를 돌렸고, 파티는 즉흥극이 아니라 공식 배역으로 기록되기 시작했다.',
  empatheticSuccess:'상대에게 배역 대신 이름을 물었을 때 처음으로 표정이 달라졌다. 가면 아래 사람이 기억하던 삶이 짧게 돌아오며 도시의 규칙 하나가 느슨해졌다.',
  empatheticFail:'상대는 자신의 이름을 떠올리려 했지만 끝내 다른 배우의 이름을 말했다. 그 착오는 새로운 관계를 만들면서도 원래 기억을 더 깊이 숨겼다.',
};

function proseOutcome(campaign, beat, prev) {
  if (!prev?.branchValue) return '';
  const p = WORLD_PROSE[campaign?.id] || WORLD_PROSE.ember;
  const key = `${prev.branchValue}${prev.success === false ? 'Fail' : 'Success'}`;
  return p[key] || '';
}

function branchTransitionText(campaign, beat, prev) {
  if (!prev?.branchValue) return null;
  const consequence = proseOutcome(campaign, beat, prev);
  const choice = prev.declaration || '그 선택';
  const tail = prev.success === false
    ? `그 실패는 끝난 사건이 아니었다. “${choice}”의 대가는 지금 이 장면까지 따라왔다.`
    : `“${choice}”로 얻은 작은 우위가 자연스럽게 다음 움직임으로 이어졌다.`;
  return `${consequence} ${tail}`.trim();
}

function branchCliffhanger(campaign, beat, prev) {
  const rawWorld = campaign?.id;
  const world = String(rawWorld||'').startsWith('guardian') ? 'guardian' : rawWorld;
  const phase = beat?.phase || '장면';
  const actEnd = phase === '결단';
  const hooks = {
    ember: actEnd ? '문이 닫히려는 순간, 안쪽에서 왕의 장례곡이 거꾸로 연주되기 시작했다.' : '재가 잠잠해지자 바닥 아래에서 세 번의 노크 소리가 들렸다.',
    neon: actEnd ? '화면에 새 좌표가 떠올랐다. 접속자 이름은 파티 중 한 사람의 이름이었다.' : '꺼진 화면 하나가 혼자 켜지더니 아직 오지 않은 시간의 메시지를 띄웠다.',
    abyss: actEnd ? '무전기에서 낮은 숨소리가 들렸다. 그리고 그것은 분명 파티의 이름을 알고 있었다.' : '소나 화면 끝에서 거대한 점 하나가 천천히 방향을 바꾸었다.',
    clock: actEnd ? '종은 멈췄지만 그림자 하나만 계속 움직였다. 그것은 다음 반복을 이미 알고 있었다.' : '벽시계의 초침이 한 칸 뒤로 물러나며 방금 사라진 문장이 다른 내용으로 돌아왔다.',
    wild: actEnd ? '숲 위의 별 하나가 흔들리더니 전혀 다른 방향의 길이 열렸다.' : '나무들이 동시에 숨을 죽였고, 멀리서 처음 듣는 울음소리가 번졌다.',
  };
  return hooks[world] || hooks.ember;
}

function storyOutcomeGrade(roll,total,dc){
  const margin=Number(total||0)-Number(dc||0);
  if(roll===20 || margin>=5) return 'critical';
  if(roll!==1 && margin>=0) return 'success';
  if(roll!==1 && margin>=-2) return 'mixed';
  if(roll===1 || margin<=-5) return 'disaster';
  return 'setback';
}
const MIXED_COST_TEXT={
  ember:'원하는 것은 얻었지만 성채의 경계가 한 단계 더 조여 왔다.',
  neon:'목표에는 닿았지만 감시망에 행동 패턴 일부가 남았다.',
  abyss:'해결은 했지만 산소와 시간이 그만큼 줄었다.',
  clock:'문제는 풀렸지만 루프가 이 행동을 기억하기 시작했다.',
  wild:'길은 열렸지만 숲도 파티의 선택을 기억했다.',
  guardian:'길은 열렸지만 뒤따르는 적에게 흔적 하나를 남겼다.',
  echo:'항로는 이어졌지만 배와 선원에게 부담이 남았다.'
};
const STORY_RESULT_COLOR={
  ember:['검은 재 위에 새 발자국이 생겼다. 성채는 방금 선택을 아무 일도 아니었던 것처럼 넘기지 않았다.','멀리서 장례 종이 한 번 울렸다. 살아 있는 사람과 죽은 사람 모두가 이 결과를 다른 의미로 받아들일 것이다.'],
  neon:['근처 카메라의 추적등이 한 번 흔들렸다. 기록은 남았고, 누군가는 이미 그 기록을 보고 있다.','광고판의 얼굴이 깨졌다 돌아오며 파티의 현상수배 정보 한 줄이 갱신됐다.'],
  abyss:['벽 너머의 압력이 낮게 울렸다. 구조할 시간과 더 알아낼 시간 사이의 거리가 다시 조금 줄었다.','소나에 새 반향이 생겼다. 방금 선택이 바깥의 존재에게도 신호가 된 듯했다.'],
  clock:['초침 하나가 뒤로 움직였다가 다시 앞으로 갔다. 이번 선택은 다음 반복에도 흔적을 남길 것이다.','거리의 누군가가 처음 보는 얼굴로 파티를 바라보다가, 아주 익숙한 사람처럼 고개를 끄덕였다.'],
  wild:['별가루가 발밑에서 모였다가 다른 길로 흩어졌다. 숲이 선택을 기억하고 있다.','멀리 있던 신수 한 마리가 공격하지 않고 방향만 바꿨다. 행동 하나가 생태의 균형을 조금 움직였다.'],
  guardian:['멀리 있던 동료의 신호가 짧게 돌아왔다. 이 지역에서 만든 관계는 다음 세계에서도 완전히 사라지지 않을 것이다.','챔피언 소드의 빛이 지나온 방향과 앞으로 갈 방향을 동시에 비췄다.'],
  echo:['꺼진 전광판이 한 번 켜져 방금 전과 다른 출구 번호를 표시했다. 역은 선택에 맞춰 경로를 다시 계산하고 있다.','안내방송이 끝난 뒤에도 마지막 한 음절이 늦게 따라왔다. 같은 장면으로 되돌아온 것이 아니다.'],
  aurora:['극광이 붉게 흔들리자 오래된 아날로그 계기들이 동시에 반응했다. 방금 선택이 기억층의 재생 패턴까지 건드린 듯했다.','수신기에서 43년 전 목소리가 잡음 사이로 한 단어를 다르게 말했다. 기록이 현재에 반응하고 있다.'],
  masque:['보이지 않는 관객석에서 박수 한 번이 울렸다. 누군가는 방금 선택을 새로운 대사로 받아들였다.','무대 위 조명이 한 칸 옆으로 이동하며 원고에 없던 자리를 비췄다. 결말은 아직 고정되지 않았다.']
};
function storyResultColor(campaign,beat,choice,grade){
  const pool=STORY_RESULT_COLOR[campaign?.id]||STORY_RESULT_COLOR.guardian;
  const n=(Number(beat?.chapter||0)+String(choice?.label||'').length+(grade==='critical'?1:0))%pool.length;
  return pool[n];
}

function storyResolutionNarrative(campaign, beat, choice, player, success, status, grade=success?'success':'setback') {
  const actor=player?.name||'플레이어';
  const action=String(choice?.actionType||'');
  const lines={
    investigate:[`${actor}는 남겨진 기록과 흔적을 하나씩 대조했다. 서로 맞지 않던 조각 사이에서 의도적으로 지워진 연결이 드러났다.`,`${actor}는 가장 그럴듯한 단서를 먼저 믿었다. 판단은 빗나갔지만 누가 그 단서를 미끼로 놓았는지는 오히려 선명해졌다.`],
    observe:[`${actor}는 움직이지 않고 주변을 지켜봤다. 말보다 먼저 바뀐 시선과 손짓이 다음 행동을 알려 줬다.`,`${actor}가 이상함을 알아챘을 때는 이미 상황이 움직인 뒤였다. 대신 누구의 반응이 가장 부자연스러웠는지는 남았다.`],
    fight:[`${actor}가 먼저 무기를 들자 대화로 숨겨져 있던 적대가 한꺼번에 표면으로 튀어나왔다. 싸움은 새로운 통로와 적의 배치를 드러냈다.`,`${actor}의 공격은 판을 깨뜨렸지만 생각보다 많은 시선을 끌었다. 이제 이곳의 사람들은 파티를 이전과 같은 손님으로 보지 않는다.`],
    sneak:[`${actor}는 시야가 비는 순간 안쪽으로 스며들었다. 정면에서는 볼 수 없던 물건과 사람의 위치가 한눈에 들어왔다.`,`${actor}는 안쪽까지 들어갔지만 작은 흔적을 남겼다. 경계가 올라가는 대신 내부 동선과 빠져나갈 길은 알아냈다.`],
    persuade:[`${actor}는 상대가 무엇을 지키려 하는지부터 짚었다. 말이 통하기 시작하자 닫혀 있던 협조와 정보가 함께 열렸다.`,`${actor}의 말은 완전한 동의를 얻지 못했다. 그러나 상대가 유독 피하려 한 질문 덕분에 숨긴 사정의 방향은 알 수 있었다.`],
    steal:[`${actor}는 필요한 것을 손에 넣었다. 훔친 물건보다 그 물건이 보관돼 있던 방식이 더 중요한 단서가 됐다.`,`${actor}의 손이 들켰다. 물건은 얻지 못했지만 감시 방식과 보관 장소, 그리고 누가 그것을 지키는지는 드러났다.`],
    tail:[`${actor}는 일정한 거리를 두고 뒤를 밟았다. 상대가 멈춘 곳과 만난 사람이 새로운 장소를 이야기 속에 열었다.`,`${actor}의 미행은 눈치채였다. 상대는 길을 바꿨지만 일부러 피한 골목이 오히려 진짜 목적지를 가리켰다.`],
    help:[`${actor}는 위험을 나눠 맡았다. 도움을 받은 사람은 보답 대신 지금까지 숨겨 온 사실을 털어놓았다.`,`${actor}는 누군가를 살리느라 중요한 순간을 놓쳤다. 하지만 그 사람이 나중에야 떠올린 한마디가 잃어버린 단서를 대신했다.`],
    threaten:[`${actor}는 물러설 생각이 없다는 걸 보여 줬다. 원하는 답은 빨리 나왔지만 그 자리에서 관계 하나도 함께 끊어졌다.`,`${actor}의 압박은 역효과를 냈다. 주변까지 경계하기 시작했지만 상대가 목숨 걸고 감추는 대상은 확실해졌다.`],
    trade:[`${actor}는 서로 필요한 것을 정확히 맞췄다. 싸우지 않고 정보와 통로를 얻었지만 대가를 기억하는 사람이 생겼다.`,`${actor}는 불리한 조건을 받아들였다. 손해는 남았지만 상대가 무엇을 가장 가치 있게 여기는지 알게 됐다.`],
    bypass:[`${actor}는 정면의 위험을 건드리지 않고 지형의 빈틈을 이용했다. 그 덕분에 예상보다 먼저 다음 위치와 연결되는 길을 확보했다.`,`${actor}가 고른 우회로는 완전히 안전하지 않았다. 길은 막혔지만 무엇이 이 구간을 통제하는지는 분명해졌다.`],
    wait:[`${actor}는 서두르지 않았다. 상황이 먼저 움직이게 두자 감춰져 있던 순서와 틈이 드러났다.`,`${actor}가 기다리는 동안 기회 하나는 지나갔다. 대신 다음에 무엇이 움직일지 읽을 수 있는 패턴이 남았다.`],
    trap:[`${actor}는 주변 조건을 이용해 위험이 움직일 방향을 제한했다. 먼저 움직일 수 있는 짧은 우위가 생겼다.`,`${actor}의 준비는 완벽하지 않았지만 상대와 환경이 무엇을 피하려 하는지 확인했다.`],
    break:[`${actor}는 막힌 구조와 장애물을 힘으로 바꿔 새로운 동선을 만들었다. 소음은 컸지만 다음 장면의 위치가 달라졌다.`,`${actor}가 힘을 쓴 순간 예상하지 못한 부분까지 무너졌다. 길은 열리지 않았지만 숨겨진 공간과 더 큰 위험이 함께 드러났다.`],
    hide:[`${actor}는 파티가 남긴 흔적을 지워 추적과 경계를 잠시 끊어 냈다.`,`${actor}가 흔적을 지우려는 동안 이미 누군가가 파티를 따라오고 있었다는 사실이 드러났다.`],
    endure:[`${actor}는 환경의 압박을 몸으로 받아냈다. 그 짧은 시간 동안 동료들은 다음 행동에 필요한 위치와 여유를 확보했다.`,`${actor}는 끝까지 버텼지만 몸에 부담이 남았다. 그래도 무너지기 직전의 변화 덕분에 다음에 피해야 할 지점을 알아냈다.`],
  };
  const generic=lines[action]||['선택이 새로운 국면을 만들었다.','시도는 뜻대로 되지 않았지만 다른 길을 남겼다.'];
  const authored=success ? choice?.success : choice?.failure;
  const concrete=authored || generic[success?0:1];
  const echo=authored ? ` ${generic[success?0:1]}` : '';
  const injury=status?` 그 과정에서 부상이 하나 더 남았다.`:'';
  const color=storyResultColor(campaign,beat,choice,grade);
  if(grade==='mixed'){
    const cost=MIXED_COST_TEXT[campaign?.id]||'목표에는 닿았지만 작은 대가가 남았다.';
    const positive=choice?.success||generic[0];
    return `${positive} 다만 ${cost} ${color}`.trim();
  }
  return `${concrete}${echo}${injury} ${color}`.trim();
}


function applyBranchToChoices(beat, prev) {
  if (!prev?.branchValue || !Array.isArray(beat.choices)) return;
  const route = prev.branchValue;
  const failed = prev.success === false;
  beat.choices = beat.choices.map(choice => {
    const next = { ...choice };
    if (choice.branchValue === route) {
      next.dc = Math.max(8, Number(next.dc || 10) - (failed ? 0 : 1));
      next.detail = `${failed ? '이전 시도가 꼬여 위험하지만, 같은 방식의 흐름을 이어간다.' : '이전 선택의 흐름을 이어가므로 준비된 이점이 있다.'} ${next.detail || ''}`;
    } else if (failed) {
      next.dc = Number(next.dc || 10) + 1;
      next.detail = `직전 실패의 여파로 접근 방식을 바꾸는 데 추가 부담이 있다. ${next.detail || ''}`;
    }
    return next;
  });
}


const LIVING_NOVEL = {
  ember: {
    detours: {
      careful: ['거짓 문장', '불탄 장부의 함정'], bold: ['깨어난 경비대', '무너지는 성문'], empathetic: ['배신한 증언자', '공포에 휩싸인 군중'],
    },
    opening: {
      careful: '재와 피 냄새 속에서 흩어진 단서들이 다시 한 줄로 이어졌다.',
      bold: '성채는 방금 전의 소란을 잊지 않았다. 갑옷 소리와 종소리가 더 가까워졌다.',
      empathetic: '누군가의 경계가 풀린 자리에는 말보다 오래 남는 약속이 생겼다.',
    },
  },
  neon: {
    detours: { careful:['역추적된 로그','가짜 백업 노드'], bold:['드론 봉쇄','추격자의 매복'], empathetic:['기억 거래자의 배신','시민 폭동'] },
    opening: { careful:'삭제된 데이터 사이에서 아까 놓친 한 줄이 다시 떠올랐다.', bold:'경보는 꺼지지 않았다. 네온빛 골목마다 추적 신호가 번지고 있었다.', empathetic:'짧게 얻은 신뢰가 새로운 연락망으로 이어졌다.' },
  },
  abyss: {
    detours: { careful:['잘못 읽은 소나','봉쇄된 관측실'], bold:['압력문 붕괴','침수 역류'], empathetic:['패닉에 빠진 생존자','구조 우선순위 충돌'] },
    opening: { careful:'소나의 잔향이 다시 겹치며 이전에는 보이지 않던 움직임을 만들었다.', bold:'기지는 이미 다음 충격을 준비하고 있었다. 금속 벽이 낮게 울었다.', empathetic:'두려움에 떨던 목소리 하나가 파티를 믿기 시작했다.' },
  },
  clock: {
    detours: { careful:['뒤바뀐 시간표','사라진 한 시간'], bold:['루프 역류','시간 경비대'], empathetic:['기억 불일치','사라지는 증언자'] },
    opening: { careful:'조금 전의 기억과 지금의 풍경 사이에 작은 오차가 또 하나 생겼다.', bold:'시간을 억지로 밀어낸 대가가 골목 전체에 금처럼 번져 있었다.', empathetic:'서로의 기억을 맞춘 흔적이 루프보다 오래 남았다.' },
  },
  wild: {
    detours: { careful:['거짓 별가루 길','포식자의 흔적'], bold:['닫히는 숲길','별빛 야수의 습격'], empathetic:['깨진 부족의 약속','도망친 신수'] },
    opening: { careful:'숲의 흔적은 거짓말하지 않았지만, 읽는 순서가 중요했다.', bold:'강제로 연 길 뒤에서 뿌리들이 다시 맞물리기 시작했다.', empathetic:'경계하던 존재가 한 걸음 물러난 자리에서 새로운 길이 생겼다.' },
  },
};

LIVING_NOVEL.aurora = {
  detours:{careful:['뒤섞인 43년 전 관측값','거꾸로 재생되는 구조 신호'],bold:['빙붕 균열','자기폭풍 속 장비 정지'],empathetic:['기억이 겹친 생존자','구조 우선순위 충돌']},
  opening:{careful:'현재 관측값과 오래된 기록 사이에 같은 파형이 다시 나타났다.',bold:'설원은 방금 연 길을 그대로 두지 않았다. 붉은 극광과 눈보라가 뒤에서 경로를 삼켰다.',empathetic:'누군가의 기억을 끝까지 들은 덕분에 무전 속 목소리 하나의 주인이 분명해졌다.'},
};
LIVING_NOVEL.masque = {
  detours:{careful:['뒤바뀐 원고 장면','가면 속 잘못된 이름'],bold:['갑자기 시작된 공개 공연','무너지는 무대 승강판'],empathetic:['배역을 놓지 못하는 배우','본명을 잊은 관객']},
  opening:{careful:'원고의 여백과 가면 안쪽의 이름이 같은 장면을 서로 다르게 기억하고 있었다.',bold:'무대의 순서를 깨뜨린 대가로 도시 전체가 다음 장면을 앞당겨 연기하기 시작했다.',empathetic:'한 사람을 배역이 아닌 이름으로 불러 준 일이 주변 배우들의 태도까지 조금 바꾸었다.'},
};


function routeName(route) {
  return route === 'bold' ? '돌파' : route === 'empathetic' ? '신뢰' : '추적';
}

function livingContinuity(room, campaign, beat, prev) {
  if (!prev) return '';
  const causal=causalThreadText(campaign,beat,prev);
  const outcome=proseOutcome(campaign,beat,prev);
  return [outcome,causal].filter(Boolean).join(' ');
}

function detourChoices(campaign, route, dangerName, room) {
  const world = campaign?.id;
  const tables = {
    ember: [
      ['주변의 봉인 문양을 빠르게 읽어 가장 안전한 길을 찾는다','지능','careful'],
      ['무너지는 길을 밀어내고 정면으로 빠져나간다','근력','bold'],
      ['흩어진 사람들을 진정시켜 함께 움직일 길을 만든다','매력','empathetic'],
    ],
    neon: [
      ['역추적 신호를 분석해 가짜 좌표로 흘려보낸다','지능','careful'],
      ['봉쇄선이 닫히기 전에 옥상과 골목을 가로질러 탈출한다','민첩','bold'],
      ['현장 시민과 내부자를 설득해 추적망을 분산시킨다','매력','empathetic'],
    ],
    abyss: [
      ['압력과 산소 수치를 계산해 살아 있는 통로를 골라낸다','지능','careful'],
      ['닫히는 격벽을 몸으로 버티며 모두를 통과시킨다','체력','bold'],
      ['패닉에 빠진 생존자들을 진정시켜 질서를 되찾는다','매력','empathetic'],
    ],
    clock: [
      ['변한 시각을 기록해 루프가 덜 뒤틀린 방향을 찾는다','지혜','careful'],
      ['멈춘 순간의 틈을 타 금지된 통로를 건너간다','민첩','bold'],
      ['엇갈린 기억을 서로 맞추며 사라지는 사람을 붙잡는다','매력','empathetic'],
    ],
    wild: [
      ['별가루와 뿌리의 방향을 다시 읽어 진짜 길을 찾는다','지혜','careful'],
      ['닫히는 숲길을 앞질러 위험 지역을 돌파한다','민첩','bold'],
      ['야수와 숲의 반응을 진정시키며 안전한 길을 연다','매력','empathetic'],
    ],
    aurora: [
      ['현재 관측값과 오래된 송신을 분리해 안전한 방향을 계산한다','지능','careful'],
      ['무너지기 전 빙붕을 가로질러 다음 격벽까지 이동한다','민첩','bold'],
      ['혼란에 빠진 생존자의 기억을 정리해 구조 경로를 다시 맞춘다','지혜','empathetic'],
    ],
    masque: [
      ['원고와 무대 표시를 대조해 지금 장면의 진짜 출구를 찾는다','지능','careful'],
      ['막이 닫히기 전에 무대 장치를 넘어 뒤편 통로로 빠진다','민첩','bold'],
      ['배역에 갇힌 사람들에게 본명을 물어 군중의 흐름을 바꾼다','매력','empathetic'],
    ],
  };
  const base = tables[world] || tables.ember;
  return base.map((entry, i) => ({
    id:`DETOUR-${world}-${route}-${i}`,
    label:entry[0], stat:entry[1], branchValue:entry[2], branchKey:null,
    path:statPath(entry[1]), dc:Math.min(18, 11 + Math.floor(Number(room.threat || 0)/2) + i),
    detail:`예정에 없던 위기 · ${dangerName} · ${entry[1]} 판정`,
    success:`위기는 완전히 사라지지 않았지만 파티는 흐름을 되찾았다. ${dangerName}은 더 이상 발목을 붙잡지 못했고, 원래 쫓던 사건으로 돌아갈 수 있게 되었다.`,
    failure:`벗어나기는 했지만 또 하나의 대가를 치렀다. ${dangerName}이 남긴 상처와 소문은 이후 장면에서도 파티를 따라다닌다.`,
  }));
}

function buildDetourScene(campaign, room, choice, player, status) {
  const route = choice?.branchValue || 'careful';
  const world = LIVING_NOVEL[campaign?.id] || LIVING_NOVEL.ember;
  const list = world.detours?.[route] || ['예정에 없던 위기'];
  const name = list[(Number(room.story || 0) + Number(room.failureCount || 0)) % list.length];
  const nextBase = storyNodeById(campaign, room.storyNodeId) || campaign?.storyBeats?.[0];
  const act = nextBase?.act || Math.ceil((Number(room.story || 0)+1)/6);
  const chapter = nextBase?.chapter || Number(room.story || 0)+1;
  const statusText = status ? `${player.name}에게 ${status.label}의 후유증까지 남았다.` : `${player.name}은(는) 간신히 중심을 되찾았다.`;
  return {
    id:`${campaign.id.toUpperCase()}-DETOUR-${room.story}-${room.failureCount}`,
    isDetour:true, chapter, act, actName:nextBase?.actName || campaign.acts?.[Math.max(0,act-1)] || '예정에 없던 밤', phase:'위기',
    title:`위기 · ${name}`,
    situation:`파티가 다음 단서를 향해 움직이려는 순간 ${name}이 길을 끊었다. 방금 전 실패가 남긴 소리와 흔적, 망가진 장비와 불안이 한꺼번에 되돌아왔다. ${statusText} 이제 이 위기를 넘기지 못하면 조금 전까지 붙잡고 있던 단서조차 잃을 수 있다.`,
    text:`파티가 다음 단서를 향해 움직이려는 순간 ${name}이 길을 끊었다. 방금 전 실패가 남긴 소리와 흔적, 망가진 장비와 불안이 한꺼번에 되돌아왔다. ${statusText} 이제 이 위기를 넘기지 못하면 조금 전까지 붙잡고 있던 단서조차 잃을 수 있다.`,
    objective:`${name}을 넘기고 본래의 목적지로 돌아간다.`,
    why:`방금 선택의 대가가 눈앞의 위험으로 돌아왔다. 여기서 다시 흔들리면 부상과 추적, 불신이 다음 장면까지 이어진다.`,
    prompt:`${name}을 어떻게 넘길지 선택하세요.`,
    visual:`${name} · 직전 선택의 여파`,
    continuityHook:`위기를 넘긴 뒤에도 조금 전 놓쳤던 단서는 사라지지 않는다. 다만 그것을 다시 붙잡을 때는 이미 누군가 한발 먼저 움직였을 것이다.`,
    choices:detourChoices(campaign, route, name, room),
  };
}

function adaptiveChoiceRewrite(room, beat) {
  const previousRoute = room.narrativeState?.lastRoute;
  const boon = room.narrativeState?.boon;
  for (const choice of beat.choices || []) {
    if (boon && choice.branchValue === boon) {
      choice.dc = Math.max(8, Number(choice.dc || 10) - 1);
      choice.detail += ' · 앞선 대성공의 흐름을 이어가면 DC -1';
    }
    if (previousRoute && previousRoute !== choice.branchValue && Number(room.narrativeState?.routeStreak || 0) >= 2) {
      choice.detail += ` · 기존 ${routeName(previousRoute)} 흐름에서 방향을 바꾸는 선택`;
    }
  }
}

const JOB_STORY_SIGNATURES = {
  '룬 기사': { route:'bold', motif:'룬과 봉인을 몸으로 받아내며', discovery:'왕가 봉인의 진짜 작동 원리', ally:'성채 경비대', ending:'왕관을 지키는 새로운 수호자' },
  '재의 마도사': { route:'careful', motif:'재에 남은 기억과 마력의 잔향을 읽으며', discovery:'왕관이 기억을 먹는 방식', ally:'죽은 왕의 잔향', ending:'왕관의 기억을 해방한 자' },
  '성흔 추적자': { route:'careful', motif:'피와 성흔의 방향을 따라가며', discovery:'배신자가 남긴 진짜 흔적', ally:'추방된 증언자', ending:'왕가의 거짓을 폭로한 추적자' },
  '왕묘 도굴꾼': { route:'bold', motif:'금지된 틈과 함정을 먼저 건드리며', discovery:'아무도 모르는 왕묘의 샛길', ally:'지하 밀매상', ending:'금단의 보물을 되돌려놓은 도굴꾼' },
  '백은 사제': { route:'empathetic', motif:'망령과 산 자의 공포를 함께 달래며', discovery:'저주가 아니라 미완의 장례였다는 진실', ally:'왕비의 혼령', ending:'죽은 자에게 마지막 안식을 준 사제' },
  '검은 숲 사냥꾼': { route:'bold', motif:'짐승의 흔적과 숲의 냄새를 좇으며', discovery:'성채 바깥에서 왕관을 노리는 존재', ally:'검은 숲의 사냥꾼들', ending:'왕국 밖의 위협까지 막아낸 사냥꾼' },
  '고스트 해커': { route:'careful', motif:'삭제된 로그와 백도어를 역추적하며', discovery:'MOTHER-9의 숨겨진 관리자 권한', ally:'익명 내부자', ending:'도시의 기억을 시민에게 돌려준 해커' },
  '증강 집행자': { route:'bold', motif:'봉쇄선을 힘으로 밀어내며', discovery:'치안망이 조작된 진짜 이유', ally:'반란한 집행부대', ending:'도시의 무력 시스템을 뒤집은 집행자' },
  '기억 브로커': { route:'empathetic', motif:'사람들이 숨기고 싶은 기억의 값을 읽으며', discovery:'누가 어떤 기억을 팔았는지', ally:'기억 거래자 네트워크', ending:'기억의 소유권을 다시 정의한 브로커' },
  '드론 조종사': { route:'careful', motif:'도시를 위에서 내려다보며 사각지대를 찾고', discovery:'감시망이 보지 못하는 유일한 통로', ally:'불법 드론 조종사들', ending:'감시도시의 눈을 멀게 한 조종사' },
  '스트리트 메딕': { route:'empathetic', motif:'부상자와 시민을 살리며 정보를 모으고', discovery:'기억 조작이 사람의 신경계를 망가뜨리는 방식', ally:'하층 의료망', ending:'도시의 생존자들을 지켜낸 의무관' },
  '데이터 사냥꾼': { route:'bold', motif:'추적 신호를 역으로 물고 늘어지며', discovery:'도시를 추적하는 진짜 사냥감의 정체', ally:'암시장 정보상', ending:'추적망의 주인을 사냥한 데이터 사냥꾼' },
  '심해 잠수사': { route:'bold', motif:'압력과 어둠을 몸으로 버티며', discovery:'기지 밖 균열의 실제 규모', ally:'외부 구조 잠수팀', ending:'심연에서 마지막 생존자를 끌어낸 잠수사' },
  '해양 생물학자': { route:'careful', motif:'생체 반응과 표본의 변화를 분석하며', discovery:'탈라스가 공격자가 아니라는 증거', ally:'탈라스의 생체 신호', ending:'인간과 심해 생명을 함께 살린 연구자' },
  '잠수정 기관사': { route:'bold', motif:'망가진 장비와 잠수정을 즉석에서 되살리며', discovery:'금지 구역으로 가는 폐쇄 도킹 라인', ally:'정비반 생존자', ending:'침몰 직전의 기지를 움직인 기관사' },
  '소나 관측관': { route:'careful', motif:'반향과 침묵 사이의 패턴을 읽으며', discovery:'구조 신호 속에 숨은 두 번째 목소리', ally:'실종 관측관의 기록', ending:'심연의 언어를 해독한 관측관' },
  '해군 구조요원': { route:'empathetic', motif:'누구를 먼저 살릴지 결정하며', discovery:'실종자들이 향한 공통 지점', ally:'구조 대기 생존자', ending:'한 사람도 포기하지 않은 구조요원' },
  '심해 의무관': { route:'empathetic', motif:'공포와 부상을 진정시키며', discovery:'승무원들의 이상 행동이 감염이 아니었다는 진실', ally:'격리 병동 생존자', ending:'광기 속에서도 사람을 지킨 의무관' },
  '시간 감식관': { route:'careful', motif:'반복마다 달라지는 작은 차이를 기록하며', discovery:'루프가 시작되는 정확한 순간', ally:'이전 루프의 잔상', ending:'시간의 증거를 끝까지 보존한 감식관' },
  '기계 시계공': { route:'careful', motif:'톱니와 축의 오차를 맞추며', discovery:'열세 번째 종을 움직이는 숨은 기어', ally:'시계공 조합', ending:'멈춘 시간을 다시 움직인 시계공' },
  '역행 검사': { route:'bold', motif:'되감기는 순간을 힘으로 거슬러 올라가며', discovery:'루프를 지키는 경비대의 약점', ally:'과거의 자신이 남긴 흔적', ending:'시간을 베어 내일을 연 검사' },
  '예언 기록자': { route:'empathetic', motif:'바뀌는 문장과 사람들의 선택을 기록하며', discovery:'예언이 미래가 아니라 선택의 기록이라는 사실', ally:'사라진 예언자', ending:'미래를 기록이 아니라 선택으로 바꾼 기록자' },
  '시간 밀수꾼': { route:'bold', motif:'사라지는 물건과 시간을 숨겨 옮기며', discovery:'루프 밖에 물건을 보존하는 방법', ally:'시간 암시장', ending:'내일로 금지된 시간을 운반한 밀수꾼' },
  '종소리 파수꾼': { route:'empathetic', motif:'종이 울릴 때마다 사람들을 지키며', discovery:'종지기가 루프를 멈추지 않는 진짜 이유', ally:'종지기의 후계자', ending:'마지막 종을 스스로 울린 파수꾼' },
  '별사냥꾼': { route:'bold', motif:'별가루 발자국과 야수의 흔적을 쫓으며', discovery:'별을 먹는 존재의 실제 이동 경로', ally:'숲 가장자리 사냥꾼들', ending:'별을 사냥하지 않고 지켜낸 사냥꾼' },
  '숲의 주술사': { route:'careful', motif:'나무와 뿌리의 속삭임을 들으며', discovery:'숲의 심장이 병든 이유', ally:'말하는 고목', ending:'숲의 기억을 되살린 주술사' },
  '야수 길잡이': { route:'empathetic', motif:'야수의 공포를 이해하고 길을 묻으며', discovery:'신수들이 인간을 공격하는 진짜 이유', ally:'별빛 신수', ending:'인간과 야수 사이에 길을 만든 길잡이' },
  '유성 대장장이': { route:'bold', motif:'별철의 떨림을 두드려 응답을 끌어내며', discovery:'별핵을 안전하게 다룰 수 있는 방법', ally:'유성 대장간', ending:'마지막 별을 새롭게 벼린 대장장이' },
  '꿈의 방랑자': { route:'careful', motif:'꿈과 현실이 겹치는 틈을 걸으며', discovery:'숲이 꾸고 있는 악몽의 근원', ally:'꿈속의 아이', ending:'숲의 악몽을 끝낸 방랑자' },
  '별빛 치유사': { route:'empathetic', motif:'병든 생명과 별빛을 함께 치유하며', discovery:'별빛 오염을 되돌릴 수 있는 의식', ally:'두 부족의 치유사들', ending:'별과 숲을 함께 회복시킨 치유사' },  '캔터베리 수호기사': { route:'bold', motif:'무너진 왕국의 수호자로서 가장 위험한 길을 먼저 막으며', discovery:'챔피언 소드가 힘보다 수호의 선택에 반응한다는 사실', ally:'작은 공주와 흩어진 수호자들', ending:'공주가 가장 먼저 기억한 수호기사' },
  '왕실 정찰병': { route:'careful', motif:'숲길과 적의 이동 흔적을 한발 먼저 읽으며', discovery:'침략자와 고블린 사이에 생긴 비어 있는 이동로', ally:'숲의 생존자와 정찰대', ending:'캔터베리의 다음 길을 먼저 연 정찰병' },
  '고대유적 연구원': { route:'careful', motif:'유적의 룬과 수호자의 기록을 해독하며', discovery:'챔피언 소드 수호 시험의 진짜 규칙', ally:'고대 유적의 기록과 수호 장치', ending:'챔피언 소드의 의미를 해독한 연구원' },
  '숲의 길잡이': { route:'empathetic', motif:'짐승과 숲 주민의 기척을 따라 길을 만들며', discovery:'하얀 짐승과 숲의 생명들이 두려워한 공통 위협', ally:'하얀 짐승과 숲의 주민들', ending:'숲과 수호자 사이에 길을 만든 길잡이' },
  '왕실 외교관': { route:'empathetic', motif:'공주의 이름과 캔터베리의 약속을 사람들에게 전하며', discovery:'로레인이 공주에게 접근한 진짜 이유와 숨은 계산', ally:'로레인과 왕국 생존자들', ending:'무너진 왕국의 첫 동맹을 만든 외교관' },
  '야전 의무병': { route:'empathetic', motif:'상처 입은 수호자와 주민을 살리며', discovery:'숲의 여러 사건이 같은 침공의 여파로 이어진다는 사실', ally:'부상자와 여관의 피난민들', ending:'한 사람도 버리지 않은 캔터베리 의무병' },

  '극지 기상관': { route:'careful', motif:'극광의 색과 자기장 변화를 시간대별로 겹쳐 보며', discovery:'붉은 극광이 43년 전 관측 파형을 반복하고 있다는 사실', ally:'외부 기상 관측팀과 기록 속 창설 대원', ending:'붉은 하늘의 진짜 주기를 세상에 남긴 기상관' },
  '빙하 지질학자': { route:'careful', motif:'빙핵의 기포와 검은 광물층을 읽으며', discovery:'얼음 속 자성 광물이 전자기 흔적을 수십 년간 보존한다는 증거', ally:'시추반 생존자와 창설 원정대의 시료 기록', ending:'기억을 품은 빙하를 증명한 지질학자' },
  '단파 통신기사': { route:'bold', motif:'죽은 주파수와 낡은 송신기를 직접 되살리며', discovery:'현재 무전망에 43년 전 호출부호가 실제로 끼어드는 경로', ally:'고립된 외부 중계소와 기록 속 통신대원', ending:'두 시대의 송신을 끊어내고 연결한 통신기사' },
  '설상 구조대원': { route:'empathetic', motif:'눈보라 속 사람과 로프의 무게를 먼저 확인하며', discovery:'실종자들이 같은 환청을 따라 위험 구역으로 이동했다는 사실', ally:'구조대와 고립 연구원들', ending:'기록보다 사람을 먼저 끌어낸 구조대원' },
  '설원 길잡이': { route:'bold', motif:'바람이 지운 발자국과 열표식을 이어 길을 만들며', discovery:'관측소 지도에는 없는 오래된 창설 원정대 이동로', ally:'설상 운송대와 바깥 기지 안내원', ending:'붉은 설원에 돌아오는 길을 남긴 길잡이' },
  '극지 의무연구원': { route:'empathetic', motif:'저체온과 기억 혼선을 함께 살피며', discovery:'환청처럼 보이던 증상이 자기폭풍과 신경 기억의 공명이라는 단서', ally:'의료실 생존자와 혼란에 빠진 연구원들', ending:'기억과 몸을 함께 치료한 의무연구원' },
  '유랑 배우': { route:'empathetic', motif:'대사보다 상대의 호흡과 관객의 반응을 읽으며', discovery:'도시 사람들이 맡은 배역을 반복할수록 본명을 잊는다는 사실', ally:'가면 없는 아이와 이름을 기억하는 늙은 배우', ending:'배역 밖에서 첫 대사를 한 배우' },
  '가면 복원사': { route:'careful', motif:'덧칠 아래 표정과 지워진 서명을 복원하며', discovery:'가면마다 여러 세대 배우의 기억 습관이 겹쳐 있다는 증거', ally:'폐공방 장인과 수집가들', ending:'가면 속 사람의 이름을 복원한 장인' },
  '사막 길잡이': { route:'careful', motif:'별자리와 사구의 그림자로 움직이는 도시의 위치를 읽으며', discovery:'나실라트가 월식 때마다 같은 자리로 돌아오는 것이 아니라 이동한다는 사실', ally:'유목민과 외곽 우물지기', ending:'사라지는 도시의 진짜 길을 그린 길잡이' },
  '무대 장치공': { route:'bold', motif:'도르래와 승강판을 직접 움직여 장면의 순서를 바꾸며', discovery:'무대 장치가 도시의 문과 거리 구조까지 함께 움직인다는 원리', ally:'무대 뒤 기술자와 지하 작업반', ending:'천 년의 무대를 멈춘 장치공' },
  '소품 도둑': { route:'bold', motif:'배우가 눈치채기 전에 소품과 원고 조각을 바꿔치기하며', discovery:'마지막 장의 핵심 소품이 왕가 보물보다 평범한 본명표라는 사실', ally:'야시장 소매치기와 어린 심부름꾼', ending:'마지막 장면을 훔쳐 자유를 돌려준 도둑' },
  '등불 수호자': { route:'empathetic', motif:'공연이 끝나도 꺼지지 않는 등불과 사람의 이름을 지키며', discovery:'월식의 등불이 배우의 기억을 무대 밖까지 붙잡아 둔다는 사실', ally:'등불 회랑의 노인들과 이름 없는 관객들', ending:'마지막 등불을 스스로 끈 수호자' },

};

const CAUSAL_WORLD = {
  ember: {
    careful:{gain:'봉인 문양의 모순과 왕가 기록의 빈칸', cost:'조사가 길어지는 동안 성채의 경계가 촘촘해진다'},
    bold:{gain:'남들이 닿지 못한 구역과 적의 즉각적인 반응', cost:'소음과 파손 때문에 숨을 곳이 줄어든다'},
    empathetic:{gain:'사람과 망령이 감추고 있던 이름과 증언', cost:'누군가를 믿은 만큼 그 사람의 위험까지 함께 떠안게 된다'},
  },
  neon: {
    careful:{gain:'삭제 로그의 연결점과 감시망의 사각', cost:'역추적 시간이 길어져 추적자가 가까워진다'},
    bold:{gain:'봉쇄 전에 확보한 물리적 접근권과 원본 데이터', cost:'보안망이 파티의 행동 패턴을 학습한다'},
    empathetic:{gain:'시민·브로커·내부자의 증언과 은신처', cost:'도움을 준 사람들까지 추적 위험에 노출된다'},
  },
  abyss: {
    careful:{gain:'소나·생체·압력 기록 사이의 일치점', cost:'분석하는 동안 산소와 시간이 줄어든다'},
    bold:{gain:'폐쇄 구역에 먼저 닿아 얻은 현장 증거', cost:'압력 균형과 장비 상태가 더 나빠진다'},
    empathetic:{gain:'생존자의 기억과 구조 우선순위에 관한 진실', cost:'구조해야 할 사람이 늘어나 이동이 느려진다'},
  },
  clock: {
    careful:{gain:'루프마다 변하는 미세한 오차와 시간의 규칙', cost:'기록을 남길수록 루프가 파티의 존재를 더 선명히 인식한다'},
    bold:{gain:'정상 시간에는 닿을 수 없는 장소와 순간', cost:'시간 균열이 커져 다음 반복이 더 불안정해진다'},
    empathetic:{gain:'사라지지 않는 기억과 사람 사이의 연결', cost:'구하려는 사람이 늘수록 선택해야 할 순간도 많아진다'},
  },
  wild: {
    careful:{gain:'별가루·뿌리·꿈의 흔적이 가리키는 진짜 방향', cost:'흔적을 읽는 동안 숲의 포식자도 파티를 따라잡는다'},
    bold:{gain:'숲 중심부로 가는 빠른 길과 별핵의 반응', cost:'숲이 파티를 침입자로 인식해 길을 닫기 시작한다'},
    empathetic:{gain:'야수와 부족, 숲의 존재가 건네는 도움', cost:'서로 적대하던 존재들 사이의 약속까지 책임져야 한다'},
  },  guardian: {
    careful:{gain:'숲의 흔적과 고대 유적 기록 사이의 연결', cost:'조사하는 동안 침략자와 고블린이 파티의 위치를 좁혀 온다'},
    bold:{gain:'막힌 길을 먼저 열어 확보한 왕실 흔적과 전투 우위', cost:'소음과 파손이 남아 뒤따르는 적에게 이동 경로가 드러난다'},
    empathetic:{gain:'공주·로레인·숲 주민과 하얀 짐승이 건넨 신뢰와 증언', cost:'지켜야 할 사람과 약속이 늘어나 이동과 선택의 부담이 커진다'},
  },

  aurora:{
    careful:{gain:'현재 관측과 43년 전 기록 사이의 정확한 차이',cost:'분석하는 동안 체온과 구조 가능 시간이 줄어든다'},
    bold:{gain:'붕괴 전에 확보한 현장 장비와 기억층의 직접 증거',cost:'빙하와 자기장이 더 크게 공명해 다른 구역까지 흔들린다'},
    empathetic:{gain:'생존자의 뒤섞인 기억에서 건져 낸 이름과 구조 정보',cost:'구해야 할 사람과 보호해야 할 기록이 동시에 늘어난다'},
  },
  masque:{
    careful:{gain:'가면·원고·무대 표시 사이의 진짜 공연 순서',cost:'장면을 오래 조사할수록 도시가 파티의 배역을 구체적으로 정한다'},
    bold:{gain:'공연 순서를 깨고 확보한 무대 뒤 통로와 마지막 장 조각',cost:'관객과 배우가 파티를 즉흥 참가자가 아닌 공식 등장인물로 인식한다'},
    empathetic:{gain:'사람들이 배역 아래 숨겨 둔 본명과 개인적인 기억',cost:'되찾아 준 이름만큼 기존 공연의 관계와 약속이 흔들린다'},
  },

};

const JOB_SPECIAL_CHAPTERS = {
  '룬 기사':[3,10,21,29], '재의 마도사':[4,14,20,28], '성흔 추적자':[2,11,16,27],
  '왕묘 도굴꾼':[5,9,19,29], '백은 사제':[3,12,17,28], '검은 숲 사냥꾼':[4,10,22,29],
  '고스트 해커':[3,10,21,29], '증강 집행자':[4,14,20,28], '기억 브로커':[2,11,16,27],
  '드론 조종사':[5,9,19,29], '스트리트 메딕':[3,12,17,28], '데이터 사냥꾼':[4,10,22,29],
  '심해 잠수사':[3,10,21,29], '해양 생물학자':[4,14,20,28], '잠수정 기관사':[2,11,16,27],
  '소나 관측관':[5,9,19,29], '해군 구조요원':[3,12,17,28], '심해 의무관':[4,10,22,29],
  '시간 감식관':[3,10,21,29], '기계 시계공':[4,14,20,28], '역행 검사':[2,11,16,27],
  '예언 기록자':[5,9,19,29], '시간 밀수꾼':[3,12,17,28], '종소리 파수꾼':[4,10,22,29],
  '별사냥꾼':[3,10,21,29], '숲의 주술사':[4,14,20,28], '야수 길잡이':[2,11,16,27],
  '유성 대장장이':[5,9,19,29], '꿈의 방랑자':[3,12,17,28], '별빛 치유사':[4,10,22,29],  '캔터베리 수호기사':[3,10,21,29], '왕실 정찰병':[4,14,20,28], '고대유적 연구원':[2,11,16,27],
  '숲의 길잡이':[5,9,19,29], '왕실 외교관':[3,12,17,28], '야전 의무병':[4,10,22,29],

  '극지 기상관':[3,10,21,29], '빙하 지질학자':[4,14,20,28], '단파 통신기사':[2,11,16,27],
  '설상 구조대원':[5,9,19,29], '설원 길잡이':[3,12,17,28], '극지 의무연구원':[4,10,22,29],
  '유랑 배우':[3,10,21,29], '가면 복원사':[4,14,20,28], '사막 길잡이':[2,11,16,27],
  '무대 장치공':[5,9,19,29], '소품 도둑':[3,12,17,28], '등불 수호자':[4,10,22,29],

};

function isJobSpecialMoment(beat, job) {
  if (!beat || !job?.name) return false;
  if (String(beat.id || '').includes('DETOUR')) return false;
  const chapter = Number(beat.chapter || 0);
  return (JOB_SPECIAL_CHAPTERS[job.name] || []).includes(chapter);
}

const JOB_PHASE_ACTIONS = {
  탐색:['직업의 경험으로 현장의 두 번째 층을 읽어 숨은 길을 찾는다','다른 사람에게는 의미 없는 흔적을 전문 지식으로 연결한다'],
  도입:['현장의 첫 이상을 직업의 감각으로 확인한다','남들이 지나친 작은 흔적을 전문 지식으로 붙잡는다'],
  대면:['눈앞의 존재와 사건을 직업의 방식으로 정면 해석한다','현장의 핵심 장애물에 전문 기술을 직접 적용한다'],
  진실:['드러난 사실들 사이에서 직업만 알아볼 수 있는 모순을 파고든다','이미 모은 단서를 전문 지식으로 다시 엮어 숨은 의미를 찾는다'],
  위기:['무너지는 상황 속에서 직업의 장점을 이용해 피해와 진실을 동시에 붙잡는다','시간이 사라지기 전에 전문 기술로 가장 위험한 지점을 건드린다'],
  결단:['지금까지 쌓인 직업 전용 단서를 최종 선택과 연결한다','이 직업만 가능한 방식으로 사건의 결말에 개입한다'],
};

function causalThreadText(campaign, beat, prev) {
  if (!prev) return '';
  const route=prev.branchValue || 'careful';
  const world=CAUSAL_WORLD[campaign?.id]?.[route];
  if(!world) return '';
  if(prev.success){
    return `${prev.playerName || '파티'}의 선택으로 ${world.gain}을 손에 넣었다. 그래서 ${beat.title || '다음 장면'}에서는 처음부터 전과 다른 것을 볼 수 있었다. 다만 ${world.cost}`;
  }
  return `${prev.playerName || '파티'}는 원하는 결과를 완전히 얻지 못했다. 대신 실패 과정에서 ${world.gain}의 일부가 예상치 못한 형태로 드러났다. 문제는 ${world.cost} 그 여파가 ${beat.title || '다음 장면'}의 시작 조건을 바꾸었다.`;
}

function routeShiftBridge(campaign, history) {
  if (!Array.isArray(history) || history.length < 2) return '';
  const a=history[history.length-2];
  const b=history[history.length-1];
  if(!a?.branchValue || !b?.branchValue || a.branchValue===b.branchValue) return '';
  const world=campaign?.id;
  const bridges={
    ember:'성채는 한 가지 답만 허락하지 않았다. 앞서 얻은 흔적이 사람의 증언과 맞물리고, 힘으로 열었던 문 뒤에서 오히려 오래된 기록이 발견되면서 파티의 판단 기준도 달라졌다.',
    neon:'도시는 한 방향으로만 추적할 수 있는 상대가 아니었다. 훔친 로그가 사람의 기억과 겹치고, 강제로 뚫은 봉쇄선 뒤에서 새로운 거래자가 나타나면서 다음 선택의 이유가 바뀌었다.',
    abyss:'심해에서는 한 번 얻은 답도 곧 다른 의미를 가졌다. 장비 기록과 생존자의 증언, 압력 변화가 서로 맞물리며 파티가 믿어야 할 정보의 우선순위가 달라졌다.',
    clock:'루프는 같은 방법을 반복할수록 더 교묘하게 비틀렸다. 이전 반복에서 통했던 방식이 이번에는 다른 결과를 낳았고, 남겨 둔 기억과 사람의 반응이 새로운 길을 요구했다.',
    wild:'숲은 선택을 기억했다. 억지로 연 길에는 상처가 남았고, 조심스럽게 읽은 흔적에는 누군가의 발자국이 겹쳤다. 파티는 그 변화에 맞춰 다음 걸음을 바꿀 수밖에 없었다.',
    guardian:'캔터베리 숲에서는 누구를 도왔고 무엇을 먼저 지켰는지가 다음 길을 바꿨다. 고블린을 쫓던 길이 유적의 단서로 이어지고, 여관에서 만든 신뢰가 숲 깊은 곳의 도움으로 돌아오면서 파티는 같은 방법만 고집할 수 없었다.',
    aurora:'극지에서는 한 번의 관측과 구조가 서로 분리되지 않았다. 빙핵에서 찾은 기록이 생존자의 기억을 바로잡고, 위험하게 연 통로가 새로운 안테나 시야를 만들면서 다음 판단 기준이 달라졌다.',
    masque:'나실라트에서는 한 장면의 행동이 다음 배역을 바꿨다. 훔친 소품이 원고의 빈칸을 메우고, 한 사람에게 되찾아 준 이름이 무대 뒤 길을 열면서 같은 방식만 반복할 수 없게 되었다.',
  };
  const why=b.success
    ? `${b.playerName || '파티'}가 방금 얻은 성과가 앞서 놓친 부분을 보완해 주었다.`
    : `${b.playerName || '파티'}의 시도가 뜻대로 풀리지 않으면서, 같은 방법을 고집할 수 없다는 사실이 분명해졌다.`;
  return `${bridges[world] || '앞선 선택이 새로운 사실을 드러내면서 파티의 다음 판단도 달라졌다.'} ${why} 하지만 이전에 얻은 단서와 관계가 사라진 것은 아니었다. 그것들은 다른 방식으로 다음 장면에 쓰이기 시작했다.`;
}

function rememberNarrativeThread(room, campaign, beat, choice, player, success, margin, status) {
  room.narrativeLedger ||= {threads:[],routeShifts:[],jobThreads:{}};
  const route=choice.branchValue || 'careful';
  const world=CAUSAL_WORLD[campaign?.id]?.[route] || {};
  const entry={chapter:beat.chapter,act:beat.act,beatId:beat.id,playerId:player.id,playerName:player.name,job:player.job?.name || '',route,success,critical:success&&margin>=5,severeFailure:!success&&margin<=-5,gain:world.gain||'',cost:world.cost||'',status:status?.label||'',choice:choice.label};
  room.narrativeLedger.threads.push(entry);
  if(room.narrativeLedger.threads.length>20) room.narrativeLedger.threads.splice(0,room.narrativeLedger.threads.length-20);
  if(choice.jobSpecial && player.job?.name){
    const list=room.narrativeLedger.jobThreads[player.job.name] ||= [];
    list.push(entry); if(list.length>8) list.splice(0,list.length-8);
  }
  return entry;
}

function jobThreadCarry(room, jobName) {
  const list=room.narrativeLedger?.jobThreads?.[jobName] || [];
  const last=list[list.length-1];
  if(!last) return '';
  if(last.success) return `${jobName}의 이전 선택에서 얻은 ${last.gain || '전문 단서'}가 아직 유효하다. 그 단서는 이번 장면의 평범한 풍경 속에서 다시 의미를 드러낸다.`;
  return `${jobName}의 이전 시도에서 생긴 문제는 끝나지 않았다. ${last.status ? `${last.status}의 후유증과 함께 ` : ''}${last.cost || '그때의 대가'}가 이번 장면의 판단을 더 어렵게 만든다.`;
}

function jobStoryChoice(campaign, beat, job, room) {
  if (!job?.name) return null;
  const sig = JOB_STORY_SIGNATURES[job.name];
  if (!sig) return null;
  const phase=beat?.phase || '도입';
  const progress=Number(room.jobStory?.[job.name]?.success || 0);
  const failures=Number(room.jobStory?.[job.name]?.failure || 0);
  const tier=progress>=4?'결말':progress>=2?'심화':'발견';
  const skill=job.skillDef?.name || String(job.skill || '').split(':')[0] || '전문 기술';
  const phaseActions=JOB_PHASE_ACTIONS[phase] || JOB_PHASE_ACTIONS.도입;
  const seed=(Number(beat?.chapter||1)+job.name.length+progress)%phaseActions.length;
  const action=phaseActions[seed];
  const carry=jobThreadCarry(room,job.name);
  const sceneTarget=beat?.objective || beat?.title || '현재 사건';
  const tierGoal=tier==='결말'
    ? `${sig.discovery}과 ${sig.ally}를 하나의 증거로 묶어 ${sig.ending}으로 이어질 마지막 가능성을 만든다`
    : tier==='심화'
      ? `${sig.ally}와 이미 얻은 단서를 연결해 ${sig.discovery}의 원인까지 파고든다`
      : `${sig.discovery}에 처음 손을 뻗어 다른 직업은 볼 수 없는 첫 단서를 확보한다`;
  const dc=Math.max(9,Number(beat?.act||1)+9+(phase==='위기'?1:0)+(failures>=2?1:0)-Math.min(1,Math.floor(progress/3)));
  return {
    id:`${beat.id}-JOB-${job.name}`,
    label:`${job.name} — ${action}`,
    detail:`직업 전용 · ${job.prime} DC ${dc} · ${skill}. ${sceneTarget}과 직접 연결된 ${tier} 단계 선택. ${carry || `성공하면 ${sig.ally} 또는 ${sig.discovery}에 관한 직업 전용 서사가 열린다.`}`,
    stat:job.prime, dc, path:statPath(job.prime), branchValue:sig.route, branchKey:`job:${job.name}`,
    requiredJob:job.name, jobSpecial:true, jobEnding:sig.ending,
    success:`${sig.motif} ${tierGoal}. ${sig.ally}와 이어진 흔적은 사라지지 않았고, 이후 누군가의 태도와 숨겨진 단서의 위치까지 달라지기 시작했다.`,
    failure:`${sig.motif} ${sceneTarget}에 손을 뻗었지만, 이미 누군가 한발 먼저 흔적을 뒤틀어 놓았다. ${sig.discovery}의 일부는 드러났으나 그 순간 ${sig.ally}와 이어진 위험도 함께 깨어났다. 얻은 정보는 남았고, 대가 역시 다음 장면까지 따라온다.`,
  };
}

function injectJobStoryChoices(room, campaign, beat) {
  if (!beat || !Array.isArray(beat.choices)) return beat;
  const actor=currentTurnPlayer(room);
  const job=actor?.job;

  // 기본 장면은 공통 선택지만 유지한다. 직업 전용 선택은 정해진 희귀 장면에서만 추가한다.
  beat.choices=beat.choices.filter(choice=>!choice.requiredJob);
  if(!job?.name || !isJobSpecialMoment(beat, job)) return beat;

  const special=jobStoryChoice(campaign,beat,job,room);
  if(special) {
    special.detail = `희귀 직업 기회 · ${special.detail.replace('직업 전용 · ', '')}`;
    special.rareJobMoment = true;
    // A rare job option participates in the same story graph. It inherits the edge of the
    // matching route so choosing a profession-specific action never breaks progression.
    const routeTemplate = beat.choices.find(choice => choice.branchValue === special.branchValue) || beat.choices[0];
    special.next = routeTemplate?.next ? JSON.parse(JSON.stringify(routeTemplate.next)) : null;
    beat.choices.push(special);
  }
  return beat;
}

function routeSceneVariant(campaign, beat, room, prev) {
  if (!prev?.branchValue) return '';
  const route = prev.branchValue;
  const rawWorld = campaign?.id;
  const world = String(rawWorld||'').startsWith('guardian') ? 'guardian' : rawWorld;
  const phase = beat?.phase || '장면';
  const tables = {
    ember: {
      careful:'앞선 조사에서 확보한 문양과 기록이 맞물리며, 성채의 복도 하나가 평범한 돌벽이 아니라 봉인의 일부였다는 사실이 드러난다.',
      bold:'앞선 돌파의 소음 때문에 성채는 이미 깨어 있다. 멀리서 갑옷이 부딪히는 소리가 따라오고, 이번 장면은 숨어 조사하기보다 먼저 움직여야 하는 상황이 된다.',
      empathetic:'앞서 얻은 신뢰 덕분에 닫혀 있던 문 하나가 사람의 손으로 열린다. 누군가는 파티에게 말하지 않으려 했던 이름을 조심스럽게 꺼낸다.',
    },
    neon: {
      careful:'복구한 로그의 시간표가 새 장면의 네온 간판과 정확히 겹친다. 파티는 추적자보다 먼저 데이터 흐름의 목적지를 짐작한다.',
      bold:'보안망은 앞선 침입 방식을 학습했다. 이번 구역은 이미 봉쇄 모드이며, 파티가 움직이는 순간 도시 전체가 반응할 준비를 한다.',
      empathetic:'앞서 도움을 받은 시민과 거래자들이 작은 연락망을 만들었다. 공식 지도에는 없는 안전한 길과 새로운 증언이 동시에 열린다.',
    },
    abyss: {
      careful:'소나와 생체 기록이 한 점에서 겹치며, 지금까지 괴물의 흔적으로 보였던 신호가 사실 구조 요청의 반복일 가능성이 생긴다.',
      bold:'앞선 강행 돌파로 기지의 압력 균형이 깨졌다. 이번 장면에서는 단서뿐 아니라 언제 닫힐지 모르는 격벽과 침수까지 함께 상대해야 한다.',
      empathetic:'살려 둔 생존자가 이번 장면에서 먼저 입을 연다. 그가 본 것은 로그에 남지 않은 금지 구역의 진실이었다.',
    },
    clock: {
      careful:'기록한 시간 오차가 이번 반복에서도 다시 나타난다. 작은 차이 하나가 루프의 규칙이 무너지기 시작했음을 보여 준다.',
      bold:'앞선 역행의 충격 때문에 이번 반복은 처음부터 어긋나 있다. 원래 있어야 할 문이 사라지고, 대신 한 번도 본 적 없는 계단이 열린다.',
      empathetic:'서로의 기억을 맞춘 사람들이 이번 반복에서도 파티를 알아본다. 루프가 지운 관계가 완전히 사라지지 않았다는 증거다.',
    },
    wild: {
      careful:'별가루와 뿌리의 방향이 이번 장면에서 하나의 원을 그린다. 숲이 길을 숨기는 것이 아니라 무언가를 피해 길을 바꾸고 있다는 사실이 보인다.',
      bold:'앞서 억지로 연 길 때문에 숲이 거칠게 반응한다. 나무와 야수가 파티를 경계하지만, 대신 누구보다 빨리 중심부에 가까워졌다.',
      empathetic:'앞서 도움을 준 야수와 숲의 존재들이 멀리서 모습을 드러낸다. 그들이 도망치지 않는다는 사실만으로도 이번 장면의 의미가 달라진다.',
    },
  };
  const line = tables[world]?.[route] || '';
  if (!line) return '';
  return phase === '결단' ? `${line} 이제 이 흐름을 유지할지, 완전히 다른 길로 꺾을지 결정해야 한다.` : line;
}

function jobStoryContinuity(room, playerName) {
  const last = room.jobStory?.last;
  if (!last) return '';
  const status = last.success
    ? `${last.jobName}의 전문성이 남긴 단서 때문에 원래는 보이지 않던 길이 열려 있다.`
    : `${last.jobName}의 전문적인 시도가 실패한 여파가 아직 현장에 남아 있다.`;
  return `${status} ${last.narrative || ''}`.trim();
}

function storyNodeById(campaign, nodeId) {
  if (!campaign?.storyBeats?.length || !nodeId) return null;
  if (!campaign._storyNodeIndex || campaign._storyNodeIndexSize !== campaign.storyBeats.length) {
    Object.defineProperty(campaign, '_storyNodeIndex', { value:new Map(campaign.storyBeats.map(beat=>[beat.id, beat])), writable:true, configurable:true, enumerable:false });
    Object.defineProperty(campaign, '_storyNodeIndexSize', { value:campaign.storyBeats.length, writable:true, configurable:true, enumerable:false });
  }
  return campaign._storyNodeIndex.get(nodeId) || null;
}

function resolveNextStoryNode(campaign, beat, choice, success) {
  if (!beat || !choice) return null;
  const next = choice.next?.[success ? 'success' : 'failure'] ?? choice.next?.default ?? beat.next ?? null;
  if (next === '__ENDING__') return '__ENDING__';
  return storyNodeById(campaign, next) ? next : null;
}

function consumeStoryBeat(room, campaign, beat, choice, success) {
  if (!beat?.id || beat.isDetour) return { ok:false, error:'invalid-beat' };
  room.storySeenIds ||= [];
  if (room.storySeenIds.includes(beat.id)) {
    // Hard invariant: a main-story node is consumable only once per session.
    return { ok:false, error:'repeat-node' };
  }
  const current = room.storyNodeId || campaign?.storyBeats?.[0]?.id || null;
  if (current !== beat.id) return { ok:false, error:'stale-node' };

  room.storySeenIds.push(beat.id);
  room.story = room.storySeenIds.length;
  const next = resolveNextStoryNode(campaign, beat, choice, success);
  if (next === '__ENDING__') {
    room.storyNodeId = null;
    room.storyComplete = true;
  } else if (next && !room.storySeenIds.includes(next)) {
    room.storyNodeId = next;
  } else {
    // Do not skip forward and do not repeat. A broken graph stops instead of inventing continuity.
    room.storyNodeId = null;
    room.storyComplete = true;
    room.storyGraphError = next ? `repeat-edge:${next}` : `missing-edge:${beat.id}`;
  }
  return { ok:true, next:room.storyNodeId, complete:room.storyComplete };
}

function renderedStoryBeat(room, campaign) {
  if (room.storyDetour) {
    const detour = JSON.parse(JSON.stringify(room.storyDetour));
    adaptiveChoiceRewrite(room, detour);
    injectJobStoryChoices(room, campaign, detour);
    return detour;
  }
  if (room.storyComplete) return null;
  if (!room.storyNodeId) room.storyNodeId = campaign?.storyBeats?.[0]?.id || null;
  const base = storyNodeById(campaign, room.storyNodeId);
  if (!base) return null;
  if ((room.storySeenIds || []).includes(base.id)) return null;
  const beat = JSON.parse(JSON.stringify(base));
  const history = room.storyHistory || [];
  const prev = history[history.length - 1];
  const continuity = livingContinuity(room, campaign, beat, prev);
  const shiftBridge = routeShiftBridge(campaign, history);
  const lingering = room.players.flatMap(member => activeStatuses(room, member).map(status => `${member.name}의 ${status.label}`));
  const paragraphs = [];

  if (beat.chapter === 1 && room.storyMemory?.prologueMeeting) paragraphs.push(room.storyMemory.prologueMeeting);
  if (continuity) paragraphs.push(continuity);
  if (shiftBridge) paragraphs.push(shiftBridge);
  const routeVariant = routeSceneVariant(campaign, beat, room, prev);
  if (routeVariant) paragraphs.push(routeVariant);
  const actorJob=currentTurnPlayer(room)?.job?.name;
  const jobContinuity=actorJob ? jobThreadCarry(room,actorJob) : '';
  if (jobContinuity) paragraphs.push(jobContinuity);
  paragraphs.push(beat.situation || beat.text || '');

  if (lingering.length) {
    paragraphs.push(`${lingering.slice(0,3).join(', ')}${lingering.length > 3 ? ' 같은 후유증' : ''}도 아직 사라지지 않았다. 몸과 판단에 남은 상처 때문에 이번 선택은 이전보다 조금 더 무겁다.`);
  }

  const currentRoute = prev?.branchValue || room.narrativeState?.lastRoute || 'careful';
  beat.route = { key:currentRoute, ...(ROUTE_META[currentRoute] || ROUTE_META.careful), previousSuccess:prev?.success ?? null };
  beat.situation = paragraphs.filter(Boolean).join('\n\n');
  beat.text = beat.situation;
  beat.continuityHook = branchCliffhanger(campaign, beat, prev);
  beat.visual = `${beat.visual} · ${routeName(currentRoute)}의 흔적`;
  adaptiveChoiceRewrite(room, beat);
  injectJobStoryChoices(room, campaign, beat);
  return prepareAgencyBeat(room, beat);
}


const PROLOGUE_META = {
  ember: {
    opening: '왕이 죽은 뒤 잿빛 성채 전체가 장례의 연기와 음모의 속삭임으로 뒤덮였다.',
    places: { 근력:'무너진 외성의 성문', 지능:'불탄 기록 보관실', 지혜:'왕가 예배당의 낡은 회랑', 민첩:'봉인된 왕묘 외벽', 매력:'장례객이 모인 추도 홀', 체력:'검은 숲과 맞닿은 성벽 초소' },
    hooks: {
      근력:'흩어진 경비대를 추슬러 장송 행렬을 지키는 동안, 누군가가 왕관의 봉인을 노리고 있다는 소문을 듣는다.',
      지능:'타버린 장부 속에서 왕관 계승자와 관련된 지워진 기록 한 줄을 복원한다.',
      지혜:'성흔이 남은 바닥과 향 냄새 속에서 누군가 의도적으로 의식을 어지럽혔다는 사실을 직감한다.',
      민첩:'도굴꾼의 흔적을 쫓다 왕묘 깊숙한 곳으로 통하는 샛길을 먼저 발견한다.',
      매력:'슬픔에 젖은 귀족과 사제들 사이를 오가며 모두가 감추는 불안의 정체를 읽어 낸다.',
      체력:'성벽 아래 검은 숲에서 올라온 짐승의 발자국이 장례일 밤의 소란과 이어진다는 사실을 붙잡는다.',
    },
    meet: '장례의 종이 세 번 울리자, 서로 다른 길을 걷던 이들은 모두 잿빛 성채의 봉인실 앞으로 불려 온다. 각자가 쥔 단서가 마침내 하나의 왕관을 가리킨다.',
  },
  neon: {
    opening: '네온 비가 쏟아지는 2099년, 도시 전체가 지워진 기억 조각과 불법 데이터 거래로 술렁이고 있었다.',
    places: { 근력:'하층 구역 검문소', 지능:'암호화 서버실', 지혜:'응급 진료 스테이션', 민첩:'드론 이착륙 옥상', 매력:'기억 경매장 로비', 체력:'추적망이 얽힌 뒷골목' },
    hooks: {
      근력:'폭주 직전의 치안 드론 떼를 막아 세우다 누군가 도시의 핵심 기억을 훔쳤다는 경보를 듣는다.',
      지능:'잠긴 백업 노드 안에서 삭제된 시민 기록과 이어지는 백도어를 발견한다.',
      지혜:'패닉에 빠진 시민들을 진정시키며 이 사건이 단순 사고가 아니라 계획된 조작임을 알아차린다.',
      민첩:'원격 시야로 좇은 이상 신호가 동일한 허브 좌표로 수렴한다는 사실을 먼저 포착한다.',
      매력:'거래장 한복판에서 모두가 부정하는 공포와 욕망을 읽고, 사건의 배후가 거래자들 사이에 숨어 있음을 감지한다.',
      체력:'추적팀의 포위를 피해 달리며, 잃어버린 데이터 조각이 사람 목숨과 직결된다는 진실에 닿는다.',
    },
    meet: '서로 다른 네트워크를 뒤지던 이들은 버려진 메모리 허브에서 같은 좌표를 가리키는 로그를 맞대게 된다. 그 순간, 개인 의뢰는 도시 전체의 사건으로 바뀐다.',
  },
  abyss: {
    opening: '심해 관측 기지가 마지막 구조 신호를 보낸 뒤, 바다는 유난히 조용했고 그 침묵이 더 불길했다.',
    places: { 근력:'침수된 갑판 통로', 지능:'생체 표본 연구실', 지혜:'소나 관측실', 민첩:'잠수정 정비 베이', 매력:'응급 격리 병동', 체력:'감압 게이트 앞' },
    hooks: {
      근력:'기울어진 통로에서 부상자를 끌어내며, 무언가가 내부에서 문을 두드렸다는 증언을 듣는다.',
      지능:'비정상적으로 변형된 표본을 분석하다 기지 심부에서 온 생체 반응을 확인한다.',
      지혜:'모니터에 겹쳐 찍힌 반향 속에서 구조 요청이 조작되었을 가능성을 읽어 낸다.',
      민첩:'망가진 잠수정 배선을 잇는 동안, 외부 도킹 라인에 누군가 손댄 흔적을 찾아낸다.',
      매력:'공포에 질린 생존자를 안정시키며 그들이 끝내 말하지 못한 금지 구역의 이름을 듣게 된다.',
      체력:'감압실을 버티며 압력 이상을 막던 중, 바깥이 아니라 안쪽에서 재난이 시작됐음을 깨닫는다.',
    },
    meet: '비상 조명이 깜빡이는 중앙 수문 앞, 각 구역에서 살아 돌아온 이들이 구조 지도를 펼친다. 흩어진 보고가 하나로 연결되며 등대의 진짜 비밀이 드러나기 시작한다.',
  },
  clock: {
    opening: '13번째 종이 울린 밤, 시계탑 도시는 한순간씩 어긋난 시간 때문에 같은 공포를 되풀이하고 있었다.',
    places: { 근력:'시계탑 하부 검문 회랑', 지능:'톱니 장치실', 지혜:'시간 기록 보관소', 민첩:'루프 경계 골목', 매력:'예언 낭독실', 체력:'종소리 감시 발코니' },
    hooks: {
      근력:'되감기 직전의 폭주자를 제압하며 누군가 의도적으로 루프를 연장하고 있다는 흔적을 본다.',
      지능:'멈춰 선 기어를 맞추다 정상 시간과 다른 각도로 돌아가는 숨은 축을 발견한다.',
      지혜:'사라졌다 나타나는 기록 조각을 읽고, 반복되는 밤마다 한 문장씩 바뀌는 예언을 포착한다.',
      민첩:'시간이 얇아진 골목을 빠져나오며 금지된 방으로 향하는 가장 빠른 길을 기억해 낸다.',
      매력:'예언을 두려워하는 사람들의 목소리에서 그들이 감춘 죄책감과 바람을 길어 올린다.',
      체력:'매번 더 세게 울리는 종소리를 버티며, 도시 전체를 잠식하는 루프의 진동을 몸으로 느낀다.',
    },
    meet: '종이 열세 번 울리는 정확한 시각, 서로 다른 시간 조각을 쥔 이들이 시계탑 중심의 회합실에서 한자리에 모인다. 각자의 기억이 겹치며 루프의 진짜 입구가 열린다.',
  },
  wild: {
    opening: '하늘의 별 하나가 숲 깊숙이 떨어진 뒤, 나무와 짐승, 꿈과 현실의 경계가 서서히 뒤틀리기 시작했다.',
    places: { 근력:'별철 대장간의 불꽃 앞', 지능:'꿈길과 겹친 수풀 공터', 지혜:'거대한 고목의 뿌리 아래', 민첩:'별빛이 내려앉은 사냥 길목', 매력:'야수들이 모이는 샘터', 체력:'운석 충돌 지대의 가장자리' },
    hooks: {
      근력:'부서진 별철을 두드리다 숲의 심장부로 이어지는 이상 진동을 감지한다.',
      지능:'꿈과 현실이 엇갈린 흔적을 쫓다 같은 장소를 두 개의 방식으로 기억하게 된다.',
      지혜:'수목의 낮은 속삭임에서 별을 삼킨 존재가 깨어나고 있다는 경고를 듣는다.',
      민첩:'별가루가 남긴 발자국을 따라가며 누구보다 먼저 변화의 중심을 포착한다.',
      매력:'경계하던 야수들을 달래는 동안 그들이 두려워하는 그림자의 방향을 알아낸다.',
      체력:'운석 파편의 독한 기운을 버텨 내며 숲을 삼키는 병이 어디서 시작됐는지 찾는다.',
    },
    meet: '숲 한가운데 별빛이 스며든 제단에서, 서로 다른 징조를 따라온 이들이 결국 한 원을 그리며 만난다. 각자의 목격담이 합쳐지는 순간, 숲 전체의 상처가 모습을 드러낸다.',
  },  guardian: {
    opening:'캔터베리 성이 침략자들의 공격으로 무너진 뒤, 숲 곳곳에는 왕실 수호자와 피난민의 흔적이 흩어져 있었다.',
    places:{ 근력:'무너진 왕실 수송로', 지능:'숲 가장자리의 고대 표식 앞', 지혜:'짐승의 발자국이 겹친 숲길', 민첩:'고블린 정찰대가 지나는 협곡', 매력:'피난민이 숨어 있는 작은 초소', 체력:'전투 직후의 야전 치료 지점' },
    hooks:{
      근력:'무너진 잔해 아래에서 사람을 끌어내다 작은 공주가 숲 안쪽으로 달려갔다는 말을 듣는다.',
      지능:'왕실 문양과 고대 룬이 같은 방향을 가리킨다는 사실을 발견한다.',
      지혜:'고블린의 추격 흔적 사이에서 누군가 일부러 적을 다른 방향으로 끌었다는 흔적을 읽는다.',
      민첩:'정찰대를 피해 숲을 가로지르며 작은 왕실 리본 조각을 먼저 발견한다.',
      매력:'겁먹은 피난민들을 진정시키며 낡은 여관과 수상한 여관지기에 대한 소문을 듣는다.',
      체력:'부상자를 치료하며 공주가 수호자를 살리려고 혼자 고블린을 유인했다는 증언을 듣는다.',
    },
    meet:'서로 다른 흔적을 쫓던 수호자들은 낡은 여관으로 이어지는 숲길에서 마주친다. 각자가 찾은 단서는 모두 작은 공주와 같은 방향을 가리키고 있었다.',
  },

};


PROLOGUE_META.guardian1 = PROLOGUE_META.guardian || PROLOGUE_META.ember;
PROLOGUE_META.guardian2 = {
  ...(PROLOGUE_META.guardian || PROLOGUE_META.ember),
  opening:'첫 원정을 마친 수호자들은 셴 시티와 그 너머의 세계로 흩어져 다음 챔피언의 흔적을 쫓고 있었다.',
  meet:'서로 다른 사건을 겪은 수호자들이 셴 시티의 수련장 앞에서 다시 모인다. 첫 여정의 상처와 약속은 그대로 남아 있었다.'
};
PROLOGUE_META.guardian3 = {
  ...(PROLOGUE_META.guardian || PROLOGUE_META.ember),
  opening:'라 제국의 국경에서 시작된 긴장은 곧 시간 자체를 찢는 사건으로 이어질 준비를 하고 있었다.',
  meet:'라 제국의 어두운 검문소에서 다시 모인 수호자들은 자신들이 곧 10년이라는 시간을 건너게 될 줄 아직 알지 못했다.'
};

PROLOGUE_META.aurora = {
  opening:'남극권의 밤하늘이 붉게 갈라진 날, 제7관측소는 43년 전에 폐기된 창설 원정대 호출부호를 다시 수신하기 시작했다.',
  places:{근력:'눈에 파묻힌 외부 격납고',지능:'빙핵 분석실',지혜:'극광 관측돔',민첩:'안테나 능선의 설상로',매력:'고립 연구원 대기실',체력:'저체온 치료실'},
  hooks:{
    근력:'얼어붙은 셔터를 열어 구조 장비를 꺼내다 안쪽에서 43년 전 날짜가 찍힌 젖은 장갑을 발견한다.',
    지능:'새 빙핵의 검은 광물층을 분석하다 자기 기록과 똑같은 파형이 수십 년 전 층에도 남아 있음을 확인한다.',
    지혜:'적색 극광의 편광 방향을 기록하던 중 하늘의 파형이 오래된 구조 신호의 모스 부호와 일치한다는 사실을 알아챈다.',
    민첩:'눈보라가 덮치기 전에 안테나 능선을 확인하다 현재 지도에 없는 오래된 열표식 줄을 발견한다.',
    매력:'서로 다른 기억을 주장하는 연구원들을 진정시키며 모두가 같은 여성 대원의 목소리를 들었다는 공통점을 찾아낸다.',
    체력:'저체온 환자의 떨림과 기억 혼선을 기록하다 증상이 극광이 강해지는 순간마다 동시에 악화된다는 사실을 붙잡는다.',
  },
  meet:'각자 다른 구역에서 같은 호출부호를 쫓던 이들은 중앙 발전실에서 마주친다. 관측 기록, 빙핵, 무전과 사람의 기억이 모두 43년 전 같은 밤을 가리키고 있었다.',
};
PROLOGUE_META.masque = {
  opening:'개기월식이 시작되자 지도에 없던 사막도시 나실라트가 모래바람 속에서 모습을 드러냈다. 성문을 지난 사람에게는 이름 대신 오늘 밤의 배역이 주어졌다.',
  places:{근력:'원형극장 무대장치실',지능:'폐쇄된 가면 복원공방',지혜:'월식 성문 앞 별모래 사구',민첩:'가면 야시장 뒤편 소품골목',매력:'첫 공연을 기다리는 입장광장',체력:'밤새 꺼지지 않는 등불회랑'},
  hooks:{
    근력:'고장 난 무대 승강판을 밀어 올리다 그 아래에 도시의 거리 이름이 적힌 거대한 도르래 지도를 발견한다.',
    지능:'금이 간 가면을 복원하다 여러 겹의 안료 아래 서로 다른 세 사람의 본명이 겹쳐 적혀 있음을 확인한다.',
    지혜:'별모래 지도를 펴 보니 도시가 월식 때마다 같은 폐허가 아니라 조금씩 다른 사구 위에 나타난다는 사실을 읽는다.',
    민첩:'야시장에서 소품 하나가 바뀌는 순간 근처 배우들의 대사까지 달라지는 것을 목격하고 무대와 도시가 연결되어 있음을 직감한다.',
    매력:'입장광장에서 배우의 대사를 받아 주다가 상대가 자신의 배역은 기억하지만 본명은 말하지 못한다는 사실을 알아챈다.',
    체력:'등불을 밤새 지키는 노인에게서 마지막 등불이 꺼지면 도시 사람들의 이름이 돌아온다는 금지된 이야기를 듣는다.',
  },
  meet:'서로 다른 배역을 받은 이들은 이름 없는 원형극장의 첫 막 직전 무대 뒤에서 마주친다. 각자가 가진 가면, 지도, 소품과 증언은 모두 사라진 마지막 원고 한 장을 가리킨다.',
};

function buildPlayerPrologue(campaign, player) {
  const job = player?.job || {};
  const meta = PROLOGUE_META[campaign?.id] || PROLOGUE_META.ember;
  const prime = job.prime || '지혜';
  const place = meta.places?.[prime] || Object.values(meta.places || {})[0] || '낯선 현장';
  const hook = meta.hooks?.[prime] || '작은 단서는 더 큰 사건의 문을 연다.';
  const skillName = job.skillDef?.name || (job.skill ? job.skill.split(':')[0] : '고유 기술');
  const paragraphA = `${meta.opening} ${player.name}는(은) ${place}에서 ${job.name || '여행자'}로서 자신의 일을 해내고 있었다.`;
  const paragraphB = `${hook} 이때 ${player.name}는(은) ${skillName}의 감각과 ${prime} 능력을 바탕으로 남들이 지나친 균열을 붙잡는다. 개인적인 일이던 사건은 점점 더 큰 연대기의 서막으로 변한다.`;
  const paragraphC = `마지막 단서는 분명하다. 지금 붙잡은 흔적은 혼자 해결할 수 있는 규모가 아니다. 누군가 같은 진실을 뒤쫓고 있으며, 곧 같은 장소에서 만나게 될 것이다.`;
  return {
    title: `${job.name || '모험가'}의 시작`,
    lead: `${place}에서 시작된 개인 서사`,
    objective: '개인 프롤로그를 읽고 합류 준비를 완료하세요.',
    prompt: `${job.name || '당신'}은(는) 어떤 이유로 이 사건을 끝까지 추적하려 하나요? 그 답은 이후 이야기의 분위기에 남습니다.`,
    paragraphs: [paragraphA, paragraphB, paragraphC],
  };
}

function buildCampaignPrologue(room, campaign) {
  const scenes = {};
  for (const player of room.players) scenes[player.id] = buildPlayerPrologue(campaign, player);
  return {
    scenes,
    ready: {},
    meetingText: (PROLOGUE_META[campaign?.id] || PROLOGUE_META.ember).meet,
  };
}

function publicRoom(room) {
  const campaign = CAMPAIGNS.find(c => c.id === room.campaignId);
  const turnPlayer = room.phase==='resolution' && room.pendingContinue?.source==='parallel-story' && room.pendingContinue?.actorId
    ? getPlayer(room,room.pendingContinue.actorId)
    : currentTurnPlayer(room);
  return {
    code: room.code,
    phase: room.phase,
    campaignId: room.campaignId,
    campaign: campaign ? {
      id: campaign.id, title: campaign.title, genre: campaign.genre,
      subtitle: campaign.subtitle, intro: campaign.intro, acts: campaign.acts,
      icon: campaign.icon, accent: campaign.accent, accent2: campaign.accent2,
      jobs: campaign.jobs, monsters: campaign.monsters, items: campaign.items || [], eventCount: campaign.events.length, storyBeatCount: campaign.storyBeats.length,
      parallelMode: Boolean(campaign.parallelStory?.enabled),
    } : null,
    players: room.players.map(p => ({
      id: p.id, name: p.name, host: p.host, connected: p.connected,
      ready: p.ready, job: p.job, abilities: p.abilities,
      hp: p.hp, maxHp: p.maxHp, inspiration: p.inspiration,
      coins: Number(p.coins || 0), inventory: [...(p.inventory || [])], equipment: { ...(p.equipment || {}) },
      equipmentBonuses: Object.fromEntries(STAT_NAMES.map(stat => [stat, equipmentStatBonus(room, p, stat)])),
      derived: derivedAbilityImpact(p),
      statuses: activeStatuses(room, p),
      skillState: { ...(p.skillState || {}), cooldownRemaining: Math.max(0, Number(p.skillState?.readyAtTurn || 0) - Number(room.turnSerial || 0)) },
    })),
    deckCount: room.deck.length,
    discardCount: room.discard.length,
    currentEvent: room.currentEvent,
    activeChoice: room.activeChoice,
    choiceVotes: room.choiceVotes || {},
    voteEndsAt: room.voteEndsAt || null,
    voteAllVotedCountdown: Boolean(room.voteAllVotedCountdown),
    voteDurationMs: VOTE_DURATION_MS,
    soloVoteDurationMs: SOLO_VOTE_DURATION_MS,
    allVotedCountdownMs: ALL_VOTED_COUNTDOWN_MS,
    soloMode: connectedPlayers(room).length <= 1,
    mainTurnsSinceEvent: Number(room.mainTurnsSinceEvent || 0),
    turnSerial: Number(room.turnSerial || 0),
    nextCheckDcReduction: Number(room.nextCheckDcReduction || 0),
    eventEveryTurns: EVENT_EVERY_TURNS,
    storyBeat: room.phase === 'resolution' && room.lastResolvedStoryBeat ? JSON.parse(JSON.stringify(room.lastResolvedStoryBeat)) : ((room.phase === 'story' || room.phase === 'resolution') ? renderedStoryBeat(room, campaign) : null),
    turnIndex: room.turnIndex || 0,
    turnPlayerId: turnPlayer?.id || null,
    turnPlayerName: turnPlayer?.name || null,
    threat: room.threat,
    story: room.story,
    storyNodeId: room.storyNodeId || null,
    storyComplete: Boolean(room.storyComplete),
    storyMode: 'branch-graph',
    dcPenalty: room.dcPenalty,
    monster: room.monster,
    lastResolution: room.lastResolution || null,
    ending: room.ending || null,
    lastStoryAction: room.lastStoryAction || null,
    storyHistory: (room.storyHistory || []).slice(-8),
    storyMemory: room.storyMemory || {},
    jobStory: room.jobStory || {},
    abandonVote: room.abandonVote || null,
    targetStory: TARGET_STORY,
    storySeenCount: room.storySeenIds?.length || 0,
    facilityUses: room.facilityUses || {},
    agencyMemory: room.agencyMemory || { actions:[], clues:0, position:0, rapport:0, scars:0 },
    maxThreat: MAX_THREAT,
    resumeBarrier: false,
    resumeMissingNames: [],
    parallel: room.parallel?.enabled && campaign?.parallelStory?.enabled ? {
      enabled:true, mode:room.parallel.mode || 'split-party', clockStart:room.parallel.clockStart, clockTick:Number(room.parallel.clockTick||0), clockLimit:Number(room.parallel.clockLimit||30),
      worldFlags:{...(room.parallel.worldFlags||{})}, worldSummary:parallelWorldSummary(room), links:{...(room.parallel.links||{})}, offers:{...(room.parallel.offers||{})},
      encounters:Object.fromEntries(Object.entries(room.parallel.encounters||{}).map(([loc,e])=>[loc,{...e}])),
      playerStates:Object.fromEntries((room.players||[]).map(member=>{ const ps=room.parallel.playerStates?.[member.id]||{}; return [member.id,{...ps,history:(ps.history||[]).slice(-6),scene:parallelRenderedScene(room,campaign,member)}]; })),
      incidentLog:(room.parallel.incidentLog||[]).slice(-12),
    } : null,
    revision: room.revision,
    chat: room.chat.slice(-120),
    prologue: room.prologue ? {
      ready: room.prologue.ready || {},
      scenes: room.prologue.scenes || {},
      meetingText: room.prologue.meetingText || '',
      readyCount: Object.values(room.prologue.ready || {}).filter(Boolean).length,
      totalPlayers: room.players.length,
    } : null,
  };
}

function sync(room) {
  room.lastActiveAt = Date.now();
  room.revision = Number(room.revision || 0) + 1;
  io.to(room.code).emit('state', publicRoom(room));
}

function pushChat(room, entry) {
  room.chat.push({ id: token(), ts: Date.now(), ...entry });
  if (room.chat.length > 180) room.chat.splice(0, room.chat.length - 180);
}

function emitRoll(room, roller, roll) {
  io.to(room.code).emit('dice:roll', {
    rollerId: roller.id,
    rollerName: roller.name,
    ts: Date.now(),
    startsAt: Date.now() + 650,
    ...roll,
  });
}

function getPlayer(room, playerToken) {
  return room.players.find(player => player.id === playerToken);
}

function requireMember(socket, payload, ack) {
  const roomCode = String(payload?.roomCode || '').toUpperCase().trim();
  const room = rooms.get(roomCode);
  const player = room && getPlayer(room, payload?.playerToken);
  if (!room || !player) {
    ack?.({ ok: false, error: '방 또는 플레이어 정보가 올바르지 않습니다.' });
    return {};
  }
  if (player.socketId !== socket.id || !player.connected) {
    ack?.({ ok: false, error: '현재 연결과 플레이어 토큰이 일치하지 않습니다.' });
    return {};
  }
  return { room, player };
}

function requireHost(socket, payload, ack) {
  const result = requireMember(socket, payload, ack);
  if (!result.room) return {};
  if (!result.player.host) {
    ack?.({ ok: false, error: '방장만 할 수 있습니다.' });
    return {};
  }
  return result;
}

function requirePhase(room, phase, ack, message = '현재 단계에서는 할 수 없습니다.') {
  if (room.phase !== phase) {
    ack?.({ ok: false, error: message });
    return false;
  }
  return true;
}

function rateLimit(socket, key, intervalMs) {
  socket.data.rate ||= new Map();
  const now = Date.now();
  const last = socket.data.rate.get(key) || 0;
  if (now - last < intervalMs) return false;
  socket.data.rate.set(key, now);
  return true;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function buildDeck(campaign) {
  // v3.6: 30 unique events, one copy each. Events are interruptions, not the main story.
  return shuffle(campaign.events.map(event => ({ ...event })));
}

function clearSceneState(room) {
  room.currentEvent = null;
  room.activeChoice = null;
  room.choiceVotes = {};
  room.lastResolution = null;
  room.voteEndsAt = null;
  room.monster = null;
  room.pendingContinue = null;
}

function applyChoiceEffect(room, player, effect = {}) {
  switch (effect.type) {
    case 'threatDown': room.threat = Math.max(0, room.threat - (effect.amount || 1)); break;
    case 'threatUp': {
      const amount = effect.amount || 1;
      if (room.threatShield > 0) room.threatShield = Math.max(0, room.threatShield - 1);
      else room.threat = Math.min(MAX_THREAT, room.threat + amount);
      break;
    }
    case 'inspiration': player.inspiration = Math.min(3, player.inspiration + (effect.amount || 1)); break;
    case 'partyHeal':
      for (const member of room.players) member.hp = Math.min(member.maxHp, member.hp + (effect.amount || 1));
      break;
    case 'damage': {
      let amount = effect.amount || 1;
      const guard = Number(player.skillState?.guard || 0);
      if (guard > 0) { const blocked = Math.min(guard, amount); amount -= blocked; player.skillState.guard = guard - blocked; }
      player.hp = Math.max(0, player.hp - amount);
      break;
    }
    case 'dcUp': room.dcPenalty = Math.min(2, room.dcPenalty + (effect.amount || 1)); break;
    case 'dcReset': room.dcPenalty = 0; break;
    case 'loseInspiration': {
      const holder = room.players.find(member => member.inspiration > 0);
      if (holder) holder.inspiration -= 1;
      break;
    }
    default: break;
  }
}

const ACTION_PATTERNS = [
  { stat:'근력', label:'돌파/제압', words:['부수','밀어','들어','공격','제압','파괴','붙잡','걷어','당겨','힘으로'] },
  { stat:'민첩', label:'잠입/회피', words:['몰래','숨','피해','피하','잠입','재빨리','빠르게','기어','뛰어','훔쳐'] },
  { stat:'지능', label:'분석/해독', words:['분석','해킹','해독','연구','계산','조사','기록','코드','구조','원리'] },
  { stat:'지혜', label:'관찰/추적', words:['관찰','추적','살펴','감지','듣','흔적','냄새','기척','직감','찾아'] },
  { stat:'매력', label:'대화/설득', words:['설득','대화','협상','속여','위로','질문','말을','거래','명령','연기'] },
  { stat:'체력', label:'버티기/보호', words:['버티','견디','막아','보호','참아','지탱','몸으로','견뎌','감싸','유지'] },
];

function interpretFreeAction(declaration, player, beat, room) {
  const lower = declaration.toLowerCase();
  let picked = null;
  let score = -1;
  for (const pattern of ACTION_PATTERNS) {
    const hits = pattern.words.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0);
    if (hits > score) { score = hits; picked = pattern; }
  }
  if (!picked || score <= 0) picked = ACTION_PATTERNS.find(item => item.stat === player.job?.prime) || ACTION_PATTERNS[2];
  const importanceKey = sceneImportanceKey(beat);
  const rule = SCENE_IMPORTANCE[importanceKey];
  const threatPressure = room.threat >= 7 ? 1 : 0;
  const expertise = player.job?.prime === picked.stat ? 1 : 0;
  const naturalFit = rawAbility(player, picked.stat) >= 15 ? 1 : 0;
  const baseByImportance = importanceKey === 'pivotal' ? 11 : importanceKey === 'important' ? 9 : 8;
  const dc = Math.max(rule.dcMin, Math.min(rule.dcMax, baseByImportance + threatPressure - expertise - naturalFit));
  return { stat:picked.stat, mode:picked.label, dc, expertise, route:routeFromStat(picked.stat), importanceKey };
}

function actionNarrative({ success, declaration, player, beat, interpretation, margin }) {
  const objective = beat?.objective || '눈앞의 문제';
  const reveal = beat?.reveal || '';
  const role = beat?.roleHooks?.[player.job?.prime] || '';
  const route = interpretation?.route || routeFromStat(interpretation?.stat);
  const successTurn = route === 'careful'
    ? '흩어진 징후들이 하나의 방향을 가리키기 시작했다.'
    : route === 'bold' ? '머뭇거릴 틈을 주지 않은 행동이 상황의 균형을 깨뜨렸다.'
    : '상대의 표정과 침묵 사이에서 처음과는 다른 반응이 돌아왔다.';
  const failureTurn = route === 'careful'
    ? '단서는 있었지만 한 조각을 너무 늦게 읽었다.'
    : route === 'bold' ? '길은 열렸지만 그 대가로 주변의 위험까지 함께 깨어났다.'
    : '말은 닿았지만 상대가 숨기고 있던 경계심까지 건드리고 말았다.';
  if (success) {
    if (margin >= 5) return `“${declaration}.” ${player.name}이(가) 그렇게 움직이자 ${successTurn} ${role ? `${role} ` : ''}${objective}에 닿는 길이 예상보다 선명하게 열렸다.${reveal ? ` 그리고 그 끝에서 지금까지 설명되지 않던 사실 하나가 모습을 드러냈다. ${reveal}` : ''}`;
    return `“${declaration}.” ${player.name}의 선택은 무리 없이 현실이 되었다. ${successTurn} 당장 모든 문제가 풀린 것은 아니었지만, ${objective}를 향해 움직일 수 있는 새로운 틈이 생겼다.`;
  }
  if (margin <= -5) return `“${declaration}.” 시도는 끝까지 밀어붙였지만 ${failureTurn} 원하는 결과는 얻지 못했다. 대신 무엇이 이곳을 막고 있는지는 분명해졌다. ${beat?.stakes ? `${beat.stakes}라는 위험이 이제 눈앞의 현실이 되었다.` : '주변의 긴장이 한층 짙어졌다.'}`;
  return `“${declaration}.” ${player.name}이(가) 움직였지만 상황은 생각처럼 따라주지 않았다. ${failureTurn} 그래도 완전한 헛수고는 아니었다. 실패한 자리에는 다음에 이용할 수 있는 흔적과, 피해야 할 방식이 선명하게 남았다.`;
}

function skillRemaining(room, player) {
  return Math.max(0, Number(player.skillState?.readyAtTurn || 0) - Number(room.turnSerial || 0));
}

function advanceSkillClock(room, amount = 1) {
  const before = new Map(room.players.map(player => [player.id, skillRemaining(room, player)]));
  room.turnSerial = Number(room.turnSerial || 0) + amount;
  for (const player of room.players) {
    if (before.get(player.id) > 0 && skillRemaining(room, player) === 0) {
      pushChat(room, { type:'success', author:'SYSTEM', text:`${player.name} — ${player.job?.skillDef?.name || '직업 스킬'} 사용 가능!` });
      if (player.socketId) io.to(player.socketId).emit('skill:ready', { name: player.job?.skillDef?.name || '직업 스킬' });
    }
  }
}

function canUseSkillNow(room, player) {
  if (!player.job?.skillDef) return false;
  if (skillRemaining(room, player) > 0) return false;
  if (room.phase === 'combat') return room.monster?.turnPhase !== 'boss' && !room.monster?.acted?.includes(player.id) && player.hp > 0;
  if (room.phase === 'story') {
    if (room.currentEvent) return room.activeChoice?.playerId === player.id;
    return currentTurnPlayer(room)?.id === player.id;
  }
  return false;
}

function applyJobSkill(room, player) {
  const skill = player.job?.skillDef;
  if (!skill) return { ok:false, error:'이 직업에는 등록된 스킬이 없습니다.' };
  const alive = room.players.filter(member => member.hp > 0);
  const cleanseOne = member => {
    member.statuses ||= [];
    if (!member.statuses.length) return 0;
    member.statuses.shift();
    return 1;
  };
  const guardOne = (member, amount) => {
    member.skillState ||= { readyAtTurn:0, guard:0, checkBonus:0, attackBonus:0, damageBonus:0 };
    member.skillState.guard = Math.max(Number(member.skillState.guard || 0), Number(amount || 0));
  };
  let summary = skill.text;
  switch (skill.kind) {
    case 'guard':
      guardOne(player, Number(skill.amount || 4));
      break;
    case 'guardParty':
      for (const member of alive) guardOne(member, Number(skill.amount || 2));
      break;
    case 'nearbyGuard': {
      const loc=parallelPlayerState(room,player)?.location;
      const targets=parallelEnabled(room)?alive.filter(member=>parallelPlayerState(room,member)?.location===loc):alive;
      for(const member of targets) guardOne(member,Number(skill.amount||2));
      summary=`같은 장소 ${targets.length}명에게 피해 ${Number(skill.amount||2)} 보호`;
      break;
    }
    case 'focus':
      player.skillState.checkBonus = Math.max(Number(player.skillState.checkBonus || 0), Number(skill.amount || 4));
      break;
    case 'insight':
      room.threat = Math.max(0, room.threat - Number(skill.amount || 1));
      player.inspiration = Math.min(3, Number(player.inspiration || 0) + 1);
      break;
    case 'dcDown':
      room.nextCheckDcReduction = Math.max(Number(room.nextCheckDcReduction || 0), Number(skill.amount || 2));
      break;
    case 'heal': {
      const targets = alive.slice().sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp));
      const target = targets[0] || player;
      const heal = rand(4) + Math.max(1, Number(skill.amount || 4) - 2);
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + heal);
      summary = `${target.name} HP ${target.hp-before} 회복`;
      break;
    }
    case 'healParty': {
      const amount = Number(skill.amount || 2);
      let healed = 0;
      for (const member of alive) { const before=member.hp; member.hp=Math.min(member.maxHp,member.hp+amount); healed += member.hp-before; }
      if (skill.name === '대지의 숨') room.threat = Math.max(0, room.threat - 1);
      summary = `파티 전체 총 ${healed} HP 회복${skill.name === '대지의 숨' ? ' · 위협 -1' : ''}`;
      break;
    }
    case 'healLowestCleanse': {
      const target = alive.slice().sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0] || player;
      const heal = rand(4) + Math.max(1, Number(skill.amount || 5) - 2);
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + heal);
      const cleansed = cleanseOne(target);
      summary = `${target.name} HP ${target.hp-before} 회복${cleansed ? ' · 상태이상 1개 제거' : ''}`;
      break;
    }
    case 'healCleanseParty': {
      const amount = Number(skill.amount || 2);
      let healed=0, cleansed=0;
      for (const member of alive) { const before=member.hp; member.hp=Math.min(member.maxHp,member.hp+amount); healed += member.hp-before; cleansed += cleanseOne(member); }
      summary = `파티 전체 총 ${healed} HP 회복 · 상태이상 ${cleansed}개 정화`;
      break;
    }
    case 'nearbyHealCleanse': {
      const amount=Number(skill.amount||2); const loc=parallelPlayerState(room,player)?.location;
      const targets=parallelEnabled(room)?alive.filter(member=>parallelPlayerState(room,member)?.location===loc):alive;
      let healed=0,cleansed=0; for(const member of targets){const before=member.hp;member.hp=Math.min(member.maxHp,member.hp+amount);healed+=member.hp-before;cleansed+=cleanseOne(member);}
      summary=`같은 장소 총 ${healed} HP 회복 · 상태이상 ${cleansed}개 정화`;
      break;
    }
    case 'cleanseParty': {
      let cleansed=0;
      for (const member of alive) cleansed += cleanseOne(member);
      room.threat = Math.max(0, room.threat - 1);
      if (skill.name === '꿈결 정화') player.inspiration = Math.min(3, Number(player.inspiration || 0)+1);
      summary = `상태이상 ${cleansed}개 제거 · 위협 -1${skill.name === '꿈결 정화' ? ' · 영감 +1' : ''}`;
      break;
    }
    case 'repairParty': {
      const amount=Number(skill.amount || 2); let healed=0;
      for (const member of alive) { const before=member.hp; member.hp=Math.min(member.maxHp,member.hp+amount); healed += member.hp-before; guardOne(member,1); }
      summary = `파티 전체 총 ${healed} HP 회복 · 피해 1 보호막`;
      break;
    }
    case 'attackBoost':
      if (room.phase === 'combat') {
        player.skillState.attackBonus = Math.max(Number(player.skillState.attackBonus || 0), Number(skill.amount || 2));
        player.skillState.damageBonus = Math.max(Number(player.skillState.damageBonus || 0), Number(skill.amount || 2));
      } else guardOne(player, Number(skill.amount || 3));
      break;
    case 'partyAttackBoost':
      for (const member of alive) {
        member.skillState.attackBonus = Math.max(Number(member.skillState.attackBonus || 0), Number(skill.amount || 2));
        member.skillState.damageBonus = Math.max(Number(member.skillState.damageBonus || 0), Number(skill.amount || 2));
      }
      break;
    case 'threatShield':
      room.threatShield = Math.max(Number(room.threatShield || 0), 1);
      player.inspiration = Math.min(3, Number(player.inspiration || 0)+1);
      break;
    case 'expose':
      if (room.phase === 'combat' && room.monster) room.monster.ac = Math.max(8, room.monster.ac - Number(skill.amount || 2));
      else room.threat = Math.max(0, room.threat - Number(skill.amount || 2));
      break;
    case 'pacify':
      if (room.phase === 'combat' && room.monster) room.monster.skipNextBoss = true;
      else room.threat = Math.max(0, room.threat - 2);
      break;
    case 'jam':
      if (room.phase === 'combat' && room.monster) room.monster.skipNextBoss = true;
      else room.threatShield = Math.max(Number(room.threatShield || 0), 1);
      break;
    case 'blast':
    case 'markShot': {
      if (room.phase === 'combat' && room.monster) {
        const damage = rand(6) + Number(skill.amount || 3);
        room.monster.hp = Math.max(0, room.monster.hp - damage);
        summary = `${room.monster.name}에게 ${damage} 직접 피해`;
      } else {
        room.threat = Math.max(0, room.threat - (skill.kind === 'blast' ? 2 : 1));
        if (skill.kind === 'blast') guardOne(player, Number(skill.amount || 0));
      }
      break;
    }
    case 'inspiration':
      player.inspiration = Math.min(3, player.inspiration + Number(skill.amount || 2));
      break;
    case 'inspirationParty':
      for (const member of alive) member.inspiration = Math.min(3, Number(member.inspiration || 0) + Number(skill.amount || 1));
      if (skill.name === '예정된 순간') room.threat = Math.max(0, room.threat - 1);
      break;
    case 'nearbyInspiration': {
      const loc=parallelPlayerState(room,player)?.location; const targets=parallelEnabled(room)?alive.filter(member=>parallelPlayerState(room,member)?.location===loc):alive;
      for(const member of targets) member.inspiration=Math.min(3,Number(member.inspiration||0)+Number(skill.amount||1));
      room.threat=Math.max(0,room.threat-1); summary=`같은 장소 ${targets.length}명 영감 +${Number(skill.amount||1)} · 위협 -1`;
      break;
    }
    case 'cooldownParty':
      for (const member of alive) if (member.id !== player.id) member.skillState.readyAtTurn = Math.max(Number(room.turnSerial || 0), Number(member.skillState?.readyAtTurn || 0) - Number(skill.amount || 1));
      break;
    case 'cooldownSelf':
      player.inspiration = Math.min(3, Number(player.inspiration || 0) + 1);
      break;
    default:
      return { ok:false, error:'스킬 효과가 정의되지 않았습니다.' };
  }
  const cooldown = Number(skill.cooldown || 3);
  player.skillState.readyAtTurn = Number(room.turnSerial || 0) + cooldown + 1;
  if (skill.kind === 'cooldownSelf') player.skillState.readyAtTurn = Math.max(Number(room.turnSerial || 0)+1, player.skillState.readyAtTurn - Number(skill.amount || 2));
  return { ok:true, cooldown:Math.max(0, player.skillState.readyAtTurn - Number(room.turnSerial || 0)), summary };
}

function evaluateEnding(room) {
  if (room.phase === 'ending') return true;
  const living = room.players.some(player => player.hp > 0);
  if (!living || room.threat >= MAX_THREAT) {
    room.phase = 'ending';
    room.ending = !living ? tragicEnding(room) : {
      victory:false,
      title:'세계가 파티보다 먼저 무너졌다.',
      text:`위협 수치가 한계를 넘었다. 전투에서 진 것이 아니라, 지금까지 쌓인 소음·불신·부상·실패가 한꺼번에 돌아온 결말이다. 마지막까지 살아 있던 ${room.players.filter(p=>p.hp>0).map(p=>p.name).join(', ') || '사람들'}도 더 이상 사건을 통제할 수 없었다.`
    };
    clearSceneState(room);
    return true;
  }
  if (room.storyComplete) {
    room.phase = 'ending';
    room.ending = buildVictoryEnding(room);
    clearSceneState(room);
    return true;
  }
  return false;
}

function promoteHostIfNeeded(room) {
  const host = room.players.find(player => player.host);
  if (host?.connected) return;
  const next = room.players.find(player => player.connected);
  if (!next) return;
  for (const player of room.players) player.host = false;
  next.host = true;
  pushChat(room, { type: 'system', text: `${next.name} 님이 새 방장이 되었습니다.` });
}

const BOSS_INTRO_LINES = {
  ember: {
    '불멸왕 아르켄':'“왕관을 찾으러 왔느냐. 좋다. 네 이름부터 재로 만들어 주마.”',
    '왕관의 망령':'“죽은 왕의 이름을 입에 올린 대가를 치러라.”',
  },
  neon: {
    'MOTHER-9':'“접속자를 확인했습니다. 당신의 기억은 이제 도시의 자산입니다.”',
    '합성인간 추적자':'“도주 경로 예측 완료. 생존 확률을 재계산합니다.”',
  },
  abyss: {
    '탈라스':'“너희는 너무 깊이 내려왔다. 이제 바다는 너희를 기억한다.”',
    '압력 유령':'“문을 열었구나. 그럼 이제 안쪽에서 잠겨라.”',
  },
  clock: {
    '열세 번째 종지기':'“열두 번은 실수였다. 열세 번째에는 너희를 남기지 않겠다.”',
    '거울 속 미래인':'“나는 네가 여기서 무엇을 선택할지 이미 후회했다.”',
  },
  wild: {
    '별먹는 신수 오르바':'“별은 하늘의 것이 아니다. 오늘부터 너희의 기억도 숲의 것이다.”',
    '꿈먹는 올빼미':'“눈을 감아라. 깨어 있는 동안보다 덜 아플 테니.”',
  },
  guardian: {
    '수호자의 첫 시험':'“검을 들었다면 증명해. 네가 누구를 지키려는지.”',
    '최후의 침략자 지휘관':'“십 년을 버틴 세계다. 네가 돌아왔다고 역사가 바뀔 것 같나?”',
    '차원 파괴자':'“돌아갈 세계와 남을 세계, 둘 다 가질 수는 없다.”',
  },
  echo: {
    '종착 없는 차장':'“운행 종료 이후 승객은 어느 시간표에도 등록될 수 없습니다.”',
    '무인 점검열차':'“비상 선로 점유 확인. 통행을 중지하십시오.”',
  },
  guardian1: {
    '수호자의 첫 시험':'“검을 들었다면 증명해. 네가 누구를 지키려는지.”',
    '침략자 지휘관':'“캔터베리의 마지막 희망이라더니, 겨우 이 정도인가.”',
  },
  guardian2: {
    '얼어붙은 챔피언 시험':'“앞으로 가려면 힘이 아니라 이유를 보여라.”',
    '설산의 수호자':'“산은 거짓말을 기억한다. 네 발자국도 마찬가지다.”',
  },
  guardian3: {
    '최후의 침략자 지휘관':'“십 년을 버틴 세계다. 네가 돌아왔다고 역사가 바뀔 것 같나?”',
    '차원 파괴자':'“돌아갈 세계와 남을 세계, 둘 다 가질 수는 없다.”',
  },
};
const REGULAR_ENCOUNTER_LINES = {
  ember:['“멈춰. 한 발만 더 오면 검부터 묻는다.”','“왕관 이야기를 들었다면 여기서 돌아가.”'],
  neon:['“신원 불일치. 손을 보이는 곳에 두십시오.”','“도망칠 생각이면 지금 해. 추적은 이미 시작됐으니까.”'],
  abyss:['“소리를 내지 마. 저 아래에서 듣고 있어.”','“살아 있는 사람이 맞나? 확인부터 하겠다.”'],
  clock:['“이번 반복에서는 네가 먼저 왔군.”','“시간을 훔친 값은 몸으로 갚아.”'],
  wild:['“숲이 너희를 들였다 해서 우리도 허락한 건 아니다.”','“발을 멈춰. 다음 발자국은 사냥의 시작이다.”'],
  guardian:['“공주와 함께 온 자라면 이름보다 먼저 목적을 밝혀.”','“여기까지 온 길이 길었다고 다음 문이 열리는 건 아니다.”'],
  echo:['“막차는 끝났습니다. 이 승강장에는 오시면 안 됩니다.”','“승객 수가 맞지 않습니다. 한 명이 더 있습니다.”'],
  guardian1:['“짐을 내려놓고 돌아가. 오늘은 경고로 끝내 주지.”','“공주를 찾는 자라면 더더욱 지나갈 수 없다.”'],
  guardian2:['“여긴 힘없는 자가 지나가는 길이 아니다.”','“한 번 물러서면 쫓지 않겠다. 두 번 말하게 하지 마.”'],
  guardian3:['“저항군인가? 그렇다면 이야기는 짧겠군.”','“신분증은 됐다. 살아남을 자격부터 보여.”'],
};
function encounterIntro(room, name, { isBoss = false } = {}) {
  const bossLine = BOSS_INTRO_LINES[room.campaignId]?.[name];
  if (isBoss && bossLine) return bossLine;
  if (isBoss) return `“여기까지 온 건 인정하지. 하지만 ${name}을(를) 넘어갈 수 있을지는 다른 이야기다.”`;
  const pool = REGULAR_ENCOUNTER_LINES[room.campaignId] || ['“거기서 멈춰.”'];
  let hash = 0;
  for (const ch of String(name)) hash = (hash + ch.charCodeAt(0)) % 997;
  return pool[hash % pool.length];
}
function decorateEncounter(room, monster, { isBoss = false } = {}) {
  monster.isBoss = Boolean(isBoss);
  monster.encounterId = crypto.randomUUID();
  monster.introLine = encounterIntro(room, monster.name, { isBoss:monster.isBoss });
  monster.introLabel = monster.isBoss ? 'BOSS ENCOUNTER' : 'ENCOUNTER';
  return monster;
}

function monsterForStoryChoice(room, beat, choice) {
  const campaign=CAMPAIGNS.find(c=>c.id===room.campaignId);
  const generic={
    ember:['성채 경비병','재에 미친 망령','왕묘 약탈자'], neon:['추적 드론','갱단 집행자','보안 요원'], abyss:['광기에 잠식된 승무원','심해 포식자','고장 난 경비 기계'], clock:['시간 밀수꾼','역행 경비병','루프 망령'], wild:['오염된 야수','부족 전사','별가루 포식자'], echo:['전광판 아래의 검은 승객','빈 열차의 차장','무인 점검열차의 검은 형체'], guardian:['침략자 병사','던전 몬스터','제국 집행병','미래의 전투 기계'], guardian1:['고블린 전사','침략자 병사','사막 용병'], guardian2:['무투가','던전 몬스터','설산 추적자'], guardian3:['제국 집행병','침략자 병사','미래의 전투 기계']
  };
  const pool=generic[room.campaignId]||campaign?.monsters||['적대자'];
  const name=pool[(Number(beat?.chapter||1)+Number(room.story||0))%pool.length];
  const scale=Math.max(0,room.players.length-1);
  const hp=6+Math.floor(Number(beat?.act||1)/2)*2+scale*2;
  return decorateEncounter(room, {name,ac:9+Math.min(2,Number(beat?.act||1)-1),hp,maxHp:hp,attackBonus:1+Math.floor(Number(beat?.act||1)/2),round:1,acted:[],turnPhase:'players',bossTurnStartedAt:null,source:'story-choice'}, { isBoss:false });
}

function monsterForEvent(room, event) {
  const campaign = CAMPAIGNS.find(c => c.id === room.campaignId);
  const index = Math.max(0, campaign.monsters.indexOf(event.monster));
  const scale = Math.max(0, room.players.length - 2);
  const isBoss = Boolean(event?.boss) || index === campaign.monsters.length - 1 || /최후|보스|왕|종지기|오르바|탈라스|MOTHER-9|수호 시험|지휘관/.test(String(event?.monster || ''));
  const hp = (isBoss ? 14 : 8) + index * (isBoss ? 2 : 1) + scale * 2;
  return decorateEncounter(room, {
    name: event.monster,
    ac: Math.min(isBoss ? 13 : 11, 9 + Math.floor(index / 2)),
    hp,
    maxHp: hp,
    attackBonus: 1 + Math.floor(index / 2),
    round: 1,
    acted: [],
    turnPhase: 'players',
    bossTurnStartedAt: null,
    source:'event',
  }, { isBoss });
}

function battleWeaponName(room, player) {
  const weaponId = player?.equipment?.weapon;
  const weapon = weaponId ? findCampaignItem(room.campaignId, weaponId) : null;
  return weapon?.name || '무기';
}

function chooseBattleLine(lines) {
  if (!Array.isArray(lines) || !lines.length) return '';
  return lines[crypto.randomInt(0, lines.length)];
}

function playerAttackNarration(room, player, monster, { stat, roll, total, hit, damage }) {
  const weapon = battleWeaponName(room, player);
  const ac = Number(monster?.ac || 10);
  const styles = {
    '근력': {
      try:[`${weapon}에 힘을 싣고 정면에서 방어를 무너뜨리려 했다`, `${monster.name}의 자세가 흔들리는 순간을 노려 강하게 밀고 들어갔다`, `한 번의 강한 타격으로 전열을 깨뜨리려 ${weapon}을 휘둘렀다`],
      hit:[`충격이 그대로 들어가 ${monster.name}의 방어가 벌어졌다`, `${monster.name}이 버티려 했지만 힘을 다 받아내지 못했다`, `공격이 정면으로 꽂히며 ${monster.name}이 뒤로 밀려났다`],
      miss:[`${monster.name}이 충돌 직전에 축을 틀어 힘의 방향을 흘려냈다`, `힘은 충분했지만 ${monster.name}이 한발 먼저 거리를 빼 타격점이 어긋났다`, `공격 궤적이 너무 크게 드러나 ${monster.name}이 미리 몸을 피했다`],
    },
    '민첩': {
      try:[`${monster.name}의 사각으로 미끄러지듯 파고들어 빠르게 ${weapon}을 찔러 넣으려 했다`, `발을 바꿔 디디며 ${monster.name}의 시선 밖에서 짧은 공격을 노렸다`, `공격이 끝나는 순간을 기다렸다가 빈틈으로 재빨리 파고들었다`],
      hit:[`${monster.name}이 몸을 돌리기 전에 공격이 먼저 닿았다`, `짧은 빈틈을 놓치지 않아 정확히 상처를 냈다`, `회피 동작보다 반 박자 빠르게 공격이 들어갔다`],
      miss:[`${monster.name}이 예상보다 빠르게 몸을 틀어 궤적을 흘려냈다`, `발을 옮기는 순간 바닥이 미끄러져 공격 각도가 조금 벗어났다`, `${monster.name}이 사각을 내주지 않고 곧바로 거리를 다시 벌렸다`],
    },
    '지능': {
      try:[`${monster.name}의 반복 동작과 관절 방향을 읽고 약점으로 보이는 지점을 노렸다`, `방금 전 공격 패턴에서 생긴 빈틈을 계산해 ${weapon}의 궤적을 맞췄다`, `${monster.name}의 방어가 늦어지는 순간을 계산해 정확한 한 점을 겨냥했다`],
      hit:[`계산한 타이밍이 맞아떨어져 방어가 닫히기 전에 공격이 들어갔다`, `예측한 약점이 실제로 드러나며 공격이 제대로 먹혔다`, `${monster.name}의 반복 패턴을 역이용해 유효타를 만들었다`],
      miss:[`${monster.name}이 직전과 다른 패턴으로 움직여 계산한 타이밍이 어긋났다`, `약점이라고 본 부분이 순간적으로 가려지며 공격이 빗나갔다`, `분석은 맞았지만 실행 직전에 ${monster.name}이 자세를 바꿨다`],
    },
    '지혜': {
      try:[`성급히 들어가지 않고 ${monster.name}의 호흡과 시선을 읽다가 반격할 순간을 골랐다`, `${monster.name}이 다음에 움직일 방향을 읽고 그 길목에 공격을 맞추려 했다`, `위험한 움직임을 한 차례 흘려보낸 뒤 가장 안전한 반격 각도를 잡았다`],
      hit:[`기다린 순간이 정확했고 ${monster.name}이 대응하기 전에 반격이 들어갔다`, `움직임을 제대로 읽어 공격이 빈틈과 정확히 겹쳤다`, `${monster.name}의 의도를 먼저 읽은 덕분에 안정적으로 타격했다`],
      miss:[`${monster.name}이 마지막 순간 움직임을 끊어 예상한 반격 타이밍이 사라졌다`, `의도는 읽었지만 공격할 틈이 너무 짧아 ${weapon}이 닿지 못했다`, `한 번 더 기다렸지만 ${monster.name}이 거리를 내주지 않았다`],
    },
    '체력': {
      try:[`${monster.name}의 압박을 몸으로 버티며 거리를 좁힌 뒤 묵직한 반격을 시도했다`, `한 차례 공격을 견딜 각오로 정면에 남아 ${weapon}을 밀어 넣으려 했다`, `자세가 무너지지 않게 버티면서 가까운 거리에서 공격을 이어갔다`],
      hit:[`충격을 견딘 채 끝까지 밀어붙여 공격을 성공시켰다`, `${monster.name}이 밀어내려 했지만 자세를 지켜낸 쪽이 한 수 앞섰다`, `버티며 만든 가까운 거리에서 타격이 제대로 들어갔다`],
      miss:[`끝까지 버텼지만 ${monster.name}이 접촉 직전에 옆으로 빠져 공격이 허공을 갈랐다`, `거리는 좁혔지만 공격까지 이어갈 순간을 만들지 못했다`, `${monster.name}의 반발에 자세가 잠깐 흔들려 타격이 빗나갔다`],
    },
    '매력': {
      try:[`도발과 시선 유도로 ${monster.name}의 판단을 흔든 뒤 예상한 방향으로 공격을 유도했다`, `짧은 외침과 페인트로 ${monster.name}의 시선을 빼앗고 빈틈을 만들려 했다`, `${monster.name}이 반응할 행동을 일부러 보여준 뒤 반대쪽에서 공격을 노렸다`],
      hit:[`${monster.name}이 미끼에 반응한 순간 빈틈이 열려 공격이 들어갔다`, `시선을 빼앗는 데 성공해 방어가 늦었다`, `유도한 반응이 그대로 나와 준비한 공격을 적중시켰다`],
      miss:[`${monster.name}이 도발에 넘어오지 않아 준비한 공격 각도가 열리지 않았다`, `시선을 흔드는 데는 성공했지만 ${monster.name}이 거리를 지켜 타격까지 이어지지 않았다`, `예상과 달리 ${monster.name}이 반응하지 않아 공격 타이밍을 놓쳤다`],
    },
  };
  const style = styles[stat] || styles['근력'];
  if (roll === 1) return `${chooseBattleLine(style.try)}. 하지만 시작 동작부터 완전히 읽혔다. ${monster.name}이 공격선을 선점하면서 시도는 무너졌다. 자연 1 · 판정 ${total} / AC ${ac}.`;
  if (roll === 20) return `${chooseBattleLine(style.try)}. ${chooseBattleLine(style.hit)} 급소까지 이어진 완벽한 공격으로 ${damage} 피해를 입혔다. 자연 20 · 판정 ${total} / AC ${ac}.`;
  if (hit) return `${chooseBattleLine(style.try)}. ${chooseBattleLine(style.hit)} ${damage} 피해. 판정 ${total} / AC ${ac}.`;
  return `${chooseBattleLine(style.try)}. 하지만 ${chooseBattleLine(style.miss)} 피해를 주지 못했다. 판정 ${total} / AC ${ac}.`;
}

function monsterAttackNarration(room, monster, target, { roll, total, armor, hit, rawDamage, blocked, damage }) {
  const approaches = [
    `${monster.name}이 ${target.name}의 정면을 압박하다가 갑자기 거리를 좁혀 공격했다`,
    `${monster.name}이 한 차례 페인트를 넣은 뒤 ${target.name}이 반응한 쪽의 반대편을 노렸다`,
    `${monster.name}이 주변 지형을 타고 움직이며 ${target.name}의 방어가 얇은 방향으로 파고들었다`,
    `${monster.name}이 망설이지 않고 ${target.name}에게 연속 동작으로 달려들었다`,
  ];
  if (roll === 1) return `${chooseBattleLine(approaches)}. 하지만 공격 자세가 크게 무너지며 ${target.name}에게 닿지도 못했다. 자연 1 · 판정 ${total} / 방어 ${armor}.`;
  if (!hit) return `${chooseBattleLine(approaches)}. ${target.name}이 공격 방향을 읽고 몸을 빼면서 타격을 피했다. 판정 ${total} / 방어 ${armor}.`;
  if (blocked > 0 && damage <= 0) return `${chooseBattleLine(approaches)}. 공격 자체는 닿았지만 ${target.name}의 방어 태세가 ${rawDamage} 피해를 전부 받아냈다. 판정 ${total} / 방어 ${armor}.`;
  if (blocked > 0) return `${chooseBattleLine(approaches)}. 타격은 들어왔지만 ${target.name}이 방어 태세로 ${blocked}만큼 막아내 최종 ${damage} 피해만 입었다. 판정 ${total} / 방어 ${armor}.`;
  if (roll === 20) return `${chooseBattleLine(approaches)}. ${target.name}의 대응보다 한발 빨랐고 강한 타격으로 ${damage} 피해를 입혔다. 자연 20 · 판정 ${total} / 방어 ${armor}.`;
  return `${chooseBattleLine(approaches)}. ${target.name}이 완전히 피하지 못해 ${damage} 피해를 입었다. 판정 ${total} / 방어 ${armor}.`;
}

function clearBossTurnTimer(roomCode) {
  const timer = bossTurnTimers.get(roomCode);
  if (timer) clearTimeout(timer);
  bossTurnTimers.delete(roomCode);
}

function monsterTurn(room) {
  clearBossTurnTimer(room.code);
  const living = room.players.filter(player => player.hp > 0 && player.connected);
  if (!room.monster || !living.length) return;
  if (room.monster.skipNextBoss) {
    room.monster.skipNextBoss = false;
    pushChat(room, { type:'success', author:'GM', text:`${room.monster.name}의 공격이 직업 스킬 효과로 무효화되었습니다.` });
    room.monster.acted = [];
    room.monster.round += 1;
    room.monster.turnPhase = 'players';
    room.monster.bossTurnStartedAt = null;
    advanceSkillClock(room, 1);
    pushChat(room, { type:'system', text:`ROUND ${room.monster.round} · PLAYER TURN이 시작됩니다.` });
    return;
  }
  const target = living[crypto.randomInt(0, living.length)];
  const roll = rand(20);
  const armor = Number(derivedAbilityImpact(target).defense || 10) + equipmentStatBonus(room, target, '민첩');
  const total = roll + room.monster.attackBonus;
  const hit = roll === 20 || (roll !== 1 && total >= armor);
  let damage = hit ? rand(4) + 1 : 0;
  const rawDamage = damage;
  const guard = Number(target.skillState?.guard || 0);
  let blocked = 0;
  if (hit && guard > 0) { blocked = Math.min(guard, damage); damage -= blocked; target.skillState.guard = guard - blocked; }
  if (hit) target.hp = Math.max(0, target.hp - damage);
  emitRoll(room, { id: 'gm-monster', name: room.monster.name }, {
    sides: 20,
    result: roll,
    purpose: `${target.name} 공격 · 방어 ${armor}`,
    kind: 'monster',
    total,
    dc: armor,
    success: hit,
    damage,
  });
  pushChat(room, {
    type: hit ? 'danger' : 'success',
    author: 'GM',
    text: monsterAttackNarration(room, room.monster, target, { roll, total, armor, hit, rawDamage, blocked, damage }),
  });
  room.monster.acted = [];
  room.monster.round += 1;
  room.monster.turnPhase = 'players';
  room.monster.bossTurnStartedAt = null;
  advanceSkillClock(room, 1);
  pushChat(room, { type: 'system', text: `ROUND ${room.monster.round} · PLAYER TURN이 시작됩니다.` });
}

function scheduleMonsterTurn(room, delayMs = 1500) {
  if (room.phase !== 'combat' || !room.monster) return;
  if (room.monster.turnPhase === 'boss' && bossTurnTimers.has(room.code)) return;
  room.monster.turnPhase = 'boss';
  room.monster.bossTurnStartedAt = Date.now();
  pushChat(room, { type: 'danger', author: 'GM', text: `ENEMY TURN · ${room.monster.name}: ${room.monster.isBoss ? '“이번에는 내가 움직인다.”' : '“비켜. 이제 내 차례다.”'}` });
  sync(room);
  clearBossTurnTimer(room.code);
  const timer = setTimeout(() => {
    bossTurnTimers.delete(room.code);
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.phase !== 'combat' || !liveRoom.monster || liveRoom.monster.turnPhase !== 'boss') return;
    monsterTurn(liveRoom);
    evaluateEnding(liveRoom);
    sync(liveRoom);
  }, Math.max(300, delayMs));
  bossTurnTimers.set(room.code, timer);
}

function reconcileCombatRound(room) {
  if (room.phase !== 'combat' || !room.monster) return;
  room.monster.turnPhase ||= 'players';
  const eligible = room.players.filter(player => player.connected && player.hp > 0).map(player => player.id);
  room.monster.acted = (room.monster.acted || []).filter(id => eligible.includes(id));
  if (room.monster.turnPhase === 'boss') {
    scheduleMonsterTurn(room, 900);
    return;
  }
  if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room);
}

function clearVoteTimer(roomCode) {
  const timer = voteTimers.get(roomCode);
  if (timer) clearTimeout(timer);
  voteTimers.delete(roomCode);
}

function eligibleChoiceIndices(room, player = null) {
  if (!room.currentEvent) return [];
  return room.currentEvent.choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => !choice.requiredJob || (player ? player.job?.name === choice.requiredJob : room.players.some(p => p.connected && p.hp > 0 && p.job?.name === choice.requiredJob)))
    .map(({ index }) => index);
}

function allEligiblePlayersVoted(room) {
  if (!room.currentEvent || room.activeChoice) return false;
  const eligible = storyEligiblePlayers(room);
  if (!eligible.length) return false;
  return eligible.every(player => {
    const voted = Number(room.choiceVotes?.[player.id]);
    const choice = room.currentEvent.choices?.[voted];
    if (!Number.isInteger(voted) || !choice) return false;
    return !choice.requiredJob || player.job?.name === choice.requiredJob;
  });
}

function beginAllVotedCountdown(room) {
  if (!allEligiblePlayersVoted(room)) return false;
  const target = Date.now() + ALL_VOTED_COUNTDOWN_MS;
  // Do not repeatedly extend an already-running all-voted countdown.
  if (room.voteAllVotedCountdown && Number(room.voteEndsAt || 0) <= target + 250) return false;
  room.voteAllVotedCountdown = true;
  room.voteEndsAt = target;
  pushChat(room, { type:'system', text:'전원이 투표를 완료했습니다. 3초 뒤 선택을 확정합니다.' });
  armVoteTimer(room);
  return true;
}

function finalizeChoiceSelection(room) {
  if (!room.currentEvent || room.activeChoice) return false;
  clearVoteTimer(room.code);
  const eligible = storyEligiblePlayers(room);
  if (!eligible.length) return false;
  const counts = new Map();
  for (const player of eligible) {
    const voted = Number(room.choiceVotes?.[player.id]);
    const choice = room.currentEvent.choices[voted];
    if (!Number.isInteger(voted) || !choice) continue;
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) continue;
    counts.set(voted, (counts.get(voted) || 0) + 1);
  }

  let choiceIndex;
  let highest = 0;
  const turnActor = currentTurnPlayer(room) || eligible[0];
  if (counts.size) {
    highest = Math.max(...counts.values());
    const tied = [...counts.entries()].filter(([, count]) => count === highest).map(([index]) => index);
    const actorVote = Number(room.choiceVotes?.[turnActor.id]);
    if (tied.includes(actorVote)) choiceIndex = actorVote;
    else choiceIndex = tied[crypto.randomInt(0, tied.length)];
  } else {
    const fallback = eligibleChoiceIndices(room, turnActor);
    const pool = fallback.length ? fallback : eligibleChoiceIndices(room);
    if (!pool.length) return false;
    choiceIndex = pool[crypto.randomInt(0, pool.length)];
  }

  const choice = room.currentEvent.choices[choiceIndex];
  let actor = turnActor;
  if (choice.requiredJob) {
    actor = eligible.find(player => player.job?.name === choice.requiredJob && Number(room.choiceVotes?.[player.id]) === choiceIndex)
      || eligible.find(player => player.job?.name === choice.requiredJob);
    if (!actor) return false;
  }
  room.activeChoice = {
    playerId: actor.id,
    playerName: actor.name,
    choiceIndex,
    choice,
    voteCount: highest,
  };
  room.voteEndsAt = null;
  room.voteAllVotedCountdown = false;
  pushChat(room, {
    type: 'action',
    author: 'TABLE',
    text: choice.requiredJob
      ? `투표 종료 · 직업 전용 「${choice.label}」 확정 · ${choice.requiredJob} ${actor.name}이(가) 판정합니다.`
      : `투표 종료 · 「${choice.label}」 확정 · ${actor.name}이(가) 판정합니다.`,
  });
  return true;
}

function armVoteTimer(room) {
  clearVoteTimer(room.code);
  if (!room.currentEvent || room.activeChoice || !room.voteEndsAt) return;
  const remaining = Number(room.voteEndsAt) - Date.now();
  if (remaining <= 0) {
    if (finalizeChoiceSelection(room)) sync(room);
    return;
  }
  const timer = setTimeout(() => {
    voteTimers.delete(room.code);
    if (!rooms.has(room.code) || room.activeChoice || !room.currentEvent) return;
    if (finalizeChoiceSelection(room)) sync(room);
  }, remaining);
  timer.unref?.();
  voteTimers.set(room.code, timer);
}

function facilityPoolForAct(act) {
  if (act <= 1) return ['restaurant','quest'];
  if (act === 2) return ['inn','shop','quest'];
  if (act === 3) return ['shop','quest','gamble'];
  if (act === 4) return ['inn','shop','quest'];
  return ['shop','restaurant','quest'];
}
function maybeAttachFacility(room, event) {
  if (!event?.facilityEligible || event.monster) return event;
  room.facilityEncounterCount = Number(room.facilityEncounterCount || 0);
  room.lastFacilityEventSerial = Number(room.lastFacilityEventSerial || -99);
  if (room.facilityEncounterCount >= 4 || Number(room.turnSerial || 0) - room.lastFacilityEventSerial < 2) return event;
  // About one in three eligible side events becomes a natural rest/shop/commission interlude.
  if (crypto.randomInt(0, 100) >= 34) return event;
  const pool = facilityPoolForAct(Number(event.act || 1));
  const type = pool[crypto.randomInt(0, pool.length)];
  const base = ECONOMY_FACILITY_TEMPLATES[type] || {type};
  const theme = ECONOMY_FACILITY_THEMES[room.campaignId]?.[type] || {};
  const facility = {...base, ...theme};
  if (type === 'shop') {
    const catalog = campaignItemCatalog(room.campaignId).filter(item => !room.players.every(p => (p.inventory || []).includes(item.id)));
    const shuffled = [...catalog];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = crypto.randomInt(0, i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    facility.stock = shuffled.slice(0, Math.min(3, shuffled.length)).map(item => item.id);
  }
  event.facility = facility;
  room.facilityEncounterCount += 1;
  room.lastFacilityEventSerial = Number(room.turnSerial || 0);
  return event;
}

function prepareAgencyEvent(event) {
  if (!event) return event;
  const important = Boolean(event.monster || Number(event.act || 1) >= 4 || /위기|습격|붕괴|결투|구조|심판/.test(String(event.title || '')));
  const rule = important ? SCENE_IMPORTANCE.important : SCENE_IMPORTANCE.ordinary;
  event.importance = { key:important ? 'important' : 'ordinary', label:important ? '중요 사건' : '일반 사건', consequence:rule.consequence };
  event.choices = (event.choices || []).map(choice => {
    const dc = Math.max(rule.dcMin, Math.min(rule.dcMax, Number(choice.dc || 10)));
    return { ...choice, dc, difficulty:difficultyLabel(dc), consequenceHint:choiceConsequenceHint(choice, important ? 'important' : 'ordinary') };
  });
  return event;
}

function drawEventForRoom(room) {
  if (room.currentEvent || !room.deck.length) return false;
  const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
  const currentMainBeat = storyNodeById(campaign, room.storyNodeId);
  const desiredAct = Math.min(Math.max(1, Number(campaign?.acts?.length || 5)), Math.max(1, Number(currentMainBeat?.act || 1)));
  const candidates = room.deck.map((event, index) => ({ event, index })).filter(item => item.event.act === desiredAct);
  const picked = candidates.length ? candidates[crypto.randomInt(0, candidates.length)] : { index: crypto.randomInt(0, room.deck.length) };
  room.currentEvent = prepareAgencyEvent(maybeAttachFacility(room, room.deck.splice(picked.index, 1)[0]));
  room.activeChoice = null;
  room.choiceVotes = {};
  room.voteAllVotedCountdown = false;
  room.lastResolution = null;
  const voteDuration = connectedPlayers(room).length <= 1 ? SOLO_VOTE_DURATION_MS : VOTE_DURATION_MS;
  room.voteEndsAt = Date.now() + voteDuration;
  room.mainTurnsSinceEvent = 0;
  void appendSessionEvent(room.code, 'event_drawn', { eventId: room.currentEvent.id, title: room.currentEvent.title });
  armVoteTimer(room);
  return true;
}

function isResumableRoom(room) {
  return Boolean(room?.campaignId && !['lobby','ending'].includes(room.phase) && !room.sessionClosed && !room.abandonVote);
}
function exactNamePlayer(room, name) {
  const exact = sanitize(name || '', 18);
  const matches = (room?.players || []).filter(player => player.name === exact);
  return matches.length === 1 ? matches[0] : null;
}
function armResumeBarrier(room) {
  if (!room || room.players.length <= 1) { room.resumeBarrier = false; return; }
  room.resumeBarrier = !room.players.every(player => player.connected);
  room.resumeRequiredIds = room.resumeBarrier ? room.players.map(player => player.id) : [];
}
function reconcileResumeBarrier(room) {
  if (!room?.resumeBarrier) return false;
  const required = new Set(room.resumeRequiredIds || room.players.map(player => player.id));
  const ready = room.players.filter(player => required.has(player.id)).every(player => player.connected);
  if (ready) {
    room.resumeBarrier = false;
    room.resumeRequiredIds = [];
    pushChat(room, { type:'system', text:'기존 참가자 전원이 돌아왔습니다. 연대기를 다시 진행할 수 있습니다.' });
    return true;
  }
  return false;
}
function resumeBlocked(){ return false; }
async function resumableCandidates(name) {
  const exact = sanitize(name || '', 18);
  if (!exact) return [];
  const map = new Map();
  for (const room of rooms.values()) {
    if (!isResumableRoom(room) || !exactNamePlayer(room, exact)) continue;
    map.set(room.code, { room, updatedAt: room.lastActiveAt || room.createdAt || Date.now() });
  }
  for (const row of await findResumableRoomSnapshotsByName(exact)) {
    if (map.has(row.room_code)) continue;
    map.set(row.room_code, { room: row.state, updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0 });
  }
  return [...map.entries()].map(([code, entry]) => {
    const room = entry.room;
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    return {
      roomCode: code,
      campaignTitle: campaign?.title || room.campaignId || '진행 중인 연대기',
      playerCount: (room.players || []).length,
      connectedCount: (room.players || []).filter(player => player.connected).length,
      progressLabel: room.phase === 'combat' ? '전투 진행 중' : `스토리 ${Number(room.story || 0)}장면 진행`,
      updatedAt: entry.updatedAt,
    };
  }).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,12);
}

function resetToLobby(room, reasonText = '세션이 로비로 돌아갔습니다.') {
  clearVoteTimer(room.code);
  room.phase = 'lobby';
  room.campaignId = null;
  room.deck = [];
  room.discard = [];
  room.threat = 0;
  room.story = 0;
  room.dcPenalty = 0;
  room.turnIndex = 0;
  room.mainTurnsSinceEvent = 0;
  room.pendingTurnAdvance = false;
  room.voteEndsAt = null;
  room.abandonVote = null;
  room.ending = null;
  clearSceneState(room);
  for (const player of room.players) blankPlayerRuntime(player);
  pushChat(room, { type: 'system', text: reasonText });
}

function allConnectedApproved(room) {
  const approvals = new Set(room.abandonVote?.approvals || []);
  return connectedPlayers(room).every(player => approvals.has(player.id));
}

function resolveAbandonVoteIfReady(room) {
  if (!room.abandonVote) return false;
  if (!allConnectedApproved(room)) return false;
  resetToLobby(room, '참가자 전원의 동의로 현재 연대기를 포기하고 로비로 돌아왔습니다.');
  return true;
}

io.on('connection', socket => {
  socket.emit('campaigns', campaignPublic());

  socket.on('session:lookup', (_payload, ack) => ack?.({ok:false,error:'이어하기 기능은 제거되었습니다.'}));
  socket.on('session:resume', (_payload, ack) => ack?.({ok:false,error:'이어하기 기능은 제거되었습니다.'}));

  socket.on('room:create', async (payload = {}, ack) => {
    try {
      const name = sanitize(payload.name || '방장', 18) || '방장';
      const { room, player } = await createRoom(name, socket.id);
      socket.join(room.code);
      pushChat(room, { type: 'system', text: `${name} 님이 방을 만들었습니다.` });
      void appendSessionEvent(room.code, 'room_created', { hostName: name });
      ack?.({ ok: true, roomCode: room.code, playerToken: player.id, state: publicRoom(room) });
    } catch (error) {
      console.error('[room:create]', error);
      ack?.({ ok: false, error: '방 생성 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.' });
    }
  });

  socket.on('room:join', async (payload = {}, ack) => {
    const roomCode = String(payload.roomCode || '').toUpperCase().trim();
    if (!ROOM_PATTERN.test(roomCode)) return ack?.({ ok: false, error: '5자리 방 코드를 확인하세요.' });
    const room = await getOrLoadRoom(roomCode);
    if (!room) return ack?.({ ok: false, error: '존재하지 않거나 만료된 방입니다.' });

    const existing = payload.playerToken && getPlayer(room, payload.playerToken);
    if (existing) {
      const oldSocketId = existing.socketId;
      if (oldSocketId && oldSocketId !== socket.id) io.sockets.sockets.get(oldSocketId)?.leave(room.code);
      existing.socketId = socket.id;
      existing.connected = true;
      socket.join(room.code);
      pushChat(room, { type: 'system', text: `${existing.name} 님이 다시 연결되었습니다.` });
      promoteHostIfNeeded(room);
      reconcileCombatRound(room);
      resolveAbandonVoteIfReady(room);
      sync(room);
      void appendSessionEvent(room.code, 'player_reconnected', { playerName: existing.name });
      return ack?.({ ok: true, roomCode: room.code, playerToken: existing.id, state: publicRoom(room) });
    }

    if (room.players.length >= MAX_PLAYERS) return ack?.({ ok: false, error: '이 방은 이미 4명입니다.' });
    if (room.phase !== 'lobby') return ack?.({ ok: false, error: '이미 모험이 시작된 방입니다. 기존 플레이어만 재접속할 수 있습니다.' });
    const name = sanitize(payload.name || `플레이어 ${room.players.length + 1}`, 18) || `플레이어 ${room.players.length + 1}`;
    const player = {
      id: token(), socketId: socket.id, name, host: room.players.length === 0, connected: true,
      ready: false, job: null, abilities: null, hp: 0, maxHp: 0, inspiration: 0, statuses: [], skillState: { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 }, coins: 1, inventory: [], equipment: { weapon:null, armor:null, charm:null, tool:null },
    };
    room.players.push(player);
    socket.join(room.code);
    pushChat(room, { type: 'system', text: `${name} 님이 참가했습니다.` });
    sync(room);
    void appendSessionEvent(room.code, 'player_joined', { playerName: name });
    return ack?.({ ok: true, roomCode: room.code, playerToken: player.id, state: publicRoom(room) });
  });

  socket.on('room:leave', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (room.phase !== 'lobby') return ack?.({ ok: false, error: '모험 시작 후에는 나가더라도 재접속 슬롯이 유지됩니다.' });
    room.players = room.players.filter(member => member.id !== player.id);
    socket.leave(room.code);
    if (!room.players.length) {
      rooms.delete(room.code);
      return ack?.({ ok: true });
    }
    pushChat(room, { type: 'system', text: `${player.name} 님이 방을 나갔습니다.` });
    promoteHostIfNeeded(room);
    currentTurnPlayer(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('room:removePlayer', (payload, ack) => {
    const { room, player } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '로비에서만 플레이어를 정리할 수 있습니다.')) return;
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target) return ack?.({ ok: false, error: '플레이어를 찾을 수 없습니다.' });
    if (target.id === player.id) return ack?.({ ok: false, error: '자신은 EXIT 버튼으로 나갈 수 있습니다.' });
    if (target.connected) return ack?.({ ok: false, error: '접속 중인 플레이어는 강제로 제거할 수 없습니다.' });
    room.players = room.players.filter(member => member.id !== target.id);
    pushChat(room, { type: 'system', text: `${target.name} 님의 오프라인 슬롯을 정리했습니다.` });
    currentTurnPlayer(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('campaign:select', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '로비에서만 캠페인을 바꿀 수 있습니다.')) return;
    const campaign = CAMPAIGNS.find(item => item.id === payload.campaignId);
    if (!campaign) return ack?.({ ok: false, error: '캠페인을 찾을 수 없습니다.' });
    room.campaignId = campaign.id;
    room.turnIndex = 0;
    room.abandonVote = null;
    room.choiceVotes = {};
    room.facilityUses = {};
    room.facilityEncounterCount = 0;
    room.lastFacilityEventSerial = -99;
    for (const player of room.players) blankPlayerRuntime(player);
    room.ending = null;
    pushChat(room, { type: 'system', text: `캠페인이 「${campaign.title}」로 선택되었습니다.` });
    sync(room);
    void appendSessionEvent(room.code, 'campaign_selected', { campaignId: campaign.id });
    ack?.({ ok: true });
  });

  socket.on('player:classRoll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '캐릭터 생성은 로비에서만 가능합니다.')) return;
    if (!room.campaignId) return ack?.({ ok: false, error: '캠페인을 먼저 선택하세요.' });
    if (player.job) return ack?.({ ok: false, error: '현재 캠페인에서는 이미 직업을 배정받았습니다.' });
    if (!rateLimit(socket, 'class', 800)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    let result = rand(6);
    if (campaign.parallelStory?.enabled) {
      const taken=new Set(room.players.filter(member=>member.id!==player.id && member.job).map(member=>member.job.name));
      for(let step=0;step<campaign.jobs.length;step+=1){const idx=((result-1+step)%campaign.jobs.length); if(!taken.has(campaign.jobs[idx].name)){result=idx+1;break;}}
    }
    player.job = campaign.jobs[result - 1];
    player.hp = player.maxHp = player.job.baseHp;
    player.abilities = null;
    player.skillState = { readyAtTurn: Number(room.turnSerial || 0), guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
    player.ready = false;
    emitRoll(room, player, { sides: 6, result, purpose: '직업 배정', kind: 'class' });
    sync(room);
    ack?.({ ok: true, result, state: publicRoom(room) });
  });

  socket.on('player:statsRoll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '능력치 생성은 로비에서만 가능합니다.')) return;
    if (!player.job) return ack?.({ ok: false, error: '직업을 먼저 배정받으세요.' });
    if (player.abilities) return ack?.({ ok: false, error: '현재 캠페인에서는 이미 능력치를 생성했습니다.' });
    if (!rateLimit(socket, 'stats', 1000)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const abilities = {};
    for (const stat of STAT_NAMES) abilities[stat] = roll4d6();
    player.abilities = abilities;
    recomputeDerivedVitals(player);
    player.ready = true;
    emitRoll(room, player, { sides: 6, result: rand(6), purpose: '능력치 생성 · 4D6 × 6', kind: 'stats' });
    sync(room);
    ack?.({ ok: true, state: publicRoom(room) });
  });

  socket.on('game:start', (payload, ack) => {
    const { room } = requireHost(socket, payload, ack);
    if (!room || !requirePhase(room, 'lobby', ack, '이미 세션이 시작되었습니다.')) return;
    const connected = room.players.filter(player => player.connected);
    if (connected.length < MIN_PLAYERS) return ack?.({ ok: false, error: '접속 중인 플레이어가 최소 1명 필요합니다.' });
    if (room.players.some(player => !player.connected)) return ack?.({ ok: false, error: '오프라인 플레이어가 있습니다. 해당 플레이어가 재접속하거나 로비를 다시 만들어주세요.' });
    if (!room.campaignId) return ack?.({ ok: false, error: '캠페인을 선택하세요.' });
    if (room.players.some(player => !player.ready)) return ack?.({ ok: false, error: '모든 플레이어가 직업과 능력치를 완성해야 합니다.' });
    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    room.phase = 'prologue';
    room.deck = buildDeck(campaign);
    room.discard = [];
    room.threat = 0;
    room.story = 0;
    room.storyNodeId = campaign?.storyBeats?.[0]?.id || null;
    room.storyComplete = false;
    room.storyGraphVersion = 1;
    room.dcPenalty = 0;
    room.choiceVotes = {};
    room.voteEndsAt = null;
    room.mainTurnsSinceEvent = 0;
    room.pendingTurnAdvance = false;
    room.turnSerial = 0;
    room.nextCheckDcReduction = 0;
    room.threatShield = 0;
    room.lastStoryAction = null;
    room.storyHistory = [];
    room.storyFlags = {};
    room.storyMemory = {};
    room.pathTotals = { truth: 0, survival: 0, bond: 0 };
    room.storyDetour = null;
    room.narrativeState = { boon: null, lastRoute: null, routeStreak: 0, detours: 0 };
    room.narrativeLedger = { threads: [], routeShifts: [], jobThreads: {} };
    room.storySeenIds = [];
    room.storyNodeId = campaign?.storyBeats?.[0]?.id || null;
    room.storyComplete = false;
    room.storyGraphVersion = 1;
    room.lastResolvedStoryBeat = null;
    room.pendingContinue = null;
    room.failureCount = 0;
    room.jobStory = {};
    room.prologue = buildCampaignPrologue(room, campaign);
    for (const member of room.players) {
      member.skillState = { readyAtTurn: 0, guard: 0, checkBonus: 0, attackBonus: 0, damageBonus: 0 };
      member.statuses = [];
    }
    room.activeChoice = null;
    room.currentEvent = null;
    room.monster = null;
    room.lastResolution = null;
    room.ending = null;
    room.abandonVote = null;
    room.turnIndex = 0;
    currentTurnPlayer(room);
    if (campaign.parallelStory?.enabled) {
      room.phase = 'story';
      room.prologue = null;
      room.deck = [];
      initializeParallelStory(room, campaign);
      currentTurnPlayer(room);
      pushChat(room, { type:'system', text:`「${campaign.title}」는 각 플레이어가 서로 다른 시작점에서 이야기를 시작합니다. 진행 중 같은 장소에 도착하면 만나고, 함께 다니거나 다시 헤어지는 것도 각자의 선택으로 결정됩니다.` });
      sync(room);
      void appendSessionEvent(room.code, 'game_started', { campaignId: campaign.id, players: room.players.map(player => player.name), mode:'parallel-story' });
      return ack?.({ ok:true, parallel:true });
    }
    room.storyMemory.prologueMeeting = room.prologue.meetingText;
    pushChat(room, { type: 'system', text: '각 플레이어의 개인 프롤로그가 시작되었습니다. 모두가 합류 준비를 마치면 메인 스토리가 열립니다.' });
    sync(room);
    void appendSessionEvent(room.code, 'game_started', { campaignId: campaign.id, players: room.players.map(player => player.name) });
    ack?.({ ok: true });
  });
  socket.on('prologue:continue', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'prologue', ack, '지금은 프롤로그를 진행할 수 없습니다.')) return;
    room.prologue ||= { scenes: {}, ready: {}, meetingText: '' };
    room.prologue.ready[player.id] = true;
    const connected = room.players.filter(member => member.connected);
    const allReady = connected.every(member => room.prologue.ready?.[member.id]);
    if (allReady) {
      room.phase = 'story';
      room.turnIndex = 0;
      currentTurnPlayer(room);
    }
    sync(room);
    ack?.({ ok:true, allReady });
  });

  socket.on('story:advance', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'story', ack, '지금은 메인 스토리를 진행할 수 없습니다.')) return;
    if (room.currentEvent || room.activeChoice) return ack?.({ ok: false, error: '현재 이벤트를 먼저 해결하세요.' });
    const actor = currentTurnPlayer(room);
    if (!actor || actor.id !== player.id) return ack?.({ ok: false, error: `현재는 ${actor?.name || '다른 플레이어'}의 차례입니다.` });
    if (!rateLimit(socket, 'storyAdvance', 700)) return ack?.({ ok: false, error: '잠시 후 다시 시도하세요.' });

    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
    if (parallelEnabled(room, campaign)) return parallelAdvance(room, campaign, player, payload, ack);
    const beat = renderedStoryBeat(room, campaign);
    if (!beat) return ack?.({ ok:false, error:'더 이상 진행할 스토리 장면이 없습니다.' });

    room.storyFlags ||= {};
    room.storyMemory ||= {};
    room.pathTotals ||= { truth: 0, survival: 0, bond: 0 };
    room.narrativeState ||= { boon: null, lastRoute: null, routeStreak: 0, detours: 0 };
  room.narrativeLedger ||= { threads: [], routeShifts: [], jobThreads: {} };
    const isDetour = Boolean(beat.isDetour);

    if (beat.roleplayPrompt) {
      const declaration = sanitize(payload?.declaration, 60);
      if (!declaration) return ack?.({ ok:false, error:'이 장면에서는 짧은 대답을 입력해 주세요.' });
      room.storyMemory[beat.roleplayPrompt.key] = declaration;
      room.lastStoryAction = {
        playerId: player.id,
        playerName: player.name,
        declaration,
        stat: null,
        mode: 'roleplay',
        roll: null,
        total: null,
        dc: null,
        success: true,
        narrative: beat.roleplayPrompt.responseTemplate.replace('{{value}}', declaration),
        beatId: beat.id,
      };
      room.storyHistory ||= [];
      room.storyHistory.push({ ...room.lastStoryAction, chapter: beat.chapter, act: beat.act, title: beat.title });
      if (room.storyHistory.length > 12) room.storyHistory.splice(0, room.storyHistory.length - 12);
      room.lastResolvedStoryBeat = JSON.parse(JSON.stringify(beat));
      consumeStoryBeat(room, campaign, beat, { next:{ success: beat.choices?.[0]?.next?.success || '__ENDING__' } }, true);
      room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0) + 1;
      room.lastResolution = {
        source:'story', ok:true, roleplay:true,
        text: room.lastStoryAction.narrative,
        playerId: player.id,
        playerName: player.name,
        continueLabel: '이 내용을 읽고 다음 장면으로 넘어간다',
      };
      room.phase = 'resolution';
      room.pendingContinue = { source:'story', drawEvent: room.mainTurnsSinceEvent >= EVENT_EVERY_TURNS && room.deck.length > 0, clearDetour: isDetour };
      pushChat(room, { type:'action', author:player.name, text:`짧은 대답: ${declaration}` });
      if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true, result:room.lastStoryAction }); }
      sync(room);
      setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 350);
      return ack?.({ ok:true, result:room.lastStoryAction });
    }

    const choiceIndex = Number(payload?.choiceIndex);
    const declaration = sanitize(payload?.declaration, 120);
    let choice = Number.isInteger(choiceIndex) ? beat.choices?.[choiceIndex] : null;
    let freeActionInterpretation = null;
    if (!choice && declaration && beat.freeActionAllowed) {
      const validity = validateFreeAction(declaration, beat);
      if (!validity.ok) return ack?.({ok:false,error:validity.error});
      freeActionInterpretation = interpretFreeAction(declaration, player, beat, room);
      const route = freeActionInterpretation.route;
      const template = routeTemplateChoice(beat, route) || beat.choices?.[0] || {};
      choice = {
        ...template,
        id:`${beat.id}-FREE-${Date.now()}`, label:declaration, freeAction:true,
        stat:freeActionInterpretation.stat, dc:freeActionInterpretation.dc,
        branchValue:route, path:choicePathFromRoute(route), actionType:validity.intent,
        startsCombat:validity.intent==='fight' && validity.ctx.hasHostile,
        fatalRisk:['fight','break','sneak'].includes(validity.intent),
        opportunity:'플레이어가 직접 만든 해결법', risk:sceneImportanceKey(beat)==='pivotal'?'높음':'보통',
      };
    }
    if (!choice) return ack?.({ ok:false, error:'빠른 선택을 고르거나, 아래 입력칸에 직접 하고 싶은 행동을 적어 주세요.' });
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) return ack?.({ ok:false, error:`${choice.requiredJob}만 선택할 수 있는 직업 전용 선택지입니다.` });
    const ability = player.abilities?.[choice.stat];
    if (!ability) return ack?.({ ok:false, error:'캐릭터 능력치를 찾을 수 없습니다.' });

    const roll = rand(20);
    const baseAbilityMod = mod(effectiveAbilityTotal(room, player, choice.stat));
    const gearBonus = equipmentStatBonus(room, player, choice.stat);
    const abilityMod = baseAbilityMod + gearBonus;
    const skillBonus = Number(player.skillState?.checkBonus || 0);
    const statusPenalty = statusPenaltyForCheck(room, player, choice.stat);
    const traitBonus = traitCheckBonus(player, choice.stat);
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const approach = approachPressure(room, player, choice);
    const dc = Math.max(7, Number(choice.dc || 9) + Number(room.dcPenalty || 0) - dcReduction + Number(approach.dc || 0));
    const total = roll + abilityMod + skillBonus + statusPenalty + traitBonus;
    const success = roll === 20 || (roll !== 1 && total >= dc);
    const margin = total - dc;
    const outcomeGrade = storyOutcomeGrade(roll,total,dc);
    const storyPass = success || outcomeGrade === 'mixed';
    rememberApproach(room, player, choice);
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
    room.pathTotals[choice.path] = Number(room.pathTotals[choice.path] || 0) + 1;
    if (choice.branchKey) room.storyFlags[choice.branchKey] = choice.branchValue;
    if (room.narrativeState.lastRoute === choice.branchValue) room.narrativeState.routeStreak = Number(room.narrativeState.routeStreak || 0) + 1;
    else room.narrativeState.routeStreak = 1;
    room.narrativeState.lastRoute = choice.branchValue;

    emitRoll(room, player, {
      sides:20, result:roll, purpose:`메인 스토리 · ${choice.stat} 판정 · DC ${dc}`,
      kind:'story-choice', stat:choice.stat, total, dc, success, modifiers:[{label:`${choice.stat} 기본 보정`,value:baseAbilityMod},{label:'장비 보정',value:gearBonus},{label:'직업 스킬',value:skillBonus},{label:'상태 효과',value:statusPenalty},{label:'능력치 특성',value:traitBonus},{label:approach.label || '접근 변화',value:Number(approach.dc||0) ? -Number(approach.dc||0) : 0}].filter(m=>m.value),
    });

    let consequence = '';
    let status = null;
    if (success) {
      if (outcomeGrade === 'critical') player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = Math.max(0, Number(room.dcPenalty || 0) - 1);
      consequence = outcomeGrade === 'critical' ? '대성공 · 영감 +1 · 위협 -1' : '성공 · 위협 -1';
      const economyRewards = rollReward(room, player, { margin, natural: roll });
      if (economyRewards.length) consequence += ` · ${economyRewards.join(' · ')}`;
    } else if (outcomeGrade === 'mixed') {
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      consequence = '부분 성공 · 목표는 달성하지만 위협 +1';
    } else if (outcomeGrade === 'setback') {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.failureCount = Number(room.failureCount || 0) + 1;
      consequence = '실패 · HP -1 · 위협 +1 · 이야기는 계속 진행';
    } else {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, Number(room.dcPenalty || 0) + 1);
      status = applyStatus(player, storyFailureStatus(choice, room, player));
      room.failureCount = Number(room.failureCount || 0) + 1;
      const deathReason = maybeFatalStoryFailure(room, campaign, player, choice, roll, margin);
      consequence = deathReason ? `사망 · ${deathReason}` : `큰 실패 · ${status.label} · HP -1 · 위협 +1`;
    }

    if (outcomeGrade === 'critical') room.narrativeState.boon = choice.branchValue;
    else if (!success) room.narrativeState.boon = null;

    let narrative = choice.freeAction
      ? actionNarrative({ success:storyPass, declaration:choice.label, player, beat, interpretation:freeActionInterpretation || interpretFreeAction(choice.label, player, beat, room), margin })
      : storyResolutionNarrative(campaign, beat, choice, player, storyPass, status, outcomeGrade);
    if (choice.freeAction && outcomeGrade === 'mixed') narrative += ` 다만 ${MIXED_COST_TEXT[campaign?.id] || '작은 대가가 남았다.'}`;
    if (player.dead && player.deathReason) narrative = `${narrative}\n\n${player.name}의 이야기는 여기서 끝났다. ${player.deathReason}`;
    if (choice.jobSpecial) {
      room.jobStory ||= {};
      const jobName = player.job?.name || choice.requiredJob;
      const entry = room.jobStory[jobName] ||= { success:0, failure:0, secrets:0, ending:null };
      if (success) {
        entry.success += 1;
        entry.secrets += margin >= 5 ? 2 : 1;
        entry.ending = choice.jobEnding || entry.ending;
      } else entry.failure += 1;
      narrative = `${player.name}에게는 다른 이들이 보지 못하는 것이 보였다. ${success ? choice.success : choice.failure}`;
      room.jobStory.last = { jobName, success, narrative, chapter:beat.chapter, ending:choice.jobEnding || null };
    }
    rememberNarrativeThread(room, campaign, beat, choice, player, storyPass, margin, status);
    applyAgencyMemory(room, player, choice, storyPass, margin, choice.freeAction ? choice.label : '');
    room.lastStoryAction = { playerId:player.id, playerName:player.name, declaration:choice.label, choiceId:choice.id, stat:choice.stat, mode:'story-choice', roll, total, dc, success:storyPass, outcomeGrade, branchValue:choice.branchValue, branchKey:choice.branchKey, narrative, beatId:beat.id, opportunity:choice.opportunity || null, risk:choice.risk || null, approachShift:approach.label || null, death:Boolean(player.dead) };
    room.storyHistory ||= [];
    room.storyHistory.push({ ...room.lastStoryAction, chapter: beat.chapter, act: beat.act, title: beat.title, isDetour });
    if (room.storyHistory.length > 16) room.storyHistory.splice(0, room.storyHistory.length - 16);
    room.lastResolvedStoryBeat = JSON.parse(JSON.stringify(beat));

    if (isDetour) {
      room.narrativeState.detours = Number(room.narrativeState.detours || 0) + 1;
    } else {
      const progression = consumeStoryBeat(room, campaign, beat, choice, storyPass);
      if (!progression.ok) return ack?.({ ok:false, error:'스토리 분기 상태가 일치하지 않습니다. 장면을 새로고침해 주세요.' });
      if (outcomeGrade === 'disaster' && !room.storyComplete) {
        room.storyDetour = buildDetourScene(campaign, room, choice, player, status);
      }
    }
    room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0) + 1;
    room.lastResolution = {
      source:'story', ok:storyPass, outcomeGrade, result:roll, total, dc,
      text: narrative,
      consequence,
      status: status ? { label: status.label, desc: status.desc, remainingScenes: Math.max(0, Number(status.expiresAtStory || 0) - Number(room.story || 0)) } : null,
      playerId: player.id,
      playerName: player.name,
      choiceLabel: choice.label,
      route: ROUTE_META[choice.branchValue] || null,
      isDetour,
      detourCreated: !isDetour && Boolean(room.storyDetour),
      continueLabel: '이 내용을 읽고 다음 장면으로 넘어간다',
    };
    room.phase = 'resolution';
    room.pendingContinue = { source:'story', drawEvent: room.mainTurnsSinceEvent >= EVENT_EVERY_TURNS && room.deck.length > 0, clearDetour: isDetour };
    if (choice.startsCombat && success && !isDetour) {
      room.monster = monsterForStoryChoice(room, beat, choice);
      room.pendingStoryCombat = true;
      room.pendingContinue.afterCombat = true;
    }

    pushChat(room, { type:'action', author:player.name, text:choice.freeAction ? `자유 행동: ${choice.label}` : `메인 선택: ${choice.label}` });
    pushChat(room, { type:storyPass ? 'success' : 'failure', author:'GM', text:`${choice.stat} 판정 ${roll}${abilityMod>=0?'+':''}${abilityMod}${skillBonus?`+스킬${skillBonus}`:''}${statusPenalty?`${statusPenalty}`:''} = ${total} / DC ${dc} → ${outcomeGrade==='critical'?'대성공':outcomeGrade==='success'?'성공':outcomeGrade==='mixed'?'부분 성공':outcomeGrade==='disaster'?'큰 실패':'실패'}` });

    if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true, result:room.lastStoryAction }); }
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 350);
    ack?.({ ok:true, result:room.lastStoryAction });
  });

  socket.on('item:equip', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !player) return;
    normalizeEconomyPlayer(player);
    const item = findCampaignItem(room.campaignId, payload?.itemId);
    if (!item || !player.inventory.includes(item.id)) return ack?.({ ok:false, error:'보유하지 않은 아이템입니다.' });
    const slot = item.slot;
    if (!['weapon','armor','charm','tool'].includes(slot)) return ack?.({ ok:false, error:'장착할 수 없는 아이템입니다.' });
    if (player.equipment[slot] === item.id) {
      player.equipment[slot] = null;
      pushChat(room, { type:'action', author:player.name, text:`${item.name} 장착 해제` });
    } else {
      player.equipment[slot] = item.id;
      pushChat(room, { type:'success', author:player.name, text:`${item.name} 장착 · ${item.stat} 판정 보정 +${item.bonus}` });
    }
    sync(room);
    ack?.({ ok:true, equipment:player.equipment });
  });

  socket.on('facility:action', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !player) return;
    if (!['story','resolution'].includes(room.phase) || !room.currentEvent?.facility) return ack?.({ ok:false, error:'지금은 시설을 이용할 수 없습니다.' });
    normalizeEconomyPlayer(player);
    room.facilityUses ||= {};
    const facility = room.currentEvent.facility;
    const action = String(payload?.action || facility.type);
    const itemId = String(payload?.itemId || '');
    const useKey = `${room.currentEvent.id}:${player.id}:${action}`;
    const oneUseKinds = new Set(['inn','restaurant','gamble','quest']);
    if (oneUseKinds.has(action) && room.facilityUses[useKey]) return ack?.({ ok:false, error:'이 이벤트에서는 이미 이용했습니다.' });
    let summary = '';
    if (action === 'inn') {
      const cost = Math.max(0, Number(facility.cost || 5) - derivedAbilityImpact(player).shopDiscount);
      if (!spendCoins(player, cost)) return ack?.({ ok:false, error:`코인이 부족합니다. 필요 ${cost} 코인` });
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + Number(facility.heal || 5));
      let cleansed = '';
      const status = activeStatuses(room, player)[0];
      if (status) { player.statuses = (player.statuses || []).filter(entry => entry.id !== status.id); cleansed = ` · ${status.label} 제거`; }
      summary = `숙박 -${cost} 코인 · HP +${player.hp - before}${cleansed}`;
    } else if (action === 'restaurant') {
      const cost = Math.max(0, Number(facility.cost || 2) - derivedAbilityImpact(player).shopDiscount);
      if (!spendCoins(player, cost)) return ack?.({ ok:false, error:`코인이 부족합니다. 필요 ${cost} 코인` });
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + Number(facility.heal || 2));
      summary = `식사 -${cost} 코인 · HP +${player.hp - before}`;
    } else if (action === 'shop') {
      const item = findCampaignItem(room.campaignId, itemId);
      if (!item || !(facility.stock || []).includes(item.id)) return ack?.({ ok:false, error:'지금 이 상점에서 판매하는 아이템이 아닙니다.' });
      if (player.inventory.includes(item.id)) return ack?.({ ok:false, error:'이미 보유한 아이템입니다.' });
      const price = Math.max(1, Number(item.price || 1) - derivedAbilityImpact(player).shopDiscount);
      if (!spendCoins(player, price)) return ack?.({ ok:false, error:`코인이 부족합니다. 필요 ${price} 코인` });
      player.inventory.push(item.id);
      summary = `${item.name} 구매 · -${price} 코인`;
    } else if (action === 'gamble') {
      const cost = Number(facility.cost || 1);
      if (!spendCoins(player, cost)) return ack?.({ ok:false, error:`내기에는 ${cost} 코인이 필요합니다.` });
      const die = rand(6);
      const payout = die <= 4 ? 0 : die === 5 ? 2 : 4;
      if (payout) grantCoins(player, payout);
      summary = `D6 내기 ${die} · ${payout ? `+${payout} 코인` : '획득 없음'} (참가비 -${cost})`;
      emitRoll(room, player, { sides:6, result:die, purpose:'위험한 내기', kind:'facility-gamble', total:die, modifiers:[] });
    } else if (action === 'quest') {
      const stat = player.job?.prime || '지혜';
      const result = rand(20);
      const baseBonus = mod(effectiveAbilityTotal(room, player, stat));
      const gearBonus = equipmentStatBonus(room, player, stat);
      const bonus = baseBonus + gearBonus;
      const total = result + bonus;
      const success = result === 20 || (result !== 1 && total >= 12);
      const coins = success ? (total >= 18 ? 3 : 2) + derivedAbilityImpact(player).questCoinBonus : 0;
      if (coins) grantCoins(player, coins);
      summary = `${stat} 의뢰 ${result}${bonus>=0?'+':''}${bonus}=${total} · ${success ? `성공, 코인 +${coins}` : '실패'}`;
      emitRoll(room, player, { sides:20, result, purpose:`짧은 의뢰 · ${stat} 판정`, kind:'facility-quest', stat, total, dc:12, success, modifiers:[{label:`${stat} 기본 보정`,value:baseBonus},{label:'장비 보정',value:gearBonus}].filter(m=>m.value) });
    } else return ack?.({ ok:false, error:'알 수 없는 시설 행동입니다.' });
    if (oneUseKinds.has(action)) room.facilityUses[useKey] = true;
    pushChat(room, { type:'success', author:player.name, text:`${facility.label} · ${summary}` });
    sync(room);
    ack?.({ ok:true, summary });
  });

  socket.on('player:skillUse', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (resumeBlocked(room, ack)) return;
    if (!player.job?.skillDef) return ack?.({ ok:false, error:'사용 가능한 직업 스킬이 없습니다.' });
    const remaining = skillRemaining(room, player);
    if (remaining > 0) return ack?.({ ok:false, error:`${player.job.skillDef.name} 쿨타임 ${remaining}턴 남았습니다.` });
    if (!canUseSkillNow(room, player)) return ack?.({ ok:false, error:'지금은 직업 스킬을 사용할 수 있는 자신의 행동 차례가 아닙니다.' });
    if (!rateLimit(socket, 'skillUse', 700)) return ack?.({ ok:false, error:'잠시 후 다시 시도하세요.' });
    const result = applyJobSkill(room, player);
    if (!result.ok) return ack?.(result);
    pushChat(room, { type:'success', author:player.name, text:`직업 스킬 「${player.job.skillDef.name}」 — ${result.summary || player.job.skillDef.text} · 쿨타임 ${result.cooldown}턴` });
    io.to(room.code).emit('skill:used', { playerId:player.id, playerName:player.name, name:player.job.skillDef.name, kind:player.job.skillDef.kind, summary:result.summary || player.job.skillDef.text });
    if (room.phase === 'combat' && room.monster && room.monster.hp <= 0) {
      const monsterName = room.monster.name;
      pushChat(room, { type:'success', author:'GM', text:`${monsterName}이(가) 직업 스킬에 쓰러졌습니다.` });
      clearBossTurnTimer(room.code);
      room.monster = null;
      const wasStoryCombat = Boolean(room.pendingStoryCombat);
      const postCombat = room.pendingAfterCombat || null;
      room.pendingStoryCombat = false;
      room.pendingAfterCombat = null;
      room.phase = 'story';
      room.threat = Math.max(0, room.threat - 1);
      if (wasStoryCombat) {
        if (postCombat?.drawEvent && room.deck.length) drawEventForRoom(room);
        else advanceTurn(room);
      } else if (room.pendingTurnAdvance) { advanceTurn(room); room.pendingTurnAdvance = false; }
    }
    sync(room);
    ack?.({ ok:true, cooldown:result.cooldown, summary:result.summary });
  });

  // v3.6 compatibility guards: event timing is server-controlled, not host-controlled.
  socket.on('event:draw', (_payload, ack) => ack?.({ ok: false, error: 'v3.6부터 이벤트 카드는 3개의 메인 턴마다 서버가 자동으로 공개합니다.' }));
  socket.on('event:finalizeChoice', (_payload, ack) => ack?.({ ok: false, error: '투표는 20초 제한시간 종료 후 서버가 자동 집계합니다.' }));
  socket.on('event:release', (_payload, ack) => ack?.({ ok: false, error: '투표는 제한시간 동안 자유롭게 변경할 수 있으며 호스트가 초기화할 수 없습니다.' }));

  socket.on('event:vote', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'story', ack, '현재 이벤트는 선택할 수 없는 상태입니다.')) return;
    if (!room.currentEvent) return ack?.({ ok: false, error: '진행 중인 이벤트가 없습니다.' });
    if (room.activeChoice) return ack?.({ ok: false, error: '이미 행동이 확정되었습니다.' });
    if (!room.voteEndsAt || Date.now() >= Number(room.voteEndsAt)) {
      if (finalizeChoiceSelection(room)) sync(room);
      return ack?.({ ok: false, error: '투표 시간이 종료되었습니다.' });
    }
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 투표할 수 없습니다.' });
    const choiceIndex = Number(payload.choiceIndex);
    const choice = room.currentEvent.choices[choiceIndex];
    if (!choice) return ack?.({ ok: false, error: '선택지가 올바르지 않습니다.' });
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) {
      return ack?.({ ok: false, error: `이 선택지는 ${choice.requiredJob}만 선택할 수 있습니다.` });
    }
    room.choiceVotes ||= {};
    room.choiceVotes[player.id] = choiceIndex;
    beginAllVotedCountdown(room);
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('event:roll', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'story', ack, '이미 판정이 끝났습니다.')) return;
    if (!rateLimit(socket, 'check', 700)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });
    const active = room.activeChoice;
    if (!active || active.playerId !== player.id) return ack?.({ ok: false, error: '이 판정의 행동자가 아닙니다.' });
    const ability = player.abilities?.[active.choice.stat];
    if (!ability) return ack?.({ ok: false, error: '능력치가 없습니다.' });

    const result = rand(20);
    const baseAbilityMod = mod(effectiveAbilityTotal(room, player, active.choice.stat));
    const gearBonus = equipmentStatBonus(room, player, active.choice.stat);
    const abilityMod = baseAbilityMod + gearBonus;
    const skillBonus = Number(player.skillState?.checkBonus || 0);
    const statusPenalty = statusPenaltyForCheck(room, player, active.choice.stat);
    const traitBonus = traitCheckBonus(player, active.choice.stat);
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const total = result + abilityMod + skillBonus + statusPenalty + traitBonus;
    const dc = Math.max(8, active.choice.dc + room.dcPenalty - dcReduction);
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
    const success = result === 20 || (result !== 1 && total >= dc);
    const margin = total - dc;
    const outcomeGrade = storyOutcomeGrade(result,total,dc);
    const eventPass = success || outcomeGrade === 'mixed';
    emitRoll(room, player, {
      sides: 20, result, purpose: `${active.choice.stat} 판정 · DC ${dc}`,
      kind: 'check', stat: active.choice.stat, total, dc, success, modifiers:[{label:`${active.choice.stat} 기본 보정`,value:baseAbilityMod},{label:'장비 보정',value:gearBonus},{label:'직업 스킬',value:skillBonus},{label:'상태 효과',value:statusPenalty},{label:'능력치 특성',value:traitBonus}].filter(m=>m.value),
    });

    const effect = eventPass ? active.choice.successEffect : active.choice.failureEffect;
    applyChoiceEffect(room, player, effect);
    if (eventPass && !effect) {
      player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = 0;
    } else if (!eventPass && !effect) {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, room.dcPenalty + 1);
    }

    const eventRewardNotes = eventPass ? rollReward(room, player, {
      margin,
      natural: result,
      lootItemId: room.currentEvent?.lootItemId || null,
      coinBonus: Number(room.currentEvent?.coinReward || 0),
    }) : [];
    room.lastResolution = {
      source:'event', ok:eventPass, outcomeGrade, result, total, dc,
      playerId: player.id, playerName: player.name,
      text: `${outcomeGrade==='mixed' ? `${active.choice.success} 다만 작은 대가가 남았습니다.` : (success ? active.choice.success : active.choice.failure)}${eventRewardNotes.length ? `

보상: ${eventRewardNotes.join(' · ')}` : ''}`,
      rewards: eventRewardNotes,
    };
    room.phase = 'resolution';
    pushChat(room, {
      type:eventPass ? 'success' : 'failure', author: player.name,
      text: `${result} ${abilityMod >= 0 ? '+' : ''}${abilityMod}${skillBonus ? ` +스킬${skillBonus}` : ''}${statusPenalty ? ` ${statusPenalty}` : ''} = ${total} / DC ${dc} → ${outcomeGrade==='critical'?'대성공':outcomeGrade==='success'?'성공':outcomeGrade==='mixed'?'부분 성공':outcomeGrade==='disaster'?'큰 실패':'실패'}`,
    });
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 2200);
    ack?.({ ok: true });
  });

  socket.on('event:continue', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'resolution', ack, '계속할 결과가 없습니다.')) return;
    const pending = room.pendingContinue || {};
    if (pending.source === 'parallel-story') {
      const actor=getPlayer(room,pending.actorId);
      if (!player || !actor || actor.id!==player.id) return ack?.({ok:false,error:`${actor?.name || '행동한 플레이어'}가 자신의 턴 결과를 마무리해야 합니다.`});
      const campaign=CAMPAIGNS.find(item=>item.id===room.campaignId);
      room.lastResolution=null; room.lastResolvedStoryBeat=null; room.pendingContinue=null; room.phase='story';
      advanceSkillClock(room,1);
      if (parallelEvaluateEnding(room,campaign)) { sync(room); return ack?.({ok:true,ending:true}); }
      advanceTurn(room);
      sync(room);
      return ack?.({ok:true,parallel:true});
    }
    const event = room.currentEvent;
    if (event) room.discard.push(event);
    room.currentEvent = null;
    room.activeChoice = null;
    room.choiceVotes = {};
    room.voteEndsAt = null;
    room.lastResolution = null;
    room.lastResolvedStoryBeat = null;
    room.pendingContinue = null;
    room.phase = 'story';
    if (pending.source === 'story') {
      if (pending.clearDetour) room.storyDetour = null;
      advanceSkillClock(room, 1);
      if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true }); }
      if (pending.afterCombat && room.monster) {
        room.pendingStoryCombat = true;
        room.pendingAfterCombat = { drawEvent:Boolean(pending.drawEvent), clearDetour:Boolean(pending.clearDetour) };
        room.phase = 'combat';
        pushChat(room, { type:'danger', author:room.monster.name, text:room.monster.introLine || `${room.monster.name}이(가) 전투를 시작했다.` });
        sync(room);
        return ack?.({ok:true, combat:true});
      }
      if (pending.drawEvent && room.deck.length) {
        drawEventForRoom(room);
        pushChat(room, { type:'system', text:`${EVENT_EVERY_TURNS}개의 메인 턴이 지나 이벤트 카드가 자동으로 공개되었습니다. 투표는 ${Math.round((connectedPlayers(room).length <= 1 ? SOLO_VOTE_DURATION_MS : VOTE_DURATION_MS)/1000)}초 동안 진행됩니다.` });
      } else advanceTurn(room);
      sync(room);
      return ack?.({ ok: true });
    }
    if (event?.monster) {
      room.monster = monsterForEvent(room, event);
      room.pendingTurnAdvance = true;
      room.phase = 'combat';
      pushChat(room, { type: 'danger', author:room.monster.name, text:room.monster.introLine || `${event.monster}이(가) 모습을 드러냈다.` });
    } else {
      advanceTurn(room);
    }
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('combat:defend', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'combat', ack, '전투 중이 아닙니다.') || !room.monster) return;
    if (player.hp <= 0) return ack?.({ ok:false, error:'쓰러진 캐릭터는 방어할 수 없습니다.' });
    if (room.monster.turnPhase === 'boss') return ack?.({ ok:false, error:'지금은 적의 행동 중입니다.' });
    if (room.monster.acted?.includes(player.id)) return ack?.({ ok:false, error:'이번 라운드에는 이미 행동했습니다.' });
    const con = rawAbilityMod(player, '체력');
    const guard = Math.max(1, 2 + Math.max(0, con) + Number(derivedAbilityImpact(player).guardBonus || 0));
    player.skillState ||= {};
    player.skillState.guard = Math.max(Number(player.skillState.guard || 0), guard);
    room.monster.acted ||= [];
    room.monster.acted.push(player.id);
    pushChat(room, { type:'success', author:player.name, text:`${player.name}은 공격을 서두르지 않고 자세를 낮춰 다음 타격을 받아낼 준비를 했다. 방어 태세가 잡혀 다음 피해를 최대 ${guard}까지 흡수할 수 있다.` });
    const eligible = room.players.filter(member => member.connected && member.hp > 0).map(member => member.id);
    if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room, 900);
    sync(room);
    ack?.({ ok:true, guard });
  });

  socket.on('combat:attack', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (room && resumeBlocked(room, ack)) return;
    if (!room || !requirePhase(room, 'combat', ack, '전투 중이 아닙니다.') || !room.monster) return;
    if (player.hp <= 0) return ack?.({ ok: false, error: '쓰러진 캐릭터는 공격할 수 없습니다.' });
    if (!player.connected) return ack?.({ ok: false, error: '오프라인 상태에서는 공격할 수 없습니다.' });
    if (room.monster.turnPhase === 'boss') return ack?.({ ok: false, error: '지금은 ENEMY TURN입니다. 적의 행동이 끝날 때까지 기다리세요.' });
    if (room.monster.acted?.includes(player.id)) return ack?.({ ok: false, error: '이번 라운드에는 이미 행동했습니다.' });
    if (!rateLimit(socket, 'attack', 700)) return ack?.({ ok: false, error: '주사위가 멈출 때까지 기다려주세요.' });

    const stat = player.job?.prime || '근력';
    const baseBonus = mod(effectiveAbilityTotal(room, player, stat));
    const gearBonus = equipmentStatBonus(room, player, stat);
    const bonus = baseBonus + gearBonus;
    const skillAttackBonus = Number(player.skillState?.attackBonus || 0);
    const skillDamageBonus = Number(player.skillState?.damageBonus || 0);
    const statusAttackPenalty = statusPenaltyForAttack(room, player, stat);
    const passiveHitBonus = Number(derivedAbilityImpact(player).combatHitBonus || 0);
    const result = rand(20);
    const total = result + bonus + skillAttackBonus + statusAttackPenalty + passiveHitBonus;
    const hit = result === 20 || (result !== 1 && total >= room.monster.ac);
    let damage = 0;
    if (hit) {
      const strengthDamage = derivedAbilityImpact(player).strengthDamage;
      damage = Math.max(1, rand(6) + Math.max(0, bonus) + strengthDamage + skillDamageBonus);
      if (result === 20) damage += rand(6);
      room.monster.hp = Math.max(0, room.monster.hp - damage);
    }
    player.skillState.attackBonus = 0;
    player.skillState.damageBonus = 0;
    room.monster.acted ||= [];
    room.monster.acted.push(player.id);

    emitRoll(room, player, {
      sides: 20, result, purpose: `${room.monster.name} 공격 · AC ${room.monster.ac}`,
      kind: 'attack', total, dc: room.monster.ac, success: hit, damage, modifiers:[{label:`${player.job?.prime || '공격'} 기본 보정`,value:baseBonus},{label:'장비 보정',value:gearBonus},{label:'스킬 명중',value:skillAttackBonus},{label:'상태 효과',value:statusAttackPenalty},{label:'능력치 특성',value:passiveHitBonus}].filter(m=>m.value),
    });
    pushChat(room, {
      type: hit ? 'success' : 'failure', author: player.name,
      text: playerAttackNarration(room, player, room.monster, { stat, roll: result, total, hit, damage }),
    });

    const monsterName = room.monster.name;
    if (room.monster.hp <= 0) {
      pushChat(room, { type: 'success', author: 'GM', text: `${monsterName}이(가) 쓰러졌습니다.` });
      clearBossTurnTimer(room.code);
      room.monster = null;
      const wasStoryCombat = Boolean(room.pendingStoryCombat);
      const postCombat = room.pendingAfterCombat || null;
      room.pendingStoryCombat = false;
      room.pendingAfterCombat = null;
      room.phase = 'story';
      room.threat = Math.max(0, room.threat - 1);
      if (wasStoryCombat) {
        if (postCombat?.drawEvent && room.deck.length) drawEventForRoom(room);
        else advanceTurn(room);
      } else if (room.pendingTurnAdvance) { advanceTurn(room); room.pendingTurnAdvance = false; }
    } else {
      const eligible = room.players.filter(member => member.connected && member.hp > 0).map(member => member.id);
      if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room);
    }

    evaluateEnding(room);
    sync(room);
    void appendSessionEvent(room.code, 'combat_attack', { playerName: player.name, monster: monsterName, roll: result, hit, damage });
    ack?.({ ok: true });
  });

  socket.on('chat:send', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (!rateLimit(socket, 'chat', 250)) return ack?.({ ok: false, error: '메시지를 너무 빠르게 보내고 있습니다.' });
    const text = sanitize(payload.text, 240);
    if (!text) return ack?.({ ok: false, error: '메시지가 비어 있습니다.' });
    pushChat(room, { type: player.host && payload.narration ? 'narration' : 'chat', author: player.name, text });
    io.to(room.code).emit('chat:new', room.chat[room.chat.length - 1]);
    ack?.({ ok: true });
  });

  socket.on('game:abandonRequest', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (room.phase === 'lobby') return ack?.({ ok: false, error: '이미 로비입니다.' });
    room.abandonVote = {
      requestedBy: player.id,
      requestedByName: player.name,
      approvals: [player.id],
      requestedAt: Date.now(),
    };
    pushChat(room, { type: 'system', text: `${player.name} 님이 연대기 포기 투표를 시작했습니다. ESC 안내서에서 찬반을 선택하세요.` });
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('game:abandonRespond', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room) return;
    if (!room.abandonVote) return ack?.({ ok: false, error: '진행 중인 포기 투표가 없습니다.' });
    const approve = payload?.approve !== false;
    if (!approve) {
      pushChat(room, { type: 'system', text: `${player.name} 님이 포기 투표를 거절했습니다. 현재 연대기를 계속 진행합니다.` });
      room.abandonVote = null;
      sync(room);
      return ack?.({ ok: true });
    }
    const approvals = new Set(room.abandonVote.approvals || []);
    approvals.add(player.id);
    room.abandonVote.approvals = [...approvals];
    if (resolveAbandonVoteIfReady(room)) {
      sync(room);
      return ack?.({ ok: true, reset: true });
    }
    sync(room);
    return ack?.({ ok: true });
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.find(member => member.socketId === socket.id);
      if (!player) continue;
      player.connected = false;
      player.socketId = null;
      pushChat(room, { type: 'system', text: `${player.name} 님의 연결이 끊겼습니다.` });
      promoteHostIfNeeded(room);
      reconcileCombatRound(room);
      resolveAbandonVoteIfReady(room);
      sync(room);
      break;
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms) {
    if (room.players.every(player => !player.connected) && now - (room.lastActiveAt || room.createdAt) > 1000 * 60 * 60 * 12) rooms.delete(roomCode);
  }
}, 1000 * 60 * 30).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chronicle Gate Online running on 0.0.0.0:${PORT} · persistence=${persistenceEnabled ? 'supabase' : 'memory'}`);
});

let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal}: flushing ${rooms.size} room snapshot(s)`);
  for (const roomCode of bossTurnTimers.keys()) clearBossTurnTimer(roomCode);
  const forceTimer = setTimeout(() => process.exit(1), 9_000);
  forceTimer.unref();
  try {
    await Promise.allSettled([...rooms.values()].map(room => flushRoomSave(room)));
  } finally {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_500).unref();
  }
}
process.on('unhandledRejection', error => console.error('[unhandledRejection]', error));
process.on('uncaughtException', error => { console.error('[uncaughtException]', error); void gracefulShutdown('uncaughtException'); });

process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => void gracefulShutdown('SIGINT'));
