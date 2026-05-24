// =============================================================
//  TRAIN DELIVERY UI — load crates, send the train, collect on return.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initTrain, loadTrainCrate, unloadTrainCrate, sendTrain,
  collectTrainReturn, trainCrateSlots, trainStatusLabel, upgradeTrainStation,
} from '../systems/train';
import { updateHUD } from './hud';
import { startVisibleTicker } from './visible-ticker';

export function openTrainPanel(): void {
  initTrain();
  const t = state.train!;
  if (!t.unlocked) {
    openModal('🚂 Train Station', null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    document.getElementById('modal-body')!.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:12px">🚂</div>
        <h3>Locked</h3>
        <p>The Train Station opens at <b>Level 13</b>. Trains bring back rare upgrade materials.</p>
      </div>`;
    return;
  }
  openModal('🚂 Train Station', null);
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
  const t = state.train!;
  let html = `
    <div class="train-header">
      <h3>Train Station <small>Lv ${t.level}</small></h3>
      <div class="train-status">${trainStatusLabel()}</div>
    </div>
  `;
  if (t.status === 'returned') {
    html += `
      <div class="train-returned">
        <p>The train is back from <b>${t.routeId}</b>!</p>
        <div class="train-rewards">
          ${Object.entries(t.pendingRewards).map(([k, n]) => {
            if (k === '__coins') return `<div class="train-reward">${n}💰</div>`;
            if (k === '__xp') return `<div class="train-reward">${n}XP</div>`;
            return `<div class="train-reward"><img class="ico-mini" src="${sprites.item[k]?.toDataURL() ?? ''}">×${n} ${ITEMS[k]?.name ?? k}</div>`;
          }).join('')}
        </div>
        <button class="btn primary" id="train-collect">Collect</button>
      </div>`;
  } else if (t.status === 'away') {
    html += '<div style="text-align:center;padding:24px;color:#666">The train is on its way to ' + t.routeId + '. Check back later!</div>';
  } else {
    // Idle / loading
    const slots = trainCrateSlots();
    html += `<div class="train-crate-section">
      <div class="train-crate-row train-crate-slot-info">Crates: <b>${t.loadedCrates.length} / ${slots}</b></div>
      <div class="train-crate-list">`;
    for (const [i, c] of t.loadedCrates.entries()) {
      html += `
        <div class="train-crate">
          <img class="ico" src="${sprites.item[c.itemKey]?.toDataURL() ?? ''}">
          <span>${c.qty}× ${ITEMS[c.itemKey]?.name}</span>
          <button class="btn small" data-unload="${i}">Remove</button>
        </div>`;
    }
    html += `</div></div>`;

    if (t.loadedCrates.length < slots) {
      // Inventory picker
      const keys = Object.keys(state.inv).filter(k => (state.inv[k] ?? 0) > 0 && ITEMS[k]);
      html += '<div class="train-loadable-title">Add a crate:</div>';
      html += '<div class="train-loadable-grid">';
      for (const k of keys) {
        const have = state.inv[k] ?? 0;
        const qty = Math.min(5, have);
        html += `
          <button class="train-loadable" data-load="${k}" data-qty="${qty}">
            <img class="ico" src="${sprites.item[k]?.toDataURL() ?? ''}">
            <span>${ITEMS[k]!.name}</span>
            <small>${qty} × (have ${have})</small>
          </button>`;
      }
      html += '</div>';
    }

    html += `
      <div class="train-actions">
        <button class="btn primary" id="train-send" ${t.loadedCrates.length === 0 ? 'disabled' : ''}>🚂 Send Train</button>
        <button class="btn" id="train-upgrade">Upgrade Station (${800 + t.level * 600}💰 + planks)</button>
      </div>
    `;
  }

  body.innerHTML = html;

  body.querySelectorAll<HTMLButtonElement>('button[data-unload]').forEach(btn =>
    btn.addEventListener('click', () => {
      unloadTrainCrate(parseInt(btn.dataset.unload!, 10));
      render(body);
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-load]').forEach(btn =>
    btn.addEventListener('click', () => {
      loadTrainCrate(btn.dataset.load!, parseInt(btn.dataset.qty!, 10));
      render(body);
    }),
  );
  const sendBtn = body.querySelector<HTMLButtonElement>('#train-send');
  if (sendBtn) sendBtn.addEventListener('click', () => {
    if (sendTrain()) render(body);
  });
  const upBtn = body.querySelector<HTMLButtonElement>('#train-upgrade');
  if (upBtn) upBtn.addEventListener('click', () => {
    if (upgradeTrainStation()) {
      updateHUD();
      render(body);
    }
  });
  const collectBtn = body.querySelector<HTMLButtonElement>('#train-collect');
  if (collectBtn) collectBtn.addEventListener('click', () => {
    if (collectTrainReturn()) {
      updateHUD();
      render(body);
    }
  });
}
