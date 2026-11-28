/** Reproducible file sizes, identity/art mapping and preservation for v24.
 * node scripts/report-v24.mjs — no hosting account, network or runtime AI.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {VERSION} from '../public/game/engine.js';
import {CAMPAIGNS,getCampaign} from '../public/game/campaigns/index.js';
import {BATTLE_APPEARANCES} from '../public/game/battle-assets.js';
import {NEW_ENEMY_APPEARANCES} from '../public/game/enemy-atlases-v24.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const file=rel=>path.join(root,rel);
const json=rel=>JSON.parse(fs.readFileSync(file(rel),'utf8'));
const bytes=rel=>fs.statSync(file(rel)).size;
const hash=rel=>crypto.createHash('sha256').update(fs.readFileSync(file(rel))).digest('hex');
const list=rel=>fs.readdirSync(file(rel),{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.posix.join(rel,e.name)):e.isFile()?[path.posix.join(rel,e.name)]:[]).sort();
const sum=files=>files.reduce((total,rel)=>total+bytes(rel),0);
const base=json('scripts/baseline-v23.json'),prior=json('scripts/baseline-v22_1.json');
const art=json('scripts/battle-art/manifest-v24.json');
const routes=json('ENCOUNTER_ROUTES_V24.json');
const preserved=base.preservedFiles.map(row=>({...row,matches:bytes(row.path)===row.bytes&&hash(row.path)===row.sha256}));
const atlasFiles=art.entries.map(row=>({...row,matches:bytes(row.file)===row.bytes&&hash(row.file)===row.sha256}));
const allGame=list('public/game'),audio=list('public/game/audio');
const current={publicGameBytes:sum(allGame),audioDirectoryBytes:sum(audio),offlineHtmlBytes:bytes('public/offline.html')};
const actualIds=new Set(),cellIds=new Set();
const stories=CAMPAIGNS.map(source=>{
  const modes=['basic','epic'].map(mode=>{
    const campaign=getCampaign(source.id,mode);
    const encounters=campaign.encounterCatalog.map(entry=>{
      const a=BATTLE_APPEARANCES[entry.id],e=campaign.nodes[entry.arenaId].encounter;
      if(!a||a.name!==e.enemyName)throw Error(`Enemy/art mismatch: ${entry.id}`);
      actualIds.add(entry.id);cellIds.add(`${a.src}#${a.crop?.index??'single'}`);
      return {...entry,description:e.enemyDescription,art:a.src,crop:a.crop||null,kind:a.kind||'legacy',intents:e.intents.map(i=>i.name),optional:e.optional===true};
    });
    return {mode,sceneCount:Object.values(campaign.nodes).filter(n=>!n.ending).length,endingCount:Object.values(campaign.nodes).filter(n=>n.ending).length,
      distinctEnemies:encounters.length,minimumBattles:0,maximumBattles:encounters.length,encounters};
  });
  return {id:source.id,title:source.title,modes};
});
const issues=[];
if(preserved.some(p=>!p.matches))issues.push('A frozen v23 file changed.');
if(atlasFiles.some(a=>!a.matches))issues.push('An atlas does not match its manifest.');
if(actualIds.size!==45||cellIds.size!==45)issues.push('Expected 45 distinct runtime enemies and illustrations.');
if(art.activeNewEnemyCount!==36||Object.values(NEW_ENEMY_APPEARANCES).filter(a=>a.kind==='person').length!==9)issues.push('Expected 36 new types, including nine new human opponents.');
if(current.publicGameBytes>23_500_000||current.audioDirectoryBytes>17_000_000||art.totalBytes>1_600_000)issues.push('Explicit v24 delivered-file budget exceeded.');
if(audio.filter(p=>p.endsWith('.mp3')).length!==88)issues.push('Expected the unchanged 50 BGM +38 SFX.');
if(stories.some(s=>s.modes[0].distinctEnemies!==3||s.modes[1].distinctEnemies!==5))issues.push('Basic/Epic enemy pools must differ.');
if(routes.routeCount!==72||routes.distinctEnemies!==45)issues.push('Missing real zero/max-battle route witnesses.');
const report={version:VERSION,complete:issues.length===0,issues,
  measurement:'Actual local file bytes/SHA-256 and engine route witnesses. Not a hosted-account quota, FPS benchmark, browser visual review or exhaustive balance/playtest claim.',
  resources:{current,baselineV23:base.resources,baselineV22_1:prior.resources,addedOverV23:current.publicGameBytes-base.resources.publicGameBytes,
    cumulativeAddedOverV22_1:current.publicGameBytes-prior.resources.publicGameBytes,newAtlasBytes:art.totalBytes,
    budget:{publicGameBytes:23_500_000,audioDirectoryBytes:17_000_000,newAtlasBytes:1_600_000},
    budgetExplanation:'The public-file ceiling rises from22MB in v23 to23.5MB for added opponent art/prose. Existing images/audio remain byte-identical; the audio ceiling stays17MB.',
    counts:{stories:9,professions:36,distinctEnemies:45,newEnemies:36,newHumanOpponentTypes:9,newAtlases:10,existingEnemySprites:9,music:50,effects:38}},
  preservation:{allMatch:preserved.every(p=>p.matches),count:preserved.length,files:preserved},
  runtime:'One local atlas image is shown for the current opponent. Same-party fights reuse it from browser cache. No procedural image/audio generation, new external service or new recurring polling.',
  saves:{schema:22,encounterResolutionLimitPerStory:5,routeWitnesses:routes.routeCount,largestUntrimmedWitnessBytes:routes.maxSaveBytes,
    note:'Existing core battle IDs and save format remain compatible. Encounters already passed in a restored old save are not retroactively inserted.'},
  network:'Existing server-authoritative choices, D20 and room broadcasts. Peaceful resolutions are bounded game-state fields; clients cannot submit their own outcome.',
  stories,newAtlases:atlasFiles};
fs.writeFileSync(file('RESOURCE_REPORT_V24.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:VERSION,complete:report.complete,resources:report.resources,preserved:report.preservation.allMatch,preservedFiles:preserved.length,issues},null,2));
if(issues.length)process.exitCode=1;
