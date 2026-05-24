// =============================================================
//  FRIENDSHIP — Phase 8 of the roadmap. Each recurring villager
//  has a friendship level that grows when you deliver to them,
//  buy/sell with them, and help with their requests. Higher
//  friendship unlocks daily gifts and bonus rewards.
// =============================================================

import { state } from '../state';
import { VILLAGERS, VILLAGER_IDS } from '../data/characters';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { track } from './telemetry';
import { randi, choice } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import type { FriendshipEntry, MaterialKey } from '../types';

const GIFT_MATERIALS: MaterialKey[] = ['plank', 'nail', 'screw', 'panel', 'bolt', 'rope', 'stake', 'mallet'];
export const FRIENDSHIP_DAILY_GIFT_CAP = 4;

export function initFriendship(): void {
  if (!state.friendship) {
    state.friendship = { byNeighbor: {}, giftsClaimedToday: 0, lastGiftCapDay: state.day };
  }
  state.friendship.giftsClaimedToday = state.friendship.giftsClaimedToday ?? 0;
  state.friendship.lastGiftCapDay = state.friendship.lastGiftCapDay ?? state.day;
  resetGiftCapIfNeeded();
  for (const id of VILLAGER_IDS) {
    if (!state.friendship.byNeighbor[id]) {
      state.friendship.byNeighbor[id] = {
        level: 1, xp: 0, lastGiftDay: 0, totalDeliveries: 0,
      };
    }
  }
}

function resetGiftCapIfNeeded(): void {
  if (!state.friendship) return;
  if (state.friendship.lastGiftCapDay === state.day) return;
  state.friendship.lastGiftCapDay = state.day;
  state.friendship.giftsClaimedToday = 0;
}

function entry(id: string): FriendshipEntry {
  initFriendship();
  return state.friendship!.byNeighbor[id]!;
}

/** XP curve — small numbers, gentle ramp. */
function xpForLevel(level: number): number {
  return 30 + level * 25;
}

/** Bump friendship XP, level up if needed. */
export function bumpFriendship(neighborId: string, amount: number): void {
  if (!VILLAGERS[neighborId]) return;
  const e = entry(neighborId);
  e.xp += amount;
  while (e.xp >= xpForLevel(e.level)) {
    e.xp -= xpForLevel(e.level);
    e.level += 1;
    const v = VILLAGERS[neighborId]!;
    track('friendship_level_up', { id: neighborId, level: e.level });
    toast(`${v.emoji} You and ${v.name} are now friendship level ${e.level}!`, 'gold');
  }
}

export function trackDelivery(neighborId: string): void {
  if (!VILLAGERS[neighborId]) return;
  const e = entry(neighborId);
  e.totalDeliveries += 1;
  bumpFriendship(neighborId, 18);
}

export function friendshipLevel(neighborId: string): number {
  return entry(neighborId).level;
}

export function friendshipXp(neighborId: string): number {
  return entry(neighborId).xp;
}

export function friendshipNeedForNext(neighborId: string): number {
  return xpForLevel(entry(neighborId).level);
}

/** Heart string for display: ❤️ x level (max 5 hearts shown). */
export function friendshipHearts(neighborId: string): string {
  const lvl = friendshipLevel(neighborId);
  const shown = Math.min(5, lvl);
  return '❤️'.repeat(shown);
}

export function canClaimDailyGift(neighborId: string): boolean {
  resetGiftCapIfNeeded();
  if ((state.friendship?.giftsClaimedToday ?? 0) >= FRIENDSHIP_DAILY_GIFT_CAP) return false;
  const e = entry(neighborId);
  return e.level >= 2 && e.lastGiftDay !== state.day;
}

export function friendshipGiftsRemainingToday(): number {
  initFriendship();
  return Math.max(0, FRIENDSHIP_DAILY_GIFT_CAP - (state.friendship!.giftsClaimedToday ?? 0));
}

/** Claim a daily gift. Higher friendship => better odds at materials. */
export function claimDailyGift(neighborId: string): boolean {
  if (!canClaimDailyGift(neighborId)) return false;
  const e = entry(neighborId);
  e.lastGiftDay = state.day;
  state.friendship!.giftsClaimedToday = (state.friendship!.giftsClaimedToday ?? 0) + 1;
  const v = VILLAGERS[neighborId]!;
  const lvl = e.level;
  // Build a small loot bundle that scales with friendship.
  const coins = 30 + lvl * 20 + randi(40);
  state.coins += coins;
  state.stats.earned += coins;
  // Pick an item gift — bias toward materials at lvl 3+.
  let giftLabel = '';
  if (lvl >= 3 && Math.random() < 0.4) {
    const mat = choice(GIFT_MATERIALS);
    addItem(mat, 1);
    giftLabel = ` + 1 ${ITEMS[mat]?.name ?? mat}`;
  } else {
    // Pick a small consumable that fits this villager's vibe.
    const consumables = ['feed', 'fertilizer', 'worm', 'fly'].filter(k => ITEMS[k] && ITEMS[k]!.level <= state.level);
    if (consumables.length > 0) {
      const it = choice(consumables);
      const n = 1 + randi(2);
      addItem(it, n);
      giftLabel = ` + ${n} ${ITEMS[it]?.name ?? it}`;
    }
  }
  sfx.coin();
  toast(`${v.emoji} ${v.name} sent you a gift! +${coins}💰${giftLabel}`, 'gold');
  track('friendship_daily_gift', { id: neighborId, lvl });
  return true;
}

/** Discount on neighbor sales/merchant if you're friends. */
export function friendDiscount(neighborId: string): number {
  const lvl = friendshipLevel(neighborId);
  return Math.min(0.25, 0.04 * (lvl - 1));
}
