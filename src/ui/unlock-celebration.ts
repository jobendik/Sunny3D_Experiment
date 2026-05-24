// =============================================================
//  UNLOCK CELEBRATION - data-driven level milestone modal.
// =============================================================

import { unlocksForLevel } from '../systems/unlocks';
import { openModal, closeModal } from './modal';

export function showUnlockCelebration(level: number): void {
  const unlocks = unlocksForLevel(level);
  if (unlocks.length === 0) return;
  window.setTimeout(() => {
    openModal(`Level ${level} Unlocked`, null);
    document.getElementById('modal-tabs')!.innerHTML = '';
    const body = document.getElementById('modal-body')!;
    const gridTip = level === 5
      ? `<div class="unlock-tip">
          <b>Alfred's tip:</b> Open the Weather Grid, craft a card, then slot it before casting.
          Sunny Acres is at its best when you plan around the forecast.
        </div>`
      : '';
    body.innerHTML = `
      <div class="unlock-celebration">
        <div class="unlock-burst">✨</div>
        <h3>New at Level ${level}</h3>
        <div class="unlock-card-list">
          ${unlocks.map(u => `
            <div class="unlock-card">
              <div class="unlock-card-icon">${u.icon}</div>
              <div>
                <b>${u.label}</b>
                ${u.description ? `<p>${u.description}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${gridTip}
        <div class="unlock-actions">
          ${level === 5 ? '<button class="btn primary" id="unlock-open-grid">Open Weather Grid</button>' : ''}
          <button class="btn" id="unlock-close">Keep farming</button>
        </div>
      </div>
    `;
    document.getElementById('unlock-close')?.addEventListener('click', closeModal);
    document.getElementById('unlock-open-grid')?.addEventListener('click', () => {
      closeModal();
      window.setTimeout(() => document.getElementById('open-weather-grid')?.click(), 80);
    });
  }, 900);
}
