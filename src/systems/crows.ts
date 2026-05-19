import { state } from '../state';
import { GRID_W, GRID_H, TILE } from '../constants';
import { rand, randi, choice } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { spawnParticles, floatText } from './particles';
import { addXP } from './xp';
import { checkAchievements } from './achievements';
import { isEvent } from './events';
import type { Crow } from '../types';

export function makeCrow(x: number, y: number): Crow {
  return {
    id: 'crow' + Date.now() + randi(1e6),
    x, y, tx: x, ty: y,
    targetTile: null,
    state: 'flying',
    t: 0, eatT: 0,
    frame: 0, frameT: rand(0.5),
    scared: false,
  };
}

export function spawnCrows(count: number): void {
  const targets: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (state.grid[y]![x]!.crop) targets.push({ x, y });
    }
  }
  if (targets.length === 0) {
    for (let i = 0; i < count; i++) {
      state.crows.push(makeCrow(rand(GRID_W * TILE), rand(GRID_H * TILE)));
    }
    return;
  }
  for (let i = 0; i < count; i++) {
    const t = choice(targets);
    const c = makeCrow(t.x * TILE + TILE / 2, -40);
    c.tx = t.x * TILE + TILE / 2;
    c.ty = t.y * TILE + TILE / 2;
    c.targetTile = { x: t.x, y: t.y };
    state.crows.push(c);
  }
}

export function updateCrows(dt: number): void {
  for (let i = state.crows.length - 1; i >= 0; i--) {
    const c = state.crows[i]!;
    c.frameT += dt;
    if (c.frameT > 0.2) {
      c.frame = 1 - c.frame;
      c.frameT = 0;
    }
    if (c.scared) {
      c.y -= 60 * dt;
      c.x += c.dx ?? 0;
      if (c.y < -50) state.crows.splice(i, 1);
    } else if (c.state === 'flying') {
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        c.x += dx / d * 80 * dt;
        c.y += dy / d * 80 * dt;
      } else {
        c.state = 'eating';
        c.eatT = 0;
      }
    } else if (c.state === 'eating') {
      c.eatT += dt;
      if (c.eatT > 5 && c.targetTile) {
        const tile = state.grid[c.targetTile.y]![c.targetTile.x]!;
        if (tile.crop) {
          tile.crop = null;
          tile.plantedAt = 0;
          tile.type = 'soil';
          toast('A crow stole a crop!', 'error');
          floatText(c.x, c.y, 'Stolen!', '#d24a4a');
        }
        c.scared = true;
        c.dx = (Math.random() - 0.5) * 40;
      }
    }
  }
  if (!isEvent('crows') && state.crows.length > 0) {
    for (const c of state.crows) {
      c.scared = true;
      c.dx = (Math.random() - 0.5) * 40;
    }
  }
  // Scarecrow effect: cull at most 1 crow per tick if nearby
  if (state.decor.some(d => d.type === 'scarecrow')) {
    for (let i = state.crows.length - 1; i >= 0; i--) {
      const c = state.crows[i]!;
      if (c.scared) continue;
      for (const d of state.decor) {
        if (d.type !== 'scarecrow') continue;
        const ddx = (d.x + 0.5) * TILE - c.x;
        const ddy = (d.y + 0.5) * TILE - c.y;
        if (ddx * ddx + ddy * ddy < 90 * 90) {
          c.scared = true;
          c.dx = (Math.random() - 0.5) * 40;
          break;
        }
      }
    }
  }
}

export function shooCrow(crowId: string): void {
  const c = state.crows.find(x => x.id === crowId);
  if (!c || c.scared) return;
  c.scared = true;
  c.dx = (Math.random() - 0.5) * 60;
  state.stats.crowsShooed++;
  spawnParticles(c.x, c.y, '#fff', 8);
  sfx.crow();
  floatText(c.x, c.y - 10, '+5 ✦', '#3a8020');
  addXP(2);
  state.coins += 5;
  state.stats.earned += 5;
  updateHUD();
  checkAchievements();
}
