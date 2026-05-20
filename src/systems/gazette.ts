// =============================================================
//  SUNNY GAZETTE — daily newspaper that unifies weather news,
//  hot item bonuses, neighbor sales, help requests, and event
//  notices (Phase 3 of the roadmap).
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { WEATHER } from '../data/seasons';
import { VILLAGERS, VILLAGER_IDS } from '../data/characters';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { bumpFriendship } from './friendship';
import { track } from './telemetry';
import { rand, randi, choice } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import type { NeighborSaleOffer, HelpRequestOffer, MaterialKey } from '../types';

const MATERIAL_REWARDS: MaterialKey[] = ['plank', 'nail', 'screw', 'panel', 'bolt', 'rope', 'stake', 'mallet'];

export function initGazette(): void {
  if (!state.gazette) {
    state.gazette = {
      day: 0,
      articles: [],
      hotItem: null,
      neighborSales: [],
      helpRequests: [],
      lastReadDay: 0,
    };
    refreshGazette();
  }
}

export function refreshGazette(): void {
  initGazette();
  const g = state.gazette!;
  g.day = state.day;
  g.articles = [];
  g.neighborSales = [];
  g.helpRequests = [];

  // 1) Weather forecast snippet (we have today's weather; describe its effect)
  const w = WEATHER[state.weather];
  g.articles.push({
    type: 'forecast',
    title: `${w.emoji} ${w.name}`,
    body: w.growthMod > 1
      ? `Crops grow faster today — make the most of it!`
      : w.growthMod < 1
        ? `Growth slows a bit today. Maybe spend the day on production.`
        : `A calm day to tend your farm.`,
  });

  // 2) Hot item: pick one player can produce. Bonus is +25% sell value.
  const eligible = Object.keys(ITEMS).filter(k => ITEMS[k]!.level <= state.level && k !== 'feed' && k !== 'coin' && k !== 'xp');
  if (eligible.length > 0) {
    const hotKey = choice(eligible);
    g.hotItem = { itemKey: hotKey, bonus: 0.25 };
    g.articles.push({
      type: 'hot_item',
      title: `🔥 Hot Today: ${ITEMS[hotKey]!.name}`,
      body: `${ITEMS[hotKey]!.name} sells for +25% today. Market Stall sales also speed up.`,
      data: { itemKey: hotKey, bonus: 0.25 },
    });
  } else {
    g.hotItem = null;
  }

  // 3) Neighbor sales — 2-3 random NPC shop listings.
  const saleCount = 2 + randi(2);
  const seen = new Set<string>();
  for (let i = 0; i < saleCount; i++) {
    const nb = VILLAGERS[VILLAGER_IDS[randi(VILLAGER_IDS.length)]!]!;
    if (seen.has(nb.id)) continue;
    seen.add(nb.id);
    // Pick item from their preferred category, that the player can afford.
    const candidates = eligible.filter(k => {
      const sell = ITEMS[k]!.sell;
      return sell >= 12 && sell <= 200;
    });
    if (candidates.length === 0) continue;
    const itemKey = choice(candidates);
    const baseSell = ITEMS[itemKey]!.sell;
    const offer: NeighborSaleOffer = {
      neighborId: nb.id,
      itemKey,
      qty: 1 + randi(3),
      pricePerUnit: Math.max(2, Math.floor(baseSell * (0.7 + rand(0.3)))), // 70-100% of sell
      bought: false,
    };
    g.neighborSales.push(offer);
  }

  // 4) Help requests — 1-2 small order-style asks with material rewards.
  const reqCount = 1 + randi(2);
  for (let i = 0; i < reqCount; i++) {
    const nb = VILLAGERS[VILLAGER_IDS[randi(VILLAGER_IDS.length)]!]!;
    const askable = eligible.filter(k => ITEMS[k]!.sell >= 8);
    if (askable.length === 0) continue;
    const itemKey = choice(askable);
    const qty = 1 + randi(4);
    const reward = Math.floor(ITEMS[itemKey]!.sell * qty * 1.5);
    const giveMaterial = state.level >= 5 && Math.random() < 0.55;
    const req: HelpRequestOffer = {
      id: 'hr' + Date.now() + i + randi(1e5),
      neighborId: nb.id,
      itemKey,
      qty,
      rewardCoins: reward,
      rewardXp: Math.max(3, Math.floor(reward / 14)),
      rewardMaterial: giveMaterial ? choice(MATERIAL_REWARDS) : undefined,
      done: false,
    };
    g.helpRequests.push(req);
  }

  // 5) Event notice if there is an active event.
  if (state.event) {
    g.articles.push({
      type: 'event_notice',
      title: '📢 News from Sunny Acres',
      body: state.event.msg,
    });
  }

  // 6) Tip — gentle cozy text.
  g.articles.push({
    type: 'tip',
    title: '💡 Today\'s Tip',
    body: choice([
      'Storage upgrades unlock at higher player levels — collect materials from train returns.',
      'Use the market stall for surplus crops — buyers come throughout the day.',
      'Help requests pay rare upgrade materials when the neighbor likes you.',
      'The Boat at the dock takes large crate orders for bigger rewards.',
      'Train returns bring back planks, nails, and rare deeds.',
      'High-quality goods sell faster at the market stall.',
    ]),
  });

  track('gazette_refresh', { day: g.day });
}

export function hotItem(): { itemKey: string; bonus: number } | null {
  return state.gazette?.hotItem ?? null;
}

export function buyNeighborSale(neighborId: string, itemKey: string): boolean {
  const g = state.gazette;
  if (!g) return false;
  const offer = g.neighborSales.find(s => s.neighborId === neighborId && s.itemKey === itemKey && !s.bought);
  if (!offer) return false;
  const total = offer.qty * offer.pricePerUnit;
  if (state.coins < total) {
    sfx.cantAfford();
    toast('Not enough coins.');
    return false;
  }
  state.coins -= total;
  addItem(offer.itemKey, offer.qty);
  offer.bought = true;
  sfx.coin();
  const v = VILLAGERS[offer.neighborId];
  toast(`Bought ${offer.qty}× ${ITEMS[offer.itemKey]?.name} from ${v?.name ?? 'a neighbor'} for ${total}💰`, 'xp');
  updateHUD();
  track('gazette_buy_neighbor_sale', { item: offer.itemKey, price: total });
  return true;
}

export function fulfillHelpRequest(requestId: string): boolean {
  const g = state.gazette;
  if (!g) return false;
  const req = g.helpRequests.find(r => r.id === requestId);
  if (!req || req.done) return false;
  if ((state.inv[req.itemKey] ?? 0) < req.qty) {
    sfx.error();
    toast('You don\'t have enough of that item.');
    return false;
  }
  removeItem(req.itemKey, req.qty);
  state.coins += req.rewardCoins;
  state.stats.earned += req.rewardCoins;
  addXP(req.rewardXp);
  if (req.rewardMaterial) addItem(req.rewardMaterial, 1);
  req.done = true;
  const v = VILLAGERS[req.neighborId];
  bumpFriendship(req.neighborId, 12);
  sfx.coin();
  toast(
    `${v?.emoji ?? '🙏'} ${v?.name ?? 'A neighbor'}: "Thank you!" +${req.rewardCoins}💰${req.rewardMaterial ? ' + 1 ' + (ITEMS[req.rewardMaterial]?.name ?? req.rewardMaterial) : ''}`,
    'gold',
  );
  track('gazette_help_request_done', { item: req.itemKey, qty: req.qty });
  updateHUD();
  return true;
}

/** Roll over the gazette when the day changes. */
export function maybeRolloverGazette(): void {
  initGazette();
  if (state.gazette!.day !== state.day) refreshGazette();
}

export function markGazetteRead(): void {
  if (state.gazette) state.gazette.lastReadDay = state.day;
}

export function hasUnreadGazette(): boolean {
  return !!state.gazette && state.gazette.lastReadDay !== state.day;
}
