import { CAMPAIGNS, CATALOG, getCampaign } from './campaigns/index.js';
import { createGame, viewGame, previewAction, applyAction, assist as applyAssist, revealSecret, passTurn, validateSave, getClasses, normalizeClassId, cleanText } from './engine.js';
import { remapClassId } from './professions.js';
// Keep the v14 browser storage key so an existing local save can be migrated in place.
const LOCAL_KEY='chronicle-v14-local';
const ONLINE_KEY='chronicle-v14-online';
const BACKUP_KEY='chronicle-v14-online-backup';
const saveRead=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
const randomId=()=>globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function secureDie(){
  if(!globalThis.crypto?.getRandomValues) throw new Error('이 브라우저는 안전한 주사위 생성 기능을 지원하지 않습니다. 최신 브라우저로 열어 주세요.');
  const array=new Uint32Array(1), limit=Math.floor(0x100000000/20)*20;
  do{crypto.getRandomValues(array);}while(array[0]>=limit);
  return array[0]%20+1;
}
let socketScript;
async function loadSocket(){
  if(globalThis.io) return globalThis.io;
  if(!socketScript)socketScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/socket.io/socket.io.js';script.async=true;
    const timeout=setTimeout(()=>{script.remove();socketScript=null;reject(new Error('온라인 연결 파일을 불러오지 못했습니다. 로컬 플레이를 이용하거나 서버를 확인해 주세요.'));},10000);
    script.onload=()=>{clearTimeout(timeout);resolve(globalThis.io);};
    script.onerror=()=>{clearTimeout(timeout);socketScript=null;reject(new Error('이 실행 방식에서는 온라인 기능을 사용할 수 없습니다. 로컬 플레이로 시작해 주세요.'));};
    document.head.append(script);
  });
  return socketScript;
}

export async function createClient(onState=()=>{},onNotice=()=>{}){
  let socket=null, local=null, localSeat=null, current=null, planned=null, reconnecting=false;
  let lastBackupRevision=-1, disposed=false;
  const offlineOnly=location.protocol==='file:' || new URLSearchParams(location.search).get('offline')==='1';
  function notify(message){onNotice(typeof message==='string'?message:message?.error||'다시 시도해 주세요.');}
  function write(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true;}catch{notify('브라우저 자동 저장을 사용할 수 없습니다. 저장 파일을 내려받아 주세요.');return false;}}
  function initial(){return {mode:null,code:null,meId:null,hostId:null,connected:true,players:[],campaignId:CATALOG[0].id,catalog:CATALOG,game:null,messages:[],storage:'local',canStart:false,offlineOnly,
    hasLocalSave:Boolean(saveRead(localStorage,LOCAL_KEY)),hasOnlineSave:Boolean(saveRead(sessionStorage,ONLINE_KEY)),hasBackup:Boolean(saveRead(localStorage,BACKUP_KEY))};}
  function deliver(value){current={...value,offlineOnly,catalog:CATALOG};onState(current);}
  function localState(){
    const meId=localSeat||local.players[0].id;
    return {mode:'local',code:'LOCAL',meId,hostId:local.players[0].id,connected:true,players:local.game?local.game.players:local.players,
      campaignId:local.campaignId,catalog:CATALOG,game:local.game?viewGame(local.game,getCampaign(local.campaignId),meId):null,
      messages:local.messages||[],storage:'local',canStart:!local.game};
  }
  function localChanged({followTurn=false}={}){
    if(followTurn&&local.game)localSeat=local.game.players[local.game.activeIndex].id;
    write(localStorage,LOCAL_KEY,{schema:15,...local});deliver(localState());
  }
  async function connect(){
    if(offlineOnly)throw new Error('로컬 실행 중입니다. 온라인 방은 배포된 사이트에서 열어 주세요.');
    if(socket?.connected)return socket;
    if(!socket){
      const io=await loadSocket();
      socket=io('/table',{autoConnect:false,transports:['websocket','polling'],timeout:10000,reconnection:true,reconnectionDelay:700,reconnectionDelayMax:4000});
      socket.on('table:state', state=>{
        deliver(state);
        // Host keeps a portable recovery copy even when the server has no durable disk.
        if(state.meId===state.hostId && state.game && state.game.revision!==lastBackupRevision){
          lastBackupRevision=state.game.revision;
          request('table:export').then(r=>{if(r.ok&&r.save)write(localStorage,BACKUP_KEY,r.save);}).catch(()=>{});
        }
      });
      socket.on('table:notice',notify);
      socket.on('disconnect',()=>{if(current?.mode==='online')deliver({...current,connected:false});});
      socket.on('connect',()=>{
        if(!reconnecting && current?.mode==='online' && !current.connected){
          const credentials=saveRead(sessionStorage,ONLINE_KEY);
          if(credentials){reconnecting=true;request('table:resume',credentials).then(result=>{
            if(result.ok&&result.state)deliver(result.state);else notify(result.error);
          }).catch(error=>notify(error.message)).finally(()=>{reconnecting=false;});}
        }
      });
    }
    const activeSocket=socket;
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{cleanup();reject(new Error('서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.'));},12000);
      const success=()=>{cleanup();resolve();};
      const failure=()=>{cleanup();reject(new Error('온라인 서버에 연결할 수 없습니다. 로컬 플레이는 계속 사용할 수 있습니다.'));};
      function cleanup(){clearTimeout(timeout);activeSocket.off('connect',success);activeSocket.off('connect_error',failure);}
      activeSocket.once('connect',success);activeSocket.once('connect_error',failure);activeSocket.connect();
    });
    return activeSocket;
  }
  async function request(event,payload={}){
    if(!socket?.connected)throw new Error('연결이 끊겼습니다. 재연결을 기다려 주세요.');
    return new Promise((resolve,reject)=>{
      socket.timeout(12000).emit(event,payload,(error,result)=>{
        if(error)return reject(new Error('응답을 확인하지 못했습니다. 최신 화면을 확인한 뒤 다시 시도해 주세요.'));
        resolve(result||{ok:false,error:'응답을 받지 못했습니다.'});
      });
    });
  }
  function checked(result){if(!result?.ok){const error=new Error(result?.error||'처리하지 못했습니다.');error.hints=result?.hints;throw error;}return result;}
  function localApply(fn,payload){
    if(!local?.game)throw new Error('이야기를 시작해 주세요.');
    const result=fn(local.game,payload);checked(result);local.game=result.game;localChanged();return {ok:true};
  }
  async function joinResult(result){checked(result);write(sessionStorage,ONLINE_KEY,{code:result.code,playerId:result.playerId,token:result.token});local=null;localSeat=null;planned=null;if(result.state)deliver(result.state);return result;}
  const api={
    catalog:CATALOG,
    get state(){return current;},
    async create({name,classId,campaignId,mode='online',localPlayers=[]}={}){
      if(current?.mode)throw new Error('현재 테이블을 나간 뒤 새 이야기를 시작해 주세요.');
      if(!getCampaign(campaignId))throw new Error('시나리오를 선택해 주세요.');
      if(mode==='local'){
        const people=localPlayers.length?localPlayers:[{name,classId}];
        if(people.length<1||people.length>4)throw new Error('플레이어를 1~4명으로 정해 주세요.');
        if(people.some(p=>!cleanText(p.name,18)))throw new Error('모든 플레이어의 이름을 입력해 주세요.');
        if(people.some(p=>p.classId&&!getClasses(getCampaign(campaignId)).some(c=>c.id===p.classId)))throw new Error('이 이야기에서 선택할 수 없는 직업입니다. 직업을 다시 골라 주세요.');
        local={campaignId,players:people.map((p,i)=>({id:randomId(),name:cleanText(p.name,18),classId:normalizeClassId(getCampaign(campaignId),p.classId,i),connected:true})),game:null,messages:[]};
        localSeat=local.players[0].id;planned=null;localChanged();return {ok:true};
      }
      await connect();return joinResult(await request('table:create',{name,classId,campaignId}));
    },
    async join({name,classId,code}){if(current?.mode)throw new Error('현재 테이블을 먼저 나가 주세요.');await connect();return joinResult(await request('table:join',{name,classId,code}));},
    async resume(kind){
      const credentials=saveRead(sessionStorage,ONLINE_KEY);
      if(credentials && kind!=='local' && !offlineOnly){
        await connect();const result=checked(await request('table:resume',credentials));if(result.state)deliver(result.state);return result;
      }
      const saved=kind==='backup'?saveRead(localStorage,BACKUP_KEY):saveRead(localStorage,LOCAL_KEY);
      if(!saved)throw new Error('이어할 저장 데이터가 없습니다. 저장 파일을 불러와 주세요.');
      if(saved.game)return api.importSave(saved);
      if([14,15].includes(saved.schema)&&getCampaign(saved.campaignId)&&Array.isArray(saved.players)&&saved.players.length<=4){
        local={campaignId:saved.campaignId,players:saved.players.map((p,i)=>({id:randomId(),name:cleanText(p.name,18)||`모험가 ${i+1}`,classId:normalizeClassId(getCampaign(saved.campaignId),p.classId,i),connected:true})),game:null,messages:[]};
        localSeat=local.players[0].id;localChanged();return {ok:true};
      }
      throw new Error('저장 데이터가 손상되었습니다. 저장 파일을 불러와 주세요.');
    },
    async leave(){
      if(current?.mode==='online'){
        if(socket?.connected)await request('table:leave').catch(()=>{});
        socket?.disconnect();socket=null;sessionStorage.removeItem(ONLINE_KEY);
      }
      local=null;localSeat=null;planned=null;lastBackupRevision=-1;deliver(initial());return {ok:true};
    },
    async start(){if(local){local.game=createGame(getCampaign(local.campaignId),local.players);localChanged({followTurn:true});return {ok:true};}return checked(await request('table:start'));},
    async selectCampaign(campaignId){if(local){if(local.game)throw new Error('진행 중에는 바꿀 수 없습니다.');if(!getCampaign(campaignId))throw new Error('없는 시나리오입니다.');local.players.forEach((p,i)=>{p.classId=remapClassId(getCampaign(local.campaignId),getCampaign(campaignId),p.classId,i);});local.campaignId=campaignId;localChanged();return {ok:true};}return checked(await request('table:campaign',{campaignId}));},
    async setClass(classId){if(local){if(local.game)throw new Error('시작 전에 선택해 주세요.');if(!getClasses(getCampaign(local.campaignId)).some(c=>c.id===classId))throw new Error('직업을 선택해 주세요.');local.players.find(p=>p.id===localSeat).classId=classId;localChanged();return {ok:true};}return checked(await request('table:class',{classId}));},
    async preview(payload){const result=local?previewAction(local.game,getCampaign(local.campaignId),localSeat,payload):await request('table:preview',payload);if(result.ok)planned={payload:{...payload},revision:result.plan.revision};return result;},
    async act(payload){
      const revision=payload?.revision??planned?.revision??current?.game?.revision;
      const data={...payload,revision,requestId:randomId()};
      if(local){const result=applyAction(local.game,getCampaign(local.campaignId),localSeat,data,{roll:secureDie});checked(result);local.game=result.game;planned=null;localChanged({followTurn:result.plan.type!=='detail'});return {ok:true};}
      const result=checked(await request('table:act',data));planned=null;return result;
    },
    async assist(){if(local)return localApply(game=>applyAssist(game,localSeat));return checked(await request('table:assist',{revision:current.game.revision}));},
    async reveal(){if(local)return localApply(game=>revealSecret(game,getCampaign(local.campaignId),localSeat));return checked(await request('table:reveal',{revision:current.game.revision}));},
    async pass(){if(local){const result=passTurn(local.game,localSeat,{campaign:getCampaign(local.campaignId),roll:secureDie});checked(result);local.game=result.game;localChanged({followTurn:true});return {ok:true};}return checked(await request('table:pass',{revision:current.game.revision}));},
    async exportSave(){if(local){if(!local.game)throw new Error('이야기를 시작한 뒤 저장할 수 있습니다.');return {format:'chronicle-gate-v15',savedAt:new Date().toISOString(),game:local.game};}return checked(await request('table:export')).save;},
    async importSave(save){
      if(current?.mode==='online')return checked(await request('table:import',{save}));
      const {game,campaign}=validateSave(save,CAMPAIGNS);game.players.forEach(p=>{p.connected=true;});
      local={campaignId:campaign.id,players:game.players.map(({id,name,classId})=>({id,name,classId,connected:true})),game,messages:[]};
      localSeat=game.players[game.activeIndex].id;planned=null;localChanged();return {ok:true};
    },
    async chat(text){if(local){const who=local.players.find(p=>p.id===localSeat);const safe=cleanText(text,400);if(safe)local.messages.push({id:randomId(),name:who.name,text:safe});local.messages=local.messages.slice(-50);localChanged();return {ok:true};}return checked(await request('table:chat',{text}));},
    setLocalSeat(playerId){if(local?.players.some(p=>p.id===playerId)){localSeat=playerId;planned=null;deliver(localState());}},
    async recoverBackup(){const backup=saveRead(localStorage,BACKUP_KEY);if(!backup)throw new Error('복구할 온라인 자동 백업이 없습니다.');return api.importSave(backup);},
    dispose(){disposed=true;socket?.disconnect();socket=null;},
  };
  queueMicrotask(()=>{if(!disposed)deliver(initial());});
  return api;
}
