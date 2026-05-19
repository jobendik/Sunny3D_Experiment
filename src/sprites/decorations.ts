import { makeCanvas } from '../canvas';
import { TILE } from '../constants';
import { DECORATIONS } from '../data/decorations';

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

function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  g.save();
  g.globalAlpha = 0.2;
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

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
      // Soil mound
      const moundGrad = g.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, 22);
      moundGrad.addColorStop(0, '#6a4420');
      moundGrad.addColorStop(1, '#4a2c10');
      g.fillStyle = moundGrad;
      g.beginPath(); g.ellipse(cx, cy + 8, 22, 12, 0, 0, Math.PI * 2); g.fill();
      
      // Stems
      g.strokeStyle = '#5cb040'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 12, cy + 6); g.quadraticCurveTo(cx - 14, cy, cx - 12, cy - 6); g.stroke();
      g.beginPath(); g.moveTo(cx, cy + 8); g.lineTo(cx, cy - 8); g.stroke();
      g.beginPath(); g.moveTo(cx + 10, cy + 6); g.quadraticCurveTo(cx + 12, cy, cx + 10, cy - 10); g.stroke();
      
      // Flowers (soft circles)
      const colors = ['#ff9ed4', '#ffe070', '#80c0ff', '#ffa0a0'];
      ([[-12, -6], [0, -8], [10, -10], [-5, 0], [6, -2]] as const).forEach(([dx, dy], i) => {
        const fc = colors[i % colors.length]!;
        for (let a = 0; a < 5; a++) {
          const ang = a / 5 * Math.PI * 2;
          softCircle(g, cx + dx + Math.cos(ang) * 4, cy + dy + Math.sin(ang) * 4, 3.5, fc, 0.9);
        }
        softCircle(g, cx + dx, cy + dy, 2.5, '#ffe040', 1); // center
      });
      break;
    }
    case 'lamppost': {
      shadow(g, cx, cy + 20, 8, 3);
      // Base
      g.fillStyle = '#222';
      g.beginPath(); g.ellipse(cx, cy + 18, 6, 3, 0, 0, Math.PI * 2); g.fill();
      // Pole
      const poleGrad = g.createLinearGradient(cx - 2, 0, cx + 2, 0);
      poleGrad.addColorStop(0, '#2a2a2a');
      poleGrad.addColorStop(0.5, '#4a4a4a');
      poleGrad.addColorStop(1, '#1a1a1a');
      g.fillStyle = poleGrad;
      g.fillRect(cx - 1.5, cy - 22, 3, 40);
      
      // Top housing
      g.fillStyle = '#222';
      g.fillRect(cx - 6, cy - 28, 12, 6);
      g.beginPath(); g.moveTo(cx - 8, cy - 28); g.lineTo(cx, cy - 34); g.lineTo(cx + 8, cy - 28); g.fill();
      
      // Glass / Glow
      const glowGrad = g.createRadialGradient(cx, cy - 25, 2, cx, cy - 25, 18);
      glowGrad.addColorStop(0, 'rgba(255,230,128,0.8)');
      glowGrad.addColorStop(1, 'rgba(255,230,128,0)');
      g.fillStyle = glowGrad;
      g.beginPath(); g.arc(cx, cy - 25, 18, 0, Math.PI * 2); g.fill();
      
      g.fillStyle = '#fff8a0';
      g.fillRect(cx - 4, cy - 26, 8, 5);
      softCircle(g, cx, cy - 24, 2, '#fff', 1);
      break;
    }
    case 'bench': {
      shadow(g, cx, cy + 16, W * 0.45, 6);
      
      const woodColor = '#a87248';
      const woodDark = '#7a4f2e';
      
      // Legs
      g.fillStyle = woodDark;
      g.fillRect(cx - W * 0.35, cy + 4, 4, 12);
      g.fillRect(cx + W * 0.35 - 4, cy + 4, 4, 12);
      g.fillRect(cx - W * 0.3, cy + 2, 4, 10);
      g.fillRect(cx + W * 0.3 - 4, cy + 2, 4, 10);
      
      // Seat
      g.fillStyle = woodColor;
      g.beginPath(); g.roundRect(cx - W * 0.4, cy - 2, W * 0.8, 8, 3); g.fill();
      g.fillStyle = woodDark;
      g.fillRect(cx - W * 0.4, cy + 4, W * 0.8, 2); // seat depth
      
      // Back support beams
      g.fillStyle = woodDark;
      for (let i = 0; i < 5; i++) {
        const x = cx - W * 0.35 + i * (W * 0.7 / 4);
        g.fillRect(x - 1, cy - 16, 2, 14);
      }
      
      // Backrest
      g.fillStyle = woodColor;
      g.beginPath(); g.roundRect(cx - W * 0.4, cy - 18, W * 0.8, 6, 2); g.fill();
      
      // Armrests
      g.strokeStyle = woodColor; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - W * 0.35, cy - 10); g.quadraticCurveTo(cx - W * 0.38, cy - 4, cx - W * 0.35, cy + 2); g.stroke();
      g.beginPath(); g.moveTo(cx + W * 0.35, cy - 10); g.quadraticCurveTo(cx + W * 0.38, cy - 4, cx + W * 0.35, cy + 2); g.stroke();
      break;
    }
    case 'fountain': {
      shadow(g, cx, cy + H * 0.3, W * 0.4, 14);
      
      // Base pool
      const stoneGrad = g.createLinearGradient(0, cy, 0, cy + H * 0.4);
      stoneGrad.addColorStop(0, '#a0a0a0'); stoneGrad.addColorStop(1, '#707070');
      g.fillStyle = stoneGrad;
      g.beginPath(); g.ellipse(cx, cy + H * 0.3, W * 0.4, 14, 0, 0, Math.PI * 2); g.fill();
      
      // Water in pool
      g.fillStyle = '#5ab0d8';
      g.beginPath(); g.ellipse(cx, cy + H * 0.28, W * 0.35, 11, 0, 0, Math.PI * 2); g.fill();
      
      // Central pillar
      g.fillStyle = stoneGrad;
      g.fillRect(cx - 6, cy - 10, 12, 28);
      
      // Upper tier
      g.beginPath(); g.ellipse(cx, cy - 12, 16, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7ac0ef';
      g.beginPath(); g.ellipse(cx, cy - 13, 13, 4, 0, 0, Math.PI * 2); g.fill();
      
      // Water spout and cascades
      g.strokeStyle = 'rgba(168,224,255,0.7)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, cy - 20); g.lineTo(cx, cy - 28); g.stroke(); // top spout
      
      for(let i=0; i<5; i++) {
        const a = Math.PI + (i/4) * Math.PI;
        g.beginPath();
        g.moveTo(cx + Math.cos(a)*10, cy - 12);
        g.quadraticCurveTo(cx + Math.cos(a)*15, cy - 5, cx + Math.cos(a)*12, cy + 10);
        g.stroke();
      }
      break;
    }
    case 'statue': {
      shadow(g, cx, cy + 16, 20, 8);
      // Pedestal
      const pGrad = g.createLinearGradient(0, cy, 0, cy + 20);
      pGrad.addColorStop(0, '#a0a0a0'); pGrad.addColorStop(1, '#707070');
      g.fillStyle = pGrad;
      g.beginPath(); g.roundRect(cx - 14, cy + 10, 28, 10, 2); g.fill();
      g.fillStyle = '#888';
      g.beginPath(); g.roundRect(cx - 10, cy + 2, 20, 10, 2); g.fill();
      
      // Statue Body (abstract human shape)
      g.fillStyle = '#c0c0c0';
      g.beginPath(); g.arc(cx, cy - 12, 7, 0, Math.PI * 2); g.fill(); // head
      g.beginPath(); g.roundRect(cx - 8, cy - 4, 16, 14, 4); g.fill(); // torso
      g.beginPath(); g.roundRect(cx - 10, cy - 2, 4, 12, 2); g.fill(); // arm L
      g.beginPath(); g.roundRect(cx + 6, cy - 2, 4, 12, 2); g.fill();  // arm R
      
      // Moss accents
      g.fillStyle = 'rgba(92,176,64,0.4)';
      softCircle(g, cx - 6, cy + 16, 4, 'rgba(92,176,64,0.4)');
      softCircle(g, cx + 8, cy + 4, 3, 'rgba(92,176,64,0.4)');
      softCircle(g, cx - 4, cy - 10, 2, 'rgba(92,176,64,0.4)');
      break;
    }
    case 'cherrytree': {
      shadow(g, cx, cy + 20, 16, 6);
      // Trunk
      g.fillStyle = '#5a3a18';
      g.beginPath(); g.moveTo(cx - 2, cy + 20); g.quadraticCurveTo(cx, cy, cx - 3, cy - 10); g.lineTo(cx + 3, cy - 10); g.quadraticCurveTo(cx, cy, cx + 2, cy + 20); g.fill();
      
      // Blossom canopy (overlapping pink puffs)
      const puffs = [
        [0, -15, 20, '#ff9bd6'], [-12, -8, 16, '#ff80c0'], [12, -8, 16, '#ff80c0'],
        [0, -25, 18, '#ffb0e0'], [-15, -20, 14, '#ffb0e0'], [15, -20, 14, '#ffb0e0'],
        [0, 0, 12, '#ff60a0']
      ] as const;
      
      for(const [dx, dy, r, col] of puffs) {
        const puffGrad = g.createRadialGradient(cx+dx-r*0.2, cy+dy-r*0.2, r*0.1, cx+dx, cy+dy, r);
        puffGrad.addColorStop(0, '#ffe0f0'); puffGrad.addColorStop(0.6, col); puffGrad.addColorStop(1, 'rgba(255,100,160,0.5)');
        g.fillStyle = puffGrad;
        g.beginPath(); g.arc(cx+dx, cy+dy, r, 0, Math.PI * 2); g.fill();
      }
      
      // Falling petals
      g.fillStyle = '#ffb0e0';
      g.save(); g.globalAlpha = 0.8;
      [[cx-10, cy+5], [cx+15, cy+10], [cx+5, cy+18]].forEach(([px, py]) => {
        g.beginPath(); g.ellipse(px, py, 2.5, 1.5, Math.PI/4, 0, Math.PI*2); g.fill();
      });
      g.restore();
      break;
    }
    default:
      // Fallback simple rendering for others (can be expanded later)
      g.fillStyle = '#d8b878';
      g.fillRect(cx - 10, cy - 10, 20, 20);
      g.fillStyle = '#000';
      g.fillText(type.substring(0,3), cx - 8, cy + 4);
      break;
  }
  return c;
}
