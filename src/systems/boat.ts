// =============================================================
//  BOAT DELIVERIES — Phase 4 of the roadmap. A medium-term
//  multi-crate order that arrives at the dock and leaves after a
//  long countdown. Fully completing it grants a bonus material.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addXP } from './xp';
import { removeItem } from './inventory';
import { addItem } from './inventory';
import { track } from './telemetry';
import { randi, choice, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { spawnHUDBurst } from './flyers';
import { recordVillageEngagement } from './village';
import { piggyOnBigDelivery } from './piggy-bank';
import type { BoatRoot, BoatCrate, MaterialKey } from '../types';

const BOAT_NAMES = [
  'Harvest Moon',
  'Misty River',
  'Sunny Wave',
  'Pumpkin Drift',
  'Sea Lark',
  'Bramble Belle',
  'Wheat Wind',
];

const BONUS_MATERIALS: MaterialKey[] = ['plank', 'screw', 'paint', 'panel', 'tarp', 'deed', 'map', 'mallet'];

const UNLOCK_LEVEL = 9;

// Boat stays docked for 8 in-game hours (~ real-time minutes given the
// short DAY_SECONDS, so use real wall seconds for the visible timer).
const DOCK_DURATION_S = 60 * 60 * 8;     // 8 hours wall clock
const ARRIVAL_DELAY_S = 60 * 30;         // ~30 min between boats

export function initBoat(): void {
  if (!state.boat) {
    state.boat = {
      unlocked: false,
      arrivesAt: 0,
      departsAt: 0,
      crates: [],
      boatName: choice(BOAT_NAMES),
      state: 'arriving',
    };
  }
  if (!state.boat.unlocked && state.level >= UNLOCK_LEVEL) {
    state.boat.unlocked = true;
    state.boat.arrivesAt = nowSeconds() + 90; // first boat within 90s of unlock
    state.boat.state = 'arriving';
    track('boat_unlocked');
    toast('⛵ The river dock is open! Boats will start arriving with crates to fill.', 'gold');
  }
}

function makeBoat(): BoatRoot {
  const now = nowSeconds();
  const eligible = Object.keys(ITEMS)
    .filter(k => ITEMS[k]!.level <= state.level && k !== 'feed' && k !== 'coin' && k !== 'xp')
    // Exclude raw materials (tools/upgrade items) from boat requests — those are rewards, not requests.
    .filter(k => !['plank', 'nail', 'screw', 'hinge', 'paint', 'panel', 'bolt', 'rope', 'tarp', 'deed', 'stake', 'map', 'mallet'].includes(k));
  const count = 4 + randi(3); // 4-6 crates
  const crates: BoatCrate[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    let itemKey = choice(eligible);
    let tries = 0;
    while (seen.has(itemKey) && tries < 5) {
      itemKey = choice(eligible);
      tries++;
    }
    seen.add(itemKey);
    const need = 2 + randi(5); // 2-6 needed
    crates.push({ itemKey, needed: need, filled: 0 });
  }
  return {
    unlocked: true,
    boatName: choice(BOAT_NAMES),
    arrivesAt: now,
    departsAt: now + DOCK_DURATION_S,
    crates,
    bonusMaterial: choice(BONUS_MATERIALS),
    state: 'docked',
  };
}

export function tickBoat(): void {
  initBoat();
  const b = state.boat!;
  if (!b.unlocked) return;
  const now = nowSeconds();

  if (b.state === 'arriving' && now >= b.arrivesAt) {
    // Boat arrives — generate crates.
    Object.assign(b, makeBoat());
    track('boat_arrived', { name: b.boatName, crates: b.crates.length });
    toast(`⛵ The boat "${b.boatName}" has docked! ${b.crates.length} crates need filling.`);
    // Fires only when the tab is hidden — foreground players already
    // saw the toast.
    void import('./notifications').then(m =>
      m.notifyEvent('boat-arrived', '⛵ Boat docked', `${b.boatName} needs ${b.crates.length} crates filled.`)
    );
  } else if (b.state === 'docked' && now >= b.departsAt) {
    // Boat departs — even if partially full. Reward proportional to filled crates.
    departBoat(false);
  } else if (b.state === 'departed' && now >= b.arrivesAt) {
    // Time to send next boat (after arrival delay).
    Object.assign(b, makeBoat());
    track('boat_arrived', { name: b.boatName, crates: b.crates.length });
    void import('./notifications').then(m =>
      m.notifyEvent('boat-arrived', '⛵ Boat docked', `${b.boatName} needs ${b.crates.length} crates filled.`)
    );
  }
}

export function isBoatDocked(): boolean {
  initBoat();
  return state.boat!.unlocked && state.boat!.state === 'docked';
}

/** Fill one or more units into a crate by index. Removes from inventory. */
export function fillBoatCrate(crateIdx: number, qty = 1): boolean {
  const b = state.boat;
  if (!b || b.state !== 'docked') return false;
  const crate = b.crates[crateIdx];
  if (!crate) return false;
  if (crate.filled >= crate.needed) return false;
  if ((state.inv[crate.itemKey] ?? 0) < qty) {
    sfx.error();
    toast('Not enough in your inventory.');
    return false;
  }
  const room = crate.needed - crate.filled;
  const give = Math.min(qty, room);
  if (!removeItem(crate.itemKey, give)) return false;
  crate.filled += give;
  track('boat_crate_filled', { item: crate.itemKey, qty: give });
  sfx.order();
  if (b.crates.every(c => c.filled >= c.needed)) {
    // All crates done — auto-depart with full reward.
    departBoat(true);
  }
  return true;
}

/** Fill a crate maximally with one tap. */
export function fillBoatCrateMax(crateIdx: number): boolean {
  const b = state.boat;
  if (!b || b.state !== 'docked') return false;
  const crate = b.crates[crateIdx];
  if (!crate) return false;
  const room = crate.needed - crate.filled;
  if (room <= 0) return false;
  const have = state.inv[crate.itemKey] ?? 0;
  const give = Math.min(room, have);
  if (give <= 0) {
    sfx.error();
    toast('Not enough in your inventory.');
    return false;
  }
  return fillBoatCrate(crateIdx, give);
}

function departBoat(fullCompletion: boolean): void {
  const b = state.boat!;
  if (b.state !== 'docked') return;
  let totalCoins = 0;
  let totalXp = 0;
  // Per-unit reward: ~1.4x sell value of crate items.
  for (const c of b.crates) {
    const sell = ITEMS[c.itemKey]?.sell ?? 0;
    totalCoins += Math.floor(sell * 1.4 * c.filled);
    totalXp += Math.max(1, Math.floor(sell * c.filled / 12));
  }
  if (fullCompletion) {
    totalCoins = Math.floor(totalCoins * 1.5); // 50% completion bonus
    totalXp = Math.floor(totalXp * 1.5);
    if (b.bonusMaterial) addItem(b.bonusMaterial, 1);
  }
  state.coins += totalCoins;
  state.stats.earned += totalCoins;
  addXP(totalXp);
  spawnHUDBurst('coin', Math.min(10, 4 + Math.floor(totalCoins / 80)));
  track('boat_departed', { name: b.boatName, full: fullCompletion, coins: totalCoins });
  if (fullCompletion) {
    toast(`⛵ "${b.boatName}" departed FULL! +${totalCoins}💰 +${totalXp} XP + 1 ${ITEMS[b.bonusMaterial ?? '']?.name ?? 'bonus material'}`, 'gold');
    recordVillageEngagement('boat_full');
    piggyOnBigDelivery();
  } else if (totalCoins > 0) {
    toast(`⛵ "${b.boatName}" departed. +${totalCoins}💰 +${totalXp} XP`, 'gold');
  } else {
    toast(`⛵ "${b.boatName}" left empty. Try to fill more next time.`);
  }
  // Schedule next boat.
  b.state = 'departed';
  b.crates = [];
  b.arrivesAt = nowSeconds() + ARRIVAL_DELAY_S;
  b.departsAt = 0;
  updateHUD();
}

/** Spend diamonds to instantly summon the next boat (Hay Day-style friction shortcut). */
export const BOAT_INSTANT_COST = 6;
export function instantSummonBoat(): boolean {
  initBoat();
  const b = state.boat;
  if (!b || !b.unlocked) return false;
  if (b.state !== 'departed' && b.state !== 'arriving') {
    toast('A boat is already at the dock.');
    return false;
  }
  if (state.gems < BOAT_INSTANT_COST) {
    sfx.cantAfford();
    toast(`Need ${BOAT_INSTANT_COST} 💎`);
    return false;
  }
  state.gems -= BOAT_INSTANT_COST;
  b.arrivesAt = nowSeconds() - 1;
  tickBoat();
  sfx.bell();
  updateHUD();
  track('boat_instant_summon', { cost: BOAT_INSTANT_COST });
  return true;
}

export function boatStatusLabel(): string {
  const b = state.boat;
  if (!b || !b.unlocked) return 'Locked';
  const now = nowSeconds();
  if (b.state === 'docked') {
    const left = Math.max(0, b.departsAt - now);
    return `Docked — leaves in ${formatHMS(left)}`;
  }
  if (b.state === 'departed' || b.state === 'arriving') {
    const left = Math.max(0, b.arrivesAt - now);
    return `Next boat in ${formatHMS(left)}`;
  }
  return 'At sea';
}

function formatHMS(s: number): string {
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
