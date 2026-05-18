import { BUILDINGS } from '../data/buildings';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { screenToWorld } from '../systems/camera';
import { tileAt, buildingAt } from '../systems/grid';
import { cropStage } from '../systems/crops';
import { nowSeconds } from '../utils';
import { mousePos, isDragging } from '../input';

const tooltip = document.getElementById('tooltip') as HTMLElement;

export function updateHoverTooltip(): void {
  if (isDragging()) { tooltip.style.display = 'none'; return; }
  const w = screenToWorld(mousePos.x, mousePos.y);
  const t = tileAt(w.x, w.y);
  if (!t) { tooltip.style.display = 'none'; return; }
  let text = '';
  if (t.t.building) {
    const b = buildingAt(t.gx, t.gy);
    if (b) text = BUILDINGS[b.type]!.name + ' (tap to open)';
  } else if (t.t.crop) {
    const stage = cropStage(t.t);
    const crop = CROPS[t.t.crop]!;
    if (stage === 3) text = `${ITEMS[crop.item]!.name} ready! Tap to harvest`;
    else {
      const left = Math.max(0, Math.ceil(crop.grow - (nowSeconds() - t.t.plantedAt)));
      text = `${ITEMS[crop.item]!.name} (${left}s left)`;
    }
  } else if (t.t.type === 'plowed') {
    text = 'Plowed soil — ready to plant';
  } else if (t.t.type === 'soil') {
    text = 'Soil — plow to till';
  } else if (t.t.type === 'grass') {
    text = 'Grass';
  } else if (t.t.type === 'water') {
    text = 'Water';
  } else if (t.t.type === 'path') {
    text = 'Path';
  }
  if (text) {
    tooltip.style.display = 'block';
    tooltip.textContent = text;
    tooltip.style.left = (mousePos.x + 12) + 'px';
    tooltip.style.top = (mousePos.y + 12) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
}
