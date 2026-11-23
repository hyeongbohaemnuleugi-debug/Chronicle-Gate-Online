/** A short, factual chronicle of choices already made. No remote generation. */
export const CHRONICLE_LIMIT = 40;
const TEXT_LIMIT = 700;
const grades = new Set(['automatic','critical','success','failure','fumble','mixed']);
const kinds = new Set(['choice','revival','combat']);
const plain = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>]/g,'').trim() : '';
const short = (value, limit) => plain(value).slice(0,limit);

function eventKind(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.combat === true) return ['victory','defeat'].includes(entry.combatEvent) || entry.deaths?.length ? 'combat' : null;
  if (!grades.has(entry.grade)) return null;
  if (entry.revivedId || /부활\s*·/.test(entry.action || '')) return 'revival';
  return 'choice';
}

function sanitize(entry, index=0) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !kinds.has(entry.kind) || !grades.has(entry.grade)) return null;
  const text=plain(entry.text);
  // Keep complete paragraphs. Overlong imported records remain in the full journal,
  // and the chronicle explicitly reports a gap instead of silently cutting a sentence.
  if (!text || text.length>TEXT_LIMIT) return null;
  return {id:short(entry.id,100)||`chapter-${index}`,kind:entry.kind,sceneTitle:short(entry.sceneTitle,100),actor:short(entry.actor,18),action:short(entry.action,220),grade:entry.grade,text};
}

export function appendChronicle(game, event) {
  const kind=eventKind(event);if(!kind)return;
  game.chronicle ||= [];
  const entry=sanitize({...event,kind,text:event.narrativeText||event.text},game.chronicle.length);
  if(!entry){game.chroniclePartial=true;return;}
  if(game.chronicle.some(previous=>previous.id===entry.id))return;
  game.chronicle.push(entry);
  if(game.chronicle.length>CHRONICLE_LIMIT){game.chronicle=game.chronicle.slice(-CHRONICLE_LIMIT);game.chroniclePartial=true;}
}

export function restoreChronicle(raw, journal, {turn=0,startTitle=''}={}) {
  const existing=Array.isArray(raw?.chronicle);
  const source=existing?raw.chronicle:(journal||[]).map((entry,index)=>({...entry,text:entry.narrativeText||entry.text,id:entry.id||`legacy-${index}`,kind:eventKind(entry)})).filter(entry=>entry.kind);
  const sanitized=[],seen=new Set();let partial=raw?.chroniclePartial===true;
  for(let i=0;i<source.length;i++){
    const entry=sanitize(source[i],i);
    if(!entry||seen.has(entry.id)){partial=true;continue;}
    seen.add(entry.id);sanitized.push(entry);
  }
  if(sanitized.length>CHRONICLE_LIMIT)partial=true;
  if(!existing&&turn>0&&(!source.length||(journal||[]).length>=200||(startTitle&&journal?.[0]?.sceneTitle!==startTitle)))partial=true;
  if(existing&&turn>0&&!sanitized.length)partial=true;
  return {chronicle:sanitized.slice(-CHRONICLE_LIMIT),chroniclePartial:partial};
}

const paragraphs = value => (Array.isArray(value)?value:[value]).map(plain).filter(Boolean);

/** A public reading copy, deliberately independent of JSON saves and private cards. */
export function chronicleText(view) {
  if(!view || typeof view!=='object')return '';
  const scene=view.scene||{},reading=scene.reading;
  const entries=Array.isArray(view.chronicle)?view.chronicle.map(sanitize).filter(Boolean):[];
  const lines=[short(view.title,160)||'우리의 연대기','우리의 선택으로 남긴 이야기',''];
  const names=(Array.isArray(view.players)?view.players:[]).map(player=>short(player.name,18)).filter(Boolean);
  if(names.length)lines.push(`${names.length===1?'이야기의 주인공':'함께한 사람들'} · ${names.join(', ')}`,'');
  if(view.chroniclePartial)lines.push('일부 기록은 남아 있지 않습니다. 아래에는 실제로 남은 선택만 담았습니다.','');
  const prologue=paragraphs(view.chroniclePrologue);
  if(entries.length&&prologue.length)lines.push('첫 장',...prologue.flatMap(text=>[text,'']));
  for(const [index,entry] of entries.entries()){
    lines.push(`${String(index+1).padStart(2,'0')} · ${entry.sceneTitle||'지나온 장면'}`);
    if(entry.actor||entry.action)lines.push([entry.actor&&`${entry.actor}의 선택`,entry.action].filter(Boolean).join(' · '));
    lines.push(entry.text,'');
  }
  lines.push(`${view.ending||view.phase==='ended'?'마지막 장':'아직 이어지는 이야기'} · ${short(scene.title,120)}`);
  const finalParagraphs=reading?[...paragraphs(reading.paragraphs),...paragraphs(reading.echoes),...paragraphs(reading.personal),...paragraphs(reading.fate)]:paragraphs(scene.text);
  const seen=new Set();
  for(const paragraph of finalParagraphs){if(seen.has(paragraph))continue;seen.add(paragraph);lines.push(paragraph,'');}
  return lines.join('\n').trim()+'\n';
}
