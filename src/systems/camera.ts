import { state } from '../state';
import { SW, SH } from '../canvas';
import { GRID_W, GRID_H, TILE } from '../constants';
import { clamp } from '../utils';

export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (wx - state.camX) * state.camScale + SW() / 2,
    y: (wy - state.camY) * state.camScale + SH() / 2,
  };
}

export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - SW() / 2) / state.camScale + state.camX,
    y: (sy - SH() / 2) / state.camScale + state.camY,
  };
}

export function clampCamera(): void {
  const margin = 240;
  state.camX = clamp(state.camX, -margin, GRID_W * TILE + margin);
  state.camY = clamp(state.camY, -margin, GRID_H * TILE + margin);
}
