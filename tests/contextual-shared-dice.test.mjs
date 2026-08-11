import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const campaign=fs.readFileSync(new URL('../campaign-data.js', import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js', import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js', import.meta.url),'utf8');

test('contextual choices use target + short action labels',()=>{
  assert.match(campaign,/\$\{obj\} 조사한다/);
  assert.match(campaign,/\$\{obj\} 설득한다/);
  assert.match(campaign,/personTarget/);
  assert.match(campaign,/hostilePresent/);
  assert.match(campaign,/stealablePresent/);
});

test('story dice is broadcast to the whole room',()=>{
  assert.match(server,/io\.to\(room\.code\)\.emit\('dice:roll'/);
});

test('story result auto advances after the shared dice view without duplicate modal',()=>{
  assert.match(server,/story:resultSeen/);
  assert.match(app,/payload\.kind === 'story-choice'/);
  assert.match(app,/r\?\.source !== 'story'/);
});
