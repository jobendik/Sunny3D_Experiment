// =============================================================
//  SEASON PASS PANEL — three-track view (Free / Elite / Platinum)
//  with a day countdown + gameplay-earned unlock progress.
// =============================================================

import { state } from '../state';
import {
  initPass, PASS_TIERS, PASS_TIERS_ELITE, PASS_TIERS_PLATINUM,
  claimPassTier, passDaysLeft, isEliteUnlocked, isPlatinumUnlocked,
  ELITE_CYCLES_REQUIRED, PLATINUM_CYCLES_REQUIRED,
  type PassTrack,
} from '../systems/season-pass';
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
  const cycles = p.cyclesThisPass ?? 0;
  const eliteOpen = isEliteUnlocked();
  const platOpen = isPlatinumUnlocked();
  const eliteProgress = Math.min(1, cycles / ELITE_CYCLES_REQUIRED);
  const platProgress = Math.min(1, cycles / PLATINUM_CYCLES_REQUIRED);

  body.innerHTML = `
    <div class="pass-header">
      <div class="pass-title">28-Day Harvest Pass</div>
      <div class="pass-meta">⏳ <b>${daysLeft}</b> day${daysLeft === 1 ? '' : 's'} left · <b>${p.points}</b> points · Tier <b>${p.tier}</b>/${PASS_TIERS.length}</div>
    </div>
    <div class="pass-tracks-unlock">
      <div class="pass-track-pill ${eliteOpen ? 'unlocked' : ''}">
        <span class="pass-track-pill-ico">🏅</span>
        <span class="pass-track-pill-text">
          Elite
          ${eliteOpen ? ' · <b>UNLOCKED</b>' : ` · ${cycles}/${ELITE_CYCLES_REQUIRED} order cycles`}
        </span>
        <span class="pass-track-pill-bar">
          <span class="pass-track-pill-fill" style="width:${(eliteProgress * 100).toFixed(0)}%"></span>
        </span>
      </div>
      <div class="pass-track-pill ${platOpen ? 'unlocked' : ''}">
        <span class="pass-track-pill-ico">💎</span>
        <span class="pass-track-pill-text">
          Platinum
          ${platOpen ? ' · <b>UNLOCKED</b>' : ` · ${cycles}/${PLATINUM_CYCLES_REQUIRED} order cycles`}
        </span>
        <span class="pass-track-pill-bar">
          <span class="pass-track-pill-fill" style="width:${(platProgress * 100).toFixed(0)}%"></span>
        </span>
      </div>
    </div>
    <div class="pass-tracks">
      ${renderTrack('free',     '🎟️ Free',     PASS_TIERS,          p.claimed,                       true)}
      ${renderTrack('elite',    '🏅 Elite',    PASS_TIERS_ELITE,    p.claimedElite ?? [],            eliteOpen)}
      ${renderTrack('platinum', '💎 Platinum', PASS_TIERS_PLATINUM, p.claimedPlatinum ?? [],         platOpen)}
    </div>
    <p style="font-size:12px;color:#666;text-align:center;margin-top:8px">
      Pass points come from XP, daily challenges, and orders. Elite + Platinum
      tracks are <b>earned through gameplay</b> — fill the Order Board macro-meter to unlock them.
      Pass resets every 28 days.
    </p>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-tier]').forEach(btn => {
    btn.addEventListener('click', () => {
      const trk = btn.dataset.track as PassTrack;
      if (claimPassTier(parseInt(btn.dataset.tier!, 10), trk)) render(body);
    });
  });
}

function renderTrack(
  trackKey: PassTrack,
  label: string,
  tiers: typeof PASS_TIERS,
  claimed: number[],
  unlocked: boolean,
): string {
  const reachedTier = state.pass!.tier;
  return `
    <div class="pass-track-col pass-track-${trackKey} ${unlocked ? '' : 'locked'}">
      <div class="pass-track-col-head">${label}</div>
      <div class="pass-track-list">
        ${tiers.map(t => {
          const reached = reachedTier >= t.tier;
          const isClaimed = claimed.includes(t.tier);
          const can = reached && !isClaimed && unlocked;
          return `
            <div class="pass-tier ${reached ? 'reached' : ''} ${isClaimed ? 'claimed' : ''}">
              <div class="pass-tier-num">${t.tier}</div>
              <div class="pass-tier-reward">${t.rewardLabel}</div>
              <button data-tier="${t.tier}" data-track="${trackKey}"
                      ${can ? '' : 'disabled'}>
                ${isClaimed ? '✓' : (reached ? (unlocked ? 'Claim' : 'Locked') : `${t.pointsRequired}p`)}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
