// =============================================================
//  INPUT  — pointer, touch (with pinch-zoom), wheel, keyboard.
//  Mobile-first: long-press tooltip, haptic feedback, multi-touch.
//
//  Camera model: locked iso (yaw=π/4, pitch=~40°). Drag = pan;
//  scroll/pinch = zoom. The world point under the cursor stays
//  under the cursor while dragging (Google-Maps-style anchor pan).
//  Yaw rotation only changes via the explicit rotate-view button
//  in the HUD (rotateView() in camera-rig.ts) — never from gestures.
// =============================================================

import { state } from './state';
import { cv } from './canvas';
import { TILE } from './constants';
import { clamp } from './utils';
import { ensureAudio } from './audio/sfx';
import { screenToWorld, clampCamera } from './systems/camera';
import { tileAt, buildingAt } from './systems/grid';
import { shooCrow } from './systems/crows';
import { tryPlow, tryPlant, tryHarvestOrInteract, tryPlaceDecoration } from './systems/actions';
import { plantTree, tryHarvestTree } from './systems/trees';
import { chestAt, openChest } from './systems/treasures';
import { spawnRipple } from './systems/flyers';
import { tryPlaceBuilding } from './ui/build-menu';
import { openBuildingPanel } from './ui/building-panel';
import { setTool } from './ui/tools';
import { toast } from './ui/toasts';
import { closeModal } from './ui/modal';
import { updateHoverTooltip, showTooltipAt, hideTooltip } from './ui/tooltip';
import { rotateView, resetView } from './three/camera-rig';
import type { ToolKind } from './types';

export const mousePos = { x: 0, y: 0 };
// Drag state for "tap or drag-pan". prevX/prevY are advanced every
// move event so each step can recompute "world point under cursor".
let dragging = false;
let dragStart: { x: number; y: number; prevX: number; prevY: number } | null = null;
let didDrag = false;
let isTouch = false;
let dragThreshold = 4;

// Held movement keys (per-frame ticked from loop.ts via tickCameraInput).
const heldKeys = {
  panFwd: false, panBack: false,    // W / S
  panLeft: false, panRight: false,  // A / D
};
const KEY_PAN_SPEED = 12;    // world tiles/sec at camScale=1

// Multi-touch state for pinch-zoom / two-finger pan
interface TouchPoint { id: number; x: number; y: number }
let activeTouches: TouchPoint[] = [];
let pinchStart: { dist: number; scale: number; midX: number; midY: number } | null = null;

// Long-press tooltip on touch
let longPressTimer: number | null = null;
let longPressStart: { x: number; y: number } | null = null;
const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE = 10;

export function isDragging(): boolean {
  return dragging;
}

/** Apply held-key camera motion. Called once per frame from loop.ts.
 *  Pan is camera-relative so WASD always moves "as the player sees it". */
export function tickCameraInput(dt: number): void {
  // Pan (WASD) — camera-relative axes projected to ground. State maps:
  // state.camX → world X · TILE, state.camY → world Z · TILE.
  const fwdX   = -Math.cos(state.camYaw);
  const fwdZ   = -Math.sin(state.camYaw);
  const rightX =  Math.sin(state.camYaw); // screen-right in world
  const rightZ = -Math.cos(state.camYaw);
  let dwx = 0, dwz = 0;
  if (heldKeys.panFwd)   { dwx += fwdX;   dwz += fwdZ;   }
  if (heldKeys.panBack)  { dwx -= fwdX;   dwz -= fwdZ;   }
  if (heldKeys.panRight) { dwx += rightX; dwz += rightZ; }
  if (heldKeys.panLeft)  { dwx -= rightX; dwz -= rightZ; }
  if (dwx !== 0 || dwz !== 0) {
    const speed = KEY_PAN_SPEED * dt * TILE / state.camScale;
    state.camX += dwx * speed;
    state.camY += dwz * speed;
    clampCamera();
  }
}

export function haptic(ms: number = 8): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch { /* ignore */ }
  }
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
  dragStart = {
    x: e.clientX, y: e.clientY,
    prevX: e.clientX, prevY: e.clientY,
  };
  cv.classList.add('dragging');
}

function onPointerMove(e: PointerLike): void {
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  if (dragging && dragStart) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) didDrag = true;
    if (didDrag) {
      // Anchor pan: the world point that was under the previous
      // mouse position should still be under the current mouse.
      // Recomputing the delta each step keeps the pan rock-steady
      // even at oblique angles where 1 screen px ≠ 1 world unit.
      const prevW = screenToWorld(dragStart.prevX, dragStart.prevY);
      const curW = screenToWorld(e.clientX, e.clientY);
      state.camX += prevW.x - curW.x;
      state.camY += prevW.y - curW.y;
      clampCamera();
      dragStart.prevX = e.clientX;
      dragStart.prevY = e.clientY;
      cancelLongPress();
    }
  }
  if (!isTouch) updateHoverTooltip();
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
  // Wider zoom range so the locked iso feels expansive: from a
  // close-up of one building to a full-farm overview.
  state.camScale = clamp(state.camScale * factor, 0.45, 3.0);
  const after = screenToWorld(e.clientX, e.clientY);
  state.camX += before.x - after.x;
  state.camY += before.y - after.y;
  clampCamera();
}

function handleTap(sx: number, sy: number): void {
  // Universal tap ripple — pure visual feedback that the tap was received
  spawnRipple(sx, sy);
  const w = screenToWorld(sx, sy);
  const t = tileAt(w.x, w.y);

  for (const c of state.crows) {
    if (c.scared) continue;
    const dx = c.x - w.x;
    const dy = c.y - w.y;
    if (dx * dx + dy * dy < 800) {
      shooCrow(c.id);
      haptic(15);
      return;
    }
  }

  if (!t) return;

  // Chest tap takes precedence
  const chest = chestAt(t.gx, t.gy);
  if (chest) {
    openChest(chest.id);
    haptic(15);
    return;
  }

  if (state.placing && state.placing.decor) {
    tryPlaceDecoration(t.gx, t.gy);
    haptic(10);
    return;
  }
  if (state.placing && state.placing.tree) {
    if (plantTree(state.placing.tree, t.gx, t.gy)) {
      state.placing = null;
      haptic(10);
    }
    return;
  }
  if (state.placing) {
    tryPlaceBuilding(t.gx, t.gy);
    haptic(10);
    return;
  }

  const tree = state.trees.find(tr => tr.x === t.gx && tr.y === t.gy);
  if (tree) {
    tryHarvestTree(tree.id);
    haptic(10);
    return;
  }

  if (t.t.building) {
    const b = buildingAt(t.gx, t.gy);
    if (b) {
      openBuildingPanel(b);
      haptic(8);
      return;
    }
  }

  if (state.selectedTool === 'plow') { tryPlow(t.gx, t.gy); haptic(8); }
  else if (state.selectedTool === 'seed') { tryPlant(t.gx, t.gy); haptic(8); }
  else { tryHarvestOrInteract(t.gx, t.gy); haptic(8); }
}

// ----------------------------------------------------------------
// Long-press tooltip (touch)
// ----------------------------------------------------------------
function startLongPress(x: number, y: number): void {
  cancelLongPress();
  longPressStart = { x, y };
  longPressTimer = window.setTimeout(() => {
    if (!longPressStart) return;
    if (didDrag) return;
    if (pinchStart) return;
    showTooltipAt(longPressStart.x, longPressStart.y);
    haptic(20);
  }, LONG_PRESS_MS);
}
function cancelLongPress(): void {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressStart = null;
  hideTooltip();
}

// ----------------------------------------------------------------
// Pinch-zoom helpers — two fingers zoom + pan. Pan is world-anchor
// (the midpoint between the fingers stays put while the gesture
// re-scales), matching the mouse-wheel zoom-to-cursor behavior.
// ----------------------------------------------------------------
function midpoint(a: TouchPoint, b: TouchPoint): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function distance(a: TouchPoint, b: TouchPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function syncTouches(e: TouchEvent): TouchPoint[] {
  const list: TouchPoint[] = [];
  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i]!;
    list.push({ id: t.identifier, x: t.clientX, y: t.clientY });
  }
  return list;
}

function startPinch(): void {
  if (activeTouches.length < 2) return;
  const a = activeTouches[0]!;
  const b = activeTouches[1]!;
  const mid = midpoint(a, b);
  pinchStart = {
    dist: distance(a, b),
    scale: state.camScale,
    midX: mid.x,
    midY: mid.y,
  };
  // Treat as not a single-finger drag anymore
  dragging = false;
  dragStart = null;
  didDrag = false;
  cv.classList.remove('dragging');
  cancelLongPress();
}

function updatePinch(): void {
  if (!pinchStart || activeTouches.length < 2) return;
  const a = activeTouches[0]!;
  const b = activeTouches[1]!;
  const newDist = distance(a, b);
  if (newDist < 1 || pinchStart.dist < 1) return;
  const mid = midpoint(a, b);

  // 1) Apply the pinch ratio, keeping the world point under the
  //    pinch midpoint anchored across the scale change.
  const prevWorldAtMid = screenToWorld(pinchStart.midX, pinchStart.midY);
  const newScale = clamp(pinchStart.scale * (newDist / pinchStart.dist), 0.45, 3.0);
  state.camScale = newScale;
  const afterWorldAtMid = screenToWorld(pinchStart.midX, pinchStart.midY);
  state.camX += prevWorldAtMid.x - afterWorldAtMid.x;
  state.camY += prevWorldAtMid.y - afterWorldAtMid.y;

  // 2) Apply two-finger pan by anchoring "the world point under
  //    the previous midpoint" to the new midpoint.
  const prevW = screenToWorld(pinchStart.midX, pinchStart.midY);
  const curW = screenToWorld(mid.x, mid.y);
  state.camX += prevW.x - curW.x;
  state.camY += prevW.y - curW.y;

  // Update pinchStart so the next move event is relative
  pinchStart.dist = newDist;
  pinchStart.midX = mid.x;
  pinchStart.midY = mid.y;
  pinchStart.scale = newScale;
  clampCamera();
}

function endPinch(): void {
  pinchStart = null;
}

export function attachInput(): void {
  // ----- Mouse -----
  cv.addEventListener('mousedown', e => {
    isTouch = false;
    dragThreshold = 4;
    // Middle/right click is reserved for the browser context menu (we
    // suppress it on the canvas); they no longer have a gameplay role.
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      return;
    }
    onPointerDown(e);
  });
  cv.addEventListener('mousemove', e => {
    isTouch = false;
    onPointerMove(e);
  });
  cv.addEventListener('mouseup', e => {
    onPointerUp(e);
  });
  cv.addEventListener('mouseleave', e => {
    onPointerUp(e);
  });
  cv.addEventListener('wheel', onWheel, { passive: false });

  // ----- Touch -----
  cv.addEventListener('touchstart', e => {
    isTouch = true;
    dragThreshold = 10; // forgive small wobble on touch
    activeTouches = syncTouches(e);
    if (activeTouches.length === 1) {
      const t = activeTouches[0]!;
      onPointerDown({ clientX: t.x, clientY: t.y });
      mousePos.x = t.x; mousePos.y = t.y;
      startLongPress(t.x, t.y);
    } else if (activeTouches.length >= 2) {
      startPinch();
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    activeTouches = syncTouches(e);
    if (pinchStart && activeTouches.length >= 2) {
      updatePinch();
    } else if (activeTouches.length === 1 && !pinchStart) {
      const t = activeTouches[0]!;
      onPointerMove({ clientX: t.x, clientY: t.y });
      if (longPressStart) {
        const dx = t.x - longPressStart.x;
        const dy = t.y - longPressStart.y;
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE) cancelLongPress();
      }
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchend', e => {
    activeTouches = syncTouches(e);
    if (pinchStart && activeTouches.length < 2) {
      endPinch();
      // After pinch, suppress the trailing tap
      dragging = false;
      dragStart = null;
      didDrag = false;
      cv.classList.remove('dragging');
    } else if (activeTouches.length === 0) {
      cancelLongPress();
      onPointerUp({});
    }
    e.preventDefault();
  }, { passive: false });

  cv.addEventListener('touchcancel', () => {
    activeTouches = [];
    endPinch();
    cancelLongPress();
    dragging = false;
    dragStart = null;
    cv.classList.remove('dragging');
  });

  // ----- Keyboard -----
  window.addEventListener('keydown', e => {
    const map: Record<string, ToolKind> = { '1': 'hand', '2': 'plow', '3': 'seed' };
    const tool = map[e.key];
    if (tool) {
      setTool(tool);
      return;
    }
    // Camera — WASD pan (camera-relative). Q rotates the iso view
    // by 90°; Home returns to the default facing. No pitch control:
    // the iso angle is locked for a stable cozy feel.
    if (e.key === 'w' || e.key === 'W') { heldKeys.panFwd = true; return; }
    if (e.key === 's' || e.key === 'S') { heldKeys.panBack = true; return; }
    if (e.key === 'a' || e.key === 'A') { heldKeys.panLeft = true; return; }
    if (e.key === 'd' || e.key === 'D') { heldKeys.panRight = true; return; }
    if (e.key === 'q' || e.key === 'Q') { rotateView(); return; }
    if (e.key === 'Home') { resetView(); return; }
    if (e.key === 'Escape') {
      if (state.placing) {
        state.placing = null;
        toast('Build cancelled');
        return;
      }
      // Try mobile shells first
      const sheet = document.getElementById('more-sheet');
      const side = document.getElementById('side-panel');
      if (sheet && sheet.classList.contains('open')) {
        sheet.classList.remove('open');
        document.getElementById('more-scrim')!.classList.remove('open');
        return;
      }
      if (side && side.classList.contains('open')) {
        side.classList.remove('open');
        document.getElementById('side-panel-scrim')!.classList.remove('open');
        return;
      }
      closeModal();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'W') heldKeys.panFwd = false;
    if (e.key === 's' || e.key === 'S') heldKeys.panBack = false;
    if (e.key === 'a' || e.key === 'A') heldKeys.panLeft = false;
    if (e.key === 'd' || e.key === 'D') heldKeys.panRight = false;
  });

  // ----- Block iOS context menu on long-press of canvas -----
  cv.addEventListener('contextmenu', e => e.preventDefault());

  // ----- Block iOS double-tap zoom on UI -----
  document.addEventListener('gesturestart', e => e.preventDefault());

  // ----- HUD: rotate-view button -----
  const rotateBtn = document.getElementById('rotate-view-btn');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      rotateView();
      haptic(8);
    });
  }
}
