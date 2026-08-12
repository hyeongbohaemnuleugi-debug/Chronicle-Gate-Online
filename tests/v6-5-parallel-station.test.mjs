import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const c=CAMPAIGNS.find(x=>x.id==='echo');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('after-last-train has dedicated parallel player story mode',()=>{
  assert.ok(c.parallelStory?.enabled);
  assert.equal(c.parallelStory.mode,undefined); // mode lives in room runtime, campaign only defines story data
  const starts=Object.values(c.parallelStory.startByJob);
  assert.equal(new Set(starts).size,6);
  assert.equal(Object.keys(c.parallelStory.startByJob).length,6);
  for(const id of starts) assert.ok(c.parallelStory.nodes[id],id);
});

test('every role starts from a role-specific late-night station scene',()=>{
  const starts=c.parallelStory.startByJob;
  const locations=Object.values(starts).map(id=>c.parallelStory.nodes[id].location);
  assert.ok(new Set(locations).size>=4);
  for(const [job,id] of Object.entries(starts)){
    const node=c.parallelStory.nodes[id];
    assert.ok(node.choices.length>=6,`${job}: ${node.choices.length}`);
    assert.match(node.text.join(' '),/막차|역|승강장|대합실|통로|전기실|역무실/);
  }
});

test('meeting, joining, following and splitting are explicit player choices',()=>{
  for(const token of ['action:\'offer\'','action:\'accept\'','action:\'split\'','action:\'follow\'','action:\'stay\'']) assert.ok(server.includes(token),token);
  assert.ok(server.includes("automatic:true"));
  assert.ok(client.includes('자동으로 파티가 되지 않습니다'));
  assert.ok(client.includes('같이 다니거나, 잠깐 협력하거나, 계속 각자 움직일 수 있습니다'));
});

test('parallel local encounters do not force the entire room into global combat',()=>{
  assert.ok(server.includes("kind:'parallel-combat'"));
  assert.ok(server.includes('room.parallel.encounters'));
  assert.ok(client.includes('지역 전투'));
  assert.ok(client.includes('이 장소에 들어온 다른 플레이어도 자기 턴에 같은 전투에 참가할 수 있습니다.'));
});

test('shared station state coexists with private position and progress',()=>{
  assert.ok(server.includes('worldFlags'));
  assert.ok(server.includes('playerStates'));
  assert.ok(server.includes('pendingTravel'));
  assert.ok(server.includes('parallelWorldSummary'));
  assert.ok(client.includes('같은 세계 상태를 공유하지만'));
});

test('parallel story offers multiple endings and fail-forward routes',()=>{
  const endings=[];
  for(const node of Object.values(c.parallelStory.nodes)) for(const choice of node.choices||[]) if(choice.ending) endings.push(choice.ending);
  assert.ok(new Set(endings).size>=5,[...new Set(endings)]);
  assert.ok(Object.values(c.parallelStory.nodes).some(node=>(node.choices||[]).some(ch=>ch.success&&ch.failure&&ch.next)));
});
