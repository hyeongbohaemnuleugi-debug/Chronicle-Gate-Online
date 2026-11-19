// Chronicle Gate v12 - deterministic, server-authoritative dramatic director.
// This module contains original prose and pure rules. No third-party video assets.
export const MAX_STRESS = 6;
export const STRESS_BANDS = Object.freeze([
  { min:0, key:'steady', label:'평정', penalty:0, description:'상황을 또렷하게 보고 있습니다.' },
  { min:3, key:'uneasy', label:'불안', penalty:1, description:'불안이 감각을 흐리지만, 행동을 멈추지는 않습니다.' },
  { min:5, key:'fractured', label:'균열', penalty:2, description:'감각이 흔들립니다. 동료와 숨을 고르거나 과감한 판정을 할 수 있습니다.' },
]);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Math.trunc(Number(v)):min));
export const clampStress=value=>clamp(value,0,MAX_STRESS);
export function stressBand(value) {
  const stress=clampStress(value);
  return { ...STRESS_BANDS.reduce((a,b)=>stress>=b.min?b:a,STRESS_BANDS[0]), stress, max:MAX_STRESS };
}
export function stressCheckPenalty(stress, stat) {
  return ['지혜','매력'].includes(String(stat)) && stressBand(stress).penalty ? -stressBand(stress).penalty : 0;
}
export function resolveStress(current, grade, mode='normal', bondedAssist=false) {
  const before=clampStress(current);
  const rawGradeDelta={critical:-1,success:0,mixed:1,setback:1,disaster:2}[grade] ?? 0;
  const gradeDelta=bondedAssist && rawGradeDelta>0 ? Math.max(0,rawGradeDelta-1) : rawGradeDelta;
  const cost=mode==='desperate'?1:0;
  const after=clampStress(before+gradeDelta+cost);
  const from=stressBand(before), to=stressBand(after);
  const milestone=from.key===to.key?'':to.key;
  return {before,after,delta:after-before,gradeDelta,cost,milestone,band:to};
}
export function bondKey(a,b){return [String(a),String(b)].sort().join('~');}
export function growBond(bonds={},a,b){
  if(!a || !b || a===b) return {key:'',level:0,changed:false};
  const key=bondKey(a,b), previous=clamp(bonds[key]||0,0,3), level=Math.min(3,previous+1);
  bonds[key]=level;
  return {key,level,changed:level>previous};
}
const WORLD_DRAMA = Object.freeze({
  ember:{label:'잿빛 왕좌', calm:['성벽 너머의 재가 바람과 다른 방향으로 흩어진다.','불씨는 사라지지 않았다. 누군가 이 성의 약속을 지키고 있다.'], uneasy:['왕좌 앞의 그림자가 한 박자 늦게 움직인다. 그저 긴장 탓일까.','낡은 성가가 벽돌 안쪽에서 울리는 듯하다. 누가 부르는지는 보이지 않는다.'], fractured:['횃불이 흔들릴 때마다 자신이 왕좌에 앉아 있는 장면이 잠깐 겹친다. 그것은 기억이 아니다.','녹은 왕관의 무게가 손목에 느껴진다. 실제로 쥔 것은 아무것도 없다.']},
  neon:{label:'네온의 감시', calm:['젖은 보도에 데이터 광고가 겹친다. 화면보다 사람이 더 많은 것을 알고 있을지 모른다.','통신 지연이 도시 전체를 작은 숨처럼 흔든다.'], uneasy:['꺼진 전광판에서 자신의 이름이 보인 것만 같다. 확인할수록 화면은 평범하다.','군중 속 시선과 감시 카메라의 렌즈가 잠깐 구별되지 않는다.'], fractured:['사람의 입술이 움직이기 전에 자막이 떠오르는 착각이 든다.','익숙한 목소리가 귀의 왼쪽에서 명령한다. 이어폰은 연결돼 있지 않다.']},
  abyss:{label:'심해의 압력', calm:['두꺼운 관측창 밖으로 미세한 빛이 지나간다. 수압계는 아직 정상이다.','격벽 안쪽 기계음이 오래된 심장 박동처럼 일정하다.'], uneasy:['관측창을 바라보지 않아도 바깥에서 무언가 자신을 보는 기분이 든다.','통로 아래에서 물소리가 들린다. 젖은 흔적은 없다.'], fractured:['잠깐, 자신의 목소리가 물속에서 들린 것 같다. 이어지는 말은 알아들을 수 없다.','잠수복 안에서 바다가 차오르는 기분이다. 계기는 여전히 건조함을 가리킨다.']},
  clock:{label:'열세 번째 종', calm:['종소리의 여운이 거리의 돌바닥에 천천히 스민다.','시계 바늘이 한 번 멈춘 것 같지만 다음 박자는 정확하다.'], uneasy:['뒤돌아보면 누군가 같은 걸음을 반복하고 있는 느낌이 든다.','주머니 속에서 아직 오지 않은 시간이 울리는 듯하다.'], fractured:['대답을 하기 전에 자신이 같은 대답을 했던 기억이 스친다. 기억은 증거가 아니다.','종이 울리지 않았는데도 모두가 귀를 막는 장면이 눈앞에 겹친다.']},
  wild:{label:'별을 먹은 숲', calm:['잎 사이에서 작은 별빛이 흘러나왔다가 사라진다.','흙의 냄새가 바뀌었다. 숲은 어제와 같은 길을 다른 얼굴로 내보인다.'], uneasy:['나뭇가지 그림자가 자신의 손짓을 따라오는 듯하다.','사슴 발자국 옆에서 사람의 발걸음이 느껴지지만 땅에는 자국이 없다.'], fractured:['눈을 감자 별들이 나무뿌리 안에서 뛰는 모습이 떠오른다. 눈을 뜨면 숲은 그대로다.','숲이 자신의 이름을 부른 것 같다. 옆 사람은 바람 소리만 들었다고 한다.']},
  guardian:{label:'수호자의 약속', calm:['성벽의 깃발은 아직 내려오지 않았다. 누군가는 귀환을 기다린다.','무너진 길에서도 오래된 동맹의 표식이 보인다.'], uneasy:['구하지 못한 사람의 목소리가 길모퉁이에서 들린 듯하다.','낯익은 검의 무게가 손에 남는다. 실제 칼은 허리춤에 있다.'], fractured:['지나온 동료들이 모두 이 길 끝에 있는 착각이 든다. 한 번 더 이름을 확인해야 한다.','망가진 시간의 그림자가 자신을 먼저 지나쳐 간다.']},
  echo:{label:'0번 승강장의 기억', calm:['전광판에는 막차 종료가 떠 있지만, 역 안에는 아직 사람이 남아 있다.','방송이 끊긴 뒤에도 플랫폼에는 짧은 잔향이 남는다.'], uneasy:['개찰구 너머에서 자신의 발자국 소리를 한 번 더 듣는다.','열차가 들어온 적 없는데 바람은 승강장에서 불어온다.'], fractured:['전광판에 자신의 실루엣이 떠 있는 착각이 든다. 다음 순간 화면은 비어 있다.','거울 같은 열차 창에 자신보다 한 박자 늦게 움직이는 모습이 비친 듯하다.']},
  aurora:{label:'빙하의 오래된 신호', calm:['붉은 극광의 가장자리가 관측돔을 느리게 스친다.','빙하 밑에서 오래된 전파의 간섭음이 들린다.'], uneasy:['헤드셋에 자신과 똑같은 호흡이 섞인다. 음성 파일에는 잡음뿐이다.','흰 눈 위에 다른 계절의 발자국이 겹쳐 보인다.'], fractured:['얼음 속 얼굴이 자신을 알아본 듯하다. 망원경을 다시 맞추면 금이 간 표면뿐이다.','통신 기록에서 자신의 목소리를 듣는 듯하다. 녹음 시간은 한참 이전이다.']},
  masque:{label:'월식의 가면', calm:['가면의 리본이 바람 없는 골목에서 천천히 흔들린다.','무대 뒤편에서 누군가 대본 한 장을 뒤집는다.'], uneasy:['관객의 박수 소리가 문 뒤에서 잠깐 들려온다.','거울에 비친 입모양이 아까 읽은 대사와 겹치는 느낌이 든다.'], fractured:['입을 열기 전에 누군가 자신의 대사를 대신 말한 것 같다.','가면을 벗었는데도 얼굴에 끈의 압박감이 남아 있다.']},
});
const PHASE_QUESTIONS={
  도입:'이곳에서 정상적이지 않은 단 하나는 무엇인가요?',
  탐색:'눈앞의 단서를 누구와 공유하고, 무엇을 숨길 건가요?',
  대면:'상대가 원하는 것과 당신이 지키려는 것은 어디서 충돌하나요?',
  진실:'방금 알아낸 사실 때문에 바꾸어야 할 판단이 있나요?',
  위기:'위험을 감수해서라도 먼저 구할 대상이 있나요?',
  결단:'이 선택의 결과를 누구에게 설명해야 할까요?',
};
function stablePick(items, id) {
  let x=0;for(const c of String(id||''))x=((x*31)+c.charCodeAt(0))>>>0;
  return items[x%items.length];
}
export function sceneDirection({campaignId,sceneId,phase,stress=0,threat=0,actorName='',jobName='',nearby=0,objective=''}) {
  const world=WORLD_DRAMA[campaignId]||WORLD_DRAMA.guardian;
  const band=stressBand(stress);
  const level=band.key==='steady'?'calm':band.key==='uneasy'?'uneasy':'fractured';
  const detail=stablePick(world[level],sceneId);
  const group=Number(nearby)>0?`${nearby}명의 동료가 같은 장소에 있습니다. 서로 다른 결론을 내리기 전에 짧게 의견을 나눠 보세요.`:'혼자 발견한 사실이더라도 나중에 동료에게 전할 수 있습니다.';
  const prompt=PHASE_QUESTIONS[phase]||'당신은 무엇을 시도할 건가요?';
  return {
    world:world.label, mood:band.key, moodLabel:band.label, stress:band.stress,
    atmosphericLine:detail, spotlight:`${jobName||'모험가'} ${actorName||'당신'}에게: ${prompt}`,
    partyPrompt:group, danger:clamp(threat,0,99)>=5?'세계의 위협이 커졌습니다. 시간을 들이는 행동에도 대가가 따를 수 있습니다.':'',
    art:band.stress>=3 && ['echo','ember','neon','abyss','wild','clock'].includes(campaignId)?`/art/director/${campaignId}.webp`:null,
    objective:String(objective||'').slice(0,150)
  };
}
export function stressStoryBeat(campaignId, change) {
  if(!change || !change.milestone) return '';
  const world=WORLD_DRAMA[campaignId]||WORLD_DRAMA.guardian;
  if(change.milestone==='fractured') return `${world.label}의 한가운데서 현실감이 흔들렸다. 보이는 것이 사실인지 다음 행동으로 확인해야 한다. 동료의 도움이나 잠깐의 숨 고르기가 필요할지 모른다.`;
  if(change.milestone==='uneasy') return `작은 불안이 쌓였다. ${world.label}의 풍경이 조금 다르게 느껴진다. 아직 판단을 되돌릴 여지는 충분하다.`;
  return '숨이 고르게 돌아온다. 단서와 실제로 본 것들을 다시 구분할 수 있다.';
}
