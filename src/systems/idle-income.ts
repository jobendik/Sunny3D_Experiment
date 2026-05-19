// =============================================================
//  IDLE INCOME — when the player returns, calculate what
//  passively earned while they were away (crops ripened,
//  animals produced, trees fruited, production finished)
//  and show a "While You Were Away" summary panel.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { ITEMS } from '../data/items';
import { CROPS } from '../data/crops';
import { ORCHARDS } from '../data/orchards';
import { nowSeconds } from '../utils';

export interface IdleSummary {
  awaySeconds: number;
  cropsReady: number;
  treesReady: number;
  produceReady: Record<string, number>;
  recipesReady: Record<string, number>;
  totalSellValue: number;
}

export function computeIdleSummary(awayMs: number): IdleSummary {
  const awaySeconds = Math.floor(awayMs / 1000);
  const summary: IdleSummary = {
    awaySeconds,
    cropsReady: 0,
    treesReady: 0,
    produceReady: {},
    recipesReady: {},
    totalSellValue: 0,
  };

  const now = nowSeconds();

  for (const row of state.grid) {
    for (const t of row) {
      if (!t.crop) continue;
      const c = CROPS[t.crop];
      if (!c) continue;
      const elapsed = now - t.plantedAt;
      if (elapsed >= c.grow && elapsed < c.grow * 4) {
        summary.cropsReady += 1;
        summary.totalSellValue += (ITEMS[c.item]?.sell ?? 0) * Math.max(c.yieldMin, 1);
      }
    }
  }

  for (const tr of state.trees) {
    const def = ORCHARDS[tr.type];
    if (!def) continue;
    if ((tr.lastHarvested === 0 || now - tr.lastHarvested >= def.cycle) && (now - tr.plantedAt >= def.grow)) {
      summary.treesReady += 1;
      summary.totalSellValue += (ITEMS[def.fruit]?.sell ?? 0) * def.yieldMin;
    }
  }

  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def) continue;
    if (def.kind === 'pen' && state.penAnimals[b.id]) {
      const aniDef = ANIMALS[def.animal!]!;
      let ready = 0;
      for (const a of state.penAnimals[b.id]!) {
        if (now - a.lastProduced >= aniDef.produceTime) ready += 1;
      }
      if (ready > 0) {
        summary.produceReady[aniDef.produces] = (summary.produceReady[aniDef.produces] ?? 0) + ready;
        summary.totalSellValue += (ITEMS[aniDef.produces]?.sell ?? 0) * ready;
      }
    }
    if (def.kind === 'production' && state.prodQueues[b.id]) {
      for (const job of state.prodQueues[b.id]!) {
        if (job.doneAt <= now) {
          const recipe = def.recipes?.[job.recipeIdx];
          if (!recipe) continue;
          for (const k of Object.keys(recipe.out)) {
            const q = recipe.out[k]!;
            summary.recipesReady[k] = (summary.recipesReady[k] ?? 0) + q;
            summary.totalSellValue += (ITEMS[k]?.sell ?? 0) * q;
          }
        }
      }
    }
  }

  return summary;
}

export function formatAway(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}
