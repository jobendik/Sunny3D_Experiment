// =============================================================
//  BOAT DELIVERY UI — fill crates before the boat leaves.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { initBoat, fillBoatCrate, fillBoatCrateMax, boatStatusLabel, instantSummonBoat, BOAT_INSTANT_COST } from '../systems/boat';
import { startVisibleTicker } from './visible-ticker';

export function openBoatPanel(): void {
  initBoat();
  const b = state.boat!;
  if (!b.unlocked) {
    openModal('⛵ Riverboat', null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    document.getElementById('modal-body')!.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:12px">⛵</div>
        <h3>Locked</h3>
        <p>Boat deliveries unlock at <b>Level 9</b> when your production chain matures.</p>
      </div>`;
    return;
  }
  openModal(`⛵ ${b.boatName}`, null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
  startVisibleTicker({
    root: body,
    intervalMs: 1000,
    tick: () => render(body),
    stopWhen: () => !document.getElementById('modal')!.classList.contains('open'),
  });
}

function render(body: HTMLElement): void {
  const b = state.boat!;
  const docked = b.state === 'docked';
  const filled = b.crates.filter(c => c.filled >= c.needed).length;
  const total = b.crates.length;
  body.innerHTML = `
    <div class="boat-header">
      <h3>${b.boatName}</h3>
      <div class="boat-status">${boatStatusLabel()}</div>
      ${total > 0 ? `<div class="boat-progress">Crates filled: <b>${filled}/${total}</b></div>` : ''}
    </div>
    ${docked ? renderCrates() : `
      <div style="text-align:center;padding:24px;color:#666">
        ${b.state === 'departed' || b.state === 'arriving'
          ? 'The boat will arrive soon — your dock fills with crates when it does.'
          : 'No boat at the dock right now.'}
        <div style="margin-top:14px">
          <button class="btn diamond-btn" id="boat-instant" ${state.gems < BOAT_INSTANT_COST ? 'disabled' : ''}>
            💎 ${BOAT_INSTANT_COST} — Summon the boat now
          </button>
        </div>
      </div>`}
    ${b.bonusMaterial && docked ? `
      <div class="boat-bonus">
        Full Boat Bonus: <img class="ico-mini" src="${sprites.item[b.bonusMaterial]?.toDataURL() ?? ''}"> 1 ${ITEMS[b.bonusMaterial]?.name ?? b.bonusMaterial} + 50% reward
      </div>` : ''}
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-fill]').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.fill!, 10);
      fillBoatCrate(idx, 1);
      render(body);
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-max]').forEach(btn =>
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.max!, 10);
      fillBoatCrateMax(idx);
      render(body);
    }),
  );
  const instantBtn = document.getElementById('boat-instant');
  if (instantBtn) {
    instantBtn.addEventListener('click', () => {
      if (instantSummonBoat()) render(body);
    });
  }
}

function renderCrates(): string {
  const b = state.boat!;
  let html = '<div class="boat-crate-grid">';
  for (let i = 0; i < b.crates.length; i++) {
    const c = b.crates[i]!;
    const it = ITEMS[c.itemKey];
    const have = state.inv[c.itemKey] ?? 0;
    const done = c.filled >= c.needed;
    const pct = Math.round((c.filled / c.needed) * 100);
    // Hay Day-style help indicator: ! when the player can't currently
    // fill this crate (no items in barn).
    const needHelp = !done && have < (c.needed - c.filled);
    html += `
      <div class="boat-crate ${done ? 'done' : ''}">
        ${needHelp ? '<span class="boat-help-mark" title="Need more items — friends could help">!</span>' : ''}
        <div class="boat-crate-head">
          <img class="ico" src="${sprites.item[c.itemKey]?.toDataURL() ?? ''}">
          <div class="boat-crate-name">${it?.name ?? c.itemKey}</div>
          <div class="boat-crate-num">${c.filled} / ${c.needed}</div>
        </div>
        <div class="boat-crate-bar"><div class="boat-crate-fill" style="width:${pct}%"></div></div>
        <div class="boat-crate-meta">In barn: ${have}</div>
        <div class="boat-crate-actions">
          <button class="btn small" data-fill="${i}" ${done || have === 0 ? 'disabled' : ''}>+1</button>
          <button class="btn small primary" data-max="${i}" ${done || have === 0 ? 'disabled' : ''}>Max</button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}
