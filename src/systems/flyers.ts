// =============================================================
//  FLYERS — screen-space animated "rewards" that arc from a
//  world position to a HUD target (coin badge, level badge).
//  Also handles tile-tap ripples — pure visual feedback.
// =============================================================

import { worldToScreen } from './camera';

export type FlyerKind = 'coin' | 'xp' | 'sparkle';

interface Flyer {
  kind: FlyerKind;
  // Cached start + target in screen-space at spawn time. Recomputed
  // for the source if camera moves so the start position tracks.
  sx: number; sy: number;
  tx: number; ty: number;
  // Bezier control point so the path arcs upward
  cx: number; cy: number;
  age: number;
  duration: number;
  size: number;
  amt: number; // value carried (for XP/coins, optional)
  onArrive?: () => void;
}

const flyers: Flyer[] = [];
const ripples: { x: number; y: number; age: number; life: number; maxR: number; color: string }[] = [];

function hudTargetFor(kind: FlyerKind): { x: number; y: number } | null {
  let id: string;
  if (kind === 'coin') id = 'coin-badge';
  else if (kind === 'xp') id = 'level-badge';
  else return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Spawn a coin/xp/sparkle flyer from a world position to its HUD target. */
export function spawnFlyer(
  worldX: number, worldY: number,
  kind: FlyerKind,
  amt = 1,
): void {
  const startScreen = worldToScreen(worldX, worldY);
  const target = hudTargetFor(kind) ?? { x: startScreen.x, y: 50 };
  // Pick a control point above and to the side so the path arcs nicely.
  const midX = (startScreen.x + target.x) / 2;
  const minY = Math.min(startScreen.y, target.y);
  const cx = midX + (Math.random() - 0.5) * 60;
  const cy = minY - 80 - Math.random() * 60;
  flyers.push({
    kind,
    sx: startScreen.x, sy: startScreen.y,
    tx: target.x, ty: target.y,
    cx, cy,
    age: 0,
    duration: 0.65 + Math.random() * 0.15,
    size: kind === 'coin' ? 18 : kind === 'xp' ? 16 : 12,
    amt,
    onArrive: kind === 'coin' || kind === 'xp'
      ? () => popBadge(kind)
      : undefined,
  });
}

/** Spawn a burst of N flyers from one world point. */
export function spawnFlyerBurst(
  worldX: number, worldY: number,
  kind: FlyerKind,
  n: number,
): void {
  for (let i = 0; i < n; i++) {
    setTimeout(() => spawnFlyer(
      worldX + (Math.random() - 0.5) * 24,
      worldY + (Math.random() - 0.5) * 12,
      kind,
    ), i * 35);
  }
}

/** Spawn a tile-tap ripple at a screen position. */
export function spawnRipple(sx: number, sy: number, color = '#fff7c4'): void {
  ripples.push({ x: sx, y: sy, age: 0, life: 0.45, maxR: 36, color });
}

/** Spawn a screen-space burst to the HUD (for non-world rewards like
 *  order fulfillment, sells, pass tiers, etc.). */
export function spawnHUDBurst(kind: FlyerKind, n: number): void {
  // Originate roughly near where the user clicked — easiest proxy is mid-screen.
  // We don't have easy access to the click target here; mid-screen + tiny scatter
  // looks fine and still produces a satisfying arc to the HUD.
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const target = kind === 'coin' ? 'coin-badge' : 'level-badge';
  const el = document.getElementById(target);
  const tgt = el ? el.getBoundingClientRect() : null;
  const tx = tgt ? tgt.left + tgt.width / 2 : sw / 2;
  const ty = tgt ? tgt.top + tgt.height / 2 : 50;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const sx = sw / 2 + (Math.random() - 0.5) * 80;
      const sy = sh / 2 + (Math.random() - 0.5) * 40;
      const cx = (sx + tx) / 2 + (Math.random() - 0.5) * 80;
      const cy = Math.min(sy, ty) - 100 - Math.random() * 70;
      flyers.push({
        kind,
        sx, sy, tx, ty, cx, cy,
        age: 0,
        duration: 0.7 + Math.random() * 0.15,
        size: kind === 'coin' ? 18 : 16,
        amt: 1,
        onArrive: () => popBadge(kind),
      });
    }, i * 38);
  }
}

let badgePopT: Record<string, number> = {};
function popBadge(kind: FlyerKind): void {
  const id = kind === 'coin' ? 'coin-badge' : 'level-badge';
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('badge-pop');
  // restart animation
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void (el as HTMLElement).offsetWidth;
  el.classList.add('badge-pop');
  badgePopT[id] = performance.now();
}

export function tickFlyers(dt: number): void {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i]!;
    f.age += dt;
    if (f.age >= f.duration) {
      f.onArrive?.();
      flyers.splice(i, 1);
    }
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]!;
    r.age += dt;
    if (r.age >= r.life) ripples.splice(i, 1);
  }
}

/** Draw all screen-space flyers + ripples. Called from render() AFTER
 *  the world transform is restored. */
export function drawFlyers(ctx: CanvasRenderingContext2D): void {
  // Ripples first (under flyers)
  for (const r of ripples) {
    const t = r.age / r.life;
    const radius = r.maxR * t;
    const alpha = (1 - t) * 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2.5 * (1 - t * 0.6);
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Flyers
  for (const f of flyers) {
    const t = f.age / f.duration;
    // Quadratic bezier interpolation
    const it = 1 - t;
    const x = it * it * f.sx + 2 * it * t * f.cx + t * t * f.tx;
    const y = it * it * f.sy + 2 * it * t * f.cy + t * t * f.ty;
    // Subtle spin / scale
    const scaleEnd = 0.7;
    const scale = 1 + (scaleEnd - 1) * t;
    const rotate = t * Math.PI * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (f.kind === 'coin') {
      ctx.rotate(rotate * 0.4);
      // Coin disc — gold
      const r = f.size;
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
      g.addColorStop(0, '#fff5c0');
      g.addColorStop(0.5, '#f4cb6a');
      g.addColorStop(1, '#94601a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a3d0c';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2); ctx.stroke();
      // Inner ring
      ctx.strokeStyle = 'rgba(255,245,180,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke();
      // Glow
      ctx.shadowColor = 'rgba(244,185,66,0.7)';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'xp') {
      ctx.rotate(rotate * 0.3);
      const r = f.size;
      // Blue diamond / gem
      ctx.fillStyle = '#a6d8f0';
      ctx.strokeStyle = '#245d83';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r); ctx.lineTo(-r * 0.85, 0); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.4, 0);
      ctx.lineTo(0, 0); ctx.closePath();
      ctx.fill();
      ctx.shadowColor = '#7fc8e8';
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      // sparkle: 4-point star
      const r = f.size;
      ctx.fillStyle = '#fff5c0';
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const rad = p % 2 === 0 ? r : r * 0.35;
        const sx = Math.cos(ang) * rad;
        const sy = Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// Silence unused
void badgePopT;
