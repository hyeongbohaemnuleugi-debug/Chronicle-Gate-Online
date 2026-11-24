/** Mode-specific story branches must be real, reachable and remembered. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createGame,applyAction,previewAction,availableChoices,viewGame,conditionMatches,storyMode,validateSave,gradeRoll} from '../public/game/engine.js';
import {chronicleText} from '../public/game/narrative.js';

const modes=[{key:'solo',size:1},{key:'group',size:4}];
const grades=['critical','success','failure','fumble'];
const roster=(c,size)=>c.classes.slice(0,size).map((job,i)=>({id:`p${i}`,name:`독자${i+1}`,classId:job.id}));
const modeOf=choice=>choice.requires?.partyMax===1?'solo':choice.requires?.partyMin===2?'group':null;
const cast=(game,c,payload,roll=20)=>{
  const r=applyAction(game,c,game.players[game.activeIndex].id,{...payload,revision:game.revision},{roll});
  assert.equal(r.ok,true,`${c.id}/${game.nodeId}: ${r.error}`);return r.game;
};
function prepare(game,c){
  for(let turns=0;game.combat&&turns<45;turns++){
    let first=true;game=cast(game,c,{combatAction:'basic'},()=>{const d=first?20:1;first=false;return d;});
  }
  assert.equal(Boolean(game.combat),false);
  if(game.phase==='playing')for(const detail of c.nodes[game.nodeId].details||[]){
    if(!game.detailsRead[`${game.nodeId}:${detail.id}`])game=cast(game,c,{detailId:detail.id});
  }
  return game;
}
const stateKey=g=>JSON.stringify([g.nodeId,Object.keys(g.flags).filter(k=>g.flags[k]).sort(),g.clues.slice().sort(),g.inventory.slice().sort(),g.players.map(p=>p.health),g.activeIndex]);
function reachBranches(c,mode){
  const targets=Object.values(c.nodes).flatMap(n=>(n.choices||[]).filter(a=>modeOf(a)===mode.key).map(a=>`${n.id}/${a.id}`));
  const queue=[createGame(c,roster(c,mode.size))],seen=new Set(),found=new Map();let cursor=0;
  while(cursor<queue.length&&found.size<targets.length){
    let game=queue[cursor++];if(game.phase!=='playing')continue;
    game=prepare(game,c);const key=stateKey(game);if(seen.has(key))continue;seen.add(key);
    assert.ok(seen.size<14000,`${c.id}/${mode.key}: search budget exceeded`);
    for(const choice of availableChoices(game,c)){
      const id=`${game.nodeId}/${choice.id}`;
      if(targets.includes(id)&&!found.has(id))found.set(id,game);
      queue.push(cast(game,c,{choiceId:choice.id}));
    }
  }
  assert.equal(found.size,targets.length,`${c.id}/${mode.key}: unreachable mode-specific choice`);
  return found;
}
function finish(game,c){
  let steps=0;
  while(game.phase==='playing'&&steps++<35){
    game=prepare(game,c);if(game.phase!=='playing')break;
    const next=availableChoices(game,c)[0];assert.ok(next);game=cast(game,c,{choiceId:next.id});
  }
  assert.equal(game.phase,'ended');assert.notEqual(game.nodeId,'__all_dead__');
  assert.equal(game.completedCombats.length,1);return game;
}
function flagsIn(condition){
  if(!condition)return[];if(Array.isArray(condition))return condition.flatMap(flagsIn);
  return [...(condition.flag?[condition.flag]:[]),...(condition.all||[]).flatMap(flagsIn),...(condition.any||[]).flatMap(flagsIn)];
}

test('party predicates include dead and disconnected seats, while living requirements remain separate',()=>{
  const c=CAMPAIGNS[0],g=createGame(c,roster(c,4));
  g.players.slice(1).forEach(p=>{p.health=0;p.life='dead';p.connected=false;});
  assert.equal(storyMode(g),'group');
  assert.equal(conditionMatches({partyMin:2},g),true);
  assert.equal(conditionMatches({partyMax:1},g),false);
  assert.equal(conditionMatches({partyMin:2,aliveMin:2},g),false);
  assert.equal(conditionMatches({all:[{partyMin:2},{aliveMin:1}]},g),true);
  const restored=validateSave({format:'chronicle-gate-v18',game:g},CAMPAIGNS).game;
  assert.equal(storyMode(restored),'group');assert.equal(viewGame(restored,c,'p0').partySize,4);
  assert.equal(availableChoices(restored,c).some(a=>modeOf(a)==='solo'),false);
});

for(const c of CAMPAIGNS){
  test(`${c.id}: solo and group have distinct readable openings and two actual branch opportunities`,()=>{
    const openings={};
    for(const mode of modes){
      const game=createGame(c,roster(c,mode.size)),view=viewGame(game,c,'p0');
      assert.equal(view.storyMode,mode.key);assert.equal(view.partySize,mode.size);
      assert.ok(c.playModes?.[mode.key]?.length>=15,'explain the authored difference plainly');
      assert.equal(view.modeDescription,c.playModes[mode.key]);
      assert.ok(c.nodes[c.start].partyText?.[mode.key]?.length>=2);
      assert.deepEqual(view.scene.reading.paragraphs,c.nodes[c.start].partyText[mode.key]);
      assert.deepEqual(view.chroniclePrologue,c.nodes[c.start].partyText[mode.key]);
      openings[mode.key]=view.scene.reading.paragraphs.join('\n');
      const all=Object.values(c.nodes).flatMap(node=>(node.choices||[]).filter(a=>modeOf(a)===mode.key).map(choice=>({node,choice})));
      assert.equal(all.length,2,'one early and one later authored choice per mode');
      assert.equal(new Set(all.map(row=>row.node.id)).size,2);
      for(const {node,choice} of all){
        assert.ok(!choice.automatic);assert.deepEqual(Object.keys(choice.outcomes).sort(),grades.slice().sort());
        assert.ok(node.partyText?.[mode.key]?.length>=2,`${node.id}: contextual mode introduction`);
        const wrong=createGame(c,roster(c,mode.size===1?4:1));wrong.nodeId=node.id;
        const before=JSON.stringify(wrong);let rolled=false;
        const bad=applyAction(wrong,c,'p0',{choiceId:choice.id,storyMode:mode.key},{roll:()=>{rolled=true;return 20;}});
        assert.equal(bad.ok,false);assert.equal(rolled,false);assert.equal(JSON.stringify(wrong),before);
      }
      // A lone survivor retains the shared history and still has a usable route.
      const remaining=createGame(c,roster(c,4));remaining.players.slice(1).forEach(p=>{p.health=0;p.life='dead';});
      for(const node of Object.values(c.nodes).filter(n=>!n.ending)){
        remaining.nodeId=node.id;
        assert.ok(availableChoices(remaining,c).some(a=>!a.useItems?.length&&!a.consumeItems?.length),`${node.id}: lone survivor locked out`);
        assert.ok(!availableChoices(remaining,c).some(a=>modeOf(a)==='solo'));
      }
      const output=chronicleText(view);assert.ok(output.includes(openings[mode.key] .split('\n')[0]));
      for(const role of c.roles)assert.ok(!output.includes(role.secret));
    }
    assert.notEqual(openings.solo,openings.group);
    assert.notEqual(c.playModes.solo,c.playModes.group);
  });

  test(`${c.id}: all new branches resolve four grades and keep earned callbacks through saving and the ending`,()=>{
    for(const mode of modes){
      const reached=reachBranches(c,mode);
      for(const [key,state] of reached){
        const actionId=key.slice(key.indexOf('/')+1),choice=availableChoices(state,c).find(a=>a.id===actionId);
        const plan=previewAction(state,c,state.players[state.activeIndex].id,{choiceId:actionId}).plan;
        for(const grade of grades){
          const die=Array.from({length:20},(_,i)=>i+1).find(d=>gradeRoll(d,d+plan.bonus,plan.dc)===grade);
          assert.ok(die,`${key}: unreachable ${grade}`);
          const after=cast(state,c,{choiceId:actionId},die);
          assert.equal(after.lastResult.grade,grade);assert.equal(after.chronicle.at(-1).action,choice.label);
          assert.ok(after.chronicle.at(-1).text.includes(after.lastResult.deaths.length?choice.outcomes[grade].lossText:choice.outcomes[grade].text));
          const reloaded=validateSave({format:'chronicle-gate-v18',game:after},CAMPAIGNS).game;
          assert.deepEqual(reloaded.flags,after.flags);assert.deepEqual(reloaded.chronicle,after.chronicle);
          assert.equal(viewGame(reloaded,c,'p0').storyMode,mode.key);
        }
        const after=cast(state,c,{choiceId:actionId},20),newFlags=Object.keys(after.flags).filter(flag=>!state.flags[flag]);
        const callbacks=Object.values(c.nodes).flatMap(n=>[...(n.callbacks||[]),...(n.epilogues||[])]);
        assert.ok(newFlags.some(flag=>callbacks.some(cb=>flagsIn(cb.when).includes(flag))),`${key}: choice has no later authored memory`);
        const ended=finish(after,c),view=viewGame(ended,c,'p0');
        const matches=[...(c.nodes[ended.nodeId].epilogues||[]),...(c.nodes[ended.nodeId].callbacks||[])].filter(cb=>conditionMatches(cb.when,ended)&&newFlags.some(flag=>flagsIn(cb.when).includes(flag)));
        assert.ok(matches.length,`${key}: actual completed route forgets the mode-specific choice`);
        for(const cb of matches){assert.ok(view.scene.reading.echoes.includes(cb.text));assert.ok(chronicleText(view).includes(cb.text));}
      }
    }
  });

  test(`${c.id}: new scene links cannot skip the fight or return to an earlier scene`,()=>{
    const gate=Object.values(c.nodes).find(n=>n.encounter).id,seen=new Set(),stack=new Set(),ends=new Set();
    function walk(id,fought=false){
      assert.ok(!stack.has(id),`cycle at ${id}`);const node=c.nodes[id];assert.ok(node);
      fought ||= id===gate;
      if(node.ending){assert.ok(fought,`${id}: combat bypass`);ends.add(id);return;}
      const key=`${id}:${fought}`;if(seen.has(key))return;seen.add(key);stack.add(id);
      for(const choice of node.choices)for(const result of Object.values(choice.outcomes))walk(result.next,fought);
      stack.delete(id);
    }
    walk(c.start);assert.equal(ends.size,5);
  });
}
