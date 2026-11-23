/** Four public, deterministic result bands. The caller supplies a trusted D20. */
export const GRADE_LABELS = Object.freeze({ critical:'대성공', success:'성공', failure:'실패', fumble:'대실패' });
export const ROLLED_GRADES = Object.freeze(['critical','success','failure','fumble']);
export function gradeRoll(roll, total, dc) {
  if (roll === 20) return 'critical';
  if (roll === 1) return 'fumble';
  return total >= dc ? 'success' : 'failure';
}
export function gradeChances(bonus, dc) {
  const result = {critical:0,success:0,failure:0,fumble:0};
  for (let die=1; die<=20; die++) result[gradeRoll(die,die+bonus,dc)] += 5;
  return result;
}
