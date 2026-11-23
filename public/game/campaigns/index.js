import lastTrain from './last-train.js';
import glassHotel from './glass-hotel.js';
import moonMarket from './moon-market.js';
import deepSea from './deep-sea.js';
import dragonBanquet from './dragon-banquet.js';
import clockCity from './clock-city.js';
import snowRadio from './snow-radio.js';
import { CAMPAIGN_COMBAT } from './combat-data.js';

function withCombat(source) {
  const { classes, encounter } = CAMPAIGN_COMBAT[source.id];
  const nodes = Object.fromEntries(Object.entries(source.nodes).map(([id, node]) => [id, { ...node }]));
  if (!nodes[encounter.nodeId] || nodes[encounter.nodeId].ending) throw new Error(`Invalid combat scene: ${source.id}`);
  nodes[encounter.nodeId] = {
    ...nodes[encounter.nodeId], encounter,
    callbacks: [...(nodes[encounter.nodeId].callbacks || []), { when: { flag: encounter.victoryFlag }, text: encounter.victoryCallback }],
  };
  return { ...source, classes, nodes, flags: { ...source.flags, [encounter.victoryFlag]: encounter.victoryFlagLabel } };
}
export const CAMPAIGNS = [lastTrain, glassHotel, moonMarket, deepSea, dragonBanquet, clockCity, snowRadio].map(withCombat);
export const CATALOG = CAMPAIGNS.map(({ nodes, clues, flags, roles, ...meta }) => ({
  ...meta, sceneCount: Object.values(nodes).filter(n => !n.ending).length,
  endingCount: Object.values(nodes).filter(n => n.ending).length,
  combatCount: Object.values(nodes).filter(n => n.encounter).length,
}));
export const getCampaign = id => CAMPAIGNS.find(c => c.id === id);
