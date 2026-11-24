/** Reproducible local content/resource measurements; no hosting-account estimates. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
import {VERSION} from '../public/game/engine.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const full=relative=>path.join(root,relative);
const bytes=relative=>fs.statSync(full(relative)).size;
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const files=relative=>fs.readdirSync(full(relative),{withFileTypes:true}).flatMap(entry=>{
  const child=path.posix.join(relative,entry.name);
  return entry.isDirectory()?files(child):entry.isFile()?[child]:[];
});
const all=files('public/game'),audio=files('public/game/audio'),art=files('public/game/art');
const music=audio.filter(file=>file.endsWith('.mp3'));
const sum=list=>list.reduce((n,file)=>n+bytes(file),0);
const frozen=JSON.parse(fs.readFileSync(full('tests-v21/fixtures/v20-preserved-files.json'),'utf8'));
const contract=JSON.parse(fs.readFileSync(full('tests-v21/fixtures/v20-story-contract.json'),'utf8'));
const changedPreservedFiles=[];
for(const [relative,expected] of Object.entries(frozen)){
  let data=fs.readFileSync(full(relative));
  if(relative==='public/game/app.js')data=Buffer.from(data.toString('utf8').replaceAll('chronicle-gate-v21-','chronicle-gate-v20-'));
  if(hash(data)!==expected)changedPreservedFiles.push(relative);
}
const stories=CAMPAIGNS.map(c=>{
  const old=contract.campaigns.find(item=>item.id===c.id),nodes=Object.values(c.nodes);
  return {id:c.id,title:c.title,playableScenes:nodes.filter(n=>!n.ending).length,ordinaryEndings:nodes.filter(n=>n.ending).length,items:Object.keys(c.items).length,
    addedScenes:nodes.filter(n=>!n.ending&&!old.nodeIds.includes(n.id)).map(n=>({id:n.id,title:n.title})),
    addedEndings:nodes.filter(n=>n.ending&&!old.nodeIds.includes(n.id)).map(n=>({id:n.id,title:n.title})),
    addedItems:Object.keys(c.items).filter(id=>!old.itemIds.includes(id)).map(id=>({id,name:c.items[id].name}))};
});
const index=fs.readFileSync(full('public/index.html'));
const report={version:VERSION,baseline:'20.0.0',generatedAt:new Date().toISOString(),
  publicGameBytes:sum(all),publicGameFiles:all.length,baselineGameBytes:17_358_785,
  publicGameIncreaseBytes:sum(all)-17_358_785,publicGameBudgetBytes:18_000_000,
  audioMp3Bytes:sum(music),audioDirectoryBytes:sum(audio),audioFiles:music.length,audioBudgetBytes:14_500_000,
  musicFiles:42,effectFiles:13,imageAtlases:art.filter(f=>f.endsWith('.webp')).length,artBytes:sum(art),
  preservedFileCount:Object.keys(frozen).length,preservedFilesMatch:changedPreservedFiles.length===0,changedPreservedFiles,
  appBehaviorUnchangedApartFromDownloadVersion:!changedPreservedFiles.includes('public/game/app.js'),
  offlineBytes:bytes('public/offline.html'),baselineOfflineBytes:2_491_947,
  diceModuleBytes:bytes('public/game/dice.js'),indexBytes:index.length,
  indexCopyExact:index.equals(fs.readFileSync(full('COPYPASTE/index.html.txt'))),
  storyCount:stories.length,playableScenes:stories.reduce((n,c)=>n+c.playableScenes,0),
  ordinaryEndings:stories.reduce((n,c)=>n+c.ordinaryEndings,0),partyDeathEndings:CAMPAIGNS.filter(c=>c.deathEnding).length,
  items:stories.reduce((n,c)=>n+c.items,0),stories,
  scope:'Measured delivered game files, not repository history, dependencies, browser heap, hosting quotas or production traffic. Preservation compares frozen v20 SHA-256 hashes. Only two app download filename prefixes are normalized for that comparison. Ordinary endings exclude existing total-party-death endings and conditional epilogue combinations.'};
fs.writeFileSync(full('RESOURCE_REPORT_V21.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({gameBytes:report.publicGameBytes,increase:report.publicGameIncreaseBytes,audioBytes:report.audioDirectoryBytes,preserved:report.preservedFilesMatch,scenes:report.playableScenes,endings:report.ordinaryEndings,items:report.items,indexCopyExact:report.indexCopyExact},null,2));
if(changedPreservedFiles.length||!report.indexCopyExact||report.publicGameBytes>report.publicGameBudgetBytes||report.audioDirectoryBytes>report.audioBudgetBytes)process.exitCode=1;
