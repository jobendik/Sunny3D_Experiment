// =============================================================
//  INPUT  — pointer, touch, wheel, keyboard
// =============================================================

import { state } from './state';
import { cv } from './canvas';
import { clamp } from './utils';
import { ensureAudio } from './audio/sfx';
import { screenToWorld, clampCamera } from './systems/camera';
import { tileAt, buildingAt } from './systems/grid';
import { shooCrow } from './systems/crows';
import { tryPlow, tryPlant, tryHarvestOrInteract, tryPlaceDecoration } from './systems/actions';
import { plantTree, tryHarvestTree } from './systems/trees';
import { tryPlaceBuilding } from './ui/build-menu';
import { openBuildingPanel } from './ui/building-panel';
import { setTool } from './ui/tools';
import { toast } from './ui/toasts';
import { closeModal } from './ui/modal';
import { updateHoverTooltip } from './ui/tooltip';
import type { ToolKind } from './types';

export const mousePos = { x: 0, y: 0 };
let dragging = false;
let dragStart: { x: number; y: number; camX: number; camY: number } | null = null;
let didDrag = false;

export function isDragging(): boolean {
  return dragging;
}

interface PointerLike {
  clientX: number;
  clientY: number;
  preventDefault?: () => void;
}

function onPointerDown(e: PointerLike): void {
  ensureAudio();
  dragging = true;
  didDrag = false;
  dragStart = { x: e.clientX, y: e.clientY, camX: state.camX, camY: state.camY };
  cv.classList.add('dragging');
}

function onPointerMove(e: PointerLike): void {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  if (dragging && dragStart) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDrag = true;
    if (didDrag) {
      state.camX = dragStart.camX - dx / state.camScale;
      state.camY = dragStart.camY - dy / state.camScale;
      clampCamera();
    }
  }
  updateHoverTooltip();
}

function onPointerUp(_e: unknown): void {
  cv.classList.remove('dragging');
  if (dragging && !didDrag) {
    handleTap(mousePos.x, mousePos.y);
  }
  dragging = false;
  dragStart = null;
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.88 : 1.12;
  const before = screenToWorld(e.clientX, e.clientY);
  state.camScale = clamp(state.camScale * factor, 0.5, 2.4);
  const after = screenToWorld(e.clientX, e.clientY);
  state.camX += before.x - after.x;
  state.camY += before.y - after.y;
  clampCamera();
}

function handleTap(sx: number, sy: number): void {
  const w = screenToWorld(sx, sy);
  const t = tileAt(w.x, w.y);

  for (const c of state.crows) {
    if (c.scared) continue;
    const dx = c.x - w.x;
    const dy = c.y - w.y;
    if (dx * dx + dy * dy < 800) {
      shooCrow(c.id);
      return;
    }
  }

  if (!t) return;

  if (state.placing && state.placing.decor) {
    tryPlaceDecoration(t.gx, t.gy);
    return;
  }
  if (state.placing && state.placing.tree) {
    if (plantTree(state.placing.tree, t.gx, t.gy)) state.placing = null;
    return;
  }
  if (state.placing) {
    tryPlaceBuilding(t.gx, t.gy);
    return;
  }

  const tree = state.trees.find(tr => tr.x === t.gx && tr.y === t.gy);
  if (tree) {
    tryHarvestTree(tree.id);
    return;
  }

  if (t.t.building) {
    const b = buildingAt(t.gx, t.gy);
    if (b) {
      openBuildingPanel(b);
      return;
    }
  }

  if (state.selectedTool === 'plow') tryPlow(t.gx, t.gy);
  else if (state.selectedTool === 'seed') tryPlant(t.gx, t.gy);
  else tryHarvestOrInteract(t.gx, t.gy);
}

export function attachInput(): void {
  cv.addEventListener('mousedown', onPointerDown);
  cv.addEventListener('mousemove', onPointerMove);
  cv.addEventListener('mouseup', onPointerUp);
  cv.addEventListener('mouseleave', onPointerUp);
  cv.addEventListener('wheel', onWheel, { passive: false });

  cv.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      onPointerDown({ clientX: t.clientX, clientY: t.clientY });
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      const t = e.touches[0]!;
      onPointerMove({ clientX: t.clientX, clientY: t.clientY });
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchend', e => {
    onPointerUp({});
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', e => {
    const map: Record<string, ToolKind> = { '1': 'hand', '2': 'plow', '3': 'seed' };
    const tool = map[e.key];
    if (tool) {
      setTool(tool);
      return;
    }
    if (e.key === 'Escape') {
      if (state.placing) {
        state.placing = null;
        toast('Build cancelled');
        return;
      }
      closeModal();
    }
  });
}
