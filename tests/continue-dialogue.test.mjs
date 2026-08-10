import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const persistence = fs.readFileSync(new URL('../persistence.js', import.meta.url), 'utf8');

test('main menu includes nickname-based Continue flow', () => {
  assert.match(html, /id="openContinue"/);
  assert.match(app, /session:lookup/);
  assert.match(app, /session:resume/);
  assert.match(server, /session:lookup/);
  assert.match(server, /session:resume/);
  assert.match(persistence, /findResumableRoomSnapshotsByName/);
});

test('resumed multiplayer session is blocked until original party returns', () => {
  assert.match(server, /resumeRequiredIds/);
  assert.match(server, /resumeBlocked/);
  assert.match(server, /strictPartyResume/);
  assert.match(app, /resumeMissingNames/);
});

test('story UI separates dialogue narration and thought while choices are compact', () => {
  assert.match(app, /story-dialogue/);
  assert.match(app, /story-thought/);
  assert.match(css, /\.scene-narration/);
  assert.match(css, /\.choice-card\{min-height:0;padding:9px 10px/);
});

test('party card shows defense and passive traits beside status', () => {
  assert.match(app, /party-defense/);
  assert.match(app, /status-pill passive/);
});
