import { state } from '../state';
import { GRID_W, GRID_H, TILE, WORLD_SEED } from '../constants';
import { BUILDINGS } from '../data/buildings';
import { DECORATIONS } from '../data/decorations';
import { generateWorld } from '../three/terrain/world-gen';
import { canBuildOn } from '../three/terrain/world-data';
import type { BuildingInstance, Tile } from '../types';

/** Build a fresh world. Called on a brand-new save. */
export function initGrid(): void {
  state.grid = generateWorld(WORLD_SEED);
}

export function markBuildingTiles(): void {
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (state.grid[y]![x]!.building) state.grid[y]![x]!.building = null;
    }
  }
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const x = b.x + dx;
        const y = b.y + dy;
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
        state.grid[y]![x]!.building = b.id;
      }
    }
  }
}

export interface TileLookup {
  gx: number;
  gy: number;
  t: Tile;
}

export function tileAt(wx: number, wy: number): TileLookup | null {
  const gx = Math.floor(wx / TILE);
  const gy = Math.floor(wy / TILE);
  if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return null;
  return { gx, gy, t: state.grid[gy]![gx]! };
}

export function buildingAt(gx: number, gy: number): BuildingInstance | null {
  const t = state.grid[gy] && state.grid[gy]![gx];
  if (!t || !t.building) return null;
  return state.buildings.find(b => b.id === t.building) ?? null;
}

export function canPlaceBuilding(type: string, gx: number, gy: number): boolean {
  const def = BUILDINGS[type]!;
  let touchesWater = false;
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
      const t = state.grid[y]![x]!;
      // Tile-level validity (region unlocked, no obstacle, etc.).
      if (!canBuildOn(t)) return false;
      if (state.decor.some(d => {
        const dD = DECORATIONS[d.type]!;
        return x >= d.x && x < d.x + dD.w && y >= d.y && y < d.y + dD.h;
      })) return false;
      if (def.kind === 'fishing' && !touchesWater) {
        const neighbors: Array<[number, number]> = [
          [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
          if (state.grid[ny]![nx]!.type === 'water') { touchesWater = true; break; }
        }
      }
    }
  }
  if (def.kind === 'fishing' && !touchesWater) return false;
  return true;
}
