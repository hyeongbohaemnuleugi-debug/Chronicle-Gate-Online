/** Retained v20 assets still match their historical hashes after later additions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const preserved=JSON.parse(fs.readFileSync(new URL('./fixtures/v20-preserved-files.json',import.meta.url),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('the original pictures, music files, D20, professions and authored opening passages retain their delivered bytes',()=>{
  for(const [relative,expected] of Object.entries(preserved)){
    // v22 intentionally integrates lengths/private starts/context sounds in these modules.
    if(['public/game/app.js','public/game/audio.js','public/game/audio-fallback.js','public/game/opening.js'].includes(relative))continue;
    // v23 deliberately adds a separate battle layout and authoritative visual
    // receipts. Neither styles nor combat.js is claimed to be byte-identical.
    if(['public/game/styles.css','public/game/combat.js'].includes(relative))continue;
    const bytes=fs.readFileSync(new URL(`../${relative}`,import.meta.url));
    assert.equal(hash(bytes),expected,`${relative}: a preserved v20 component changed`);
  }
});
