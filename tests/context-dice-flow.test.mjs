import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('context filter blocks impossible social/combat actions', () => {
  assert.match(server, /if \(action === 'fight'\) return ctx\.hasHostile/);
  assert.match(server, /\['persuade','threaten','trade','tail'\]\.includes\(action\)\) return ctx\.hasPerson/);
  assert.match(server, /stat !== '매력' \|\| sceneCtx\.hasPerson/);
});

test('generated choices are scene-affordance based rather than stat-only filler', () => {
  assert.match(server, /function contextualGeneratedAction\(/);
  assert.match(server, /ctx\.hasHostile/);
  assert.match(server, /ctx\.hasStealthPressure/);
  assert.match(server, /ctx\.hasRescue \|\| ctx\.hasPerson/);
});

test('room-wide dice rolls carry a synchronized start timestamp', () => {
  assert.match(server, /io\.to\(room\.code\)\.emit\('dice:roll'/);
  assert.match(server, /startsAt: Date\.now\(\) \+ 650/);
  assert.match(client, /const startsAt = Number\(payload\.startsAt \|\| 0\)/);
});

test('story and event rolls skip the duplicate numeric result screen', () => {
  assert.match(client, /payload\.kind === 'story-choice' \|\| payload\.kind === 'check'/);
  assert.match(client, /if \(narrativeRoll\)/);
  assert.match(client, /renderStory\(\);/);
  assert.match(client, /!\['story','event'\]\.includes/);
});
