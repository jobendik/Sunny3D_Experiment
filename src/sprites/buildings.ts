import { makeCanvas } from '../canvas';
import { TILE } from '../constants';
import { BUILDINGS } from '../data/buildings';

function roundedRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function drawWoodPlanks(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, shadow: string, plankHeight: number) {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
  g.fillStyle = shadow;
  for (let py = y + plankHeight; py < y + h; py += plankHeight) {
    g.fillRect(x, py, w, 1);
  }
}

export function spriteBuilding(type: string): HTMLCanvasElement {
  const def = BUILDINGS[type]!;
  const W = def.w * TILE;
  const H = def.h * TILE;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;

  if (def.kind === 'pen') {
    // Soft grass interior
    const grassGrad = g.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.7);
    grassGrad.addColorStop(0, '#7ec850');
    grassGrad.addColorStop(1, '#6bb33e');
    g.fillStyle = grassGrad;
    g.fillRect(6, 6, W - 12, H - 12);
    
    // Fence shadow
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 4;
    roundedRect(g, 7, 7, W - 10, H - 10, 4);
    g.stroke();

    // Fence rails
    g.strokeStyle = '#8a5a30';
    g.lineWidth = 4;
    roundedRect(g, 6, 6, W - 12, H - 12, 4);
    g.stroke();
    // Inner rail
    g.strokeStyle = '#7a4f2e';
    g.lineWidth = 2;
    roundedRect(g, 10, 10, W - 20, H - 20, 2);
    g.stroke();

    // Fence posts
    g.fillStyle = '#6a4420';
    for (let p = 0; p <= def.w; p++) {
      const px = 4 + p * (W - 8) / def.w;
      g.fillRect(px, 2, 6, 10);
      g.fillStyle = '#5a3a18'; g.fillRect(px + 4, 2, 2, 10); // post shadow
      g.fillStyle = '#6a4420';
      
      g.fillRect(px, H - 12, 6, 10);
      g.fillStyle = '#5a3a18'; g.fillRect(px + 4, H - 12, 2, 10);
      g.fillStyle = '#6a4420';
    }
    for (let p = 0; p <= def.h; p++) {
      const py = 4 + p * (H - 8) / def.h;
      g.fillRect(2, py, 10, 6);
      g.fillStyle = '#5a3a18'; g.fillRect(2, py + 4, 10, 2);
      g.fillStyle = '#6a4420';
      
      g.fillRect(W - 12, py, 10, 6);
      g.fillStyle = '#5a3a18'; g.fillRect(W - 12, py + 4, 10, 2);
      g.fillStyle = '#6a4420';
    }

    // Gate opening
    g.fillStyle = '#7ec850'; // override bottom rail
    g.fillRect(W / 2 - 16, H - 14, 32, 14);

    // Small shelter
    const sx = W - 48, sy = 10, sw = 36, sh = 34;
    
    // Shelter shadow
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(sx - 2, sy + 2, sw + 4, sh + 4);
    
    // Shelter body
    drawWoodPlanks(g, sx, sy + 10, sw, sh - 10, '#8a5a30', '#6a4420', 4);
    
    // Shelter roof
    const roofGrad = g.createLinearGradient(sx, sy, sx, sy + 18);
    roofGrad.addColorStop(0, '#d24a4a');
    roofGrad.addColorStop(1, '#a02828');
    g.fillStyle = roofGrad;
    g.beginPath();
    g.moveTo(sx - 4, sy + 14);
    g.lineTo(sx + sw / 2, sy - 2);
    g.lineTo(sx + sw + 4, sy + 14);
    g.closePath();
    g.fill();
    // Roof trim
    g.strokeStyle = '#7a2020';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx - 4, sy + 14); g.lineTo(sx + sw / 2, sy - 2); g.lineTo(sx + sw + 4, sy + 14); g.stroke();

    // Shelter door (dark interior)
    g.fillStyle = '#2a1810';
    g.beginPath();
    g.moveTo(sx + 10, sy + 34);
    g.lineTo(sx + 10, sy + 20);
    g.quadraticCurveTo(sx + sw/2, sy + 16, sx + sw - 10, sy + 20);
    g.lineTo(sx + sw - 10, sy + 34);
    g.fill();

  } else if (def.kind === 'production') {
    // Foundation shadow
    g.fillStyle = 'rgba(0,0,0,0.2)';
    roundedRect(g, 4, 28, W - 8, H - 26, 6);
    g.fill();

    // Foundation stone
    const foundGrad = g.createLinearGradient(0, H - 20, 0, H);
    foundGrad.addColorStop(0, '#9a8a7a');
    foundGrad.addColorStop(1, '#6a5a4a');
    g.fillStyle = foundGrad;
    roundedRect(g, 6, H - 20, W - 12, 18, 4);
    g.fill();
    // Stone pattern
    g.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 10; i < W - 10; i += 14) {
      g.fillRect(i, H - 18, 1, 14);
      g.fillRect(i - 7, H - 11, 14, 1);
    }

    let bodyColor: string, roofColor: string, sign: string;
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

    // Building body
    const bodyGrad = g.createLinearGradient(6, 30, 6, H - 20);
    bodyGrad.addColorStop(0, bodyColor);
    // Darken bodyColor for bottom gradient
    const n = parseInt(bodyColor.replace('#', ''), 16);
    const dr = Math.max(0, ((n >> 16) & 0xff) - 40);
    const dg = Math.max(0, ((n >> 8) & 0xff) - 40);
    const db = Math.max(0, (n & 0xff) - 40);
    bodyGrad.addColorStop(1, `rgb(${dr},${dg},${db})`);
    
    drawWoodPlanks(g, 6, 30, W - 12, H - 50, bodyColor, 'rgba(0,0,0,0.08)', 6);

    // Chimney
    g.fillStyle = '#8a5a30';
    g.fillRect(W - 20, 10, 10, 20);
    g.fillStyle = '#6a4420'; // brick lines
    for(let i=12; i<30; i+=4) g.fillRect(W-20, i, 10, 1);
    g.fillStyle = '#3a2410'; // hole
    g.beginPath(); g.ellipse(W - 15, 10, 4, 2, 0, 0, Math.PI * 2); g.fill();

    // Roof
    const rGrad = g.createLinearGradient(0, 4, 0, 36);
    rGrad.addColorStop(0, roofColor);
    const rN = parseInt(roofColor.replace('#', ''), 16);
    rGrad.addColorStop(1, `rgb(${Math.max(0, ((rN >> 16) & 0xff) - 50)},${Math.max(0, ((rN >> 8) & 0xff) - 50)},${Math.max(0, (rN & 0xff) - 50)})`);
    
    g.fillStyle = rGrad;
    g.beginPath();
    g.moveTo(2, 36);
    g.quadraticCurveTo(W / 2, 4, W - 2, 36);
    g.closePath();
    g.fill();
    // Roof trim / shingles hint
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    for (let i = 10; i < 36; i += 6) {
      g.beginPath(); g.moveTo(4, i); g.quadraticCurveTo(W / 2, i - 28, W - 4, i); g.stroke();
    }

    // Door
    g.fillStyle = '#4a2c18';
    g.beginPath();
    g.moveTo(W / 2 - 10, H - 20);
    g.lineTo(W / 2 - 10, H - 40);
    g.quadraticCurveTo(W / 2, -10 + H - 40, W / 2 + 10, H - 40);
    g.lineTo(W / 2 + 10, H - 20);
    g.fill();
    g.fillStyle = '#c8961d'; // Knob
    g.beginPath(); g.arc(W / 2 + 6, H - 30, 2, 0, Math.PI * 2); g.fill();

    // Windows
    const winGrad = g.createLinearGradient(12, H - 52, 12, H - 40);
    winGrad.addColorStop(0, '#bce8ff');
    winGrad.addColorStop(1, '#a0d0e0');
    
    g.fillStyle = '#3a2410'; // frames
    roundedRect(g, 10, H - 54, 16, 16, 2); g.fill();
    roundedRect(g, W - 26, H - 54, 16, 16, 2); g.fill();
    
    g.fillStyle = winGrad; // glass
    g.fillRect(12, H - 52, 12, 12);
    g.fillRect(W - 24, H - 52, 12, 12);
    
    g.fillStyle = '#3a2410'; // mullions
    g.fillRect(17, H - 52, 2, 12);
    g.fillRect(12, H - 47, 12, 2);
    g.fillRect(W - 19, H - 52, 2, 12);
    g.fillRect(W - 24, H - 47, 12, 2);

    // Specular glass highlight
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(13, H - 42); g.lineTo(23, H - 51); g.stroke();
    g.beginPath(); g.moveTo(W - 23, H - 42); g.lineTo(W - 13, H - 51); g.stroke();

    // Sign
    g.fillStyle = '#3a2410';
    g.fillRect(W / 2 - 12, 36, 24, 16);
    g.fillStyle = '#e0c090';
    g.fillRect(W / 2 - 11, 37, 22, 14);
    g.fillStyle = '#3a2410';
    g.font = 'bold 12px sans-serif';
    g.textAlign = 'center';
    g.fillText(sign, W / 2, 48);

  } else if (def.kind === 'fishing') {
    // Water background
    const waterGrad = g.createRadialGradient(W/2, H/2, 10, W/2, H/2, Math.max(W,H));
    waterGrad.addColorStop(0, '#5ab0d8');
    waterGrad.addColorStop(1, '#2870a0');
    g.fillStyle = waterGrad;
    g.fillRect(0, 0, W, H);
    
    // Water ripples
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.ellipse(20 + i * 15, 30 + (i % 3) * 15, 8, 2, 0, 0, Math.PI * 2);
      g.stroke();
    }

    // Dock shadow
    g.fillStyle = 'rgba(0,0,0,0.3)';
    roundedRect(g, W / 2 - 30, H - 40, 60, 24, 2); g.fill();

    // Dock platform
    drawWoodPlanks(g, W / 2 - 32, H - 44, 64, 24, '#a87248', '#7a4f2e', 6);
    
    // Dock posts
    g.fillStyle = '#5a3a18';
    g.fillRect(W / 2 - 28, H - 48, 8, 16);
    g.fillRect(W / 2 + 20, H - 48, 8, 16);
    // Post tops
    g.fillStyle = '#7a4f2e';
    g.beginPath(); g.ellipse(W / 2 - 24, H - 48, 4, 2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(W / 2 + 24, H - 48, 4, 2, 0, 0, Math.PI * 2); g.fill();
    
    // Post reflections
    g.fillStyle = 'rgba(40,110,160,0.5)';
    g.fillRect(W / 2 - 28, H - 20, 8, 10);
    g.fillRect(W / 2 + 20, H - 20, 8, 10);

    // Small pier extending out
    g.fillStyle = '#7a4f2e';
    g.fillRect(W / 2 - 8, H - 60, 16, 16);
    g.fillStyle = '#5a3a18';
    g.fillRect(W / 2 - 2, H - 60, 4, 30); // support beam
    
    // Fishing rod
    g.strokeStyle = '#3a2410'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W / 2 + 8, H - 58); g.quadraticCurveTo(W / 2 + 20, H - 70, W / 2 + 30, H - 72); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; // line
    g.beginPath(); g.moveTo(W / 2 + 30, H - 72); g.lineTo(W / 2 + 30, H - 30); g.stroke();
    
    // Bobber
    g.fillStyle = '#d83030';
    g.beginPath(); g.arc(W / 2 + 30, H - 28, 3.5, 0, Math.PI * 2); g.fill();
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

  // Soft grass background
  const grassGrad = g.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.7);
  grassGrad.addColorStop(0, '#7ec850');
  grassGrad.addColorStop(1, '#6bb33e');
  g.fillStyle = grassGrad;
  g.fillRect(0, 0, W, H);

  // Pond
  const pondGrad = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.4);
  pondGrad.addColorStop(0, '#3a90c0');
  pondGrad.addColorStop(1, '#5ab0d8');
  
  g.fillStyle = '#a89868'; // sand edge
  g.beginPath(); g.ellipse(W / 2, H / 2, W * 0.42, H * 0.42, 0, 0, Math.PI * 2); g.fill();
  
  g.fillStyle = pondGrad;
  g.beginPath(); g.ellipse(W / 2, H / 2, W * 0.38, H * 0.38, 0, 0, Math.PI * 2); g.fill();

  // Ripples
  g.strokeStyle = 'rgba(255,255,255,0.3)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(W / 2 - 30 + i * 15, H / 2 - 10 + (i % 2) * 20, 6, 2, 0, 0, Math.PI * 2);
    g.stroke();
  }

  // Lily pads
  g.fillStyle = '#3a7a30';
  for (let i = 0; i < 4; i++) {
    const lx = 30 + i * 30;
    const ly = H / 2 + (i % 2 === 0 ? 25 : -25);
    g.beginPath(); g.ellipse(lx, ly, 12, 8, i * 0.5, 0, Math.PI * 2); g.fill();
    // Slice missing
    g.fillStyle = pondGrad;
    g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 13, i * 0.5, i * 0.5 + 0.8); g.fill();
    g.fillStyle = '#3a7a30';
  }

  // Flower
  g.fillStyle = '#ff9ed4';
  g.beginPath(); g.arc(35, H / 2 + 20, 4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffe070';
  g.beginPath(); g.arc(35, H / 2 + 20, 2, 0, Math.PI * 2); g.fill();

  // Reeds
  g.strokeStyle = '#5cb040';
  g.lineWidth = 2;
  g.lineCap = 'round';
  for(let i=0; i<3; i++) {
    const rx = W - 25 + i * 5;
    g.beginPath(); g.moveTo(rx, H/2 - 10); g.quadraticCurveTo(rx + 5, H/2 - 20, rx + 10, H/2 - 30); g.stroke();
    // Cattail head
    g.fillStyle = '#6a4420';
    g.beginPath(); g.ellipse(rx + 8, H/2 - 25, 2, 6, 0.4, 0, Math.PI * 2); g.fill();
  }

  return c;
}
