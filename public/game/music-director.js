import { HORROR_ENDING_MOODS } from './campaigns/horror-data.js';
/* Music follows the event being read, not a redraw or the die's success label. */
const MOODS = new Set(['calm', 'mystery', 'tension', 'danger', 'hope', 'grief']);
const PASSIVE_GRADES = new Set(['observe', 'safe', 'reveal', 'assist', 'presence', 'pass']);

// These are authored ending tones. Several endings recover something without
// undoing a loss; they should not inherit the old universal "hope" setting.
export const ENDING_MOODS = Object.freeze({
  ...HORROR_ENDING_MOODS,
  'last-train': Object.freeze({
    "ending-new-stop": "hope",
    "ending-home": "calm",
    "ending-shift": "calm",
    "ending-letter-home": "hope",
    "ending-last-service": "grief"
  }),
  'glass-hotel': Object.freeze({
    "ending-return": "hope",
    "ending-settlement": "calm",
    "ending-break": "grief",
    "ending-rest-house": "hope",
    "ending-hotel-closed": "calm"
  }),
  'moon-market': Object.freeze({
    "ending-landing": "calm",
    "ending-travel": "hope",
    "ending-sky": "calm",
    "ending-return-lanterns": "hope",
    "ending-unopened-house": "calm"
  }),
  'deep-sea': Object.freeze({
    "ending-witness": "hope",
    "ending-harbor": "calm",
    "ending-common": "hope",
    "ending-open-water": "hope",
    "ending-deep-watch": "calm"
  }),
  'dragon-banquet': Object.freeze({
    "ending-hearth": "hope",
    "ending-caravan": "hope",
    "ending-transition": "calm",
    "ending-winter-palace": "hope",
    "ending-spring-return": "grief"
  }),
  'clock-city': Object.freeze({
    "ending-slow": "calm",
    "ending-newtown": "grief",
    "ending-common": "hope",
    "ending-return-station": "hope",
    "ending-last-delivery": "grief"
  }),
  'snow-radio': Object.freeze({
    "ending-silence": "calm",
    "ending-beacon": "hope",
    "ending-choice": "hope",
    "ending-carried-voices": "hope",
    "ending-kept-letters": "calm"
  }),
});

const changesOf = result => Array.isArray(result?.changes) ? result.changes.filter(value => typeof value === 'string') : [];
const passive = result => !result || PASSIVE_GRADES.has(result.grade);
const hasDeath = result => Boolean(result && (
  (Array.isArray(result.deaths) && result.deaths.length) || result.combatEvent === 'defeat' ||
  // Old saves did not retain structured non-combat deaths. Only read the
  // engine's explicit change markers, never a story mentioning a past death.
  changesOf(result).some(change => /^(사망|전원 사망):/u.test(change))
));
const hasRevival = result => Boolean(result && (
  (typeof result.revivedId === 'string' && result.revivedId) ||
  changesOf(result).some(change => / 생명 [1-3]로 귀환$/u.test(change))
));
const revivalAttempt = result => Boolean(result && (
  Object.hasOwn(result, 'revivedId') || / 부활 · /u.test(result.action || '')
));
const livingPlayer = player => player?.life !== 'dead' && player?.health !== 0;
const someoneLost = view => (view?.players || []).some(player => !livingPlayer(player));

function latestMeaningfulResult(view) {
  if (!passive(view?.lastResult)) return view.lastResult;
  const journal = Array.isArray(view?.journal) ? view.journal : [];
  for (let i = journal.length - 1; i >= 0; i--) {
    if (!passive(journal[i])) return journal[i];
  }
  return null;
}

function moodFor(view) {
  const scene = view?.scene || {};
  const players = Array.isArray(view?.players) ? view.players : [];
  const allLost = scene.id === '__all_dead__' || (players.length > 0 && players.every(player => !livingPlayer(player)));
  if (allLost) return 'grief';

  const meaningful = latestMeaningfulResult(view);
  // Observation, revealing a secret, collaboration and presence updates do
  // not replace this event. A new actual choice/attack/revival does.
  if (hasDeath(meaningful)) return 'grief';
  if (hasRevival(meaningful)) return 'hope';
  if (revivalAttempt(meaningful)) return 'grief';
  if (meaningful?.combatEvent === 'victory' && someoneLost(view)) return 'grief';

  if (view?.combat) return 'danger';
  if (view?.ending || scene.ending) {
    if (someoneLost(view)) return 'grief';
    return ENDING_MOODS[view.campaignId]?.[scene.id] || 'calm';
  }

  let mood = MOODS.has(scene.mood) ? scene.mood : 'mystery';
  const pressure = view?.pressure;
  const highPressure = Number.isFinite(pressure?.value) && Number.isFinite(pressure?.max) &&
    pressure.max > 0 && pressure.value >= Math.ceil(pressure.max * .75);
  if (highPressure && mood !== 'danger' && mood !== 'grief') return 'tension';
  if (view?.lastResult?.grade === 'observe' && mood === 'hope') mood = 'calm';
  return mood;
}

function effectFor(view, mood) {
  const result = view?.lastResult;
  if (passive(result)) return null;
  if (hasDeath(result)) return 'death';
  if (hasRevival(result)) return 'revive';
  if (revivalAttempt(result)) return 'failure';
  // An escape with casualties or a deliberate loss is not a victory fanfare.
  if ((view?.ending || view?.scene?.ending) && mood === 'grief') return null;
  if (result.combatEvent === 'victory' && someoneLost(view)) return null;
  if (result.combat) {
    if (result.combatEvent === 'victory') return 'victory';
    if (result.combatEvent === 'ability') return 'ability';
    return ['failure', 'fumble'].includes(result.grade) ? 'failure' : 'attack';
  }
  if (['critical', 'success'].includes(result.grade)) return 'success';
  if (result.grade === 'mixed') return 'mixed';
  if (['failure', 'fumble'].includes(result.grade)) return 'failure';
  return 'transition';
}

/**
 * Pure decision for one personalized game view. The UI sounds `effect` only
 * for a newly received result; calling this again never starts any audio.
 */
export function selectMusic(view, { privateCover = false } = {}) {
  if (privateCover) return { mood: 'calm', effect: null, enemyEffect: false };
  const mood = moodFor(view), effect = effectFor(view, mood);
  const result = view?.lastResult;
  const enemyEffect = Boolean(result?.combat && effect !== 'death' && mood !== 'grief' &&
    !['victory', 'defeat'].includes(result.combatEvent) &&
    result.enemyRolls?.some(roll => roll.damage > 0));
  return { mood, effect, enemyEffect };
}
