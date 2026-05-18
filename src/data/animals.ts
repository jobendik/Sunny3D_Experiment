import type { AnimalDef } from '../types';

export const ANIMALS: Record<string, AnimalDef> = {
  chicken: { name: 'Chicken', produces: 'egg',     feedCost: 1, produceTime: 40,  price: 50,   level: 3, xp: 2,
             body: { w: 28, h: 22, color: '#fff8e0', accent: '#e54040', beak: '#ffaa20' } },
  cow:     { name: 'Cow',     produces: 'milk',    feedCost: 2, produceTime: 80,  price: 240,  level: 4, xp: 4,
             body: { w: 50, h: 36, color: '#fffbf0', accent: '#2a2018', beak: '#ffbcb0' } },
  sheep:   { name: 'Sheep',   produces: 'wool',    feedCost: 3, produceTime: 140, price: 600,  level: 6, xp: 7,
             body: { w: 44, h: 34, color: '#f6efe0', accent: '#4a3a30', beak: '#d8c8b0' } },
  pig:     { name: 'Pig',     produces: 'bacon',   feedCost: 4, produceTime: 220, price: 1200, level: 8, xp: 11,
             body: { w: 48, h: 34, color: '#f6b8c0', accent: '#a06070', beak: '#e89aa6' } },
  goat:    { name: 'Goat',    produces: 'yogurt',  feedCost: 2, produceTime: 110, price: 480,  level: 5, xp: 5,
             body: { w: 42, h: 30, color: '#e8dccc', accent: '#3a2a1a', beak: '#d8c8b0' } },
  duck:    { name: 'Duck',    produces: 'feather', feedCost: 1, produceTime: 70,  price: 180,  level: 4, xp: 3,
             body: { w: 32, h: 26, color: '#fafafa', accent: '#ff9020', beak: '#ffaa20' } },
};
