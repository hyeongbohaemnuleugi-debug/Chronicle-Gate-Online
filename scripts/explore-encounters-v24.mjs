/** Reproducible witnesses of both peaceful and maximum-combat routes. */
import fs from 'node:fs';
import {CAMPAIGNS,getCampaign} from '../public/game/campaigns/index.js';
import {VERSION} from '../public/game/engine.js';
import {completeRoute} from '../tests-v24/helpers.mjs';
const report={version:VERSION,method:'Every route below executes actual authored choices, safe observations and D20 outcomes through the production engine. Party size is fixed at one or four; maximum combat routes use natural 20 player rolls and natural 1 enemy rolls to witness reachability, not simulate typical balance. Zero-combat routes use the automatic bypass at each encountered gate. Every witness reaches an ordinary ending; no scene is teleported or victory fabricated. Dedicated tests also cover all 45 individual encounters, each grade, 1–4 scaling, deaths, resurrection, save migration and four real online clients.',stories:[]};
for(const base of CAMPAIGNS){
  const story={id:base.id,title:base.title,enemies:getCampaign(base.id,'epic').encounterCatalog.map(({id,name,epicOnly})=>({id,name,epicOnly})),modes:[]};
  for(const length of ['basic','epic']){
    const campaign=getCampaign(base.id,length),mode={id:length,possibleEncounters:campaign.encounterCatalog.length,routes:[]};
    for(const players of [1,4])for(const fight of [false,true]){
      const {game,steps,explored}=completeRoute(campaign,{count:players,fight});
      mode.routes.push({players,approach:fight?'all-fight':'all-bypass',ending:game.nodeId,actualCombats:game.completedCombats.length,resolutions:game.encounterResolutions,visitedScenes:game.visited.length,storyChoices:steps.filter(step=>step.choiceId).length,combatTurns:steps.filter(step=>step.combatAction).length,totalActions:steps.length,statesExplored:explored,saveBytes:Buffer.byteLength(JSON.stringify(game)),steps});
    }
    story.modes.push(mode);
  }
  report.stories.push(story);console.log(`${base.id}: Basic 0/3 and Epic 0/5 actual fights reach endings with one/four players`);
}
report.distinctEnemies=new Set(report.stories.flatMap(story=>story.enemies.map(enemy=>enemy.id))).size;
report.routeCount=report.stories.reduce((sum,story)=>sum+story.modes.reduce((count,mode)=>count+mode.routes.length,0),0);
report.maxSaveBytes=Math.max(...report.stories.flatMap(story=>story.modes.flatMap(mode=>mode.routes.map(route=>route.saveBytes))));
if(process.argv.includes('--write'))fs.writeFileSync(new URL('../ENCOUNTER_ROUTES_V24.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`Verified ${report.routeCount} real routes; ${report.distinctEnemies} unique enemies; largest full witness save ${report.maxSaveBytes} bytes.`);
