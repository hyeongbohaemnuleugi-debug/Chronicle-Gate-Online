import fs from 'node:fs';
import path from 'node:path';
import { CAMPAIGNS } from '../campaign-data.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const errors=[];
const ok=(cond,msg)=>{ if(!cond) errors.push(msg); };
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const server=read('server.js');
const client=read('public/app.js');
const css=read('public/styles.css');
const html=read('public/index.html');

ok(CAMPAIGNS.length===9,`expected 9 chronicles, got ${CAMPAIGNS.length}`);
ok(new Set(CAMPAIGNS.map(c=>c.id)).size===9,'chronicle ids must be unique');
const metaPattern=/지금 해야 할 일|당장 걸린 문제|눈앞에 보이는 것|이 장면에서 파티가|앞 장면에서 얻은 정보|에서 확인한 단서들은 지금 장면|놓치면 안 되는|사건을 설명하는 기록보다|주변을 다시 의식하자|그때, 아직 설명되지 않은/;
const awkwardPattern=/문장를|로그을|병가 움직|시민가 |대원가 |기사이 |사제이 |브로커이 |연구원가 |구조대원가 |군중가 |인형가 |합창단가 /;

for(const c of CAMPAIGNS){
  const beats=c.storyBeats||[];
  const ids=new Set(beats.map(b=>b.id));
  ok(ids.size===beats.length,`${c.id}: duplicate story node id`);
  ok(beats.length>=30,`${c.id}: story is too short (${beats.length})`);
  for(const beat of beats){
    const prose=String(beat.text||'');
    const paras=prose.split(/\n\n+/).filter(Boolean);
    ok(paras.length>=4&&paras.length<=5,`${c.id}/${beat.id}: expected 4-5 prose paragraphs, got ${paras.length}`);
    ok(!metaPattern.test(prose),`${c.id}/${beat.id}: dashboard/meta prose leaked into fiction`);
    ok(!awkwardPattern.test(prose),`${c.id}/${beat.id}: awkward Korean particle in prose`);
    ok(beat.freeActionAllowed===false,`${c.id}/${beat.id}: direct action should be disabled`);
    const choices=beat.choices||[];
    ok(choices.length>=3&&choices.length<=5,`${c.id}/${beat.id}: expected 3-5 choices, got ${choices.length}`);
    ok(new Set(choices.map(x=>x.path)).size>=2,`${c.id}/${beat.id}: choices do not represent meaningfully different values/routes`);
    for(const choice of choices){
      ok(Boolean(choice.label&&choice.stat&&choice.actionType),`${c.id}/${beat.id}: incomplete choice`);
      ok(!awkwardPattern.test(`${choice.label} ${choice.success||''} ${choice.failure||''}`),`${c.id}/${beat.id}/${choice.id}: awkward Korean particle in choice/outcome`);
      ok(Boolean(choice.success&&choice.failure),`${c.id}/${beat.id}/${choice.id}: missing fail-forward outcome`);
      for(const next of [choice.next?.success,choice.next?.failure].filter(Boolean)) ok(next==='__ENDING__'||ids.has(next),`${c.id}/${beat.id}: invalid edge ${next}`);
    }
  }
  const final=beats.at(-1);
  ok(final?.phase==='결단',`${c.id}: last scene must be a decision`);
  ok((final?.choices||[]).length===3,`${c.id}: final decision should expose exactly three authored endings`);
  ok((final?.choices||[]).every(x=>x.automatic===true),`${c.id}: final moral choice should not be decided by a die roll`);
  ok(c.parallelStory?.enabled===true,`${c.id}: parallel/shared-world mode missing`);
  if(c.parallelStory?.universal){
    const openingLocations=new Set();
    for(const [job,startId] of Object.entries(c.parallelStory.startByJob||{})){
      const start=c.parallelStory.nodes?.[startId];
      ok(Boolean(start),`${c.id}/${job}: missing job start scene`);
      ok((start?.text||[]).length>=4,`${c.id}/${job}: job opening is too thin`);
      ok(!/다른 사람들보다 먼저 한 가지를 눈치챈다/.test((start?.text||[]).join(' ')),`${c.id}/${job}: generic role-opening template leaked`);
      ok((start?.choices||[]).some(x=>String(x.choiceBadge||'').includes(job)&&x.requiredJob===job),`${c.id}/${job}: missing role-exclusive opening choice`);
      if(start?.location) openingLocations.add(start.location);
    }
    ok(openingLocations.size===1,`${c.id}: universal players should begin at one shared physical prologue, got ${[...openingLocations].join(', ')}`);
  }
  if(c.id==='echo'){
    const bespoke=Object.values(c.parallelStory?.nodes||{});
    ok(bespoke.length>=20,`echo: expected a dense bespoke station graph`);
    ok(bespoke.every(n=>(n.text||[]).length>=4),`echo: bespoke node prose is too thin`);
    ok(bespoke.filter(n=>(n.dialogue||[]).length).length>=18,`echo: bespoke station scenes need human voices`);
  }
}

ok(/ACCOUNT_PASSWORD_MIN\s*=\s*4/.test(server),'server password minimum is not 4');
ok(/ACCOUNT_PASSWORD_MAX\s*=\s*72/.test(server),'server password maximum is not 72');
ok(/ACCOUNT_PASSWORD_MIN\s*=\s*4/.test(client),'client password minimum is not 4');
ok(/ACCOUNT_PASSWORD_MAX\s*=\s*72/.test(client),'client password maximum is not 72');
ok(/id="authPassword"[^>]*minlength="4"[^>]*maxlength="72"/.test(html),'HTML password bounds are not 4..72');
ok(/이 버전은 선택지 전용입니다/.test(server),'server must reject legacy free-form declarations');
ok(/freeActionAllowed:false/.test(server),'parallel choice-only flag missing');
ok(/carryover:ps\.lastPersonalResult/.test(server),'previous choice must carry into the next scene');
ok(/novel-scene/.test(client),'narrative scene renderer missing');
ok(/novel-transition/.test(client),'choice-to-scene narrative transition missing');
ok(/#storyView #storyPrompt\{display:none!important\}/.test(css),'duplicate story instruction panel is not hidden');
ok(/#storyView #storyActionBox\{display:none!important\}/.test(css),'free-form action box is not hidden');
ok(/novel-location-line/.test(css),'compact location treatment missing');
ok(/classList\.add\('narrative-session'\)/.test(client),'narrative session mode is not activated');
ok(/#storyView\.narrative-session \.scene-art figcaption\{display:none!important\}/.test(css),'duplicate scene caption should be hidden in narrative mode');
ok(/#storyView\.narrative-session \.narrative-choice-head span\{display:none!important\}/.test(css),'choice heading should not add dashboard-like chrome');
ok(fs.existsSync(path.join(root,'supabase/migrations/202609010002_accounts_and_progress.sql')),'account migration missing');

if(errors.length){
  console.error(`Chronicle Gate v10 Narrative QA failed (${errors.length})`);
  for(const e of errors.slice(0,120)) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`Chronicle Gate v10 Narrative QA OK: ${CAMPAIGNS.length} chronicles, ${CAMPAIGNS.reduce((n,c)=>n+(c.storyBeats?.length||0),0)} canonical scenes.`);
