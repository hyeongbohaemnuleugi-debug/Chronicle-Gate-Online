import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CAMPAIGNS } from '../campaign-data.js';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

const meta=/지금 해야 할 일|당장 걸린 문제|눈앞에 보이는 것|앞 장면에서 얻은 정보|에서 확인한 단서들은 지금 장면/;

test('Narrative Edition keeps the center column as prose, not a dashboard',()=>{
  assert.match(client,/function parallelNovelSceneHTML/);
  assert.match(client,/novel-location-line/);
  assert.match(client,/novel-transition/);
  assert.match(css,/#storyView #storyPrompt\{display:none!important\}/);
  assert.match(css,/#storyView #storyActionBox\{display:none!important\}/);
  const render=client.slice(client.indexOf('function renderParallelStory()'),client.indexOf('function forceChoiceLayout'));
  assert.doesNotMatch(render,/turn-scene-brief|scene-brief-main|눈앞에 보이는 것|당장 걸린 문제/);
});

test('every canonical scene is substantial and every menu is choice-only',()=>{
  for(const c of CAMPAIGNS){
    for(const beat of c.storyBeats){
      const paragraphs=String(beat.text||'').split(/\n\n+/).filter(Boolean);
      assert.ok(paragraphs.length>=4&&paragraphs.length<=5,`${c.id}/${beat.id} prose`);
      assert.doesNotMatch(String(beat.text||''),meta,`${c.id}/${beat.id} meta prose`);
      assert.equal(beat.freeActionAllowed,false,`${c.id}/${beat.id} free action`);
      assert.ok(beat.choices.length>=3&&beat.choices.length<=5,`${c.id}/${beat.id} choices`);
      assert.ok(new Set(beat.choices.map(x=>x.path)).size>=2,`${c.id}/${beat.id} route diversity`);
    }
  }
});

test('final decisions are authored choices, not dice-gated generic actions',()=>{
  for(const c of CAMPAIGNS){
    const final=c.storyBeats.at(-1);
    assert.equal(final.phase,'결단',c.id);
    assert.equal(final.choices.length,3,c.id);
    assert.ok(final.choices.every(x=>x.automatic===true),c.id);
    assert.equal(new Set(final.choices.map(x=>x.path)).size,3,c.id);
  }
});

test('universal chronicles open with a job-specific way to interact with the fiction',()=>{
  for(const c of CAMPAIGNS.filter(x=>x.parallelStory?.universal)){
    for(const [job,startId] of Object.entries(c.parallelStory.startByJob)){
      const node=c.parallelStory.nodes[startId];
      assert.ok(node.text.length>=4,`${c.id}/${job}`);
      assert.ok(node.choices.some(x=>x.requiredJob===job&&String(x.choiceBadge||'').includes('전용')),`${c.id}/${job} role option`);
    }
  }
});

test('the next scene can narratively remember the player previous choice',()=>{
  assert.match(server,/carryover:ps\.lastPersonalResult/);
  assert.match(client,/scene\?\.carryover\?\.text/);
  assert.match(css,/\.novel-transition/);
});

test('final dilemma suppresses unrelated dynamic side-actions',()=>{
  assert.match(server,/final dilemma/i);
  assert.match(server,/authored\.every\(c=>c\.automatic\)/);
});

test('universal chronicles begin at one shared table scene with different role perceptions',()=>{
  for(const c of CAMPAIGNS.filter(x=>x.parallelStory?.universal)){
    const starts=Object.entries(c.parallelStory.startByJob).map(([job,id])=>[job,c.parallelStory.nodes[id]]);
    assert.equal(new Set(starts.map(([,node])=>node.location)).size,1,`${c.id} shared physical opening`);
    assert.ok(new Set(starts.map(([,node])=>node.text[0])).size>=4,`${c.id} role perceptions should feel different`);
    for(const [job,node] of starts){
      assert.doesNotMatch(node.text.join(' '),/다른 사람들보다 먼저 한 가지를 눈치챈다/,`${c.id}/${job}`);
      assert.ok(node.choices.some(x=>x.requiredJob===job),`${c.id}/${job} exclusive action`);
    }
  }
});

test('Zero Platform keeps its handcrafted mystery graph instead of generic campaign cards',()=>{
  const c=CAMPAIGNS.find(x=>x.id==='echo');
  const nodes=Object.values(c.parallelStory.nodes||{});
  assert.ok(nodes.length>=20);
  assert.ok(nodes.every(n=>(n.text||[]).length>=4));
  assert.ok(nodes.filter(n=>(n.dialogue||[]).length).length>=18);
  assert.ok(c.parallelStory.nodes.cctv);
  assert.match(c.parallelStory.nodes.cctv.text.join(' '),/3분 17초|3분/);
  assert.ok(c.parallelStory.nodes.oldcontrol);
});

test('commercial narrative mode suppresses duplicate UI chrome',()=>{
  assert.match(client,/classList\.add\('narrative-session'\)/);
  assert.match(client,/당신은 어떻게 하나요\?/);
  assert.doesNotMatch(client.slice(client.indexOf('function renderParallelStory()'),client.indexOf('function forceChoiceLayout')),/WHAT DO YOU DO\?/);
  assert.match(css,/#storyView\.narrative-session \.scene-art figcaption\{display:none!important\}/);
  assert.match(css,/#storyView\.narrative-session \.narrative-choice-head span\{display:none!important\}/);
});
