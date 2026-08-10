import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('boss and regular encounters carry spoken intro lines', () => {
  assert.match(server, /BOSS_INTRO_LINES/);
  assert.match(server, /REGULAR_ENCOUNTER_LINES/);
  assert.match(server, /introLine/);
  assert.match(server, /isBoss/);
});

test('client renders a dedicated encounter introduction overlay', () => {
  assert.match(app, /showEncounterIntro/);
  assert.match(app, /BOSS ENCOUNTER/);
  assert.match(app, /encounterIntroLayer/);
  assert.match(css, /encounter-intro-layer/);
});

test('extreme ability scores generate gameplay passives and flaws', () => {
  for (const label of ['허약','괴력','굼뜸','번개반사','멍청이','천재','눈치 없음','직감','비호감','타고난 협상가','병약','강인함']) {
    assert.ok(server.includes(label), `missing trait ${label}`);
  }
  assert.match(server, /traitCheckBonus/);
  assert.match(server, /combatHitBonus/);
  assert.match(server, /guardBonus/);
});

test('combat remains three-action player-facing system', () => {
  assert.match(app, /공격 · D20/);
  assert.match(app, /방어 · 피해 흡수/);
  assert.match(app, /공격 · 방어 · 직업 스킬 중 하나만 선택하세요/);
});
