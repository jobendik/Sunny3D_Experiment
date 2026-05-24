// =============================================================
//  REQUEST BOARD PANEL - Club donations and player item requests.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { updateHUD } from './hud';
import {
  initRequestBoard,
  requestBoardRequests,
  requestBoardSummary,
  requestableItems,
  activePlayerRequest,
  createPlayerRequest,
  donateToRequest,
  claimPlayerRequest,
  cancelPlayerRequest,
  itemName,
  statusLabel,
} from '../systems/request-board';
import {
  notificationPermission,
  notificationSupported,
  notificationsEnabled,
  requestGameNotifications,
  setGameNotifications,
} from '../systems/notifications';
import { sfx } from '../audio/sfx';
import { filterFamilyText, familySafeName } from '../systems/family-filter';
import type { ClubDonationRequest } from '../types';

let selectedRequestItem = 'wheat';

export function openRequestBoardPanel(): void {
  initRequestBoard();
  openModal('📌 Request Board', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  initRequestBoard();
  const club = state.club;
  if (!club?.unlocked) {
    body.innerHTML = `
      <div class="empty">
        <h3>📌 Request Board</h3>
        <p>The Club donation board unlocks at Level 15.</p>
      </div>
    `;
    return;
  }

  const summary = requestBoardSummary();
  const requests = requestBoardRequests();
  const playerReq = activePlayerRequest();
  const options = requestableItems();
  if (!options.includes(selectedRequestItem)) selectedRequestItem = options[0] ?? 'wheat';

  body.innerHTML = `
    <div class="request-board-shell">
      ${renderHeader(summary)}
      ${renderPlayerRequest(playerReq, options)}
      <div class="request-board-section-title">Club Requests</div>
      <div class="request-board-list">
        ${requests.filter(r => !r.isPlayerRequest).map(renderRequestCard).join('') || '<div class="empty">No requests right now. Check back soon.</div>'}
      </div>
    </div>
  `;
  bind(body);
}

function renderHeader(summary: ReturnType<typeof requestBoardSummary>): string {
  const perm = notificationPermission();
  const notifCopy = !notificationSupported()
    ? 'Alerts unavailable'
    : notificationsEnabled()
      ? 'Gift alerts on'
      : perm === 'denied'
        ? 'Alerts blocked'
        : 'Enable gift alerts';
  const notifDisabled = !notificationSupported() || perm === 'denied';
  return `
    <div class="request-board-hero">
      <div>
        <h3>Sunny Club Board</h3>
        <p>${escapeHtml(summary.theme)} · donate spare goods, request a small helping hand.</p>
      </div>
      <button type="button" class="request-board-alert" id="request-board-alert" ${notifDisabled ? 'disabled' : ''}>
        ${notifCopy}
      </button>
    </div>
    <div class="request-board-caps">
      <div><b>${summary.donatedToday}</b><span>/ ${summary.donationCap} donated today</span></div>
      <div><b>${summary.receivedToday}</b><span>/ ${summary.receiveCap} received today</span></div>
      <div><b>${summary.openCount}</b><span>open requests</span></div>
    </div>
  `;
}

function renderPlayerRequest(req: ClubDonationRequest | null, options: string[]): string {
  if (req) {
    const pct = Math.round((req.qtyFilled / Math.max(1, req.qtyRequested)) * 100);
    return `
      <div class="request-board-player">
        <div class="request-board-section-title">Your Request</div>
        <div class="request-card request-card--player request-card--${req.status}">
          <div class="request-card-icon">${itemIcon(req.itemKey)}</div>
          <div class="request-card-main">
            <div class="request-card-title">${escapeHtml(itemName(req.itemKey))}</div>
            <div class="request-card-sub">${req.qtyFilled} / ${req.qtyRequested} filled · ${statusLabel(req.status)}</div>
            <div class="request-card-bar"><div style="width:${pct}%"></div></div>
          </div>
          <div class="request-card-actions">
            ${req.status === 'filled'
              ? '<button type="button" class="btn small primary" id="claim-player-request">Claim</button>'
              : req.status === 'open'
                ? '<button type="button" class="btn small" id="cancel-player-request">Cancel</button>'
                : ''}
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="request-board-player">
      <div class="request-board-section-title">Ask The Club</div>
      <div class="request-new-row">
        <select id="request-item-select" aria-label="Item to request">
          ${options.map(k => `<option value="${k}" ${k === selectedRequestItem ? 'selected' : ''}>${escapeHtml(itemName(k))}</option>`).join('')}
        </select>
        <button type="button" class="btn small primary" id="create-player-request">Post request</button>
      </div>
      <p class="request-board-note">One request can be active at a time. Clubmates fill it slowly while you play.</p>
    </div>
  `;
}

function renderRequestCard(req: ClubDonationRequest): string {
  const have = state.inv[req.itemKey] ?? 0;
  const need = req.qtyRequested - req.qtyFilled;
  const pct = Math.round((req.qtyFilled / Math.max(1, req.qtyRequested)) * 100);
  const canDonate = req.status === 'open' && need > 0 && have > 0;
  return `
    <div class="request-card request-card--${req.status}">
      <div class="request-card-avatar">${escapeHtml(req.emoji)}</div>
      <div class="request-card-main">
        <div class="request-card-title">${escapeHtml(familySafeName(req.requesterName))} needs ${escapeHtml(itemName(req.itemKey))}</div>
        <div class="request-card-sub">${req.qtyFilled} / ${req.qtyRequested} filled · You have ${have}</div>
        <div class="request-card-bar"><div style="width:${pct}%"></div></div>
      </div>
      <div class="request-card-icon">${itemIcon(req.itemKey)}</div>
      <div class="request-card-actions">
        <button type="button" class="btn small primary" data-donate="${req.id}" ${canDonate ? '' : 'disabled'}>
          ${req.status === 'open' ? 'Donate' : statusLabel(req.status)}
        </button>
      </div>
    </div>
  `;
}

function bind(body: HTMLElement): void {
  const alertBtn = body.querySelector<HTMLButtonElement>('#request-board-alert');
  alertBtn?.addEventListener('click', async () => {
    if (notificationsEnabled()) {
      setGameNotifications(false);
      render(body);
      return;
    }
    await requestGameNotifications();
    render(body);
  });

  const select = body.querySelector<HTMLSelectElement>('#request-item-select');
  select?.addEventListener('change', () => {
    selectedRequestItem = select.value;
    render(body);
  });

  body.querySelector<HTMLButtonElement>('#create-player-request')?.addEventListener('click', () => {
    if (createPlayerRequest(selectedRequestItem)) {
      updateHUD();
      render(body);
    }
  });

  body.querySelector<HTMLButtonElement>('#claim-player-request')?.addEventListener('click', () => {
    if (claimPlayerRequest()) {
      updateHUD();
      render(body);
    }
  });

  body.querySelector<HTMLButtonElement>('#cancel-player-request')?.addEventListener('click', () => {
    if (cancelPlayerRequest()) render(body);
  });

  body.querySelectorAll<HTMLButtonElement>('[data-donate]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (donateToRequest(btn.dataset.donate!, 1)) {
        updateHUD();
        render(body);
      } else {
        sfx.error();
      }
    });
  });
}

function itemIcon(itemKey: string): string {
  const canvas = sprites.item[itemKey];
  if (canvas) return `<img class="ico" src="${canvas.toDataURL()}" alt="">`;
  const fallback = ITEMS[itemKey]?.icon ?? itemKey;
  return `<span>${escapeHtml(fallback.slice(0, 2).toUpperCase())}</span>`;
}

function escapeHtml(value: string): string {
  return filterFamilyText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
