// =============================================================
//  COLLECTION / MASTERY — encyclopedias for crops, fish, and
//  recipes. First-discovery and tier rewards. Provides
//  permanent passive bonuses as more entries are completed.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { FISH } from '../data/fish';
import { BUILDINGS } from '../data/buildings';
import { ORCHARDS } from '../data/orchards';
import { track } from './telemetry';
import { addXP } from './xp';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';

export type CollectionKind = 'crop' | 'fish' | 'recipe' | 'tree';

export interface CollectionState {
  discovered: Record<string, Record<string, number>>; // kind -> id -> count
  firstRewardClaimed: Record<string, true>;           // kind:id keys
}

export function initCollection(): void {
  if (!state.collection) {
    state.collection = { discovered: { crop: {}, fish: {}, recipe: {}, tree: {} }, firstRewardClaimed: {} };
  }
}

export function recordDiscovery(kind: CollectionKind, id: string, qty = 1): void {
  initCollection();
  const c = state.collection!;
  if (!c.discovered[kind]) c.discovered[kind] = {};
  const prev = c.discovered[kind][id] ?? 0;
  c.discovered[kind][id] = prev + qty;
  if (prev === 0) {
    track('collection_first_discovery', { kind, id });
    const key = `${kind}:${id}`;
    if (!c.firstRewardClaimed[key]) {
      c.firstRewardClaimed[key] = true;
      const xp = kind === 'fish' ? 15 : kind === 'recipe' ? 12 : 8;
      const coins = kind === 'fish' ? 60 : kind === 'recipe' ? 50 : 30;
      state.coins += coins;
      state.stats.earned += coins;
      addXP(xp);
      toast(`Discovered ${id}! +${coins}💰 +${xp}XP`, 'gold');
      sfx.bell();
      updateHUD();
    }
  }
}

export function isDiscovered(kind: CollectionKind, id: string): boolean {
  return !!state.collection?.discovered[kind]?.[id];
}

export function discoveryCount(kind: CollectionKind, id: string): number {
  return state.collection?.discovered[kind]?.[id] ?? 0;
}

export function totalEntries(kind: CollectionKind): { found: number; total: number } {
  initCollection();
  const c = state.collection!;
  if (kind === 'crop') return { found: Object.keys(c.discovered.crop ?? {}).length, total: Object.keys(CROPS).length };
  if (kind === 'fish') return { found: Object.keys(c.discovered.fish ?? {}).length, total: Object.keys(FISH).length };
  if (kind === 'tree') return { found: Object.keys(c.discovered.tree ?? {}).length, total: Object.keys(ORCHARDS).length };
  // recipes
  let total = 0;
  for (const b of Object.values(BUILDINGS)) total += (b.recipes ?? []).length;
  return { found: Object.keys(c.discovered.recipe ?? {}).length, total };
}

// Passive bonus from collection completion.
export function collectionBonuses(): { yieldMult: number; sellMult: number; speedMult: number } {
  initCollection();
  const c = state.collection!;
  const crops = totalEntries('crop');
  const fish = totalEntries('fish');
  const recipes = totalEntries('recipe');
  return {
    yieldMult: (crops.total ? crops.found / crops.total : 0) * 0.10,
    sellMult:  (fish.total ? fish.found / fish.total : 0) * 0.08,
    speedMult: (recipes.total ? recipes.found / recipes.total : 0) * 0.10,
  };
}

// Friendly label for the kind, used in UIs.
export function kindLabel(k: CollectionKind): string {
  return k === 'crop' ? 'Crops' : k === 'fish' ? 'Fish' : k === 'tree' ? 'Trees' : 'Recipes';
}

// Get a localized name for a discovered item.
export function entryName(kind: CollectionKind, id: string): string {
  if (kind === 'crop') return ITEMS[CROPS[id]?.item ?? id]?.name ?? id;
  if (kind === 'fish') return ITEMS[id]?.name ?? id;
  if (kind === 'tree') return ORCHARDS[id]?.name ?? id;
  return ITEMS[id]?.name ?? id;
}
