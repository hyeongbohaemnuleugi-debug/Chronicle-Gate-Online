import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CAMPAIGNS, STAT_NAMES } from '../campaign-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert(CAMPAIGNS.length === 5, `캠페인 수: 기대 5, 실제 ${CAMPAIGNS.length}`);
assert(STAT_NAMES.length === 6 && new Set(STAT_NAMES).size === 6, '능력치 6종이 유일해야 합니다.');
const globalEventIds = new Set();
for (const campaign of CAMPAIGNS) {
  assert(campaign.jobs.length === 6, `${campaign.title}: 직업이 6종이어야 합니다.`);
  assert(new Set(campaign.jobs.map(j => j.name)).size === 6, `${campaign.title}: 직업명이 중복됩니다.`);
  assert(campaign.events.length === 30, `${campaign.title}: 이벤트가 30종이어야 합니다.`);
  assert(new Set(campaign.events.map(e => e.title)).size === 30, `${campaign.title}: 이벤트 제목이 중복됩니다.`);
  assert(new Set(campaign.events.map(e => e.id)).size === 30, `${campaign.title}: 이벤트 ID가 중복됩니다.`);
  assert(campaign.acts.length === 5, `${campaign.title}: 5막이어야 합니다.`);
  for (const event of campaign.events) {
    assert(!globalEventIds.has(event.id), `전체 캠페인에서 이벤트 ID 중복: ${event.id}`);
    globalEventIds.add(event.id);
    assert(event.choices.length === 3, `${event.id}: 선택지가 3개가 아닙니다.`);
    assert(event.act >= 1 && event.act <= 5, `${event.id}: act 범위 오류`);
    for (const choice of event.choices) {
      assert(STAT_NAMES.includes(choice.stat), `${event.id}: 알 수 없는 능력치 ${choice.stat}`);
      assert(Number.isInteger(choice.dc) && choice.dc >= 8 && choice.dc <= 22, `${event.id}: DC 범위 오류 ${choice.dc}`);
      assert(choice.success && choice.failure, `${event.id}: 성공/실패 문구 누락`);
      assert(choice.successEffect?.type && choice.failureEffect?.type, `${event.id}: 효과 정의 누락`);
    }
  }
  notes.push(`${campaign.title}: 이벤트 30종 / 실제 덱 60장(각 2장) / 직업 6종`);
}

const index = read('public/index.html');
const app = read('public/app.js');
const css = read('public/styles.css');
const server = read('server.js');
const persistence = read('persistence.js');
const renderYaml = read('render.yaml');
const sql = read('supabase/migrations/202608070001_initial.sql');
const pkg = JSON.parse(read('package.json'));

const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const idSet = new Set(ids);
for (const id of new Set(ids)) assert(ids.filter(x => x === id).length === 1, `HTML id 중복: ${id}`);
const referencedIds = [...app.matchAll(/\$\('#([^']+)'\)/g)].map(m => m[1]);
const dynamicIds = new Set(['rollCheckBtn']);
for (const id of new Set(referencedIds)) assert(idSet.has(id) || dynamicIds.has(id), `app.js가 존재하지 않는 DOM id를 참조: #${id}`);

assert((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, 'CSS 중괄호 수가 맞지 않습니다.');
assert(index.includes('viewport-fit=cover'), '모바일 safe-area 대응 viewport 설정 누락');
assert(!/\son[a-z]+\s*=/.test(index), 'CSP와 충돌하는 inline event handler(onclick 등)가 남아 있습니다.');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(index), 'CSP와 충돌하는 inline script가 남아 있습니다.');
assert(index.includes('id="endingView"') && index.includes('id="leaveRoomBtn"'), '필수 엔딩/방 나가기 UI 누락');
assert(css.includes('@media(max-width:720px)'), '모바일 반응형 규칙 누락');
assert(index.includes('endingView') && app.includes("state.phase==='ending'"), '엔딩 화면/라우팅 누락');
assert(server.includes('room.monster.acted'), '전투 라운드 중복 행동 방지 로직 누락');
assert(server.includes('promoteHostIfNeeded'), '방장 연결 해제 시 승계 로직 누락');
assert(server.includes('reconcileCombatRound'), '전투 중 연결 해제/재접속 라운드 복구 로직 누락');
assert(server.includes('gracefulShutdown') && server.includes('flushRoomSave'), 'Render 종료 시 스냅샷 flush 로직 누락');
assert(server.includes('lastActiveAt'), '방 만료 기준이 최근 활동 시각을 사용하지 않습니다.');
assert(app.includes("state.phase==='resolution'&&state.lastResolution"), 'resolution 단계 재접속 시 결과 복원 UI 누락');
assert(sql.includes('grant select on table public.room_sessions to service_role'), 'service_role room snapshot SELECT 권한 명시 누락');
assert(sql.includes('grant insert on table public.session_events to service_role'), 'service_role event log INSERT 권한 명시 누락');
assert(server.includes('crypto.randomInt'), '서버 권위 암호학적 주사위 난수 사용 누락');
assert(!server.includes('cors: { origin: true'), '불필요한 광범위 Socket.IO CORS 설정이 남아 있습니다.');
assert(!persistence.includes('@supabase/supabase-js'), 'Supabase SDK 의존성이 제거되지 않았습니다.');
assert(persistence.includes("apikey: secretKey"), 'Supabase 새 secret key용 apikey 헤더가 없습니다.');
assert(sql.includes('revision bigint'), 'Supabase revision 컬럼이 없습니다.');
assert(renderYaml.includes('SUPABASE_SECRET_KEY') && renderYaml.includes('sync: false'), 'Render secret env 설정 오류');
assert(!('SUPABASE_SECRET_KEY' in (pkg.dependencies || {})), 'package dependencies 설정 오류');
assert(!JSON.stringify(pkg).includes('@supabase/supabase-js'), 'package.json에 Supabase SDK가 남아 있습니다.');

for (const publicFile of ['public/index.html','public/app.js','public/dice3d.js','public/styles.css']) {
  const text = read(publicFile);
  assert(!/sb_secret_[A-Za-z0-9_-]+/.test(text), `${publicFile}: Supabase secret key 노출 위험`);
  assert(!/SUPABASE_SECRET_KEY\s*=/.test(text), `${publicFile}: 환경변수 값 노출 위험`);
}

for (const file of ['server.js','persistence.js','campaign-data.js','public/app.js','public/dice3d.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  assert(result.status === 0, `${file}: Node 문법 검사 실패\n${result.stderr}`);
}

console.log('=== Chronicle Gate QA ===');
for (const note of notes) console.log('PASS', note);
console.log('PASS DOM id uniqueness:', idSet.size);
console.log('PASS JS syntax files: 5');
console.log('PASS security/static checks');
if (failures.length) {
  console.error(`\nFAIL ${failures.length} issue(s):`);
  failures.forEach((f, i) => console.error(`${i + 1}. ${f}`));
  process.exit(1);
}
console.log('\nALL STATIC QA CHECKS PASSED');
