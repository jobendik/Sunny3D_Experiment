// =============================================================
//  WEATHER GRID PANEL — the signature mechanic. Players craft
//  weather cards and slot them into the programmable grid.
// =============================================================

import { state } from '../state';
import { WEATHER_CARDS, ALL_CARD_IDS } from '../data/weather-cards';
import {
  initWeatherGrid, craftCard, slotCard, castGrid, maybeUnlockGrid,
  regenerateCharges,
} from '../systems/weather-grid';
import { openModal } from './modal';
import { sprites } from '../sprites';
import { sfx } from '../audio/sfx';
import { toast } from './toasts';

export function openWeatherGrid(): void {
  initWeatherGrid();
  maybeUnlockGrid();
  regenerateCharges();
  openModal('🌦️ Weather Mastery Grid', [
    { key: 'grid',  label: 'Grid',  render: renderGrid },
    { key: 'craft', label: 'Craft', render: renderCraft },
    { key: 'info',  label: 'About', render: renderInfo },
  ], 'grid');
}

function renderGrid(body: HTMLElement): void {
  const g = state.weatherGrid!;
  const owned = g.ownedCards;
  body.innerHTML = `
    <div class="wgrid-status">
      <div class="wgrid-charges">⚡ Charges: <b>${g.charges}</b></div>
      <button class="btn primary" id="wgrid-cast" ${g.slots.some(Boolean) && g.charges > 0 ? '' : 'disabled'}>
        Cast Active Slots
      </button>
    </div>
    <div class="wgrid-slots">
      ${g.slots.map((slotId, i) => `
        <div class="wgrid-slot" data-slot="${i}">
          ${slotId ? renderCardChip(slotId, true) : `<div class="wgrid-empty">+ Empty Slot</div>`}
        </div>
      `).join('')}
    </div>
    <h4>Owned Cards</h4>
    <div class="wgrid-owned">
      ${owned.length === 0 ? '<div class="empty">No cards yet — go craft some.</div>' :
        owned.map(c => renderCardChip(c, false)).join('')}
    </div>
    ${g.activations.length ? `
      <h4>Active Effects</h4>
      <div class="wgrid-active">
        ${g.activations.flatMap(a => a.slottedCards).map(c => `
          <div class="wgrid-active-card">${WEATHER_CARDS[c]!.name}</div>
        `).join('')}
      </div>` : ''}
  `;
  // Slot click: cycle through cards or remove
  body.querySelectorAll<HTMLElement>('.wgrid-slot').forEach((slotEl, idx) => {
    slotEl.addEventListener('click', () => {
      const cur = g.slots[idx];
      const idxOwned = cur ? owned.indexOf(cur) : -1;
      const next = idxOwned < 0 ? owned[0] ?? null : owned[idxOwned + 1] ?? null;
      slotCard(idx, next);
      renderGrid(body);
    });
  });
  // Owned card click: place into first empty slot
  body.querySelectorAll<HTMLElement>('.wgrid-owned .wgrid-card').forEach(el => {
    el.addEventListener('click', () => {
      const cardId = el.dataset.card!;
      const empty = g.slots.findIndex(s => !s);
      if (empty < 0) { toast('All slots full!', 'error'); sfx.error(); return; }
      slotCard(empty, cardId);
      renderGrid(body);
    });
  });
  // Cast
  const cast = document.getElementById('wgrid-cast');
  if (cast) cast.addEventListener('click', () => { if (castGrid()) renderGrid(body); });
}

function renderCardChip(id: string, slotted: boolean): string {
  const d = WEATHER_CARDS[id];
  if (!d) return '';
  return `
    <div class="wgrid-card rarity-${d.rarity}" data-card="${id}">
      <div class="wgrid-card-name">${d.name}</div>
      <div class="wgrid-card-desc">${d.desc}</div>
      <div class="wgrid-card-dur">⏱ ${d.duration}s</div>
      ${slotted ? '<div class="wgrid-card-slotted">SLOTTED</div>' : ''}
    </div>
  `;
}

function renderCraft(body: HTMLElement): void {
  body.innerHTML = `
    <div class="wgrid-craft-grid">
      ${ALL_CARD_IDS.map(id => {
        const d = WEATHER_CARDS[id]!;
        const locked = state.level < d.level;
        const owned = state.weatherGrid!.ownedCards.includes(id);
        return `
          <div class="shop-item rarity-${d.rarity}">
            <div class="name">${d.name}${owned ? ' ★' : ''}</div>
            <div style="font-size:11px;color:#666">${d.desc}</div>
            <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${d.cost}</div>
            <button data-craft="${id}" ${locked ? 'disabled' : ''}>${locked ? `Lv ${d.level}` : 'Craft'}</button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-craft]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (craftCard(btn.dataset.craft!)) renderCraft(body);
    });
  });
}

function renderInfo(body: HTMLElement): void {
  body.innerHTML = `
    <div class="news-content">
      <h2>How the Weather Grid works</h2>
      <p>
        Craft <b>Weather Cards</b> that change the weather, boost growth/yield/sell, or
        protect your farm. Slot up to ${state.weatherGrid!.slots.length} cards into the grid,
        then <b>Cast</b> to activate them simultaneously.
      </p>
      <p>You regenerate <b>2 charges per day</b>. Plan your casts around quests, orders, and events.</p>
      <p>Effects stack — chaining a yield card with a market card and a forecast can be wildly lucrative.</p>
    </div>
  `;
}
