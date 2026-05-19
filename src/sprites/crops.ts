import { makeCanvas } from '../canvas';
import { TILE } from '../constants';

// --- Painterly helpers ---

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

function glossyBall(
  g: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  baseColor: string, highlightColor: string, shadowColor: string,
): void {
  // Main body gradient
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, highlightColor);
  grad.addColorStop(0.6, baseColor);
  grad.addColorStop(1, shadowColor);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  // Specular highlight
  softCircle(g, x - r * 0.3, y - r * 0.3, r * 0.25, '#ffffff', 0.5);
}

function stem(
  g: CanvasRenderingContext2D,
  x: number, y1: number, y2: number,
  color: string, width = 2,
): void {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x, y1);
  g.quadraticCurveTo(x + (Math.random() - 0.5) * 3, (y1 + y2) / 2, x, y2);
  g.stroke();
  g.restore();
}

function leaf(
  g: CanvasRenderingContext2D,
  x: number, y: number,
  size: number, angle: number,
  color: string, lightColor: string,
): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  // Leaf body
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(size * 0.6, -size * 0.4, size, 0);
  g.quadraticCurveTo(size * 0.6, size * 0.4, 0, 0);
  g.fillStyle = color;
  g.globalAlpha = 0.85;
  g.fill();
  // Leaf vein
  g.strokeStyle = lightColor;
  g.lineWidth = 0.5;
  g.globalAlpha = 0.5;
  g.beginPath();
  g.moveTo(1, 0);
  g.lineTo(size - 1, 0);
  g.stroke();
  g.restore();
}

// --- Seedling stage (shared) ---
function drawSeedlings(g: CanvasRenderingContext2D, cx: number, cy: number): void {
  const colors = ['#5ab840', '#4a9a30', '#6cc848'];
  for (let i = 0; i < 4; i++) {
    const sx = cx + (i - 1.5) * 9;
    g.save();
    g.strokeStyle = colors[i % 3]!;
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(sx, cy + 2);
    g.quadraticCurveTo(sx + (i % 2 ? 1 : -1), cy - 2, sx + (i % 2 ? 0.5 : -0.5), cy - 4);
    g.stroke();
    // Tiny leaf
    softCircle(g, sx + (i % 2 ? 1 : -1), cy - 4, 1.5, '#7ed860', 0.7);
    g.restore();
  }
}

// --- Young plant stage (shared) ---
function drawYoungPlant(
  g: CanvasRenderingContext2D, cx: number, cy: number,
  h: number, leafColor = '#4a9a30', lightLeaf = '#7ed860',
): void {
  for (let i = 0; i < 3; i++) {
    const sx = cx + (i - 1) * 10;
    // Stem
    stem(g, sx, cy, cy - h, '#3a7a20', 1.5);
    // Leaf pair
    leaf(g, sx, cy - h * 0.5, 6, -0.6 - i * 0.1, leafColor, lightLeaf);
    leaf(g, sx, cy - h * 0.6, 5, 0.5 + i * 0.1, leafColor, lightLeaf);
    // Tip leaf
    softCircle(g, sx, cy - h - 1, 2, lightLeaf, 0.6);
  }
}

// --- Growing stage (shared) ---
function drawGrowingPlant(
  g: CanvasRenderingContext2D, cx: number, cy: number,
  h: number, leafColor = '#3a8a20', lightLeaf = '#6cc848',
): void {
  for (let i = 0; i < 4; i++) {
    const sx = cx + (i - 1.5) * 8;
    stem(g, sx, cy, cy - h, '#3a7020', 2);
    leaf(g, sx - 1, cy - h * 0.35, 8, -0.5 - i * 0.08, leafColor, lightLeaf);
    leaf(g, sx + 1, cy - h * 0.55, 7, 0.4 + i * 0.1, leafColor, lightLeaf);
    leaf(g, sx, cy - h * 0.75, 6, -0.3, leafColor, lightLeaf);
    softCircle(g, sx, cy - h, 2.5, lightLeaf, 0.5);
  }
}

export function spriteCropStage(cropKey: string, stage: number): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  const cx = TILE / 2;
  const cy = TILE / 2 + 10;

  if (stage === 0) {
    drawSeedlings(g, cx, cy);
    return c;
  }

  switch (cropKey) {
    case 'wheat': {
      const h = [10, 18, 28][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#8a7030', '#c0a040'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#8a7030', '#c0a040'); break; }
      // Stage 3: golden wheat
      for (let i = 0; i < 5; i++) {
        const sx = cx + (i - 2) * 7;
        stem(g, sx, cy, cy - h, '#a08838', 1.8);
        // Wheat head
        const headGrad = g.createLinearGradient(sx - 3, cy - h - 8, sx + 3, cy - h);
        headGrad.addColorStop(0, '#ffe880');
        headGrad.addColorStop(0.5, '#e0c060');
        headGrad.addColorStop(1, '#b09030');
        g.beginPath();
        g.ellipse(sx, cy - h - 3, 3.5, 6, 0, 0, Math.PI * 2);
        g.fillStyle = headGrad;
        g.fill();
        // Awns
        g.strokeStyle = '#c8a040';
        g.lineWidth = 0.6;
        for (let a = 0; a < 3; a++) {
          g.beginPath();
          g.moveTo(sx, cy - h - 3 - a * 3);
          g.lineTo(sx + (a % 2 ? 3 : -3), cy - h - 5 - a * 3);
          g.stroke();
        }
      }
      break;
    }
    case 'corn': {
      const h = [10, 18, 28][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h); break; }
      // Stage 3: tall corn stalks with cobs
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 11;
        stem(g, sx, cy, cy - h, '#3a8020', 2.5);
        // Broad leaves
        leaf(g, sx, cy - h * 0.3, 12, -0.4, '#3a8a20', '#6cc848');
        leaf(g, sx, cy - h * 0.5, 11, 0.35, '#3a8a20', '#6cc848');
        leaf(g, sx, cy - h * 0.7, 10, -0.3, '#4a9a30', '#7ad860');
        // Corn cob
        const cobGrad = g.createLinearGradient(sx - 3, cy - h * 0.5, sx + 3, cy - h * 0.5 + 10);
        cobGrad.addColorStop(0, '#ffe060');
        cobGrad.addColorStop(0.5, '#f0c840');
        cobGrad.addColorStop(1, '#c8a030');
        g.beginPath();
        g.ellipse(sx + 2, cy - h * 0.5 + 2, 3.5, 7, 0.15, 0, Math.PI * 2);
        g.fillStyle = cobGrad;
        g.fill();
        // Husk
        leaf(g, sx - 1, cy - h * 0.5, 6, -0.8, '#5a9a30', '#7ac050');
        leaf(g, sx + 4, cy - h * 0.5 + 4, 5, 0.7, '#5a9a30', '#7ac050');
        // Silk
        g.strokeStyle = '#e8d0a0';
        g.lineWidth = 0.4;
        g.globalAlpha = 0.6;
        g.beginPath();
        g.moveTo(sx + 2, cy - h * 0.5 - 4);
        g.quadraticCurveTo(sx + 5, cy - h * 0.5 - 8, sx + 3, cy - h * 0.5 - 10);
        g.stroke();
        g.globalAlpha = 1;
      }
      break;
    }
    case 'carrot': {
      const h = [8, 14, 18][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a7a20', '#7ac050'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a7a20', '#7ac050'); break; }
      // Stage 3: feathery tops, orange root tips
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 12;
        // Feathery top fronds
        for (let f = 0; f < 5; f++) {
          const angle = -0.8 + f * 0.4;
          leaf(g, sx, cy - 6, 8 + f % 2 * 3, angle, '#3a8a20', '#7ad860');
        }
        // Carrot root visible at soil
        const rootGrad = g.createRadialGradient(sx, cy + 1, 1, sx, cy + 4, 5);
        rootGrad.addColorStop(0, '#ffaa50');
        rootGrad.addColorStop(0.5, '#ff8a30');
        rootGrad.addColorStop(1, '#c06010');
        g.beginPath();
        g.moveTo(sx - 3.5, cy - 1);
        g.quadraticCurveTo(sx - 4, cy + 4, sx, cy + 8);
        g.quadraticCurveTo(sx + 4, cy + 4, sx + 3.5, cy - 1);
        g.closePath();
        g.fillStyle = rootGrad;
        g.fill();
        softCircle(g, sx - 1.5, cy, 1, '#ffffff', 0.3);
      }
      break;
    }
    case 'tomato': {
      const h = [8, 16, 22][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a7a20', '#7ad860'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a7a20', '#7ad860'); break; }
      // Stage 3: vine with red tomatoes
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 10;
        stem(g, sx, cy, cy - h, '#3a7020', 2);
        leaf(g, sx - 2, cy - h * 0.4, 9, -0.5, '#3a8a20', '#6cc848');
        leaf(g, sx + 2, cy - h * 0.6, 8, 0.4, '#3a8a20', '#6cc848');
      }
      // Tomatoes
      const tomPos: [number, number, number][] = [
        [cx - 8, cy - 10, 6], [cx + 6, cy - 14, 5.5], [cx - 1, cy - 6, 5],
      ];
      for (const [tx, ty, tr] of tomPos) {
        glossyBall(g, tx, ty, tr, '#d83030', '#ff6060', '#901818');
        // Calyx (star-shaped green top)
        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2 - Math.PI / 2;
          g.save();
          g.globalAlpha = 0.8;
          g.fillStyle = '#3a8020';
          g.beginPath();
          g.ellipse(tx + Math.cos(a) * 2, ty - tr + Math.sin(a) * 2, 2, 1, a, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
      }
      break;
    }
    case 'pumpkin': {
      const h = [8, 14, 18][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a7a20', '#7ad860'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a7a20', '#7ad860'); break; }
      // Stage 3: big pumpkin with vine
      // Vine
      g.strokeStyle = '#3a7020';
      g.lineWidth = 2;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx - 18, cy - 6);
      g.quadraticCurveTo(cx - 8, cy - 14, cx, cy - 8);
      g.quadraticCurveTo(cx + 8, cy - 2, cx + 16, cy - 6);
      g.stroke();
      // Leaves
      leaf(g, cx - 14, cy - 10, 10, -0.6, '#3a8a20', '#6cc848');
      leaf(g, cx + 12, cy - 8, 9, 0.5, '#3a8a20', '#6cc848');
      // Pumpkin body — ribbed orange
      const pumpGrad = g.createRadialGradient(cx - 3, cy - 2, 3, cx, cy + 2, 14);
      pumpGrad.addColorStop(0, '#ffa040');
      pumpGrad.addColorStop(0.5, '#e87018');
      pumpGrad.addColorStop(1, '#b04810');
      g.beginPath();
      g.ellipse(cx, cy + 2, 14, 10, 0, 0, Math.PI * 2);
      g.fillStyle = pumpGrad;
      g.fill();
      // Ribs
      for (const ribX of [-6, 0, 6]) {
        g.save();
        g.globalAlpha = 0.2;
        g.strokeStyle = '#903808';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cx + ribX, cy - 7);
        g.quadraticCurveTo(cx + ribX + 0.5, cy + 2, cx + ribX, cy + 11);
        g.stroke();
        g.restore();
      }
      // Highlight
      softCircle(g, cx - 5, cy - 3, 4, '#ffc060', 0.3);
      // Stem
      g.fillStyle = '#5a7a20';
      g.beginPath();
      g.ellipse(cx, cy - 9, 2.5, 3, 0, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'strawberry': {
      const h = [8, 12, 16][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a8a20', '#7ae060'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a8a20', '#7ae060'); break; }
      // Stage 3: berries hanging
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 10;
        stem(g, sx, cy, cy - h, '#3a7020', 1.5);
        leaf(g, sx, cy - h * 0.5, 7, -0.4, '#3a8a20', '#6cc848');
        leaf(g, sx, cy - h * 0.7, 6, 0.3, '#3a8a20', '#6cc848');
      }
      // Strawberries
      const berryPos: [number, number][] = [[cx - 8, cy - 4], [cx + 6, cy - 8], [cx, cy - 1]];
      for (const [bx, by] of berryPos) {
        // Berry body
        const bg = g.createRadialGradient(bx - 1, by - 1, 1, bx, by + 1, 5);
        bg.addColorStop(0, '#ff5060');
        bg.addColorStop(0.6, '#e02440');
        bg.addColorStop(1, '#a01828');
        g.beginPath();
        g.moveTo(bx - 4, by - 2);
        g.quadraticCurveTo(bx - 4.5, by + 3, bx, by + 6);
        g.quadraticCurveTo(bx + 4.5, by + 3, bx + 4, by - 2);
        g.closePath();
        g.fillStyle = bg;
        g.fill();
        // Seeds
        g.fillStyle = '#ffe080';
        g.globalAlpha = 0.6;
        for (let s = 0; s < 4; s++) {
          g.beginPath();
          g.arc(bx - 2 + (s % 2) * 4, by + s * 1.5, 0.6, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        // Crown
        for (let l = 0; l < 3; l++) {
          leaf(g, bx - 2 + l * 2, by - 3, 4, -0.6 + l * 0.6, '#3a8020', '#6cc848');
        }
        softCircle(g, bx - 1.5, by - 1, 1.2, '#ffffff', 0.35);
      }
      break;
    }
    case 'sugarcane': {
      const h = [10, 20, 32][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a9030', '#7adf60'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a9030', '#7adf60'); break; }
      // Stage 3: tall jointed canes
      for (let i = 0; i < 4; i++) {
        const sx = cx + (i - 1.5) * 8;
        const caneGrad = g.createLinearGradient(sx - 2, cy, sx + 2, cy - h);
        caneGrad.addColorStop(0, '#3a9030');
        caneGrad.addColorStop(0.5, '#5ab840');
        caneGrad.addColorStop(1, '#7adf60');
        g.strokeStyle = caneGrad;
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(sx, cy);
        g.lineTo(sx, cy - h);
        g.stroke();
        // Joints
        for (let j = 1; j < 4; j++) {
          const jy = cy - h * (j / 4);
          g.save();
          g.globalAlpha = 0.4;
          g.fillStyle = '#d0e8a0';
          g.fillRect(sx - 2, jy - 1, 4, 2);
          g.restore();
        }
        // Soft feathery top
        leaf(g, sx, cy - h, 8, -0.3 + i * 0.2, '#b0e8a0', '#d0ffc0');
      }
      break;
    }
    case 'lavender': {
      const h = [8, 14, 20][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a7020', '#7acf50'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a7020', '#7acf50'); break; }
      // Stage 3: purple flower spikes
      for (let i = 0; i < 5; i++) {
        const sx = cx + (i - 2) * 7;
        stem(g, sx, cy, cy - h + 4, '#5a8a30', 1.2);
        // Flower spike: graduated purple circles
        for (let f = 0; f < 5; f++) {
          const fy = cy - h + 4 - f * 3;
          const fr = 2.5 - f * 0.2;
          const fg = g.createRadialGradient(sx, fy, 0, sx, fy, fr);
          fg.addColorStop(0, '#c898e8');
          fg.addColorStop(0.5, '#a460c8');
          fg.addColorStop(1, '#7038a0');
          g.save();
          g.globalAlpha = 0.8;
          g.beginPath();
          g.arc(sx, fy, fr, 0, Math.PI * 2);
          g.fillStyle = fg;
          g.fill();
          g.restore();
        }
      }
      // Tiny leaves at base
      for (let i = 0; i < 3; i++) {
        leaf(g, cx + (i - 1) * 10, cy - 2, 5, -0.5 + i * 0.5, '#4a8030', '#7ac050');
      }
      break;
    }
    case 'blueberry': {
      const h = [6, 12, 18][stage - 1]!;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h, '#3a6020', '#6cb848'); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h, '#3a6020', '#6cb848'); break; }
      // Stage 3: clusters of blue-purple berries
      for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * 11;
        stem(g, sx, cy, cy - h, '#3a6020', 1.8);
        leaf(g, sx - 2, cy - h * 0.4, 7, -0.5, '#3a7020', '#6cb848');
        leaf(g, sx + 2, cy - h * 0.6, 6, 0.4, '#3a7020', '#6cb848');
      }
      // Berry clusters
      const clusterPos: [number, number][] = [
        [cx - 9, cy - 8], [cx + 7, cy - 12], [cx - 2, cy - 5],
        [cx + 3, cy - 14], [cx - 5, cy - 14],
      ];
      for (const [bx, by] of clusterPos) {
        glossyBall(g, bx, by, 3.5, '#3858b0', '#6080e0', '#202860');
        // Bloom highlight
        softCircle(g, bx - 0.5, by - 1, 1.5, '#a0c0ff', 0.25);
      }
      break;
    }
    default: {
      const h = [8, 14, 18][stage - 1] ?? 8;
      if (stage === 1) { drawYoungPlant(g, cx, cy, h); break; }
      if (stage === 2) { drawGrowingPlant(g, cx, cy, h); break; }
      drawGrowingPlant(g, cx, cy, h);
    }
  }
  return c;
}
