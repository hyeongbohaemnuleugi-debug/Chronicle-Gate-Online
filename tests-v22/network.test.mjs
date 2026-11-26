/** Real Socket.IO transport, real private openings and authored story transitions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {attachTableService} from '../game-server/table-service.js';
import {getCampaign} from '../public/game/campaigns/index.js';
import {ok,finishNetworkOpenings} from './helpers.mjs';
const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>error?reject(error):resolve(result)));
async function harness(storageDir){
 const server=http.createServer((req,res)=>res.end('test')),io=new Server(server,{serveClient:false}),sockets=[];
 const service=attachTableService(io,{storageDir,roll:()=>20});server.listen(0,'127.0.0.1');await once(server,'listening');
 return {service,async client(){const socket=connect(`http://127.0.0.1:${server.address().port}/table`,{transports:['websocket'],forceNew:true,reconnection:false});sockets.push(socket);await once(socket,'connect',{signal:AbortSignal.timeout(3500)});return socket;},async close(){service.close();sockets.forEach(s=>s.disconnect());await new Promise(resolve=>io.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve));}};
}
async function advanceToExpansion(sockets,campaign){
 // Resolve seats once; repeatedly polling every player would exercise the
 // anti-spam limiter rather than the story. Real transport remains in use.
 const seats=new Map();
 for(const socket of sockets){const own=ok(await ack(socket,'table:sync')).state;seats.set(own.meId,socket);}
 for(let i=0;i<90;i++){
  let state=ok(await ack(sockets[0],'table:sync')).state;
  if(campaign.nodes[state.game.scene.id]?.epic)return state;
  assert.equal(state.game.phase,'playing','Reach expansion before an ordinary ending');
  const actor=seats.get(state.game.activePlayerId);assert.ok(actor);
  const payload=state.game.combat?{combatAction:'basic'}:{choiceId:state.game.scene.choices[0]?.id};assert.ok(payload.combatAction||payload.choiceId);
  ok(await ack(actor,'table:act',{...payload,revision:state.game.actionRevision,requestId:`advance-${i}`}));
 }
 assert.fail('Expansion not reached');
}
for(const id of ['last-train','hollow-apartment','drowned-broadcast'])for(const length of ['basic','epic'])for(const count of [1,2,3,4])test(`${id}/${length}/${count}: mode broadcasts, cannot bypass private start, and carries into the actual scene/save`,{timeout:20000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v22-net-'));const h=await harness(dir),sockets=[];try{
  const c=getCampaign(id),credentials=[];
  for(let i=0;i<count;i++){
   const s=await h.client();sockets.push(s);
   credentials.push(ok(await ack(s,i?'table:join':'table:create',{campaignId:id,code:credentials[0]?.code,name:`동료 ${i+1}`,classId:c.classes[i].id})));
  }
  if(count>1)assert.equal((await ack(sockets[1],'table:length',{storyLength:'epic'})).ok,false);
  assert.equal((await ack(sockets[0],'table:length',{storyLength:'infinite'})).ok,false);
  ok(await ack(sockets[0],'table:length',{storyLength:length}));
  for(const s of sockets){const state=ok(await ack(s,'table:sync')).state;assert.equal(state.storyLength,length);assert.equal(state.capabilities.storyLengths,true);}
  ok(await ack(sockets[0],'table:start',{openingMode:'together'}));
  for(const s of sockets){const state=ok(await ack(s,'table:sync')).state;assert.equal(state.game.phase,'opening');assert.equal(state.game.storyLength,length);}
  assert.equal((await ack(sockets[0],'table:length',{storyLength:length==='basic'?'epic':'basic'})).ok,false);
  await finishNetworkOpenings(sockets,ack);
  if(length==='epic')await advanceToExpansion(sockets,getCampaign(id,'epic'));
  const saved=ok(await ack(sockets[0],'table:export')).save;
  assert.equal(saved.game.storyLength,length);assert.equal(saved.game.opening.joined,true);assert.equal(saved.game.players.length,count);
  for(const cred of credentials)assert.ok(!JSON.stringify(saved).includes(cred.token));
  const disk=JSON.parse(fs.readFileSync(path.join(dir,credentials[0].code+'.json'),'utf8'));
  assert.equal(disk.storyLength,length);assert.equal(disk.game.nodeId,saved.game.nodeId);assert.ok(Buffer.byteLength(JSON.stringify(disk))<256*1024);
 }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('server restart restores an Epic-only node and every private opening record', {timeout:15000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v22-restart-'));let h=await harness(dir);try{
  const c=getCampaign('hollow-apartment'),s=await h.client();const creds=ok(await ack(s,'table:create',{campaignId:c.id,name:'돌아온 독자',classId:c.classes[0].id}));
  ok(await ack(s,'table:start',{storyLength:'epic'}));await finishNetworkOpenings([s],ack);
  const before=await advanceToExpansion([s],getCampaign(c.id,'epic'));await h.close();h=await harness(dir);
  const resumed=ok(await ack(await h.client(),'table:resume',{code:creds.code,playerId:creds.playerId,token:creds.token})).state;
  assert.equal(resumed.storyLength,'epic');assert.equal(resumed.game.scene.id,before.game.scene.id);assert.equal(resumed.game.opening.mine.history.length,2);assert.equal(resumed.game.phase,'playing');
 }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});
