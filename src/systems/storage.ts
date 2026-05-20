// =============================================================
//  STORAGE  — Barn & Silo capacity (Phase 1 of the roadmap).
//
//  - Silo stores raw crops (wheat, corn, carrots, tomato, pumpkin,
//    strawberry, sugarcane, lavender, blueberry, apple, pear).
//  - Barn stores everything else (animal produce, processed goods,
//    fish, bait, catalysts, upgrade materials, tools).
//
//  Capacity is *not* a hard wall in Sunny Acres — staying cozy.
//  We surface warnings when over 85% full and over-capacity, but
//  actions still succeed. Upgrades expand the cap.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import type { MaterialKey } from '../types';
import { track } from './telemetry';
import { removeItem } from './inventory';
import { toast } from '../ui/toasts';

// Items routed to the Silo (raw agricultural goods).
const SILO_ITEMS = new Set<string>([
  'wheat', 'corn', 'carrot', 'tomato', 'pumpkin', 'strawberry',
  'sugarcane', 'lavender', 'blueberry', 'apple', 'pear',
]);

const BARN_MATERIALS = new Set<MaterialKey>([
  'plank', 'nail', 'screw', 'hinge', 'paint',
]);

const SILO_MATERIALS = new Set<MaterialKey>([
  'panel', 'bolt', 'rope', 'tarp',
]);

export function initStorage(): void {
  if (!state.storage) {
    state.storage = {
      barn: { level: 1, capacity: 60 },
      silo: { level: 1, capacity: 80 },
    };
  }
}

export function isSiloItem(itemKey: string): boolean {
  return SILO_ITEMS.has(itemKey);
}

export function siloUsage(): { used: number; cap: number } {
  initStorage();
  const cap = state.storage!.silo.capacity;
  let used = 0;
  for (const k in state.inv) {
    if (SILO_ITEMS.has(k)) used += state.inv[k]!;
  }
  return { used, cap };
}

export function barnUsage(): { used: number; cap: number } {
  initStorage();
  const cap = state.storage!.barn.capacity;
  let used = 0;
  for (const k in state.inv) {
    if (!SILO_ITEMS.has(k)) used += state.inv[k]!;
  }
  return { used, cap };
}

/** Returns warning level: 0=fine, 1=heads-up (>85%), 2=over capacity. */
export function storageWarnLevel(): 0 | 1 | 2 {
  const s = siloUsage();
  const b = barnUsage();
  const sp = s.used / Math.max(1, s.cap);
  const bp = b.used / Math.max(1, b.cap);
  const worst = Math.max(sp, bp);
  if (worst >= 1) return 2;
  if (worst >= 0.85) return 1;
  return 0;
}

// ---- Upgrade tables ----
// Each successive level needs slightly more materials. Coins scale.

interface UpgradeCost {
  coins: number;
  materials: Partial<Record<MaterialKey, number>>;
  capacityGain: number;
}

export function barnUpgradeCost(): UpgradeCost | null {
  initStorage();
  const lvl = state.storage!.barn.level;
  if (lvl >= 8) return null; // cap on upgrades for now
  const base = lvl;
  return {
    coins: 200 * lvl,
    materials: {
      plank: 1 + Math.floor(base / 2),
      nail: 2 + Math.floor(base / 2),
      ...(lvl >= 2 ? { screw: 1 + Math.floor(lvl / 3) } : {}),
      ...(lvl >= 3 ? { hinge: 1 } : {}),
      ...(lvl >= 4 ? { paint: 1 } : {}),
    },
    capacityGain: 30 + lvl * 10,
  };
}

export function siloUpgradeCost(): UpgradeCost | null {
  initStorage();
  const lvl = state.storage!.silo.level;
  if (lvl >= 8) return null;
  const base = lvl;
  return {
    coins: 200 * lvl,
    materials: {
      panel: 1 + Math.floor(base / 2),
      bolt: 2 + Math.floor(base / 2),
      ...(lvl >= 2 ? { rope: 1 + Math.floor(lvl / 3) } : {}),
      ...(lvl >= 3 ? { tarp: 1 } : {}),
    },
    capacityGain: 40 + lvl * 12,
  };
}

export function canAffordUpgrade(cost: UpgradeCost): boolean {
  if (state.coins < cost.coins) return false;
  for (const k in cost.materials) {
    const need = cost.materials[k as MaterialKey]!;
    if ((state.inv[k] ?? 0) < need) return false;
  }
  return true;
}

export function upgradeBarn(): boolean {
  const cost = barnUpgradeCost();
  if (!cost) return false;
  if (!canAffordUpgrade(cost)) return false;
  state.coins -= cost.coins;
  for (const k in cost.materials) removeItem(k, cost.materials[k as MaterialKey]!);
  state.storage!.barn.level += 1;
  state.storage!.barn.capacity += cost.capacityGain;
  track('barn_upgrade', { lvl: state.storage!.barn.level, cap: state.storage!.barn.capacity });
  toast(`Barn upgraded to Lv ${state.storage!.barn.level} — capacity ${state.storage!.barn.capacity}`, 'gold');
  return true;
}

export function upgradeSilo(): boolean {
  const cost = siloUpgradeCost();
  if (!cost) return false;
  if (!canAffordUpgrade(cost)) return false;
  state.coins -= cost.coins;
  for (const k in cost.materials) removeItem(k, cost.materials[k as MaterialKey]!);
  state.storage!.silo.level += 1;
  state.storage!.silo.capacity += cost.capacityGain;
  track('silo_upgrade', { lvl: state.storage!.silo.level, cap: state.storage!.silo.capacity });
  toast(`Silo upgraded to Lv ${state.storage!.silo.level} — capacity ${state.storage!.silo.capacity}`, 'gold');
  return true;
}

// Whether the player is approaching/exceeding capacity for a kind of item.
export function isItemBlocked(itemKey: string): { blocked: boolean; over: number } {
  const usage = isSiloItem(itemKey) ? siloUsage() : barnUsage();
  return { blocked: usage.used >= usage.cap, over: usage.used - usage.cap };
}

export function materialName(k: MaterialKey): string {
  return ITEMS[k]?.name ?? k;
}

// Re-exposed for outside callers.
export const STORAGE_BARN_MATERIALS: ReadonlyArray<MaterialKey> = Array.from(BARN_MATERIALS);
export const STORAGE_SILO_MATERIALS: ReadonlyArray<MaterialKey> = Array.from(SILO_MATERIALS);

/** Storage-full toast — fires once per minute max so we don't spam. */
let lastFullToastAt = 0;
export function maybeWarnFull(itemKey: string): void {
  const u = isSiloItem(itemKey) ? siloUsage() : barnUsage();
  if (u.used <= u.cap) return;
  const now = performance.now() / 1000;
  if (now - lastFullToastAt < 60) return;
  lastFullToastAt = now;
  const which = isSiloItem(itemKey) ? 'Silo' : 'Barn';
  track('storage_full_event', { which, used: u.used, cap: u.cap });
  toast(`${which} is over capacity — consider selling or upgrading.`);
}
