import { makeCanvas } from '../canvas';
import { ANIMALS } from '../data/animals';

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

function gradEllipse(
  g: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  base: string, highlight: string, shadow: string,
  rotation = 0,
): void {
  g.save();
  const grad = g.createRadialGradient(x - rx * 0.25, y - ry * 0.25, rx * 0.1, x, y, Math.max(rx, ry));
  grad.addColorStop(0, highlight);
  grad.addColorStop(0.6, base);
  grad.addColorStop(1, shadow);
  g.beginPath();
  g.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  g.fillStyle = grad;
  g.fill();
  g.restore();
}

function eye(
  g: CanvasRenderingContext2D, x: number, y: number, r: number,
  irisColor = '#2a1808',
): void {
  // White
  softCircle(g, x, y, r, '#fff', 0.95);
  // Iris
  softCircle(g, x + r * 0.1, y + r * 0.1, r * 0.6, irisColor, 0.9);
  // Pupil
  softCircle(g, x + r * 0.15, y + r * 0.1, r * 0.3, '#000', 1);
  // Specular
  softCircle(g, x - r * 0.2, y - r * 0.2, r * 0.25, '#fff', 0.8);
}

function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number): void {
  g.save();
  g.globalAlpha = 0.18;
  g.beginPath();
  g.ellipse(x, y, rx, rx * 0.25, 0, 0, Math.PI * 2);
  g.fillStyle = '#1a1a1a';
  g.fill();
  g.restore();
}

export function spriteAnimal(kind: string, frame: number): HTMLCanvasElement {
  const cfg = ANIMALS[kind]!.body;
  const W = 64;
  const H = 64;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d')!;
  const cx = W / 2;
  const baseY = 50;
  // 4-frame walk cycle: 0=idle stand, 1=mid-step up, 2=cross step, 3=mid-step down
  // body bobs in a sine wave, legs alternate diagonally for a real walk.
  const t = (frame % 4) / 4;
  const bob = Math.round(Math.sin(t * Math.PI * 2) * -2);
  const legAFwd = Math.round(Math.sin(t * Math.PI * 2) * 2);   // front-left + back-right
  const legBFwd = Math.round(Math.sin((t + 0.5) * Math.PI * 2) * 2); // opposite pair
  const tailWag = Math.round(Math.sin(t * Math.PI * 2 + 0.3) * 2);
  // Backwards-compat: legY ~ legAFwd for the chicken/duck (which use 2 legs).
  const legY = legAFwd;

  // Ground shadow
  shadow(g, cx, baseY + 6, cfg.w * 0.4);

  // --- Color helpers: lighten/darken base colors ---
  const lighter = (hex: string, amt = 30): string => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((n >> 16) & 0xff) + amt);
    const gr = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${gr},${b})`;
  };
  const darker = (hex: string, amt = 40): string => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - amt);
    const gr = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${gr},${b})`;
  };

  if (kind === 'chicken') {
    // Legs
    g.strokeStyle = cfg.accent;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 4, baseY - 2 + legY);
    g.lineTo(cx - 5, baseY + 4);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 4, baseY - 2 - legY);
    g.lineTo(cx + 5, baseY + 4);
    g.stroke();

    // Body — fluffy round
    gradEllipse(g, cx, baseY - 8 + bob, cfg.w * 0.45, cfg.h * 0.5,
      cfg.color, lighter(cfg.color), darker(cfg.color));

    // Wing
    gradEllipse(g, cx - 5, baseY - 6 + bob, 7, 5,
      darker(cfg.color, 15), cfg.color, darker(cfg.color, 30), -0.3);

    // Head
    gradEllipse(g, cx + 8, baseY - 16 + bob, 7, 6.5,
      cfg.color, lighter(cfg.color), darker(cfg.color));

    // Comb (3 soft bumps)
    g.fillStyle = cfg.accent;
    softCircle(g, cx + 6, baseY - 22 + bob, 2.5, cfg.accent, 0.85);
    softCircle(g, cx + 9, baseY - 23 + bob, 2.5, cfg.accent, 0.85);
    softCircle(g, cx + 12, baseY - 22 + bob, 2.5, cfg.accent, 0.85);

    // Beak
    g.fillStyle = cfg.beak;
    g.beginPath();
    g.moveTo(cx + 14, baseY - 15 + bob);
    g.quadraticCurveTo(cx + 19, baseY - 14 + bob, cx + 14, baseY - 13 + bob);
    g.closePath();
    g.fill();

    // Eye
    eye(g, cx + 11, baseY - 16 + bob, 2);

    // Tail feathers
    for (let i = 0; i < 3; i++) {
      g.save();
      g.globalAlpha = 0.7;
      g.strokeStyle = darker(cfg.color, 20);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx - 8, baseY - 8 + bob);
      g.quadraticCurveTo(cx - 14, baseY - 12 - i * 3 + bob, cx - 12 - i, baseY - 16 - i * 2 + bob);
      g.stroke();
      g.restore();
    }

  } else if (kind === 'cow') {
    // Legs — front-left + back-right move together (legAFwd), the other pair on legBFwd
    const legPositions = [-0.3, -0.05, 0.1, 0.3];
    const legPhases = [legAFwd, legBFwd, legAFwd, legBFwd];
    for (let i = 0; i < 4; i++) {
      const lx = cx + cfg.w * legPositions[i]!;
      const lOff = legPhases[i]!;
      g.save();
      g.strokeStyle = cfg.accent;
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(lx, baseY - 4 + lOff);
      g.lineTo(lx, baseY + 4);
      g.stroke();
      g.restore();
    }

    // Body
    gradEllipse(g, cx, baseY - 12 + bob, cfg.w * 0.5, cfg.h * 0.5,
      cfg.color, lighter(cfg.color, 20), darker(cfg.color));

    // Patches
    softCircle(g, cx - 6, baseY - 14 + bob, 5, cfg.accent, 0.5);
    softCircle(g, cx + 4, baseY - 10 + bob, 4, cfg.accent, 0.45);
    softCircle(g, cx - 2, baseY - 8 + bob, 3, cfg.accent, 0.4);

    // Head
    gradEllipse(g, cx + 16, baseY - 16 + bob, 9, 7,
      cfg.color, lighter(cfg.color, 20), darker(cfg.color));

    // Snout
    gradEllipse(g, cx + 20, baseY - 13 + bob, 5, 4,
      cfg.beak, lighter(cfg.beak, 30), darker(cfg.beak, 20));
    // Nostrils
    softCircle(g, cx + 19, baseY - 13 + bob, 0.8, '#704040', 0.7);
    softCircle(g, cx + 22, baseY - 13 + bob, 0.8, '#704040', 0.7);

    // Horns
    g.strokeStyle = '#e8d8b0';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + 12, baseY - 20 + bob);
    g.quadraticCurveTo(cx + 10, baseY - 26 + bob, cx + 12, baseY - 28 + bob);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 18, baseY - 20 + bob);
    g.quadraticCurveTo(cx + 20, baseY - 26 + bob, cx + 18, baseY - 28 + bob);
    g.stroke();

    // Eye
    eye(g, cx + 14, baseY - 18 + bob, 2);

    // Tail (wags with tailWag)
    g.strokeStyle = cfg.color;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - cfg.w * 0.45, baseY - 12 + bob);
    g.quadraticCurveTo(cx - cfg.w * 0.55 + tailWag, baseY - 6 + bob, cx - cfg.w * 0.5 + tailWag * 2, baseY - 2 + bob);
    g.stroke();
    softCircle(g, cx - cfg.w * 0.5 + tailWag * 2, baseY - 2 + bob, 2, cfg.accent, 0.7);

  } else if (kind === 'sheep') {
    // Legs (dark) — same alternating-pair walk
    const sheepPhases = [legAFwd, legBFwd, legAFwd, legBFwd];
    for (let i = 0; i < 4; i++) {
      const lx = cx - 6 + i * 4;
      const lOff = sheepPhases[i]!;
      g.strokeStyle = cfg.accent;
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(lx, baseY - 4 + lOff);
      g.lineTo(lx, baseY + 4);
      g.stroke();
    }

    // Wool body: cloud-like cluster of overlapping circles
    const woolPositions: [number, number, number][] = [
      [-8, -10, 7.5], [0, -13, 8.5], [8, -10, 7.5],
      [-4, -6, 7], [4, -6, 7], [0, -8, 6],
    ];
    for (const [dx, dy, r] of woolPositions) {
      gradEllipse(g, cx + dx, baseY + dy + bob, r, r,
        cfg.color, '#ffffff', '#d0c8b8');
    }
    // Wool texture dots
    for (let i = 0; i < 8; i++) {
      const wx = cx - 10 + Math.random() * 20;
      const wy = baseY - 16 + Math.random() * 14 + bob;
      softCircle(g, wx, wy, 2, '#f0e8d8', 0.25);
    }

    // Head (dark face)
    gradEllipse(g, cx + 14, baseY - 12 + bob, 6, 6,
      cfg.accent, lighter(cfg.accent, 20), darker(cfg.accent));

    // Ears
    gradEllipse(g, cx + 10, baseY - 16 + bob, 3, 2, cfg.accent, lighter(cfg.accent, 15), darker(cfg.accent), -0.5);
    gradEllipse(g, cx + 18, baseY - 16 + bob, 3, 2, cfg.accent, lighter(cfg.accent, 15), darker(cfg.accent), 0.5);

    // Eyes
    eye(g, cx + 13, baseY - 13 + bob, 1.5, '#2a1a08');
    eye(g, cx + 17, baseY - 13 + bob, 1.5, '#2a1a08');

  } else if (kind === 'pig') {
    // Legs — diagonal pair alternation
    const pigPhases = [legAFwd, legBFwd, legAFwd, legBFwd];
    for (let i = 0; i < 4; i++) {
      const lx = cx - 8 + i * 5;
      const lOff = pigPhases[i]!;
      g.strokeStyle = darker(cfg.color, 30);
      g.lineWidth = 3.5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(lx, baseY - 4 + lOff);
      g.lineTo(lx, baseY + 4);
      g.stroke();
    }

    // Body
    gradEllipse(g, cx, baseY - 10 + bob, cfg.w * 0.48, cfg.h * 0.48,
      cfg.color, lighter(cfg.color, 25), darker(cfg.color, 20));

    // Belly highlight
    softCircle(g, cx, baseY - 6 + bob, cfg.w * 0.25, lighter(cfg.color, 35), 0.25);

    // Head
    gradEllipse(g, cx + 14, baseY - 14 + bob, 8, 7,
      cfg.color, lighter(cfg.color, 25), darker(cfg.color, 20));

    // Snout
    gradEllipse(g, cx + 20, baseY - 13 + bob, 5, 4,
      cfg.beak, lighter(cfg.beak, 25), darker(cfg.beak, 15));
    // Nostrils
    softCircle(g, cx + 19, baseY - 13 + bob, 1, '#a06060', 0.7);
    softCircle(g, cx + 22, baseY - 13 + bob, 1, '#a06060', 0.7);

    // Ears (floppy)
    gradEllipse(g, cx + 10, baseY - 20 + bob, 4, 3, cfg.color, lighter(cfg.color, 15), darker(cfg.color, 15), -0.4);
    gradEllipse(g, cx + 16, baseY - 20 + bob, 4, 3, cfg.color, lighter(cfg.color, 15), darker(cfg.color, 15), 0.4);
    softCircle(g, cx + 10, baseY - 20 + bob, 2, lighter(cfg.color, 40), 0.3);
    softCircle(g, cx + 16, baseY - 20 + bob, 2, lighter(cfg.color, 40), 0.3);

    // Eye
    eye(g, cx + 14, baseY - 16 + bob, 1.8);

    // Curly tail
    g.strokeStyle = cfg.color;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - cfg.w * 0.44, baseY - 12 + bob);
    g.bezierCurveTo(
      cx - cfg.w * 0.55, baseY - 18 + bob,
      cx - cfg.w * 0.5, baseY - 20 + bob,
      cx - cfg.w * 0.42, baseY - 16 + bob,
    );
    g.stroke();

  } else if (kind === 'goat') {
    // Legs — diagonal pair alternation
    const goatPhases = [legAFwd, legBFwd, legAFwd, legBFwd];
    for (let i = 0; i < 4; i++) {
      const lx = cx - 8 + i * 5;
      const lOff = goatPhases[i]!;
      g.strokeStyle = darker(cfg.color, 30);
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(lx, baseY - 4 + lOff);
      g.lineTo(lx, baseY + 4);
      g.stroke();
    }

    // Body
    gradEllipse(g, cx, baseY - 10 + bob, cfg.w * 0.48, cfg.h * 0.45,
      cfg.color, lighter(cfg.color, 20), darker(cfg.color));

    // Head
    gradEllipse(g, cx + 13, baseY - 18 + bob, 7, 6,
      cfg.color, lighter(cfg.color, 20), darker(cfg.color));

    // Horns (curved)
    g.strokeStyle = cfg.accent;
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + 10, baseY - 22 + bob);
    g.quadraticCurveTo(cx + 6, baseY - 30 + bob, cx + 8, baseY - 32 + bob);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 16, baseY - 22 + bob);
    g.quadraticCurveTo(cx + 20, baseY - 30 + bob, cx + 18, baseY - 32 + bob);
    g.stroke();

    // Ears
    gradEllipse(g, cx + 8, baseY - 20 + bob, 3, 2, cfg.color, lighter(cfg.color, 15), darker(cfg.color), -0.6);
    gradEllipse(g, cx + 18, baseY - 20 + bob, 3, 2, cfg.color, lighter(cfg.color, 15), darker(cfg.color), 0.6);

    // Snout
    gradEllipse(g, cx + 18, baseY - 16 + bob, 3, 2.5,
      cfg.beak, lighter(cfg.beak, 20), darker(cfg.beak));

    // Beard
    g.strokeStyle = '#f0e8d0';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx + 14, baseY - 12 + bob);
    g.quadraticCurveTo(cx + 15, baseY - 8 + bob, cx + 13, baseY - 6 + bob);
    g.stroke();

    // Eye
    eye(g, cx + 14, baseY - 19 + bob, 1.5);

  } else if (kind === 'duck') {
    // Legs
    g.strokeStyle = cfg.accent;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - 3, baseY - 2 + legY);
    g.lineTo(cx - 4, baseY + 4);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + 4, baseY - 2 - legY);
    g.lineTo(cx + 5, baseY + 4);
    g.stroke();

    // Body
    gradEllipse(g, cx, baseY - 8 + bob, cfg.w * 0.48, cfg.h * 0.45,
      cfg.color, lighter(cfg.color, 20), darker(cfg.color));

    // Wing
    gradEllipse(g, cx - 3, baseY - 7 + bob, 6, 4,
      '#d8d8d0', '#f0f0e8', '#a0a098', -0.2);

    // Head (slightly green iridescent for mallard)
    const headColor = kind === 'duck' ? '#2a7a48' : cfg.color;
    gradEllipse(g, cx + 9, baseY - 14 + bob, 6, 5.5,
      headColor, lighter(headColor, 30), darker(headColor));

    // Bill
    g.fillStyle = cfg.accent;
    g.beginPath();
    g.moveTo(cx + 14, baseY - 14 + bob);
    g.quadraticCurveTo(cx + 21, baseY - 15 + bob, cx + 20, baseY - 13 + bob);
    g.quadraticCurveTo(cx + 14, baseY - 12 + bob, cx + 14, baseY - 14 + bob);
    g.closePath();
    g.fill();

    // Eye
    eye(g, cx + 11, baseY - 15 + bob, 1.5);

    // Tail
    g.save();
    g.globalAlpha = 0.7;
    g.strokeStyle = darker(cfg.color, 10);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 8, baseY - 7 + bob);
    g.quadraticCurveTo(cx - 12, baseY - 10 + bob, cx - 10, baseY - 14 + bob);
    g.stroke();
    g.restore();
  }

  return c;
}
