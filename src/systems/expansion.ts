// =============================================================
//  LAND EXPANSION & OBSTACLE CLEARING — Phase 5 of the roadmap.
//
//  Locked plots are unlocked with coins + expansion materials, then
//  obstacles inside are cleared with the matching tool. Each cleared
//  obstacle drops a small bundle (coins, XP, materials, treasures).
//
//  Plots are abstract here — Sunny Acres' tile world is a single
//  contiguous grid, so we model expansion plots as named regions
//  unlocked progressively. The visual hint is the celebratory toast
//  and the unlock effect (e.g. extra storage room).
// =============================================================

import { state } from '../state';
import { GRID_W, GRID_H } from '../constants';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { addJournalEntry } from './journal';
import type { ExpansionRoot, PlotState, PlotObstacle, ObstacleKind, MaterialKey, RegionId } from '../types';

export interface PlotDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  unlockLevel: number;
  unlockCost: number;                       // coins
  unlockMaterials: Partial<Record<MaterialKey, number>>;
  obstacles: ObstacleKind[];
  rewardSummary: string;                    // human-readable
}

export const PLOTS: Record<string, PlotDef> = {
  east_meadow: {
    id: 'east_meadow',
    name: 'East Meadow',
    emoji: '🌾',
    blurb: 'Sunny grassland just past the eastern fence — perfect for crops.',
    unlockLevel: 7,
    unlockCost: 500,
    unlockMaterials: { deed: 1, stake: 2, mallet: 1 },
    obstacles: ['bush', 'rock', 'log'],
    rewardSummary: '+1 storage cap (Silo +20) once all obstacles cleared',
  },
  old_orchard: {
    id: 'old_orchard',
    name: 'Old Orchard',
    emoji: '🍂',
    blurb: 'An abandoned fruit grove. Clear it for more tree slots.',
    unlockLevel: 10,
    unlockCost: 900,
    unlockMaterials: { deed: 1, map: 1, mallet: 1 },
    obstacles: ['stump', 'bush', 'bramble'],
    rewardSummary: '+30 Barn capacity + bonus pear seed',
  },
  river_bend: {
    id: 'river_bend',
    name: 'River Bend',
    emoji: '🐟',
    blurb: 'A reedy bend where bigger fish gather.',
    unlockLevel: 12,
    unlockCost: 1200,
    unlockMaterials: { deed: 1, stake: 3, map: 1 },
    obstacles: ['mud', 'rock', 'log'],
    rewardSummary: '+1 fishing biome unlocked',
  },
  windy_hill: {
    id: 'windy_hill',
    name: 'Windy Hill',
    emoji: '🌬️',
    blurb: 'A breezy hill — perfect for a Weather Tower.',
    unlockLevel: 14,
    unlockCost: 1800,
    unlockMaterials: { deed: 2, mallet: 2 },
    obstacles: ['rock', 'stump'],
    rewardSummary: 'Weather Grid charges regen 25% faster',
  },
  forest_edge: {
    id: 'forest_edge',
    name: 'Forest Edge',
    emoji: '🌲',
    blurb: 'A mossy clearing at the edge of the deep woods.',
    unlockLevel: 16,
    unlockCost: 2500,
    unlockMaterials: { deed: 2, map: 2, mallet: 2 },
    obstacles: ['log', 'bramble', 'stump', 'rock'],
    rewardSummary: 'Unlocks Forest Clearing expedition',
  },
};

const OBSTACLE_TOOL: Record<ObstacleKind, MaterialKey> = {
  bush: 'axe',
  log: 'saw',
  rock: 'pickaxe',
  mud: 'shovel',
  bramble: 'axe',
  stump: 'saw',
};

const OBSTACLE_LABEL: Record<ObstacleKind, string> = {
  bush: 'Bush', log: 'Old Log', rock: 'Rock', mud: 'Muddy Patch', bramble: 'Brambles', stump: 'Stump',
};

const OBSTACLE_EMOJI: Record<ObstacleKind, string> = {
  bush: '🌿', log: '🪵', rock: '🪨', mud: '🟫', bramble: '🥀', stump: '🪵',
};

export function initExpansion(): void {
  if (!state.expansion) {
    state.expansion = { plots: {} };
  }
  for (const id of Object.keys(PLOTS)) {
    if (!state.expansion.plots[id]) {
      const def = PLOTS[id]!;
      const obstacles: PlotObstacle[] = def.obstacles.map((kind, i) => ({
        id: `${id}_ob${i}`, kind, cleared: false,
      }));
      state.expansion.plots[id] = {
        id, status: 'locked', unlockLevel: def.unlockLevel, obstacles,
      };
    }
    // Bump locked plots to "unlockable" once player meets level.
    const p = state.expansion.plots[id]!;
    if (p.status === 'locked' && state.level >= p.unlockLevel) {
      p.status = 'unlockable';
    }
  }
}

export function plotState(id: string): PlotState | null {
  initExpansion();
  return state.expansion!.plots[id] ?? null;
}

/** Pay to unlock a plot. */
export function unlockPlot(id: string): boolean {
  const def = PLOTS[id]; if (!def) return false;
  const p = plotState(id); if (!p) return false;
  if (p.status !== 'unlockable') {
    sfx.error();
    toast(p.status === 'locked' ? `Reach Level ${def.unlockLevel} first.` : 'Plot already unlocked.');
    return false;
  }
  if (state.coins < def.unlockCost) {
    sfx.cantAfford();
    toast(`Need ${def.unlockCost}💰 to unlock.`);
    return false;
  }
  for (const k in def.unlockMaterials) {
    const need = def.unlockMaterials[k as MaterialKey]!;
    if ((state.inv[k] ?? 0) < need) {
      sfx.cantAfford();
      toast(`Need ${need}× ${ITEMS[k]?.name ?? k}.`);
      return false;
    }
  }
  state.coins -= def.unlockCost;
  for (const k in def.unlockMaterials) removeItem(k, def.unlockMaterials[k as MaterialKey]!);
  p.status = 'clearing';
  track('expansion_plot_unlocked', { id });
  toast(`${def.emoji} ${def.name} unlocked! Clear the obstacles to claim it.`, 'gold');
  sfx.bell();
  addJournalEntry({
    id: `plot_unlock_${id}`,
    title: `Unlocked ${def.name}`,
    body: `You bought the deed for ${def.name}. Now you just need to clear ${p.obstacles.length} obstacles.`,
    icon: def.emoji,
  });
  return true;
}

/** Spend a tool to clear one obstacle. Returns true if cleared. */
export function clearObstacle(plotId: string, obstacleId: string): boolean {
  const p = plotState(plotId); if (!p) return false;
  if (p.status !== 'clearing') return false;
  const ob = p.obstacles.find(o => o.id === obstacleId);
  if (!ob || ob.cleared) return false;
  const tool = OBSTACLE_TOOL[ob.kind];
  if ((state.inv[tool] ?? 0) < 1) {
    sfx.error();
    toast(`Need a ${ITEMS[tool]?.name ?? tool} to clear that.`);
    return false;
  }
  removeItem(tool, 1);
  ob.cleared = true;
  // Drop rewards.
  const coins = 40 + randi(80);
  state.coins += coins;
  state.stats.earned += coins;
  const xp = 8 + randi(8);
  addXP(xp);
  // Random small material drop.
  const matPool: MaterialKey[] = ['plank', 'nail', 'rope', 'panel', 'stake'];
  if (Math.random() < 0.55) {
    const m = choice(matPool);
    addItem(m, 1);
  }
  // Weather fragment drop for card fusion.
  if (Math.random() < 0.30) {
    addItem('fragment', 1);
  }
  sfx.coin();
  track('obstacle_cleared', { plotId, kind: ob.kind });
  toast(`${OBSTACLE_EMOJI[ob.kind]} ${OBSTACLE_LABEL[ob.kind]} cleared! +${coins}💰 +${xp}XP`, 'gold');
  // Check completion.
  if (p.obstacles.every(o => o.cleared)) {
    completePlot(plotId);
  }
  return true;
}

/** Flip the `unlocked` flag on every tile whose region id matches the
 *  given plot id. The plot ids in PLOTS match the RegionId enum in
 *  world-data.ts, which lets us do this in one pass. */
function unlockRegionTiles(regionId: RegionId): void {
  for (let gy = 0; gy < GRID_H; gy++) {
    const row = state.grid[gy];
    if (!row) continue;
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = row[gx];
      if (!t) continue;
      if (t.region === regionId) t.unlocked = true;
    }
  }
}

/** Apply tile-state side-effects for any plot that's already marked
 *  unlocked in save data. Called once on game init so the live grid
 *  matches the saved plot statuses. */
export function syncRegionUnlocks(): void {
  const plots = state.expansion?.plots;
  if (!plots) return;
  for (const id of Object.keys(plots)) {
    if (plots[id]!.status === 'unlocked') {
      unlockRegionTiles(id as RegionId);
    }
  }
}

function completePlot(plotId: string): void {
  const def = PLOTS[plotId]!;
  const p = state.expansion!.plots[plotId]!;
  p.status = 'unlocked';
  // Flip every tile in this region to unlocked so the player can
  // start plowing / building there. The visual fog-of-war for the
  // region also reads from `tile.unlocked` and will retract.
  unlockRegionTiles(plotId as RegionId);
  // Apply unlock effects.
  switch (plotId) {
    case 'east_meadow':
      if (state.storage) state.storage.silo.capacity += 20;
      break;
    case 'old_orchard':
      if (state.storage) state.storage.barn.capacity += 30;
      addItem('pear', 3);
      break;
    case 'river_bend':
      // Biome unlock — just signal; biome system reads unlocked state.
      break;
    case 'windy_hill':
      // Weather grid faster regen — handled by weather-grid checking unlocked plots.
      break;
    case 'forest_edge':
      // Forest Clearing expedition unlock — expedition system reads this.
      break;
  }
  track('plot_completed', { plotId });
  toast(`🎉 ${def.name} is yours! ${def.rewardSummary}`, 'gold');
  addJournalEntry({
    id: `plot_done_${plotId}`,
    title: `Claimed ${def.name}`,
    body: `${def.rewardSummary}`,
    icon: def.emoji,
  });
}

/** True if a plot has been fully cleared. */
export function isPlotClaimed(plotId: string): boolean {
  const p = plotState(plotId);
  return !!p && p.status === 'unlocked';
}

/** True if the plot is currently being cleared (some obstacles remain). */
export function isPlotClearing(plotId: string): boolean {
  return plotState(plotId)?.status === 'clearing';
}

export function obstacleTool(kind: ObstacleKind): MaterialKey {
  return OBSTACLE_TOOL[kind];
}
export function obstacleLabel(kind: ObstacleKind): string {
  return OBSTACLE_LABEL[kind];
}
export function obstacleEmoji(kind: ObstacleKind): string {
  return OBSTACLE_EMOJI[kind];
}

export function plotProgress(plotId: string): { done: number; total: number } {
  const p = plotState(plotId);
  if (!p) return { done: 0, total: 0 };
  const done = p.obstacles.filter(o => o.cleared).length;
  return { done, total: p.obstacles.length };
}
