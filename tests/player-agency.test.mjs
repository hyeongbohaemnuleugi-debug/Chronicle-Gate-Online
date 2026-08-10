import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

 test('ordinary scenes support four viable approaches plus optional free action', () => {
  assert.match(server, /importanceKey === 'ordinary'/);
  assert.match(server, /visible\.filter\(choice => !choice\.requiredJob\)\.length < 4/);
  assert.match(server, /freeActionAllowed/);
  assert.match(server, /interpretFreeAction/);
  assert.match(app, /직접 적은 행동으로 판정하기/);
});

test('difficulty is bounded by scene importance instead of globally high DCs', () => {
  assert.match(server, /ordinary: \{ label:'일반 장면', dcMin:8, dcMax:11/);
  assert.match(server, /important: \{ label:'중요 장면', dcMin:10, dcMax:13/);
  assert.match(server, /pivotal: \{ label:'결정적 장면', dcMin:12, dcMax:15/);
  assert.match(app, /choice\.difficulty/);
});

test('ability scores change real systems beyond D20 modifiers', () => {
  assert.match(server, /maxHpBonus/);
  assert.match(server, /strengthDamage/);
  assert.match(server, /shopDiscount/);
  assert.match(server, /statusResistance/);
  assert.match(server, /defense: 10 \+ mod\(dex\)/);
  assert.match(app, /ABILITY IMPACT/);
});

test('boss combat has simple attack defend skill actions', () => {
  assert.match(index, /id="defendBtn"/);
  assert.match(server, /socket\.on\('combat:defend'/);
  assert.match(app, /공격 · D20/);
  assert.match(app, /방어 · 피해 흡수/);
});

test('natural 1 and 20 remain decisive while normal rolls use totals', () => {
  assert.match(server, /roll === 20 \|\| \(roll !== 1 && total >= dc\)/);
  assert.match(server, /result === 20 \|\| \(result !== 1 && total >= room\.monster\.ac\)/);
});
