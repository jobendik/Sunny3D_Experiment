// =============================================================
//  SEASON PASS PANEL — visual track with day countdown.
// =============================================================

import { state } from '../state';
import { initPass, PASS_TIERS, claimPassTier, passDaysLeft } from '../systems/season-pass';
import { openModal } from './modal';

export function openPass(): void {
  initPass();
  openModal('🎖️ Season Pass', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const p = state.pass!;
  const daysLeft = passDaysLeft();
  body.innerHTML = `
    <div class="pass-header">
      <div class="pass-title">28-Day Harvest Pass</div>
      <div class="pass-meta">⏳ <b>${daysLeft}</b> day${daysLeft === 1 ? '' : 's'} left · <b>${p.points}</b> points · Tier <b>${p.tier}</b>/${PASS_TIERS.length}</div>
    </div>
    <div class="pass-track">
      ${PASS_TIERS.map(t => {
        const reached = p.tier >= t.tier;
        const claimed = p.claimed.includes(t.tier);
        return `
          <div class="pass-tier ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}">
            <div class="pass-tier-num">${t.tier}</div>
            <div class="pass-tier-reward">${t.rewardLabel}</div>
            <button data-tier="${t.tier}" ${reached && !claimed ? '' : 'disabled'}>
              ${claimed ? '✓' : (reached ? 'Claim' : `${t.pointsRequired}p`)}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <p style="font-size:12px;color:#666;text-align:center;margin-top:8px">
      Earn pass points from XP, daily challenges, and farming actions. Pass resets every 28 days.
    </p>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-tier]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimPassTier(parseInt(btn.dataset.tier!, 10))) render(body);
    });
  });
}
