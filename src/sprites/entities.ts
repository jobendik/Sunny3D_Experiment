import { makeCanvas } from '../canvas';

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

function eye(
  g: CanvasRenderingContext2D, x: number, y: number, r: number,
  irisColor = '#2a1808',
): void {
  softCircle(g, x, y, r, '#fff', 0.95);
  softCircle(g, x + r * 0.1, y + r * 0.1, r * 0.6, irisColor, 0.9);
  softCircle(g, x + r * 0.15, y + r * 0.1, r * 0.3, '#000', 1);
  softCircle(g, x - r * 0.2, y - r * 0.2, r * 0.25, '#fff', 0.8);
}

export function spriteCrow(frame: number): HTMLCanvasElement {
  const c = makeCanvas(32, 32);
  const g = c.getContext('2d')!;
  const cx = 16;
  const cy = 18;
  const bob = frame ? -2 : 0;

  // Shadow
  g.save();
  g.globalAlpha = 0.2;
  g.beginPath();
  g.ellipse(cx, cy + 8, 6, 2, 0, 0, Math.PI * 2);
  g.fillStyle = '#000';
  g.fill();
  g.restore();

  // Legs
  g.strokeStyle = '#444';
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx - 2, cy + 4 + bob); g.lineTo(cx - 2, cy + 8); g.stroke();
  g.beginPath(); g.moveTo(cx + 2, cy + 4 + bob); g.lineTo(cx + 2, cy + 8); g.stroke();

  // Body gradient (sleek black with purple/blue iridescent sheen)
  const bodyGrad = g.createRadialGradient(cx + 2, cy - 2 + bob, 1, cx, cy + bob, 8);
  bodyGrad.addColorStop(0, '#383048'); // iridescent sheen
  bodyGrad.addColorStop(0.5, '#1a1a1a');
  bodyGrad.addColorStop(1, '#0a0a0a');

  g.fillStyle = bodyGrad;
  g.beginPath(); g.ellipse(cx, cy + bob, 8, 6, 0, 0, Math.PI * 2); g.fill();

  // Head
  const headGrad = g.createRadialGradient(cx + 5, cy - 6 + bob, 1, cx + 5, cy - 5 + bob, 4);
  headGrad.addColorStop(0, '#2a2a30');
  headGrad.addColorStop(1, '#1a1a1a');
  g.fillStyle = headGrad;
  g.beginPath(); g.ellipse(cx + 5, cy - 5 + bob, 4, 4, 0, 0, Math.PI * 2); g.fill();

  // Beak
  g.fillStyle = '#ff8020';
  g.beginPath();
  g.moveTo(cx + 9, cy - 5 + bob);
  g.quadraticCurveTo(cx + 12, cy - 6 + bob, cx + 14, cy - 4 + bob);
  g.quadraticCurveTo(cx + 12, cy - 3 + bob, cx + 9, cy - 3 + bob);
  g.closePath(); g.fill();

  // Eye
  softCircle(g, cx + 6, cy - 6 + bob, 1.2, '#fff', 0.9);
  softCircle(g, cx + 6.5, cy - 6 + bob, 0.6, '#d00', 1); // red beady eye
  softCircle(g, cx + 6.2, cy - 6.2 + bob, 0.4, '#fff', 0.8); // highlight

  // Wing (spread slightly different per frame)
  g.fillStyle = '#111';
  if (frame === 0) {
    g.beginPath();
    g.ellipse(cx - 3, cy - 2 + bob, 6, 3, -0.4, 0, Math.PI * 2);
    g.fill();
    // Wing highlight
    g.strokeStyle = '#333';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 6, cy - 3 + bob); g.quadraticCurveTo(cx - 3, cy - 4 + bob, cx, cy - 2 + bob); g.stroke();
  } else {
    g.beginPath();
    g.ellipse(cx - 4, cy - 5 + bob, 7, 3, -0.8, 0, Math.PI * 2);
    g.fill();
    // Wing highlight
    g.strokeStyle = '#333';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 7, cy - 7 + bob); g.quadraticCurveTo(cx - 4, cy - 7 + bob, cx - 1, cy - 4 + bob); g.stroke();
  }

  // Tail
  g.fillStyle = '#0a0a0a';
  g.beginPath();
  g.moveTo(cx - 6, cy + 2 + bob);
  g.lineTo(cx - 12, cy + 6 + bob);
  g.lineTo(cx - 8, cy + bob);
  g.fill();

  return c;
}

export function spriteDog(frame: number): HTMLCanvasElement {
  const c = makeCanvas(48, 40);
  const g = c.getContext('2d')!;
  const cx = 24;
  const cy = 22;
  const bob = frame ? -1 : 0;

  // Shadow
  g.save();
  g.globalAlpha = 0.2;
  g.beginPath();
  g.ellipse(cx, cy + 10, 14, 4, 0, 0, Math.PI * 2);
  g.fillStyle = '#000';
  g.fill();
  g.restore();

  const furColor = '#d09858';
  const furLight = '#f0bc70';
  const furDark = '#a87038';

  // Back legs
  g.fillStyle = furDark;
  g.beginPath(); g.ellipse(cx - 7, cy + 6, 2.5, 4 + (frame ? 1 : 0), 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 4, cy + 6, 2.5, 4 + (frame ? 1 : 0), 0, 0, Math.PI * 2); g.fill();

  // Tail (wagging)
  g.strokeStyle = furColor;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 10, cy - 2 + bob);
  if (frame) {
    g.quadraticCurveTo(cx - 16, cy - 8 + bob, cx - 14, cy - 12 + bob);
  } else {
    g.quadraticCurveTo(cx - 16, cy + bob, cx - 18, cy - 4 + bob);
  }
  g.stroke();

  // Body gradient
  const bodyGrad = g.createRadialGradient(cx + 2, cy - 2 + bob, 2, cx, cy + bob, 14);
  bodyGrad.addColorStop(0, furLight);
  bodyGrad.addColorStop(0.6, furColor);
  bodyGrad.addColorStop(1, furDark);

  g.fillStyle = bodyGrad;
  g.beginPath(); g.ellipse(cx, cy + bob, 12, 8, 0, 0, Math.PI * 2); g.fill();

  // Neck/Chest
  const chestGrad = g.createRadialGradient(cx + 10, cy - 2 + bob, 1, cx + 10, cy - 4 + bob, 8);
  chestGrad.addColorStop(0, '#fff4e0');
  chestGrad.addColorStop(1, furColor);
  g.fillStyle = chestGrad;
  g.beginPath(); g.ellipse(cx + 8, cy - 2 + bob, 6, 6, 0, 0, Math.PI * 2); g.fill();

  // Front legs
  g.fillStyle = furColor;
  g.beginPath(); g.ellipse(cx - 2, cy + 6, 2.5, 4 - (frame ? 1 : 0), 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + 9, cy + 6, 2.5, 4 - (frame ? 1 : 0), 0, 0, Math.PI * 2); g.fill();

  // Head
  const headGrad = g.createRadialGradient(cx + 12, cy - 6 + bob, 2, cx + 10, cy - 4 + bob, 8);
  headGrad.addColorStop(0, furLight);
  headGrad.addColorStop(0.7, furColor);
  headGrad.addColorStop(1, furDark);
  g.fillStyle = headGrad;
  g.beginPath(); g.ellipse(cx + 10, cy - 6 + bob, 7, 6, 0, 0, Math.PI * 2); g.fill();

  // Snout
  g.fillStyle = '#f0dfc8';
  g.beginPath(); g.ellipse(cx + 15, cy - 4 + bob, 4, 3, 0, 0, Math.PI * 2); g.fill();

  // Nose
  g.fillStyle = '#3a2410';
  g.beginPath(); g.ellipse(cx + 17, cy - 5 + bob, 1.5, 1, 0, 0, Math.PI * 2); g.fill();

  // Tongue (visible when panting/running)
  if (frame) {
    g.fillStyle = '#e86060';
    g.beginPath(); g.ellipse(cx + 15, cy - 2 + bob, 1.5, 2, Math.PI / 4, 0, Math.PI * 2); g.fill();
  }

  // Eye
  eye(g, cx + 13, cy - 7 + bob, 1.5);

  // Floppy ear
  const earGrad = g.createRadialGradient(cx + 8, cy - 4 + bob, 1, cx + 7, cy - 4 + bob, 6);
  earGrad.addColorStop(0, furDark);
  earGrad.addColorStop(1, '#684020');
  g.fillStyle = earGrad;
  g.beginPath();
  g.moveTo(cx + 8, cy - 8 + bob);
  g.quadraticCurveTo(cx + 10, cy - 2 + bob, cx + 7, cy + bob);
  g.quadraticCurveTo(cx + 4, cy - 2 + bob, cx + 6, cy - 6 + bob);
  g.fill();

  return c;
}

export function spriteDecorTree(): HTMLCanvasElement {
  const c = makeCanvas(80, 100);
  const g = c.getContext('2d')!;

  const cx = 40;
  const baseY = 92;

  // Shadow
  g.save();
  g.globalAlpha = 0.2;
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(cx, baseY, 18, 5, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // Trunk gradient
  const trunkGrad = g.createLinearGradient(cx - 6, 0, cx + 6, 0);
  trunkGrad.addColorStop(0, '#4a2c18');
  trunkGrad.addColorStop(0.5, '#6a4428');
  trunkGrad.addColorStop(1, '#3a2010');

  g.fillStyle = trunkGrad;
  g.beginPath();
  g.moveTo(cx - 4, baseY - 40);
  g.quadraticCurveTo(cx - 3, baseY - 20, cx - 6, baseY - 2);
  g.lineTo(cx + 6, baseY - 2);
  g.quadraticCurveTo(cx + 3, baseY - 20, cx + 4, baseY - 40);
  g.fill();

  // Bark texture (vertical lines)
  g.strokeStyle = 'rgba(0,0,0,0.15)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(cx - 3 + i * 2, baseY - 38);
    g.quadraticCurveTo(cx - 3 + i * 2 + (Math.random() - 0.5) * 2, baseY - 20, cx - 4 + i * 2.5, baseY - 2);
    g.stroke();
  }

  // Canopy: overlapping circles for soft, cloudy foliage
  const leafColors = ['#2a6020', '#3a8030', '#4a9838', '#5cb040', '#7ec850'];

  const canopyParts: [number, number, number, number][] = [
    // [dx, dy, radius, colorIndex]
    [0, -40, 26, 0],   // back/base
    [-12, -45, 18, 1],
    [12, -45, 18, 1],
    [0, -55, 20, 1],

    [-18, -35, 16, 2],
    [18, -35, 16, 2],
    [-8, -60, 16, 2],
    [8, -60, 16, 2],

    [-10, -38, 14, 3],
    [10, -38, 14, 3],
    [0, -48, 16, 3],

    [-5, -45, 12, 4],  // highlights
    [5, -52, 10, 4],
  ];

  for (const [dx, dy, r, colorIdx] of canopyParts) {
    const ccx = cx + dx;
    const ccy = baseY + dy;

    // Create a radial gradient for each foliage puff
    const color = leafColors[colorIdx]!;
    // Lighter highlight color by shifting hue/lightness slightly (simulated)
    const lightColor = leafColors[Math.min(colorIdx + 1, leafColors.length - 1)]!;

    const puffGrad = g.createRadialGradient(ccx - r * 0.2, ccy - r * 0.2, r * 0.1, ccx, ccy, r);
    puffGrad.addColorStop(0, lightColor);
    puffGrad.addColorStop(0.7, color);
    puffGrad.addColorStop(1, 'rgba(0,0,0,0.2)'); // Self-shadowing edge

    g.fillStyle = puffGrad;
    g.beginPath();
    g.arc(ccx, ccy, r, 0, Math.PI * 2);
    g.fill();
  }

  return c;
}
