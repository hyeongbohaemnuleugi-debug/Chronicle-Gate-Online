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
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';

const campaign=CAMPAIGNS.find(c=>c.id==='clock-city');
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
 assert.equal(state.game.scene.arrival.toSceneId,'library');
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
 assert.ok(imported.game.combat,'mid-fight gate remains active across portable import');
 assert.deepEqual(ok(await ack(newHost,'table:export')).save.game.spentItems,['clock_wedge']);
 console.log('OK reconnect and import into a new room preserve spent items, branch arrival, last grade and active combat');
 console.log('V18 STORY NETWORK PASSED: 3 groups');
}catch(error){console.error('V18 STORY NETWORK FAILED:',error);process.exitCode=1;}
finally{
 for(const socket of sockets)socket.disconnect();
 await new Promise(resolve=>io.close(resolve));service.close();
 if(server.listening)await new Promise(resolve=>server.close(resolve));
 fs.rmSync(storageDir,{recursive:true,force:true});
}
