/** Deterministic, authored expansions. Basic data is never mutated. */
export const STORY_LENGTHS = Object.freeze(['basic', 'epic']);
const variants = new WeakMap();
const bases = new WeakMap();
export function validStoryLength(value) { return STORY_LENGTHS.includes(value); }

export function composeEpic(base, spec) {
  if (!spec?.chapters?.length) throw new Error(`서사시 원고가 없습니다: ${base.id}`);
  const nodes = {...base.nodes};
  for (const chapter of spec.chapters) {
    const hub = nodes[chapter.at];
    if (!hub || hub.ending || !chapter.scenes?.length || !chapter.return?.id) throw new Error(`잘못된 서사시 연결: ${base.id}/${chapter.at}`);
    for (const scene of chapter.scenes) {
      if (!scene.id || nodes[scene.id]) throw new Error(`중복된 서사시 장면: ${base.id}/${scene.id}`);
      nodes[scene.id] = {...scene, epic: true};
    }
    if (nodes[chapter.return.id]) throw new Error(`중복된 복귀 장면: ${chapter.return.id}`);
    // The encounter stays at the original hub. Returning never repeats it.
    const {encounter, partyText, ...original} = hub;
    nodes[chapter.return.id] = {...original, ...chapter.return, choices:hub.choices, epic:true};
    nodes[chapter.at] = {...hub, choices:[{
      id:`enter-${chapter.scenes[0].id}`, label:chapter.entry.label, automatic:true,
      risk:'이 선택으로 서사시의 다음 장을 시작합니다.',
      outcomes:{success:{next:chapter.scenes[0].id, text:chapter.entry.text}},
    }]};
  }
  for (const [id, epilogues] of Object.entries(spec.endingEpilogues || {})) {
    if (!nodes[id]?.ending) throw new Error(`서사시 후일담의 결말이 없습니다: ${base.id}/${id}`);
    nodes[id] = {...nodes[id], epilogues:[...(nodes[id].epilogues || []), ...epilogues]};
  }
  for (const node of Object.values(nodes)) for (const choice of node.choices || []) for (const outcome of Object.values(choice.outcomes || {})) {
    if (!nodes[outcome.next]) throw new Error(`서사시의 다음 장소가 없습니다: ${base.id}/${node.id}/${outcome.next}`);
  }
  const result = {...base, nodes, lengthMode:'epic', estimatedMinutes:spec.estimatedMinutes || '70–110',
    flags:{...base.flags,...spec.flags}, clues:{...base.clues,...spec.clues}, items:{...base.items,...spec.items}};
  bases.set(result, base);
  return result;
}

export function campaignForLength(campaign, length = 'basic') {
  if (!campaign) return campaign;
  if (!validStoryLength(length)) throw new Error('기본 또는 서사시를 선택해 주세요.');
  const base = bases.get(campaign) || campaign;
  if (length === 'basic') return base;
  if (campaign.lengthMode === 'epic') return campaign;
  if (!variants.has(base)) variants.set(base, composeEpic(base, base.epicSpec));
  return variants.get(base);
}

export function lengthOptions(base) {
  return STORY_LENGTHS.map(id => {
    const story = campaignForLength(base,id);
    return {id, label:id === 'epic' ? '서사시' : '기본', estimatedMinutes:story.estimatedMinutes,
      sceneCount:Object.values(story.nodes).filter(n=>!n.ending).length,
      endingCount:Object.values(story.nodes).filter(n=>n.ending).length};
  });
}
