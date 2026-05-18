import { makeCanvas } from '../canvas';
import { ANIMALS } from '../data/animals';

export function spriteAnimal(kind: string, frame: number): HTMLCanvasElement {
  const cfg = ANIMALS[kind]!.body;
  const W = 64;
  const H = 64;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;
  const cx = W / 2;
  const baseY = 50;
  const bob = frame ? -2 : 0;
  const legY = frame ? 2 : 0;

  // shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(cx, baseY + 6, cfg.w * 0.45, 4, 0, 0, Math.PI * 2); g.fill();

  // legs
  g.fillStyle = cfg.accent;
  if (kind === 'chicken') {
    g.fillRect(cx - 5, baseY - 2 + legY, 2, 6);
    g.fillRect(cx + 3, baseY - 2 - legY, 2, 6);
  } else {
    g.fillRect(cx - cfg.w * 0.35, baseY - 4 + legY, 4, 8);
    g.fillRect(cx + cfg.w * 0.25, baseY - 4 - legY, 4, 8);
    g.fillRect(cx - cfg.w * 0.1, baseY - 4 + legY, 4, 8);
    g.fillRect(cx + cfg.w * 0.0, baseY - 4 - legY, 4, 8);
  }

  // body
  g.fillStyle = cfg.color;
  if (kind === 'chicken') {
    g.beginPath();
    g.ellipse(cx, baseY - 6 + bob, cfg.w * 0.5, cfg.h * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx + 10, baseY - 14 + bob, 7, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = cfg.beak;
    g.beginPath();
    g.moveTo(cx + 15, baseY - 13 + bob);
    g.lineTo(cx + 20, baseY - 12 + bob);
    g.lineTo(cx + 15, baseY - 11 + bob);
    g.closePath(); g.fill();
    g.fillStyle = cfg.accent;
    g.fillRect(cx + 8, baseY - 20 + bob, 2, 4);
    g.fillRect(cx + 11, baseY - 22 + bob, 2, 4);
    g.fillRect(cx + 14, baseY - 20 + bob, 2, 4);
    g.fillStyle = '#000';
    g.fillRect(cx + 13, baseY - 15 + bob, 1, 1);
    g.fillStyle = cfg.accent;
    g.fillRect(cx - 3, baseY - 8 + bob, 6, 4);
  } else if (kind === 'cow') {
    g.fillStyle = cfg.color;
    g.beginPath();
    g.ellipse(cx, baseY - 10 + bob, cfg.w * 0.5, cfg.h * 0.55, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = cfg.accent;
    g.fillRect(cx - 10, baseY - 12 + bob, 6, 5);
    g.fillRect(cx + 3, baseY - 15 + bob, 7, 4);
    g.fillRect(cx - 3, baseY - 8 + bob, 5, 4);
    g.fillStyle = cfg.color;
    g.beginPath();
    g.ellipse(cx + 18, baseY - 14 + bob, 10, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = cfg.beak;
    g.beginPath();
    g.ellipse(cx + 22, baseY - 12 + bob, 6, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#000';
    g.fillRect(cx + 20, baseY - 11 + bob, 1, 1);
    g.fillRect(cx + 24, baseY - 11 + bob, 1, 1);
    g.fillRect(cx + 15, baseY - 16 + bob, 1, 1);
    g.fillStyle = '#e8d8b0';
    g.fillRect(cx + 12, baseY - 21 + bob, 2, 4);
    g.fillRect(cx + 18, baseY - 21 + bob, 2, 4);
    g.fillStyle = cfg.accent;
    g.fillRect(cx - cfg.w * 0.5, baseY - 12 + bob, 2, 8);
  } else if (kind === 'sheep') {
    g.fillStyle = cfg.color;
    g.beginPath(); g.arc(cx - 8, baseY - 10 + bob, 8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx,     baseY - 12 + bob, 9, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 8, baseY - 10 + bob, 8, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx - 4, baseY - 6  + bob, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 4, baseY - 6  + bob, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = cfg.accent;
    g.beginPath();
    g.ellipse(cx + 15, baseY - 10 + bob, 6, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(cx + 18, baseY - 11 + bob, 1, 1);
    g.fillRect(cx + 14, baseY - 11 + bob, 1, 1);
  } else if (kind === 'pig') {
    g.fillStyle = cfg.color;
    g.beginPath();
    g.ellipse(cx, baseY - 10 + bob, cfg.w * 0.5, cfg.h * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx + 16, baseY - 14 + bob, 9, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = cfg.beak;
    g.beginPath();
    g.ellipse(cx + 22, baseY - 13 + bob, 6, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#a06060';
    g.fillRect(cx + 20, baseY - 14 + bob, 2, 2);
    g.fillRect(cx + 24, baseY - 14 + bob, 2, 2);
    g.fillStyle = '#000';
    g.fillRect(cx + 15, baseY - 16 + bob, 1, 1);
    g.fillStyle = cfg.color;
    g.fillRect(cx - cfg.w * 0.5, baseY - 14 + bob, 2, 2);
    g.fillRect(cx - cfg.w * 0.5 + 2, baseY - 16 + bob, 2, 2);
    g.fillStyle = cfg.accent;
    g.fillRect(cx + 11, baseY - 22 + bob, 3, 4);
  } else if (kind === 'goat') {
    g.fillStyle = cfg.color;
    g.beginPath();
    g.ellipse(cx, baseY - 10 + bob, cfg.w * 0.5, cfg.h * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.ellipse(cx + 14, baseY - 16 + bob, 7, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.fillRect(cx + 14, baseY - 10 + bob, 3, 4);
    g.fillStyle = cfg.accent;
    g.fillRect(cx + 11, baseY - 23 + bob, 2, 6);
    g.fillRect(cx + 15, baseY - 23 + bob, 2, 6);
    g.fillRect(cx + 8, baseY - 20 + bob, 4, 2);
    g.fillStyle = cfg.beak;
    g.beginPath();
    g.ellipse(cx + 19, baseY - 15 + bob, 3, 2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000';
    g.fillRect(cx + 15, baseY - 17 + bob, 1, 1);
  } else if (kind === 'duck') {
    g.fillStyle = cfg.color;
    g.beginPath();
    g.ellipse(cx, baseY - 8 + bob, cfg.w * 0.5, cfg.h * 0.5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.ellipse(cx + 9, baseY - 14 + bob, 6, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cfg.accent;
    g.beginPath();
    g.ellipse(cx + 14, baseY - 13 + bob, 4, 2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000';
    g.fillRect(cx + 11, baseY - 15 + bob, 1, 1);
    g.fillStyle = '#d8d8d0';
    g.beginPath();
    g.ellipse(cx - 3, baseY - 7 + bob, 5, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cfg.color;
    g.fillRect(cx - cfg.w * 0.5, baseY - 11 + bob, 4, 2);
  }

  return c;
}
