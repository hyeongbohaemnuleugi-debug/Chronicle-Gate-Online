import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CAMPAIGNS } from '../campaign-data.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('all 30 jobs have active skill definitions with diverse mechanics', () => {
  const jobs = CAMPAIGNS.flatMap(c => c.jobs);
  assert.equal(jobs.length, 30);
  for (const job of jobs) {
    assert.ok(job.skillDef?.name, `${job.name} skill name`);
    assert.ok(job.skillDef?.kind, `${job.name} skill kind`);
    assert.ok(job.skillDef?.text, `${job.name} skill text`);
    assert.ok(job.skillDef?.cooldown >= 2 && job.skillDef?.cooldown <= 4, `${job.name} cooldown`);
  }
  const kinds = new Set(jobs.map(j => j.skillDef.kind));
  assert.ok(kinds.size >= 10, `expected diverse skills, got ${kinds.size} kinds`);
});

test('healer/priest jobs provide real party recovery or cleansing', () => {
  const names = ['백은 사제','심해 의무관','별빛 치유사'];
  const jobs = CAMPAIGNS.flatMap(c => c.jobs).filter(j => names.includes(j.name));
  assert.equal(jobs.length, names.length);
  for (const job of jobs) assert.match(job.skillDef.kind, /heal|cleanse/i);
});

test('all required audio assets exist and are non-empty', () => {
  const names = ['dice_roll.wav','success.wav','failure.wav','scene_next.wav','attack.wav','hit.wav','hp_loss.wav','boss_warning.wav','vote_lock.wav','bgm_ember.wav','bgm_neon.wav','bgm_abyss.wav','bgm_clock.wav','bgm_wild.wav','bgm_combat.wav'];
  for (const name of names) {
    const file = path.join(root, 'public', 'audio', name);
    assert.ok(fs.existsSync(file), `${name} exists`);
    assert.ok(fs.statSync(file).size > 1024, `${name} is non-empty`);
  }
});

test('client contains staged roll breakdown and sound test control', () => {
  const app = fs.readFileSync(path.join(root,'public','app.js'),'utf8');
  const html = fs.readFileSync(path.join(root,'public','index.html'),'utf8');
  assert.match(app, /payload\.modifiers/);
  assert.match(app, /roll-mod/);
  assert.match(html, /id="diceBreakdown"/);
  assert.match(html, /id="audioTestBtn"/);
});
