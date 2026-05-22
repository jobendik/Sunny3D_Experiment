// =============================================================
//  WORLD DATA  — regions + tile-state predicates
//
//  Single source of truth for "what kind of land is this tile in?"
//  and "is the player allowed to plow / plant / build / clear here?".
//
//  Regions are deterministic rectangles set at world-gen time and
//  never change shape. Their unlock state lives in
//  `state.expansion.plots[id].status`, so this module reads from
//  expansion to answer `isRegionUnlocked()` without owning that
//  state itself.
//
//  The predicates (canPlow / canPlant / canBuild / canClear) are
//  the foundation for every tile interaction. Gameplay code should
//  always go through them rather than re-checking tile.type
//  ad-hoc — that's how we keep the old "plow eats the rock" bug from
//  ever returning.
// =============================================================

import { state } from '../../state';
import {
  GRID_W, GRID_H,
  HOME_X0, HOME_Y0, HOME_X1, HOME_Y1,
} from '../../constants';
import type { Tile, RegionId, TileObstacle, ObstacleKind } from '../../types';

export interface RegionDef {
  id: RegionId;
  label: string;
  /** Inclusive bounds. For 'forest_edge' the four corners are stitched
   *  together — `contains()` handles the special case. */
  x0: number; y0: number; x1: number; y1: number;
  /** Player level required before the matching expansion plot becomes
   *  unlockable. `home` and `forest_edge` are special cases handled
   *  by `isRegionUnlocked`. */
  unlockLevel: number;
  /** Plot id in `state.expansion.plots` that gates this region. */
  plotId: string | null;
  /** Human-readable hint shown on hover-into-locked-tile. */
  hint: string;
}

// Region layout for the 32×32 world. HOME = central 18×18 (cols/rows
// 7..24 inclusive). Four cardinal bands wrap home, plus a 'forest_edge'
// pseudo-region covering the 4 corner squares (handled in contains()).
//
//        x=0    7        24   31
//   y=0  +--+----------+--+
//        |FE|  windy   |FE|
//   y=6  +--+----------+--+
//        |  |          |  |
//        |RB|   HOME   |EM|
//        |  |          |  |
//   y=24 +--+----------+--+
//        |FE|  orchard |FE|
//   y=31 +--+----------+--+
export const REGIONS: Record<RegionId, RegionDef> = {
  home: {
    id: 'home',
    label: 'Home Farm',
    x0: HOME_X0, y0: HOME_Y0, x1: HOME_X1, y1: HOME_Y1,
    unlockLevel: 0,
    plotId: null,
    hint: '',
  },
  windy_hill: {
    id: 'windy_hill',
    label: 'Windy Hill',
    x0: HOME_X0, y0: 0, x1: HOME_X1, y1: HOME_Y0 - 1,
    unlockLevel: 14,
    plotId: 'windy_hill',
    hint: 'Windy Hill — unlock from the Expansion panel',
  },
  east_meadow: {
    id: 'east_meadow',
    label: 'East Meadow',
    x0: HOME_X1 + 1, y0: HOME_Y0, x1: GRID_W - 1, y1: HOME_Y1,
    unlockLevel: 7,
    plotId: 'east_meadow',
    hint: 'East Meadow — unlock from the Expansion panel',
  },
  old_orchard: {
    id: 'old_orchard',
    label: 'Old Orchard',
    x0: HOME_X0, y0: HOME_Y1 + 1, x1: HOME_X1, y1: GRID_H - 1,
    unlockLevel: 10,
    plotId: 'old_orchard',
    hint: 'Old Orchard — unlock from the Expansion panel',
  },
  river_bend: {
    id: 'river_bend',
    label: 'River Bend',
    x0: 0, y0: HOME_Y0, x1: HOME_X0 - 1, y1: HOME_Y1,
    unlockLevel: 12,
    plotId: 'river_bend',
    hint: 'River Bend — unlock from the Expansion panel',
  },
  forest_edge: {
    id: 'forest_edge',
    label: 'Forest Edge',
    // Whole-world bounds with a custom contains() check that returns
    // true only for the 4 corner squares.
    x0: 0, y0: 0, x1: GRID_W - 1, y1: GRID_H - 1,
    unlockLevel: 16,
    plotId: 'forest_edge',
    hint: 'Forest Edge — unlock from the Expansion panel',
  },
};

/** Region for a given tile coord — deterministic, no state lookup. */
export function regionForCoord(gx: number, gy: number): RegionId {
  if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return 'forest_edge';
  // Home is fastest to check.
  if (gx >= HOME_X0 && gx <= HOME_X1 && gy >= HOME_Y0 && gy <= HOME_Y1) return 'home';
  const inHomeCols = gx >= HOME_X0 && gx <= HOME_X1;
  const inHomeRows = gy >= HOME_Y0 && gy <= HOME_Y1;
  // Four cardinal bands (band + home-axis-aligned).
  if (inHomeCols && gy < HOME_Y0) return 'windy_hill';
  if (inHomeCols && gy > HOME_Y1) return 'old_orchard';
  if (inHomeRows && gx < HOME_X0) return 'river_bend';
  if (inHomeRows && gx > HOME_X1) return 'east_meadow';
  // Anything else is a corner — natural forest border.
  return 'forest_edge';
}

/** True if the player has unlocked the given region. `home` is always
 *  unlocked. Other regions read `state.expansion.plots[id].status`. */
export function isRegionUnlocked(region: RegionId): boolean {
  if (region === 'home') return true;
  const def = REGIONS[region];
  if (!def.plotId) return true;
  const plot = state.expansion?.plots[def.plotId];
  // status === 'unlocked' means the plot's obstacles are all cleared.
  // Treat 'clearing' as half-unlocked: the player has paid to unlock
  // the *plot*, but the tile-level obstacles inside it still block
  // plow/build until they're individually cleared from the tile.
  return plot?.status === 'unlocked';
}

/** True if the player can interact with this tile at all (not in a
 *  permanently-locked region they haven't unlocked). */
export function isTileUnlocked(t: Tile | undefined | null): boolean {
  if (!t) return false;
  if (t.unlocked) return true;
  // Defensive: if region/unlocked were never set (very old saves),
  // fall back to "home tiles are unlocked".
  if (t.region === 'home') return true;
  return false;
}

// ---- Interaction predicates ---------------------------------------

/** Can the player turn this tile into plowed soil right now? */
export function canPlow(t: Tile | undefined | null): boolean {
  if (!t) return false;
  if (!isTileUnlocked(t)) return false;
  if (t.obstacle) return false;
  if (t.building || t.tree || t.crop) return false;
  // Plow accepts grass / soil / plowed (plowed → grass toggle).
  return t.type === 'grass' || t.type === 'soil' || t.type === 'plowed';
}

/** Can the player plant a seed on this tile right now? */
export function canPlant(t: Tile | undefined | null): boolean {
  if (!t) return false;
  if (!isTileUnlocked(t)) return false;
  if (t.obstacle) return false;
  if (t.building || t.tree || t.crop) return false;
  return t.type === 'plowed';
}

/** Can the player place a building on this tile? Footprint validation
 *  happens in `systems/grid.ts:canPlaceBuilding`; this is the per-tile
 *  predicate it calls for each tile in the footprint. */
export function canBuildOn(t: Tile | undefined | null): boolean {
  if (!t) return false;
  if (!isTileUnlocked(t)) return false;
  if (t.obstacle) return false;
  if (t.building || t.tree || t.crop) return false;
  return t.type === 'grass' || t.type === 'plowed' || t.type === 'soil';
}

/** True if the tile has a clearable obstacle the player could remove
 *  with the appropriate tool. */
export function canClear(t: Tile | undefined | null): boolean {
  if (!t || !t.obstacle) return false;
  return isTileUnlocked(t);
}

/** Human-readable reason a tile cannot be plowed, for toast feedback.
 *  Returns null if plowing is fine. */
export function plowBlockedReason(t: Tile | undefined | null): string | null {
  if (!t) return 'Out of bounds';
  if (!isTileUnlocked(t)) {
    const reg = REGIONS[t.region ?? 'forest_edge'];
    return reg.hint || 'Locked land';
  }
  if (t.obstacle) {
    return `Clear the ${obstacleLabel(t.obstacle.kind)} first`;
  }
  if (t.building) return 'A building is here';
  if (t.tree) return 'A tree is here';
  if (t.crop) return 'A crop is growing here';
  if (t.type === 'water') return 'Water — cannot plow';
  if (t.type === 'path') return 'Cobble path — cannot plow';
  return null;
}

/** Friendly label for the obstacle kind. */
export function obstacleLabel(kind: ObstacleKind): string {
  switch (kind) {
    case 'rock':    return 'rock';
    case 'bush':    return 'bush';
    case 'stump':   return 'stump';
    case 'log':     return 'fallen log';
    case 'bramble': return 'brambles';
    case 'mud':     return 'muddy patch';
  }
}

/** Tool the player needs in inventory to clear this obstacle. */
export function obstacleClearTool(kind: ObstacleKind): string {
  switch (kind) {
    case 'rock':    return 'pickaxe';
    case 'bush':    return 'axe';
    case 'stump':   return 'saw';
    case 'log':     return 'saw';
    case 'bramble': return 'axe';
    case 'mud':     return 'shovel';
  }
}

/** Build an obstacle record. Variant is hashed from coords so the
 *  visual look is stable across reloads. */
export function makeObstacle(kind: ObstacleKind, variant: number): TileObstacle {
  return { kind, variant: variant & 3 };
}

/** True if the (gx,gy) coord is on the playable 32×32 grid. */
export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
}
