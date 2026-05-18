import { state } from '../state';
import { DECORATIONS } from '../data/decorations';
import { sprites } from '../sprites';
import { sfx } from '../audio/sfx';
import { openModal, closeModal } from './modal';
import { toast } from './toasts';

export function openDecorMenu(): void {
  openModal('🌸 Decorations', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  body.innerHTML = `
    <p style="font-size:13px;color:#666;margin:0 0 8px 0">Place decorative items on grass to beautify your farm. Scarecrows deter crows!</p>
    <div class="decor-grid"></div>
  `;
  const grid = body.querySelector<HTMLElement>('.decor-grid')!;
  for (const k of Object.keys(DECORATIONS)) {
    const def = DECORATIONS[k]!;
    const locked = state.level < def.level;
    const canAfford = state.coins >= def.price;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.decor[k]!.toDataURL()}" style="height:60px;width:auto">
      <div class="name">${def.name}${locked ? ' 🔒' : ''}</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${def.price}</div>
      <button ${locked || !canAfford ? 'disabled' : ''}>${locked ? `Lv ${def.level}` : 'Place'}</button>
    `;
    div.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      if (locked || !canAfford) return;
      state.placing = { type: k, decor: true };
      closeModal();
      toast(`Tap a grass tile to place ${def.name}`, 'xp');
      sfx.click();
    });
    grid.appendChild(div);
  }
}
