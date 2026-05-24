// =============================================================
//  COUNTY FAIR -- monthly featured live-ops event.
//
//  The fair opens for the first ten local days of each 28-day
//  month. A category rotates monthly; players submit one item and
//  claim a ribbon reward based on the judged score.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGERS, itemCategory } from '../data/characters';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type {
  CountyFairCategory,
  CountyFairRibbon,
  CountyFairRoot,
  FeaturedLeaderboardEntry,
} from '../types';

interface FairReward {
  coins: number;
  xp: number;
  itemKey?: string;
  qty?: number;
}

export const FAIR_CATEGORY_LABELS: Record<CountyFairCategory, string> = {
  crop: 'Field Crops',
  animal: 'Animal Goods',
  bake: 'Bakery Basket',
  fish: 'Lake Catch',
  fruit: 'Orchard Fruit',
};

const CATEGORY_ORDER: CountyFairCategory[] = ['crop', 'animal', 'bake', 'fish', 'fruit'];
const FAIR_LENGTH_DAYS = 10;
const FAIR_MONTH_DAYS = 28;

const RIBBON_REWARDS: Record<CountyFairRibbon, FairReward> = {
  none: { coins: 40, xp: 8 },
  bronze: { coins: 180, xp: 32, itemKey: 'token', qty: 2 },
  silver: { coins: 360, xp: 60, itemKey: 'screw', qty: 1 },
  gold: { coins: 680, xp: 95, itemKey: 'paint', qty: 1 },
  blue: { coins: 1200, xp: 150, itemKey: 'deed', qty: 1 },
};

function currentMonthIndex(): number {
  return Math.floor(localDayIndex() / FAIR_MONTH_DAYS);
}

function dayInFairMonth(): number {
  const d = localDayIndex();
  return ((d % FAIR_MONTH_DAYS) + FAIR_MONTH_DAYS) % FAIR_MONTH_DAYS;
}

function categoryForMonth(month: number): CountyFairCategory {
  return CATEGORY_ORDER[((month % CATEGORY_ORDER.length) + CATEGORY_ORDER.length) % CATEGORY_ORDER.length]!;
}

function peerScores(month: number, category: CountyFairCategory): FeaturedLeaderboardEntry[] {
  const ids = category === 'fish'
    ? ['finn', 'milo', 'hazel', 'bruno']
    : category === 'animal'
      ? ['daisy', 'emma', 'willow', 'maple']
      : ['maple', 'emma', 'willow', 'hazel'];
  return ids.map((id, idx) => {
    const v = VILLAGERS[id]!;
    return {
      id: `fair-${id}`,
      name: v.name,
      emoji: v.emoji,
      points: 90 + idx * 48 + ((month * 31 + idx * 17 + state.level * 9) % 74),
    };
  });
}

function createRoot(month = currentMonthIndex()): CountyFairRoot {
  const category = categoryForMonth(month);
  return {
    monthIndex: month,
    category,
    submitted: null,
    rewardClaimed: false,
    peerScores: peerScores(month, category),
  };
}

export function initCountyFair(): void {
  if (!state.countyFair) {
    state.countyFair = createRoot();
  }
  tickCountyFair();
}

export function tickCountyFair(): void {
  const month = currentMonthIndex();
  if (!state.countyFair || state.countyFair.monthIndex !== month) {
    state.countyFair = createRoot(month);
    track('county_fair_started', { month, category: state.countyFair.category });
  }
}

export function countyFairActive(): boolean {
  initCountyFair();
  return state.level >= 8 && dayInFairMonth() < FAIR_LENGTH_DAYS;
}

export function countyFairDaysLeft(): number {
  if (!countyFairActive()) return 0;
  return FAIR_LENGTH_DAYS - dayInFairMonth();
}

export function countyFairDaysUntilNext(): number {
  const day = dayInFairMonth();
  if (day < FAIR_LENGTH_DAYS) return 0;
  return FAIR_MONTH_DAYS - day;
}

export function countyFairEligibleItems(): Array<{ itemKey: string; qty: number; score: number }> {
  initCountyFair();
  const fair = state.countyFair!;
  const out: Array<{ itemKey: string; qty: number; score: number }> = [];
  for (const [itemKey, qty] of Object.entries(state.inv)) {
    if (qty <= 0) continue;
    if (itemCategory(itemKey) !== fair.category) continue;
    out.push({ itemKey, qty, score: scoreItem(itemKey) });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function scoreItem(itemKey: string): number {
  const item = ITEMS[itemKey];
  if (!item) return 0;
  const month = state.countyFair?.monthIndex ?? currentMonthIndex();
  const jitter = (month * 23 + itemKey.length * 13 + state.level * 7) % 36;
  const levelBonus = Math.max(0, state.level - item.level) * 8;
  return Math.max(10, item.sell * 4 + item.level * 12 + levelBonus + jitter);
}

function ribbonForScore(score: number): CountyFairRibbon {
  if (score >= 560) return 'blue';
  if (score >= 340) return 'gold';
  if (score >= 190) return 'silver';
  if (score >= 80) return 'bronze';
  return 'none';
}

export function submitCountyFairItem(itemKey: string): boolean {
  initCountyFair();
  const fair = state.countyFair!;
  if (!countyFairActive() || fair.submitted) return false;
  if ((state.inv[itemKey] ?? 0) <= 0) {
    sfx.error();
    toast('That item is no longer in the barn.');
    return false;
  }
  if (itemCategory(itemKey) !== fair.category) {
    sfx.error();
    toast('That item does not match this fair category.');
    return false;
  }
  removeItem(itemKey, 1);
  const score = scoreItem(itemKey);
  const ribbon = ribbonForScore(score);
  fair.submitted = {
    itemKey,
    score,
    ribbon,
    submittedDay: localDayIndex(),
  };
  fair.rewardClaimed = false;
  sfx.bell();
  toast(`County Fair judged ${ITEMS[itemKey]?.name ?? itemKey}: ${score} pts`, 'gold');
  track('county_fair_submitted', { itemKey, score, ribbon });
  return true;
}

function grantItem(itemKey: string | undefined, qty = 1): void {
  if (!itemKey || qty <= 0) return;
  addItem(itemKey, qty);
  if (itemKey === 'token' && state.liveEvent) {
    state.liveEvent.tokens += qty;
  }
}

export function claimCountyFairReward(): boolean {
  initCountyFair();
  const fair = state.countyFair!;
  if (!fair.submitted || fair.rewardClaimed) return false;
  const reward = RIBBON_REWARDS[fair.submitted.ribbon];
  fair.rewardClaimed = true;
  state.coins += reward.coins;
  state.stats.earned += reward.coins;
  addXP(reward.xp);
  grantItem(reward.itemKey, reward.qty ?? 1);
  sfx.coin();
  toast(`County Fair ${fair.submitted.ribbon} ribbon reward claimed!`, 'gold');
  track('county_fair_reward_claimed', { ribbon: fair.submitted.ribbon });
  return true;
}

export function countyFairRewardFor(ribbon: CountyFairRibbon): FairReward {
  return RIBBON_REWARDS[ribbon];
}

export function countyFairLeaderboard(): FeaturedLeaderboardEntry[] {
  initCountyFair();
  const fair = state.countyFair!;
  const player = fair.submitted
    ? [{
      id: 'player',
      name: state.farmName || 'Your Farm',
      emoji: '\u{1F3E1}',
      points: fair.submitted.score,
      isPlayer: true,
    } satisfies FeaturedLeaderboardEntry]
    : [];
  return [...player, ...fair.peerScores].sort((a, b) => b.points - a.points);
}

export function countyFairHasAttention(): boolean {
  initCountyFair();
  const fair = state.countyFair!;
  return countyFairActive() && !!fair.submitted && !fair.rewardClaimed;
}

export function countyFairRibbonLabel(ribbon: CountyFairRibbon): string {
  switch (ribbon) {
    case 'blue': return 'Blue Ribbon';
    case 'gold': return 'Gold Ribbon';
    case 'silver': return 'Silver Ribbon';
    case 'bronze': return 'Bronze Ribbon';
    default: return 'Participation Ribbon';
  }
}
