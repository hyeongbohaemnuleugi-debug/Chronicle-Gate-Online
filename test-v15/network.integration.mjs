/** Real HTTP + Socket.IO clients in one process. No fake transports or source-text assertions. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Server } from 'socket.io';
import { io as connectClient } from 'socket.io-client';
import { attachTableService } from '../game-server/table-service.js';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';

const storageDir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v15-network-'));
const campaign=CAMPAIGNS[0];
const assertions=[];
let running=null, rollCount=0;
const mark=text=>{assertions.push(text);console.log(`OK ${text}`);};
function ack(socket,event,payload={}){
  return new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>{
    if(error)return reject(new Error(`${event}: acknowledgement timed out`));
    if(!result||typeof result!=='object')return reject(new Error(`${event}: invalid acknowledgement`));
    resolve(result);
  }));
}
function succeeded(result){assert.equal(result.ok,true,result.error);return result;}
async function sync(socket){return succeeded(await ack(socket,'table:sync')).state;}
function nextState(socket,predicate){
  let timer,handler;
  const promise=new Promise((resolve,reject)=>{
    handler=value=>{if(predicate(value)){clearTimeout(timer);socket.off('table:state',handler);resolve(value);}};
    timer=setTimeout(()=>{socket.off('table:state',handler);reject(new Error('Expected state broadcast timed out'));},3500);
    socket.on('table:state',handler);
  });
  return promise;
}
async function startServer(){
  const server=http.createServer((_request,response)=>{response.writeHead(404);response.end();});
  const io=new Server(server,{serveClient:false,maxHttpBufferSize:100000});
  const service=attachTableService(io,{storageDir,roll:()=>{rollCount++;return 12;}});
  const context={server,io,service,sockets:[]};
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  context.url=`http://127.0.0.1:${server.address().port}/table`;
  return context;
}
async function client(context){
  const socket=connectClient(context.url,{transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false,timeout:3000});
  context.sockets.push(socket);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{socket.disconnect();reject(new Error('Client connection timed out'));},3500);
    socket.once('connect',()=>{clearTimeout(timer);resolve();});
    socket.once('connect_error',error=>{clearTimeout(timer);reject(error);});
    socket.connect();
  });
  return socket;
}
async function stopServer(context){
  if(!context)return;
  for(const socket of context.sockets)socket.disconnect();
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>context.io.close(resolve));
  context.service.close();
  if(context.server.listening)await new Promise(resolve=>context.server.close(resolve));
}
const noCredentials = value => {
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    assert.ok(!['token','tokenHash','socketId','password'].includes(key),`Leaked credential key: ${key}`);
    noCredentials(item);
  }
};

try {
  running=await startServer();
  const sockets=await Promise.all(Array.from({length:5},()=>client(running)));
  const classes=campaign.classes.map(c=>c.id);
  const credentials=[];
  credentials[0]=succeeded(await ack(sockets[0],'table:create',{name:'아린',classId:classes[0],campaignId:campaign.id}));
  const code=credentials[0].code;
  assert.match(code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  for(let i=1;i<4;i++)credentials[i]=succeeded(await ack(sockets[i],'table:join',{code,name:['','도윤','서린','유진'][i],classId:classes[i]}));
  assert.equal((await sync(sockets[0])).players.length,4);
  const fifth=await ack(sockets[4],'table:join',{code,name:'다섯 번째',classId:classes[0]});
  assert.equal(fifth.ok,false);assert.match(fifth.error,/4명/);
  assert.equal((await ack(sockets[4],'table:preview',{choiceId:'question'})).ok,false);
  assert.equal((await ack(sockets[1],'table:start')).ok,false);
  succeeded(await ack(sockets[0],'table:start'));
  mark('four real clients can join; fifth player and unauthorized start are rejected');

  let state=await sync(sockets[0]);
  const privateViews=await Promise.all(sockets.slice(0,4).map(sync));
  for(let i=0;i<4;i++){
    assert.equal(privateViews[i].game.secret.secret,campaign.roles[i].secret);
    noCredentials(privateViews[i]);
    for(let j=0;j<4;j++)if(i!==j)assert.ok(!JSON.stringify(privateViews[i]).includes(campaign.roles[j].secret),`Role ${j} secret leaked to ${i}`);
  }
  const choice=state.game.scene.choices.find(c=>!c.automatic);
  assert.ok(choice,'Fixture campaign must expose a risky opening choice.');
  const offTurn=await ack(sockets[1],'table:act',{choiceId:choice.id,playerId:credentials[0].playerId,roll:20,total:999,revision:state.game.revision,requestId:'impersonate-host'});
  assert.equal(offTurn.ok,false);assert.equal(rollCount,0);
  assert.equal((await sync(sockets[0])).game.scene.id,state.game.scene.id);
  mark('player secrets stay private and forged identity cannot act off-turn');

  const initialPreview=succeeded(await ack(sockets[0],'table:preview',{choiceId:choice.id}));
  succeeded(await ack(sockets[1],'table:assist',{revision:state.game.revision}));
  const stale=await ack(sockets[0],'table:act',{choiceId:choice.id,revision:initialPreview.plan.revision,requestId:'stale'});
  assert.equal(stale.ok,false);assert.equal(rollCount,0);
  state=await sync(sockets[0]);
  succeeded(await ack(sockets[2],'table:assist',{revision:state.game.revision}));
  state=await sync(sockets[0]);
  assert.equal((await ack(sockets[3],'table:assist',{revision:state.game.revision})).ok,false);
  const preview=succeeded(await ack(sockets[0],'table:preview',{choiceId:choice.id}));
  assert.equal(preview.plan.assistance,2);
  assert.equal(preview.plan.bonus,initialPreview.plan.bonus+2);
  const payload={choiceId:choice.id,revision:preview.plan.revision,requestId:'once-and-only-once',roll:20,total:999,bonus:999};
  const response=succeeded(await ack(sockets[0],'table:act',payload));
  state=await sync(sockets[0]);
  assert.equal(rollCount,1);assert.equal(state.game.lastResult.roll,12);
  assert.equal(state.game.lastResult.total,12+preview.plan.bonus);
  assert.notEqual(state.game.scene.id,campaign.start);
  const journalLength=state.game.journal.length,revision=state.game.revision;
  assert.deepEqual(succeeded(await ack(sockets[0],'table:act',payload)),response);
  state=await sync(sockets[0]);
  assert.equal(rollCount,1);assert.equal(state.game.revision,revision);assert.equal(state.game.journal.length,journalLength);
  mark('server rolls override forged numbers, assistance invalidates stale previews, request IDs prevent double rolls');

  assert.equal((await ack(sockets[1],'table:export')).ok,false);
  const exported=succeeded(await ack(sockets[0],'table:export')).save;
  assert.equal(exported.format,'chronicle-gate-v15');noCredentials(exported);
  assert.equal(exported.game.players.length,4);
  for(const entry of credentials)assert.ok(!JSON.stringify(exported).includes(entry.token));
  mark('only the host can export; portable saves contain no reconnect tokens');

  // The unused fifth socket cannot claim another seat with the wrong token.
  const wrong=await ack(sockets[4],'table:resume',{code,playerId:credentials[0].playerId,token:credentials[3].token});
  assert.equal(wrong.ok,false);
  const replaced=succeeded(await ack(sockets[4],'table:resume',{code,playerId:credentials[3].playerId,token:credentials[3].token}));
  assert.equal(replaced.playerId,credentials[3].playerId);assert.equal(replaced.state.players.length,4);
  const closed=await new Promise(resolve=>{
    if(!sockets[3].connected)return resolve(true);
    const timer=setTimeout(()=>resolve(false),1500);sockets[3].once('disconnect',()=>{clearTimeout(timer);resolve(true);});
  });
  assert.equal(closed,true,'Old tab was not disconnected when its seat resumed elsewhere.');
  mark('bad reconnect tokens fail; valid tokens reclaim the same seat and replace the old connection');

  state=await sync(sockets[0]);
  const activeId=state.game.activePlayerId;
  assert.equal(activeId,credentials[1].playerId);
  const disconnectedState=nextState(sockets[0],s=>s.players.find(p=>p.id===activeId)?.connected===false);
  sockets[1].disconnect();
  state=await disconnectedState;
  assert.ok(state.game.revision>revision,'Disconnect should invalidate the old preview revision.');
  assert.equal((await ack(sockets[2],'table:pass',{revision:state.game.revision})).ok,false);
  succeeded(await ack(sockets[0],'table:pass',{revision:state.game.revision}));
  state=await sync(sockets[0]);assert.equal(state.game.activePlayerId,credentials[2].playerId);
  const rejoined=await client(running);
  succeeded(await ack(rejoined,'table:resume',{code,playerId:credentials[1].playerId,token:credentials[1].token}));
  assert.equal((await sync(sockets[0])).players.length,4);
  mark('disconnected actor cannot stall the party; host can pass the turn and the actor can return');

  const beforeRestart=succeeded(await ack(sockets[0],'table:export')).save;
  await stopServer(running);running=null;
  assert.ok(fs.existsSync(path.join(storageDir,`${code}.json`)),'No persisted room snapshot exists.');
  const diskText=fs.readFileSync(path.join(storageDir,`${code}.json`),'utf8');
  for(const entry of credentials)assert.ok(!diskText.includes(`"token":"${entry.token}"`));
  running=await startServer();
  const restoredHost=await client(running);
  const resumed=succeeded(await ack(restoredHost,'table:resume',{code,playerId:credentials[0].playerId,token:credentials[0].token}));
  assert.equal(resumed.state.storage,'disk');
  assert.equal(resumed.state.game.scene.id,beforeRestart.game.nodeId);
  assert.equal(resumed.state.game.journal.length,beforeRestart.game.journal.length);
  assert.deepEqual(resumed.state.game.clues.map(c=>c.id),beforeRestart.game.clues);
  assert.equal(resumed.state.players.length,4);
  const restoredPeer=await client(running);
  succeeded(await ack(restoredPeer,'table:resume',{code,playerId:credentials[1].playerId,token:credentials[1].token}));
  const handoff=nextState(restoredPeer,s=>s.hostId===credentials[1].playerId);
  succeeded(await ack(restoredHost,'table:leave'));
  const transferred=await handoff;
  assert.equal(transferred.hostId,credentials[1].playerId);
  succeeded(await ack(restoredPeer,'table:export'));
  mark('disk persistence survives a fresh service; explicit host departure hands control to a connected peer');

  const importClients=await Promise.all(Array.from({length:4},()=>client(running)));
  const targetCredentials=[];
  targetCredentials[0]=succeeded(await ack(importClients[0],'table:create',{name:'새 방장',classId:classes[0],campaignId:campaign.id}));
  for(let i=1;i<4;i++)targetCredentials[i]=succeeded(await ack(importClients[i],'table:join',{code:targetCredentials[0].code,name:`새 동료 ${i}`,classId:classes[i]}));
  const invalid=structuredClone(beforeRestart);invalid.game.nodeId='__proto__';
  assert.equal((await ack(importClients[0],'table:import',{save:invalid})).ok,false);
  assert.equal((await sync(importClients[0])).game,null);
  assert.equal((await ack(importClients[1],'table:import',{save:beforeRestart})).ok,false);
  const portable=structuredClone(beforeRestart);
  portable.game.players[0].health=0;portable.game.players[0].life='dead';portable.game.activeIndex=1;
  const rememberedNode=campaign.start;
  portable.game.reviveAttempts={[`${rememberedNode}:${portable.game.players[0].id}`]:true};
  const oldId=portable.game.players[0].id;
  succeeded(await ack(importClients[0],'table:import',{save:portable}));
  const imported=succeeded(await ack(importClients[0],'table:export')).save;
  assert.deepEqual(imported.game.players.map(p=>p.id),targetCredentials.map(c=>c.playerId));
  assert.equal(imported.game.players[0].life,'dead');
  assert.equal(imported.game.reviveAttempts[`${rememberedNode}:${targetCredentials[0].playerId}`],true);
  assert.equal(imported.game.reviveAttempts[`${rememberedNode}:${oldId}`],undefined);
  assert.equal((await ack(importClients[0],'table:import',{save:portable})).ok,false);
  noCredentials(imported);
  mark('invalid imports are rejected; valid imports remap seats and retain one-attempt resurrection limits');

  console.log(`NETWORK INTEGRATION PASS: ${assertions.length} groups; real four-player Socket.IO, server-authoritative dice, privacy, reconnect, persistence, import, idempotence.`);
} catch(error) {
  console.error('NETWORK INTEGRATION FAILED:',error.stack||error);
  process.exitCode=1;
} finally {
  await stopServer(running).catch(error=>{console.error('Cleanup failed:',error.message);process.exitCode=1;});
  fs.rmSync(storageDir,{recursive:true,force:true});
}
