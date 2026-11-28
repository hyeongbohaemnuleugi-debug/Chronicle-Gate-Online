/** Ordered, cancellable presentation of committed combat events. No rules or RNG. */
export function createBattlePresenter({document:doc=globalThis.document,window:win=globalThis.window,effect=()=>{},onEvent=()=>{},reducedMotion=()=>false}={}) {
  let current=null,serial=0;
  const nativeMotion=()=>typeof win?.Element?.prototype?.animate==='function';
  const canAnimate=()=>Boolean(doc&&!doc.hidden&&nativeMotion()&&!reducedMotion());
  const fighter=(root,id)=>[...root.querySelectorAll('[data-fighter-id]')].find(el=>el.dataset.fighterId===id);
  const cleanedClasses=['is-acting','is-struck','is-dodging','is-protected','is-healing','is-skill'];
  function clearMotion(root){
    root.classList.remove('battle-critical','battle-fumble','battle-enemy-attacking');
    for(const el of root.querySelectorAll('[data-fighter-id],[data-battle-enemy]'))el.classList.remove(...cleanedClasses);
    for(const pop of root.querySelectorAll('.battle-number'))pop.remove();
  }
  function popup(target,text,kind='damage'){
    if(!target)return;
    const pop=doc.createElement('span');pop.className=`battle-number ${kind}`;pop.textContent=text;pop.setAttribute('aria-hidden','true');target.append(pop);
  }
  function playerHealth(target,value){
    const meter=target?.querySelector('[data-fighter-hp]');if(!meter)return;
    const hp=Math.max(0,Math.min(meter.max,Number(value)||0));meter.value=hp;
    meter.setAttribute('aria-label',`생명력 ${hp}/${meter.max}`);
    const text=target.querySelector('[data-fighter-health]');if(text)text.textContent=`${hp} / ${meter.max}`;
  }
  function showEvent(request,event,{silent=false}={}){
    const root=request.root;if(!root?.isConnected)return;
    clearMotion(root);root.dataset.battleEvent=event.type;
    if(event.type==='attack'||event.type==='ability')root.dataset.battleStat=['might','agility','wit','heart'].includes(event.stat)?event.stat:'ability';
    const actor=fighter(root,request.plan.actorId),target=fighter(root,event.targetId),enemy=root.querySelector('[data-battle-enemy]');
    const screen=root.closest('.battle-screen'),caption=screen?.querySelector('[data-battle-caption]'),turn=screen?.querySelector('[data-battle-turn]');
    if(caption)caption.textContent=event.text||request.plan.action||'행동을 확인합니다.';
    if(turn)turn.textContent=['enemy-attack','player-hit','dodge','enemy-stunned'].includes(event.type)?'적의 행동':event.type==='victory'?'전투 승리':event.type==='defeat'?'전원 사망':'행동의 결과';
    if(Number.isFinite(event.enemyHealth)){
      const hp=Math.max(0,event.enemyHealth),bar=root.querySelector('[data-battle-enemy-hp]');
      if(bar){bar.value=hp;bar.setAttribute('aria-label',`적 생명력 ${hp}/${bar.max}`);}
      const value=root.querySelector('[data-battle-enemy-health]');if(value)value.textContent=String(hp);
    }
    if(Number.isFinite(event.health))playerHealth(target,event.health);
    if(Number.isFinite(event.shield)&&target){const label=target.querySelector('[data-fighter-shield]');if(label){label.hidden=event.shield<=0;label.textContent=`방어 ${event.shield}`;}}
    switch(event.type){
      case 'attack': actor?.classList.add('is-acting');break;
      case 'ability': actor?.classList.add('is-acting','is-skill');break;
      case 'enemy-hit': enemy?.classList.add('is-struck');if(event.critical)root.classList.add('battle-critical');popup(enemy,`${event.critical?'대성공 ':''}−${event.amount||0}`,event.critical?'critical':'damage');break;
      case 'miss': enemy?.classList.add('is-dodging');popup(enemy,'빗나감','miss');break;
      case 'fumble': root.classList.add('battle-fumble');(target||actor)?.classList.add('is-struck');popup(target||actor,`대실패 −${event.amount||0}`,'fumble');break;
      case 'enemy-attack': enemy?.classList.add('is-acting');root.classList.add('battle-enemy-attacking');break;
      case 'player-hit': target?.classList.add('is-struck');popup(target,`−${event.amount||0}`);break;
      case 'dodge': target?.classList.add('is-dodging');popup(target,'회피','miss');break;
      case 'shield': target?.classList.add('is-protected');popup(target,event.blocked?`방어 ${event.blocked}`:`방어 +${event.amount||0}`,'shield');break;
      case 'heal': case 'recovery': target?.classList.add('is-healing');popup(target,`+${event.amount||0}`,'heal');break;
      case 'boost': target?.classList.add('is-skill');popup(target,'협력 강화','shield');break;
      case 'expose': popup(enemy,'약점 노출','shield');break;
      case 'stun': case 'enemy-stunned': enemy?.classList.add('is-protected');popup(enemy,'행동 제압','shield');break;
      case 'death': if(target){target.classList.add('is-fallen');playerHealth(target,0);const status=target.querySelector('[data-fighter-state]');if(status)status.textContent='사망 · 잔향';}break;
      case 'victory': case 'defeat': {
        root.dataset.battleOutcome=event.type;if(event.type==='victory')enemy?.classList.add('is-defeated');
        const banner=root.querySelector('[data-battle-outcome]');if(banner){banner.hidden=false;banner.textContent=event.type==='victory'?'길이 열렸다':'마지막 불빛이 꺼졌다';}break;
      }
    }
    if(!silent){onEvent(event,request.plan);if(event.sound)effect(event.sound,{scope:'battle'});}
  }
  function complete(request,cancelled=false){
    if(current!==request)return;
    win.clearTimeout(request.timer);current=null;clearMotion(request.root);
    request.root.removeAttribute('aria-busy');
    const skip=request.root.querySelector('[data-battle-skip]');if(skip)skip.hidden=true;
    request.resolve({cancelled});
  }
  function next(request){
    if(current!==request)return;
    if(!request.root.isConnected||doc.hidden){complete(request,true);return;}
    const event=request.plan.events[request.index++];if(!event){complete(request);return;}
    showEvent(request,event);request.timer=win.setTimeout(()=>next(request),Math.max(0,Math.min(1200,Number(event.duration)||280)));
  }
  const api={
    get active(){return Boolean(current);},get canAnimate(){return canAnimate();},
    show(plan,root){
      api.cancel();
      if(!canAnimate()||!root?.isConnected||!Array.isArray(plan?.events))return Promise.resolve({fallback:true});
      return new Promise(resolve=>{
        const request={id:++serial,plan,root,index:0,timer:null,resolve};current=request;
        root.setAttribute('aria-busy','true');const skip=root.querySelector('[data-battle-skip]');if(skip)skip.hidden=false;
        next(request);
      });
    },
    finish(){const request=current;if(!request)return;win.clearTimeout(request.timer);for(const event of request.plan.events.slice(request.index))showEvent(request,event,{silent:true});complete(request);},
    cancel(){if(current)complete(current,true);},
    destroy(){api.cancel();},
  };
  return api;
}
