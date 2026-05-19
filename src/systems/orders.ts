import { state } from '../state';
import { ITEMS } from '../data/items';
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
  return { id: 'o' + Date.now() + randi(1e6), items, reward, xp };
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
  for (const k in o.items) removeItem(k, o.items[k]!);
  state.coins += o.reward;
  state.stats.earned += o.reward;
  state.stats.ordersFulfilled += 1;
  addXP(o.xp);
  sfx.order(); sfx.coin();
  toast(`Order fulfilled! +${o.reward}`, 'gold');
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
  track('order_fulfilled', { reward: o.reward });
  checkAchievements();
}

export function renderOrders(): void {
  const list = document.getElementById('orders-list')!;
  list.innerHTML = '';
  if (state.orders.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:#888;padding:8px;font-size:11px">No orders. Level up to attract customers!</div>';
    return;
  }
  for (const o of state.orders) {
    const card = document.createElement('div');
    card.className = 'order-card';
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
    card.innerHTML = `
      <div>${itemsHTML}</div>
      <div class="order-items">
        <div class="order-reward">
          <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">+${o.reward}
        </div>
        <div class="order-reward">
          <img class="ico-mini" src="${sprites.item.xp!.toDataURL()}">+${o.xp}
        </div>
      </div>
      <button class="order-fulfill" ${can ? '' : 'disabled'} data-id="${o.id}">
        ${can ? 'Deliver' : 'Need items'}
      </button>
    `;
    list.appendChild(card);
  }
  list.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach(btn =>
    btn.addEventListener('click', () => fulfillOrder(btn.dataset.id!))
  );
}
