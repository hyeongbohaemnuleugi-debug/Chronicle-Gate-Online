/** A small 3D D20 renderer. The game supplies the die; this module never rolls it. */
const PHI=(1+Math.sqrt(5))/2;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>scale(a,1/Math.hypot(...a));
const mean=list=>scale(list.reduce(add,[0,0,0]),1/list.length);
const clamp=t=>Math.max(0,Math.min(1,t));
export const ROLL_DURATION=1700;
export const D20_VERTICES=Object.freeze([
  [-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],[0,-1,PHI],[0,1,PHI],
  [0,-1,-PHI],[0,1,-PHI],[PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1],
].map(v=>Object.freeze(unit(v))));
const indices=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
const faces=indices.map(ids=>{
  let points=ids.map(i=>D20_VERTICES[i]),center=mean(points),normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
  if(dot(center,normal)<0){ids=[ids[0],ids[2],ids[1]];points=ids.map(i=>D20_VERTICES[i]);normal=scale(normal,-1);}
  return {vertices:ids,center,normal,up:unit(sub(points[0],center)),number:0};
});
let label=1;
for(const face of faces){if(face.number)continue;const opposite=faces.find(other=>dot(face.normal,other.normal)<-.999999);face.number=label;opposite.number=21-label;label++;}
export const D20_FACES=Object.freeze(faces.map(face=>Object.freeze({...face,vertices:Object.freeze(face.vertices),center:Object.freeze(face.center),normal:Object.freeze(face.normal),up:Object.freeze(face.up)})));
const validRoll=roll=>Number.isInteger(roll)&&roll>=1&&roll<=20;

/** The selected face points at the reader, with its triangular peak upward. */
export function orientationFor(roll){
  if(!validRoll(roll))throw new RangeError('A D20 face must be an integer from 1 to 20.');
  const face=D20_FACES.find(f=>f.number===roll);
  return [unit(cross(face.up,face.normal)),face.up,face.normal];
}
const orient=(p,m)=>m.map(row=>dot(p,row));
function spin(p,angles){
  let [x,y,z]=p;const [a,b,c]=angles;
  [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
  [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
  return [x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c),z];
}

/** Shared projection for live Canvas frames and deterministic SVG previews. */
export function diceFrame(roll,progress=1,{width=560,height=240}={}){
  const t=clamp(progress),remaining=(1-t)**2.5,basis=orientationFor(roll);
  const angles=[remaining*(Math.PI*5+.08*roll),remaining*(Math.PI*4+.12*roll),remaining*(Math.PI*2+.03*roll)];
  const travel=1-(1-t)**3;
  const bounce=Math.abs(Math.sin(t*Math.PI*4.1))*((1-t)**1.5)*48;
  const center=[width*(.22+.28*travel),height*.51-bounce],radius=Math.min(width*.16,height*.355);
  const transform=p=>spin(orient(p,basis),angles);
  const project=p=>{const perspective=4.8/(4.8-p[2]);return [center[0]+p[0]*radius*perspective,center[1]-p[1]*radius*perspective];};
  const light=unit([-.5,.8,1.5]);
  const drawn=D20_FACES.map(face=>{
    const points=face.vertices.map(i=>transform(D20_VERTICES[i]));
    const c=transform(face.center),n=transform(face.normal),facing=dot(n,sub([0,0,4.8],c));
    const up=transform(face.up),right=unit(cross(up,n));
    const p=project(c),px=project(add(c,scale(right,.34))),py=project(sub(c,scale(up,.34)));
    const illumination=Math.max(0,dot(n,light));
    const colors=[Math.round(20+illumination*24),Math.round(33+illumination*39),Math.round(52+illumination*49)];
    return {number:face.number,points:points.map(project),depth:c[2],facing,
      fill:`rgb(${colors.join(',')})`,label:{point:p,x:sub(px,p),y:sub(py,p)},
      opacity:Math.min(1,Math.max(.2,facing/2.5)),normal:n};
  }).filter(face=>face.facing>.025).sort((a,b)=>a.depth-b.depth);
  return {width,height,progress:t,roll:t===1?roll:null,center,radius,bounce,faces:drawn,
    shadow:{x:center[0]+bounce*.17,y:height*.84,rx:radius*(.9-bounce/220),ry:radius*.16,opacity:.35-bounce/220},
    frontFace:drawn.reduce((best,f)=>!best||f.normal[2]>best.normal[2]?f:best,null)?.number};
}

function paint(ctx,frame){
  const {width,height,shadow,faces}=frame;
  ctx.clearRect(0,0,width,height);
  ctx.save();ctx.fillStyle=`rgba(0,0,0,${shadow.opacity})`;ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=15;
  ctx.beginPath();ctx.ellipse(shadow.x,shadow.y,shadow.rx,shadow.ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
  for(const face of faces){
    ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
    ctx.fillStyle=face.fill;ctx.fill();ctx.strokeStyle='rgba(214,179,111,.7)';ctx.lineWidth=1.1;ctx.stroke();
    if(face.opacity<.38)continue;
    ctx.save();const {point,x,y}=face.label;
    ctx.transform(x[0],x[1],y[0],y[1],point[0],point[1]);
    ctx.fillStyle=`rgba(246,222,169,${face.opacity})`;ctx.font='600 1px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(String(face.number),0,0);
    if(face.number===6||face.number===9){ctx.beginPath();ctx.moveTo(-.23,.57);ctx.lineTo(.23,.57);ctx.lineWidth=.035;ctx.strokeStyle=ctx.fillStyle;ctx.stroke();}
    ctx.restore();
  }
}
const fmt=n=>Number(n.toFixed(4));
export function diceSvg(roll,progress=1,options={}){
  const f=diceFrame(roll,progress,options),s=f.shadow;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.width}" height="${f.height}" viewBox="0 0 ${f.width} ${f.height}" role="img" aria-label="${progress===1?'D20 '+roll:'굴러가는 D20'}"><defs><radialGradient id="felt"><stop stop-color="#223332"/><stop offset="1" stop-color="#101c22"/></radialGradient></defs><rect x="1" y="1" width="${f.width-2}" height="${f.height-2}" rx="18" fill="url(#felt)" stroke="#76623f"/><rect x="10" y="10" width="${f.width-20}" height="${f.height-20}" rx="11" fill="none" stroke="#c1a06d" stroke-opacity=".24"/><ellipse cx="${fmt(s.x)}" cy="${fmt(s.y)}" rx="${fmt(s.rx)}" ry="${fmt(s.ry)}" fill="#000" opacity="${fmt(s.opacity)}"/>${f.faces.map(face=>{const {point,x,y}=face.label;return `<polygon points="${face.points.map(p=>p.map(fmt).join(',')).join(' ')}" fill="${face.fill}" stroke="#d6b36f" stroke-opacity=".7" stroke-width="1.1"/>${face.opacity>=.38?`<text transform="matrix(${[...x,...y,...point].map(fmt).join(' ')})" fill="#f6dea9" opacity="${fmt(face.opacity)}" font-family="Georgia,serif" font-size="1" font-weight="600" text-anchor="middle" dominant-baseline="central">${face.number}</text>`:''}`;}).join('')}<text x="${f.width-26}" y="${f.height-19}" fill="#c9b891" opacity=".55" font-family="Georgia,serif" font-size="9" text-anchor="end" letter-spacing="3">CHRONICLE · D20</text></svg>`;
}

const MOTION_KEY='cg-v20-dice-motion';
const grades={critical:'대성공',success:'성공',failure:'실패',fumble:'대실패',mixed:'대가 있는 성공'};

/** Owns only presentation. No game state, socket, randomness or rule evaluation. */
export function createDicePresenter({document:doc=globalThis.document,window:win=globalThis.window,onSettled=()=>{},onCancel=()=>{},onRender=()=>{}}={}){
  let mode='auto';try{const saved=win.localStorage?.getItem(MOTION_KEY);if(['auto','full','reduce'].includes(saved))mode=saved;}catch{}
  const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let dialog=null,canvas=null,context=null,active=null,raf=null,destroyed=false;
  const reduced=()=>mode==='reduce'||(mode==='auto'&&motion?.matches);
  const supported=()=>typeof win.CanvasRenderingContext2D==='function'&&typeof win.requestAnimationFrame==='function';
  const stopFrame=()=>{if(raf!==null)win.cancelAnimationFrame(raf);raf=null;};
  function dismiss(cancelled=false){
    if(!active)return;stopFrame();const request=active;active=null;
    if(dialog?.open)dialog.close();if(dialog)dialog.innerHTML='';canvas=null;context=null;
    doc.body.classList.remove('dice-presenting');
    if(cancelled)onCancel();request.resolve({cancelled});
  }
  function reveal(){
    if(!active||active.settled)return;stopFrame();active.settled=true;
    paint(context,diceFrame(active.result.roll));
    dialog.dataset.phase='settled';dialog.classList.add(`grade-${active.result.grade}`);
    canvas.setAttribute('aria-label',`D20 ${active.result.roll}`);
    const receipt=doc.createElement('div');receipt.className='dice-receipt';receipt.setAttribute('aria-live','polite');
    const r=active.result,bonus=Number.isFinite(r.bonus)?r.bonus:Number(r.total)-r.roll;
    const equation=doc.createElement('p');equation.className='dice-final-equation';
    const die=doc.createElement('strong');die.textContent=String(r.roll);equation.append('D20 ',die,` ${bonus<0?'−':'+'} ${Math.abs(bonus)} = ${r.total} · 목표 ${r.dc}`);
    const grade=doc.createElement('b');grade.className='dice-final-grade';grade.textContent=grades[r.grade]||'판정 완료';
    const prose=doc.createElement('p');prose.className='dice-final-story';prose.textContent=r.narrativeText||r.text||'';
    receipt.append(equation,grade,prose);dialog.querySelector('.dice-receipt-slot').replaceChildren(receipt);
    const button=dialog.querySelector('[data-dice-control]');button.textContent='이야기 이어가기';button.dataset.diceControl='continue';
    dialog.querySelector('.dice-stage-caption').textContent='이 선택이 연대기의 다음 문장이 됩니다.';
    onRender(dialog);onSettled(r,active.metadata);
  }
  function prepare(){
    if(dialog)return;
    dialog=doc.createElement('dialog');dialog.id='dice-dialog';dialog.className='modal dice-modal';
    dialog.setAttribute('aria-labelledby','dice-title');doc.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(active?.settled)dismiss();else reveal();});
    dialog.addEventListener('click',event=>{
      const button=event.target.closest('[data-dice-control]');if(!button)return;
      if(button.dataset.diceControl==='skip')reveal();else if(button.dataset.diceControl==='continue')dismiss();
    });
  }
  const motionChanged=()=>{if(active&&reduced())reveal();};motion?.addEventListener?.('change',motionChanged);
  return {
    get mode(){return mode;},get active(){return Boolean(active);},
    get canAnimate(){return !destroyed&&!reduced()&&supported();},
    setMode(value){if(!['auto','full','reduce'].includes(value))return;mode=value;try{win.localStorage?.setItem(MOTION_KEY,value);}catch{}motionChanged();},
    show(result,metadata={}){
      if(!validRoll(result?.roll))return Promise.reject(new RangeError('Only an authoritative D20 result may be presented.'));
      if(!this.canAnimate)return Promise.resolve({cancelled:false,fallback:true});
      dismiss(true);prepare();dialog.className='modal dice-modal';dialog.dataset.phase='rolling';
      dialog.innerHTML='<div class="eyebrow">THE MOMENT OF CHANCE</div><h2 id="dice-title">운명이 굴러갑니다</h2><p class="dice-actor"></p><p class="dice-action"></p><div class="dice-tray"><canvas width="560" height="240" aria-label="굴러가는 20면체 주사위" role="img"></canvas><span class="dice-tray-mark" aria-hidden="true">CHRONICLE · D20</span></div><p class="dice-stage-caption" aria-live="off">주사위가 멈출 때까지…</p><div class="dice-receipt-slot"></div><button class="button quiet full dice-control" type="button" data-dice-control="skip">연출 건너뛰기</button>';
      dialog.querySelector('.dice-actor').textContent=result.actor?`${result.actor}의 행동`:'';
      dialog.querySelector('.dice-action').textContent=result.action||'선택한 행동';
      canvas=dialog.querySelector('canvas');
      try{context=canvas.getContext('2d');}catch{context=null;}
      if(!context){dialog.innerHTML='';return Promise.resolve({cancelled:false,fallback:true});}
      const ratio=Math.min(2,Math.max(1,win.devicePixelRatio||1));canvas.width=560*ratio;canvas.height=240*ratio;context.scale(ratio,ratio);
      const promise=new Promise(resolve=>{active={result:{...result},metadata,resolve,settled:false};});
      doc.body.classList.add('dice-presenting');dialog.showModal();onRender(dialog);dialog.querySelector('[data-dice-control]').focus({preventScroll:true});
      const began=win.performance.now();paint(context,diceFrame(result.roll,0));
      const tick=time=>{raf=null;if(!active||active.settled)return;const progress=clamp((time-began)/ROLL_DURATION);paint(context,diceFrame(result.roll,progress));if(progress>=1)reveal();else raf=win.requestAnimationFrame(tick);};
      raf=win.requestAnimationFrame(tick);return promise;
    },
    finish:reveal,
    cancel(){dismiss(true);},
    destroy(){destroyed=true;dismiss(true);motion?.removeEventListener?.('change',motionChanged);dialog?.remove();dialog=null;},
  };
}
