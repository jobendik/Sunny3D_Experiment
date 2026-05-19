// =============================================================
//  FISHING PANEL — pick biome + bait before casting.
// =============================================================

import { state } from '../state';
import { BIOMES, BAITS, type BiomeId } from '../data/bait';
import { sprites } from '../sprites';
import { ITEMS } from '../data/items';
import { initBiome, selectBiome, applyBait, activeBaitDef } from '../systems/biome';
import { startFishing } from '../systems/fishing';
import { openModal, closeModal } from './modal';

export function openFishingPanel(): void {
  initBiome();
  openModal('🎣 Fishing Hut', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const b = state.biome!;
  const active = activeBaitDef();
  body.innerHTML = `
    <h3 style="margin-top:0">Choose Biome</h3>
    <div class="biome-grid">
      ${(Object.keys(BIOMES) as BiomeId[]).map(id => {
        const def = BIOMES[id];
        const locked = state.level < def.level;
        const sel = b.current === id;
        return `
          <div class="biome-card ${sel ? 'selected' : ''} ${locked ? 'locked' : ''}" data-biome="${id}">
            <div class="biome-name">${def.name}${locked ? ' 🔒' : ''}</div>
            <div class="biome-desc">${def.desc}</div>
            <div class="biome-weights">
              ${Object.entries(def.fishWeights).map(([k, w]) => `<span><img class="ico-mini" src="${sprites.item[k]!.toDataURL()}">${w}%</span>`).join(' ')}
            </div>
            ${locked ? `<div class="locked">Lv ${def.level}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <h3>Bait</h3>
    <div class="bait-grid">
      ${Object.keys(BAITS).map(id => {
        const def = BAITS[id]!;
        const have = state.inv[id] ?? 0;
        return `
          <div class="bait-card">
            <img class="ico" src="${sprites.item[id]!.toDataURL()}">
            <div class="name">${def.name}</div>
            <div style="font-size:11px;color:#666">+${Math.round(def.rareBonus * 100)}% rare, +${Math.round(def.valueBonus * 100)}% value</div>
            <div class="qty">have: ${have}</div>
            <button data-bait="${id}" ${have <= 0 ? 'disabled' : ''}>Use 1</button>
          </div>
        `;
      }).join('')}
    </div>
    ${active ? `<div class="bait-active">Active bait: <b>${BAITS[active.id]!.name}</b></div>` : ''}
    <div style="margin-top:12px;text-align:center">
      <button id="start-fishing" class="btn primary" style="padding:14px 28px;font-size:16px">🎣 Cast Line!</button>
    </div>
  `;
  body.querySelectorAll<HTMLElement>('.biome-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.biome as BiomeId;
      if (selectBiome(id)) render(body);
    });
  });
  body.querySelectorAll<HTMLButtonElement>('button[data-bait]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (applyBait(btn.dataset.bait!)) render(body);
    });
  });
  document.getElementById('start-fishing')!.addEventListener('click', () => {
    closeModal();
    startFishing();
  });
}
