/** Behavioral combat checks. Synthetic scenes isolate rules; real stories verify coverage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../public/game/engine.js';
import { LEGACY_CAMPAIGNS as CAMPAIGNS, LEGACY_CATALOG as CATALOG } from '../public/game/campaigns/index.js';

const clone = value => structuredClone(value);
const TYPES = ['strike', 'drain', 'expose', 'stun', 'guard', 'heal', 'rally'];
const MAINS = ['might', 'agility', 'wit', 'heart'];
const abilityTarget = type => ['guard', 'heal'].includes(type) ? 'ally' : type === 'rally' ? 'all' : 'enemy';
function fixture(types = ['strike', 'guard', 'heal', 'rally'], intent = {}) {
  const classes = Array.from({ length: 4 }, (_, index) => {
    const main = MAINS[index];
    const stats = Object.fromEntries(MAINS.map((stat, i) => [stat, i === index ? 3 : [1, 2].includes((i - index + 4) % 4) ? 1 : 0]));
    const type = types[index % types.length];
    return {
      id: `fixture-${index}-${type}`, name: `검증 직업 ${index + 1}`, description: '실제 판정 검증용 직업', stats,
      basic: { name: `기본 행동 ${index + 1}`, stat: main, text: '방해 장치의 중심을 공격한다.' },
      ability: { name: `${type} 기술`, type, stat: main, target: abilityTarget(type), text: `${type} 기술을 실행한다.`, description: `${type}는 전투당 한 번만 사용할 수 있다.` },
    };
  });
  const encounter = {
    id: 'test-mechanism', nodeId: 'arena', title: '깨어난 통제 장치',
    intro: ['통제 장치가 출구를 잠근다.', '위험 표시등이 다음 공격 대상을 가리킨다.'],
    enemyName: '통제 장치', enemyDescription: '사람을 막는 기계 장치',
    victoryText: '통제 장치가 멎고 출구 잠금이 풀린다.', defeatText: '일행을 지켜 줄 사람이 남지 않았다.',
    intents: [{ name: '예고된 타격', text: '표시된 대상에게 타격을 준비한다.', target: 'weakest', damage: 1, dc: 12, ...intent }],
    victoryFlag: 'device_stopped', victoryFlagLabel: '통제 장치를 멈췄다', victoryCallback: '통제 장치는 다시 작동하지 않는다.',
  };
  return {
    id: 'combat-fixture', title: '전투 검증 이야기', start: 'arena', pressureMax: 8, pressureLabel: '위기', classes,
    roles: classes.map((_, i) => ({ title: `비밀 ${i}`, secret: `개인 정보 ${i}`, goal: '안전하게 나가기', reveal: `공개 정보 ${i}` })),
    clues: { latch: { title: '풀린 잠금', text: '장치가 멎으면 출구를 열 수 있다.' } },
    flags: { device_stopped: '통제 장치를 멈췄다' },
    deathEnding: { title: '일행 전멸', text: ['마지막 동료가 쓰러졌다.', '이번 이야기는 여기에서 끝난다.'], art: 2, mood: 'danger' },
    nodes: {
      before: { id: 'before', title: '입구', text: ['장치 앞에 도착한다.'], entities: [], details: [], choices: [{ id: 'enter', label: '장치 앞으로 간다', automatic: true, outcomes: { success: { text: '통제 장치가 깨어난다.', next: 'arena' } } }] },
      arena: {
        id: 'arena', title: '잠긴 출구', chapter: 2, text: ['전투가 끝나면 이 이야기 본문으로 돌아온다.'],
        mood: 'mystery', entities: [{ id: 'exit', label: '출구', kind: 'place' }],
        details: [{ id: 'latch', label: '잠금 확인', text: '장치가 멎으면 출구를 열 수 있다.', clue: 'latch' }],
        resurrection: { label: '검증용 부활', text: '의식이 돌아온다.', sparkCost: 1, pressureCost: 2, dc: 12 },
        encounter,
        choices: [{ id: 'leave', label: '풀린 출구로 나간다', automatic: true, requires: { flag: 'device_stopped' }, outcomes: { success: { text: '밖으로 나왔다.', next: 'ending' } } }],
      },
      ending: { id: 'ending', title: '밖으로', chapter: 4, text: ['돌아왔다.'], ending: true, choices: [] },
    },
  };
}
function party(campaign, count = 4) {
  return campaign.classes.slice(0, count).map((job, index) => ({ id: `p${index}`, name: `동료${index + 1}`, classId: job.id, connected: true }));
}
function start(campaign = fixture(), count = 4) {
  const game = engine.createStoryState(campaign, party(campaign, count));
  assert.ok(engine.viewGame(game, campaign, game.players[game.activeIndex].id).combat, 'Encounter must start when its scene is entered.');
  return game;
}
const actorId = game => game.players[game.activeIndex].id;
const view = (game, campaign, id = actorId(game)) => engine.viewGame(game, campaign, id);
function act(game, campaign, payload, rolls = 8, id = actorId(game)) {
  const original = JSON.stringify(game);
  const result = engine.applyAction(game, campaign, id, { ...payload, revision: game.revision }, { roll: rolls });
  assert.equal(result.ok, true, result.error);
  assert.equal(JSON.stringify(game), original, 'Rules must return a new state without mutating the previous save.');
  return result.game;
}
function scriptedRolls(values) {
  const pending = [...values]; let calls = 0;
  const next = () => { calls++; assert.ok(pending.length, 'Unexpected extra die roll.'); return pending.shift(); };
  next.calls = () => calls;
  return next;
}
function rejectedWithoutChange(game, campaign, id, payload) {
  const before = JSON.stringify(game);
  const result = engine.applyAction(game, campaign, id, { ...payload, revision: game.revision }, { roll: () => { throw new Error('Rejected action consumed a die.'); } });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(game), before);
  return result;
}
function combatProjection(game, campaign, id) {
  return { combat: view(game, campaign, id).combat, players: game.players.map(p => ({ id: p.id, classId: p.classId, health: p.health, life: p.life })), activePlayerId: actorId(game) };
}

// The content assertions intentionally inspect playable structure, not source code strings.
test('seven stories expose 28 distinct themed professions and combat on every ordinary ending path', () => {
  assert.equal(CAMPAIGNS.length, 7);
  const ids = new Set();
  const allowed = new Set(TYPES);
  const encounteredAbilities = new Set();
  for (const campaign of CAMPAIGNS) {
    const jobs = engine.getClasses(campaign);
    assert.equal(jobs.length, 4, campaign.id);
    assert.deepEqual(CATALOG.find(c => c.id === campaign.id).classes, jobs);
    assert.equal(CATALOG.find(c => c.id === campaign.id).combatCount, 1);
    for (const job of jobs) {
      assert.ok(!ids.has(job.id), `Profession reused across stories: ${job.id}`); ids.add(job.id);
      assert.ok(job.name && job.description && job.basic?.name && job.ability?.name);
      assert.ok(allowed.has(job.ability.type)); encounteredAbilities.add(job.ability.type);
      assert.equal(Object.values(job.stats).reduce((sum, n) => sum + n, 0), 5);
      assert.ok(MAINS.every(stat => Number.isInteger(job.stats[stat]) && job.stats[stat] >= 0 && job.stats[stat] <= 3));
      assert.equal(job.stats[job.basic.stat], 3);
    }
    const encounters = Object.values(campaign.nodes).filter(node => node.encounter);
    assert.equal(encounters.length, 1, campaign.id);
    assert.ok(encounters[0].encounter.enemyName && encounters[0].encounter.victoryText);
    const seen = new Set(), reached = new Set();
    function walk(id, fought = false) {
      const node = campaign.nodes[id]; assert.ok(node, `Missing node ${campaign.id}/${id}`);
      const hasFight = fought || Boolean(node.encounter), key = `${id}:${hasFight}`;
      if (seen.has(key)) return; seen.add(key);
      if (node.ending) { assert.equal(hasFight, true, `Ending bypasses combat: ${campaign.id}/${id}`); reached.add(id); }
      for (const choice of node.choices || []) for (const outcome of Object.values(choice.outcomes || {})) walk(outcome.next, hasFight);
    }
    walk(campaign.start);
    assert.equal(reached.size, Object.values(campaign.nodes).filter(node => node.ending).length);
  }
  assert.equal(ids.size, 28);
  assert.deepEqual([...encounteredAbilities].sort(), [...TYPES].sort());
});

test('profession lookup and normalization keep choices inside the current campaign', () => {
  const first = CAMPAIGNS[0], second = CAMPAIGNS[1];
  for (let i = 0; i < 4; i++) {
    const own = engine.getClasses(first)[i];
    assert.equal(engine.getClass(first, own.id).id, own.id);
    assert.equal(engine.normalizeClassId(first, own.id, 0), own.id);
    assert.equal(engine.normalizeClassId(second, 'unknown-profession', i), engine.getClasses(second)[i].id);
  }
  assert.ok(!engine.getClass(first, engine.getClasses(second)[0].id));
});

test('combat starts on entry and scales with the living party, including solo', () => {
  for (const count of [1, 2, 4]) {
    const c = fixture(), g = start(c, count), v = view(g, c);
    assert.equal(v.combat.enemy.health, 2 + 4 * count);
    assert.equal(v.combat.enemy.maxHealth, 2 + 4 * count);
    assert.equal(v.combat.round, 1);
    assert.ok(v.combat.intent.name && v.combat.intent.text);
    assert.ok(v.combat.intent.targetIds.length >= 1);
  }
  const c = fixture(); c.start = 'before';
  let g = engine.createStoryState(c, party(c));
  assert.equal(view(g, c).combat, null);
  g.players[3].life = 'dead'; g.players[3].health = 0;
  g = act(g, c, { choiceId: 'enter' });
  assert.equal(view(g, c).combat.enemy.maxHealth, 14, 'A dead participant must not scale the encounter.');
});

test('story actions, observations and resurrection cannot bypass an active fight', () => {
  const c = fixture(), g = start(c), id = actorId(g), v = view(g, c);
  assert.deepEqual(v.scene.choices, []);
  assert.deepEqual(v.scene.details, []);
  assert.equal(v.scene.resurrection, null);
  assert.equal(v.scene.mood, 'danger');
  assert.deepEqual(v.scene.text, c.nodes.arena.encounter.intro);
  for (const payload of [{ choiceId: 'leave' }, { detailId: 'latch' }, { text: '출구로 나간다' }, { reviveId: 'p1' }]) rejectedWithoutChange(g, c, id, payload);
  assert.equal(engine.revealSecret(g, c, id).ok, true, 'Roleplay reveal remains available.');
  assert.equal(engine.assist(g, 'p1').ok, true, 'A teammate may still help.');
});

for (const [die, damage] of [[1, 0], [6, 0], [8, 2], [20, 3]]) {
  test(`basic attack: D20 ${die} yields ${damage} damage without a premature enemy phase`, () => {
    const c = fixture(), g = start(c, 2), before = view(g, c).combat.enemy.health;
    const rolls = scriptedRolls([die]);
    const next = act(g, c, { combatAction: 'basic' }, rolls);
    assert.equal(view(next, c).combat.enemy.health, before - damage);
    assert.equal(next.lastResult.roll, die);
    assert.equal(next.lastResult.combat, true);
    assert.equal(next.lastResult.bonus, 3);
    assert.equal(rolls.calls(), 1);
    assert.deepEqual(next.players.map(p => p.health), [die===1?2:3, 3]);
    assert.equal(next.lastResult.grade, die===1?'fumble':die===20?'critical':die===6?'failure':'success');
    if (die === 20) assert.equal(next.sparks, Math.min(4, g.sparks + 1));
  });
}

for (const type of ['strike', 'drain']) for (const [die, damage] of [[1, 0], [6, 0], [8, type === 'strike' ? 3 : 2], [20, type === 'strike' ? 4 : 3]]) {
  test(`${type}: rolled outcome ${die} has its declared effect`, () => {
    const c = fixture([type]), g = start(c, 2); g.players[0].health = 1;
    const initialEnemy = view(g, c).combat.enemy.health;
    const next = act(g, c, { combatAction: 'ability' }, scriptedRolls([die]));
    assert.equal(view(next, c).combat.enemy.health, initialEnemy - damage);
    assert.equal(next.players[0].health, die === 1 ? 0 : type === 'drain' && damage > 0 ? 2 : 1);
    assert.ok(view(next, c, 'p0').combat.usedAbilityIds.includes('p0'));
  });
}

for (const type of TYPES) {
  test(`${type} is one use per combat and cannot be reset by passing through a round`, () => {
    const c = fixture([type]), g = start(c, 2);
    const payload = { combatAction: 'ability', ...(['guard', 'heal'].includes(type) ? { targetId: 'p0' } : {}) };
    let next = act(g, c, payload, 8);
    assert.equal(view(next, c, 'p0').combat.actions.ability.available, false);
    next = act(next, c, { combatAction: 'basic' }, 2); // The enemy also rolls 1 and misses.
    assert.equal(actorId(next), 'p0');
    rejectedWithoutChange(next, c, 'p0', payload);
  });
}

test('expose boosts exactly the next two successful attacks, not misses', () => {
  const c = fixture(['expose']), g = start(c, 2);
  let next = act(g, c, { combatAction: 'ability' });
  assert.equal(view(next, c).combat.enemy.health, 9);
  next = act(next, c, { combatAction: 'basic' }, 2);
  assert.equal(view(next, c).combat.enemy.health, 9);
  next = act(next, c, { combatAction: 'basic' }, 8);
  assert.equal(view(next, c).combat.enemy.health, 6);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([8, 1]));
  assert.equal(view(next, c).combat.enemy.health, 3);
  next = act(next, c, { combatAction: 'basic' }, 8);
  assert.equal(view(next, c).combat.enemy.health, 1);
});

test('stun skips the next enemy phase only; the following phase still attacks', () => {
  const c = fixture(['stun']), g = start(c, 2);
  let next = act(g, c, { combatAction: 'ability' });
  assert.equal(view(next, c).combat.staggered, true);
  const skippedRoll = scriptedRolls([2]);
  next = act(next, c, { combatAction: 'basic' }, skippedRoll);
  assert.equal(skippedRoll.calls(), 1);
  assert.equal(view(next, c).combat.staggered, false);
  assert.equal(next.players.reduce((sum, p) => sum + p.health, 0), 6);
  next = act(next, c, { combatAction: 'basic' }, 2);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20]));
  assert.equal(next.players.reduce((sum, p) => sum + p.health, 0), 5);
});

for (const type of ['guard', 'heal']) {
  test(`${type} accepts living allies/self, rejects dead or foreign targets without spending the skill`, () => {
    const c = fixture([type]), g = start(c, 3);
    g.players[2].health = 0; g.players[2].life = 'dead';
    for (const targetId of ['p2', 'outsider', 'test-mechanism']) rejectedWithoutChange(g, c, 'p0', { combatAction: 'ability', targetId });
    assert.equal(view(g, c, 'p0').combat.actions.ability.available, true);
    assert.ok(!view(g, c).combat.targetOptions.some(p => p.id === 'p2'));
    g.players[1].health = 1;
    const next = act(g, c, { combatAction: 'ability', targetId: 'p1' });
    const status = view(next, c).combat.statuses.find(s => s.id === 'p1');
    assert.equal(status.shield, type === 'guard' ? 2 : 1);
    assert.equal(next.players[1].health, type === 'heal' ? 2 : 1);
    const self = act(g, c, { combatAction: 'ability', targetId: 'p0' });
    assert.ok(view(self, c).combat.statuses.find(s => s.id === 'p0').shield > 0);
    assert.equal(self.players[0].health, 3, 'Healing cannot exceed maximum life.');
  });
}

test('shields absorb damage before health and are consumed by the absorbed amount', () => {
  const c = fixture(['guard'], { target: 'all' }), g = start(c, 2);
  let next = act(g, c, { combatAction: 'ability', targetId: 'p1' });
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20, 20]));
  assert.deepEqual(next.players.map(p => p.health), [2, 3]);
  assert.equal(view(next, c).combat.statuses.find(s => s.id === 'p1').shield, 1);
});

test('rally survives utility skills, then each attack consumes its own bonus once', () => {
  const c = fixture(['rally', 'guard', 'heal', 'strike']), g = start(c, 2);
  let next = act(g, c, { combatAction: 'ability' });
  assert.ok(view(next, c).combat.statuses.every(s => s.boost === 2));
  next = act(next, c, { combatAction: 'ability', targetId: 'p1' }, 1);
  assert.ok(view(next, c).combat.statuses.every(s => s.boost === 2), 'Utility must not spend an attack bonus.');
  next = act(next, c, { combatAction: 'basic' }, 2);
  assert.equal(next.lastResult.bonus, 5);
  assert.equal(view(next, c).combat.statuses.find(s => s.id === 'p0').boost, 0);
  assert.equal(view(next, c).combat.statuses.find(s => s.id === 'p1').boost, 2);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([6, 1]));
  assert.equal(next.lastResult.total, 11);
  assert.equal(view(next, c).combat.statuses.find(s => s.id === 'p1').boost, 0);
});

test('declared enemy targets remain stable through healing and attack only after the round', () => {
  const c = fixture(['heal']), g = start(c, 2);
  // Start at equal full life; the current preview is the authoritative target announcement.
  const declared = view(g, c).combat.intent.targetIds;
  assert.equal(declared.length, 1);
  const target = g.players.find(p => p.id === declared[0]); target.health = 1;
  let next = act(g, c, { combatAction: 'ability', targetId: target.id });
  assert.deepEqual(view(next, c).combat.intent.targetIds, declared);
  assert.equal(next.lastResult.enemyRolls?.length || 0, 0);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20]));
  assert.deepEqual(next.lastResult.enemyRolls.map(r => r.targetId), declared);
  assert.equal(view(next, c).combat.round, 2);
  assert.deepEqual(view(next, c).combat.actedIds, []);
});

test('all-target intent rolls separately per living target and death skips that seat', () => {
  const c = fixture(['strike'], { target: 'all' }), g = start(c, 3);
  g.players[0].health = 1;
  let next = act(g, c, { combatAction: 'basic' }, 2);
  next = act(next, c, { combatAction: 'basic' }, 2);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20, 1, 20]));
  assert.deepEqual(next.players.map(p => p.health), [0, 3, 2]);
  assert.equal(next.players[0].life, 'dead');
  assert.equal(next.lastResult.enemyRolls.length, 3);
  assert.notEqual(actorId(next), 'p0');
  rejectedWithoutChange(next, c, 'p0', { combatAction: 'basic' });
});

test('victory cancels the enemy response, rewards once, unlocks the same story scene and cannot rerun', () => {
  const c = fixture(['strike']), g = start(c, 1); g.players[0].health = 1; g.pressure = 2;
  let next = act(g, c, { combatAction: 'basic' }, scriptedRolls([8, 1]));
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([8, 1]));
  const victoryRoll = scriptedRolls([8]);
  next = act(next, c, { combatAction: 'basic' }, victoryRoll);
  assert.equal(victoryRoll.calls(), 1);
  assert.equal(view(next, c).combat, null);
  assert.equal(next.nodeId, 'arena');
  assert.equal(next.phase, 'playing');
  assert.equal(next.flags.device_stopped, true);
  assert.equal(next.players[0].health, 2);
  assert.equal(next.pressure, 1);
  assert.equal(next.sparks, 3);
  assert.equal(next.lastResult.combatEvent, 'victory');
  assert.ok(view(next, c).scene.text.includes(c.nodes.arena.text[0]));
  assert.ok(view(next, c).scene.choices.some(choice => choice.id === 'leave'));
  const restored = engine.validateSave({ format: 'chronicle-gate-v15', game: next }, [c]).game;
  assert.equal(view(restored, c).combat, null);
  assert.equal(restored.players[0].health, 2);
  assert.equal(restored.sparks, 3);
  const ended = act(restored, c, { choiceId: 'leave' });
  assert.equal(ended.phase, 'ended');
});

test('solo repeated failed attacks can end in real mid-story total party death', () => {
  const c = fixture(['strike']), g = start(c, 1); let next = g;
  for (let round = 0; round < 3; round++) next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20]));
  assert.equal(next.phase, 'ended');
  assert.equal(next.nodeId, '__all_dead__');
  assert.equal(next.players[0].health, 0);
  assert.equal(next.lastResult.combatEvent, 'defeat');
  assert.equal(view(next, c).combat, null);
  assert.equal(view(next, c).scene.ending, true);
});

test('combat preview enforces turn, stale revisions, and server-supplied dice over forged payloads', () => {
  const c = fixture(), g = start(c, 2);
  rejectedWithoutChange(g, c, 'p1', { combatAction: 'basic', playerId: 'p0' });
  const preview = engine.previewAction(g, c, 'p0', { combatAction: 'basic' }); assert.equal(preview.ok, true);
  const helped = engine.assist(g, 'p1').game;
  const stale = engine.applyAction(helped, c, 'p0', { combatAction: 'basic', revision: preview.plan.revision }, { roll: () => { throw Error('Stale action rolled'); } });
  assert.equal(stale.ok, false);
  const next = act(helped, c, { combatAction: 'basic', roll: 20, total: 999, damage: 999, enemyHealth: 0, bonus: 999 }, 1);
  assert.equal(next.lastResult.roll, 1);
  assert.equal(view(next, c).combat.enemy.health, 10);
  assert.equal(next.players[1].health, 3);
  rejectedWithoutChange(g, c, 'p0', { combatAction: 'invented-skill' });
});

test('rolled combat actions accept spark and checkbox preparation once', () => {
  const c = fixture(), g = start(c, 2);
  const payload = { combatAction: 'basic', spendSpark: true, usePreparation: true };
  const preview = engine.previewAction(g, c, 'p0', payload); assert.equal(preview.ok, true);
  assert.equal(preview.plan.bonus, 8);
  const next = act(g, c, payload, 3);
  assert.equal(next.lastResult.total, 11);
  assert.equal(next.sparks, 1);
  assert.equal(next.players[0].focus, false);
});

test('v15-compatible mid-combat save restores exact enemy, round, targets, statuses and spent ability', () => {
  const c = fixture(['guard', 'rally', 'expose', 'stun']);
  let g = start(c, 4);
  g = act(g, c, { combatAction: 'ability', targetId: 'p3' });
  g = act(g, c, { combatAction: 'ability' });
  g = act(g, c, { combatAction: 'ability' });
  const before = combatProjection(g, c, 'p0');
  const legacy = clone(g); legacy.schema = 15; legacy.version = '15.0.0';
  const restored = engine.validateSave({ format: 'chronicle-gate-v15', game: legacy }, [c]).game;
  assert.equal(restored.schema, 22);
  assert.deepEqual(combatProjection(restored, c, 'p0'), before);
  assert.equal(view(restored, c, 'p0').combat.actions.ability.available, false);
  let next = act(restored, c, { combatAction: 'basic' }, 2);
  assert.equal(actorId(next), 'p0');
  rejectedWithoutChange(next, c, 'p0', { combatAction: 'ability', targetId: 'p3' });
});

test('v14 migration maps legacy professions and preserves progress at/past a newly added combat', () => {
  const c = fixture(); c.start = 'before';
  const legacy = engine.createStoryState(c, party(c));
  legacy.schema = 14; legacy.version = '14.0.0';
  for (const [i, id] of ['scout', 'envoy', 'guardian', 'scholar'].entries()) legacy.players[i].classId = id;
  delete legacy.combat;
  legacy.nodeId = 'arena'; legacy.visited = ['before', 'arena'];
  const restored = engine.validateSave({ format: 'chronicle-gate-v14', game: legacy }, [c]).game;
  assert.equal(restored.schema, 22);
  assert.deepEqual(restored.players.map(p => p.classId), [c.classes[1].id, c.classes[3].id, c.classes[0].id, c.classes[2].id]);
  assert.equal(restored.nodeId, 'arena');
  assert.equal(view(restored, c).combat, null, 'A previously visited v14 scene must not force a surprise fight.');
  const future = clone(legacy); future.nodeId = 'before'; future.visited = ['before'];
  const beforeFight = engine.validateSave({ format: 'chronicle-gate-v14', game: future }, [c]).game;
  const entered = act(beforeFight, c, { choiceId: 'enter' });
  assert.ok(view(entered, c).combat, 'A future, unvisited encounter should still happen.');
});

test('two stuns in one round do not cancel two future enemy phases', () => {
  const c = fixture(['stun']), g = start(c, 2);
  let next = act(g, c, { combatAction: 'ability' });
  next = act(next, c, { combatAction: 'ability' }, () => { throw Error('A cancelled enemy phase rolled a die.'); });
  assert.equal(view(next, c).combat.staggered, false);
  assert.deepEqual(next.players.map(p => p.health), [3, 3]);
  next = act(next, c, { combatAction: 'basic' }, 2);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20]));
  assert.equal(next.players.reduce((n, p) => n + p.health, 0), 5);
});

test('a failed RNG during the enemy phase rolls back the whole action, including one-use skills', () => {
  const c = fixture(['guard']), g = start(c, 1), before = JSON.stringify(g);
  const result = engine.applyAction(g, c, actorId(g), { combatAction: 'ability', targetId: actorId(g), revision: g.revision }, { roll: () => 99 });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(g), before);
  assert.equal(view(g, c).combat.actions.ability.available, true);
  assert.equal(view(g, c).combat.enemy.health, 6);
});

test('a disconnected combatant can be guarded and passed, but the enemy phase still happens', () => {
  const c = fixture(['strike']), g = start(c, 2);
  assert.equal(engine.passTurn(g, 'p0', { allowDisconnected: true, campaign: c, roll: 1 }).ok, false, 'Connected actors must act, not skip safely.');
  let next = act(g, c, { combatAction: 'basic' }, 2);
  assert.equal(actorId(next), 'p1');
  next.players[1].connected = false;
  const result = engine.passTurn(next, 'p0', { allowDisconnected: true, campaign: c, roll: 20 });
  assert.equal(result.ok, true, result.error);
  assert.equal(view(result.game, c).combat.round, 2);
  assert.equal(result.game.lastResult.enemyRolls.length, 1);
  assert.equal(view(result.game, c).combat.statuses.find(s => s.id === 'p1').shield, 1);
  assert.equal(result.game.players[0].health, 2);
});

test('mid-combat save preserves the last enemy roll and pending living/ghost assistance', () => {
  const c = fixture(['strike']), g = start(c, 2);
  let next = act(g, c, { combatAction: 'basic' }, 2);
  next = act(next, c, { combatAction: 'basic' }, scriptedRolls([2, 20]));
  const helped = engine.assist(next, 'p1'); assert.equal(helped.ok, true); next = helped.game;
  const restored = engine.validateSave({ format: 'chronicle-gate-v15', game: clone(next) }, [c]).game;
  for (const key of ['combat', 'combatEvent', 'damage', 'targetId', 'enemyRolls', 'deaths']) {
    assert.deepEqual(restored.lastResult[key], next.lastResult[key], `Saved combat result lost ${key}.`);
  }
  assert.deepEqual(restored.assists, next.assists);
  assert.equal(engine.previewAction(restored, c, actorId(restored), { combatAction: 'basic' }).plan.assistance, 1);

  const ghostGame = start(c, 3); ghostGame.players[2].health = 0; ghostGame.players[2].life = 'dead';
  const ghostHelp = engine.assist(ghostGame, 'p2'); assert.equal(ghostHelp.ok, true);
  const ghostRestored = engine.validateSave({ format: 'chronicle-gate-v15', game: ghostHelp.game }, [c]).game;
  assert.deepEqual(ghostRestored.assists, ['p2']);
  assert.equal(ghostRestored.players[2].echoUsed, true);
  assert.equal(engine.assist(ghostRestored, 'p2').ok, false, 'Reload must not replenish the dead player’s one final help.');
});
