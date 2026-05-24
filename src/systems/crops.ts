import { state } from '../state';
import { CROPS } from '../data/crops';
import { SEASON_INFO, WEATHER } from '../data/seasons';
import { nowSeconds } from '../utils';
import { specEffects } from './specializations';
import { activeEffects as weatherGridEffects } from './weather-grid';
import { perkValue } from './prestige';
import { currentHazardMod } from './hazards';
import { paceMultiplier } from './settings';
import type { Tile } from '../types';

export function growthMultiplier(): number {
  const base = SEASON_INFO[state.season].growthMod * WEATHER[state.weather].growthMod;
  const sp = specEffects();
  const eff = weatherGridEffects();
  const hazard = currentHazardMod();
  // First-session jumpstart: while the player hasn't completed a
  // single harvest yet, crops grow ~1.7× faster. The 18 s wheat becomes
  // ~10 s, so the plow → plant → harvest loop fits comfortably inside
  // the first 90 seconds of play. Once they've harvested once, normal
  // pacing kicks in and the "come back tomorrow" loop resumes.
  const jumpstart = state.stats.harvested === 0 ? 1.7 : 1.0;
  // paceMultiplier() (1×/2×/3×) divides growth — cozy mode lets players
  // savour the "come back tomorrow" loop instead of resolving everything
  // in a single sitting.
  return (base
    * jumpstart
    * (1 + (sp.cropGrowth ?? 0))
    * (1 + eff.growth)
    * (1 + perkValue('growthBoost'))
    * (1 + hazard.growth)) // hazard.growth is negative when unprepared
    / paceMultiplier();
}

export function cropStage(tile: Tile): number {
  if (!tile.crop) return -1;
  const crop = CROPS[tile.crop]!;
  const elapsed = (nowSeconds() - tile.plantedAt) * growthMultiplier();
  const p = elapsed / crop.grow;
  if (p >= 1.0) return 3;
  if (p >= 0.66) return 2;
  if (p >= 0.33) return 1;
  return 0;
}

export function isWithered(tile: Tile): boolean {
  if (!tile.crop) return false;
  const crop = CROPS[tile.crop]!;
  const elapsed = nowSeconds() - tile.plantedAt;
  return elapsed >= crop.grow * 4;
}

export function isWilting(tile: Tile): boolean {
  if (!tile.crop) return false;
  const crop = CROPS[tile.crop]!;
  const elapsed = nowSeconds() - tile.plantedAt;
  return elapsed >= crop.grow * 2.5 && elapsed < crop.grow * 4;
}
