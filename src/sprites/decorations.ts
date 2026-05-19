import { makeCanvas } from '../canvas';
import { TILE } from '../constants';
import { DECORATIONS } from '../data/decorations';

export function spriteDecoration(type: string): HTMLCanvasElement {
  const def = DECORATIONS[type]!;
  const W = def.w * TILE;
  const H = def.h * TILE;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;
  const cx = W / 2;
  const cy = H / 2;

  switch (type) {
    case 'flowerbed': {
      g.fillStyle = '#5a3a18';
      g.beginPath(); g.ellipse(cx, cy + 8, 22, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a8020';
      g.fillRect(cx - 12, cy - 4, 3, 12);
      g.fillRect(cx, cy - 2, 3, 14);
      g.fillRect(cx + 10, cy - 6, 3, 16);
      const colors = ['#ff80c0', '#ffe080', '#80c0ff'];
      ([[-12, -4], [0, -2], [10, -6]] as const).forEach(([dx, dy], i) => {
        g.fillStyle = colors[i]!;
        for (let a = 0; a < 5; a++) {
          const ang = a / 5 * Math.PI * 2;
          g.beginPath();
          g.arc(cx + dx + 0.5 + Math.cos(ang) * 4, cy + dy + Math.sin(ang) * 4, 3, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#ffe040';
        g.beginPath(); g.arc(cx + dx + 0.5, cy + dy, 2, 0, Math.PI * 2); g.fill();
      });
      break;
    }
    case 'lamppost':
      g.fillStyle = '#3a3a3a';
      g.fillRect(cx - 1, cy - 22, 3, 40);
      g.fillStyle = '#222';
      g.fillRect(cx - 3, cy + 18, 7, 4);
      g.fillStyle = '#3a3a3a';
      g.fillRect(cx - 6, cy - 28, 13, 6);
      g.fillStyle = '#ffe080';
      g.fillRect(cx - 5, cy - 26, 11, 4);
      g.fillStyle = '#fff8a0';
      g.fillRect(cx - 4, cy - 25, 9, 2);
      g.fillStyle = 'rgba(255,230,128,0.3)';
      g.beginPath(); g.arc(cx, cy - 24, 14, 0, Math.PI * 2); g.fill();
      break;
    case 'bench':
      g.fillStyle = '#a87248';
      g.fillRect(cx - W * 0.4, cy - 2, W * 0.8, 8);
      g.fillStyle = '#a87248';
      g.fillRect(cx - W * 0.4, cy - 16, W * 0.8, 6);
      g.fillStyle = '#8a5a30';
      for (let i = 0; i < 5; i++) {
        const x = cx - W * 0.35 + i * (W * 0.7 / 4);
        g.fillRect(x, cy - 16, 2, 6);
      }
      g.fillStyle = '#7a4f2e';
      g.fillRect(cx - W * 0.35, cy + 4, 4, 14);
      g.fillRect(cx + W * 0.32, cy + 4, 4, 14);
      break;
    case 'scarecrow':
      g.fillStyle = '#8a5a30';
      g.fillRect(cx - 1, cy - 18, 3, 36);
      g.fillRect(cx - 12, cy - 12, 24, 3);
      g.fillStyle = '#d8b878';
      g.beginPath(); g.arc(cx, cy - 22, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a3a18';
      g.fillRect(cx - 10, cy - 30, 20, 3);
      g.fillRect(cx - 6, cy - 36, 12, 8);
      g.fillStyle = '#000';
      g.fillRect(cx - 3, cy - 23, 2, 2);
      g.fillRect(cx + 1, cy - 23, 2, 2);
      g.fillStyle = '#3a2410';
      g.fillRect(cx - 3, cy - 20, 6, 1);
      g.fillStyle = '#c44040';
      g.fillRect(cx - 8, cy - 15, 16, 14);
      g.fillStyle = '#a02828';
      g.fillRect(cx - 8, cy - 15, 16, 2);
      g.fillStyle = '#d8b878';
      g.fillRect(cx - 13, cy - 12, 4, 8);
      g.fillRect(cx + 9, cy - 12, 4, 8);
      g.fillStyle = '#3a2410';
      g.fillRect(cx - 3, cy - 10, 2, 2);
      break;
    case 'fountain':
      g.fillStyle = '#888';
      g.beginPath(); g.ellipse(cx, cy + H * 0.3, W * 0.4, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a0a0a0';
      g.beginPath(); g.ellipse(cx, cy + H * 0.2, W * 0.35, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7ac0ef';
      g.beginPath(); g.ellipse(cx, cy + H * 0.2, W * 0.28, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a0a0a0';
      g.fillRect(cx - 5, cy - 10, 10, 22);
      g.fillStyle = '#888';
      g.beginPath(); g.ellipse(cx, cy - 12, 14, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7ac0ef';
      g.beginPath(); g.ellipse(cx, cy - 13, 11, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a8e0ff';
      for (let i = 0; i < 3; i++) {
        const x = cx + (i - 1) * 5;
        g.beginPath();
        g.ellipse(x, cy - 22 + i * 2, 1.5, 5, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx, cy - 25, 2, 0, Math.PI * 2); g.fill();
      break;
    case 'statue':
      g.fillStyle = '#888';
      g.fillRect(cx - 12, cy + 12, 24, 14);
      g.fillStyle = '#a0a0a0';
      g.fillRect(cx - 14, cy + 12, 28, 4);
      g.fillStyle = '#c0c0c0';
      g.beginPath(); g.arc(cx, cy - 8, 8, 0, Math.PI * 2); g.fill();
      g.fillRect(cx - 6, cy - 2, 12, 14);
      g.fillStyle = '#a0a0a0';
      g.fillRect(cx - 9, cy - 14, 18, 3);
      g.fillRect(cx - 5, cy - 22, 10, 8);
      g.fillStyle = '#c0c0c0';
      g.fillRect(cx - 10, cy, 4, 8);
      g.fillRect(cx + 6, cy, 4, 8);
      break;
    case 'gazebo':
      g.fillStyle = '#a87248';
      g.fillRect(cx - W * 0.4, cy + H * 0.2, W * 0.8, 8);
      g.fillStyle = '#8a5a30';
      g.fillRect(cx - W * 0.4, cy - 10, 4, H * 0.3);
      g.fillRect(cx + W * 0.4 - 4, cy - 10, 4, H * 0.3);
      g.fillRect(cx - W * 0.15, cy - 10, 4, H * 0.3);
      g.fillRect(cx + W * 0.15, cy - 10, 4, H * 0.3);
      g.fillStyle = '#c44040';
      g.beginPath();
      g.moveTo(cx - W * 0.45, cy - 10);
      g.lineTo(cx, cy - H * 0.35);
      g.lineTo(cx + W * 0.45, cy - 10);
      g.closePath(); g.fill();
      g.fillStyle = '#a02828';
      for (let i = 0; i < 6; i++) {
        g.fillRect(cx - W * 0.4 + i * 8, cy - 12, 6, 2);
      }
      g.fillStyle = '#3a2410';
      g.fillRect(cx - 1, cy - H * 0.45, 2, 10);
      g.fillStyle = '#ffe040';
      g.beginPath();
      g.moveTo(cx, cy - H * 0.45);
      g.lineTo(cx + 8, cy - H * 0.43);
      g.lineTo(cx, cy - H * 0.41);
      g.closePath(); g.fill();
      break;
    case 'pinwheel': {
      g.fillStyle = '#7a4f2e';
      g.fillRect(cx - 1, cy - 4, 2, 22);
      const blades = ['#ff80c0', '#80c0ff', '#ffe080', '#80e080'];
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        g.fillStyle = blades[i]!;
        g.beginPath();
        g.moveTo(cx, cy - 6);
        g.lineTo(cx + Math.cos(a) * 10, cy - 6 + Math.sin(a) * 10);
        g.lineTo(cx + Math.cos(a + 0.3) * 12, cy - 6 + Math.sin(a + 0.3) * 12);
        g.closePath(); g.fill();
      }
      g.fillStyle = '#3a2410';
      g.beginPath(); g.arc(cx, cy - 6, 2, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'cherrytree': {
      g.fillStyle = '#5a3a18';
      g.fillRect(cx - 2, cy + 6, 4, 18);
      g.fillStyle = '#ff9bd6';
      g.beginPath(); g.arc(cx - 10, cy - 6, 12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 10, cy - 6, 12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx, cy - 16, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe0e8';
      g.beginPath(); g.arc(cx - 4, cy - 12, 4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 8, cy - 4, 3, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'petalpath': {
      g.fillStyle = '#d8b878';
      g.fillRect(cx - 24, cy + 8, 48, 14);
      g.fillStyle = '#ffc0d8';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(cx - 20 + i * 8, cy + 14 + (i % 2 === 0 ? 0 : 3), 2, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'beachchair': {
      g.fillStyle = '#f0e0a0';
      g.fillRect(cx - 16, cy + 4, 32, 6);
      g.fillStyle = '#3c8dbc';
      g.fillRect(cx - 14, cy + 2, 28, 4);
      g.fillStyle = '#a87248';
      g.fillRect(cx - 14, cy + 10, 4, 8);
      g.fillRect(cx + 10, cy + 10, 4, 8);
      g.fillStyle = '#f0e0a0';
      g.fillRect(cx - 14, cy - 10, 5, 14);
      g.fillStyle = '#3c8dbc';
      g.fillRect(cx - 14, cy - 10, 4, 10);
      break;
    }
    case 'tikitorch': {
      g.fillStyle = '#7a4f2e';
      g.fillRect(cx - 1, cy - 16, 3, 32);
      g.fillStyle = '#a87248';
      g.fillRect(cx - 5, cy - 22, 10, 7);
      g.fillStyle = '#ff8030';
      g.beginPath(); g.arc(cx, cy - 26, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe040';
      g.beginPath(); g.arc(cx, cy - 27, 2, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'pumpkinstack': {
      g.fillStyle = '#e87018';
      g.beginPath(); g.ellipse(cx, cy + 14, 14, 9, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx, cy + 2, 11, 7, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx, cy - 8, 8, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a6a20';
      g.fillRect(cx - 1, cy - 14, 2, 4);
      g.fillStyle = '#a04810';
      for (let i = 0; i < 3; i++) {
        const y = [14, 2, -8][i]!;
        g.fillRect(cx - 1, y + cy - 4, 1, 8);
      }
      break;
    }
    case 'scarecrowhat': {
      g.fillStyle = '#8a5a30';
      g.fillRect(cx - 1, cy - 16, 3, 32);
      g.fillRect(cx - 12, cy - 10, 24, 3);
      g.fillStyle = '#e87018';
      g.beginPath(); g.arc(cx, cy - 22, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a2410';
      g.fillRect(cx - 8, cy - 28, 16, 3);
      g.fillRect(cx - 5, cy - 35, 10, 8);
      g.fillStyle = '#ffe040';
      g.fillRect(cx - 3, cy - 33, 6, 2);
      break;
    }
    case 'snowman': {
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx, cy + 12, 12, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx, cy - 2, 9, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx, cy - 14, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000';
      g.beginPath(); g.arc(cx - 2, cy - 15, 1, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx + 2, cy - 15, 1, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff8030';
      g.fillRect(cx, cy - 13, 4, 1);
      g.fillStyle = '#3a2410';
      g.fillRect(cx - 6, cy - 20, 12, 2);
      g.fillRect(cx - 3, cy - 22, 6, 4);
      break;
    }
    case 'lanternice': {
      g.fillStyle = '#7a4f2e';
      g.fillRect(cx - 1, cy - 14, 3, 26);
      g.fillStyle = '#a0d0f0';
      g.beginPath(); g.arc(cx, cy - 18, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx, cy - 19, 3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3070c0'; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy - 18, 7, 0, Math.PI * 2); g.stroke();
      break;
    }
  }
  return c;
}
