// =============================================================
//  COMBO METER — chain quick harvests/actions to stack a
//  multiplier. Reset after a short idle window. Classic
//  variable-reward dopamine loop.
// =============================================================

import { state } from '../state';
import { nowSeconds } from '../utils';

export interface ComboState {
  count: number;
  lastAt: number;
  highest: number;
}

const WINDOW_SECONDS = 4;     // chain must continue within 4s
const MAX_MULT = 3.0;          // capped multiplier
const STEP_PER_HIT = 0.10;     // each hit raises mult by 10%

export function initCombo(): void {
  if (!state.combo) state.combo = { count: 0, lastAt: 0, highest: 0 };
}

export function comboHit(): { count: number; mult: number } {
  initCombo();
  const c = state.combo!;
  const now = nowSeconds();
  if (now - c.lastAt > WINDOW_SECONDS) c.count = 0;
  c.count += 1;
  c.lastAt = now;
  if (c.count > c.highest) c.highest = c.count;
  const mult = Math.min(MAX_MULT, 1 + c.count * STEP_PER_HIT);
  return { count: c.count, mult };
}

export function currentCombo(): { count: number; mult: number; remaining: number } {
  initCombo();
  const c = state.combo!;
  const now = nowSeconds();
  const remaining = Math.max(0, WINDOW_SECONDS - (now - c.lastAt));
  if (remaining === 0) c.count = 0;
  const mult = c.count > 0 ? Math.min(MAX_MULT, 1 + c.count * STEP_PER_HIT) : 1;
  return { count: c.count, mult, remaining };
}

export function comboMultiplier(): number {
  return currentCombo().mult;
}
