/** Authored optional encounters, installed after a story length is composed.
 * Old scene/encounter IDs remain valid for saves. Original manuscripts are never mutated.
 */
import { ENCOUNTERS_A } from './encounters-a.js';
import { ENCOUNTERS_B } from './encounters-b.js';
const CONTENT = {...ENCOUNTERS_A,...ENCOUNTERS_B};
const origins = new WeakMap();
const variants = new WeakMap();
const copy = value => JSON.parse(JSON.stringify(value));
export const RESOLUTION_METHODS = Object.freeze(['bypassed','negotiated','tool','victory']);
export const encounterFlag = (id,method) => `v24_${id.replaceAll('-','_')}_${method}`;
export const rawEncounterCampaign = campaign => origins.get(campaign);
export function installEncounters(source) {
  if (!source || origins.has(source) || !CONTENT[source.id]) return source;
  if (variants.has(source)) return variants.get(source);
  const content=CONTENT[source.id], nodes=copy(source.nodes);
  if(nodes['et1-02']?.text)nodes['et1-02'].text=nodes['et1-02'].text.map(text=>text.replace('앞선 싸움으로 손이 떨린다면','긴장으로 손이 떨린다면'));
  // Earlier manuscripts assumed the one compulsory fight had been won. Keep
  // those files intact and neutralize only the explicitly authored phrases.
  const revise=value=>typeof value==='string'?(content.continuityEdits||[]).reduce((text,edit)=>text.replaceAll(edit.from,edit.to),value):value;
  for(const node of Object.values(nodes)){
    for(const key of ['summary','stakes','objective'])if(node[key])node[key]=revise(node[key]);
    if(node.text)node.text=node.text.map(revise);
    if(node.partyText)for(const key of Object.keys(node.partyText))node.partyText[key]=node.partyText[key].map(revise);
    for(const choice of node.choices||[]){choice.label=revise(choice.label);for(const outcome of Object.values(choice.outcomes||{}))for(const key of ['text','arrival','lossText','survivorArrival'])if(outcome[key])outcome[key]=revise(outcome[key]);}
  }
  const flags={...source.flags,...content.flags}, clues={...source.clues,...content.clues}, items={...source.items,...content.items};
  let start=source.start;
  const coreNode=Object.values(nodes).find(node=>node.encounter);
  if(!coreNode)throw Error(`기존 전투가 없습니다: ${source.id}`);
  const plans=[...(content.shared||[]),{...content.core,id:coreNode.encounter.id,anchor:coreNode.id,core:true},...(source.lengthMode==='epic'?content.epic||[]:[])];
  if(plans.length!==(source.lengthMode==='epic'?5:3))throw Error(`조우 수가 맞지 않습니다: ${source.id}`);
  const entries=[];
  for(const spec of plans){
    const anchor=nodes[spec.anchor];
    if(!anchor||anchor.ending)throw Error(`조우 연결 장소가 없습니다: ${source.id}/${spec.anchor}`);
    const gateId=`v24-${spec.id}-approach`, arenaId=spec.core?anchor.id:`v24-${spec.id}-arena`;
    if(nodes[gateId]||(!spec.core&&nodes[arenaId]))throw Error(`조우 장면 중복: ${spec.id}`);
    const encounter=spec.core?{...anchor.encounter,actions:spec.actions||{basic:source.classes.map(job=>job.basic.text),ability:source.classes.map(job=>job.ability.text)}}:{id:spec.id,nodeId:arenaId,title:spec.title,intro:spec.intro,
      enemyName:spec.enemyName,enemyDescription:spec.enemyDescription,intents:spec.intents,
      victoryText:spec.victoryText,defeatText:spec.defeatText,hpPerPlayer:2,actions:spec.actions};
    encounter.optional=true;
    encounter.resolutionFlags=Object.fromEntries(RESOLUTION_METHODS.map(method=>[method,encounterFlag(spec.id,method)]));
    if(!encounter.victoryFlag){encounter.victoryFlag=encounter.resolutionFlags.victory;encounter.victoryFlagLabel=`${encounter.enemyName} · 전투에서 승리했다`;}
    const methodLabels={bypassed:'충돌을 피했다',negotiated:'대화나 교란으로 해결했다',tool:'소지품으로 해결했다',victory:'전투에서 승리했다'};
    for(const method of RESOLUTION_METHODS)flags[encounter.resolutionFlags[method]]=`${encounter.enemyName} · ${methodLabels[method]}`;
    flags[encounter.victoryFlag]=encounter.victoryFlagLabel||flags[encounter.victoryFlag]||`${encounter.enemyName} · 제압했다`;
    // Redirect incoming journeys before adding this gate's own return edge.
    for(const node of Object.values(nodes))for(const choice of node.choices||[])for(const outcome of Object.values(choice.outcomes||{}))if(outcome.next===anchor.id)outcome.next=gateId;
    if(start===anchor.id)start=gateId;
    const translate=raw=>{
      const {method='negotiated',...outcome}=raw;
      if(method!=='fight'&&!['bypassed','negotiated','tool'].includes(method))throw Error(`전투 승리는 선택지로 부여할 수 없습니다. 알 수 없는 조우 해결: ${spec.id}/${method}`);
      return {...outcome,next:arenaId,...(method==='fight'?{}:{encounterResolution:{id:encounter.id,method},set:[...(outcome.set||[]),encounter.resolutionFlags[method]]})};
    };
    const choices=[{id:`fight-${spec.id}`,label:spec.fightLabel||'위협에 정면으로 맞서 싸운다',automatic:true,
      risk:'전투를 시작합니다. 다음 화면에서 기본 공격과 직업 능력을 고르며 주사위를 굴립니다. 생명 0은 사망이고 전원 사망하면 이야기가 끝납니다.',
      outcomes:{success:{text:spec.fightText||`${encounter.enemyName} 앞에서 물러서지 않는다. 일행은 공격에 대비하며 각자의 자리를 잡는다.`,next:arenaId}}},
      {id:`avoid-${spec.id}`,label:spec.bypass.label,automatic:true,risk:spec.bypass.risk||'전투를 피하고 이야기를 이어갑니다. 선택에 따른 시간·위기의 변화를 확인하세요.',
      outcomes:{success:translate({method:'bypassed',text:spec.bypass.text,pressure:spec.bypass.pressure??1,...spec.bypass.effects})}}];
    const talk=spec.negotiate;
    if(talk){
      if(!['critical','success','failure','fumble'].every(grade=>talk.outcomes?.[grade]?.text))throw Error(`네 판정 결과가 필요합니다: ${spec.id}`);
      choices.push({id:`negotiate-${spec.id}`,label:talk.label,stat:talk.stat||'heart',dc:talk.dc||11,
        risk:talk.risk||'주사위 결과에 따라 싸움을 피하거나 전투가 시작됩니다. 네 가지 결과를 확인한 뒤 진행하세요.',
        outcomes:Object.fromEntries(Object.entries(talk.outcomes).map(([grade,outcome])=>[grade,translate(outcome)]))});
    }
    if(spec.tool){const {text,callback,...tool}=spec.tool;choices.push({id:`tool-${spec.id}`,automatic:true,risk:'가지고 온 소지품을 사용해 싸움 없이 통과합니다.',...tool,
      outcomes:{success:translate({method:'tool',text,...spec.tool.effects})},lockedHint:spec.tool.lockedHint||'이 방법에 필요한 소지품을 아직 가지고 있지 않습니다.'});}
    const epicOnly=(content.epic||[]).some(row=>row.id===spec.id);
    const common={chapter:anchor.chapter||2,location:spec.location||anchor.location,art:spec.art??anchor.art??0,entities:[],details:[],epic:epicOnly||Boolean(anchor.epic)};
    nodes[gateId]={...common,id:gateId,title:spec.gateTitle||encounter.title,text:spec.gateText,partyText:spec.partyText,
      mood:'tension',summary:spec.gateText?.[0],objective:'맞서 싸울지, 다른 방법으로 통과할지 결정하세요.',
      stakes:'전투는 선택입니다. 우회는 주사위 없이 진행하며, 협상·교란은 네 판정 결과에 따라 달라집니다.',
      encounterGate:encounter.id,choices};
    if(spec.core)nodes[arenaId]={...anchor,encounter,...(spec.aftermathText?{text:spec.aftermathText,partyText:spec.aftermathPartyText,summary:spec.aftermathText[0]}:{})};
    else nodes[arenaId]={...common,id:arenaId,title:spec.title,text:spec.aftermathText||['당장의 위협을 넘겼다. 이제 예정했던 길을 이어갈 수 있다.'],
      summary:spec.aftermathText?.[0]||'당장의 위협을 넘겼다. 이제 예정했던 길을 이어갈 수 있다.',objective:anchor.objective||source.objective,
      stakes:spec.aftermathStakes||'이곳의 대치는 끝났습니다. 해결한 방법과 사용한 소지품은 기록에 남고, 다음 이동에는 주사위를 굴리지 않습니다.',
      mood:'mystery',encounter,choices:[{id:`continue-${spec.id}`,label:spec.continueLabel||'다음 이야기를 이어간다',automatic:true,
        outcomes:{success:{next:anchor.id,text:spec.continueText||`앞을 막던 문제를 넘기고 ${anchor.location||anchor.title}의 남은 일을 살피러 간다.`}}}]};
    const callbacks=RESOLUTION_METHODS.map(method=>({when:{flag:encounter.resolutionFlags[method]},text:spec.echoes?.[method]||
      (method==='victory'?spec.victoryCallback||encounter.victoryText:method==='tool'?spec.tool?.callback:method==='bypassed'?spec.bypass.callback:spec.negotiate?.callback)})).filter(row=>row.text);
    const echoNode=nodes[spec.followupAt]||nodes[arenaId];
    echoNode.callbacks=[...(echoNode.callbacks||[]),...callbacks];
    entries.push({id:encounter.id,name:encounter.enemyName,gateId,arenaId,anchor:anchor.id,epicOnly});
  }
  const result={...source,nodes,flags,clues,items,start,encounterEdition:24,encounterCatalog:entries};
  variants.set(source,result);origins.set(result,source);return result;
}
