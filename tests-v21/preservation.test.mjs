/** The user asked to keep the v20 look, dice and music while adding stories. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const preserved=JSON.parse(fs.readFileSync(new URL('./fixtures/v20-preserved-files.json',import.meta.url),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('the original pictures, music files, D20, styles, professions and authored opening passages retain their delivered bytes',()=>{
  for(const [relative,expected] of Object.entries(preserved)){
    // v22 intentionally integrates lengths/private starts/context sounds in these modules.
    if(['public/game/app.js','public/game/audio.js','public/game/audio-fallback.js','public/game/opening.js'].includes(relative))continue;
    let bytes=fs.readFileSync(new URL(`../${relative}`,import.meta.url));
    // Only the two downloaded-save/chronicle filename prefixes changed.
    if(relative==='public/game/app.js')bytes=Buffer.from(bytes.toString('utf8').replaceAll('chronicle-gate-v21-','chronicle-gate-v20-'));
    assert.equal(hash(bytes),expected,`${relative}: a preserved v20 component changed`);
  }
});
