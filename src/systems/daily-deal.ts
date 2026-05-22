// =============================================================
//  DAILY DEAL — premium offer on the newspaper's first page.
//
//  Mirrors Hay Day's Daily Deal: a single discounted item bundle
//  available for diamonds, refreshed every day. Buying spends gems
//  and grants the items + bonus coin/xp. The discount is shown so
//  the value is visible.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { rand, randi, choice } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';

export function initDailyDeal(): void {
  if (!state.dailyDeal || state.dailyDeal.day !== state.day) {
    refreshDailyDeal();
  }
}

export function refreshDailyDeal(): void {
  // Choose a useful item that the player can use right now.
  const candidates = ['fertilizer', 'speedup', 'qualityink', 'priority', 'feed'].filter(k => {
    const it = ITEMS[k];
    return it && it.level <= state.level;
  });
  if (candidates.length === 0) {
    state.dailyDeal = {
      day: state.day,
      itemKey: 'feed',
      qty: 5,
      diamondCost: 2,
      baseCost: 4,
      bought: false,
    };
    return;
  }
  const itemKey = choice(candidates);
  const qty = itemKey === 'feed' ? 10 :
              itemKey === 'fertilizer' ? 3 :
              itemKey === 'speedup' ? 2 :
              itemKey === 'qualityink' ? 1 :
              itemKey === 'priority' ? 2 : 5;
  // Diamond cost scales by item rarity
  const baseCost = itemKey === 'qualityink' ? 10 :
                   itemKey === 'priority' ? 8 :
                   itemKey === 'speedup' ? 6 :
                   itemKey === 'fertilizer' ? 4 :
                   3;
  // ~40% discount
  const diamondCost = Math.max(1, Math.floor(baseCost * 0.6));
  state.dailyDeal = {
    day: state.day,
    itemKey,
    qty,
    diamondCost,
    baseCost,
    bought: false,
  };
  track('daily_deal_refresh', { item: itemKey, qty, cost: diamondCost });
}

export function buyDailyDeal(): boolean {
  initDailyDeal();
  const d = state.dailyDeal!;
  if (d.bought) {
    toast('Already bought today.');
    return false;
  }
  if (state.gems < d.diamondCost) {
    sfx.cantAfford();
    toast(`Need ${d.diamondCost} 💎`);
    return false;
  }
  state.gems -= d.diamondCost;
  addItem(d.itemKey, d.qty);
  d.bought = true;
  sfx.coin(); sfx.bell();
  toast(`🎯 Daily Deal! +${d.qty} ${ITEMS[d.itemKey]?.name ?? d.itemKey}`, 'gold');
  updateHUD();
  track('daily_deal_bought', { item: d.itemKey, cost: d.diamondCost });
  return true;
}

export function dailyDealAvailable(): boolean {
  initDailyDeal();
  return !state.dailyDeal!.bought;
}

export function dailyDealDiscount(): number {
  initDailyDeal();
  const d = state.dailyDeal!;
  return Math.round(100 * (1 - d.diamondCost / d.baseCost));
}
