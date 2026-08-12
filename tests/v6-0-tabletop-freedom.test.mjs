import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('side-event DCs stay playable across late acts',()=>{
  for(const c of CAMPAIGNS){
    for(const ev of c.events||[]) for(const ch of ev.choices||[]) assert.ok(ch.dc<=12,`${c.id}/${ev.id}/${ch.label} DC ${ch.dc}`);
  }
});

test('natural 1 always fails and natural 20 always succeeds on d20 checks',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/roll === 20 \|\| \(roll !== 1 && total >= dc\)/);
  assert.match(server,/result === 20 \|\| \(result !== 1 && total >= dc\)/);
});

test('glass-star campaign is now an air-route adventure, not a second memory/dead-expedition mystery',()=>{
  const echo=CAMPAIGNS.find(c=>c.id==='echo');
  assert.ok(echo);
  assert.match(echo.title,/유리별/);
  assert.match(echo.intro,/부유섬|항로|비행선/);
  assert.doesNotMatch(echo.intro,/17년 전 죽은 탐사대/);
  assert.ok(echo.acts.some(a=>a.includes('폭풍')));
});


test('sync payloads do not resend the entire story graph to every client',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/CAMPAIGNS\.map\(\(\{ events, titles, storyBeats, \.\.\.campaign \}\)/);
  const publicRoomBlock=server.slice(server.indexOf('function publicRoom(room)'),server.indexOf('function sync(room)'));
  assert.doesNotMatch(publicRoomBlock,/storyBeats:\s*campaign\.storyBeats/);
  assert.match(publicRoomBlock,/storyBeat:\s*room\.phase/);
});
