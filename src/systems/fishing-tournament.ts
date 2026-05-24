// =============================================================
//  FISHING TOURNAMENT -- weekly featured live-ops leaderboard.
//
//  Existing fishing catches feed this system through recordEventAction.
//  Points scale with fish value and weight, while a simulated peer
//  leaderboard keeps the week feeling social without a backend.
// =============================================================

import { state } from '../state';
import { FISH } from '../data/fish';
import { ITEMS } from '../data/items';
import { VILLAGERS } from '../data/characters';
import { addItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { FeaturedLeaderboardEntry, FishingTournamentRoot } from '../types';

interface TournamentReward {
  points: number;
  label: string;
  coins: number;
  xp: number;
  itemKey?: string;
  qty?: number;
}

export const FISHING_TOURNAMENT_REWARDS: TournamentReward[] = [
  { points: 120, label: 'Bronze Tackle Box', coins: 180, xp: 35, itemKey: 'worm', qty: 4 },
  { points: 260, label: 'Silver Creel', coins: 420, xp: 70, itemKey: 'fly', qty: 2 },
  { points: 500, label: 'Gold Dock Chest', coins: 900, xp: 130, itemKey: 'lure', qty: 1 },
];

function currentWeekIndex(): number {
  return Math.floor(localDayIndex() / 7);
}

function dayOfWeek(): number {
  const d = localDayIndex();
  return ((d % 7) + 7) % 7;
}

function makeLeaderboard(week: number): FeaturedLeaderboardEntry[] {
  const ids = ['finn', 'milo', 'hazel', 'willow', 'bruno'];
  return ids.map((id, idx) => {
    const v = VILLAGERS[id]!;
    return {
      id: `fish-${id}`,
      name: v.name,
      emoji: v.emoji,
      points: 100 + idx * 55 + ((week * 41 + idx * 29 + state.level * 5) % 95),
    };
  });
}

function createRoot(week = currentWeekIndex()): FishingTournamentRoot {
  return {
    weekIndex: week,
    points: 0,
    catches: 0,
    heaviest: 0,
    rewardsClaimed: [],
    leaderboard: makeLeaderboard(week),
  };
}

export function initFishingTournament(): void {
  if (!state.fishingTournament) {
    state.fishingTournament = createRoot();
  }
  tickFishingTournament();
}

export function tickFishingTournament(): void {
  const week = currentWeekIndex();
  if (!state.fishingTournament || state.fishingTournament.weekIndex !== week) {
    state.fishingTournament = createRoot(week);
    track('fishing_tournament_started', { week });
  }
}

export function fishingTournamentActive(): boolean {
  initFishingTournament();
  return state.level >= 8;
}

export function fishingTournamentDaysLeft(): number {
  return 7 - dayOfWeek();
}

function catchPoints(itemKey?: string): number {
  const fish = itemKey ? FISH[itemKey] : null;
  if (!fish) return 18;
  return Math.max(15, Math.round(fish.weight + fish.sell / 8 + fish.xp * 2));
}

export function recordFishingTournamentAction(actionId: string, itemKey?: string, qty = 1): void {
  initFishingTournament();
  if (!fishingTournamentActive()) return;
  if (actionId !== 'fish_caught') return;
  const tourney = state.fishingTournament!;
  const n = Math.max(1, qty);
  const pts = catchPoints(itemKey) * n;
  tourney.points += pts;
  tourney.catches += n;
  if (itemKey && FISH[itemKey]) {
    tourney.heaviest = Math.max(tourney.heaviest, FISH[itemKey]!.weight);
  }
  track('fishing_tournament_points', { itemKey: itemKey ?? '', pts });
}

function grantItem(itemKey: string | undefined, qty = 1): void {
  if (!itemKey || qty <= 0) return;
  addItem(itemKey, qty);
  if (itemKey === 'token' && state.liveEvent) {
    state.liveEvent.tokens += qty;
  }
}

export function claimFishingTournamentReward(idx: number): boolean {
  initFishingTournament();
  const tourney = state.fishingTournament!;
  const reward = FISHING_TOURNAMENT_REWARDS[idx];
  if (!reward) return false;
  if (tourney.rewardsClaimed.includes(idx) || tourney.points < reward.points) return false;
  tourney.rewardsClaimed.push(idx);
  state.coins += reward.coins;
  state.stats.earned += reward.coins;
  addXP(reward.xp);
  grantItem(reward.itemKey, reward.qty ?? 1);
  sfx.coin();
  toast(`Fishing Tournament: ${reward.label} claimed`, 'gold');
  track('fishing_tournament_reward_claimed', { idx, points: reward.points });
  return true;
}

export function fishingTournamentProgressPct(): number {
  initFishingTournament();
  const last = FISHING_TOURNAMENT_REWARDS[FISHING_TOURNAMENT_REWARDS.length - 1]?.points ?? 1;
  return Math.min(100, (state.fishingTournament!.points / last) * 100);
}

export function fishingTournamentHasAttention(): boolean {
  initFishingTournament();
  if (!fishingTournamentActive()) return false;
  const tourney = state.fishingTournament!;
  return FISHING_TOURNAMENT_REWARDS.some(
    (r, i) => tourney.points >= r.points && !tourney.rewardsClaimed.includes(i),
  );
}

export function fishingTournamentLeaderboard(): FeaturedLeaderboardEntry[] {
  initFishingTournament();
  const tourney = state.fishingTournament!;
  const player: FeaturedLeaderboardEntry = {
    id: 'player',
    name: state.farmName || 'Your Farm',
    emoji: '\u{1F3E1}',
    points: tourney.points,
    isPlayer: true,
  };
  return [player, ...tourney.leaderboard].sort((a, b) => b.points - a.points);
}

export function fishName(itemKey?: string): string {
  if (!itemKey) return 'fish';
  return ITEMS[itemKey]?.name ?? itemKey;
}
