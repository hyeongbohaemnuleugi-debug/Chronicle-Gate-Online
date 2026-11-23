/** Reading-only name emphasis. Story data, saves and TXT remain plain text. */
const cast = entries => Object.freeze(entries.map(([name,role,aliases=[]])=>Object.freeze({name,role,aliases:Object.freeze(aliases)})));

export const CHARACTERS = Object.freeze({
  'last-train':cast([
    ['윤','차장'],['백','철도 정비원'],
  ]),
  'glass-hotel':cast([
    ['민','짐을 나르는 직원'],['우','호텔 지배인'],['소라','청소 직원'],
    ['조','세탁 담당 직원'],['리','연회장 피아노 연주자'],['해린','시계공'],
  ]),
  'moon-market':cast([
    ['단','찻집 주인'],['한톨','기억 저울 상인'],['나비','기억 수선사'],
    ['담','나룻배를 모는 사람'],['일구','경매 진행자'],['솔','경매 서류 담당'],
  ]),
  'dragon-banquet':cast([
    ['아르단','용왕'],['오르','재상'],['도란','주방장'],['이리스','왕녀'],
    ['피프','주방 보조'],['모스','식재료 창고 담당'],['델','화덕 기술자'],
  ]),
  'clock-city':cast([
    ['윤','시계탑 관리기사'],['세란','전차 운전사'],['준우','배달부'],
    ['모라','기록관 사서'],['벨','인쇄공'],['서진','시간 금고의 설계자'],
    ['한 씨','골목 주민 · 편지의 수신인'],['오 씨','골목 주민 · 편지의 수신인'],['리안','골목 주민 · 편지의 수신인'],
  ]),
  'deep-sea':cast([
    ['누리','구조선 소금비의 선장 겸 구조대장'],['하람','해저 기지의 의사'],
    ['미연','기지 청소원'],['은재','기지 연수생'],['도윤','기지 간호사'],['백연','기지 소장'],
  ]),
  'snow-radio':cast([
    ['가람','수색대원'],['이안','작년 사고의 실종자'],['소미','대피소 관리 책임자'],
  ]),
});

const escapeHTML = value => String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const wordCharacter = /[\p{L}\p{M}\p{N}_]/u;
const wordTail = /^[\p{L}\p{M}\p{N}_]+/u;

// A complete Korean suffix is required. A mere first-letter match would turn
// 우리/주민/민원/조리/윤곽 into invented names. The suffix stays outside <strong>.
const particles = ['이','가','은','는','을','를','의','와','과','도','만','께','에게','한테',
  '에서','에게서','한테서','더러','로','으로','로서','으로서','로써','으로써',
  '부터','까지','처럼','보다','마다','마냥','조차','마저','밖에','랑','이랑','하고'];
const copulas = ['이다','다','입니다','이에요','예요','이었다','였다','이었습니다','였습니다',
  '이었던','였던','이었고','였고','이었지만','였지만','이고','이며','이지만',
  '인데','인','인지','인지는','인가','인가요','이냐','이라','이라고','라고',
  '이라는','라는','이란','란','이라면','라면','이라서','라서','이니까','니까',
  '이든','든','이야','야','아','이여','여','일','일까','일지','일지도'];
function suffixSet(endings,familiar=[]){
  const result=new Set(['']);
  for(const suffix of endings){
    result.add(suffix);
    for(const extra of ['도','만','은','는','부터','까지','조차','마저','만은','까지는','부터는'])result.add(suffix+extra);
  }
  // The familiar-name ending in 민이는/민이에게 stays outside the actual name.
  for(const particle of familiar){
    result.add('이'+particle);
    for(const extra of ['도','만','은','는'])result.add('이'+particle+extra);
  }
  return result;
}
const suffixes=suffixSet([...particles,...copulas],particles);
const finalOnly=new Set(['이','은','을','과','이랑']);
const vowelOnly=new Set(['가','는','를','와','랑']);
const shortenedCopulas=new Set(['다','예요','였다','였습니다','였던','였고','였지만','라고','라는','란','라면','라서','니까','든','야','여']);
function suffixesFor(name){
  const code=[...name].at(-1)?.codePointAt(0);
  if(code<0xac00||code>0xd7a3)return suffixes; // Latin spellings have no reliable Korean pronunciation.
  const final=(code-0xac00)%28,hasFinal=final!==0;
  const allowedParticles=particles.filter(p=>{
    if(['로','로서','로써'].includes(p))return !hasFinal||final===8;
    if(['으로','으로서','으로써'].includes(p))return hasFinal&&final!==8;
    return hasFinal?!vowelOnly.has(p):!finalOnly.has(p);
  });
  const allowedCopulas=copulas.filter(p=>hasFinal?!shortenedCopulas.has(p):p!=='아');
  return suffixSet([...allowedParticles,...allowedCopulas],hasFinal?particles.filter(p=>!finalOnly.has(p)&&!p.startsWith('으로')):[]);
}

const cache = new Map();
function isOrdinaryWord(name,text,start,end,tail){
  const before=text.slice(0,start),after=text.slice(end);
  if(name==='단'){
    if(/^(?:,|，)/u.test(after)&&/(?:^|[.!?。！？…“‘「«])\s*$/u.test(before))return true;
    if(/^\s+한(?:\s|$)/u.test(after)&&!before.trimEnd().endsWith('찻집 주인'))return true;
  }
  if(name==='백'&&/^\s/u.test(after)){
    const next=after.trimStart().match(wordTail)?.[0]||'';
    if(['년','달','개월','일','시간','분','초','명','개','원','번','장','대'].some(unit=>next.startsWith(unit)&&suffixes.has(next.slice(unit.length))))return true;
  }
  // In this story 담 is a person's name, while 거절을 담은 사본 is a verb
  // phrase. An immediately preceding object/location distinguishes that use
  // without suppressing the actual actor in 담은 노를 잡는다 / 담과 상인들.
  if(name==='담'&&['은','아','을','는'].includes(tail)&&/[\p{L}\p{N}]+(?:을|를|에)\s+$/u.test(before))return true;
  return false;
}
function matcher(campaignId,players){
  const playerNames=(Array.isArray(players)?players:[]).map(player=>typeof player==='string'?player:player?.name)
    .filter(name=>typeof name==='string'&&name.trim()&&name.length<=100);
  const key=JSON.stringify([campaignId,playerNames]);
  if(cache.has(key))return cache.get(key);
  const labels=new Map();
  for(const character of Object.hasOwn(CHARACTERS,campaignId)?CHARACTERS[campaignId]:[]){
    for(const name of [character.name,...character.aliases])labels.set(name,{role:character.role,player:false});
  }
  for(const name of playerNames){
    const previous=labels.get(name);
    // Identical NPC/player names are still bold, but a tooltip must not guess
    // which of the two people the current sentence means.
    labels.set(name,{role:previous&&!previous.player?'':previous?.role??'플레이어 인물',player:true});
  }
  for(const [name,label] of labels)label.suffixes=suffixesFor(name);
  const names=[...labels.keys()].sort((a,b)=>b.length-a.length||a.localeCompare(b));
  const result={labels,pattern:names.length?new RegExp(names.map(escapeRegExp).join('|'),'gu'):null};
  if(cache.size>=16)cache.delete(cache.keys().next().value);
  cache.set(key,result);return result;
}

/** Returns safe HTML for a text node only; never use in an HTML attribute. */
export function formatCharacters(value,campaignId,players=[]){
  const text=String(value??''),{labels,pattern}=matcher(campaignId,players);
  if(!pattern)return escapeHTML(text);
  let output='',cursor=0;
  for(const match of text.matchAll(pattern)){
    const start=match.index,end=start+match[0].length;
    if(start>0&&wordCharacter.test(text[start-1]))continue;
    const tail=text.slice(end).match(wordTail)?.[0]||'';
    const label=labels.get(match[0]);
    if(!label.suffixes.has(tail))continue;
    if(isOrdinaryWord(match[0],text,start,end,tail))continue;
    const role=label.role;
    output+=escapeHTML(text.slice(cursor,start))+`<strong class="character-name"${role?` title="${escapeHTML(role)}"`:''}>${escapeHTML(match[0])}</strong>`;
    cursor=end;
  }
  return output+escapeHTML(text.slice(cursor));
}
