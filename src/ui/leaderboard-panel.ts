// =============================================================
//  LEADERBOARD PANEL — local "league" with simulated peers.
// =============================================================

import { refreshLeaderboards } from '../systems/leaderboard';
import { openModal } from './modal';

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
        <ol class="lb-list">
          ${s.topPeers.map(p => `<li class="${p.name === 'You' ? 'you' : ''}"><span>${p.name}</span><b>${p.score.toLocaleString()}</b></li>`).join('')}
        </ol>
      </div>
    `).join('')}
  `;
}
