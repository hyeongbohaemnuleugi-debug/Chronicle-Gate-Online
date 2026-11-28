/** Reproducible resource and preservation audit for the v24.1 music patch. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {VERSION} from '../public/game/engine.js';
import {HORROR_LOOPS, HORROR_AUDIO_VERSION} from '../public/game/horror-loops.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const file=rel=>path.join(root,rel);
const json=rel=>JSON.parse(fs.readFileSync(file(rel),'utf8'));
const bytes=rel=>fs.statSync(file(rel)).size;
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const hash=rel=>sha(fs.readFileSync(file(rel)));
const list=rel=>fs.readdirSync(file(rel),{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.posix.join(rel,e.name)):e.isFile()?[path.posix.join(rel,e.name)]:[]).sort();
const sum=files=>files.reduce((total,rel)=>total+bytes(rel),0);
const baseline=json('scripts/baseline-v24.json');
const audit=json('scripts/horror-score-audit-v24_1.json');
const comparison=json('scripts/audio-comparison-v24_1.json');
const game=list('public/game'),audio=list('public/game/audio');
const horror=audio.filter(p=>p.endsWith('.mp3')&&path.basename(p).startsWith('horror-'));
const preserved=baseline.preservedFiles.map(row=>({...row,matches:fs.existsSync(file(row.path))&&bytes(row.path)===row.bytes&&hash(row.path)===row.sha256}));
const changed=baseline.horrorFiles.map(row=>({path:row.path,beforeBytes:row.bytes,afterBytes:bytes(row.path),beforeSha256:row.sha256,afterSha256:hash(row.path)}));
const engineText=fs.readFileSync(file('public/game/engine.js'),'utf8').replace(/^export const VERSION = '[^']+';\n/m,'');
const engineRulesMatch=sha(engineText)===baseline.engineRulesSha256;
const current={publicGameBytes:sum(game),audioDirectoryBytes:sum(audio),offlineHtmlBytes:bytes('public/offline.html'),horrorMusicBytes:sum(horror)};
const delta=Object.fromEntries(Object.entries(current).map(([k,v])=>[k,v-baseline.resources[k]]));
const budget={publicGameBytes:23_500_000,audioDirectoryBytes:17_000_000,horrorMusicBytes:2_400_000};
const issues=[];
if(VERSION!=='24.1.0'||HORROR_AUDIO_VERSION!=='24100')issues.push('Incorrect release or horror asset cache version.');
if(preserved.some(r=>!r.matches)||!engineRulesMatch)issues.push('A gameplay, image, non-horror audio or mixer file changed unexpectedly.');
if(horror.length!==8||audio.filter(p=>p.endsWith('.mp3')).length!==88)issues.push('Expected eight replacement horror tracks and 88 total MP3 assets.');
if(changed.some(row=>row.beforeSha256===row.afterSha256))issues.push('A horror master was not replaced.');
if(Object.values(HORROR_LOOPS).length!==8)issues.push('Expected eight updated loop definitions.');
if(!comparison.allChecksPassed||comparison.tracks.length!==8||comparison.tracks.some(row=>hash(`public/game/audio/${row.file}`)!==row.sha256))issues.push('The independent audio comparison does not match the delivered files.');
for(const [key,limit] of Object.entries(budget))if(current[key]>limit)issues.push(`${key} exceeds ${limit} bytes.`);
const report={version:VERSION,complete:issues.length===0,issues,
  measurement:'Actual local file sizes, SHA-256 preservation and source-audio analysis. This is not a hosted-account quota measurement or a listening test on every device.',
  resources:{current,baselineV24:baseline.resources,delta,budget,counts:{stories:9,professions:36,distinctEnemies:45,music:50,effects:38,replacedHorrorMusic:8}},
  preservation:{allMatch:preserved.every(r=>r.matches)&&engineRulesMatch,count:preserved.length,nonHorrorMp3Count:preserved.filter(r=>r.path.endsWith('.mp3')).length,engineRulesMatch,files:preserved},
  replacement:{audioCacheVersion:HORROR_AUDIO_VERSION,files:changed,audit:'scripts/horror-score-audit-v24_1.json',score:'scripts/horror-score-v24_1.json',independentComparison:'scripts/audio-comparison-v24_1.json'},
  runtime:'Eight static MP3 assets replace the prior eight in place. The Web Audio/HTMLAudio mixers, user music/effect sliders, limited decode cache, scene sound effects and save schema22 remain unchanged. No new synthesis, service or polling runs during play.',
  audioAuditVersion:audit.audioVersion??audit.version??HORROR_AUDIO_VERSION};
fs.writeFileSync(file('RESOURCE_REPORT_V24_1.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:VERSION,complete:report.complete,resources:report.resources,preservedFiles:preserved.length,allPreserved:report.preservation.allMatch,issues},null,2));
if(issues.length)process.exitCode=1;
