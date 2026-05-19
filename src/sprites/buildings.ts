import { makeCanvas } from '../canvas';
import { TILE } from '../constants';
import { BUILDINGS } from '../data/buildings';

export function spriteBuilding(type: string): HTMLCanvasElement {
  const def = BUILDINGS[type]!;
  const W = def.w * TILE;
  const H = def.h * TILE;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;

  if (def.kind === 'pen') {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = (Math.sin(x * 0.08) + Math.cos(y * 0.1)) * 0.5;
        const r = 175 + Math.floor(n * 10);
        g.fillStyle = `rgb(${r},${r - 50},${r - 100})`;
        g.fillRect(x, y, 1, 1);
      }
    }
    g.strokeStyle = '#8a5a30';
    g.lineWidth = 4;
    g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = '#7a4520';
    for (let p = 0; p <= def.w; p++) {
      g.fillRect(4 + p * (W - 8) / def.w, 4, 6, 8);
      g.fillRect(4 + p * (W - 8) / def.w, H - 12, 6, 8);
    }
    for (let p = 0; p <= def.h; p++) {
      g.fillRect(4, 4 + p * (H - 8) / def.h, 8, 6);
      g.fillRect(W - 12, 4 + p * (H - 8) / def.h, 8, 6);
    }
    g.fillStyle = 'rgba(170,120,70,0.3)';
    g.fillRect(W / 2 - 12, H - 12, 24, 8);
    g.fillStyle = '#8a5a30';
    g.fillRect(W - 44, 14, 30, 30);
    g.fillStyle = '#c45040';
    g.beginPath();
    g.moveTo(W - 48, 14); g.lineTo(W - 30, 4); g.lineTo(W - 12, 14); g.closePath();
    g.fill();
    g.fillStyle = '#3a2410';
    g.fillRect(W - 34, 24, 10, 20);
  } else if (def.kind === 'production') {
    g.fillStyle = '#8a7050';
    g.fillRect(0, H - 20, W, 20);
    g.fillStyle = '#7a6040';
    for (let i = 0; i < W; i += 12) g.fillRect(i, H - 20, 6, 4);

    let bodyColor: string;
    let roofColor: string;
    let sign: string;
    if (type === 'bakery')        { bodyColor = '#f0d0a0'; roofColor = '#c44040'; sign = 'B'; }
    else if (type === 'dairy')    { bodyColor = '#a8c8e8'; roofColor = '#3060a0'; sign = 'D'; }
    else if (type === 'feedmill') { bodyColor = '#c8b878'; roofColor = '#7a4f2e'; sign = 'F'; }
    else if (type === 'sugarmill'){ bodyColor = '#f4e8b8'; roofColor = '#8a4030'; sign = 'S'; }
    else if (type === 'juicer')   { bodyColor = '#ffd070'; roofColor = '#e07020'; sign = 'J'; }
    else if (type === 'loom')     { bodyColor = '#d8a8e0'; roofColor = '#704080'; sign = 'L'; }
    else if (type === 'bbq')      { bodyColor = '#806050'; roofColor = '#3a2418'; sign = 'Q'; }
    else if (type === 'perfumery'){ bodyColor = '#e0b0e8'; roofColor = '#7040a0'; sign = 'P'; }
    else if (type === 'apiary')   { bodyColor = '#ffe080'; roofColor = '#c89018'; sign = 'H'; }
    else if (type === 'candleshop'){bodyColor = '#fff0c8'; roofColor = '#c8932a'; sign = 'C'; }
    else if (type === 'smoothiebar'){bodyColor='#ffa0c0'; roofColor = '#d04060'; sign = 'M'; }
    else if (type === 'windmill') { bodyColor = '#f0e0c0'; roofColor = '#c44040'; sign = 'W'; }
    else if (type === 'greatbarn'){ bodyColor = '#d04040'; roofColor = '#7a4f2e'; sign = 'B'; }
    else if (type === 'fishery')  { bodyColor = '#a0c8e8'; roofColor = '#3060a0'; sign = 'F'; }
    else                          { bodyColor = '#c0a880'; roofColor = '#7a4f2e'; sign = '?'; }

    g.fillStyle = bodyColor;
    g.fillRect(6, 30, W - 12, H - 50);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 36; i < H - 20; i += 6) g.fillRect(6, i, W - 12, 1);
    g.fillStyle = roofColor;
    g.beginPath();
    g.moveTo(2, 32); g.lineTo(W / 2, 6); g.lineTo(W - 2, 32); g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 6; i < 26; i += 4) {
      g.fillRect(W / 2 - i - 2, 32 - i, 4, 2);
      g.fillRect(W / 2 + i - 2, 32 - i, 4, 2);
    }
    g.fillStyle = '#5a3a20';
    g.fillRect(W / 2 - 10, H - 44, 20, 24);
    g.fillStyle = '#c8961d';
    g.fillRect(W / 2 + 6, H - 32, 2, 2);
    g.fillStyle = '#a0d0e0';
    g.fillRect(12, H - 50, 14, 12);
    g.fillRect(W - 26, H - 50, 14, 12);
    g.fillStyle = '#3a2410';
    g.fillRect(12, H - 50, 14, 1);
    g.fillRect(12, H - 44, 14, 1);
    g.fillRect(18, H - 50, 1, 12);
    g.fillRect(W - 26, H - 50, 14, 1);
    g.fillRect(W - 26, H - 44, 14, 1);
    g.fillRect(W - 20, H - 50, 1, 12);
    g.fillStyle = '#3a2410';
    g.fillRect(W / 2 - 12, 36, 24, 14);
    g.fillStyle = '#fff';
    g.font = 'bold 14px sans-serif';
    g.fillText(sign, W / 2 - 5, 48);
    g.fillStyle = '#3a2410';
    g.fillRect(W - 16, 10, 8, 16);
  } else if (def.kind === 'fishing') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.3 + y * 0.2) * 0.5 + Math.cos(y * 0.15) * 0.5;
      const b = 200 + Math.floor(n * 15);
      g.fillStyle = `rgb(80,${120 + Math.floor(n * 15)},${b})`;
      g.fillRect(x, y, 1, 1);
    }
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.ellipse(20 + i * 15, 30 + (i % 3) * 15, 8, 2, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#a87248';
    g.fillRect(W / 2 - 30, H - 44, 60, 24);
    g.fillStyle = '#7a4f2e';
    for (let i = 0; i < 5; i++) g.fillRect(W / 2 - 30 + i * 12, H - 44, 1, 24);
    g.fillStyle = '#5a3a18';
    g.fillRect(W / 2 - 26, H - 20, 6, 12);
    g.fillRect(W / 2 + 20, H - 20, 6, 12);
    g.fillStyle = '#7a4f2e';
    g.fillRect(W / 2 - 8, H - 60, 16, 8);
    g.fillRect(W / 2 - 2, H - 60, 2, 30);
    g.strokeStyle = '#3a2410'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(W / 2 + 8, H - 58); g.lineTo(W / 2 + 30, H - 72); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(W / 2 + 30, H - 72); g.lineTo(W / 2 + 30, H - 30); g.stroke();
    g.fillStyle = '#d83030';
    g.beginPath(); g.arc(W / 2 + 30, H - 28, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(W / 2 + 30, H - 28, 1.5, 0, Math.PI * 2); g.fill();
  }
  return c;
}

export function spriteDuckPondOverride(): HTMLCanvasElement {
  const def = BUILDINGS.duckpond!;
  const W = def.w * TILE;
  const H = def.h * TILE;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inPond = (x > 20 && x < W - 20 && y > 20 && y < H - 20);
    if (inPond) {
      const n = Math.sin(x * 0.3 + y * 0.2) * 0.5;
      g.fillStyle = `rgb(80,${120 + Math.floor(n * 15)},${190 + Math.floor(n * 15)})`;
    } else {
      const n = (Math.sin(x * 0.4) + Math.cos(y * 0.4)) * 0.5;
      g.fillStyle = `rgb(${110 + Math.floor(n * 8)},${175 + Math.floor(n * 10)},${70 + Math.floor(n * 5)})`;
    }
    g.fillRect(x, y, 1, 1);
  }
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(W / 2 - 30 + i * 20, H / 2 - 5 + (i % 2) * 10, 6, 2, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = '#8a5a30'; g.lineWidth = 3;
  g.strokeRect(8, 8, W - 16, H - 16);
  g.fillStyle = '#3a7a30';
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(40 + i * 40, H / 2 + (i % 2) * 20, 10, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ff80c0';
  g.beginPath();
  g.arc(40, H / 2, 3, 0, Math.PI * 2); g.fill();
  return c;
}
