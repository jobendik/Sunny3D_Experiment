// =============================================================
//  COUNTRY CAMPING -- seasonal featured live-ops story arc.
//
//  A 28-day season with four weekly chapters. Ordinary farm actions
//  add camp points; chapters unlock week-by-week and grant narrative
//  rewards once the point threshold is met.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { CampingChapterState, CountryCampingRoot } from '../types';

const SEASON_DAYS = 28;

export const CAMPING_CHAPTERS: CampingChapterState[] = [
  {
    id: 'trailhead',
    title: 'Trailhead Breakfast',
    body: 'The first campfire is lit. Bring steady harvests and simple supplies.',
    threshold: 60,
    rewardCoins: 180,
    rewardXp: 32,
    rewardItem: 'worm',
    rewardQty: 3,
  },
  {
    id: 'riverbend',
    title: 'Riverbend Night',
    body: 'The campsite moves toward the water. Fish and animal goods keep spirits high.',
    threshold: 145,
    rewardCoins: 360,
    rewardXp: 64,
    rewardItem: 'rope',
    rewardQty: 1,
  },
  {
    id: 'stormwatch',
    title: 'Stormwatch Shelter',
    body: 'Clouds gather above the ridge. Weather cards and crafted goods hold the camp together.',
    threshold: 255,
    rewardCoins: 700,
    rewardXp: 105,
    rewardItem: 'tarp',
    rewardQty: 1,
  },
  {
    id: 'sunrise',
    title: 'Sunrise Sendoff',
    body: 'The final morning arrives with warm bread, packed crates, and a clear sky.',
    threshold: 390,
    rewardCoins: 1150,
    rewardXp: 160,
    rewardItem: 'map',
    rewardQty: 1,
  },
];

function currentSeasonIndex(): number {
  return Math.floor(localDayIndex() / SEASON_DAYS);
}

function dayInSeason(): number {
  const d = localDayIndex();
  return ((d % SEASON_DAYS) + SEASON_DAYS) % SEASON_DAYS;
}

function createRoot(season = currentSeasonIndex()): CountryCampingRoot {
  return {
    seasonIndex: season,
    points: 0,
    claimedChapters: [],
    journal: [],
  };
}

export function initCountryCamping(): void {
  if (!state.countryCamping) {
    state.countryCamping = createRoot();
  }
  tickCountryCamping();
}

export function tickCountryCamping(): void {
  const season = currentSeasonIndex();
  if (!state.countryCamping || state.countryCamping.seasonIndex !== season) {
    state.countryCamping = createRoot(season);
    track('country_camping_started', { season });
  }
}

export function countryCampingActive(): boolean {
  initCountryCamping();
  return state.level >= 8;
}

export function campingChapterIndex(): number {
  return Math.min(3, Math.floor(dayInSeason() / 7));
}

export function campingDaysLeft(): number {
  return SEASON_DAYS - dayInSeason();
}

function pointsForAction(actionId: string, qty: number): number {
  switch (actionId) {
    case 'harvest': return Math.max(1, qty);
    case 'produce': return 3 * Math.max(1, qty);
    case 'animal_produce': return 2 * Math.max(1, qty);
    case 'fish_caught': return 5 * Math.max(1, qty);
    case 'order_contains': return 2 * Math.max(1, qty);
    case 'card_cast': return 9 * Math.max(1, qty);
    case 'balloon_served': return 18 * Math.max(1, qty);
    default: return 0;
  }
}

export function recordCountryCampingAction(actionId: string, _itemKey?: string, qty = 1): void {
  initCountryCamping();
  if (!countryCampingActive()) return;
  const pts = pointsForAction(actionId, qty);
  if (pts <= 0) return;
  state.countryCamping!.points += pts;
  track('country_camping_points', { actionId, pts });
}

function grantItem(itemKey: string | undefined, qty = 1): void {
  if (!itemKey || qty <= 0) return;
  addItem(itemKey, qty);
  if (itemKey === 'token' && state.liveEvent) {
    state.liveEvent.tokens += qty;
  }
}

export function claimCampingChapter(idx: number): boolean {
  initCountryCamping();
  const camp = state.countryCamping!;
  const chapter = CAMPING_CHAPTERS[idx];
  if (!chapter) return false;
  if (idx > campingChapterIndex()) return false;
  if (camp.claimedChapters.includes(idx)) return false;
  if (camp.points < chapter.threshold) return false;
  camp.claimedChapters.push(idx);
  camp.journal.push(chapter.id);
  state.coins += chapter.rewardCoins;
  state.stats.earned += chapter.rewardCoins;
  addXP(chapter.rewardXp);
  grantItem(chapter.rewardItem, chapter.rewardQty ?? 1);
  sfx.bell();
  toast(`Country Camping: ${chapter.title} complete`, 'gold');
  track('country_camping_chapter_claimed', { idx, id: chapter.id });
  return true;
}

export function countryCampingProgressPct(): number {
  initCountryCamping();
  const last = CAMPING_CHAPTERS[CAMPING_CHAPTERS.length - 1]?.threshold ?? 1;
  return Math.min(100, (state.countryCamping!.points / last) * 100);
}

export function countryCampingHasAttention(): boolean {
  initCountryCamping();
  if (!countryCampingActive()) return false;
  const camp = state.countryCamping!;
  return CAMPING_CHAPTERS.some((chapter, idx) =>
    idx <= campingChapterIndex()
    && camp.points >= chapter.threshold
    && !camp.claimedChapters.includes(idx),
  );
}

export function campingRewardText(chapter: CampingChapterState): string {
  const item = chapter.rewardItem ? ITEMS[chapter.rewardItem]?.name ?? chapter.rewardItem : '';
  const itemPart = item ? `, ${chapter.rewardQty ?? 1}x ${item}` : '';
  return `${chapter.rewardCoins} coins, ${chapter.rewardXp} XP${itemPart}`;
}
