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
