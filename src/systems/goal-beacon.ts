// =============================================================
//  GOAL BEACON — render a soft glow over the next-best
//  action's target tile. Used by render.ts.
// =============================================================

import { state } from '../state';
import { TILE } from '../constants';
import { BUILDINGS } from '../data/buildings';
import { rankObjectives } from './objectives';
import { cropStage } from './crops';
import { nowSeconds } from '../utils';
import { ANIMALS } from '../data/animals';

export interface BeaconLocation {
  x: number;
  y: number;
  radius: number;
}

let cached: BeaconLocation | null = null;
let cachedAt = 0;

export function currentBeacon(): BeaconLocation | null {
  const now = nowSeconds();
  if (now - cachedAt < 1.5) return cached;
  cachedAt = now;
  cached = computeBeacon();
  return cached;
}

function computeBeacon(): BeaconLocation | null {
  const objs = rankObjectives();
  if (objs.length === 0) return null;
  const top = objs[0]!;
  const id = String(top.payload?.id ?? '');
  switch (top.actionId) {
    case 'harvest': {
      for (let y = 0; y < state.grid.length; y++) {
        const row = state.grid[y]!;
        for (let x = 0; x < row.length; x++) {
          const t = row[x]!;
          if (t.crop && cropStage(t) === 3) {
            return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, radius: 30 };
          }
        }
      }
      break;
    }
    case 'plant': {
      for (let y = 0; y < state.grid.length; y++) {
        const row = state.grid[y]!;
        for (let x = 0; x < row.length; x++) {
          if (row[x]!.type === 'plowed' && !row[x]!.crop) {
            return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, radius: 28 };
          }
        }
      }
      break;
    }
    case 'production':
    case 'queueProduction':
    case 'pen':
    case 'feedPen': {
      const b = state.buildings.find(x => x.id === id);
      if (b) {
        const def = BUILDINGS[b.type]!;
        return {
          x: (b.x + def.w / 2) * TILE,
          y: (b.y + def.h / 2) * TILE,
          radius: Math.max(def.w, def.h) * TILE / 2 + 8,
        };
      }
      break;
    }
    case 'tree': {
      for (const tr of state.trees) {
        // Skip — we only highlight if ready
        const elapsed = nowSeconds() - tr.plantedAt;
        // Trees logic: rely on the ranker filtering them in
        if (tr.lastHarvested === 0 || (nowSeconds() - tr.lastHarvested) >= 30) {
          return { x: (tr.x + 0.5) * TILE, y: (tr.y + 0.5) * TILE, radius: 28 };
        }
      }
      break;
    }
    case 'wilting': {
      for (let y = 0; y < state.grid.length; y++) {
        const row = state.grid[y]!;
        for (let x = 0; x < row.length; x++) {
          const t = row[x]!;
          if (t.crop && cropStage(t) >= 1) {
            return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, radius: 32 };
          }
        }
      }
      break;
    }
  }
  return null;
}

// silence unused-import warnings
void ANIMALS;
