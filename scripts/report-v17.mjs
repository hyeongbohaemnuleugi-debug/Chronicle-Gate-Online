/** Usage: node scripts/report-v17.mjs /path/to/verified-v16 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CAMPAIGNS} from '../public/game/campaigns/index.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseline=process.argv[2]&&path.resolve(process.argv[2]);
if(!baseline||!fs.existsSync(path.join(baseline,'public/game')))throw new Error('Pass the verified v16 directory as the first argument.');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isSymbolicLink()?[]:entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
const bytes=directory=>files(directory).reduce((sum,file)=>sum+fs.statSync(file).size,0);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gameDir=path.join(root,'public/game'),oldDir=path.join(baseline,'public/game');
const media=files(gameDir).filter(file=>/\.(mp3|webp)$/.test(file));
const preservation=media.map(file=>{const relative=path.relative(root,file),old=path.join(baseline,relative);return {path:relative,bytes:fs.statSync(file).size,sha256:sha(file),identicalToV16:fs.existsSync(old)&&sha(old)===sha(file)};});
if(preservation.some(file=>!file.identicalToV16))throw new Error('A media file differs from v16; review and describe it before publishing this report.');
const scenarios=CAMPAIGNS.map(c=>{const nodes=Object.values(c.nodes),choices=nodes.flatMap(n=>n.choices||[]),risky=choices.filter(c=>!c.automatic);return {id:c.id,title:c.title,playableScenes:nodes.filter(n=>!n.ending).length,normalEndingTemplates:nodes.filter(n=>n.ending).length,partyDeathTemplates:1,choices:choices.length,riskyChoices:risky.length,authoredRiskOutcomes:risky.reduce((sum,c)=>sum+['critical','success','failure','fumble'].filter(g=>c.outcomes[g]).length,0),items:Object.keys(c.items).length,clues:Object.keys(c.clues).length,professions:c.classes.length,revivalSites:nodes.filter(n=>n.resurrection).length,combatEncounters:nodes.filter(n=>n.encounter).length};});
const totals=Object.fromEntries(Object.keys(scenarios[0]).filter(key=>typeof scenarios[0][key]==='number').map(key=>[key,scenarios.reduce((sum,c)=>sum+c[key],0)]));
const sourceAudioBytes=36953028,mp3Bytes=preservation.filter(file=>file.path.endsWith('.mp3')).reduce((sum,file)=>sum+file.bytes,0);
const report={version:'17.0.0',generatedAt:new Date().toISOString(),unit:'bytes; decimal MB=1000000 bytes',baseline:'verified local v16 source and final media',game:{v16Bytes:bytes(oldDir),v17Bytes:bytes(gameDir),increaseBytes:bytes(gameDir)-bytes(oldDir),budgetBytes:13000000},audio:{files:46,music:35,effects:11,mp3Bytes,directoryBytes:bytes(path.join(gameDir,'audio')),v15WavBytes:sourceAudioBytes,reductionFromV15Percent:Number((100*(1-mp3Bytes/sourceAudioBytes)).toFixed(2)),bitrateKbps:96,sampleRateHz:22050,channels:1,reencodedInV17:false},art:{atlases:7,frames:28,directoryBytes:bytes(path.join(gameDir,'art')),regeneratedInV17:false},content:{scenarios,totals},preservation,limits:{defaultRooms:32,playersPerRoom:4,roomSnapshotBytes:262144,inactiveTtlHours:24,chatMessages:30,chatTtlMinutes:30,defaultConnections:160},scope:'Measured source/media bytes and exact media hashes. Not a real-device latency benchmark, server load-capacity certification or Supabase account measurement.'};
fs.writeFileSync(path.join(root,'RESOURCE_REPORT_V17.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({game:report.game,totals,identicalMedia:preservation.length},null,2));
