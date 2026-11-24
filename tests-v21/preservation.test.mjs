/** The user asked to keep the v20 look, dice and music while adding stories. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const preserved=JSON.parse(fs.readFileSync(new URL('./fixtures/v20-preserved-files.json',import.meta.url),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('v20 pictures, music, D20, UI behavior, professions and personal openings retain their delivered bytes',()=>{
  for(const [relative,expected] of Object.entries(preserved)){
    let bytes=fs.readFileSync(new URL(`../${relative}`,import.meta.url));
    // Only the two downloaded-save/chronicle filename prefixes changed.
    if(relative==='public/game/app.js')bytes=Buffer.from(bytes.toString('utf8').replaceAll('chronicle-gate-v21-','chronicle-gate-v20-'));
    assert.equal(hash(bytes),expected,`${relative}: a preserved v20 component changed`);
  }
});
