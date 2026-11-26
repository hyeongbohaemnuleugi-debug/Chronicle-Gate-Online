/** Actual Socket.IO transports: parallel actions, privacy, restart and remapping. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import { attachTableService } from '../game-server/table-service.js';
import { LEGACY_CAMPAIGNS as CAMPAIGNS } from '../public/game/campaigns/index.js';
import { OPENINGS } from '../public/game/opening.js';

const ok=result=>{assert.equal(result?.ok,true,result?.error);return result;};
const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>error?reject(new Error(`${event}: timeout`)):resolve(result)));
const sync=async socket=>ok(await ack(socket,'table:sync')).state;

async function harness(storageDir){
  const server=http.createServer((_request,response)=>response.end('test'));
  const io=new Server(server,{serveClient:false});let rolls=0;
  const service=attachTableService(io,{storageDir,roll:()=>{rolls++;return 20;}});
  const sockets=[];
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  async function client(){
    const socket=connect(`http://127.0.0.1:${server.address().port}/table`,{transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false});
    sockets.push(socket);socket.connect();await once(socket,'connect',{signal:AbortSignal.timeout(3500)});return socket;
  }
  async function room(campaign,count=4){
    const clients=[],credentials=[];
    for(let i=0;i<count;i++){
      const socket=await client();clients.push(socket);
      credentials.push(ok(await ack(socket,i?'table:join':'table:create',{campaignId:campaign.id,code:credentials[0]?.code,name:`사람${i+1}`,classId:campaign.classes[i].id})));
    }
    return {clients,credentials,code:credentials[0].code};
  }
  async function disconnect(socket){
    const remote=io.of('/table').sockets.get(socket.id);if(!remote)return;
    const ended=once(remote,'disconnect',{signal:AbortSignal.timeout(3500)});socket.disconnect();await ended;
  }
  async function close(){service.close();for(const socket of sockets)socket.disconnect();await new Promise(resolve=>io.close(resolve));if(server.listening)await new Promise(resolve=>server.close(resolve));}
  return {room,client,disconnect,close,service,get rolls(){return rolls;}};
}

test('four online clients act from concurrent private previews; replay, stale and impersonation cannot duplicate actions',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v19-parallel-')),h=await harness(dir);
  try{
    const campaign=CAMPAIGNS[0],{clients,credentials,code}=await h.room(campaign);
    ok(await ack(clients[0],'table:start',{openingMode:'separate'}));
    const initial=await Promise.all(clients.map(sync));
    initial.forEach((state,i)=>{assert.equal(state.game.phase,'opening');assert.equal(state.game.canAct,true);assert.equal(state.game.activePlayerId,credentials[i].playerId);assert.equal(state.capabilities.parallelOpenings,true);assert.equal(state.game.opening.mine.stage,0);});
    assert.equal(new Set(initial.map(state=>state.game.scene.title)).size,4);
    const plans=await Promise.all(clients.map(async socket=>ok(await ack(socket,'table:preview',{choiceId:'risk'})).plan));
    assert.equal(h.rolls,0);
    const actions=await Promise.all(clients.map((socket,i)=>ack(socket,'table:act',{choiceId:'risk',revision:plans[i].revision,requestId:`parallel-${i}`,playerId:credentials[(i+1)%4].playerId,roll:1,bonus:999})));
    actions.forEach(ok);assert.equal(h.rolls,4);
    const views=await Promise.all(clients.map(sync));
    views.forEach((state,i)=>{
      assert.equal(state.game.opening.mine.stage,1);assert.equal(state.game.lastResult.roll,20);assert.equal(state.game.lastResult.bonus,3);
      assert.equal(state.game.lastResult.actor,`사람${i+1}`);assert.equal(state.game.chronicle.length,1);assert.equal(state.game.opening.meeting,undefined);
      for(let j=0;j<4;j++)if(j!==i){assert.ok(!JSON.stringify(state).includes(views[j].game.lastResult.text));assert.ok(!JSON.stringify(state).includes(views[j].game.secret.secret));}
    });
    const beforeRevision=views[0].game.revision;
    ok(await ack(clients[0],'table:act',{choiceId:'risk',revision:plans[0].revision,requestId:'parallel-0'}));
    assert.equal(h.rolls,4);assert.equal((await sync(clients[0])).game.revision,beforeRevision);
    assert.equal((await ack(clients[0],'table:act',{choiceId:'risk',revision:plans[0].revision,requestId:'stale'})).ok,false);
    assert.equal((await ack(clients[0],'table:act',{choiceId:'risk',revision:views[0].game.revision,requestId:'global-revision'})).ok,false);
    assert.equal((await ack(clients[1],'table:opening-defer',{playerId:credentials[2].playerId,revision:beforeRevision})).ok,false);
    assert.equal((await ack(clients[0],'table:opening-defer',{playerId:credentials[2].playerId,revision:beforeRevision})).ok,false);
    const plans2=await Promise.all(clients.map(async socket=>ok(await ack(socket,'table:preview',{choiceId:'safe'})).plan));
    (await Promise.all(clients.map((socket,i)=>ack(socket,'table:act',{choiceId:'safe',revision:plans2[i].revision,requestId:`arrive-${i}`})))).forEach(ok);
    assert.equal(h.rolls,4);
    const joined=await Promise.all(clients.map(sync));
    for(const state of joined){assert.equal(state.game.phase,'playing');assert.equal(state.game.opening.readyCount,4);assert.equal(state.game.opening.meeting.participants.length,4);assert.equal(state.game.chronicle.length,5);assert.equal(state.game.players.every(player=>player.openingBonus===2),true);}
    assert.deepEqual(joined[0].game.scene.reading,joined[3].game.scene.reading);
    assert.deepEqual(joined[0].game.opening.meeting,joined[3].game.opening.meeting);
    const file=path.join(dir,`${code}.json`);assert.ok(fs.statSync(file).size<32*1024,'Opening state must remain small on disk');
    assert.equal((await ack(clients[1],'table:export')).ok,false);
    const save=ok(await ack(clients[0],'table:export')).save;assert.equal(save.format,'chronicle-gate-v22');
    for(const credential of credentials)assert.ok(!JSON.stringify(save).includes(credential.token));
    const actual=h.service.rooms.get(code).game;assert.equal(actual.opening.states.every(state=>state.records.length===2),true);
  }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('2- and 3-person online rooms wait for exactly their own participants and keep plans valid through presence updates',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v19-parties-')),h=await harness(dir);
  try{
    for(const count of [2,3]){
      const campaign=CAMPAIGNS[count],{clients,credentials}=await h.room(campaign,count);
      ok(await ack(clients[0],'table:start',{openingMode:'separate'}));
      const plan=ok(await ack(clients[0],'table:preview',{choiceId:'risk'})).plan;
      await h.disconnect(clients[count-1]);
      const presence=await sync(clients[0]);assert.equal(presence.game.opening.total,count);assert.equal(presence.game.actionRevision,plan.revision);
      ok(await ack(clients[0],'table:act',{choiceId:'risk',revision:plan.revision,requestId:'presence-safe'}));
      const reconnect=await h.client();clients[count-1]=reconnect;
      ok(await ack(reconnect,'table:resume',credentials[count-1]));
      const rejoined=await sync(reconnect);assert.equal(rejoined.game.opening.mine.stage,0);assert.equal(rejoined.game.canAct,true);
      for(let i=0;i<count;i++){
        for(let n=i===0?1:0;n<2;n++){
          const planned=ok(await ack(clients[i],'table:preview',{choiceId:'safe'})).plan;
          ok(await ack(clients[i],'table:act',{choiceId:'safe',revision:planned.revision,requestId:`safe-${i}-${n}`}));
        }
      }
      const final=await sync(clients[0]);assert.equal(final.game.phase,'playing');assert.equal(final.game.opening.meeting.participants.length,count);assert.equal(final.game.partySize,count);
    }
  }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('a partial first chapter survives server restart and new-room ID remapping, then permits explicit absent-player arrival',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v19-restart-'));let h=await harness(dir);
  try{
    const campaign=CAMPAIGNS[6],original=await h.room(campaign,3);
    ok(await ack(original.clients[0],'table:start',{openingMode:'separate'}));
    const plan=ok(await ack(original.clients[1],'table:preview',{choiceId:'risk'})).plan;
    ok(await ack(original.clients[1],'table:act',{choiceId:'risk',revision:plan.revision,requestId:'before-restart'}));
    const saved=ok(await ack(original.clients[0],'table:export')).save;
    const personal=(await sync(original.clients[1])).game.opening.mine;
    await h.close();h=await harness(dir);
    const resumed=await h.client();ok(await ack(resumed,'table:resume',original.credentials[1]));
    const resumedState=await sync(resumed);assert.equal(resumedState.game.phase,'opening');assert.deepEqual(resumedState.game.opening.mine,personal);
    assert.equal(resumedState.game.secret.secret,OPENINGS[campaign.id].professions[campaign.classes[1].id].role.secret);
    const target=await h.room(campaign,3);ok(await ack(target.clients[0],'table:import',{save:saved}));
    const imported=await Promise.all(target.clients.map(sync));
    assert.equal(imported[1].game.opening.mine.stage,1);assert.equal(imported[0].game.opening.mine.stage,0);assert.equal(imported[2].game.opening.mine.stage,0);
    imported.forEach((state,i)=>assert.equal(state.meId,target.credentials[i].playerId));
    assert.deepEqual(imported[1].game.opening.mine,personal);
    for(let i=0;i<2;i++)for(let n=i===1?1:0;n<2;n++){
      const current=ok(await ack(target.clients[i],'table:preview',{choiceId:'safe'})).plan;
      ok(await ack(target.clients[i],'table:act',{choiceId:'safe',revision:current.revision,requestId:`finish-${i}-${n}`}));
    }
    assert.equal((await sync(target.clients[0])).game.phase,'opening');
    await h.disconnect(target.clients[2]);
    ok(await ack(target.clients[0],'table:leave'));
    const before=await sync(target.clients[1]);assert.equal(before.hostId,target.credentials[1].playerId);
    assert.equal((await ack(target.clients[0],'table:opening-defer',{playerId:target.credentials[2].playerId,revision:before.game.revision})).ok,false);
    ok(await ack(target.clients[1],'table:opening-defer',{playerId:target.credentials[2].playerId,revision:before.game.revision}));
    const final=await sync(target.clients[1]);assert.equal(final.game.phase,'playing');assert.equal(final.game.activePlayerId,target.credentials[1].playerId);
    const record=h.service.rooms.get(target.code).game.opening.states[2];assert.equal(record.deferred,true);assert.deepEqual(record.records,[]);
    const late=await h.client();ok(await ack(late,'table:resume',target.credentials[2]));
    const lateState=await sync(late);assert.equal(lateState.game.opening.mine.deferred,true);assert.equal(lateState.game.players[2].openingBonus,0);assert.equal(lateState.game.players[2].health,3);
    assert.equal(lateState.game.opening.meeting.participants.length,3);assert.equal(lateState.game.scene.id,campaign.start);
  }finally{await h.close();fs.rmSync(dir,{recursive:true,force:true});}
});
