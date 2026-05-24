// =============================================================
//  MARKET CONTRACTS — Phase 15.17 of the roadmap. Multi-item
//  deliveries with a 24-72h deadline. Bigger than a truck order,
//  smaller than a landmark stage. Rewards include rare materials.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGER_IDS, VILLAGERS } from '../data/characters';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { addJournalEntry } from './journal';
import type { ContractDef, ContractsRoot, MaterialKey } from '../types';

const UNLOCK_LEVEL = 9;
const MAX_ACTIVE = 2;
const MAX_OFFERS = 3;
const NEXT_OFFER_MIN_S = 60 * 30;     // ~30m between offer refreshes
const NEXT_OFFER_RAND_S = 60 * 60;    // +0..60m

const BONUS_MATERIALS: MaterialKey[] = ['plank', 'screw', 'paint', 'panel', 'tarp'];

export function initContracts(): void {
  if (!state.contracts) {
    state.contracts = {
      active: [],
      offers: [],
      nextOfferAt: nowSeconds(),
    };
  }
}

function makeContract(): ContractDef | null {
  const eligible = Object.keys(ITEMS).filter(k => {
    const it = ITEMS[k]!;
    return it.level <= state.level && it.sell >= 15
      && !['plank', 'nail', 'screw', 'hinge', 'paint', 'panel', 'bolt', 'rope', 'tarp', 'deed', 'stake', 'map', 'mallet', 'axe', 'saw', 'shovel', 'pickaxe', 'lantern', 'fragment', 'token', 'compost'].includes(k);
  });
  if (eligible.length < 2) return null;
  const items: Record<string, number> = {};
  const itemCount = 2 + randi(2);
  const seen = new Set<string>();
  let totalValue = 0;
  for (let i = 0; i < itemCount; i++) {
    let k = choice(eligible);
    let tries = 0;
    while (seen.has(k) && tries < 5) { k = choice(eligible); tries++; }
    seen.add(k);
    const qty = 4 + randi(8);
    items[k] = (items[k] ?? 0) + qty;
    totalValue += ITEMS[k]!.sell * qty;
  }
  const rewardCoins = Math.floor(totalValue * (1.7 + Math.random() * 0.4));
  const rewardXp = Math.max(20, Math.floor(totalValue / 8));
  const rewardMaterial = Math.random() < 0.7 ? choice(BONUS_MATERIALS) : undefined;
  const customerId = choice([...VILLAGER_IDS]);
  const durationHours = 24 + randi(48); // 24-72h
  const expiresAt = nowSeconds() + durationHours * 60 * 60;
  return {
    id: 'ct' + Date.now() + randi(1e6),
    customerId,
    items,
    delivered: {},
    rewardCoins,
    rewardXp,
    rewardMaterial,
    expiresAt,
    signedAt: 0,
  };
}

/** Tick: occasionally refresh the offer pool and prune expired. */
export function tickContracts(): void {
  if (state.level < UNLOCK_LEVEL) return;
  initContracts();
  const c = state.contracts!;
  const now = nowSeconds();
  // Prune expired offers.
  c.offers = c.offers.filter(o => o.expiresAt > now);
  // Prune expired active contracts (penalty: no reward).
  for (let i = c.active.length - 1; i >= 0; i--) {
    const a = c.active[i]!;
    if (a.expiresAt <= now) {
      track('contract_expired', { id: a.id });
      toast(`📜 Contract with ${VILLAGERS[a.customerId]?.name ?? 'someone'} expired.`);
      c.active.splice(i, 1);
    } else {
      // Warn when ≤ 15 min remain on an active contract — only once
      // per contract via the rising-edge event-notification key.
      const remain = a.expiresAt - now;
      if (remain > 0 && remain < 15 * 60) {
        void import('./notifications').then(m =>
          m.notifyEvent(
            `contract-${a.id}`,
            '📜 Contract expiring soon',
            `${VILLAGERS[a.customerId]?.name ?? 'A customer'}'s contract expires in ${Math.ceil(remain / 60)} min.`,
            30 * 60 * 1000, // 30-min cooldown so we don't keep pinging
          )
        );
      }
    }
  }
  // Refresh offers periodically.
  if (now >= c.nextOfferAt) {
    c.nextOfferAt = now + NEXT_OFFER_MIN_S + Math.random() * NEXT_OFFER_RAND_S;
    while (c.offers.length < MAX_OFFERS) {
      const k = makeContract();
      if (!k) break;
      c.offers.push(k);
    }
  }
}

export function signContract(offerId: string): boolean {
  initContracts();
  const c = state.contracts!;
  if (c.active.length >= MAX_ACTIVE) {
    toast(`Only ${MAX_ACTIVE} active contracts at a time.`);
    return false;
  }
  const idx = c.offers.findIndex(o => o.id === offerId);
  if (idx < 0) return false;
  const o = c.offers.splice(idx, 1)[0]!;
  o.signedAt = nowSeconds();
  c.active.push(o);
  sfx.bell();
  toast(`📜 Signed contract with ${VILLAGERS[o.customerId]?.name ?? 'someone'}.`, 'gold');
  track('contract_signed', { id: o.id });
  return true;
}

export function deliverContractItem(contractId: string, itemKey: string, qty: number): boolean {
  const c = state.contracts; if (!c) return false;
  const ct = c.active.find(a => a.id === contractId);
  if (!ct) return false;
  const need = ct.items[itemKey];
  if (!need) return false;
  const already = ct.delivered[itemKey] ?? 0;
  const room = need - already;
  if (room <= 0) return false;
  const have = state.inv[itemKey] ?? 0;
  const give = Math.min(qty, room, have);
  if (give <= 0) {
    sfx.error();
    toast('Not enough in inventory.');
    return false;
  }
  removeItem(itemKey, give);
  ct.delivered[itemKey] = already + give;
  sfx.order();
  // Complete?
  let complete = true;
  for (const k in ct.items) {
    if ((ct.delivered[k] ?? 0) < ct.items[k]!) { complete = false; break; }
  }
  if (complete) {
    state.coins += ct.rewardCoins;
    state.stats.earned += ct.rewardCoins;
    addXP(ct.rewardXp);
    if (ct.rewardMaterial) addItem(ct.rewardMaterial, 1);
    sfx.coin();
    toast(`✅ Contract complete! +${ct.rewardCoins}💰 +${ct.rewardXp}XP${ct.rewardMaterial ? ` + 1 ${ITEMS[ct.rewardMaterial]?.name}` : ''}`, 'gold');
    track('contract_completed', { id: ct.id, reward: ct.rewardCoins });
    addJournalEntry({
      id: `contract_${ct.id}`,
      title: 'Contract Fulfilled',
      body: `Delivered a multi-item contract for ${VILLAGERS[ct.customerId]?.name ?? 'a customer'}.`,
      icon: '📜',
    });
    const idx = c.active.indexOf(ct);
    if (idx >= 0) c.active.splice(idx, 1);
  }
  return true;
}
