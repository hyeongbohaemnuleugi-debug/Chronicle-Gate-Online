/** DOM and event sequencing tests. Layout and decoded audio are verified separately. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {createBattlePresenter} from '../public/game/battle-presenter.js';
import {renderBattleScreen,hydrateBattleSprites} from '../public/game/battle-ui.js';
import {buildCombatPresentation} from '../public/game/combat-presentation.js';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {createStoryState,applyAction,viewGame} from '../public/game/engine.js';
import {startCombat} from '../public/game/combat.js';

const story=CAMPAIGNS[0];
function encounter(count=2,{health=3,enemyHealth=null,die=12}={}){
  const players=story.classes.slice(0,count).map((job,i)=>({id:`p-${i}`,name:`동료 ${i+1}`,classId:job.id,connected:true}));
  const before=createStoryState(story,players),node=Object.values(story.nodes).find(node=>node.encounter);
  before.nodeId=node.id;before.visited=[story.start,node.id];before.players.forEach(p=>p.health=health);startCombat(before,story);
  if(enemyHealth!==null)before.combat.enemyHealth=enemyHealth;
  let first=true;
  const result=applyAction(before,story,players[0].id,{combatAction:'basic',revision:before.revision},{roll:()=>{const value=first?die:1;first=false;return value;}});assert.equal(result.ok,true,result.error);
  const from=viewGame(before,story,players[0].id),to=viewGame(result.game,story,players[0].id);
  return {from,to,plan:buildCombatPresentation(from,to)};
}
function harness(view,{reduce=false,motion=true}={}){
  const html=renderBattleScreen(view,{meId:view.players[0].id,reduceMotion:reduce,art:()=>'<div class="fixture-backdrop"></div>',commands:'<button data-combat="basic">기본 공격</button><button data-combat="ability">직업 능력</button>'});
  const dom=new JSDOM(`<body>${html}</body>`,{pretendToBeVisual:true}),win=dom.window,doc=win.document;
  if(motion)win.Element.prototype.animate=()=>({cancel(){}});
  let id=0;const timers=new Map(),sounds=[],events=[];
  win.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};win.clearTimeout=id=>timers.delete(id);
  const presenter=createBattlePresenter({document:doc,window:win,reducedMotion:()=>reduce,effect:(name,options)=>sounds.push({name,options}),onEvent:event=>events.push(event.type)});
  const root=doc.querySelector('[data-battle-stage]');
  return {win,doc,root,presenter,timers,sounds,events,step(){const [key,timer]=timers.entries().next().value||[];if(timer){timers.delete(key);timer.fn();}},finish(){let limit=100;while(timers.size&&limit--)this.step();assert.ok(limit>0);},close(){presenter.destroy();win.close();}};
}

test('each authored encounter renders its named sprite, exact party size and a separate command desk',()=>{
  for(const campaign of CAMPAIGNS)for(const count of [1,2,3,4]){
    const players=campaign.classes.slice(0,count).map((job,i)=>({id:`${i}`,name:`독자 ${i}`,classId:job.id}));
    const state=createStoryState(campaign,players),node=Object.values(campaign.nodes).find(node=>node.encounter);
    state.nodeId=node.id;startCombat(state,campaign);
    const view=viewGame(state,campaign,'0'),dom=new JSDOM(renderBattleScreen(view,{meId:'0',art:()=>'',commands:'<button data-combat="basic">공격</button><button data-combat="ability">능력</button>'})),doc=dom.window.document;
    assert.equal(doc.querySelectorAll('[data-fighter-id]').length,count);
    assert.equal(doc.querySelector('[data-battle-enemy-hp]').value,2+count*4);
    assert.ok(doc.querySelector('.battle-enemy-sprite').getAttribute('src').includes(`${node.encounter.id}.webp`));
    assert.ok(doc.querySelector('.battle-enemy-sprite').alt.length>8);
    assert.equal(doc.querySelector('#combat-title').textContent,node.encounter.enemyName);
    assert.equal(doc.querySelectorAll('[data-combat]').length,2);
    assert.equal(doc.querySelector('.story-paper'),null);
    dom.window.close();
  }
});

test('ordered effects use committed damage and never mutate the authoritative views',async()=>{
  const {from,to,plan}=encounter(2),frozen=JSON.stringify([from,to,plan]),h=harness(from);
  try{
    const presentation=h.presenter.show(plan,h.root);
    assert.deepEqual(h.events,['attack']);assert.equal(h.doc.querySelector('[data-battle-enemy-hp]').value,10);
    h.step();assert.deepEqual(h.events,['attack','enemy-hit']);assert.equal(h.doc.querySelector('[data-battle-enemy-hp]').value,8);
    assert.equal(h.root.querySelector('.battle-number').textContent,'−2');
    h.finish();assert.deepEqual(await presentation,{cancelled:false});
    assert.deepEqual(h.sounds.map(c=>c.name),['battle-swing','battle-hit']);
    assert.ok(h.sounds.every(c=>c.options.scope==='battle'));assert.equal(JSON.stringify([from,to,plan]),frozen);
  }finally{h.close();}
});

test('a finishing blow retains the arena, shows zero enemy health, recovery, then victory',async()=>{
  const {from,to,plan}=encounter(1,{health:2,enemyHealth:1,die:20}),h=harness(from);
  try{
    assert.equal(to.combat,null);assert.equal(plan.outcome,'victory');
    const pending=h.presenter.show(plan,h.root);h.finish();await pending;
    assert.equal(h.doc.querySelector('[data-battle-enemy-hp]').value,0);
    assert.equal(h.doc.querySelector('[data-fighter-hp]').value,3);
    assert.equal(h.root.dataset.battleOutcome,'victory');assert.equal(h.doc.querySelector('[data-battle-outcome]').hidden,false);
    assert.ok(h.events.indexOf('enemy-hit')<h.events.indexOf('recovery'));assert.ok(h.events.indexOf('recovery')<h.events.indexOf('victory'));
    assert.equal(h.sounds.filter(c=>c.name==='battle-victory').length,1);
  }finally{h.close();}
});

test('fumble self-death shows the actor falling rather than inventing an enemy hit',async()=>{
  const {from,plan}=encounter(1,{health:1,die:1}),h=harness(from);
  try{
    const pending=h.presenter.show(plan,h.root);h.finish();await pending;
    assert.equal(h.doc.querySelector('[data-battle-enemy-hp]').value,6);
    assert.equal(h.doc.querySelector('[data-fighter-hp]').value,0);assert.ok(h.doc.querySelector('[data-fighter-id]').classList.contains('is-fallen'));
    assert.deepEqual(h.events,['attack','fumble','death','defeat']);
    assert.ok(!h.sounds.some(c=>c.name==='battle-hit'||c.name==='death'));assert.equal(h.sounds.at(-1).name,'battle-defeat');
  }finally{h.close();}
});

test('skip applies every final visual state silently; cancel prevents all later impacts',async()=>{
  const fixture=encounter(1,{enemyHealth:1,die:20}),h=harness(fixture.from);
  try{
    const skipped=h.presenter.show(fixture.plan,h.root);const count=h.sounds.length;h.presenter.finish();assert.deepEqual(await skipped,{cancelled:false});
    assert.equal(h.sounds.length,count);assert.equal(h.timers.size,0);assert.equal(h.root.dataset.battleOutcome,'victory');
    const cancelled=h.presenter.show(fixture.plan,h.root);h.presenter.cancel();const afterCancel=h.sounds.length;h.finish();
    assert.deepEqual(await cancelled,{cancelled:true});assert.equal(h.sounds.length,afterCancel);assert.equal(h.presenter.active,false);
  }finally{h.close();}
});

test('reduced motion and unsupported animation return immediately without fabricated sounds',async()=>{
  const fixture=encounter();for(const options of [{reduce:true},{motion:false}]){const h=harness(fixture.from,options);try{assert.equal(h.presenter.canAnimate,false);assert.deepEqual(await h.presenter.show(fixture.plan,h.root),{fallback:true});assert.equal(h.timers.size,0);assert.deepEqual(h.sounds,[]);if(options.reduce)assert.ok(h.doc.querySelector('.battle-screen.reduce-motion'));}finally{h.close();}}
});

test('an unavailable enemy image keeps its actual name and no broken-image control',()=>{
  const fixture=encounter(),h=harness(fixture.from);try{
    hydrateBattleSprites(h.doc);const image=h.doc.querySelector('.battle-enemy-sprite');image.dispatchEvent(new h.win.Event('error'));
    assert.equal(image.hidden,true);assert.equal(h.doc.querySelector('.battle-enemy-fallback').hidden,false);assert.ok(h.doc.querySelector('.battle-enemy-fallback').textContent.includes(fixture.from.combat.enemy.name));
  }finally{h.close();}
});

test('player names, enemy description and receipt text are escaped on every battle surface',()=>{
  const {from}=encounter();from.players[0].name='<img src=x onerror=alert(1)>';from.combat.enemy.description='<script>alert(2)</script>';from.combat.log=[{text:'<svg onload=alert(3)>'}];
  const h=harness(from);try{assert.equal(h.doc.querySelector('script,[onerror],[onload]'),null);assert.ok(h.doc.body.textContent.includes('<img src=x onerror=alert(1)>'));}finally{h.close();}
});

test('authored responsive boxes leave a positive HUD/sprite gap from320to1440px; long names retain full accessible text',()=>{
  // This is a CSS geometry contract for explicitly sized horizontal boxes,
  // not a browser/font/layout test. It catches the former320px21px overlap.
  const css=fs.readFileSync(new URL('../public/game/styles.css',import.meta.url),'utf8');
  const dom=new JSDOM(`<style>${css}</style>`),rules=dom.window.document.styleSheets[0].cssRules;
  function styles(selectors,viewport){
    const result={},scores={};
    function walk(list){for(const rule of list){
      if(rule.media){const query=rule.conditionText;if(/prefers|forced/.test(query))continue;const max=query.match(/max-width:\s*(\d+)px/),min=query.match(/min-width:\s*(\d+)px/);if((max&&viewport>Number(max[1]))||(min&&viewport<Number(min[1])))continue;walk(rule.cssRules);}
      else if(rule.selectorText){for(const selector of rule.selectorText.split(',').map(v=>v.trim())){if(!selectors.includes(selector))continue;const specificity=(selector.match(/\./g)||[]).length;for(let i=0;i<rule.style.length;i++){const key=rule.style[i];if(specificity>=(scores[key]??-1)){result[key]=rule.style.getPropertyValue(key);scores[key]=specificity;}}}}
    }}walk(rules);return result;
  }
  const pixels=(value,parent)=>{
    if(value==='none'||!value)return Infinity;
    if(value.startsWith('min('))return Math.min(...value.slice(4,-1).split(',').map(v=>pixels(v.trim(),parent)));
    return value.endsWith('%')?parseFloat(value)/100*parent:parseFloat(value);
  };
  for(const viewport of [320,360,390,480,481,700,701,960,961,1440]){
    const layout=styles(['.table-layout','.table-layout.battle-layout'],viewport),padding=layout.padding.split(/\s+/).map(parseFloat),right=padding[1]??padding[0],left=padding[3]??right;
    const stage=Math.min(viewport,pixels(layout['max-width'],viewport))-left-right-4; // article+screen1px borders.
    const hud=styles(['.battle-enemy-hud'],viewport),sprite=styles(['.battle-enemy-position'],viewport);
    const hudRight=pixels(hud.left,stage)+pixels(hud.width,stage);
    const spriteWidth=Math.min(pixels(sprite.width,stage),pixels(sprite['max-width'],stage));
    const spriteLeft=stage-pixels(sprite.right,stage)-spriteWidth;
    assert.ok(spriteLeft-hudRight>=3,`${viewport}px viewport overlaps HUD with enemy frame by ${hudRight-spriteLeft}px.`);
    assert.ok(spriteLeft>=0&&spriteLeft+spriteWidth<=stage,`${viewport}px sprite frame must remain inside the stage.`);
  }
  const {from}=encounter(4);from.players[0].name='오래된기록을지키는하린';const h=harness(from);
  try{const label=h.doc.querySelector('.battle-person-name b');assert.equal(label.textContent,from.players[0].name);assert.equal(label.title,from.players[0].name);assert.equal(styles(['.battle-person-name>b'],320)['-webkit-line-clamp'],'2');}finally{h.close();dom.window.close();}
});
