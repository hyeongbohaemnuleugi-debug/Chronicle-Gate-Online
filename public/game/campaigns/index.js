import lastTrain from './last-train.js';
import glassHotel from './glass-hotel.js';
import moonMarket from './moon-market.js';
import deepSea from './deep-sea.js';
import dragonBanquet from './dragon-banquet.js';
import clockCity from './clock-city.js';
import snowRadio from './snow-radio.js';
import hollowApartment from './hollow-apartment.js';
import drownedBroadcast from './drowned-broadcast.js';
import { CAMPAIGN_COMBAT } from './combat-data.js';
import { HORROR_COMBAT } from './horror-data.js';
import { LOSS_PASSAGES } from './loss-passages.js';
import { EPIC_A } from './epic-a.js';
import { EPIC_B } from './epic-b.js';
import { EPIC_HORROR } from './epic-horror.js';
import { campaignForLength, lengthOptions } from './epic-tools.js';
const battles={...CAMPAIGN_COMBAT,...HORROR_COMBAT};
const expansions={...EPIC_A,...EPIC_B,...EPIC_HORROR};
function withCombat(source) {
  const {classes,encounter}=battles[source.id];
  const nodes=Object.fromEntries(Object.entries(source.nodes).map(([id,node])=>[id,{
    ...node,choices:(node.choices||[]).map(choice=>({
      ...choice,outcomes:Object.fromEntries(Object.entries(choice.outcomes||{}).map(([grade,outcome])=>{
        const passage=LOSS_PASSAGES[source.id]?.[`${id}/${choice.id}/${grade}`];
        return [grade,passage?{...outcome,lossText:passage.lossText,survivorArrival:passage.survivorArrival}:outcome];
      })),
    })),
  }]));
  if(!nodes[encounter.nodeId]||nodes[encounter.nodeId].ending)throw new Error(`Invalid combat scene: ${source.id}`);
  nodes[encounter.nodeId]={...nodes[encounter.nodeId],encounter,
    callbacks:[...(nodes[encounter.nodeId].callbacks||[]),{when:{flag:encounter.victoryFlag},text:encounter.victoryCallback}]};
  return {...source,classes,nodes,flags:{...source.flags,[encounter.victoryFlag]:encounter.victoryFlagLabel},
    lengthMode:'basic',epicSpec:expansions[source.id]};
}
export const CAMPAIGNS=[lastTrain,glassHotel,moonMarket,deepSea,dragonBanquet,clockCity,snowRadio,hollowApartment,drownedBroadcast].map(withCombat);
export const CATALOG=CAMPAIGNS.map(c=>{
  const {nodes,clues,flags,roles,items,epicSpec,lengthMode,...meta}=c;
  return {...meta,sceneCount:Object.values(nodes).filter(n=>!n.ending).length,
    endingCount:Object.values(nodes).filter(n=>n.ending).length,
    combatCount:Object.values(nodes).filter(n=>n.encounter).length,lengthModes:lengthOptions(c)};
});
export const getCampaign=(id,storyLength='basic')=>campaignForLength(CAMPAIGNS.find(c=>c.id===id),storyLength);
export const getGameCampaign=game=>getCampaign(game.campaignId,game.storyLength||'basic');
// Stable fixtures keep the old seven-story regression suite explicit.
export const LEGACY_CAMPAIGNS=CAMPAIGNS.slice(0,7);
export const LEGACY_CATALOG=CATALOG.slice(0,7);
