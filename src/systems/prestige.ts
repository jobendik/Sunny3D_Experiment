// =============================================================
//  PRESTIGE — soft seasonal reset. Players can choose to
//  prestige once they meet a level requirement to gain
//  permanent "talent" currency for global perks.
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { GRID_W, GRID_H } from '../constants';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { updateHUD } from '../ui/hud';

export interface PrestigeState {
  prestigeCount: number;
  talents: number;
  perks: Record<string, number>;
  totalLifetimeXP: number;
  totalLifetimeCoins: number;
}

export const PERK_DEFS: Array<{
  id: string;
  name: string;
  desc: string;
  cost: number;
  max: number;
  effect: (rank: number) => number;
}> = [
  { id: 'startCoins',  name: 'Heirloom Wealth',  desc: '+200 starting coins per rank',
    cost: 1, max: 5, effect: r => r * 200 },
  { id: 'xpBoost',     name: 'Quick Learner',    desc: '+5% XP gain per rank',
    cost: 2, max: 4, effect: r => r * 0.05 },
  { id: 'sellBoost',   name: 'Master Merchant',  desc: '+5% sell prices per rank',
    cost: 2, max: 4, effect: r => r * 0.05 },
  { id: 'growthBoost', name: 'Green Thumb',      desc: '+5% crop growth per rank',
    cost: 2, max: 4, effect: r => r * 0.05 },
  { id: 'extraSlot',   name: 'Bigger Grid',      desc: '+1 weather grid slot per rank',
    cost: 3, max: 2, effect: r => r },
  { id: 'startSeeds',  name: 'Founder Seedbag',  desc: '+10 starter wheat seeds per rank',
    cost: 1, max: 3, effect: r => r * 10 },
];

export function initPrestige(): void {
  if (!state.prestige) {
    state.prestige = {
      prestigeCount: 0,
      talents: 0,
      perks: {},
      totalLifetimeXP: 0,
      totalLifetimeCoins: 0,
    };
  }
}

export function canPrestige(): boolean {
  return state.level >= CONFIG.prestige.minLevel;
}

export function previewPrestigeGain(): number {
  if (!canPrestige()) return 0;
  return CONFIG.prestige.talentBonus + (state.level - CONFIG.prestige.minLevel) * CONFIG.prestige.talentPerLevelOverMin;
}

export function doPrestige(): boolean {
  if (!canPrestige()) return false;
  initPrestige();
  const p = state.prestige!;
  const gain = previewPrestigeGain();
  p.prestigeCount += 1;
  p.talents += gain;
  p.totalLifetimeXP += state.xp + state.level * 50;
  p.totalLifetimeCoins += state.coins;

  // Reset the world but keep core meta progress.
  state.coins = 100 + (perkValue('startCoins'));
  state.xp = 0;
  state.level = 1;
  state.day = 1;
  state.startTime = performance.now() / 1000;
  state.inv = { wheat: 5 + perkValue('startSeeds') };
  state.buildings = [];
  state.penAnimals = {};
  state.prodQueues = {};
  state.orders = [];
  state.quests = [];
  state.achievements = {}; // keep them re-earnable for replayability
  state.decor = [];
  state.trees = [];
  state.crows = [];
  state.dog = null;
  state.fishing = null;
  state.penFeed = {};
  state.event = null;
  state.eventCooldown = 0;
  state.weather = 'sunny';
  state.weatherUntil = 0;
  state.season = 'spring';
  state.seasonDay = 1;
  state.stats = {
    harvested: 0, sold: 0, planted: 0, produced: 0, plowed: 0,
    earned: state.coins, animalsOwned: 0, ordersFulfilled: 0, questsDone: 0,
    fishCaught: 0, decorsPlaced: 0, treesGrown: 0, crowsShooed: 0,
    itemsProduced: {},
  };
  // Reset specialization but allow re-pick.
  state.specialization = { primary: null, secondary: null, switches: 0 };
  // Wipe grid
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      state.grid[y]![x] = { type: 'grass', crop: null, plantedAt: 0, watered: false, building: null };
    }
  }
  sfx.levelup();
  toast(`✨ Prestiged! +${gain} talents`, 'gold');
  track('prestige', { count: p.prestigeCount, gain });
  updateHUD();
  return true;
}

export function buyPerk(id: string): boolean {
  initPrestige();
  const p = state.prestige!;
  const def = PERK_DEFS.find(x => x.id === id);
  if (!def) return false;
  const rank = p.perks[id] ?? 0;
  if (rank >= def.max) { toast('Maxed!', 'error'); sfx.error(); return false; }
  const cost = def.cost * (rank + 1);
  if (p.talents < cost) { toast('Not enough talents!', 'error'); sfx.error(); return false; }
  p.talents -= cost;
  p.perks[id] = rank + 1;
  sfx.bell();
  toast(`Unlocked ${def.name} (Rank ${rank + 1})`, 'gold');
  track('perk_bought', { perk: id, rank: rank + 1 });
  updateHUD();
  return true;
}

export function perkValue(id: string): number {
  const p = state.prestige;
  if (!p) return 0;
  const rank = p.perks[id] ?? 0;
  const def = PERK_DEFS.find(x => x.id === id);
  if (!def) return 0;
  return def.effect(rank);
}
