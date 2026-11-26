import { OPENINGS_HORROR } from './campaigns/openings-horror.js';
import { safeSound } from './scene-sound.js';
/** Authored, private first chapters. Choices run independently until the meeting. */
import { OPENINGS_A } from './campaigns/openings-a.js';
import { OPENINGS_B } from './campaigns/openings-b.js';
import { getClass } from './professions.js';
import { gradeRoll, gradeChances, GRADE_LABELS, ROLLED_GRADES } from './judgement.js';

export const OPENINGS = Object.freeze({ ...OPENINGS_A, ...OPENINGS_B, ...OPENINGS_HORROR });
const copy = value => JSON.parse(JSON.stringify(value));
const failed = error => ({ ok: false, error });
const statLabels = { might: '힘', agility: '민첩', wit: '통찰', heart: '교섭' };
const definition = (game, player) => OPENINGS[game.campaignId]?.professions[player?.classId];
const personalState = (game, playerId) => game.opening?.states.find(state => state.playerId === playerId);
const ready = state => Boolean(state && (state.deferred || state.records.length === 2));
const dieValue = source => { try { const die = typeof source === 'function' ? source() : source; return Number.isInteger(die) && die >= 1 && die <= 20 ? die : null; } catch { return null; } };

export function openingRole(game, campaign, player) {
  return game.opening ? definition(game, player)?.role : campaign.roles?.[player?.roleIndex];
}

export function actionRevision(game, playerId) {
  const state = personalState(game, playerId);
  return game.phase === 'opening' && state ? `opening:${state.revision}` : game.revision;
}

export function initializeOpening(game, campaign) {
  if (new Set(game.players.map(player => player.classId)).size !== game.players.length) {
    throw new Error('각자의 첫 장에서는 서로 다른 직업을 골라 주세요.');
  }
  if (!OPENINGS[campaign.id] || game.players.some(player => !definition(game, player))) throw new Error('이 직업의 첫 장을 찾을 수 없습니다.');
  game.schema = 22;
  game.phase = 'opening';
  game.opening = { schema: 1, startNodeId: campaign.start, joined: false, states: game.players.map(player => ({ playerId: player.id, revision: 1, records: [], deferred: false, bonusSpent: false })) };
  game.players.forEach(player => { player.openingBonus = 0; });
}

function recordResult(game, campaign, player, record) {
  const stage = definition(game, player).stages[record.stage];
  const choice = stage.choices.find(item => item.id === record.choiceId);
  const classBonus = getClass(campaign, player.classId).stats[choice.stat] || 0;
  const grade = choice.automatic ? 'automatic' : gradeRoll(record.roll, record.roll + classBonus, choice.dc);
  const outcome = choice.outcomes[grade === 'automatic' ? 'success' : grade];
  return {
    sceneId: `opening:${player.classId}:${stage.id}`, sceneTitle: stage.title, location: stage.location, mood: stage.mood,
    actor: player.name, action: choice.label, text: outcome.text, sound:safeSound(outcome.sound), report: outcome.report,
    grade, roll: record.roll, total: choice.automatic ? null : record.roll + classBonus,
    dc: choice.automatic ? 0 : choice.dc, bonus: choice.automatic ? 0 : classBonus,
    preparation: outcome.bonus || 0, harm: outcome.harm || 0,
    changes: [
      ...(outcome.bonus ? [`본편 첫 이야기 판정 준비 +${outcome.bonus} (누적 최대 2)`] : []),
      ...(outcome.harm ? [`생명 −${outcome.harm}`] : []),
    ],
  };
}

function historyFor(game, campaign, player) {
  return (personalState(game, player.id)?.records || []).map(record => recordResult(game, campaign, player, record));
}

function earnedBonus(history) { return Math.min(2, history.reduce((sum, result) => sum + result.preparation, 0)); }

function finishIfReady(game) {
  if (!game.opening.states.every(ready)) return false;
  game.opening.joined = true;
  game.phase = 'playing';
  game.activeIndex = Math.max(0, game.players.findIndex(player => player.connected !== false && player.life !== 'dead'));
  game.assists = [];
  return true;
}

function participantsFor(game, campaign) {
  return game.players.map(player => {
    const state = personalState(game, player.id);
    return { id: player.id, name: player.name, className: getClass(campaign, player.classId).name, connected: player.connected !== false,
      completed: state.records.length, ready: ready(state), deferred: state.deferred };
  });
}

export function meetingPassages(game, campaign) {
  if (!game.opening?.joined) return null;
  const meeting = OPENINGS[campaign.id].meeting;
  const mode = game.players.length === 1 ? 'solo' : 'group';
  const intro = meeting[mode];
  const start = campaign.nodes[game.opening.startNodeId];
  const accounts = game.players.map(player => {
    const state = personalState(game, player.id), origin = definition(game, player);
    const reports = historyFor(game, campaign, player).map(result => result.report);
    if (state.deferred) reports.push(origin.deferred);
    return `${player.name} · ${getClass(campaign, player.classId).name} — ${reports.join(' ')}`;
  });
  // Keep the common introduction readable even if a faster reader has already
  // moved the table onward. Reconstruct from authored data, never saved prose.
  return { title: meeting.title, location: meeting.location, text: [intro, ...accounts], participants: participantsFor(game, campaign),
    startScene: { id: start.id, title: start.title, location: start.location, mood: start.mood || 'mystery', text: copy(meeting.startText[mode]) } };
}

export function openingStartParagraphs(game, node) {
  const meeting = OPENINGS[game.campaignId]?.meeting;
  return game.opening?.joined && node.id === game.opening.startNodeId ? meeting?.startText[game.players.length === 1 ? 'solo' : 'group'] : null;
}

export function openingView(game, campaign, viewerId) {
  if (!game.opening) return null;
  const player = game.players.find(person => person.id === viewerId), state = personalState(game, viewerId);
  const participants = participantsFor(game, campaign), meeting = OPENINGS[campaign.id].meeting;
  const history = player ? historyFor(game, campaign, player) : [];
  const opening = {
    active: game.phase === 'opening', readyCount: participants.filter(person => person.ready).length, total: participants.length,
    meetingTitle: meeting.title, meetingLocation: meeting.location, participants,
    mine: state ? { stage: state.records.length, ready: ready(state), revision: state.revision, deferred: state.deferred,
      history: copy(history), preparation: earnedBonus(history), bonusSpent: state.bonusSpent } : null,
    ...(game.opening.joined ? { meeting: meetingPassages(game, campaign) } : {}),
  };
  if (game.phase !== 'opening') return { opening };
  const stage = state && !ready(state) ? definition(game, player).stages[state.records.length] : null;
  const waitingText = player ? [
    `${player.name}의 발걸음이 ${meeting.location}에 닿았다. 앞서 겪은 일을 마음에 담고 잠시 숨을 고른다.`,
    game.players.length > 1 ? '아직 오고 있는 이들이 있다. 모두 도착하면 각자의 사연이 같은 이야기로 이어진다.' : '이곳에서 다음 장이 시작된다.',
  ] : ['이 테이블에 참가한 인물의 첫 장만 볼 수 있습니다.'];
  const paragraphs = stage?.text || waitingText;
  return {
    opening, actionRevision: actionRevision(game, viewerId), activePlayerId: stage ? viewerId : null,
    canAct: Boolean(stage), canAssist: false, combat: null, ending: false,
    players: game.players.map(person => {
      const job = getClass(campaign, person.classId), own = person.id === viewerId;
      return { ...person, className: job.name, stats: job.stats, basic: job.basic, ability: job.ability,
        health: own ? person.health : null, openingBonus: own ? person.openingBonus : null,
        focus: own ? person.focus : null, assisting: false, revealedText: null };
    }),
    scene: {
      id: stage ? `opening:${player.classId}:${stage.id}` : 'opening:waiting', title: stage?.title || meeting.title,
      sound:safeSound(stage?.sound), chapter: 0, location: stage?.location || meeting.location, art: stage?.art || 0, mood: stage?.mood || 'calm',
      summary: stage?.objective || '각자의 첫 장을 마치고 합류를 기다립니다.', stakes: '직업에 맞는 선택을 두 번 마치면 일행과 만납니다.',
      arrival: null, text: copy(paragraphs), reading: { paragraphs: copy(paragraphs), echoes: [], personal: [], fate: '' },
      dialogue: null, objective: stage?.objective || '다른 참가자들의 도착을 기다린다.', entities: [], details: [], lockedChoices: [], resurrection: null, ending: false, question: '',
      choices: (stage?.choices || []).map(choice => ({ id: choice.id, label: choice.label, stat: choice.stat,
        dc: choice.automatic ? null : choice.dc, automatic: Boolean(choice.automatic), risk: choice.risk,
        harmRisk: Math.max(0, ...Object.values(choice.outcomes).map(outcome => outcome.harm || 0)), useItems: [], consumeItems: [], hint: '' })),
    },
    journal: history.map((entry, index) => ({ id: `opening:${index}`, ...copy(entry) })),
    chronicle: history.map((entry, index) => ({ id: `opening:${index}`, kind: 'opening', sceneTitle: entry.sceneTitle, actor: entry.actor, action: entry.action, grade: entry.grade, text: entry.text })),
    chroniclePartial: false, chroniclePrologue: player ? copy(definition(game, player).stages[0].text) : [],
    lastResult: history.length ? copy(history.at(-1)) : null,
    clues: [], inventory: [], flags: [],
    helpText: '각자의 첫 장은 다른 사람의 차례를 기다리지 않고 진행합니다. 안전한 방법에는 주사위를 쓰지 않습니다. 위험한 방법은 D20과 직업 능력치로 판정합니다.',
  };
}

export function previewOpening(game, campaign, playerId, payload) {
  const player = game.players.find(person => person.id === playerId), state = personalState(game, playerId);
  if (!player || !state) return failed('이 테이블의 참가자가 아닙니다.');
  if (ready(state)) return failed('첫 장을 마쳤습니다. 다른 참가자들의 도착을 기다려 주세요.');
  if (payload.detailId || payload.combatAction || payload.reviveId || payload.spendSpark || payload.usePreparation) return failed('첫 장에서는 지금 보이는 직업 선택지를 골라 주세요. 운명 조각과 준비는 본편에서 쓸 수 있습니다.');
  const stage = definition(game, player).stages[state.records.length];
  const choice = stage.choices.find(item => item.id === payload.choiceId);
  if (!choice) return failed('지금 당신의 장면에 있는 행동을 선택해 주세요.');
  const automatic = Boolean(choice.automatic), bonus = automatic ? 0 : getClass(campaign, player.classId).stats[choice.stat] || 0;
  const dc = automatic ? 0 : choice.dc, chances = automatic ? null : gradeChances(bonus, dc);
  const outcomes = (automatic ? ['automatic'] : ROLLED_GRADES).map(grade => {
    const outcome = choice.outcomes[grade === 'automatic' ? 'success' : grade];
    return { grade, label: automatic ? '선택대로 진행' : GRADE_LABELS[grade], chance: automatic ? 100 : chances[grade], text: outcome.text, sound:safeSound(outcome.sound),
      changes: [ ...(outcome.bonus ? [`본편 첫 이야기 판정 준비 +${outcome.bonus} (누적 최대 2)`] : []), ...(outcome.harm ? [`생명 −${outcome.harm}`] : []) ] };
  });
  return { ok: true, plan: { type: 'opening', choiceId: choice.id, label: choice.label, automatic,
    stat: choice.stat || null, statLabel: statLabels[choice.stat] || '', dc, bonus, classBonus: bonus, assistance: 0, preparation: false, spendSpark: false,
    risk: choice.risk, harmRisk: Math.max(0, ...Object.values(choice.outcomes).map(outcome => outcome.harm || 0)),
    successChance: automatic ? 100 : chances.critical + chances.success, gradeChances: chances, outcomes,
    revision: actionRevision(game, playerId), requiresConfirmation: true } };
}

export function applyOpeningAction(game, campaign, playerId, payload, { roll } = {}) {
  if (payload.revision !== actionRevision(game, playerId)) return failed('당신의 장면이 바뀌었습니다. 행동을 다시 확인해 주세요.');
  const preview = previewOpening(game, campaign, playerId, payload);
  if (!preview.ok) return preview;
  const die = preview.plan.automatic ? null : dieValue(roll);
  if (!preview.plan.automatic && die === null) return failed('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
  const next = copy(game), player = next.players.find(person => person.id === playerId), state = personalState(next, playerId);
  state.records.push({ stage: state.records.length, choiceId: preview.plan.choiceId, roll: die });
  state.revision++;
  const history = historyFor(next, campaign, player);
  player.openingBonus = earnedBonus(history);
  player.health = 3 - history.reduce((sum, result) => sum + result.harm, 0);
  next.revision++;
  const joined = finishIfReady(next);
  return { ok: true, game: next, plan: preview.plan, joined };
}

/** Server authorizes the host. The engine still checks presence and readiness. */
export function deferOpeningPlayer(game, campaign, playerId) {
  if (game.phase !== 'opening') return failed('각자의 첫 장을 진행할 때만 합류를 처리할 수 있습니다.');
  const player = game.players.find(person => person.id === playerId), state = personalState(game, playerId);
  if (!player || !state) return failed('참가자를 찾을 수 없습니다.');
  if (player.connected !== false) return failed('연결 중인 참가자의 선택을 대신 마칠 수 없습니다.');
  if (ready(state)) return failed('이미 합류할 준비를 마친 참가자입니다.');
  const next = copy(game), target = personalState(next, playerId);
  target.deferred = true; target.revision++; next.revision++;
  return { ok: true, game: next, joined: finishIfReady(next) };
}

export function spendOpeningBonus(game, playerId) {
  const state = personalState(game, playerId), player = game.players.find(person => person.id === playerId);
  if (state && player?.openingBonus) { state.bonusSpent = true; player.openingBonus = 0; }
}

export function remapOpeningPlayers(game, ids) {
  for (const state of game.opening?.states || []) state.playerId = ids[state.playerId] || state.playerId;
}

/** Rebuild prose and benefits from validated authored choices and actual die values. */
export function restoreOpening(game, campaign, raw) {
  if (!raw.opening && raw.schema !== 19 && raw.phase !== 'opening') return;
  const source = raw.opening;
  const invalid = () => { throw new Error('직업별 첫 장의 저장 기록이 올바르지 않습니다. 원본 저장 파일을 확인해 주세요.'); };
  if (![19,22].includes(raw.schema) || !source || source.schema !== 1 || !Array.isArray(source.states) || source.states.length !== game.players.length) invalid();
  if (new Set(game.players.map(player => player.classId)).size !== game.players.length) invalid();
  const states = game.players.map(player => {
    const matches = source.states.filter(state => state?.playerId === player.id), origin = definition(game, player);
    if (matches.length !== 1 || !origin) invalid();
    const state = matches[0];
    if (!Array.isArray(state.records) || state.records.length > 2 || typeof state.deferred !== 'boolean' || typeof state.bonusSpent !== 'boolean') invalid();
    if (state.deferred && state.records.length === 2) invalid();
    const records = state.records.map((record, index) => {
      if (!record || record.stage !== index) invalid();
      const choice = origin.stages[index].choices.find(item => item.id === record.choiceId);
      if (!choice || (choice.automatic ? record.roll !== null : !Number.isInteger(record.roll) || record.roll < 1 || record.roll > 20)) invalid();
      return { stage: index, choiceId: choice.id, roll: record.roll };
    });
    return { playerId: player.id, records, revision: records.length + 1 + (state.deferred ? 1 : 0), deferred: state.deferred, bonusSpent: state.bonusSpent };
  });
  const joined = states.every(ready);
  if (source.joined !== joined || (!joined && (game.nodeId !== campaign.start || raw.phase !== 'opening' || states.some(state => state.bonusSpent)))) invalid();
  game.schema = 22;
  game.opening = { schema: 1, startNodeId: campaign.start, joined, states };
  for (const player of game.players) {
    const state = personalState(game, player.id), history = historyFor(game, campaign, player);
    player.openingBonus = state.bonusSpent ? 0 : earnedBonus(history);
    if (!joined) { player.health = 3 - history.reduce((sum, result) => sum + result.harm, 0); player.life = 'alive'; player.focus = true; player.revealed = false; player.revivals = 0; player.echoUsed = false; }
  }
  if (!joined) {
    game.phase = 'opening'; game.turn = 0; game.pressure = 0; game.sparks = 2;
    game.flags = {}; game.clues = []; game.inventory = []; game.spentItems = []; game.visited = [campaign.start]; game.detailsRead = {}; game.assists = []; game.reviveAttempts = {};
    game.journal = []; game.chronicle = []; game.chroniclePartial = false; game.lastResult = null; game.arrival = null;
    game.combat = null; game.completedCombats = []; game.combatRecords = {};
  }
}
