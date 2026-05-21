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
         // Three layers of noise: coarse meadow patches, mid clump
         // density, fine blade-tip sparkle. Together they sell a
         // hand-painted Hay-Day meadow rather than a flat green box.
         float coarse = vnoise(vTileWorld.xz * 1.2);
         float mid    = vnoise(vTileWorld.xz * 3.5 + 17.3);
         float fine   = vnoise(vTileWorld.xz * 8.0 + 41.7);
         // Bias the pattern slightly upward so highlights bloom on
         // top rather than the meadow reading chalky-dark.
         float pat = (coarse - 0.5) * 0.13
                   + (mid    - 0.5) * 0.10
                   + (fine   - 0.5) * 0.07;
         // Tile-vignette: subtle darkening near the tile edges to
         // suggest a soft outline / grass clump boundary. Cheap
         // procedural AO that reads as "loved-in" farm tiles.
         vec2 tileUV = fract(vTileWorld.xz);
         vec2 d2 = abs(tileUV - 0.5) * 2.0;
         float edge = max(d2.x, d2.y);
         float edgeDim = smoothstep(0.7, 1.0, edge) * 0.10;
         pat -= edgeDim;
         // Only modulate the top face — sides stay clean so the bevel
         // rim catches the sun crisply.
         pat *= vTopMask;
         diffuseColor.rgb *= 1.0 + pat;
         // Tiny warm-cream tint on the brightest sparkle so the
         // top of each meadow patch picks up sunlight believably.
         float sparkle = smoothstep(0.65, 0.9, fine) * vTopMask;
         diffuseColor.rgb += vec3(0.04, 0.035, 0.018) * sparkle;
        `,
      );
  };
  cached = m;
  return cached;
}
