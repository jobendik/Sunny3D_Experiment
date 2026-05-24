// =============================================================
//  IMPERFECT PRODUCE — Phase 10.1 (Real-World CSR)
//
//  A recurring weekly campaign window during which a slice of
//  harvested crops are flagged as "imperfect". Selling imperfect
//  units through the Shop pays a +25% sell bonus, mirroring real
//  food-waste campaigns (FV3 Green Game Jam grammar).
//
//  Cosmetic + gameplay only — no real-money path, no telemetry
//  outside the existing track() helper.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { rand } from '../utils';
import { track } from './telemetry';
import type { ImperfectProduceRoot } from '../types';

const UNLOCK_LEVEL = 3;
// Window cadence: 3-day campaign every 7 days. Day 1 begins on the
// first save's day index aligned to a weekly cycle so the campaign
// returns predictably.
const WINDOW_LENGTH_DAYS = 3;
const WINDOW_EVERY_DAYS = 7;
// Probability a harvested unit becomes imperfect during a window.
const IMPERFECT_RATE = 0.22;
// Sell bonus for imperfect units. The brief calls for +25%.
const IMPERFECT_SELL_BONUS = 0.25;
// Item categories we apply the campaign to: raw crops only. Animal
// goods, fish, and crafted items keep their normal value so the
// campaign doesn't unbalance production chains.
const ELIGIBLE_HINT = new Set([
  'wheat', 'corn', 'carrot', 'tomato', 'pumpkin', 'strawberry',
  'sugarcane', 'lavender', 'blueberry', 'apple', 'pear', 'cabbage',
  'potato', 'soy', 'cotton', 'rice', 'chili', 'grape',
]);

function isEligibleItem(itemKey: string): boolean {
  if (ELIGIBLE_HINT.has(itemKey)) return true;
  // Fallback: low-tier items by ItemDef level look crop-ish; gate by
  // existence so a future crop key still counts without code changes.
  const def = ITEMS[itemKey];
  return !!def && def.level <= 12 && itemKey !== 'feed' && itemKey !== 'coin' && itemKey !== 'xp';
}

function windowStartFor(day: number): number {
  // First window begins the first time the player rolls into day ≥ 4
  // (after the early tutorial beats). After that it recurs every 7
  // days based on the same anchor.
  if (day < 4) return 4;
  const offset = (day - 4) % WINDOW_EVERY_DAYS;
  return day - offset;
}

export function initImperfectProduce(): void {
  if (!state.imperfectProduce) {
    const start = windowStartFor(state.day);
    state.imperfectProduce = {
      unlocked: state.level >= UNLOCK_LEVEL,
      windowStartDay: start,
      windowEndsDay: start + WINDOW_LENGTH_DAYS,
      nextWindowDay: start + WINDOW_EVERY_DAYS,
      imperfectByItem: {},
      totalImperfectFlagged: 0,
      totalImperfectSold: 0,
      totalBonusEarned: 0,
      lifetimeImperfect: 0,
      lastShownStartDay: 0,
    };
  } else if (!state.imperfectProduce.imperfectByItem) {
    state.imperfectProduce.imperfectByItem = {};
  }
  if (state.level >= UNLOCK_LEVEL && !state.imperfectProduce.unlocked) {
    state.imperfectProduce.unlocked = true;
  }
}

/** Day-rollover hook: re-evaluate window state. */
export function rolloverImperfectProduce(): void {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (!root.unlocked && state.level >= UNLOCK_LEVEL) root.unlocked = true;
  if (!root.unlocked) return;
  if (state.day >= root.nextWindowDay) {
    root.windowStartDay = root.nextWindowDay;
    root.windowEndsDay = root.windowStartDay + WINDOW_LENGTH_DAYS;
    root.nextWindowDay = root.windowStartDay + WINDOW_EVERY_DAYS;
    track('imperfect_produce_window_start', { day: state.day });
  }
}

export function imperfectProduceActive(): boolean {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (!root.unlocked) return false;
  return state.day >= root.windowStartDay && state.day < root.windowEndsDay;
}

export function imperfectProduceDaysLeft(): number {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (!imperfectProduceActive()) return 0;
  return Math.max(0, root.windowEndsDay - state.day);
}

export function imperfectProduceNextStartIn(): number {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (imperfectProduceActive()) return 0;
  return Math.max(0, root.nextWindowDay - state.day);
}

/**
 * Called from the harvest path. Flags a fraction of the harvested
 * yield as imperfect, scoped to the matching item key. Safe to call
 * with any item — non-eligible keys are ignored.
 */
export function maybeFlagImperfectHarvest(itemKey: string, qty: number): number {
  if (qty <= 0) return 0;
  if (!imperfectProduceActive()) return 0;
  if (!isEligibleItem(itemKey)) return 0;
  let flagged = 0;
  for (let i = 0; i < qty; i++) {
    if (rand(1) < IMPERFECT_RATE) flagged += 1;
  }
  if (flagged === 0) return 0;
  const root = state.imperfectProduce!;
  root.imperfectByItem[itemKey] = (root.imperfectByItem[itemKey] ?? 0) + flagged;
  root.totalImperfectFlagged += flagged;
  root.lifetimeImperfect += flagged;
  return flagged;
}

/**
 * Pull up to `qty` imperfect units for sale at the Shop. Returns
 * the number actually consumed (may be less than qty). Always run
 * BEFORE deducting the inventory so the cap stays honest.
 */
export function consumeImperfectForSale(itemKey: string, qty: number): number {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  const have = root.imperfectByItem[itemKey] ?? 0;
  const take = Math.min(have, qty);
  if (take <= 0) return 0;
  root.imperfectByItem[itemKey] = have - take;
  if (root.imperfectByItem[itemKey] === 0) delete root.imperfectByItem[itemKey];
  root.totalImperfectSold += take;
  return take;
}

export function imperfectSellBonusPct(): number {
  return IMPERFECT_SELL_BONUS;
}

export function recordImperfectBonus(coins: number): void {
  if (coins <= 0) return;
  initImperfectProduce();
  state.imperfectProduce!.totalBonusEarned += coins;
}

/** Count of imperfect units currently waiting in the barn. */
export function imperfectImperfectCount(itemKey?: string): number {
  initImperfectProduce();
  const map = state.imperfectProduce!.imperfectByItem;
  if (itemKey) return map[itemKey] ?? 0;
  let total = 0;
  for (const k in map) total += map[k]!;
  return total;
}

/** True if the player hasn't seen this window's intro/badge yet. */
export function imperfectProduceHasAttention(): boolean {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (!imperfectProduceActive()) return false;
  return root.lastShownStartDay !== root.windowStartDay;
}

export function markImperfectProduceSeen(): void {
  initImperfectProduce();
  const root = state.imperfectProduce!;
  if (imperfectProduceActive()) root.lastShownStartDay = root.windowStartDay;
}

export const IMPERFECT_PRODUCE_LEVEL = UNLOCK_LEVEL;
export const IMPERFECT_PRODUCE_NAME = 'Imperfect Hero Week';
