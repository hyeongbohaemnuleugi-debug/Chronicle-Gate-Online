import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../public/game/audio.js';
import { selectMusic, ENDING_MOODS } from '../public/game/music-director.js';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';
import { createGame, applyAction, viewGame, validateSave, assist, revealSecret } from '../public/game/engine.js';

const clone = value => structuredClone(value);
const person = (id, health = 3) => ({ id, name: id, health, life: health ? 'alive' : 'dead' });
const base = extra => ({ campaignId: 'clock-city', scene: { id: 'square', mood: 'mystery', ending: false },
  players: [person('A'), person('B')], pressure: { value: 0, max: 8 }, journal: [], lastResult: null, combat: null, ...extra });
const death = { action: '끊어진 다리를 건넌다', actor: 'A', grade: 'success', deaths: ['A'], text: 'A의 목소리가 끊겼다.', changes: ['사망: A'] };
const observation = { action: '문서를 읽는다', actor: 'B', grade: 'observe', text: '아직 남은 글을 확인했다.', changes: [] };
const revival = { action: 'A 부활 · 반환 서랍', actor: 'B', grade: 'critical', revivedId: 'A', text: 'A의 숨이 돌아온다.', changes: ['A 생명 3로 귀환'] };

test('all 35 ordinary endings have deliberate tones, with explicit loss and recovery endings', () => {
  let checked = 0;
  for (const campaign of CAMPAIGNS) {
    const endings = Object.values(campaign.nodes).filter(node => node.ending);
    assert.deepEqual(Object.keys(ENDING_MOODS[campaign.id]).sort(), endings.map(node => node.id).sort());
    for (const node of endings) {
      const view = base({ campaignId: campaign.id, ending: true, scene: { id: node.id, mood: 'hope', ending: true }, pressure: { value: 8, max: 8 } });
      assert.equal(selectMusic(view).mood, ENDING_MOODS[campaign.id][node.id]);
      assert.equal(selectMusic({ ...view, players: [person('A', 0), person('B')] }).mood, 'grief');
      checked++;
    }
  }
  assert.equal(checked, 35);
  assert.equal(ENDING_MOODS['clock-city']['ending-newtown'], 'grief');
  assert.equal(ENDING_MOODS['glass-hotel']['ending-break'], 'grief');
  assert.equal(ENDING_MOODS['deep-sea']['ending-harbor'], 'calm');
  assert.equal(ENDING_MOODS['snow-radio']['ending-choice'], 'hope');
});

test('a death outranks successful attacks, victory, enemy damage and a hopeful scene', () => {
  for (const combatEvent of ['attack', 'ability', 'victory', 'defeat']) {
    const result = { ...death, grade: 'critical', combat: true, combatEvent, enemyRolls: [{ damage: 1 }] };
    const view = base({ scene: { id: 'library', mood: 'hope' }, combat: { enemy: {} }, players: [person('A', 0), person('B')], lastResult: result, journal: [result] });
    assert.deepEqual(selectMusic(view), { mood: 'grief', effect: 'death', enemyEffect: false });
  }
  const lost = base({ scene: { id: '__all_dead__', mood: 'hope', ending: true }, ending: true, players: [person('A', 0), person('B', 0)], lastResult: death });
  assert.equal(selectMusic(lost).mood, 'grief');
});

test('grief survives observation, a secret, collaboration and presence until an actual new action', () => {
  const original = base({ combat: { enemy: {} }, players: [person('A', 0), person('B')], lastResult: observation,
    journal: [death, observation, { grade: 'reveal', text: '아직 전하지 못한 이야기를 말했다.' }] });
  const frozen = JSON.stringify(original);
  for (const revision of [7, 8, 25]) {
    const view = { ...original, revision, players: original.players.map(p => ({ ...p, connected: revision !== 8, assisting: true })) };
    assert.deepEqual(selectMusic(view), { mood: 'grief', effect: null, enemyEffect: false });
  }
  assert.equal(JSON.stringify(original), frozen, 'the director does not mutate game state');
  const next = { action: '남은 적의 축을 친다', actor: 'B', grade: 'success', combat: true, combatEvent: 'attack', deaths: [], enemyRolls: [{ damage: 1 }] };
  assert.deepEqual(selectMusic({ ...original, lastResult: next, journal: [...original.journal, next] }), { mood: 'danger', effect: 'attack', enemyEffect: true });
  const victory = { ...next, combatEvent: 'victory', enemyRolls: [] };
  assert.deepEqual(selectMusic({ ...original, combat: null, lastResult: victory, journal: [death, victory] }), { mood: 'grief', effect: null, enemyEffect: false });
});

test('revival uses its own hopeful receipt, while a failed revival never becomes a success fanfare', () => {
  const view = base({ lastResult: revival, journal: [death, revival], pressure: { value: 8, max: 8 } });
  assert.deepEqual(selectMusic(view), { mood: 'hope', effect: 'revive', enemyEffect: false });
  assert.deepEqual(selectMusic({ ...view, lastResult: observation, journal: [...view.journal, observation] }), { mood: 'hope', effect: null, enemyEffect: false });
  const failed = { ...revival, grade: 'failure', revivedId: null, changes: ['이번 장소에서 재시도 불가'] };
  assert.deepEqual(selectMusic({ ...view, lastResult: failed, journal: [death, failed] }), { mood: 'grief', effect: 'failure', enemyEffect: false });
  const legacy = { ...failed }; delete legacy.revivedId;
  assert.equal(selectMusic({ ...view, lastResult: legacy, journal: [death, legacy] }).mood, 'grief');
});

test('an ordinary success does not change a mystery into hope; danger and pressure have separate roles', () => {
  const result = { action: '문을 연다', grade: 'success', text: '다음 방으로 들어갔다.' };
  assert.deepEqual(selectMusic(base({ lastResult: result })), { mood: 'mystery', effect: 'success', enemyEffect: false });
  assert.equal(selectMusic(base({ scene: { mood: 'calm' }, pressure: { value: 6, max: 8 } })).mood, 'tension');
  assert.equal(selectMusic(base({ scene: { mood: 'danger' }, pressure: { value: 6, max: 8 } })).mood, 'danger');
  assert.equal(selectMusic(base({ scene: { mood: 'hope' }, lastResult: observation })).mood, 'calm');
  assert.equal(selectMusic(base({ combat: { enemy: {} }, lastResult: observation })).mood, 'danger');
  assert.equal(selectMusic(base({ lastResult: { grade: 'observe', text: '사망한 의사의 기록을 읽었다.' } })).mood, 'mystery');
  const legacyDeath = { grade: 'failure', changes: ['사망: A'] };
  assert.equal(selectMusic(base({ lastResult: observation, journal: [legacyDeath, observation] })).mood, 'grief');
});

test('a local handoff cover reveals neither the private event tone nor any effect', () => {
  for (const lastResult of [death, revival, { grade: 'critical' }]) {
    assert.deepEqual(selectMusic(base({ lastResult, combat: { enemy: {} } }), { privateCover: true }), { mood: 'calm', effect: null, enemyEffect: false });
  }
});

test('real story death, observation, save restoration, combat victory and revival keep the intended tones', () => {
  const campaign = CAMPAIGNS.find(c => c.id === 'clock-city');
  let game = createGame(campaign, campaign.classes.slice(0, 2).map((job, i) => ({ id: `p${i}`, name: `동행${i}`, classId: job.id })));
  game.players[0].health = 1; // A wounded traveler is one point from actual death.
  function act(payload, roll = 20) {
    const actor = viewGame(game, campaign, 'p1').activePlayerId;
    const result = applyAction(game, campaign, actor, { ...payload, revision: game.revision }, { roll });
    assert.equal(result.ok, true, result.error); game = result.game;
  }
  act({ choiceId: 'tram-first' }, 1);
  assert.equal(game.players[0].life, 'dead');
  assert.deepEqual(selectMusic(viewGame(game, campaign, 'p1')), { mood: 'grief', effect: 'death', enemyEffect: false });
  act({ detailId: 'map' });
  game = revealSecret(game, campaign, 'p1').game;
  game = assist(game, 'p0').game;
  assert.equal(selectMusic(viewGame(game, campaign, 'p1')).mood, 'grief');
  game = validateSave({ game }, CAMPAIGNS).game;
  assert.equal(selectMusic(viewGame(game, campaign, 'p1')).mood, 'grief', 'a restored ordinary death remains in the journal');
  act({ choiceId: 'guide' });
  assert.equal(selectMusic(viewGame(game, campaign, 'p1')).mood, 'danger');
  let rounds = 0;
  while (game.combat && rounds++ < 20) act({ combatAction: 'basic' });
  assert.equal(game.combat, null);
  assert.equal(game.lastResult.combatEvent, 'victory');
  assert.deepEqual(selectMusic(viewGame(game, campaign, 'p1')), { mood: 'grief', effect: null, enemyEffect: false });
  act({ detailId: 'return-drawer' });
  act({ reviveId: 'p0' });
  assert.equal(game.players[0].life, 'alive');
  assert.deepEqual(selectMusic(viewGame(game, campaign, 'p1')), { mood: 'hope', effect: 'revive', enemyEffect: false });
  act({ detailId: 'terms' });
  game = validateSave({ game }, CAMPAIGNS).game;
  assert.equal(selectMusic(viewGame(game, campaign, 'p1')).mood, 'hope', 'a restored revival remains meaningful after observation');
});

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function audioHarness({ saved = {}, playback } = {}) {
  let time = 0, nextId = 0;
  const frames = new Map(), timers = new Map(), media = [], preferenceChanges = [];
  class FakeAudio extends EventTarget {
    constructor(src) {
      super(); this.src = src; this.initialSrc = src; this.dataset = {}; this.paused = true;
      this.currentTime = 0; this.volume = 0; this.loop = false; this.plays = 0; this.loads = 0; media.push(this);
    }
    play() { this.plays++; this.paused = false; return playback?.(this, media.length - 1) ?? Promise.resolve(); }
    pause() { this.paused = true; }
    load() { this.loads++; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const store = new Map([['cg-v14-audio', JSON.stringify(saved)]]);
  const mixer = createAudio(prefs => preferenceChanges.push(prefs), {
    Audio: FakeAudio, now: () => time,
    requestFrame: fn => { const id = ++nextId; frames.set(id, fn); return id; }, cancelFrame: id => frames.delete(id),
    setTimer: (fn, wait) => { const id = ++nextId; timers.set(id, { fn, at: time + wait }); return id; }, clearTimer: id => timers.delete(id),
    storage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
  });
  const step = ms => {
    time += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= time && timers.delete(id)) timer.fn();
    const scheduled = [...frames];
    for (const [id, fn] of scheduled) if (frames.delete(id)) fn(time);
  };
  const liveMusic = () => media.filter(el => el.src && el.loop && !el.paused);
  const liveEffects = () => media.filter(el => el.src && !el.loop && !el.paused);
  return { mixer, media, frames, timers, step, liveMusic, liveEffects, preferenceChanges };
}

test('silent startup and zero volume make no media requests, with modest defaults and retained settings', async () => {
  const h = audioHarness({ saved: { enabled: true, music: .32, effects: .5 } });
  try {
    assert.equal(h.mixer.preferences.enabled, false); assert.equal(h.mixer.preferences.music, .32);
    h.mixer.scene('clock-city', 'grief'); h.mixer.effect('death'); await flush();
    assert.equal(h.media.length, 0);
    h.mixer.setVolumes(0, 0); await h.mixer.enable(); h.mixer.effect('revive');
    assert.equal(h.media.length, 0);
    h.mixer.setVolumes(.25, .45); await flush();
    assert.equal(h.media.length, 1); assert.equal(h.media[0].initialSrc, '/game/audio/clock-city-grief.mp3?v=20000');
  } finally { h.mixer.destroy(); }
  const defaults = audioHarness();
  assert.equal(defaults.mixer.preferences.music, .25); defaults.mixer.destroy();
});

test('repeated state while loading and fading never restarts music or jumps its volume', async () => {
  const wait = deferred(); const h = audioHarness({ playback: () => wait.promise });
  try {
    h.mixer.scene('clock-city', 'mystery'); await h.mixer.enable();
    for (let i = 0; i < 20; i++) h.mixer.scene('clock-city', 'mystery');
    assert.equal(h.media.length, 1); assert.equal(h.media[0].plays, 1);
    wait.resolve(); await flush(); h.step(250);
    const volume = h.media[0].volume; assert.ok(volume > 0 && volume < .25);
    h.media[0].currentTime = 9.5;
    for (let i = 0; i < 20; i++) h.mixer.scene('clock-city', 'mystery');
    assert.equal(h.media[0].volume, volume); assert.equal(h.media[0].currentTime, 9.5);
    assert.equal(h.media.length, 1); assert.equal(h.media[0].plays, 1);
    h.step(1000); assert.equal(h.media[0].volume, .25);
    assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  } finally { h.mixer.destroy(); }
});

test('a 1.25-second crossfade has bounded volume, follows the slider and releases the previous track', async () => {
  const h = audioHarness();
  try {
    h.mixer.scene('deep-sea', 'mystery'); await h.mixer.enable(); await flush(); h.step(1250);
    const old = h.media[0]; h.mixer.scene('deep-sea', 'grief'); await flush();
    assert.equal(h.liveMusic().length, 2); assert.equal(old.volume, .25);
    h.step(625);
    assert.equal(old.volume, .125); assert.equal(h.media[1].volume, .125);
    h.mixer.setVolumes(.4, .45);
    assert.equal(old.volume, .2); assert.equal(h.media[1].volume, .2);
    h.mixer.scene('deep-sea', 'grief'); assert.equal(h.media[1].volume, .2);
    h.step(625);
    assert.equal(old.src, ''); assert.equal(old.paused, true); assert.equal(old.loads, 1);
    assert.equal(h.media[1].volume, .4); assert.equal(h.liveMusic().length, 1); assert.equal(h.frames.size, 0);
  } finally { h.mixer.destroy(); }
});

test('rapid real scene changes keep at most two music elements and ignore obsolete promises and frames', async () => {
  const gates = []; const h = audioHarness({ playback: () => { const gate = deferred(); gates.push(gate); return gate.promise; } });
  try {
    h.mixer.scene('snow-radio', 'calm'); await h.mixer.enable(); gates[0].resolve(); await flush(); h.step(1250);
    h.mixer.scene('snow-radio', 'danger');
    h.mixer.scene('snow-radio', 'grief');
    assert.equal(h.media.length, 3); assert.equal(h.media[1].src, ''); assert.ok(h.liveMusic().length <= 2);
    gates[1].resolve(); gates[2].resolve(); await flush();
    const obsolete = [...h.frames.values()][0];
    h.mixer.scene('snow-radio', 'hope'); gates[3].resolve(); await flush();
    obsolete?.(2000); // A queued callback must not own the newer transition.
    assert.ok(h.liveMusic().length <= 2);
    h.step(1250);
    assert.equal(h.liveMusic().length, 1); assert.match(h.liveMusic()[0].src, /snow-radio-hope/);
  } finally { h.mixer.destroy(); }
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0); assert.ok(h.media.every(el => !el.src));
});

test('visibility pause cancels transition and effects; resume plays only the latest desired scene', async () => {
  const h = audioHarness();
  try {
    h.mixer.scene('last-train', 'calm'); await h.mixer.enable(); await flush(); h.step(1250);
    h.mixer.scene('last-train', 'danger'); await flush(); h.step(200); h.mixer.effect('enemy');
    h.mixer.pause();
    assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0); assert.ok(h.media.every(el => el.paused));
    const count = h.media.length; h.mixer.scene('last-train', 'grief'); h.mixer.effect('death');
    assert.equal(h.media.length, count);
    h.mixer.resume(); await flush(); h.step(1250);
    assert.equal(h.liveMusic().length, 1); assert.match(h.liveMusic()[0].src, /last-train-grief/);
    assert.equal(h.liveEffects().length, 0);
    h.mixer.disable(); h.mixer.resume(); assert.ok(h.media.every(el => el.paused));
  } finally { h.mixer.destroy(); }
});

test('a stalled music start cannot hold settings or repeat requests and is cleaned after eight seconds', async () => {
  const gate = deferred(); const h = audioHarness({ playback: () => gate.promise });
  try {
    h.mixer.scene('glass-hotel', 'mystery');
    assert.equal(await h.mixer.enable(), true);
    for (let i = 0; i < 30; i++) h.mixer.scene('glass-hotel', 'mystery');
    assert.equal(h.media.length, 1); assert.equal(h.timers.size, 1);
    h.step(8000); assert.equal(h.media[0].src, ''); assert.equal(h.timers.size, 0);
    for (let i = 0; i < 10; i++) h.mixer.scene('glass-hotel', 'mystery');
    assert.equal(h.media.length, 1, 'ordinary rendering does not retry failed media');
    await h.mixer.enable(); assert.equal(h.media.length, 2, 'explicit enable permits one fresh attempt');
    h.mixer.destroy(); gate.resolve(); await flush();
    assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0); assert.ok(h.media.every(el => !el.src && el.paused));
  } finally { h.mixer.destroy(); }
});

test('a rejected replacement preserves the old track and media errors clean the active transition', async () => {
  let rejects = false; const h = audioHarness({ playback: () => rejects ? Promise.reject(new Error('unavailable')) : Promise.resolve() });
  try {
    h.mixer.scene('moon-market', 'calm'); await h.mixer.enable(); await flush(); h.step(1250);
    const old = h.media[0]; rejects = true; h.mixer.scene('moon-market', 'hope'); await flush();
    assert.equal(old.paused, false); assert.equal(old.volume, .25); assert.equal(h.media[1].src, '');
    assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
    rejects = false; h.mixer.scene('moon-market', 'grief'); await flush(); h.step(100);
    h.media[2].dispatchEvent(new Event('error'));
    assert.equal(h.media[2].src, ''); assert.equal(h.frames.size, 0); assert.equal(h.liveMusic()[0], old);
  } finally { h.mixer.destroy(); }
});

test('death and revival replace cheerful effects, use the new cache, and ordinary effects retain their cache', async () => {
  const h = audioHarness();
  try {
    h.mixer.setVolumes(0, .4); await h.mixer.enable();
    for (let i = 0; i < 8; i++) h.mixer.effect('attack');
    assert.equal(h.liveEffects().length, 4); assert.equal(h.media.length, 4);
    assert.ok(h.media.every(el => el.initialSrc === '/game/audio/attack.mp3?v=17000'));
    h.mixer.effect('death'); assert.equal(h.liveEffects().length, 1);
    assert.equal(h.media.at(-1).initialSrc, '/game/audio/death.mp3?v=19000');
    assert.ok(h.media.slice(0, 4).every(el => !el.src && el.paused));
    h.mixer.effect('revive'); assert.equal(h.liveEffects().length, 1);
    assert.equal(h.media.at(-1).initialSrc, '/game/audio/revive.mp3?v=19000');
    const before = h.media.length; assert.equal(h.mixer.effect('../../bad'), false); assert.equal(h.media.length, before);
    h.media.at(-1).dispatchEvent(new Event('ended')); assert.equal(h.liveEffects().length, 0); assert.equal(h.timers.size, 0);
    h.mixer.effect('dice'); h.step(10000);
    assert.equal(h.liveEffects().length, 0); assert.equal(h.timers.size, 0);
  } finally { h.mixer.destroy(); }
});

test('destroy cancels pending playback, all one-shot cleanup and every scheduled fade', async () => {
  const gate = deferred(); const h = audioHarness({ playback: el => el.loop ? gate.promise : Promise.resolve() });
  h.mixer.scene('dragon-banquet', 'danger'); await h.mixer.enable(); h.mixer.effect('ability');
  assert.equal(h.timers.size, 2);
  h.mixer.destroy(); gate.resolve(); await flush();
  h.mixer.resume(); h.mixer.scene('dragon-banquet', 'hope'); h.mixer.effect('victory');
  assert.equal(h.media.length, 2); assert.ok(h.media.every(el => !el.src && el.paused));
  assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
});
