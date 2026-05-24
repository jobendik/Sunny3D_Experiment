// =============================================================
//  CLUB PANEL - Farming Club status, members, milestones + chat.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import { sfx } from '../audio/sfx';
import {
  initClub,
  maybeRolloverClub,
  clubTheme,
  clubProgressPct,
  clubPlayerSharePct,
  clubChatMessages,
  clubChatUnread,
  markClubChatRead,
  clubQuickMessages,
  postClubQuickMessage,
} from '../systems/club';
import { filterFamilyText, familySafeName } from '../systems/family-filter';
import type { ClubChatMessage } from '../types';

export function openClubPanel(): void {
  initClub();
  maybeRolloverClub();
  const c = state.club;
  if (!c || !c.unlocked) {
    openModal('🏆 Farming Club', null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    document.getElementById('modal-body')!.innerHTML =
      `<div style="text-align:center;padding:24px"><h3>🏆 Farming Club</h3><p>Unlocks at Level 15.</p></div>`;
    return;
  }

  const unread = clubChatUnread();
  openModal('🏆 Farming Club', [
    { key: 'overview', label: 'Club', render: renderOverview },
    { key: 'chat', label: unread > 0 ? `Chat (${unread})` : 'Chat', render: renderChat },
  ], unread > 0 ? 'chat' : 'overview');
}

function renderOverview(body: HTMLElement): void {
  const c = state.club;
  if (!c || !c.unlocked) return;
  const t = clubTheme();
  const pct = clubProgressPct();
  const share = clubPlayerSharePct();
  const milestones = [25, 50, 75, 100].map((m, i) => {
    const claimed = c.milestonesClaimed.includes(i);
    return `<div class="landmark-req ${claimed ? 'done' : ''}"><div class="landmark-req-name">${m}%</div>${claimed ? '<span class="landmark-req-tick">✓</span>' : ''}</div>`;
  }).join('');
  const members = c.members.map(m => `<div style="display:flex;justify-content:space-between;padding:4px 0">
    <span>${escapeHtml(m.emoji)} ${escapeHtml(m.name)}${m.isSimulated ? ' <small>(sim)</small>' : ''}</span>
    <span>${m.contribution} pts</span>
  </div>`).join('');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${escapeHtml(t.emoji)}</div>
        <div class="landmark-meta">
          <h3>${escapeHtml(t.name)} · Lv ${c.level}${c.bannerCount > 0 ? ` · ${'🏆'.repeat(Math.min(5, c.bannerCount))}` : ''}</h3>
          <p>Goal: ${c.goal} pts · Your share: ${Math.round(share)}%</p>
        </div>
      </div>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${pct}%"></div></div>
      <p style="margin:8px 0"><b>Milestones</b></p>
      <div class="landmark-reqs">${milestones}</div>
      <p style="margin:12px 0"><b>Members</b></p>
      ${members}
      <p class="landmark-rewards">Help via: harvest, baking, fishing, animals, market sales, and Weather Cards, depending on theme.</p>
    </div>
  `;
}

function renderChat(body: HTMLElement): void {
  markClubChatRead();
  const messages = clubChatMessages();
  const quick = clubQuickMessages();
  body.innerHTML = `
    <div class="club-chat-card">
      <div class="club-chat-head">
        <div>
          <h3>Club Chat</h3>
          <p>Simulated neighbors share progress here. Send a quick cheer when you like.</p>
        </div>
        <span class="club-chat-badge">${messages.length}/40</span>
      </div>
      <div class="club-chat-log" aria-live="polite">
        ${messages.map(renderMessage).join('')}
      </div>
      <div class="club-chat-actions" aria-label="Quick club messages">
        ${quick.map((line, i) => `
          <button type="button" class="club-chat-quick" data-chat-idx="${i}">
            ${escapeHtml(line)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  const log = body.querySelector<HTMLElement>('.club-chat-log');
  if (log) log.scrollTop = log.scrollHeight;
  body.querySelectorAll<HTMLButtonElement>('[data-chat-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.chatIdx);
      const line = quick[idx];
      if (!line) return;
      if (postClubQuickMessage(line)) {
        sfx.click();
        renderChat(body);
      } else {
        sfx.error();
      }
    });
  });
}

function renderMessage(msg: ClubChatMessage): string {
  const t = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `
    <div class="club-chat-msg club-chat-msg--${msg.kind}">
      <div class="club-chat-avatar" aria-hidden="true">${escapeHtml(msg.emoji)}</div>
      <div class="club-chat-bubble">
        <div class="club-chat-meta">
          <b>${escapeHtml(familySafeName(msg.authorName))}</b>
          <span>${t}</span>
        </div>
        <p>${escapeHtml(filterFamilyText(msg.text))}</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
