import { state } from '../state';
import { GRID_W, GRID_H, TILE } from '../constants';
import { rand, randi } from '../utils';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { spawnParticles, floatText } from './particles';

export function spawnDog(): void {
  state.dog = {
    x: GRID_W * TILE / 2,
    y: GRID_H * TILE / 2,
    tx: GRID_W * TILE / 2,
    ty: GRID_H * TILE / 2,
    state: 'idle',
    t: 0,
    frame: 0,
    frameT: 0,
    bonusTimer: 30 + rand(60),
  };
}

export function updateDog(dt: number): void {
  if (!state.dog) {
    if (state.level >= 4) spawnDog();
    return;
  }
  const d = state.dog;
  d.t += dt;
  d.frameT += dt;
  if (d.frameT > 0.25) {
    d.frame = 1 - d.frame;
    d.frameT = 0;
  }
  const dx = d.tx - d.x;
  const dy = d.ty - d.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const speed = 35;
    d.x += dx / dist * speed * dt;
    d.y += dy / dist * speed * dt;
  } else if (Math.random() < dt * 0.4) {
    d.tx = rand(GRID_W * TILE);
    d.ty = rand(GRID_H * TILE);
  }
  d.bonusTimer -= dt;
  if (d.bonusTimer <= 0) {
    d.bonusTimer = 60 + rand(120);
    const coins = 5 + randi(15);
    state.coins += coins;
    state.stats.earned += coins;
    floatText(d.x, d.y - 20, `Dog found +${coins}!`, '#3a8020');
    spawnParticles(d.x, d.y, '#ffe080', 14);
    sfx.bark();
    updateHUD();
  }
}
