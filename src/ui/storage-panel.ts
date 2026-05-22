// =============================================================
//  STORAGE PANEL — dedicated silo + barn upgrade UI.
//
//  FV3 grammar: "Barn and Silo capacities are monitored and upgraded
//  by tapping the physical 3D buildings." The 3D greatbarn hub bubble
//  routes here directly, rather than through the catch-all Inventory
//  panel, so the player lands on storage controls in one tap.
// =============================================================

import { state } from '../state';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initStorage, barnUsage, siloUsage,
  barnUpgradeCost, siloUpgradeCost, canAffordUpgrade,
  upgradeBarn, upgradeSilo,
} from '../systems/storage';
import { updateHUD } from './hud';

export function openStoragePanel(): void {
  initStorage();
  openModal('📦 Storage', null);
  const body = document.getElementById('modal-body')!;
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(body);
}

function render(body: HTMLElement): void {
  const silo = siloUsage();
  const barn = barnUsage();
  const sCost = siloUpgradeCost();
  const bCost = barnUpgradeCost();
  const sBarPct = Math.min(100, (silo.used / silo.cap) * 100);
  const bBarPct = Math.min(100, (barn.used / barn.cap) * 100);
  const sOver = silo.used > silo.cap;
  const bOver = barn.used > barn.cap;
  const sWarn = silo.used / silo.cap > 0.85;
  const bWarn = barn.used / barn.cap > 0.85;

  body.innerHTML = `
    <div class="storage-summary">
      <div class="storage-card silo ${sOver ? 'over' : sWarn ? 'warn' : ''}">
        <div class="storage-card-header">
          <span class="storage-icon">🌾</span>
          <span class="storage-name">Silo <small>Lv ${state.storage!.silo.level}</small></span>
          <span class="storage-usage">${silo.used} / ${silo.cap}</span>
        </div>
        <div class="storage-bar"><div class="storage-fill" style="width:${sBarPct}%"></div></div>
        ${sCost ? upgradeButtonHTML('silo', sCost) : '<div class="storage-maxed">⭐ Maxed</div>'}
      </div>
      <div class="storage-card barn ${bOver ? 'over' : bWarn ? 'warn' : ''}">
        <div class="storage-card-header">
          <span class="storage-icon">🏠</span>
          <span class="storage-name">Barn <small>Lv ${state.storage!.barn.level}</small></span>
          <span class="storage-usage">${barn.used} / ${barn.cap}</span>
        </div>
        <div class="storage-bar"><div class="storage-fill" style="width:${bBarPct}%"></div></div>
        ${bCost ? upgradeButtonHTML('barn', bCost) : '<div class="storage-maxed">⭐ Maxed</div>'}
      </div>
    </div>
    <div style="text-align:center;margin-top:14px;display:flex;gap:8px;justify-content:center">
      <button class="btn" id="storage-open-inventory">📋 Open Full Inventory</button>
    </div>
    <p style="font-size:12px;color:#666;text-align:center;margin-top:10px">
      Silos store raw crops (wheat, corn, fruit…). Barns store animal
      goods + crafted items. Upgrade either with coins + materials to
      lift the cap.
    </p>
  `;

  body.querySelectorAll<HTMLButtonElement>('button[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.upgrade;
      const ok = kind === 'silo' ? upgradeSilo() : upgradeBarn();
      if (ok) {
        updateHUD();
        render(body);
      }
    });
  });
  document.getElementById('storage-open-inventory')?.addEventListener('click', () => {
    document.getElementById('open-inventory')?.click();
  });
}

function upgradeButtonHTML(
  kind: 'barn' | 'silo',
  cost: { coins: number; materials: Record<string, number>; capacityGain: number },
): string {
  const can = canAffordUpgrade(cost);
  const matsHTML = Object.entries(cost.materials).map(([k, n]) => {
    const have = state.inv[k] ?? 0;
    const ok = have >= n;
    return `<span class="storage-mat ${ok ? 'ok' : ''}">
      <img class="ico-mini" src="${sprites.item[k]?.toDataURL() ?? ''}">${n}<small style="opacity:0.6">(${have})</small>
    </span>`;
  }).join('');
  return `
    <div class="storage-upgrade">
      <div class="storage-upgrade-row">
        <span class="storage-cost">💰 ${cost.coins}</span>
        ${matsHTML}
        <span class="storage-gain">+${cost.capacityGain} cap</span>
      </div>
      <button class="btn primary storage-upgrade-btn" data-upgrade="${kind}" ${can ? '' : 'disabled'}>
        ${can ? 'Upgrade' : 'Need materials'}
      </button>
    </div>
  `;
}
