/** Keep a compact auditable summary in the patch; full traces can be regenerated. */
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const source=JSON.parse(fs.readFileSync(new URL('NARRATIVE_REACHABILITY_V22.json',root),'utf8'));
const brief=row=>Object.fromEntries(Object.entries({...row,traceSteps:row.trace?.length||0}).filter(([key])=>!['trace','finalInventory','inventoryBefore','inventoryAfter','finalFlags','encounterResolutions'].includes(key)));
const scenarios=source.scenarios.map(s=>({id:s.id,storyLength:s.storyLength,title:s.title,optionalEncounterCount:s.optionalEncounterCount,
  endings:[...s.soloEndings,...s.twoPlayerEndings,...s.threePlayerEndings,...s.endings].map(brief),
  items:s.items.map(brief),partyBranches:s.partyBranches.map(brief),encounterTools:s.encounterTools.map(brief)}));
const report={version:source.version,generatedAt:source.generatedAt,method:source.method,
  regeneration:'npm run test:routes && node scripts/summarize-routes-v24.mjs',
  note:'The full raw witness file is deliberately omitted from the small patch. It is recreated by the shipped production-engine explorer. ENCOUNTER_ROUTES_V24.json separately includes complete zero/max-battle route traces.',
  counts:{storyModes:scenarios.length,endingWitnesses:scenarios.reduce((n,s)=>n+s.endings.length,0),
    itemWitnesses:scenarios.reduce((n,s)=>n+s.items.length,0),partyBranchWitnesses:scenarios.reduce((n,s)=>n+s.partyBranches.length,0),encounterToolWitnesses:scenarios.reduce((n,s)=>n+s.encounterTools.length,0)},
  issues:source.issues,scenarios};
fs.writeFileSync(new URL('NARRATIVE_SUMMARY_V24.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:report.version,counts:report.counts,issues:report.issues}));
if(report.issues.length)process.exitCode=1;
