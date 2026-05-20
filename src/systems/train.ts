// =============================================================
//  TRAIN DELIVERIES — Phase 4 of the roadmap. Long-cycle cargo
//  loop. Player loads crates, sends the train, then waits several
//  hours for it to return with rare upgrade materials.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { track } from './telemetry';
import { choice, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { addXP } from './xp';
import type { MaterialKey } from '../types';

const UNLOCK_LEVEL = 13;

// Possible material returns weighted by station level.
const MATERIAL_POOL: ReadonlyArray<{ key: MaterialKey; weight: number }> = [
  { key: 'plank',  weight: 25 },
  { key: 'nail',   weight: 25 },
  { key: 'screw',  weight: 18 },
  { key: 'hinge',  weight: 10 },
  { key: 'paint',  weight: 6 },
  { key: 'panel',  weight: 25 },
  { key: 'bolt',   weight: 18 },
  { key: 'rope',   weight: 15 },
  { key: 'tarp',   weight: 8 },
  { key: 'stake',  weight: 6 },
  { key: 'mallet', weight: 4 },
  { key: 'map',    weight: 3 },
  { key: 'deed',   weight: 1 },
];

const ROUTES = ['Sunny Valley', 'Cliffside', 'Pinewood', 'Salt Marsh', 'Lake Bend'];

// Wall-clock duration of a trip.
const TRIP_DURATION_S = 60 * 60 * 6; // 6 hours

export function initTrain(): void {
  if (!state.train) {
    state.train = {
      unlocked: false,
      status: 'idle',
      returnsAt: 0,
      loadedCrates: [],
      pendingRewards: {},
      routeId: choice(ROUTES),
      level: 1,
    };
  }
  if (!state.train.unlocked && state.level >= UNLOCK_LEVEL) {
    state.train.unlocked = true;
    track('train_unlocked');
    toast('🚂 The train station is open! Load crates of goods to receive rare materials.', 'gold');
  }
}

export function trainCrateSlots(): number {
  return 3 + Math.min(2, Math.floor((state.train?.level ?? 1) / 2));
}

export function loadTrainCrate(itemKey: string, qty: number): boolean {
  initTrain();
  const t = state.train!;
  if (!t.unlocked) return false;
  if (t.status !== 'idle') return false;
  if (t.loadedCrates.length >= trainCrateSlots()) return false;
  if ((state.inv[itemKey] ?? 0) < qty) {
    sfx.error();
    toast('Not enough in your inventory.');
    return false;
  }
  if (!removeItem(itemKey, qty)) return false;
  t.loadedCrates.push({ itemKey, qty });
  sfx.order();
  return true;
}

export function unloadTrainCrate(idx: number): void {
  const t = state.train;
  if (!t || t.status !== 'idle') return;
  const c = t.loadedCrates[idx];
  if (!c) return;
  addItem(c.itemKey, c.qty);
  t.loadedCrates.splice(idx, 1);
}

export function sendTrain(): boolean {
  initTrain();
  const t = state.train!;
  if (!t.unlocked) return false;
  if (t.status !== 'idle') return false;
  if (t.loadedCrates.length === 0) {
    toast('Load at least one crate first.');
    return false;
  }
  // Compute total goods value — better cargo => better material odds.
  const totalValue = t.loadedCrates.reduce((sum, c) => sum + (ITEMS[c.itemKey]?.sell ?? 0) * c.qty, 0);
  // Determine pending rewards: 1 material per crate + bonus chance based on value.
  const rewards: Record<string, number> = {};
  const matCount = t.loadedCrates.length + (totalValue >= 600 ? 1 : 0) + (totalValue >= 1500 ? 1 : 0);
  for (let i = 0; i < matCount; i++) {
    const mat = weightedPick(MATERIAL_POOL);
    rewards[mat] = (rewards[mat] ?? 0) + 1;
  }
  // Add coin and XP.
  rewards['__coins'] = Math.floor(totalValue * 0.5);
  rewards['__xp'] = Math.max(5, Math.floor(totalValue / 18));
  t.pendingRewards = rewards;
  t.status = 'away';
  t.returnsAt = nowSeconds() + TRIP_DURATION_S - (t.level - 1) * 1200; // -20m per station level
  t.loadedCrates = [];
  t.routeId = choice(ROUTES);
  track('train_sent', { route: t.routeId, value: totalValue });
  toast(`🚂 Train heading to ${t.routeId}. Returns in ${formatHM(t.returnsAt - nowSeconds())}.`);
  return true;
}

function weightedPick(pool: ReadonlyArray<{ key: MaterialKey; weight: number }>): string {
  const total = pool.reduce((a, p) => a + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p.key;
  }
  return pool[0]!.key;
}

export function tickTrain(): void {
  initTrain();
  const t = state.train!;
  if (!t.unlocked) return;
  const now = nowSeconds();
  if (t.status === 'away' && now >= t.returnsAt) {
    t.status = 'returned';
    track('train_returned', { route: t.routeId });
  }
}

export function collectTrainReturn(): boolean {
  const t = state.train;
  if (!t || t.status !== 'returned') return false;
  let summary: string[] = [];
  for (const k in t.pendingRewards) {
    const n = t.pendingRewards[k]!;
    if (k === '__coins') {
      state.coins += n;
      state.stats.earned += n;
      summary.push(`${n}💰`);
    } else if (k === '__xp') {
      addXP(n);
    } else {
      addItem(k, n);
      summary.push(`${n}× ${ITEMS[k]?.name ?? k}`);
    }
  }
  t.pendingRewards = {};
  t.status = 'idle';
  sfx.coin();
  toast(`🚂 The train returned from ${t.routeId}! ${summary.join(', ')}`, 'gold');
  return true;
}

export function upgradeTrainStation(): boolean {
  const t = state.train;
  if (!t) return false;
  if (t.level >= 5) return false;
  const cost = 800 + t.level * 600;
  const matNeed = 2 + t.level;
  if (state.coins < cost) {
    sfx.cantAfford();
    toast(`Need ${cost}💰 to upgrade the station.`);
    return false;
  }
  if ((state.inv['plank'] ?? 0) < matNeed) {
    toast(`Need ${matNeed}× Plank to upgrade.`);
    return false;
  }
  state.coins -= cost;
  removeItem('plank', matNeed);
  t.level += 1;
  toast(`🚂 Train station upgraded to Lv ${t.level}! Faster trips, more crate slots.`, 'gold');
  return true;
}

function formatHM(s: number): string {
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function trainStatusLabel(): string {
  const t = state.train;
  if (!t || !t.unlocked) return 'Locked';
  switch (t.status) {
    case 'idle':     return 'Ready to load';
    case 'loaded':   return 'Loaded';
    case 'away':     return `Away — back in ${formatHM(Math.max(0, t.returnsAt - nowSeconds()))}`;
    case 'returned': return '🎉 Returned — collect rewards!';
  }
}
