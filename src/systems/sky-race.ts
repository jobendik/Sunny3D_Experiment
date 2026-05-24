// =============================================================
//  SKY RACE -- weekly featured live-ops event.
//
//  A task ladder built around balloon service and other high-signal
//  farm actions. Tasks award race points; point milestones award the
//  larger crates. The event resets on the local weekly boundary.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGERS } from '../data/characters';
import { addItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { FeaturedEventAction, FeaturedLeaderboardEntry, SkyRaceRoot, SkyRaceTask } from '../types';

interface SkyRaceTaskTemplate {
  id: string;
  label: string;
  actionId: FeaturedEventAction;
  itemKey?: string;
  target: number;
  points: number;
  rewardCoins: number;
  rewardXp: number;
  rewardItem?: string;
  rewardQty?: number;
}

interface SkyRaceMilestone {
  points: number;
  label: string;
  coins: number;
  xp: number;
  itemKey?: string;
  qty?: number;
}

const TASKS: SkyRaceTaskTemplate[] = [
  {
    id: 'balloon-captain',
    label: 'Serve a Hot-Air Balloon',
    actionId: 'balloon_served',
    target: 1,
    points: 55,
    rewardCoins: 320,
    rewardXp: 45,
    rewardItem: 'fragment',
    rewardQty: 1,
  },
  {
    id: 'crate-runner',
    label: 'Load items into customer orders',
    actionId: 'order_contains',
    target: 10,
    points: 35,
    rewardCoins: 180,
    rewardXp: 30,
    rewardItem: 'token',
    rewardQty: 3,
  },
  {
    id: 'field-wind',
    label: 'Harvest crops for race fuel',
    actionId: 'harvest',
    target: 45,
    points: 25,
    rewardCoins: 140,
    rewardXp: 24,
    rewardItem: 'fertilizer',
    rewardQty: 2,
  },
  {
    id: 'bakery-clouds',
    label: 'Finish production jobs',
    actionId: 'produce',
    target: 12,
    points: 35,
    rewardCoins: 210,
    rewardXp: 34,
    rewardItem: 'speedup',
    rewardQty: 1,
  },
  {
    id: 'ranch-crew',
    label: 'Collect animal goods',
    actionId: 'animal_produce',
    target: 10,
    points: 30,
    rewardCoins: 180,
    rewardXp: 28,
    rewardItem: 'feed',
    rewardQty: 3,
  },
];

export const SKY_RACE_MILESTONES: SkyRaceMilestone[] = [
  { points: 60, label: 'Bronze Propeller Crate', coins: 220, xp: 35, itemKey: 'token', qty: 4 },
  { points: 120, label: 'Silver Tailwind Crate', coins: 520, xp: 75, itemKey: 'rope', qty: 1 },
  { points: 200, label: 'Gold Cloudline Crate', coins: 950, xp: 130, itemKey: 'paint', qty: 1 },
];

function currentWeekIndex(): number {
  return Math.floor(localDayIndex() / 7);
}

function dayOfWeek(): number {
  const d = localDayIndex();
  return ((d % 7) + 7) % 7;
}

function createTasks(): SkyRaceTask[] {
  return TASKS.map(t => ({
    ...t,
    progress: 0,
    claimed: false,
  }));
}

function peerScore(week: number, idx: number): number {
  const base = 50 + idx * 28;
  const wobble = (week * 37 + idx * 23 + state.level * 11) % 70;
  return base + wobble;
}

function makeLeaderboard(week: number): FeaturedLeaderboardEntry[] {
  const ids = ['bruno', 'hazel', 'finn', 'emma', 'maple'];
  return ids.map((id, idx) => {
    const v = VILLAGERS[id]!;
    return {
      id: `sky-${id}`,
      name: v.name,
      emoji: v.emoji,
      points: peerScore(week, idx),
    };
  });
}

function createRoot(week = currentWeekIndex()): SkyRaceRoot {
  return {
    weekIndex: week,
    points: 0,
    tasks: createTasks(),
    rewardsClaimed: [],
    leaderboard: makeLeaderboard(week),
  };
}

export function initSkyRace(): void {
  if (!state.skyRace) {
    state.skyRace = createRoot();
  }
  tickSkyRace();
}

export function tickSkyRace(): void {
  const week = currentWeekIndex();
  if (!state.skyRace || state.skyRace.weekIndex !== week) {
    state.skyRace = createRoot(week);
    track('sky_race_started', { week });
  }
}

export function skyRaceActive(): boolean {
  initSkyRace();
  return state.level >= 8;
}

export function skyRaceDaysLeft(): number {
  return 7 - dayOfWeek();
}

export function recordSkyRaceAction(actionId: string, itemKey?: string, qty = 1): void {
  initSkyRace();
  if (!skyRaceActive()) return;
  const race = state.skyRace!;
  let moved = false;
  for (const task of race.tasks) {
    if (task.claimed) continue;
    if (task.actionId !== actionId) continue;
    if (task.itemKey && task.itemKey !== itemKey) continue;
    const before = task.progress;
    task.progress = Math.min(task.target, task.progress + Math.max(1, qty));
    if (task.progress !== before) moved = true;
  }
  if (moved) track('sky_race_progress', { actionId, qty });
}

function grantItem(itemKey: string | undefined, qty = 1): void {
  if (!itemKey || qty <= 0) return;
  addItem(itemKey, qty);
  if (itemKey === 'token' && state.liveEvent) {
    state.liveEvent.tokens += qty;
  }
}

export function claimSkyRaceTask(taskId: string): boolean {
  initSkyRace();
  const race = state.skyRace!;
  const task = race.tasks.find(t => t.id === taskId);
  if (!task || task.claimed || task.progress < task.target) return false;
  task.claimed = true;
  race.points += task.points;
  state.coins += task.rewardCoins;
  state.stats.earned += task.rewardCoins;
  addXP(task.rewardXp);
  grantItem(task.rewardItem, task.rewardQty ?? 1);
  sfx.coin();
  toast(`Sky Race: ${task.label} complete (+${task.points} pts)`, 'gold');
  track('sky_race_task_claimed', { taskId, points: task.points });
  return true;
}

export function claimSkyRaceMilestone(idx: number): boolean {
  initSkyRace();
  const race = state.skyRace!;
  const reward = SKY_RACE_MILESTONES[idx];
  if (!reward) return false;
  if (race.rewardsClaimed.includes(idx) || race.points < reward.points) return false;
  race.rewardsClaimed.push(idx);
  state.coins += reward.coins;
  state.stats.earned += reward.coins;
  addXP(reward.xp);
  grantItem(reward.itemKey, reward.qty ?? 1);
  sfx.bell();
  sfx.coin();
  toast(`Sky Race: ${reward.label} claimed!`, 'gold');
  track('sky_race_milestone_claimed', { idx, points: reward.points });
  return true;
}

export function skyRaceProgressPct(): number {
  initSkyRace();
  const last = SKY_RACE_MILESTONES[SKY_RACE_MILESTONES.length - 1]?.points ?? 1;
  return Math.min(100, (state.skyRace!.points / last) * 100);
}

export function skyRaceHasAttention(): boolean {
  initSkyRace();
  if (!skyRaceActive()) return false;
  const race = state.skyRace!;
  if (race.tasks.some(t => !t.claimed && t.progress >= t.target)) return true;
  return SKY_RACE_MILESTONES.some((m, i) => race.points >= m.points && !race.rewardsClaimed.includes(i));
}

export function skyRaceLeaderboard(): FeaturedLeaderboardEntry[] {
  initSkyRace();
  const race = state.skyRace!;
  const player: FeaturedLeaderboardEntry = {
    id: 'player',
    name: state.farmName || 'Your Farm',
    emoji: '\u{1F3E1}',
    points: race.points,
    isPlayer: true,
  };
  return [player, ...race.leaderboard]
    .sort((a, b) => b.points - a.points)
    .map((e, idx) => ({ ...e, points: e.points + (e.isPlayer ? 0 : Math.min(20, idx * 3)) }));
}

export function skyRaceTaskRewardText(task: SkyRaceTask): string {
  const item = task.rewardItem ? ITEMS[task.rewardItem]?.name ?? task.rewardItem : '';
  const itemPart = item ? `, ${task.rewardQty ?? 1}x ${item}` : '';
  return `${task.points} pts, ${task.rewardCoins} coins, ${task.rewardXp} XP${itemPart}`;
}
