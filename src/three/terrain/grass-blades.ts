// =============================================================
//  GRASS BLADES
//
//  Instanced grass tufts on every grass tile. Each "tuft" is a small
//  3-blade cross-quad (two crossed planes) — that's the cheapest way
//  to get the silhouette of grass that reads at any camera angle.
//  We use one InstancedMesh per terrain so the whole field is one
//  draw call, and we sway it in a vertex shader using world-pos +
//  time so individual blades wobble organically.
//
//  Tile changes (plow/harvest/water) hide / show their blades by
//  zeroing the instance matrix — much cheaper than rebuilding.
// =============================================================

import {
  BufferGeometry,
  BufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Color,
  Object3D,
  DoubleSide,
  type Material,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { groundHeight } from './tile-grid';
import type { LightingSnapshot } from '../lighting';

// 8 tufts per tile makes a grass tile look like an actual meadow
// rather than a green floor with a few sprigs. 18×18×8 = 2592 instances
// total, still one draw call. Each tuft is a 5-blade fan that taper-
// shades from root to tip, so individual blades read clearly.
const TUFTS_PER_TILE = 8;
const TUFT_WIDTH = 0.32;
const TUFT_HEIGHT = 0.30;

let blades: InstancedMesh | null = null;
let bladeMat: MeshLambertMaterial | null = null;
let baseHeights: Float32Array | null = null;
// Tracks last seen tile-type so we can hide tufts on tiles that no
// longer support grass (path/plowed/soil) and bring them back later.
let visibleType: (string | '?')[] = [];

function makeBladeGeometry(): BufferGeometry {
  // 5 triangular blades fanning out from a common base, each leaning
  // slightly outward. Triangles (not quads) make each blade actually
  // taper to a point so the tuft reads like grass instead of a Lego
  // brick cross.
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const h = TUFT_HEIGHT;
  const baseW = TUFT_WIDTH * 0.18;
  const fanCount = 5;
  const fanRadius = TUFT_WIDTH * 0.18;

  for (let i = 0; i < fanCount; i++) {
    const ang = (i / fanCount) * Math.PI * 2;
    const lean = 0.06 + Math.random() * 0.05;
    const cx = Math.cos(ang) * fanRadius * 0.4;
    const cz = Math.sin(ang) * fanRadius * 0.4;
    const tipX = Math.cos(ang) * (fanRadius + lean * h * 0.6);
    const tipZ = Math.sin(ang) * (fanRadius + lean * h * 0.6);
    // Base — two triangle bottom vertices on opposite sides of the
    // blade axis, with a slight twist.
    const perpX = -Math.sin(ang);
    const perpZ =  Math.cos(ang);
    const bAx = cx + perpX * baseW;
    const bAz = cz + perpZ * baseW;
    const bBx = cx - perpX * baseW;
    const bBz = cz - perpZ * baseW;
    // Approx normal: facing outward from the tuft center.
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    const start = positions.length / 3;
    positions.push(bAx, 0, bAz);
    positions.push(bBx, 0, bBz);
    positions.push(tipX, h, tipZ);
    normals.push(nx, 0.4, nz, nx, 0.4, nz, nx, 0.6, nz);
    indices.push(start, start + 1, start + 2);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}

function makeBladeMaterial(): MeshLambertMaterial {
  const m = new MeshLambertMaterial({
    color: new Color('#7fcf63'),
    side: DoubleSide,
    flatShading: false,
  });
  // Inject:
  //  - per-instance color is preserved (so a tuft can pick a slightly
  //    different green)
  //  - vertex-stage sway driven by world position + time
  //  - fragment-stage tip darkening so the bottom of the blade has a
  //    soil-shadow tint
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWind = { value: 0.6 };
    bladeShader = shader as unknown as typeof bladeShader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform float uWind;
         varying float vBladeY;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vBladeY = position.y / ${TUFT_HEIGHT.toFixed(3)};
         // World-space sway origin so neighbouring tufts move in
         // synchrony like a real breeze.
         vec4 wp0 = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float wphase = wp0.x * 0.7 + wp0.z * 0.9;
         float gust = sin(uTime * 1.7 + wphase) * 0.5
                    + sin(uTime * 0.9 + wphase * 0.4) * 0.5;
         float sway = gust * uWind * 0.07 * vBladeY * vBladeY;
         transformed.x += sway;
         transformed.z += sway * 0.35;
        `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vBladeY;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Darken root, brighten tip.
         diffuseColor.rgb *= mix(0.65, 1.10, clamp(vBladeY, 0.0, 1.0));
        `,
      );
  };
  return m;
}

interface BladeShaderUniforms { uTime: { value: number }; uWind: { value: number } }
let bladeShader: { uniforms: Record<string, { value: unknown }> & BladeShaderUniforms } | null = null;

function smoothHash(gx: number, gy: number, salt = 0): number {
  let h = (gx * 73856093) ^ (gy * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

const _scratch = new Object3D();
const _tmpColor = new Color();

function writeTuft(idx: number, gx: number, gy: number, hidden: boolean): void {
  if (!blades) return;
  if (hidden) {
    _scratch.position.set(0, -100, 0);
    _scratch.scale.set(0, 0, 0);
    _scratch.rotation.set(0, 0, 0);
    _scratch.updateMatrix();
    blades.setMatrixAt(idx, _scratch.matrix);
    return;
  }
  // Pseudo-random scatter inside the tile.
  const seed = idx;
  const rx = smoothHash(seed, gy + idx, 1);
  const rz = smoothHash(gx, seed, 2);
  const rs = smoothHash(seed, seed, 3);
  const ry = smoothHash(seed, gx + gy, 4);
  const px = gx + 0.15 + rx * 0.70;
  const pz = gy + 0.15 + rz * 0.70;
  const py = groundHeight(gx, gy) + 0.001;
  const scale = 0.7 + rs * 0.7;
  _scratch.position.set(px, py, pz);
  _scratch.rotation.set(0, ry * Math.PI * 2, 0);
  _scratch.scale.set(scale, scale * (0.85 + rs * 0.45), scale);
  _scratch.updateMatrix();
  blades.setMatrixAt(idx, _scratch.matrix);

  // Random tuft color: lean toward yellow-green so the field reads
  // as alive rather than fake-bright. Withered/dry palette is
  // applied automatically when the tile flips to soil.
  const tone = smoothHash(gx, gy, 9);
  _tmpColor.setHSL(0.25 + (tone - 0.5) * 0.05, 0.55, 0.48 + tone * 0.12);
  blades.setColorAt(idx, _tmpColor);
}

export function installGrassBlades(): void {
  if (blades) return;
  const { terrain } = getSceneRoot();
  const total = GRID_W * GRID_H * TUFTS_PER_TILE;
  baseHeights = new Float32Array(total);
  visibleType = new Array(GRID_W * GRID_H).fill('?');
  bladeMat = makeBladeMaterial();
  blades = new InstancedMesh(makeBladeGeometry(), bladeMat as Material, total);
  blades.castShadow = false;   // grass is too dense for shadow passes
  blades.receiveShadow = false;
  blades.name = 'grass-blades';

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const tile = state.grid[gy]?.[gx];
      const type = tile?.type ?? 'grass';
      const tileIdx = gy * GRID_W + gx;
      const hide = type !== 'grass';
      visibleType[tileIdx] = type;
      for (let i = 0; i < TUFTS_PER_TILE; i++) {
        const idx = tileIdx * TUFTS_PER_TILE + i;
        writeTuft(idx, gx, gy, hide);
        baseHeights[idx] = groundHeight(gx, gy);
      }
    }
  }
  blades.instanceMatrix.needsUpdate = true;
  if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
  terrain.add(blades);
}

export function updateGrassBlades(timeS: number, light: { sunFactor: number }): void {
  if (!blades) return;
  // Hide tufts on tiles that turned to soil/plowed/path/water; reveal
  // them again when they revert to grass. Two-pass: detect dirty
  // tiles, then rewrite their tufts in one matrix flush.
  let dirty = false;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const tileIdx = gy * GRID_W + gx;
      const tile = state.grid[gy]?.[gx];
      const cur = tile?.type ?? 'grass';
      if (visibleType[tileIdx] === cur) continue;
      visibleType[tileIdx] = cur;
      dirty = true;
      const hide = cur !== 'grass';
      for (let i = 0; i < TUFTS_PER_TILE; i++) {
        writeTuft(tileIdx * TUFTS_PER_TILE + i, gx, gy, hide);
      }
    }
  }
  if (dirty) {
    blades.instanceMatrix.needsUpdate = true;
    if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
  }
  if (bladeShader) {
    bladeShader.uniforms.uTime.value = timeS;
    // Stronger gusts during stormy weather (read sun factor as proxy
    // for sun + weather darkening).
    bladeShader.uniforms.uWind.value = 0.45 + (1 - Math.min(1, light.sunFactor)) * 0.6;
  }
}
