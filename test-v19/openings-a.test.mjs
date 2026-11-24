import test from 'node:test';
import assert from 'node:assert/strict';
import { OPENINGS_A } from '../public/game/campaigns/openings-a.js';
import { CAMPAIGN_COMBAT } from '../public/game/campaigns/combat-data.js';

const campaigns = {};
for (const id of Object.keys(OPENINGS_A)) campaigns[id] = (await import(`../public/game/campaigns/${id}.js`)).default;

const waypoints = {
  'train-track-rescuer': /점검 계단|승강장 아래/u,
  'train-night-courier': /연결 복도/u,
  'train-signal-fitter': /점검 복도|승강장 쪽 복도/u,
  'train-night-announcer': /대합실.{0,10}(?:갈림길|승강장 표지)/u,
  'hotel-baggage-warden': /하역 보행로/u,
  'hotel-stage-escape': /호텔 옆.{0,5}골목/u,
  'hotel-hour-appraiser': /거리 시계|호텔 앞 시계/u,
  'hotel-banquet-host': /보행 교차로/u,
  'market-lantern-porter': /강가 계단/u,
  'market-shadow-acrobat': /강가.{0,5}골목|그림자 골목/u,
  'market-memory-mender': /강가 이정표|물가의 큰 이정표/u,
  'market-wish-broker': /(?:강가|물가) 쉼터/u,
  'sea-salvage-diver': /선미 준비 통로/u,
  'sea-exterior-rigger': /선미 상부 통로/u,
  'sea-biosystems-engineer': /방수 문 앞/u,
  'sea-emergency-medic': /보온 준비 통로/u,
};
const rendezvous = {
  'last-train': /막차.{0,16}(?:문|안전선|앞)/u,
  'glass-hotel': /(?:정문 차양|회전문)/u,
  'moon-market': /(?:다리 입구|다리.{0,10}발판|다리 앞|다리 문지기 앞)/u,
  'deep-sea': /후갑판/u,
};
const privateCues = {
  'train-track-rescuer': /모래역|정비 다리/u,
  'train-night-courier': /모래역|친구|도시락/u,
  'train-signal-fitter': /모래역|삭제 승인|귀가 중인 승객/u,
  'train-night-announcer': /가족|전화기|출처/u,
  'hotel-baggage-warden': /소라|동생|편지/u,
  'hotel-stage-escape': /위조|도난 계획|의뢰인/u,
  'hotel-hour-appraiser': /옛 승인|옛 감정|시간의 출처/u,
  'hotel-banquet-host': /예전 끝인사|반복 재생/u,
  'market-lantern-porter': /어부|달빛.{0,10}물길/u,
  'market-shadow-acrobat': /단골|고향|카드/u,
  'market-memory-mender': /빗소리|나비/u,
  'market-wish-broker': /달의 편지|꿈|먼저 물어봐/u,
  'sea-salvage-diver': /수조|본사|파기/u,
  'sea-exterior-rigger': /은재|엄마|연수생/u,
  'sea-biosystems-engineer': /하람|배음|미분류/u,
  'sea-emergency-medic': /정규 직원|직원 번호|본사/u,
};

for (const [id, opening] of Object.entries(OPENINGS_A)) {
  const jobs = CAMPAIGN_COMBAT[id].classes;
  test(`${id}: exact profession coverage and two complete private stages`, () => {
    assert.deepEqual(Object.keys(opening.professions), jobs.map(job => job.id));
    assert.ok(opening.meeting.title && opening.meeting.location && opening.meeting.solo && opening.meeting.group);
    for (const mode of ['solo','group']) assert.equal(opening.meeting.startText[mode].length, 2);
    for (const job of jobs) {
      const profession = opening.professions[job.id];
      assert.ok(profession.deferred);
      assert.deepEqual(profession.stages.map(s => s.id), ['approach','arrival']);
      for (const stage of profession.stages) {
        assert.equal(stage.text.length, 2);
        assert.equal(stage.art, 0);
        assert.ok(stage.location && stage.objective);
        assert.deepEqual(stage.choices.map(choice => choice.id), ['risk','safe']);
        assert.equal(stage.choices[0].dc, 11);
        assert.equal(job.stats[stage.choices[0].stat], 3, 'Each profession uses its actual primary skill.');
        assert.equal(stage.choices[1].automatic, true);
      }
    }
  });

  test(`${id}: every grade has bounded preparation and cannot grant main-story state`, () => {
    for (const profession of Object.values(opening.professions)) {
      for (const [stageIndex, stage] of profession.stages.entries()) {
        for (const choice of stage.choices) {
          assert.deepEqual(Object.keys(choice.outcomes), choice.automatic ? ['success'] : ['critical','success','failure','fumble']);
          for (const [grade, outcome] of Object.entries(choice.outcomes)) {
            const expectedKeys = ['text','report'];
            if (!choice.automatic && ['critical','success'].includes(grade)) expectedKeys.push('bonus');
            if (outcome.harm !== undefined) expectedKeys.push('harm');
            assert.deepEqual(Object.keys(outcome).sort(), expectedKeys.sort(), 'Main inventory, clues, flags, pressure and next IDs are not prologue effects.');
            assert.equal(outcome.bonus || 0, choice.automatic ? 0 : grade === 'critical' ? 2 : grade === 'success' ? 1 : 0);
            if (outcome.harm !== undefined) {
              assert.equal(stageIndex, 1);
              assert.equal(grade, 'fumble');
              assert.equal(choice.automatic, undefined);
              assert.equal(outcome.harm, 1);
              assert.match(choice.risk, /대실패.*생명 1/u);
            }
            assert.ok(outcome.report.length > 5 && outcome.report.length <= 85);
          }
        }
      }
    }
  });

  test(`${id}: safe, successful and failed attempts all explicitly reach the next authored place`, () => {
    for (const [jobId, profession] of Object.entries(opening.professions)) {
      for (const [stageIndex, stage] of profession.stages.entries()) {
        for (const choice of stage.choices) {
          for (const [grade, outcome] of Object.entries(choice.outcomes)) {
            assert.match(outcome.text, stageIndex === 0 ? waypoints[jobId] : rendezvous[id], `${jobId}/${stage.id}/${choice.id}/${grade}`);
            assert.ok(outcome.text.length > 45, 'A receipt is not a complete consequence and movement passage.');
          }
        }
      }
    }
  });

  test(`${id}: public reports preserve private roles and epilogues only use existing flags`, () => {
    for (const [jobId, profession] of Object.entries(opening.professions)) {
      const role = profession.role;
      for (const key of ['title','secret','goal','reveal','deadEpilogue']) assert.ok(role[key]);
      assert.equal(role.epilogues.length, 2);
      for (const epilogue of role.epilogues) {
        assert.ok(epilogue.text);
        const keys = Object.keys(epilogue.when);
        assert.equal(keys.length, 1);
        assert.ok(['flag','notFlag'].includes(keys[0]));
        assert.ok(Object.hasOwn(campaigns[id].flags, epilogue.when[keys[0]]));
      }
      for (const stage of profession.stages) for (const choice of stage.choices) for (const outcome of Object.values(choice.outcomes)) {
        assert.doesNotMatch(outcome.report, privateCues[jobId], 'Public arrival reports cannot announce a role secret.');
      }
    }
  });
}
