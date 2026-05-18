import { BUILDINGS } from '../data/buildings';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { screenToWorld } from '../systems/camera';
import { tileAt, buildingAt } from '../systems/grid';
import { cropStage } from '../systems/crops';
import { nowSeconds } from '../utils';
import { mousePos, isDragging } from '../input';

const tooltip = document.getElementById('tooltip') as HTMLElement;
let touchHideTimer: number | null = null;

function describeAt(sx: number, sy: number): string {
  const w = screenToWorld(sx, sy);
  const t = tileAt(w.x, w.y);
  if (!t) return '';
  if (t.t.building) {
    const b = buildingAt(t.gx, t.gy);
    if (b) return BUILDINGS[b.type]!.name + ' — tap to open';
    return '';
  }
  if (t.t.crop) {
    const stage = cropStage(t.t);
    const crop = CROPS[t.t.crop]!;
    if (stage === 3) return `${ITEMS[crop.item]!.name} ready! Tap to harvest`;
    const left = Math.max(0, Math.ceil(crop.grow - (nowSeconds() - t.t.plantedAt)));
    return `${ITEMS[crop.item]!.name} — ${left}s left`;
  }
  if (t.t.type === 'plowed') return 'Plowed soil — ready to plant';
  if (t.t.type === 'soil') return 'Soil — plow to till';
  if (t.t.type === 'grass') return 'Grass — plow or decorate';
  if (t.t.type === 'water') return 'Water';
  if (t.t.type === 'path') return 'Path';
  return '';
}

export function updateHoverTooltip(): void {
  if (isDragging()) { tooltip.style.display = 'none'; return; }
  const text = describeAt(mousePos.x, mousePos.y);
  if (text) {
    tooltip.style.display = 'block';
    tooltip.textContent = text;
    tooltip.style.left = (mousePos.x + 12) + 'px';
    tooltip.style.top = (mousePos.y + 12) + 'px';
  } else {
    tooltip.style.display = 'none';
  }
}

export function showTooltipAt(sx: number, sy: number): void {
  const text = describeAt(sx, sy);
  if (!text) return;
  tooltip.style.display = 'block';
  tooltip.textContent = text;
  // Place above the finger so it isn't obscured
  const w = window.innerWidth;
  const left = Math.min(Math.max(8, sx - 40), w - 240);
  tooltip.style.left = left + 'px';
  tooltip.style.top = Math.max(8, sy - 56) + 'px';
  if (touchHideTimer !== null) clearTimeout(touchHideTimer);
  touchHideTimer = window.setTimeout(() => { tooltip.style.display = 'none'; }, 1800);
}

export function hideTooltip(): void {
  if (touchHideTimer !== null) { clearTimeout(touchHideTimer); touchHideTimer = null; }
  tooltip.style.display = 'none';
}
