// =============================================================
//  COMBO HUD — visible combo meter that pulses and shows
//  current multiplier and time remaining to chain.
// =============================================================

import { currentCombo } from '../systems/combo';

export function renderComboHud(): void {
  const el = document.getElementById('combo-hud');
  if (!el) return;
  const c = currentCombo();
  if (c.count < 2) {
    if (!el.hasAttribute('hidden')) el.setAttribute('hidden', '');
    return;
  }
  el.removeAttribute('hidden');
  const pct = Math.min(100, c.remaining / 4 * 100);
  el.innerHTML = `
    <div class="combo-count">×${c.count} COMBO</div>
    <div class="combo-mult">${c.mult.toFixed(2)}× reward</div>
    <div class="combo-bar"><div class="combo-bar-fill" style="width:${pct}%"></div></div>
  `;
}
