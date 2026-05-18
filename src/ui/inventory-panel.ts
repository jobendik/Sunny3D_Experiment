import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';

export function openInventory(): void {
  openModal('🏠 Barn (Inventory)', null);
  const body = document.getElementById('modal-body')!;
  document.getElementById('modal-tabs')!.innerHTML = '';
  const keys = Object.keys(state.inv);
  if (keys.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Your barn is empty. Plant crops and harvest!</div>';
    return;
  }
  body.innerHTML = `<div class="shop-grid"></div>`;
  const grid = body.querySelector<HTMLElement>('.shop-grid')!;
  for (const k of keys) {
    const it = ITEMS[k];
    if (!it) continue;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.item[k]!.toDataURL()}">
      <div class="name">${it.name}</div>
      <div class="qty">×${state.inv[k]}</div>
      <div class="price">Sells for <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${it.sell}</div>
    `;
    grid.appendChild(div);
  }
}
