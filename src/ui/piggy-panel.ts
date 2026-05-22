// =============================================================
//  PIGGY BANK PANEL — show progress + break when ready.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import {
  initPiggyBank, piggyPct, canBreakPiggy, breakPiggy,
  resetPiggyBank, PIGGY_BREAK_THRESHOLD,
} from '../systems/piggy-bank';
import { updateHUD } from './hud';

export function openPiggyPanel(): void {
  initPiggyBank();
  openModal('🐷 Piggy Bank', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const pb = state.piggyBank!;
  const pct = piggyPct();
  const filled = pb.gems;
  const cap = pb.cap;
  const needed = Math.ceil(cap * PIGGY_BREAK_THRESHOLD);
  const canBreak = canBreakPiggy();

  let html = `
    <div class="piggy-shell">
      <div class="piggy-art ${canBreak ? 'is-ready' : 'is-filling'} ${pb.broken ? 'is-broken' : ''}">
        <div class="piggy-art-icon">${pb.broken ? '💔' : '🐷'}</div>
        <div class="piggy-art-fill" style="height:${Math.round(pct * 100)}%"></div>
      </div>
      <div class="piggy-stats">
        <div class="piggy-stats-main">
          <span class="piggy-stats-value">${filled}</span>
          <span class="piggy-stats-unit">/ ${cap} 💎</span>
        </div>
        <div class="piggy-bar">
          <div class="piggy-bar-fill" style="width:${Math.round(pct * 100)}%"></div>
        </div>
        <div class="piggy-hint">
          ${pb.broken
            ? 'Piggy broken — buy a new one to start saving again!'
            : canBreak
              ? 'Ready to break! Cash in your saved diamonds.'
              : `Fills as you spend coins and complete deliveries.<br>
                 Need at least <b>${needed}💎</b> to break.`}
        </div>
      </div>
      <div class="piggy-actions">
        ${pb.broken
          ? `<button class="btn primary big" id="piggy-reset">🐷 Buy a new piggy</button>`
          : `<button class="btn primary big" id="piggy-break" ${canBreak ? '' : 'disabled'}>🔨 Break the piggy${filled > 0 ? ` (+${filled}💎)` : ''}</button>`}
      </div>
      <p class="piggy-fineprint">
        Each coin you spend at the shop, each delivery you complete, and each
        boat or train you fill drops a fractional diamond into the piggy. Higher levels unlock bigger piggies.
      </p>
    </div>
  `;
  body.innerHTML = html;

  const breakBtn = document.getElementById('piggy-break');
  if (breakBtn) {
    breakBtn.addEventListener('click', () => {
      if (breakPiggy()) {
        updateHUD();
        render(body);
      }
    });
  }
  const resetBtn = document.getElementById('piggy-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetPiggyBank();
      updateHUD();
      render(body);
    });
  }
}
