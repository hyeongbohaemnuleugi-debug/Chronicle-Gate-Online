/** Original v23 battle one-shots. Assets are requested only at the audible event. */
export const BATTLE_EFFECTS = Object.freeze([
  'battle-swing', 'battle-skill', 'battle-hit', 'battle-critical', 'battle-miss',
  'battle-fumble', 'battle-enemy', 'battle-hurt', 'battle-shield', 'battle-heal',
  'battle-stun', 'battle-victory', 'battle-defeat',
]);
export const BATTLE_SOUND_LEVELS = Object.freeze({
  'battle-swing': .74, 'battle-skill': .70, 'battle-hit': .82,
  'battle-critical': .82, 'battle-miss': .68, 'battle-fumble': .77,
  'battle-enemy': .76, 'battle-hurt': .79, 'battle-shield': .73,
  'battle-heal': .64, 'battle-stun': .69, 'battle-victory': .67,
  'battle-defeat': .70,
});
const allowed = new Set(BATTLE_EFFECTS);
export const isBattleEffect = name => allowed.has(name);
export const battleSoundUrl = name => allowed.has(name) ? `/game/audio/sfx/${name}.mp3?v=23000` : null;

