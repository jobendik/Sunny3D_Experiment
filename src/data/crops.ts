import type { CropDef } from '../types';

export const CROPS: Record<string, CropDef> = {
  wheat:      { item: 'wheat',      grow: 25,  seedCost: 1,  yieldMin: 2, yieldMax: 3, level: 1, xp: 1 },
  corn:       { item: 'corn',       grow: 80,  seedCost: 8,  yieldMin: 1, yieldMax: 2, level: 2, xp: 3 },
  carrot:     { item: 'carrot',     grow: 60,  seedCost: 5,  yieldMin: 1, yieldMax: 2, level: 2, xp: 2 },
  tomato:     { item: 'tomato',     grow: 120, seedCost: 14, yieldMin: 1, yieldMax: 2, level: 3, xp: 4 },
  pumpkin:    { item: 'pumpkin',    grow: 180, seedCost: 22, yieldMin: 1, yieldMax: 2, level: 4, xp: 5 },
  strawberry: { item: 'strawberry', grow: 220, seedCost: 28, yieldMin: 1, yieldMax: 2, level: 5, xp: 6 },
  sugarcane:  { item: 'sugarcane',  grow: 280, seedCost: 32, yieldMin: 1, yieldMax: 2, level: 6, xp: 7 },
  // Phase 3 new crops
  lavender:   { item: 'lavender',   grow: 150, seedCost: 18, yieldMin: 1, yieldMax: 2, level: 4, xp: 4 },
  blueberry:  { item: 'blueberry',  grow: 200, seedCost: 24, yieldMin: 1, yieldMax: 2, level: 5, xp: 5 },
};
