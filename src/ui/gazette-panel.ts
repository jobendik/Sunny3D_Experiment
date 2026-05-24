// =============================================================
//  SUNNY GAZETTE UI — daily newspaper feed.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { VILLAGERS } from '../data/characters';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { initGazette, refreshGazette, buyNeighborSale, fulfillHelpRequest, markGazetteRead } from '../systems/gazette';
import { initDailyDeal, buyDailyDeal, dailyDealAvailable, dailyDealDiscount } from '../systems/daily-deal';
import { advertiseStallListing, getStallAd, AD_DIAMOND_COST } from '../systems/stall-ad';
import { updateHUD } from './hud';
import { renderVirtualList } from './virtual-list';
import type { HelpRequestOffer, NeighborSaleOffer } from '../types';

const GAZETTE_VIRTUAL_THRESHOLD = 12;
const GAZETTE_CARDS_PER_ROW = 2;
const GAZETTE_ROW_HEIGHT = 146;

export function openGazette(): void {
  initGazette();
  initDailyDeal();
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

  // === DAILY DEAL (front-page premium offer) ===
  const dd = state.dailyDeal!;
  const it = ITEMS[dd.itemKey];
  const discount = dailyDealDiscount();
  const canBuy = dailyDealAvailable() && state.gems >= dd.diamondCost;
  html += `
    <div class="gazette-daily-deal">
      <div class="gazette-deal-badge">DAILY DEAL · -${discount}%</div>
      <div class="gazette-deal-content">
        <img class="gazette-deal-icon" src="${sprites.item[dd.itemKey]?.toDataURL() ?? ''}" alt="">
        <div class="gazette-deal-text">
          <div class="gazette-deal-name">${dd.qty}× ${it?.name ?? dd.itemKey}</div>
          <div class="gazette-deal-price">
            <s>${dd.baseCost} 💎</s> <b>${dd.diamondCost} 💎</b>
          </div>
        </div>
        <button class="btn ${canBuy ? 'diamond-btn' : ''}" id="gazette-deal-buy" ${dailyDealAvailable() ? '' : 'disabled'}>
          ${dd.bought ? '✓ Bought' : state.gems < dd.diamondCost ? 'Need 💎' : `Buy for ${dd.diamondCost}💎`}
        </button>
      </div>
    </div>
  `;

  // === Stall Advertisement (paid newspaper boost for Roadside Shop) ===
  const ad = getStallAd();
  if (state.marketStall?.unlocked) {
    html += `
      <div class="gazette-stall-ad">
        <div class="gazette-stall-ad-head">📣 Advertise your Roadside Shop</div>
        ${ad
          ? `<div class="gazette-ad-active">
              Your listings are <b>advertised</b> until day ${ad.expiresDay}!
              <small>Customers buy faster while ads run.</small>
            </div>`
          : `<div class="gazette-ad-pitch">
              <p>Boost stall sale speed for the next 2 days. ${AD_DIAMOND_COST}💎.</p>
              <button class="btn diamond-btn" id="gazette-ad-buy" ${state.gems < AD_DIAMOND_COST ? 'disabled' : ''}>
                Advertise for ${AD_DIAMOND_COST}💎
              </button>
            </div>`
        }
      </div>
    `;
  }

  // Articles
  for (const a of g.articles) {
    html += `<div class="gazette-card gazette-${a.type}">
      <h4>${a.title}</h4>
      <p>${a.body}</p>
    </div>`;
  }

  // Neighbor sales
  if (g.neighborSales.length > 0 && g.neighborSales.length <= GAZETTE_VIRTUAL_THRESHOLD) {
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
  if (g.neighborSales.length > GAZETTE_VIRTUAL_THRESHOLD) {
    html += virtualGazetteSectionHTML('neighbor', 'Neighbor Sales', g.neighborSales.length);
  }

  if (g.helpRequests.length > 0 && g.helpRequests.length <= GAZETTE_VIRTUAL_THRESHOLD) {
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

  if (g.helpRequests.length > GAZETTE_VIRTUAL_THRESHOLD) {
    html += virtualGazetteSectionHTML('help', 'Help Wanted', g.helpRequests.length);
  }

  body.innerHTML = html;
  mountGazetteVirtualLists(body, g.neighborSales, g.helpRequests);

  body.onclick = (event) => {
    const btn = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
    if (!btn) return;
    const nb = btn.dataset.buyNeighbor;
    const item = btn.dataset.buyItem;
    if (nb && item) {
      if (buyNeighborSale(nb, item)) {
        updateHUD();
        render(body);
      }
      return;
    }
    if (btn.dataset.help) {
      if (fulfillHelpRequest(btn.dataset.help)) {
        updateHUD();
        render(body);
      }
      return;
    }
    if (btn.id === 'gazette-deal-buy') {
      if (buyDailyDeal()) render(body);
      return;
    }
    if (btn.id === 'gazette-ad-buy') {
      if (advertiseStallListing()) render(body);
    }
  };
}

function virtualGazetteSectionHTML(kind: 'neighbor' | 'help', title: string, count: number): string {
  const icon = kind === 'neighbor' ? 'ðŸ›’' : 'ðŸ™';
  const rows = Math.ceil(count / GAZETTE_CARDS_PER_ROW);
  return `
    <h3 class="gazette-section-title">${icon} ${title}</h3>
    <p class="virtual-list-note">Virtualized ${rows} rows for smoother newspaper scrolling.</p>
    <div class="gazette-virtual-mount" data-gazette-virtual="${kind}"></div>
  `;
}

function mountGazetteVirtualLists(
  body: HTMLElement,
  sales: NeighborSaleOffer[],
  requests: HelpRequestOffer[],
): void {
  if (sales.length > GAZETTE_VIRTUAL_THRESHOLD) {
    const mount = body.querySelector<HTMLElement>('[data-gazette-virtual="neighbor"]');
    if (mount) {
      renderVirtualList(mount, {
        items: chunk(sales, GAZETTE_CARDS_PER_ROW),
        rowHeight: GAZETTE_ROW_HEIGHT,
        overscan: 3,
        ariaLabel: 'Neighbor sales',
        key: row => row.map(o => `${o.neighborId}:${o.itemKey}`).join('|'),
        renderRow: row => `<div class="virtual-gazette-row">${row.map(neighborOfferHTML).join('')}</div>`,
      });
    }
  }
  if (requests.length > GAZETTE_VIRTUAL_THRESHOLD) {
    const mount = body.querySelector<HTMLElement>('[data-gazette-virtual="help"]');
    if (mount) {
      renderVirtualList(mount, {
        items: chunk(requests, GAZETTE_CARDS_PER_ROW),
        rowHeight: GAZETTE_ROW_HEIGHT,
        overscan: 3,
        ariaLabel: 'Help requests',
        key: row => row.map(r => r.id).join('|'),
        renderRow: row => `<div class="virtual-gazette-row">${row.map(helpRequestHTML).join('')}</div>`,
      });
    }
  }
}

function neighborOfferHTML(offer: NeighborSaleOffer): string {
  const v = VILLAGERS[offer.neighborId];
  if (!v) return '';
  const it = ITEMS[offer.itemKey];
  const total = offer.qty * offer.pricePerUnit;
  const disabled = offer.bought || state.coins < total;
  return `
    <div class="gazette-offer ${offer.bought ? 'bought' : ''}" style="--cust-accent:${v.accent}">
      <div class="gazette-offer-row">
        <span class="gazette-offer-emoji">${v.emoji}</span>
        <b>${v.name}</b>
        <small>Â· ${v.role}</small>
      </div>
      <div class="gazette-offer-row">
        <img class="ico-mini" src="${sprites.item[offer.itemKey]?.toDataURL() ?? ''}">
        <span>${offer.qty}Ã— ${it?.name ?? offer.itemKey}</span>
        <span class="gazette-offer-price">${total}ðŸ’°</span>
      </div>
      <button class="btn small primary" data-buy-neighbor="${offer.neighborId}" data-buy-item="${offer.itemKey}" ${disabled ? 'disabled' : ''}>
        ${offer.bought ? 'âœ“ Bought' : 'Buy'}
      </button>
    </div>
  `;
}

function helpRequestHTML(req: HelpRequestOffer): string {
  const v = VILLAGERS[req.neighborId];
  if (!v) return '';
  const it = ITEMS[req.itemKey];
  const have = state.inv[req.itemKey] ?? 0;
  const enough = have >= req.qty;
  return `
    <div class="gazette-help ${req.done ? 'done' : ''}" style="--cust-accent:${v.accent}">
      <div class="gazette-help-row">
        <span class="gazette-offer-emoji">${v.emoji}</span>
        <b>${v.name}</b>
        <small>Â· ${v.role}</small>
      </div>
      <div class="gazette-help-row">
        <span>Needs:</span>
        <img class="ico-mini" src="${sprites.item[req.itemKey]?.toDataURL() ?? ''}">
        <span>${req.qty}Ã— ${it?.name ?? req.itemKey}</span>
        <small style="opacity:0.6">(have ${have})</small>
      </div>
      <div class="gazette-help-rewards">
        <span class="gazette-reward">+${req.rewardCoins}ðŸ’°</span>
        <span class="gazette-reward">+${req.rewardXp}XP</span>
        ${req.rewardMaterial ? `<span class="gazette-reward gazette-reward-mat"><img class="ico-mini" src="${sprites.item[req.rewardMaterial]?.toDataURL() ?? ''}">+1</span>` : ''}
      </div>
      <button class="btn small primary" data-help="${req.id}" ${req.done || !enough ? 'disabled' : ''}>
        ${req.done ? 'âœ“ Helped' : enough ? 'Help' : 'Not enough'}
      </button>
    </div>
  `;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
