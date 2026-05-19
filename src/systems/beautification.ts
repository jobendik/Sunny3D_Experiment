// =============================================================
//  BEAUTIFICATION — placed decorations give the farm a passive
//  beauty score that buffs global yields.
// =============================================================

import { state } from '../state';
import { DECORATIONS } from '../data/decorations';
import { CONFIG } from '../config';

const TIER: Record<string, number> = {
  flowerbed: 0, lamppost: 0, pinwheel: 0,
  bench: 1, scarecrow: 1,
  fountain: 2, statue: 3, gazebo: 4,
};

export function beautyScore(): number {
  let s = 0;
  for (const d of state.decor) {
    if (!DECORATIONS[d.type]) continue;
    const tier = TIER[d.type] ?? 0;
    s += CONFIG.beautification.perDecorTier[tier] ?? 1;
  }
  return s;
}

export function beautyBonus(): number {
  // 50 score → max yield bonus (10%)
  const s = beautyScore();
  return Math.min(CONFIG.beautification.yieldBonusMax, s / 50 * CONFIG.beautification.yieldBonusMax);
}
