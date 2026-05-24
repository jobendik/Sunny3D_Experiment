// =============================================================
//  MAGGIE + WEEKLY SHOP OFFERS
//
//  Phase 6 offer grammar: a recurring NPC visitor with curated
//  bundles, plus a "this week only" shelf in the shop. Everything is
//  gameplay-earned currency only; no real-money purchase path.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addXP } from './xp';
import { piggyOnCoinSpend } from './piggy-bank';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import type { MaggieOffer, WeeklyShopOffer } from '../types';

const MAGGIE_UNLOCK_LEVEL = 4;
const MAGGIE_VISIT_EVERY_DAYS = 3;
const MAGGIE_VISIT_LENGTH_DAYS = 2;
const WEEK_LENGTH_DAYS = 7;

interface MaggieTheme {
  id: string;
  name: string;
  offers: Array<Omit<MaggieOffer, 'id' | 'bought'>>;
}

const MAGGIE_THEMES: MaggieTheme[] = [
  {
    id: 'pantry_day',
    name: 'Pantry Pick-Me-Ups',
    offers: [
      {
        title: 'Starter Crate',
        emoji: '🧺',
        tagline: 'Feed, flour, and fertilizer for a busy morning.',
        items: { feed: 6, flour: 3, fertilizer: 2 },
        costCoins: 140,
        costGems: 0,
        discountPct: 20,
      },
      {
        title: 'Baker Boost',
        emoji: '🥖',
        tagline: 'A small helper pack for ovens and order-board rushes.',
        items: { bread: 3, speedup: 1, qualityink: 1 },
        costCoins: 0,
        costGems: 3,
        discountPct: 35,
      },
      {
        title: 'Care Package',
        emoji: '🎀',
        tagline: 'A friendly basket of early goods and a little XP.',
        items: { wheat: 8, corn: 4, feed: 4 },
        costCoins: 95,
        costGems: 0,
        discountPct: 15,
      },
    ],
  },
  {
    id: 'builder_day',
    name: 'Builder Basket',
    offers: [
      {
        title: 'Barn Bits',
        emoji: '🔨',
        tagline: 'Common storage parts without waiting on rare drops.',
        items: { plank: 1, nail: 2, screw: 1 },
        costCoins: 220,
        costGems: 0,
        discountPct: 25,
      },
      {
        title: 'Silo Patch Kit',
        emoji: '🪵',
        tagline: 'A compact set for your next silo upgrade.',
        items: { panel: 1, bolt: 2, rope: 2 },
        costCoins: 260,
        costGems: 0,
        discountPct: 25,
      },
      {
        title: 'Survey Satchel',
        emoji: '🗺️',
        tagline: 'Expansion prep for the next patch of land.',
        items: { stake: 2, map: 1, mallet: 1 },
        costCoins: 0,
        costGems: 4,
        discountPct: 30,
      },
    ],
  },
  {
    id: 'weather_day',
    name: 'Weather Workshop',
    offers: [
      {
        title: 'Forecast Kit',
        emoji: '🌦️',
        tagline: 'Fragments and boosts for a weather-minded farmer.',
        items: { fragment: 3, fertilizer: 2, speedup: 1 },
        costCoins: 240,
        costGems: 0,
        discountPct: 20,
      },
      {
        title: 'Perfect Batch',
        emoji: '✨',
        tagline: 'Quality ink and priority tokens for premium orders.',
        items: { qualityink: 2, priority: 1 },
        costCoins: 0,
        costGems: 5,
        discountPct: 40,
      },
      {
        title: 'Fisher Friend',
        emoji: '🎣',
        tagline: 'Bait bundle for a quick lake session.',
        items: { worm: 8, fly: 3, lure: 1 },
        costCoins: 210,
        costGems: 0,
        discountPct: 25,
      },
    ],
  },
];

const WEEKLY_POOL: Array<{
  itemKey: string;
  qty: number;
  title: string;
  emoji: string;
  maxBuys: number;
  discountPct: number;
}> = [
  { itemKey: 'feed', qty: 8, title: 'Feed Sack', emoji: '🌾', maxBuys: 2, discountPct: 10 },
  { itemKey: 'fertilizer', qty: 4, title: 'Fertility Pack', emoji: '🪴', maxBuys: 2, discountPct: 20 },
  { itemKey: 'speedup', qty: 2, title: 'Speed Bundle', emoji: '⚡', maxBuys: 1, discountPct: 20 },
  { itemKey: 'qualityink', qty: 1, title: 'Quality Ink Drop', emoji: '✨', maxBuys: 1, discountPct: 15 },
  { itemKey: 'worm', qty: 12, title: 'Bait Tin', emoji: '🎣', maxBuys: 2, discountPct: 15 },
  { itemKey: 'plank', qty: 1, title: 'Single Plank', emoji: '🪵', maxBuys: 1, discountPct: 10 },
  { itemKey: 'nail', qty: 3, title: 'Nail Pocket', emoji: '🔩', maxBuys: 1, discountPct: 20 },
  { itemKey: 'rope', qty: 3, title: 'Rope Coil', emoji: '🧵', maxBuys: 1, discountPct: 20 },
  { itemKey: 'axe', qty: 1, title: 'Clearing Axe', emoji: '🪓', maxBuys: 1, discountPct: 15 },
  { itemKey: 'fragment', qty: 2, title: 'Weather Shards', emoji: '🌦️', maxBuys: 1, discountPct: 20 },
];

function visitSeedDay(day = state.day): number {
  return Math.max(1, Math.floor((day - 1) / MAGGIE_VISIT_EVERY_DAYS) * MAGGIE_VISIT_EVERY_DAYS + 1);
}

function weeklyIndex(day = state.day): number {
  return Math.floor((day - 1) / WEEK_LENGTH_DAYS);
}

function sanitizeItems(items: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(items)) {
    const def = ITEMS[key];
    if (!def) continue;
    if (def.level > state.level + 1) continue;
    out[key] = items[key]!;
  }
  if (Object.keys(out).length === 0) out.feed = 4;
  return out;
}

function refreshMaggieOffers(startDay = visitSeedDay()): void {
  const theme = MAGGIE_THEMES[Math.floor((startDay - 1) / MAGGIE_VISIT_EVERY_DAYS) % MAGGIE_THEMES.length]!;
  const levelDiscount = Math.min(12, Math.floor(Math.max(0, state.level - MAGGIE_UNLOCK_LEVEL) / 3) * 2);
  state.maggieOffers = {
    visitId: `maggie-${startDay}-${theme.id}`,
    themeId: theme.id,
    themeName: theme.name,
    dayStarted: startDay,
    activeUntilDay: startDay + MAGGIE_VISIT_LENGTH_DAYS,
    nextVisitDay: startDay + MAGGIE_VISIT_EVERY_DAYS,
    offers: theme.offers.map((offer, idx) => ({
      ...offer,
      id: `${theme.id}-${startDay}-${idx}`,
      items: sanitizeItems(offer.items),
      costCoins: Math.max(0, Math.floor(offer.costCoins * (1 - levelDiscount / 100))),
      bought: false,
    })),
  };
  track('maggie_visit_refresh', { theme: theme.id, startDay });
}

function refreshWeeklyShop(index = weeklyIndex()): void {
  const startDay = index * WEEK_LENGTH_DAYS + 1;
  const available = WEEKLY_POOL.filter(row => (ITEMS[row.itemKey]?.level ?? 99) <= state.level + 1);
  const pool = available.length >= 4 ? available : WEEKLY_POOL.slice(0, 4);
  const offset = index % pool.length;
  const picked = Array.from({ length: Math.min(4, pool.length) }, (_, i) => pool[(offset + i) % pool.length]!);
  state.weeklyShop = {
    weekIndex: index,
    startDay,
    endsDay: startDay + WEEK_LENGTH_DAYS,
    offers: picked.map((row, idx): WeeklyShopOffer => {
      const base = Math.max(10, ITEMS[row.itemKey]?.sell ?? 10);
      const premium = row.itemKey === 'qualityink' || row.itemKey === 'fragment' ? 3.4 : 2.2;
      const cost = Math.max(12, Math.floor(base * row.qty * premium * (1 - row.discountPct / 100)));
      return {
        id: `weekly-${index}-${row.itemKey}-${idx}`,
        title: row.title,
        emoji: row.emoji,
        itemKey: row.itemKey,
        qty: row.qty,
        costCoins: cost,
        discountPct: row.discountPct,
        bought: 0,
        maxBuys: row.maxBuys,
      };
    }),
  };
  track('weekly_shop_refresh', { weekIndex: index });
}

export function initMaggieOffers(): void {
  if (state.level < MAGGIE_UNLOCK_LEVEL) return;
  const startDay = visitSeedDay();
  if (!state.maggieOffers) {
    refreshMaggieOffers(startDay);
    return;
  }
  if (state.day >= state.maggieOffers.nextVisitDay) refreshMaggieOffers(startDay);
}

export function initWeeklyShop(): void {
  const index = weeklyIndex();
  if (!state.weeklyShop || state.weeklyShop.weekIndex !== index) refreshWeeklyShop(index);
}

export function maybeRefreshOfferSystems(): void {
  initMaggieOffers();
  initWeeklyShop();
}

export function maggieVisitActive(): boolean {
  initMaggieOffers();
  const root = state.maggieOffers;
  return !!root && state.level >= MAGGIE_UNLOCK_LEVEL && state.day < root.activeUntilDay;
}

export function maggieDaysRemaining(): number {
  const root = state.maggieOffers;
  if (!root) return 0;
  return Math.max(0, root.activeUntilDay - state.day);
}

export function weeklyShopDaysRemaining(): number {
  initWeeklyShop();
  const root = state.weeklyShop!;
  return Math.max(0, root.endsDay - state.day);
}

export function maggieOffersHasAttention(): boolean {
  initMaggieOffers();
  const root = state.maggieOffers;
  if (!root || !maggieVisitActive()) return false;
  if (root.lastSeenVisitId === root.visitId) return false;
  return root.offers.some(o => !o.bought);
}

export function weeklyShopHasAttention(): boolean {
  initWeeklyShop();
  const root = state.weeklyShop!;
  if (root.lastSeenWeek === root.weekIndex) return false;
  return root.offers.some(o => o.bought < o.maxBuys);
}

export function offersHaveAttention(): boolean {
  return maggieOffersHasAttention() || weeklyShopHasAttention();
}

export function markOfferSystemsSeen(): void {
  initMaggieOffers();
  initWeeklyShop();
  if (state.maggieOffers) state.maggieOffers.lastSeenVisitId = state.maggieOffers.visitId;
  if (state.weeklyShop) state.weeklyShop.lastSeenWeek = state.weeklyShop.weekIndex;
}

export function buyMaggieOffer(id: string): boolean {
  initMaggieOffers();
  const root = state.maggieOffers;
  if (!root || !maggieVisitActive()) {
    toast('Maggie is away right now. She returns soon.');
    return false;
  }
  const offer = root.offers.find(o => o.id === id);
  if (!offer || offer.bought) return false;
  if (state.coins < offer.costCoins || state.gems < offer.costGems) {
    sfx.cantAfford();
    toast('Not enough currency for that bundle.');
    return false;
  }
  state.coins -= offer.costCoins;
  state.gems -= offer.costGems;
  if (offer.costCoins > 0) piggyOnCoinSpend(offer.costCoins);
  for (const key of Object.keys(offer.items)) addItem(key, offer.items[key]!);
  const xp = 8 + Object.values(offer.items).reduce((a, b) => a + b, 0);
  addXP(xp);
  offer.bought = true;
  sfx.coin();
  sfx.bell();
  toast(`Maggie's ${offer.title} unpacked! +${xp} XP`, 'gold');
  updateHUD();
  track('maggie_offer_bought', { id, costCoins: offer.costCoins, costGems: offer.costGems });
  return true;
}

export function buyWeeklyShopOffer(id: string): boolean {
  initWeeklyShop();
  const root = state.weeklyShop!;
  const offer = root.offers.find(o => o.id === id);
  if (!offer || offer.bought >= offer.maxBuys) return false;
  if (state.coins < offer.costCoins) {
    sfx.cantAfford();
    toast(`Need ${offer.costCoins} coins.`);
    return false;
  }
  state.coins -= offer.costCoins;
  piggyOnCoinSpend(offer.costCoins);
  addItem(offer.itemKey, offer.qty);
  addXP(Math.max(3, Math.floor(offer.qty * 1.5)));
  offer.bought += 1;
  sfx.coin();
  toast(`Weekly shelf: +${offer.qty} ${ITEMS[offer.itemKey]?.name ?? offer.itemKey}`, 'gold');
  updateHUD();
  track('weekly_shop_offer_bought', { id, item: offer.itemKey, qty: offer.qty });
  return true;
}

export const MAGGIE_LEVEL = MAGGIE_UNLOCK_LEVEL;
