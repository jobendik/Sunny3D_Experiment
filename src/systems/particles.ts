import { state } from '../state';
import { rand } from '../utils';

export function spawnParticles(wx: number, wy: number, color: string, n: number, big = false): void {
  for (let i = 0; i < n; i++) {
    const ang = rand(Math.PI * 2);
    const sp = (big ? 80 : 40) + rand(big ? 80 : 40);
    state.particles.push({
      x: wx,
      y: wy,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - (big ? 40 : 20),
      life: 0.6 + rand(0.4),
      age: 0,
      color,
      size: big ? 4 : 3,
    });
  }
}

export function floatText(wx: number, wy: number, text: string, color: string): void {
  state.floats.push({ x: wx, y: wy, text, color, age: 0, life: 1.2 });
}
