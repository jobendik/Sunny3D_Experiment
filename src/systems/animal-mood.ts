// =============================================================
//  ANIMAL MOOD — pens have a mood score that drifts based on
//  feed level, decorations nearby, and weather. Mood affects
//  produce yield + speed multipliers.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { DECORATIONS } from '../data/decorations';
import { nowSeconds } from '../utils';
import { activeEffects as weatherGridEffects } from './weather-grid';

export interface MoodState {
  mood: Record<string, number>; // building id → 0..100
  lastTick: number;
}

export function initMood(): void {
  if (!state.mood) state.mood = { mood: {}, lastTick: nowSeconds() };
}

export function moodLevel(buildingId: string): number {
  initMood();
  return state.mood!.mood[buildingId] ?? 60;
}

// Nearby decorations boost mood ceiling. Cosmetic decorations have a
// soft "vibe" tier; functional ones (gazebo, fountain) lift mood more.
function nearbyDecorBonus(b: { x: number; y: number; type: string }): number {
  const def = BUILDINGS[b.type]!;
  if (def.kind !== 'pen') return 0;
  let bonus = 0;
  for (const d of state.decor) {
    const dx = d.x - b.x;
    const dy = d.y - b.y;
    if (dx * dx + dy * dy <= 16) {
      const dd = DECORATIONS[d.type];
      if (!dd) continue;
      const factor =
        d.type === 'fountain' ? 8 :
        d.type === 'gazebo' ? 12 :
        d.type === 'statue' ? 6 :
        d.type === 'flowerbed' ? 3 :
        d.type === 'bench' ? 4 :
        d.type === 'pinwheel' ? 5 :
        2;
      bonus += factor;
    }
  }
  return Math.min(40, bonus);
}

export function tickMood(dt: number): void {
  initMood();
  const m = state.mood!;
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const id = b.id;
    let cur = m.mood[id] ?? 60;
    const feed = state.penFeed[id] ?? 100;
    // Drift toward target.
    const target = Math.min(100, feed * 0.6 + nearbyDecorBonus({ x: b.x, y: b.y, type: b.type }));
    cur = cur + (target - cur) * Math.min(1, dt * 0.3);
    // Weather drag.
    if (state.weather === 'storm') cur -= dt * 4;
    if (state.weather === 'snowy') cur -= dt * 2;
    if (state.weather === 'sunny') cur += dt * 1.5;
    // Weather grid mood floor
    const eff = weatherGridEffects();
    if (eff.moodFloor > 0) cur = Math.max(cur, eff.moodFloor);
    m.mood[id] = Math.max(0, Math.min(100, cur));
  }
  m.lastTick = nowSeconds();
}

export function moodMultipliers(buildingId: string): { speed: number; yield: number } {
  const m = moodLevel(buildingId);
  // 0=worst, 60=neutral, 100=peak
  const t = (m - 60) / 40;
  return {
    speed: 1 + Math.max(0, t) * 0.20,   // peak +20% speed
    yield: 1 + Math.max(0, t) * 0.25,   // peak +25% yield
  };
}
