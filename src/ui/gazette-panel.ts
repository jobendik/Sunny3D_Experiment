// =============================================================
//  SUNNY GAZETTE UI — daily newspaper feed.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGERS } from '../data/characters';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { initGazette, refreshGazette, buyNeighborSale, fulfillHelpRequest, markGazetteRead } from '../systems/gazette';
import { updateHUD } from './hud';

export function openGazette(): void {
  initGazette();
  markGazetteRead();
  if (state.gazette!.day !== state.day) refreshGazette();
  openModal('📰 Sunny Gazette', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function render(body: HTMLElement): void {
  const g = state.gazette!;
  let html = `<h2 class="gazette-title">Day ${state.day} · Sunny Acres</h2>`;

  // Articles
  for (const a of g.articles) {
    html += `<div class="gazette-card gazette-${a.type}">
      <h4>${a.title}</h4>
      <p>${a.body}</p>
    </div>`;
  }

  // Neighbor sales
  if (g.neighborSales.length > 0) {
    html += '<h3 class="gazette-section-title">🛒 Neighbor Sales</h3>';
    html += '<div class="gazette-neighbor-grid">';
    for (const offer of g.neighborSales) {
      const v = VILLAGERS[offer.neighborId];
      if (!v) continue;
      const it = ITEMS[offer.itemKey];
      const total = offer.qty * offer.pricePerUnit;
      const disabled = offer.bought || state.coins < total;
      html += `
        <div class="gazette-offer ${offer.bought ? 'bought' : ''}" style="--cust-accent:${v.accent}">
          <div class="gazette-offer-row">
            <span class="gazette-offer-emoji">${v.emoji}</span>
            <b>${v.name}</b>
            <small>· ${v.role}</small>
          </div>
          <div class="gazette-offer-row">
            <img class="ico-mini" src="${sprites.item[offer.itemKey]?.toDataURL() ?? ''}">
            <span>${offer.qty}× ${it?.name ?? offer.itemKey}</span>
            <span class="gazette-offer-price">${total}💰</span>
          </div>
          <button class="btn small primary" data-buy-neighbor="${offer.neighborId}" data-buy-item="${offer.itemKey}" ${disabled ? 'disabled' : ''}>
            ${offer.bought ? '✓ Bought' : 'Buy'}
          </button>
        </div>
      `;
    }
    html += '</div>';
  }

  // Help requests
  if (g.helpRequests.length > 0) {
    html += '<h3 class="gazette-section-title">🙏 Help Wanted</h3>';
    html += '<div class="gazette-help-grid">';
    for (const req of g.helpRequests) {
      const v = VILLAGERS[req.neighborId];
      if (!v) continue;
      const it = ITEMS[req.itemKey];
      const have = state.inv[req.itemKey] ?? 0;
      const enough = have >= req.qty;
      html += `
        <div class="gazette-help ${req.done ? 'done' : ''}" style="--cust-accent:${v.accent}">
          <div class="gazette-help-row">
            <span class="gazette-offer-emoji">${v.emoji}</span>
            <b>${v.name}</b>
            <small>· ${v.role}</small>
          </div>
          <div class="gazette-help-row">
            <span>Needs:</span>
            <img class="ico-mini" src="${sprites.item[req.itemKey]?.toDataURL() ?? ''}">
            <span>${req.qty}× ${it?.name ?? req.itemKey}</span>
            <small style="opacity:0.6">(have ${have})</small>
          </div>
          <div class="gazette-help-rewards">
            <span class="gazette-reward">+${req.rewardCoins}💰</span>
            <span class="gazette-reward">+${req.rewardXp}XP</span>
            ${req.rewardMaterial ? `<span class="gazette-reward gazette-reward-mat"><img class="ico-mini" src="${sprites.item[req.rewardMaterial]?.toDataURL() ?? ''}">+1</span>` : ''}
          </div>
          <button class="btn small primary" data-help="${req.id}" ${req.done || !enough ? 'disabled' : ''}>
            ${req.done ? '✓ Helped' : enough ? 'Help' : 'Not enough'}
          </button>
        </div>
      `;
    }
    html += '</div>';
  }

  body.innerHTML = html;

  body.querySelectorAll<HTMLButtonElement>('button[data-buy-neighbor]').forEach(btn =>
    btn.addEventListener('click', () => {
      const nb = btn.dataset.buyNeighbor!;
      const it = btn.dataset.buyItem!;
      if (buyNeighborSale(nb, it)) {
        updateHUD();
        render(body);
      }
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-help]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (fulfillHelpRequest(btn.dataset.help!)) {
        updateHUD();
        render(body);
      }
    }),
  );
}
