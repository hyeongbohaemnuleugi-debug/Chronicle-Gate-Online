import { DiceTheater } from './dice3d.js';

const socket = window.io({ timeout:10_000, reconnection:true, reconnectionAttempts:Infinity, reconnectionDelay:500, reconnectionDelayMax:5_000 });
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const REQUIRED_IDS = [
  'app','hudTop','connectionText','roomCodeTop','leaveRoomBtn','homeView','entryView','lobbyView','storyView','combatView','endingView',
  'openCreate','openJoin','entryBack','entryTitle','nameInput','codeInput','entrySubmit','entryError','roomCodeLobby','copyCode',
  'playerSlots','campaignCarousel','campaignDetail','characterSummary','rollClassBtn','rollStatsBtn','startGameBtn','lobbyStatus',
  'partyRail','actLabel','eventTitle','deckCount','eventText','choiceArea','gmBar','drawEventBtn','releaseActionBtn','continueBtn',
  'myJobMini','myStatsMini','threatValue','threatTrack','storyFill','storyValue','chatLog','chatForm','chatInput',
  'monsterName','monsterAC','monsterHpFill','monsterHpText','combatParty','attackBtn','combatLog',
  'endingEyebrow','endingIcon','endingTitle','endingText','endingStats','endingHomeBtn',
  'toast','resolutionModal','resolutionEyebrow','resolutionTitle','resolutionText','resolutionClose','diceOverlay','diceCanvas','diceRoller','dicePurpose','diceFinal','diceSub'
];
const missingIds = REQUIRED_IDS.filter(id => !document.getElementById(id));
if (missingIds.length) {
  document.body.innerHTML = `<main style="padding:32px;background:#100;color:#fff;font-family:system-ui;min-height:100vh"><h1>Chronicle Gate UI load error</h1><p>HTML과 JavaScript 버전이 서로 맞지 않습니다.</p><pre>${missingIds.join('\n')}</pre><p>GitHub의 public 폴더를 v3.2 완성본으로 통째로 교체한 뒤 Render에서 Clear build cache & deploy를 실행하세요.</p></main>`;
  throw new Error(`Missing required DOM ids: ${missingIds.join(', ')}`);
}

const dice = new DiceTheater($('#diceCanvas'));
let campaigns=[];let state=null;let mode='create';let roomCode=localStorage.getItem('cg_room')||'';let playerToken=localStorage.getItem('cg_token')||'';let diceQueue=Promise.resolve();
const app=$('#app');

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2400)}
function view(id){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');$('#hudTop').classList.toggle('hidden',id==='homeView'||id==='entryView')}
function me(){return state?.players?.find(p=>p.id===playerToken)}
function isHost(){return !!me()?.host}
function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function mod(v){const m=Math.floor((v-10)/2);return (m>=0?'+':'')+m}
function setWorld(c){if(!c)return;app.dataset.world=c.id;document.documentElement.style.setProperty('--accent',c.accent);document.documentElement.style.setProperty('--accent2',c.accent2)}
function makeParticles(){const box=$('#particles');for(let i=0;i<38;i++){const p=document.createElement('i');p.className='p';p.style.left=Math.random()*100+'%';p.style.animationDuration=(9+Math.random()*18)+'s';p.style.animationDelay=(-Math.random()*20)+'s';p.style.opacity=.25+Math.random()*.6;p.style.transform=`scale(${.5+Math.random()*1.7})`;box.appendChild(p)}}

$('#openCreate').onclick=()=>openEntry('create');$('#openJoin').onclick=()=>openEntry('join');$('#entryBack').onclick=()=>view('homeView');
function openEntry(m){mode=m;$('#entryEyebrow').textContent=m==='create'?'CREATE ROOM':'JOIN ROOM';$('#entryTitle').textContent=m==='create'?'새로운 연대기를 시작합니다.':'동료들이 기다리는 문을 엽니다.';$('#codeField').style.display=m==='create'?'none':'block';$('#entrySubmit').textContent=m==='create'?'방 만들기':'방 참가하기';$('#entryError').textContent='';view('entryView')}
$('#entrySubmit').onclick=()=>{const name=$('#nameInput').value.trim();if(!name){$('#entryError').textContent='플레이어 이름을 입력하세요.';return}if(mode==='create'){socket.emit('room:create',{name},onJoined)}else{const code=$('#codeInput').value.trim().toUpperCase();if(code.length!==5){$('#entryError').textContent='5자리 방 코드를 입력하세요.';return}socket.emit('room:join',{name,roomCode:code},onJoined)}};
function onJoined(res){if(!res?.ok){$('#entryError').textContent=res?.error||'연결에 실패했습니다.';return}roomCode=res.roomCode;playerToken=res.playerToken;localStorage.setItem('cg_room',roomCode);localStorage.setItem('cg_token',playerToken);state=res.state;renderState();if(state.phase==='resolution'&&state.lastResolution)showResolution(state.lastResolution);toast(`ROOM ${roomCode} 입장 완료`)}
$('#copyCode').onclick=async()=>{const text=state?.code||'';try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else throw new Error('clipboard unavailable');toast('방 코드를 복사했습니다.')}catch{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('방 코드를 복사했습니다.')}catch{toast(`방 코드: ${text}`)}ta.remove()}};

socket.on('connect',()=>{ $('#connectionText').textContent='ONLINE';$('.live-dot').style.background='var(--good)'; if(roomCode&&playerToken&&!state){socket.emit('room:join',{roomCode,playerToken},res=>{if(res?.ok){state=res.state;renderState();if(state.phase==='resolution'&&state.lastResolution)showResolution(state.lastResolution)}else{localStorage.removeItem('cg_room');localStorage.removeItem('cg_token')}})} });
socket.on('disconnect',()=>{$('#connectionText').textContent='RECONNECTING';$('.live-dot').style.background='var(--danger)'});
socket.on('campaigns',list=>{campaigns=list;renderCampaigns()});
socket.on('state',s=>{if(!roomCode||s.code===roomCode){state=s;renderState()}});
socket.on('chat:new',entry=>{if(state){state.chat=[...(state.chat||[]),entry].slice(-80);renderChat()}});
socket.on('resolution',r=>showResolution(r));
socket.on('dice:roll',payload=>enqueueDice(payload));

function enqueueDice(payload){diceQueue=diceQueue.then(async()=>{const c=state?.campaign||campaigns.find(x=>x.id===state?.campaignId)||campaigns[0];$('#diceOverlay').classList.add('show');$('#diceRoller').textContent=`${payload.rollerName} · ${payload.kind?.toUpperCase()||'ROLL'}`;$('#dicePurpose').textContent=payload.purpose;$('#diceFinal').textContent='';$('#diceSub').textContent='주사위가 테이블 위를 구릅니다…';await dice.roll({sides:payload.sides,result:payload.result,color:c?.accent||'#bf4a38',duration:payload.sides===20?2850:2350});$('#diceFinal').textContent=payload.sides===20&&payload.result===20?'NATURAL 20':payload.sides===20&&payload.result===1?'NATURAL 1':payload.result;$('#diceSub').textContent=payload.total!=null?`최종 ${payload.total} · 기준 ${payload.dc}${payload.damage?` · 피해 ${payload.damage}`:''}`:'운명이 결정되었습니다.';await new Promise(r=>setTimeout(r,900));$('#diceOverlay').classList.remove('show');await new Promise(r=>setTimeout(r,180))}).catch(console.error)}

function renderState(){if(!state)return;roomCode=state.code;$('#roomCodeTop').textContent=state.code;$('#roomCodeLobby').textContent=state.code;if(state.campaign)setWorld(state.campaign);if(state.phase==='lobby')view('lobbyView');else if(state.phase==='combat')view('combatView');else if(state.phase==='ending')view('endingView');else view('storyView');renderLobby();renderStory();renderCombat();renderEnding();renderChat()}

function renderCampaigns(){if(!campaigns.length)return;const box=$('#campaignCarousel');box.innerHTML=campaigns.map(c=>`<button class="campaign-pill ${state?.campaignId===c.id?'selected':''}" data-id="${c.id}"><i>${c.icon}</i><b>${esc(c.title)}</b></button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!isHost())return toast('방장만 캠페인을 선택할 수 있습니다.');socket.emit('campaign:select',{roomCode,playerToken,campaignId:b.dataset.id},r=>!r?.ok&&toast(r.error))});renderCampaignDetail()}
function renderCampaignDetail(){const c=state?.campaign||campaigns.find(c=>c.id===state?.campaignId);const el=$('#campaignDetail');if(!el)return;if(!c){el.innerHTML='<div class="unassigned">방장이 다섯 개의 연대기 중 하나를 선택합니다.</div>';return}el.innerHTML=`<div class="eyebrow">${esc(c.genre)}</div><h3>${c.icon} ${esc(c.title)}</h3><p>${esc(c.subtitle)}</p><p>${esc(c.intro)}</p><div class="acts">${c.acts.map((a,i)=>`<span>ACT ${i+1} · ${esc(a)}</span>`).join('')}</div>`}
function renderLobby(){if(!state)return;renderCampaigns();const slots=$('#playerSlots');slots.innerHTML=state.players.map(p=>`<div class="player-slot ${p.connected?'':'offline'}"><div class="avatar">${esc(p.name[0]||'?')}</div><div><div class="pname">${esc(p.name)} ${p.host?'<span class="eyebrow">HOST</span>':''}</div><div class="ptags">${p.job?esc(p.job.name):'직업 미정'} · ${p.abilities?'능력치 생성 완료':'능력치 미정'}</div></div><div class="slot-state"><div class="${p.ready?'ready':'ready waiting'}">${p.connected?(p.ready?'READY':'PREPARING'):'OFFLINE'}</div>${isHost()&&!p.connected&&!p.host?`<button class="remove-slot" data-remove="${p.id}">REMOVE</button>`:''}</div></div>`).join('')+Array.from({length:Math.max(0,4-state.players.length)},()=>'<div class="empty-slot">동료를 기다리는 자리</div>').join('');slots.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>socket.emit('room:removePlayer',{roomCode,playerToken,targetPlayerId:btn.dataset.remove},r=>!r?.ok&&toast(r.error)));
  const p=me();const cs=$('#characterSummary');if(!p?.job){cs.innerHTML='<div class="unassigned"><div><div style="font-size:42px;color:var(--accent)">◇</div><p>D6을 굴리면 이 세계의 여섯 직업 중 하나가 당신을 선택합니다.</p></div></div>'}else{cs.innerHTML=`<div class="job-big"><div class="job-rune">${state.campaign?.icon||'◆'}</div><div class="eyebrow">${p.job.prime} SPECIALIST</div><h3>${esc(p.job.name)}</h3><p>${esc(p.job.skill)}</p></div>${p.abilities?`<div class="stats-compact">${Object.entries(p.abilities).map(([k,v])=>`<div class="stat-mini"><span>${k}</span><b>${v.total}</b><em>${mod(v.total)}</em></div>`).join('')}</div>`:''}`}
  $('#rollClassBtn').disabled=!state.campaignId;$('#rollStatsBtn').disabled=!p?.job;$('#startGameBtn').style.display=isHost()?'block':'none';const ready=state.players.length>=2&&state.players.every(x=>x.ready&&x.connected)&&state.campaignId;$('#startGameBtn').disabled=!ready;$('#campaignHint').textContent=isHost()?'클릭해 선택':'방장이 선택';$('#lobbyStatus').textContent=state.players.length<2?'최소 한 명의 동료가 더 필요합니다.':state.players.some(x=>!x.connected)?'오프라인 플레이어가 있습니다. 재접속 후 시작할 수 있습니다.':state.players.every(x=>x.ready)?'모든 동료의 캐릭터가 준비되었습니다.':'모든 플레이어가 직업과 능력치를 생성해야 합니다.';
}
$('#rollClassBtn').onclick=()=>socket.emit('player:classRoll',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));$('#rollStatsBtn').onclick=()=>socket.emit('player:statsRoll',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));$('#startGameBtn').onclick=()=>socket.emit('game:start',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));

function renderStory(){if(!state||state.phase==='lobby')return;const ev=state.currentEvent;$('#deckCount').textContent=state.deckCount;$('#threatValue').textContent=state.threat;$('#threatTrack').innerHTML=Array.from({length:8},(_,i)=>`<i class="${i<state.threat?'on':''}"></i>`).join('');$('#storyValue').textContent=`${state.story}/${state.targetStory||20}`;$('#storyFill').style.width=Math.min(100,state.story/(state.targetStory||20)*100)+'%';
  $('#partyRail').innerHTML=`<div class="panel-title"><span>PARTY</span><small>${state.players.length}/4</small></div>`+state.players.map(p=>`<div class="party-card ${p.id===playerToken?'active':''}"><div class="top"><b>${esc(p.name)}</b><small>${p.inspiration} ✦</small></div><small>${esc(p.job?.name||'')}</small><div class="hp-line"><i style="width:${p.maxHp?Math.max(0,p.hp/p.maxHp*100):0}%"></i></div><small>HP ${p.hp}/${p.maxHp}</small></div>`).join('');
  const p=me();$('#myJobMini').textContent=p?.job?.name||'UNASSIGNED';$('#myStatsMini').innerHTML=p?.abilities?Object.entries(p.abilities).map(([k,v])=>`<div class="stat-line"><span>${k}</span><b>${v.total} <i>${mod(v.total)}</i></b></div>`).join(''):'';
  if(!ev){$('#actLabel').textContent='THE TABLE IS QUIET';$('#eventTitle').textContent=isHost()?'다음 카드를 뽑으세요.':'GM이 다음 장면을 준비하고 있습니다.';$('#eventText').textContent='덱의 다음 카드는 아직 아무도 모릅니다. 같은 사건은 정확히 두 장씩 존재하며, 뽑힌 카드는 덱에서 사라집니다.';$('#choiceArea').innerHTML=''}else{$('#actLabel').textContent=`ACT ${ev.act} · ${ev.actName}`;$('#eventTitle').textContent=ev.title;$('#eventText').textContent=ev.text;renderChoices(ev)}
  $('#gmBar').style.display=isHost()?'flex':'none';$('#drawEventBtn').disabled=!!ev||state.phase!=='story';$('#releaseActionBtn').disabled=!state.activeChoice||state.phase!=='story';$('#continueBtn').disabled=state.phase!=='resolution';
}
function renderChoices(ev){const a=state.activeChoice;const box=$('#choiceArea');if(a){const mine=a.playerId===playerToken;box.innerHTML=`<div class="action-lock"><div><div class="eyebrow">ACTION DECLARED</div><b>${esc(a.playerName)}</b> — ${esc(a.choice.label)} <strong>${a.choice.stat} · DC ${a.choice.dc+(state.dcPenalty||0)}</strong></div>${mine&&state.phase==='story'?'<button class="primary" id="rollCheckBtn">D20 판정</button>':'<span class="eyebrow">판정 결과를 기다리는 중</span>'}</div>`;if(mine&&state.phase==='story')$('#rollCheckBtn').onclick=()=>socket.emit('event:roll',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));}else{box.innerHTML=ev.choices.map((c,i)=>`<button class="choice-card"><b>${i+1}. ${esc(c.label)}</b><small>${c.stat} · DC ${c.dc+(state.dcPenalty||0)}</small></button>`).join('');box.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>socket.emit('event:claim',{roomCode,playerToken,choiceIndex:i},r=>!r?.ok&&toast(r.error)))}}
$('#drawEventBtn').onclick=()=>socket.emit('event:draw',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));$('#releaseActionBtn').onclick=()=>socket.emit('event:release',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));$('#continueBtn').onclick=()=>socket.emit('event:continue',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));

function showResolution(r){if(!r)return;$('#resolutionEyebrow').textContent=r.ok?'SUCCESS':'FAILURE';$('#resolutionTitle').textContent=r.ok?'운명이 길을 열었습니다.':'주사위는 대가를 요구합니다.';$('#resolutionText').textContent=r.text||'';$('#resolutionModal').classList.add('show')}
$('#resolutionClose').onclick=()=>$('#resolutionModal').classList.remove('show');

function renderCombat(){if(!state||state.phase!=='combat'||!state.monster)return;const m=state.monster;$('#monsterName').textContent=m.name;$('#monsterAC').textContent=m.ac;$('#monsterHpFill').style.width=Math.max(0,m.hp/m.maxHp*100)+'%';$('#monsterHpText').textContent=`${m.hp} / ${m.maxHp}`;$('#combatParty').innerHTML=state.players.map(p=>`<div class="combat-member ${m.acted?.includes(p.id)?'acted':''} ${p.connected?'':'offline'}"><b>${esc(p.name)}</b><div>${esc(p.job?.name||'')}</div><small>HP ${p.hp}/${p.maxHp}${m.acted?.includes(p.id)?' · 행동 완료':''}</small></div>`).join('');const p=me();const acted=!!m.acted?.includes(playerToken);$('#attackBtn').disabled=!p||p.hp<=0||acted||!p.connected;$('#attackBtn').textContent=acted?'이번 라운드 행동 완료':'D20 공격';$('#combatLog').innerHTML=`<span class="combat-round">ROUND ${m.round||1}</span> · ${p?.job?.prime||'근력'} 수정치로 공격 · D20 vs AC ${m.ac}`}
$('#attackBtn').onclick=()=>socket.emit('combat:attack',{roomCode,playerToken},r=>!r?.ok&&toast(r.error));


function renderEnding(){if(!state||state.phase!=='ending')return;const e=state.ending||{};$('#endingEyebrow').textContent=e.victory?'CHRONICLE COMPLETE':'CHRONICLE FALLEN';$('#endingIcon').textContent=state.campaign?.icon||'◆';$('#endingTitle').textContent=e.title||'연대기가 끝났습니다.';$('#endingText').textContent=e.text||'';$('#endingStats').innerHTML=`<span>STORY ${state.story}/${state.targetStory||20}</span><span>THREAT ${state.threat}/${state.maxThreat||8}</span><span>CARDS ${state.discardCount} USED</span><span>PLAYERS ${state.players.length}</span>`}
$('#endingHomeBtn').onclick=()=>{localStorage.removeItem('cg_room');localStorage.removeItem('cg_token');roomCode='';playerToken='';state=null;location.reload()};
$('#leaveRoomBtn').onclick=()=>{if(!state)return;if(state.phase!=='lobby')return toast('진행 중인 세션은 자리를 보존합니다. 탭을 닫았다가 같은 기기에서 재접속하세요.');socket.emit('room:leave',{roomCode,playerToken},res=>{if(!res?.ok)return toast(res?.error||'나가기 실패');localStorage.removeItem('cg_room');localStorage.removeItem('cg_token');roomCode='';playerToken='';state=null;view('homeView');toast('방에서 나왔습니다.')})};

function renderChat(){if(!state)return;const el=$('#chatLog');if(!el)return;el.innerHTML=(state.chat||[]).map(m=>`<div class="chat-msg ${m.type||''}">${m.author?`<b>${esc(m.author)}</b>`:''}${esc(m.text)}</div>`).join('');el.scrollTop=el.scrollHeight}
$('#chatForm').onsubmit=e=>{e.preventDefault();const input=$('#chatInput'),text=input.value.trim();if(!text)return;socket.emit('chat:send',{roomCode,playerToken,text},r=>{if(r?.ok)input.value='';else toast(r?.error||'메시지 전송 실패')})};

makeParticles();renderCampaigns();

fetch('/api/config', { cache: 'no-store' }).then(r=>r.ok?r.json():null).then(cfg=>{ if(cfg?.version){ const el=$('#versionLabel'); if(el) el.textContent=`ONLINE EDITION · SERVER AUTHORITATIVE DICE · 5 CHRONICLES · v${cfg.version}`; } }).catch(()=>{});
