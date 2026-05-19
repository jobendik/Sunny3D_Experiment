// =============================================================
//  PRESTIGE PANEL — opt-in seasonal reset for permanent perks.
// =============================================================

import { state } from '../state';
import {
  initPrestige, canPrestige, previewPrestigeGain, doPrestige,
  PERK_DEFS, buyPerk,
} from '../systems/prestige';
import { CONFIG } from '../config';
import { openModal } from './modal';
import { sprites } from '../sprites';

export function openPrestige(): void {
  initPrestige();
  openModal('✨ Prestige', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const p = state.prestige!;
  const can = canPrestige();
  const gain = previewPrestigeGain();
  body.innerHTML = `
    <div class="prestige-header">
      <div class="prestige-stars">⭐ ${p.prestigeCount}</div>
      <div class="prestige-talents">Talents available: <b>${p.talents}</b></div>
    </div>
    <div class="prestige-reset">
      <div>
        <div><b>Soft reset</b> at Level ${CONFIG.prestige.minLevel}+. Keep talents, achievements, and collection.</div>
        <div style="color:#666;font-size:12px">Your buildings, coins, and progress reset.</div>
      </div>
      <button id="prestige-now" class="btn primary" ${can ? '' : 'disabled'}>
        ${can ? `Prestige (+${gain} talents)` : `Need Lv ${CONFIG.prestige.minLevel}`}
      </button>
    </div>
    <h3 style="margin-top:12px">Permanent Perks</h3>
    <div class="perk-grid">
      ${PERK_DEFS.map(d => {
        const rank = p.perks[d.id] ?? 0;
        const cost = d.cost * (rank + 1);
        const maxed = rank >= d.max;
        return `
          <div class="perk-card">
            <div class="perk-name">${d.name}</div>
            <div class="perk-desc">${d.desc}</div>
            <div class="perk-rank">Rank ${rank}/${d.max}</div>
            <button data-id="${d.id}" ${maxed || p.talents < cost ? 'disabled' : ''}>
              ${maxed ? 'Maxed' : `Buy (${cost})`}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  const pBtn = document.getElementById('prestige-now')!;
  pBtn.addEventListener('click', () => {
    if (confirm('Prestige now? Your farm will reset but talents persist.')) {
      doPrestige();
      render(body);
    }
  });
  body.querySelectorAll<HTMLButtonElement>('.perk-card button').forEach(btn => {
    btn.addEventListener('click', () => { buyPerk(btn.dataset.id!); render(body); });
  });
}
