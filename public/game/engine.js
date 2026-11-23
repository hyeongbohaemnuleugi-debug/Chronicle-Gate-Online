/** Chronicle Gate 14: deterministic, shared story rules. No network or model dependency. */
export const VERSION = '14.0.0';
export const STAT_LABELS = Object.freeze({ might: '힘', agility: '민첩', wit: '통찰', heart: '교섭' });
export const CLASSES = Object.freeze([
  { id: 'guardian', name: '수호자', description: '위험을 막고 정면으로 돌파합니다.', stats: { might: 3, agility: 1, wit: 0, heart: 1 } },
  { id: 'scout', name: '길잡이', description: '잠입과 기민한 움직임에 강합니다.', stats: { might: 1, agility: 3, wit: 1, heart: 0 } },
  { id: 'scholar', name: '분석가', description: '단서와 장치의 원리를 읽습니다.', stats: { might: 0, agility: 1, wit: 3, heart: 1 } },
  { id: 'envoy', name: '중재자', description: '인물의 마음을 움직이고 협상합니다.', stats: { might: 1, agility: 0, wit: 1, heart: 3 } },
]);
const CLASS_MAP = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const clone = value => JSON.parse(JSON.stringify(value));
const bound = (value, low, high) => Math.max(low, Math.min(high, value));
export const cleanText = (value, max = 220) => String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const fail = (error, hints = []) => ({ ok: false, error, hints });
const nodeFor = (game, campaign) => game.nodeId === '__all_dead__' ? { id:'__all_dead__', chapter:4, location:game.deathSceneTitle || campaign.title, ending:true, choices:[], ...(campaign.deathEnding || {title:'돌아오지 못한 일행',text:['일행의 마지막 목소리가 끊겼습니다. 이곳에서 이야기가 끝납니다.'],art:2,mood:'danger'}) } : campaign.nodes[game.nodeId];
const currentPlayer = game => game.players[game.activeIndex];

export function conditionMatches(condition, game) {
  if (!condition) return true;
  if (Array.isArray(condition)) return condition.every(c => conditionMatches(c, game));
  if (condition.all && !condition.all.every(c => conditionMatches(c, game))) return false;
  if (condition.any && !condition.any.some(c => conditionMatches(c, game))) return false;
  if (condition.flag && !game.flags[condition.flag]) return false;
  if (condition.notFlag && game.flags[condition.notFlag]) return false;
  if (condition.clue && !game.clues.includes(condition.clue)) return false;
  if (condition.notClue && game.clues.includes(condition.notClue)) return false;
  if (condition.pressureAtMost != null && game.pressure > condition.pressureAtMost) return false;
  if (condition.pressureAtLeast != null && game.pressure < condition.pressureAtLeast) return false;
  return true;
}
export function availableChoices(game, campaign) {
  return (nodeFor(game, campaign)?.choices ?? []).filter(c => conditionMatches(c.requires, game));
}

export function createGame(campaign, players) {
  if (!campaign?.nodes?.[campaign.start]) throw new Error('시나리오의 시작 장면이 없습니다.');
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) throw new Error('플레이어는 1~4명이어야 합니다.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('플레이어 ID가 중복되었습니다.');
  return {
    schema: 14, version: VERSION, campaignId: campaign.id, nodeId: campaign.start,
    phase: 'playing', revision: 1, turn: 0, activeIndex: 0, pressure: 0, sparks: 2,
    flags: {}, clues: [], visited: [campaign.start], detailsRead: {}, assists: [], reviveAttempts: {},
    players: players.map((p, i) => ({ id: cleanText(p.id, 80), name: cleanText(p.name, 18) || `모험가 ${i + 1}`,
      classId: CLASS_MAP[p.classId] ? p.classId : CLASSES[i % 4].id,
      roleIndex: i, focus: true, revealed: false, health:3, maxHealth:3, life:'alive', revivals:0, echoUsed:false, connected: p.connected !== false })),
    journal: [], lastResult: null, startedAt: new Date().toISOString(),
  };
}

export function viewGame(game, campaign, viewerId) {
  const node = nodeFor(game, campaign);
  const me = game.players.find(p => p.id === viewerId);
  const role = me ? campaign.roles?.[me.roleIndex] : null;
  const callbacks = [...(node.callbacks || []), ...(node.ending ? node.epilogues || [] : [])]
    .filter(c => conditionMatches(c.when, game)).map(c => c.text);
  const actualText = [...(Array.isArray(node.text) ? node.text : [node.text]), ...callbacks].filter(Boolean);
  if(node.ending){
    if(game.deathSceneTitle)actualText.push(`마지막 발걸음은 ‘${game.deathSceneTitle}’에 남았습니다.`);
    const alive=game.players.filter(p=>p.life!=='dead').map(p=>p.name);
    const dead=game.players.filter(p=>p.life==='dead').map(p=>p.name);
    const revived=game.players.filter(p=>p.revivals>0).map(p=>p.name);
    for(const person of game.players){
      const personalRole=campaign.roles?.[person.roleIndex];
      const parts=person.life==='dead' && personalRole?.deadEpilogue ? [personalRole.deadEpilogue] : (personalRole?.epilogues||[]).filter(e=>conditionMatches(e.when,game)).map(e=>e.text);
      if(parts.length)actualText.push(`${person.name}의 ${person.life==='dead'?'유산':'후일담'} — ${parts.join(' ')}`);
    }
    actualText.push(`살아남은 사람: ${alive.join(', ') || '없음'}. 희생된 사람: ${dead.join(', ') || '없음'}.${revived.length?` 죽음에서 돌아온 사람: ${revived.join(', ')}.`:''}`);
  }
  return {
    campaignId: campaign.id, title: campaign.title, revision: game.revision, phase: game.phase,
    scene: {
      id: node.id || game.nodeId, title: node.title, chapter: node.chapter || 1,
      location: node.location || campaign.title, art: Number(node.art) || 0,
      mood: node.mood || 'mystery', text: actualText, dialogue: node.dialogue || null,
      objective: node.objective || campaign.objective, entities: clone(node.entities || []),
      details: (node.details || []).map(d => ({ id: d.id, label: d.label,
        read: Boolean(game.detailsRead[`${game.nodeId}:${d.id}`]),
        text: game.detailsRead[`${game.nodeId}:${d.id}`] ? d.text : undefined })),
      choices: availableChoices(game, campaign).map(c => ({ id: c.id, label: c.label, stat: c.stat,
        dc: c.automatic ? null : (c.dc || 11) + (game.pressure >= (campaign.pressureMax || 8) ? 1 : 0),
        risk: c.risk || '상황이 바뀌고 다른 경로로 이어집니다.', harmRisk: Math.max(0,...Object.values(c.outcomes || {}).map(o=>(o.harm||0)+(o.harmAll||0))), automatic: Boolean(c.automatic) })),
      resurrection: node.resurrection ? { ...node.resurrection, available: conditionMatches(node.resurrection.requires,game), eligibleIds:game.players.filter(p=>p.life==='dead'&&p.revivals<1&&!game.reviveAttempts?.[`${game.nodeId}:${p.id}`]).map(p=>p.id) } : null,
      ending: Boolean(node.ending), question: node.question || '',
    },
    players: game.players.map(p => ({ ...p, className: CLASS_MAP[p.classId]?.name,
      stats: CLASS_MAP[p.classId]?.stats, assisting: game.assists.includes(p.id),
      revealedText: p.revealed ? campaign.roles?.[p.roleIndex]?.reveal : null })),
    activePlayerId: currentPlayer(game)?.id,
    pressure: { value: game.pressure, max: campaign.pressureMax || 8, label: campaign.pressureLabel || '위기' },
    sparks: game.sparks,
    clues: game.clues.map(id => ({ id, ...(campaign.clues?.[id] || { title: id, text: '' }) })),
    flags: Object.keys(game.flags).filter(k => game.flags[k] && campaign.flags?.[k]).map(k => campaign.flags[k]),
    journal: clone(game.journal), lastResult: clone(game.lastResult),
    secret: role ? clone(role) : null,
    canAct: Boolean(me && me.life !== 'dead' && me.id === currentPlayer(game)?.id && game.phase === 'playing'),
    canAssist: Boolean(me && me.id !== currentPlayer(game)?.id && game.phase === 'playing' && !game.assists.includes(me.id) && (me.life !== 'dead' || !me.echoUsed)),
    helpText: '안전한 관찰은 주사위 없이. 위험한 행동은 D20 + 직업 보너스. 목표보다 1~2 낮으면 대가를 치르고 성공합니다.',
    ending: Boolean(node.ending), visitedCount: game.visited.length,
  };
}

const INTENTS = [
  ['help', /구하|구조|치료|붕대|살리|보호|지탱|받쳐|안심|돌보|돕/],
  ['trick', /거짓|속이|속여|위조|연기|흉내|변장|미끼|시선|주의.*돌|속임/],
  ['perform', /노래|춤|연주|공연|웃기|농담|요리|조리|먹이|음식/],
  ['sneak', /몰래|잠입|숨[어는기]|은밀|훔치|도둑|소매치|재빨|피하|피해|점프|뛰어/],
  ['force', /부수|파괴|공격|때리|때려|싸우|베어|내리치|밀어|들어올|막아|버티|강제로/],
  ['talk', /설득|대화|협상|타협|거래|흥정|묻|물어|질문|말하|말을|듣|부탁|대답|약속|증언|고백|공개/],
  ['use', /사용|연결|조작|수리|작동|끄|켜|전원|해킹|열어|돌려|복구|해체|조립|꽂/],
  ['investigate', /조사|살펴|살핀|검사|추적|분석|확인|읽|찾아|찾는|검색|증거|비교|관찰|알아/],
  ['move', /이동|들어가|올라|내려|떠나|돌아가|건너|따라|향해|진입|탈출/],
  ['wait', /기다|대기|멈춰|쉰|쉬어/],
  ['observe', /주변|둘러|무엇|상황|보이는|둘러본/],
];
export function classifyAction(text) {
  return INTENTS.find(([, re]) => re.test(text))?.[0] || 'unknown';
}
const INTENT_FAMILY = {
  observe: ['observe', 'investigate'], investigate: ['investigate', 'observe', 'use'],
  talk: ['talk', 'trick'], trick: ['trick', 'talk', 'perform'],
  help: ['help', 'use'], force: ['force'], use: ['use', 'investigate'],
  sneak: ['sneak', 'move'], move: ['move', 'sneak'], perform: ['perform', 'trick'], wait: ['wait'],
};
function scoreChoice(choice, text, intent, matchedEntities) {
  let score = 0;
  for (const keyword of choice.keywords || []) {
    if (keyword && text.includes(keyword)) score += Math.min(6, Math.max(2, keyword.length));
  }
  if (choice.label === text) score += 100;
  if (choice.intent === intent) score += 5;
  else if (INTENT_FAMILY[intent]?.includes(choice.intent)) score += 2;
  if (choice.target && matchedEntities.some(e => e.id === choice.target)) score += 6;
  if (choice.target && matchedEntities.length && !matchedEntities.some(e => e.id === choice.target)) score -= 8;
  return score;
}
function inferChoice(text, choices, node) {
  const entities = node.entities || [];
  const explicitRecipients=[...text.matchAll(/([가-힣A-Za-z0-9·]{1,20})(?:에게|한테|더러)/g)].map(m=>m[1]);
  const genericPeople=new Set(['그','그녀','그들','동료','일행','친구','상대','상대방','사람','모두']);
  for(const name of explicitRecipients){
    if(genericPeople.has(name))continue;
    if(!entities.some(e=>[e.label,...(e.aliases||[])].some(alias=>alias&&(alias.includes(name)||name.includes(alias)))))return null;
  }
  const matchedEntities = entities.filter(e => [e.label, ...(e.aliases || [])].some(n => n && n.length > 1 && text.includes(n)));
  const intent = classifyAction(text);
  const ranked = choices.map(choice => ({ choice, score: scoreChoice(choice, text, intent, matchedEntities) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const ambiguous = ranked[1] && top.score === ranked[1].score;
  // A verb alone must not silently choose an unrelated action or invent a target.
  const enoughGrounding = matchedEntities.length > 0 || choices.some(c => (c.keywords || []).some(k => k.length > 1 && text.includes(k))) || choices.some(c => c.label === text);
  if (!top || top.score < 5 || ambiguous || !enoughGrounding) return null;
  // An explicit hostile action cannot become a friendly conversation by keyword alone.
  if (intent === 'force' && !['force','help'].includes(top.choice.intent)) return null;
  return { ...top, intent, matchedEntities };
}

export function previewAction(game, campaign, playerId, payload = {}) {
  if (!game || game.campaignId !== campaign.id) return fail('현재 시나리오와 저장 데이터가 맞지 않습니다.');
  if (game.phase !== 'playing') return fail('이 이야기는 끝났습니다. 새 테이블에서 다른 결말을 만나 보세요.');
  const actor = game.players.find(p => p.id === playerId);
  if (!actor) return fail('이 테이블의 참가자가 아닙니다.');
  const node = nodeFor(game, campaign);
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
    const stats=CLASS_MAP[actor.classId].stats;const stat=stats.heart>=stats.wit?'heart':'wit';
    const assistance=Math.min(2,game.assists.length);const bonus=stats[stat]+assistance;
    const dc=(site.dc||12)+(game.pressure >= (campaign.pressureMax||8)?1:0);
    return {ok:true,plan:{type:'revive',reviveId:target.id,label:`${target.name} 부활 · ${site.label}`,stat,statLabel:STAT_LABELS[stat],dc,bonus,assistance,automatic:false,revision:game.revision,sparkCost,pressureCost,requiresConfirmation:true,risk:`운명 토큰 ${sparkCost}개와 위기 ${pressureCost}칸을 소모합니다. 성공: 생명 2, 대가 있는 성공: 생명 1로 부활. 실패: 부활하지 못하고 위기 1칸 추가. 이 장소에서는 한 번만 시도할 수 있습니다.`,successChance:Array.from({length:20},(_,i)=>i+1).filter(d=>d===20||(d!==1&&d+bonus>=dc)).length*5}};
  }
  const choices = availableChoices(game, campaign);
  let choice = payload.choiceId ? choices.find(c => c.id === payload.choiceId) : null;
  let declaration = '';
  let interpreted = false;
  if (payload.choiceId && !choice) return fail('그 행동은 현재 장면에서 할 수 없습니다. 최신 선택지를 확인하세요.');
  if (!choice) {
    declaration = cleanText(payload.text);
    if (declaration.length < 2) return fail('누구에게 무엇을 할지 적어 주세요.', choices.map(c => c.label));
    // Safe observations only resolve explicit authored details; they never manufacture clues.
    if (/^(주변(을)?\s*)?(둘러본다|둘러봐|둘러보기|살펴본다|살펴보기)$/.test(declaration)) {
      const detail = (node.details || []).find(d => !game.detailsRead[`${game.nodeId}:${d.id}`]);
      if (detail) return previewAction(game, campaign, playerId, { detailId: detail.id });
      return fail('눈에 보이는 단서는 모두 확인했습니다. 다음 행동을 정해 주세요.', choices.map(c => c.label));
    }
    const match = inferChoice(declaration, choices, node);
    if (!match) return fail('그 행동의 목표를 이 장면과 연결하기 어렵습니다. 아래 목표 중 하나를 골라 방법을 덧붙여 주세요.', choices.map(c => c.label));
    choice = match.choice;
    interpreted = declaration !== choice.label;
  }
  const automatic = Boolean(choice.automatic);
  const stat = choice.stat || 'wit';
  let bonus = CLASS_MAP[actor.classId].stats[stat] || 0;
  const help = Math.min(2, game.assists.filter(id => id !== actor.id && game.players.some(p => p.id === id && p.connected !== false)).length);
  const spendSpark = !automatic && payload.spendSpark === true;
  const flashback = !automatic ? cleanText(payload.flashback, 180) : '';
  if (spendSpark && game.sparks < 1) return fail('남은 운명 토큰이 없습니다.');
  if (flashback && !actor.focus) return fail('이 캐릭터의 회상은 이미 사용했습니다.');
  if (flashback && flashback.length < 8) return fail('어떤 준비를 해 두었는지 회상을 8자 이상 적어 주세요.');
  bonus += help + (spendSpark ? 3 : 0) + (flashback ? 2 : 0);
  const pressurePenalty = game.pressure >= (campaign.pressureMax || 8) ? 1 : 0;
  const dc = automatic ? 0 : (choice.dc || 11) + pressurePenalty;
  const harmRisk=Math.max(0,...Object.values(choice.outcomes||{}).map(o=>(o.harm||0)+(o.harmAll||0)));
  const groupHarm=Math.max(0,...Object.values(choice.outcomes||{}).map(o=>o.harmAll||0));
  const dangerText=harmRisk>0?` 최대 생명 ${harmRisk} 손실${groupHarm>0?` (일행 전체 최대 ${groupHarm})`:''}. 생명이 0이 되면 사망합니다.`:'';
  return { ok: true, plan: {
    type: 'choice', choiceId: choice.id, label: choice.label, declaration, interpreted,
    stat, statLabel: STAT_LABELS[stat], dc, bonus: automatic ? 0 : bonus, automatic,
    assistance: help, classBonus: CLASS_MAP[actor.classId].stats[stat] || 0,
    spendSpark, flashback, pressurePenalty,
    risk: (choice.risk || '실패해도 사건은 진행되지만 더 큰 대가를 치릅니다.')+dangerText, harmRisk, groupHarm,
    successChance: automatic ? 100 : Array.from({length:20},(_,i)=>i+1).filter(d=>d===20 || (d!==1 && d+bonus>=dc)).length*5,
    mixedChance: automatic ? 0 : Array.from({length:20},(_,i)=>i+1).filter(d=>d!==20 && d!==1 && d+bonus<dc && d+bonus>=dc-2).length*5,
    revision: game.revision, requiresConfirmation: true,
  } };
}

export function gradeRoll(roll, total, dc) {
  if (roll === 1) return 'failure';
  if (roll === 20) return 'critical';
  if (total >= dc) return 'success';
  if (total >= dc - 2) return 'mixed';
  return 'failure';
}
function addClues(game, campaign, ids = []) {
  for (const id of ids) if (campaign.clues?.[id] && !game.clues.includes(id)) game.clues.push(id);
}
function addJournal(game, entry) {
  const id = `${game.turn}:${game.revision}:${game.journal.length}`;
  game.journal.push({ id, ...entry });
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
  if (payload.revision != null && payload.revision !== game.revision) return fail('장면이 갱신되었습니다. 판정 내용을 다시 확인해 주세요.');
  const preview = previewAction(game, campaign, playerId, payload);
  if (!preview.ok) return preview;
  const plan = preview.plan;
  const next = clone(game);
  const actor = next.players.find(p => p.id === playerId);
  const node = nodeFor(next, campaign);
  if (plan.type === 'detail') {
    const detail = node.details.find(d => d.id === plan.detailId);
    next.detailsRead[`${next.nodeId}:${detail.id}`] = true;
    addClues(next, campaign, detail.clue ? [detail.clue] : detail.clues || []);
    next.lastResult = { action: detail.label, text: detail.text, actor: actor.name, grade: 'observe', roll: null, total: null, dc: 0, bonus: 0 };
    addJournal(next, { sceneTitle: node.title, ...next.lastResult });
    next.revision++;
    return { ok: true, game: next, plan };
  }
  if(plan.type==='revive'){
    const die=typeof roll==='function'?roll():roll;
    if(!Number.isInteger(die)||die<1||die>20)return fail('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
    const grade=gradeRoll(die,die+plan.bonus,plan.dc);const target=next.players.find(p=>p.id===plan.reviveId);
    next.reviveAttempts ||= {};next.reviveAttempts[`${next.nodeId}:${target.id}`]=true;
    next.sparks-=plan.sparkCost;
    next.pressure=bound(next.pressure+plan.pressureCost+(grade==='failure'?1:0),0,campaign.pressureMax||8);
    if(grade!=='failure'){target.life='alive';target.health=grade==='mixed'?1:2;target.revivals++;target.echoUsed=false;}
    const text=grade==='failure'?`${node.resurrection.label}에 응답이 없습니다. ${target.name}의 죽음은 되돌아오지 않았고, 일행에게 남은 시간이 줄었습니다.`:`${node.resurrection.text} ${target.name}의 숨이 돌아옵니다. 생명 ${target.health}로 부활했지만, 이 캐릭터에게 두 번째 부활은 없습니다.`;
    next.lastResult={action:plan.label,text,actor:actor.name,grade,roll:die,total:die+plan.bonus,dc:plan.dc,bonus:plan.bonus,stat:plan.stat,revivedId:grade==='failure'?null:target.id};
    addJournal(next,{sceneTitle:node.title,...next.lastResult});next.assists=[];next.turn++;next.revision++;advanceSeat(next);
    return {ok:true,game:next,plan};
  }
  const choice = availableChoices(next, campaign).find(c => c.id === plan.choiceId);
  let die = null;
  if (!plan.automatic) {
    die = typeof roll === 'function' ? roll() : roll;
    if (!Number.isInteger(die) || die < 1 || die > 20) return fail('주사위 판정에 실패했습니다. 상태는 바뀌지 않았습니다.');
  }
  const total = die == null ? null : die + plan.bonus;
  const grade = plan.automatic ? 'automatic' : gradeRoll(die, total, plan.dc);
  const outcomeKey = grade === 'critical' || grade === 'automatic' ? 'success' : grade;
  const outcome = choice.outcomes?.[outcomeKey] || choice.outcomes?.success;
  if (!outcome || !campaign.nodes[outcome.next]) return fail('연결된 다음 장면을 찾을 수 없습니다. 저장 후 제작자에게 알려 주세요.');
  if (next.visited.includes(outcome.next)) return fail('같은 장면으로 돌아가는 연결 오류를 발견했습니다. 상태는 바뀌지 않았습니다.');
  if (plan.spendSpark) next.sparks--;
  if (plan.flashback) actor.focus = false;
  if (grade === 'critical') next.sparks = Math.min(4, next.sparks + 1);
  for (const flag of outcome.set || []) next.flags[flag] = true;
  for (const flag of outcome.unset || []) delete next.flags[flag];
  addClues(next, campaign, outcome.clues || []);
  next.pressure = bound(next.pressure + (Number(outcome.pressure) || 0), 0, campaign.pressureMax || 8);
  const died=[];
  for(const person of next.players){
    if(person.life==='dead')continue;
    const damage=(Number(outcome.harmAll)||0)+(person.id===actor.id?(Number(outcome.harm)||0):0);
    const healing=person.id===actor.id?(Number(outcome.heal)||0):0;
    person.health=bound(person.health-damage+healing,0,3);
    if(person.health===0){person.life='dead';person.echoUsed=false;died.push(person.name);}
  }
  const deathText=died.length?` ${died.join(', ')} 사망. 남은 동료는 부활의 장소를 찾거나 이 희생을 안고 계속 진행해야 합니다.`:'';
  next.lastResult = { action: plan.declaration || choice.label, interpretedAs: plan.interpreted ? choice.label : null,
    text: outcome.text+deathText, deaths:died, actor: actor.name, grade, roll: die, total, dc: plan.dc, bonus: plan.bonus,
    stat: plan.stat, assistance: plan.assistance, spentSpark: plan.spendSpark,
    flashback: plan.flashback, gainedSpark: grade === 'critical', fromSceneId: next.nodeId };
  addJournal(next, { sceneTitle: node.title, ...next.lastResult });
  const allDead=next.players.every(p=>p.life==='dead');
  next.nodeId = allDead?'__all_dead__':outcome.next;
  if(allDead)next.deathSceneTitle=node.title;else next.visited.push(outcome.next);
  next.phase = allDead || campaign.nodes[outcome.next].ending ? 'ended' : 'playing';
  next.assists = [];
  next.turn++;
  next.revision++;
  advanceSeat(next);
  return { ok: true, game: next, plan };
}

export function assist(game, playerId) {
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
  const actor = game.players.find(p => p.id === playerId);
  if (!actor) return fail('참가자가 아닙니다.');
  if (actor.revealed) return fail('이미 고백한 비밀입니다.');
  if (game.phase !== 'playing') return fail('이미 마무리된 이야기입니다.');
  const next = clone(game);
  next.players.find(p => p.id === playerId).revealed = true;
  next.sparks = Math.min(4, next.sparks + 1);
  addJournal(next, { sceneTitle: nodeFor(next, campaign).title, actor: actor.name,
    action: '비밀을 털어놓았다', text: campaign.roles?.[actor.roleIndex]?.reveal || '', grade: 'reveal' });
  next.revision++;
  return { ok: true, game: next };
}
export function passTurn(game, playerId, { allowDisconnected = false } = {}) {
  if (game.phase !== 'playing') return fail('이미 끝난 이야기입니다.');
  if (currentPlayer(game)?.id !== playerId && !(allowDisconnected && currentPlayer(game)?.connected === false)) return fail('현재 차례인 플레이어만 양보할 수 있습니다.');
  const next = clone(game); advanceSeat(next); next.assists = []; next.revision++;
  return { ok: true, game: next };
}

/** Import validates allow-listed data; tokens, sockets and arbitrary object keys never survive. */
export function validateSave(data, campaigns) {
  const raw = data?.game ?? data;
  const campaign = campaigns.find(c => c.id === raw?.campaignId);
  if (!raw || raw.schema !== 14 || !campaign || (!Object.hasOwn(campaign.nodes,raw.nodeId) && raw.nodeId!=='__all_dead__')) throw new Error('v14 저장 파일이 아니거나 시나리오가 맞지 않습니다.');
  if (!Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > 4) throw new Error('저장 파일의 인원이 올바르지 않습니다.');
  if (JSON.stringify(data).length > 2000000) throw new Error('저장 파일이 너무 큽니다.');
  if(raw.players.some(p=>!p || typeof p.id!=='string' || !/^[A-Za-z0-9_-]{1,80}$/.test(p.id)))throw new Error('저장 파일의 플레이어 ID가 올바르지 않습니다.');
  const game = createGame(campaign, raw.players);
  if (raw.players.some(p => !CLASS_MAP[p.classId])) throw new Error('저장 파일의 직업이 올바르지 않습니다.');
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
  game.visited = [...new Set((Array.isArray(raw.visited) ? raw.visited : []).filter(id => Object.hasOwn(campaign.nodes, id)))];
  if (!game.visited.includes(game.nodeId)) game.visited.push(game.nodeId);
  for (const [id, node] of Object.entries(campaign.nodes)) for (const detail of node.details || []) {
    const key = `${id}:${detail.id}`; if (raw.detailsRead?.[key] === true) game.detailsRead[key] = true;
  }
  game.players.forEach((p,i) => { p.roleIndex = i; p.focus = raw.players[i].focus !== false; p.revealed = raw.players[i].revealed === true; p.health=bound(Math.floor(Number(raw.players[i].health??3)),0,3);if(!Number.isFinite(p.health))p.health=3;p.life=p.health===0?'dead':'alive';p.revivals=bound(Math.floor(Number(raw.players[i].revivals)||0),0,1);p.echoUsed=raw.players[i].echoUsed===true; });
  game.journal = Array.isArray(raw.journal) ? raw.journal.slice(-200).filter(e => e && typeof e === 'object').map((e,i) => ({
    id: `restored:${i}`, sceneTitle: cleanText(e.sceneTitle, 100), actor: cleanText(e.actor, 18),
    action: cleanText(e.action, 220), text: cleanText(e.text, 1800), grade: cleanText(e.grade, 20),
    roll: Number.isInteger(e.roll) && e.roll >= 1 && e.roll <= 20 ? e.roll : null,
    total: Number.isFinite(e.total) ? e.total : null, dc: Number.isFinite(e.dc) ? e.dc : null,
    bonus: Number.isFinite(e.bonus) ? e.bonus : 0,
  })) : [];
  for(const id of Object.keys(campaign.nodes))for(const p of game.players){const key=`${id}:${p.id}`;if(raw.reviveAttempts?.[key]===true)game.reviveAttempts[key]=true;}
  if(game.players.every(p=>p.life==='dead')){game.nodeId='__all_dead__';game.phase='ended';}
  else if(game.nodeId==='__all_dead__')throw new Error('전멸 결말의 생존 상태가 올바르지 않습니다.');
  else if(game.phase==='playing'&&game.players[game.activeIndex].life==='dead')advanceSeat(game);
  game.lastResult = game.journal.at(-1) || null;
  game.assists = [];
  return { campaign, game };
}
