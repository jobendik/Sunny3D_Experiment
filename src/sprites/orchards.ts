import { makeCanvas } from '../canvas';
import { TILE } from '../constants';

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

export function spriteOrchard(type: string, stage: number, withFruit: boolean): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  const cx = TILE / 2;
  const baseY = TILE - 4;

  const trunkH = [10, 18, 26][stage]!;
  const trunkW = [3, 5, 6][stage]!;

  // Soft shadow
  g.save();
  g.globalAlpha = 0.2;
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(cx, baseY + 2, trunkW * 1.5, 3, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // Trunk gradient and shape
  const trunkGrad = g.createLinearGradient(cx - trunkW / 2, 0, cx + trunkW / 2, 0);
  trunkGrad.addColorStop(0, '#5a3a18');
  trunkGrad.addColorStop(0.5, '#7a4f2e');
  trunkGrad.addColorStop(1, '#4a2c10');

  g.fillStyle = trunkGrad;
  g.beginPath();
  g.moveTo(cx - trunkW / 2 + 1, baseY - trunkH);
  g.quadraticCurveTo(cx - trunkW / 2, baseY - trunkH / 2, cx - trunkW / 2 - 1, baseY);
  g.lineTo(cx + trunkW / 2 + 1, baseY);
  g.quadraticCurveTo(cx + trunkW / 2, baseY - trunkH / 2, cx + trunkW / 2 - 1, baseY - trunkH);
  g.closePath();
  g.fill();

  // Bark texture lines
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 0.8;
  for (let i = 1; i < trunkW - 1; i += 2) {
    g.beginPath();
    g.moveTo(cx - trunkW / 2 + i, baseY - trunkH);
    g.quadraticCurveTo(cx - trunkW / 2 + i + (Math.random() - 0.5), baseY - trunkH / 2, cx - trunkW / 2 + i - 0.5, baseY);
    g.stroke();
  }

  // Canopy
  const canopyR = [6, 12, 18][stage]!;
  const baseColor = type === 'appletree' ? '#3a8020' : '#4a9a30';
  const midColor = type === 'appletree' ? '#4a9828' : '#5cb040';
  const lightColor = type === 'appletree' ? '#6cc848' : '#7ec850';

  if (stage === 0) {
    // Stage 0: Sapling, just a few leaves
    softCircle(g, cx, baseY - trunkH, canopyR, midColor);
    softCircle(g, cx - 2, baseY - trunkH - 2, canopyR * 0.8, lightColor);
  } else {
    // Stage 1 & 2: Full canopy built from overlapping circles
    const canopyY = baseY - trunkH - canopyR * 0.4;
    const parts = [
      { dx: 0, dy: 0, r: canopyR, c: baseColor },
      { dx: -canopyR * 0.6, dy: canopyR * 0.2, r: canopyR * 0.7, c: baseColor },
      { dx: canopyR * 0.6, dy: canopyR * 0.2, r: canopyR * 0.7, c: baseColor },

      { dx: -canopyR * 0.3, dy: -canopyR * 0.4, r: canopyR * 0.8, c: midColor },
      { dx: canopyR * 0.3, dy: -canopyR * 0.4, r: canopyR * 0.8, c: midColor },
      { dx: 0, dy: -canopyR * 0.2, r: canopyR * 0.9, c: midColor },

      { dx: -canopyR * 0.2, dy: -canopyR * 0.6, r: canopyR * 0.6, c: lightColor },
      { dx: canopyR * 0.2, dy: -canopyR * 0.6, r: canopyR * 0.6, c: lightColor },
      { dx: 0, dy: -canopyR * 0.4, r: canopyR * 0.7, c: lightColor },
    ];

    for (const p of parts) {
      const puffGrad = g.createRadialGradient(
        cx + p.dx - p.r * 0.2, canopyY + p.dy - p.r * 0.2, p.r * 0.1,
        cx + p.dx, canopyY + p.dy, p.r
      );
      puffGrad.addColorStop(0, lightColor);
      puffGrad.addColorStop(0.6, p.c);
      puffGrad.addColorStop(1, 'rgba(0,0,0,0.15)');

      g.fillStyle = puffGrad;
      g.beginPath();
      g.arc(cx + p.dx, canopyY + p.dy, p.r, 0, Math.PI * 2);
      g.fill();
    }
  }

  if (stage === 2 && withFruit) {
    const fruitColor = type === 'appletree' ? '#d83030' : '#a8c84a';
    const fruitLight = type === 'appletree' ? '#ff6060' : '#d0e870';
    const fruitShadow = type === 'appletree' ? '#901818' : '#7a982a';
    
    const positions: ReadonlyArray<readonly [number, number]> = [
      [-canopyR * 0.6, -canopyR * 0.2],
      [canopyR * 0.5, -canopyR * 0.3],
      [0, -canopyR * 0.5],
      [-canopyR * 0.3, canopyR * 0.3],
      [canopyR * 0.4, canopyR * 0.4],
      [canopyR * 0.1, canopyR * 0.1]
    ];
    
    for (const [dx, dy] of positions) {
      const fx = cx + dx;
      const fy = baseY - trunkH - canopyR * 0.4 + dy;
      
      // Stem
      g.strokeStyle = '#5a3a18';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(fx, fy - 3); g.lineTo(fx + 1, fy - 5); g.stroke();
      
      const fGrad = g.createRadialGradient(fx - 1, fy - 1, 0.5, fx, fy, 3);
      fGrad.addColorStop(0, fruitLight);
      fGrad.addColorStop(0.6, fruitColor);
      fGrad.addColorStop(1, fruitShadow);
      
      g.fillStyle = fGrad;
      g.beginPath();
      if (type === 'appletree') {
        g.arc(fx, fy, 3, 0, Math.PI * 2);
      } else {
        // Pear shape
        g.ellipse(fx, fy + 1, 2.5, 3.5, 0, 0, Math.PI * 2);
        g.ellipse(fx, fy - 1, 1.8, 2.5, 0, 0, Math.PI * 2);
      }
      g.fill();
      
      // Specular highlight
      softCircle(g, fx - 1, fy - 1, 1, '#fff', 0.6);
    }
  }

  return c;
}
