// =============================================================
//  BUILDING MASTERY — Phase 6 of the roadmap. Each production
//  building type accumulates a mastery counter; stars are earned
//  at 25 / 100 / 300 completions, granting small permanent buffs.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import type { BuildingMasteryEntry } from '../types';

const STAR_THRESHOLDS = [25, 100, 300] as const;

const BUFF_BY_STARS: ReadonlyArray<{ speed: number; quality: number }> = [
  { speed: 0,    quality: 0    }, // 0 stars
  { speed: 0.03, quality: 0    }, // 1 star: -3% time
  { speed: 0.03, quality: 0.03 }, // 2 stars: +3% good quality chance
  { speed: 0.06, quality: 0.05 }, // 3 stars: -6% time + 5% quality
];

export function initBuildingMastery(): void {
  if (!state.buildingMastery) {
    state.buildingMastery = { byBuildingType: {} };
  }
}

function entry(buildingType: string): BuildingMasteryEntry {
  initBuildingMastery();
  if (!state.buildingMastery!.byBuildingType[buildingType]) {
    state.buildingMastery!.byBuildingType[buildingType] = { produced: 0, stars: 0 };
  }
  return state.buildingMastery!.byBuildingType[buildingType]!;
}

/** Record a production completion against a building type. */
export function recordProduction(buildingType: string, count = 1): void {
  if (!BUILDINGS[buildingType]) return;
  const e = entry(buildingType);
  e.produced += count;
  // Check star thresholds.
  while (e.stars < STAR_THRESHOLDS.length && e.produced >= STAR_THRESHOLDS[e.stars]!) {
    e.stars += 1;
    const def = BUILDINGS[buildingType]!;
    track('mastery_star_earned', { building: buildingType, stars: e.stars });
    toast(`⭐ ${def.name} mastery — ${e.stars} star${e.stars > 1 ? 's' : ''}!`, 'gold');
  }
}

export function masteryStars(buildingType: string): number {
  return entry(buildingType).stars;
}

export function masteryProgress(buildingType: string): { produced: number; nextAt: number | null; stars: number } {
  const e = entry(buildingType);
  const nextAt = e.stars < STAR_THRESHOLDS.length ? STAR_THRESHOLDS[e.stars]! : null;
  return { produced: e.produced, nextAt, stars: e.stars };
}

export function masterySpeedBuff(buildingType: string): number {
  const s = masteryStars(buildingType);
  return BUFF_BY_STARS[Math.min(s, BUFF_BY_STARS.length - 1)]!.speed;
}

export function masteryQualityBuff(buildingType: string): number {
  const s = masteryStars(buildingType);
  return BUFF_BY_STARS[Math.min(s, BUFF_BY_STARS.length - 1)]!.quality;
}

export function masteryBadge(buildingType: string): string {
  const s = masteryStars(buildingType);
  return s > 0 ? '★'.repeat(s) : '';
}
