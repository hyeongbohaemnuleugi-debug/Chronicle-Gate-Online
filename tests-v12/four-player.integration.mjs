import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const root=path.resolve(new URL('..',import.meta.url).pathname);
process.env.PORT='37421';
process.env.CHRONICLE_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'cg-v12-test-'));
await import(pathToFileURL(path.join(root,'server.js')).href);
const io=globalThis.__mockIo;
assert.ok(io,'mock socket server did not initialize');
let index=0;
class FakeClient {
 constructor(name){this.id=`test-sock-${++index}`;this.data={account:{id:`test-${index}`,displayName:name,equippedDice:'classic'}};this.handshake={headers:{cookie:''}};this.callbacks=new Map();this.out=[];this.rooms=new Set();}
 on(event,fn){this.callbacks.set(event,fn)}
 emit(event,payload){this.out.push({event,payload})}
 join(room){this.rooms.add(room)}
 leave(room){this.rooms.delete(room)}
 async call(event,payload={}){
  const fn=this.callbacks.get(event);assert.ok(fn,`no handler for ${event}`);
  return await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error(`handler timeout: ${event}`)),5000);
   try{const result=fn(payload,response=>{clearTimeout(timeout);resolve(response)});if(result?.catch)result.catch(reject);}
   catch(error){clearTimeout(timeout);reject(error);}
  });
 }
}
async function connect(name){const client=new FakeClient(name);io.sockets.sockets.set(client.id,client);await io._events.get('connection')(client);client.data.account={id:client.id,displayName:name,equippedDice:'classic'};return client;}
const clients=await Promise.all(['Mina','Jun','Sori','Leo'].map(connect));
const [host,...others]=clients;
function ok(r,label){assert.ok(r?.ok,`${label}: ${r?.error||JSON.stringify(r)}`);return r;}
const joined=[];
const creation=ok(await host.call('room:create',{name:'Mina',roomName:'v12 four people'}),'create');
joined.push({socket:host,ids:{roomCode:creation.roomCode,playerToken:creation.playerToken}});
for(let i=0;i<others.length;i++){
 const result=ok(await others[i].call('room:join',{roomCode:creation.roomCode,name:['Jun','Sori','Leo'][i]}),'join');
 joined.push({socket:others[i],ids:{roomCode:creation.roomCode,playerToken:result.playerToken}});
}
const invalid=await connect('Fifth');
const overflow=await invalid.call('room:join',{roomCode:creation.roomCode,name:'Fifth'});
assert.equal(overflow?.ok,false,'fifth player should be rejected');
ok(await host.call('campaign:select',{...joined[0].ids,campaignId:'ember'}),'select');
for(const [n,{socket,ids}] of joined.entries())ok(await socket.call('player:classRoll',ids),`job ${n}`);
for(const [n,{socket,ids}] of joined.entries())ok(await socket.call('player:statsRoll',ids),`stats ${n}`);
ok(await host.call('game:start',joined[0].ids),'start');
const state=()=>host.out.filter(e=>e.event==='state').at(-1)?.payload;
assert.equal(state()?.players?.length,4);
assert.equal(state().parallel?.enabled,true);
assert.deepEqual(state().players.map(x=>x.stress),[0,0,0,0]);
assert.equal(state().parallel.playerStates[state().turnPlayerId].scene.director.mood,'steady');
const forActor=()=>joined.find(c=>c.ids.playerToken===state().turnPlayerId);
const choose=async(mode='normal')=>{
 await new Promise(resolve=>setTimeout(resolve,740));
 const actor=forActor();const scene=state().parallel.playerStates[actor.ids.playerToken].scene;
 const idx=scene.choices.findIndex(c=>!c.automatic);
 assert.ok(idx>=0,`no checkable choices for ${scene.title}`);
 return ok(await actor.socket.call('story:advance',{...actor.ids,choiceIndex:idx,heroMode:mode}),`check ${scene.title}`);
};
const first=forActor();
const firstScene=state().parallel.playerStates[first.ids.playerToken].scene;
const firstActionIndex=firstScene.choices.findIndex(c=>!c.automatic);
assert.ok(firstActionIndex>=0);
const lowStress=await first.socket.call('story:advance',{...first.ids,choiceIndex:firstActionIndex,heroMode:'desperate'});
assert.equal(lowStress.ok,false,'desperate action should be gated at stress 0');
const helpers=joined.filter(c=>c!==first);
const h1=ok(await helpers[0].socket.call('story:assist',helpers[0].ids),'first ally help');
assert.equal(h1.bond,1);
const h2=ok(await helpers[1].socket.call('story:assist',helpers[1].ids),'second ally help');
assert.equal(h2.bond,1);
const h3=ok(await helpers[2].socket.call('story:assist',helpers[2].ids),'third ally help');
assert.equal(h3.bonus,3);
assert.equal(state().tableAssist.bonus,3);
const repeatHelp=await helpers[0].socket.call('story:assist',helpers[0].ids);
assert.equal(repeatHelp.ok,false,'cannot help twice in one turn');
const originalRandomInt=crypto.randomInt;
crypto.randomInt=(_min,_max)=>1;
try{
 await choose('normal');
 assert.equal(state().players.find(p=>p.id===first.ids.playerToken).stress,2);
 for(let i=0;i<3;i++)await choose('normal');
 assert.equal(state().turnPlayerId,first.ids.playerToken,'turn order is deterministic across 4 players');
 await choose('normal');
 assert.equal(state().players.find(p=>p.id===first.ids.playerToken).stress,4);
 for(let i=0;i<3;i++)await choose('normal');
 assert.equal(state().turnPlayerId,first.ids.playerToken);
 const helper=helpers[0];
 const comfort=ok(await helper.socket.call('story:assist',helper.ids),'bonded support');
 assert.equal(comfort.bond,2);
 assert.equal(comfort.relieved,true);
 assert.equal(state().players.find(p=>p.id===first.ids.playerToken).stress,3);
 await choose('desperate');
 const recentRoll=first.socket.out.findLast(e=>e.event==='dice:roll'&&e.payload.kind==='parallel-story')?.payload;
 assert.equal(recentRoll.heroMode,'desperate');
 assert.equal(recentRoll.rolls.length,2);
 assert.ok(state().players.find(p=>p.id===first.ids.playerToken).stress>=4);
 assert.ok(state().partyBonds && Object.values(state().partyBonds).some(n=>n>=2));
 for(let i=0;i<3;i++)await choose('normal');
 assert.equal(state().turnPlayerId,first.ids.playerToken);
 const before=state().players.find(p=>p.id===first.ids.playerToken).stress;
 const heal=ok(await first.socket.call('story:regroup',first.ids),'regroup');
 assert.equal(heal.stress,Math.max(0,before-2));
 assert.notEqual(state().turnPlayerId,first.ids.playerToken,'regroup must consume one action');
 assert.ok(state().parallel.playerStates[first.ids.playerToken].lastRegroupTick>=0);
 assert.ok(state().parallel.playerStates[first.ids.playerToken].scene.director.atmosphericLine);
 console.log('FOUR PLAYER DRAMATIC INTEGRATION OK: capacity, jobs, actions, assists, bonds, stress, dramatic 2D20, regroup, state sync');
}finally{crypto.randomInt=originalRandomInt;fs.rmSync(process.env.CHRONICLE_DATA_DIR,{recursive:true,force:true});}
process.exit(0);
