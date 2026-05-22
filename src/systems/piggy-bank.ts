// =============================================================
//  PIGGY BANK — Hay Day-style end-of-season diamond reserve.
//
//  Each coin spent in the shop, each delivery completed, and each
//  premium activity drops a small percentage as bonus diamonds into
//  the Piggy Bank. The Piggy Bank stores up to a cap and can only
//  be "broken" once it's at least 30% full. Breaking it claims
//  the stored diamonds in full.
//
//  This mirrors Hay Day's piggy bank which accumulates extra tokens
//  until the end of the season, when you unlock and collect them.
// =============================================================

import { state } from '../state';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';
import { localDayIndex } from './daily';

const DEFAULT_CAP = 25;     // first piggy holds 25 diamonds
const BREAK_THRESHOLD = 0.30; // must be ≥30% full to break

export function initPiggyBank(): void {
  if (!state.piggyBank) {
    state.piggyBank = {
      gems: 0,
      cap: DEFAULT_CAP,
      seasonStartDay: localDayIndex(),
      broken: false,
      fillSinceLastBreak: 0,
    };
  }
}

/**
 * Add a fractional amount toward the piggy bank. Smaller activities
 * contribute fractional gems; the bank tallies these and rounds up to
 * the next gem when at least 1.0 has accumulated. This makes the bank
 * feel like a "saving" device.
 */
export function piggyAdd(fractional: number): void {
  initPiggyBank();
  const pb = state.piggyBank!;
  if (pb.broken) return;
  pb.fillSinceLastBreak += fractional;
  while (pb.fillSinceLastBreak >= 1 && pb.gems < pb.cap) {
    pb.gems += 1;
    pb.fillSinceLastBreak -= 1;
  }
  if (pb.gems >= pb.cap) {
    pb.fillSinceLastBreak = 0;
  }
}

/** Helper for converting a coin spend into a piggy fill. */
export function piggyOnCoinSpend(coins: number): void {
  // 1 piggy gem per 200 coins spent
  piggyAdd(coins / 200);
}

/** Helper for converting an order delivery into a piggy fill. */
export function piggyOnDelivery(): void {
  piggyAdd(0.4);
}

/** Helper for boat/train full-completion bonus. */
export function piggyOnBigDelivery(): void {
  piggyAdd(2);
}

export function piggyPct(): number {
  initPiggyBank();
  return Math.min(1, state.piggyBank!.gems / Math.max(1, state.piggyBank!.cap));
}

export function canBreakPiggy(): boolean {
  initPiggyBank();
  const pb = state.piggyBank!;
  return !pb.broken && pb.gems > 0 && piggyPct() >= BREAK_THRESHOLD;
}

export function breakPiggy(): boolean {
  initPiggyBank();
  if (!canBreakPiggy()) {
    sfx.error();
    toast(`Piggy needs at least ${Math.ceil(state.piggyBank!.cap * BREAK_THRESHOLD)} 💎 first.`);
    return false;
  }
  const pb = state.piggyBank!;
  const reward = pb.gems;
  state.gems += reward;
  pb.gems = 0;
  pb.fillSinceLastBreak = 0;
  pb.broken = true;
  // After breaking, the piggy stays broken until it's reset (next season-pass cycle).
  toast(`🐷 Piggy bank broken! +${reward} 💎`, 'gold');
  sfx.coin(); sfx.bell();
  updateHUD();
  track('piggy_broken', { gems: reward });
  return true;
}

/** Reset a fresh piggy bank — usually called at the start of a new season pass. */
export function resetPiggyBank(): void {
  initPiggyBank();
  state.piggyBank = {
    gems: 0,
    cap: DEFAULT_CAP + Math.floor(state.level / 5) * 5,
    seasonStartDay: localDayIndex(),
    broken: false,
    fillSinceLastBreak: 0,
  };
  track('piggy_reset', { cap: state.piggyBank.cap });
}

export const PIGGY_BREAK_THRESHOLD = BREAK_THRESHOLD;
