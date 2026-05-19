// =============================================================
//  MARKET DYNAMICS — dynamic price modifiers per day/season,
//  overstock penalty when you hoard too much of one item,
//  scarcity bonus when something is suddenly in demand.
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { ITEMS } from '../data/items';
import { rand, randi, choice } from '../utils';
import { track } from './telemetry';
import type { MarketState } from '../types';

export function initMarket(): void {
  if (!state.market) {
    state.market = {
      day: 0,
      modifiers: {},
      scarcityItem: null,
      scarcityUntil: 0,
    };
    refreshMarketModifiers();
  }
}

export function refreshMarketModifiers(): void {
  initMarket();
  const m = state.market!;
  m.day = state.day;
  m.modifiers = {};
  // Each known item gets a daily mod within ±25%.
  const items = Object.keys(ITEMS).filter(k => k !== 'feed');
  for (const k of items) {
    const seasonal = (state.season === 'autumn' && (k === 'pumpkin' || k === 'apple' || k === 'pear')) ? 0.15 : 0;
    const winter = (state.season === 'winter' && (k === 'cheese' || k === 'bread' || k === 'jam')) ? 0.20 : 0;
    const summer = (state.season === 'summer' && (k === 'juice' || k === 'strawberry')) ? 0.20 : 0;
    const spring = (state.season === 'spring' && (k === 'milk' || k === 'egg' || k === 'wheat')) ? 0.10 : 0;
    const random = (rand(0.5) - 0.25);
    m.modifiers[k] = Number((seasonal + winter + summer + spring + random).toFixed(2));
  }
  // Pick a scarcity item that lasts a few minutes.
  const list = items.filter(k => ITEMS[k]!.level <= state.level);
  if (list.length) {
    m.scarcityItem = choice(list);
    m.scarcityUntil = (typeof performance !== 'undefined' ? performance.now() / 1000 : 0)
      + CONFIG.market.scarcityWindowMinutes * 60 + rand(60);
  }
  track('market_refresh', { items: Object.keys(m.modifiers).length });
}

export function priceMultiplier(itemKey: string): number {
  const m = state.market;
  if (!m) return 1.0;
  let mult = 1.0 + (m.modifiers[itemKey] ?? 0);

  // Overstock penalty
  const stock = state.inv[itemKey] ?? 0;
  if (stock > CONFIG.market.overstockThreshold) {
    const over = (stock - CONFIG.market.overstockThreshold) / CONFIG.market.overstockThreshold;
    mult *= Math.max(1 - CONFIG.market.overstockMaxPenalty, 1 - over * CONFIG.market.overstockMaxPenalty);
  }

  // Scarcity bonus
  if (m.scarcityItem === itemKey && (typeof performance !== 'undefined' ? performance.now() / 1000 : 0) < m.scarcityUntil) {
    mult *= 1 + CONFIG.market.scarcityMaxBonus;
  }

  // Daily festival bonus by weekday
  const day = new Date().getDay();
  mult *= 1 + (CONFIG.market.festivalBonusByDay[day] ?? 0);

  return Math.max(0.4, Math.min(2.0, mult));
}

export function scarcityActive(): { item: string; remaining: number } | null {
  const m = state.market;
  if (!m || !m.scarcityItem) return null;
  const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
  if (now >= m.scarcityUntil) return null;
  return { item: m.scarcityItem, remaining: m.scarcityUntil - now };
}

export function dailyMarketSnapshot(): Array<{ key: string; mod: number }> {
  const m = state.market;
  if (!m) return [];
  return Object.entries(m.modifiers)
    .filter(([k]) => ITEMS[k] && ITEMS[k]!.level <= state.level)
    .map(([key, mod]) => ({ key, mod }))
    .sort((a, b) => b.mod - a.mod);
}
