import assert from 'node:assert/strict';
export const ok = result => {assert.equal(result?.ok,true,result?.error);return result;};
export const roster = (campaign,count=4) => campaign.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id,connected:true}));
/** Exercise real private choices before legacy shared-story network assertions. */
export async function finishNetworkOpenings(sockets,ack){
 let serial=0;
 for(const socket of sockets){
  for(let stage=0;stage<2;stage++){
   const state=ok(await ack(socket,'table:sync')).state;
   if(state.game?.phase!=='opening'||state.game.opening?.mine?.ready)break;
   const choice=state.game.scene.choices.find(c=>c.automatic);
   assert.ok(choice,'A profession opening needs a safe choice.');
   ok(await ack(socket,'table:act',{choiceId:choice.id,revision:state.game.actionRevision,requestId:`opening-fixture-${state.meId}-${serial++}`}));
  }
 }
 const state=ok(await ack(sockets[0],'table:sync')).state;
 assert.equal(state.game.phase,'playing');assert.equal(state.game.opening.active,false);assert.ok(state.game.opening.meeting);
 return state;
}
/** The real local hand-off UI, without choosing an obsolete start mode. */
export async function finishLocalOpenings(app,click){
 let limit=32;
 while(limit--){
  const doc=app.doc;
  if(doc.querySelector('[data-action="opening-receive"]')){await click(app,'[data-action="opening-receive"]');continue;}
  if(doc.querySelector('[data-action="opening-next"]')){await click(app,'[data-action="opening-next"]');continue;}
  if(doc.querySelector('[data-action="opening-meeting"]')){await click(app,'[data-action="opening-meeting"]');continue;}
  if(doc.querySelector('[data-action="opening-main"]')){await click(app,'[data-action="opening-main"]');continue;}
  if(doc.querySelector('.opening-story')){
   const safe=doc.querySelector('.choices [data-choice="safe"]');assert.ok(safe,'Authored safe private choice');
   await click(app,'.choices [data-choice="safe"]');await click(app,'[data-action="confirm-action"]');continue;
  }
  assert.ok(doc.querySelector('#scene-title'),'Public story reached');return;
 }
 assert.fail('Private hand-off did not finish');
}
