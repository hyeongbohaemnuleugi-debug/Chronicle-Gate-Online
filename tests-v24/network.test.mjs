/** Four real Socket.IO clients replay real engine routes, with server dice.
 * Only the test clock is advanced to keep rapid CI traffic out of the limiter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {attachTableService} from '../game-server/table-service.js';
import {getCampaign} from '../public/game/campaigns/index.js';
import {createStoryState} from '../public/game/engine.js';
import {ok,roster,completeRoute,atGate} from './helpers.mjs';

const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(4000).emit(event,payload,(error,result)=>error?reject(error):resolve(result)));
const sync=async socket=>ok(await ack(socket,'table:sync')).state;
async function harness(storageDir){
  const server=http.createServer((_req,res)=>res.end('test')),io=new Server(server,{serveClient:false}),sockets=[];
  let now=Date.now(),die=20,rolls=0;
  const service=attachTableService(io,{storageDir,now:()=>now+=1001,roll:()=>{rolls++;return die;}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  return {service,setDie:value=>die=value,get rolls(){return rolls;},async client(){
    const socket=connect(`http://127.0.0.1:${server.address().port}/table`,{transports:['websocket'],forceNew:true,reconnection:false});sockets.push(socket);await once(socket,'connect',{signal:AbortSignal.timeout(4000)});return socket;
  },async close(){service.close();sockets.forEach(socket=>socket.disconnect());await new Promise(resolve=>io.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve));}};
}
async function table(h,campaign){
  const sockets=[],seats=[];
  for(let i=0;i<4;i++){
    const socket=await h.client();sockets.push(socket);
    seats.push(ok(await ack(socket,i?'table:join':'table:create',{campaignId:campaign.id,code:seats[0]?.code,name:`탁자의 동료 ${i+1}`,classId:campaign.classes[i].id})));
  }
  return {sockets,seats};
}

for(const length of ['basic','epic'])for(const fight of [false,true])test(`four actual online seats finish ${length} with ${fight?'all possible':'zero'} battles`,{timeout:30000},async()=>{
  const campaign=getCampaign('last-train',length),route=completeRoute(campaign,{count:4,fight,enemyDie:20});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v24-net-')),h=await harness(dir);
  try{
    const {sockets,seats}=await table(h,campaign),byId=new Map(seats.map((seat,i)=>[seat.playerId,sockets[i]]));
    const fresh=createStoryState(campaign,roster(campaign,4),{storyLength:length});
    ok(await ack(sockets[0],'table:import',{save:{game:fresh}}));
    let state=await sync(sockets[0]),serial=0;
    for(const step of route.steps){
      assert.equal(state.game.scene.id,step.sceneId);h.setDie(step.die);
      const socket=byId.get(state.game.activePlayerId),payload={...step,revision:state.game.revision,requestId:`v24-route-${serial++}`};delete payload.sceneId;delete payload.die;
      ok(await ack(socket,'table:act',payload));state=await sync(socket);
    }
    assert.equal(state.game.phase,'ended');assert.equal(state.game.completedCombats.length,fight?(length==='epic'?5:3):0);
    const exported=ok(await ack(sockets[0],'table:export')).save;
    assert.equal(exported.game.completedCombats.length,state.game.completedCombats.length);
    assert.ok(Object.keys(exported.game.encounterResolutions).length<=5);
    for(const socket of sockets){const own=await sync(socket);assert.deepEqual(own.game.encounterResolutions,state.game.encounterResolutions);assert.deepEqual(own.game.completedCombats,state.game.completedCombats);}
    for(const resolution of Object.values(exported.game.encounterResolutions))assert.ok(seats.some(seat=>seat.playerId===resolution.actorId));
    const stored=JSON.parse(fs.readFileSync(path.join(dir,seats[0].code+'.json'),'utf8'));
    assert.ok(Buffer.byteLength(JSON.stringify(stored))<256*1024);assert.deepEqual(stored.game.encounterResolutions,exported.game.encounterResolutions);
    for(const seat of seats)assert.ok(!JSON.stringify(exported).includes(seat.token));
  }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('optional-gate authority, retries, peaceful restart and seat remap survive the real service', {timeout:30000},async()=>{
  const campaign=getCampaign('hollow-apartment','epic'),entry=campaign.encounterCatalog.find(row=>row.epicOnly);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v24-restore-'));let h=await harness(dir);
  try{
    const first=await table(h,campaign);let {sockets,seats}=first;
    ok(await ack(sockets[0],'table:import',{save:{game:atGate(campaign,entry,4)}}));
    let state=await sync(sockets[0]);
    const before=state.game.revision,rolls=h.rolls,payload={choiceId:`avoid-${entry.id}`,revision:before,requestId:'avoid-once',roll:20,damage:999,completedCombats:[entry.id],encounterResolution:{id:entry.id,method:'victory'}};
    assert.equal((await ack(sockets[1],'table:act',{...payload,playerId:seats[0].playerId})).ok,false);
    const accepted=ok(await ack(sockets[0],'table:act',payload));assert.deepEqual(ok(await ack(sockets[0],'table:act',payload)),accepted);assert.equal(h.rolls,rolls);
    state=await sync(sockets[0]);assert.equal(state.game.combat,null);assert.equal(state.game.completedCombats.length,0);assert.equal(state.game.encounterResolutions[entry.id].method,'bypassed');
    const portable=ok(await ack(sockets[0],'table:export')).save;
    await h.close();h=await harness(dir);sockets=[];
    for(const seat of seats){const socket=await h.client();sockets.push(socket);ok(await ack(socket,'table:resume',{code:seat.code,playerId:seat.playerId,token:seat.token}));}
    state=await sync(sockets[0]);assert.equal(state.game.scene.id,entry.arenaId);assert.equal(state.game.combat,null);assert.deepEqual(state.game.encounterResolutions,portable.game.encounterResolutions);
    const imported=await table(h,campaign);ok(await ack(imported.sockets[0],'table:import',{save:portable}));
    const restored=await sync(imported.sockets[0]);assert.equal(restored.game.combat,null);assert.equal(restored.game.encounterResolutions[entry.id].actorId,imported.seats[0].playerId);assert.equal(restored.game.lastResult.actorId,imported.seats[0].playerId);
    const fightTable=await table(h,campaign);ok(await ack(fightTable.sockets[0],'table:import',{save:{game:atGate(campaign,entry,4)}}));
    const start=await sync(fightTable.sockets[0]);
    ok(await ack(fightTable.sockets[0],'table:act',{choiceId:`fight-${entry.id}`,revision:start.game.revision,requestId:'real-fight',encounterResolution:{id:entry.id,method:'bypassed'},enemyHealth:0}));
    const fighting=await sync(fightTable.sockets[0]);assert.equal(fighting.game.combat.id,entry.id);assert.equal(fighting.game.combat.enemy.maxHealth,10);assert.equal(fighting.game.encounterResolutions[entry.id],undefined);
  }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});
