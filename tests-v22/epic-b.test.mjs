/** Earned routes for four v22 Epic additions; no flags/items are injected. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_CAMPAIGNS } from '../public/game/campaigns/index.js';
import { EPIC_B } from '../public/game/campaigns/epic-b.js';
import { composeEpic, campaignForLength } from '../public/game/campaigns/epic-tools.js';
import { createStoryState, applyAction, availableChoices, previewAction, gradeRoll, viewGame, validateSave, STAT_LABELS } from '../public/game/engine.js';

const CONFIG = {
  'deep-sea': {
    prefix: ['brief', 'answer', 'patients', 'warm', 'hear-outside', 'repair-relay', 'ask-return', 'listen-cycle', 'private', 'count'],
    gate: 'council', used: { 'epb-sea-a05': 'clamp', 'epb-sea-b11': 'fix' },
    harm: ['epb-sea-a08', 'repair'], item: 'epb_sea_clamp', usedFlag: 'epb_sea_braced',
    splits: [['epb-sea-a03', 'epb-sea-a04-dry', 'epb-sea-a04-pipe'], ['epb-sea-b03', 'epb-sea-b04-winch', 'epb-sea-b04-sonar']],
    endings: [
      ['ending-witness', ['witness']], ['ending-harbor', ['quiet']], ['ending-common', ['common']],
      ['ending-open-water', ['offer-return-water', 'prepare-outlet', 'let-go']],
      ['ending-deep-watch', ['offer-return-water', 'prepare-outlet', 'offer-watch']],
    ],
  },
  'dragon-banquet': {
    prefix: ['stop-arrest', 'cook-team', 'restore-plan', 'confront-regent', 'shared-budget', 'split-heat', 'new-service'],
    gate: 'banquet', used: { 'epb-dragon-a08': 'tongs', 'epb-dragon-b08': 'tongs', 'epb-dragon-a09': 'voice' },
    harm: ['epb-dragon-b09', 'hold'], item: 'epb_dragon_tongs', usedFlag: 'epb_dragon_tongs_used',
    splits: [['epb-dragon-a03', 'epb-dragon-a04-store', 'epb-dragon-a04-yard'], ['epb-dragon-b03', 'epb-dragon-b04-roof', 'epb-dragon-b04-rooms']],
    endings: [
      ['ending-hearth', ['shared-hearth']], ['ending-caravan', ['travel-cooks']], ['ending-transition', ['last-flame']],
      ['ending-winter-palace', ['shelter-first', 'take-winter-map', 'prepare-winter-rooms', 'test-winter-flues', 'open-winter-palace']],
      ['ending-spring-return', ['shelter-first', 'take-winter-map', 'load-winter-sleds', 'check-south-markers', 'depart-for-spring']],
    ],
  },
  'clock-city': {
    prefix: ['tram-first', 'guide', 'original', 'refuse', 'consent', 'bind', 'appeal'],
    gate: 'hearing', used: { 'epb-clock-23': 'bookmark' },
    harm: ['epb-clock-13', 'stop'], item: 'epb_clock_bookmark', usedFlag: 'epb_clock_bookmark_left',
    splits: [['epb-clock-03', 'epb-clock-04-high', 'epb-clock-04-low'], ['epb-clock-15', 'epb-clock-16-stairs', 'epb-clock-16-balcony']],
    endings: [
      ['ending-slow', ['rights', 'slow-city']], ['ending-newtown', ['rights', 'leave']], ['ending-common', ['rights', 'common-time']],
      ['ending-return-station', ['visit-return-desk', 'copy-return-addresses', 'restore-return-track', 'match-return-houses', 'keep-return-station']],
      ['ending-last-delivery', ['visit-return-desk', 'copy-return-addresses', 'clear-return-carriage', 'match-return-parcels', 'send-last-parcels']],
    ],
  },
  'snow-radio': {
    prefix: ['power-first', 'crank', 'rescue-route', 'person-first', 'records', 'check-post-room', 'repair-case', 'ask-before-carry', 'low-power', 'listen-all'],
    gate: 'decision', used: { 'epb-snow-b06': 'tile' },
    harm: ['epb-snow-b09', 'brace'], item: 'epb_snow_heat_tile', usedFlag: 'epb_snow_warm_corner',
    splits: [['epb-snow-a03', 'epb-snow-a04-pipe', 'epb-snow-a04-window'], ['epb-snow-b03', 'epb-snow-b04-stairs', 'epb-snow-b04-loft']],
    endings: [
      ['ending-silence', ['sleep']], ['ending-beacon', ['beacon']], ['ending-choice', ['self-rule']],
      ['ending-carried-voices', ['private-handover', 'move-anchors', 'escort-voices']],
      ['ending-kept-letters', ['private-handover', 'pack-letters', 'deliver-letters']],
    ],
  },
};
const BASES = Object.fromEntries(Object.keys(EPIC_B).map(id => [id, { ...LEGACY_CAMPAIGNS.find(c => c.id === id), epicSpec: EPIC_B[id] }]));
const CAMPAIGNS = Object.fromEntries(Object.entries(BASES).map(([id, base]) => [id, composeEpic(base, EPIC_B[id])]));
const roster = (c, count) => c.classes.slice(0, count).map((job, i) => ({ id: `epb-${i}`, name: `독자 ${i + 1}`, classId: job.id }));
const actor = g => g.players[g.activeIndex].id;
function action(g, c, payload, roll = 20) {
  const r = applyAction(g, c, actor(g), { ...payload, revision: g.revision }, { roll });
  assert.equal(r.ok, true, `${c.id}/${g.nodeId}/${JSON.stringify(payload)}: ${r.error}`);
  return r.game;
}
function fight(g, c) {
  for (let i = 0; g.combat && i < 50; i++) {
    let first = true;
    g = action(g, c, { combatAction: 'basic' }, () => { const d = first ? 20 : 1; first = false; return d; });
  }
  assert.equal(g.combat, null, 'Real required combat must end in victory.');
  return g;
}
function observe(g, c, enabled = true) {
  if (!enabled) return g;
  for (const d of c.nodes[g.nodeId]?.details || []) if (!g.detailsRead[`${g.nodeId}:${d.id}`]) g = action(g, c, { detailId: d.id });
  return g;
}
function drainEpic(g, c, options = {}, states = []) {
  const spec = EPIC_B[c.id], returns = new Set(spec.chapters.map(ch => ch.return.id)), cfg = CONFIG[c.id];
  for (let i = 0; i < 80; i++) {
    g = fight(g, c);
    g = observe(g, c, options.observe !== false);
    if (returns.has(g.nodeId)) return g;
    const choices = availableChoices(g, c), entry = choices.find(a => a.id.startsWith('enter-epb-'));
    if (!entry && !g.nodeId.startsWith('epb-')) return g;
    if (!entry) states.push(structuredClone(g));
    let selected = entry || choices[0];
    if (options.alternate && cfg.splits.some(row => row[0] === g.nodeId)) selected = choices[1];
    if (options.use !== false && cfg.used[g.nodeId]) selected = choices.find(a => a.id === cfg.used[g.nodeId]);
    assert.ok(selected, `${g.nodeId}: an earned chapter action exists`);
    g = action(g, c, { choiceId: selected.id });
    assert.equal(g.phase, 'playing');
  }
  assert.fail('Epic chapter exceeded its acyclic route budget.');
}
function route(g, c, ids, options = {}, states = []) {
  for (const id of ids) {
    g = drainEpic(g, c, options, states);
    g = observe(g, c, options.observe !== false);
    assert.ok(availableChoices(g, c).some(a => a.id === id), `${c.id}/${g.nodeId}: ${id} is earned`);
    g = action(g, c, { choiceId: id });
  }
  return g;
}
function ready(c, count = 4, options = {}) {
  const states = [];
  const g = route(createStoryState(c, roster(c, count)), c, CONFIG[c.id].prefix, options, states);
  assert.equal(g.nodeId, CONFIG[c.id].gate);
  return { g, states };
}
const extraIds = id => new Set(EPIC_B[id].chapters.flatMap(ch => ch.scenes.map(n => n.id)));
const extraCount = (g, id) => g.visited.filter(nodeId => extraIds(id).has(nodeId)).length;
const mechanical = o => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['text', 'arrival', 'lossText', 'survivorArrival', 'sound'].includes(k))));
function minimumAdded(c, ids) {
  const dist = { [c.start]: 0 }, queue = [c.start];
  while (queue.length) {
    const at = queue.shift();
    for (const choice of c.nodes[at].choices || []) for (const outcome of Object.values(choice.outcomes)) {
      const value = dist[at] + Number(ids.has(outcome.next));
      if (value < (dist[outcome.next] ?? Infinity)) { dist[outcome.next] = value; queue.push(outcome.next); }
    }
  }
  return Object.fromEntries(Object.values(c.nodes).filter(n => n.ending).map(n => [n.id, dist[n.id]]));
}

for (const [id, spec] of Object.entries(EPIC_B)) {
  const c = CAMPAIGNS[id], cfg = CONFIG[id], base = BASES[id];
  test(`${id}: Basic remains unchanged and every ordinary Epic ending adds at least 24 scenes`, () => {
    const before = JSON.stringify(base.nodes);
    composeEpic(base, spec);
    assert.equal(JSON.stringify(base.nodes), before);
    assert.equal(campaignForLength(c, 'basic'), base);
    assert.equal(extraIds(id).size, 26);
    const minimums = minimumAdded(c, extraIds(id));
    assert.equal(Object.keys(minimums).length, 5);
    for (const [ending, count] of Object.entries(minimums)) assert.equal(count, 24, ending);
    for (const ch of spec.chapters) {
      assert.ok(!c.nodes[ch.return.id].encounter, 'The old combat is not repeated after a chapter.');
      assert.deepEqual(c.nodes[ch.return.id].choices, base.nodes[ch.at].choices);
      for (const n of ch.scenes) {
        assert.equal(n.text.length, 2);
        for (const p of n.text) assert.ok(p.length >= 90 && p.length <= 170, `${n.id}: concise authored paragraphs (${p.length})`);
        assert.ok(n.location && n.objective && n.stakes && n.summary);
        assert.ok(n.choices.length >= 2 && n.choices.length <= 3);
        assert.ok(n.choices.some(a => a.automatic && !a.requires && !a.useItems?.length && !a.consumeItems?.length), `${n.id}: safe unconditional progress`);
        for (const a of n.choices) {
          if (!a.automatic) {
            assert.ok(Object.hasOwn(STAT_LABELS, a.stat));
            assert.deepEqual(Object.keys(a.outcomes), ['critical', 'success', 'failure', 'fumble']);
            assert.equal(new Set(Object.values(a.outcomes).map(o => o.text)).size, 4);
            assert.notEqual(mechanical(a.outcomes.critical), mechanical(a.outcomes.success));
            assert.notEqual(mechanical(a.outcomes.failure), mechanical(a.outcomes.fumble));
          }
          for (const out of Object.values(a.outcomes)) {
            assert.ok(c.nodes[out.next]);
            for (const flag of [...out.set || [], ...out.unset || []]) assert.ok(c.flags[flag]);
            for (const clue of out.clues || []) assert.ok(c.clues[clue]);
            for (const item of out.gainItems || []) assert.ok(c.items[item]);
            if (out.harm || out.harmAll) assert.ok(out.lossText && out.survivorArrival);
          }
        }
      }
    }
  });

  for (const count of [1, 2, 3, 4]) test(`${id}: ${count} players earn the item, complete 24 new scenes and reach all five endings`, () => {
    const { g } = ready(c, count);
    assert.equal(extraCount(g, id), 24);
    assert.equal(g.completedCombats.length, 1);
    assert.ok(g.flags[cfg.usedFlag], 'Authored item was acquired and actually used.');
    const isReusable = id === 'dragon-banquet';
    assert.equal(g.inventory.includes(cfg.item), isReusable);
    assert.equal(g.spentItems.includes(cfg.item), !isReusable);
    for (const [ending, actions] of cfg.endings) {
      const after = route(structuredClone(g), c, actions);
      assert.equal(after.phase, 'ended');
      assert.equal(after.nodeId, ending);
      assert.equal(extraCount(after, id), 24);
      assert.equal(after.completedCombats.length, 1);
      const view = viewGame(after, c, after.players[0].id);
      assert.ok(view.scene.reading.echoes.length > 0, 'An earned state appears in the ending.');
      const loaded = validateSave({ format: 'chronicle-gate-v18', game: after }, [base]);
      assert.ok(loaded.game, loaded.error);
      assert.equal(loaded.game.storyLength, 'epic');
      assert.equal(loaded.game.nodeId, ending);
      assert.deepEqual(loaded.game.inventory, after.inventory);
      assert.deepEqual(loaded.game.flags, after.flags);
    }
  });

  test(`${id}: both alternate physical routes, no observations and no item use still complete`, () => {
    const { g } = ready(c, 1, { alternate: true, observe: false, use: false });
    assert.equal(extraCount(g, id), 24);
    assert.ok(g.inventory.includes(cfg.item));
    for (const [, normal, alternate] of cfg.splits) {
      assert.ok(g.visited.includes(alternate));
      assert.ok(!g.visited.includes(normal));
    }
    const after = route(g, c, cfg.endings[1][1], { alternate: true, observe: false, use: false });
    assert.equal(after.phase, 'ended');
    assert.equal(after.nodeId, cfg.endings[1][0]);
  });

  test(`${id}: every new risky action resolves all four grades in an earned state`, () => {
    const all = new Map();
    for (const alternate of [false, true]) {
      for (const state of ready(c, 4, { alternate }).states) all.set(state.nodeId, state);
    }
    let checked = 0;
    for (const [nodeId, g] of all) for (const a of c.nodes[nodeId].choices.filter(a => !a.automatic)) {
      const preview = previewAction(g, c, actor(g), { choiceId: a.id });
      assert.equal(preview.ok, true, preview.error);
      for (const grade of ['critical', 'success', 'failure', 'fumble']) {
        const die = Array.from({ length: 20 }, (_, i) => i + 1).find(d => gradeRoll(d, d + preview.plan.bonus, preview.plan.dc) === grade);
        assert.ok(die, `${nodeId}/${a.id}: reachable ${grade}`);
        const after = action(structuredClone(g), c, { choiceId: a.id }, die);
        assert.equal(after.lastResult.grade, grade);
        assert.equal(after.nodeId, a.outcomes[grade].next);
        assert.equal(after.lastResult.text, a.outcomes[grade].text);
        for (const flag of a.outcomes[grade].set || []) assert.ok(after.flags[flag]);
        checked++;
      }
    }
    const riskyCount = spec.chapters.flatMap(ch => ch.scenes).flatMap(n => n.choices).filter(a => !a.automatic).length;
    assert.equal(checked, riskyCount * 4);
  });

  test(`${id}: lethal fumbles stop the actor, allow survivors onward, and permit an actual solo wipe`, () => {
    for (const count of [1, 4]) {
      const { states } = ready(c, count), [nodeId, choiceId] = cfg.harm;
      const g = structuredClone(states.find(s => s.nodeId === nodeId));
      assert.ok(g, 'The harmful scene was reached through actual play.');
      // Only boundary health is injected; story, combat, inventory and flags are earned.
      g.players[g.activeIndex].health = 1;
      const out = c.nodes[nodeId].choices.find(a => a.id === choiceId).outcomes.fumble;
      const preview = previewAction(g, c, actor(g), { choiceId }).plan.outcomes.find(o => o.grade === 'fumble');
      const after = action(g, c, { choiceId }, 1);
      assert.equal(after.lastResult.deaths.length, 1);
      assert.ok(after.lastResult.text.startsWith(out.lossText));
      assert.equal(after.lastResult.text.includes(out.survivorArrival), count > 1);
      assert.equal(after.lastResult.text, preview.text);
      assert.equal(after.nodeId, count === 1 ? '__all_dead__' : out.next);
      if (count > 1) assert.ok(availableChoices(after, c).some(a => a.automatic && !a.requires));
    }
  });

  test(`${id}: a real resting choice heals the living actor without reviving a dead party member`, () => {
    const { states } = ready(c, 2);
    const g = structuredClone(states.find(s => c.nodes[s.nodeId].choices.some(a => a.outcomes.success?.heal)));
    const acting = g.activeIndex, dead = (acting + 1) % 2;
    g.players[acting].health = 1;
    g.players[dead].health = 0;
    g.players[dead].life = 'dead';
    const choice = c.nodes[g.nodeId].choices.find(a => a.outcomes.success?.heal);
    const after = action(g, c, { choiceId: choice.id });
    assert.equal(after.players[acting].health, 2);
    assert.equal(after.players[dead].health, 0);
    assert.equal(after.players[dead].life, 'dead');
  });
}

test('clock-city: using the bookmark early preserves a safe final exit and never regenerates the item', () => {
  const c = CAMPAIGNS['clock-city'];
  const saved = CONFIG['clock-city'].used;
  CONFIG['clock-city'].used = { 'epb-clock-17': 'bookmark' };
  try {
    const { g } = ready(c, 1);
    assert.ok(g.spentItems.includes('epb_clock_bookmark'));
    assert.ok(!g.inventory.includes('epb_clock_bookmark'));
    assert.ok(!g.flags.epb_clock_bookmark_left);
    assert.ok(g.visited.includes('epb-clock-24'));
    assert.equal(extraCount(g, c.id), 24);
  } finally { CONFIG['clock-city'].used = saved; }
});

test('snow-radio: spending the heat tile at the old relay leaves an unconditional later warming choice', () => {
  const c = CAMPAIGNS['snow-radio'];
  const saved = CONFIG['snow-radio'].used;
  CONFIG['snow-radio'].used = { 'epb-snow-a09': 'warm' };
  try {
    const { g } = ready(c, 1);
    assert.ok(g.spentItems.includes('epb_snow_heat_tile'));
    assert.ok(!g.flags.epb_snow_warm_corner);
    assert.ok(g.flags.epb_snow_alarm_stopped);
    assert.ok(g.visited.includes('epb-snow-b07'));
    assert.equal(extraCount(g, c.id), 24);
  } finally { CONFIG['snow-radio'].used = saved; }
});
