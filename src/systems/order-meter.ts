// =============================================================
//  ORDER BOARD METER  (FarmVille-3 macro-progress hook)
//
//  Fulfilling Order-Board entries fills a global progress bar.
//  When the bar tops out, the player is granted a Reward Box —
//  this is the *variable-ratio reward* mechanic described in the
//  research doc, wired into the loop's central economic driver.
//
//  CrazyGames safety:  the reward box is purely earned through
//  gameplay; there is no premium-currency shortcut path. The
//  spawn always becomes a free Surprise Box (rarity scaled by
//  level), no monetization layer.
// =============================================================

import { state } from '../state';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { addPassPoints, recordOrderCycle } from './season-pass';

export interface OrderMeterRoot {
  /** Points accumulated toward the next reward box. */
  progress: number;
  /** Points required to complete the current bar. */
  threshold: number;
  /** How many full bars the player has filled in this lifetime. */
  totalCycles: number;
  /** Reward Box queued from the last fill; consumed by Surprise Box. */
  pendingReward: boolean;
}

declare module '../types' {
  interface GameState {
    orderMeter?: OrderMeterRoot;
  }
}

export function initOrderMeter(): void {
  if (!state.orderMeter) {
    state.orderMeter = {
      progress: 0,
      threshold: thresholdForCycle(0),
      totalCycles: 0,
      pendingReward: false,
    };
  }
}

/** Threshold curve: gently scales with cycles. Stays cozy. */
function thresholdForCycle(cycle: number): number {
  return 6 + Math.min(14, Math.floor(cycle * 1.5));
}

/** Award meter points for fulfilling an order. Coin reward is the
 *  natural input — bigger orders advance the bar faster. */
export function addOrderPoints(coinValue: number): void {
  initOrderMeter();
  const m = state.orderMeter!;
  // 1 point per ~40 coins, min 1, max 6 — keeps the bar lively
  // without trivialising the top end of orders.
  const pts = Math.max(1, Math.min(6, Math.round(coinValue / 40)));
  m.progress += pts;
  while (m.progress >= m.threshold) {
    m.progress -= m.threshold;
    m.totalCycles += 1;
    m.threshold = thresholdForCycle(m.totalCycles);
    m.pendingReward = true;
    // Pass alignment: every full meter is also worth pass points
    // and counts as one Order-Board cycle (which gates the Elite
    // and Platinum pass tracks per FV3 grammar).
    addPassPoints(15);
    recordOrderCycle();
    spawnFreeRewardBox();
    sfx.achievement();
  }
}

/** Convert a "pending reward" into a free Surprise Box. We hook into
 *  the existing surprise-box queue so the player only ever has one
 *  reward modal — no separate Order Reward modal to maintain. */
function spawnFreeRewardBox(): void {
  if (!state.surpriseBox) return;
  // If a box is already pending the player can collect that first;
  // we leave the meter's pending flag set so the next free slot
  // triggers another. Most players will collect immediately.
  if (state.surpriseBox.pending) return;
  state.surpriseBox.pending = true;
  // Reward Boxes from filling the Order Board lean rare — that's
  // the gacha hook (variable ratio) that the research doc describes.
  const r = Math.random();
  state.surpriseBox.rarity = r < 0.55 ? 'common' : r < 0.9 ? 'rare' : 'epic';
  state.orderMeter!.pendingReward = false;
  toast('Order Board filled — a Reward Box appeared!', 'gold');
}

export function meterPercent(): number {
  initOrderMeter();
  const m = state.orderMeter!;
  return Math.max(0, Math.min(1, m.progress / m.threshold));
}
