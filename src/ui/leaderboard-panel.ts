// =============================================================
//  LEADERBOARD PANEL — local "league" with simulated peers.
// =============================================================

import { refreshLeaderboards } from '../systems/leaderboard';
import { openModal } from './modal';
import { renderVirtualList } from './virtual-list';
import { crazyGamesGetUser, crazyGamesActive } from '../systems/crazygames';

let cachedCgName: string | null = null;

const LEADERBOARD_VIRTUAL_THRESHOLD = 18;
const LEADERBOARD_ROW_HEIGHT = 34;

export function openLeaderboard(): void {
  openModal('🏅 Leaderboard', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  void renderLeaderboardBody(body);
}

async function renderLeaderboardBody(body: HTMLElement): Promise<void> {
  // Try to resolve the CrazyGames-signed-in username (no-op when SDK
  // is disabled). The displayed "You" row uses this name so logged-in
  // CG players see their actual identity on the local league board.
  if (cachedCgName === null && crazyGamesActive()) {
    const u = await crazyGamesGetUser();
    if (u?.username) cachedCgName = u.username;
  }
  const youLabel = cachedCgName ?? 'You';
  const slices = refreshLeaderboards();
  body.innerHTML = `
    <p style="color:#666;font-size:12px;text-align:center">
      Compete against a curated league each week. Your personal best is saved locally${cachedCgName ? `, signed in as ${cachedCgName}` : ''}.
    </p>
    ${slices.map(s => `
      <div class="lb-section">
        <h4>${s.label}</h4>
        <div class="lb-rank">Your rank: <b>#${s.rank}</b> · ${youLabel}: ${s.yours.toLocaleString()}</div>
        ${leaderboardListHTML(s.category, s.topPeers, youLabel)}
      </div>
    `).join('')}
  `;
  for (const s of slices) {
    mountLeaderboardList(body, s.category, s.topPeers, youLabel);
  }
}

function leaderboardListHTML(
  category: string,
  rows: Array<{ name: string; score: number }>,
  youLabel: string,
): string {
  if (rows.length <= LEADERBOARD_VIRTUAL_THRESHOLD) {
    return `<ol class="lb-list">${rows.map(r => leaderboardRowHTML(r, youLabel)).join('')}</ol>`;
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
  youLabel: string,
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
    renderRow: (row, index) => `<ol class="lb-list lb-list--virtual" start="${index + 1}">${leaderboardRowHTML(row, youLabel)}</ol>`,
  });
}

function leaderboardRowHTML(row: { name: string; score: number }, youLabel: string): string {
  const isYou = row.name === 'You';
  const displayName = isYou ? youLabel : row.name;
  return `<li class="${isYou ? 'you' : ''}"><span>${displayName}</span><b>${row.score.toLocaleString()}</b></li>`;
}
