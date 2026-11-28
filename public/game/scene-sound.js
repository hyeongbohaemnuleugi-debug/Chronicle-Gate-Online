/** Authored one-shot sound cues, independent of scene polling and die outcomes. */
export const SCENE_SOUNDS = Object.freeze(['knock','scream','murmur','footsteps','door-creak','glass','metal','water','wind','radio-static','heartbeat','chime']);
const allowed = new Set(SCENE_SOUNDS);
export const SOUND_LEVELS = Object.freeze({scream:.5,murmur:.64,wind:.65,'radio-static':.6,heartbeat:.8});
export { musicTheme } from './music-assets.js';
export const BASIC_SCENE_SOUNDS = Object.freeze({
  'last-train': {carriage:'heartbeat',tunnel:'knock',brake:'metal',switch:'metal'},
  'glass-hotel': {entrance:'door-creak',service:'footsteps',stair:'footsteps',roof:'chime'},
  'moon-market': {bridge:'water',scales:'wind',fish:'murmur',ledger:'murmur',crane:'metal'},
  'deep-sea': {deck:'water',bell:'metal',hydroponics:'water',signal:'radio-static'},
  'dragon-banquet': {gate:'murmur',kitchen:'metal',chimney:'wind',banquet:'murmur'},
  'clock-city': {square:'knock',press:'murmur',council:'murmur',roof:'metal'},
  'snow-radio': {hut:'radio-static',whiteout:'wind',cableway:'metal',relay:'radio-static','snow-morning-platform':'wind'},
});
export const safeSound = name => allowed.has(name) ? name : null;
export const sceneSound = (campaignId,node) => safeSound(node?.sound || BASIC_SCENE_SOUNDS[campaignId]?.[node?.id]);

/** At most one contextual cue per reading update. Joining/restoring consumes
 * receipts silently; observers, presence packets and volume changes never replay them.
 * The caller supplies the view actually on screen, including delayed die receipts. */
export function createSceneSoundDirector(play,stop=()=>{}) {
  const seen = new Set();
  const remember = key => { if(!key)return;seen.add(key);if(seen.size>256)seen.delete(seen.values().next().value); };
  return {
    reset(){seen.clear();stop();},
    update(view,{allowEffects=false,privateCover=false,eventKey='',scope='',mood='mystery',resultOnly=false}={}) {
      if(!view || privateCover || !view.scene || view.scene.id==='opening:waiting'){stop();return null;}
      const sceneKey=`scene:${scope}:${view.campaignId}:${view.storyLength||'basic'}:${view.scene.id}:${view.combat?'combat':'prose'}`;
      const resultKey=eventKey?`result:${scope}:${eventKey}`:'';
      const newScene=!resultOnly&&!seen.has(sceneKey),newResult=resultKey&&!seen.has(resultKey);
      if(!resultOnly)remember(sceneKey);remember(resultKey);
      const result=view.lastResult;
      if(newScene || mood==='grief' || result?.deaths?.length || result?.revivedId)stop();
      if(!allowEffects || mood==='grief' || result?.deaths?.length || result?.revivedId || view.scene.id==='__all_dead__')return null;
      const cue=(newResult&&safeSound(result?.sound)) || (newScene&&!view.combat&&safeSound(view.scene.sound));
      if(cue){play(cue);return cue;}
      return null;
    },
  };
}
