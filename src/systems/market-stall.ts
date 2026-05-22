// =============================================================
//  MARKET STALL (Roadside Shop) — Phase 2 of the roadmap.
//
//  Players list items for sale at chosen prices. Simulated buyers
//  purchase them over time, faster when priced fairly and when the
//  item is in demand. Works offline by rebasing on load.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGER_IDS, VILLAGERS } from '../data/characters';
import { priceMultiplier } from './market';
import { addItem, removeItem } from './inventory';
import { track } from './telemetry';
import { randi, choice, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import type { MarketStallSlot } from '../types';
import { spawnHUDBurst } from './flyers';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { stallAdMultiplier } from './stall-ad';

// Buyers — extends villager names with travelling customers.
const TRAVELING_BUYERS: ReadonlyArray<string> = [
  'a passing traveler',
  'a busy chef',
  'the Inn Cook',
  'the Village Café',
  'a country tourist',
  'the school cook',
  'a railway driver',
  'a happy customer',
  'a farmhand from over the hill',
];

const MAX_SLOTS_TABLE: ReadonlyArray<{ minLevel: number; slots: number }> = [
  { minLevel: 4, slots: 2 },
  { minLevel: 8, slots: 3 },
  { minLevel: 14, slots: 4 },
  { minLevel: 20, slots: 5 },
];

export function maxStallSlots(): number {
  let n = 0;
  for (const row of MAX_SLOTS_TABLE) {
    if (state.level >= row.minLevel) n = row.slots;
  }
  return n;
}

export function initMarketStall(): void {
  if (!state.marketStall) {
    state.marketStall = {
      unlocked: state.level >= 4,
      slots: [],
      maxSlots: Math.max(2, maxStallSlots()),
      reputation: 0,
      lifetimeSales: 0,
      lastTick: nowSeconds(),
      pendingCoins: 0,
    };
  }
  // Keep slot cap in sync with level.
  state.marketStall.maxSlots = Math.max(state.marketStall.maxSlots, maxStallSlots());
  if (!state.marketStall.unlocked && state.level >= 4) {
    state.marketStall.unlocked = true;
    toast('🛒 The Market Stall is open! Sell items to passing customers.', 'gold');
    track('market_stall_unlocked');
  }
}

export function priceRangeFor(itemKey: string): { min: number; recommended: number; max: number } {
  const base = ITEMS[itemKey]?.sell ?? 1;
  const mult = priceMultiplier(itemKey);
  const rec = Math.max(1, Math.round(base * mult));
  return {
    min: Math.max(1, Math.floor(rec * 0.7)),
    recommended: rec,
    max: Math.ceil(rec * 1.5),
  };
}

/**
 * Compute sale probability per minute for a listing.
 * Higher when:
 *   - price is at or below recommended,
 *   - item has high market modifier,
 *   - reputation is high.
 */
function saleProbabilityPerMinute(slot: MarketStallSlot): number {
  const range = priceRangeFor(slot.itemKey);
  const ratio = slot.pricePerUnit / Math.max(1, range.recommended);
  // 0.5x at +50% over recommended; 1.4x at -30% under
  const priceFactor = ratio <= 1 ? 1 + (1 - ratio) * 0.8 : Math.max(0.25, 1 - (ratio - 1) * 1.2);
  // Reputation: 0..1000 -> 1.0..1.5
  const repFactor = 1 + Math.min(0.5, (state.marketStall?.reputation ?? 0) / 2000);
  // Hot item (gazette) boosts further; checked via gazette state if present.
  const hot = state.gazette?.hotItem;
  const hotFactor = hot && hot.itemKey === slot.itemKey ? 1.4 : 1.0;
  // Smaller quantities sell faster than huge piles.
  const qtyFactor = Math.max(0.45, 1.0 - (slot.qty - 1) * 0.05);
  // Newspaper ad multiplier (Hay Day's "Daily Dirt" boost).
  const adFactor = stallAdMultiplier();
  // Base: ~22% chance per minute when fair price
  const base = 0.22;
  return Math.min(0.95, base * priceFactor * repFactor * hotFactor * qtyFactor * adFactor);
}

export function listItemForSale(itemKey: string, qty: number, pricePerUnit: number): boolean {
  initMarketStall();
  const stall = state.marketStall!;
  if (!stall.unlocked) {
    toast('Market Stall locks at level 4.');
    return false;
  }
  if (stall.slots.length >= stall.maxSlots) {
    toast('All stall slots are full.');
    return false;
  }
  if (qty <= 0 || pricePerUnit <= 0) return false;
  if ((state.inv[itemKey] ?? 0) < qty) {
    toast('Not enough in your inventory.');
    return false;
  }
  const range = priceRangeFor(itemKey);
  pricePerUnit = Math.max(range.min, Math.min(range.max, pricePerUnit));
  if (!removeItem(itemKey, qty)) return false;
  const slot: MarketStallSlot = {
    id: 'ms' + Date.now() + randi(1e6),
    itemKey, qty, pricePerUnit,
    listedAt: nowSeconds(),
    saleProb: 0,
    status: 'listed',
  };
  slot.saleProb = saleProbabilityPerMinute(slot);
  stall.slots.push(slot);
  track('market_listing_created', { item: itemKey, qty, price: pricePerUnit });
  return true;
}

export function cancelListing(slotId: string): boolean {
  const stall = state.marketStall;
  if (!stall) return false;
  const idx = stall.slots.findIndex(s => s.id === slotId);
  if (idx < 0) return false;
  const slot = stall.slots[idx]!;
  if (slot.status !== 'listed') return false;
  addItem(slot.itemKey, slot.qty);
  stall.slots.splice(idx, 1);
  toast(`Cancelled — ${slot.qty}× ${ITEMS[slot.itemKey]?.name ?? slot.itemKey} returned to your barn.`);
  return true;
}

export function collectListing(slotId: string): boolean {
  const stall = state.marketStall;
  if (!stall) return false;
  const idx = stall.slots.findIndex(s => s.id === slotId);
  if (idx < 0) return false;
  const slot = stall.slots[idx]!;
  if (slot.status !== 'sold') return false;
  const revenue = slot.qty * slot.pricePerUnit;
  state.coins += revenue;
  state.stats.earned += revenue;
  // Repuation goes up when items are sold at fair price.
  stall.reputation = Math.min(1000, stall.reputation + Math.max(1, Math.floor(slot.qty / 2)));
  stall.lifetimeSales += slot.qty;
  stall.slots.splice(idx, 1);
  sfx.coin();
  spawnHUDBurst('coin', Math.min(6, 2 + Math.floor(revenue / 80)));
  toast(`💱 ${slot.buyerName ?? 'A customer'} paid ${revenue}💰 for your ${ITEMS[slot.itemKey]?.name}!`, 'gold');
  updateHUD();
  return true;
}

/** Collect all sold slots in one tap. */
export function collectAll(): number {
  const stall = state.marketStall;
  if (!stall) return 0;
  let total = 0;
  // Iterate over a copy because collectListing mutates the array.
  const ids = stall.slots.filter(s => s.status === 'sold').map(s => s.id);
  for (const id of ids) {
    const slot = stall.slots.find(s => s.id === id);
    if (!slot) continue;
    total += slot.qty * slot.pricePerUnit;
    collectListing(id);
  }
  return total;
}

/** Tick simulated buyer behavior. dtMinutes is real minutes elapsed. */
export function tickStall(dtMinutes: number): void {
  const stall = state.marketStall;
  if (!stall) return;
  if (dtMinutes <= 0) return;
  for (const slot of stall.slots) {
    if (slot.status !== 'listed') continue;
    if (slot.saleProb <= 0) slot.saleProb = saleProbabilityPerMinute(slot);
    // Bernoulli-trial each minute. With small dt slots can still sell.
    const p = 1 - Math.pow(1 - slot.saleProb, dtMinutes);
    if (Math.random() < p) {
      slot.status = 'sold';
      slot.buyerName = pickBuyerName(slot.itemKey);
      track('market_listing_sold', { item: slot.itemKey, qty: slot.qty, price: slot.pricePerUnit });
    }
  }
}

function pickBuyerName(itemKey: string): string {
  // Prefer a thematically-matched villager.
  const villager = VILLAGER_IDS.map(id => VILLAGERS[id]!).find(v =>
    v.preferred.some(cat => {
      // Light heuristic: match by category prefix
      switch (cat) {
        case 'crop': return ['wheat', 'corn', 'carrot', 'tomato', 'pumpkin', 'sugarcane'].includes(itemKey);
        case 'fruit': return ['apple', 'pear', 'strawberry', 'blueberry'].includes(itemKey);
        case 'animal': return ['egg', 'milk', 'wool', 'bacon', 'yogurt', 'feather'].includes(itemKey);
        case 'bake': return ['bread', 'flour', 'butter', 'cheese'].includes(itemKey);
        case 'sweet': return ['cake', 'cookie', 'jam', 'honey', 'pie', 'juice', 'smoothie', 'sugar'].includes(itemKey);
        case 'fish': return ['bluefish', 'trout', 'goldfish'].includes(itemKey);
        case 'craft': return ['cloth', 'perfume', 'candle'].includes(itemKey);
        default: return false;
      }
    }),
  );
  if (villager && Math.random() < 0.6) return `${villager.emoji} ${villager.name}`;
  return choice(TRAVELING_BUYERS);
}

/** On load / app start: rebase elapsed time into sale ticks. */
export function rebaseStallOnLoad(elapsedSeconds: number): void {
  const stall = state.marketStall;
  if (!stall) return;
  // Cap rebase to 48 hours of offline tick.
  const mins = Math.min(48 * 60, Math.max(0, elapsedSeconds / 60));
  if (mins > 0) tickStall(mins);
  stall.lastTick = nowSeconds();
}

export function reputationTier(): { name: string; pct: number } {
  const r = state.marketStall?.reputation ?? 0;
  let name = 'Newcomer';
  if (r >= 800) name = 'Legend';
  else if (r >= 500) name = 'Renowned';
  else if (r >= 250) name = 'Trusted';
  else if (r >= 100) name = 'Friendly';
  else if (r >= 25) name = 'Acquaintance';
  return { name, pct: Math.min(100, (r / 1000) * 100) };
}
