import test from 'node:test';
import assert from 'node:assert/strict';
import {ENCOUNTERS_B} from '../public/game/campaigns/encounters-b.js';
import {getCampaign,ORIGINAL_CAMPAIGNS} from '../public/game/campaigns/index.js';
import {campaignForLength} from '../public/game/campaigns/epic-tools.js';
import {availableChoices,viewGame} from '../public/game/engine.js';
import {atGate,act,ok,winCombat} from './helpers.mjs';

const HUMAN_IDS={
  'clock-city':'clock-debt-collector',
  'snow-radio':'snow-whiteout-stragglers',
  'hollow-apartment':'apartment-floor-patrol',
  'drowned-broadcast':'broadcast-record-removal-crew',
};
const OBSOLETE_IDS=['clock-blank-signature-clerk','snow-signal-hound','apartment-numberplate-keeper','broadcast-film-mask-actor'];
const oldEnemyWords={
  'clock-city':/집행기|소거 팔/,
  'snow-radio':/포획기|포획 팔/,
  'hollow-apartment':/빈 외투|외투의/,
  'drowned-broadcast':/청취자/,
};

for(const [story,content] of Object.entries(ENCOUNTERS_B)){
  test(`${story}: new opponents have different physical actions and the old scene remains an investigation after peace`,()=>{
    const campaign=getCampaign(story,'epic');
    for(const spec of [...content.shared,...content.epic]){
      const entry=campaign.encounterCatalog.find(row=>row.id===spec.id);
      assert.ok(entry,`${spec.id} must be installed on the selected story length`);
      assert.ok(campaign.nodes[spec.followupAt],`${spec.id} must have a real later callback scene`);
      const scene=campaign.nodes[entry.arenaId];
      assert.equal(scene.text.length,2);
      for(const text of [...spec.actions.basic,...spec.actions.ability])assert.doesNotMatch(text,oldEnemyWords[story],`${spec.id} must not strike the former boss`);
      assert.equal(new Set(spec.intents.map(row=>row.name)).size,3);
      const bypassed=ok(act(atGate(campaign,entry),campaign,{choiceId:`avoid-${spec.id}`})).game;
      const continued=ok(act(bypassed,campaign,{choiceId:`continue-${spec.id}`})).game;
      assert.equal(continued.nodeId,spec.anchor,'Bypass must return to the actual investigation, not jump to a victory ending');
      const view=viewGame(continued,campaign,'p0');
      if(spec.followupAt===spec.anchor)assert.ok(view.scene.reading.echoes.includes(spec.bypass.callback));
      assert.equal(continued.completedCombats.length,0);
    }
    const core=campaign.encounterCatalog.find(row=>![...content.shared,...content.epic].some(spec=>spec.id===row.id));
    for(const count of [1,4]){
      const bypassed=ok(act(atGate(campaign,core,count),campaign,{choiceId:`avoid-${core.id}`})).game;
      const scene=viewGame(bypassed,campaign,'p0').scene;
      assert.deepEqual(scene.reading.paragraphs,content.core.aftermathText);
      assert.doesNotMatch(scene.stakes,/이 복도에서 전투가 벌어진다|이 장면의 전투/);
      assert.ok(scene.choices.length>=1);
    }
  });
  test(`${story}: a real human opponent can be negotiated with or subdued and remains distinct from a monster kill`,()=>{
    const campaign=getCampaign(story,'basic');
    const entry=campaign.encounterCatalog.find(row=>row.id===HUMAN_IDS[story]);
    assert.ok(entry,'A story-grounded human opponent must occur in Basic mode too');
    for(const id of OBSOLETE_IDS)assert.ok(!campaign.encounterCatalog.some(row=>row.id===id));
    const encounter=campaign.nodes[entry.arenaId].encounter;
    const negotiated=ok(act(atGate(campaign,entry),campaign,{choiceId:`negotiate-${entry.id}`},20)).game;
    assert.equal(negotiated.encounterResolutions[entry.id].method,'negotiated');
    assert.equal(negotiated.completedCombats.length,0);
    const fought=ok(act(atGate(campaign,entry),campaign,{choiceId:`fight-${entry.id}`})).game;
    const won=winCombat(fought,campaign);
    assert.equal(won.encounterResolutions[entry.id].method,'victory');
    assert.match(encounter.victoryText,/손을|앉|숨/,'The defeated people must visibly stop resisting');
    assert.doesNotMatch(encounter.victoryText,/목숨을 잃|숨이 끊|소멸|시체/);
    assert.ok(negotiated.lastResult.text!==encounter.victoryText);
  });
  test(`${story}: old arrival/return sentences are revised before insertion, without changing the source manuscript`,()=>{
    const original=ORIGINAL_CAMPAIGNS.find(row=>row.id===story),raw=campaignForLength(original,'epic');
    const before=JSON.stringify(raw.nodes),campaign=getCampaign(story,'epic');
    for(const {from,to} of content.continuityEdits){
      assert.notEqual(from,to);
      for(const node of Object.values(campaign.nodes)){
        const visible=[...(node.text||[]),...Object.values(node.partyText||{}).flat(),node.stakes,node.summary,node.objective,
          ...(node.choices||[]).flatMap(choice=>[choice.label,...Object.values(choice.outcomes||{}).map(outcome=>outcome.text)])].filter(Boolean);
        for(const text of visible)assert.ok(!text.includes(from),`${node.id} still asserts an unearned old victory or arrives beyond the new obstacle: ${from}`);
      }
    }
    assert.equal(JSON.stringify(raw.nodes),before);
  });
}

test('the cameraman and fixed camera remain separate; spending the shade filter leaves the authored crawl exit',()=>{
  const campaign=getCampaign('drowned-broadcast','epic');
  const entry=campaign.encounterCatalog.find(row=>row.id==='broadcast-ahead-cameraman');
  const state=atGate(campaign,entry);state.inventory=['bc_epic_shade'];
  const used=ok(act(state,campaign,{choiceId:`tool-${entry.id}`})).game;
  assert.ok(!used.inventory.includes('bc_epic_shade'));
  const arrived=ok(act(used,campaign,{choiceId:`continue-${entry.id}`})).game;
  assert.equal(arrived.nodeId,'bc-e2-shadow');
  const choices=availableChoices(arrived,campaign);
  assert.ok(choices.some(choice=>choice.id==='crawl'));
  assert.ok(!choices.some(choice=>choice.id==='shade'));
  assert.match(viewGame(arrived,campaign,'p0').scene.reading.echoes.join(' '),/고정 카메라|이동 카메라/);
  assert.equal(ok(act(arrived,campaign,{choiceId:'crawl'})).game.nodeId,'bc-e2-city');
});

test('showing the silver bookmark to the watchman does not consume the later choice to fix the records',()=>{
  const campaign=getCampaign('clock-city','epic');
  const entry=campaign.encounterCatalog.find(row=>row.id==='clock-rewinding-watchman');
  const state=atGate(campaign,entry);state.inventory=['epb_clock_bookmark'];
  const used=ok(act(state,campaign,{choiceId:`tool-${entry.id}`})).game;
  assert.ok(used.inventory.includes('epb_clock_bookmark'));
  const arrived=ok(act(used,campaign,{choiceId:`continue-${entry.id}`})).game;
  assert.equal(arrived.nodeId,'epb-clock-17');
  assert.ok(availableChoices(arrived,campaign).some(choice=>choice.id==='bookmark'));
  const fixed=ok(act(arrived,campaign,{choiceId:'bookmark'})).game;
  assert.ok(!fixed.inventory.includes('epb_clock_bookmark'));
  assert.equal(fixed.completedCombats.length,0);
});

test('giving stranded people a battery uses the one actual consumable and keeps the radio story going',()=>{
  const campaign=getCampaign('snow-radio','basic');
  const entry=campaign.encounterCatalog.find(row=>row.id==='snow-whiteout-stragglers');
  const state=atGate(campaign,entry);state.inventory=['snow_cell'];
  const helped=ok(act(state,campaign,{choiceId:`tool-${entry.id}`})).game;
  assert.deepEqual(helped.inventory,[]);assert.ok(helped.spentItems.includes('snow_cell'));
  assert.equal(helped.encounterResolutions[entry.id].method,'tool');
  const arrived=ok(act(helped,campaign,{choiceId:`continue-${entry.id}`})).game;
  assert.equal(arrived.nodeId,'whiteout');
  assert.ok(availableChoices(arrived,campaign).some(choice=>choice.id==='rescue-route'));
  assert.match(viewGame(arrived,campaign,'p0').scene.reading.echoes.join(' '),/비상등/);
});
