/** Separate Socket.IO namespace: legacy sessions and accounts are untouched. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CAMPAIGNS, CATALOG, getCampaign } from '../public/game/campaigns/index.js';
import { createGame, viewGame, previewAction, applyAction, assist, revealSecret, passTurn, validateSave, getClasses, normalizeClassId, cleanText } from '../public/game/engine.js';
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const safeEqual = (a,b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
import { remapClassId } from '../public/game/professions.js';
import { remapCombatPlayers } from '../public/game/combat.js';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const day = 24 * 60 * 60 * 1000;

export function attachTableService(io, options = {}) {
  const namespace = io.of('/table');
  const rooms = new Map();
  const configured = options.storageDir ?? process.env.CHRONICLE_V15_DATA_DIR ?? process.env.CHRONICLE_V14_DATA_DIR ?? (process.env.CHRONICLE_DATA_DIR ? path.join(process.env.CHRONICLE_DATA_DIR, 'v14-tables') : '');
  const storageDir = configured || (process.env.NODE_ENV === 'production' ? '' : path.resolve('.chronicle-v14'));
  const roll = options.roll || (() => crypto.randomInt(1, 21));
  const maxRooms = options.maxRooms || 200;
  const ttl = options.ttl || day;
  let storageError = false;
  if (storageDir) fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
  const fileFor = code => path.join(storageDir, `${code}.json`);
  function persist(room) {
    room.updatedAt = Date.now();
    if (!storageDir) return;
    try {
      const data = { schema:15, ...room, players:room.players.map(({socketId,...p})=>({...p,connected:false})), handled:{} };
      const temp = `${fileFor(room.code)}.tmp`;
      fs.writeFileSync(temp, JSON.stringify(data), { mode:0o600 });
      fs.renameSync(temp, fileFor(room.code));
      storageError = false;
    } catch(error) { storageError = true; console.error('[v15 save]', error.message); }
  }
  function getRoom(code) {
    if (!codePattern.test(code)) return null;
    if (rooms.has(code)) return rooms.get(code);
    if (!storageDir || !fs.existsSync(fileFor(code))) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(fileFor(code),'utf8'));
      if (![14,15].includes(raw.schema) || raw.code !== code || Date.now() - raw.updatedAt > ttl || !getCampaign(raw.campaignId)) return null;
      if (!Array.isArray(raw.players) || raw.players.length > 4) return null;
      if (rooms.size >= maxRooms) return null;
      raw.players.forEach((p,i) => { p.connected = false; p.socketId = null; p.classId=normalizeClassId(getCampaign(raw.campaignId),p.classId,i); });
      if (raw.game) { raw.game = validateSave(raw.game, CAMPAIGNS).game; raw.game.players.forEach(p => { p.connected = false; }); }
      raw.handled = {};
      rooms.set(code, raw);
      return raw;
    } catch(error) { console.error('[v15 load]',error.message); return null; }
  }
  function setPresence(room) {
    if (!room.game) return;
    let changed=false;
    for (const p of room.game.players){const value=room.players.some(other=>other.id===p.id && other.connected);if(p.connected!==value)changed=true;p.connected=value;}
    if(changed)room.game.revision++;
  }
  function publicState(room, meId) {
    setPresence(room);
    const people = room.game ? room.game.players : room.players;
    return { mode:'online',code:room.code,meId,hostId:room.hostId,connected:true,
      campaignId:room.campaignId,catalog:CATALOG,
      players:people.map(({id,name,classId,connected})=>({id,name,classId,connected})),
      game:room.game ? viewGame(room.game,getCampaign(room.campaignId),meId) : null,
      messages:room.messages.slice(-50), storage:storageDir&&!storageError?'disk':'memory',
      canStart:room.hostId===meId && !room.game && room.players.length>=1 && room.players.every(p=>p.connected),
    };
  }
  function broadcast(room) {
    for (const player of room.players) if (player.socketId) namespace.sockets.get(player.socketId)?.emit('table:state',publicState(room,player.id));
  }
  function remember(room, playerId, requestId, response) {
    if (typeof requestId !== 'string' || requestId.length > 80) return;
    room.handled ||= {};
    room.handled[`${playerId}:${requestId}`] = response;
    const keys=Object.keys(room.handled);
    if(keys.length>100) delete room.handled[keys[0]];
  }
  function makeCode() {
    for(let tryCount=0;tryCount<100;tryCount++){
      let code=''; for(let i=0;i<6;i++) code+=CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if(!rooms.has(code) && (!storageDir || !fs.existsSync(fileFor(code)))) return code;
    }
    throw new Error('잠시 후 다시 방을 만들어 주세요.');
  }
  function seat(socket, room, player, token) {
    if (player.socketId && player.socketId !== socket.id) {
      const previous=namespace.sockets.get(player.socketId);
      if(previous){ previous.data.roomCode=null; previous.data.playerId=null; previous.emit('table:notice','다른 창에서 이 캐릭터로 접속했습니다.'); previous.disconnect(); }
    }
    player.socketId=socket.id; player.connected=true;
    socket.data.roomCode=room.code; socket.data.playerId=player.id;
    socket.join(room.code); setPresence(room); persist(room); broadcast(room);
    return {ok:true,code:room.code,playerId:player.id,...(token?{token}:{}),state:publicState(room,player.id)};
  }
  function authenticate(socket) {
    const room = socket.data.roomCode ? getRoom(socket.data.roomCode) : null;
    const player = room?.players.find(p=>p.id===socket.data.playerId && p.socketId===socket.id);
    if(!room||!player) throw new Error('먼저 방에 참가해 주세요.');
    return {room,player};
  }
  function hostOnly(room,player) { if(room.hostId!==player.id) throw new Error('방장만 할 수 있습니다.'); }
  function noCurrentSeat(socket) { if(socket.data.roomCode) throw new Error('현재 테이블에서 나간 뒤 새 테이블에 참가해 주세요.'); }
  function ensureFresh(room,payload) {
    if(!room.game) throw new Error('아직 이야기를 시작하지 않았습니다.');
    if(payload.revision !== room.game.revision) throw new Error('장면이 갱신되었습니다. 행동을 다시 확인해 주세요.');
  }
  function requirePlayer(payload, campaign, players = []) {
    const name=cleanText(payload.name,18);
    if(!name) throw new Error('플레이어 이름을 입력해 주세요.');
    const classes=getClasses(campaign);
    const classId=payload.classId || classes.find(c=>!players.some(p=>p.classId===c.id))?.id || classes[0].id;
    if(!classes.some(c=>c.id===classId))throw new Error('이 이야기에서 선택할 수 없는 직업입니다. 대기실에서 해당 이야기의 직업을 골라 주세요.');
    return {name,classId};
  }
  const createRate = new Map();
  namespace.on('connection', socket => {
    const recent=[];
    function event(name, handler) {
      socket.on(name, (payload={}, ack=()=>{}) => {
        const reply=typeof ack==='function'?ack:()=>{};
        try {
          if(!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('요청 형식이 올바르지 않습니다.');
          const now=Date.now(); while(recent.length && recent[0]<now-10000) recent.shift();
          if(recent.length>=40) throw new Error('너무 빠릅니다. 잠시 기다려 주세요.');
          recent.push(now);
          const result=handler(payload);
          reply(result || {ok:true});
        }catch(error){reply({ok:false,error:cleanText(error.message,200)});}
      });
    }
    event('table:create',payload=>{
      noCurrentSeat(socket);
      const ip=socket.handshake.address;
      const rate=createRate.get(ip)||[]; const recentRate=rate.filter(t=>t>Date.now()-60000);
      if(recentRate.length>=8) throw new Error('방을 너무 자주 만들었습니다. 1분 뒤 다시 시도해 주세요.');
      if(rooms.size>=maxRooms) throw new Error('테이블이 가득 찼습니다. 잠시 후 다시 시도해 주세요.');
      const campaign=getCampaign(payload.campaignId);
      if(!campaign)throw new Error('시나리오를 선택해 주세요.');
      const {name,classId}=requirePlayer(payload,campaign);
      const code=makeCode(), token=crypto.randomBytes(32).toString('hex');
      const player={id:crypto.randomUUID(),name,classId,tokenHash:hash(token),connected:true,socketId:socket.id};
      const room={code,hostId:player.id,campaignId:payload.campaignId,players:[player],game:null,messages:[],handled:{},updatedAt:Date.now()};
      rooms.set(code,room); recentRate.push(Date.now()); createRate.set(ip,recentRate);
      return seat(socket,room,player,token);
    });
    event('table:join',payload=>{
      noCurrentSeat(socket);
      const room=getRoom(cleanText(payload.code,6).toUpperCase());
      if(!room) throw new Error('방을 찾을 수 없습니다. 6자리 코드를 확인해 주세요.');
      if(room.game) throw new Error('이미 시작한 방입니다. 원래 참가자는 이어하기를 사용해 주세요.');
      if(room.players.length>=4) throw new Error('테이블은 최대 4명까지 참가할 수 있습니다.');
      const {name,classId}=requirePlayer(payload,getCampaign(room.campaignId),room.players);
      const token=crypto.randomBytes(32).toString('hex');
      const player={id:crypto.randomUUID(),name,classId,tokenHash:hash(token),connected:true,socketId:socket.id};
      room.players.push(player);
      return seat(socket,room,player,token);
    });
    event('table:resume',payload=>{
      noCurrentSeat(socket);
      const room=getRoom(cleanText(payload.code,6).toUpperCase());
      const player=room?.players.find(p=>p.id===payload.playerId);
      if(!player || typeof payload.token!=='string' || payload.token.length>128 || !safeEqual(player.tokenHash,hash(payload.token))) throw new Error('이어하기 정보를 확인할 수 없습니다. 방이 만료되었거나 서버가 재시작되었을 수 있습니다.');
      return seat(socket,room,player);
    });
    event('table:sync',()=>{const {room,player}=authenticate(socket); return {ok:true,state:publicState(room,player.id)};});
    event('table:campaign',payload=>{
      const {room,player}=authenticate(socket);hostOnly(room,player);
      if(room.game) throw new Error('진행 중에는 이야기를 바꿀 수 없습니다.');
      if(!getCampaign(payload.campaignId)) throw new Error('없는 시나리오입니다.');
      room.players.forEach((p,i)=>{p.classId=remapClassId(getCampaign(room.campaignId),getCampaign(payload.campaignId),p.classId,i);});room.campaignId=payload.campaignId;persist(room);broadcast(room);return {ok:true};
    });
    event('table:class',payload=>{
      const {room,player}=authenticate(socket);
      if(room.game) throw new Error('직업은 시작 전에 선택할 수 있습니다.');
      if(!getClasses(getCampaign(room.campaignId)).some(c=>c.id===payload.classId))throw new Error('이 이야기에서 선택할 수 없는 직업입니다.');
      player.classId=payload.classId;persist(room);broadcast(room);return {ok:true};
    });
    event('table:start',()=>{
      const {room,player}=authenticate(socket);hostOnly(room,player);
      if(room.game) throw new Error('이미 시작했습니다.');
      if(room.players.some(p=>!p.connected)) throw new Error('모든 참가자가 연결된 뒤 시작해 주세요.');
      room.game=createGame(getCampaign(room.campaignId),room.players);persist(room);broadcast(room);return {ok:true};
    });
    event('table:preview',payload=>{
      const {room,player}=authenticate(socket); if(!room.game) throw new Error('이야기를 시작해 주세요.');
      return previewAction(room.game,getCampaign(room.campaignId),player.id,payload);
    });
    event('table:act',payload=>{
      const {room,player}=authenticate(socket);
      const previous=room.handled?.[`${player.id}:${payload.requestId}`];
      if(previous){socket.emit('table:state',publicState(room,player.id));return previous;}
      ensureFresh(room,payload);
      const result=applyAction(room.game,getCampaign(room.campaignId),player.id,payload,{roll});
      if(!result.ok) return result;
      room.game=result.game;
      const response={ok:true,revision:room.game.revision};
      remember(room,player.id,payload.requestId,response);persist(room);broadcast(room);return response;
    });
    for(const [name, action] of [['table:assist',assist],['table:reveal',(game,id)=>revealSecret(game,getCampaign(game.campaignId),id)],['table:pass',passTurn]]) event(name,payload=>{
      const {room,player}=authenticate(socket);ensureFresh(room,payload);
      let result;
      if(name==='table:pass') result=passTurn(room.game,player.id,{allowDisconnected:room.hostId===player.id,campaign:getCampaign(room.campaignId),roll});
      else result=action(room.game,player.id);
      if(!result.ok) return result;
      room.game=result.game;persist(room);broadcast(room);return {ok:true};
    });
    event('table:export',()=>{
      const {room,player}=authenticate(socket);hostOnly(room,player);
      if(!room.game) throw new Error('시작한 이야기만 저장할 수 있습니다.');
      return {ok:true,save:{format:'chronicle-gate-v15',savedAt:new Date().toISOString(),game:room.game}};
    });
    event('table:import',payload=>{
      const {room,player}=authenticate(socket);hostOnly(room,player);
      if(room.game) throw new Error('진행 중인 이야기에 덮어쓸 수 없습니다. 새 방의 대기실에서 불러와 주세요.');
      const {game,campaign}=validateSave(payload.save,CAMPAIGNS);
      if(game.players.length!==room.players.length) throw new Error(`저장 파일은 ${game.players.length}명입니다. 같은 인원이 입장한 뒤 불러와 주세요.`);
      const revivedMap={};
      game.players.forEach((p,i)=>{for(const [key,value] of Object.entries(game.reviveAttempts||{})){const suffix=`:${p.id}`;if(key.endsWith(suffix))revivedMap[`${key.slice(0,-suffix.length)}:${room.players[i].id}`]=value;}});
      game.reviveAttempts=revivedMap;
      const idMapping=Object.fromEntries(game.players.map((p,i)=>[p.id,room.players[i].id]));
      remapCombatPlayers(game,idMapping);
      game.players=game.players.map((p,i)=>({...p,id:room.players[i].id,name:room.players[i].name,connected:room.players[i].connected}));
      room.players.forEach((p,i)=>{p.classId=game.players[i].classId;});
      room.campaignId=campaign.id;room.game=game;persist(room);broadcast(room);return {ok:true};
    });
    event('table:chat',payload=>{
      const {room,player}=authenticate(socket);
      const text=cleanText(payload.text,400);if(!text)return {ok:true};
      room.messages.push({id:crypto.randomUUID(),name:player.name,text,at:Date.now()});
      room.messages=room.messages.slice(-50);persist(room);broadcast(room);return {ok:true};
    });
    event('table:leave',()=>{
      const {room,player}=authenticate(socket);
      socket.leave(room.code);socket.data.roomCode=null;socket.data.playerId=null;
      if(room.game){player.connected=false;player.socketId=null;}
      else room.players=room.players.filter(p=>p.id!==player.id);
      if(room.hostId===player.id){const nextHost=room.players.find(p=>p.connected);if(nextHost)room.hostId=nextHost.id;}
      if(!room.players.length){rooms.delete(room.code);if(storageDir)fs.rmSync(fileFor(room.code),{force:true});}
      else{setPresence(room);persist(room);broadcast(room);}
      return {ok:true};
    });
    socket.on('disconnect',()=>{
      try{
        const {room,player}=authenticate(socket);player.connected=false;player.socketId=null;
        // A disconnected host can resume; a connected peer becomes acting host after 15 seconds.
        setPresence(room);persist(room);broadcast(room);
        const timer=setTimeout(()=>{
          if(room.hostId===player.id && !player.connected){const nextHost=room.players.find(p=>p.connected);if(nextHost){room.hostId=nextHost.id;persist(room);broadcast(room);}}
        },15000);timer.unref?.();
      }catch{}
    });
  });
  const sweep=setInterval(()=>{
    const now=Date.now();
    for(const [code,room] of rooms) if(!room.players.some(p=>p.connected) && now-room.updatedAt>ttl){rooms.delete(code);if(storageDir)fs.rmSync(fileFor(code),{force:true});}
    for(const [ip,list] of createRate) if(!list.some(t=>t>now-60000))createRate.delete(ip);
  },60000);sweep.unref?.();
  return {rooms,storage:storageDir?'disk':'memory',close(){clearInterval(sweep);for(const room of rooms.values())persist(room);}, catalog:CATALOG};
}
