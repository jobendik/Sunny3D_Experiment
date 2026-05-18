import { makeCanvas } from '../canvas';
import { TILE } from '../constants';

export function spriteCropStage(cropKey: string, stage: number): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  const cx = TILE / 2;
  const cy = TILE / 2 + 8;

  if (stage === 0) {
    for (let i = 0; i < 4; i++) {
      const x = cx + (i - 1.5) * 8;
      g.fillStyle = '#5aa030';
      g.fillRect(x - 1, cy, 2, 4);
      g.fillStyle = '#9cd060';
      g.fillRect(x - 1, cy - 1, 2, 1);
    }
    return c;
  }

  const drawLeaves = (h: number, leafColor = '#4a9a30', tip = '#8ec85a'): void => {
    for (let i = 0; i < 4; i++) {
      const x = cx + (i - 1.5) * 8;
      g.fillStyle = leafColor;
      g.fillRect(x - 1, cy - h, 2, h);
      g.fillStyle = tip;
      g.fillRect(x - 1, cy - h - 1, 2, 1);
      g.fillStyle = leafColor;
      g.fillRect(x - 3, cy - h + Math.floor(h * 0.3), 2, 1);
      g.fillRect(x + 1, cy - h + Math.floor(h * 0.6), 2, 1);
    }
  };

  switch (cropKey) {
    case 'wheat': {
      const h = [4, 8, 16][stage - 1]!;
      drawLeaves(h, '#a08038', '#d8b450');
      if (stage === 3) {
        for (let i = 0; i < 4; i++) {
          const x = cx + (i - 1.5) * 8;
          g.fillStyle = '#e0c060';
          g.fillRect(x - 2, cy - h - 4, 4, 4);
          g.fillStyle = '#ffe080';
          g.fillRect(x - 2, cy - h - 4, 4, 1);
          g.fillStyle = '#8a6020';
          g.fillRect(x, cy - h - 6, 1, 2);
        }
      }
      break;
    }
    case 'corn': {
      const h = [6, 12, 22][stage - 1]!;
      drawLeaves(h);
      if (stage === 3) {
        for (let i = 0; i < 2; i++) {
          const x = cx + (i - 0.5) * 12;
          g.fillStyle = '#f0d040';
          g.fillRect(x - 2, cy - h - 6, 5, 9);
          g.fillStyle = '#ffe060';
          g.fillRect(x - 2, cy - h - 6, 5, 1);
          g.fillStyle = '#a07020';
          g.fillRect(x - 2, cy - h + 3, 5, 1);
          g.fillStyle = '#7a9a30';
          g.fillRect(x - 3, cy - h - 3, 1, 5);
          g.fillRect(x + 3, cy - h - 3, 1, 5);
        }
      }
      break;
    }
    case 'carrot': {
      const h = [4, 10, 14][stage - 1]!;
      drawLeaves(h, '#3a7a20', '#a0d050');
      if (stage === 3) {
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * 10;
          g.fillStyle = '#ff8a30';
          g.fillRect(x - 2, cy - 2, 4, 4);
          g.fillStyle = '#ffaa50';
          g.fillRect(x - 2, cy - 2, 4, 1);
        }
      }
      break;
    }
    case 'tomato': {
      const h = [6, 14, 18][stage - 1]!;
      drawLeaves(h, '#3a7a20', '#8acf50');
      if (stage === 3) {
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * 8;
          g.fillStyle = '#d83030';
          g.fillRect(x - 2, cy - Math.floor(h * 0.6), 4, 4);
          g.fillStyle = '#ff5050';
          g.fillRect(x - 2, cy - Math.floor(h * 0.6), 1, 1);
          g.fillStyle = '#3a8020';
          g.fillRect(x - 1, cy - Math.floor(h * 0.6) - 1, 2, 1);
        }
      }
      break;
    }
    case 'pumpkin': {
      const h = [6, 12, 16][stage - 1]!;
      drawLeaves(h, '#3a7a20', '#8acf50');
      if (stage === 3) {
        g.fillStyle = '#e87018';
        g.fillRect(cx - 12, cy - 6, 24, 12);
        g.fillStyle = '#ff9030';
        g.fillRect(cx - 12, cy - 6, 24, 2);
        g.fillStyle = '#a04810';
        g.fillRect(cx - 6, cy - 5, 1, 11);
        g.fillRect(cx + 1, cy - 5, 1, 11);
        g.fillRect(cx - 12, cy + 5, 24, 1);
        g.fillStyle = '#3a6a20';
        g.fillRect(cx - 1, cy - 9, 2, 4);
      }
      break;
    }
    case 'strawberry': {
      const h = [5, 10, 14][stage - 1]!;
      drawLeaves(h, '#3a8a20', '#8aef50');
      if (stage === 3) {
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * 8;
          g.fillStyle = '#e02440';
          g.fillRect(x - 2, cy - Math.floor(h * 0.5), 4, 5);
          g.fillStyle = '#ff8060';
          g.fillRect(x - 2, cy - Math.floor(h * 0.5), 1, 1);
          g.fillStyle = '#fff0a0';
          g.fillRect(x - 1, cy - Math.floor(h * 0.5) + 1, 1, 1);
          g.fillRect(x + 1, cy - Math.floor(h * 0.5) + 2, 1, 1);
          g.fillStyle = '#3a8020';
          g.fillRect(x - 2, cy - Math.floor(h * 0.5) - 1, 4, 1);
        }
      }
      break;
    }
    case 'sugarcane': {
      const h = [8, 16, 28][stage - 1]!;
      for (let i = 0; i < 4; i++) {
        const x = cx + (i - 1.5) * 8;
        g.fillStyle = '#3aa030';
        g.fillRect(x - 1, cy - h, 2, h);
        g.fillStyle = '#7adf60';
        g.fillRect(x - 1, cy - h, 1, h);
      }
      if (stage === 3) {
        for (let i = 0; i < 4; i++) {
          const x = cx + (i - 1.5) * 8;
          g.fillStyle = '#e0e0a0';
          g.fillRect(x - 2, cy - h - 4, 4, 4);
        }
      }
      break;
    }
    default: {
      drawLeaves([4, 8, 12][stage - 1] ?? 4);
    }
  }
  return c;
}
