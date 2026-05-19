// =============================================================
//  ADJACENCY BUFFS — production buildings get a speed bonus
//  when they are placed next to other production buildings.
//  Encourages factory-style farm layouts.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { CONFIG } from '../config';

export function neighborCount(b: { id: string; type: string; x: number; y: number }): number {
  const def = BUILDINGS[b.type]!;
  if (def.kind !== 'production') return 0;
  let n = 0;
  for (const other of state.buildings) {
    if (other.id === b.id) continue;
    const od = BUILDINGS[other.type]!;
    if (od.kind !== 'production') continue;
    // Are bounding boxes adjacent?
    const ax = b.x, ay = b.y, aw = def.w, ah = def.h;
    const bx = other.x, by = other.y, bw = od.w, bh = od.h;
    const horizAdj = (ax + aw === bx || bx + bw === ax) && (ay < by + bh && by < ay + ah);
    const vertAdj = (ay + ah === by || by + bh === ay) && (ax < bx + bw && bx < ax + aw);
    if (horizAdj || vertAdj) n++;
  }
  return n;
}

export function adjacencyBonus(b: { id: string; type: string; x: number; y: number }): number {
  const n = neighborCount(b);
  return Math.min(CONFIG.adjacency.maxBonus, n * CONFIG.adjacency.bonusPerNeighbor);
}
