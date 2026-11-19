// Server-authoritative tabletop helpers. Pure functions make the odds testable.
// Inspiration: spend one point before a check to roll 2d20, keep the higher.
// Push: +2 before the check; a failed push creates extra world danger.
export const HERO_MODES = Object.freeze(['normal','inspiration','push','desperate']);

export function rollTabletopCheck(rollD20, mode = 'normal', inspiration = 0, stress = 0) {
  const selected = HERO_MODES.includes(mode) ? mode : 'normal';
  if (selected === 'inspiration' && Number(inspiration || 0) < 1) {
    return { ok:false, error:'영감이 없습니다. 일반 판정이나 위험 감수를 선택하세요.' };
  }
  if (selected === 'desperate' && Number(stress || 0) < 3) {
    return { ok:false, error:'극적 돌파는 긴장도가 3 이상일 때만 가능합니다.' };
  }
  const first = Number(rollD20());
  const second = ['inspiration','desperate'].includes(selected) ? Number(rollD20()) : null;
  const dice = second == null ? [first] : [first, second];
  if (dice.some(d => !Number.isInteger(d) || d < 1 || d > 20)) throw new Error('D20 roll out of range');
  return {
    ok:true, mode:selected, result:second == null ? first : Math.max(first,second),
    rolls:dice, spentInspiration:selected === 'inspiration' ? 1 : 0,
    checkBonus:selected === 'push' ? 2 : 0, extraDangerOnFailure:selected === 'desperate' ? 2 : (selected === 'push' ? 1 : 0),
    ...(selected === 'desperate' ? {stressCost:1} : {}),
  };
}

export function checkOutcomeGrade(roll, total, dc) {
  const margin = Number(total) - Number(dc);
  if (roll === 1) return 'disaster';
  if (roll === 20 || margin >= 5) return 'critical';
  if (margin >= 0) return 'success';
  if (margin >= -2) return 'mixed';
  if (margin <= -5) return 'disaster';
  return 'setback';
}

export function assistSessionKey(actorId, sceneId, turnSerial) {
  return `${String(actorId)}:${String(sceneId)}:${Number(turnSerial || 0)}`;
}
