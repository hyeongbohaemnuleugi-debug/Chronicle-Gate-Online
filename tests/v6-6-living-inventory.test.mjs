import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const server=fs.readFileSync(new URL('../server.js', import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js', import.meta.url),'utf8');
const echo=CAMPAIGNS.find(c=>c.id==='echo');

test('after-last-train supports multiple item acquisition methods',()=>{
  for(const marker of ['choiceBadge:\'구매\'','choiceBadge:\'물물교환\'','choiceBadge:\'줍기\'','choiceBadge:\'훔치기\'','choiceBadge:\'구조 보상\'','전투 승리 · 위협 -1']){
    assert.ok(server.includes(marker),`missing ${marker}`);
  }
});

test('role and owned-item tags gate special choices',()=>{
  for(const marker of ['requiredAnyTags','requiredTag','requiredItems','parallelChoiceVisible','parallelPlayerTags']) assert.ok(server.includes(marker),`missing ${marker}`);
  assert.ok(server.includes("'시설기사':['echo_story_toolkit','echo_story_tester','echo_story_radio']"));
  assert.ok(server.includes("'민원 상담사':[]"));
});

test('item-only hidden routes exist in the subway parallel story',()=>{
  assert.ok(echo.parallelStory.nodes.sealedroom);
  assert.ok(echo.parallelStory.nodes.oldcontrol);
  const all=JSON.stringify(echo.parallelStory);
  assert.match(all,/핵심 아이템 루트|아이템 전용 구역|구형 신호 제어실/);
  assert.match(all,/requiredTag/);
});

test('subway ending availability depends on progress rather than fixed chapter count',()=>{
  const train=echo.parallelStory.nodes.train.choices;
  const endingChoices=train.filter(c=>c.ending);
  assert.ok(endingChoices.some(c=>c.requiredWorldFlag||c.requiredAnyWorldFlags||c.requiredFlag));
  assert.ok(server.includes("zero_passenger")&&server.includes("all_clear")&&server.includes("station_keeper")&&server.includes("thief_escape"));
  assert.equal(echo.parallelStory.clockLimit,999);
});

test('client hides a numeric turn countdown and shows story possessions',()=>{
  assert.ok(app.includes('심야 진행 · 종료 시점 미정'));
  assert.ok(app.includes('현재 소지품'));
  assert.ok(app.includes('숨은 진행 루트'));
});
