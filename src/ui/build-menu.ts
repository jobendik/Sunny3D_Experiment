import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { TILE } from '../constants';
import { sprites } from '../sprites';
import { randi } from '../utils';
import { sfx } from '../audio/sfx';
import { openModal, closeModal } from './modal';
import { toast } from './toasts';
import { updateHUD } from './hud';
import { canPlaceBuilding, markBuildingTiles } from '../systems/grid';
import { spawnParticles } from '../systems/particles';

export function openBuildMenu(): void {
  openModal('🔨 Build', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  body.innerHTML = `<div class="build-grid"></div>`;
  const grid = body.querySelector<HTMLElement>('.build-grid')!;
  for (const k in BUILDINGS) {
    const def = BUILDINGS[k]!;
    const locked = state.level < def.level;
    const canAfford = state.coins >= def.price;
    const div = document.createElement('div');
    div.className = 'shop-item';
    const hint = def.kind === 'fishing' ? '<div style="font-size:11px;color:#3a78c0">💧 Place next to water</div>' : '';
    div.innerHTML = `
      <div style="width:80px;height:60px;display:flex;align-items:center;justify-content:center">
        <img style="max-width:80px;max-height:60px;image-rendering:pixelated" src="${sprites.building[k]!.toDataURL()}">
      </div>
      <div class="name">${def.name}</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${def.price}</div>
      <div style="font-size:11px;color:#666">${def.w}×${def.h} tile</div>
      ${hint}
      <button ${(!canAfford || locked) ? 'disabled' : ''}>Build</button>
      ${locked ? `<div class="locked">🔒 Lv ${def.level}</div>` : ''}
    `;
    div.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      if (locked || !canAfford) { sfx.cantAfford(); return; }
      state.placing = { type: k };
      closeModal();
      toast(`Click on a clear spot to place ${def.name}. ESC to cancel.`);
    });
    grid.appendChild(div);
  }
}

export function tryPlaceBuilding(gx: number, gy: number): void {
  const placing = state.placing!;
  const type = placing.type!;
  const def = BUILDINGS[type]!;
  if (!canPlaceBuilding(type, gx, gy)) {
    toast(def.kind === 'fishing' ? 'Fishing Dock must touch water' : 'Cannot place here', 'error');
    sfx.error();
    return;
  }
  if (state.coins < def.price) {
    toast('Not enough coins', 'error');
    sfx.cantAfford();
    state.placing = null;
    return;
  }
  state.coins -= def.price;
  const id = 'b' + Date.now() + randi(1e6);
  state.buildings.push({ id, type, x: gx, y: gy, smokeT: 0 });
  for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
    state.grid[gy + dy]![gx + dx]!.type = 'soil';
    state.grid[gy + dy]![gx + dx]!.crop = null;
  }
  markBuildingTiles();
  if (def.kind === 'pen') state.penAnimals[id] = [];
  if (def.kind === 'production') state.prodQueues[id] = [];
  sfx.build();
  spawnParticles(gx * TILE + (def.w * TILE) / 2, gy * TILE + (def.h * TILE) / 2, '#a87248', 24);
  state.placing = null;
  updateHUD();
  toast(`Built ${def.name}!`);
}
