import { makeCanvas } from '../canvas';

function softCircle(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill(); g.restore();
}

function glossyBall(g: CanvasRenderingContext2D, x: number, y: number, r: number, baseColor: string, highlightColor: string, shadowColor: string) {
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, highlightColor); grad.addColorStop(0.6, baseColor); grad.addColorStop(1, shadowColor);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
  softCircle(g, x - r * 0.3, y - r * 0.3, r * 0.25, '#ffffff', 0.5);
}

function shadow(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save(); g.globalAlpha = 0.2; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, y, r, r*0.3, 0, 0, Math.PI * 2); g.fill(); g.restore();
}

export function spriteItem(key: string): HTMLCanvasElement {
  const c = makeCanvas(48, 48);
  const g = c.getContext('2d')!;
  const cx = 24, cy = 24;

  shadow(g, cx, cy + 14, 12);

  switch (key) {
    case 'coin': {
      const grad = g.createRadialGradient(cx-4, cy-4, 2, cx, cy, 14);
      grad.addColorStop(0, '#fff4a0'); grad.addColorStop(0.5, '#f4c542'); grad.addColorStop(1, '#c8961d');
      g.fillStyle = grad;
      g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff8d0'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#a07010'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', cx, cy);
      softCircle(g, cx - 6, cy - 6, 2, '#fff', 0.8); // sparkle
      break;
    }
    case 'xp': {
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 18);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.4, '#a0e0ff'); grad.addColorStop(1, 'rgba(100,180,255,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      for(let i=0; i<10; i++) {
        const r = i%2===0 ? 12 : 5;
        const a = (i/10) * Math.PI * 2 - Math.PI/2;
        g.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
      }
      g.closePath(); g.fill();
      break;
    }
    case 'tomato': {
      glossyBall(g, cx, cy+2, 12, '#d83030', '#ff6060', '#901818');
      g.fillStyle = '#3a8020';
      for(let i=0; i<5; i++) {
        const a = (i/5) * Math.PI*2;
        g.beginPath(); g.ellipse(cx + Math.cos(a)*4, cy - 8 + Math.sin(a)*2, 3, 1.5, a, 0, Math.PI*2); g.fill();
      }
      break;
    }
    case 'milk': {
      // Bottle
      const bGrad = g.createLinearGradient(cx-8, cy-8, cx+8, cy+14);
      bGrad.addColorStop(0, '#e0f0ff'); bGrad.addColorStop(1, '#a0c0e0');
      g.fillStyle = bGrad;
      g.beginPath(); g.moveTo(cx-5, cy-8); g.lineTo(cx+5, cy-8); g.lineTo(cx+8, cy); g.lineTo(cx+8, cy+14); g.lineTo(cx-8, cy+14); g.lineTo(cx-8, cy); g.closePath(); g.fill();
      // Milk inside
      g.fillStyle = '#ffffff'; g.fillRect(cx-7, cy+2, 14, 11);
      // Label
      g.fillStyle = '#4080d0'; g.fillRect(cx-7, cy+4, 14, 5);
      // Cap
      g.fillStyle = '#a0a0a0'; g.fillRect(cx-6, cy-11, 12, 3);
      // Specular
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx-5, cy-6); g.lineTo(cx-5, cy+12); g.stroke();
      break;
    }
    case 'egg': {
      const eGrad = g.createRadialGradient(cx-3, cy-3, 2, cx, cy, 12);
      eGrad.addColorStop(0, '#ffffff'); eGrad.addColorStop(0.7, '#f4e8d0'); eGrad.addColorStop(1, '#d0c0a0');
      g.fillStyle = eGrad;
      g.beginPath(); g.ellipse(cx, cy+2, 10, 13, 0, 0, Math.PI*2); g.fill();
      break;
    }
    case 'wheat': {
      g.save(); g.translate(cx, cy); g.rotate(0.3);
      // Stalks
      g.strokeStyle = '#d8b850'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-4, -12); g.lineTo(2, 14); g.stroke();
      g.beginPath(); g.moveTo(4, -12); g.lineTo(-2, 14); g.stroke();
      g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 14); g.stroke();
      // Heads
      g.fillStyle = '#e8c860';
      g.beginPath(); g.ellipse(-4, -10, 4, 8, -0.2, 0, Math.PI*2); g.fill();
      g.beginPath(); g.ellipse(4, -10, 4, 8, 0.2, 0, Math.PI*2); g.fill();
      g.beginPath(); g.ellipse(0, -12, 4, 8, 0, 0, Math.PI*2); g.fill();
      // Tie
      g.strokeStyle = '#c44040'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-5, 4); g.lineTo(5, 4); g.stroke();
      g.restore();
      break;
    }
    case 'wool': {
      const wGrad = g.createRadialGradient(cx-4, cy-4, 2, cx, cy, 14);
      wGrad.addColorStop(0, '#ffffff'); wGrad.addColorStop(0.6, '#f0e8d0'); wGrad.addColorStop(1, '#c0b8a0');
      g.fillStyle = wGrad;
      g.beginPath(); g.arc(cx, cy+2, 13, 0, Math.PI*2); g.fill();
      // Yarn swirls
      g.strokeStyle = '#d0c8b0'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy+2, 8, 0, Math.PI*1.5); g.stroke();
      g.beginPath(); g.arc(cx-3, cy+4, 4, 0, Math.PI*2); g.stroke();
      break;
    }
    case 'plank': {
      // Wooden plank
      const wg = g.createLinearGradient(cx-14, cy, cx+14, cy);
      wg.addColorStop(0, '#8a5f3a'); wg.addColorStop(0.5, '#b88456'); wg.addColorStop(1, '#7a4f2a');
      g.fillStyle = wg;
      g.fillRect(cx-14, cy-6, 28, 12);
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 1;
      g.strokeRect(cx-14, cy-6, 28, 12);
      // Wood grain
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(cx-12, cy-2); g.lineTo(cx+12, cy-1); g.stroke();
      g.beginPath(); g.moveTo(cx-12, cy+2); g.lineTo(cx+12, cy+3); g.stroke();
      break;
    }
    case 'nail': {
      g.fillStyle = '#a0a0a8';
      // Head
      g.beginPath(); g.ellipse(cx, cy-10, 6, 3, 0, 0, Math.PI*2); g.fill();
      // Shaft
      g.fillRect(cx-2, cy-9, 4, 18);
      // Tip
      g.beginPath(); g.moveTo(cx-2, cy+9); g.lineTo(cx+2, cy+9); g.lineTo(cx, cy+14); g.closePath(); g.fill();
      // Highlight
      g.fillStyle = '#d4d4dc'; g.fillRect(cx-1.5, cy-8, 1, 16);
      break;
    }
    case 'screw': {
      g.fillStyle = '#8898a8';
      g.beginPath(); g.ellipse(cx, cy-10, 6, 3, 0, 0, Math.PI*2); g.fill();
      // Threaded shaft
      g.fillRect(cx-2.5, cy-9, 5, 18);
      g.strokeStyle = '#5a6878'; g.lineWidth = 1;
      for (let yy = -6; yy < 10; yy += 3) {
        g.beginPath(); g.moveTo(cx-2.5, cy+yy); g.lineTo(cx+2.5, cy+yy+1.5); g.stroke();
      }
      // Cross
      g.strokeStyle = '#2a3848'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(cx-3, cy-10); g.lineTo(cx+3, cy-10); g.stroke();
      g.beginPath(); g.moveTo(cx, cy-13); g.lineTo(cx, cy-7); g.stroke();
      break;
    }
    case 'hinge': {
      g.fillStyle = '#b0a878';
      g.fillRect(cx-12, cy-6, 24, 12);
      g.strokeStyle = '#7a7048'; g.lineWidth = 1; g.strokeRect(cx-12, cy-6, 24, 12);
      // Pin
      g.fillStyle = '#5a5028'; g.fillRect(cx-1, cy-10, 2, 20);
      // Screws
      g.fillStyle = '#3a3018';
      g.beginPath(); g.arc(cx-8, cy, 1.5, 0, Math.PI*2); g.fill();
      g.beginPath(); g.arc(cx+8, cy, 1.5, 0, Math.PI*2); g.fill();
      break;
    }
    case 'paint': {
      // Bucket
      const pg = g.createLinearGradient(cx, cy-8, cx, cy+12);
      pg.addColorStop(0, '#a0a0a8'); pg.addColorStop(1, '#5a5a68');
      g.fillStyle = pg;
      g.beginPath();
      g.moveTo(cx-10, cy-8); g.lineTo(cx+10, cy-8); g.lineTo(cx+11, cy+12); g.lineTo(cx-11, cy+12); g.closePath();
      g.fill();
      // Paint inside
      g.fillStyle = '#d24a4a'; g.fillRect(cx-9, cy-7, 18, 5);
      // Drip
      g.fillStyle = '#d24a4a';
      g.beginPath(); g.ellipse(cx+7, cy-1, 2, 3, 0, 0, Math.PI*2); g.fill();
      // Handle
      g.strokeStyle = '#3a3a48'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, cy-10, 8, Math.PI, 0); g.stroke();
      break;
    }
    case 'panel': {
      // Wood panel — slightly bigger than plank
      const wg = g.createLinearGradient(cx-15, cy, cx+15, cy);
      wg.addColorStop(0, '#5a8a3a'); wg.addColorStop(0.5, '#8aaa5a'); wg.addColorStop(1, '#4a7a2a');
      g.fillStyle = wg;
      g.fillRect(cx-15, cy-9, 30, 18);
      g.strokeStyle = '#3a5a1a'; g.lineWidth = 1;
      g.strokeRect(cx-15, cy-9, 30, 18);
      // Slats
      g.strokeStyle = '#4a6a2a'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(cx-13, cy-3); g.lineTo(cx+13, cy-3); g.stroke();
      g.beginPath(); g.moveTo(cx-13, cy+3); g.lineTo(cx+13, cy+3); g.stroke();
      break;
    }
    case 'bolt': {
      g.fillStyle = '#7080a0';
      // Hex head
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const x = cx + Math.cos(a) * 7;
        const y = cy - 10 + Math.sin(a) * 4;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath(); g.fill();
      g.strokeStyle = '#3a4a6a'; g.lineWidth = 1; g.stroke();
      // Shaft
      g.fillStyle = '#7080a0'; g.fillRect(cx-3, cy-6, 6, 16);
      // Threads
      g.strokeStyle = '#4a5a7a'; g.lineWidth = 0.8;
      for (let yy = -4; yy < 10; yy += 2) {
        g.beginPath(); g.moveTo(cx-3, cy+yy); g.lineTo(cx+3, cy+yy+0.8); g.stroke();
      }
      break;
    }
    case 'rope': {
      // Coil
      g.strokeStyle = '#c8a060'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI*2); g.stroke();
      g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI*2); g.stroke();
      // Braiding
      g.strokeStyle = '#a07840'; g.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a)*4, cy + Math.sin(a)*4);
        g.lineTo(cx + Math.cos(a)*13, cy + Math.sin(a)*13);
        g.stroke();
      }
      break;
    }
    case 'tarp': {
      // Folded canvas square
      g.fillStyle = '#7a6850'; g.fillRect(cx-13, cy-10, 26, 20);
      g.strokeStyle = '#4a3820'; g.lineWidth = 1; g.strokeRect(cx-13, cy-10, 26, 20);
      g.strokeStyle = '#5a4830';
      g.beginPath(); g.moveTo(cx-13, cy-2); g.lineTo(cx+13, cy-2); g.stroke();
      g.beginPath(); g.moveTo(cx, cy-10); g.lineTo(cx, cy+10); g.stroke();
      // Eyelets
      g.fillStyle = '#3a2810';
      g.beginPath(); g.arc(cx-10, cy-7, 1.2, 0, Math.PI*2); g.fill();
      g.beginPath(); g.arc(cx+10, cy-7, 1.2, 0, Math.PI*2); g.fill();
      g.beginPath(); g.arc(cx-10, cy+7, 1.2, 0, Math.PI*2); g.fill();
      g.beginPath(); g.arc(cx+10, cy+7, 1.2, 0, Math.PI*2); g.fill();
      break;
    }
    case 'deed': {
      // Scrolled paper with ribbon
      g.fillStyle = '#fff7e1'; g.fillRect(cx-12, cy-13, 24, 26);
      g.strokeStyle = '#94734a'; g.lineWidth = 1; g.strokeRect(cx-12, cy-13, 24, 26);
      // Text lines
      g.strokeStyle = '#5a4028'; g.lineWidth = 0.7;
      for (let yy = -9; yy < 8; yy += 3) {
        g.beginPath(); g.moveTo(cx-9, cy+yy); g.lineTo(cx+9, cy+yy); g.stroke();
      }
      // Wax seal
      g.fillStyle = '#d24a4a';
      g.beginPath(); g.arc(cx, cy+10, 4, 0, Math.PI*2); g.fill();
      g.strokeStyle = '#841623'; g.lineWidth = 0.6;
      g.beginPath(); g.arc(cx, cy+10, 4, 0, Math.PI*2); g.stroke();
      break;
    }
    case 'stake': {
      // Wooden stake
      g.fillStyle = '#8a5f3a';
      g.beginPath();
      g.moveTo(cx-3, cy-12); g.lineTo(cx+3, cy-12); g.lineTo(cx+3, cy+6); g.lineTo(cx, cy+14); g.lineTo(cx-3, cy+6); g.closePath();
      g.fill();
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 1; g.stroke();
      // Flag
      g.fillStyle = '#e54a5e';
      g.beginPath();
      g.moveTo(cx+3, cy-12); g.lineTo(cx+14, cy-9); g.lineTo(cx+3, cy-6); g.closePath();
      g.fill();
      break;
    }
    case 'map': {
      // Folded parchment map
      g.fillStyle = '#f0d8a0'; g.fillRect(cx-13, cy-11, 26, 22);
      g.strokeStyle = '#8a6038'; g.lineWidth = 1; g.strokeRect(cx-13, cy-11, 26, 22);
      // Fold creases
      g.strokeStyle = '#c8a070'; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(cx-4, cy-11); g.lineTo(cx-4, cy+11); g.stroke();
      g.beginPath(); g.moveTo(cx+4, cy-11); g.lineTo(cx+4, cy+11); g.stroke();
      // Compass rose
      g.fillStyle = '#d24a4a';
      g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI*2); g.fill();
      // Dashed path
      g.strokeStyle = '#8a4020'; g.lineWidth = 1.2; g.setLineDash([2, 1.5]);
      g.beginPath(); g.moveTo(cx-9, cy+5); g.lineTo(cx+9, cy-5); g.stroke();
      g.setLineDash([]);
      break;
    }
    case 'mallet': {
      // Wooden mallet
      g.fillStyle = '#8a5f3a';
      // Head
      g.fillRect(cx-12, cy-8, 18, 10);
      g.strokeStyle = '#5a3a1a'; g.lineWidth = 1; g.strokeRect(cx-12, cy-8, 18, 10);
      // Handle
      g.fillStyle = '#a07040'; g.fillRect(cx+5, cy-1, 12, 4);
      g.strokeStyle = '#6a4020'; g.lineWidth = 0.8; g.strokeRect(cx+5, cy-1, 12, 4);
      // End grain
      g.fillStyle = '#6a4a2a';
      g.beginPath(); g.arc(cx-6, cy-3, 2, 0, Math.PI*2); g.fill();
      break;
    }
    default: {
      // Generic beautiful colored orb for unmapped items
      const hash = key.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
      const hue = hash % 360;
      glossyBall(g, cx, cy, 12, `hsl(${hue}, 70%, 50%)`, `hsl(${hue}, 80%, 70%)`, `hsl(${hue}, 60%, 30%)`);
      g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(key[0]?.toUpperCase() || '?', cx, cy);
      break;
    }
  }

  return c;
}
