import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initStorage, barnUsage, siloUsage,
  barnUpgradeCost, siloUpgradeCost, canAffordUpgrade,
  upgradeBarn, upgradeSilo, isSiloItem,
} from '../systems/storage';
import { updateHUD } from './hud';

export function openInventory(): void {
  initStorage();
  openModal('🏠 Barn & Silo', null);
  const body = document.getElementById('modal-body')!;
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(body);
}

function render(body: HTMLElement): void {
  const keys = Object.keys(state.inv).sort();
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

  const siloItems = keys.filter(k => isSiloItem(k));
  const barnItems = keys.filter(k => !isSiloItem(k));

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

    ${siloItems.length === 0 && barnItems.length === 0
      ? '<div style="text-align:center;padding:20px;color:#888">Your storage is empty. Plant crops and harvest!</div>'
      : ''}

    ${siloItems.length > 0 ? `
      <div class="storage-section-title">🌾 Silo Contents (${siloItems.length})</div>
      <div class="shop-grid">${siloItems.map(itemCellHTML).join('')}</div>
    ` : ''}

    ${barnItems.length > 0 ? `
      <div class="storage-section-title">🏠 Barn Contents (${barnItems.length})</div>
      <div class="shop-grid">${barnItems.map(itemCellHTML).join('')}</div>
    ` : ''}
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
}

function itemCellHTML(k: string): string {
  const it = ITEMS[k];
  if (!it) return '';
  return `
    <div class="shop-item">
      <img class="ico" src="${sprites.item[k]!.toDataURL()}">
      <div class="name">${it.name}</div>
      <div class="qty">×${state.inv[k]}</div>
      <div class="price">Sells for <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${it.sell}</div>
    </div>
  `;
}

function upgradeButtonHTML(kind: 'barn' | 'silo', cost: { coins: number; materials: Record<string, number>; capacityGain: number }): string {
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
