// =============================================================
//  MATERIAL CACHE
//
//  Procedural geometry tends to repeat the same handful of colors
//  many times. Caching MeshLambertMaterial by color avoids thousands
//  of redundant material objects (each of which is a draw-state
//  change on the GPU).
// =============================================================

import {
  MeshLambertMaterial,
  MeshBasicMaterial,
  Color,
  DoubleSide,
  type Side,
} from 'three';

interface MatKey {
  color: string;
  emissive?: string;
  transparent?: boolean;
  opacity?: number;
  side?: Side;
}

const cache = new Map<string, MeshLambertMaterial>();
const basicCache = new Map<string, MeshBasicMaterial>();

function keyOf(k: MatKey): string {
  return `${k.color}|${k.emissive ?? ''}|${k.transparent ? 1 : 0}|${k.opacity ?? 1}|${k.side ?? 0}`;
}

export function mat(color: string, opts: Omit<MatKey, 'color'> = {}): MeshLambertMaterial {
  const k = keyOf({ color, ...opts });
  let m = cache.get(k);
  if (!m) {
    m = new MeshLambertMaterial({
      color: new Color(color),
      emissive: opts.emissive ? new Color(opts.emissive) : new Color(0x000000),
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? undefined,
      flatShading: true,
    });
    cache.set(k, m);
  }
  return m;
}

export function basicMat(color: string, opts: Omit<MatKey, 'color'> = {}): MeshBasicMaterial {
  const k = keyOf({ color, ...opts });
  let m = basicCache.get(k);
  if (!m) {
    m = new MeshBasicMaterial({
      color: new Color(color),
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? undefined,
    });
    basicCache.set(k, m);
  }
  return m;
}

export { DoubleSide };
