import {finishNetworkOpenings} from '../tests-v22/helpers.mjs';
/** Real HTTP/Socket.IO mode branches and reading records; no browser or fake transport. */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {Server} from 'socket.io';
import {io as connect} from 'socket.io-client';
import {attachTableService} from '../game-server/table-service.js';
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';
import {chronicleText} from '../public/game/narrative.js';
import {OPENINGS} from '../public/game/opening.js';

const campaign=CAMPAIGNS.find(story=>story.id==='last-train');
const opening=campaign.nodes[campaign.start];
const storageDir=fs.mkdtempSync(path.join(os.tmpdir(),'chronicle-v18-party-network-'));
const server=http.createServer((_request,response)=>{response.writeHead(404);response.end();});
const io=new Server(server,{serveClient:false});
let rolls=0;
const service=attachTableService(io,{storageDir,roll:()=>{rolls++;return 20;}});
const sockets=[];
const fixtures=[
  {mode:'solo',size:1,name:'혼자 온 승객',choiceId:'solo-call-ticket',otherChoiceId:'group-hold-door',flag:'solo_heard_ticket',otherFlag:'group_held_door'},
  {mode:'group',size:2,name:'문을 지킨 승객',choiceId:'group-hold-door',otherChoiceId:'solo-call-ticket',flag:'group_held_door',otherFlag:'solo_heard_ticket'},
];
const ok=response=>{assert.equal(response?.ok,true,response?.error);return response;};
function ack(socket,event,payload={}){
  return new Promise((resolve,reject)=>socket.timeout(3500).emit(event,payload,(error,response)=>{
    if(error)return reject(new Error(`${event}: acknowledgement timed out`));
    if(!response||typeof response!=='object')return reject(new Error(`${event}: invalid acknowledgement`));
    resolve(response);
  }));
}
const sync=async socket=>ok(await ack(socket,'table:sync')).state;
async function client(){
  const socket=connect(`http://127.0.0.1:${server.address().port}/table`,{
    transports:['websocket'],forceNew:true,reconnection:false,autoConnect:false,timeout:3000,
  });
  sockets.push(socket);
  await new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);socket.off('connect',connected);socket.off('connect_error',failed);};
    const connected=()=>{cleanup();resolve();};
    const failed=error=>{cleanup();reject(error);};
    const timer=setTimeout(()=>{cleanup();socket.disconnect();reject(new Error('Client connection timed out'));},3500);
    socket.once('connect',connected);socket.once('connect_error',failed);socket.connect();
  });
  return socket;
}
function nextState(socket,predicate){
  return new Promise((resolve,reject)=>{
    const handler=state=>{if(predicate(state)){clearTimeout(timer);socket.off('table:state',handler);resolve(state);}};
    const timer=setTimeout(()=>{socket.off('table:state',handler);reject(new Error('Expected presence broadcast timed out'));},3500);
    socket.on('table:state',handler);
  });
}
function noCredentials(value){
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    assert.ok(!['token','tokenHash','socketId','password'].includes(key),`Leaked credential key: ${key}`);
    noCredentials(item);
  }
}
function assertPublicCopy(save,view,credentials){
  noCredentials(save);
  const serialized=JSON.stringify(save),txt=chronicleText(view);
  for(const credential of credentials){
    assert.ok(!serialized.includes(credential.token),'Portable save leaked a reconnect token');
    assert.ok(!txt.includes(credential.token),'Reading copy leaked a reconnect token');
  }
  for(const role of campaign.roles)assert.ok(!txt.includes(role.secret),'Reading copy leaked an unrevealed private card');
  for(const definition of Object.values(OPENINGS[campaign.id].professions))assert.ok(!txt.includes(definition.role.secret),'Reading copy leaked an unrevealed profession card');
  return txt;
}

try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  for(const fixture of fixtures){
    fixture.host=await client();
    fixture.owner=ok(await ack(fixture.host,'table:create',{
      campaignId:campaign.id,name:fixture.name,classId:campaign.classes[fixture.mode==='solo'?3:0].id,
    }));
    if(fixture.size===2){
      fixture.peer=await client();
      fixture.guest=ok(await ack(fixture.peer,'table:join',{
        code:fixture.owner.code,name:'함께 온 승객',classId:campaign.classes[2].id,
      }));
    }
    ok(await ack(fixture.host,'table:start'));
  await finishNetworkOpenings([fixture.host,...(fixture.peer?[fixture.peer]:[])],ack);
    const state=await sync(fixture.host),game=state.game;
    assert.equal(game.storyMode,fixture.mode);assert.equal(game.partySize,fixture.size);
    assert.equal(game.players.length,fixture.size);assert.equal(game.modeDescription,campaign.playModes[fixture.mode]);
    assert.equal(game.scene.id,campaign.start);assert.equal(game.activePlayerId,fixture.owner.playerId);
    assert.deepEqual(game.scene.reading.paragraphs,OPENINGS[campaign.id].meeting.startText[fixture.mode]);
    assert.deepEqual(game.scene.text,OPENINGS[campaign.id].meeting.startText[fixture.mode]);
    assert.deepEqual(game.chroniclePrologue,[fixture.mode==='solo'?'본격적인 사건에 뛰어들기 전, 한 사람이 자기 자리에서 첫 걸음을 내딛었다.':'서로 다른 자리에서 시작된 발걸음이 한곳으로 향했다. 이들은 아직 서로의 사정을 알지 못했다.']);
    assert.equal(game.opening.meeting.text[0],OPENINGS[campaign.id].meeting[fixture.mode]);
    fixture.openingChronicleLength=game.chronicle.length;
    const visible=game.scene.choices.map(choice=>choice.id);
    assert.deepEqual(visible,opening.choices.filter(choice=>choice.id!==fixture.otherChoiceId).map(choice=>choice.id));
    assert.ok(visible.length<=4);assert.ok(visible.includes(fixture.choiceId));
    assert.ok(!visible.includes(fixture.otherChoiceId));
    const revision=game.revision,beforeRolls=rolls;
    const invalidPreview=await ack(fixture.host,'table:preview',{choiceId:fixture.otherChoiceId});
    assert.equal(invalidPreview.ok,false);assert.ok(invalidPreview.error);
    assert.equal(rolls,beforeRolls);assert.deepEqual((await sync(fixture.host)).game,game);
    const invalidAct=await ack(fixture.host,'table:act',{
      choiceId:fixture.otherChoiceId,revision,requestId:`wrong-mode-${fixture.mode}`,
    });
    assert.equal(invalidAct.ok,false);assert.ok(invalidAct.error);
    assert.equal(rolls,beforeRolls);assert.deepEqual((await sync(fixture.host)).game,game);
  }
  assert.notEqual(OPENINGS[campaign.id].meeting.solo,OPENINGS[campaign.id].meeting.group);
  assert.equal(rolls,0);
  console.log('OK solo/group rooms expose their own prose and contextual choices; wrong-mode preview/action leave dice and the entire game unchanged');

  for(const fixture of fixtures){
    const choice=opening.choices.find(action=>action.id===fixture.choiceId),outcome=choice.outcomes.critical;
    const beforeRolls=rolls;
    const plan=ok(await ack(fixture.host,'table:preview',{choiceId:fixture.choiceId})).plan;
    assert.equal(rolls,beforeRolls,'Preview must not roll');
    ok(await ack(fixture.host,'table:act',{
      choiceId:fixture.choiceId,revision:plan.revision,requestId:`real-choice-${fixture.mode}`,
    }));
    fixture.state=await sync(fixture.host);
    const game=fixture.state.game;
    assert.equal(rolls,beforeRolls+1);assert.equal(game.lastResult.roll,20);
    assert.equal(game.lastResult.grade,'critical');assert.equal(game.lastResult.text,outcome.text);
    assert.equal(game.scene.id,'carriage');assert.equal(game.scene.id,outcome.next);
    assert.equal(game.chronicle.length,fixture.openingChronicleLength+1);assert.equal(game.chroniclePartial,false);
    const entry=game.chronicle.at(-1);
    assert.equal(entry.kind,'choice');assert.equal(entry.grade,'critical');
    assert.equal(entry.actor,fixture.name);assert.equal(entry.action,choice.label);
    assert.equal(entry.sceneTitle,opening.title);assert.equal(entry.text,outcome.text);
    const callbacks=campaign.nodes.carriage.callbacks;
    const expectedEcho=callbacks.find(callback=>callback.when.flag===fixture.flag).text;
    const otherEcho=callbacks.find(callback=>callback.when.flag===fixture.otherFlag).text;
    assert.ok(game.scene.reading.echoes.includes(expectedEcho));
    assert.ok(!game.scene.reading.echoes.includes(otherEcho));
    fixture.portable=ok(await ack(fixture.host,'table:export')).save;
    assert.equal(fixture.portable.game.flags[fixture.flag],true);
    assert.ok(!fixture.portable.game.flags[fixture.otherFlag]);
    assert.deepEqual(Object.keys(fixture.portable.game.flags).filter(flag=>fixture.portable.game.flags[flag]).sort(),[...outcome.set].sort());
    assert.deepEqual(fixture.portable.game.chronicle,game.chronicle);
    if(fixture.peer){
      const peerGame=(await sync(fixture.peer)).game;
      assert.deepEqual(peerGame.chronicle,game.chronicle);
      assert.deepEqual(peerGame.scene.reading,game.scene.reading);
    }
  }
  assert.equal(rolls,2);
  console.log('OK server-rolled natural 20 resolves both mode choices into their own flag, exact chronicle result and matching carriage callback');

  const credentials=fixtures.flatMap(fixture=>[fixture.owner,...(fixture.guest?[fixture.guest]:[])]);
  for(const fixture of fixtures){
    const txt=assertPublicCopy(fixture.portable,fixture.state.game,credentials);
    assert.ok(txt.includes(fixture.state.game.chronicle.at(-1).text));
    assert.ok(txt.includes(fixture.state.game.scene.reading.echoes[0]));
  }
  const group=fixtures[1],before=group.state.game;
  const disconnected=nextState(group.host,state=>state.players.find(player=>player.id===group.guest.playerId)?.connected===false);
  group.peer.disconnect();
  const aloneOnline=(await disconnected).game;
  assert.equal(aloneOnline.storyMode,'group');assert.equal(aloneOnline.partySize,2);
  assert.equal(aloneOnline.players.filter(player=>player.connected).length,1);
  assert.ok(aloneOnline.revision>before.revision,'Presence change must invalidate old previews');
  assert.deepEqual(aloneOnline.chronicle,before.chronicle);
  assert.deepEqual(aloneOnline.scene.reading,before.scene.reading);
  const exported=ok(await ack(group.host,'table:export')).save;
  const textBefore=assertPublicCopy(exported,aloneOnline,credentials);

  // Wait for the real server-side disconnect event, without a wall-clock sleep.
  const hostGone=once(io.of('/table').sockets.get(group.host.id),'disconnect',{signal:AbortSignal.timeout(3500)});
  group.host.disconnect();await hostGone;
  group.host=await client();
  const resumed=ok(await ack(group.host,'table:resume',{
    code:group.owner.code,playerId:group.owner.playerId,token:group.owner.token,
  })).state;
  assert.equal(resumed.hostId,group.owner.playerId);
  assert.equal(resumed.game.storyMode,'group');assert.equal(resumed.game.partySize,2);
  assert.equal(resumed.game.modeDescription,campaign.playModes.group);
  assert.equal(resumed.game.players.find(player=>player.id===group.guest.playerId).connected,false);
  assert.deepEqual(resumed.game.chronicle,exported.game.chronicle);
  assert.deepEqual(resumed.game.scene.reading,before.scene.reading);
  assert.deepEqual(resumed.game.scene.arrival,before.scene.arrival);
  const afterExport=ok(await ack(group.host,'table:export')).save;
  assert.deepEqual(afterExport.game.flags,exported.game.flags);
  assert.deepEqual(afterExport.game.chronicle,exported.game.chronicle);
  assert.equal(assertPublicCopy(afterExport,resumed.game,credentials),textBefore);
  assert.equal(rolls,2,'Export, disconnect and resume must never roll');
  console.log('OK a disconnected companion does not change story mode; host export/resume preserves the chronicle and TXT without reconnect tokens');
  console.log('V18 PARTY NETWORK PASSED: 3 groups');
}catch(error){
  console.error('V18 PARTY NETWORK FAILED:',error.stack||error);process.exitCode=1;
}finally{
  for(const socket of sockets)socket.disconnect();
  try{
    await new Promise(resolve=>io.close(resolve));
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }catch(error){console.error('Party network cleanup failed:',error.message);process.exitCode=1;}
  finally{service.close();fs.rmSync(storageDir,{recursive:true,force:true});}
}
