// =============================================================
//  FRIENDSHIP UI — see neighbors, friendship levels, daily gifts.
// =============================================================

import { state } from '../state';
import { VILLAGERS, VILLAGER_IDS } from '../data/characters';
import { openModal } from './modal';
import {
  initFriendship, friendshipLevel, friendshipXp,
  friendshipNeedForNext, claimDailyGift, canClaimDailyGift, friendshipHearts,
  friendshipGiftsRemainingToday, FRIENDSHIP_DAILY_GIFT_CAP,
} from '../systems/friendship';
import { initVisitorsV2, activeVisitors, serveVisitor, dismissVisitor } from '../systems/visitors-v2';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { updateHUD } from './hud';

export function openFriendshipPanel(): void {
  initFriendship();
  openModal('🤝 Neighbors', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function render(body: HTMLElement): void {
  initVisitorsV2();
  const visitors = activeVisitors();
  const giftsLeft = friendshipGiftsRemainingToday();
  let html = `<p style="margin:0 0 10px;color:#666;font-size:12px">Deliver orders and help with requests to grow friendships. Higher friendships unlock daily gifts and bonus rewards. Gifts today: ${FRIENDSHIP_DAILY_GIFT_CAP - giftsLeft} / ${FRIENDSHIP_DAILY_GIFT_CAP}.</p>`;

  // Walking visitors (Visitor 2.0)
  if (visitors.length > 0) {
    html += '<div style="margin:6px 0 10px"><b>👋 Visitors at the farm</b></div>';
    html += '<div class="landmark-reqs">';
    for (const v of visitors) {
      const have = state.inv[v.itemKey] ?? 0;
      const ok = have >= v.qty;
      html += `<div class="landmark-req">
        <span style="font-size:22px">${v.emoji}</span>
        <div class="landmark-req-name">${v.name}<br><small>wants ${v.qty}× ${ITEMS[v.itemKey]?.name ?? v.itemKey}</small></div>
        <img class="ico" src="${sprites.item[v.itemKey]?.toDataURL() ?? ''}">
        <div class="landmark-req-progress">+${v.reward}💰</div>
        <button class="btn small primary" data-serve="${v.id}" ${ok ? '' : 'disabled'}>${ok ? 'Serve' : 'Need more'}</button>
        <button class="btn small" data-dismiss="${v.id}">Wave off</button>
      </div>`;
    }
    html += '</div>';
  }

  html += '<div class="friend-grid">';
  for (const id of VILLAGER_IDS) {
    const v = VILLAGERS[id]!;
    const lvl = friendshipLevel(id);
    const xp = friendshipXp(id);
    const need = friendshipNeedForNext(id);
    const hearts = friendshipHearts(id);
    const giftReady = canClaimDailyGift(id);
    const entry = state.friendship!.byNeighbor[id]!;
    html += `
      <div class="friend-card" style="--cust-accent:${v.accent}">
        <div class="friend-head">
          <div class="friend-emoji">${v.emoji}</div>
          <div class="friend-meta">
            <div class="friend-name">${v.name} <small>· ${v.role}</small></div>
            <div class="friend-hearts-big">${hearts}</div>
          </div>
        </div>
        <div class="friend-stats">
          Lv ${lvl} · ${xp} / ${need} XP · ${entry.totalDeliveries} deliveries
        </div>
        <div class="friend-bar"><div class="friend-bar-fill" style="width:${Math.min(100, (xp / need) * 100)}%"></div></div>
        <button class="btn small primary" data-gift="${id}" ${giftReady ? '' : 'disabled'}>
          ${giftReady ? '🎁 Claim daily gift' : lvl < 2 ? 'Lv 2 for gifts' : giftsLeft <= 0 && entry.lastGiftDay !== state.day ? 'Daily gift cap reached' : '✓ Gift claimed today'}
        </button>
      </div>
    `;
  }
  html += '</div>';
  body.innerHTML = html;
  body.querySelectorAll<HTMLButtonElement>('button[data-gift]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (claimDailyGift(btn.dataset.gift!)) {
        updateHUD();
        render(body);
      }
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-serve]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (serveVisitor(btn.dataset.serve!)) {
        updateHUD();
        render(body);
      }
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-dismiss]').forEach(btn =>
    btn.addEventListener('click', () => {
      dismissVisitor(btn.dataset.dismiss!);
      render(body);
    }),
  );
}
