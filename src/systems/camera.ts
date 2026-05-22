// =============================================================
//  CAMERA  (3D-aware screen ↔ world conversion)
//
//  state.camX / state.camY are kept in PIXEL world coordinates so
//  the existing input math (drag = dx / camScale) keeps working
//  unchanged. Conversion to/from screen space uses the actual 3D
//  camera (orthographic, tilted) via a raycast against y=0.
//
//  We read the canvas's actual getBoundingClientRect rather than
//  window.innerWidth/Height so the math survives any CSS offset
//  (browser zoom, parent padding, etc.) without drift.
// =============================================================

import { Raycaster, Vector2, Vector3, Plane } from 'three';
import { state } from '../state';
import { cv } from '../canvas';
import { GRID_W, GRID_H, TILE } from '../constants';
import { clamp } from '../utils';
import { getCamera } from '../three/camera-rig';

const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);

function canvasRect(): { left: number; top: number; width: number; height: number } {
  const r = cv.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** Project a screen-pixel point onto the y=0 ground plane and return
 *  the hit in PIXEL world coords (consistent with state.camX/Y).
 *  sx, sy are viewport-relative (e.clientX / e.clientY). */
export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const r = canvasRect();
  if (r.width === 0 || r.height === 0) return { x: state.camX, y: state.camY };
  ndc.x = ((sx - r.left) / r.width) * 2 - 1;
  ndc.y = -(((sy - r.top) / r.height) * 2 - 1);
  raycaster.setFromCamera(ndc, getCamera());
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) {
    return { x: state.camX, y: state.camY };
  }
  return { x: hit.x * TILE, y: hit.z * TILE };
}

/** Inverse: project a world (pixel) point onto the screen. Used by
 *  the few UI bits that anchor DOM overlays to the world (tutorial
 *  spotlight, snapshot framing). Returns viewport-relative pixels. */
const _proj = new Vector3();
export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  const r = canvasRect();
  _proj.set(wx / TILE, 0, wy / TILE);
  _proj.project(getCamera());
  return {
    x: r.left + (_proj.x + 1) * 0.5 * r.width,
    y: r.top + (-_proj.y + 1) * 0.5 * r.height,
  };
}

export function clampCamera(): void {
  // Generous margin so the player can pan to see the entire 32×32
  // world plus a comfortable view of the outer decorative landscape.
  // Soft-clamping rather than a hard wall keeps the iso pan feeling
  // smooth at the borders.
  const margin = 360;
  state.camX = clamp(state.camX, -margin, GRID_W * TILE + margin);
  state.camY = clamp(state.camY, -margin, GRID_H * TILE + margin);
}
