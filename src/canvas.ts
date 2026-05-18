// =============================================================
//  CANVAS / SCREEN BINDINGS
// =============================================================

const canvas = document.getElementById('world') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element with id="world" not found');
}
const context = canvas.getContext('2d');
if (!context) {
  throw new Error('2D rendering context unavailable');
}

export const cv: HTMLCanvasElement = canvas;
export const ctx: CanvasRenderingContext2D = context;

export let DPR: number = Math.min(window.devicePixelRatio || 1, 2);

export function resize(): void {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.floor(window.innerWidth * DPR);
  cv.height = Math.floor(window.innerHeight * DPR);
  cv.style.width = window.innerWidth + 'px';
  cv.style.height = window.innerHeight + 'px';
  ctx.imageSmoothingEnabled = false;
}

export const SW = (): number => window.innerWidth;
export const SH = (): number => window.innerHeight;

window.addEventListener('resize', resize);
resize();

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
