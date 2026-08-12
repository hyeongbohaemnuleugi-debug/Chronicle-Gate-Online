import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('parallel subway story renders the same character HUD as normal story', () => {
  assert.match(client, /function renderCharacterHud\(/);
  assert.match(client, /renderCharacterHud\(p, scene\.storyItems \|\| \[\]\)/);
  assert.match(client, /renderEconomyPanel\(p, storyItems\)/);
});

test('parallel story adds richer scene prose beyond the authored opening lines', () => {
  assert.match(server, /function parallelSceneNarrative\(/);
  assert.match(server, /paragraphs:parallelSceneNarrative\(/);
  assert.match(server, /야간 역무원인 당신은 평소 막차 뒤의 역사 소리를 알고 있다/);
});

test('parallel choices are curated to a smaller situation-focused set', () => {
  assert.match(server, /function parallelCurateChoices\(/);
  assert.match(server, /return selected\.slice\(0,7\)/);
  assert.match(server, /parallelCurateChoices\(room,campaign,player,node,dynamic,base\)/);
});
