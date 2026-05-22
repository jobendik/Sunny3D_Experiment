// =============================================================
//  STORAGE INTERRUPT  (FV3 cozy variant — no monetization)
//
//  When silo or barn hits 100% capacity, surface a soft modal
//  that nudges the player to upgrade *or* sell low-value items.
//  CrazyGames-safe: there is NO premium-currency shortcut. The
//  only two affordances are "Open Barn (sell)" and "Upgrade".
//
//  Modal is non-blocking and rate-limited: at most once per
//  30 in-game seconds, and never if dismissed during the same
//  over-cap streak.
// =============================================================

import { state } from '../state';
import { storageWarnLevel } from './storage';
import { nowSeconds } from '../utils';

export interface StorageInterruptRoot {
  /** Timestamp when the player last dismissed an over-cap warning.
   *  We don't re-show until the player goes back under cap and
   *  rises over it again. */
  dismissedAt: number;
  /** Last warn level we saw — used to detect rising-edge transitions. */
  lastWarn: 0 | 1 | 2;
  /** Throttle: earliest re-show timestamp. */
  nextShowAt: number;
}

declare module '../types' {
  interface GameState {
    storageInterrupt?: StorageInterruptRoot;
  }
}

const COOLDOWN_S = 30;

export function initStorageInterrupt(): void {
  if (!state.storageInterrupt) {
    state.storageInterrupt = { dismissedAt: 0, lastWarn: 0, nextShowAt: 0 };
  }
}

/** Returns true if the interrupt should be presented right now.
 *  Rising-edge logic: only fires when warn level crosses from <2 → 2. */
export function shouldShowStorageInterrupt(): boolean {
  initStorageInterrupt();
  const root = state.storageInterrupt!;
  const lvl = storageWarnLevel();
  const now = nowSeconds();
  const wasOver = root.lastWarn === 2;
  root.lastWarn = lvl;
  if (lvl !== 2) return false;
  if (wasOver) return false;     // still in the same over-cap streak
  if (now < root.nextShowAt) return false;
  return true;
}

export function markStorageInterruptShown(): void {
  initStorageInterrupt();
  state.storageInterrupt!.nextShowAt = nowSeconds() + COOLDOWN_S;
}

export function markStorageInterruptDismissed(): void {
  initStorageInterrupt();
  state.storageInterrupt!.dismissedAt = nowSeconds();
  state.storageInterrupt!.nextShowAt = nowSeconds() + COOLDOWN_S;
}
