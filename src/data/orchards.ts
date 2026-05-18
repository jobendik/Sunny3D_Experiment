import type { OrchardDef } from '../types';

export const ORCHARDS: Record<string, OrchardDef> = {
  appletree: {
    name: 'Apple Tree', fruit: 'apple', seedCost: 120, grow: 180, cycle: 90,
    yieldMin: 2, yieldMax: 3, level: 4, xp: 10,
  },
  peartree: {
    name: 'Pear Tree', fruit: 'pear', seedCost: 200, grow: 240, cycle: 120,
    yieldMin: 2, yieldMax: 3, level: 5, xp: 14,
  },
};
