import { state } from '../state';
import { clamp, xpForLevel } from '../utils';
import { nextBigUnlock } from '../systems/unlocks';

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
}
