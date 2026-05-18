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
};
