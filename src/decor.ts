// =============================================================
//  Background decoration trees (rendered outside the grid)
// =============================================================

import { ctx } from './canvas';
import { GRID_W, GRID_H, TILE } from './constants';
import { rand } from './utils';
import { spriteDecorTree } from './sprites/entities';

interface DecorPos {
  x: number;
  y: number;
}

const decorPositions: DecorPos[] = [];
let decorTreeCache: HTMLCanvasElement | null = null;

export function initDecor(): void {
  if (decorPositions.length) return;
  const margin = 120;
  for (let i = 0; i < 30; i++) {
    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      x = -margin + rand(GRID_W * TILE + margin * 2);
      y = -margin + rand(GRID_H * TILE + margin * 2);
      attempts++;
    } while (x > 0 && x < GRID_W * TILE && y > 0 && y < GRID_H * TILE && attempts < 10);
    if (x > 0 && x < GRID_W * TILE && y > 0 && y < GRID_H * TILE) {
      if (Math.abs(x - GRID_W * TILE / 2) > Math.abs(y - GRID_H * TILE / 2)) {
        x = x < GRID_W * TILE / 2 ? -margin / 2 - rand(60) : GRID_W * TILE + margin / 2 + rand(60);
      } else {
        y = y < GRID_H * TILE / 2 ? -margin / 2 - rand(60) : GRID_H * TILE + margin / 2 + rand(60);
      }
    }
    decorPositions.push({ x, y });
  }
  decorTreeCache = spriteDecorTree();
}

export function drawDecor(): void {
  if (!decorTreeCache) return;
  for (const d of decorPositions) {
    ctx.drawImage(decorTreeCache, d.x - 40, d.y - 90);
  }
}
