/** Chronicle Gate 18: a concise story shaped by the party's actual choices. */
import { CLASSES, LEGACY_CLASS_IDS, getClasses, getClass, normalizeClassId } from './professions.js';
import { startCombat, combatView, previewCombat, applyCombatAction, skipCombatTurn, restoreCombat } from './combat.js';
import { gradeRoll, gradeChances, GRADE_LABELS, ROLLED_GRADES } from './judgement.js';
import { appendChronicle, restoreChronicle } from './narrative.js';
import { initializeOpening, openingRole, openingView, openingStartParagraphs, actionRevision, previewOpening, applyOpeningAction, deferOpeningPlayer, meetingPassages, spendOpeningBonus, restoreOpening } from './opening.js';
export { actionRevision } from './opening.js';
export { gradeRoll } from './judgement.js';
export { CLASSES, getClasses, getClass, normalizeClassId } from './professions.js';
export const VERSION = '19.0.0';
export const STAT_LABELS = Object.freeze({ might: '힘', agility: '민첩', wit: '통찰', heart: '교섭' });
const clone = value => JSON.parse(JSON.stringify(value));
const bound = (value, low, high) => Math.max(low, Math.min(high, value));
export const cleanText = (value, max = 220) => String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const fail = (error, hints = []) => ({ ok: false, error, hints });
const nodeFor = (game, campaign) => game.nodeId === '__all_dead__' ? { id:'__all_dead__', chapter:4, location:game.deathSceneTitle || campaign.title, ending:true, choices:[], ...(campaign.deathEnding || {title:'돌아오지 못한 일행',text:['일행의 마지막 목소리가 끊겼습니다. 이곳에서 이야기가 끝납니다.'],art:2,mood:'danger'}) } : campaign.nodes[game.nodeId];
const currentPlayer = game => game.players[game.activeIndex];
const trustedDie = source => { try { const value=typeof source==='function'?source():source;return Number.isInteger(value)&&value>=1&&value<=20?value:null; } catch { return null; } };
const storedItemIds = value => Array.isArray(value)?value.map(item=>item?.id):[];

// Story seats are fixed when the game begins. Death or a lost connection must
// never rewrite a shared journey into the solo version halfway through.
export const storyMode = game => game.players.length === 1 ? 'solo' : 'group';
export function sceneParagraphs(node, game) {
  const text = openingStartParagraphs(game, node) || node.partyText?.[storyMode(game)] || node.text;
  return (Array.isArray(text) ? text : [text]).filter(value => typeof value === 'string' && value.trim());
}

export function conditionMatches(condition, game) {
  if (!condition) return true;
  if (Array.isArray(condition)) return condition.every(c => conditionMatches(c, game));
  if (condition.all && !condition.all.every(c => conditionMatches(c, game))) return false;
  if (condition.any && !condition.any.some(c => conditionMatches(c, game))) return false;
  if (condition.flag && !game.flags[condition.flag]) return false;
  if (condition.notFlag && game.flags[condition.notFlag]) return false;
  if (condition.clue && !game.clues.includes(condition.clue)) return false;
  if (condition.notClue && game.clues.includes(condition.notClue)) return false;
  if (condition.item && !(game.inventory || []).includes(condition.item)) return false;
  if (condition.notItem && (game.inventory || []).includes(condition.notItem)) return false;
  if (condition.pressureAtMost != null && game.pressure > condition.pressureAtMost) return false;
  if (condition.pressureAtLeast != null && game.pressure < condition.pressureAtLeast) return false;
  if (condition.partyMin != null && game.players.length < condition.partyMin) return false;
  if (condition.partyMax != null && game.players.length > condition.partyMax) return false;
  if (condition.aliveMin != null && game.players.filter(p => p.life !== 'dead').length < condition.aliveMin) return false;
  return true;
}
export function availableChoices(game, campaign) {
  if (game.combat || game.phase === 'opening') return [];
  return (nodeFor(game, campaign)?.choices ?? []).filter(c => conditionMatches(c.requires, game) && [...(c.useItems||[]),...(c.consumeItems||[])].every(id=>(game.inventory||[]).includes(id)));
}

const itemInfo = (campaign,id) => ({id,...campaign.items[id]});
const validItems = (campaign,ids=[]) => [...new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id)&&Object.hasOwn(campaign.items||{},id)):[])];
function itemDelta(game,campaign,gains=[],losses=[]) {
  game.inventory ||= []; game.spentItems ||= [];
  const lost=validItems(campaign,losses).filter(id=>game.inventory.includes(id));
  game.inventory=game.inventory.filter(id=>!lost.includes(id));
  game.spentItems=[...new Set([...game.spentItems,...lost])];
  const gained=validItems(campaign,gains).filter(id=>!game.inventory.includes(id));
  game.inventory.push(...gained);
  game.spentItems=game.spentItems.filter(id=>!gained.includes(id));
  return {gainedItems:gained.map(id=>({id,name:campaign.items[id].name})),lostItems:lost.map(id=>({id,name:campaign.items[id].name}))};
}
function describeOutcome(outcome,game,campaign,{consumedItems=[],critical=false}={}) {
  const changes=[];
  if(outcome.harm)changes.push(`행동한 인물 생명 −${outcome.harm}`);
  if(outcome.harmAll)changes.push(`살아 있는 일행 모두 생명 −${outcome.harmAll}`);
  if(outcome.heal)changes.push(`행동한 인물 생명 +${outcome.heal} (최대 3)`);
  if(outcome.pressure)changes.push(`${campaign.pressureLabel||'위기'} ${outcome.pressure>0?'+':'−'}${Math.abs(outcome.pressure)}`);
  for(const id of outcome.clues||[])if(campaign.clues?.[id]&&!game.clues.includes(id))changes.push(`단서 확보: ${campaign.clues[id].title}`);
  for(const id of validItems(campaign,outcome.gainItems))changes.push(`소지품 획득: ${campaign.items[id].name}`);
  for(const id of validItems(campaign,[...consumedItems,...(outcome.loseItems||[])]))changes.push(`소지품 소모: ${campaign.items[id].name}`);
  for(const id of outcome.set||[])if(campaign.flags?.[id]&&!game.flags[id])changes.push(campaign.flags[id]);
  for(const id of outcome.unset||[])if(campaign.flags?.[id]&&game.flags[id])changes.push(`기록 변경: ${campaign.flags[id]} → 해제`);
  if(critical)changes.push('운명 조각 +1 (최대 4)');
  if(campaign.nodes[outcome.next])changes.push(`다음 장면: ${campaign.nodes[outcome.next].title}`);
  return changes;
}
function healthAfterOutcome(outcome,person,actorId) {
  const damage=(Number(outcome.harmAll)||0)+(person.id===actorId?(Number(outcome.harm)||0):0);
  const healing=person.id===actorId?(Number(outcome.heal)||0):0;
  return bound(person.health-damage+healing,0,3);
}
function storyPassage(outcome,deaths=[],allDead=false) {
  if(!deaths.length)return outcome.text;
  const stopped=`${deaths.join(', ')}의 목소리가 끊긴다.`;
  const fate=allDead?'그 뒤를 이어 걸을 사람이 남지 않았다. 일행의 마지막 페이지가 이곳에서 닫힌다.':'남은 이들이 동료의 이름을 부른다. 대답은 돌아오지 않는다.';
  return [outcome.lossText||outcome.text,stopped,fate,!allDead&&outcome.survivorArrival].filter(Boolean).join(' ');
}
function outcomePreview(outcome,game,campaign,actorId,options) {
  const living=game.players.filter(p=>p.life!=='dead');
  const deaths=living.filter(p=>healthAfterOutcome(outcome,p,actorId)===0).map(p=>p.name);
  const allDead=deaths.length>0&&deaths.length===living.length;
  let changes=describeOutcome(outcome,game,campaign,options);
  if(deaths.length)changes.push(`사망: ${deaths.join(', ')}`);
  if(allDead)changes=changes.filter(line=>!line.startsWith('다음 장면:')).concat(`전원 사망: ${campaign.deathEnding?.title||'돌아오지 못한 일행'}`);
  return {text:storyPassage(outcome,deaths,allDead),changes};
}
function outcomePreviews(choice,game,campaign,actorId,bonus,dc) {
  const chances=gradeChances(bonus,dc);
  return ROLLED_GRADES.map(grade=>{
    const outcome=choice.outcomes?.[grade];
    return {grade,label:GRADE_LABELS[grade],chance:chances[grade],...(outcome?outcomePreview(outcome,game,campaign,actorId,{consumedItems:choice.consumeItems||[],critical:grade==='critical'}):{text:'',changes:[]})};
  });
}

export function createGame(campaign, players, { openingMode = 'together' } = {}) {
  if (!campaign?.nodes?.[campaign.start]) throw new Error('시나리오의 시작 장면이 없습니다.');
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw new Error('플레이어는 1~4명이어야 합니다.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('플레이어 ID가 중복되었습니다.');
  if (!['together','separate'].includes(openingMode)) throw new Error('이야기의 시작 방식을 선택해 주세요.');
  const game = {
    schema: 17, version: VERSION, campaignId: campaign.id, nodeId: campaign.start,
    phase: 'playing', revision: 1, turn: 0, activeIndex: 0, pressure: 0, sparks: 2,
    flags: {}, clues: [], inventory: [], spentItems: [], visited: [campaign.start], detailsRead: {}, assists: [], reviveAttempts: {},
    players: players.map((p, i) => ({ id: cleanText(p.id, 80), name: cleanText(p.name, 18) || `모험가 ${i + 1}`,
      classId: normalizeClassId(campaign, p.classId, i),
      roleIndex: i, focus: true, revealed: false, health:3, maxHealth:3, life:'alive', revivals:0, echoUsed:false, connected: p.connected !== false })),
    journal: [], chronicle: [], chroniclePartial:false, lastResult: null, arrival: null, startedAt: new Date().toISOString(),
    combat: null, completedCombats: [], combatRecords: {},
  };
  if (openingMode === 'separate') initializeOpening(game, campaign);
  else startCombat(game, campaign);
  return game;
}

export function viewGame(game, campaign, viewerId) {
  const node = nodeFor(game, campaign);
  const me = game.players.find(p => p.id === viewerId);
  const role = me ? openingRole(game, campaign, me) : null;
  const combat = combatView(game, campaign, viewerId);
  const choices=availableChoices(game,campaign);
  const callbacks = [...(node.callbacks || []), ...(node.ending ? node.epilogues || [] : [])]
    .filter(c => conditionMatches(c.when, game)).map(c => c.text);
  const prose=sceneParagraphs(node,game);
  const personal=[];
  let fate='';
  const actualText = [...prose, ...callbacks];
  if(node.ending){
    if(game.deathSceneTitle)actualText.push(`마지막 발걸음은 ‘${game.deathSceneTitle}’에 남았습니다.`);
    const alive=game.players.filter(p=>p.life!=='dead').map(p=>p.name);
    const dead=game.players.filter(p=>p.life==='dead').map(p=>p.name);
    const revived=game.players.filter(p=>p.revivals>0).map(p=>p.name);
    for(const person of game.players){
      const personalRole=openingRole(game, campaign, person);
      const parts=person.life==='dead' && personalRole?.deadEpilogue ? [personalRole.deadEpilogue] : (personalRole?.epilogues||[]).filter(e=>conditionMatches(e.when,game)).map(e=>e.text);
      if(parts.length){const paragraph=`${person.name}의 ${person.life==='dead'?'유산':'후일담'} — ${parts.join(' ')}`;personal.push(paragraph);actualText.push(paragraph);}
    }
    fate=`살아남은 사람: ${alive.join(', ') || '없음'}. 희생된 사람: ${dead.join(', ') || '없음'}.${revived.length?` 죽음에서 돌아온 사람: ${revived.join(', ')}.`:''}`;
    actualText.push(fate);
  }
  return {
    campaignId: campaign.id, title: campaign.title, revision: game.revision, actionRevision: actionRevision(game, viewerId), phase: game.phase,
    storyMode:storyMode(game),partySize:game.players.length,
    modeDescription:campaign.playModes?.[storyMode(game)]||'',
    scene: {
      id: node.id || game.nodeId, title: node.title, chapter: node.chapter || 1,
      location: node.location || campaign.title, art: Number(node.art) || 0,
      summary: combat ? `일행의 앞을 ${combat.enemy.name}이 가로막았습니다. 적의 다음 공격과 대상을 확인하고 차례대로 행동하세요.` : node.summary || (node.text||[])[0] || campaign.description,
      stakes: combat ? '기본 공격은 계속 쓸 수 있고, 고유 기술은 전투당 한 번입니다. 생명이 0이 되면 사망합니다.' : node.stakes || '',
      arrival: game.arrival?.toSceneId===game.nodeId ? clone(game.arrival) : null,
      mood: combat ? 'danger' : node.mood || 'mystery', text: combat ? combat.intro : actualText, dialogue: combat ? null : node.dialogue || null,
      reading:combat?null:{paragraphs:prose,echoes:[...callbacks,...(node.ending&&game.deathSceneTitle?[`마지막 발걸음은 ‘${game.deathSceneTitle}’에 남았습니다.`]:[])],personal,fate},
      objective: combat ? `${combat.enemy.name}을 제압하고 길을 여세요.` : node.objective || campaign.objective, entities: combat ? [] : clone(node.entities || []),
      details: (combat ? [] : node.details || []).map(d => ({ id: d.id, label: d.label,
        read: Boolean(game.detailsRead[`${game.nodeId}:${d.id}`]),
        text: game.detailsRead[`${game.nodeId}:${d.id}`] ? d.text : undefined })),
      choices: choices.map(c => ({ id: c.id, label: c.label, stat: c.stat,
        dc: c.automatic ? null : (c.dc || 11) + (game.pressure >= (campaign.pressureMax || 8) ? 1 : 0),
        risk: c.risk || '상황이 바뀌고 다른 경로로 이어집니다.', harmRisk: Math.max(0,...Object.values(c.outcomes || {}).map(o=>(o.harm||0)+(o.harmAll||0))), automatic: Boolean(c.automatic),
        useItems:validItems(campaign,c.useItems).map(id=>itemInfo(campaign,id)),consumeItems:validItems(campaign,c.consumeItems).map(id=>itemInfo(campaign,id)),hint:c.hint||'' })),
      lockedChoices: (combat?[]:node.choices||[]).filter(c=>c.lockedHint&&!choices.some(x=>x.id===c.id)).map(c=>({id:c.id,label:c.label,reason:c.lockedHint})),
      resurrection: !combat && node.resurrection ? { ...node.resurrection, available: conditionMatches(node.resurrection.requires,game), eligibleIds:game.players.filter(p=>p.life==='dead'&&p.revivals<1&&!game.reviveAttempts?.[`${game.nodeId}:${p.id}`]).map(p=>p.id) } : null,
      ending: Boolean(node.ending), question: node.question || '',
    },
    players: game.players.map(p => ({ ...p, className: getClass(campaign,p.classId)?.name,
      stats: getClass(campaign,p.classId)?.stats, basic: getClass(campaign,p.classId)?.basic, ability: getClass(campaign,p.classId)?.ability, assisting: game.assists.includes(p.id),
      revealedText: p.revealed ? openingRole(game, campaign, p)?.reveal : null })),
    activePlayerId: currentPlayer(game)?.id,
    pressure: { value: game.pressure, max: campaign.pressureMax || 8, label: campaign.pressureLabel || '위기' },
    sparks: game.sparks,
    clues: game.clues.map(id => ({ id, ...(campaign.clues?.[id] || { title: id, text: '' }) })),
    inventory: validItems(campaign,game.inventory).map(id=>({...itemInfo(campaign,id),usableHere:choices.some(c=>[...(c.useItems||[]),...(c.consumeItems||[])].includes(id)),actionIds:choices.filter(c=>[...(c.useItems||[]),...(c.consumeItems||[])].includes(id)).map(c=>c.id)})),
    flags: Object.keys(game.flags).filter(k => game.flags[k] && campaign.flags?.[k]).map(k => campaign.flags[k]),
    journal: clone(game.journal), lastResult: clone(game.lastResult),
    chronicle:clone(game.chronicle||[]),chroniclePartial:game.chroniclePartial===true,
    chroniclePrologue:game.opening?.joined ? [game.players.length===1?'본격적인 사건에 뛰어들기 전, 한 사람이 자기 자리에서 첫 걸음을 내딛었다.':'서로 다른 자리에서 시작된 발걸음이 한곳으로 향했다. 이들은 아직 서로의 사정을 알지 못했다.'] : sceneParagraphs(campaign.nodes[campaign.start],game),
    secret: role ? clone(role) : null,
    canAct: Boolean(me && me.life !== 'dead' && me.id === currentPlayer(game)?.id && game.phase === 'playing'),
    canAssist: Boolean(me && me.id !== currentPlayer(game)?.id && game.phase === 'playing' && !game.assists.includes(me.id) && (me.life !== 'dead' || !me.echoUsed)),
    combat, completedCombats: [...(game.completedCombats || [])],
    helpText: combat ? '기본 공격은 계속 사용할 수 있고, 직업 능력은 전투마다 한 번입니다. 자연 20은 대성공, 자연 1은 대실패입니다. 생존자들이 한 번씩 행동하면 적이 예고한 대로 공격합니다.' : '정해진 행동을 고르세요. 안전한 관찰에는 주사위를 쓰지 않습니다. 위험 행동은 자연 20 대성공·자연 1 대실패, 나머지는 합계가 목표 이상이면 성공, 미만이면 실패입니다.',
    ending: Boolean(node.ending), visitedCount: game.visited.length,
    ...(openingView(game, campaign, viewerId) || {}),
  };
}

export function previewAction(game, campaign, playerId, payload = {}) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return fail('현재 화면의 행동 버튼을 선택해 주세요.');
  if(Object.hasOwn(payload,'text')||Object.hasOwn(payload,'flashback'))return fail('직접 입력하는 행동은 사용하지 않습니다. 현재 장면의 선택지를 골라 주세요.');
  if (!game || game.campaignId !== campaign.id) return fail('현재 시나리오와 저장 데이터가 맞지 않습니다.');
  if (game.phase === 'opening') return previewOpening(game, campaign, playerId, payload);
  if (game.phase !== 'playing') return fail('이 이야기는 끝났습니다. 새 테이블에서 다른 결말을 만나 보세요.');
  const actor = game.players.find(p => p.id === playerId);
  if (!actor) return fail('이 테이블의 참가자가 아닙니다.');
  const node = nodeFor(game, campaign);
  if (game.combat) {
    if(actor.life==='dead')return fail('사망한 캐릭터는 공격할 수 없습니다. 마지막 조언으로 동료를 도울 수 있습니다.');
    if(currentPlayer(game)?.id!==playerId)return fail('지금은 동료의 차례입니다. 협력하거나 전투 상황을 확인해 주세요.');
    return previewCombat(game,campaign,actor,payload);
  }
  if(payload.combatAction)return fail('지금은 전투 중이 아닙니다. 현재 장면의 행동을 골라 주세요.');
  if (payload.detailId) {
    const detail = (node.details || []).find(d => d.id === payload.detailId);
    if (!detail) return fail('현재 장면에 없는 관찰 대상입니다.');
    if (game.detailsRead[`${game.nodeId}:${detail.id}`]) return fail('이미 확인한 내용입니다. 기록에서 다시 볼 수 있습니다.');
    return { ok: true, plan: { type: 'detail', detailId: detail.id, label: detail.label, automatic: true,
      dc: 0, bonus: 0, stat: null, risk: '안전한 관찰 · 차례와 위기를 소모하지 않습니다.', revision: game.revision } };
  }
  if(actor.life==='dead')return fail('사망한 캐릭터는 직접 행동할 수 없습니다. 마지막 조언, 비밀 공개와 동료의 부활을 기다릴 수 있습니다.');
  if (currentPlayer(game)?.id !== playerId) return fail('지금은 동료의 차례입니다. 협력하거나 단서를 살펴보세요.');
  if(payload.reviveId){
    const site=node.resurrection;const target=game.players.find(p=>p.id===payload.reviveId);
    if(!site||!conditionMatches(site.requires,game))return fail('이 장면에서는 죽은 동료를 되돌릴 수 없습니다.');
    if(!target||target.life!=='dead')return fail('사망한 동료를 선택해 주세요.');
    if(target.revivals>=1)return fail('이 동료는 이미 한 번 돌아왔습니다. 다시 부활시킬 수 없습니다.');
    if(game.reviveAttempts?.[`${game.nodeId}:${target.id}`])return fail('이 장소에서 이 동료를 위한 시도는 이미 했습니다. 다른 부활 장소가 필요합니다.');
    const sparkCost=site.sparkCost??1,pressureCost=site.pressureCost??2;
    if(game.sparks<sparkCost)return fail(`부활에는 운명 토큰 ${sparkCost}개가 필요합니다. 비밀을 공개하면 토큰을 얻습니다.`);
    const stats=getClass(campaign,actor.classId).stats;const stat=stats.heart>=stats.wit?'heart':'wit';
    const assistance=Math.min(2,game.assists.length);const bonus=stats[stat]+assistance;
    const dc=(site.dc||12)+(game.pressure >= (campaign.pressureMax||8)?1:0);
    const chances=gradeChances(bonus,dc);
    const summaries={critical:'생명 3으로 동료가 돌아옵니다.',success:'생명 2로 동료가 돌아옵니다.',failure:'동료가 돌아오지 못하고 위기가 1칸 더 높아집니다.',fumble:'귀환 장치가 거세게 흔들립니다. 동료가 돌아오지 못하고 위기가 2칸 더 높아집니다.'};
    return {ok:true,plan:{type:'revive',reviveId:target.id,label:`${target.name} 부활 · ${site.label}`,stat,statLabel:STAT_LABELS[stat],dc,bonus,assistance,classBonus:stats[stat],automatic:false,revision:game.revision,sparkCost,pressureCost,requiresConfirmation:true,risk:`운명 조각 ${sparkCost}개와 위기 ${pressureCost}칸을 소모합니다. 대성공은 생명 3, 성공은 생명 2로 부활합니다. 실패는 추가 위기 1, 대실패는 추가 위기 2이며 부활하지 못합니다. 이 장소에서는 한 번만 시도할 수 있습니다.`,gradeChances:chances,successChance:chances.critical+chances.success,outcomes:ROLLED_GRADES.map(grade=>({grade,label:GRADE_LABELS[grade],chance:chances[grade],text:summaries[grade],changes:[`운명 조각 −${sparkCost}`,`위기 +${pressureCost+(grade==='fumble'?2:grade==='failure'?1:0)}`,'이 장소에서 이 동료에게 다시 시도할 수 없음']}))}};
  }
  const choices = availableChoices(game, campaign);
  const choice = choices.find(c => c.id === payload.choiceId);
  if (!choice) return fail('그 행동은 현재 장면에서 할 수 없습니다. 필요한 소지품과 최신 선택지를 확인하세요.',choices.map(c=>c.label));
  const automatic = Boolean(choice.automatic);
  const requiredGrades=automatic?['success']:ROLLED_GRADES;
  if(requiredGrades.some(grade=>!choice.outcomes?.[grade]?.text||!campaign.nodes[choice.outcomes[grade].next]))return fail('이 행동의 결과 정보가 완성되지 않았습니다. 다른 행동을 선택하거나 제작자에게 알려 주세요.');
  const stat = choice.stat || 'wit';
  let bonus = getClass(campaign,actor.classId).stats[stat] || 0;
  const help = Math.min(2, game.assists.filter(id => id !== actor.id && game.players.some(p => p.id === id && p.connected !== false)).length);
  const spendSpark = !automatic && payload.spendSpark === true;
  const preparation = !automatic && payload.usePreparation === true;
  if (spendSpark && game.sparks < 1) return fail('남은 운명 토큰이 없습니다.');
  if (preparation && !actor.focus) return fail('이 캐릭터의 준비 보너스는 이미 사용했습니다.');
  const openingPreparation = !automatic ? actor.openingBonus || 0 : 0;
  bonus += help + (spendSpark ? 3 : 0) + (preparation ? 2 : 0) + openingPreparation;
  const pressurePenalty = game.pressure >= (campaign.pressureMax || 8) ? 1 : 0;
  const dc = automatic ? 0 : (choice.dc || 11) + pressurePenalty;
  const harmRisk=Math.max(0,...Object.values(choice.outcomes||{}).map(o=>(o.harm||0)+(o.harmAll||0)));
  const groupHarm=Math.max(0,...Object.values(choice.outcomes||{}).map(o=>o.harmAll||0));
  const dangerText=harmRisk>0?` 최대 생명 ${harmRisk} 손실${groupHarm>0?` (일행 전체 최대 ${groupHarm})`:''}. 생명이 0이 되면 사망합니다.`:'';
  const itemNames=validItems(campaign,[...(choice.useItems||[]),...(choice.consumeItems||[])]).map(id=>campaign.items[id].name);
  const consumedItemNames=validItems(campaign,choice.consumeItems).map(id=>campaign.items[id].name);
  const consumption=consumedItemNames.length?` ${consumedItemNames.join(', ')}은 실행하면 결과와 관계없이 소모됩니다.`:'';
  const chances=automatic?null:gradeChances(bonus,dc);
  return { ok: true, plan: {
    type: 'choice', choiceId: choice.id, label: choice.label,
    stat, statLabel: STAT_LABELS[stat], dc, bonus: automatic ? 0 : bonus, automatic,
    assistance: help, classBonus: getClass(campaign,actor.classId).stats[stat] || 0,
    spendSpark, preparation, openingPreparation, pressurePenalty, itemNames, consumedItemNames,
    risk: (choice.risk || '실패해도 사건은 진행되지만 더 큰 대가를 치릅니다.')+dangerText+consumption, harmRisk, groupHarm,
    successChance: automatic ? 100 : chances.critical+chances.success,
    gradeChances:chances,outcomes:automatic?[{grade:'automatic',label:'선택대로 진행',chance:100,...outcomePreview(choice.outcomes.success,game,campaign,actor.id,{consumedItems:choice.consumeItems||[]})}]:outcomePreviews(choice,game,campaign,actor.id,bonus,dc),
    revision: game.revision, requiresConfirmation: true,
  } };
}

function addClues(game, campaign, ids = []) {
  for (const id of ids) if (campaign.clues?.[id] && !game.clues.includes(id)) game.clues.push(id);
}
function addJournal(game, entry) {
  const id = `${game.turn}:${game.revision}:${game.journal.length}`;
  game.journal.push({ id, ...entry });
  appendChronicle(game,{id,...entry});
  if (game.journal.length > 200) game.journal = game.journal.slice(-200);
}
function advanceSeat(game) {
  const connected = game.players.some(p => p.connected !== false && p.life !== 'dead');
  for (let i = 1; i <= game.players.length; i++) {
    const next = (game.activeIndex + i) % game.players.length;
    if (game.players[next].life !== 'dead' && (!connected || game.players[next].connected !== false)) { game.activeIndex = next; break; }
  }
}

export function applyAction(game, campaign, playerId, payload = {}, { roll } = {}) {
  if (game?.phase === 'opening') {
    const preview = previewAction(game, campaign, playerId, payload);
    if (!preview.ok) return preview;
    const result = applyOpeningAction(game, campaign, playerId, payload, { roll });
    if (result.ok && result.joined) recordMeeting(result.game, campaign);
    return result;
  }
  if (payload?.revision != null && payload.revision !== game.revision) return fail('장면이 갱신되었습니다. 판정 내용을 다시 확인해 주세요.');
  const preview = previewAction(game, campaign, playerId, payload);
  if (!preview.ok) return preview;
  const plan = preview.plan;
  const next = clone(game);
  const actor = next.players.find(p => p.id === playerId);
  const node = nodeFor(next, campaign);
  if(plan.type==='combat'){
    try{
      const result=applyCombatAction(next,campaign,playerId,plan,{roll,gradeRoll});
      addJournal(next,{sceneTitle:node.encounter?.title||node.title,...result});
      return {ok:true,game:next,plan};
    }catch(error){return fail(error.message);}
  }
  if (plan.type === 'detail') {
    const detail = node.details.find(d => d.id === plan.detailId);
    next.detailsRead[`${next.nodeId}:${detail.id}`] = true;
    addClues(next, campaign, detail.clue ? [detail.clue] : detail.clues || []);
    const items=itemDelta(next,campaign,detail.gainItems);
    next.lastResult = { action: detail.label, text: detail.text, actor: actor.name, grade: 'observe', roll: null, total: null, dc: 0, bonus: 0,
      ...items,usedItems:[],changes:[...(detail.clue?[detail.clue]:detail.clues||[]).filter(id=>campaign.clues?.[id]).map(id=>`단서 기록: ${campaign.clues[id].title}`),...items.gainedItems.map(item=>`소지품 획득: ${item.name}`)] };
    addJournal(next, { sceneTitle: node.title, ...next.lastResult });
    next.revision++;
    return { ok: true, game: next, plan };
  }
  if(plan.type==='revive'){
    const die=trustedDie(roll);
    if(!Number.isInteger(die)||die<1||die>20)return fail('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
    const grade=gradeRoll(die,die+plan.bonus,plan.dc);const target=next.players.find(p=>p.id===plan.reviveId);
    next.reviveAttempts ||= {};next.reviveAttempts[`${next.nodeId}:${target.id}`]=true;
    next.sparks-=plan.sparkCost;
    const returned=grade==='critical'||grade==='success';
    const pressureExtra=grade==='fumble'?2:grade==='failure'?1:0;
    next.pressure=bound(next.pressure+plan.pressureCost+pressureExtra,0,campaign.pressureMax||8);
    if(returned){target.life='alive';target.health=grade==='critical'?3:2;target.revivals++;target.echoUsed=false;}
    const text=returned?`${node.resurrection.text} ${target.name}의 숨이 돌아온다. ${grade==='critical'?'다시 일어선 동료가 자신의 이름에 또렷하게 대답한다.':'돌아온 동료는 가쁜 숨을 고르며 일행 곁에 앉는다.'}`:grade==='fumble'?`${target.name}의 이름에 닿으려던 귀환의 신호가 끊긴다. 흔들리는 ${node.resurrection.label}을 수습하고 나니 동료의 자리는 여전히 비어 있다. 이곳에서의 기회는 다했다.`:`${node.resurrection.label}에 이름을 불러도 대답은 돌아오지 않는다. 기다리는 동안 주변의 위험만 가까워졌다. ${target.name}을 다시 부르려면 다른 귀환 장소를 찾아야 한다.`;
    next.lastResult={action:plan.label,text,actor:actor.name,grade,roll:die,total:die+plan.bonus,dc:plan.dc,bonus:plan.bonus,stat:plan.stat,revivedId:returned?target.id:null,changes:[`운명 조각 −${plan.sparkCost}`,`위기 +${plan.pressureCost+pressureExtra}`,...(returned?[`${target.name} 생명 ${target.health}로 귀환`]:['이번 장소에서 재시도 불가'])]};
    addJournal(next,{sceneTitle:node.title,...next.lastResult});next.assists=[];next.turn++;next.revision++;advanceSeat(next);
    return {ok:true,game:next,plan};
  }
  const choice = availableChoices(next, campaign).find(c => c.id === plan.choiceId);
  let die = null;
  if (!plan.automatic) {
    die = trustedDie(roll);
    if (!Number.isInteger(die) || die < 1 || die > 20) return fail('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
  }
  const total = die == null ? null : die + plan.bonus;
  const grade = plan.automatic ? 'automatic' : gradeRoll(die, total, plan.dc);
  const outcomeKey = grade === 'automatic' ? 'success' : grade;
  const outcome = choice.outcomes?.[outcomeKey];
  if (!outcome || !campaign.nodes[outcome.next]) return fail('연결된 다음 장면을 찾을 수 없습니다. 저장 후 제작자에게 알려 주세요.');
  if (next.visited.includes(outcome.next)) return fail('같은 장면으로 돌아가는 연결 오류를 발견했습니다. 상태는 바뀌지 않았습니다.');
  if (plan.spendSpark) next.sparks--;
  if (plan.preparation) actor.focus = false;
  if (plan.openingPreparation) spendOpeningBonus(next, playerId);
  const changes=describeOutcome(outcome,game,campaign,{consumedItems:choice.consumeItems||[],critical:grade==='critical'});
  if(plan.spendSpark)changes.unshift('운명 조각 −1');
  if(plan.preparation)changes.unshift('인물의 준비 보너스 사용 완료');
  if(plan.openingPreparation)changes.unshift(`첫 장에서 얻은 준비 +${plan.openingPreparation} 사용 완료`);
  if (grade === 'critical') next.sparks = Math.min(4, next.sparks + 1);
  for (const flag of outcome.set || []) next.flags[flag] = true;
  for (const flag of outcome.unset || []) delete next.flags[flag];
  addClues(next, campaign, outcome.clues || []);
  const items=itemDelta(next,campaign,outcome.gainItems,[...(choice.consumeItems||[]),...(outcome.loseItems||[])]);
  next.pressure = bound(next.pressure + (Number(outcome.pressure) || 0), 0, campaign.pressureMax || 8);
  const died=[];
  for(const person of next.players){
    if(person.life==='dead')continue;
    person.health=healthAfterOutcome(outcome,person,actor.id);
    if(person.health===0){person.life='dead';person.echoUsed=false;died.push(person.name);}
  }
  const allDead=next.players.every(p=>p.life==='dead');
  if(died.length)changes.push(`사망: ${died.join(', ')}`);
  next.lastResult = { action: choice.label,
    text: storyPassage(outcome,died,allDead), deaths:died, actor: actor.name, grade, roll: die, total, dc: plan.dc, bonus: plan.bonus,
    stat: plan.stat, assistance: plan.assistance, spentSpark: plan.spendSpark,
    preparation: plan.preparation, gainedSpark: grade === 'critical', fromSceneId: next.nodeId,
    ...items,usedItems:validItems(campaign,[...(choice.useItems||[]),...(choice.consumeItems||[])]).map(id=>({id,name:campaign.items[id].name})),changes };
  next.nodeId = allDead?'__all_dead__':outcome.next;
  if(allDead)next.deathSceneTitle=node.title;else next.visited.push(outcome.next);
  next.phase = allDead || campaign.nodes[outcome.next].ending ? 'ended' : 'playing';
  next.lastResult.nextSceneTitle=nodeFor(next,campaign).title;
  if(allDead)next.lastResult.changes=changes.filter(change=>!change.startsWith('다음 장면:')).concat(`전원 사망: ${next.lastResult.nextSceneTitle}`);
  next.arrival={fromSceneId:game.nodeId,toSceneId:next.nodeId,fromSceneTitle:node.title,action:choice.label,grade,text:died.length?next.lastResult.text:outcome.arrival||outcome.text};
  addJournal(next, { sceneTitle: node.title, ...next.lastResult });
  next.assists = [];
  next.turn++;
  next.revision++;
  advanceSeat(next);
  startCombat(next,campaign);
  return { ok: true, game: next, plan };
}

export function assist(game, playerId) {
  if (game.phase === 'opening') return fail('아직 서로 만나기 전입니다. 각자의 첫 장을 마치면 동료를 도울 수 있습니다.');
  if (game.phase !== 'playing') return fail('끝난 이야기에서는 협력할 수 없습니다.');
  if (!game.players.some(p => p.id === playerId && p.connected !== false)) return fail('참가자를 찾을 수 없습니다.');
  if (currentPlayer(game)?.id === playerId) return fail('자신의 행동에는 협력할 수 없습니다.');
  if (game.assists.includes(playerId)) return fail('이미 이번 행동에 협력하고 있습니다.');
  if (game.assists.length >= 2) return fail('이번 행동에는 이미 두 동료가 협력하고 있습니다.');
  const actor=game.players.find(p=>p.id===playerId);
  if(actor.life==='dead'&&actor.echoUsed)return fail('마지막 조언은 이미 전했습니다. 대화로 동료들과 의논할 수 있습니다.');
  const next = clone(game); next.assists.push(playerId);if(actor.life==='dead')next.players.find(p=>p.id===playerId).echoUsed=true; next.revision++;
  return { ok: true, game: next };
}
export function revealSecret(game, campaign, playerId) {
  if (game.phase === 'opening') return fail('비밀은 일행과 만난 뒤에 털어놓을 수 있습니다.');
  const actor = game.players.find(p => p.id === playerId);
  if (!actor) return fail('참가자가 아닙니다.');
  if (actor.revealed) return fail('이미 고백한 비밀입니다.');
  if (game.phase !== 'playing') return fail('이미 마무리된 이야기입니다.');
  const next = clone(game);
  next.players.find(p => p.id === playerId).revealed = true;
  next.sparks = Math.min(4, next.sparks + 1);
  addJournal(next, { sceneTitle: nodeFor(next, campaign).title, actor: actor.name,
    action: '비밀을 털어놓았다', text: openingRole(game, campaign, actor)?.reveal || '', grade: 'reveal' });
  next.revision++;
  return { ok: true, game: next };
}
export function passTurn(game, playerId, { allowDisconnected = false, campaign, roll } = {}) {
  if (game.phase === 'opening') return fail('첫 장에서는 자신의 행동을 고르세요. 다른 사람의 차례를 기다리지 않아도 됩니다.');
  if (game.phase !== 'playing') return fail('이미 끝난 이야기입니다.');
  if (currentPlayer(game)?.id !== playerId && !(allowDisconnected && currentPlayer(game)?.connected === false)) return fail('현재 차례인 플레이어만 양보할 수 있습니다.');
  if(game.combat){
    if(!allowDisconnected || currentPlayer(game)?.connected !== false)return fail('전투 중에는 기본 공격 또는 직업 능력으로 차례를 마쳐 주세요.');
    if(!campaign || campaign.id!==game.campaignId)return fail('전투 정보를 확인할 수 없습니다.');
    const next=clone(game);
    try{const result=skipCombatTurn(next,campaign,{roll});addJournal(next,{sceneTitle:campaign.nodes[game.nodeId].encounter.title,...result});return {ok:true,game:next};}
    catch(error){return fail(error.message);}
  }
  const next = clone(game); advanceSeat(next); next.assists = []; next.revision++;
  return { ok: true, game: next };
}

/** Import validates allow-listed data; tokens, sockets and arbitrary object keys never survive. */
export function validateSave(data, campaigns) {
  const raw = data?.game ?? data;
  const campaign = campaigns.find(c => c.id === raw?.campaignId);
  if (!raw || ![14,15,17,19].includes(raw.schema) || !campaign || (!Object.hasOwn(campaign.nodes,raw.nodeId) && raw.nodeId!=='__all_dead__')) throw new Error('지원하는 저장 파일이 아니거나 시나리오가 맞지 않습니다. v14–v19 게임 저장을 선택해 주세요.');
  if (!Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > 4) throw new Error('저장 파일의 인원이 올바르지 않습니다.');
  if (JSON.stringify(data).length > 2000000) throw new Error('저장 파일이 너무 큽니다.');
  if(raw.players.some(p=>!p || typeof p.id!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(p.id) || ['__proto__','constructor','prototype'].includes(p.id)))throw new Error('저장 파일의 플레이어 ID가 올바르지 않습니다.');
  const game = createGame(campaign, raw.players);
  if(raw.players.some(p=>!getClasses(campaign).some(c=>c.id===p.classId) && !(raw.schema===14 && LEGACY_CLASS_IDS.includes(p.classId))))throw new Error('저장 파일의 직업이 이 시나리오에 맞지 않습니다.');
  game.nodeId = raw.nodeId;
  game.phase = raw.nodeId==='__all_dead__' || campaign.nodes[raw.nodeId].ending ? 'ended' : 'playing';
  game.deathSceneTitle=cleanText(raw.deathSceneTitle,100);
  game.revision = Math.max(1, Number.isSafeInteger(raw.revision) ? raw.revision : 1);
  game.turn = bound(Number.isSafeInteger(raw.turn) ? raw.turn : 0, 0, 500);
  game.activeIndex = bound(Number.isInteger(raw.activeIndex) ? raw.activeIndex : 0, 0, game.players.length - 1);
  game.pressure = bound(Number(raw.pressure) || 0, 0, campaign.pressureMax || 8);
  game.sparks = bound(Math.floor(Number(raw.sparks) || 0), 0, 4);
  const allowedFlags = new Set(Object.keys(campaign.flags || {}));
  for (const node of Object.values(campaign.nodes)) for (const choice of node.choices || []) for (const outcome of Object.values(choice.outcomes || {})) for (const f of outcome.set || []) allowedFlags.add(f);
  for (const f of allowedFlags) if (raw.flags?.[f] === true && !['__proto__','constructor','prototype'].includes(f)) game.flags[f] = true;
  game.clues = [...new Set(Array.isArray(raw.clues) ? raw.clues.filter(c => Object.hasOwn(campaign.clues || {}, c)) : [])];
  if(raw.schema===17 || raw.schema===19){
    game.inventory=validItems(campaign,raw.inventory);
    game.spentItems=validItems(campaign,raw.spentItems).filter(id=>!game.inventory.includes(id));
  }else{
    // Old builds had story proof but no bag. Only earned clues/flags restore an item.
    game.inventory=validItems(campaign,Object.entries(campaign.items||{}).filter(([,item])=>(item.legacyClues||[]).some(id=>game.clues.includes(id))||(item.legacyFlags||[]).some(id=>game.flags[id])).map(([id])=>id));
  }
  game.visited = [...new Set((Array.isArray(raw.visited) ? raw.visited : []).filter(id => Object.hasOwn(campaign.nodes, id)))];
  if (!game.visited.includes(game.nodeId)) game.visited.push(game.nodeId);
  for (const [id, node] of Object.entries(campaign.nodes)) for (const detail of node.details || []) {
    const key = `${id}:${detail.id}`; if (raw.detailsRead?.[key] === true) game.detailsRead[key] = true;
  }
  game.players.forEach((p,i) => { p.roleIndex = i; p.focus = raw.players[i].focus !== false; p.revealed = raw.players[i].revealed === true; p.health=bound(Math.floor(Number(raw.players[i].health??3)),0,3);if(!Number.isFinite(p.health))p.health=3;p.life=p.health===0?'dead':'alive';p.revivals=bound(Math.floor(Number(raw.players[i].revivals)||0),0,1);p.echoUsed=raw.players[i].echoUsed===true; });
  game.journal = Array.isArray(raw.journal) ? raw.journal.slice(-200).filter(e => e && typeof e === 'object').map((e,i) => ({
    id: `restored:${i}`, sceneTitle: cleanText(e.sceneTitle, 100), actor: cleanText(e.actor, 18),
    action: cleanText(e.action, 220), text: cleanText(e.text, 1800), narrativeText:cleanText(e.narrativeText,700), grade: cleanText(e.grade, 20),
    roll: Number.isInteger(e.roll) && e.roll >= 1 && e.roll <= 20 ? e.roll : null,
    total: Number.isFinite(e.total) ? e.total : null, dc: Number.isFinite(e.dc) ? e.dc : null,
    bonus: Number.isFinite(e.bonus) ? e.bonus : 0,
    changes:Array.isArray(e.changes)?e.changes.slice(0,20).map(text=>cleanText(text,250)):[],
    gainedItems:validItems(campaign,storedItemIds(e.gainedItems)).map(id=>({id,name:campaign.items[id].name})),
    lostItems:validItems(campaign,storedItemIds(e.lostItems)).map(id=>({id,name:campaign.items[id].name})),
    usedItems:validItems(campaign,storedItemIds(e.usedItems)).map(id=>({id,name:campaign.items[id].name})),
    nextSceneTitle:cleanText(e.nextSceneTitle,100),preparation:e.preparation===true,
    ...(Array.isArray(e.deaths) ? { deaths:e.deaths.slice(0,4).map(name=>cleanText(name,18)).filter(Boolean) } : {}),
    ...(game.players.some(player=>player.id===e.revivedId) ? { revivedId:e.revivedId } : {}),
    ...(e.opening === true ? {opening:true} : {}), ...(e.meeting === true ? {meeting:true} : {}),
    ...(e.combat === true ? {
      combat: true,
      combatEvent: ['attack','ability','victory','defeat'].includes(e.combatEvent) ? e.combatEvent : 'attack',
      damage: bound(Number.isInteger(e.damage) ? e.damage : 0,0,5),
      targetId: game.players.some(p=>p.id===e.targetId) ? e.targetId : null,
      enemyRolls: Array.isArray(e.enemyRolls) ? e.enemyRolls.slice(0,4).filter(r=>r&&game.players.some(p=>p.id===r.targetId)&&Number.isInteger(r.roll)&&r.roll>=1&&r.roll<=20).map(r=>({targetId:r.targetId,roll:r.roll,dc:bound(Number.isInteger(r.dc)?r.dc:12,1,20),damage:bound(Number.isInteger(r.damage)?r.damage:0,0,3),blocked:bound(Number.isInteger(r.blocked)?r.blocked:0,0,3)})) : [],
      deaths: Array.isArray(e.deaths) ? e.deaths.slice(0,4).map(n=>cleanText(n,18)) : [],
    } : {}),
  })) : [];
  Object.assign(game,restoreChronicle(raw,game.journal,{turn:game.turn,startTitle:campaign.nodes[campaign.start].title}));
  for(const id of Object.keys(campaign.nodes))for(const p of game.players){const key=`${id}:${p.id}`;if(raw.reviveAttempts?.[key]===true)game.reviveAttempts[key]=true;}
  if(game.players.every(p=>p.life==='dead')){game.nodeId='__all_dead__';game.phase='ended';}
  else if(game.nodeId==='__all_dead__')throw new Error('전멸 결말의 생존 상태가 올바르지 않습니다.');
  else if(game.phase==='playing'&&game.players[game.activeIndex].life==='dead')advanceSeat(game);
  restoreCombat(game,campaign,raw);
  game.lastResult = game.journal.at(-1) || null;
  const arrival=raw.arrival;
  if(arrival&&typeof arrival==='object'&&arrival.toSceneId===game.nodeId&&Object.hasOwn(campaign.nodes,arrival.fromSceneId)&&[...ROLLED_GRADES,'automatic'].includes(arrival.grade)){
    game.arrival={fromSceneId:arrival.fromSceneId,toSceneId:game.nodeId,fromSceneTitle:campaign.nodes[arrival.fromSceneId].title,action:cleanText(arrival.action,220),grade:arrival.grade,text:cleanText(arrival.text,1600)};
  }
  game.assists = [...new Set(Array.isArray(raw.assists) ? raw.assists.filter(id=>id!==game.players[game.activeIndex].id&&game.players.some(p=>p.id===id)) : [])].slice(0,2);
  restoreOpening(game, campaign, raw);
  return { campaign, game };
}

function recordMeeting(game, campaign) {
  const meeting = meetingPassages(game, campaign);
  for (let index = 0; index < game.players.length; index++) {
    const player = game.players[index];
    addJournal(game, { opening:true, sceneTitle:'각자의 첫 장', actor:player.name, action:'합류하기 전의 일을 전했다', grade:'automatic', text:meeting.text[index+1] });
  }
  const text = meeting.text[0];
  game.lastResult = { meeting:true, sceneTitle:meeting.title, actor:'', action:game.players.length===1?'첫 장을 마쳤다':'서로의 이름을 나누었다', grade:'automatic', text, roll:null, total:null, dc:0, bonus:0, changes:[], nextSceneTitle:campaign.nodes[campaign.start].title };
  addJournal(game, game.lastResult);
  startCombat(game, campaign);
}

export function deferOpening(game, campaign, playerId) {
  const result = deferOpeningPlayer(game, campaign, playerId);
  if (result.ok && result.joined) recordMeeting(result.game, campaign);
  return result;
}
