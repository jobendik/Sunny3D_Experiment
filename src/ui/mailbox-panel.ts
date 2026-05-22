// =============================================================
//  MAILBOX PANEL — Alfred letters & gift cards.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import { updateHUD } from './hud';
import { toast } from './toasts';
import {
  initMailbox, claimReward, deleteLetter, deleteRead, markRead,
  senderInfo, unreadCount, totalCount, MAILBOX_CAP, DAILY_LETTER_CAP,
} from '../systems/mailbox';
import type { MailLetter } from '../types';

export function openMailboxPanel(): void {
  initMailbox();
  openModal('📬 Mailbox', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function timeAgo(seconds: number): string {
  const now = performance.now() / 1000;
  const dt = Math.max(0, now - seconds);
  if (dt < 60) return 'just now';
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  if (dt < 86400) return `${Math.floor(dt / 3600)}h ago`;
  return `${Math.floor(dt / 86400)}d ago`;
}

function rewardChips(r: MailLetter['reward']): string {
  if (!r) return '';
  const parts: string[] = [];
  if (r.coins) parts.push(`<span class="mail-reward-chip">+${r.coins}💰</span>`);
  if (r.gems) parts.push(`<span class="mail-reward-chip">+${r.gems}💎</span>`);
  if (r.xp) parts.push(`<span class="mail-reward-chip">+${r.xp}XP</span>`);
  if (r.items) {
    for (const k in r.items) {
      const it = ITEMS[k];
      const icon = sprites.item[k]?.toDataURL();
      parts.push(`<span class="mail-reward-chip">
        ${icon ? `<img class="ico-mini" src="${icon}">` : ''}
        +${r.items[k]} ${it?.name ?? k}
      </span>`);
    }
  }
  return parts.join(' ');
}

function render(body: HTMLElement): void {
  const box = state.mailbox!;
  const unread = unreadCount();
  const total = totalCount();
  const today = box.lettersDeliveredToday;

  let html = `
    <div class="mailbox-header">
      <div class="mailbox-meta">
        <b>${total} / ${MAILBOX_CAP}</b> letters
        ${unread > 0 ? `<span class="mailbox-unread-pill">${unread} unread</span>` : ''}
      </div>
      <div class="mailbox-meta-row">
        <small>${today} / ${DAILY_LETTER_CAP} today</small>
        <button class="btn small" id="mail-clear" ${total === 0 ? 'disabled' : ''}>Clear read</button>
      </div>
    </div>
  `;

  if (box.letters.length === 0) {
    html += `<div class="mailbox-empty">
      <div class="mailbox-empty-icon">📭</div>
      <p>Your mailbox is empty.<br>Alfred drops by daily with thank-you letters.</p>
    </div>`;
  } else {
    html += '<div class="mailbox-list">';
    for (const letter of box.letters) {
      const sender = senderInfo(letter.senderId);
      const unread = !letter.read;
      const hasUnclaimed = letter.reward && !letter.claimed;
      const accent = sender.accent ?? '#c8861d';
      html += `
        <div class="mailbox-letter ${unread ? 'is-unread' : ''}" data-letter-id="${letter.id}" style="--mail-accent:${accent}">
          <div class="mailbox-letter-head">
            <div class="mailbox-sender-avatar">${sender.emoji}</div>
            <div class="mailbox-sender-info">
              <div class="mailbox-sender-name">${sender.name} <small>· ${sender.role}</small></div>
              <div class="mailbox-time">${timeAgo(letter.receivedAt)}</div>
            </div>
            ${unread ? '<span class="mailbox-unread-dot" aria-label="Unread"></span>' : ''}
          </div>
          <div class="mailbox-letter-title">${letter.title}</div>
          <div class="mailbox-letter-body">${letter.body.replace(/\n/g, '<br>')}</div>
          ${letter.reward ? `<div class="mail-rewards">${rewardChips(letter.reward)}</div>` : ''}
          <div class="mailbox-letter-actions">
            ${hasUnclaimed
              ? `<button class="btn small primary" data-mail-claim="${letter.id}">🎁 Claim</button>`
              : letter.reward
                ? '<span class="mail-claimed">✓ Claimed</span>'
                : ''}
            <button class="btn small" data-mail-delete="${letter.id}">Delete</button>
          </div>
        </div>
      `;
    }
    html += '</div>';
  }

  body.innerHTML = html;

  // Mark all as read on view (delayed so the unread badge animation can play)
  setTimeout(() => {
    for (const l of box.letters) markRead(l.id);
    updateHUD();
  }, 600);

  body.querySelectorAll<HTMLButtonElement>('button[data-mail-claim]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (claimReward(btn.dataset.mailClaim!)) {
        render(body);
      }
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-mail-delete]').forEach(btn =>
    btn.addEventListener('click', () => {
      deleteLetter(btn.dataset.mailDelete!);
      render(body);
    }),
  );
  const clearBtn = document.getElementById('mail-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const n = deleteRead();
      if (n > 0) toast(`Cleared ${n} read letters.`);
      render(body);
    });
  }
}
