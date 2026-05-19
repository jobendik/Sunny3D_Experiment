// =============================================================
//  RENDER  — draws the world each frame.
// =============================================================

import { state } from './state';
import { ctx, DPR, SW, SH } from './canvas';
import { TILE, GRID_W, GRID_H, DAY_SECONDS } from './constants';
import { ANIMALS } from './data/animals';
import { BUILDINGS } from './data/buildings';
import { DECORATIONS } from './data/decorations';
import { ORCHARDS } from './data/orchards';
import { SEASON_INFO } from './data/seasons';
import { sprites } from './sprites';
import { clamp, nowSeconds } from './utils';
import { screenToWorld } from './systems/camera';
import { canPlaceBuilding } from './systems/grid';
import { cropStage, isWithered, isWilting } from './systems/crops';
import { getTreeStage } from './systems/trees';
import { penFeedLevel } from './systems/pens';
import { mousePos } from './input';
import { drawDecor } from './decor';
import { currentBeacon } from './systems/goal-beacon';
import { tickShake, tickFlash } from './systems/juice';
import { getAmbientCreatures } from './systems/ambient';
import { drawFlyers, tickFlyers } from './systems/flyers';
import { drawPops, tickPops } from './systems/pops';

interface Drawable {
  y: number;
  kind: 'building' | 'decor' | 'tree' | 'crow' | 'dog' | 'ambient';
  data: unknown;
}

// =============================================================
//  LIGHTING — continuous day-cycle profile (no hard thresholds)
// =============================================================

type RGB = [number, number, number];

interface LightFrameHex {
  t: number;
  skyTop: string;
  skyBottom: string;
  shadow: number;
  sun: number;
  moon: number;
  stars: number;
  windows: number;
  nightTint: number;
  warmTint: number;
}
interface Lighting {
  t: number;
  skyTop: RGB;
  skyBottom: RGB;
  shadow: number;
  sun: number;
  moon: number;
  stars: number;
  windows: number;
  nightTint: number;
  warmTint: number;
}

// Keyframes around the full day cycle. Adjacent frames interpolate
// linearly so transitions are smooth rather than snapped.
const LIGHT_FRAMES: LightFrameHex[] = [
  { t: 0.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.16, sun: 0, moon: 1.0, stars: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
  { t: 0.08, skyTop: '#1a2548', skyBottom: '#3a4868', shadow: 0.18, sun: 0, moon: 0.9, stars: 0.85, windows: 0.85, nightTint: 0.42, warmTint: 0 },
  { t: 0.12, skyTop: '#5a4870', skyBottom: '#b08280', shadow: 0.22, sun: 0.1, moon: 0.35, stars: 0.4, windows: 0.55, nightTint: 0.25, warmTint: 0.1 },
  { t: 0.18, skyTop: '#f0c8a0', skyBottom: '#ffe0c0', shadow: 0.30, sun: 0.4, moon: 0, stars: 0, windows: 0.18, nightTint: 0.08, warmTint: 0.18 },
  { t: 0.25, skyTop: '#cfe8ff', skyBottom: '#e0f4d8', shadow: 0.36, sun: 1.0, moon: 0, stars: 0, windows: 0, nightTint: 0, warmTint: 0.04 },
  { t: 0.50, skyTop: '#bce8ff', skyBottom: '#d8f0c0', shadow: 0.40, sun: 1.0, moon: 0, stars: 0, windows: 0, nightTint: 0, warmTint: 0 },
  { t: 0.65, skyTop: '#c2e0f4', skyBottom: '#f0e6c0', shadow: 0.38, sun: 0.95, moon: 0, stars: 0, windows: 0, nightTint: 0, warmTint: 0.06 },
  { t: 0.75, skyTop: '#ffcc98', skyBottom: '#ffd890', shadow: 0.32, sun: 0.65, moon: 0, stars: 0, windows: 0.05, nightTint: 0.04, warmTint: 0.18 },
  { t: 0.82, skyTop: '#e88060', skyBottom: '#f0c890', shadow: 0.26, sun: 0.25, moon: 0, stars: 0.05, windows: 0.30, nightTint: 0.12, warmTint: 0.22 },
  { t: 0.88, skyTop: '#6a4878', skyBottom: '#c87060', shadow: 0.21, sun: 0, moon: 0.25, stars: 0.4, windows: 0.65, nightTint: 0.3, warmTint: 0.12 },
  { t: 0.94, skyTop: '#1f2a4a', skyBottom: '#3e4a68', shadow: 0.17, sun: 0, moon: 0.7, stars: 0.85, windows: 0.85, nightTint: 0.42, warmTint: 0.02 },
  { t: 1.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.16, sun: 0, moon: 1.0, stars: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
];

function hexToRgb(hex: string): RGB {
  const v = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function rgbStr(c: RGB, alpha = 1): string {
  if (alpha === 1) return `rgb(${c[0]},${c[1]},${c[2]})`;
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
function lerpN(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Continuous lighting profile for a given dayElapsed in [0, 1]. */
function getLighting(dayElapsed: number): Lighting {
  let lo = LIGHT_FRAMES[0]!, hi = LIGHT_FRAMES[LIGHT_FRAMES.length - 1]!;
  for (let i = 0; i < LIGHT_FRAMES.length - 1; i++) {
    if (dayElapsed >= LIGHT_FRAMES[i]!.t && dayElapsed <= LIGHT_FRAMES[i + 1]!.t) {
      lo = LIGHT_FRAMES[i]!;
      hi = LIGHT_FRAMES[i + 1]!;
      break;
    }
  }
  const span = hi.t - lo.t;
  const t = span > 0 ? (dayElapsed - lo.t) / span : 0;
  // Smoothstep eases the boundary between keyframes
  const e = t * t * (3 - 2 * t);
  return {
    t: dayElapsed,
    skyTop: lerpRGB(hexToRgb(lo.skyTop), hexToRgb(hi.skyTop), e),
    skyBottom: lerpRGB(hexToRgb(lo.skyBottom), hexToRgb(hi.skyBottom), e),
    shadow: lerpN(lo.shadow, hi.shadow, e),
    sun: lerpN(lo.sun, hi.sun, e),
    moon: lerpN(lo.moon, hi.moon, e),
    stars: lerpN(lo.stars, hi.stars, e),
    windows: lerpN(lo.windows, hi.windows, e),
    nightTint: lerpN(lo.nightTint, hi.nightTint, e),
    warmTint: lerpN(lo.warmTint, hi.warmTint, e),
  };
}

/** Weather sky colors + blend factor for applying over the day cycle. */
function getWeatherSky(weather: string): { top: RGB; bottom: RGB; blend: number } | null {
  switch (weather) {
    case 'storm': return { top: hexToRgb('#5a6878'), bottom: hexToRgb('#7a8088'), blend: 0.85 };
    case 'rainy': return { top: hexToRgb('#90a8b8'), bottom: hexToRgb('#a8b8c0'), blend: 0.75 };
    case 'snowy': return { top: hexToRgb('#d8e0e8'), bottom: hexToRgb('#e8eef0'), blend: 0.55 };
    case 'cloudy': return { top: hexToRgb('#b8d0e0'), bottom: hexToRgb('#d0d8d0'), blend: 0.45 };
    default: return null;
  }
}

// =============================================================
//  HELPERS — drop shadow + small atmosphere utilities
// =============================================================

/** Soft elliptical drop shadow at the given baseline. */
function drawShadow(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
  alpha = 0.32,
): void {
  c.save();
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  g.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Painterly distant hills along the horizon — purely decorative. */
function drawHillsLayer(
  c: CanvasRenderingContext2D,
  baseY: number,
  segmentW: number,
  amp: number,
  offsetX: number,
): void {
  c.beginPath();
  c.moveTo(-50, baseY + amp);
  for (let x = -50 - (offsetX % segmentW); x <= SW() + segmentW; x += segmentW) {
    const cx1 = x + segmentW * 0.3;
    const cy1 = baseY - amp * (0.6 + 0.4 * Math.sin(x * 0.01));
    const ex = x + segmentW;
    const ey = baseY - amp * 0.2 * Math.sin(ex * 0.013);
    c.quadraticCurveTo(cx1, cy1, ex, ey);
  }
  c.lineTo(SW() + 100, baseY + amp + 200);
  c.lineTo(-100, baseY + amp + 200);
  c.closePath();
  c.fill();
}

/** Deterministic 0..1 hash (consistent across frames). */
function h01(seed: number): number {
  let n = (seed | 0) * 1103515245 + 12345;
  n = (n ^ (n >>> 16)) >>> 0;
  return (n & 0xffffff) / 0xffffff;
}

/** Persistent brick chimney drawn on top of production buildings. The
 *  loop already adds smoke particles when there's a job; this gives the
 *  smoke a believable origin. */
function drawChimney(
  c: CanvasRenderingContext2D,
  bx: number, by: number, bw: number, bh: number,
  buildingId: string,
): void {
  // Deterministic chimney offset so identical buildings don't all align
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) hash = (hash * 31 + buildingId.charCodeAt(i)) | 0;
  const offX = (Math.abs(hash) % 12) - 6;
  const cw = 7;
  const ch = 14;
  // Chimney sits a bit right of center, just above the roofline.
  // bh - ~24 is roughly where the roof apex tends to be in our 3-tile-tall sprites.
  const x = bx + bw * 0.72 + offX;
  const y = by + Math.max(2, bh * 0.18);
  // Brick body
  c.save();
  c.fillStyle = '#8a4a2a';
  c.fillRect(x, y, cw, ch);
  // Brick lines
  c.fillStyle = 'rgba(50, 25, 10, 0.45)';
  for (let py = y + 3; py < y + ch; py += 3) {
    c.fillRect(x, py, cw, 1);
  }
  // Vertical mortar
  c.fillStyle = 'rgba(50, 25, 10, 0.3)';
  c.fillRect(x + cw / 2 - 0.5, y, 1, ch);
  // Cap (lighter sandstone)
  c.fillStyle = '#b88060';
  c.fillRect(x - 1, y - 2, cw + 2, 3);
  // Top opening (dark)
  c.fillStyle = '#1a0e08';
  c.fillRect(x + 1, y - 1, cw - 2, 1.5);
  // Ember glow at the lip — only when active (i.e. inside this building's draw call
  // we already know it's a production building; caller adds smoke particles too).
  const ember = 0.6 + 0.4 * Math.sin(performance.now() / 300);
  c.fillStyle = `rgba(244, 100, 40, ${ember * 0.55})`;
  c.fillRect(x + 1, y - 1.5, cw - 2, 1);
  c.restore();
}

/** Soft white snow blanket overlay for winter — sits on top of buildings,
 *  decor, and trees. Drawn at world coordinates. */
function drawSnowCap(
  c: CanvasRenderingContext2D,
  bx: number, by: number, bw: number, bh: number,
): void {
  c.save();
  c.globalAlpha = 0.85;
  // Roof blanket — soft scalloped top
  const blanketH = Math.max(8, bh * 0.18);
  const grad = c.createLinearGradient(0, by, 0, by + blanketH);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, 'rgba(220, 230, 240, 0.85)');
  c.fillStyle = grad;
  c.beginPath();
  c.moveTo(bx + 2, by + blanketH);
  // Scalloped top edge — soft humps
  const steps = Math.max(4, Math.floor(bw / 14));
  for (let i = 0; i <= steps; i++) {
    const tx = bx + 2 + (i / steps) * (bw - 4);
    const dy = (i % 2 === 0 ? -3 : -1) + Math.sin(i * 1.3) * 1.2;
    c.lineTo(tx, by + dy);
  }
  c.lineTo(bx + bw - 2, by + blanketH);
  c.closePath();
  c.fill();
  // Scatter snow specks on the rest of the body — sparse
  c.globalAlpha = 0.6;
  c.fillStyle = '#ffffff';
  const seed = ((bx | 0) * 73 + (by | 0) * 19) >>> 0;
  for (let i = 0; i < 6; i++) {
    const r = (seed + i * 41) % 100 / 100;
    const r2 = (seed + i * 71) % 100 / 100;
    const sx = bx + 4 + r * (bw - 8);
    const sy = by + blanketH + 4 + r2 * (bh - blanketH - 12);
    c.fillRect(sx, sy, 2, 2);
  }
  c.restore();
}

/** Animated droplet badge above a wilting crop — "I'm thirsty". */
function drawDroopBadge(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  const bob = Math.sin(performance.now() / 400 + cx * 0.1) * 1.5;
  c.save();
  c.translate(cx, cy + bob);
  // Halo
  c.globalAlpha = 0.55;
  const halo = c.createRadialGradient(0, 0, 1, 0, 0, 10);
  halo.addColorStop(0, 'rgba(170, 215, 240, 0.7)');
  halo.addColorStop(1, 'rgba(170, 215, 240, 0)');
  c.fillStyle = halo;
  c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  // Droplet shape
  c.fillStyle = '#4a9fd2';
  c.beginPath();
  c.moveTo(0, -8);
  c.quadraticCurveTo(6, 0, 0, 6);
  c.quadraticCurveTo(-6, 0, 0, -8);
  c.closePath();
  c.fill();
  c.strokeStyle = '#1a4868';
  c.lineWidth = 1;
  c.stroke();
  // Highlight
  c.fillStyle = 'rgba(255, 255, 255, 0.6)';
  c.beginPath();
  c.ellipse(-1.5, -2, 1.5, 2.5, -0.4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Withered indicator: small dead leaf with a red cross — "you missed it". */
function drawWitheredBadge(c: CanvasRenderingContext2D, cx: number, cy: number): void {
  c.save();
  c.translate(cx, cy);
  // Halo (dim red)
  c.globalAlpha = 0.55;
  const halo = c.createRadialGradient(0, 0, 1, 0, 0, 11);
  halo.addColorStop(0, 'rgba(180, 60, 60, 0.55)');
  halo.addColorStop(1, 'rgba(180, 60, 60, 0)');
  c.fillStyle = halo;
  c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  // Dead leaf
  c.fillStyle = '#8a4020';
  c.beginPath();
  c.moveTo(0, -7);
  c.quadraticCurveTo(5, -2, 0, 5);
  c.quadraticCurveTo(-5, -2, 0, -7);
  c.fill();
  // Red cross
  c.strokeStyle = '#d22020';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-4, -4); c.lineTo(4, 4);
  c.moveTo(4, -4); c.lineTo(-4, 4);
  c.stroke();
  c.restore();
}

/** Generic "ready bubble" — a polished disc with a sprite or check mark.
 *  Used for production-ready, pen-produce-ready, tree-ready indicators. */
function drawReadyBubble(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
  sprite?: HTMLCanvasElement,
  count?: number,
  color: 'green' | 'gold' = 'green',
): void {
  const t = performance.now();
  const bob = Math.sin(t / 200) * 3;
  c.save();
  c.translate(cx, cy + bob);
  // Outer pulsing ring
  const pulse = 0.5 + 0.3 * Math.sin(t / 180);
  c.globalAlpha = pulse;
  c.strokeStyle = color === 'green' ? 'rgba(126, 200, 80, 0.85)' : 'rgba(244, 185, 66, 0.85)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 18 + Math.sin(t / 180) * 2, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
  // Disc
  const grad = c.createRadialGradient(-4, -5, 1, 0, 0, 14);
  if (color === 'green') {
    grad.addColorStop(0, '#c8f0a8');
    grad.addColorStop(0.7, '#7fb957');
    grad.addColorStop(1, '#3e6a2a');
  } else {
    grad.addColorStop(0, '#fff5c0');
    grad.addColorStop(0.7, '#f4b942');
    grad.addColorStop(1, '#94601a');
  }
  c.fillStyle = grad;
  c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.fill();
  c.strokeStyle = color === 'green' ? '#2e4f1c' : '#5a3d0c';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.stroke();
  // Sprite or check
  if (sprite) {
    c.drawImage(sprite, -10, -10, 20, 20);
  } else {
    c.strokeStyle = '#fff';
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-5, 0); c.lineTo(-1, 4); c.lineTo(5, -4);
    c.stroke();
  }
  // Count badge
  if (count !== undefined && count > 0) {
    c.fillStyle = '#fff';
    c.strokeStyle = color === 'green' ? '#2e4f1c' : '#5a3d0c';
    c.lineWidth = 1;
    c.beginPath(); c.arc(11, -10, 7, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = color === 'green' ? '#2e4f1c' : '#5a3d0c';
    c.font = 'bold 11px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(count), 11, -10);
    c.textAlign = 'start';
    c.textBaseline = 'alphabetic';
  }
  c.restore();
}

/** Animated "I'm hungry" indicator for pens — pulsing red bowl with rings */
function drawHungryBadge(
  c: CanvasRenderingContext2D,
  cx: number, cy: number,
): void {
  const t = performance.now();
  const bob = Math.sin(t / 250) * 2.5;
  c.save();
  c.translate(cx, cy + bob);
  // Pulsing red ring outward — urgency
  const ringT = (t / 800) % 1;
  c.globalAlpha = 1 - ringT;
  c.strokeStyle = '#d24a4a';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 8 + ringT * 14, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
  // Bowl disc
  const grad = c.createRadialGradient(-3, -4, 1, 0, 0, 12);
  grad.addColorStop(0, '#ffd0d0');
  grad.addColorStop(0.7, '#ef6a7c');
  grad.addColorStop(1, '#841623');
  c.fillStyle = grad;
  c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5a0e16';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0, 0, 12, 0, Math.PI * 2); c.stroke();
  // Empty-bowl glyph
  c.strokeStyle = '#fff5d6';
  c.lineWidth = 1.8;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(0, 1, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  c.stroke();
  // Steam wisps
  c.globalAlpha = 0.7;
  c.strokeStyle = 'rgba(255, 220, 220, 0.85)';
  c.lineWidth = 1.2;
  const w = (t / 400) % 1;
  c.beginPath();
  c.moveTo(-3, -6 - w * 4);
  c.quadraticCurveTo(0, -10 - w * 4, 3, -6 - w * 4);
  c.stroke();
  c.restore();
}

/** Draw warm-yellow lit windows on a building when it's night. The window
 *  pattern is deterministic per building so houses keep their identity. */
function drawLitWindows(
  c: CanvasRenderingContext2D,
  bx: number, by: number, bw: number, bh: number,
  buildingId: string,
  intensity: number,
): void {
  if (intensity <= 0) return;
  // Hash the building id into 2-4 window slots
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) hash = (hash * 31 + buildingId.charCodeAt(i)) | 0;
  const slots = 2 + (Math.abs(hash) % 3); // 2..4 windows
  const widthPx = bw * TILE;
  const heightPx = bh * TILE;
  // Place windows along an upper "wall band" roughly 35-60% down the body.
  const bandTop = by + heightPx * 0.40;
  const bandH = Math.min(14, heightPx * 0.16);
  for (let i = 0; i < slots; i++) {
    const seed = Math.abs(hash + i * 9973);
    const u = (seed % 1000) / 1000;
    const wW = 6 + (seed % 5);
    const wH = bandH;
    const margin = 6;
    const wx = bx + margin + u * (widthPx - wW - margin * 2);
    const wy = bandTop;
    // Subtle flicker, deterministic phase per window
    const phase = (seed % 100) / 100 * Math.PI * 2;
    const flicker = 0.85 + 0.15 * Math.sin(performance.now() / 700 + phase);
    const alpha = intensity * flicker;
    c.save();
    // Halo
    c.globalAlpha = alpha * 0.55;
    const halo = c.createRadialGradient(wx + wW / 2, wy + wH / 2, 1, wx + wW / 2, wy + wH / 2, 22);
    halo.addColorStop(0, 'rgba(255, 230, 130, 0.9)');
    halo.addColorStop(1, 'rgba(255, 230, 130, 0)');
    c.fillStyle = halo;
    c.fillRect(wx + wW / 2 - 22, wy + wH / 2 - 22, 44, 44);
    // Lit pane
    c.globalAlpha = alpha;
    const g = c.createLinearGradient(wx, wy, wx, wy + wH);
    g.addColorStop(0, '#fff5b0');
    g.addColorStop(1, '#f4b942');
    c.fillStyle = g;
    c.fillRect(wx, wy, wW, wH);
    // Window cross-frame
    c.globalAlpha = alpha * 0.6;
    c.fillStyle = '#4a2f08';
    c.fillRect(wx + wW / 2 - 0.5, wy, 1, wH);
    c.fillRect(wx, wy + wH / 2 - 0.5, wW, 1);
    c.restore();
  }
}

export function render(): void {
  ctx.save();
  ctx.scale(DPR, DPR);

  const dayElapsed = ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;
  const L = getLighting(dayElapsed);
  // Boolean shortcuts derived from continuous values — used only where a
  // single decision is needed (e.g. "is the parallax visible"), not for
  // any color choice.
  const dayWeight = 1 - L.nightTint * 2;         // ~1 day, ~0 deep night
  const nightWeight = L.nightTint * 2;            // inverse, clipped at 1
  const visibleDay = dayWeight > 0.25;
  const visibleNight = nightWeight > 0.15;

  // ===== Sky: smoothly interpolated lighting + optional weather wash =====
  const sky = ctx.createLinearGradient(0, 0, 0, SH());
  const ws = getWeatherSky(state.weather);
  const skyTop = ws ? lerpRGB(L.skyTop, ws.top, ws.blend) : L.skyTop;
  const skyBottom = ws ? lerpRGB(L.skyBottom, ws.bottom, ws.blend) : L.skyBottom;
  sky.addColorStop(0, rgbStr(skyTop));
  sky.addColorStop(1, rgbStr(skyBottom));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SW(), SH());

  // ===== Starfield (alpha follows L.stars continuously) ===================
  if (L.stars > 0.02) {
    const stars = 80;
    const t = performance.now() / 1000;
    ctx.save();
    for (let i = 0; i < stars; i++) {
      const sx = h01(i * 17 + 1) * SW();
      const sy = h01(i * 31 + 7) * SH() * 0.55;
      const flicker = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + h01(i) * 1.4) + i));
      const r = 0.7 + h01(i * 7) * 1.4;
      ctx.globalAlpha = flicker * 0.85 * L.stars;
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      if (r > 1.5 && flicker > 0.8) {
        ctx.globalAlpha = (flicker - 0.6) * 0.5 * L.stars;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - r * 2.5, sy); ctx.lineTo(sx + r * 2.5, sy);
        ctx.moveTo(sx, sy - r * 2.5); ctx.lineTo(sx, sy + r * 2.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ===== Distant parallax hills (alpha follows day weight) ================
  if (visibleDay && state.weather !== 'storm' && state.weather !== 'rainy') {
    const baseY = SH() * 0.55;
    const pX = state.camX * 0.06;
    const a = Math.min(0.6, dayWeight * 0.65);
    ctx.save();
    ctx.fillStyle = `rgba(170, 195, 175, ${a})`;
    drawHillsLayer(ctx, baseY - 20, 110, 60, pX * 0.4);
    ctx.fillStyle = `rgba(120, 165, 110, ${a})`;
    drawHillsLayer(ctx, baseY + 8, 140, 80, pX * 0.7);
    ctx.restore();
  }

  // Screen-space jiggle for celebrations
  const shake = tickShake(1 / 60);
  ctx.translate(SW() / 2 + shake.dx, SH() / 2 + shake.dy);
  ctx.scale(state.camScale, state.camScale);
  ctx.translate(-state.camX, -state.camY);

  // Tiles
  const isWater = (gx: number, gy: number): boolean => {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return false;
    return state.grid[gy]![gx]!.type === 'water';
  };

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]![gx]!;
      let s: HTMLCanvasElement;
      if (t.type === 'plowed') s = sprites.plowed;
      else if (t.type === 'soil') s = sprites.soil;
      else if (t.type === 'water') s = sprites.waterFrames[Math.floor(performance.now() / 250) % 4]!;
      else if (t.type === 'path') s = sprites.path;
      else s = sprites.grass;
      ctx.drawImage(s, gx * TILE, gy * TILE);

      // Sandy shore on grass tiles that border the lake. Drawn before any
      // other tile content so crops/buildings sit on top cleanly.
      if (t.type === 'grass') {
        const N = isWater(gx, gy - 1);
        const S = isWater(gx, gy + 1);
        const W = isWater(gx - 1, gy);
        const E = isWater(gx + 1, gy);
        if (N || S || E || W) {
          const px = gx * TILE;
          const py = gy * TILE;
          ctx.fillStyle = '#e8d7ac';
          if (N) ctx.fillRect(px, py, TILE, 7);
          if (S) ctx.fillRect(px, py + TILE - 7, TILE, 7);
          if (W) ctx.fillRect(px, py, 7, TILE);
          if (E) ctx.fillRect(px + TILE - 7, py, 7, TILE);
          ctx.fillStyle = 'rgba(180,160,120,0.45)';
          if (N) ctx.fillRect(px, py + 6, TILE, 1);
          if (S) ctx.fillRect(px, py + TILE - 7, TILE, 1);
          if (W) ctx.fillRect(px + 6, py, 1, TILE);
          if (E) ctx.fillRect(px + TILE - 7, py, 1, TILE);
        }
      }

      // Lily pads scattered across the lake — deterministic per tile.
      if (t.type === 'water') {
        const hash = (gx * 73856093 ^ gy * 19349663) >>> 0;
        if (hash % 6 === 0) {
          const cx = gx * TILE + TILE / 2 + ((hash >> 8) % 18) - 9;
          const cy = gy * TILE + TILE / 2 + ((hash >> 16) % 18) - 9;
          ctx.fillStyle = '#3a7a30';
          ctx.beginPath(); ctx.ellipse(cx, cy, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.beginPath(); ctx.ellipse(cx, cy + 1, 11, 7, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
          if (hash % 24 === 0) {
            ctx.fillStyle = '#ff9ed4';
            ctx.beginPath(); ctx.arc(cx + 3, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe070';
            ctx.fillRect(cx + 2, cy - 3, 2, 2);
          }
        }
      }

      if (state.season === 'winter' && (t.type === 'grass' || t.type === 'soil')) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#fff';
        ctx.fillRect(gx * TILE, gy * TILE, TILE, TILE);
        ctx.restore();
      }

      if (t.crop) {
        const stage = cropStage(t);
        if (stage >= 0) {
          const withered = isWithered(t);
          const wilting = !withered && isWilting(t);
          ctx.save();
          if (withered) {
            // Withered: alpha low, slumped to one side, desaturated by tinted overlay
            ctx.globalAlpha = 0.45;
            ctx.translate(gx * TILE + TILE / 2, gy * TILE + TILE / 2);
            ctx.rotate(0.18);
            ctx.drawImage(sprites.crops[t.crop]![stage]!, -TILE / 2, -TILE / 2);
          } else if (wilting) {
            // Wilting: slow droop + minor sag, slightly dim
            ctx.globalAlpha = 0.78;
            const droop = 0.08 + 0.04 * Math.sin(performance.now() / 800 + gx + gy);
            ctx.translate(gx * TILE + TILE / 2, gy * TILE + TILE - 6);
            ctx.rotate(droop);
            ctx.drawImage(sprites.crops[t.crop]![stage]!, -TILE / 2, -TILE + 6);
          } else {
            let bobY = 0;
            if (stage === 3) {
              bobY = Math.sin(performance.now() / 300 + gx * 0.5 + gy * 0.7) * 1.5;
            }
            ctx.drawImage(sprites.crops[t.crop]![stage]!, gx * TILE, gy * TILE + bobY);
          }
          ctx.restore();

          if (stage === 3 && !withered && !wilting) {
            ctx.save();
            ctx.globalAlpha = 0.4 + 0.2 * Math.sin(performance.now() / 200);
            ctx.shadowColor = '#ffe070';
            ctx.shadowBlur = 8;
            ctx.drawImage(sprites.crops[t.crop]![stage]!, gx * TILE, gy * TILE);
            ctx.restore();
          }

          if (wilting) {
            // Redesigned thirst indicator: animated water droplet badge above crop
            drawDroopBadge(ctx, gx * TILE + TILE / 2, gy * TILE - 2);
          } else if (withered) {
            // Redesigned withered indicator: red X / dead leaf
            drawWitheredBadge(ctx, gx * TILE + TILE / 2, gy * TILE - 2);
          }
        }
      }
    }
  }

  // Placement preview
  if (state.placing) {
    const w = screenToWorld(mousePos.x, mousePos.y);
    const gx = Math.floor(w.x / TILE);
    const gy = Math.floor(w.y / TILE);
    if (state.placing.decor) {
      const def = DECORATIONS[state.placing.type!]!;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.decor[state.placing.type!]!, gx * TILE, gy * TILE);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#4ad84a';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, def.w * TILE - 4, def.h * TILE - 4);
      ctx.restore();
    } else if (state.placing.tree) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.orchard[state.placing.tree]![0]!, gx * TILE, gy * TILE);
      ctx.globalAlpha = 1;
      const tile = state.grid[gy] && state.grid[gy]![gx];
      const okSoil = !!tile && (tile.type === 'plowed' || tile.type === 'soil');
      ctx.strokeStyle = okSoil ? '#4ad84a' : '#e84040';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, TILE - 4, TILE - 4);
      ctx.restore();
    } else if (state.placing.type) {
      const def = BUILDINGS[state.placing.type]!;
      const canPlace = canPlaceBuilding(state.placing.type, gx, gy);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(sprites.building[state.placing.type]!, gx * TILE, gy * TILE);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = canPlace ? '#4ad84a' : '#e84040';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx * TILE + 2, gy * TILE + 2, def.w * TILE - 4, def.h * TILE - 4);
      ctx.restore();
    }
  }

  // Depth-sorted drawables
  const drawables: Drawable[] = [];
  for (const b of state.buildings) {
    drawables.push({ y: (b.y + BUILDINGS[b.type]!.h) * TILE, kind: 'building', data: b });
  }
  for (const d of state.decor) {
    drawables.push({ y: (d.y + DECORATIONS[d.type]!.h) * TILE, kind: 'decor', data: d });
  }
  for (const tr of state.trees) {
    drawables.push({ y: (tr.y + 1) * TILE, kind: 'tree', data: tr });
  }
  for (const c of state.crows) {
    drawables.push({ y: c.y + 16, kind: 'crow', data: c });
  }
  if (state.dog) {
    drawables.push({ y: state.dog.y + 20, kind: 'dog', data: state.dog });
  }
  for (const a of getAmbientCreatures()) {
    // Render airborne creatures high up, leaves lower
    const ySort = a.kind === 'bird' ? a.y + 100 : a.y;
    drawables.push({ y: ySort, kind: 'ambient', data: a });
  }
  drawables.sort((a, b) => a.y - b.y);

  // Shadow & window lighting come from the continuous lighting profile.
  // Weather softens shadows a little extra.
  const weatherShadowMul =
    state.weather === 'storm' ? 0.6 :
    state.weather === 'rainy' ? 0.7 :
    state.weather === 'snowy' ? 0.8 :
    state.weather === 'cloudy' ? 0.85 : 1;
  const shadowAlpha = L.shadow * weatherShadowMul;
  // Storms light the windows a bit even mid-day.
  const stormWindowBoost = state.weather === 'storm' ? 0.35 : 0;
  const nightLight = Math.min(1, Math.max(L.windows, stormWindowBoost));

  for (const d of drawables) {
    if (d.kind === 'building') {
      const b = d.data as typeof state.buildings[number];
      const def = BUILDINGS[b.type]!;
      // Drop shadow first (under the building footprint)
      const bw = def.w * TILE;
      const bh = def.h * TILE;
      drawShadow(
        ctx,
        b.x * TILE + bw / 2,
        b.y * TILE + bh - 6,
        bw * 0.46, bh * 0.18,
        shadowAlpha,
      );
      ctx.drawImage(sprites.building[b.type]!, b.x * TILE, b.y * TILE);
      // Chimney on production buildings — gives the smoke a believable origin
      if (def.kind === 'production') {
        drawChimney(ctx, b.x * TILE, b.y * TILE, bw, bh, b.id);
      }
      // Winter snow cap on the roof of pens & production buildings
      if (state.season === 'winter' && (def.kind === 'pen' || def.kind === 'production')) {
        drawSnowCap(ctx, b.x * TILE, b.y * TILE, bw, bh);
      }
      // Warm lit windows at night for buildings with walls (pen + production)
      if ((def.kind === 'pen' || def.kind === 'production') && nightLight > 0) {
        drawLitWindows(ctx, b.x * TILE, b.y * TILE, def.w, def.h, b.id, nightLight);
      }
      if (def.kind === 'pen' && state.penAnimals[b.id]) {
        for (const a of state.penAnimals[b.id]!) {
          const fr = a.frame || 0;
          // Tiny shadow under each animal
          drawShadow(
            ctx,
            b.x * TILE + a.ax,
            b.y * TILE + a.ay + 4,
            18, 6,
            shadowAlpha * 0.85,
          );
          ctx.drawImage(
            sprites.animal[def.animal!]![fr]!,
            b.x * TILE + a.ax - 32,
            b.y * TILE + a.ay - 32,
          );
        }
        const aniDef = ANIMALS[def.animal!]!;
        const hungry = penFeedLevel(b.id) < 20;
        let readyN = 0;
        for (const a of state.penAnimals[b.id]!) {
          if (!hungry && nowSeconds() - a.lastProduced >= aniDef.produceTime) readyN++;
        }
        if (readyN > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 20;
          drawReadyBubble(ctx, cx, cy, sprites.item[aniDef.produces]!, readyN, 'gold');
        }
        if (hungry && state.penAnimals[b.id]!.length > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 18;
          drawHungryBadge(ctx, cx, cy);
        }
      }
      if (def.kind === 'production' && state.prodQueues[b.id]) {
        const q = state.prodQueues[b.id]!;
        let readyN = 0;
        for (const job of q) if (job.doneAt <= nowSeconds()) readyN++;
        if (readyN > 0) {
          const cx = b.x * TILE + def.w * TILE / 2;
          const cy = b.y * TILE - 18;
          drawReadyBubble(ctx, cx, cy, undefined, readyN, 'green');
        }
      }
      if (def.kind === 'fishing') {
        const cx = b.x * TILE + def.w * TILE / 2;
        const cy = b.y * TILE - 4 + Math.sin(performance.now() / 300) * 3;
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() / 300);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🎣', cx - 12, cy - 10);
        ctx.restore();
      }
    } else if (d.kind === 'decor') {
      const dec = d.data as typeof state.decor[number];
      const ddef = DECORATIONS[dec.type]!;
      drawShadow(
        ctx,
        dec.x * TILE + ddef.w * TILE / 2,
        dec.y * TILE + ddef.h * TILE - 6,
        ddef.w * TILE * 0.4, ddef.h * TILE * 0.14,
        shadowAlpha * 0.85,
      );
      ctx.drawImage(sprites.decor[dec.type]!, dec.x * TILE, dec.y * TILE);
      if (state.season === 'winter') {
        drawSnowCap(ctx, dec.x * TILE, dec.y * TILE, ddef.w * TILE, ddef.h * TILE);
      }
      if (dec.type === 'pinwheel') {
        const cx = dec.x * TILE + TILE / 2;
        const cy = dec.y * TILE + TILE / 2 - 6;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(performance.now() / 300);
        ctx.fillStyle = '#ff80c0';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -2); ctx.lineTo(0, -10); ctx.fill();
        ctx.fillStyle = '#80c0ff';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, 10); ctx.lineTo(10, 2); ctx.fill();
        ctx.fillStyle = '#ffe080';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 2); ctx.lineTo(0, 10); ctx.fill();
        ctx.fillStyle = '#80e080';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, -10); ctx.lineTo(-10, -2); ctx.fill();
        ctx.restore();
      }
    } else if (d.kind === 'tree') {
      const tr = d.data as typeof state.trees[number];
      const stage = getTreeStage(tr);
      // Tree shadow grows with stage
      const shR = 14 + stage * 6;
      drawShadow(
        ctx,
        tr.x * TILE + TILE / 2,
        tr.y * TILE + TILE - 4,
        shR, shR * 0.35,
        shadowAlpha * 0.9,
      );
      ctx.drawImage(sprites.orchard[tr.type]![stage]!, tr.x * TILE, tr.y * TILE);
      // Snow on mature tree canopies in winter
      if (state.season === 'winter' && stage >= 1) {
        drawSnowCap(ctx, tr.x * TILE, tr.y * TILE, TILE, TILE);
      }
      // unused but kept for parity:
      void ORCHARDS;
      if (stage === 3) {
        const cx = tr.x * TILE + TILE / 2;
        const cy = tr.y * TILE - 14;
        // Fruit-ready bubble shows the fruit icon
        const fruitSprite = sprites.item[ORCHARDS[tr.type]!.fruit];
        drawReadyBubble(ctx, cx, cy, fruitSprite, undefined, 'green');
      }
    } else if (d.kind === 'crow') {
      const c = d.data as typeof state.crows[number];
      drawShadow(ctx, c.x, c.y + 14, 14, 4, shadowAlpha * 0.8);
      ctx.drawImage(sprites.crow[c.frame]!, c.x - 16, c.y - 16);
      if (!c.scared) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(performance.now() / 180);
        ctx.strokeStyle = '#ff8040';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(c.x, c.y, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    } else if (d.kind === 'dog') {
      const g = d.data as NonNullable<typeof state.dog>;
      drawShadow(ctx, g.x, g.y + 12, 22, 7, shadowAlpha * 0.9);
      ctx.drawImage(sprites.dog[g.frame]!, g.x - 24, g.y - 20);
    } else if (d.kind === 'ambient') {
      const a = d.data as ReturnType<typeof getAmbientCreatures>[number];
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.translate(a.x, a.y);
      if (a.rotation) ctx.rotate(a.rotation);
      
      if (a.kind === 'butterfly') {
        const flutter = Math.sin(a.phase * 4);
        ctx.fillStyle = a.color;
        // wings
        ctx.beginPath(); ctx.ellipse(-2, 0, a.size, a.size * (0.3 + 0.7 * Math.abs(flutter)), 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(2, 0, a.size, a.size * (0.3 + 0.7 * Math.abs(flutter)), -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.fillRect(-0.5, -2, 1, 4); // body
      } else if (a.kind === 'firefly') {
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(0, 0, a.size, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = a.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 0, a.size * 0.5, 0, Math.PI * 2); ctx.fill();
      } else if (a.kind === 'bird') {
        const flap = Math.sin(a.phase * 6);
        ctx.fillStyle = a.color;
        // Body
        ctx.beginPath(); ctx.ellipse(0, 0, a.size, a.size * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        // Wings
        ctx.beginPath();
        if (flap > 0) {
          ctx.moveTo(-2, -1); ctx.quadraticCurveTo(0, -a.size * 2, 3, -2);
        } else {
          ctx.moveTo(-2, 1); ctx.quadraticCurveTo(0, a.size * 2, 3, 2);
        }
        ctx.stroke();
      } else if (a.kind === 'leaf') {
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.moveTo(-a.size, 0);
        ctx.quadraticCurveTo(0, -a.size, a.size, 0);
        ctx.quadraticCurveTo(0, a.size, -a.size, 0);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Harvest pops (drawn in world space, above tiles and entities)
  tickPops(1 / 60);
  drawPops(ctx);

  // Particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = clamp(1 - p.age / p.life, 0, 1);
    if (p.isRain) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.03, p.y + p.vy * 0.03);
      ctx.stroke();
    } else if (p.isSnow) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  // Floats
  for (const f of state.floats) {
    ctx.save();
    ctx.globalAlpha = clamp(1 - f.age / f.life, 0, 1);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x - ctx.measureText(f.text).width / 2 + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x - ctx.measureText(f.text).width / 2, f.y);
    ctx.restore();
  }

  // Treasure chests
  if (state.treasures) {
    for (const ch of state.treasures.chests) {
      const cx = ch.gx * TILE + TILE / 2;
      const cy = ch.gy * TILE + TILE / 2;
      const bob = Math.sin(performance.now() / 240 + ch.gx + ch.gy) * 2;
      ctx.save();
      ctx.translate(cx, cy + bob);
      // Aura
      const grad = ctx.createRadialGradient(0, 0, 6, 0, 0, 26);
      grad.addColorStop(0, ch.rare ? 'rgba(200, 120, 255, 0.5)' : 'rgba(255, 220, 100, 0.4)');
      grad.addColorStop(1, 'rgba(255, 220, 100, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 4, 26, 0, Math.PI * 2);
      ctx.fill();
      // Chest body
      const w = 22, h = 16;
      ctx.fillStyle = ch.rare ? '#9038c0' : '#a06028';
      ctx.fillRect(-w / 2, -h / 4, w, h);
      ctx.fillStyle = ch.rare ? '#c890ff' : '#d8a060';
      ctx.fillRect(-w / 2, -h / 4, w, 4);
      ctx.fillStyle = '#ffd040';
      ctx.fillRect(-2, -h / 4 + 4, 4, 6);
      ctx.fillRect(-w / 2, 1, w, 1);
      // Sparkle
      const sparkle = Math.sin(performance.now() / 200) > 0.5;
      if (sparkle) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(w / 2 - 5, -h / 4 - 4, 2, 2);
        ctx.fillRect(-w / 2 + 3, -h / 4 - 6, 1.5, 1.5);
      }
      ctx.restore();
    }
  }

  // Goal beacon — soft glow over the recommended next action target
  const beacon = currentBeacon();
  if (beacon) {
    ctx.save();
    const t = performance.now() / 700;
    const pulse = 0.45 + 0.25 * Math.sin(t);
    ctx.globalAlpha = pulse;
    const grad = ctx.createRadialGradient(beacon.x, beacon.y, 4, beacon.x, beacon.y, beacon.radius + 14);
    grad.addColorStop(0, 'rgba(255, 240, 140, 0.7)');
    grad.addColorStop(1, 'rgba(255, 220, 120, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, beacon.radius + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#f4c542';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(beacon.x, beacon.y, beacon.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Grid overlay (placement only)
  if (state.placing) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= GRID_W; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * TILE, 0);
      ctx.lineTo(gx * TILE, GRID_H * TILE);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * TILE);
      ctx.lineTo(GRID_W * TILE, gy * TILE);
      ctx.stroke();
    }
    ctx.restore();
  }

  // World border
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(-3, -3, GRID_W * TILE + 6, GRID_H * TILE + 6);
  ctx.restore();

  // Background decoration trees
  drawDecor();

  ctx.restore();

  // Full-screen celebration flash
  const flash = tickFlash(1 / 60);
  if (flash) {
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = flash.intensity * (1 - flash.age / flash.duration);
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, SW(), SH());
    ctx.restore();
  }

  // Screen-space flyers + ripples (in CSS px, after world transform restored)
  tickFlyers(1 / 60);
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawFlyers(ctx);
  ctx.restore();

  // Screen-space atmospheric overlay
  ctx.save();
  ctx.scale(DPR, DPR);

  // Sun: opacity follows L.sun (already smooth through the day cycle).
  // Position arcs across the day half (0.18..0.82).
  const sunWeatherMul =
    state.weather === 'storm' || state.weather === 'rainy' ? 0 :
    state.weather === 'snowy' ? 0.35 :
    state.weather === 'cloudy' ? 0.55 : 1;
  const sunAlpha = L.sun * sunWeatherMul;
  if (sunAlpha > 0.02) {
    const tDay = Math.max(0, Math.min(1, (dayElapsed - 0.18) / 0.64));
    const sx = 80 + tDay * (SW() - 160);
    const arc = Math.sin(tDay * Math.PI);
    const sy = SH() * 0.18 - arc * SH() * 0.05;
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    const halo = ctx.createRadialGradient(sx, sy, 6, sx, sy, 110);
    halo.addColorStop(0, 'rgba(255, 245, 200, 0.5)');
    halo.addColorStop(1, 'rgba(255, 245, 200, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, 110, 0, Math.PI * 2); ctx.fill();
    const disk = ctx.createRadialGradient(sx - 8, sy - 6, 4, sx, sy, 24);
    disk.addColorStop(0, '#fff8d0');
    disk.addColorStop(1, '#ffd47a');
    ctx.fillStyle = disk;
    ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Cloud shadows during day (alpha follows day light, fades into night).
  const cloudShadowAlpha = (sunAlpha * 0.06) + (state.weather === 'cloudy' ? 0.05 : 0);
  if (cloudShadowAlpha > 0.01) {
    const cloudT = performance.now() / 1000;
    ctx.save();
    ctx.globalAlpha = cloudShadowAlpha;
    ctx.fillStyle = '#1a1408';
    for (let i = 0; i < 3; i++) {
      const speed = 14 + i * 5;
      const span = SW() + 600;
      const cx = ((cloudT * speed + i * 800) % span) - 300;
      const cy = SH() * (0.35 + i * 0.18);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 180 + i * 40, 56 + i * 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Cool night tint — continuous fade-in/out via L.nightTint
  if (L.nightTint > 0.01) {
    ctx.fillStyle = `rgba(20,30,60,${L.nightTint * 0.9})`;
    ctx.fillRect(0, 0, SW(), SH());
  }
  // Warm sunrise/sunset wash — continuous fade-in/out via L.warmTint
  if (L.warmTint > 0.01) {
    const warm = ctx.createLinearGradient(0, 0, 0, SH());
    warm.addColorStop(0, `rgba(255, 160, 90, ${L.warmTint * 0.55})`);
    warm.addColorStop(1, `rgba(255, 200, 130, ${L.warmTint * 0.2})`);
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, SW(), SH());
  }

  // Moon: opacity follows L.moon. Position arcs across the night half.
  const moonAlpha = L.moon;
  if (moonAlpha > 0.02) {
    // Night spans 0.82 (sun setting) → 1.18 (dawn break) wrapped.
    // Move moon across 0.82..1.18 mapped to 0..1.
    let mt = dayElapsed;
    if (mt < 0.5) mt += 1;
    const mT = Math.max(0, Math.min(1, (mt - 0.82) / 0.36));
    const mx = SW() - 80 - mT * (SW() - 160);
    const arc = Math.sin(mT * Math.PI);
    const my = SH() * 0.16 - arc * SH() * 0.05;
    ctx.save();
    ctx.globalAlpha = moonAlpha;
    const mhalo = ctx.createRadialGradient(mx, my, 4, mx, my, 90);
    mhalo.addColorStop(0, 'rgba(255, 250, 220, 0.45)');
    mhalo.addColorStop(1, 'rgba(255, 250, 220, 0)');
    ctx.fillStyle = mhalo;
    ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,220,0.92)';
    ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180, 170, 140, 0.25)';
    ctx.beginPath(); ctx.arc(mx - 6, my - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 8, my + 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 2, my + 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const seasonTint = SEASON_INFO[state.season].ambient;
  if (seasonTint !== 'rgba(255,220,180,0.0)' && seasonTint !== 'rgba(255,230,160,0.0)') {
    ctx.fillStyle = seasonTint;
    ctx.fillRect(0, 0, SW(), SH());
  }
  if (state.weather === 'storm') {
    ctx.fillStyle = 'rgba(40,50,80,0.25)';
    ctx.fillRect(0, 0, SW(), SH());
  } else if (state.weather === 'rainy') {
    ctx.fillStyle = 'rgba(100,120,140,0.12)';
    ctx.fillRect(0, 0, SW(), SH());
  }
  ctx.restore();

  // unused, kept for now to avoid lint warnings (these helpers will be
  // useful later for ambient creature behavior tied to time-of-day):
  void visibleNight;
}
