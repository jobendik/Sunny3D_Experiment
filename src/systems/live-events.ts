// =============================================================
//  LIVE EVENTS — Phase 14 of the roadmap. A data-driven event
//  framework. One event is active at a time. Each event defines
//  point rules (which player actions earn how many points) and
//  a reward ladder. Players also collect Festival Tokens which
//  they can spend at the Event Shop.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { randi, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { recordFeaturedEventAction } from './featured-events';
import type { LiveEventRoot, MaterialKey } from '../types';

export interface PointRule {
  actionId: string;
  itemKey?: string;
  points: number;
}

export interface RewardTier {
  pts: number;
  coins: number;
  xp: number;
  material?: MaterialKey;
  tokens: number;
  label: string;
}

export interface LiveEventDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  pointRules: PointRule[];
  rewards: RewardTier[];
  durationMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const LIVE_EVENTS: Record<string, LiveEventDef> = {
  baking_bonanza: {
    id: 'baking_bonanza', name: 'Baking Bonanza', emoji: '🥐',
    blurb: 'Bake all week and you\'ll be rewarded.',
    pointRules: [
      { actionId: 'produce', itemKey: 'bread',  points: 1 },
      { actionId: 'produce', itemKey: 'cookie', points: 3 },
      { actionId: 'produce', itemKey: 'cake',   points: 5 },
      { actionId: 'produce', itemKey: 'pie',    points: 6 },
      { actionId: 'order_contains', itemKey: 'bread', points: 4 },
    ],
    rewards: [
      { pts: 25,  coins: 150,  xp: 30, tokens: 5,   material: 'plank', label: 'First Loaf' },
      { pts: 75,  coins: 400,  xp: 60, tokens: 12,  material: 'screw', label: 'Master Baker' },
      { pts: 150, coins: 900,  xp: 120, tokens: 25, material: 'paint', label: 'Bonanza King' },
    ],
    durationMs: 4 * DAY_MS,
  },
  fishing_festival: {
    id: 'fishing_festival', name: 'Fishing Festival', emoji: '🎣',
    blurb: 'Cast lines, fill creels, earn fragments.',
    pointRules: [
      { actionId: 'fish_caught',  points: 4 },
      { actionId: 'sell',         itemKey: 'bluefish', points: 1 },
      { actionId: 'sell',         itemKey: 'trout',    points: 2 },
      { actionId: 'sell',         itemKey: 'goldfish', points: 4 },
    ],
    rewards: [
      { pts: 20,  coins: 120,  xp: 25, tokens: 5,   material: 'rope',  label: 'First Catch' },
      { pts: 60,  coins: 300,  xp: 50, tokens: 12,  material: 'tarp',  label: 'Lake Master' },
      { pts: 120, coins: 700,  xp: 110, tokens: 25, material: 'panel', label: 'Festival Star' },
    ],
    durationMs: 4 * DAY_MS,
  },
  orchard_week: {
    id: 'orchard_week', name: 'Orchard Week', emoji: '🍎',
    blurb: 'Pick fruit, press juice, bake pies.',
    pointRules: [
      { actionId: 'tree_harvest', points: 2 },
      { actionId: 'produce', itemKey: 'juice', points: 3 },
      { actionId: 'produce', itemKey: 'jam',   points: 4 },
      { actionId: 'produce', itemKey: 'pie',   points: 5 },
    ],
    rewards: [
      { pts: 25,  coins: 150,  xp: 30, tokens: 5,   material: 'nail', label: 'Orchard Sprout' },
      { pts: 80,  coins: 500,  xp: 70, tokens: 15,  material: 'hinge', label: 'Pie Master' },
      { pts: 160, coins: 1000, xp: 130, tokens: 30, material: 'paint', label: 'Orchard Queen' },
    ],
    durationMs: 4 * DAY_MS,
  },
  ranchers_week: {
    id: 'ranchers_week', name: 'Ranchers Week', emoji: '🐮',
    blurb: 'Collect animal products and feed the village.',
    pointRules: [
      { actionId: 'animal_produce', points: 2 },
      { actionId: 'produce', itemKey: 'butter', points: 3 },
      { actionId: 'produce', itemKey: 'cheese', points: 3 },
      { actionId: 'produce', itemKey: 'yogurt', points: 3 },
    ],
    rewards: [
      { pts: 30,  coins: 180,  xp: 35, tokens: 6,   material: 'bolt', label: 'Calf Friend' },
      { pts: 80,  coins: 480,  xp: 65, tokens: 14,  material: 'rope', label: 'Pasture Pro' },
      { pts: 150, coins: 950,  xp: 120, tokens: 25, material: 'paint', label: 'Rancher King' },
    ],
    durationMs: 4 * DAY_MS,
  },
  weather_festival: {
    id: 'weather_festival', name: 'Weather Festival', emoji: '🌦️',
    blurb: 'Cast cards, master the sky, earn fragments.',
    pointRules: [
      { actionId: 'card_cast',   points: 8 },
      { actionId: 'harvest',     points: 1 },
    ],
    rewards: [
      { pts: 30,  coins: 120,  xp: 20, tokens: 5,   material: 'stake', label: 'Sky Watcher' },
      { pts: 80,  coins: 380,  xp: 50, tokens: 14,  material: 'tarp',  label: 'Storm Caller' },
      { pts: 150, coins: 800,  xp: 100, tokens: 25, material: 'mallet', label: 'Weather Mage' },
    ],
    durationMs: 4 * DAY_MS,
  },
};
const EVENT_IDS = Object.keys(LIVE_EVENTS);

export function initLiveEvent(): void {
  if (!state.liveEvent) {
    state.liveEvent = {
      activeId: null,
      weekIndex: 0,
      points: 0,
      rewardsClaimed: [],
      tokens: 0,
      history: [],
    };
  }
}

function weekId(now = Date.now()): number {
  return Math.floor(now / (4 * DAY_MS));
}

/** Tick: rotate event if no active one, or after duration. */
export function tickLiveEvent(): void {
  initLiveEvent();
  const e = state.liveEvent!;
  const w = weekId();
  if (!e.activeId || e.weekIndex !== w) {
    rotateEvent(w);
  }
}

function rotateEvent(toWeek: number): void {
  const e = state.liveEvent!;
  // Pick next event id (avoid immediate repeat).
  const candidates = EVENT_IDS.filter(id => id !== e.activeId);
  const pickFrom = candidates.length > 0 ? candidates : EVENT_IDS;
  const id = pickFrom[randi(pickFrom.length)]!;
  if (e.activeId && e.activeId !== id) e.history.push(e.activeId);
  e.activeId = id;
  e.weekIndex = toWeek;
  e.points = 0;
  e.rewardsClaimed = [];
  const def = LIVE_EVENTS[id]!;
  track('live_event_started', { id });
  toast(`${def.emoji} ${def.name} is on this week — ${def.blurb}`, 'gold');
}

export function currentLiveEvent(): LiveEventDef | null {
  initLiveEvent();
  const id = state.liveEvent!.activeId;
  return id ? LIVE_EVENTS[id] ?? null : null;
}

/** Hook called from various systems to award points if matching. */
export function recordEventAction(actionId: string, itemKey?: string, qty = 1): void {
  recordFeaturedEventAction(actionId, itemKey, qty);
  initLiveEvent();
  const def = currentLiveEvent();
  if (!def) return;
  let pts = 0;
  for (const r of def.pointRules) {
    if (r.actionId !== actionId) continue;
    if (r.itemKey && r.itemKey !== itemKey) continue;
    pts += r.points * qty;
  }
  if (pts <= 0) return;
  const e = state.liveEvent!;
  e.points += pts;
  track('live_event_points', { pts, actionId });
  // Check tier claims.
  for (let i = 0; i < def.rewards.length; i++) {
    if (e.rewardsClaimed.includes(i)) continue;
    if (e.points >= def.rewards[i]!.pts) {
      claimRewardTier(i);
    }
  }
}

function claimRewardTier(idx: number): void {
  const e = state.liveEvent!;
  const def = currentLiveEvent(); if (!def) return;
  const t = def.rewards[idx]; if (!t) return;
  e.rewardsClaimed.push(idx);
  state.coins += t.coins;
  state.stats.earned += t.coins;
  addXP(t.xp);
  e.tokens += t.tokens;
  addItem('token', t.tokens);
  if (t.material) addItem(t.material, 1);
  sfx.bell(); sfx.coin();
  toast(`${def.emoji} ${t.label}: +${t.coins}💰 +${t.tokens} tokens${t.material ? ` + 1 ${ITEMS[t.material]?.name}` : ''}!`, 'gold');
}

/** Get available event-shop items. */
export interface EventShopItem {
  itemKey: string;
  costTokens: number;
  qty: number;
}
export const EVENT_SHOP: EventShopItem[] = [
  { itemKey: 'fragment', costTokens: 4,  qty: 1 },
  { itemKey: 'paint',    costTokens: 12, qty: 1 },
  { itemKey: 'plank',    costTokens: 3,  qty: 1 },
  { itemKey: 'screw',    costTokens: 5,  qty: 1 },
  { itemKey: 'rope',     costTokens: 4,  qty: 1 },
  { itemKey: 'fertilizer', costTokens: 2, qty: 2 },
  { itemKey: 'speedup',  costTokens: 6,  qty: 1 },
  { itemKey: 'priority', costTokens: 10, qty: 1 },
];

export function buyEventShopItem(idx: number): boolean {
  initLiveEvent();
  const e = state.liveEvent!;
  const it = EVENT_SHOP[idx];
  if (!it) return false;
  if (e.tokens < it.costTokens) {
    sfx.cantAfford();
    toast(`Need ${it.costTokens} tokens — you have ${e.tokens}.`);
    return false;
  }
  if ((state.inv['token'] ?? 0) < it.costTokens) {
    // Tokens are also tracked as items — fall back to live-event total.
    // Sync up if mismatch (token items granted on deliver / event milestones).
    if (e.tokens >= it.costTokens) {
      // Allow purchase from event-stash even if item count is lower.
    } else {
      sfx.cantAfford();
      toast('Not enough Festival Tokens.');
      return false;
    }
  } else {
    removeItem('token', it.costTokens);
  }
  e.tokens -= it.costTokens;
  addItem(it.itemKey, it.qty);
  sfx.coin();
  toast(`Bought ${it.qty}× ${ITEMS[it.itemKey]?.name ?? it.itemKey} for ${it.costTokens} tokens`, 'gold');
  track('event_shop_buy', { item: it.itemKey, qty: it.qty });
  return true;
}

export function liveEventProgressPct(): number {
  const def = currentLiveEvent();
  const e = state.liveEvent;
  if (!def || !e) return 0;
  const max = def.rewards[def.rewards.length - 1]?.pts ?? 1;
  return Math.min(100, (e.points / max) * 100);
}
