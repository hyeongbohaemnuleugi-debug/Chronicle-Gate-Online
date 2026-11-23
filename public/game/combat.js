/** Pure combat rules. The server/local controller supplies every die; payloads supply no outcomes. */
import { getClass } from './professions.js';

const copy = value => JSON.parse(JSON.stringify(value));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const integer = (value, fallback, min, max) => Number.isInteger(value) ? clamp(value, min, max) : fallback;
const clean = (v, n = 220) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);
const living = game => game.players.filter(p => p.life !== 'dead');
const failure = error => ({ ok: false, error });
const encounterFor = (game, campaign) => campaign.nodes[game.nodeId]?.encounter;
const BASIC_DC = 11;
const ABILITY_TYPES = new Set(['strike', 'drain', 'expose', 'stun', 'guard', 'heal', 'rally']);
const rolledAbility = type => type === 'strike' || type === 'drain';
const STAT_NAMES = { might: '힘', agility: '민첩', wit: '통찰', heart: '교섭' };

function note(combat, text, kind = 'action') {
  combat.log.push({ text, kind });
  combat.log = combat.log.slice(-12);
}
function pickIntent(game, encounter) {
  const move = encounter.intents[(game.combat.round - 1) % encounter.intents.length];
  const people = living(game);
  let targets;
  if (move.target === 'all') targets = people;
  else if (move.target === 'weakest') targets = [...people].sort((a, b) => a.health - b.health).slice(0, 1);
  else targets = [game.players[game.activeIndex]].filter(p => p && p.life !== 'dead');
  game.combat.intentTargetIds = targets.map(p => p.id);
}
export function startCombat(game, campaign) {
  const encounter = encounterFor(game, campaign);
  if (game.phase !== 'playing' || !encounter || game.combat || game.completedCombats?.includes(encounter.id)) return;
  const entryCount = living(game).length;
  if (!entryCount) return;
  const enemyMaxHealth = 2 + 4 * entryCount;
  game.combat = {
    id: encounter.id, nodeId: game.nodeId, round: 1, entryCount,
    enemyHealth: enemyMaxHealth, enemyMaxHealth, actedIds: [], usedAbilityIds: [],
    shields: {}, boosts: {}, vulnerable: 0, staggered: false, intentTargetIds: [],
    log: [{ text: encounter.intro.join(' '), kind: 'start' }], fallenIds: [],
  };
  game.assists = [];
  pickIntent(game, encounter);
}
function intentView(game, encounter) {
  const move = encounter.intents[(game.combat.round - 1) % encounter.intents.length];
  return { ...move, targetIds: [...game.combat.intentTargetIds] };
}
export function combatView(game, campaign, viewerId) {
  if (!game.combat) return null;
  const encounter = encounterFor(game, campaign);
  if (!encounter) return null;
  const player = game.players.find(p => p.id === viewerId);
  const profession = player && getClass(campaign, player.classId);
  const used = game.combat.usedAbilityIds.includes(viewerId);
  return {
    id: encounter.id, title: encounter.title, intro: [...encounter.intro], round: game.combat.round,
    enemy: { name: encounter.enemyName, description: encounter.enemyDescription, health: game.combat.enemyHealth, maxHealth: game.combat.enemyMaxHealth },
    intent: intentView(game, encounter), actedIds: [...game.combat.actedIds], usedAbilityIds: [...game.combat.usedAbilityIds],
    actions: profession ? {
      basic: { name: profession.basic.name, description: `${profession.basic.text} D20 + ${STAT_NAMES[profession.basic.stat]} ≥ ${BASIC_DC}: 피해 2 · 대가 있는 성공 1 · 대성공 3.`, stat: profession.basic.stat },
      ability: { ...profession.ability, available: !used && player.life !== 'dead' },
    } : null,
    targetOptions: living(game).map(({ id, name, health, maxHealth }) => ({ id, name, health, maxHealth })),
    statuses: game.players.map(p => ({ id: p.id, shield: game.combat.shields[p.id] || 0, boost: game.combat.boosts[p.id] || 0 })),
    vulnerable: game.combat.vulnerable, staggered: game.combat.staggered, log: copy(game.combat.log),
    canAct: Boolean(player?.life === 'alive' && game.players[game.activeIndex]?.id === viewerId && game.phase === 'playing'),
  };
}
export function previewCombat(game, campaign, actor, payload = {}) {
  const combat = game.combat, encounter = encounterFor(game, campaign);
  if (!combat || !encounter) return failure('지금은 전투 중이 아닙니다.');
  if (!['basic', 'ability'].includes(payload.combatAction)) return failure('전투 중에는 기본 공격 또는 직업 능력을 선택해 주세요. 적을 제압하면 이야기의 선택지가 다시 열립니다.');
  if (combat.actedIds.includes(actor.id)) return failure('이번 라운드에는 이미 행동했습니다.');
  const job = getClass(campaign, actor.classId);
  const ability = payload.combatAction === 'ability';
  const move = ability ? job.ability : job.basic;
  if (!move || (ability && !ABILITY_TYPES.has(move.type))) return failure('직업의 전투 행동을 찾을 수 없습니다.');
  if (ability && combat.usedAbilityIds.includes(actor.id)) return failure('직업 능력은 전투마다 한 번 사용할 수 있습니다. 기본 공격은 계속 사용할 수 있습니다.');
  const automatic = ability && !rolledAbility(move.type);
  let targetId = null;
  if (ability && move.target === 'ally') {
    targetId = payload.targetId || actor.id;
    if (!game.players.some(p => p.id === targetId && p.life !== 'dead')) return failure('살아 있는 동료를 선택해 주세요. 자신도 선택할 수 있습니다. 이 능력으로 부활할 수는 없습니다.');
  } else if (ability && move.target === 'self') {
    if (payload.targetId && payload.targetId !== actor.id) return failure('이 능력의 대상은 자신입니다.');
    targetId = actor.id;
  } else if (payload.targetId) return failure('이 행동은 동료 한 명을 대상으로 지정하지 않습니다.');
  const stat = automatic ? null : (move.stat || job.basic.stat);
  const assistance = automatic ? 0 : Math.min(2, game.assists.filter(id => id !== actor.id && game.players.some(p => p.id === id && p.connected !== false)).length);
  const spendSpark = !automatic && payload.spendSpark === true;
  const flashback = automatic ? '' : clean(payload.flashback, 180);
  if (spendSpark && game.sparks < 1) return failure('남은 운명 토큰이 없습니다.');
  if (flashback && !actor.focus) return failure('이 캐릭터의 회상은 이미 사용했습니다.');
  if (flashback && flashback.length < 8) return failure('어떤 준비를 해 두었는지 회상을 8자 이상 적어 주세요.');
  const classBonus = automatic ? 0 : job.stats[stat] || 0;
  const boost = automatic ? 0 : combat.boosts[actor.id] || 0;
  const bonus = classBonus + assistance + boost + (spendSpark ? 3 : 0) + (flashback ? 2 : 0);
  const intent = intentView(game, encounter);
  const targetNames = intent.targetIds.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean).join(', ');
  const damage = ability && move.type === 'strike' ? 3 : 2;
  const risk = `${automatic ? move.description : `성공: 적에게 피해 ${damage}, 대가 있는 성공: 피해 1, 실패: 피해 없음.`} ${ability ? '사용하면 성공·실패와 관계없이 이번 전투의 능력 1회를 소모합니다. ' : ''}라운드가 끝나면 ${encounter.enemyName}의 ‘${intent.name}’: ${targetNames}에게 D20 ${intent.dc} 이상이면 생명 ${intent.damage} 피해. 생명 0은 사망이며 전원 사망 시 즉시 결말입니다.${combat.staggered ? ' 다음 적 행동은 기절로 취소될 예정입니다.' : ''}`;
  return { ok: true, plan: {
    type: 'combat', combatAction: payload.combatAction, targetId, label: move.name,
    stat, statLabel: STAT_NAMES[stat] || '확정 효과', dc: automatic ? 0 : BASIC_DC, bonus, automatic,
    assistance, classBonus, boost, spendSpark, flashback, pressurePenalty: 0,
    risk, harmRisk: intent.damage, groupHarm: intent.target === 'all' ? intent.damage : 0,
    successChance: automatic ? 100 : Array.from({ length: 20 }, (_, i) => i + 1).filter(d => d === 20 || (d !== 1 && d + bonus >= BASIC_DC)).length * 5,
    mixedChance: automatic ? 0 : Array.from({ length: 20 }, (_, i) => i + 1).filter(d => d !== 1 && d !== 20 && d + bonus < BASIC_DC && d + bonus >= BASIC_DC - 2).length * 5,
    revision: game.revision, requiresConfirmation: true,
  } };
}
function rollDie(roll) {
  const die = typeof roll === 'function' ? roll() : roll;
  if (!Number.isInteger(die) || die < 1 || die > 20) throw new Error('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
  return die;
}
function selectPending(game) {
  const pending = game.players.filter(p => p.life !== 'dead' && !game.combat.actedIds.includes(p.id));
  if (!pending.length) return false;
  const candidate = pending.find(p => p.connected !== false) || pending[0];
  game.activeIndex = game.players.findIndex(p => p.id === candidate.id);
  return true;
}
function endInDefeat(game, campaign, encounter, result) {
  const combat = game.combat;
  result.combatEvent = 'defeat';
  result.text += ` ${encounter.defeatText}`;
  game.combatRecords[encounter.id] = { result: 'defeat', rounds: combat.round, fallenIds: [...combat.fallenIds], usedAbilityIds: [...combat.usedAbilityIds] };
  game.deathSceneTitle = encounter.title;
  game.nodeId = '__all_dead__';
  game.phase = 'ended';
  game.combat = null;
}
function endInVictory(game, campaign, encounter, result) {
  const combat = game.combat;
  game.completedCombats.push(encounter.id);
  game.combatRecords[encounter.id] = { result: 'victory', rounds: combat.round, fallenIds: [...combat.fallenIds], usedAbilityIds: [...combat.usedAbilityIds] };
  if (encounter.victoryFlag) game.flags[encounter.victoryFlag] = true;
  game.pressure = Math.max(0, game.pressure - 1);
  game.sparks = Math.min(4, game.sparks + 1);
  for (const p of living(game)) p.health = Math.min(p.maxHealth, p.health + 1);
  result.combatEvent = 'victory';
  result.text += ` ${encounter.victoryText} 살아 있는 일행은 숨을 고르며 생명을 1씩 회복합니다. 위기 −1, 운명 토큰 +1. 사망한 동료는 자동으로 부활하지 않습니다.`;
  const actorIndex = game.activeIndex;
  for (let offset = 1; offset <= game.players.length; offset++) {
    const next = (actorIndex + offset) % game.players.length;
    if (game.players[next].life !== 'dead' && game.players[next].connected !== false) { game.activeIndex = next; break; }
  }
  if (game.players[game.activeIndex].life === 'dead') game.activeIndex = game.players.findIndex(p => p.life !== 'dead');
  game.combat = null;
}
function finishCombatTurn(game, campaign, actor, result, roll) {
  const encounter = encounterFor(game, campaign), combat = game.combat;
  game.assists = [];
  game.turn++;
  game.revision++;
  if (combat.enemyHealth <= 0) { endInVictory(game, campaign, encounter, result); return; }
  if (!combat.actedIds.includes(actor.id)) combat.actedIds.push(actor.id);
  if (selectPending(game)) return;
  const intent = intentView(game, encounter);
  if (combat.staggered) {
    combat.staggered = false;
    const text = `적의 ‘${intent.name}’이 중단됩니다. 이번 라운드에는 반격하지 못합니다.`;
    result.text += ` ${text}`; note(combat, text, 'enemy');
  } else {
    const lines = [];
    for (const id of intent.targetIds) {
      const target = game.players.find(p => p.id === id && p.life !== 'dead');
      if (!target) continue;
      const die = rollDie(roll);
      let damage = die === 1 || (die !== 20 && die < intent.dc) ? 0 : intent.damage;
      const shield = Math.min(combat.shields[id] || 0, damage);
      damage -= shield; combat.shields[id] = (combat.shields[id] || 0) - shield;
      target.health = Math.max(0, target.health - damage);
      result.enemyRolls.push({ targetId: id, roll: die, dc: intent.dc, damage, blocked: shield });
      const hitText = damage ? `생명 ${damage} 피해` : shield ? `방어막이 피해 ${shield} 차단` : '회피';
      lines.push(`${target.name}: 적 D20 ${die}/${intent.dc} → ${hitText}`);
      if (!target.health) {
        target.life = 'dead'; target.echoUsed = false;
        combat.fallenIds.push(id); result.deaths.push(target.name);
        lines.push(`${target.name} 사망. 부활 장소에 도달하면 남은 동료가 귀환을 시도할 수 있습니다.`);
      }
    }
    const text = `${encounter.enemyName} · ${intent.name}. ${lines.join(' · ')}`;
    result.text += ` ${text}`; note(combat, text, 'enemy');
  }
  if (!living(game).length) { endInDefeat(game, campaign, encounter, result); return; }
  combat.round++;
  combat.actedIds = [];
  selectPending(game);
  pickIntent(game, encounter);
}
/** Mutates only the engine's cloned transaction. An invalid RNG throws before it can be committed. */
export function applyCombatAction(game, campaign, actorId, plan, { roll, gradeRoll }) {
  const actor = game.players.find(p => p.id === actorId), combat = game.combat;
  const job = getClass(campaign, actor.classId);
  const isAbility = plan.combatAction === 'ability';
  const move = isAbility ? job.ability : job.basic;
  const die = plan.automatic ? null : rollDie(roll);
  const grade = plan.automatic ? 'automatic' : gradeRoll(die, die + plan.bonus, plan.dc);
  const hit = grade !== 'failure';
  let damage = 0;
  const notes = [];
  if (plan.spendSpark) game.sparks--;
  if (plan.flashback) actor.focus = false;
  if (grade === 'critical') game.sparks = Math.min(4, game.sparks + 1);
  if (!plan.automatic) combat.boosts[actorId] = 0;
  if (isAbility) combat.usedAbilityIds.push(actorId);
  if (!isAbility || rolledAbility(move.type)) {
    damage = !hit ? 0 : grade === 'mixed' ? 1 : grade === 'critical' ? (move.type === 'strike' ? 4 : 3) : (move.type === 'strike' ? 3 : 2);
    if (damage && combat.vulnerable > 0) { damage++; combat.vulnerable--; notes.push('드러난 약점을 찔러 피해 +1'); }
    if (isAbility && move.type === 'drain' && hit) { actor.health = Math.min(actor.maxHealth, actor.health + 1); notes.push(`${actor.name} 생명 1 회복`); }
  } else {
    damage = 1;
    const target = game.players.find(p => p.id === (plan.targetId || actorId));
    if (move.type === 'guard') { combat.shields[target.id] = Math.min(3, (combat.shields[target.id] || 0) + 2); notes.push(`${target.name} 방어막 +2 (최대 3)`); }
    if (move.type === 'heal') { target.health = Math.min(target.maxHealth, target.health + 1); combat.shields[target.id] = Math.min(3, (combat.shields[target.id] || 0) + 1); notes.push(`${target.name} 생명 1 회복 · 방어막 +1 (최대 3)`); }
    if (move.type === 'expose') { combat.vulnerable = Math.max(combat.vulnerable, 2); notes.push('다음 두 번의 명중에 피해 +1'); }
    if (move.type === 'stun') { combat.staggered = true; notes.push('다음 적 행동을 한 번 중단 (중첩되지 않음)'); }
    if (move.type === 'rally') { for (const p of living(game)) combat.boosts[p.id] = 2; notes.push('살아 있는 일행의 다음 공격 판정 +2 (중첩되지 않음)'); }
  }
  combat.enemyHealth = Math.max(0, combat.enemyHealth - damage);
  const narration = grade === 'failure' ? `‘${move.name}’을 시도했지만 적의 대응에 막혔습니다. 피해를 주지 못했습니다.` : `${move.text} 적에게 피해 ${damage}.`;
  const text = `${actor.name} · ${move.name}. ${narration}${notes.length ? ' ' + notes.join(' · ') + '.' : ''}`;
  note(combat, text, isAbility ? 'ability' : 'attack');
  const result = {
    action: move.name, actor: actor.name, text, grade, roll: die, total: die == null ? null : die + plan.bonus,
    dc: plan.dc, bonus: plan.bonus, stat: plan.stat, assistance: plan.assistance, spentSpark: plan.spendSpark,
    flashback: plan.flashback, gainedSpark: grade === 'critical', fromSceneId: game.nodeId,
    combat: true, combatEvent: isAbility ? 'ability' : 'attack', damage, targetId: plan.targetId,
    enemyRolls: [], deaths: [],
  };
  finishCombatTurn(game, campaign, actor, result, roll);
  game.lastResult = result;
  return result;
}
export function skipCombatTurn(game, campaign, { roll }) {
  const actor = game.players[game.activeIndex];
  game.combat.shields[actor.id] = Math.min(3, (game.combat.shields[actor.id] || 0) + 1);
  const result = { action: '연결이 끊긴 동료의 차례 넘기기', actor: actor.name, text: `${actor.name}은 방어막 1을 얻고 이번 라운드의 차례를 마칩니다.`, grade: 'automatic', roll: null, total: null, dc: 0, bonus: 0, combat: true, combatEvent: 'ability', enemyRolls: [], deaths: [] };
  note(game.combat, result.text, 'guard');
  finishCombatTurn(game, campaign, actor, result, roll);
  game.lastResult = result;
  return result;
}
export function restoreCombat(game, campaign, raw) {
  const encounters = Object.values(campaign.nodes).map(n => n.encounter).filter(Boolean);
  game.completedCombats = [];
  game.combatRecords = {};
  game.combat = null;
  const ids = new Set(game.players.map(p => p.id));
  const validIds = list => [...new Set(Array.isArray(list) ? list.filter(id => ids.has(id)) : [])];
  for (const encounter of encounters) {
    const visited = game.visited.includes(encounter.nodeId);
    if (raw.schema === 14 && visited) game.completedCombats.push(encounter.id);
    else if (visited && Array.isArray(raw.completedCombats) && raw.completedCombats.includes(encounter.id)) game.completedCombats.push(encounter.id);
    const record = raw.combatRecords?.[encounter.id];
    if (record && ['victory', 'defeat'].includes(record.result)) game.combatRecords[encounter.id] = {
      result: record.result, rounds: integer(record.rounds, 1, 1, 500), fallenIds: validIds(record.fallenIds), usedAbilityIds: validIds(record.usedAbilityIds),
    };
  }
  if (raw.schema === 14 || game.phase !== 'playing') return;
  const encounter = encounterFor(game, campaign);
  if (raw.combat) {
    const state = raw.combat;
    if (!encounter || state.id !== encounter.id || state.nodeId !== game.nodeId || game.completedCombats.includes(encounter.id)) throw new Error('저장 파일의 전투 위치가 맞지 않습니다.');
    const entryCount = integer(state.entryCount, game.players.length, 1, game.players.length);
    const enemyMaxHealth = 2 + entryCount * 4;
    if (!Number.isInteger(state.enemyHealth) || state.enemyHealth < 1 || state.enemyHealth > enemyMaxHealth) throw new Error('저장 파일의 적 생명력이 올바르지 않습니다.');
    game.combat = {
      id: encounter.id, nodeId: game.nodeId, round: integer(state.round, 1, 1, 500), entryCount,
      enemyHealth: state.enemyHealth, enemyMaxHealth, actedIds: validIds(state.actedIds), usedAbilityIds: validIds(state.usedAbilityIds),
      shields: {}, boosts: {}, vulnerable: integer(state.vulnerable, 0, 0, 2), staggered: state.staggered === true,
      intentTargetIds: validIds(state.intentTargetIds), fallenIds: validIds(state.fallenIds),
      log: Array.isArray(state.log) ? state.log.slice(-12).map(e => ({ text: clean(e?.text, 1800), kind: clean(e?.kind, 20) })) : [],
    };
    for (const id of ids) {
      game.combat.shields[id] = integer(state.shields?.[id], 0, 0, 3);
      game.combat.boosts[id] = integer(state.boosts?.[id], 0, 0, 2);
    }
    if (!game.combat.intentTargetIds.length) pickIntent(game, encounter);
    if (game.combat.actedIds.includes(game.players[game.activeIndex].id)) {
      if (!selectPending(game)) throw new Error('전투 라운드의 차례 정보가 맞지 않습니다.');
    }
  } else startCombat(game, campaign);
}
/** Importing a save into a new online lobby assigns new seat IDs to every combat reference. */
export function remapCombatPlayers(game, mapping) {
  const remap = list => (list || []).map(id => mapping[id]).filter(Boolean);
  game.assists = remap(game.assists);
  if (game.combat) {
    for (const key of ['actedIds', 'usedAbilityIds', 'intentTargetIds', 'fallenIds']) game.combat[key] = remap(game.combat[key]);
    for (const key of ['shields', 'boosts']) game.combat[key] = Object.fromEntries(Object.entries(game.combat[key]).filter(([id]) => mapping[id]).map(([id, value]) => [mapping[id], value]));
  }
  for (const record of Object.values(game.combatRecords || {})) {
    record.fallenIds = remap(record.fallenIds); record.usedAbilityIds = remap(record.usedAbilityIds);
  }
  const remapResult = result => {
    if (!result) return;
    if (result.targetId) result.targetId = mapping[result.targetId] || null;
    if (result.revivedId) result.revivedId = mapping[result.revivedId] || null;
    if (result.enemyRolls) result.enemyRolls = result.enemyRolls.map(r=>({...r,targetId:mapping[r.targetId]})).filter(r=>r.targetId);
  };
  for (const entry of game.journal || []) remapResult(entry);
  // validateSave points lastResult at the last journal item; remap it only once.
  if (game.lastResult && !(game.journal || []).includes(game.lastResult)) remapResult(game.lastResult);
}
