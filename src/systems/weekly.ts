// =============================================================
//  WEEKLY SYSTEM — milestone XP ladder, themed event, and
//  a "community" target (single-player simulated peer load).
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { rand, randi, choice } from '../utils';
import { addXP } from './xp';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import type { WeeklyState, WeeklyTheme } from '../types';

const THEMES: WeeklyTheme[] = [
  { id: 'orchard',   name: 'Orchard Week',    icon: '🍎', focus: 'orchard' },
  { id: 'fishing',   name: 'Fishing Festival',icon: '🎣', focus: 'fish' },
  { id: 'baking',    name: 'Baking Bonanza',  icon: '🥐', focus: 'bakery' },
  { id: 'ranching',  name: 'Ranchers Week',   icon: '🐮', focus: 'pen' },
  { id: 'harvest',   name: 'Harvest Hustle',  icon: '🌽', focus: 'crop' },
  { id: 'craft',     name: 'Craft Carnival',  icon: '🧵', focus: 'craft' },
];

export function weekIndex(now = Date.now()): number {
  // ISO-week-ish: weeks since 1970 epoch / 7 days.
  return Math.floor(now / (7 * 86400000));
}

export function initWeekly(): void {
  if (!state.weekly) {
    state.weekly = createInitialWeekly();
  }
  weeklyTick();
}

function createInitialWeekly(): WeeklyState {
  return {
    week: weekIndex(),
    points: 0,
    tier: 0,
    themeIdx: 0,
    claimedTiers: [],
    communityTarget: 5000,
    communityProgress: 0,
    communityClaimed: false,
  };
}

export function weeklyTick(): void {
  if (!state.weekly) return;
  const wk = weekIndex();
  if (state.weekly.week !== wk) {
    track('weekly_rollover', { old: state.weekly.week, lost: state.weekly.points });
    state.weekly = {
      week: wk,
      points: 0,
      tier: 0,
      themeIdx: (state.weekly.themeIdx + 1) % THEMES.length,
      claimedTiers: [],
      communityTarget: 4000 + randi(4000) + state.level * 250,
      communityProgress: 0,
      communityClaimed: false,
    };
  }
  // Update tier based on points
  const w = state.weekly;
  for (let i = 0; i < CONFIG.weekly.pointsForLevel.length; i++) {
    if (w.points >= CONFIG.weekly.pointsForLevel[i]!) w.tier = i;
  }
}

export function currentTheme(): WeeklyTheme {
  if (!state.weekly) return THEMES[0]!;
  return THEMES[state.weekly.themeIdx % THEMES.length]!;
}

export function addWeeklyPoints(pts: number, source: string): void {
  if (!state.weekly) return;
  state.weekly.points += pts;
  // Theme bonus: 25% bonus when source matches theme focus.
  const t = currentTheme();
  if (source === t.focus) {
    state.weekly.points += Math.floor(pts * 0.25);
  }
  // Community contribution (simulated peers do most of the work, you contribute too)
  state.weekly.communityProgress += pts * 4 + Math.floor(rand(8));
  weeklyTick();
  track('weekly_points', { pts, source });
}

export function claimWeeklyTier(tier: number): boolean {
  const w = state.weekly!;
  if (tier > w.tier) return false;
  if (w.claimedTiers.includes(tier)) return false;
  const r = CONFIG.weekly.rewardEveryTier;
  const coins = r.coins * (tier + 1);
  const xp = r.xp * (tier + 1);
  state.coins += coins;
  state.stats.earned += coins;
  addXP(xp);
  w.claimedTiers.push(tier);
  sfx.coin(); sfx.bell();
  toast(`Weekly Tier ${tier + 1}! +${coins}💰 +${xp}XP`, 'gold');
  track('weekly_tier_claimed', { tier });
  updateHUD();
  return true;
}

export function communityComplete(): boolean {
  const w = state.weekly!;
  return w.communityProgress >= w.communityTarget;
}

export function claimCommunityReward(): boolean {
  const w = state.weekly!;
  if (!communityComplete() || w.communityClaimed) return false;
  const coins = 500 + state.level * 50;
  const xp = 40 + state.level * 5;
  state.coins += coins;
  state.stats.earned += coins;
  addXP(xp);
  w.communityClaimed = true;
  sfx.bell(); sfx.coin();
  toast(`Community goal! +${coins}💰 +${xp}XP`, 'gold');
  track('community_claimed', { coins, xp });
  updateHUD();
  return true;
}
