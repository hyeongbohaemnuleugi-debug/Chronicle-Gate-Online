import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/202609010002_accounts_and_progress.sql',import.meta.url),'utf8');

test('release has nine distinct chronicles',()=>{
  assert.equal(CAMPAIGNS.length,9);
  assert.equal(new Set(CAMPAIGNS.map(c=>c.id)).size,9);
});

test('story scenes are readable, context-rich and expose tabletop-sized choice sets',()=>{
  for(const c of CAMPAIGNS){
    for(const beat of c.storyBeats||[]){
      assert.ok(String(beat.text||'').split(/\n\n+/).filter(Boolean).length>=4,`${c.id}/${beat.id} prose`);
      assert.ok(beat.choices.length>=5&&beat.choices.length<=6,`${c.id}/${beat.id} choice count`);
      assert.ok(new Set(beat.choices.map(x=>x.actionType)).size>=3,`${c.id}/${beat.id} action diversity`);
      assert.equal(beat.freeActionAllowed,false,`${c.id}/${beat.id} choice-only`);
    }
  }
});

test('auth password contract is one consistent 4..72 rule',()=>{
  assert.match(server,/ACCOUNT_PASSWORD_MIN\s*=\s*4/);
  assert.match(server,/ACCOUNT_PASSWORD_MAX\s*=\s*72/);
  assert.match(client,/ACCOUNT_PASSWORD_MIN\s*=\s*4/);
  assert.match(client,/ACCOUNT_PASSWORD_MAX\s*=\s*72/);
  assert.match(html,/id="authPassword"[^>]*minlength="4"[^>]*maxlength="72"/);
});

test('account persistence migration contains every backend dependency',()=>{
  for(const token of ['cg_accounts','cg_auth_sessions','cg_endings','record_chronicle_ending','purchase_chronicle_dice']) assert.match(migration,new RegExp(token));
  assert.match(migration,/grant execute[\s\S]*service_role/i);
});

test('story progression is choice-only in client and server',()=>{
  assert.match(client,/v9\.1 choice-only/);
  assert.match(server,/beat\.freeActionAllowed = false/);
  assert.match(server,/choices:explainedChoices, freeActionAllowed:false/);
  assert.match(server,/이 버전은 선택지 전용입니다/);
});

test('choices retain their own consequences and branches after release decoration',()=>{
  for(const c of CAMPAIGNS){
    const first=c.storyBeats[0];
    assert.ok(new Set(first.choices.map(x=>x.id)).size===first.choices.length);
    assert.ok(new Set(first.choices.map(x=>`${x.next?.success}|${x.next?.failure}`)).size>=2,`${c.id} opening branches collapsed`);
    assert.ok(first.choices.every(x=>x.success&&x.failure));
  }
});

test('client presents risk/opportunity without always exposing exact DC',()=>{
  assert.match(client,/choiceTagsHTML/);
  assert.match(client,/const revealDc=Boolean\(scene\?\.statInsight\?\.insight\)/);
  assert.match(client,/choiceDifficultyLabel/);
});

test('local development has durable login fallback while production remains explicit',()=>{
  assert.match(server,/!productionMode \? path\.join\(process\.cwd\(\), '\.chronicle-data'\)/);
  assert.match(server,/accountStoreMode = accountPersistenceEnabled \? 'supabase'/);
  assert.match(server,/ACCOUNT STORAGE NOT CONFIGURED/);
});
