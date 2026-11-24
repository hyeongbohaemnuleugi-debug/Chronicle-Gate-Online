import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {D20_VERTICES,D20_FACES,orientationFor,diceFrame,diceSvg,createDicePresenter,ROLL_DURATION} from '../public/game/dice.js';

const dot=(a,b)=>a.reduce((total,x,i)=>total+x*b[i],0);
test('the die is a closed regular icosahedron with twenty unique values and opposite sides totaling 21',()=>{
  assert.equal(D20_VERTICES.length,12);assert.equal(D20_FACES.length,20);
  assert.deepEqual(D20_FACES.map(face=>face.number).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
  const edges=new Map(),lengths=[];
  for(const face of D20_FACES){
    assert.equal(face.vertices.length,3);
    assert.ok(dot(face.center,face.normal)>0);
    const opposite=D20_FACES.find(other=>dot(face.normal,other.normal)<-.999999);
    assert.equal(face.number+opposite.number,21);
    for(let i=0;i<3;i++){
      const pair=[face.vertices[i],face.vertices[(i+1)%3]].sort((a,b)=>a-b),key=pair.join(':');
      edges.set(key,(edges.get(key)||0)+1);
      lengths.push(Math.hypot(...D20_VERTICES[pair[0]].map((x,j)=>x-D20_VERTICES[pair[1]][j])));
    }
  }
  assert.equal(edges.size,30);assert.ok([...edges.values()].every(count=>count===2));
  assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-10);
});

test('all twenty authoritative results settle on the visible numbered face without randomness',()=>{
  const random=Math.random;Math.random=()=>{throw Error('Presentation cannot reroll');};
  try{
    for(let roll=1;roll<=20;roll++){
      const end=diceFrame(roll,1),start=diceFrame(roll,0),middle=diceFrame(roll,.48);
      assert.equal(end.roll,roll);assert.equal(end.frontFace,roll);assert.equal(start.roll,null);assert.equal(middle.roll,null);
      assert.notDeepEqual(start.faces.map(face=>face.points),middle.faces.map(face=>face.points));
      assert.ok(end.faces.every(face=>face.points.flat().every(Number.isFinite)));
      const face=end.faces.find(face=>face.number===roll);
      assert.ok(face.normal[2]>.999999);assert.ok(face.opacity>.99);
      const svg=diceSvg(roll,1);assert.match(svg,new RegExp(`aria-label="D20 ${roll}"`));
      assert.equal((svg.match(/<polygon/g)||[]).length,end.faces.length);
      assert.ok(!svg.includes('NaN'));
    }
  }finally{Math.random=random;}
  for(const value of [0,21,NaN,'20',1.5,null])assert.throws(()=>orientationFor(value),RangeError);
});

function harness({canvas=true,reduce=false}={}){
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://chronicle.test',pretendToBeVisual:true}),w=dom.window;
  let time=0,id=0;const frames=new Map(),settled=[],cancelled=[],drawn=[],media=new w.EventTarget();media.matches=reduce;
  w.matchMedia=()=>media;
  Object.defineProperty(w.performance,'now',{value:()=>time});
  w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(canvas){
    w.CanvasRenderingContext2D=class{};
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({fillText:(...args)=>drawn.push(args)},{get:(target,key)=>key in target?target[key]:(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
  }
  const presenter=createDicePresenter({document:w.document,window:w,onSettled:(result,meta)=>settled.push([result,meta]),onCancel:()=>cancelled.push(true)});
  return {w,doc:w.document,presenter,frames,settled,cancelled,drawn,
    step(ms){time+=ms;for(const [id,fn] of [...frames])if(frames.delete(id))fn(time);},
    systemReduced(value){media.matches=value;media.dispatchEvent(new w.Event('change'));},
    close(){presenter.destroy();w.close();}};
}
const receipt={actor:'하린',action:'문을 붙든다',roll:14,bonus:3,total:17,dc:12,grade:'success',text:'문을 버틴 사이 마지막 동료가 건너간다.'};

test('rolling hides the authoritative receipt until settle, then reveals exact formula and completes once',async()=>{
  const h=harness();try{
    const result=h.presenter.show(receipt,{event:'first'});
    assert.equal(h.presenter.active,true);assert.equal(h.doc.querySelector('#dice-dialog').dataset.phase,'rolling');
    assert.ok(!h.doc.body.textContent.includes(receipt.text));assert.equal(h.doc.querySelector('.dice-final-grade'),null);
    assert.ok(!h.doc.querySelector('#dice-dialog').className.includes('success'));
    h.step(ROLL_DURATION/2);assert.equal(h.settled.length,0);assert.equal(h.frames.size,1);
    h.step(ROLL_DURATION/2);assert.equal(h.frames.size,0);assert.equal(h.settled.length,1);
    assert.equal(h.doc.querySelector('canvas').getAttribute('aria-label'),'D20 14');
    assert.equal(h.doc.querySelector('.dice-final-equation').textContent,'D20 14 + 3 = 17 · 목표 12');
    assert.equal(h.doc.querySelector('.dice-final-story').textContent,receipt.text);
    h.presenter.finish();assert.equal(h.settled.length,1);
    h.doc.querySelector('[data-dice-control="continue"]').click();assert.deepEqual(await result,{cancelled:false});
    assert.equal(h.presenter.active,false);assert.equal(h.doc.querySelector('#dice-dialog').textContent,'');
  }finally{h.close();}
});

test('skip and Escape reveal once, cancellation removes hidden data and pending animation',async()=>{
  const h=harness();try{
    const first=h.presenter.show(receipt);h.doc.querySelector('[data-dice-control="skip"]').click();
    assert.equal(h.settled.length,1);assert.equal(h.frames.size,0);
    h.doc.querySelector('#dice-dialog').dispatchEvent(new h.w.Event('cancel',{cancelable:true}));await first;
    const second=h.presenter.show({...receipt,roll:1,total:4,grade:'fumble'});h.step(300);h.presenter.cancel();
    assert.deepEqual(await second,{cancelled:true});assert.equal(h.frames.size,0);assert.equal(h.settled.length,1);
    assert.equal(h.doc.querySelector('#dice-dialog').textContent,'');assert.equal(h.cancelled.length,1);
  }finally{h.close();}
});

test('system preference, saved setting, missing Canvas and destroy provide bounded accessible fallbacks',async()=>{
  const h=harness({reduce:true});try{
    assert.equal(h.presenter.canAnimate,false);assert.equal((await h.presenter.show(receipt)).fallback,true);
    h.presenter.setMode('full');assert.equal(h.presenter.canAnimate,true);
    const result=h.presenter.show(receipt);h.presenter.setMode('reduce');assert.equal(h.frames.size,0);assert.equal(h.settled.length,1);
    assert.equal(h.w.localStorage.getItem('cg-v20-dice-motion'),'reduce');h.presenter.cancel();await result;
    h.presenter.setMode('auto');h.systemReduced(false);assert.equal(h.presenter.canAnimate,true);
    const active=h.presenter.show(receipt);h.presenter.destroy();await active;assert.equal(h.frames.size,0);assert.equal(h.doc.querySelector('#dice-dialog'),null);
  }finally{h.close();}
  const missing=harness({canvas:false});try{assert.equal(missing.presenter.canAnimate,false);assert.equal((await missing.presenter.show(receipt)).fallback,true);assert.equal(missing.doc.querySelector('dialog'),null);}finally{missing.close();}
});
