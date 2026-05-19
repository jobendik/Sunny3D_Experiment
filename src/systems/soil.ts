// =============================================================
//  SOIL QUALITY — base/moisture/fertility tracked per tile.
//  Rain raises moisture, harvest drains fertility. Fertilizer
//  is a craftable resource (added later in data).
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { GRID_W, GRID_H } from '../constants';
import { nowSeconds } from '../utils';
import type { SoilState } from '../types';

export function initSoil(): void {
  if (!state.soil) {
    state.soil = { grid: makeFreshSoilGrid(), lastTick: nowSeconds() };
  }
}

function makeFreshSoilGrid(): SoilState['grid'] {
  const g: SoilState['grid'] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: Array<{ moisture: number; fertility: number }> = [];
    for (let x = 0; x < GRID_W; x++) row.push({ moisture: 0.4, fertility: 0.7 });
    g.push(row);
  }
  return g;
}

export function ensureSoilGridFor(width: number, height: number): void {
  initSoil();
  const s = state.soil!;
  for (let y = 0; y < height; y++) {
    if (!s.grid[y]) s.grid[y] = [];
    for (let x = 0; x < width; x++) {
      if (!s.grid[y]![x]) s.grid[y]![x] = { moisture: 0.4, fertility: 0.7 };
    }
  }
}

export function moistureAt(gx: number, gy: number): number {
  initSoil();
  return state.soil!.grid[gy]?.[gx]?.moisture ?? 0.4;
}
export function fertilityAt(gx: number, gy: number): number {
  initSoil();
  return state.soil!.grid[gy]?.[gx]?.fertility ?? 0.7;
}

export function drainFertilityOnHarvest(gx: number, gy: number): void {
  initSoil();
  const cell = state.soil!.grid[gy]?.[gx];
  if (!cell) return;
  cell.fertility = Math.max(0.1, cell.fertility - CONFIG.soil.fertilityDrain);
}

export function applyFertilizer(gx: number, gy: number): void {
  initSoil();
  const cell = state.soil!.grid[gy]?.[gx];
  if (!cell) return;
  cell.fertility = Math.min(1.0, cell.fertility + 0.35);
}

export function applyWater(gx: number, gy: number, amt = 0.4): void {
  initSoil();
  const cell = state.soil!.grid[gy]?.[gx];
  if (!cell) return;
  cell.moisture = Math.min(1.0, cell.moisture + amt);
}

// Called from loop: rain raises moisture; sun lowers it.
export function tickSoil(dt: number): void {
  initSoil();
  const s = state.soil!;
  const w = state.weather;
  const isRain = w === 'rainy' || w === 'storm';
  const isHot = w === 'sunny' && state.season === 'summer';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const cell = s.grid[y]?.[x];
      if (!cell) continue;
      if (isRain) cell.moisture = Math.min(1.0, cell.moisture + 0.06 * dt);
      else if (isHot) cell.moisture = Math.max(0.0, cell.moisture - CONFIG.soil.moistureDecay * dt * 2);
      else cell.moisture = Math.max(0.0, cell.moisture - CONFIG.soil.moistureDecay * dt);
    }
  }
  s.lastTick = nowSeconds();
}

// Growth/yield multipliers derived from tile soil at planting time.
export function tileGrowthBoost(gx: number, gy: number): number {
  return 1.0 + moistureAt(gx, gy) * CONFIG.soil.moistureBoost;
}
export function tileYieldBoost(gx: number, gy: number): number {
  return 1.0 + fertilityAt(gx, gy) * CONFIG.soil.fertilityBoost;
}
