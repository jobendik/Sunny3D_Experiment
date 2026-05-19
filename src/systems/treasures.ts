// =============================================================
//  TREASURE CHESTS — small chance of spawning a tappable
//  chest on a random tile after any harvest. Tap to open
//  with variable reward.
// =============================================================

import { state } from '../state';
import { GRID_W, GRID_H, TILE } from '../constants';
import { rand, randi, nowSeconds } from '../utils';
import { spawnParticles, floatText } from './particles';
import { addItem } from './inventory';
import { addXP } from './xp';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { updateHUD } from '../ui/hud';

export interface ChestSpawn {
  id: string;
  gx: number;
  gy: number;
  spawnedAt: number;
  expiresAt: number;
  rare: boolean;
}

export interface TreasuresState {
  chests: ChestSpawn[];
  lastSpawnAt: number;
}

const SPAWN_CHANCE = 0.08;   // 8% per harvest
const RARE_CHANCE = 0.18;    // 18% of spawns are rare
const CHEST_LIFETIME = 120;  // 2 min before despawn
const COOLDOWN_SECONDS = 25; // min interval between spawns

export function initTreasures(): void {
  if (!state.treasures) state.treasures = { chests: [], lastSpawnAt: 0 };
}

// Called after a harvest action. Some chance to spawn a chest somewhere
// nearby that's clear of buildings/water.
export function maybeSpawnChest(): void {
  initTreasures();
  const t = state.treasures!;
  const now = nowSeconds();
  if (now - t.lastSpawnAt < COOLDOWN_SECONDS) return;
  if (Math.random() >= SPAWN_CHANCE) return;

  // pick a random spawnable tile
  const candidates: Array<[number, number]> = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const tile = state.grid[y]![x]!;
      if (tile.type === 'water') continue;
      if (tile.building) continue;
      if (tile.tree) continue;
      if (t.chests.some(c => c.gx === x && c.gy === y)) continue;
      candidates.push([x, y]);
    }
  }
  if (candidates.length === 0) return;
  const [gx, gy] = candidates[randi(candidates.length)]!;
  const rare = Math.random() < RARE_CHANCE;
  t.chests.push({
    id: 'ch' + Date.now() + randi(1e6),
    gx, gy,
    spawnedAt: now,
    expiresAt: now + CHEST_LIFETIME,
    rare,
  });
  t.lastSpawnAt = now;
  toast('💰 A treasure chest appeared on your farm!', 'gold');
  sfx.bell();
}

export function chestAt(gx: number, gy: number): ChestSpawn | null {
  if (!state.treasures) return null;
  return state.treasures.chests.find(c => c.gx === gx && c.gy === gy) ?? null;
}

export function openChest(id: string): void {
  initTreasures();
  const t = state.treasures!;
  const idx = t.chests.findIndex(c => c.id === id);
  if (idx < 0) return;
  const ch = t.chests[idx]!;
  t.chests.splice(idx, 1);

  // Variable reward
  const lvl = Math.max(1, state.level);
  const r = Math.random();
  const cx = ch.gx * TILE + TILE / 2;
  const cy = ch.gy * TILE + TILE / 2;
  if (ch.rare) {
    if (r < 0.4) {
      const coins = 200 + lvl * 30;
      state.coins += coins; state.stats.earned += coins;
      toast(`💎 Rare chest! +${coins} 💰`, 'gold');
      floatText(cx, cy - 10, `+${coins}💰`, '#ffd040');
    } else if (r < 0.75) {
      addItem('qualityink', 1);
      addItem('priority', 1);
      toast('💎 Rare loot! Quality Ink + Priority!', 'gold');
      floatText(cx, cy - 10, 'Rare loot!', '#c890ff');
    } else {
      const xp = 30 + lvl * 5;
      addXP(xp);
      const coins = 80 + lvl * 20;
      state.coins += coins; state.stats.earned += coins;
      toast(`💎 +${coins}💰 +${xp}XP`, 'gold');
      floatText(cx, cy - 10, `+${coins}💰`, '#ffd040');
    }
  } else {
    if (r < 0.5) {
      const coins = 40 + lvl * 6;
      state.coins += coins; state.stats.earned += coins;
      toast(`📦 Chest: +${coins} 💰`, 'gold');
      floatText(cx, cy - 10, `+${coins}💰`, '#ffd040');
    } else if (r < 0.85) {
      addItem('feed', 2);
      addItem('fertilizer', 1);
      toast('📦 Chest: +2 feed, +1 fertilizer', 'xp');
      floatText(cx, cy - 10, 'Supplies!', '#3a8020');
    } else {
      const xp = 12 + lvl * 2;
      addXP(xp);
      toast(`📦 Chest: +${xp} XP`, 'xp');
      floatText(cx, cy - 10, `+${xp}XP`, '#3c8dbc');
    }
  }
  spawnParticles(cx, cy, ch.rare ? '#c890ff' : '#ffd040', ch.rare ? 28 : 18);
  sfx.coin(); sfx.fishCatch();
  track('chest_opened', { rare: ch.rare });
  updateHUD();
}

export function tickTreasures(): void {
  initTreasures();
  const now = nowSeconds();
  state.treasures!.chests = state.treasures!.chests.filter(c => c.expiresAt > now);
}
