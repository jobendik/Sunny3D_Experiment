import { state } from '../state';
import { clamp, xpForLevel } from '../utils';
import { nextBigUnlock } from '../systems/unlocks';
import { isEliteUnlocked, isPlatinumUnlocked } from '../systems/season-pass';
import { dailyDealAvailable } from '../systems/daily-deal';
import { hasPendingBox } from '../systems/surprise-box';

const numFmt = new Intl.NumberFormat('en-US');

export function updateHUD(): void {
  document.getElementById('coin-amount')!.textContent = numFmt.format(state.coins);
  const gemEl = document.getElementById('gem-amount');
  if (gemEl) gemEl.textContent = numFmt.format(state.gems);
  document.getElementById('level-num')!.textContent = String(state.level);
  document.getElementById('day-num')!.textContent = `Day ${state.day}`;
  const need = xpForLevel(state.level);
  const pct = clamp((state.xp / need) * 100, 0, 100);
  // Classic horizontal XP bar (kept as the legible numeric readout).
  const fill = document.getElementById('xp-fill') as HTMLElement;
  if (fill) fill.style.width = pct + '%';
  document.getElementById('xp-label')!.textContent = `${state.xp} / ${need} XP`;
  // FV3-style XP ring around the profile avatar. pathLength is 100,
  // so dashoffset = 100 - pct.
  const ring = document.getElementById('profile-ring-fill') as SVGCircleElement | null;
  if (ring) ring.style.strokeDashoffset = String(Math.max(0, 100 - pct));
  // Tooltip on the profile block — "what's next"?
  const profile = document.getElementById('profile-block');
  if (profile) {
    const next = nextBigUnlock();
    profile.title = next
      ? `Lv ${state.level} · ${state.xp}/${need} XP\nNext unlock at Lv ${next.level}: ${next.label}`
      : `Lv ${state.level} — All major content unlocked!`;
  }
  // Elite + Platinum pass badges on the profile pill — small cosmetic
  // chip that signals "this farmer earned the premium track" without
  // any monetization cue (both tracks are gameplay-earned).
  updatePassBadges();
  updateOfferPill();
}

/** Phase 2.2 — top-right offer bubble. Shows when there's something to
 *  claim under the Offers tab (Daily Deal, Surprise Box, etc.). Pulses
 *  for fresh / time-sensitive offers. Tap routes into the Offers tab. */
function updateOfferPill(): void {
  const pill = document.getElementById('offer-pill') as HTMLButtonElement | null;
  if (!pill) return;
  const dailyReady = dailyDealAvailable();
  const surpriseReady = hasPendingBox();
  const visible = dailyReady || surpriseReady;
  if (!visible) {
    pill.setAttribute('hidden', '');
    pill.classList.remove('offer-pill--pulse');
    return;
  }
  pill.removeAttribute('hidden');
  // Pulse only when there's something genuinely time-sensitive to claim.
  pill.classList.toggle('offer-pill--pulse', dailyReady || surpriseReady);
  const pip = document.getElementById('offer-pill-pip');
  if (pip) pip.style.display = '';
}

function updatePassBadges(): void {
  const meta = document.querySelector<HTMLElement>('.profile-meta');
  if (!meta) return;
  let row = meta.querySelector<HTMLElement>('.profile-badges');
  if (!row) {
    row = document.createElement('div');
    row.className = 'profile-badges';
    row.setAttribute('aria-label', 'Earned pass tracks');
    meta.insertBefore(row, meta.firstChild);
  }
  const elite = isEliteUnlocked();
  const platinum = isPlatinumUnlocked();
  const want =
    (platinum ? '<span class="profile-badge profile-badge--platinum" title="Platinum pass track earned">💎</span>' : '') +
    (elite ? '<span class="profile-badge profile-badge--elite" title="Elite pass track earned">🏅</span>' : '');
  if (row.innerHTML !== want) row.innerHTML = want;
  row.style.display = (elite || platinum) ? '' : 'none';
}

