import type { ItemDef } from '../types';

export const ITEMS: Record<string, ItemDef> = {
  // Crops (raw harvest)
  wheat:      { name: 'Wheat',     icon: 'wheat',      sell: 3,   level: 1 },
  corn:       { name: 'Corn',      icon: 'corn',       sell: 16,  level: 2 },
  carrot:     { name: 'Carrot',    icon: 'carrot',     sell: 12,  level: 2 },
  tomato:     { name: 'Tomato',    icon: 'tomato',     sell: 22,  level: 3 },
  pumpkin:    { name: 'Pumpkin',   icon: 'pumpkin',    sell: 32,  level: 4 },
  strawberry: { name: 'Strawberry',icon: 'strawberry', sell: 38,  level: 5 },
  sugarcane:  { name: 'Sugarcane', icon: 'sugarcane',  sell: 45,  level: 6 },
  // Animal produce
  egg:        { name: 'Egg',       icon: 'egg',        sell: 20,  level: 3 },
  milk:       { name: 'Milk',      icon: 'milk',       sell: 36,  level: 4 },
  wool:       { name: 'Wool',      icon: 'wool',       sell: 64,  level: 6 },
  bacon:      { name: 'Bacon',     icon: 'bacon',      sell: 110, level: 8 },
  // Processed
  bread:      { name: 'Bread',     icon: 'bread',      sell: 20,  level: 3 },
  flour:      { name: 'Flour',     icon: 'flour',      sell: 12,  level: 2 },
  cookie:     { name: 'Cookie',    icon: 'cookie',     sell: 50,  level: 4 },
  cheese:     { name: 'Cheese',    icon: 'cheese',     sell: 90,  level: 5 },
  butter:     { name: 'Butter',    icon: 'butter',     sell: 70,  level: 5 },
  sugar:      { name: 'Sugar',     icon: 'sugar',      sell: 80,  level: 6 },
  cake:       { name: 'Cake',      icon: 'cake',       sell: 220, level: 7 },
  feed:       { name: 'Feed',      icon: 'feed',       sell: 8,   level: 2 },
  // Orchard fruits
  apple:      { name: 'Apple',     icon: 'apple',      sell: 42,  level: 4 },
  pear:       { name: 'Pear',      icon: 'pear',       sell: 55,  level: 5 },
  // Other animal produce
  yogurt:     { name: 'Yogurt',    icon: 'yogurt',     sell: 78,  level: 5 },
  feather:    { name: 'Feather',   icon: 'feather',    sell: 30,  level: 4 },
  // Fish
  bluefish:   { name: 'Bluefish',  icon: 'bluefish',   sell: 35,  level: 3 },
  trout:      { name: 'Trout',     icon: 'trout',      sell: 70,  level: 5 },
  goldfish:   { name: 'Goldfish',  icon: 'goldfish',   sell: 180, level: 7 },
  // Premium processed
  juice:      { name: 'Apple Juice', icon: 'juice', sell: 95,  level: 5 },
  jam:        { name: 'Berry Jam',   icon: 'jam',   sell: 130, level: 6 },
  cloth:      { name: 'Cloth',       icon: 'cloth', sell: 160, level: 7 },
  ribs:       { name: 'BBQ Ribs',    icon: 'ribs',  sell: 250, level: 9 },
  pie:        { name: 'Pie',         icon: 'pie',   sell: 310, level: 8 },
  // New crops (seasonal expansion)
  lavender:   { name: 'Lavender',    icon: 'lavender',   sell: 28, level: 4 },
  blueberry:  { name: 'Blueberry',   icon: 'blueberry',  sell: 36, level: 5 },
  // New processed (Phase 3 chains)
  perfume:    { name: 'Perfume',     icon: 'perfume',    sell: 180, level: 7 },
  honey:      { name: 'Honey',       icon: 'honey',      sell: 95,  level: 6 },
  candle:     { name: 'Candle',      icon: 'candle',     sell: 140, level: 6 },
  smoothie:   { name: 'Smoothie',    icon: 'smoothie',   sell: 160, level: 6 },
  // Catalysts (consumables)
  fertilizer: { name: 'Fertilizer',  icon: 'fertilizer', sell: 12,  level: 3 },
  speedup:    { name: 'Speed Boost', icon: 'speedup',    sell: 28,  level: 4 },
  priority:   { name: 'Priority',    icon: 'priority',   sell: 50,  level: 5 },
  qualityink: { name: 'Quality Ink', icon: 'qualityink', sell: 90,  level: 6 },
  // Bait
  worm:       { name: 'Earthworm',   icon: 'worm',       sell: 1,   level: 3 },
  fly:        { name: 'Mayfly',      icon: 'fly',        sell: 6,   level: 5 },
  lure:       { name: 'Goldlure',    icon: 'lure',       sell: 20,  level: 7 },
  // Roadmap: Upgrade materials (barn)
  plank:      { name: 'Plank',       icon: 'plank',      sell: 35,  level: 4 },
  nail:       { name: 'Nail',        icon: 'nail',       sell: 12,  level: 4 },
  screw:      { name: 'Screw',       icon: 'screw',      sell: 18,  level: 5 },
  hinge:      { name: 'Hinge',       icon: 'hinge',      sell: 28,  level: 5 },
  paint:      { name: 'Paint Bucket', icon: 'paint',     sell: 60,  level: 6 },
  // Roadmap: Upgrade materials (silo)
  panel:      { name: 'Wood Panel',  icon: 'panel',      sell: 32,  level: 4 },
  bolt:       { name: 'Metal Bolt',  icon: 'bolt',       sell: 22,  level: 4 },
  rope:       { name: 'Rope',        icon: 'rope',       sell: 18,  level: 4 },
  tarp:       { name: 'Tarpaulin',   icon: 'tarp',       sell: 40,  level: 5 },
  // Roadmap: Land expansion materials
  deed:       { name: 'Land Deed',   icon: 'deed',       sell: 200, level: 6 },
  stake:      { name: 'Marker Stake', icon: 'stake',     sell: 25,  level: 5 },
  map:        { name: 'Survey Map',  icon: 'map',        sell: 80,  level: 6 },
  mallet:     { name: 'Mallet',      icon: 'mallet',     sell: 45,  level: 5 },
};
