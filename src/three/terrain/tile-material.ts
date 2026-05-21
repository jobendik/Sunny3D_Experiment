// =============================================================
//  TILE MATERIAL
//
//  We start from MeshLambertMaterial because the flat-shaded soft
//  diffuse look matches the Hay-Day vibe. To get richer surfaces we
//  hijack onBeforeCompile and inject:
//   - high-frequency cell-noise that darkens / lightens fragments in
//     a grass-blade pattern (sells "actual grass" instead of "flat
//     box")
//   - micro grit on plowed/soil tiles so they read as dirt
//
//  Per-instance color is preserved so the tile-grid system can keep
//  swapping types without re-uploading textures.
//
//  Note: we compute world position ourselves in the vertex shader
//  instead of relying on `worldPosition`, because that varying is
//  only injected by certain three.js chunks (e.g. env map) and the
//  Lambert shader strips it otherwise.
// =============================================================

import { MeshLambertMaterial } from 'three';

let cached: MeshLambertMaterial | null = null;

export function tileMaterial(): MeshLambertMaterial {
  if (cached) return cached;
  const m = new MeshLambertMaterial({
    vertexColors: false,
    flatShading: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vTileWorld;
         varying float vTopMask;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec4 tileWp = modelMatrix * instanceMatrix * vec4(position, 1.0);
         #else
           vec4 tileWp = modelMatrix * vec4(position, 1.0);
         #endif
         vTileWorld = tileWp.xyz;
         vTopMask = step(0.5, normal.y);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vTileWorld;
         varying float vTopMask;

         // Cheap value-noise hash.
         float hash21(vec2 p) {
           p = fract(p * vec2(123.34, 456.21));
           p += dot(p, p + 34.45);
           return fract(p.x * p.y);
         }
         float vnoise(vec2 p) {
           vec2 i = floor(p);
           vec2 f = fract(p);
           float a = hash21(i);
           float b = hash21(i + vec2(1.0, 0.0));
           float c = hash21(i + vec2(0.0, 1.0));
           float d = hash21(i + vec2(1.0, 1.0));
           vec2 u = f * f * (3.0 - 2.0 * f);
           return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
         }
        `,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Two layers of noise: coarse meadow patches, fine blade-tips.
         float coarse = vnoise(vTileWorld.xz * 1.4);
         float fine   = vnoise(vTileWorld.xz * 7.0);
         // Slightly biased down so the meadow reads as soft grass
         // rather than chalky-bright.
         float pat = (coarse - 0.5) * 0.12 + (fine - 0.5) * 0.08;
         // Only modulate the top face — sides stay clean so the bevel
         // rim catches the sun crisply.
         pat *= vTopMask;
         diffuseColor.rgb *= 1.0 + pat;
        `,
      );
  };
  cached = m;
  return cached;
}
