import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGERS, pickVillagerFor, pickRandomVillager } from '../data/characters';
import { sprites } from '../sprites';
import { rand, randi, choice } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { hasItems, removeItem } from './inventory';
import { addXP } from './xp';
import { questProgress } from './quests';
import { dailyChallengeProgress } from './daily';
import { addWeeklyPoints } from './weekly';
import { checkAchievements } from './achievements';
import { track } from './telemetry';
import { addPassPoints } from './season-pass';
import { addOrderPoints } from './order-meter';
import { spawnHUDBurst } from './flyers';
import { trackDelivery, friendshipLevel, friendshipHearts } from './friendship';
import { hotItem } from './gazette';
import { recordEventAction } from './live-events';
import { addClubProgress } from './club';
import { recordVillageEngagement } from './village';
import { reputationCoinBonus } from './reputation';
import { maybeDeliverThanks } from './mailbox';
import { piggyOnDelivery } from './piggy-bank';
import { recordHabitatContribution } from './habitat-partner';
import type { Order } from '../types';

export function generateOrder(): Order {
  const eligible = Object.keys(ITEMS).filter(k => ITEMS[k]!.level <= state.level);
  const count = 1 + (state.level >= 4 ? 1 : 0) + (state.level >= 8 ? 1 : 0);
  const items: Record<string, number> = {};
  let totalVal = 0;
  for (let i = 0; i < count; i++) {
    const key = choice(eligible);
    const qty = 1 + randi(3);
    items[key] = (items[key] ?? 0) + qty;
    totalVal += ITEMS[key]!.sell * qty;
  }
  const reward = Math.floor(totalVal * (1.4 + rand(0.5)));
  const xp = Math.max(1, Math.floor(totalVal / 12));
  const villager = pickVillagerFor(Object.keys(items));
  const greet = choice(villager.greet);
  return {
    id: 'o' + Date.now() + randi(1e6),
    items, reward, xp,
    customerId: villager.id,
    greet,
  };
}

/** Backfill customer info on legacy orders (saved before villagers existed). */
function ensureCustomer(o: Order): void {
  if (o.customerId && VILLAGERS[o.customerId]) return;
  const v = pickVillagerFor(Object.keys(o.items));
  o.customerId = v.id;
  if (!o.greet) o.greet = choice(v.greet);
}

export function maybeUnlockOrders(): void {
  while (state.orders.length < Math.min(4, 2 + Math.floor(state.level / 3))) {
    state.orders.push(generateOrder());
  }
  renderOrders();
}

export function fulfillOrder(orderId: string): void {
  const idx = state.orders.findIndex(o => o.id === orderId);
  if (idx < 0) return;
  const o = state.orders[idx]!;
  if (!hasItems(o.items)) { sfx.error(); return; }
  const wasFirst = state.stats.ordersFulfilled === 0;
  for (const k in o.items) removeItem(k, o.items[k]!);
  // Friendship discount: higher friendship => slightly more coins per order.
  const lvlBonus = o.customerId ? Math.min(0.20, friendshipLevel(o.customerId) * 0.03) : 0;
  // Hot item bonus from the Gazette: any order including the hot item earns +25%.
  const hot = hotItem();
  const hasHot = hot && Object.keys(o.items).includes(hot.itemKey);
  const reward = Math.floor(o.reward * (1 + lvlBonus + (hasHot ? 0.25 : 0) + reputationCoinBonus()));
  state.coins += reward;
  state.stats.earned += reward;
  state.stats.ordersFulfilled += 1;
  recordHabitatContribution('order', 1);
  addXP(o.xp);
  // Order Board macro-meter: bigger payouts advance the bar faster.
  addOrderPoints(reward);
  if (o.customerId) trackDelivery(o.customerId);
  sfx.order(); sfx.coin();
  // Personalised thank-you toast — pulls a line from the customer.
  ensureCustomer(o);
  const v = VILLAGERS[o.customerId!];
  if (v) {
    const thanks = choice(v.thanks);
    toast(`${v.emoji} ${v.name}: "${thanks}" +${reward}💰${hasHot ? ' (hot item!)' : ''}`, 'gold');
  } else {
    toast(`Order fulfilled! +${reward}`, 'gold');
  }
  spawnHUDBurst('coin', Math.min(8, 3 + Math.floor(reward / 25)));
  spawnHUDBurst('xp', Math.min(4, 1 + Math.floor(o.xp / 6)));
  if (wasFirst) {
    // The first delivery is a milestone — give the player extra fanfare and
    // a tiny "you did it!" pop so the loop feels conquered.
    setTimeout(() => toast('🌟 First delivery! More customers will arrive.', 'gold'), 700);
    spawnHUDBurst('coin', 6);
  }
  state.orders.splice(idx, 1);
  setTimeout(() => {
    state.orders.push(generateOrder());
    renderOrders();
  }, 600);
  renderOrders();
  updateHUD();
  questProgress('orders', null, 1);
  dailyChallengeProgress('orders', null, 1);
  addWeeklyPoints(20, 'craft');
  addPassPoints(12);
  // Live event hook: order_contains rule fires per item key in the order.
  for (const k in o.items) recordEventAction('order_contains', k, o.items[k]!);
  addClubProgress('order', 1);
  recordVillageEngagement('order');
  if (o.customerId) maybeDeliverThanks(o.customerId);
  piggyOnDelivery();
  track('order_fulfilled', { reward });
  checkAchievements();
}

export function renderOrders(): void {
  const list = document.getElementById('orders-list')!;
  list.innerHTML = '';
  if (state.orders.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#888;padding:8px;font-size:11px">No customers waiting. Level up to attract more!</div>';
    return;
  }
  for (const o of state.orders) {
    ensureCustomer(o);
    const v = VILLAGERS[o.customerId!] ?? pickRandomVillager();
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.setProperty('--cust-accent', v.accent);
    const itemsHTML = Object.entries(o.items).map(([k, q]) => {
      const have = state.inv[k] ?? 0;
      const ok = have >= q;
      return `<div class="order-item" style="${ok ? 'border-color:#6abf4b;background:#eaf5d0' : ''}">
        <img class="ico-mini" src="${sprites.item[k]!.toDataURL()}">
        <span>${q}× ${ITEMS[k]!.name}</span>
        <span style="opacity:0.6">(${have})</span>
      </div>`;
    }).join('');
    const can = hasItems(o.items);
    const greet = o.greet ?? choice(v.greet);
    // Show a help "!" indicator when the order is missing items (helpable
    // by friends in a future networked version, but visually it tells the
    // player "stuck on this one"). Hay Day's exclamation-point grammar.
    const missingCount = Object.keys(o.items).filter(k => (state.inv[k] ?? 0) < o.items[k]!).length;
    const showHelp = missingCount > 0;
    card.innerHTML = `
      <div class="order-customer">
        <div class="order-portrait" style="background:${v.accent}33;border-color:${v.accent}">
          <span class="order-portrait-emoji">${v.emoji}</span>
          ${showHelp ? '<span class="order-help-mark" title="Missing items">!</span>' : ''}
        </div>
        <div class="order-customer-text">
          <div class="order-customer-name">${v.name} <small>· ${v.role}</small> <span class="friend-hearts">${friendshipHearts(v.id)}</span></div>
          <div class="order-customer-greet">"${greet}"</div>
        </div>
      </div>
      <div class="order-itemset">${itemsHTML}</div>
      <div class="order-items">
        <div class="order-reward">
          <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">+${o.reward}
        </div>
        <div class="order-reward">
          <img class="ico-mini" src="${sprites.item.xp!.toDataURL()}">+${o.xp}
        </div>
      </div>
      <button class="order-fulfill" ${can ? '' : 'disabled'} data-id="${o.id}">
        ${can ? `🚚 Deliver to ${v.name}` : 'Need items'}
      </button>
    `;
    list.appendChild(card);
  }
  list.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach(btn =>
    btn.addEventListener('click', () => fulfillOrder(btn.dataset.id!))
  );
}
