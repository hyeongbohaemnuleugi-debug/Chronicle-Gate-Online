import { createAudio } from './audio.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => /^[a-z0-9-]+$/.test(String(value||'')) ? value : 'last-train';
const STAT = {might:'힘',agility:'민첩',wit:'통찰',heart:'교섭'};
const CLASS = [
  {id:'guardian',name:'수호자',icon:'◆',copy:'위험 앞에서 길을 엽니다.',best:'힘 +3',stats:{might:3,agility:1,wit:0,heart:1}},
  {id:'scout',name:'길잡이',icon:'↗',copy:'숨은 길과 기회를 찾습니다.',best:'민첩 +3',stats:{might:1,agility:3,wit:1,heart:0}},
  {id:'scholar',name:'분석가',icon:'✧',copy:'단서를 이어 진실에 닿습니다.',best:'통찰 +3',stats:{might:0,agility:1,wit:3,heart:1}},
  {id:'envoy',name:'중재자',icon:'❧',copy:'사람과 사람 사이를 잇습니다.',best:'교섭 +3',stats:{might:1,agility:0,wit:1,heart:3}},
];
const GRADE = {critical:'눈부신 성공',success:'성공',mixed:'대가 있는 성공',failure:'실패 · 사건의 전환',automatic:'판정 없이 진행',observe:'관찰',safe:'관찰',decision:'선택'};
let client=null, state=null, catalog=[], selected='last-train', busy=false, pending=null;
let activeTab='clues', secretOpen=false, toastTimer=null, lastScene='',lastResultKey='', lastPerson='';
let draft={text:'',spark:false,flashback:'',chat:''}, entryMode='online', entryKind='create', localCount=2;
const loadedArt=new Map(),artDimensions=new Map();
const artObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const entry of entries){const dimensions=artDimensions.get(entry.target.dataset.art);if(dimensions)sizeArt(entry.target,dimensions);}}):null;
const sound=createAudio(updateSoundButton);
const position = index => ['0% 0%','100% 0%','0% 100%','100% 100%'][Math.max(0,Math.min(3,Number(index)||0))];
const art = (id,index=0,classes='',label='장면 그림') => `<div class="art-frame ${classes}" data-art="${slug(id)}" data-art-index="${Number(index)||0}" style="--art-position:${position(index)}" role="img" aria-label="${esc(label)}"><span class="art-placeholder" aria-hidden="true">✦</span></div>`;
const cname = id => CLASS.find(c=>c.id===id)?.name || '모험가';
function healthMarkup(p){if(p.health==null)return '';const hp=Math.max(0,Math.min(p.maxHealth||3,Number(p.health)||0));return `<div class="life-meter ${p.life==='dead'?'life-dead':''}" aria-label="생명력 ${hp}/${p.maxHealth||3}${p.life==='dead'?' · 사망':''}">${Array.from({length:p.maxHealth||3},(_,i)=>`<i class="${i<hp?'filled':''}" aria-hidden="true">♥</i>`).join('')}<small>${p.life==='dead'?'사망 · 잔향':p.revivals?'귀환함':''}</small></div>`;}
const selectedCampaign = () => catalog.find(c=>c.id===selected)||catalog[0];
const game = () => state?.game;
function toast(message, kind='info'){
  if(!message)return;
  const region=$('toast-region');region.className=`toast-region ${kind}`;region.textContent=String(message);
  region.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>region.classList.remove('visible'),6000);
}
function setBusy(value){
  busy=value;document.body.classList.toggle('is-busy',value);
  for(const el of document.querySelectorAll('[data-busy-guard]')){
    if(value){el.dataset.wasDisabled=String(el.disabled);el.disabled=true;}
    else if(el.dataset.wasDisabled!==undefined){el.disabled=el.dataset.wasDisabled==='true';delete el.dataset.wasDisabled;}
  }
}
async function call(method,...args){
  if(!client){toast('게임을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.');return null;}
  try{
    const result=await client[method](...args);
    if(result?.ok===false)throw new Error(result.error||'요청을 처리하지 못했습니다.');
    return result??{ok:true};
  }catch(error){toast(error?.message||'연결 상태를 확인한 뒤 다시 시도해 주세요.','error');return null;}
}
async function guarded(fn){if(busy)return;setBusy(true);try{return await fn();}catch(e){toast(e.message||'처리 중 문제가 생겼어요.','error');}finally{setBusy(false);}}
function openDialog(id,html){const el=$(id);el.innerHTML=html;if(!el.open)el.showModal();return el;}
function closeDialog(id){const el=$(id);if(el.open)el.close();if(id==='preview-dialog')pending=null;}
const closeButton = id => `<button class="dialog-close" data-close="${id}" aria-label="닫기" type="button">×</button>`;
function sizeArt(el,dimensions){
  const box=el.getBoundingClientRect();if(!box.width||!box.height)return;
  const ratio=dimensions.width/dimensions.height;
  const tileWidth=Math.max(box.width,box.height*ratio),tileHeight=tileWidth/ratio;
  const index=Math.max(0,Math.min(3,Number(el.dataset.artIndex)||0));
  el.style.backgroundSize=`${tileWidth*2}px ${tileHeight*2}px`;
  el.style.backgroundPosition=`${(box.width-tileWidth)/2-(index%2)*tileWidth}px ${(box.height-tileHeight)/2-Math.floor(index/2)*tileHeight}px`;
}
function applyArt(el,id){
  el.style.backgroundImage=`url("/game/art/${id}.webp")`;el.classList.add('art-ready');
  const dimensions=artDimensions.get(id);if(dimensions)sizeArt(el,dimensions);
}
function hydrateArt(){
  artObserver?.disconnect();
  for(const el of document.querySelectorAll('[data-art]')){
    artObserver?.observe(el);
    const id=slug(el.dataset.art);
    if(loadedArt.get(id)===true){applyArt(el,id);continue;}
    if(loadedArt.has(id))continue;
    loadedArt.set(id,'loading');const image=new Image();
    image.onload=()=>{loadedArt.set(id,true);artDimensions.set(id,{width:image.naturalWidth,height:image.naturalHeight});for(const target of document.querySelectorAll(`[data-art="${id}"]`))applyArt(target,id);};
    image.onerror=()=>{loadedArt.set(id,false);for(const target of document.querySelectorAll(`[data-art="${id}"]`)){target.classList.add('art-unavailable');target.setAttribute('aria-label','장면 그림을 불러오지 못했습니다. 아래 이야기로 계속 진행할 수 있습니다.');}};
    image.src=`/game/art/${id}.webp`;
  }
}
function renderHome(){
  const feature=selectedCampaign();if(!feature)return;
  $('home-content').innerHTML=`
    <section class="hero" aria-labelledby="home-title">
      ${art(feature.id,0,'hero-art',feature.title+'의 시작 장면')}
      <div class="hero-shade"></div><div class="hero-content">
        <div class="eyebrow"><span class="tiny-star">✦</span> 친구들과 함께 쓰는 일곱 편의 이야기</div>
        <h1 id="home-title">다음 장면은,<br><em>우리의 선택으로.</em></h1>
        <p>뜻밖의 한마디, 아슬아슬한 주사위, 나만 아는 비밀.<br class="desktop-only"> 정답을 찾기보다, 함께 기억할 이야기를 만들어 보세요.</p>
        <div class="hero-actions"><button class="button primary" data-action="create" type="button">새 이야기 시작 <span aria-hidden="true">↗</span></button><button class="button glass" data-action="join" type="button">친구의 방에 참가</button></div>
        <div class="hero-meta"><span>1–4명</span><i></i><span>온라인 · 한 기기로 함께</span><i></i><span>진행자 없이 플레이</span></div>
      </div>
      <div class="hero-caption"><span>지금 펼쳐진 세계</span><b>${esc(feature.title)}</b></div>
    </section>
    <div class="library-heading"><div><div class="eyebrow">THE STORY SHELF</div><h2>오늘, 어떤 이야기에 들어갈까요?</h2><p>서로 다른 사건과 선택. 한 가지 정답으로 끝나지 않는 일곱 세계.</p></div><div class="text-actions"><button class="text-button" data-action="resume" type="button">이어 하기 ↗</button><button class="text-button" data-action="import" type="button">저장 파일 열기</button></div></div>
    <section class="campaign-grid" aria-label="시나리오 목록">${catalog.map((c,i)=>`
      <button class="campaign-card ${c.id===selected?'selected':''}" data-campaign="${slug(c.id)}" type="button" aria-pressed="${c.id===selected}">
        <div class="cover-wrap">${art(c.id,0,'campaign-art',c.title+' 표지')}<span class="cover-number">${String(i+1).padStart(2,'0')}</span><span class="cover-arrow" aria-hidden="true">↗</span>${c.id===selected?'<span class="selected-chip">선택한 이야기</span>':''}</div>
        <div class="card-copy"><div class="card-genre">${esc(c.genre||'협력 이야기')}</div><h3>${esc(c.title)}</h3><p>${esc(c.description||c.subtitle||'동료들과 함께 새로운 사건에 뛰어드세요.')}</p><div class="card-bottom"><span>1–4명</span><span>자기 속도로 진행</span></div></div>
      </button>`).join('')}</section>
    <section class="table-note"><span class="note-icon" aria-hidden="true">✧</span><div><h2>당신의 엉뚱한 생각도, 이야기의 시작.</h2><p>선택지를 고르거나 행동을 직접 적으세요. 현재 장면의 대상과 행동을 해석한 뒤, 어떤 판정을 할지 먼저 알려드립니다. 친구의 협력과 회상이 결과를 바꿀 수 있어요.</p></div><button class="button quiet" data-action="help" type="button">3분 플레이 안내</button></section>`;
  hydrateArt();sound.scene(feature.id,'mystery');
}
function showView(view){
  for(const name of ['home','lobby','game'])$(name+'-view').hidden=name!==view;
  $('site-footer').hidden=view==='game';document.body.dataset.view=view;
}
function renderState(next){
  const old=state;state=next;
  if(next?.catalog?.length)catalog=next.catalog;
  if(next?.campaignId)selected=next.campaignId;
  const person=next?.meId||'';
  if(person!==lastPerson){secretOpen=false;lastPerson=person;draft={text:'',spark:false,flashback:'',chat:''};}
  const connection=$('connection');
  connection.innerHTML=!next?.code?'':`<i class="status-dot ${next.connected===false?'offline':''}"></i>${next.mode==='local'?'한 기기로 함께':next.connected===false?'재연결 중':'온라인'}`;
  if(!next?.code&&!next?.game){showView('home');renderHome();return;}
  if(!next.game){showView('lobby');renderLobby();return;}
  showView('game');
  const sceneKey=next.game.campaignId+':'+next.game.scene.id;
  const changed=sceneKey!==lastScene;
  if(changed){draft.text='';draft.spark=false;draft.flashback='';secretOpen=false;}
  if(pending&&next.game.revision!==pending.revision&&!pending.committing){closeDialog('preview-dialog');toast('탁자의 상태가 바뀌었습니다. 행동을 다시 선택하면 최신 판정을 확인할 수 있어요.');}
  renderGame(changed);lastScene=sceneKey;
  sound.scene(next.game.campaignId,next.game.scene.mood);
  const result=next.game.lastResult;
  const key=result?`${next.game.revision}:${result.action}:${result.text}`:'';
  // Only sound a new outcome, never a reconnect or a teammate's unchanged state.
  if(result&&old?.game&&JSON.stringify(old.game.lastResult)!==JSON.stringify(result)&&key!==lastResultKey){
    const grade=result.grade;
    sound.effect(['success','critical'].includes(grade)?'success':grade==='mixed'?'mixed':grade==='failure'?'failure':'transition');
  }
  lastResultKey=key;
}
function classOptions(value){return CLASS.map(c=>`<option value="${c.id}" ${c.id===value?'selected':''}>${c.name} · ${c.best}</option>`).join('');}
function renderLobby(){
  const campaign=selectedCampaign(), host=state.meId===state.hostId||state.mode==='local';
  const players=state.players||[];
  $('lobby-view').innerHTML=`
    <div class="page-top"><button class="text-button" data-action="leave" type="button">← 이야기 책장</button><span class="eyebrow">BEFORE THE FIRST PAGE</span></div>
    <div class="lobby-heading"><div><h1>동료들이 모이는 자리</h1><p>${state.mode==='local'?'한 화면을 번갈아 보며 이야기를 이어가세요.':'방 코드를 친구에게 알려 주세요. 모두 모이면 시작할 수 있어요.'}</p></div><div class="room-code"><small>${state.mode==='local'?'PLAY TOGETHER':'초대 코드'}</small><b>${state.mode==='local'?'LOCAL':esc(state.code)}</b>${state.mode!=='local'?'<button class="text-button" data-action="copy-code" type="button">코드 복사</button>':''}</div></div>
    <div class="lobby-layout"><section class="lobby-story panel">
      ${art(campaign?.id||selected,0,'lobby-art',campaign?.title||'시나리오 그림')}
      <div class="lobby-story-copy"><div class="eyebrow">선택한 이야기</div><h2>${esc(campaign?.title)}</h2><p>${esc(campaign?.description||campaign?.subtitle)}</p><div class="tag-row">${(campaign?.contentNotes||[]).map(n=>`<span>${esc(n)}</span>`).join('')}</div>
      ${host?`<label class="field"><span>다른 이야기 선택</span><select id="lobby-campaign">${catalog.map(c=>`<option value="${slug(c.id)}" ${c.id===selected?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>`:''}
      <div class="lobby-objective"><span>이번 이야기의 첫 목표</span><p>${esc(campaign?.objective||'첫 장면에서 동료들과 함께 목표를 확인하세요.')}</p></div></div>
    </section><section class="lobby-people panel"><div class="panel-heading"><h2>우리의 일행</h2><span>${players.length} / 4</span></div>
      <div class="party-list">${players.map((p,i)=>`<div class="lobby-person"><div class="avatar color-${i}">${esc(CLASS.find(c=>c.id===p.classId)?.icon||'◆')}</div><div class="person-copy"><b>${esc(p.name)} ${p.id===state.meId?'<small>나</small>':''}</b><span>${cname(p.classId)}${p.id===state.hostId?' · 방장':''}</span></div><span class="connection-small">${p.connected===false?'연결 대기':'준비됨'}</span></div>`).join('')}${Array.from({length:Math.max(0,4-players.length)},()=>`<div class="empty-seat"><span>+</span><p>${state.mode==='local'?'빈 자리':'동료를 기다리는 자리'}</p></div>`).join('')}</div>
      ${state.mode!=='local'?`<label class="field"><span>내 직업</span><select id="lobby-class">${classOptions(players.find(p=>p.id===state.meId)?.classId||'guardian')}</select></label>`:''}
      <div class="quiet-note"><b>능력치는 직업에 따라 고정됩니다.</b><p>주사위는 행동의 결과를 정할 때만 굴립니다. 직업이 겹쳐도 함께 플레이할 수 있어요.</p></div>
      ${host?`<button class="button primary full" data-action="start" data-busy-guard type="button" ${state.canStart===false?'disabled':''}>첫 장면 펼치기 <span>↗</span></button>`:'<div class="waiting-note"><span class="pulse-dot"></span>방장이 이야기를 시작하기를 기다리고 있어요.</div>'}
      <p class="small muted">1명으로도 시작할 수 있어요. 온라인에서는 시작 전에 참가해 주세요.</p>
    </section></div>`;
  hydrateArt();sound.scene(campaign?.id||selected,'calm');
}
function renderGame(newScene=false){
  const g=game(),s=g.scene,players=g.players||state.players||[],active=players.find(p=>p.id===g.activePlayerId),me=players.find(p=>p.id===state.meId);
  if(!g.sparks)draft.spark=false;if(me?.focus===false)draft.flashback='';
  const focused=document.activeElement,focusId=focused?.id,selection=focused?.selectionStart;
  const notebookScroll=$('notebook-body')?.scrollTop||0;
  const hasEnded=g.phase==='ended'||s.ending;
  const pressure=g.pressure||{value:0,max:8,label:'긴장'};
  $('game-view').innerHTML=`
    <div class="session-bar"><div class="session-title"><span class="tiny-star" aria-hidden="true">✦</span><div><small>${esc(g.title)}</small><span>${state.mode==='local'?'함께 앉은 탁자':`ROOM ${esc(state.code)}`}</span></div></div><div class="session-actions"><button class="text-button" data-action="export" type="button" ${state.mode!=='local'&&state.hostId!==state.meId?'disabled title="방장이 저장 파일을 내보낼 수 있습니다."':''}>저장 파일</button><button class="text-button" data-action="leave" type="button">나가기</button></div></div>
    ${state.connected===false&&state.mode!=='local'?'<div class="reconnect-banner" role="status">서버에 다시 연결하는 중입니다. 연결되면 같은 자리에서 이어갑니다. 새로고침 전에 잠시 기다려 주세요.</div>':''}
    <div class="table-layout"><article class="story-column" id="story-column">
      <div class="scene-visual">${art(g.campaignId,s.art,'scene-art',`${s.location||s.title} · ${s.title}`)}<div class="scene-visual-shade"></div><div class="scene-location"><span class="eyebrow">${hasEnded?'EPILOGUE':`CHAPTER ${String(s.chapter||1).padStart(2,'0')}`}</span><span>${esc(s.location||'이야기의 한 장면')}</span></div></div>
      <div class="story-paper">
        <div class="scene-heading"><div class="eyebrow">${hasEnded?'우리의 이야기가 남긴 것':'지금, 이 장면'}</div><h1 id="scene-title" tabindex="-1">${esc(s.title)}</h1></div>
        ${g.lastResult?renderResult(g.lastResult):''}${me?.life==='dead'&&!hasEnded?'<div class="death-notice"><b>이 인물은 사망했습니다.</b><p>살아 있는 동료가 행동을 이어갑니다. 비밀을 나누거나 한 번의 잔향으로 도울 수 있고, 이야기에 부활 지점이 나타나면 귀환을 시도할 수 있어요.</p></div>':''}
        <div class="scene-prose">${(Array.isArray(s.text)?s.text:[s.text]).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('')}</div>
        ${s.dialogue?.text?`<blockquote class="dialogue"><span class="quote-mark" aria-hidden="true">“</span><p>${esc(s.dialogue.text)}</p><cite>${esc(s.dialogue.who||'누군가')}</cite></blockquote>`:''}
        ${hasEnded?renderEnding(g):`
          <div class="scene-objective"><span>눈앞의 문제</span><p>${esc(s.objective||'주변을 살피고 다음 행동을 정하세요.')}</p></div>
          ${(s.details||[]).length?`<div class="examine-row"><span>잠깐 살펴보기</span><div>${s.details.map(d=>`<button class="examine-button" data-detail="${esc(d.id)}" type="button" >⌕ ${esc(d.label)}${d.read?' ✓':''}</button>`).join('')}</div><small>관찰에는 주사위를 굴리지 않습니다.</small></div>`:''}
          ${renderResurrection(g,players)}<section class="action-section" aria-labelledby="action-heading"><div class="action-heading"><div><span class="eyebrow">YOUR NEXT MOVE</span><h2 id="action-heading">이제, 어떻게 할까요?</h2></div><span class="turn-pill ${g.canAct?'my-turn':''}">${g.canAct?'당신의 차례':esc(active?.name||'동료')+'의 차례'}</span></div>
          <div class="choices">${(s.choices||[]).map((c,i)=>`<button class="choice" data-choice="${esc(c.id)}" type="button" ${!g.canAct||state.connected===false?'disabled':''}><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span class="choice-body"><b>${esc(c.label)}</b><small>${c.automatic?'선택으로 결정 · 주사위 없음':`${esc(STAT[c.stat]||c.stat||'행동')} 판정${Number.isFinite(c.dc)?` · 목표 ${c.dc}`:''}`}${c.harmRisk?` <span class="choice-harm">· ♥ 최대 -${c.harmRisk}</span>`:''}</small></span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
          <div class="action-divider"><span>또는, 당신만의 방법으로</span></div>
          <form id="action-form"><label class="sr-only" for="free-action">직접 할 행동</label><textarea id="free-action" name="text" rows="2" maxlength="240" placeholder="예: ${esc(actionExample(s))}" ${!g.canAct?'disabled':''}>${esc(draft.text)}</textarea><div class="free-action-footer"><span>대상과 방법을 구체적으로 적어 주세요.</span><button class="button primary small" data-busy-guard type="submit" ${!g.canAct||state.connected===false?'disabled':''}>행동 확인 <span>↗</span></button></div></form>
          <details class="tactics" ${draft.spark||draft.flashback?'open':''}><summary>협력과 회상으로 판정에 힘을 더하기 <span>+</span></summary><div class="tactics-content"><label class="spark-option"><input id="spend-spark" type="checkbox" ${draft.spark?'checked':''} ${!g.canAct||!g.sparks?'disabled':''}><span><b>운명 조각 사용 · +3</b><small>파티 공용 ${g.sparks??0}개 남음. 다음 위험한 행동에 사용합니다.</small></span></label><label class="field"><span>미리 해 두었던 준비를 회상하기 · +2</span><input id="flashback" maxlength="160" value="${esc(draft.flashback)}" placeholder="예: 출발 전에 비상문 여는 법을 읽어 두었다" ${!g.canAct||me?.focus===false?'disabled':''}><small>인물마다 한 번. 이번 행동에 도움이 되는 준비를 8자 이상 적어 주세요.</small></label></div></details>
          ${!g.canAct?`<div class="waiting-actions"><p>${esc(active?.name||'동료')}의 이야기를 듣고, 다음 행동에 힘을 보태 주세요.</p><button class="button quiet" data-action="assist" data-busy-guard type="button" ${!g.canAssist?'disabled':''}>${me?.assisting?'협력하는 중 ✓':me?.life==='dead'?'잔향으로 돕기 · 한 번만':'동료 돕기 · +1'}</button>${state.meId===state.hostId&&active?.connected===false?'<button class="button quiet" data-action="pass" type="button">연결 끊긴 동료 차례 넘기기</button>':''}</div>`:`<div class="pass-row"><button class="text-button" data-action="pass" type="button">다음 동료에게 차례 넘기기 →</button></div>`}
          </section>`}
      </div>
    </article><aside class="table-sidebar" aria-label="일행과 기록">
      <section class="party-panel panel"><div class="panel-heading"><h2>탁자에 앉은 사람들</h2><span>${players.length} / 4</span></div><div class="compact-party">${players.map((p,i)=>`<div class="party-member ${p.id===g.activePlayerId?'active':''} ${p.life==='dead'?'fallen':''}"><div class="avatar color-${i}">${esc(CLASS.find(c=>c.id===p.classId)?.icon||'◆')}</div><div><b>${esc(p.name)}${p.id===state.meId?'<small>나</small>':''}</b><span>${esc(p.className||cname(p.classId))}${p.assisting?' · 협력 +1':''}${p.connected===false?' · 자리 비움':''}</span>${healthMarkup(p)}</div>${p.id===g.activePlayerId?'<span class="active-star" title="현재 차례">✦</span>':''}${state.mode==='local'&&p.id!==state.meId?`<button class="seat-button" data-seat="${esc(p.id)}" type="button" title="${esc(p.name)}의 비밀 카드 확인">카드</button>`:''}</div>`).join('')}</div>
      <div class="pressure-block"><div><span>${esc(pressure.label)}</span><b>${pressure.value} <small>/ ${pressure.max}</small></b></div><div class="pressure-track" role="meter" aria-label="${esc(pressure.label)}" aria-valuemin="0" aria-valuemax="${pressure.max}" aria-valuenow="${pressure.value}">${Array.from({length:pressure.max||8},(_,i)=>`<i class="${i<pressure.value?'filled':''}"></i>`).join('')}</div><p>위기가 가득 차면 이후 판정의 목표가 +1 높아집니다.</p></div>
      <button class="secret-button" data-action="secret" type="button"><span>✉</span><div><b>나만의 비밀 카드</b><small>공유할 순간은 당신이 정해요</small></div><span>↗</span></button>
      </section>
      <section class="notebook panel"><div class="notebook-tabs" role="tablist" aria-label="탁자 기록"><button id="tab-clues" data-tab="clues" role="tab" aria-selected="${activeTab==='clues'}" aria-controls="notebook-body" type="button">단서 <small>${(g.clues||[]).length}</small></button><button id="tab-journal" data-tab="journal" role="tab" aria-selected="${activeTab==='journal'}" aria-controls="notebook-body" type="button">기록</button><button id="tab-chat" data-tab="chat" role="tab" aria-selected="${activeTab==='chat'}" aria-controls="notebook-body" type="button">대화</button></div><div id="notebook-body" class="notebook-body" role="tabpanel" aria-labelledby="tab-${activeTab}">${renderNotebook()}</div></section>
      <div class="table-caption"><span>✧</span><p>놀라운 이야기는<br>동료의 한마디에서 시작되기도 해요.</p></div>
    </aside></div>`;
  hydrateArt();
  if(!newScene&&focusId){const input=$(focusId);if(input){input.focus({preventScroll:true});if(typeof selection==='number'&&input.setSelectionRange){try{input.setSelectionRange(selection,selection);}catch{}}}}
  if($('notebook-body'))$('notebook-body').scrollTop=notebookScroll;
  if(newScene)window.scrollTo({top:0,behavior:'instant'});
}
function renderResurrection(g,players){
  const site=g.scene?.resurrection;if(!site||site.available===false)return '';
  const fallen=players.filter(p=>p.life==='dead'&&(p.revivals||0)<1&&(!Array.isArray(site.eligibleIds)||site.eligibleIds.includes(p.id)));
  if(!fallen.length)return '';
  return `<section class="resurrection-site"><span class="resurrection-mark" aria-hidden="true">✧</span><div><div class="eyebrow">A WAY BACK</div><h3>${esc(site.label||'희미한 귀환의 길')}</h3><p>${esc(site.text||'살아 있는 동료가 사망한 인물의 귀환을 시도할 수 있습니다.')}</p><small>목표 ${site.dc||12} · 운명 조각 ${site.sparkCost??1}개 · 위기 +${site.pressureCost??2} · 한 인물당 한 번의 귀환</small><div class="resurrection-actions">${fallen.map(p=>`<button class="button quiet small" data-revive="${esc(p.id)}" type="button" ${!g.canAct||state.connected===false?'disabled':''}>${esc(p.name)} 되살리기 ↗</button>`).join('')}</div></div></section>`;
}
function renderHarmRisk(plan){
  const risk=plan.harmRisk;if(!risk)return '';
  if(typeof risk==='string')return `<p class="harm-risk">♥ ${esc(risk)}</p>`;
  if(typeof risk==='number')return `<p class="harm-risk">♥ 생명력 손실 최대 ${risk}${plan.groupHarm?` · 일행 전체 최대 ${plan.groupHarm}`:''}. 생명력이 0이 되면 사망합니다.</p>`;
  const actor=risk.actor??risk.self??0,group=risk.group??risk.party??0;
  if(!actor&&!group)return '';
  return `<p class="harm-risk">♥ 생명력 위험: ${actor?`행동한 인물 -${actor}`:''}${actor&&group?' · ':''}${group?`동료 전체 -${group}`:''}. 생명력이 0이 되면 사망합니다.</p>`;
}
function actionExample(s){const person=(s.entities||[]).find(e=>e.kind==='person');const object=(s.entities||[]).find(e=>e.kind==='object');return person?`${person.label}에게 무슨 일이 있었는지 조심스럽게 묻는다`:object?`${object.label}에 이상한 흔적이 있는지 조사한다`:'주변에서 이동할 수 있는 길을 찾아본다';}
function renderResult(r){
  const hasRoll=Number.isFinite(r.roll), grade=GRADE[r.grade]||'행동의 결과';
  return `<section class="last-result grade-${esc(r.grade||'automatic')}" aria-label="직전 행동의 결과"><div class="result-top"><span>${esc(grade)}</span>${hasRoll?`<span class="result-dice"><b>${r.roll}</b><small>+ ${(r.bonus??(Number(r.total)-Number(r.roll)))||0} = <strong>${r.total}</strong> / 목표 ${r.dc}</small></span>`:'<small>이전 선택이 남긴 변화</small>'}</div><p>${esc(r.text)}</p>${r.actor?`<small class="result-actor">${esc(r.actor)} · ${esc(r.action||'')}</small>`:''}</section>`;
}
function renderEnding(g){
  const s=g.scene;
  return `<section class="ending-card"><span class="ending-star" aria-hidden="true">✦</span><div class="eyebrow">THE END · OUR VERSION</div><h2>이 결말은, 우리가 만든 이야기.</h2><p>${esc(s.question||'가장 오래 기억할 선택은 무엇이었나요? 서로의 이야기를 들어보세요.')}</p><div class="ending-stats"><span><b>${g.visitedCount||1}</b> 지나온 장면</span><span><b>${(g.clues||[]).length}</b> 모은 단서</span><span><b>${(g.players||[]).length}</b> 함께한 사람</span></div><div class="ending-actions"><button class="button primary" data-action="export" type="button" ${state.mode!=='local'&&state.hostId!==state.meId?'disabled':''}>우리의 이야기 저장</button><button class="button quiet" data-action="leave" type="button">다음 이야기 고르기</button></div><small>다른 선택과 단서는 다른 결말로 이어질 수 있습니다.</small></section>`;
}
function renderNotebook(){
  const g=game();if(!g)return '';
  if(activeTab==='clues')return `${(g.clues||[]).length?g.clues.map((c,i)=>`<article class="clue-card"><span class="clue-index">CLUE ${String(i+1).padStart(2,'0')}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join(''):'<div class="empty-notebook"><span>⌕</span><h3>아직 펼치지 않은 기록</h3><p>장면을 관찰하거나 행동하면,<br>발견한 단서가 여기에 남습니다.</p></div>'}${(g.flags||[]).length?`<div class="story-changes"><h3>우리가 바꾼 것</h3>${g.flags.map(f=>`<p>• ${esc(typeof f==='string'?f:f.text||f.title)}</p>`).join('')}</div>`:''}`;
  if(activeTab==='journal')return (g.journal||[]).length?`<div class="journal-list">${[...g.journal].reverse().map(j=>`<article><small>${esc(j.sceneTitle||'기록')} ${j.actor?'· '+esc(j.actor):''}</small><h3>${esc(j.action||GRADE[j.grade]||'이야기의 변화')}</h3><p>${esc(j.text)}</p>${Number.isFinite(j.roll)?`<span class="journal-roll">D20 ${j.roll} · 합계 ${j.total} / 목표 ${j.dc}</span>`:''}</article>`).join('')}</div>`:'<div class="empty-notebook"><span>✎</span><h3>첫 문장을 기다려요.</h3><p>행동과 그 결과가<br>차곡차곡 기록됩니다.</p></div>';
  return `<div class="chat-messages" aria-live="polite">${(state.messages||[]).length?state.messages.map(m=>`<div><b>${esc(m.name)}</b><p>${esc(m.text)}</p></div>`).join(''):'<p class="chat-placeholder">단서에 대한 생각이나 엉뚱한 계획을 나눠 보세요.</p>'}</div><form id="chat-form"><label class="sr-only" for="chat-input">동료에게 할 말</label><textarea id="chat-input" rows="2" maxlength="300" placeholder="동료에게 할 말…">${esc(draft.chat)}</textarea><button class="button quiet small full" type="submit">보내기</button></form>`;
}
function entryValues(){
  const el=$('entry-dialog');return {name:el.querySelector('#player-name')?.value||'',classId:el.querySelector('#player-class')?.value||'guardian',local:Array.from(el.querySelectorAll('[data-local-row]')).map(r=>({name:r.querySelector('input')?.value||'',classId:r.querySelector('select')?.value||'guardian'}))};
}
function openEntry(kind='create',keep=null){
  entryKind=kind;const c=selectedCampaign();const initial=keep||{name:readName(),classId:'guardian',local:[]};
  const d=openDialog('entry-dialog',`${closeButton('entry-dialog')}<div class="eyebrow">${kind==='join'?'JOIN THE TABLE':'OPEN A NEW STORY'}</div><h2 id="entry-title">${kind==='join'?'친구의 탁자에 앉기':'어떻게 함께할까요?'}</h2><p class="modal-intro">${kind==='join'?'친구가 알려 준 초대 코드와 내 이름을 적어 주세요.':esc(c?.title||'새 이야기')+'에 들어갈 준비를 해요.'}</p>
    ${kind==='create'?`<div class="mode-switch" role="group" aria-label="플레이 방식"><button data-mode="online" class="${entryMode==='online'?'active':''}" type="button"><b>온라인</b><small>각자의 기기로</small></button><button data-mode="local" class="${entryMode==='local'?'active':''}" type="button"><b>한 기기로 함께</b><small>같은 자리에서</small></button></div>`:''}
    <form id="entry-form">${kind==='join'?'<label class="field"><span>초대 코드</span><input id="join-code" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="예: ABC234" required></label>':''}
    ${kind==='create'&&entryMode==='local'?`<div class="local-count"><label for="local-count">함께할 인원</label><select id="local-count">${[1,2,3,4].map(n=>`<option value="${n}" ${n===localCount?'selected':''}>${n}명</option>`).join('')}</select></div><div class="local-rows">${Array.from({length:localCount},(_,i)=>`<div class="local-row" data-local-row><span>${i+1}</span><label><span class="sr-only">${i+1}번 플레이어 이름</span><input maxlength="18" placeholder="${i+1}번 플레이어 이름" value="${esc(initial.local[i]?.name||'')}" required></label><label><span class="sr-only">${i+1}번 플레이어 직업</span><select>${classOptions(initial.local[i]?.classId||CLASS[i].id)}</select></label></div>`).join('')}</div><p class="small muted">차례마다 화면을 넘겨 주세요. 각자의 비밀은 카드를 눌렀을 때만 보입니다.</p>`:`<div class="entry-fields"><label class="field"><span>내 이름</span><input id="player-name" maxlength="18" autocomplete="nickname" placeholder="어떻게 불러 드릴까요?" value="${esc(initial.name)}" required></label><label class="field"><span>내 직업</span><select id="player-class">${classOptions(initial.classId)}</select></label></div>`}
    <div class="class-primer">${CLASS.map(cl=>`<div><span>${cl.icon}</span><b>${cl.name}</b><small>${cl.best}</small></div>`).join('')}</div><p class="small muted">직업 능력치는 고정입니다. 비밀 카드와 개인 목표는 이야기가 시작되면 받습니다.</p>
    <button class="button primary full" data-busy-guard type="submit">${kind==='join'?'참가하기':'탁자 만들기'} <span>↗</span></button></form>`);
  if(kind==='join'){const code=new URLSearchParams(location.search).get('room');if(code)$('join-code').value=code.toUpperCase();}
}
function readName(){try{return localStorage.getItem('cg-v14-name')||'';}catch{return '';}}
async function preview(payload){
  if(!game()||(!game().canAct&&!payload.detailId))return;
  payload={...payload};
  if(!payload.detailId&&!payload.reviveId){if(draft.spark)payload.spendSpark=true;if(draft.flashback.trim())payload.flashback=draft.flashback.trim();}
  let result;
  try { result=await client.preview(payload); }
  catch(error){result={ok:false,error:error.message,hints:error.hints};}
  if(!result||result.ok===false){
    const hints=result?.hints||[];
    openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">LET'S MAKE IT CLEAR</div><h2 id="info-title">어떤 목표로 행동할까요?</h2><p class="modal-intro">${esc(result?.error||'행동을 해석하지 못했습니다.')}</p>${hints.length?`<div class="clarification-list">${hints.map(h=>`<p>• ${esc(typeof h==='string'?h:h.label||'')}</p>`).join('')}</div>`:''}<p class="small muted">대상과 원하는 결과를 함께 적어 주세요. 적던 행동은 화면에 그대로 남아 있습니다.</p><button class="button primary full" data-close="info-dialog" type="button">행동을 다듬어 보기</button>`);
    return;
  }
  const plan=result.plan||result;
  pending={payload,plan,revision:game().revision,sceneId:game().scene.id,committing:false};
  const auto=plan.automatic||Boolean(payload.detailId);
  openDialog('preview-dialog',`${closeButton('preview-dialog')}<div class="eyebrow">${auto?'YOUR DECISION':'BEFORE THE DICE'}</div><h2 id="preview-title">${auto?'이 행동으로 진행할까요?':'주사위를 굴리기 전에'}</h2><p class="preview-action">${esc(plan.label||plan.action||payload.text||'장면을 살펴봅니다.')}</p>${plan.interpreted?`<div class="interpretation"><b>장면 해석</b><p>${esc(typeof plan.interpreted==='string'?plan.interpreted:plan.label)}</p></div>`:''}
    ${auto?'<div class="automatic-note"><span>✧</span><p>위험을 겨루는 행동이 아니므로<br><b>주사위 없이 선택대로 진행합니다.</b></p></div>':`<div class="dice-equation"><div class="die-token">D20</div><span>+</span><div><b>${Number(plan.bonus)||0}</b><small>${esc(STAT[plan.stat]||'행동')} + 도움 + 준비</small></div><span class="equation-arrow">→</span><div><b>${Number(plan.dc)||0}</b><small>성공 목표</small></div></div><div class="bonus-breakdown">직업 +${Number(plan.classBonus??((Number(plan.bonus)||0)-(Number(plan.assistance)||0)-(plan.spendSpark?3:0)-(plan.flashback?2:0)))||0} · 동료 +${Number(plan.assistance)||0}${plan.spendSpark?' · 운명 조각 +3':''}${plan.flashback?' · 회상 +2':''}</div><div class="risk-note"><b>이번 행동에 걸린 것</b><p>${esc(plan.risk||'실패하면 위험이 높아지고, 다른 상황에서 이야기가 이어집니다.')}</p>${renderHarmRisk(plan)}</div><p class="small muted">목표 이상이면 성공. 목표보다 1–2 낮으면 대가 있는 성공. 실패해도 이야기는 다음 상황으로 이어집니다.</p>`}
    <div class="dialog-actions"><button class="button quiet" data-close="preview-dialog" type="button">다시 생각하기</button><button class="button primary" data-action="confirm-action" data-busy-guard type="button">${auto?'이대로 진행':'D20 굴리기'} <span>↗</span></button></div>`);
}
function showSecret(){
  const g=game();if(!g)return;const secret=g.secret,me=(g.players||[]).find(p=>p.id===state.meId);
  if(!secret){toast('이 인물의 비밀 카드를 아직 불러오지 못했어요.');return;}
  const title=secret.title||'나만의 비밀';
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">FOR YOUR EYES ONLY</div><h2 id="info-title">${esc(me?.name||'나')}의 비밀 카드</h2>${!secretOpen?`<div class="secret-envelope"><span>✉</span><h3>${esc(title)}</h3><p>${state.mode==='local'?'다른 동료가 화면을 보고 있지 않은지 확인한 뒤 열어 주세요.':'동료에게 아직 공개되지 않은 정보입니다.'}</p><button class="button primary" data-action="open-secret" type="button">나만 보기</button></div>`:`<div class="secret-content"><h3>${esc(title)}</h3><p>${esc(secret.secret)}</p><div class="personal-goal"><span>내가 바라는 것</span><p>${esc(secret.goal)}</p></div></div><div class="risk-note"><b>공유할 내용</b><p>${esc(secret.reveal)}</p></div><button class="button primary full" data-action="reveal" type="button" ${me?.revealed?'disabled':''}>${me?.revealed?'이미 동료들에게 공개한 비밀':'이 비밀을 동료들에게 공개하기'}</button><p class="small muted">공개하면 모두의 기록에 남습니다.</p>`}`);
}
function showHelp(){
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">WELCOME TO THE TABLE</div><h2 id="info-title">이야기를 함께 만드는 방법</h2><div class="help-steps"><section><span>01</span><div><h3>장면을 읽고, 동료와 상의해요.</h3><p>눈앞의 문제, 등장인물, 단서가 매 장면 달라집니다. 「잠깐 살펴보기」로 위험 없이 관찰할 수 있어요.</p></div></section><section><span>02</span><div><h3>내 차례에 행동을 정해요.</h3><p>선택지를 누르거나, 대상과 방법을 직접 적으세요. 판정 내용과 실패의 대가를 먼저 보고 실행을 결정합니다.</p></div></section><section><span>03</span><div><h3>불확실한 행동에만 D20을 굴려요.</h3><p>직업의 고정 능력치와 협력 보너스를 더합니다. 성공·대가 있는 성공·실패에 따라 사건이 다르게 이어집니다. 중요한 가치 판단은 주사위가 대신 정하지 않아요.</p></div></section><section><span>04</span><div><h3>혼자만 아는 사실을 나눠요.</h3><p>인물마다 비밀과 목표가 있습니다. 동료를 돕거나, 운명 조각으로 +3, 미리 해 둔 준비를 회상해 +2를 받을 수 있어요.</p></div></section></div><div class="quiet-note"><b>위험은 실제로 인물을 잃게 할 수 있어요.</b><p>각 인물은 생명력 3으로 시작합니다. 위험한 선택의 판정창에서 피해를 먼저 확인하세요. 사망하면 살아 있는 동료가 행동을 이어가며, 부활 지점에서 한 번의 귀환을 시도할 수 있습니다. 모두 사망하면 이야기는 그 자리에서 끝납니다.</p></div><div class="rules-panel"><h3>직업과 고정 보너스</h3><div class="rules-stats">${CLASS.map(c=>`<div><b>${c.icon} ${c.name}</b><p>${Object.entries(c.stats).map(([k,v])=>`${STAT[k]} +${v}`).join(' · ')}</p></div>`).join('')}</div></div><div class="quiet-note"><b>현재 장면을 이해하는 규칙 기반 진행자</b><p>외부 생성형 AI나 API 키 없이 작동합니다. 장면 안의 대상과 준비된 행동을 바탕으로 자유 입력을 해석합니다. 해석하기 어려운 행동은 확인을 요청하며, 없는 인물이나 사건을 임의로 만들어 내지 않습니다.</p></div><p class="small muted">온라인은 방 코드로 1–4명이 참가합니다. 한 기기로 함께 모드는 같은 화면을 차례로 사용하며, 저장 파일로 진행을 옮길 수 있습니다. 장면 그림과 소리는 모두 게임에 포함되어 있습니다.</p>`);
}
function updateSoundButton(){
  const p=sound?.preferences;
  if(!p)return;
  $('sound-toggle').innerHTML=`${p.enabled?'♫':'♪'} <span>${p.enabled?'소리 켜짐':'소리 켜기'}</span>`;
  $('sound-toggle').setAttribute('aria-label',p.enabled?'소리 끄기':'소리 켜기');
  $('sound-toggle').setAttribute('aria-pressed',String(p.enabled));
}
function showAudio(){const p=sound.preferences;openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">THE SOUND OF THE STORY</div><h2 id="info-title">소리 설정</h2><p class="modal-intro">이야기에 어울리는 배경음과 작은 효과음. 편안한 크기로 조절해 주세요.</p><label class="volume-field"><span>배경음 <output id="music-value">${Math.round(p.music*100)}%</output></span><input id="music-volume" type="range" min="0" max="100" value="${Math.round(p.music*100)}"></label><label class="volume-field"><span>효과음 <output id="effects-value">${Math.round(p.effects*100)}%</output></span><input id="effects-volume" type="range" min="0" max="100" value="${Math.round(p.effects*100)}"></label><button class="button primary full" data-action="toggle-audio" type="button">${p.enabled?'모든 소리 끄기':'소리 켜기'}</button><p class="small muted">처음에는 조용히 시작합니다. 탭이 보이지 않는 동안 소리를 멈춥니다.</p>`);}
function showResume(){
  const saved=client?.state||state||{};
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">THE STORY CONTINUES</div><h2 id="info-title">어느 탁자로 돌아갈까요?</h2><p class="modal-intro">이 브라우저에 남은 자리나 저장된 이야기를 선택해 주세요.</p><div class="resume-options"><button class="button quiet full" data-action="resume-online" type="button" ${!saved.hasOnlineSave?'disabled':''}>온라인 방에 다시 연결</button><button class="button quiet full" data-action="resume-local" type="button" ${!saved.hasLocalSave?'disabled':''}>한 기기로 함께 · 자동 저장</button><button class="button quiet full" data-action="resume-backup" type="button" ${!saved.hasBackup?'disabled':''}>온라인 자동 백업을 로컬로 열기</button><button class="button primary full" data-action="import" type="button">내려받은 저장 파일 열기</button></div><p class="small muted">온라인 서버가 재시작되어 방이 사라진 경우, 방장 브라우저의 자동 백업으로 같은 이야기를 로컬에서 이어갈 수 있습니다.</p>`);
}
function confirmLeave(){
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">A LITTLE PAUSE</div><h2 id="info-title">탁자에서 나갈까요?</h2><p class="modal-intro">${state?.mode==='local'?'진행은 이 브라우저에 자동 저장됩니다. 중요한 이야기는 저장 파일도 내려받아 두세요.':'온라인 방을 나가면 현재 자리를 떠납니다. 진행을 보관하려면 방장이 먼저 저장 파일을 내려받아 주세요.'}</p><div class="dialog-actions"><button class="button quiet" data-close="info-dialog" type="button">계속 플레이</button><button class="button primary" data-action="leave-confirm" type="button">탁자 나가기</button></div>`);
}
async function exportSave(){
  const result=await call('exportSave');if(!result)return;
  const data=result.save||result;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`ChronicleGate-${slug(game()?.campaignId||selected)}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('저장 파일을 내려받았습니다. 다른 기기에서는 「저장 파일 열기」로 이어갈 수 있어요.');
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.close){closeDialog(el.dataset.close);return;}
  if(el.dataset.campaign){selected=el.dataset.campaign;renderHome();openEntry('create');return;}
  if(el.dataset.mode){const values=entryValues();entryMode=el.dataset.mode;openEntry(entryKind,values);return;}
  if(el.dataset.choice){void guarded(()=>preview({choiceId:el.dataset.choice}));return;}
  if(el.dataset.revive){void guarded(()=>preview({reviveId:el.dataset.revive}));return;}
  if(el.dataset.detail){const detail=game()?.scene.details?.find(d=>d.id===el.dataset.detail);if(detail?.read){openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">OBSERVATION</div><h2 id="info-title">${esc(detail.label)}</h2><p class="modal-intro">${esc(detail.text)}</p><button class="button quiet full" data-close="info-dialog" type="button">이야기로 돌아가기</button>`);}else void guarded(()=>preview({detailId:el.dataset.detail}));return;}
  if(el.dataset.tab){activeTab=el.dataset.tab;renderGame(false);$('tab-'+activeTab)?.focus({preventScroll:true});return;}
  if(el.dataset.seat){void guarded(async()=>{await call('setLocalSeat',el.dataset.seat);secretOpen=false;showSecret();});return;}
  const action=el.dataset.action;
  if(action==='create'){openEntry('create');return;}
  if(action==='join'){openEntry('join');return;}
  if(action==='help'){showHelp();return;}
  if(action==='resume'){showResume();return;}
  if(action==='audio-settings'){showAudio();return;}
  if(action==='toggle-audio'){void sound.toggle().then(showAudio);return;}
  if(action==='import'){closeDialog('info-dialog');$('save-file').click();return;}
  if(action==='secret'){secretOpen=false;showSecret();return;}
  if(action==='open-secret'){secretOpen=true;showSecret();return;}
  if(action==='leave'){confirmLeave();return;}
  if(action==='pass'&&state?.mode==='local'&&(state?.players||[]).length===1){toast('지금은 혼자 플레이하고 있어요. 행동을 선택해 이야기를 이어 주세요.');return;}
  void guarded(async()=>{
    if(action==='start'){await call('start');}
    else if(action==='resume-online'||action==='resume-local'||action==='resume-backup'){const result=action==='resume-backup'?await call('recoverBackup'):await call('resume',action==='resume-local'?'local':undefined);if(result)closeDialog('info-dialog');}
    else if(action==='assist'){await call('assist');}
    else if(action==='pass'){await call('pass');}
    else if(action==='reveal'){const result=await call('reveal');if(result){closeDialog('info-dialog');sound.effect('reveal');toast('비밀을 동료들과 나눴습니다. 기록에서도 확인할 수 있어요.');}}
    else if(action==='export')await exportSave();
    else if(action==='leave-confirm'){closeDialog('info-dialog');await call('leave');lastScene='';secretOpen=false;}
    else if(action==='copy-code'){
      try{await navigator.clipboard.writeText(state.code);toast('초대 코드를 복사했습니다. 친구에게 알려 주세요.');}catch{toast(`초대 코드: ${state.code}`);}
    }
    else if(action==='confirm-action'&&pending){
      if(game()?.revision!==pending.revision){closeDialog('preview-dialog');toast('상태가 바뀌었어요. 행동을 다시 확인해 주세요.');return;}
      const prepared=pending;prepared.committing=true;
      if(!prepared.plan.automatic&&!prepared.payload.detailId){sound.effect('dice');$('preview-dialog').classList.add('rolling');}
      const result=await call('act',prepared.payload);
      $('preview-dialog').classList.remove('rolling');
      if(result){closeDialog('preview-dialog');if(prepared.payload.detailId||prepared.plan.type==='detail')sound.effect('clue');}
      else if(pending)pending.committing=false;
    }
  });
});
$('sound-toggle').addEventListener('click',()=>void sound.toggle());
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='free-action')draft.text=el.value;
  else if(el.id==='flashback')draft.flashback=el.value;
  else if(el.id==='chat-input')draft.chat=el.value;
  else if(el.id==='music-volume'||el.id==='effects-volume'){
    const music=Number($('music-volume').value),effects=Number($('effects-volume').value);
    sound.setVolumes(music/100,effects/100);$('music-value').value=music+'%';$('effects-value').value=effects+'%';
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='spend-spark')draft.spark=el.checked;
  else if(el.id==='local-count'){const values=entryValues();localCount=Number(el.value);openEntry('create',values);}
  else if(el.id==='lobby-campaign')void guarded(()=>call('selectCampaign',el.value));
  else if(el.id==='lobby-class')void guarded(()=>call('setClass',el.value));
});
document.addEventListener('submit',event=>{
  if(!['entry-form','action-form','chat-form'].includes(event.target.id))return;
  event.preventDefault();
  void guarded(async()=>{
    if(event.target.id==='entry-form'){
      const values=entryValues();let result;
      if(entryKind==='join')result=await call('join',{name:values.name.trim(),classId:values.classId,code:$('join-code').value.trim().toUpperCase()});
      else result=await call('create',{name:entryMode==='local'?values.local[0]?.name.trim():values.name.trim(),classId:entryMode==='local'?values.local[0]?.classId:values.classId,campaignId:selected,mode:entryMode,localPlayers:entryMode==='local'?values.local.map(p=>({...p,name:p.name.trim()})):undefined});
      if(result){try{localStorage.setItem('cg-v14-name',values.name);}catch{}closeDialog('entry-dialog');}
    }
    else if(event.target.id==='action-form'){if(!draft.text.trim()){toast('어떤 행동을 할지 적어 주세요.');return;}await preview({text:draft.text.trim()});}
    else if(event.target.id==='chat-form'){if(!draft.chat.trim())return;const text=draft.chat.trim();draft.chat='';const result=await call('chat',text);if(!result)draft.chat=text;renderGame(false);}
  });
});
$('save-file').addEventListener('change',event=>void guarded(async()=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(file.size>5*1024*1024){toast('저장 파일이 너무 큽니다. 5MB 이하의 게임 JSON 파일을 선택해 주세요.','error');return;}
  try{const data=JSON.parse(await file.text());const result=await call('importSave',data);if(result)toast('저장한 이야기를 불러왔습니다.');}catch{toast('게임에서 내려받은 올바른 JSON 저장 파일인지 확인해 주세요.','error');}
}));
for(const dialog of document.querySelectorAll('dialog')){
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog(dialog.id);});
  dialog.addEventListener('cancel',()=>{if(dialog.id==='preview-dialog')pending=null;if(dialog.id==='info-dialog')secretOpen=false;});
}
document.querySelector('.brand').addEventListener('click',event=>{if(state?.mode&&!event.ctrlKey&&!event.metaKey){event.preventDefault();confirmLeave();}});
document.addEventListener('keydown',event=>{if(event.target?.dataset?.tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=['clues','journal','chat'];let index=tabs.indexOf(activeTab);index=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;activeTab=tabs[index];renderGame(false);$('tab-'+activeTab)?.focus({preventScroll:true});}});
document.addEventListener('visibilitychange',()=>document.hidden?sound.pause():sound.resume());
window.addEventListener('pagehide',()=>sound.pause());
window.addEventListener('pageshow',()=>sound.resume());

async function boot(){
  try{
    const {createClient}=await import('./client.js');
    client=await createClient(renderState,(message)=>toast(typeof message==='string'?message:message?.message||message?.error||''));
    catalog=client.catalog||catalog;
    if(!catalog.length)throw new Error('시나리오 목록을 불러오지 못했습니다.');
    if(!catalog.some(c=>c.id===selected))selected=catalog[0].id;
    if(!state?.code&&!state?.game){showView('home');renderHome();}
    const params=new URLSearchParams(location.search);
    if(params.get('mode')==='local'||params.has('offline'))entryMode='local';
    if(params.get('room'))openEntry('join');
    updateSoundButton();
  }catch(error){
    $('home-content').innerHTML=`<div class="load-error"><span>✧</span><h1>책장을 열지 못했어요.</h1><p>${esc(error.message)}</p><p>서버가 실행 중인지, 수정 파일이 모두 업로드되었는지 확인해 주세요.</p><button class="button primary" id="reload-app" type="button">다시 불러오기</button></div>`;
    $('reload-app')?.addEventListener('click',()=>location.reload());
    console.error('[Chronicle Gate]',error);
  }
}
void boot();
