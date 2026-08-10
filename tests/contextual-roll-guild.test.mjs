import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

test('contextual choice generator does not force combat into peaceful object-only scenes',()=>{
  for(const c of CAMPAIGNS){
    for(const b of c.storyBeats.filter(x=>!x.branchScene)){
      const text=`${b.title||''} ${b.situation||''} ${b.objective||''}`;
      const hasFight=(b.choices||[]).some(ch=>ch.actionType==='fight');
      if(hasFight) assert.match(text,/적|적대|공격|습격|침략|추적|암살|경비|병사|고블린|괴물|망령|집행|용병|배신|위협|무기|칼|총|전투|대면|사람|인물|공주|로레인|생존자|증언자/);
    }
  }
});

test('shared dice roll is synchronized and story result is not rendered twice',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(server,/revealAt: Date\.now\(\) \+ 650/);
  assert.match(app,/syncWait/);
  assert.match(app,/payload\.kind === 'story-choice'/);
  assert.match(app,/r\.source === 'story'/);
});

test('turn transfer requires request and target consent',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/turn:transferRequest/);
  assert.match(server,/turn:transferRespond/);
  assert.match(server,/req\.toId!==player\.id/);
  assert.match(server,/Boolean\(payload\?\.accept\)/);
});

test('events use dynamic probability and facilities can be untimed',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(server,/function dynamicEventChance/);
  assert.match(server,/function shouldDrawDynamicEvent/);
  assert.match(server,/noTimeFacility/);
  assert.match(server,/facility:leave/);
});

test('guild membership and guild quests are implemented',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(server,/guildJoin/); assert.match(server,/guildQuest/);
  assert.match(app,/길드에 들어간다/); assert.match(app,/길드 의뢰를 받는다/);
});

test('party cards expose hover stats',()=>{
  const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
  assert.match(app,/party-stat-tooltip/); assert.match(css,/party-card:hover \.party-stat-tooltip/);
});
