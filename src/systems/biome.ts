// =============================================================
//  FISHING BIOMES — players can choose where to fish (pond,
//  river, deep) and which bait to use. Time-window biases
//  shift which fish are more active.
// =============================================================

import { state } from '../state';
import { BIOMES, BAITS, type BiomeId } from '../data/bait';
import { ITEMS } from '../data/items';
import { removeItem } from './inventory';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';

export function initBiome(): void {
  if (!state.biome) {
    state.biome = { current: 'pond', activeBait: null, baitUntil: 0 };
  }
}

export function selectBiome(b: BiomeId): boolean {
  initBiome();
  if (state.level < BIOMES[b].level) {
    toast(`Need Lv ${BIOMES[b].level} for ${BIOMES[b].name}`, 'error');
    sfx.error();
    return false;
  }
  state.biome!.current = b;
  toast(`Fishing in ${BIOMES[b].name}`, 'xp');
  return true;
}

export function applyBait(baitId: string): boolean {
  initBiome();
  const b = state.biome!;
  const def = BAITS[baitId];
  if (!def) return false;
  if ((state.inv[baitId] ?? 0) <= 0) { toast('No bait!', 'error'); sfx.error(); return false; }
  removeItem(baitId, 1);
  b.activeBait = baitId;
  b.baitUntil = (typeof performance !== 'undefined' ? performance.now() / 1000 : 0) + 120;
  toast(`Used ${def.name}`, 'xp');
  return true;
}

export function activeBaitDef(): { id: string; rareBonus: number; valueBonus: number } | null {
  const b = state.biome;
  if (!b || !b.activeBait) return null;
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  if (now >= b.baitUntil) return null;
  const def = BAITS[b.activeBait]!;
  return { id: def.id, rareBonus: def.rareBonus, valueBonus: def.valueBonus };
}

export function currentBiomeWeights(): Record<string, number> {
  initBiome();
  const def = BIOMES[state.biome!.current];
  return { ...def.fishWeights };
}

// Time-window bias: certain fish more active at dawn/dusk/night.
export function timeWindowBias(): Record<string, number> {
  const hour = new Date().getHours();
  const isDawn = hour >= 5 && hour < 8;
  const isDusk = hour >= 17 && hour < 20;
  const isNight = hour >= 21 || hour < 5;
  if (isNight) return { goldfish: 1.5, trout: 1.1 };
  if (isDawn || isDusk) return { trout: 1.3, bluefish: 1.1 };
  return {};
}

// Apply biome + bait + time-window to get final fish weights.
export function effectiveFishWeights(): Record<string, number> {
  const w = currentBiomeWeights();
  const tw = timeWindowBias();
  const ab = activeBaitDef();
  const rare = ab?.rareBonus ?? 0;
  for (const k of Object.keys(w)) {
    const baseLevel = ITEMS[k]?.level ?? 0;
    // rarer fish (higher level) get the biggest rareBonus payoff
    const rareScale = baseLevel >= 5 ? (1 + rare * 2) : (1 + rare * 0.5);
    w[k] = w[k]! * rareScale * (tw[k] ?? 1);
  }
  return w;
}

export function baitValueMultiplier(): number {
  const ab = activeBaitDef();
  return 1 + (ab?.valueBonus ?? 0);
}
