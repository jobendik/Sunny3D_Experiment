// =============================================================
//  MARKET STALL UI — list items for sale, see active listings,
//  collect coins from completed sales.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { nowSeconds } from '../utils';
import { openModal } from './modal';
import {
  initMarketStall, listItemForSale, cancelListing, collectListing,
  priceRangeFor, reputationTier, collectAll,
  dailyListingCap, stallListingsRemainingToday,
} from '../systems/market-stall';
import { updateHUD } from './hud';
import { sfx } from '../audio/sfx';
import { toast } from './toasts';

export function openMarketStall(): void {
  initMarketStall();
  const stall = state.marketStall!;
  if (!stall.unlocked) {
    openModal('🛒 Roadside Market Stall', null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    document.getElementById('modal-body')!.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:12px">🛒</div>
        <h3>Locked</h3>
        <p>The Market Stall unlocks at <b>Level 4</b>. Keep farming!</p>
      </div>`;
    return;
  }
  openModal('🛒 Roadside Market Stall', [
    { key: 'active',  label: 'My Stall',  render: renderActive },
    { key: 'list',    label: 'List Item', render: renderListPicker },
  ], 'active');
}

function renderActive(body: HTMLElement): void {
  const stall = state.marketStall!;
  const rep = reputationTier();
  const slots = stall.maxSlots;
  const filled = stall.slots.length;
  const soldCount = stall.slots.filter(s => s.status === 'sold').length;
  const listed = stall.listedToday ?? 0;
  const listingCap = dailyListingCap();
  const remaining = stallListingsRemainingToday();
  let html = `
    <div class="stall-header">
      <div class="stall-rep">
        <div class="stall-rep-name">Reputation: <b>${rep.name}</b></div>
        <div class="stall-rep-bar"><div class="stall-rep-fill" style="width:${rep.pct}%"></div></div>
        <div class="stall-rep-num">${stall.reputation} / 1000 · ${stall.lifetimeSales} lifetime sales</div>
      </div>
      <div class="stall-slot-info">
        Slots: <b>${filled} / ${slots}</b>
        <small>${slots < 5 ? `Lv ${slots === 2 ? 8 : slots === 3 ? 14 : 20} → +1 slot` : 'Max'}</small>
      </div>
    </div>
    <div class="stall-cap-row ${remaining <= 0 ? 'is-empty' : ''}">
      <span>Daily listing slips</span>
      <b>${listed} / ${listingCap}</b>
      <small>${remaining > 0 ? `${remaining} left today` : 'More slips tomorrow'}</small>
    </div>
  `;
  if (soldCount > 0) {
    html += `<button class="btn primary stall-collect-all" id="stall-collect-all">💱 Collect All (${soldCount} sold)</button>`;
  }
  if (stall.slots.length === 0) {
    html += `<div style="text-align:center;padding:18px;color:#888">No items listed. Tap <b>List Item</b> to add some.</div>`;
  } else {
    html += '<div class="stall-slots">';
    for (const s of stall.slots) {
      const itemDef = ITEMS[s.itemKey];
      if (!itemDef) continue;
      const total = s.qty * s.pricePerUnit;
      const sold = s.status === 'sold';
      const elapsed = Math.floor(nowSeconds() - s.listedAt);
      html += `
        <div class="stall-slot ${sold ? 'sold' : ''}">
          <img class="ico" src="${sprites.item[s.itemKey]!.toDataURL()}">
          <div class="stall-slot-body">
            <div class="stall-slot-name">${s.qty}× ${itemDef.name}</div>
            <div class="stall-slot-price">${s.pricePerUnit}💰 each · ${total}💰 total</div>
            <div class="stall-slot-meta">${sold ? `Sold to ${s.buyerName ?? 'a customer'}!` : `Listed ${formatAgo(elapsed)} · ${Math.round(s.saleProb * 100)}%/min`}</div>
          </div>
          <div class="stall-slot-actions">
            ${sold
              ? `<button class="btn primary" data-collect="${s.id}">Collect</button>`
              : `<button class="btn small" data-cancel="${s.id}">Cancel</button>`}
          </div>
        </div>
      `;
    }
    html += '</div>';
  }
  body.innerHTML = html;
  body.querySelectorAll<HTMLButtonElement>('button[data-collect]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (collectListing(btn.dataset.collect!)) {
        updateHUD();
        renderActive(body);
      }
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-cancel]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (cancelListing(btn.dataset.cancel!)) renderActive(body);
    }),
  );
  const collectAllBtn = document.getElementById('stall-collect-all');
  if (collectAllBtn) {
    collectAllBtn.addEventListener('click', () => {
      const got = collectAll();
      if (got > 0) {
        updateHUD();
        renderActive(body);
      }
    });
  }
}

function renderListPicker(body: HTMLElement): void {
  const remaining = stallListingsRemainingToday();
  if (remaining <= 0) {
    body.innerHTML = `
      <div class="stall-cap-empty">
        <div class="stall-cap-empty-icon">ðŸ§¾</div>
        <h3>Daily slips used</h3>
        <p>Maggie will bring fresh listing slips tomorrow. Sold slots can still be collected.</p>
        <button class="btn primary" id="stall-back-active">Back to stall</button>
      </div>
    `;
    body.querySelector('#stall-back-active')!.addEventListener('click', () => renderActive(body));
    return;
  }
  const keys = Object.keys(state.inv).filter(k => (state.inv[k] ?? 0) > 0 && ITEMS[k]);
  if (keys.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:18px;color:#888">You have no items to sell yet.</div>';
    return;
  }
  body.innerHTML = `
    <p style="margin:0 0 10px;font-size:12px;color:#666">Pick an item from your barn to list at the market stall. ${remaining} listing slip${remaining === 1 ? '' : 's'} left today.</p>
    <div class="stall-list-grid">
      ${keys.map(k => `
        <button class="stall-list-item" data-pick="${k}">
          <img class="ico" src="${sprites.item[k]!.toDataURL()}">
          <div class="stall-list-item-name">${ITEMS[k]!.name}</div>
          <div class="stall-list-item-qty">×${state.inv[k]}</div>
        </button>
      `).join('')}
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach(btn =>
    btn.addEventListener('click', () => renderListEditor(body, btn.dataset.pick!)),
  );
}

function renderListEditor(body: HTMLElement, itemKey: string): void {
  const stall = state.marketStall!;
  const have = state.inv[itemKey] ?? 0;
  const range = priceRangeFor(itemKey);
  const itemDef = ITEMS[itemKey]!;
  let qty = Math.min(5, have);
  let price = range.recommended;
  function paint(): void {
    const remaining = stallListingsRemainingToday();
    body.innerHTML = `
      <button class="btn small stall-list-back" id="stall-list-back">← Back</button>
      <div class="stall-list-editor">
        <div class="stall-list-editor-row">
          <img class="ico-big" src="${sprites.item[itemKey]!.toDataURL()}">
          <div class="stall-list-editor-name">${itemDef.name}</div>
        </div>
        <div class="stall-list-editor-controls">
          <div class="stall-edit-label">Quantity</div>
          <div class="stall-edit-row">
            <button class="btn small" id="qty-minus">−</button>
            <span class="stall-edit-value">${qty}</span>
            <button class="btn small" id="qty-plus">+</button>
            <small style="opacity:0.6">/ ${have} in barn</small>
          </div>
          <div class="stall-edit-label">Price per unit</div>
          <div class="stall-edit-row">
            <button class="btn small" id="price-minus">−</button>
            <span class="stall-edit-value">${price}💰</span>
            <button class="btn small" id="price-plus">+</button>
            <small style="opacity:0.6">range ${range.min}–${range.max}</small>
          </div>
          <div class="stall-edit-summary">
            Total: <b>${qty * price}💰</b> if sold
          </div>
          <button class="btn primary" id="stall-confirm-list" ${qty <= 0 || stall.slots.length >= stall.maxSlots || remaining <= 0 ? 'disabled' : ''}>
            ${stall.slots.length >= stall.maxSlots ? 'All slots full' : remaining <= 0 ? 'No slips left today' : 'List for sale'}
          </button>
        </div>
      </div>
    `;
    body.querySelector('#stall-list-back')!.addEventListener('click', () => renderListPicker(body));
    body.querySelector('#qty-minus')!.addEventListener('click', () => { qty = Math.max(1, qty - 1); paint(); });
    body.querySelector('#qty-plus')!.addEventListener('click', () => { qty = Math.min(have, qty + 1); paint(); });
    body.querySelector('#price-minus')!.addEventListener('click', () => {
      const step = price > 100 ? 5 : 1;
      price = Math.max(range.min, price - step);
      paint();
    });
    body.querySelector('#price-plus')!.addEventListener('click', () => {
      const step = price > 100 ? 5 : 1;
      price = Math.min(range.max, price + step);
      paint();
    });
    body.querySelector('#stall-confirm-list')!.addEventListener('click', () => {
      if (listItemForSale(itemKey, qty, price)) {
        sfx.click();
        toast(`${qty}× ${itemDef.name} listed at ${price}💰 each.`, 'xp');
        renderActive(body);
      }
    });
  }
  paint();
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
}
