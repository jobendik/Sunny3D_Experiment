import type { FishDef } from '../types';

export const FISH: Record<string, FishDef> = {
  bluefish: { weight: 60, sell: 35,  xp: 4,  level: 3 },
  trout:    { weight: 30, sell: 70,  xp: 7,  level: 5 },
  goldfish: { weight: 10, sell: 180, xp: 14, level: 7 },
};
