// =============================================================
//  WELCOME BACK — show an idle-income summary modal on return.
//  Highlights what's waiting so the player feels their farm has
//  been productive in their absence.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { computeIdleSummary, formatAway } from '../systems/idle-income';
import { openModal, closeModal } from './modal';

export function maybeOpenWelcomeBack(): void {
  if (typeof state.lastSessionEndedAt !== 'number') return;
  const away = Date.now() - state.lastSessionEndedAt;
  // Only show after a meaningful absence (60s+)
  if (away < 60000) return;
  const summary = computeIdleSummary(away);
  if (summary.cropsReady + summary.treesReady === 0
    && Object.keys(summary.produceReady).length === 0
    && Object.keys(summary.recipesReady).length === 0) {
    return;
  }
  openModal('🌅 Welcome Back!', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  const proRows = Object.entries(summary.produceReady).map(([k, n]) =>
    `<div class="wb-row"><img class="ico-mini" src="${sprites.item[k]!.toDataURL()}"><span>${n}× ${ITEMS[k]!.name}</span></div>`,
  ).join('');
  const recRows = Object.entries(summary.recipesReady).map(([k, n]) =>
    `<div class="wb-row"><img class="ico-mini" src="${sprites.item[k]!.toDataURL()}"><span>${n}× ${ITEMS[k]!.name}</span></div>`,
  ).join('');
  body.innerHTML = `
    <div class="welcome-back-card">
      <div class="wb-headline">You were away for <b>${formatAway(summary.awaySeconds)}</b></div>
      <div class="wb-subheadline">While you were gone, your farm got busy:</div>
      <div class="wb-grid">
        ${summary.cropsReady ? `<div class="wb-block"><div class="wb-big">${summary.cropsReady}</div><div class="wb-cap">Crops ready</div></div>` : ''}
        ${summary.treesReady ? `<div class="wb-block"><div class="wb-big">${summary.treesReady}</div><div class="wb-cap">Trees ready</div></div>` : ''}
        ${Object.keys(summary.produceReady).length ? `<div class="wb-block"><div class="wb-big">${Object.values(summary.produceReady).reduce((a, n) => a + n, 0)}</div><div class="wb-cap">From pens</div>${proRows}</div>` : ''}
        ${Object.keys(summary.recipesReady).length ? `<div class="wb-block"><div class="wb-big">${Object.values(summary.recipesReady).reduce((a, n) => a + n, 0)}</div><div class="wb-cap">From factories</div>${recRows}</div>` : ''}
      </div>
      ${summary.totalSellValue ? `<div class="wb-value">~${summary.totalSellValue.toLocaleString()}💰 if you sell it all</div>` : ''}
      <button id="wb-collect" class="btn primary">Let's Go!</button>
    </div>
  `;
  document.getElementById('wb-collect')!.addEventListener('click', closeModal);
}
