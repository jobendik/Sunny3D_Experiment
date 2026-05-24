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
import { renderVirtualList } from './virtual-list';

const VIRTUAL_ITEM_THRESHOLD = 50;
const INVENTORY_CELLS_PER_ROW = 3;
const INVENTORY_ROW_HEIGHT = 142;

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
      ${inventorySectionHTML('silo', siloItems)}
    ` : ''}

    ${barnItems.length > 0 ? `
      <div class="storage-section-title">🏠 Barn Contents (${barnItems.length})</div>
      ${inventorySectionHTML('barn', barnItems)}
    ` : ''}
  `;

  mountInventoryVirtualList(body, 'silo', siloItems);
  mountInventoryVirtualList(body, 'barn', barnItems);

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

function inventorySectionHTML(kind: 'barn' | 'silo', keys: string[]): string {
  if (keys.length <= VIRTUAL_ITEM_THRESHOLD) {
    return `<div class="shop-grid">${keys.map(itemCellHTML).join('')}</div>`;
  }
  const rows = Math.ceil(keys.length / INVENTORY_CELLS_PER_ROW);
  return `
    <p class="virtual-list-note">Virtualized ${rows} rows for smoother scrolling.</p>
    <div class="inventory-virtual-mount" data-inventory-virtual="${kind}"></div>
  `;
}

function mountInventoryVirtualList(body: HTMLElement, kind: 'barn' | 'silo', keys: string[]): void {
  if (keys.length <= VIRTUAL_ITEM_THRESHOLD) return;
  const mount = body.querySelector<HTMLElement>(`[data-inventory-virtual="${kind}"]`);
  if (!mount) return;
  const rows = chunk(keys, INVENTORY_CELLS_PER_ROW);
  renderVirtualList(mount, {
    items: rows,
    rowHeight: INVENTORY_ROW_HEIGHT,
    overscan: 3,
    ariaLabel: `${kind === 'silo' ? 'Silo' : 'Barn'} contents`,
    key: row => row.join('|'),
    renderRow: row => `<div class="virtual-grid-row">${row.map(itemCellHTML).join('')}</div>`,
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
