import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_CAMPAIGNS as CAMPAIGNS } from '../public/game/campaigns/index.js';
import { STAT_LABELS, createStoryState as createGame, applyAction, availableChoices, previewAction, gradeRoll, validateSave, viewGame } from '../public/game/engine.js';

const SPECS = {
  'dragon-banquet': {
    gate: 'tasting', item: 'winter-route-map', fallback: 'return-to-caravan', fallbackEnd: 'ending-caravan',
    prefix: ['stop-arrest', 'ingredients', 'seize-sample', 'hear-dragon', 'small-future', 'split-heat', 'new-service', 'shelter-first'],
    first: 'take-winter-map', secondNode: 'fuel-house', thirdNode: 'lower-hall', finalNode: 'winter-gate',
    paths: [
      { second: 'prepare-winter-rooms', third: 'test-winter-flues', finish: 'open-winter-palace', ending: 'ending-winter-palace', flags: ['winter_hall_ready', 'winter_hall_vented'] },
      { second: 'load-winter-sleds', third: 'check-south-markers', finish: 'depart-for-spring', ending: 'ending-spring-return', flags: ['winter_sleds_ready', 'winter_road_checked'] },
    ],
  },
  'clock-city': {
    gate: 'library', item: 'clock_return_roll', fallback: 'close-return-and-release', fallbackEnd: 'ending-slow',
    prefix: ['tram-first', 'guide', 'original', 'refuse', 'consent', 'bind', 'appeal', 'visit-return-desk'],
    first: 'copy-return-addresses', secondNode: 'still-platform', thirdNode: 'address-shelves', finalNode: 'last-dispatch',
    paths: [
      { second: 'restore-return-track', third: 'match-return-houses', finish: 'keep-return-station', ending: 'ending-return-station', flags: ['return_track_ready', 'return_houses_matched'] },
      { second: 'clear-return-carriage', third: 'match-return-parcels', finish: 'send-last-parcels', ending: 'ending-last-delivery', flags: ['return_parcels_ready', 'return_names_matched'] },
    ],
  },
};

const roster = (c, count) => c.classes.slice(0, count).map((job, i) => ({ id: `c-reader-${i}`, name: `독자 ${i + 1}`, classId: job.id }));
function cast(g, c, payload, roll = 20) {
  const r = applyAction(g, c, g.players[g.activeIndex].id, { ...payload, revision: g.revision }, { roll });
  assert.equal(r.ok, true, `${c.id}/${g.nodeId}/${JSON.stringify(payload)}: ${r.error}`);
  return r.game;
}
function fight(g, c) {
  for (let turns = 0; g.combat && turns < 40; turns++) {
    let first = true;
    g = cast(g, c, { combatAction: 'basic' }, () => { const d = first ? 20 : 1; first = false; return d; });
  }
  assert.equal(Boolean(g.combat), false, 'the actual encounter must finish');
  return g;
}
function take(g, c, choice, die = 20) {
  g = fight(g, c);
  assert.ok(availableChoices(g, c).some(ch => ch.id === choice), `${c.id}/${g.nodeId}: earned choice ${choice} missing`);
  return cast(g, c, { choiceId: choice }, die);
}
function reach(c, spec, count, steps = []) {
  let g = createGame(c, roster(c, count));
  for (const id of [...spec.prefix, ...steps]) g = take(g, c, id);
  assert.equal(g.completedCombats.length, 1, 'new branch follows the established combat');
  return g;
}
function reload(g) {
  return validateSave({ format: 'chronicle-gate-v18', game: g }, CAMPAIGNS).game;
}

for (const [id, spec] of Object.entries(SPECS)) {
  const c = CAMPAIGNS.find(c => c.id === id);
  for (const count of [1, 4]) {
    for (const path of spec.paths) {
      test(`${id}: ${count} readers earn every requirement and reach ${path.ending}`, () => {
        let g = reach(c, spec, count);
        assert.ok(!g.inventory.includes(spec.item), 'new item was not injected or granted before the branch');
        const entryView = viewGame(g, c, g.players[g.activeIndex].id);
        assert.equal(entryView.storyMode, count === 1 ? 'solo' : 'group');
        assert.ok(entryView.scene.reading.paragraphs.length >= 2);
        g = take(g, c, spec.first);
        assert.ok(g.inventory.includes(spec.item), 'the reception/map work earns the item');
        g = take(g, c, path.second);
        g = take(g, c, path.third);
        assert.equal(g.nodeId, spec.finalNode);
        for (const flag of path.flags) assert.equal(g.flags[flag], true);
        const before = reload(g);
        assert.deepEqual(before.flags, g.flags);
        assert.ok(before.inventory.includes(spec.item));
        g = take(before, c, path.finish);
        assert.equal(g.phase, 'ended');
        assert.equal(g.nodeId, path.ending);
        assert.equal(g.completedCombats.length, 1);
        assert.equal(g.players.length, count);
        assert.ok(g.chronicle.some(row => row.action === c.nodes[spec.secondNode].choices.find(ch => ch.id === path.second).label));
        if (id === 'clock-city') {
          assert.ok(g.lastResult.usedItems.some(item => item.id === spec.item));
          assert.ok(!g.inventory.includes(spec.item));
          assert.ok(g.spentItems.includes(spec.item));
          assert.ok(!reload(g).inventory.includes(spec.item), 'save reload must not recreate the submitted return form');
        } else if (path.ending === 'ending-spring-return') {
          assert.ok(g.lastResult.usedItems.some(item => item.id === spec.item));
          assert.ok(g.inventory.includes(spec.item), 'the reusable map stays in the party bag');
        }
      });
    }

    test(`${id}: ${count} readers cannot substitute preparation from the other new ending`, () => {
      let g = reach(c, spec, count, [spec.first, spec.paths[0].second, spec.paths[1].third]);
      assert.equal(g.nodeId, spec.finalNode);
      const ids = availableChoices(g, c).map(ch => ch.id);
      assert.ok(!ids.includes(spec.paths[0].finish));
      assert.ok(!ids.includes(spec.paths[1].finish));
      assert.ok(ids.includes(spec.fallback));
      g = take(g, c, spec.fallback);
      assert.equal(g.nodeId, spec.fallbackEnd);
      assert.equal(g.completedCombats.length, 1);
    });
  }

  test(`${id}: every new risky action resolves all four real die grades`, () => {
    const initial = reach(c, spec, 4);
    const earned = take(initial, c, spec.first);
    const states = [initial, earned, ...spec.paths.map(path => take(earned, c, path.second))];
    const seen = new Set();
    for (const state of states) {
      for (const action of availableChoices(state, c).filter(ch => !ch.automatic)) {
        const key = `${state.nodeId}/${action.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        assert.ok(Object.hasOwn(STAT_LABELS, action.stat), `${key}: risky action must use an engine stat instead of silently receiving a zero bonus`);
        const p = previewAction(state, c, state.players[state.activeIndex].id, { choiceId: action.id });
        assert.equal(p.ok, true);
        for (const grade of ['critical', 'success', 'failure', 'fumble']) {
          const die = Array.from({ length: 20 }, (_, i) => i + 1).find(d => gradeRoll(d, d + p.plan.bonus, p.plan.dc) === grade);
          assert.ok(die, `${key}: ${grade} must be attainable`);
          const after = take(state, c, action.id, die);
          assert.equal(after.lastResult.grade, grade);
          assert.equal(after.nodeId, action.outcomes[grade].next);
          if (grade === 'fumble' && action.outcomes.fumble.loseItems?.includes(spec.item)) {
            assert.ok(!after.inventory.includes(spec.item));
            assert.ok(!availableChoices(after, c).some(ch => ch.consumeItems?.includes(spec.item) || ch.useItems?.includes(spec.item)));
          }
        }
      }
    }
    assert.equal(seen.size, id === 'dragon-banquet' ? 5 : 4);
  });

  test(`${id}: new damage uses loss prose and the last survivor retains a forward route`, () => {
    let g = reach(c, spec, 4, [spec.first]);
    const actor = g.activeIndex;
    g.players[actor].health = 1;
    const hurt = take(g, c, spec.paths[0].second, 1);
    const out = c.nodes[spec.secondNode].choices.find(ch => ch.id === spec.paths[0].second).outcomes.fumble;
    assert.equal(hurt.lastResult.deaths.length, 1);
    assert.ok(hurt.lastResult.text.includes(out.lossText));
    assert.ok(hurt.lastResult.text.includes(out.survivorArrival));
    assert.ok(!hurt.lastResult.text.includes(out.text));
    assert.ok(availableChoices(hurt, c).some(ch => !ch.requires && !ch.useItems?.length && !ch.consumeItems?.length));
    g = reach(c, spec, 4, [spec.first]);
    for (const [index, player] of g.players.entries()) {
      player.health = index === g.activeIndex ? 1 : 0;
      player.life = index === g.activeIndex ? 'alive' : 'dead';
    }
    const allDead = take(g, c, spec.paths[0].second, 1);
    assert.equal(allDead.nodeId, '__all_dead__');
    assert.ok(allDead.lastResult.text.includes(out.lossText));
    assert.ok(!allDead.lastResult.text.includes(out.survivorArrival));
  });
}
