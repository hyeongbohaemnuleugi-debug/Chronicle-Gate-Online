import { createSceneSoundDirector } from './scene-sound.js';
import { createAudio } from './audio.js';
import { createDicePresenter } from './dice.js';
import { selectMusic } from './music-director.js';
import { chronicleText } from './narrative.js';
import { formatCharacters } from './characters.js';
import { renderBattleScreen, hydrateBattleSprites } from './battle-ui.js';
import { createBattlePresenter } from './battle-presenter.js';
import { buildCombatPresentation } from './combat-presentation.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => /^[a-z0-9-]+$/.test(String(value||'')) ? value : 'last-train';
const STAT = {might:'힘',agility:'민첩',wit:'통찰',heart:'교섭'};
const CLASS_ICONS = ['◆','↗','✧','❧'];
const GRADE = {critical:'대성공',success:'성공',failure:'실패',fumble:'대실패',mixed:'대가 있는 성공 · 이전 기록',automatic:'판정 없이 진행',observe:'관찰',safe:'관찰',decision:'선택'};
const ROLLED_GRADES=['critical','success','failure','fumble'];
let client=null, state=null, catalog=[], selected='last-train', busy=false, pending=null;
let activeTab='journal', secretOpen=false, toastTimer=null, lastScene='',lastResultKey='', lastPerson='';
let combatTarget=null, showingRoll=null, battleFrame=null;
let draft={spark:false,preparation:false,chat:''}, entryMode='online', entryKind='create', localCount=2;
let localOpeningSeat=null,meetingStep=null,meetingViewed=false,meetingReceiptScene=null;
const loadedArt=new Map(),artDimensions=new Map(),waitingArt=new Set();
let artFrame=0;
const lazyArtObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    lazyArtObserver.unobserve(entry.target);waitingArt.delete(entry.target);
    loadArt(entry.target);
  }
},{rootMargin:'120px 0px',threshold:0.01}):null;
const artObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const entry of entries){const dimensions=artDimensions.get(entry.target.dataset.art);if(dimensions)sizeArt(entry.target,dimensions);}}):null;
const sound=createAudio(updateSoundButton);
const sceneSounds=createSceneSoundDirector(name=>sound.effect(name),()=>sound.stopSceneEffects?.());
const dice=createDicePresenter({
  onSettled(result,request){
    if(showingRoll!==request)return;
    sound.duck?.(false);
    // The die reveals only the judgement. The battle stage owns the following
    // impact, retaliation and casualty cues, in their committed order.
    if(request.battle)return;
    const music=selectMusic(request.view);
    sound.scene(request.view.campaignId,music.mood);
    lastResultKey=request.key;
    sceneSounds.update(request.view,{allowEffects:true,eventKey:request.key,scope:request.snapshot?.code||'',mood:music.mood,resultOnly:true});
    playResultCue(request.view,music,request.key);
  },
  onCancel(){sound.duck?.(false);},
  onRender(dialog){highlightNames(dialog,showingRoll?.view?.campaignId,showingRoll?.snapshot?.game?.players||[]);},
});
const battle=createBattlePresenter({
  effect:(name,options)=>sound.effect(name,options),
  reducedMotion:()=>dice.mode==='reduce'||(dice.mode==='auto'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  onEvent(event){if(event.type==='death'||event.type==='defeat')sound.scene(showingRoll?.view?.campaignId||game()?.campaignId,'grief');},
});
const position = index => ['0% 0%','100% 0%','0% 100%','100% 100%'][Math.max(0,Math.min(3,Number(index)||0))];
const art = (id,index=0,classes='',label='장면 그림') => `<div class="art-frame ${classes}" data-art-priority="${/(?:hero|lobby|scene)-art/.test(classes)?'high':'defer'}" data-art="${slug(id)}" data-art-index="${Number(index)||0}" style="--art-position:${position(index)}" role="img" aria-label="${esc(label)}"><span class="art-placeholder" aria-hidden="true">✦</span></div>`;
const classList = (campaign=selectedCampaign()) => Array.isArray(campaign?.classes)?campaign.classes:[];
const classFor = id => classList().find(c=>c.id===id)||catalog.flatMap(c=>c.classes||[]).find(c=>c.id===id);
const cname = id => classFor(id)?.name||'직업 선택 중';
const classIcon = id => CLASS_ICONS[Math.max(0,classList().findIndex(c=>c.id===id))%4];
const classBest = c => {const stat=c?.basic?.stat||Object.keys(c?.stats||{}).sort((a,b)=>c.stats[b]-c.stats[a])[0];return `${STAT[stat]||'능력'} +${c?.stats?.[stat]??0}`;};
function healthMarkup(p){if(p.health==null)return '';const hp=Math.max(0,Math.min(p.maxHealth||3,Number(p.health)||0));return `<div class="life-meter ${p.life==='dead'?'life-dead':''}" aria-label="생명력 ${hp}/${p.maxHealth||3}${p.life==='dead'?' · 사망':''}">${Array.from({length:p.maxHealth||3},(_,i)=>`<i class="${i<hp?'filled':''}" aria-hidden="true">♥</i>`).join('')}<small>${p.life==='dead'?'사망 · 잔향':p.revivals?'귀환함':''}</small></div>`;}
const selectedCampaign = () => catalog.find(c=>c.id===selected)||catalog[0];
const game = () => state?.game;
const actionVersion = (value=game()) => value?.actionRevision??value?.revision;
const privateOpeningCover = (view=game()) => state?.mode==='local'&&view?.opening?.active&&view.opening.total>1&&localOpeningSeat!==state.meId;
function listeningView(view=game()){
  const receipt=view?.opening?.mine?.history?.at(-1);
  const scene=receipt?{id:receipt.sceneId||meetingReceiptScene?.id,title:receipt.sceneTitle,location:receipt.location||meetingReceiptScene?.location,mood:receipt.mood||meetingReceiptScene?.mood||'calm',ending:false}:null;
  // This reading surface can lag behind the shared table. Current casualties,
  // pressure, combat or journal entries must not sound ahead of its prose.
  const readingOnly={combat:null,ending:false,players:[],journal:[],pressure:null};
  if(meetingStep==='receipt'&&receipt)return {...view,...readingOnly,scene,lastResult:receipt};
  if(meetingStep==='meeting'&&view?.opening?.meeting){
    const start=view.opening.meeting.startScene;
    return {...view,...readingOnly,scene:{id:start?.id||'meeting',title:start?.title||view.opening.meeting.title,mood:start?.mood||'calm',ending:false},lastResult:null};
  }
  return view;
}
function resultEventKey(view,owner=state,personal=view?.opening?.active||meetingStep==='receipt'){
  const result=view?.lastResult;if(!result)return '';
  const prefix=`${owner?.code||''}:${view.campaignId}:`;
  if(personal)return `${prefix}opening:${owner?.meId}:${view.opening?.mine?.history?.length||0}`;
  // Reveal/assist/pass can keep the previous receipt. Its matching journal ID,
  // rather than a presence revision, identifies an actual new action.
  const entry=[...(view.journal||[])].reverse().find(item=>item.actor===result.actor&&item.action===result.action&&item.text===result.text&&item.grade===result.grade&&(item.roll??null)===(result.roll??null));
  return entry?.id?`${prefix}${entry.id}`:`${prefix}${JSON.stringify([result.actor,result.action,result.text,result.grade,result.roll??null,result.total??null])}`;
}
function clearPersonalDialogs(){for(const id of ['preview-dialog','info-dialog']){closeDialog(id);$(id).innerHTML='';}secretOpen=false;}
// Emphasize text nodes after normal escaping, never attributes or form values.
// Every reading surface shares this path, including dynamically opened dialogs.
function highlightNames(root,campaignId=game()?.campaignId||selected,players=game()?.players||state?.players||[]){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  for(let node=walker.nextNode();node;node=walker.nextNode())nodes.push(node);
  const template=document.createElement('template');
  for(const node of nodes){
    const parent=node.parentElement;
    if(!node.nodeValue.trim()||!parent||parent.closest('input,textarea,select,option,script,style,svg,.character-name'))continue;
    const storyId=parent.closest('[data-campaign]')?.dataset.campaign||campaignId;
    const markup=formatCharacters(node.nodeValue,storyId,players);
    if(!markup.includes('<strong class="character-name"'))continue;
    template.innerHTML=markup;node.replaceWith(template.content);
  }
}
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
function openDialog(id,html){const el=$(id);el.innerHTML=html;highlightNames(el);if(!el.open)el.showModal();return el;}
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
  el.style.backgroundImage=`url("/game/art/${id}.webp?v=17000")`;el.classList.add('art-ready');
  const dimensions=artDimensions.get(id);if(dimensions)sizeArt(el,dimensions);
}
function markArtUnavailable(el){
  el.classList.add('art-unavailable');
  el.setAttribute('aria-label','장면 그림을 불러오지 못했습니다. 아래 이야기로 계속 진행할 수 있습니다.');
}
function loadArt(el){
  if(!el.isConnected||el.closest('[hidden]'))return;
  const id=slug(el.dataset.art),status=loadedArt.get(id);
  if(status===true){applyArt(el,id);return;}
  if(status===false){markArtUnavailable(el);return;}
  if(status==='loading')return;
  loadedArt.set(id,'loading');const image=new Image();
  image.decoding='async';image.fetchPriority=el.dataset.artPriority==='high'?'high':'low';
  image.onload=()=>{
    loadedArt.set(id,true);artDimensions.set(id,{width:image.naturalWidth,height:image.naturalHeight});
    for(const target of document.querySelectorAll(`[data-art="${id}"]`))applyArt(target,id);
  };
  image.onerror=()=>{
    loadedArt.set(id,false);
    for(const target of document.querySelectorAll(`[data-art="${id}"]`))markArtUnavailable(target);
  };
  image.src=`/game/art/${id}.webp?v=17000`;
}
function loadNearbyArt(){
  artFrame=0;
  for(const el of waitingArt){
    if(!el.isConnected||el.closest('[hidden]')){waitingArt.delete(el);continue;}
    const rect=el.getBoundingClientRect();
    if(rect.width>0&&rect.height>0&&rect.top<window.innerHeight+120&&rect.bottom>-120){
      waitingArt.delete(el);loadArt(el);
    }
  }
}
function scheduleNearbyArt(){if(!artFrame)artFrame=requestAnimationFrame(loadNearbyArt);}
if(!lazyArtObserver){
  window.addEventListener('scroll',scheduleNearbyArt,{passive:true});
  window.addEventListener('resize',scheduleNearbyArt,{passive:true});
}
function hydrateArt(){
  artObserver?.disconnect();lazyArtObserver?.disconnect();waitingArt.clear();
  for(const el of document.querySelectorAll('[data-art]')){
    if(el.closest('[hidden]'))continue;
    artObserver?.observe(el);
    const status=loadedArt.get(slug(el.dataset.art));
    if(status===true){applyArt(el,slug(el.dataset.art));continue;}
    if(status===false){markArtUnavailable(el);continue;}
    if(status==='loading')continue;
    if(el.dataset.artPriority==='high'){loadArt(el);continue;}
    waitingArt.add(el);
    if(lazyArtObserver)lazyArtObserver.observe(el);
  }
  if(!lazyArtObserver)loadNearbyArt();
}
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX'];
function chronicleSeal(){
  return `<svg class="chronicle-seal" viewBox="0 0 80 96" fill="none" aria-hidden="true"><path d="M15 77V39a25 25 0 0 1 50 0v38M22 76V39a18 18 0 0 1 36 0v37"/><path d="M40 23v41m-12-20 12-13 12 13-12 13-12-13Z"/><path d="M8 70c13-2 24 0 32 6 8-6 19-8 32-6v13c-13-2-24 0-32 6-8-6-19-8-32-6V70Zm32 6v13M14 77c9-1 16 1 22 4m8 0c6-3 13-5 22-4"/><path d="M40 3v8M3 39h8m58 0h8M11 13l6 6m46 0 6-6"/><circle cx="40" cy="44" r="3"/></svg>`;
}
function renderHome(){
  const feature=selectedCampaign();if(!feature)return;
  const featureNumber=Math.max(0,catalog.findIndex(c=>c.id===feature.id));
  $('home-content').innerHTML=`
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-stars" aria-hidden="true"></div>
      <div class="hero-orbit" aria-hidden="true"><span></span><span></span></div>
      <div class="hero-portal">${art(feature.id,0,'hero-art',feature.title+'의 시작 장면')}<div class="hero-shade"></div><span class="portal-keystone" aria-hidden="true">✦</span></div>
      <div class="hero-content">
        <div class="hero-invitation">${chronicleSeal()}<span>함께 쓰는 운명의 연대기<small>A CHRONICLE OF OUR CHOICES</small></span></div>
        <h1 id="home-title"><span>CHRONICLE</span><span class="title-gate"><i aria-hidden="true"></i>GATE<i aria-hidden="true"></i></span></h1>
        <p class="hero-line">우리의 선택으로, 다음 문장을 써 내려간다.</p>
        <p class="hero-description">짧은 장면을 읽고, 다음 행동을 고르세요.<br>혼자든 함께든, 선택이 이야기를 바꿉니다.<br>아홉 세계에서 우리의 연대기를 펼쳐 보세요.</p>
        <div class="hero-actions"><button class="button primary" data-action="create" type="button">새 연대기 펼치기 <span aria-hidden="true">↗</span></button><button class="button glass" data-action="join" type="button">친구의 방에 참가</button></div>
        <div class="hero-meta"><span>혼자 또는 최대 4명</span><i></i><span>온라인 · 한 기기로 함께</span><i></i><span>진행자 없이 플레이</span></div>
      </div>
      <div class="hero-bottom"><a href="#story-shelf" class="shelf-link"><span aria-hidden="true">↓</span> 아홉 기록 둘러보기</a><div class="hero-caption"><span>CHRONICLE ${ROMAN[featureNumber]||'I'} · 지금 펼쳐진 세계</span><b>${esc(feature.title)}</b></div></div>
    </section>
    <section class="chronicle-promise" aria-label="함께 만드는 연대기"><div><span aria-hidden="true">I</span><p><b>서로 다른 아홉 세계</b>장면과 단서가 만드는 여러 결말</p></div><div><span aria-hidden="true">II</span><p><b>각자의 역할, 함께하는 전투</b>이야기별 네 직업과 하나의 고유 기술</p></div><div><span aria-hidden="true">III</span><p><b>기억에 남을 우리의 선택</b>비밀 · 협력 · 주사위로 이어지는 이야기</p></div></section>
    <section class="story-shelf" id="story-shelf" aria-labelledby="library-title">
      <div class="library-heading"><div><div class="eyebrow"><span aria-hidden="true">✦</span> THE NINE CHRONICLES</div><h2 id="library-title">오늘 밤, 어떤 기록을 펼칠까요?</h2><p>오늘 펼칠 이야기를 골라 주세요.</p></div><div class="text-actions"><button class="text-button" data-action="resume" type="button">이전 기록 이어 하기 ↗</button><button class="text-button" data-action="import" type="button">저장 파일 열기</button></div></div>
      <div class="campaign-grid" aria-label="시나리오 목록">${catalog.map((c,i)=>`
        <button class="campaign-card ${i===0?'featured':''} ${c.id===selected?'selected':''}" data-campaign="${slug(c.id)}" type="button" aria-pressed="${c.id===selected}">
          <div class="cover-wrap">${art(c.id,0,'campaign-art',c.title+' 표지')}<span class="cover-number"><small>CHRONICLE</small>${ROMAN[i]||String(i+1)}</span><span class="cover-arrow" aria-hidden="true">↗</span>${c.id===selected?'<span class="selected-chip"><i aria-hidden="true"></i> 선택한 기록</span>':''}</div>
          <div class="card-copy"><div class="card-genre">${esc(c.genre||'협력 이야기')}</div><h3>${esc(c.title)}</h3><p>${esc(c.description||c.subtitle||'동료들과 함께 새로운 사건에 뛰어드세요.')}</p><div class="card-features"><span>${Number(c.sceneCount)||0}개 장면</span><span>${Number(c.endingCount)||0}개 결말</span><span>전용 직업 ${(c.classes||[]).length}개</span></div><div class="card-bottom"><span>서로 다른 상대 ${Number(c.lengthModes?.find(mode=>mode.id==='epic')?.encounterCount)||0}종<br><small>기본 ${Number(c.combatCount)||0}종 · 서사시 ${Number(c.lengthModes?.find(mode=>mode.id==='epic')?.encounterCount)||0}종 · 전투는 선택</small></span><b>이 기록 펼치기 <span aria-hidden="true">↗</span></b></div></div>
        </button>`).join('')}</div>
    </section>
    <section class="table-note"><div class="note-icon">${chronicleSeal()}</div><div><div class="eyebrow">EVERY CHOICE LEAVES A TRACE</div><h2>이 연대기의 마지막 문장은, 아직 쓰이지 않았습니다.</h2><p>한 장면을 읽고 다음 행동을 고르면, 그 결과가 우리의 연대기에 남습니다. 위험한 선택 앞에서는 주사위를 굴리고 동료와 힘을 모으세요. 함께 써 내려간 기록은 글 파일로 간직할 수 있습니다.</p></div><button class="button quiet" data-action="help" type="button">플레이 방법 살펴보기</button></section>`;
  highlightNames($('home-content'),feature.id,[]);hydrateArt();sound.scene(feature.id,'mystery');
}
function showView(view){
  for(const name of ['home','lobby','game'])$(name+'-view').hidden=name!==view;
  $('site-footer').hidden=view==='game';document.body.dataset.view=view;
}
function applyState(next){
  const old=state;state=next;
  if(next?.restored){sceneSounds.reset();localOpeningSeat=null;meetingStep=null;meetingViewed=false;meetingReceiptScene=null;lastResultKey='';lastScene='';}
  if(next?.catalog?.length)catalog=next.catalog;
  if(next?.campaignId)selected=next.campaignId;
  const person=next?.meId||'';
  if(person!==lastPerson){clearPersonalDialogs();combatTarget=null;lastPerson=person;draft={spark:false,preparation:false,chat:''};}
  if(!next?.game){sceneSounds.reset();localOpeningSeat=null;meetingStep=null;meetingViewed=false;meetingReceiptScene=null;lastResultKey='';}
  if(next?.mode==='local'&&next.game?.opening?.active&&(!old?.game?.opening?.active||old.meId!==person)){
    localOpeningSeat=null;clearPersonalDialogs();
  }
  if(!next.restored&&old?.game?.opening?.active&&!next.game?.opening?.active&&next.game?.opening?.meeting){
    const justFinished=old.meId===person&&!old.game.opening.mine?.ready&&next.game.opening.mine?.history?.length;
    meetingStep=justFinished?'receipt':'meeting';meetingViewed=false;meetingReceiptScene=justFinished?old.game.scene:null;
  }
  const connection=$('connection');
  connection.innerHTML=!next?.code?'':`<i class="status-dot ${next.connected===false?'offline':''}"></i>${next.mode==='local'?'한 기기로 함께':next.connected===false?'재연결 중':'온라인'}`;
  if(!next?.code&&!next?.game){showView('home');renderHome();return;}
  if(!next.game){showView('lobby');renderLobby();return;}
  showView('game');
  const sceneKey=next.game.campaignId+':'+(next.game.opening?.active?person+':':'')+next.game.scene.id;
  const changed=sceneKey!==lastScene;
  if(changed){combatTarget=null;draft.spark=false;draft.preparation=false;secretOpen=false;}
  if(pending&&(actionVersion(next.game)!==pending.revision||pending.actorId!==person||pending.sceneId!==next.game.scene.id)&&!pending.committing){closeDialog('preview-dialog');toast('당신의 장면이 바뀌었습니다. 행동을 다시 선택해 주세요.');}
  renderGame(changed);lastScene=sceneKey;
  const reconnected=old?.connected===false&&next.connected!==false;
  const freshlyStarted=old?.code&&old.code===next.code&&!old.game&&next.game?.phase==='opening'&&next.game.revision===1;
  updateReadingAudio({allowEffects:Boolean(old?.game||freshlyStarted)&&!reconnected&&!next.restored});
}
function updateReadingAudio({allowEffects=false}={}){
  const audible=listeningView(),music=selectMusic(audible,{privateCover:privateOpeningCover()});
  if(!audible)return;
  sound.scene(audible.campaignId,music.mood);
  sceneSounds.update(audible,{allowEffects:allowEffects&&!audible.lastResult?.combat,privateCover:privateOpeningCover(),eventKey:resultEventKey(audible),scope:state?.code||'',mood:music.mood});
  // A meeting has no new receipt. In particular, do not mark a main-story
  // result as consumed before the reader has reached that story surface.
  if(!audible.lastResult)return;
  const key=resultEventKey(audible);
  if(allowEffects&&key!==lastResultKey)playResultCue(audible,music,key);
  lastResultKey=key;
}
function playResultCue(view,music,key){
  // Combat sounds are emitted by the event presenter; presence and restored
  // receipts must never restart the previous attack.
  if(view?.lastResult?.combat)return;
  if(music.effect)sound.effect(music.effect);
  if(music.enemyEffect)setTimeout(()=>{
    if(lastResultKey===key&&!privateOpeningCover()&&(!showingRoll||showingRoll.key===key)&&selectMusic(view).enemyEffect)sound.effect('enemy');
  },120);
}
function freshRoll(before,next){
  if(!before?.game||!next?.game||before.code!==next.code||before.mode!==next.mode||before.game.campaignId!==next.game.campaignId||before.connected===false||next.connected===false)return null;
  const privateChapter=Boolean(before.game.opening?.active);
  if(before.meId!==next.meId&&(next.mode!=='local'||privateChapter))return null;
  if(privateChapter){
    if(next.mode==='local'&&before.game.opening.total>1&&localOpeningSeat!==before.meId)return null;
    const history=next.game.opening?.mine?.history||[],oldHistory=before.game.opening?.mine?.history||[];
    if(history.length<=oldHistory.length)return null;
    const result=history.at(-1);
    if(!Number.isInteger(result?.roll)||result.roll<1||result.roll>20||!ROLLED_GRADES.includes(result.grade))return null;
    const scene={...before.game.scene,id:result.sceneId||before.game.scene.id,title:result.sceneTitle,location:result.location,mood:result.mood||before.game.scene.mood};
    const view={...next.game,scene,lastResult:result,combat:null,ending:false};
    return {view,key:resultEventKey(view,next,true),result,personal:true};
  }
  if(meetingStep||next.game.opening?.active)return null;
  const view=next.game,result=view.lastResult,key=resultEventKey(view,next,false);
  if(!result||key===resultEventKey(before.game,before,false))return null;
  const combatPlan=buildCombatPresentation(before.game,view,result);
  const rolled=Number.isInteger(result.roll)&&result.roll>=1&&result.roll<=20&&ROLLED_GRADES.includes(result.grade);
  if(!rolled&&!combatPlan)return null;
  return {view,key,result,personal:false,battle:combatPlan,before};
}
function cancelPresentation(next){
  showingRoll=null;battleFrame=null;dice.cancel();battle.cancel();sound.duck?.(false);sound.stopBattleEffects?.();
  document.body.classList.remove('battle-presenting');
  if(next)applyState(next);
}
function renderState(next){
  if(next?.restored){cancelPresentation(next);return;}
  if(showingRoll){
    const expected=showingRoll.snapshot;
    if(!next?.game||next.connected===false||next.code!==expected.code||next.mode!==expected.mode||(next.meId!==expected.meId&&(next.mode!=='local'||showingRoll.personal))||next.game.campaignId!==expected.game.campaignId){
      cancelPresentation(next);
    }else{
      const candidate=freshRoll(showingRoll.latest,next);
      // A complete action stream includes automatic abilities as well as dice.
      // Presence/reveal updates refresh only the final snapshot.
      if(!showingRoll.personal&&candidate&&!candidate.personal&&!showingRoll.seenKeys.has(candidate.key)){
        showingRoll.queue.push({candidate,snapshot:next});showingRoll.seenKeys.add(candidate.key);
      }
      showingRoll.latest=next;
    }
    return;
  }
  const candidate=freshRoll(state,next);
  if(!candidate){applyState(next);return;}
  if(!candidate.battle&&!dice.canAnimate){applyState(next);return;}
  startRoll(candidate,next);
}
function instantBattleSound(plan){
  // Without motion support, present a single clear outcome instead of layering
  // an entire exchange of sounds on the same instant.
  const abilityType=plan.events.find(event=>event.type==='ability')?.abilityType;
  const primarySupport={heal:'heal',guard:'shield',stun:'stun',expose:'ability',rally:'ability'}[abilityType]||'ability';
  const priorities=['defeat','death','victory','fumble','player-hit',...(plan.grade==='automatic'?[primarySupport]:['enemy-hit']),'shield','heal','enemy-stunned','stun','enemy-hit','miss','ability'];
  const event=priorities.map(type=>plan.events.find(event=>event.type===type&&event.sound)).find(Boolean);
  if(event?.sound)sound.effect(event.sound,{scope:'battle'});
}
function startRoll(candidate,next,stream=null){
  const request={...candidate,snapshot:next,latest:stream?.latest||next,queue:stream?.queue||[],seenKeys:stream?.seenKeys||new Set([candidate.key])};showingRoll=request;
  clearPersonalDialogs();sound.stopSceneEffects?.();
  const rolled=Number.isInteger(candidate.result?.roll)&&ROLLED_GRADES.includes(candidate.result.grade);
  if(candidate.battle){
    battleFrame={view:candidate.before.game,request};
    document.body.classList.add('battle-presenting');renderGame(false);
  }
  const finish=()=>{
    if(showingRoll!==request)return;
    showingRoll=null;battleFrame=null;document.body.classList.remove('battle-presenting');sound.duck?.(false);
    // Cues were consumed by this presentation. Applying the authoritative board
    // can now update prose and music without replaying its last attack.
    if(candidate.battle)lastResultKey=request.key;
    applyState(request.snapshot);
    const queued=request.queue.shift();
    if(queued){startRoll(queued.candidate,queued.snapshot,request);return;}
    if(request.latest!==request.snapshot)applyState(request.latest);
    if(!showingRoll)$('scene-title')?.focus({preventScroll:true});
  };
  void (async()=>{
    if(rolled&&dice.canAnimate){
      sound.duck?.(true);sound.effect('dice');
      const receipt=candidate.battle?{...candidate.result,narrativeText:`${candidate.result.actor}의 ‘${candidate.result.action}’ · ${GRADE[candidate.result.grade]}. 이어지는 전투 장면에서 결과를 확인합니다.`}:candidate.result;
      await dice.show(receipt,request);
    }
    if(showingRoll!==request)return;
    sound.duck?.(false);
    if(candidate.battle){
      lastResultKey=request.key;
      if(battle.canAnimate){
        const stage=$('battle-stage');
        stage?.scrollIntoView?.({block:'center',behavior:'instant'});
        await battle.show(candidate.battle,stage);
      }
      else if(!document.hidden)instantBattleSound(candidate.battle);
    }
    finish();
  })().catch(()=>{
    if(showingRoll!==request)return;
    // Presentation failure cannot strand a committed server action or reroll it.
    battle.cancel();dice.cancel();sound.stopBattleEffects?.();finish();
  });
}
function classOptions(value,campaign=selectedCampaign(),ownerId=state?.meId){
  return classList(campaign).map(c=>{const others=!state?.game?(state?.players||[]).filter(p=>p.id!==ownerId&&p.classId===c.id):[];
    return `<option value="${esc(c.id)}" ${c.id===value?'selected':''}>${esc(c.name)} · ${esc(classBest(c))}${others.length?` · ${esc(others.map(p=>p.name).join(', '))} 선택`:''}</option>`;
  }).join('');
}
function professionDetail(profession){
  if(!profession)return '<p class="small muted">시나리오의 직업을 선택해 주세요.</p>';
  return `<section class="profession-detail"><div class="profession-heading"><span>${classIcon(profession.id)}</span><div><h3>${esc(profession.name||profession.className)}</h3><p>${esc(profession.description||'')}</p></div></div><div class="profession-stats">${Object.entries(profession.stats||{}).map(([key,value])=>`<span>${esc(STAT[key]||key)} <b>+${value}</b></span>`).join('')}</div><div class="profession-moves"><div><small>기본 공격 · 제한 없음</small><b>${esc(profession.basic?.name||'기본 공격')}</b><p>${esc(profession.basic?.description||profession.basic?.text||'')}</p></div><div><small>고유 기술 · 전투마다 한 번</small><b>${esc(profession.ability?.name||'고유 기술')}</b><p>${esc(profession.ability?.description||profession.ability?.text||'')}</p></div></div></section>`;
}
function professionSummary(player){
  const definition=classFor(player?.classId);if(!definition)return '';
  return `<div class="party-profession"><div><span>나의 전투 역할</span><button class="text-button" data-action="profession" type="button">자세히 ↗</button></div><h3>${esc(player.className||definition.name)}</h3><p><small>기본</small><b>${esc(player.basic?.name||definition.basic?.name)}</b></p><p><small>고유</small><b>${esc(player.ability?.name||definition.ability?.name)}</b></p></div>`;
}
function renderPlayMode(campaign,count){
  const mode=count===1?'solo':'group',description=campaign?.playModes?.[mode];
  if(!description)return '';
  return `<div class="story-mode-note" data-play-mode="${mode}" data-party-size="${count}"><b>${count===1?'혼자 펼치는 이야기':`${count}명이 함께 펼치는 이야기`}</b><p>${esc(description)}</p></div>`;
}
function renderLobby(){
  const campaign=selectedCampaign(), host=state.meId===state.hostId||state.mode==='local';
  const players=state.players||[];
  const duplicateJobs=players.some((p,i)=>players.some((other,j)=>j<i&&other.classId===p.classId));
  const needDifferentJobs=duplicateJobs;
  const storyLength=state.storyLength || 'basic';
  $('lobby-view').innerHTML=`
    <div class="page-top"><button class="text-button" data-action="leave" type="button">← 이야기 책장</button><span class="eyebrow">BEFORE THE FIRST PAGE</span></div>
    <div class="lobby-heading"><div><h1>첫 장면을 펼치기 전에</h1><p>${state.mode==='local'?(players.length===1?'내 인물과 이야기를 고르면 준비가 끝나요.':'한 화면을 번갈아 보며 이야기를 이어가세요.'):(players.length===1?'혼자 시작하거나, 친구에게 방 코드를 알려 주세요.':'친구들이 모두 모이면 이야기를 시작하세요.')}</p></div><div class="room-code"><small>${state.mode==='local'?'PLAY TOGETHER':'초대 코드'}</small><b>${state.mode==='local'?'LOCAL':esc(state.code)}</b>${state.mode!=='local'?'<button class="text-button" data-action="copy-code" type="button">코드 복사</button>':''}</div></div>
    <div class="lobby-layout"><section class="lobby-story panel">
      ${art(campaign?.id||selected,0,'lobby-art',campaign?.title||'시나리오 그림')}
      <div class="lobby-story-copy"><div class="eyebrow">선택한 이야기</div><h2>${esc(campaign?.title)}</h2><p>${esc(campaign?.description||campaign?.subtitle)}</p><div class="tag-row">${(campaign?.contentNotes||[]).map(n=>`<span>${esc(n)}</span>`).join('')}</div>
      ${host?`<label class="field"><span>다른 이야기 선택</span><select id="lobby-campaign">${catalog.map(c=>`<option value="${slug(c.id)}" ${c.id===selected?'selected':''}>${esc(c.title)}</option>`).join('')}</select></label>`:''}
      ${renderPlayMode(campaign,players.length)}
      <div class="lobby-objective"><span>이야기의 목표</span><p>${esc(campaign?.objective||'첫 장면을 읽고, 어디로 갈지 골라 보세요.')}</p></div></div>
    </section><section class="lobby-people panel"><div class="panel-heading"><h2>${players.length===1?'내 인물':'우리의 일행'}</h2><span>${players.length} / 4</span></div>
      <div class="party-list">${players.map((p,i)=>`<div class="lobby-person"><div class="avatar color-${i}">${esc(classIcon(p.classId))}</div><div class="person-copy"><b>${esc(p.name)} ${p.id===state.meId?'<small>나</small>':''}</b><span>${esc(cname(p.classId))}${p.id===state.hostId?' · 방장':''}</span></div><span class="connection-small">${p.connected===false?'연결 대기':'준비됨'}</span></div>`).join('')}${Array.from({length:Math.max(0,4-players.length)},()=>`<div class="empty-seat"><span>+</span><p>${state.mode==='local'?'빈 자리':'동료를 기다리는 자리'}</p></div>`).join('')}</div>
      ${state.mode!=='local'?`<label class="field"><span>이번 이야기에서의 내 직업</span><select id="lobby-class">${classOptions(players.find(p=>p.id===state.meId)?.classId)}</select></label>`:`<div class="local-professions">${players.map(p=>`<label class="field"><span>${esc(p.name)}의 직업</span><select data-local-class="${esc(p.id)}">${classOptions(p.classId,campaign,p.id)}</select></label>`).join('')}</div>`}
      ${professionDetail(classFor(players.find(p=>p.id===state.meId)?.classId))}
      <div class="quiet-note"><b>능력치는 직업에 따라 고정됩니다.</b><p>주사위는 행동의 결과를 정할 때만 굴립니다. 이야기마다 전용 직업 네 개가 있고, 각자 기본 공격과 고유 기술 하나를 갖습니다.</p></div>
      <fieldset class="opening-mode-picker story-length-picker" ${host?'':'disabled'}><legend>어느 길이로 기록할까요?</legend><label><input type="radio" name="story-length" value="basic" ${storyLength==='basic'?'checked':''}><span><b>기본</b><small>약 ${esc(campaign?.estimatedMinutes||'35–60')}분 · 서로 다른 상대 ${Number(campaign?.lengthModes?.find(mode=>mode.id==='basic')?.encounterCount)||3}종 · 전투는 선택</small></span></label><label><input type="radio" name="story-length" value="epic" ${storyLength==='epic'?'checked':''}><span><b>서사시</b><small>약 ${esc(campaign?.lengthModes?.find(mode=>mode.id==='epic')?.estimatedMinutes||'70–110')}분 · 서로 다른 상대 ${Number(campaign?.lengthModes?.find(mode=>mode.id==='epic')?.encounterCount)||5}종 · 전투는 선택</small></span></label></fieldset>
      <p class="small muted">각자 직업에 맞는 첫 장을 읽은 뒤, 이야기 속에서 만납니다. 시간은 읽기·대화 속도에 따라 달라지며 전원 사망하면 일찍 끝날 수 있어요.</p>
      ${host?`${needDifferentJobs?'<p class="opening-job-warning" role="status">서로 다른 직업을 골라 주세요. 각 인물의 첫 장이 하나의 사건으로 이어집니다.</p>':''}<button class="button primary full" data-action="start" data-busy-guard type="button" ${state.canStart===false||needDifferentJobs?'disabled':''}>첫 장면 펼치기 <span>↗</span></button>`:'<div class="waiting-note"><span class="pulse-dot"></span>방장이 이야기를 시작하기를 기다리고 있어요.</div>'}
      <p class="small muted">1명으로도 시작할 수 있어요. 온라인에서는 시작 전에 참가해 주세요.</p>
    </section></div>`;
  highlightNames($('lobby-view'));hydrateArt();sound.scene(campaign?.id||selected,'calm');
}
function renderGame(newScene=false){
  if(game().opening?.active){renderOpening(newScene);return;}
  if(meetingStep&&game().opening?.meeting){renderMeeting(newScene);return;}
  const g=battleFrame?.view||game(),s=g.scene,players=g.players||state.players||[],active=players.find(p=>p.id===g.activePlayerId),me=players.find(p=>p.id===state.meId);
  const candidate=lastNarrativeResult(g),readingResult=candidate?.meeting&&meetingViewed?null:candidate,observation=isObservation(g.lastResult)?g.lastResult:null;
  if(!g.sparks)draft.spark=false;if(me?.focus===false)draft.preparation=false;
  const focused=document.activeElement,focusId=focused?.id,selection=focused?.selectionStart;
  const notebookScroll=$('notebook-body')?.scrollTop||0;
  const folds=newScene?new Map():new Map([...$('game-view').querySelectorAll('details[data-fold]')].map(el=>[el.dataset.fold,el.open]));
  const focusedFold=focused?.tagName==='SUMMARY'?focused.parentElement?.dataset.fold:null;
  const hasEnded=g.phase==='ended'||s.ending;
  const pressure=g.pressure||{value:0,max:8,label:'긴장'};
  $('game-view').innerHTML=`
    <div class="session-bar"><div class="session-title"><span class="tiny-star" aria-hidden="true">✦</span><div><small>${esc(g.title)} <span data-story-length="${g.storyLength||'basic'}">· ${g.storyLength==='epic'?'서사시':'기본'}</span></small><span>${state.mode==='local'?'함께 앉은 탁자':`ROOM ${esc(state.code)}`}</span></div></div><div class="session-actions"><button class="text-button" data-action="export-chronicle" type="button">연대기 TXT</button><button class="text-button" data-action="export" type="button" ${state.mode!=='local'&&state.hostId!==state.meId?'disabled title="방장이 저장 파일을 내보낼 수 있습니다."':''}>저장 파일</button><button class="text-button" data-action="leave" type="button">나가기</button></div></div>
    ${state.connected===false&&state.mode!=='local'?'<div class="reconnect-banner" role="status">서버에 다시 연결하는 중입니다. 연결되면 같은 자리에서 이어갑니다. 새로고침 전에 잠시 기다려 주세요.</div>':''}
    <div class="table-layout ${g.combat?'battle-layout':''}"><article class="story-column" id="story-column">
      ${g.combat?renderBattle(g,players,me):`      <div class="scene-visual">${art(g.campaignId,s.art,'scene-art',`${s.location||s.title} · ${s.title}`)}<div class="scene-visual-shade"></div><div class="scene-location"><span class="eyebrow">${hasEnded?'EPILOGUE':`CHAPTER ${String(s.chapter||1).padStart(2,'0')}`}</span><span>${esc(s.location||'이야기의 한 장면')}</span></div></div>
      <div class="story-paper">
        ${readingResult?renderResult(readingResult):!hasEnded?renderArrival(g):''}${me?.life==='dead'&&!hasEnded?'<div class="death-notice"><b>이 인물은 사망했습니다.</b><p>살아 있는 동료가 행동을 이어갑니다. 비밀을 나누거나 한 번의 잔향으로 도울 수 있고, 이야기에 부활 지점이 나타나면 귀환을 시도할 수 있어요.</p></div>':''}
        <div class="scene-heading"><div class="eyebrow">${hasEnded?'우리의 이야기가 남긴 것':'다음 한 장'}</div><h1 id="scene-title" tabindex="-1">${esc(s.title)}</h1></div>
        ${renderReading(s,{ended:hasEnded,combat:Boolean(g.combat)})}
        ${s.dialogue?.text?`<blockquote class="dialogue"><span class="quote-mark" aria-hidden="true">“</span><p>${esc(s.dialogue.text)}</p><cite>${esc(s.dialogue.who||'누군가')}</cite></blockquote>`:''}
        ${observation?renderObservation(observation):''}
        ${!hasEnded?renderOrientation(s):''}
        ${hasEnded?renderEnding(g):g.combat?renderCombat(g,players,me):`
          ${(s.details||[]).length?`<div class="examine-row"><span>잠깐 살펴보기</span><div>${s.details.map(d=>`<button class="examine-button" data-detail="${esc(d.id)}" type="button" >⌕ ${esc(d.label)}${d.read?' ✓':''}</button>`).join('')}</div><small>관찰에는 주사위를 굴리지 않습니다.</small></div>`:''}
          ${renderResurrection(g,players)}<section class="action-section" aria-labelledby="action-heading"><div class="action-heading"><div><span class="eyebrow">YOUR NEXT MOVE</span><h2 id="action-heading">이제, 어떻게 할까요?</h2></div><span class="turn-pill ${g.canAct?'my-turn':''}">${g.canAct?'당신의 차례':esc(active?.name||'동료')+'의 차례'}</span></div>
          <p class="action-instruction">행동을 고르면 결과와 필요한 소지품을 먼저 확인합니다.</p>
          <div class="choices">${(s.choices||[]).map((c,i)=>`<button class="choice" data-choice="${esc(c.id)}" type="button" ${!g.canAct||state.connected===false?'disabled':''}><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span class="choice-body"><b>${esc(c.label)}</b><small>${c.automatic?'선택으로 결정 · 주사위 없음':`${esc(STAT[c.stat]||c.stat||'행동')} 판정${Number.isFinite(c.dc)?` · 목표 ${c.dc}`:''}`}${c.harmRisk?` <span class="choice-harm">· ♥ 최대 -${Number(c.harmRisk)||0}${Number(c.harmRisk)>=3?' · 사망 위험':''}</span>`:''}</small>${renderChoiceItems(c)}${c.hint?`<span class="choice-hint">${esc(c.hint)}</span>`:''}</span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
          ${renderLockedChoices(s.lockedChoices)}${renderTactics(g,me)}
          ${!g.canAct?`<div class="waiting-actions"><p>${esc(active?.name||'동료')}의 이야기를 듣고, 다음 행동에 힘을 보태 주세요.</p><button class="button quiet" data-action="assist" data-busy-guard type="button" ${!g.canAssist?'disabled':''}>${me?.assisting?'협력하는 중 ✓':me?.life==='dead'?'잔향으로 돕기 · 한 번만':'동료 돕기 · +1'}</button>${state.meId===state.hostId&&active?.connected===false?'<button class="button quiet" data-action="pass" type="button">연결 끊긴 동료 차례 넘기기</button>':''}</div>`:`<div class="pass-row"><button class="text-button" data-action="pass" type="button">다음 동료에게 차례 넘기기 →</button></div>`}
          </section>`}
      </div>
`}
    </article><aside class="table-sidebar" aria-label="일행과 기록">
      <section class="party-panel panel"><div class="panel-heading"><h2>탁자에 앉은 사람들</h2><span>${players.length} / 4</span></div><div class="compact-party">${players.map((p,i)=>`<div class="party-member ${p.id===g.activePlayerId?'active':''} ${p.life==='dead'?'fallen':''}"><div class="avatar color-${i}">${esc(classIcon(p.classId))}</div><div><b>${esc(p.name)}${p.id===state.meId?'<small>나</small>':''}</b><span>${esc(p.className||cname(p.classId))}${p.assisting?' · 협력 +1':''}${p.connected===false?' · 자리 비움':''}</span>${healthMarkup(p)}${combatStatusMarkup(g,p.id)}</div>${p.id===g.activePlayerId?'<span class="active-star" title="현재 차례">✦</span>':''}${state.mode==='local'&&p.id!==state.meId?`<button class="seat-button" data-seat="${esc(p.id)}" type="button" title="${esc(p.name)}의 비밀 카드 확인">카드</button>`:''}</div>`).join('')}</div>
      ${professionSummary(me)}<div class="pressure-block"><div><span>${esc(pressure.label)}</span><b>${pressure.value} <small>/ ${pressure.max}</small></b></div><div class="pressure-track" role="meter" aria-label="${esc(pressure.label)}" aria-valuemin="0" aria-valuemax="${pressure.max}" aria-valuenow="${pressure.value}">${Array.from({length:pressure.max||8},(_,i)=>`<i class="${i<pressure.value?'filled':''}"></i>`).join('')}</div><p>위기가 가득 차면 이후 판정의 목표가 +1 높아집니다.</p></div>
      <button class="secret-button" data-action="secret" type="button"><span>✉</span><div><b>나만의 비밀 카드</b><small>공유할 순간은 당신이 정해요</small></div><span>↗</span></button>
      </section>
      ${renderInventory(g)}<section class="notebook panel"><div class="notebook-tabs" role="tablist" aria-label="탁자 기록"><button id="tab-clues" data-tab="clues" role="tab" aria-selected="${activeTab==='clues'}" aria-controls="notebook-body" type="button">단서 <small>${(g.clues||[]).length}</small></button><button id="tab-journal" data-tab="journal" role="tab" aria-selected="${activeTab==='journal'}" aria-controls="notebook-body" type="button">연대기</button><button id="tab-chat" data-tab="chat" role="tab" aria-selected="${activeTab==='chat'}" aria-controls="notebook-body" type="button">대화</button></div><div id="notebook-body" class="notebook-body" role="tabpanel" aria-labelledby="tab-${activeTab}">${renderNotebook()}</div></section>
      <div class="table-caption"><span>✧</span><p>놀라운 이야기는<br>동료의 한마디에서 시작되기도 해요.</p></div>
    </aside></div>`;
  highlightNames($('game-view'));hydrateArt();hydrateBattleSprites($('game-view'));
  for(const fold of $('game-view').querySelectorAll('details[data-fold]'))if(folds.has(fold.dataset.fold))fold.open=folds.get(fold.dataset.fold);
  if(!newScene&&focusedFold){const fold=[...$('game-view').querySelectorAll('details[data-fold]')].find(el=>el.dataset.fold===focusedFold);fold?.querySelector('summary')?.focus({preventScroll:true});}
  if(!newScene&&focusId){const input=$(focusId);if(input){input.focus({preventScroll:true});if(typeof selection==='number'&&input.setSelectionRange){try{input.setSelectionRange(selection,selection);}catch{}}}}
  if($('notebook-body'))$('notebook-body').scrollTop=notebookScroll;
  if(newScene)window.scrollTo({top:0,behavior:'instant'});
}
function openingSessionBar(g){
  return `<div class="session-bar"><div class="session-title"><span class="tiny-star" aria-hidden="true">✦</span><div><small>${esc(g.title)} <span data-story-length="${g.storyLength||'basic'}">· ${g.storyLength==='epic'?'서사시':'기본'}</span></small><span>${state.mode==='local'?'한 기기로 함께':`ROOM ${esc(state.code)}`}</span></div></div><div class="session-actions"><button class="text-button" data-action="export" type="button" ${state.mode!=='local'&&state.hostId!==state.meId?'disabled title="방장이 저장 파일을 내보낼 수 있습니다."':''}>저장 파일</button><button class="text-button" data-action="leave" type="button">나가기</button></div></div>${state.connected===false&&state.mode!=='local'?'<div class="reconnect-banner" role="status">서버에 다시 연결하고 있어요. 연결되면 같은 자리에서 이어갑니다.</div>':''}`;
}
function openingProgress(g){
  const opening=g.opening;
  return `<aside class="opening-progress panel" aria-label="동료의 첫 장 진행"><div class="panel-heading"><h2>${opening.total===1?'이야기가 이어질 곳':'같은 곳을 향하는 발걸음'}</h2><span>${opening.readyCount} / ${opening.total}</span></div><p class="opening-destination">${esc(opening.meetingLocation)}</p><ol>${(opening.participants||[]).map(p=>`<li data-opening-player="${esc(p.id)}"><div><b>${esc(p.name)}${p.id===state.meId?'<small>나</small>':''}</b><span>${esc(p.className)}</span></div><p>${p.deferred?'합류 예정':p.ready?'도착했어요':`${Number(p.completed)||0} / 2 장면`}${p.connected===false?' · 연결 끊김':''}</p>${state.mode!=='local'&&state.meId===state.hostId&&p.connected===false&&!p.ready?`<button class="text-button" data-opening-defer="${esc(p.id)}" type="button">이 동료를 기다리지 않고 합류하기</button>`:''}</li>`).join('')}</ol>${opening.total>1?`<p class="opening-privacy-note">${state.mode==='local'?'각자의 첫 장은 혼자 읽어요. 두 장면을 마치면 다음 사람에게 기기를 넘겨 주세요.':'동료도 자기 이야기를 진행하고 있어요. 서로 겪은 일은 만나서 나눕니다.'}</p>`:''}</aside>`;
}
function restoreOpeningView(focused,folds,newScene){
  highlightNames($('game-view'));hydrateArt();
  for(const fold of $('game-view').querySelectorAll('details[data-fold]'))if(folds.has(fold.dataset.fold))fold.open=folds.get(fold.dataset.fold);
  if(!newScene&&focused){
    const key=['action','choice','openingDefer'].find(name=>focused.dataset?.[name]);
    const next=key?[...$('game-view').querySelectorAll('button')].find(button=>button.dataset[key]===focused.dataset[key]):null;
    next?.focus({preventScroll:true});
  }
  if(newScene)window.scrollTo({top:0,behavior:'instant'});
}
function renderOpening(newScene=false){
  const g=game(),s=g.scene,mine=g.opening.mine,me=(g.players||[]).find(p=>p.id===state.meId);
  const focused=document.activeElement,folds=new Map([...$('game-view').querySelectorAll('details[data-fold]')].map(el=>[el.dataset.fold,el.open]));
  if(privateOpeningCover(g)){
    // There is deliberately no personal scene, result, role card or choice in this DOM.
    $('game-view').innerHTML=`${openingSessionBar(g)}<div class="opening-layout"><article class="opening-handoff story-paper" aria-labelledby="opening-receive-title"><span class="opening-envelope" aria-hidden="true">✉</span><div class="eyebrow">A PAGE FOR ONE READER</div><h1 id="opening-receive-title">${esc(me?.name||'다음 사람')}에게 기기를 건네 주세요.</h1><p class="opening-identity">${esc(me?.className||cname(me?.classId))}의 첫 장</p><p>자기 이야기는 먼저 혼자 읽어요.<br>준비되면 아래 버튼을 눌러 주세요.</p><button class="button primary" data-action="opening-receive" type="button">${esc(me?.name||'나')}의 첫 장 펼치기 <span>↗</span></button></article>${openingProgress(g)}</div>`;
    restoreOpeningView(focused,folds,newScene);return;
  }
  const next=(g.opening.participants||[]).find(p=>p.id!==state.meId&&!p.ready);
  $('game-view').innerHTML=`${openingSessionBar(g)}<div class="opening-layout"><article class="story-column opening-story" id="story-column"><div class="scene-visual">${art(g.campaignId,s.art,'scene-art',s.location||s.title)}<div class="scene-visual-shade"></div><div class="scene-location"><span class="eyebrow">${mine.ready?'THE MEETING PLACE':`MY FIRST CHAPTER · ${Math.min(2,mine.stage+1)} / 2`}</span><span>${esc(s.location)}</span></div></div><div class="story-paper"><p class="opening-identity">${esc(me?.name)} · ${esc(me?.className||cname(me?.classId))}</p>${g.lastResult?renderResult(g.lastResult):''}<div class="scene-heading"><div class="eyebrow">${mine.ready?'첫 장을 덮으며':'아직 서로를 만나기 전에'}</div><h1 id="scene-title" tabindex="-1">${esc(s.title)}</h1></div>${renderReading(s)}${s.objective&&!mine.ready?`<p class="opening-objective">${esc(s.objective)}</p>`:''}${mine.ready?`<div class="opening-ready"><p>${g.opening.total===1?'첫 장의 끝에서 다음 이야기를 기다립니다.':`이곳에 도착한 사람은 ${g.opening.readyCount}명입니다. 모두의 발걸음이 닿으면 함께 이야기를 이어갑니다.`}</p>${mine.preparation?`<p class="opening-preparation">첫 장에서 얻은 준비 <b>+${Number(mine.preparation)||0}</b><span>전투·부활을 제외한 첫 이야기 판정에 한 번 더해집니다.</span></p>`:''}${state.mode==='local'&&next?`<button class="button primary" data-action="opening-next" type="button">${esc(next.name)}에게 기기 넘기기 <span>→</span></button>`:''}</div>`:`<section class="action-section" aria-labelledby="action-heading"><div class="action-heading"><div><span class="eyebrow">YOUR NEXT MOVE</span><h2 id="action-heading">어떻게 걸음을 옮길까요?</h2></div></div><div class="choices">${(s.choices||[]).map((c,i)=>`<button class="choice" data-choice="${esc(c.id)}" type="button" ${!g.canAct||state.connected===false?'disabled':''}><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span class="choice-body"><b>${esc(c.label)}</b><small>${c.automatic?'선택으로 결정 · 주사위 없음':`${esc(STAT[c.stat]||'행동')} 판정 · 목표 ${Number(c.dc)||0}`}${c.harmRisk?` <span class="choice-harm">· ♥ 최대 -${Number(c.harmRisk)||0}</span>`:''}</small></span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>`}<div class="opening-private-tools"><button class="text-button" data-action="secret" type="button">내 인물의 비밀 카드 ↗</button>${mine.history?.length?`<details data-fold="my-opening-history"><summary>내가 지나온 첫 장</summary>${mine.history.map(entry=>`<article><h3>${esc(entry.sceneTitle)}</h3><small>${esc(entry.action)}</small><p>${esc(entry.text)}</p></article>`).join('')}</details>`:''}</div></div></article>${openingProgress(g)}</div>`;
  restoreOpeningView(focused,folds,newScene);
}
function meetingCopy(meeting){
  const start=meeting.startScene;
  return `<div class="meeting-accounts">${(meeting.text||[]).map((paragraph,index)=>`<p${index?' class="meeting-account"':''}>${esc(paragraph)}</p>`).join('')}</div>${start?`<section class="meeting-start-scene" data-meeting-start="${esc(start.id)}" aria-label="우리가 함께 시작한 장면"><p class="eyebrow">우리가 함께 시작한 장면</p><h2>${esc(start.title)}</h2><p class="meeting-start-location">${esc(start.location)}</p><div class="meeting-start-prose">${(start.text||[]).map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}</div></section>`:''}`;
}
function renderMeeting(newScene=false){
  const g=game(),meeting=g.opening.meeting,receipt=g.opening.mine?.history?.at(-1),personal=meetingStep==='receipt'&&receipt;
  const movedOn=meeting.startScene&&g.scene.id!==meeting.startScene.id;
  $('game-view').innerHTML=`${openingSessionBar(g)}<article class="story-column meeting-story"><div class="story-paper"><div class="eyebrow">${personal?'THE LAST WORD OF YOUR FIRST CHAPTER':g.partySize===1?'THE STORY BEGINS':'OUR PATHS MEET'}</div><h1 id="scene-title" tabindex="-1">${esc(personal?receipt.sceneTitle:meeting.title)}</h1>${personal?renderResult(receipt):`<p class="meeting-location">${esc(meeting.location)}</p>${meetingCopy(meeting)}`}<div class="meeting-next"><button class="button primary" data-action="${personal?'opening-meeting':'opening-main'}" type="button">${personal?(g.partySize===1?'다음 장으로 발걸음 옮기기':'이제 일행과 만나기'):movedOn?'지금 이어지는 장면으로':(g.partySize===1?'다음 장 펼치기':'함께 다음 장 펼치기')} <span>→</span></button></div></div></article>`;
  highlightNames($('game-view'));hydrateArt();if(newScene)window.scrollTo({top:0,behavior:'instant'});
}
function confirmOpeningDefer(playerId){
  const person=game()?.opening?.participants?.find(p=>p.id===playerId);
  if(!person||person.ready||person.connected!==false||state.meId!==state.hostId)return;
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">KEEP A PLACE AT THE TABLE</div><h2 id="info-title">${esc(person.name)}의 도착을 기다리지 않을까요?</h2><p class="modal-intro">이미 겪은 일은 그대로 남고, 아직 고르지 않은 행동은 건너뜁니다. 건너뛴 장면에서 준비 보너스를 얻지는 않습니다.</p><p class="modal-intro">이 인물도 만남의 자리에 합류합니다. 다시 연결되면 같은 인물로 본편을 이어갈 수 있어요.</p><div class="dialog-actions"><button class="button quiet" data-close="info-dialog" type="button">조금 더 기다리기</button><button class="button primary" data-action="opening-defer-confirm" data-player-id="${esc(person.id)}" data-busy-guard type="button">남은 첫 장 건너뛰기</button></div>`);
}
function combatStatusMarkup(g,playerId){
  if(!g.combat)return '';
  const status=(g.combat.statuses||[]).find(s=>s.id===playerId)||{};
  return `<div class="combat-status">${status.shield?`<span>방어 ${status.shield}</span>`:''}${status.boost?`<span>다음 공격 +${status.boost}</span>`:''}${(g.combat.actedIds||[]).includes(playerId)?'<span class="acted">행동 완료</span>':''}</div>`;
}
const isObservation = result => ['observe','safe'].includes(result?.grade);
function lastNarrativeResult(g){
  if(!isObservation(g.lastResult))return g.lastResult;
  const entries=g.journal||[];
  // Observation never replaces a journey, a revival, or the end of a battle.
  // Reuse the real receipt only when the following entries still belong here.
  let index=entries.length-1;
  while(index>=0&&(isObservation(entries[index])||entries[index].grade==='reveal'))index--;
  const recent=entries[index],following=entries.slice(index+1);
  if(!recent?.text||!following.length||following.some(entry=>entry.sceneTitle!==g.scene.title||(!isObservation(entry)&&entry.grade!=='reveal')))return null;
  if(recent.combat)return ['victory','defeat'].includes(recent.combatEvent)?recent:null;
  const arrival=g.scene.arrival;
  if(recent.sceneTitle===g.scene.title)return recent;
  if(arrival&&recent.sceneTitle===arrival.fromSceneTitle&&recent.action===arrival.action&&recent.nextSceneTitle===g.scene.title)return recent;
  return null;
}
function renderArrival(g){
  const arrival=g.scene.arrival;if(!arrival?.text)return '';
  // A surviving later battle/revival record must not be followed by an older arrival.
  const recent=g.chronicle?.at(-1);
  if(recent&&['combat','revival'].includes(recent.kind))return '';
  return `<section class="scene-arrival" aria-label="이곳에 이르기까지"><small>${esc(arrival.fromSceneTitle||'앞선 장면')}${arrival.action?` · ${esc(arrival.action)}`:''}</small><p>${esc(arrival.text)}</p></section>`;
}
function renderObservation(result){
  return `<details class="observation-result" data-fold="observation-${esc(game()?.scene.id)}-${esc(result.action)}" open><summary>살펴본 것 · ${esc(result.action)}</summary><div><p>${esc(result.text)}</p>${resultChanges(result)}</div></details>`;
}
function renderOrientation(scene){
  const rows=[['지금 상황',scene.summary,'summary'],['해결할 일',scene.objective,'objective'],['주의할 점',scene.stakes,'stakes']].filter(([,text])=>text);
  if(!rows.length)return '';
  return `<details class="scene-orientation" data-fold="orientation" aria-label="장면 안내"><summary>장면 정리</summary><dl>${rows.map(([label,text,key])=>`<div data-context="${key}"><dt>${label}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl></details>`;
}
function renderReading(scene,{ended=false,combat=false}={}){
  const full=Array.isArray(scene.text)?scene.text:[scene.text];
  const reading=!combat&&scene.reading?scene.reading:{paragraphs:full,echoes:[],personal:[],fate:''};
  const paragraphs=(reading.paragraphs||[]).filter(Boolean),echoes=(reading.echoes||[]).filter(Boolean),personal=(reading.personal||[]).filter(Boolean);
  const visibleEchoes=!ended&&echoes.length<=2&&echoes.join('').length<=240?echoes:[];
  const extra=[...paragraphs.slice(3),...(visibleEchoes.length?[]:echoes)];
  const prose=values=>values.map(text=>`<p>${esc(text)}</p>`).join('');
  return `<div class="scene-prose"><div class="prose-main">${prose(paragraphs.slice(0,3))}</div>${visibleEchoes.length?`<div class="scene-echoes">${prose(visibleEchoes)}</div>`:''}${reading.fate?`<p class="story-fate">${esc(reading.fate)}</p>`:''}${extra.length||personal.length?`<details class="story-traces" data-fold="traces-${esc(scene.id)}"><summary>이 선택이 남긴 흔적</summary><div class="traces-prose">${prose(extra)}${personal.length?`<div class="personal-epilogues">${prose(personal)}</div>`:''}</div></details>`:''}</div>`;
}
const itemNames=values=>[...new Set((Array.isArray(values)?values:[]).map(value=>typeof value==='string'?value:value?.name).filter(Boolean))];
function renderChoiceItems(choice){
  const consumed=itemNames(choice.consumeItems),used=itemNames(choice.useItems).filter(name=>!consumed.includes(name));
  return `${used.length?`<span class="choice-item-note">소지품 사용 · ${used.map(esc).join(', ')}</span>`:''}${consumed.length?`<span class="choice-item-note consumed">실행하면 소모 · ${consumed.map(esc).join(', ')}</span>`:''}`;
}
function renderLockedChoices(choices=[]){
  if(!choices.length)return '';
  return `<details class="locked-choices"><summary>준비하면 고를 수 있는 행동 <span>${choices.length}개</span></summary><div>${choices.map(choice=>`<article data-locked-choice="${esc(choice.id)}"><h3>${esc(choice.label)}</h3><p>${esc(choice.reason||'이 행동에 필요한 조건이 아직 갖춰지지 않았습니다.')}</p></article>`).join('')}</div></details>`;
}
function renderInventory(g){
  const items=g.inventory||[],choices=g.scene?.choices||[];
  return `<section class="inventory-panel panel" aria-labelledby="inventory-title"><div class="panel-heading"><h2 id="inventory-title">일행의 소지품</h2><span>${items.length}개</span></div><p class="inventory-intro">함께 쓰는 물건입니다. 알아낸 사실은 아래 단서에 남습니다.</p>${items.length?`<div class="inventory-list">${items.map(item=>{
    const options=!g.combat&&g.phase!=='ended'?(item.actionIds||[]).map(id=>choices.find(c=>c.id===id)).filter(Boolean):[];
    const usable=Boolean(item.usableHere&&options.length);
    return `<details class="inventory-item ${usable?'usable':''}" data-inventory-item="${esc(item.id)}" ${usable?'open':''}><summary><b>${esc(item.name)}</b><span class="item-availability">${usable?'이 장면에서 쓸 수 있음':'소지품 설명 보기'}</span></summary><div class="item-copy"><p>${esc(item.description||'')}</p>${item.useHint?`<p class="item-use-hint"><b>쓰임새</b> ${esc(item.useHint)}</p>`:''}${options.length?`<div class="item-actions">${options.map(choice=>`<button class="button quiet small full" data-choice="${esc(choice.id)}" data-inventory-choice="${esc(item.id)}" type="button" ${!g.canAct||state.connected===false?'disabled':''}>${esc(choice.label)} <span aria-hidden="true">↗</span></button>`).join('')}</div>`:'<small>이 물건이 필요한 선택지가 나오면 여기서도 고를 수 있습니다.</small>'}</div></details>`;
  }).join('')}</div>`:'<p class="inventory-empty">아직 챙긴 물건이 없습니다. 주변을 관찰하거나 행동의 결과로 소지품을 얻을 수 있습니다.</p>'}</section>`;
}
function renderTactics(g,me,combat=false){
  const canAct=Boolean(combat?g.combat?.canAct:g.canAct)&&state.connected!==false&&!showingRoll;
  return `${!combat&&me?.openingBonus?`<p class="opening-bonus-note">첫 장에서 얻은 준비 <b>+${Number(me.openingBonus)||0}</b>가 전투·부활을 제외한 첫 이야기 판정에 한 번 더해져요.</p>`:''}<details class="tactics ${combat?'combat-tactics':''}" ${draft.spark||draft.preparation?'open':''}><summary>이번 판정에 보너스 더하기 <span>+</span></summary><div class="tactics-content"><label class="spark-option"><input id="spend-spark" type="checkbox" ${draft.spark?'checked':''} ${!canAct||!g.sparks?'disabled':''}><span><b>운명 조각 사용 · +3</b><small>파티 공용 ${g.sparks??0}개 남음. 주사위를 굴리는 행동에만 사용합니다.</small></span></label><label class="spark-option preparation-option"><input id="use-preparation" type="checkbox" ${draft.preparation?'checked':''} ${!canAct||me?.focus===false?'disabled':''}><span><b>준비한 수단 사용 · +2</b><small>${me?.focus===false?'이 인물은 준비한 수단을 이미 사용했습니다.':'인물마다 이야기 전체에서 한 번. 이번 주사위 판정에 미리 챙긴 준비를 사용합니다.'}</small></span></label></div></details>`;
}
function renderBattle(g,players,me){
  const context=`<details class="battle-story-context" data-fold="battle-story-context"><summary>이야기와 직전 행동 다시 읽기</summary><div>${g.lastResult?renderResult(g.lastResult):''}${renderReading(g.scene,{ended:false,combat:true})}</div></details>`;
  return renderBattleScreen(g,{meId:state.meId,connected:state.connected!==false,locked:Boolean(showingRoll),reduceMotion:dice.mode==='reduce',art,iconFor:classIcon,classNameFor:cname,commands:renderCombat(g,players,me),context});
}
function renderCombat(g,players,me){
  const c=g.combat;if(!c)return '';
  const basic=c.actions?.basic||{},ability=c.actions?.ability||{};
  const canAct=Boolean(c.canAct)&&state.connected!==false&&!showingRoll;
  const active=players.find(p=>p.id===g.activePlayerId);
  const targets=c.targetOptions||players.filter(p=>p.life!=='dead');
  if(!targets.some(p=>p.id===combatTarget))combatTarget=targets.find(p=>p.id===me?.id)?.id||targets[0]?.id||'';
  return `${me?.life==='dead'?'<div class="death-notice battle-death-notice"><b>이 인물은 사망했습니다.</b><p>살아 있는 동료가 행동을 이어갑니다. 잔향으로 한 번 도울 수 있고, 이후 부활 장소에서 귀환을 시도할 수 있어요.</p></div>':''}    ${ability.target==='ally'?`<label class="field combat-target-field"><span>${esc(ability.name||'고유 기술')}을 받을 동료</span><select id="combat-target" ${!canAct||!ability.available?'disabled':''}>${targets.map(p=>`<option value="${esc(p.id)}" ${p.id===combatTarget?'selected':''}>${esc(p.name)}${p.id===me?.id?' (나)':''} · 생명 ${p.health??0}/${p.maxHealth||3}</option>`).join('')}</select></label>`:''}
    <div class="combat-actions"><button class="combat-action basic-action" data-combat="basic" type="button" ${!canAct?'disabled':''}><span class="move-label">기본 공격 · 계속 사용</span><b>${esc(basic.name||'기본 공격')}</b><p>${esc(basic.description||'직업의 주 능력치로 적을 공격합니다.')}</p><small>${esc(STAT[basic.stat]||'주 능력')} 판정 · 성공 피해 2</small><span class="move-arrow" aria-hidden="true">↗</span></button><button class="combat-action ability-action" data-combat="ability" type="button" ${!canAct||!ability.available?'disabled':''}><span class="move-label">고유 기술 · ${(c.usedAbilityIds||[]).includes(me?.id)?'이번 전투 사용 완료':me?.life==='dead'?'사망하여 사용 불가':'전투마다 한 번'}</span><b>${esc(ability.name||'고유 기술')}</b><p>${esc(ability.description||'직업의 특수한 방법으로 위기를 바꿉니다.')}</p><small>${['strike','drain'].includes(ability.type)?'주사위 판정으로 효과 결정':'판정 없이 효과 적용'} · 차례 소모</small><span class="move-arrow" aria-hidden="true">${ability.available?'↗':'✓'}</span></button></div>
    ${renderTactics(g,me,true)}
    ${!canAct&&!showingRoll?`<div class="waiting-actions"><p>${me?.life==='dead'?'남은 동료에게 마지막 조언을 전할 수 있어요.':`${esc(active?.name||'동료')}의 행동을 기다리며 힘을 보태 주세요.`}</p><button class="button quiet" data-action="assist" data-busy-guard type="button" ${!g.canAssist?'disabled':''}>${me?.assisting?'협력하는 중 ✓':me?.life==='dead'?'잔향으로 돕기 · 한 번만':'동료 돕기 · +1'}</button>${state.meId===state.hostId&&active?.connected===false?'<button class="button quiet" data-action="pass" type="button">연결 끊긴 동료 차례 넘기기</button>':''}</div>`:''}
`;
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
function resultChanges(result){
  const itemChanges=[...(result.gainedItems||[]).map(i=>({kind:'gained',name:i.name,text:`획득 · ${i.name}`})),...(result.usedItems||[]).map(i=>({kind:'used',name:i.name,text:`사용 · ${i.name}`})),...(result.lostItems||[]).map(i=>({kind:'lost',name:i.name,text:`가방에서 빠짐 · ${i.name}`}))];
  const changes=[...new Set((result.changes||[]).filter(Boolean))].filter(text=>!text.startsWith('다음 장면:')&&!itemChanges.some(item=>text.includes(item.name)&&(text.startsWith('소지품 획득:')||text.startsWith('소지품 소모:'))));
  if(!changes.length&&!itemChanges.length)return '';
  return `<div class="result-changes" role="list" aria-label="이 행동으로 달라진 것">${changes.map(text=>`<span role="listitem" data-result-change>${esc(text)}</span>`).join('')}${itemChanges.map(item=>`<span role="listitem" class="item-change ${item.kind}" data-item-change="${item.kind}">${esc(item.text)}</span>`).join('')}</div>`;
}
function renderResult(r){
  const hasRoll=Number.isFinite(r.roll),grade=GRADE[r.grade]||'행동의 결과',narrative=r.narrativeText||r.text;
  return `<section class="last-result grade-${esc(r.grade||'automatic')}" aria-label="직전 행동의 결과"><div class="result-top"><small class="result-actor">${r.actor?`${esc(r.actor)}의 선택 · `:''}${esc(r.action||'이야기에 남은 변화')}</small>${hasRoll?`<small class="result-roll-stamp">D20 ${r.roll}</small>`:''}<span class="result-grade">${esc(grade)}</span></div><p>${esc(narrative)}</p><details class="result-details" data-fold="result-${esc(r.id||r.text)}"><summary>판정과 변화</summary><div>${r.narrativeText&&r.narrativeText!==r.text?`<p class="result-receipt">${esc(r.text)}</p>`:''}${hasRoll?`<div class="result-dice"><span>D20</span><b>${r.roll}</b><small>+ ${(r.bonus??(Number(r.total)-Number(r.roll)))||0} = <strong>${r.total}</strong> / 목표 ${r.dc}</small></div>`:'<p class="automatic-note">주사위 없이 확인한 변화입니다.</p>'}${resultChanges(r)}${r.enemyRolls?.length?`<details class="enemy-rolls"><summary>적의 주사위 판정</summary>${r.enemyRolls.map(check=>`<p>${esc(game()?.players?.find(p=>p.id===check.targetId)?.name||'대상')} · D20 ${check.roll} · 피해 ${check.damage||0}</p>`).join('')}</details>`:''}${r.nextSceneTitle?`<div class="result-next"><span>이어지는 장면</span><b>${esc(r.nextSceneTitle)} <span aria-hidden="true">→</span></b></div>`:''}</div></details></section>`;
}
function renderEnding(g){
  const s=g.scene;
  return `<section class="ending-card"><span class="ending-star" aria-hidden="true">✦</span><div class="eyebrow">THE END · OUR VERSION</div><h2>이 결말은, 우리가 만든 이야기.</h2><p>${esc(s.question||'가장 오래 기억할 선택은 무엇이었나요? 서로의 이야기를 들어보세요.')}</p><div class="ending-stats"><span><b>${g.visitedCount||1}</b> 지나온 장면</span><span><b>${(g.clues||[]).length}</b> 모은 단서</span><span><b>${(g.players||[]).length}</b> 함께한 사람</span></div><div class="ending-actions"><button class="button primary" data-action="export-chronicle" type="button">우리의 연대기 TXT</button><button class="button quiet" data-action="export" type="button" ${state.mode!=='local'&&state.hostId!==state.meId?'disabled':''}>진행 저장 JSON</button><button class="button quiet" data-action="leave" type="button">다음 이야기 고르기</button></div><small>다른 선택과 단서는 다른 결말로 이어질 수 있습니다.</small></section>`;
}
function renderNotebook(){
  const g=game();if(!g)return '';
  if(activeTab==='clues')return `${(g.clues||[]).length?g.clues.map((c,i)=>`<article class="clue-card"><span class="clue-index">CLUE ${String(i+1).padStart(2,'0')}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join(''):'<div class="empty-notebook"><span>⌕</span><h3>아직 펼치지 않은 기록</h3><p>장면을 관찰하거나 행동하면,<br>발견한 단서가 여기에 남습니다.</p></div>'}${(g.flags||[]).length?`<div class="story-changes"><h3>우리가 바꾼 것</h3>${g.flags.map(f=>`<p>• ${esc(typeof f==='string'?f:f.text||f.title)}</p>`).join('')}</div>`:''}`;
  if(activeTab==='journal')return renderChronicle(g);
  return `<div class="chat-messages" aria-live="polite">${(state.messages||[]).length?state.messages.map(m=>`<div><b>${esc(m.name)}</b><p>${esc(m.text)}</p></div>`).join(''):'<p class="chat-placeholder">단서에 대한 생각이나 엉뚱한 계획을 나눠 보세요.</p>'}</div><form id="chat-form"><label class="sr-only" for="chat-input">동료에게 할 말</label><textarea id="chat-input" rows="2" maxlength="300" placeholder="동료에게 할 말…">${esc(draft.chat)}</textarea><button class="button quiet small full" type="submit">보내기</button></form>`;
}
function renderChronicle(g){
  const events=(g.chronicle||[]).filter(event=>['choice','revival','combat','opening','meeting'].includes(event.kind));
  const fullLog=g.journal||[];
  const partySize=g.partySize??(g.players||[]).length,mode=g.storyMode||(partySize===1?'solo':'group');
  return `<div class="chronicle-notebook">${g.opening?.meeting?`<details class="meeting-notebook" data-fold="first-meeting"><summary>처음 만난 자리 · ${esc(g.opening.meeting.title)}</summary>${meetingCopy(g.opening.meeting)}</details>`:''}<p class="chronicle-party" data-story-mode="${mode}" data-party-size="${partySize}">${mode==='solo'?'혼자 시작한 이야기':`${partySize}명이 함께 시작한 이야기`}</p><div class="chronicle-tools"><span>선택이 남긴 문장들</span><button class="text-button" data-action="export-chronicle" type="button">TXT 내려받기 ↗</button></div>${g.chroniclePartial?'<p class="chronicle-partial">현재 보관된 선택부터 연대기가 이어집니다.</p>':''}${events.length?`<ol class="chronicle-list">${events.map((event,i)=>`<li data-chronicle-id="${esc(event.id)}" data-chronicle-kind="${esc(event.kind)}"><span class="chronicle-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><article><small>${esc(event.sceneTitle||'우리의 이야기')}${event.actor?` · ${esc(event.actor)}`:''}</small><h3>${esc(event.action||({choice:'우리가 고른 길',revival:'되돌아온 동료',combat:'함께 맞선 위기',opening:'각자의 첫 장',meeting:'처음 만난 자리'}[event.kind]))}</h3><p>${esc(event.text)}</p></article></li>`).join('')}</ol>`:'<div class="empty-notebook"><span>✎</span><h3>첫 문장을 기다려요.</h3><p>내린 선택과 그 결과가<br>시간순으로 이어집니다.</p></div>'}${fullLog.length?`<details class="full-journal" data-fold="full-journal"><summary>전체 플레이 기록</summary><div class="journal-list">${fullLog.map(entry=>`<article><small>${esc(entry.sceneTitle||'기록')}${entry.actor?` · ${esc(entry.actor)}`:''}</small><h3>${esc(entry.action||GRADE[entry.grade]||'이야기의 변화')}</h3><p>${esc(entry.text)}</p>${Number.isFinite(entry.roll)?`<span class="journal-roll">D20 ${entry.roll} · 합계 ${entry.total} / 목표 ${entry.dc}</span>`:''}</article>`).join('')}</div></details>`:''}</div>`;
}
function entryValues(){
  const el=$('entry-dialog');return {name:el.querySelector('#player-name')?.value||'',classId:el.querySelector('#player-class')?.value||classList()[0]?.id,local:Array.from(el.querySelectorAll('[data-local-row]')).map((r,i)=>({name:r.querySelector('input')?.value||'',classId:r.querySelector('select')?.value||classList()[i]?.id}))};
}
function openEntry(kind='create',keep=null){
  entryKind=kind;const c=selectedCampaign(),classes=classList(c);const initial=keep||{name:readName(),classId:classes[0]?.id,local:[]};
  openDialog('entry-dialog',`${closeButton('entry-dialog')}<div class="eyebrow">${kind==='join'?'JOIN THE TABLE':'OPEN A NEW STORY'}</div><h2 id="entry-title">${kind==='join'?'친구의 탁자에 앉기':'어떻게 시작할까요?'}</h2><p class="modal-intro">${kind==='join'?'친구가 알려 준 초대 코드와 내 이름을 적어 주세요.':esc(c?.title||'새 이야기')+'에 들어갈 준비를 해요.'}</p>
    ${kind==='create'?`<div class="mode-switch" role="group" aria-label="플레이 방식"><button data-mode="online" class="${entryMode==='online'?'active':''}" type="button"><b>온라인</b><small>각자의 기기로</small></button><button data-mode="local" class="${entryMode==='local'?'active':''}" type="button"><b>한 기기로 함께</b><small>같은 자리에서</small></button></div>`:''}
    <form id="entry-form">${kind==='join'?'<label class="field"><span>초대 코드</span><input id="join-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="예: ABC234" required></label>':''}
    ${kind==='create'&&entryMode==='local'?`<div class="local-count"><label for="local-count">함께할 인원</label><select id="local-count">${[1,2,3,4].map(n=>`<option value="${n}" ${n===localCount?'selected':''}>${n}명</option>`).join('')}</select></div><div class="local-rows">${Array.from({length:localCount},(_,i)=>`<div class="local-row" data-local-row><span>${i+1}</span><label><span class="sr-only">${i+1}번 플레이어 이름</span><input maxlength="18" placeholder="${i+1}번 플레이어 이름" value="${esc(initial.local[i]?.name||'')}" required></label><label><span class="sr-only">${i+1}번 플레이어 직업</span><select data-entry-class>${classOptions(initial.local[i]?.classId||classes[i]?.id)}</select></label></div>`).join('')}</div><p class="small muted">${localCount===1?'비밀 카드를 펼치면 내 인물의 사연을 읽을 수 있어요.':'차례마다 화면을 넘겨 주세요. 각자의 비밀은 카드를 눌렀을 때만 보입니다.'}</p>`:`<div class="entry-fields ${kind==='join'?'name-only':''}"><label class="field"><span>내 이름</span><input id="player-name" maxlength="18" autocomplete="nickname" placeholder="어떻게 불러 드릴까요?" value="${esc(initial.name)}" required></label>${kind==='create'?`<label class="field"><span>이번 이야기의 직업</span><select id="player-class" data-entry-class>${classOptions(initial.classId)}</select></label>`:''}</div>`}
    ${kind==='create'&&entryMode==='local'?renderPlayMode(c,localCount):''}
    ${kind==='create'?`<div class="class-primer">${classes.map(cl=>`<div><span>${classIcon(cl.id)}</span><b>${esc(cl.name)}</b><small>${esc(classBest(cl))}</small></div>`).join('')}</div><div id="entry-class-preview">${professionDetail(classFor(initial.classId)||classes[0])}</div><p class="small muted">선택한 직업의 공격과 기술입니다. 직업 능력치는 고정이며, 비밀 카드와 개인 목표는 시작 후 받습니다.</p>`:'<div class="quiet-note"><b>직업은 방에 들어간 뒤 고릅니다.</b><p>친구가 고른 시나리오에 맞춰 전용 직업 네 개가 준비됩니다. 대기실에서 내 직업을 바꿀 수 있어요.</p></div>'}
    <button class="button primary full" data-busy-guard type="submit">${kind==='join'?'참가하기':'탁자 만들기'} <span>↗</span></button></form>`);
  if(kind==='join'){const code=new URLSearchParams(location.search).get('room');if(code)$('join-code').value=code.toUpperCase();}
}
function readName(){try{return localStorage.getItem('cg-v14-name')||'';}catch{return '';}}
function renderPlanItems(plan){
  const used=itemNames(plan.itemNames),consumed=itemNames(plan.consumedItemNames);
  if(!used.length&&!consumed.length)return '';
  return `<div class="plan-items"><b>이번 행동에 쓸 소지품</b><p>${[...new Set([...used,...consumed])].map(esc).join(', ')}</p>${consumed.length?`<p class="item-consume-warning"><b>${consumed.map(esc).join(', ')}</b>은(는) 행동을 실행하면 결과와 관계없이 소모됩니다.</p>`:'<small>사용한 뒤에도 가방에 남습니다.</small>'}</div>`;
}
function renderOutcomePreview(plan){
  const outcomes=ROLLED_GRADES.map(grade=>(plan.outcomes||[]).find(outcome=>outcome.grade===grade)).filter(Boolean);
  if(!outcomes.length)return '';
  const chance=value=>Number.isFinite(value)?`${Number(value.toFixed(2))}%`:'확률 확인 필요';
  return `<section class="outcome-preview" aria-labelledby="outcome-title"><h3 id="outcome-title">주사위가 정할 네 가지 결과</h3><div class="outcome-chances" role="list" aria-label="판정 결과별 확률">${outcomes.map(outcome=>`<div role="listitem" class="outcome-chance grade-${esc(outcome.grade)}" data-outcome-grade="${esc(outcome.grade)}"><span>${esc(GRADE[outcome.grade]||outcome.label)}</span><b data-chance="${Number.isFinite(outcome.chance)?outcome.chance:''}">${chance(outcome.chance)}</b></div>`).join('')}</div><details class="outcome-details"><summary>결과마다 무엇이 달라지는지 보기</summary><div>${outcomes.map(outcome=>`<article class="outcome-detail grade-${esc(outcome.grade)}" data-outcome-detail="${esc(outcome.grade)}"><h4>${esc(GRADE[outcome.grade]||outcome.label)} <span>${chance(outcome.chance)}</span></h4>${outcome.text?`<p>${esc(outcome.text)}</p>`:''}${(outcome.changes||[]).length?`<ul>${outcome.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul>`:''}</article>`).join('')}</div></details></section>`;
}
async function preview(payload){
  if(!game()||(!(payload.combatAction?game().combat?.canAct:game().canAct)&&!payload.detailId))return;
  payload={...payload};
  if(!game().opening?.active&&!payload.detailId&&!payload.reviveId){if(draft.spark)payload.spendSpark=true;if(draft.preparation)payload.usePreparation=true;}
  let result;
  try { result=await client.preview(payload); }
  catch(error){result={ok:false,error:error.message};}
  if(!result||result.ok===false){
    openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">CHECK THIS CHOICE</div><h2 id="info-title">지금은 이 행동을 할 수 없어요.</h2><p class="modal-intro">${esc(result?.error||'탁자의 상태가 바뀌었습니다. 현재 장면의 선택지를 다시 확인해 주세요.')}</p><button class="button primary full" data-close="info-dialog" type="button">현재 장면으로 돌아가기</button>`);
    return;
  }
  const plan=result.plan||result;
  pending={payload,plan,revision:plan.revision??actionVersion(),actorId:state.meId,sceneId:game().scene.id,committing:false};
  const auto=plan.automatic||Boolean(payload.detailId);
  openDialog('preview-dialog',`${closeButton('preview-dialog')}<div class="eyebrow">${auto?'YOUR DECISION':'BEFORE THE DICE'}</div><h2 id="preview-title">${auto?'이 행동으로 진행할까요?':'주사위를 굴리기 전에'}</h2><p class="preview-action">${esc(plan.label||plan.action||'장면을 살펴봅니다.')}</p>${renderPlanItems(plan)}
    ${auto?`<div class="automatic-note"><span>✧</span><p>${plan.type==='combat'?'성공 판정이 필요 없는 기술입니다.<br><b>이번 차례와 기술 사용 횟수를 소모합니다.</b>':'안전하거나 선택으로 정하는 행동입니다.<br><b>주사위 없이 선택대로 진행합니다.</b>'}</p></div>${plan.risk?`<div class="risk-note"><b>${plan.type==='combat'?'기술의 효과와 적의 다음 행동':'이 행동으로 할 일'}</b><p>${esc(plan.risk)}</p></div>`:''}`:`<div class="dice-equation"><div class="die-token">D20</div><span>+</span><div><b>${Number(plan.bonus)||0}</b><small>${esc(STAT[plan.stat]||'행동')}${plan.type==='opening'?' 직업 보너스':' + 도움 + 준비'}</small></div><span class="equation-arrow">→</span><div><b>${Number(plan.dc)||0}</b><small>성공 목표</small></div></div><div class="bonus-breakdown">직업 +${Number(plan.classBonus??((Number(plan.bonus)||0)-(Number(plan.assistance)||0)-(Number(plan.boost)||0)-(plan.spendSpark?3:0)-(plan.preparation?2:0)-(Number(plan.openingPreparation)||0)))||0}${plan.type==='opening'?'':` · 동료 +${Number(plan.assistance)||0}`}${plan.boost?` · 격려 +${Number(plan.boost)||0}`:''}${plan.spendSpark?' · 운명 조각 +3':''}${plan.preparation?' · 준비한 수단 +2':''}${plan.openingPreparation?` · 첫 장에서 얻은 준비 +${Number(plan.openingPreparation)||0}`:''}</div>${renderOutcomePreview(plan)}<div class="risk-note"><b>이번 행동에 걸린 것</b><p>${esc(plan.risk||'결과별 변화와 다음 장면을 확인한 뒤 진행해 주세요.')}</p>${renderHarmRisk(plan)}</div><p class="small muted">자연 20은 대성공, 자연 1은 대실패입니다. 나머지는 합계가 목표 이상이면 성공, 미만이면 실패합니다.${plan.type==='combat'?' 일행이 행동을 마치면 예고된 적의 판정이 진행됩니다.':''}</p>`}
    <div class="dialog-actions"><button class="button quiet" data-close="preview-dialog" type="button">다시 생각하기</button><button class="button primary" data-action="confirm-action" data-busy-guard type="button">${auto?(plan.type==='combat'?'기술 사용하기':'이대로 진행'):'D20 굴리기'} <span>↗</span></button></div>`);
}
function showSecret(){
  const g=game();if(!g||privateOpeningCover(g))return;
  const secret=g.secret,me=(g.players||[]).find(p=>p.id===state.meId);
  if(!secret){toast('이 인물의 비밀 카드를 아직 불러오지 못했어요.');return;}
  const title=secret.title||'나만의 비밀';
  const history=!g.opening?.active&&g.opening?.mine?.history?.length?`<details class="personal-opening-history"><summary>내 첫 장 다시 읽기</summary>${g.opening.mine.history.map(entry=>`<article><h3>${esc(entry.sceneTitle)}</h3><small>${esc(entry.location)} · ${esc(entry.action)}</small><p>${esc(entry.text)}</p></article>`).join('')}</details>`:'';
  const sharing=g.opening?.active?'<p class="small muted">서로 만난 뒤에, 비밀을 나눌 순간을 정해 주세요.</p>':`<div class="risk-note"><b>공유할 내용</b><p>${esc(secret.reveal)}</p></div><button class="button primary full" data-action="reveal" type="button" ${me?.revealed?'disabled':''}>${me?.revealed?'이미 동료들에게 공개한 비밀':'이 비밀을 동료들에게 공개하기'}</button><p class="small muted">공개하면 모두의 기록에 남습니다.</p>`;
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">FOR YOUR EYES ONLY</div><h2 id="info-title">${esc(me?.name||'나')}의 비밀 카드</h2>${!secretOpen?`<div class="secret-envelope"><span>✉</span><h3>${esc(title)}</h3><p>${state.mode==='local'?'다른 동료가 화면을 보고 있지 않은지 확인한 뒤 열어 주세요.':'동료에게 아직 공개되지 않은 정보입니다.'}</p><button class="button primary" data-action="open-secret" type="button">나만 보기</button></div>`:`<div class="secret-content"><h3>${esc(title)}</h3><p>${esc(secret.secret)}</p><div class="personal-goal"><span>내가 바라는 것</span><p>${esc(secret.goal)}</p></div></div>${history}${sharing}`}`);
}
function showHelp(){
  openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">WELCOME TO THE TABLE</div><h2 id="info-title">함께 다음 문장을 쓰는 방법</h2><p class="modal-intro">시작 전에 기본 또는 서사시를 고르고, 서로 다른 직업으로 짧은 두 장면을 각자 진행해요. 온라인에서는 동시에, 한 기기에서는 한 사람씩 읽습니다. 모두 같은 곳에 도착하면 겪은 일을 나누고 본편으로 이어집니다. 서사시에서는 더 긴 조사와 갈림길을 거쳐 결말에 도착합니다.</p><div class="help-steps"><section><span>01</span><div><h3>지금 상황과 해결할 일을 읽어요.</h3><p>짧은 장면을 읽고 다음 행동을 고르세요. 도움이 필요하면 「장면 정리」에서 상황과 목표를 확인하고, 「잠깐 살펴보기」로 차례를 쓰지 않고 주변을 살펴볼 수 있어요.</p></div></section><section><span>02</span><div><h3>현재 장면의 행동을 골라요.</h3><p>선택지마다 무엇을 하려는지와 필요한 소지품이 표시됩니다. 행동을 누르면 먼저 결과를 확인할 수 있고, 필요한 물건이 없으면 어디서 찾을지 안내합니다.</p></div></section><section><span>03</span><div><h3>불확실한 행동에만 D20을 굴려요.</h3><p>대성공·성공·실패·대실패의 네 가지 결과가 있습니다. 자연 20은 대성공, 자연 1은 대실패입니다. 나머지는 주사위와 보너스의 합이 목표 이상이면 성공, 미만이면 실패입니다. 각 결과의 확률과 실제 변화를 굴리기 전에 볼 수 있어요.</p></div></section><section><span>04</span><div><h3>소지품과 동료의 힘을 보태요.</h3><p>물건은 일행이 함께 씁니다. 사용 가능한 물건은 가방에서 알 수 있어요. 동료를 돕거나 운명 조각으로 +3을 더하고, 인물마다 한 번 「준비한 수단 사용」을 골라 +2를 받을 수 있습니다.</p></div></section></div><div class="quiet-note"><b>우리의 선택은 연대기에 남습니다.</b><p>연대기에는 실제 선택과 부활, 전투의 결말이 시간순으로 이어집니다. 「연대기 TXT」는 읽을 글을, 「저장 파일」은 나중에 이어 할 진행을 보관합니다. 긴 후일담과 판정 수치는 접힌 제목을 눌러 끝까지 읽을 수 있어요.</p></div><div class="quiet-note"><b>소지품과 단서는 다릅니다.</b><p>단서는 알아낸 사실을 기록한 것입니다. 소지품은 정해진 선택지에 실제로 사용하는 물건입니다. 소모되는 물건은 실행 전에 알려주며, 행동한 뒤 가방에서 빠집니다.</p></div><div class="quiet-note"><b>싸울지, 다른 길을 찾을지는 우리가 정합니다.</b><p>이야기마다 서로 다른 상대 5종이 있습니다. 기본에서는 3종, 서사시에서는 별도의 상대 2종까지 만나 볼 수 있어요. 각 이야기에서 뜻이 부딪히는 사람들부터 기이한 존재와 장치까지, 저마다 길을 막는 이유가 다릅니다. 모두 상황에 맞게 우회하거나 대화·교란을 시도하고, 모아 둔 소지품으로 싸움을 피할 수 있어요. 협상 판정이 나쁘면 전투가 시작될 수 있으니 네 가지 결과를 먼저 읽어 보세요.</p></div><div class="quiet-note"><b>전투에서는 기본 공격과 고유 기술 하나만 기억하세요.</b><p>일행이 한 번씩 행동하면 적의 예고된 행동이 진행됩니다. 고유 기술은 전투마다 한 번, 기본 공격은 계속 사용할 수 있어요. 다음 공격 대상과 피해를 살피고 협력하세요. 적을 제압하면 멈췄던 이야기를 다시 이어갑니다.</p></div><div class="quiet-note"><b>위험은 실제로 인물을 잃게 할 수 있어요.</b><p>각 인물은 생명력 3으로 시작합니다. 위험한 선택의 판정창에서 피해를 먼저 확인하세요. 사망하면 살아 있는 동료가 행동을 이어가며, 부활 지점에서 한 번의 귀환을 시도할 수 있습니다. 모두 사망하면 이야기는 그 자리에서 끝납니다.</p></div><div class="rules-panel"><h3>${esc(selectedCampaign()?.title||'이번 이야기')}의 네 직업</h3><div class="rules-stats">${classList().map(c=>`<div><b>${classIcon(c.id)} ${esc(c.name)}</b><p>${Object.entries(c.stats).map(([k,v])=>`${STAT[k]} +${v}`).join(' · ')}</p><p>기본: ${esc(c.basic?.name)}<br>고유: ${esc(c.ability?.name)}</p></div>`).join('')}</div></div><p class="small muted">온라인은 방 코드로 1–4명이 참가합니다. 한 기기로 함께 모드는 같은 화면을 차례로 사용하며, 저장 파일로 진행을 옮길 수 있습니다. 장면 그림과 소리는 모두 게임에 포함되어 있습니다.</p>`);
}
function updateSoundButton(){
  const p=sound?.preferences;
  if(!p)return;
  $('sound-toggle').innerHTML=`${p.enabled?'♫':'♪'} <span>${p.enabled?'소리 켜짐':'소리 켜기'}</span>`;
  $('sound-toggle').setAttribute('aria-label',p.enabled?'소리 끄기':'소리 켜기');
  $('sound-toggle').setAttribute('aria-pressed',String(p.enabled));
}
function showAudio(){const p=sound.preferences;openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">THE SOUND OF THE STORY</div><h2 id="info-title">소리와 주사위</h2><p class="modal-intro">배경음과 효과음의 크기, 주사위와 전투의 움직임을 편안하게 맞춰 주세요.</p><label class="volume-field"><span>배경음 <output id="music-value">${Math.round(p.music*100)}%</output></span><input id="music-volume" type="range" min="0" max="100" value="${Math.round(p.music*100)}"></label><label class="volume-field"><span>효과음 <output id="effects-value">${Math.round(p.effects*100)}%</output></span><input id="effects-volume" type="range" min="0" max="100" value="${Math.round(p.effects*100)}"></label><label class="motion-field"><span>주사위 · 전투 움직임</span><select id="dice-motion"><option value="auto" ${dice.mode==='auto'?'selected':''}>기기 설정 따르기</option><option value="full" ${dice.mode==='full'?'selected':''}>입체 주사위와 전투 연출 보기</option><option value="reduce" ${dice.mode==='reduce'?'selected':''}>움직임 줄이기 · 결과 바로 보기</option></select></label><button class="button primary full" data-action="toggle-audio" type="button">${p.enabled?'모든 소리 끄기':'소리 켜기'}</button><p class="small muted">처음에는 조용히 시작합니다. 탭이 보이지 않는 동안 소리를 멈춥니다.</p>`);}
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
  const a=document.createElement('a');a.href=url;a.download=`chronicle-gate-v22-${slug(game()?.campaignId||selected)}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('저장 파일을 내려받았습니다. 다른 기기에서는 「저장 파일 열기」로 이어갈 수 있어요.');
}

function exportChronicle(){
  const view=game();if(!view)return;
  const blob=new Blob([chronicleText(view)],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`chronicle-gate-v22-${slug(view.campaignId)}-${new Date().toISOString().slice(0,10)}.txt`;
  anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('지금까지의 연대기를 글 파일로 간직했습니다. 진행을 이어 하려면 JSON 저장 파일도 내려받아 주세요.');
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el||el.disabled)return;
  if(el.hasAttribute('data-battle-skip')){battle.finish();if(showingRoll&&!battle.active&&$('dice-dialog')?.open)dice.finish();return;}
  if(showingRoll&&!el.closest('#dice-dialog'))return;
  if(el.dataset.close){closeDialog(el.dataset.close);return;}
  if(el.dataset.campaign){selected=el.dataset.campaign;renderHome();openEntry('create');return;}
  if(el.dataset.mode){const values=entryValues();entryMode=el.dataset.mode;openEntry(entryKind,values);return;}
  if(el.dataset.combat){const action=el.dataset.combat;void guarded(()=>preview({combatAction:action,...(action==='ability'&&game()?.combat?.actions?.ability?.target==='ally'?{targetId:$('combat-target')?.value}:{} )}));return;}
  if(el.dataset.choice){void guarded(()=>preview({choiceId:el.dataset.choice}));return;}
  if(el.dataset.openingDefer){confirmOpeningDefer(el.dataset.openingDefer);return;}
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
  if(action==='profession'){const me=game()?.players?.find(p=>p.id===state.meId);openDialog('info-dialog',`${closeButton('info-dialog')}<div class="eyebrow">MY PROFESSION</div><h2 id="info-title">${esc(me?.className||cname(me?.classId))}</h2>${professionDetail(classFor(me?.classId))}`);return;}
  if(action==='secret'){secretOpen=false;showSecret();return;}
  if(action==='open-secret'){secretOpen=true;showSecret();return;}
  if(action==='leave'){confirmLeave();return;}
  if(action==='opening-receive'){localOpeningSeat=state.meId;renderGame(true);updateReadingAudio({allowEffects:true});return;}
  if(action==='opening-meeting'){clearPersonalDialogs();meetingStep='meeting';meetingReceiptScene=null;renderGame(true);updateReadingAudio({allowEffects:true});return;}
  if(action==='pass'&&state?.mode==='local'&&(state?.players||[]).length===1){toast('지금은 혼자 플레이하고 있어요. 행동을 선택해 이야기를 이어 주세요.');return;}
  void guarded(async()=>{
    if(action==='start'){await call('start',{storyLength:state.storyLength||'basic'});}
    else if(action==='opening-next'){
      const next=game()?.opening?.participants?.find(p=>p.id!==state.meId&&!p.ready);
      if(next&&game()?.opening?.mine?.ready){localOpeningSeat=null;clearPersonalDialogs();await call('setLocalSeat',next.id);}
    }
    else if(action==='opening-main'){
      meetingStep=null;meetingViewed=true;meetingReceiptScene=null;clearPersonalDialogs();
      if(state.mode==='local'&&game()?.activePlayerId!==state.meId)await call('setLocalSeat',game().activePlayerId);
      else renderGame(true);
      updateReadingAudio({allowEffects:true});
    }
    else if(action==='opening-defer-confirm'){const result=await call('deferOpening',el.dataset.playerId);if(result)closeDialog('info-dialog');}
    else if(action==='resume-online'||action==='resume-local'||action==='resume-backup'){localOpeningSeat=null;clearPersonalDialogs();const result=action==='resume-backup'?await call('recoverBackup'):await call('resume',action==='resume-local'?'local':undefined);if(result)closeDialog('info-dialog');}
    else if(action==='assist'){await call('assist');}
    else if(action==='pass'){await call('pass');}
    else if(action==='reveal'){const result=await call('reveal');if(result){closeDialog('info-dialog');if(selectMusic(listeningView()).mood!=='grief')sound.effect('reveal');toast('비밀을 동료들과 나눴습니다. 기록에서도 확인할 수 있어요.');}}
    else if(action==='export')await exportSave();
    else if(action==='export-chronicle')exportChronicle();
    else if(action==='leave-confirm'){closeDialog('info-dialog');await call('leave');lastScene='';secretOpen=false;}
    else if(action==='copy-code'){
      try{await navigator.clipboard.writeText(state.code);toast('초대 코드를 복사했습니다. 친구에게 알려 주세요.');}catch{toast(`초대 코드: ${state.code}`);}
    }
    else if(action==='confirm-action'&&pending){
      if(actionVersion()!==pending.revision||state.meId!==pending.actorId||game()?.scene.id!==pending.sceneId){closeDialog('preview-dialog');toast('당신의 장면이 바뀌었습니다. 행동을 다시 선택해 주세요.');return;}
      const prepared=pending;prepared.committing=true;
      if(prepared.plan.spendSpark)draft.spark=false;if(prepared.plan.preparation)draft.preparation=false;
      // Wait for the authoritative receipt before starting the presentation.
      const result=await call('act',{...prepared.payload,revision:prepared.revision});
      $('preview-dialog').classList.remove('rolling');
      if(result){closeDialog('preview-dialog');if((prepared.payload.detailId||prepared.plan.type==='detail')&&selectMusic(listeningView()).mood!=='grief')sound.effect('clue');}
      else if(pending)pending.committing=false;
    }
  });
});
$('sound-toggle').addEventListener('click',()=>void sound.toggle());
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='chat-input')draft.chat=el.value;
  else if(el.id==='music-volume'||el.id==='effects-volume'){
    const music=Number($('music-volume').value),effects=Number($('effects-volume').value);
    sound.setVolumes(music/100,effects/100);$('music-value').value=music+'%';$('effects-value').value=effects+'%';
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(showingRoll&&!['dice-motion','music-volume','effects-volume'].includes(el.id)){event.preventDefault();return;}
  if(el.id==='dice-motion'){dice.setMode(el.value);if(el.value==='reduce')battle.finish();if(!showingRoll&&game()?.combat)renderGame(false);}
  else if(el.id==='spend-spark')draft.spark=el.checked;
  else if(el.name==='story-length')void guarded(()=>call('setStoryLength',el.value));
  else if(el.id==='use-preparation')draft.preparation=el.checked;
  else if(el.id==='combat-target')combatTarget=el.value;
  else if(el.hasAttribute('data-entry-class')){const target=$('entry-class-preview');if(target){target.innerHTML=professionDetail(classFor(el.value));highlightNames(target);}}
  else if(el.dataset.localClass)void guarded(async()=>{const seat=state.meId;await call('setLocalSeat',el.dataset.localClass);await call('setClass',el.value);if(seat!==el.dataset.localClass)await call('setLocalSeat',seat);});
  else if(el.id==='local-count'){const values=entryValues();localCount=Number(el.value);openEntry('create',values);}
  else if(el.id==='lobby-campaign')void guarded(()=>call('selectCampaign',el.value));
  else if(el.id==='lobby-class')void guarded(()=>call('setClass',el.value));
});
document.addEventListener('submit',event=>{
  if(showingRoll){event.preventDefault();return;}
  if(!['entry-form','chat-form'].includes(event.target.id))return;
  event.preventDefault();
  void guarded(async()=>{
    if(event.target.id==='entry-form'){
      const values=entryValues();let result;
      if(entryKind==='join')result=await call('join',{name:values.name.trim(),code:$('join-code').value.trim().toUpperCase()});
      else result=await call('create',{name:entryMode==='local'?values.local[0]?.name.trim():values.name.trim(),classId:entryMode==='local'?values.local[0]?.classId:values.classId,campaignId:selected,mode:entryMode,localPlayers:entryMode==='local'?values.local.map(p=>({...p,name:p.name.trim()})):undefined});
      if(result){try{localStorage.setItem('cg-v14-name',values.name);}catch{}closeDialog('entry-dialog');}
    }
    else if(event.target.id==='chat-form'){if(!draft.chat.trim())return;const text=draft.chat.trim();draft.chat='';const result=await call('chat',text);if(!result)draft.chat=text;renderGame(false);}
  });
});
$('save-file').addEventListener('change',event=>void guarded(async()=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(file.size>5*1024*1024){toast('저장 파일이 너무 큽니다. 5MB 이하의 게임 JSON 파일을 선택해 주세요.','error');return;}
  try{const data=JSON.parse(await file.text());localOpeningSeat=null;clearPersonalDialogs();const result=await call('importSave',data);if(result)toast('저장한 이야기를 불러왔습니다.');}catch{toast('게임에서 내려받은 올바른 JSON 저장 파일인지 확인해 주세요.','error');}
}));
for(const dialog of document.querySelectorAll('dialog')){
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog(dialog.id);});
  dialog.addEventListener('cancel',()=>{if(dialog.id==='preview-dialog')pending=null;if(dialog.id==='info-dialog')secretOpen=false;});
}
document.querySelector('.brand').addEventListener('click',event=>{if(showingRoll){event.preventDefault();return;}if(state?.mode&&!event.ctrlKey&&!event.metaKey){event.preventDefault();confirmLeave();}});
document.addEventListener('keydown',event=>{if(showingRoll&&event.target?.dataset?.tab){event.preventDefault();return;}if(event.target?.dataset?.tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=['clues','journal','chat'];let index=tabs.indexOf(activeTab);index=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;activeTab=tabs[index];renderGame(false);$('tab-'+activeTab)?.focus({preventScroll:true});}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(showingRoll)cancelPresentation(showingRoll.latest);else{dice.finish();battle.cancel();}sound.pause();}else sound.resume();});
window.addEventListener('pagehide',()=>{if(showingRoll)cancelPresentation(showingRoll.latest);else{dice.finish();battle.cancel();}sound.pause();});
window.addEventListener('pageshow',()=>sound.resume());
window.addEventListener('beforeunload',()=>{showingRoll=null;battleFrame=null;dice.destroy();battle.destroy();sound.destroy();});

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
