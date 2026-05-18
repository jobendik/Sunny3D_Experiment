import { state } from '../state';
import { CROPS } from '../data/crops';
import { SEASON_INFO, WEATHER } from '../data/seasons';
import { nowSeconds } from '../utils';
import type { Tile } from '../types';

export function growthMultiplier(): number {
  return SEASON_INFO[state.season].growthMod * WEATHER[state.weather].growthMod;
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
