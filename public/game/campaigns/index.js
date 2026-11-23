import lastTrain from './last-train.js';
import glassHotel from './glass-hotel.js';
import moonMarket from './moon-market.js';
import deepSea from './deep-sea.js';
import dragonBanquet from './dragon-banquet.js';
import clockCity from './clock-city.js';
import snowRadio from './snow-radio.js';
export const CAMPAIGNS = [lastTrain, glassHotel, moonMarket, deepSea, dragonBanquet, clockCity, snowRadio];
export const CATALOG = CAMPAIGNS.map(({ nodes, clues, flags, roles, ...meta }) => ({
  ...meta, sceneCount: Object.values(nodes).filter(n => !n.ending).length,
  endingCount: Object.values(nodes).filter(n => n.ending).length,
}));
export const getCampaign = id => CAMPAIGNS.find(c => c.id === id);
