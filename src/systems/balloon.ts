// =============================================================
//  HOT AIR BALLOON — Phase 4 of the roadmap. Rare, premium
//  short-window delivery. Pops in occasionally, asks for 1-3
//  high-value items, leaves in 45-90 minutes if not served.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds, rand } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { recordEventAction } from './live-events';
import type { BalloonRequest, BalloonRoot, MaterialKey } from '../types';

const UNLOCK_LEVEL = 10;
const NEXT_BALLOON_MIN = 60 * 60 * 6;   // 6h
const NEXT_BALLOON_RAND = 60 * 60 * 4;  // +0..4h
const STAY_MIN_S = 60 * 45;             // 45m
const STAY_RAND_S = 60 * 45;            // +0..45m

const PREMIUM_ITEMS = [
  'cake', 'pie', 'ribs', 'cloth', 'perfume', 'honey', 'candle', 'smoothie', 'jam',
];

const BONUS_MATERIALS: MaterialKey[] = ['paint', 'hinge', 'tarp', 'deed', 'map'];

export function initBalloon(): void {
  if (!state.balloon) {
    state.balloon = {
      active: false,
      leavesAt: 0,
      nextAt: nowSeconds() + NEXT_BALLOON_MIN + rand(NEXT_BALLOON_RAND),
      requests: [],
      rewardCoins: 0,
      rewardFragments: 0,
    };
  }
}

function makeBalloon(): void {
  const b = state.balloon!;
  const eligible = PREMIUM_ITEMS.filter(k => ITEMS[k]!.level <= state.level);
  if (eligible.length === 0) return;
  const count = 1 + randi(2); // 1-2 items
  const seen = new Set<string>();
  const reqs: BalloonRequest[] = [];
  for (let i = 0; i < count; i++) {
    let k = choice(eligible);
    let tries = 0;
    while (seen.has(k) && tries < 4) { k = choice(eligible); tries++; }
    seen.add(k);
    reqs.push({ itemKey: k, qty: 1 + randi(2) });
  }
  const value = reqs.reduce((s, r) => s + (ITEMS[r.itemKey]?.sell ?? 0) * r.qty, 0);
  b.active = true;
  b.leavesAt = nowSeconds() + STAY_MIN_S + rand(STAY_RAND_S);
  b.requests = reqs;
  b.rewardCoins = Math.floor(value * 2.2);
  b.rewardMaterial = Math.random() < 0.6 ? choice(BONUS_MATERIALS) : undefined;
  b.rewardFragments = 1 + randi(2);
  track('balloon_arrived', { items: reqs.length, value });
  toast(`🎈 A Hot Air Balloon has appeared! Premium deal — leaves soon.`, 'gold');
  sfx.bell();
}

export function tickBalloon(): void {
  initBalloon();
  const b = state.balloon!;
  if (state.level < UNLOCK_LEVEL) return;
  const now = nowSeconds();
  if (b.active) {
    if (now >= b.leavesAt) {
      // Time's up.
      b.active = false;
      b.nextAt = now + NEXT_BALLOON_MIN + rand(NEXT_BALLOON_RAND);
      b.requests = [];
      track('balloon_left_empty');
      toast('🎈 The balloon drifted away — better luck next time.');
    }
  } else if (now >= b.nextAt) {
    makeBalloon();
  }
}

export function balloonLeavesInS(): number {
  initBalloon();
  const b = state.balloon!;
  if (!b.active) return 0;
  return Math.max(0, b.leavesAt - nowSeconds());
}

export function balloonNextInS(): number {
  initBalloon();
  const b = state.balloon!;
  if (b.active) return 0;
  return Math.max(0, b.nextAt - nowSeconds());
}

/** Returns true if all requests can be satisfied. */
export function canServeBalloon(): boolean {
  const b = state.balloon;
  if (!b || !b.active) return false;
  for (const r of b.requests) {
    if ((state.inv[r.itemKey] ?? 0) < r.qty) return false;
  }
  return true;
}

/** Serve the balloon (delivery). */
export function serveBalloon(): boolean {
  const b = state.balloon;
  if (!b || !b.active) return false;
  if (!canServeBalloon()) {
    sfx.error();
    toast('You don\'t have everything yet.');
    return false;
  }
  for (const r of b.requests) removeItem(r.itemKey, r.qty);
  state.coins += b.rewardCoins;
  state.stats.earned += b.rewardCoins;
  const xp = Math.max(10, Math.floor(b.rewardCoins / 12));
  addXP(xp);
  if (b.rewardMaterial) addItem(b.rewardMaterial, 1);
  if (b.rewardFragments > 0) addItem('fragment', b.rewardFragments);
  sfx.coin();
  track('balloon_served', { reward: b.rewardCoins });
  recordEventAction('balloon_served', undefined, 1);
  toast(
    `🎈 Sky Chef paid ${b.rewardCoins}💰 + ${b.rewardFragments} fragments${
      b.rewardMaterial ? ` + 1 ${ITEMS[b.rewardMaterial]?.name}` : ''
    }!`,
    'gold',
  );
  b.active = false;
  b.nextAt = nowSeconds() + NEXT_BALLOON_MIN + rand(NEXT_BALLOON_RAND);
  b.requests = [];
  updateHUD();
  return true;
}
