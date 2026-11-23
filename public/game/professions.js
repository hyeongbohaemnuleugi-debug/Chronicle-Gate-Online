/** Campaign-scoped fixed professions. Legacy IDs are only a v14 save migration map. */
export const LEGACY_CLASS_IDS = ['guardian', 'scout', 'scholar', 'envoy'];
export const CLASSES = Object.freeze([
  { id: 'guardian', name: '수호자', description: '이전 저장 파일용 직업', stats: { might: 3, agility: 1, wit: 0, heart: 1 } },
  { id: 'scout', name: '길잡이', description: '이전 저장 파일용 직업', stats: { might: 1, agility: 3, wit: 1, heart: 0 } },
  { id: 'scholar', name: '분석가', description: '이전 저장 파일용 직업', stats: { might: 0, agility: 1, wit: 3, heart: 1 } },
  { id: 'envoy', name: '중재자', description: '이전 저장 파일용 직업', stats: { might: 1, agility: 0, wit: 1, heart: 3 } },
]);
export function getClasses(campaign) {
  return Array.isArray(campaign?.classes) && campaign.classes.length ? campaign.classes : CLASSES;
}
export function normalizeClassId(campaign, classId, index = 0) {
  const classes = getClasses(campaign);
  if (classes.some(c => c.id === classId)) return classId;
  const oldSlot = LEGACY_CLASS_IDS.indexOf(classId);
  return classes[(oldSlot < 0 ? Math.max(0, index) : oldSlot) % classes.length].id;
}
export function getClass(campaign, classId) {
  return getClasses(campaign).find(c => c.id === classId);
}
export function remapClassId(fromCampaign, toCampaign, classId, index = 0) {
  const oldIndex = getClasses(fromCampaign).findIndex(c => c.id === classId);
  return getClasses(toCampaign)[(oldIndex < 0 ? index : oldIndex) % getClasses(toCampaign).length].id;
}
