// =============================================================
//  LEADERBOARD PANEL — local "league" with simulated peers.
// =============================================================

import { refreshLeaderboards } from '../systems/leaderboard';
import { openModal } from './modal';
import { renderVirtualList } from './virtual-list';

const LEADERBOARD_VIRTUAL_THRESHOLD = 18;
const LEADERBOARD_ROW_HEIGHT = 34;

export function openLeaderboard(): void {
  openModal('🏅 Leaderboard', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const slices = refreshLeaderboards();
  const body = document.getElementById('modal-body')!;
  body.innerHTML = `
    <p style="color:#666;font-size:12px;text-align:center">
      Compete against a curated league each week. Your personal best is saved locally.
    </p>
    ${slices.map(s => `
      <div class="lb-section">
        <h4>${s.label}</h4>
        <div class="lb-rank">Your rank: <b>#${s.rank}</b> · You: ${s.yours.toLocaleString()}</div>
        ${leaderboardListHTML(s.category, s.topPeers)}
      </div>
    `).join('')}
  `;
  for (const s of slices) {
    mountLeaderboardList(body, s.category, s.topPeers);
  }
}

function leaderboardListHTML(
  category: string,
  rows: Array<{ name: string; score: number }>,
): string {
  if (rows.length <= LEADERBOARD_VIRTUAL_THRESHOLD) {
    return `<ol class="lb-list">${rows.map(leaderboardRowHTML).join('')}</ol>`;
  }
  return `
    <p class="virtual-list-note">Showing ${rows.length} league entries with virtualized scrolling.</p>
    <div class="leaderboard-virtual-mount" data-lb-virtual="${category}"></div>
  `;
}

function mountLeaderboardList(
  body: HTMLElement,
  category: string,
  rows: Array<{ name: string; score: number }>,
): void {
  if (rows.length <= LEADERBOARD_VIRTUAL_THRESHOLD) return;
  const mount = body.querySelector<HTMLElement>(`[data-lb-virtual="${category}"]`);
  if (!mount) return;
  renderVirtualList(mount, {
    items: rows,
    rowHeight: LEADERBOARD_ROW_HEIGHT,
    overscan: 5,
    ariaLabel: `${category} leaderboard`,
    key: row => row.name,
    renderRow: (row, index) => `<ol class="lb-list lb-list--virtual" start="${index + 1}">${leaderboardRowHTML(row)}</ol>`,
  });
}

function leaderboardRowHTML(row: { name: string; score: number }): string {
  return `<li class="${row.name === 'You' ? 'you' : ''}"><span>${row.name}</span><b>${row.score.toLocaleString()}</b></li>`;
}
