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
const APP_VERSION = '5.4.0-deep-choice-branching.0';
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
    if (await roomSnapshotExists(candidate)) continue;
    return candidate;
  }
  throw new Error('고유한 방 코드를 생성하지 못했습니다.');
}

function campaignPublic() {
  return CAMPAIGNS.map(({ events, titles, ...campaign }) => ({
    ...campaign,
    eventCount: events.length,
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


const AGENCY_VERSION = 1;
const SCENE_IMPORTANCE = {
  ordinary: { label:'일반 장면', dcMin:8, dcMax:11, choiceTarget:6, freeAction:false, consequence:'여러 해결법 중 하나를 선택할 수 있습니다. 작은 실패도 이야기를 멈추지 않습니다.' },
  important: { label:'중요 장면', dcMin:10, dcMax:13, choiceTarget:5, freeAction:false, consequence:'선택한 접근 방식과 판정 결과가 다음 사건의 조건을 크게 바꿉니다.' },
  pivotal: { label:'결정적 장면', dcMin:12, dcMax:15, choiceTarget:4, freeAction:false, consequence:'이 장면의 선택은 큰 분기나 엔딩 후보를 바꿀 수 있습니다.' },
};

function rawAbility(player, stat) {
  return Number(player?.abilities?.[stat]?.total || 10);
}
function rawAbilityMod(player, stat) {
  return mod(rawAbility(player, stat));
}
function derivedAbilityImpact(player) {
  const str = rawAbility(player, '근력');
  const dex = rawAbility(player, '민첩');
  const int = rawAbility(player, '지능');
  const wis = rawAbility(player, '지혜');
  const cha = rawAbility(player, '매력');
  const con = rawAbility(player, '체력');
  return {
    strengthDamage: Math.max(0, mod(str)),
    defense: 10 + mod(dex),
    initiative: mod(dex),
    insight: int >= 14,
    insightDeep: int >= 16,
    dangerSense: wis >= 14,
    dangerSenseDeep: wis >= 16,
    shopDiscount: cha >= 16 ? 2 : cha >= 14 ? 1 : 0,
    questCoinBonus: cha >= 16 ? 1 : 0,
    statusResistance: con >= 16 ? 2 : con >= 14 ? 1 : 0,
    maxHpBonus: Math.max(-2, mod(con) * 2),
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
  if (dc <= 9) return '쉬움';
  if (dc <= 11) return '보통';
  if (dc <= 13) return '어려움';
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
  beat.freeActionAllowed = false;
  beat.choices = Array.isArray(beat.choices) ? beat.choices.map(choice => {
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
  const statOrder = [...new Set([...actorBest, ...preferredStats])];
  let generatedIndex = 0;
  while (visibleForActor().length < targetChoiceCount && generatedIndex < 18) {
    const stat = statOrder[generatedIndex % statOrder.length];
    generatedIndex += 1;
    if (usedStats.has(stat) && generatedIndex <= statOrder.length) continue;
    const route = routeFromStat(stat);
    const template = routeTemplateChoice(beat, route) || beat.choices[0];
    if (!template) break;
    const dc = normalizeStoryDc(beat, Number(template.dc || 10) + (generatedIndex % 3 === 0 ? 1 : 0));
    const optionText = {
      '근력': [`힘으로 위험을 떠받치며 ${String(beat?.objective || '목표')}을 위한 길을 억지로 연다`, `주변 구조물을 이용해 상대가 준비한 판 자체를 무너뜨린다`],
      '민첩': [`시선이 비는 순간 측면으로 파고들어 먼저 유리한 위치를 잡는다`, `정면 충돌을 피하고 가장 위험한 구간만 빠르게 통과한다`],
      '지능': [`지금까지 나온 단서와 모순을 다시 맞춰 숨겨진 규칙을 찾아낸다`, `상대 계획의 논리적 빈틈을 찾아 그 부분을 역이용한다`],
      '지혜': [`당장 움직이지 않고 주변의 반응과 기척을 끝까지 읽어 함정을 피한다`, `눈앞의 이득보다 이후의 위험을 먼저 계산해 안전한 흐름을 만든다`],
      '매력': [`관련 인물들의 이해관계를 엮어 협조하는 편이 이득이 되도록 설득한다`, `상대가 숨기고 싶은 감정을 건드려 스스로 정보를 말하게 만든다`],
      '체력': [`위험과 피로를 직접 받아내며 동료들이 움직일 시간을 번다`, `가장 힘든 역할을 맡아 파티 전체가 안전하게 움직일 여유를 만든다`],
    };
    const labels = optionText[stat] || [alternateActionLabel(stat, beat)];
    beat.choices.push({
      ...template,
      id:`${beat.id || 'scene'}-option-${stat}-${generatedIndex}`,
      label:labels[(generatedIndex - 1) % labels.length],
      detail:`${stat}을 중심으로 같은 목표를 다른 방식으로 해결합니다. 성공 시 얻는 이점과 실패 시 남는 대가가 다릅니다.`,
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

async function getOrLoadRoom(roomCode) {
  if (rooms.has(roomCode)) return rooms.get(roomCode);
  if (loadLocks.has(roomCode)) return loadLocks.get(roomCode);
  const promise = (async () => {
    const loaded = await loadRoomSnapshot(roomCode);
    if (loaded) { normalizeLoadedRoom(loaded); rooms.set(roomCode, loaded); armVoteTimer(loaded); }
    return loaded;
  })().finally(() => loadLocks.delete(roomCode));
  loadLocks.set(roomCode, promise);
  return promise;
}

function currentTurnPlayer(room) {
  if (!room?.players?.length) return null;
  room.turnIndex = Number.isInteger(room.turnIndex) ? room.turnIndex : 0;
  const start = ((room.turnIndex % room.players.length) + room.players.length) % room.players.length;
  for (let step = 0; step < room.players.length; step += 1) {
    const index = (start + step) % room.players.length;
    const candidate = room.players[index];
    if (!candidate.connected) continue;
    if (room.phase !== 'lobby' && candidate.maxHp > 0 && candidate.hp <= 0) continue;
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

function buildVictoryEnding(room) {
  const alias = room.storyMemory?.alias;
  const motive = room.storyMemory?.motive;
  const path = dominantStoryPath(room);
  const finalBranch = room.storyFlags?.act5 || room.storyFlags?.act4 || 'careful';
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
  return {
    victory: true,
    title: alias ? `「${alias}」 일행의 ${campaignEnding?.title || titles[path]?.[finalBranch] || titles[path]?.careful}` : (campaignEnding?.title || titles[path]?.[finalBranch] || titles[path]?.careful),
    text: `${campaignEnding?.text ? `${campaignEnding.text} ` : ''}${summaries[path]} ${motive ? `그리고 파티는 끝까지 “${motive}”라는 이유를 놓지 않았습니다. ` : ''}${branchNote} ${routeTrail.length ? `이번 여정은 ${routeTrail.join(' → ')}의 흐름으로 이어졌고,` : ''} 총 ${room.story}개의 실제 분기 장면을 지나 선택의 흔적이 엔딩에 남았습니다.${legacyText} ${failures >= 6 ? `수많은 실패와 상태이상을 견디며 도착한 만큼, 이 결말은 상처 입은 생존자들의 결말이기도 합니다.` : failures >= 3 ? `몇 번의 큰 실패가 있었고 그 흔적이 마지막 선택의 무게를 키웠습니다.` : `큰 실패를 최소화하며 비교적 온전한 상태로 결말에 도착했습니다.`}`,
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

function storyResolutionNarrative(campaign, beat, choice, player, success, status) {
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
  };
  const pair=lines[action]||[choice?.success||'선택이 새로운 국면을 만들었다.',choice?.failure||'시도는 뜻대로 되지 않았지만 다른 길을 남겼다.'];
  const injury=status?` 그 과정에서 부상이 하나 더 남았다.`:'';
  return `${pair[success?0:1]}${injury}`;
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
  return campaign.storyBeats.find(beat => beat.id === nodeId) || null;
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
  const turnPlayer = currentTurnPlayer(room);
  return {
    code: room.code,
    phase: room.phase,
    campaignId: room.campaignId,
    campaign: campaign ? {
      id: campaign.id, title: campaign.title, genre: campaign.genre,
      subtitle: campaign.subtitle, intro: campaign.intro, acts: campaign.acts,
      icon: campaign.icon, accent: campaign.accent, accent2: campaign.accent2,
      jobs: campaign.jobs, monsters: campaign.monsters, items: campaign.items || [], eventCount: campaign.events.length, storyBeats: campaign.storyBeats,
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
  scheduleRoomSave(room);
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
  const dc = Math.max(rule.dcMin, Math.min(rule.dcMax, 10 + threatPressure - expertise - naturalFit + (importanceKey === 'important' ? 1 : 0)));
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
    room.ending = {
      victory: false,
      title: '연대기는 검은 잉크로 닫혔다.',
      text: !living
        ? '모든 영웅이 쓰러졌습니다. 하지만 실패 역시 다음 세션의 전설이 됩니다.'
        : '세계의 위협이 한계를 넘어섰습니다. 여러분의 선택이 만든 비극적인 결말입니다.',
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

function monsterForStoryChoice(room, beat, choice) {
  const campaign=CAMPAIGNS.find(c=>c.id===room.campaignId);
  const generic={
    ember:['성채 경비병','재에 미친 망령','왕묘 약탈자'], neon:['추적 드론','갱단 집행자','보안 요원'], abyss:['광기에 잠식된 승무원','심해 포식자','고장 난 경비 기계'], clock:['시간 밀수꾼','역행 경비병','루프 망령'], wild:['오염된 야수','부족 전사','별가루 포식자'], guardian1:['고블린 전사','침략자 병사','사막 용병'], guardian2:['무투가','던전 몬스터','설산 추적자'], guardian3:['제국 집행병','침략자 병사','미래의 전투 기계']
  };
  const pool=generic[room.campaignId]||campaign?.monsters||['적대자'];
  const name=pool[(Number(beat?.chapter||1)+Number(room.story||0))%pool.length];
  const scale=Math.max(0,room.players.length-1);
  const hp=6+Math.floor(Number(beat?.act||1)/2)*2+scale*2;
  return {name,ac:10+Math.min(3,Number(beat?.act||1)-1),hp,maxHp:hp,attackBonus:1+Math.floor(Number(beat?.act||1)/2),round:1,acted:[],turnPhase:'players',bossTurnStartedAt:null,isBoss:false,source:'story-choice'};
}

function monsterForEvent(room, event) {
  const campaign = CAMPAIGNS.find(c => c.id === room.campaignId);
  const index = Math.max(0, campaign.monsters.indexOf(event.monster));
  const scale = Math.max(0, room.players.length - 2);
  const hp = 9 + index * 4 + scale * 3;
  return {
    name: event.monster,
    ac: Math.min(15, 10 + index),
    hp,
    maxHp: hp,
    attackBonus: 2 + Math.floor(index / 2),
    round: 1,
    acted: [],
    turnPhase: 'players',
    bossTurnStartedAt: null,
  };
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
  const armor = 10 + effectiveAbilityMod(room, target, '민첩');
  const total = roll + room.monster.attackBonus;
  const hit = roll === 20 || (roll !== 1 && total >= armor);
  let damage = hit ? rand(4) + 1 : 0;
  const guard = Number(target.skillState?.guard || 0);
  if (hit && guard > 0) { const blocked = Math.min(guard, damage); damage -= blocked; target.skillState.guard = guard - blocked; }
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
    text: hit
      ? `${room.monster.name}의 공격이 ${target.name}에게 ${damage} 피해를 입혔습니다.`
      : `${target.name}이 ${room.monster.name}의 공격을 피했습니다.`,
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
  pushChat(room, { type: 'danger', author: 'GM', text: `ENEMY TURN · ${room.monster.name}이(가) 공격을 준비합니다.` });
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
  const desiredAct = Math.min(5, Math.max(1, Number(currentMainBeat?.act || 1)));
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

  socket.on('room:create', async (payload = {}, ack) => {
    try {
      const name = sanitize(payload.name || '방장', 18) || '방장';
      const { room, player } = await createRoom(name, socket.id);
      socket.join(room.code);
      pushChat(room, { type: 'system', text: `${name} 님이 방을 만들었습니다.` });
      scheduleRoomSave(room, 0);
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
    const result = rand(6);
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
    room.storyMemory.prologueMeeting = room.prologue.meetingText;
    pushChat(room, { type: 'system', text: '각 플레이어의 개인 프롤로그가 시작되었습니다. 모두가 합류 준비를 마치면 메인 스토리가 열립니다.' });
    sync(room);
    void appendSessionEvent(room.code, 'game_started', { campaignId: campaign.id, players: room.players.map(player => player.name) });
    ack?.({ ok: true });
  });
  socket.on('prologue:continue', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
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
    if (!room || !requirePhase(room, 'story', ack, '지금은 메인 스토리를 진행할 수 없습니다.')) return;
    if (room.currentEvent || room.activeChoice) return ack?.({ ok: false, error: '현재 이벤트를 먼저 해결하세요.' });
    const actor = currentTurnPlayer(room);
    if (!actor || actor.id !== player.id) return ack?.({ ok: false, error: `현재는 ${actor?.name || '다른 플레이어'}의 차례입니다.` });
    if (!rateLimit(socket, 'storyAdvance', 700)) return ack?.({ ok: false, error: '잠시 후 다시 시도하세요.' });

    const campaign = CAMPAIGNS.find(item => item.id === room.campaignId);
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
    if (choice.startsCombat && !isDetour) {
      room.monster = monsterForStoryChoice(room, beat, choice);
      room.pendingStoryCombat = true;
      room.phase = 'combat';
      pushChat(room, { type:'danger', author:'GM', text:`${room.monster.name}과(와)의 전투가 시작됩니다.` });
    }
      pushChat(room, { type:'action', author:player.name, text:`짧은 대답: ${declaration}` });
      if (evaluateEnding(room)) { sync(room); return ack?.({ ok:true, ending:true, result:room.lastStoryAction }); }
      sync(room);
      setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 350);
      return ack?.({ ok:true, result:room.lastStoryAction });
    }

    const choiceIndex = Number(payload?.choiceIndex);
    const choice = Number.isInteger(choiceIndex) ? beat.choices?.[choiceIndex] : null;
    const freeActionInterpretation = null;
    if (!choice) return ack?.({ ok:false, error:'이 장면에서 사용할 행동을 선택해 주세요.' });
    if (choice.requiredJob && player.job?.name !== choice.requiredJob) return ack?.({ ok:false, error:`${choice.requiredJob}만 선택할 수 있는 직업 전용 선택지입니다.` });
    const ability = player.abilities?.[choice.stat];
    if (!ability) return ack?.({ ok:false, error:'캐릭터 능력치를 찾을 수 없습니다.' });

    const roll = rand(20);
    const baseAbilityMod = mod(effectiveAbilityTotal(room, player, choice.stat));
    const gearBonus = equipmentStatBonus(room, player, choice.stat);
    const abilityMod = baseAbilityMod + gearBonus;
    const skillBonus = Number(player.skillState?.checkBonus || 0);
    const statusPenalty = statusPenaltyForCheck(room, player, choice.stat);
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const dc = Math.max(8, Number(choice.dc || 10) + Number(room.dcPenalty || 0) - dcReduction);
    const total = roll + abilityMod + skillBonus + statusPenalty;
    const success = roll === 20 || (roll !== 1 && total >= dc);
    const margin = total - dc;
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
    room.pathTotals[choice.path] = Number(room.pathTotals[choice.path] || 0) + 1;
    if (choice.branchKey) room.storyFlags[choice.branchKey] = choice.branchValue;
    if (room.narrativeState.lastRoute === choice.branchValue) room.narrativeState.routeStreak = Number(room.narrativeState.routeStreak || 0) + 1;
    else room.narrativeState.routeStreak = 1;
    room.narrativeState.lastRoute = choice.branchValue;

    emitRoll(room, player, {
      sides:20, result:roll, purpose:`메인 스토리 · ${choice.stat} 판정 · DC ${dc}`,
      kind:'story-choice', stat:choice.stat, total, dc, success, modifiers:[{label:`${choice.stat} 기본 보정`,value:baseAbilityMod},{label:'장비 보정',value:gearBonus},{label:'직업 스킬',value:skillBonus},{label:'상태 효과',value:statusPenalty}].filter(m=>m.value),
    });

    let consequence = '';
    let status = null;
    if (success) {
      if (margin >= 5) player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = Math.max(0, Number(room.dcPenalty || 0) - 1);
      consequence = margin >= 5 ? '대성공 여파로 영감 +1, 위협 -1' : '성공 여파로 위협 -1';
      const economyRewards = rollReward(room, player, { margin, natural: roll });
      if (economyRewards.length) consequence += ` · ${economyRewards.join(' · ')}`;
    } else {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, Number(room.dcPenalty || 0) + 1);
      status = applyStatus(player, storyFailureStatus(choice, room, player));
      room.failureCount = Number(room.failureCount || 0) + 1;
      consequence = `불상사: ${status.label} 상태이상 적용 · HP -1 · 위협 +1 · 다음 장면 판정 불리`;
    }

    if (success && margin >= 5) room.narrativeState.boon = choice.branchValue;
    else if (!success) room.narrativeState.boon = null;

    let narrative = choice.freeAction
      ? actionNarrative({ success, declaration:choice.label, player, beat, interpretation:freeActionInterpretation || interpretFreeAction(choice.label, player, beat, room), margin })
      : storyResolutionNarrative(campaign, beat, choice, player, success, status);
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
    rememberNarrativeThread(room, campaign, beat, choice, player, success, margin, status);
    applyAgencyMemory(room, player, choice, success, margin, choice.freeAction ? choice.label : '');
    room.lastStoryAction = { playerId:player.id, playerName:player.name, declaration:choice.label, choiceId:choice.id, stat:choice.stat, mode:'story-choice', roll, total, dc, success, branchValue:choice.branchValue, branchKey:choice.branchKey, narrative, beatId:beat.id };
    room.storyHistory ||= [];
    room.storyHistory.push({ ...room.lastStoryAction, chapter: beat.chapter, act: beat.act, title: beat.title, isDetour });
    if (room.storyHistory.length > 16) room.storyHistory.splice(0, room.storyHistory.length - 16);
    room.lastResolvedStoryBeat = JSON.parse(JSON.stringify(beat));

    if (isDetour) {
      room.narrativeState.detours = Number(room.narrativeState.detours || 0) + 1;
    } else {
      const progression = consumeStoryBeat(room, campaign, beat, choice, success);
      if (!progression.ok) return ack?.({ ok:false, error:'스토리 분기 상태가 일치하지 않습니다. 장면을 새로고침해 주세요.' });
      if (!success && (margin <= -5 || roll === 1) && !room.storyComplete) {
        room.storyDetour = buildDetourScene(campaign, room, choice, player, status);
      }
    }
    room.mainTurnsSinceEvent = Number(room.mainTurnsSinceEvent || 0) + 1;
    room.lastResolution = {
      source:'story', ok:success, result:roll, total, dc,
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

    pushChat(room, { type:'action', author:player.name, text:choice.freeAction ? `자유 행동: ${choice.label}` : `메인 선택: ${choice.label}` });
    pushChat(room, { type:success ? 'success' : 'failure', author:'GM', text:`${choice.stat} 판정 ${roll}${abilityMod>=0?'+':''}${abilityMod}${skillBonus?`+스킬${skillBonus}`:''}${statusPenalty?`${statusPenalty}`:''} = ${total} / DC ${dc} → ${success?'성공':'실패'}` });

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
      room.phase = room.pendingStoryCombat ? 'resolution' : 'story';
      room.pendingStoryCombat = false;
      room.threat = Math.max(0, room.threat - 1);
      if (room.pendingTurnAdvance) { advanceTurn(room); room.pendingTurnAdvance = false; }
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
    const dcReduction = Number(room.nextCheckDcReduction || 0);
    const total = result + abilityMod + skillBonus + statusPenalty;
    const dc = Math.max(8, active.choice.dc + room.dcPenalty - dcReduction);
    player.skillState.checkBonus = 0;
    room.nextCheckDcReduction = 0;
    const success = result === 20 || (result !== 1 && total >= dc);
    const margin = total - dc;
    emitRoll(room, player, {
      sides: 20, result, purpose: `${active.choice.stat} 판정 · DC ${dc}`,
      kind: 'check', stat: active.choice.stat, total, dc, success, modifiers:[{label:`${active.choice.stat} 기본 보정`,value:baseAbilityMod},{label:'장비 보정',value:gearBonus},{label:'직업 스킬',value:skillBonus},{label:'상태 효과',value:statusPenalty}].filter(m=>m.value),
    });

    const effect = success ? active.choice.successEffect : active.choice.failureEffect;
    applyChoiceEffect(room, player, effect);
    if (success && !effect) {
      player.inspiration = Math.min(3, player.inspiration + 1);
      room.threat = Math.max(0, room.threat - 1);
      room.dcPenalty = 0;
    } else if (!success && !effect) {
      player.hp = Math.max(0, player.hp - 1);
      room.threat = Math.min(MAX_THREAT, room.threat + 1);
      room.dcPenalty = Math.min(2, room.dcPenalty + 1);
    }

    const eventRewardNotes = success ? rollReward(room, player, {
      margin,
      natural: result,
      lootItemId: room.currentEvent?.lootItemId || null,
      coinBonus: Number(room.currentEvent?.coinReward || 0),
    }) : [];
    room.lastResolution = {
      ok: success, result, total, dc,
      text: `${success ? active.choice.success : active.choice.failure}${eventRewardNotes.length ? `

보상: ${eventRewardNotes.join(' · ')}` : ''}`,
      rewards: eventRewardNotes,
      playerId: player.id,
    };
    room.phase = 'resolution';
    pushChat(room, {
      type: success ? 'success' : 'failure', author: player.name,
      text: `${result} ${abilityMod >= 0 ? '+' : ''}${abilityMod}${skillBonus ? ` +스킬${skillBonus}` : ''}${statusPenalty ? ` ${statusPenalty}` : ''} = ${total} / DC ${dc} → ${success ? '성공' : '실패'}`,
    });
    sync(room);
    setTimeout(() => io.to(room.code).emit('resolution', room.lastResolution), 2200);
    ack?.({ ok: true });
  });

  socket.on('event:continue', (payload, ack) => {
    const { room } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'resolution', ack, '계속할 결과가 없습니다.')) return;
    const pending = room.pendingContinue || {};
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
      pushChat(room, { type: 'danger', author: 'GM', text: `${event.monster} 등장! 이벤트가 전투로 이어집니다.` });
    } else {
      advanceTurn(room);
    }
    sync(room);
    ack?.({ ok: true });
  });

  socket.on('combat:defend', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
    if (!room || !requirePhase(room, 'combat', ack, '전투 중이 아닙니다.') || !room.monster) return;
    if (player.hp <= 0) return ack?.({ ok:false, error:'쓰러진 캐릭터는 방어할 수 없습니다.' });
    if (room.monster.turnPhase === 'boss') return ack?.({ ok:false, error:'지금은 보스의 행동 중입니다.' });
    if (room.monster.acted?.includes(player.id)) return ack?.({ ok:false, error:'이번 라운드에는 이미 행동했습니다.' });
    const con = rawAbilityMod(player, '체력');
    const guard = Math.max(2, 2 + Math.max(0, con));
    player.skillState ||= {};
    player.skillState.guard = Math.max(Number(player.skillState.guard || 0), guard);
    room.monster.acted ||= [];
    room.monster.acted.push(player.id);
    pushChat(room, { type:'success', author:player.name, text:`방어 태세 · 다음 피해 ${guard}까지 흡수` });
    const eligible = room.players.filter(member => member.connected && member.hp > 0).map(member => member.id);
    if (eligible.length && eligible.every(id => room.monster.acted.includes(id))) scheduleMonsterTurn(room, 900);
    sync(room);
    ack?.({ ok:true, guard });
  });

  socket.on('combat:attack', (payload, ack) => {
    const { room, player } = requireMember(socket, payload, ack);
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
    const result = rand(20);
    const total = result + bonus + skillAttackBonus + statusAttackPenalty;
    const hit = result === 20 || (result !== 1 && total >= room.monster.ac);
    let damage = 0;
    if (hit) {
      const strengthDamage = derivedAbilityImpact(player).strengthDamage;
      damage = rand(6) + Math.max(0, bonus) + strengthDamage + skillDamageBonus;
      if (result === 20) damage += rand(6);
      room.monster.hp = Math.max(0, room.monster.hp - damage);
    }
    player.skillState.attackBonus = 0;
    player.skillState.damageBonus = 0;
    room.monster.acted ||= [];
    room.monster.acted.push(player.id);

    emitRoll(room, player, {
      sides: 20, result, purpose: `${room.monster.name} 공격 · AC ${room.monster.ac}`,
      kind: 'attack', total, dc: room.monster.ac, success: hit, damage, modifiers:[{label:`${player.job?.prime || '공격'} 기본 보정`,value:baseBonus},{label:'장비 보정',value:gearBonus},{label:'스킬 명중',value:skillAttackBonus},{label:'상태 효과',value:statusAttackPenalty}].filter(m=>m.value),
    });
    pushChat(room, {
      type: hit ? 'success' : 'failure', author: player.name,
      text: `${room.monster.name} 공격 ${hit ? `명중! ${damage} 피해` : '실패'}`,
    });

    const monsterName = room.monster.name;
    if (room.monster.hp <= 0) {
      pushChat(room, { type: 'success', author: 'GM', text: `${monsterName}이(가) 쓰러졌습니다.` });
      clearBossTurnTimer(room.code);
      room.monster = null;
      room.phase = room.pendingStoryCombat ? 'resolution' : 'story';
      room.pendingStoryCombat = false;
      room.threat = Math.max(0, room.threat - 1);
      if (room.pendingTurnAdvance) { advanceTurn(room); room.pendingTurnAdvance = false; }
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
    scheduleRoomSave(room);
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
