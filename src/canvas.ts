// =============================================================
//  CANVAS / SCREEN BINDINGS
//
//  Owns the WebGL canvas element (#world) and exposes its size
//  helpers + a tiny offscreen-canvas factory used by the
//  procedural sprite generators (which still drive UI panel
//  icons even though the world itself is rendered by three.js).
// =============================================================

const canvas = document.getElementById('world') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element with id="world" not found');
}

export const cv: HTMLCanvasElement = canvas;

export let DPR: number = Math.min(window.devicePixelRatio || 1, 2);

export function resize(): void {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // For WebGL we let three.js own the backing-store size via
  // renderer.setSize(). All we do here is mirror the device pixel
  // ratio in case any consumer reads it.
}

export const SW = (): number => window.innerWidth;
export const SH = (): number => window.innerHeight;

window.addEventListener('resize', resize);
resize();

/** Procedural sprite generators draw into offscreen canvases for UI
 *  panel icons (shop, inventory, etc.). The world is rendered with
 *  three.js — these sprites never touch the main canvas. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
