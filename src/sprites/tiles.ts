import { makeCanvas } from '../canvas';
import { TILE } from '../constants';

// --- Utility helpers for painterly rendering ---

function softCircle(
  g: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  color: string, alpha = 1,
): void {
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.restore();
}

function seededRand(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s & 0x7fffffff) / 2147483647;
  };
}

// =============================================================
//  GRASS — lush, soft meadow with wildflowers
// =============================================================
export function spriteGrassTile(): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;

  // Base gradient: warm green center, slightly darker edges
  const base = g.createRadialGradient(TILE / 2, TILE / 2, 4, TILE / 2, TILE / 2, TILE * 0.75);
  base.addColorStop(0, '#7ed860');
  base.addColorStop(0.5, '#6cc848');
  base.addColorStop(1, '#52a838');
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);

  // Soft color variation washes
  const rng = seededRand(42);
  for (let i = 0; i < 12; i++) {
    const wx = rng() * TILE;
    const wy = rng() * TILE;
    const wr = 8 + rng() * 14;
    const shade = rng() > 0.5 ? '#88e868' : '#4a9a30';
    softCircle(g, wx, wy, wr, shade, 0.15 + rng() * 0.12);
  }

  // Grass tufts: small bezier strokes in varied greens
  const tuffColors = ['#4a9a30', '#5cb840', '#7ad860', '#3a8a20'];
  for (let i = 0; i < 18; i++) {
    const bx = rng() * TILE;
    const by = rng() * TILE;
    const h = 3 + rng() * 5;
    g.save();
    g.globalAlpha = 0.5 + rng() * 0.35;
    g.strokeStyle = tuffColors[Math.floor(rng() * tuffColors.length)]!;
    g.lineWidth = 1 + rng() * 0.8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(bx + (rng() - 0.5) * 4, by - h, bx + (rng() - 0.5) * 2, by - h - 1);
    g.stroke();
    g.restore();
  }

  // Wildflowers: soft pastel circles with yellow centers
  const flowerColors = ['#ff9ed4', '#ffd070', '#a8d0ff', '#ffa0a0', '#c8a0ff'];
  for (let i = 0; i < 3; i++) {
    if (rng() < 0.55) {
      const fx = 6 + rng() * (TILE - 12);
      const fy = 6 + rng() * (TILE - 12);
      const fc = flowerColors[Math.floor(rng() * flowerColors.length)]!;
      // Petals
      g.save();
      g.globalAlpha = 0.75;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        softCircle(g, fx + Math.cos(a) * 2.5, fy + Math.sin(a) * 2.5, 2, fc, 0.7);
      }
      // Center
      softCircle(g, fx, fy, 1.5, '#ffe040', 0.9);
      g.restore();
    }
  }

  // Dew drops: tiny bright highlight dots
  for (let i = 0; i < 4; i++) {
    if (rng() < 0.5) {
      softCircle(g, rng() * TILE, rng() * TILE, 0.8, '#ffffff', 0.35 + rng() * 0.2);
    }
  }

  return c;
}

// =============================================================
//  SOIL — rich earth with organic texture
// =============================================================
export function spriteSoilTile(plowed: boolean): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;

  // Base warm brown gradient
  const base = g.createLinearGradient(0, 0, TILE, TILE);
  base.addColorStop(0, '#8a6238');
  base.addColorStop(0.5, '#7a5428');
  base.addColorStop(1, '#6a4420');
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);

  // Organic texture: overlapping translucent circles
  const rng = seededRand(plowed ? 137 : 99);
  for (let i = 0; i < 16; i++) {
    const sx = rng() * TILE;
    const sy = rng() * TILE;
    const sr = 4 + rng() * 10;
    const shade = rng() > 0.5 ? '#9a7248' : '#5a3a18';
    softCircle(g, sx, sy, sr, shade, 0.1 + rng() * 0.1);
  }

  // Pebbles: small scattered stones
  for (let i = 0; i < 5; i++) {
    const px = rng() * TILE;
    const py = rng() * TILE;
    const pr = 1 + rng() * 2;
    const pg = g.createRadialGradient(px - 0.5, py - 0.5, 0, px, py, pr);
    pg.addColorStop(0, '#a09080');
    pg.addColorStop(1, '#70604a');
    g.save();
    g.globalAlpha = 0.5;
    g.beginPath();
    g.ellipse(px, py, pr, pr * 0.7, rng() * Math.PI, 0, Math.PI * 2);
    g.fillStyle = pg;
    g.fill();
    g.restore();
  }

  if (plowed) {
    // Furrow rows: soft curved lines with shadow/highlight
    for (let row = 8; row < TILE; row += 10) {
      // Shadow beneath furrow
      g.save();
      g.globalAlpha = 0.35;
      g.strokeStyle = '#3a2210';
      g.lineWidth = 2.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, row + 1.5);
      g.quadraticCurveTo(TILE / 2, row + 2.5, TILE, row + 1);
      g.stroke();
      g.restore();

      // Furrow ridge highlight
      g.save();
      g.globalAlpha = 0.3;
      g.strokeStyle = '#b08858';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, row - 0.5);
      g.quadraticCurveTo(TILE / 2, row + 0.5, TILE, row - 1);
      g.stroke();
      g.restore();

      // Moisture in furrow
      g.save();
      g.globalAlpha = 0.12;
      g.fillStyle = '#3a2210';
      g.fillRect(0, row, TILE, 4);
      g.restore();
    }
  }

  return c;
}

// =============================================================
//  PATH — cozy cobblestone with grass between stones
// =============================================================
export function spritePathTile(): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;

  // Base warm sandy color
  const base = g.createLinearGradient(0, 0, 0, TILE);
  base.addColorStop(0, '#d8c498');
  base.addColorStop(1, '#c0a878');
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);

  // Cobblestones: rounded shapes in warm stone tones
  const rng = seededRand(777);
  const stoneColors = ['#c8b890', '#b8a078', '#d0c0a0', '#a89868', '#c0b088'];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const ox = col * 16 + (row % 2) * 8 + rng() * 4 - 2;
      const oy = row * 13 + rng() * 3 - 1;
      const sw = 10 + rng() * 5;
      const sh = 8 + rng() * 4;
      const sc = stoneColors[Math.floor(rng() * stoneColors.length)]!;

      // Stone shadow
      g.save();
      g.globalAlpha = 0.2;
      g.beginPath();
      g.ellipse(ox + sw / 2, oy + sh / 2 + 1.5, sw / 2, sh / 2, 0, 0, Math.PI * 2);
      g.fillStyle = '#5a4a30';
      g.fill();
      g.restore();

      // Stone body with gradient
      const sg = g.createRadialGradient(
        ox + sw / 2 - 2, oy + sh / 2 - 2, 1,
        ox + sw / 2, oy + sh / 2, Math.max(sw, sh) / 2,
      );
      sg.addColorStop(0, '#e0d0b8');
      sg.addColorStop(0.6, sc);
      sg.addColorStop(1, '#8a7a60');
      g.beginPath();
      g.ellipse(ox + sw / 2, oy + sh / 2, sw / 2, sh / 2, rng() * 0.3, 0, Math.PI * 2);
      g.fillStyle = sg;
      g.fill();
    }
  }

  // Tiny grass sprigs between stones
  for (let i = 0; i < 6; i++) {
    const gx = rng() * TILE;
    const gy = rng() * TILE;
    g.save();
    g.globalAlpha = 0.5;
    g.strokeStyle = '#5aa838';
    g.lineWidth = 0.8;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(gx, gy);
    g.quadraticCurveTo(gx + (rng() - 0.5) * 3, gy - 3, gx + (rng() - 0.5) * 2, gy - 4);
    g.stroke();
    g.restore();
  }

  return c;
}

// =============================================================
//  WATER — serene deep water with shimmer (single frame)
// =============================================================
export function spriteWaterTile(): HTMLCanvasElement {
  return buildWaterFrame(0);
}

function buildWaterFrame(frameOffset: number): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;

  // Deep water gradient
  const base = g.createRadialGradient(TILE / 2, TILE / 2, 2, TILE / 2, TILE / 2, TILE * 0.8);
  base.addColorStop(0, '#5ab0d8');
  base.addColorStop(0.4, '#3a90c0');
  base.addColorStop(1, '#2870a0');
  g.fillStyle = base;
  g.fillRect(0, 0, TILE, TILE);

  // Subtle depth variation
  const rng = seededRand(333 + frameOffset * 17);
  for (let i = 0; i < 8; i++) {
    const wx = rng() * TILE;
    const wy = rng() * TILE;
    softCircle(g, wx, wy, 8 + rng() * 12, '#2060a0', 0.08 + rng() * 0.06);
  }

  // Ripple patterns: concentric ellipses displaced by frame
  for (let i = 0; i < 4; i++) {
    const rx = 10 + rng() * (TILE - 20);
    const ry = 10 + rng() * (TILE - 20);
    const phase = frameOffset * Math.PI / 2 + i * 1.5;
    const rSize = 6 + Math.sin(phase) * 3;
    g.save();
    g.globalAlpha = 0.15 + 0.08 * Math.sin(phase);
    g.strokeStyle = '#a0d8f0';
    g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(rx, ry, rSize, rSize * 0.4, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  // Caustic light: soft bright spots
  for (let i = 0; i < 5; i++) {
    const cx = rng() * TILE;
    const cy = rng() * TILE;
    const cr = 2 + rng() * 4;
    const cphase = frameOffset * 0.8 + i;
    const calpha = 0.08 + 0.06 * Math.sin(cphase);
    softCircle(g, cx + Math.sin(cphase) * 2, cy, cr, '#b0e8ff', calpha);
  }

  // Specular shimmer streaks
  for (let i = 0; i < 3; i++) {
    const sx = rng() * TILE;
    const sy = rng() * (TILE - 4);
    const slen = 5 + rng() * 10;
    g.save();
    g.globalAlpha = 0.2 + rng() * 0.15;
    g.strokeStyle = '#d0f0ff';
    g.lineWidth = 1;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + slen, sy + 0.5);
    g.stroke();
    g.restore();
  }

  return c;
}

// 4-frame animated water for smooth ripple cycling
export function spriteWaterFrames(): HTMLCanvasElement[] {
  return [buildWaterFrame(0), buildWaterFrame(1), buildWaterFrame(2), buildWaterFrame(3)];
}
