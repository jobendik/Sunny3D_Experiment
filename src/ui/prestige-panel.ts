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
        <div><b>Soft reset</b> at Level ${CONFIG.prestige.minLevel}+. Coins, XP, level, orders and quests reset. <b>Your farm — buildings, animals, trees, and decorations — stays exactly as you built it.</b></div>
        <div style="color:#666;font-size:12px;margin-top:6px">Talents, achievements, and your collection persist across prestige.</div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:#a04040">
          <input type="checkbox" id="prestige-wipe-farm">
          <span>Also wipe my farm layout (legacy hard reset — irreversible)</span>
        </label>
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
    const wipeFarm = (document.getElementById('prestige-wipe-farm') as HTMLInputElement | null)?.checked === true;
    const msg = wipeFarm
      ? 'Wipe your entire farm AND prestige? This cannot be undone.'
      : 'Prestige now? Your farm stays as-is; only progression resets.';
    if (confirm(msg)) {
      doPrestige({ wipeFarm });
      render(body);
    }
  });
  body.querySelectorAll<HTMLButtonElement>('.perk-card button').forEach(btn => {
    btn.addEventListener('click', () => { buyPerk(btn.dataset.id!); render(body); });
  });
}
