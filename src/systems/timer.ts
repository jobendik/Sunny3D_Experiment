// =============================================================
//  TIMER UTILITIES  — canonical helpers for offline timer rebase.
//  All new systems (market stall, boat, train, neighbor help,
//  landmark stages, expedition refresh) use these so behavior is
//  consistent across reload and save/load.
// =============================================================

import { nowSeconds } from '../utils';

/** Returns true if a deadline timestamp has elapsed. */
export function isTimerComplete(endAt: number, now: number = nowSeconds()): boolean {
  return endAt <= now;
}

/** Remaining seconds until a deadline (clamped to >= 0). */
export function getRemainingSeconds(endAt: number, now: number = nowSeconds()): number {
  return Math.max(0, endAt - now);
}

/** Format a duration nicely: "3h 14m" / "12m" / "47s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Format a remaining countdown to a deadline. */
export function formatRemaining(endAt: number, now: number = nowSeconds()): string {
  return formatDuration(getRemainingSeconds(endAt, now));
}
