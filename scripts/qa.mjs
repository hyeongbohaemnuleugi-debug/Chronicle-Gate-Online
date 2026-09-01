import fs from 'node:fs';
import path from 'node:path';
import { CAMPAIGNS } from '../campaign-data.js';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const errors=[];
const ok=(cond,msg)=>{ if(!cond) errors.push(msg); };
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const server=read('server.js');
const client=read('public/app.js');
const html=read('public/index.html');

ok(CAMPAIGNS.length===9,`expected 9 chronicles, got ${CAMPAIGNS.length}`);
for(const c of CAMPAIGNS){
  const ids=new Set((c.storyBeats||[]).map(b=>b.id));
  ok(ids.size===(c.storyBeats||[]).length,`${c.id}: duplicate story node id`);
  for(const beat of c.storyBeats||[]){
    const paras=String(beat.text||'').split(/\n\n+/).filter(Boolean);
    ok(paras.length>=4,`${c.id}/${beat.id}: thin scene prose (${paras.length} paragraphs)`);
    ok(beat.freeActionAllowed===false,`${c.id}/${beat.id}: direct action should be disabled in choice-only mode`);
    const choices=beat.choices||[];
    ok(choices.length>=5 && choices.length<=6,`${c.id}/${beat.id}: expected 5-6 choices, got ${choices.length}`);
    ok(new Set(choices.map(x=>x.actionType)).size>=3,`${c.id}/${beat.id}: choices are too repetitive`);
    for(const choice of choices){
      ok(Boolean(choice.label&&choice.stat&&choice.actionType),`${c.id}/${beat.id}: incomplete choice`);
      ok(Boolean(choice.opportunity&&choice.risk),`${c.id}/${beat.id}/${choice.id}: missing risk/opportunity`);
      for(const next of [choice.next?.success,choice.next?.failure].filter(Boolean)) ok(next==='__ENDING__'||ids.has(next),`${c.id}/${beat.id}: invalid edge ${next}`);
    }
  }
  ok(c.parallelStory?.enabled===true,`${c.id}: parallel/shared-world mode missing`);
}

ok(/ACCOUNT_PASSWORD_MIN\s*=\s*4/.test(server),'server password minimum is not 4');
ok(/ACCOUNT_PASSWORD_MAX\s*=\s*72/.test(server),'server password maximum is not 72');
ok(/ACCOUNT_PASSWORD_MIN\s*=\s*4/.test(client),'client password minimum is not 4');
ok(/ACCOUNT_PASSWORD_MAX\s*=\s*72/.test(client),'client password maximum is not 72');
ok(/id="authPassword"[^>]*minlength="4"[^>]*maxlength="72"/.test(html),'HTML password bounds are not 4..72');
ok(/v9\.1 choice-only/.test(client),'client choice-only guard is missing');
ok(/freeActionAllowed:false/.test(server),'parallel choice-only flag is missing');
ok(/이 버전은 선택지 전용입니다/.test(server),'server must reject legacy free-form declarations');
ok(fs.existsSync(path.join(root,'supabase/migrations/202609010002_accounts_and_progress.sql')),'account migration missing');

if(errors.length){
  console.error(`Chronicle Gate v9.1 QA failed (${errors.length})`);
  for(const e of errors.slice(0,80)) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`Chronicle Gate v9.1 QA OK: ${CAMPAIGNS.length} chronicles, ${CAMPAIGNS.reduce((n,c)=>n+(c.storyBeats?.length||0),0)} canonical scenes.`);
