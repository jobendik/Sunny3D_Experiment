import { makeCanvas } from '../canvas';
import { TILE } from '../constants';

export function spriteOrchard(type: string, stage: number, withFruit: boolean): HTMLCanvasElement {
  const c = makeCanvas(TILE, TILE);
  const g = c.getContext('2d')!;
  const cx = TILE / 2;
  const baseY = TILE - 4;

  const trunkH = [10, 18, 26][stage]!;
  const trunkW = [3, 5, 6][stage]!;
  g.fillStyle = '#7a4f2e';
  g.fillRect(cx - trunkW / 2, baseY - trunkH, trunkW, trunkH);
  g.fillStyle = '#5a3a18';
  g.fillRect(cx - trunkW / 2, baseY - trunkH, 1, trunkH);

  const canopyR = [6, 12, 18][stage]!;
  const canopyColor = type === 'appletree' ? '#3a8020' : '#5a9a40';
  const canopyLight = type === 'appletree' ? '#5aa040' : '#7ac050';
  g.fillStyle = canopyColor;
  g.beginPath(); g.arc(cx, baseY - trunkH - canopyR * 0.5, canopyR, 0, Math.PI * 2); g.fill();
  if (stage >= 1) {
    g.beginPath(); g.arc(cx - canopyR * 0.6, baseY - trunkH - canopyR * 0.3, canopyR * 0.7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + canopyR * 0.6, baseY - trunkH - canopyR * 0.3, canopyR * 0.7, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = canopyLight;
  g.beginPath(); g.arc(cx - canopyR * 0.3, baseY - trunkH - canopyR * 0.7, canopyR * 0.4, 0, Math.PI * 2); g.fill();

  if (stage === 2 && withFruit) {
    const fruitColor = type === 'appletree' ? '#d83030' : '#a8c84a';
    const positions: ReadonlyArray<readonly [number, number]> = [
      [-canopyR * 0.5, -canopyR * 0.3],
      [canopyR * 0.5, -canopyR * 0.3],
      [0, -canopyR * 0.1],
      [-canopyR * 0.3, canopyR * 0.2],
      [canopyR * 0.3, canopyR * 0.2],
    ];
    for (const [dx, dy] of positions) {
      g.fillStyle = fruitColor;
      g.beginPath(); g.arc(cx + dx, baseY - trunkH - canopyR * 0.5 + dy, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx + dx - 0.8, baseY - trunkH - canopyR * 0.5 + dy - 0.8, 1, 0, Math.PI * 2); g.fill();
    }
  }
  return c;
}
