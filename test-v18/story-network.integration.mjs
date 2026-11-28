import {finishNetworkOpenings} from '../tests-v22/helpers.mjs';
/** Real sockets: authored actions and one shared consumable remain authoritative online. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {attachTableService} from '../game-server/table-service.js';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';

const campaign=CAMPAIGNS.find(c=>c.id==='clock-city');
const libraryEncounter=campaign.encounterCatalog.find(entry=>entry.arenaId==='library');
const server=http.createServer((_req,res)=>{res.writeHead(404);res.end();});
const io=new Server(server,{serveClient:false});
let rolls=0,die=12,serial=0;
const storageDir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v18-story-network-'));
const service=attachTableService(io,{storageDir,roll:()=>{rolls++;return die;}});
const sockets=[];
const ok=response=>{assert.equal(response?.ok,true,response?.error);return response;};
const ack=(socket,event,payload={})=>new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,result)=>error?reject(error):resolve(result)));
const sync=async socket=>ok(await ack(socket,'table:sync')).state;
async function client(){
 const socket=connect(`http://127.0.0.1:${server.address().port}/table`,{transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false});
 sockets.push(socket);
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect();});
 return socket;
}
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 let [host,peer]=await Promise.all([client(),client()]);
 const owner=ok(await ack(host,'table:create',{campaignId:campaign.id,name:'윤곁의 구조원',classId:campaign.classes[0].id}));
 ok(await ack(peer,'table:join',{code:owner.code,name:'동료',classId:campaign.classes[2].id}));
 ok(await ack(host,'table:start'));
  await finishNetworkOpenings([host,peer],ack);
 let state=await sync(host);
 const startRevision=state.game.revision;
 for(const payload of [{text:'전차를 옮긴다'},{choiceId:'tram-first',text:'무엇이든 성공'},{choiceId:'tram-first',flashback:'예전에 쐐기를 챙겼다'}]){
  assert.equal((await ack(host,'table:preview',payload)).ok,false);
  assert.equal((await ack(host,'table:act',{...payload,revision:startRevision,requestId:`reject-${serial++}`})).ok,false);
 }
 assert.equal(rolls,0);assert.equal((await sync(host)).game.revision,startRevision);
 console.log('OK online preview and action both reject free text, including mixed choice/text payloads, without rolling or changing state');

 ok(await ack(host,'table:act',{detailId:'ticket',revision:startRevision,requestId:'notice'}));
 state=await sync(host);
 const permanentClues=state.game.clues.map(c=>c.id);
 assert.ok(permanentClues.length);
 ok(await ack(host,'table:act',{detailId:'tool-pouch',revision:state.game.revision,requestId:'pickup'}));
 state=await sync(peer);
 assert.deepEqual(state.game.inventory.map(i=>i.id),['clock_wedge']);
 const beforeMove=state.game.revision;
 ok(await ack(host,'table:act',{choiceId:'tram-first',revision:beforeMove,requestId:'approach'}));
 state=await sync(peer);
 assert.equal(state.game.scene.id,'tram');
 const preview=ok(await ack(peer,'table:preview',{choiceId:'brake'})).plan;
 assert.equal(preview.outcomes.length,4);
 assert.equal(Object.values(preview.gradeChances).reduce((s,n)=>s+n,0),100);
 assert.deepEqual(preview.consumedItemNames,['황동 고정쐐기']);
 const beforeAttempt=rolls;
 assert.equal((await ack(peer,'table:act',{choiceId:'brake',revision:beforeMove,requestId:'old-revision'})).ok,false);
 assert.equal(rolls,beforeAttempt);
 assert.deepEqual((await sync(peer)).game.inventory.map(i=>i.id),['clock_wedge']);
 die=1;
 const payload={choiceId:'brake',revision:state.game.revision,requestId:'shared-wedge-once',roll:20,grade:'critical',gainItems:['clock_original']};
 const first=ok(await ack(peer,'table:act',payload));
 assert.deepEqual(ok(await ack(peer,'table:act',payload)),first);
 assert.equal(rolls,beforeAttempt+1);
 state=await sync(host);
 assert.equal(state.game.lastResult.roll,1);assert.equal(state.game.lastResult.grade,'fumble');
 assert.deepEqual(state.game.lastResult.lostItems.map(i=>i.id),['clock_wedge']);
 assert.deepEqual(state.game.inventory,[]);
 assert.ok(permanentClues.every(id=>state.game.clues.some(c=>c.id===id)));
 assert.equal(state.game.scene.arrival.grade,'fumble');
 assert.equal(state.game.scene.arrival.toSceneId,libraryEncounter.gateId);
 assert.equal(state.game.combat,null,'The story fumble reaches a decision, not a compulsory fight.');
 assert.ok(state.game.scene.choices.some(choice=>choice.id===`avoid-${libraryEncounter.id}`));
 assert.ok(state.game.scene.choices.some(choice=>choice.id===`fight-${libraryEncounter.id}`));
 console.log('OK shared item pickup, four-outcome preview, stale-request rejection and server-rolled fumble consume once while permanent clues remain');

 const portable=ok(await ack(host,'table:export')).save;
 assert.equal(portable.game.schema,22);assert.deepEqual(portable.game.spentItems,['clock_wedge']);
 const arrival=structuredClone(state.game.scene.arrival);
 host.disconnect();host=await client();
 ok(await ack(host,'table:resume',{code:owner.code,playerId:owner.playerId,token:owner.token}));
 const resumed=await sync(host);
 assert.deepEqual(resumed.game.inventory,[]);assert.deepEqual(resumed.game.scene.arrival,arrival);
 const [newHost,newPeer]=await Promise.all([client(),client()]);
 const newOwner=ok(await ack(newHost,'table:create',{campaignId:campaign.id,name:'새 방장'}));
 ok(await ack(newPeer,'table:join',{code:newOwner.code,name:'새 동료'}));
 ok(await ack(newHost,'table:import',{save:portable}));
 const imported=await sync(newHost);
 assert.deepEqual(imported.game.inventory,[]);assert.deepEqual(imported.game.scene.arrival,arrival);
 assert.equal(imported.game.lastResult.grade,'fumble');
 assert.equal(imported.game.combat,null,'Import must preserve the unanswered encounter decision.');
 assert.equal(imported.game.scene.id,libraryEncounter.gateId);
 assert.deepEqual(ok(await ack(newHost,'table:export')).save.game.spentItems,['clock_wedge']);
 // Both continuations use the actual runtime gate. The imported party avoids
 // the encounter; the original party deliberately fights and exports that phase.
 const beforeDecision=rolls;
 ok(await ack(newHost,'table:act',{choiceId:`avoid-${libraryEncounter.id}`,revision:imported.game.revision,requestId:'avoid-library'}));
 const avoided=(await sync(newHost)).game;
 assert.equal(avoided.scene.id,'library');assert.equal(avoided.combat,null);assert.deepEqual(avoided.completedCombats,[]);
 assert.equal(avoided.encounterResolutions[libraryEncounter.id].method,'bypassed');
 assert.ok(avoided.journal.some(entry=>entry.grade==='fumble'&&entry.lostItems.some(item=>item.id==='clock_wedge')));
 assert.deepEqual(ok(await ack(newHost,'table:export')).save.game.spentItems,['clock_wedge']);
 const pending=await sync(host);
 ok(await ack(host,'table:act',{choiceId:`fight-${libraryEncounter.id}`,revision:pending.game.revision,requestId:'fight-library'}));
 const fighting=(await sync(host)).game;
 assert.equal(fighting.combat.id,libraryEncounter.id);assert.equal(fighting.scene.id,'library');
 assert.equal(fighting.encounterResolutions[libraryEncounter.id],undefined);assert.equal(rolls,beforeDecision,'Neither automatic decision rolls a die.');
 const battleSave=ok(await ack(host,'table:export')).save;
 const [battleHost,battlePeer]=await Promise.all([client(),client()]);
 const battleOwner=ok(await ack(battleHost,'table:create',{campaignId:campaign.id,name:'전투를 이은 방장'}));
 ok(await ack(battlePeer,'table:join',{code:battleOwner.code,name:'전투를 이은 동료'}));
 ok(await ack(battleHost,'table:import',{save:battleSave}));
 const battleRestored=(await sync(battleHost)).game;
 assert.equal(battleRestored.combat.id,libraryEncounter.id);assert.equal(battleRestored.combat.enemy.health,fighting.combat.enemy.health);
 assert.ok(battleRestored.journal.some(entry=>entry.grade==='fumble'&&entry.lostItems.some(item=>item.id==='clock_wedge')));
 assert.deepEqual(ok(await ack(battleHost,'table:export')).save.game.spentItems,['clock_wedge']);
 console.log('OK reconnect/import retain the original fumble and spent item; real gate decisions independently preserve a peaceful passage or a portable active fight');
 console.log('V18 STORY NETWORK PASSED: 3 groups');
}catch(error){console.error('V18 STORY NETWORK FAILED:',error);process.exitCode=1;}
finally{
 for(const socket of sockets)socket.disconnect();
 await new Promise(resolve=>io.close(resolve));service.close();
 if(server.listening)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(storageDir,{recursive:true,force:true});
}
