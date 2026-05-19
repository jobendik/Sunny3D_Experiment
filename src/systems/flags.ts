// =============================================================
//  FEATURE FLAGS  — every retention/differentiation system can be
//  toggled live. Reads from localStorage so QA can flip in console.
// =============================================================

import type { FeatureKey } from '../config';

const KEY = 'sunnyacres-flags-v1';

const DEFAULTS: Record<FeatureKey, boolean> = {
  dailyStreak: true,
  dailyChallenges: true,
  objectiveRail: true,
  weatherGrid: true,
  specializations: true,
  collection: true,
  prestige: true,
  marketDynamics: true,
  eventChoices: true,
  tutorial: true,
  soilQuality: true,
  adjacencyBuffs: true,
  animalMood: true,
  fishingBiomes: true,
  beautification: true,
  comeback: true,
  weeklyTrack: true,
  landmarks: true,
  leaderboard: true,
  telemetry: true,
};

let cache: Record<FeatureKey, boolean> | null = null;

function load(): Record<FeatureKey, boolean> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache!;
}

export function flag(key: FeatureKey): boolean {
  return load()[key];
}

export function setFlag(key: FeatureKey, on: boolean): void {
  const f = load();
  f[key] = on;
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

export function allFlags(): Record<FeatureKey, boolean> {
  return { ...load() };
}

// expose for live tuning
if (typeof window !== 'undefined') {
  (window as unknown as { saFlags?: unknown }).saFlags = { flag, setFlag, allFlags };
}
