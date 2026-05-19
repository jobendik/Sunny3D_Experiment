// =============================================================
//  POPS — short-lived animated "scale up + fade out" of a sprite
//  at a world position. Used when crops/fruits are harvested so
//  the action has a satisfying visual exit.
// =============================================================

import { TILE } from '../constants';

interface Pop {
  sprite: HTMLCanvasElement;
  wx: number;     // top-left world x
  wy: number;     // top-left world y
  w: number;      // sprite width
  h: number;      // sprite height
  age: number;
  duration: number;
  vy: number;     // upward drift speed (world px/sec)
  rot: number;    // initial rotation
  spin: number;   // spin speed (rad/sec)
}

const pops: Pop[] = [];

/** Trigger a harvest pop at the given world position. */
export function spawnPop(
  sprite: HTMLCanvasElement,
  wx: number, wy: number,
): void {
  pops.push({
    sprite,
    wx, wy,
    w: sprite.width,
    h: sprite.height,
    age: 0,
    duration: 0.55,
    vy: -40 - Math.random() * 20,
    rot: (Math.random() - 0.5) * 0.4,
    spin: (Math.random() - 0.5) * 2.5,
  });
}

/** Sized pop variant — useful when the sprite is drawn at a custom size. */
export function spawnPopSized(
  sprite: HTMLCanvasElement,
  wx: number, wy: number,
  w: number, h: number,
): void {
  pops.push({
    sprite,
    wx, wy,
    w, h,
    age: 0,
    duration: 0.55,
    vy: -40 - Math.random() * 20,
    rot: (Math.random() - 0.5) * 0.4,
    spin: (Math.random() - 0.5) * 2.5,
  });
}

/** Tick the pop list — call once per frame. */
export function tickPops(dt: number): void {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]!;
    p.age += dt;
    p.wy += p.vy * dt;
    p.rot += p.spin * dt;
    if (p.age >= p.duration) pops.splice(i, 1);
  }
}

/** Draw all pops in WORLD space. Call after tile rendering but before
 *  entity draws so the pop fits within the depth ordering layers.
 *  (For now we just draw above tiles; the duration is short.) */
export function drawPops(ctx: CanvasRenderingContext2D): void {
  for (const p of pops) {
    const t = Math.min(1, p.age / p.duration);
    // Custom curve: a quick scale-up overshoot (0..0.3), gentle scale-down
    let scale: number;
    if (t < 0.25) {
      const k = t / 0.25;
      scale = 1 + 0.45 * (k * (2 - k)); // ease-out 0..0.45
    } else {
      const k = (t - 0.25) / 0.75;
      scale = 1.45 - 0.4 * k;            // 1.45 → 1.05
    }
    const alpha = 1 - t * t;             // ease-in fade
    const cx = p.wx + p.w / 2;
    const cy = p.wy + p.h / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(p.rot);
    ctx.scale(scale, scale);
    ctx.drawImage(p.sprite, -p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
    // Tiny shining ring at peak scale
    if (t > 0.15 && t < 0.55) {
      ctx.save();
      ctx.globalAlpha = (0.5 - Math.abs(t - 0.35)) * 0.9;
      ctx.strokeStyle = 'rgba(255, 245, 200, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, p.w * 0.6 * (0.6 + t * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Reference TILE to avoid an unused import. The constant is exported for
// callers that want to position pops by grid coordinates.
export const _TILE = TILE;
