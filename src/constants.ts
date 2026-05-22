// =============================================================
//  WORLD CONSTANTS
//
//  The world is a 32×32 tile grid. The central 18×18 block is the
//  player's starting farm ("home" region) — fully unlocked and
//  buildable. The 7-tile-wide bands around it are gameplay regions
//  (windy_hill / east_meadow / old_orchard / river_bend), each
//  locked behind level + expansion costs. The 4 corner zones are
//  permanent natural border (forest_edge) — locked land that frames
//  the world without ever becoming playable.
//
//  HOME_X0/Y0/X1/Y1 are inclusive tile coords of the home block.
//  Most camera & UI math centres on HOME_CENTER_TILE so the player
//  always sees the home zone as the focal point of the screen.
// =============================================================

export const TILE = 64;       // logical tile size in pixels
export const GRID_W = 32;     // total world width in tiles
export const GRID_H = 32;     // total world height in tiles

// Central "home" zone — the player's starting unlocked farm. 18×18,
// roughly the size of the previous full play area, so the starting
// experience matches a familiar Hay-Day footprint while leaving 7
// tiles of unlockable border on every side.
export const HOME_X0 = 7;
export const HOME_Y0 = 7;
export const HOME_X1 = 24;     // inclusive
export const HOME_Y1 = 24;     // inclusive
export const HOME_W = HOME_X1 - HOME_X0 + 1;   // 18
export const HOME_H = HOME_Y1 - HOME_Y0 + 1;   // 18
export const HOME_CENTER_X = (HOME_X0 + HOME_X1 + 1) / 2;
export const HOME_CENTER_Y = (HOME_Y0 + HOME_Y1 + 1) / 2;

export const DAY_SECONDS = 90; // real-time seconds per in-game day

// Save key bumps to v4 — the v3 18×18 grid embeds cleanly into the
// new 32×32 world but we want a fresh key so legacy clients without
// the migration code don't accidentally read a partially-populated
// new grid.
export const SAVE_KEY = 'sunnyacres-save-v4';

// Seed for deterministic procedural world generation. Same seed →
// same world every time, useful for debugging & save persistence.
export const WORLD_SEED = 0xACE17F;
