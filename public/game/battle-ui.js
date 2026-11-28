import { battleAppearance } from './battle-assets.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount = value => Math.max(0, Number(value) || 0);

/** Animate the crop window, not the atlas itself: animation transforms must never
 * move a neighbouring enemy into the visible cell. Only local, registered art is used. */
function enemySprite(appearance, enemy) {
  if (!appearance.src) return '';
  const alt = esc(appearance.alt || enemy.description || enemy.name);
  const {columns, rows, index} = appearance.crop || {};
  if (Number.isInteger(columns) && Number.isInteger(rows) && Number.isInteger(index)
    && columns >= 1 && columns <= 4 && rows >= 1 && rows <= 4 && index >= 0 && index < columns * rows) {
    const column = index % columns, row = Math.floor(index / columns);
    return `<span class="battle-enemy-sprite battle-sprite-crop" data-sprite-cell="${index}"><img class="battle-atlas-image" src="${esc(appearance.src)}" alt="${alt}" style="width:${columns * 100}%;height:${rows * 100}%;left:${-column * 100}%;top:${-row * 100}%" decoding="async" fetchpriority="high"></span>`;
  }
  return `<img class="battle-enemy-sprite" src="${esc(appearance.src)}" alt="${alt}" width="384" height="384" decoding="async" fetchpriority="high">`;
}

/** A separate reading surface for encounters; artwork is selected by encounter ID,
 * never inferred from a translated name or an old internal campaign filename. */
export function renderBattleScreen(g, {meId, connected=true, locked=false, reduceMotion=false, art, iconFor=()=> '◆', classNameFor=()=> '동료', commands='', context=''}={}) {
  const combat=g.combat, enemy=combat.enemy, players=g.players||[];
  const appearance=battleAppearance(combat.id), intent=combat.intent||{};
  const active=players.find(person=>person.id===g.activePlayerId);
  const canAct=combat.canAct&&connected&&!locked;
  const targets=(intent.targetIds||[]).map(id=>players.find(person=>person.id===id)?.name).filter(Boolean).join(', ') || '살아 있는 일행';
  const hp=amount(enemy.health), max=Math.max(1,amount(enemy.maxHealth));
  const title=locked?'행동의 결과를 확인하는 중':canAct?'당신의 차례':`${active?.name||'동료'}의 차례`;
  const recent=combat.log?.at(-1)?.text||combat.intro?.[0]||'일행이 각자 한 번씩 행동하면 적이 움직입니다.';
  return `<section class="battle-screen combat-panel ${reduceMotion?'reduce-motion':''}" aria-labelledby="scene-title" data-encounter="${esc(combat.id)}" style="--battle-accent:${esc(appearance.accent||'#cbb789')}">
    <header class="battle-heading"><div><div class="eyebrow">CHRONICLE ENCOUNTER <i aria-hidden="true">/</i> ROUND ${amount(combat.round)||1}</div><h1 id="scene-title" tabindex="-1">${esc(combat.title||'함께 맞서는 위기')}</h1><p>${esc(g.scene.location||g.scene.title)}</p></div><span class="turn-pill ${canAct?'my-turn':''}" data-battle-turn>${esc(title)}</span></header>
    <div class="battle-stage" id="battle-stage" data-battle-stage data-encounter="${esc(combat.id)}" data-enemy-motion="${esc(appearance.motion||'hover')}" aria-label="전투 상대: ${esc(enemy.name)}">
      <div class="battle-backdrop" aria-hidden="true">${art(g.campaignId,g.scene.art,'scene-art battle-backdrop-art','전투 장소')}</div><div class="battle-vignette" aria-hidden="true"></div>
      <section class="battle-enemy-hud" aria-label="적의 상태"><div class="battle-hud-kicker"><span>맞서야 할 위협</span><span>ENEMY</span></div><h2 id="combat-title">${esc(enemy.name)}</h2><div class="battle-hp-row"><progress class="enemy-health-bar" data-battle-enemy-hp value="${hp}" max="${max}" aria-label="${esc(enemy.name)} 생명력 ${hp}/${max}"></progress><span class="enemy-health"><b data-battle-enemy-health>${hp}</b><small>/ ${max}</small></span></div><div class="battle-enemy-status">${combat.vulnerable?`<span>약점 노출 ${amount(combat.vulnerable)}회</span>`:''}${combat.staggered?'<span>다음 행동 제압됨</span>':''}</div></section>
      <div class="battle-enemy-position" data-battle-enemy><div class="battle-enemy-ground" aria-hidden="true"></div>${enemySprite(appearance,enemy)}<div class="battle-enemy-fallback" ${appearance.src?'hidden':''}><span aria-hidden="true">◇</span><b>${esc(enemy.name)}</b><small>모습을 불러오지 못했어요</small></div><div class="battle-impact" aria-hidden="true"></div></div><div class="battle-attack-trail" aria-hidden="true"></div>
      <div class="battle-party-formation" aria-label="전투 중인 일행" data-party-count="${players.length}">${players.map((person,index)=>{
        const status=(combat.statuses||[]).find(item=>item.id===person.id)||{};
        const done=(combat.actedIds||[]).includes(person.id), current=person.id===g.activePlayerId;
        return `<div class="battle-fighter ${person.life==='dead'?'is-fallen':''} ${current?'is-current':''} ${done?'has-acted':''} color-${index}" data-fighter-id="${esc(person.id)}" style="--fighter-seat:${index}"><div class="battle-fighter-figure" aria-hidden="true"><span class="battle-fighter-halo"></span><span class="battle-class-crest">${esc(iconFor(person.classId))}</span><span class="battle-fighter-shadow"></span></div><div class="battle-fighter-card"><div class="battle-person-name"><b title="${esc(person.name)}">${esc(person.name)}</b>${person.id===meId?'<small>나</small>':''}</div><span class="battle-profession" title="${esc(person.className||classNameFor(person.classId))}">${esc(person.className||classNameFor(person.classId))}</span><div class="battle-fighter-life"><progress data-fighter-hp value="${amount(person.health)}" max="${amount(person.maxHealth)||3}" aria-label="${esc(person.name)} 생명력 ${amount(person.health)}/${amount(person.maxHealth)||3}"></progress><span data-fighter-health>${amount(person.health)} / ${amount(person.maxHealth)||3}</span></div><div class="battle-fighter-status"><span data-fighter-shield ${status.shield?'':'hidden'}>방어 ${amount(status.shield)}</span><span data-fighter-state>${person.life==='dead'?'사망 · 잔향':done?'행동 완료':current?'현재 차례':person.connected===false?'연결 대기':'대기'}</span></div></div></div>`;
      }).join('')}</div>
      <div class="battle-outcome" data-battle-outcome hidden aria-live="polite"></div>
      <button class="battle-skip text-button" type="button" data-battle-skip ${locked?'':'hidden'}>연출 건너뛰기 <span aria-hidden="true">↠</span></button>
    </div>
    <div class="battle-caption" role="status" aria-live="polite" aria-atomic="true"><span class="battle-caption-mark" aria-hidden="true">✦</span><p data-battle-caption>${esc(locked?'판정한 행동을 전투 장면에서 확인합니다.':recent)}</p></div>
    <div class="battle-command-desk"><div class="battle-commands"><div class="battle-command-heading"><span class="eyebrow">YOUR NEXT MOVE</span><b>${locked?'행동을 지켜보세요':canAct?'어떻게 맞설까요?':'동료와 함께 차례를 준비하세요'}</b></div>${commands}</div>
    <aside class="battle-enemy-plan"><div class="eyebrow">ENEMY INTENT</div><h3>${esc(intent.name||'위협적인 움직임')}</h3><p>${esc(intent.text||'일행이 행동을 마치면 적이 움직입니다.')}</p><div class="intent-targets"><span><b>대상</b> ${esc(targets)}</span><span><b>피해</b> ${amount(intent.damage)}</span><span><b>적 D20 목표</b> ${amount(intent.dc)||12}</span></div><small>살아 있는 일행이 한 번씩 행동한 뒤 진행합니다. 방어막이 피해를 먼저 막아요.</small><details class="battle-enemy-lore" data-fold="battle-enemy-lore"><summary>상대 자세히 보기</summary><p>${esc(enemy.description)}</p></details></aside></div>
    <div class="battle-footnotes">${context}<details class="combat-history" data-fold="battle-history"><summary>전투 기록 ${(combat.log||[]).length}개</summary><div>${[...(combat.log||[])].reverse().slice(0,8).map(row=>`<p>${esc(row.text||row)}</p>`).join('')}${g.lastResult?.enemyRolls?.length?`<div class="enemy-rolls"><b>직전 적의 판정</b>${g.lastResult.enemyRolls.map(check=>`<p>${esc(players.find(person=>person.id===check.targetId)?.name||'대상')} · D20 ${check.roll} · 피해 ${check.damage||0}${check.blocked?` · 방어 ${check.blocked}`:''}</p>`).join('')}</div>`:''}</div></details></div>
  </section>`;
}

/** Keep the named threat readable even if an asset request fails. */
export function hydrateBattleSprites(root) {
  for(const sprite of root?.querySelectorAll('img.battle-enemy-sprite, img.battle-atlas-image')||[]) {
    const fail=()=>{const visible=sprite.closest('.battle-sprite-crop')||sprite;visible.hidden=true;const fallback=sprite.closest('[data-battle-enemy]')?.querySelector('.battle-enemy-fallback');if(fallback)fallback.hidden=false;};
    sprite.addEventListener('error',fail,{once:true});
    if(sprite.complete&&sprite.naturalWidth===0)fail();
  }
}
