// =============================================================
//  WORLD GENERATION  — deterministic procedural farm layout
//
//  Builds the 32×32 tile grid from a seed. Same seed → identical
//  world every time, so saves can later persist just the seed +
//  player overrides rather than the full grid if we want.
//
//  The world is designed in passes:
//    1. Region tagging        — every tile gets a region & unlocked flag
//    2. Forest border        — corner zones get dense forest visuals
//    3. Lake                 — small lake in NW of HOME, with a stream
//    4. Path network         — south entrance, cross-roads, branches
//    5. Soil hints           — three subtle "gameplay zone" tints in HOME
//    6. Obstacles            — region-appropriate clearable obstacles
//
//  Generation favors *legibility* over noise — the player should
//  immediately read "this is my farm, that's the locked east field,
//  the forest is over there". Avoid pure random scatter.
// =============================================================

import {
  GRID_W, GRID_H, WORLD_SEED,
  HOME_X0, HOME_Y0, HOME_X1, HOME_Y1,
} from '../../constants';
import type { Tile, ObstacleKind } from '../../types';
import { regionForCoord, REGIONS, makeObstacle } from './world-data';

// ---- Seeded RNG ---------------------------------------------------
//
// Mulberry32: small, fast, good distribution for game generation. The
// PRNG is local to one world-gen run so it never leaks into gameplay
// randomness elsewhere.
function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeEmptyTile(): Tile {
  return {
    type: 'grass',
    crop: null,
    plantedAt: 0,
    watered: false,
    building: null,
    region: 'home',
    unlocked: true,
    obstacle: null,
  };
}

/** Build a fresh 32×32 grid using the given seed. */
export function generateWorld(seed: number = WORLD_SEED): Tile[][] {
  const rng = makeRng(seed);
  const grid: Tile[][] = [];

  // -------- Pass 1: empty grid + region tags --------
  for (let gy = 0; gy < GRID_H; gy++) {
    const row: Tile[] = [];
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = makeEmptyTile();
      t.region = regionForCoord(gx, gy);
      t.unlocked = t.region === 'home';
      row.push(t);
    }
    grid.push(row);
  }

  // -------- Pass 2: lake in NW of HOME --------
  // The lake's shape is a soft rounded blob designed to:
  //   - hug the NW corner of HOME so the upper-left feels like the
  //     "scenic" view the player will park their camera on,
  //   - leave the rest of HOME unobstructed for crops/buildings,
  //   - touch the western HOME boundary so River Bend (when unlocked)
  //     can extend the water naturally.
  const lakeShape: ReadonlyArray<readonly [number, number]> = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [1, 3], [2, 3], [3, 3], [4, 3],
    [2, 4], [3, 4],
  ];
  for (const [lx, ly] of lakeShape) {
    const gx = HOME_X0 + lx;
    const gy = HOME_Y0 + ly;
    if (!inGrid(gx, gy)) continue;
    grid[gy]![gx]!.type = 'water';
  }

  // -------- Pass 3: river stream from W edge into the lake --------
  // A thin water vein from the W world edge meandering up to the lake.
  // The river is inside River Bend (locked) for most of its length,
  // which gives the locked zone a clear "future feature" hint.
  const streamY = HOME_Y0 + 3;
  for (let gx = 0; gx < HOME_X0; gx++) {
    const wobble = Math.round(Math.sin(gx * 0.5) * 0.7);
    const ry = streamY + wobble;
    if (inGrid(gx, ry)) grid[ry]![gx]!.type = 'water';
  }

  // -------- Pass 4: path network --------
  // Vertical south-entrance path that ends at the heart of HOME.
  // A horizontal branch leads west toward the lake — "this way to
  // the dock" — and a small east branch hints at the East Meadow
  // expansion direction.
  const entranceX = Math.floor((HOME_X0 + HOME_X1) / 2);
  const branchY = HOME_Y0 + 4;
  // South-entrance vertical
  for (let gy = HOME_Y1; gy >= branchY; gy--) {
    setPathIfFree(grid, entranceX, gy);
  }
  // West branch toward lake
  for (let gx = entranceX - 1; gx >= HOME_X0 + 3; gx--) {
    setPathIfFree(grid, gx, branchY);
  }
  // Short east stub — visual cue that East Meadow is "out that way"
  for (let gx = entranceX + 1; gx <= entranceX + 3; gx++) {
    setPathIfFree(grid, gx, branchY);
  }

  // -------- Pass 5: soil hint zones inside HOME --------
  // Three small soil patches at the three corners away from the lake.
  // Soil is mechanically equivalent to grass for placement, but the
  // warmer color reads as "this is where pens / production / orchards
  // tend to go" without requiring a tutorial.
  paintSoilZone(grid, HOME_X1 - 4, HOME_Y0 + 1, 4, 3);    // NE — pens
  paintSoilZone(grid, HOME_X1 - 5, HOME_Y1 - 4, 5, 4);    // SE — production
  paintSoilZone(grid, HOME_X0 + 1, HOME_Y1 - 4, 3, 3);    // SW — orchard

  // -------- Pass 6: pre-plowed starter plot --------
  // A small 4×2 patch of plowed soil east of the path, just below the
  // branch. Gives the player something to immediately plant on.
  for (let gy = branchY + 1; gy <= branchY + 2; gy++) {
    for (let gx = entranceX + 1; gx <= entranceX + 4; gx++) {
      const t = grid[gy]?.[gx];
      if (t && t.type !== 'water' && t.type !== 'path') t.type = 'plowed';
    }
  }

  // -------- Pass 7: obstacles in expansion regions --------
  // Each non-home region gets a sprinkle of region-appropriate
  // obstacles. Density is tuned so the player ALWAYS has something to
  // clear when they unlock a zone, but the zone never reads as
  // "rubble field". HOME stays clear of obstacles by design — cozy
  // farming pacing.
  scatterObstacles(grid, rng);

  // -------- Pass 8: forest_edge corner trim --------
  // Corners are permanent natural border. They stay as grass tiles
  // visually but get marked unlocked=false and densely seeded with
  // obstacles (rendered as small trees / logs / brambles) so they
  // read as wild forest the player skirts around, not playable land.
  paintForestCorners(grid, rng);

  return grid;
}

// ---- Helpers ------------------------------------------------------

function inGrid(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < GRID_W && gy < GRID_H;
}

function setPathIfFree(grid: Tile[][], gx: number, gy: number): void {
  const t = grid[gy]?.[gx];
  if (!t) return;
  if (t.type === 'water') return;
  t.type = 'path';
}

function paintSoilZone(grid: Tile[][], x0: number, y0: number, w: number, h: number): void {
  for (let gy = y0; gy < y0 + h; gy++) {
    for (let gx = x0; gx < x0 + w; gx++) {
      const t = grid[gy]?.[gx];
      if (!t) continue;
      if (t.type === 'water' || t.type === 'path') continue;
      // Soften the rectangle into an organic shape by skipping corner
      // tiles randomly enough to avoid a "stamped" feel. We use a
      // simple hash so this is stable across reloads without needing
      // the rng state.
      const corner =
        (gx === x0 && gy === y0) || (gx === x0 + w - 1 && gy === y0) ||
        (gx === x0 && gy === y0 + h - 1) || (gx === x0 + w - 1 && gy === y0 + h - 1);
      if (corner && (((gx * 17) ^ (gy * 23)) & 1)) continue;
      t.type = 'soil';
    }
  }
}

/** Density of clearable obstacles per region. Tuned so HOME never has
 *  any (player gets a clean starting farm) and expansion regions feel
 *  "wild but not impassable". */
const OBSTACLE_DENSITY: Record<string, number> = {
  home: 0,
  windy_hill:  0.16,   // sparse — open grassland up top
  east_meadow: 0.14,
  old_orchard: 0.22,   // denser — overgrown old fruit grove
  river_bend:  0.18,
  forest_edge: 0.45,   // very dense — wild forest
};

function pickObstacleKind(region: string, rng: () => number): ObstacleKind {
  // Region-flavored obstacle palettes — each zone has a "signature"
  // obstacle the player will spend time clearing, plus a fill.
  const r = rng();
  switch (region) {
    case 'windy_hill':
      // Rocky uplands — mostly rocks, a few brambles.
      if (r < 0.65) return 'rock';
      if (r < 0.85) return 'bramble';
      return 'bush';
    case 'east_meadow':
      // Sunny grass — bushes & a few rocks.
      if (r < 0.55) return 'bush';
      if (r < 0.80) return 'rock';
      return 'log';
    case 'old_orchard':
      // Old fruit grove — stumps + brambles dominate, signaling
      // "old trees lived here".
      if (r < 0.45) return 'stump';
      if (r < 0.75) return 'bramble';
      if (r < 0.90) return 'log';
      return 'bush';
    case 'river_bend':
      // Reedy bend — muddy patches + logs that have washed up.
      if (r < 0.45) return 'mud';
      if (r < 0.75) return 'log';
      if (r < 0.92) return 'rock';
      return 'bramble';
    case 'forest_edge':
      // Dense forest — every kind, leaning toward stumps & brambles
      // so the corners read as overgrown wildwood.
      if (r < 0.30) return 'stump';
      if (r < 0.55) return 'bramble';
      if (r < 0.75) return 'log';
      if (r < 0.90) return 'rock';
      return 'bush';
  }
  return 'rock';
}

function scatterObstacles(grid: Tile[][], rng: () => number): void {
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = grid[gy]?.[gx];
      if (!t) continue;
      const region = t.region ?? 'home';
      // Skip home and water/path tiles.
      if (region === 'home') continue;
      if (t.type === 'water' || t.type === 'path') continue;
      // forest_edge corners are seeded in their own pass — skip here
      // so the densities don't double up.
      if (region === 'forest_edge') continue;
      const density = OBSTACLE_DENSITY[region] ?? 0;
      if (rng() > density) continue;
      const kind = pickObstacleKind(region, rng);
      t.obstacle = makeObstacle(kind, Math.floor(rng() * 4));
    }
  }
}

function paintForestCorners(grid: Tile[][], rng: () => number): void {
  const density = OBSTACLE_DENSITY.forest_edge ?? 0.45;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = grid[gy]?.[gx];
      if (!t || t.region !== 'forest_edge') continue;
      if (t.type !== 'grass') continue;
      // Bias density up near the absolute corners so the very edges
      // look thicker than the corner-adjacent fringe.
      const dx = Math.min(gx, GRID_W - 1 - gx);
      const dy = Math.min(gy, GRID_H - 1 - gy);
      const cornerness = 1 - Math.min(1, (dx + dy) / 8);
      const bias = density + cornerness * 0.35;
      if (rng() > bias) continue;
      const kind = pickObstacleKind('forest_edge', rng);
      t.obstacle = makeObstacle(kind, Math.floor(rng() * 4));
    }
  }
}

// ---- Migration --------------------------------------------------------

/** Embed an older smaller grid (e.g. 18×18 from save v3) into the
 *  centre of a freshly-generated 32×32 world. Old tile types/crops/
 *  buildings are preserved (and the new grid's obstacles + region
 *  tags around the embedding area are kept). Returns the embedding
 *  offset so callers can shift building/tree/decor coords too. */
export function embedLegacyGrid(
  fresh: Tile[][],
  legacy: Tile[][],
): { offsetX: number; offsetY: number } {
  const oldH = legacy.length;
  const oldW = legacy[0]?.length ?? 0;
  if (oldW === 0 || oldH === 0) return { offsetX: 0, offsetY: 0 };
  // Centre the old grid in the new world. For an 18×18 legacy save
  // and a 32×32 new world this offsets by 7 in each axis, which
  // happens to align with HOME_X0/HOME_Y0 — old "tile (0,0)" lands at
  // HOME_X0/HOME_Y0, so the player's farm slides perfectly into HOME.
  const offsetX = Math.max(0, Math.floor((GRID_W - oldW) / 2));
  const offsetY = Math.max(0, Math.floor((GRID_H - oldH) / 2));
  for (let oy = 0; oy < oldH; oy++) {
    for (let ox = 0; ox < oldW; ox++) {
      const old = legacy[oy]?.[ox];
      if (!old) continue;
      const nx = ox + offsetX;
      const ny = oy + offsetY;
      if (!inGrid(nx, ny)) continue;
      const target = fresh[ny]![nx]!;
      // Preserve old tile type & per-tile gameplay state. Clear
      // anything the world-gen put there (obstacles in the embedded
      // area, etc.) so old crops/buildings see the world they remember.
      target.type = old.type;
      target.crop = old.crop;
      target.plantedAt = old.plantedAt;
      target.building = old.building;
      target.tree = old.tree;
      target.obstacle = null;
      target.region = 'home';
      target.unlocked = true;
    }
  }
  return { offsetX, offsetY };
}
