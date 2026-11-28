/**
 * A read-only presentation of an already committed combat receipt.
 * No randomness, damage rules, timers, DOM or networking belong in this module.
 * The caller deduplicates live receipts and cancels presentation on restore.
 */
const bounded = (value, fallback = 0, max = 18) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
const healthOf = player => bounded(player?.health, 0, player?.maxHealth || 3);
const receiptId = view => {
  const result = view?.lastResult;
  if (!result) return null;
  return [...(view.journal || [])].reverse().find(entry => entry.actor === result.actor && entry.action === result.action &&
    entry.text === result.text && entry.grade === result.grade && (entry.roll ?? null) === (result.roll ?? null))?.id || null;
};

export function buildCombatPresentation(beforeView, afterView, result = afterView?.lastResult) {
  const combat = beforeView?.combat;
  if (!combat || !afterView || result?.combat !== true) return null;
  if (beforeView.campaignId !== afterView.campaignId) return null;
  if (result.encounterId && result.encounterId !== combat.id) return null;
  if (afterView.combat && afterView.combat.id !== combat.id) return null;
  if (Number.isFinite(beforeView.revision) && beforeView.revision === afterView.revision) return null;
  const oldReceipt = receiptId(beforeView), newReceipt = receiptId(afterView);
  if (oldReceipt && oldReceipt === newReceipt) return null;

  const players = new Map((beforeView.players || []).map(player => [player.id, player]));
  const afterPlayers = new Map((afterView.players || []).map(player => [player.id, player]));
  // Seat identity survives duplicate display names. Old saves/servers fall back
  // to the actor in the before-board, never a fuzzy name lookup.
  const actorId = result.actorId || beforeView.activePlayerId;
  if (!players.has(actorId)) return null;
  const actorName = players.get(actorId).name || result.actor || '행동한 인물';
  const enemyName = combat.enemy?.name || '상대';
  const outcome = ['victory','defeat'].includes(result.combatEvent) ? result.combatEvent : null;
  const events = [];
  const health = new Map([...players].map(([id, player]) => [id, healthOf(player)]));
  const shields = new Map((combat.statuses || []).map(status => [status.id, bounded(status.shield,0,3)]));
  const deathIds = new Set(Array.isArray(result.deathIds) ? result.deathIds.filter(id => players.has(id)) :
    [...players].filter(([id, player]) => player.life !== 'dead' && afterPlayers.get(id)?.life === 'dead').map(([id]) => id));
  const shownDeaths = new Set();
  const nameOf = id => players.get(id)?.name || '동료';
  const add = event => events.push({ ...event, index: events.length });
  const showDeath = targetId => {
    if (!deathIds.has(targetId) || shownDeaths.has(targetId)) return;
    shownDeaths.add(targetId); health.set(targetId, 0);
    add({ type: 'death', targetId, health: 0, text: `${nameOf(targetId)} · 더는 버티지 못하고 쓰러졌다.`, sound: outcome === 'defeat' ? null : 'death', duration: 550 });
  };
  const ability = result.combatAction ? result.combatAction !== 'basic' : result.combatEvent === 'ability' || result.grade === 'automatic';
  add({ type: ability ? 'ability' : 'attack', targetId: actorId, text: `${actorName} · ${result.action || '행동'}`,
    sound: result.combatAction === 'pass' ? null : ability ? 'battle-skill' : 'battle-swing', duration: ability ? 260 : 240,
    abilityType: result.abilityType || null, stat: result.stat || players.get(actorId)?.basic?.stat || null });

  const enemyHealthBefore = bounded(result.enemyHealthBefore, bounded(combat.enemy?.health));
  const enemyHealthAfter = bounded(result.enemyHealthAfter, Math.max(0, enemyHealthBefore - bounded(result.damage)));
  const enemyDamage = Math.max(0, enemyHealthBefore - enemyHealthAfter);
  if (enemyDamage > 0) {
    const critical = result.grade === 'critical';
    add({ type: 'enemy-hit', amount: enemyDamage, enemyHealth: enemyHealthAfter, critical,
      text: critical ? `대성공! ${enemyName}에게 피해 ${enemyDamage}.` : `${enemyName}에게 피해 ${enemyDamage}.`,
      sound: critical ? 'battle-critical' : 'battle-hit', duration: critical ? 520 : 400 });
  } else if (result.grade === 'failure') {
    add({ type: 'miss', targetId: actorId, amount: 0, enemyHealth: enemyHealthAfter,
      text: '공격이 막혔다. 상대의 생명은 줄지 않았다.', sound: 'battle-miss', duration: 480 });
  } else if (result.grade === 'fumble') {
    const previous = health.get(actorId) || 0;
    const next = bounded(result.actorHealthAfter, Math.max(0, previous - 1), 3);
    const amount = bounded(result.selfDamage, Math.max(0, previous - next), 1);
    health.set(actorId, next);
    add({ type: 'fumble', targetId: actorId, amount, health: next, enemyHealth: enemyHealthAfter,
      text: `대실패. 자세가 무너져 ${actorName}의 생명이 ${amount} 줄었다.`, sound: 'battle-fumble', duration: 480 });
    if (next === 0) showDeath(actorId);
  }

  for (const effect of result.supportEffects || []) {
    if (!effect || !['heal','guard','boost','expose','stun'].includes(effect.type)) continue;
    if (['heal','guard','boost'].includes(effect.type) && !players.has(effect.targetId)) continue;
    const targetId = effect.targetId, amount = bounded(effect.amount,0,3);
    if (effect.type === 'heal') {
      const next = bounded(effect.health, health.get(targetId) || 0, 3); health.set(targetId, next);
      add({ type: 'heal', targetId, amount, health: next, text: amount ? `${nameOf(targetId)}의 생명 +${amount}.` : `${nameOf(targetId)}의 생명은 이미 가득하다.`, sound: 'battle-heal', duration: 340 });
    } else if (effect.type === 'guard') {
      const shield = bounded(effect.shield, shields.get(targetId) || 0, 3); shields.set(targetId,shield);
      add({ type: 'shield', targetId, amount, shield, blocked: 0, text: amount ? `${nameOf(targetId)}의 방어막 +${amount}.` : `${nameOf(targetId)}의 방어막은 최대치다.`, sound: 'battle-shield', duration: 320 });
    } else if (effect.type === 'boost') {
      add({ type: 'boost', targetId, value: bounded(effect.value,2,2), text: `${nameOf(targetId)}의 다음 공격 판정 +2.`, sound: null, duration: 180 });
    } else if (effect.type === 'expose') {
      add({ type: 'expose', value: bounded(effect.value,2,2), text: '약점이 드러났다. 다음 두 번의 명중 피해 +1.', sound: null, duration: 320 });
    } else {
      add({ type: 'stun', value: 1, text: '상대가 균형을 잃었다. 다음 적 행동을 한 번 막는다.', sound: 'battle-stun', duration: 320 });
    }
  }

  const enemyRolls = (result.enemyRolls || []).filter(check => players.has(check?.targetId));
  if (result.enemyPhase === 'stunned') {
    add({ type: 'enemy-stunned', text: `제압 성공. 상대의 ‘${result.enemyIntentName || combat.intent?.name || '다음 행동'}’이 중단됐다.`,
      sound: events.some(event => event.type === 'stun') ? null : 'battle-stun', duration: 420 });
  } else if (enemyRolls.length) {
    add({ type: 'enemy-attack', text: `${enemyName} · ${result.enemyIntentName || combat.intent?.name || '반격'}`,
      targetIds: enemyRolls.map(check => check.targetId), sound: 'battle-enemy', duration: 350 });
    for (const check of enemyRolls) {
      const targetId = check.targetId, previous = health.get(targetId) || 0;
      const next = bounded(check.healthAfter, Math.max(0, previous - bounded(check.damage,0,3)),3);
      const amount = bounded(check.healthDamage, Math.max(0, previous - next),3);
      const blocked = bounded(check.blocked,0,3);
      const shield = bounded(check.shieldAfter, Math.max(0,(shields.get(targetId)||0)-blocked),3);
      shields.set(targetId, shield);
      if (blocked) add({ type: 'shield', targetId, amount: blocked, blocked, shield,
        text: `${nameOf(targetId)} · 방어막으로 피해 ${blocked} 차단.`, sound: 'battle-shield', duration: 350, roll: check.roll, dc: check.dc });
      health.set(targetId,next);
      if (amount) {
        add({ type: 'player-hit', targetId, amount, health: next, shield, blocked,
          text: `${nameOf(targetId)} · 공격을 받아 생명 −${amount}.`, sound: 'battle-hurt', duration: 380, roll: check.roll, dc: check.dc });
        if (next === 0) showDeath(targetId);
      } else if (!blocked) {
        add({ type: 'dodge', targetId, amount: 0, health: next,
          text: `${nameOf(targetId)} · 상대의 공격을 피했다.`, sound: 'battle-miss', duration: 330, roll: check.roll, dc: check.dc });
      }
    }
  }
  for (const targetId of deathIds) showDeath(targetId);

  if (outcome === 'victory') {
    const recovery = Array.isArray(result.recovery) ? result.recovery : [...afterPlayers].filter(([id, player]) => player.life !== 'dead' && health.has(id)).map(([targetId, player]) => ({ targetId, amount: Math.max(0,healthOf(player)-(health.get(targetId)||0)), health: healthOf(player) }));
    for (const effect of recovery) {
      if (!players.has(effect.targetId) || deathIds.has(effect.targetId) || afterPlayers.get(effect.targetId)?.life === 'dead') continue;
      const amount = bounded(effect.amount,0,1), next = bounded(effect.health,health.get(effect.targetId)||0,3);
      health.set(effect.targetId,next);
      if (amount) add({ type: 'recovery', targetId: effect.targetId, amount, health: next,
        text: `${nameOf(effect.targetId)} · 숨을 고르며 생명 +${amount}.`, sound: null, duration: 180 });
    }
    add({ type: 'victory', enemyHealth: 0, text: '위협을 막아냈다. 이제 열린 길로 나아갈 수 있다.', sound: 'battle-victory', duration: 900 });
  } else if (outcome === 'defeat') {
    add({ type: 'defeat', text: '일행의 마지막 숨이 멎었다. 이번 여정은 여기에서 끝난다.', sound: 'battle-defeat', duration: 1000 });
  }
  return { encounterId: combat.id, actorId, actorName, action: result.action || '', grade: result.grade,
    outcome, round: combat.round || 1, enemyName, initialEnemyHealth: enemyHealthBefore, finalEnemyHealth: enemyHealthAfter, events };
}
