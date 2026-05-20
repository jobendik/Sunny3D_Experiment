// =============================================================
//  WEATHER GRID PANEL — the signature mechanic. Players craft
//  weather cards and slot them into the programmable grid.
// =============================================================

import { state } from '../state';
import { WEATHER_CARDS, ALL_CARD_IDS } from '../data/weather-cards';
import {
  initWeatherGrid, craftCard, slotCard, castGrid, maybeUnlockGrid,
  regenerateCharges, activeRemainingSeconds, activeEffects,
} from '../systems/weather-grid';
import { openModal } from './modal';
import { sprites } from '../sprites';
import { sfx } from '../audio/sfx';
import { toast } from './toasts';

// Card icon stand-ins (procedural sprites aren't generated for weather cards
// yet; using contextual emoji keeps the panel readable and themed).
const CARD_ICONS: Record<string, string> = {
  sunbeam: '☀️',
  rainmaker: '🌧️',
  breeze: '🍃',
  thaw: '🌸',
  bountiful: '🌾',
  marketwind: '💱',
  thunderhead: '⛈️',
  goldenhour: '🌟',
  hightide: '🌊',
  serenity: '🕊️',
};

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
  const eff = activeEffects();
  const remain = activeRemainingSeconds();
  const remainStr = remain > 60
    ? `${Math.ceil(remain / 60)}m`
    : `${Math.ceil(remain)}s`;
  // Build a "what you'll change" preview from the currently slotted cards so the
  // player understands the cast outcome BEFORE spending a charge.
  const slotted = g.slots.filter(Boolean) as string[];
  const previewLines: string[] = [];
  for (const id of slotted) {
    const e = WEATHER_CARDS[id]!.effect;
    if (e.forceWeather) previewLines.push(`Forces ${e.forceWeather} weather`);
    if (e.growthBonus) previewLines.push(`+${Math.round(e.growthBonus * 100)}% crop growth`);
    if (e.yieldBonus) previewLines.push(`+${Math.round(e.yieldBonus * 100)}% harvest yield`);
    if (e.sellBonus) previewLines.push(`+${Math.round(e.sellBonus * 100)}% sell prices`);
    if (e.productionSpeed) previewLines.push(`+${Math.round(e.productionSpeed * 100)}% production speed`);
    if (e.noCrows) previewLines.push('Wards off crows');
    if (e.moodFloor) previewLines.push(`Animal mood floor ${e.moodFloor}`);
    if (e.fishingRareBonus) previewLines.push(`+${Math.round(e.fishingRareBonus * 100)}% rare fish bias`);
  }
  body.innerHTML = `
    <div class="wgrid-status">
      <div class="wgrid-charges">⚡ Charges: <b>${g.charges}</b><small> / ${4}</small></div>
      <button class="btn primary" id="wgrid-cast" ${slotted.length > 0 && g.charges > 0 ? '' : 'disabled'}>
        ✨ Cast ${slotted.length || ''}
      </button>
    </div>
    <div class="wgrid-slots">
      ${g.slots.map((slotId, i) => `
        <div class="wgrid-slot ${slotId ? 'wgrid-slot-filled' : ''}" data-slot="${i}">
          ${slotId ? renderCardChip(slotId, true) : `<div class="wgrid-empty">+ Empty<br><small>Slot ${i + 1}</small></div>`}
        </div>
      `).join('')}
    </div>
    ${previewLines.length ? `
      <div class="wgrid-preview">
        <div class="wgrid-preview-title">If you cast now:</div>
        <ul class="wgrid-preview-list">
          ${previewLines.map(l => `<li>${l}</li>`).join('')}
        </ul>
      </div>` : ''}
    <h4>Owned Cards</h4>
    <div class="wgrid-owned">
      ${owned.length === 0 ? '<div class="empty">No cards yet — switch to Craft tab.</div>' :
        owned.map(c => renderCardChip(c, false)).join('')}
    </div>
    ${g.activations.length ? `
      <h4>🌈 Active Effects <small style="font-weight:600;color:#888">(${remainStr} left)</small></h4>
      <div class="wgrid-effects-summary">
        ${eff.growth ? `<span class="wgrid-eff-pill">🌱 +${Math.round(eff.growth*100)}% growth</span>` : ''}
        ${eff.yieldBonus ? `<span class="wgrid-eff-pill">🌾 +${Math.round(eff.yieldBonus*100)}% yield</span>` : ''}
        ${eff.sellBonus ? `<span class="wgrid-eff-pill">💰 +${Math.round(eff.sellBonus*100)}% sell</span>` : ''}
        ${eff.productionSpeed ? `<span class="wgrid-eff-pill">🏭 +${Math.round(eff.productionSpeed*100)}% speed</span>` : ''}
        ${eff.noCrows ? `<span class="wgrid-eff-pill">🐦 No crows</span>` : ''}
        ${eff.fishingRareBonus ? `<span class="wgrid-eff-pill">🐟 +${Math.round(eff.fishingRareBonus*100)}% rare fish</span>` : ''}
        ${eff.moodFloor ? `<span class="wgrid-eff-pill">🐮 Mood ≥ ${eff.moodFloor}</span>` : ''}
      </div>
      <div class="wgrid-active">
        ${g.activations.flatMap(a => a.slottedCards).map(c => `
          <div class="wgrid-active-card">${CARD_ICONS[c] ?? '🌦️'} ${WEATHER_CARDS[c]!.name}</div>
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
  const icon = CARD_ICONS[id] ?? '🌦️';
  return `
    <div class="wgrid-card rarity-${d.rarity}" data-card="${id}">
      <div class="wgrid-card-icon">${icon}</div>
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
        const icon = CARD_ICONS[id] ?? '🌦️';
        return `
          <div class="shop-item rarity-${d.rarity}">
            <div class="name"><span style="font-size:18px">${icon}</span> ${d.name}${owned ? ' ★' : ''}</div>
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
      <h2>🌦️ Mastering the Weather</h2>
      <p style="font-style:italic;color:#7a6040">
        "Hazel says you don't fight the weather — you harmonize with it."
      </p>
      <p>
        <b>1.</b> <b>Craft</b> Weather Cards in the Craft tab using coins (one-time cost).
      </p>
      <p>
        <b>2.</b> <b>Slot</b> up to ${state.weatherGrid!.slots.length} cards into the grid by
        tapping the empty slots or tapping cards in your Owned row.
      </p>
      <p>
        <b>3.</b> <b>Cast</b> to activate every slotted card at once. Each cast spends one charge.
      </p>
      <p>You regenerate <b>2 charges per day</b>. Charges cap at 8 — log in regularly!</p>
      <p>
        <b>Stacking tip:</b> chain a yield card with a market card the morning of a big
        Order delivery for huge profit. Add a Rainmaker before a long crop is planted to
        speed it past 50%.
      </p>
      <p>
        <b>Strategy:</b>
        <br>• <b>Sunbeam</b> + <b>Bountiful</b> = sun-baked super harvest
        <br>• <b>Rainmaker</b> + <b>Market Wind</b> = grow & sell at peak
        <br>• <b>Calming Breeze</b> + <b>Serenity</b> = perfect day, no chaos
        <br>• <b>Golden Hour</b> alone = a short but explosive burst
      </p>
    </div>
  `;
}
