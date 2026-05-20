// =============================================================
//  FRIENDSHIP UI — see neighbors, friendship levels, daily gifts.
// =============================================================

import { state } from '../state';
import { VILLAGERS, VILLAGER_IDS } from '../data/characters';
import { openModal } from './modal';
import {
  initFriendship, friendshipLevel, friendshipXp,
  friendshipNeedForNext, claimDailyGift, canClaimDailyGift, friendshipHearts,
} from '../systems/friendship';
import { updateHUD } from './hud';

export function openFriendshipPanel(): void {
  initFriendship();
  openModal('🤝 Neighbors', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function render(body: HTMLElement): void {
  let html = `<p style="margin:0 0 10px;color:#666;font-size:12px">Deliver orders and help with requests to grow friendships. Higher friendships unlock daily gifts and bonus rewards.</p>`;
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
          ${giftReady ? '🎁 Claim daily gift' : lvl < 2 ? 'Lv 2 for gifts' : '✓ Gift claimed today'}
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
}
