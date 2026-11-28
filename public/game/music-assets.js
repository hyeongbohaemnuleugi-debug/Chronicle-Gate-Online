import { AUDIO_LOOPS, AUDIO_VERSION } from './audio-loops.js';
import { HORROR_LOOPS, HORROR_AUDIO_VERSION } from './horror-loops.js';

const MOODS = new Set(['mystery', 'calm', 'tension', 'danger', 'hope', 'grief']);
const HORROR_THEMES = Object.freeze({
  'hollow-apartment': 'horror-apartment',
  'drowned-broadcast': 'horror-broadcast',
});

/** Keep the original seven scores and their cache identity intact. */
export const MUSIC_LOOPS = Object.freeze({ ...AUDIO_LOOPS, ...HORROR_LOOPS });
export const isHorrorScore = key => Object.hasOwn(HORROR_LOOPS, key);
export const musicTheme = id => Object.hasOwn(HORROR_THEMES, id) ? HORROR_THEMES[id] : id;
export const musicAssetUrl = key => isHorrorScore(key)
  ? `/game/audio/${key}.mp3?v=${HORROR_AUDIO_VERSION}`
  : `/game/audio/${key}.mp3?v=${AUDIO_VERSION}`;

/** Calm means a lull inside the horror, not the old hotel's cheerful waltz.
 * Calm and investigation intentionally share a sustained bed so observing a
 * clue cannot restart the music. Grief and restrained relief are shared files,
 * while each horror retains its own exploration, tension and combat palette. */
export function resolveMusicAsset(campaignId, mood = 'mystery') {
  if (typeof campaignId !== 'string' || !/^[a-z0-9-]+$/.test(campaignId)) return null;
  const tone = MOODS.has(mood) ? mood : 'mystery';
  const theme = musicTheme(campaignId);
  let key = `${theme}-${tone}`;
  if (Object.hasOwn(HORROR_THEMES, campaignId)) {
    key = tone === 'grief' ? 'horror-shared-grief'
      : tone === 'hope' ? 'horror-shared-relief'
      : `${theme}-${tone === 'calm' || tone === 'mystery' ? 'ambient' : tone}`;
  }
  return { key, version: isHorrorScore(key) ? HORROR_AUDIO_VERSION : AUDIO_VERSION,
    loop: MUSIC_LOOPS[key], url: musicAssetUrl(key) };
}
