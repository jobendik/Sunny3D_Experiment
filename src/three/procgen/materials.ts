// =============================================================
//  MATERIAL CACHE
//
//  Procedural geometry tends to repeat the same handful of colors
//  many times. Caching MeshLambertMaterial by color avoids thousands
//  of redundant material objects (each of which is a draw-state
//  change on the GPU).
//
//  All shared materials get a tiny onBeforeCompile injection that
//  lifts the bottom of the shade ramp toward a warm ambient. This
//  gives every shadowed face a soft cream "skylight bounce" instead
//  of going muddy under the directional sun + low ambient — the
//  difference between a "cheap procedural" look and a "Hay-Day
//  cozy" look.
// =============================================================

import {
  MeshLambertMaterial,
  MeshBasicMaterial,
  Color,
  DoubleSide,
  type Side,
} from 'three';

// Minimal subset of three.js's Shader type — we only touch
// fragmentShader, but @types/three pins this on different builds.
interface ShaderLike { fragmentShader: string }

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

// Subtle "wrap diffuse" lift — the bottom 35% of the shade ramp gets
// pushed toward warm cream so flat-shaded faces never crater into
// muddy darkness. Applied to every shared Lambert material; the
// effect is per-pixel and free at runtime (one MAD + a mix).
function applyCozyShade(m: MeshLambertMaterial): void {
  m.onBeforeCompile = (shader: ShaderLike) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_lambert_fragment>',
      `#include <lights_lambert_fragment>
       // Wrap shadowed faces toward a warm cream lift. We sample the
       // current diffuse contribution and blend it with the unlit
       // diffuse color tinted slightly warm — gives every shaded
       // side that "ambient bounce" feel without a real GI pass.
       float _cozyShade = clamp(dot(normalize(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse), vec3(0.3333)), 0.0, 1.0);
       float _cozyLift = smoothstep(0.0, 0.45, _cozyShade);
       reflectedLight.indirectDiffuse += diffuseColor.rgb * (1.0 - _cozyLift) * 0.32 * vec3(1.04, 0.98, 0.86);
      `,
    );
  };
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
    applyCozyShade(m);
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
