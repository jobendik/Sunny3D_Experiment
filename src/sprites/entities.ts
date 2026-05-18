import { makeCanvas } from '../canvas';

export function spriteCrow(frame: number): HTMLCanvasElement {
  const c = makeCanvas(32, 32);
  const g = c.getContext('2d')!;
  const cx = 16;
  const cy = 18;
  const bob = frame ? -2 : 0;
  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.ellipse(cx, cy + bob, 8, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 5, cy - 5 + bob, 4, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffaa20';
  g.beginPath();
  g.moveTo(cx + 9, cy - 5 + bob);
  g.lineTo(cx + 14, cy - 4 + bob);
  g.lineTo(cx + 9, cy - 3 + bob);
  g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.fillRect(cx + 5, cy - 6 + bob, 2, 2);
  g.fillStyle = '#d00';
  g.fillRect(cx + 6, cy - 5 + bob, 1, 1);
  g.fillStyle = '#0a0a0a';
  if (frame === 0) {
    g.beginPath();
    g.ellipse(cx - 3, cy - 2 + bob, 6, 3, -0.4, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.ellipse(cx - 3, cy - 5 + bob, 6, 3, -1.0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#444';
  g.fillRect(cx - 2, cy + 6 + bob, 1, 4);
  g.fillRect(cx + 2, cy + 6 + bob, 1, 4);
  return c;
}

export function spriteDog(frame: number): HTMLCanvasElement {
  const c = makeCanvas(48, 40);
  const g = c.getContext('2d')!;
  const cx = 24;
  const cy = 22;
  const bob = frame ? -1 : 0;
  g.fillStyle = '#c89060';
  g.beginPath(); g.ellipse(cx, cy + bob, 12, 8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a5a30';
  g.beginPath(); g.ellipse(cx - 2, cy - 2 + bob, 6, 4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c89060';
  g.beginPath(); g.ellipse(cx + 10, cy - 4 + bob, 6, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e0b080';
  g.beginPath(); g.ellipse(cx + 15, cy - 2 + bob, 3, 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2410';
  g.fillRect(cx + 16, cy - 3 + bob, 2, 1);
  g.fillRect(cx + 11, cy - 5 + bob, 1, 1);
  g.fillStyle = '#8a5a30';
  g.fillRect(cx + 7, cy - 9 + bob, 3, 5);
  g.fillStyle = '#8a5a30';
  g.fillRect(cx - 7, cy + 6, 3, 5 + (frame ? 1 : 0));
  g.fillRect(cx - 2, cy + 6, 3, 5 - (frame ? 1 : 0));
  g.fillRect(cx + 4, cy + 6, 3, 5 + (frame ? 1 : 0));
  g.fillRect(cx + 9, cy + 6, 3, 5 - (frame ? 1 : 0));
  g.fillStyle = '#c89060';
  if (frame) {
    g.fillRect(cx - 14, cy - 2 + bob, 5, 3);
  } else {
    g.fillRect(cx - 14, cy - 4 + bob, 5, 3);
  }
  return c;
}

export function spriteDecorTree(): HTMLCanvasElement {
  const c = makeCanvas(80, 100);
  const g = c.getContext('2d')!;
  g.fillStyle = '#5a3a20';
  g.fillRect(36, 60, 8, 30);
  g.fillStyle = '#7a5430';
  g.fillRect(36, 60, 2, 30);
  g.fillStyle = '#2a6020';
  g.beginPath(); g.arc(40, 55, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a8030';
  g.beginPath(); g.arc(30, 48, 18, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(50, 50, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5cb040';
  g.beginPath(); g.arc(38, 42, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7ec850';
  g.beginPath(); g.arc(34, 38, 6, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath(); g.ellipse(40, 92, 18, 4, 0, 0, Math.PI * 2); g.fill();
  return c;
}
