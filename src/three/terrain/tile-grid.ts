// =============================================================
//  TERRAIN — TILE GRID
//
//  One InstancedMesh of small chamfered tiles, color-per-instance.
//  The blocky-but-rounded look is what gives the farm its
//  Hay-Day / cozy-acres silhouette — flat planes read as washed-out
//  from an iso camera, and sharp boxes feel like LEGO. Chamfered
//  edges catch the rim light at sunrise and feel "soft".
//
//  Each tile gets a tiny amount of per-coord noise applied to BOTH
//  its color and its height, so even a uniform grass field has the
//  organic, hand-painted feel of a storybook farm rather than a
//  Minecraft floor.
//
//  Rebuilds: only the tile *instances* whose type changed are
//  touched (plow/harvest/dig). The mesh itself is never recreated
//  during gameplay.
// =============================================================

import {
  InstancedMesh,
  Object3D,
  BufferGeometry,
  Mesh,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  DoubleSide,
  Vector2,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { tileMaterial } from './tile-material';
import { chamferedTileGeometry } from './tile-geometry';
import type { TileType } from '../../types';

const TILE_HEIGHT = 0.22;        // visible thickness of each tile box
const TILE_INSET = 0;            // tiles butt against each other — the bevel reads the seam
const TILE_BEVEL = 0.025;        // subtle chamfer that catches rim light without screaming "grid"

const TILE_COLORS: Record<TileType, Color> = {
  grass:  new Color('#7fcf63'),
  soil:   new Color('#c99a63'),
  plowed: new Color('#7a4f28'),
  water:  new Color('#3a86c4'),  // unused — water tiles fall back to grass below the lake
  path:   new Color('#dbb781'),
};

// Tiny secondary tint table; we sample one of three palette shades
// per tile so a grass field reads like patches of meadow rather
// than a perfectly uniform billiard table.
const TILE_VARIANTS: Record<TileType, Color[]> = {
  grass:  [new Color('#7fcf63'), new Color('#8ad96e'), new Color('#76c45a'), new Color('#92dc75')],
  soil:   [new Color('#c99a63'), new Color('#b88a55'), new Color('#d1a06d'), new Color('#bd8d58')],
  plowed: [new Color('#7a4f28'), new Color('#86562f'), new Color('#704620'), new Color('#7e5328')],
  water:  [new Color('#3a86c4')],
  path:   [new Color('#dbb781'), new Color('#d3ad75'), new Color('#e1bf8b'), new Color('#cba66b')],
};

function smoothHash(gx: number, gy: number, salt = 0): number {
  // Stable 0..1 noise from integer coords.
  let h = (gx * 73856093) ^ (gy * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

function tileTint(gx: number, gy: number, type: TileType): Color {
  const variants = TILE_VARIANTS[type] ?? [TILE_COLORS[type]];
  const v = variants[Math.floor(smoothHash(gx, gy, 11) * variants.length)] ?? TILE_COLORS[type];
  // Add ±3% lightness wobble for extra organic feel.
  const n = (smoothHash(gx, gy, 23) - 0.5) * 0.06;
  const c = v.clone();
  c.offsetHSL(0, 0, n);
  return c;
}

/** Subtle per-tile vertical offset — under 0.05u so it doesn't break
 *  building footprints, but enough to catch the eye at low pitch. */
function tileHeightOffset(gx: number, gy: number, type: TileType): number {
  if (type === 'water' || type === 'plowed') return 0;
  // Two-octave value-noise for soft rolling height.
  const a = smoothHash(gx, gy, 7);
  const b = smoothHash(Math.floor(gx / 2), Math.floor(gy / 2), 13);
  return (a * 0.6 + b * 0.4 - 0.5) * 0.06;
}

let land: InstancedMesh | null = null;
let waterMesh: Mesh | null = null;
let waterMat: ShaderMaterial | null = null;
let waterUniforms: { uTime: { value: number }; uWindDir: { value: Vector2 } } | null = null;

interface WaterBBox { x0: number; y0: number; x1: number; y1: number; hasWater: boolean }
function computeWaterBBox(): WaterBBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let any = false;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]?.[gx];
      if (t?.type === 'water') {
        any = true;
        if (gx < x0) x0 = gx;
        if (gy < y0) y0 = gy;
        if (gx + 1 > x1) x1 = gx + 1;
        if (gy + 1 > y1) y1 = gy + 1;
      }
    }
  }
  if (!any) return { x0: 0, y0: 0, x1: 1, y1: 1, hasWater: false };
  return { x0, y0, x1, y1, hasWater: true };
}
// Per-instance cached tile type. The grid is small (324 entries) so
// a flat string[] beats a Map for cache locality.
let lastTypes: (TileType | '?')[] = [];

function indexOf(gx: number, gy: number): number {
  return gy * GRID_W + gx;
}

const _scratch = new Object3D();

function writeInstance(mesh: InstancedMesh, idx: number, gx: number, gy: number, type: TileType, isWater: boolean): void {
  const obj = _scratch;
  // Water tiles sink ~0.7u below grade so the water plane (-0.30)
  // fully covers their tops. Land tiles get a tiny per-tile height
  // wobble so the field reads as rolling, not perfectly flat.
  const offsetY = isWater ? -0.85 : tileHeightOffset(gx, gy, type);
  const topY = offsetY;
  obj.position.set(gx + 0.5, topY - TILE_HEIGHT / 2, gy + 0.5);
  obj.rotation.set(0, 0, 0);
  obj.scale.set(1, 1, 1);
  obj.updateMatrix();
  mesh.setMatrixAt(idx, obj.matrix);
  mesh.setColorAt(idx, tileTint(gx, gy, type));
}

function buildLand(): InstancedMesh {
  const tiles = GRID_W * GRID_H;
  const geom: BufferGeometry = chamferedTileGeometry(
    1 - TILE_INSET * 2,
    TILE_HEIGHT,
    1 - TILE_INSET * 2,
    TILE_BEVEL,
  );
  const mat = tileMaterial();
  // Per-instance color keeps the whole grid in one draw call.
  const mesh = new InstancedMesh(geom, mat, tiles);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'land';

  lastTypes = new Array(tiles).fill('?');
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const tile = state.grid[gy]?.[gx];
      const isWater = tile?.type === 'water';
      const type = (isWater ? 'soil' : (tile?.type ?? 'grass')) as TileType;
      const i = indexOf(gx, gy);
      writeInstance(mesh, i, gx, gy, type, isWater);
      lastTypes[i] = tile?.type ?? 'grass';
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = tiles;
  return mesh;
}

function buildWater(): Mesh {
  // Water surface fits the bounding box of the lake. The actual
  // shape is implied by the surrounding land tiles forming a basin;
  // this rectangle just provides a moving surface. Subdivided so
  // the ripple vertex shader has something to displace.
  //
  // We bound the water mesh to the actual lake footprint (computed
  // from state.grid) so it never bleeds through gaps between land
  // tiles, and we keep its y well below the tile bottoms.
  const bbox = computeWaterBBox();
  const w = Math.max(1, bbox.x1 - bbox.x0 + 0.4);
  const d = Math.max(1, bbox.y1 - bbox.y0 + 0.4);
  const cx = (bbox.x0 + bbox.x1) / 2;
  const cz = (bbox.y0 + bbox.y1) / 2;
  const geom = new PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2));
  geom.rotateX(-Math.PI / 2);
  geom.translate(cx, -0.18, cz);

  const uniforms = {
    uTime: { value: 0 },
    uWindDir: { value: new Vector2(0.35, 0.25) },
    uShallow: { value: new Color('#a8e6f5') },
    uDeep: { value: new Color('#2a72c2') },
    uFoam: { value: new Color('#ffffff') },
  };
  waterUniforms = uniforms;
  waterMat = new ShaderMaterial({
    uniforms,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2  uWindDir;
      varying vec3 vWorldPos;
      varying float vRipple;
      void main() {
        vec3 p = position;
        // Two sinusoidal ripple sets crossing at 90° + a slow swell.
        // Amplitude kept small so the surface never rises into the
        // land tiles above it.
        float r1 = sin(p.x * 1.6 + uTime * 1.3 + p.z * 0.7) * 0.03;
        float r2 = sin(p.z * 2.1 - uTime * 1.0 + p.x * 1.1) * 0.02;
        float r3 = sin((p.x + p.z) * 0.45 + uTime * 0.4) * 0.03;
        float wave = r1 + r2 + r3;
        p.y += wave;
        vRipple = wave;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vRipple;
      void main() {
        // Mix shallow/deep by wave height — crests are paler, troughs
        // deeper. Cheap fake-fresnel using the y component of the
        // surface normal of an idealized wave.
        float t = clamp(vRipple * 4.0 + 0.5, 0.0, 1.0);
        vec3 col = mix(uDeep, uShallow, t);
        // Streak of foam at the wave peak.
        float foam = smoothstep(0.045, 0.075, vRipple);
        col = mix(col, uFoam, foam * 0.6);
        // Glittering specular dots — high-frequency noise modulated
        // by time. Reads like sun glints on the water surface.
        float g = sin(vWorldPos.x * 18.0 + uTime * 4.0)
                * sin(vWorldPos.z * 14.0 - uTime * 3.2);
        float glint = smoothstep(0.92, 0.99, g);
        col += vec3(1.0) * glint * 0.35;
        gl_FragColor = vec4(col, 0.94);
      }
    `,
  });

  const m = new Mesh(geom, waterMat);
  m.receiveShadow = true;
  m.name = 'water';
  return m;
}

export function initTerrain(): void {
  const { terrain } = getSceneRoot();
  if (land) {
    terrain.remove(land);
    land.geometry.dispose();
    (land.material as { dispose?: () => void }).dispose?.();
    land.dispose();
    land = null;
  }
  land = buildLand();
  terrain.add(land);
  waterMesh = buildWater();
  // Hide the water mesh if the player's farm has no water tiles
  // (e.g. expansion plot reset / debug).
  waterMesh.visible = computeWaterBBox().hasWater;
  terrain.add(waterMesh);
}

function updateDirtyInstances(): void {
  if (!land) return;
  let matrixDirty = false;
  let colorDirty = false;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const i = indexOf(gx, gy);
      const t = state.grid[gy]?.[gx];
      const cur = t?.type ?? 'grass';
      if (cur === lastTypes[i]) continue;
      const isWater = cur === 'water';
      const type = (isWater ? 'soil' : cur) as TileType;
      writeInstance(land, i, gx, gy, type, isWater);
      lastTypes[i] = cur;
      matrixDirty = true;
      colorDirty = true;
    }
  }
  if (matrixDirty) land.instanceMatrix.needsUpdate = true;
  if (colorDirty && land.instanceColor) land.instanceColor.needsUpdate = true;
}

export function updateTerrain(timeS: number): void {
  updateDirtyInstances();
  if (waterUniforms) waterUniforms.uTime.value = timeS;
  void waterMesh;
}

/** Read-only accessor for other modules that need to know how tall
 *  the ground actually is at a tile (e.g. for placing a grass tuft
 *  on top of the bevelled box). */
export function groundHeight(gx: number, gy: number): number {
  const t = state.grid[gy]?.[gx];
  if (!t || t.type === 'water') return -0.5;
  return tileHeightOffset(gx, gy, t.type as TileType);
}
