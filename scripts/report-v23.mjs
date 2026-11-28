/** Reproducible v23 file measurements, actual encounter mappings and preservation.
 * node scripts/report-v23.mjs — no network or hosting-account access.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../public/game/engine.js';
import { CAMPAIGNS, getCampaign } from '../public/game/campaigns/index.js';
import { BATTLE_APPEARANCES } from '../public/game/battle-assets.js';
import { BATTLE_EFFECTS } from '../public/game/battle-audio-assets.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const file=relative=>path.join(root,relative);
const read=relative=>JSON.parse(fs.readFileSync(file(relative),'utf8'));
const hash=relative=>crypto.createHash('sha256').update(fs.readFileSync(file(relative))).digest('hex');
const bytes=relative=>fs.statSync(file(relative)).size;
const list=relative=>fs.readdirSync(file(relative),{withFileTypes:true}).flatMap(entry=>{
  const child=path.posix.join(relative,entry.name);return entry.isDirectory()?list(child):entry.isFile()?[child]:[];
}).sort();
const sum=paths=>paths.reduce((n,p)=>n+bytes(p),0);
const baseline=read('scripts/baseline-v22_1.json');
const art=read('scripts/battle-art/manifest-v23.json');
const sfx=read('scripts/battle-audio-v23.json');
const preserved=baseline.preservedFiles.map(row=>({...row,actualSha256:hash(row.path),matches:hash(row.path)===row.sha256}));
const allGame=list('public/game'), allAudio=list('public/game/audio');
const current={publicGameBytes:sum(allGame),audioDirectoryBytes:sum(allAudio),offlineHtmlBytes:bytes('public/offline.html')};
const newSprites=art.entries.map(row=>({...row,actualSha256:hash(row.file),matches:hash(row.file)===row.sha256&&bytes(row.file)===row.bytes}));
const newEffects=BATTLE_EFFECTS.map(id=>{const relative=`public/game/audio/sfx/${id}.mp3`;return {id,file:relative,bytes:bytes(relative),sha256:hash(relative)};});
const encounters=CAMPAIGNS.map(c=>{
  const node=Object.values(c.nodes).find(node=>node.encounter),e=node.encounter,a=BATTLE_APPEARANCES[e.id];
  if(!a||a.name!==e.enemyName)throw Error(`Enemy mismatch ${e.id}`);
  return {campaignId:c.id,title:c.title,encounterId:e.id,name:e.enemyName,sceneId:node.id,art:a.src,
    basic:true,epic:Object.values(getCampaign(c.id,'epic').nodes).some(n=>n.encounter?.id===e.id)};
});
const totalSprites=newSprites.reduce((n,p)=>n+p.bytes,0),totalEffects=sum(newEffects.map(row=>row.file));
const issues=[];
if(preserved.some(row=>!row.matches))issues.push('A frozen story/media/rules/server file changed.');
if(newSprites.some(row=>!row.matches)||newSprites.length!==9)issues.push('Enemy sprite manifest mismatch.');
if(allAudio.filter(p=>p.endsWith('.mp3')).length!==88)issues.push('Expected exactly50BGM+38SFX.');
if(current.publicGameBytes>22_000_000||current.audioDirectoryBytes>17_000_000)issues.push('Original total/audio budget exceeded.');
if(totalSprites>500000||totalEffects>100000)issues.push('Battle media budget exceeded.');
const report={version:VERSION,baselineVersion:baseline.version,measurement:'Actual delivered file bytes and SHA-256; not hosting-account quota, performance benchmark or listening test.',
  resources:{baseline:baseline.resources,current,addedPublicGameBytes:current.publicGameBytes-baseline.resources.publicGameBytes,
    newEnemySpritesBytes:totalSprites,newBattleSfxBytes:totalEffects,newMediaBytes:totalSprites+totalEffects,
    originalBudget:{publicGameBytes:22_000_000,audioDirectoryBytes:17_000_000},counts:{enemySprites:9,music:50,effects:38,totalMp3:88}},
  preservation:{allMatch:preserved.every(row=>row.matches),count:preserved.length,
    storyFiles:preserved.filter(r=>r.path.startsWith('public/game/campaigns/')).length,
    oldAtlases:preserved.filter(r=>r.path.endsWith('.webp')).length,
    oldMp3:preserved.filter(r=>r.path.endsWith('.mp3')).length,
    rules:'Combat decisions/dice/balance unchanged; combat.js adds outcome receipts for presentation and save remapping.',files:preserved},
  saveSchema:22,network:'No new endpoint, service, database table or additional state broadcast. Existing bounded room and journal handling remains.',
  media:'Sprites and effects load locally on demand. No runtime image generation or external AI calls.',
  encounters,sprites:newSprites,effects:newEffects,audioAudit:'scripts/battle-audio-v23.json',
  audioAuditVersion:sfx.version??23,issues,complete:issues.length===0};
fs.writeFileSync(file('RESOURCE_REPORT_V23.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:VERSION,resources:report.resources,preserved:report.preservation.allMatch,preservedCount:preserved.length,issues},null,2));
if(issues.length)process.exitCode=1;
