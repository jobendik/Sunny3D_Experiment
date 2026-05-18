import { makeCanvas } from '../canvas';
import { TILE } from '../constants';
import { clamp, choice, randi } from '../utils';

export function spriteGrassTile(): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = (Math.sin(x * 0.32) + Math.cos(y * 0.41) + Math.sin((x + y) * 0.18)) * 0.5;
      const r = 110 + Math.floor(n * 8 + (x * y * 0.005) % 6);
      const gr = 175 + Math.floor(n * 14 + (Math.sin(x * 0.9 + y) * 6));
      const b = 70 + Math.floor(n * 6);
      g.fillStyle = `rgb(${clamp(r, 80, 170)},${clamp(gr, 150, 220)},${clamp(b, 40, 110)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = randi(TILE - 2);
    const y = randi(TILE - 2);
    g.fillStyle = 'rgba(60,120,40,0.6)';
    g.fillRect(x, y, 1, 2);
    g.fillStyle = 'rgba(180,220,120,0.5)';
    g.fillRect(x, y - 1, 1, 1);
  }
  for (let i = 0; i < 2; i++) {
    if (Math.random() < 0.55) {
      const x = 4 + randi(TILE - 8);
      const y = 4 + randi(TILE - 8);
      const col = choice(['#ffe066', '#ffffff', '#f59ec5']);
      g.fillStyle = col;
      g.fillRect(x, y, 2, 2);
      g.fillStyle = '#3a8030';
      g.fillRect(x + 1, y + 2, 1, 1);
    }
  }
  return c;
}

export function spriteSoilTile(plowed: boolean): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = (Math.sin(x * 0.21) + Math.cos(y * 0.33)) * 0.5;
      const r = 130 + Math.floor(n * 10);
      const gr = 85 + Math.floor(n * 8);
      const b = 45 + Math.floor(n * 5);
      g.fillStyle = `rgb(${clamp(r, 90, 170)},${clamp(gr, 60, 120)},${clamp(b, 25, 80)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  if (plowed) {
    g.fillStyle = 'rgba(50,30,15,0.5)';
    for (let i = 8; i < TILE; i += 12) {
      g.fillRect(0, i, TILE, 2);
      g.fillStyle = 'rgba(180,140,90,0.35)';
      g.fillRect(0, i + 2, TILE, 1);
      g.fillStyle = 'rgba(50,30,15,0.5)';
    }
  }
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(80,60,40,0.6)';
    g.fillRect(randi(TILE - 2), randi(TILE - 2), 2, 1);
  }
  return c;
}

export function spritePathTile(): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = (Math.sin(x * 0.2) + Math.cos(y * 0.25)) * 0.5;
      const v = 200 + Math.floor(n * 10);
      g.fillStyle = `rgb(${v - 30},${v - 50},${v - 90})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(130,110,80,0.6)';
    const px = randi(TILE - 3);
    const py = randi(TILE - 3);
    g.fillRect(px, py, 2, 2);
    g.fillStyle = 'rgba(220,200,170,0.7)';
    g.fillRect(px, py, 1, 1);
  }
  return c;
}

export function spriteWaterTile(): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = Math.sin(x * 0.3 + y * 0.2) * 0.5 + Math.cos(y * 0.15) * 0.5;
      const b = 200 + Math.floor(n * 15);
      g.fillStyle = `rgb(${60 + Math.floor(n * 10)},${130 + Math.floor(n * 15)},${b})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillRect(randi(TILE - 8), randi(TILE), 6, 1);
  }
  return c;
}
