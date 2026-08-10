import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { CAMPAIGNS, STAT_NAMES, ECONOMY_FACILITY_TEMPLATES, ECONOMY_FACILITY_THEMES } from '../campaign-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert(CAMPAIGNS.length === 8, `캠페인 수: 기대 8, 실제 ${CAMPAIGNS.length}`);
assert(STAT_NAMES.length === 6 && new Set(STAT_NAMES).size === 6, '능력치 6종이 유일해야 합니다.');
const globalEventIds = new Set();
for (const campaign of CAMPAIGNS) {
  assert(campaign.jobs.length === 6, `${campaign.title}: 직업이 6종이어야 합니다.`);
  assert(new Set(campaign.jobs.map(j => j.name)).size === 6, `${campaign.title}: 직업명이 중복됩니다.`);
  assert(campaign.events.length === 30, `${campaign.title}: 이벤트가 30종이어야 합니다.`);
  assert(new Set(campaign.events.map(e => e.title)).size === 30, `${campaign.title}: 이벤트 제목이 중복됩니다.`);
  assert(new Set(campaign.events.map(e => e.id)).size === 30, `${campaign.title}: 이벤트 ID가 중복됩니다.`);
  assert(campaign.acts.length === 5, `${campaign.title}: 5막이어야 합니다.`);
  const canonicalBeats = (campaign.storyBeats || []).filter(beat => !beat.branchScene);
  const consequenceBeats = (campaign.storyBeats || []).filter(beat => beat.branchScene);
  assert(canonicalBeats.length === 30, `${campaign.title}: 정식 메인 장면 30개가 필요합니다.`);
  assert(consequenceBeats.length >= 400, `${campaign.title}: 선택별 전용 후속 장면이 충분하지 않습니다.`);
  assert(new Set(campaign.storyBeats.map(beat => beat.id)).size === campaign.storyBeats.length, `${campaign.title}: 스토리 ID가 중복됩니다.`);
  assert(new Set(canonicalBeats.map(beat => (beat.text || '').slice(0, 120))).size === 30, `${campaign.title}: 정식 메인 장면 시작 문장이 반복됩니다.`);
  for (const event of campaign.events) {
    assert(!globalEventIds.has(event.id), `전체 캠페인에서 이벤트 ID 중복: ${event.id}`);
    globalEventIds.add(event.id);
    assert(event.choices.length === 3 || event.choices.length === 4, `${event.id}: 선택지는 3개 또는 직업 전용 포함 4개여야 합니다.`);
    assert(event.act >= 1 && event.act <= 5, `${event.id}: act 범위 오류`);
    for (const choice of event.choices) {
      assert(STAT_NAMES.includes(choice.stat), `${event.id}: 알 수 없는 능력치 ${choice.stat}`);
      assert(Number.isInteger(choice.dc) && choice.dc >= 8 && choice.dc <= 22, `${event.id}: DC 범위 오류 ${choice.dc}`);
      assert(choice.success && choice.failure, `${event.id}: 성공/실패 문구 누락`);
      assert(choice.successEffect?.type && choice.failureEffect?.type, `${event.id}: 효과 정의 누락`);
      if (choice.requiredJob) assert(campaign.jobs.some(job => job.name === choice.requiredJob), `${event.id}: 존재하지 않는 직업 전용 선택 ${choice.requiredJob}`);
    }
  }
  notes.push(`${campaign.title}: 정식 30장면 + 선택 후속 ${consequenceBeats.length}장면 / 이벤트 30종 / 직업 6종`);
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
assert(app.includes('renderMainStoryChoices') && app.includes("socket.emit('story:advance'"), '메인 스토리 장면 선택 UI 누락');


assert(server.includes('const MIN_PLAYERS = 1'), 'SOLO 1인 시작 설정이 누락되었습니다.');
assert(server.includes('SOLO_VOTE_DURATION_MS = 12_000'), 'SOLO 이벤트 투표 시간이 12초로 설정되어 있지 않습니다.');
assert(server.includes('ALL_VOTED_COUNTDOWN_MS = 3_000'), '전원 투표 완료 후 3초 확정 카운트다운이 누락되었습니다.');
for (const campaign of CAMPAIGNS) {
  for (const beat of campaign.storyBeats.filter(beat => !beat.branchScene)) {
    assert(beat.text?.length >= 80, `${campaign.title} ${beat.id}: 소설형 본문이 너무 짧습니다.`);
    assert(Object.keys(beat.roleHooks || {}).length === 6, `${campaign.title} ${beat.id}: 직업 능력치별 상황 훅 6종 누락`);
  }
  for (const beat of campaign.storyBeats.filter(beat => beat.branchScene)) {
    assert(beat.text?.length >= 35, `${campaign.title} ${beat.id}: 선택 후속 본문이 너무 짧습니다.`);
    assert((beat.choices || []).length === 3, `${campaign.title} ${beat.id}: 후속 장면은 3개의 간결한 진행 선택을 가져야 합니다.`);
  }
}

assert(server.includes("socket.on('player:skillUse'"), '직업 스킬 서버 핸들러 누락');
assert(app.includes("socket.emit('player:skillUse'"), '직업 스킬 UI 이벤트 누락');
assert(index.includes('id="jobSkillBtn"') && index.includes('id="combatSkillBtn"'), '직업 스킬 버튼 누락');
assert(server.includes('choiceTarget:6') && server.includes('choiceTarget:5') && server.includes('choiceTarget:4'), '다중 선택지 목표 수 누락');
assert(server.includes('beat.freeActionAllowed = false') && app.includes('const freeActionAllowed = false'), '자유 입력 비활성화 누락');

assert(server.includes("release: 'release-candidate'"), 'health release marker 누락');

assert(!/\son[a-z]+\s*=/.test(index), 'CSP와 충돌하는 inline event handler(onclick 등)가 남아 있습니다.');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(index), 'CSP와 충돌하는 inline script가 남아 있습니다.');
assert(index.includes('id="endingView"') && index.includes('id="leaveRoomBtn"'), '필수 엔딩/방 나가기 UI 누락');
assert(css.includes('@media(max-width:720px)'), '모바일 반응형 규칙 누락');
assert(index.includes('endingView') && app.includes("state.phase==='ending'"), '엔딩 화면/라우팅 누락');
assert(index.includes('id="helpModal"') && index.includes('hidden'), 'ESC 모달 초기 hidden 안전장치 누락');
assert(app.includes('resetTransientUi') && app.includes('pageshow'), '페이지 복원 시 임시 UI 초기화 로직 누락');
assert(server.includes('choice.requiredJob') && server.includes('player.job?.name !== choice.requiredJob'), '직업 전용 선택 서버 검증 누락');

assert(server.includes('EVENT_EVERY_TURNS = 3'), '이벤트 주기가 3 메인 턴으로 고정되어 있지 않습니다.');
assert(server.includes('VOTE_DURATION_MS = 45_000'), '이벤트 투표 시간이 45초로 설정되어 있지 않습니다.');
assert(server.includes("socket.on('story:advance'"), '메인 스토리 턴 진행 이벤트가 없습니다.');
assert(server.includes('drawEventForRoom(room)'), '3턴 후 자동 이벤트 공개 로직이 없습니다.');
assert(server.includes("event:finalizeChoice") && server.includes('서버가 자동 집계'), '호스트 조기 확정 제거 호환 가드가 없습니다.');
assert(server.includes('beginAllVotedCountdown(room)'), '전원 투표 완료 시 조기 확정 카운트다운 호출이 누락되었습니다.');
assert(server.includes('clearDetour: isDetour'), '우회 위기 장면 해결 후 제거 플래그가 누락되었습니다.');
assert(server.includes('storyNodeById') && server.includes('resolveNextStoryNode') && server.includes('consumeStoryBeat') && server.includes('storySeenIds'), '메인 스토리 분기 그래프/1회 소비 장치가 누락되었습니다.');
assert(!server.includes('findIndex(beat => beat?.id && !seen.has(beat.id))'), '스토리 커서 오류 시 임의의 미소비 장면으로 점프하는 복구 로직이 남아 있습니다.');
assert(server.includes('lastResolvedStoryBeat') && server.includes("room.phase === 'resolution' && room.lastResolvedStoryBeat"), '결과 화면에서 다음 챕터를 미리 노출하지 않는 스냅샷 장치가 누락되었습니다.');
assert(!server.includes("type:'narration', author:'GM'") && !server.includes("type: 'narration', author: 'GM'") && !server.includes("type: 'narration', text: campaign.intro, author: 'GM'"), 'GM이 채팅창에 스토리 서술을 다시 기록하는 코드가 남아 있습니다.');
assert(app.includes("m.author === 'GM' && m.type === 'narration'"), '기존 방의 GM 스토리 서술을 채팅에서 숨기는 호환 필터가 없습니다.');
assert(app.includes('story-key') && css.includes('.story-key'), '스토리 중요 문장 강조 스타일이 누락되었습니다.');
assert(css.includes('--muted:#c8c6cf'), '다크 테마 보조 텍스트 대비 개선값이 적용되지 않았습니다.');
assert(!index.includes('id="finalizeChoiceBtn"'), '호스트 투표 조기 확정 버튼이 남아 있습니다.');
assert(index.includes('id="voteTimer"') && index.includes('id="advanceStoryBtn"'), '메인 스토리 진행/투표 타이머 UI가 없습니다.');
assert(css.includes('object-fit:contain!important'), '스토리 이미지 잘림 방지 contain 규칙이 없습니다.');
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

const requiredAudio = [
  'bgm_ember.wav','bgm_neon.wav','bgm_abyss.wav','bgm_clock.wav','bgm_wild.wav','bgm_combat.wav',
  'dice_roll.wav','success.wav','failure.wav','scene_next.wav','hp_loss.wav','attack.wav','hit.wav','boss_warning.wav','vote_lock.wav'
];
for (const name of requiredAudio) assert(fs.existsSync(path.join(root,'public/audio',name)), `오디오 파일 누락: ${name}`);
assert(app.includes('class AudioManager') && app.includes("./audio/bgm_ember.wav"), '오디오 매니저 또는 BGM 연결이 누락되었습니다.');
assert(index.includes('id="audioVolumeRange"') && index.includes('id="audioMuteBtn"'), '오디오 설정 UI가 누락되었습니다.');
assert(index.includes('id="economyPanel"') && index.includes('id="facilityPanel"'), '코인/장비/시설 UI가 누락되었습니다.');
assert(server.includes("socket.on('facility:action'") && server.includes("socket.on('item:equip'"), '경제/장비 서버 핸들러가 누락되었습니다.');
assert(server.includes('effectiveAbilityTotal') && server.includes('equipmentStatBonus'), '장비 능력치 반영 로직이 누락되었습니다.');
for (const campaign of CAMPAIGNS) {
  assert((campaign.items || []).length === 6, `${campaign.title}: 장비 6종이 필요합니다.`);
  assert(campaign.events.some(event => event.facilityEligible), `${campaign.title}: 확률 시설이 등장할 수 있는 이벤트가 필요합니다.`);
  assert(campaign.events.some(event => event.lootItemId), `${campaign.title}: 상황 한정 아이템 보상 이벤트가 필요합니다.`);
  assert(ECONOMY_FACILITY_THEMES[campaign.id]?.shop?.storyLead, `${campaign.title}: 소설형 상점 도입문이 필요합니다.`);
}
for (const kind of ['restaurant','inn','shop','quest','gamble']) assert(ECONOMY_FACILITY_TEMPLATES[kind], `시설 템플릿 누락: ${kind}`);
assert(server.includes('maybeAttachFacility') && server.includes('crypto.randomInt(0, 100) >= 34'), '확률 시설 등장 로직이 누락되었습니다.');
assert(server.includes('function effectiveAbilityMod') && server.includes('equipmentStatBonus(room, player, stat)'), '장비가 능력치 보정치에 직접 반영되지 않습니다.');

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

assert(server.includes('storyNodeById(campaign, room.storyNodeId)'), '이벤트 ACT가 현재 분기 노드를 기준으로 계산되지 않습니다.');

// v5.4 deep branch-graph invariants
for (const campaign of CAMPAIGNS) {
  const ids = new Set(campaign.storyBeats.map(b => b.id));
  const canonical = campaign.storyBeats.filter(b => !b.branchScene);
  const consequence = campaign.storyBeats.filter(b => b.branchScene);
  if (canonical.length !== 30) throw new Error(`${campaign.id}: expected 30 canonical nodes`);
  if (consequence.length < 400) throw new Error(`${campaign.id}: expected hundreds of consequence nodes`);
  for (const beat of campaign.storyBeats) for (const choice of beat.choices || []) {
    for (const target of [choice.next?.success, choice.next?.failure].filter(Boolean)) {
      if (target !== '__ENDING__' && !ids.has(target)) throw new Error(`${beat.id}: broken branch target ${target}`);
    }
  }
  for (const beat of canonical) {
    const allTargets = (beat.choices || []).flatMap(c => [c.next?.success,c.next?.failure]);
    if (new Set(allTargets).size !== allTargets.length) throw new Error(`${beat.id}: choices share consequence nodes`);
  }
}
console.log('v5.4 deep branch graph QA PASS');

// v5.5 encounter / ability-trait checks
assert(server.includes('BOSS_INTRO_LINES'), '보스 등장 대사 데이터가 없습니다.');
assert(server.includes('decorateEncounter'), '전투 등장 메타데이터가 없습니다.');
assert(server.includes('traitCheckBonus'), '극단 능력치 패시브 판정 보정이 없습니다.');
const app55 = read('public/app.js');
assert(app55.includes('showEncounterIntro'), '전투 등장 오버레이가 없습니다.');
assert(app55.includes('passive-traits'), '능력치 패시브 UI가 없습니다.');
console.log('v5.5 encounter + ability trait QA PASS');
