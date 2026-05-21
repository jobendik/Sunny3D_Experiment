// =============================================================
//  TERRAIN — TILE GRID
//
//  One InstancedMesh of small box tiles, color-per-instance. The
//  blocky look is what gives the farm its Hay-Day / cozy-acres
//  silhouette — flat planes read as washed-out from an iso camera.
//
//  Water is a separate plane drawn slightly below the land tops so
//  the boxes around it form a "shoreline".
//
//  Rebuilds: only the tile *instances* whose type changed are
//  touched (plow/harvest/dig). The mesh itself is never recreated
//  during gameplay.
// =============================================================

import {
  InstancedMesh,
  Object3D,
  BoxGeometry,
  MeshLambertMaterial,
  Color,
  PlaneGeometry,
  MeshStandardMaterial,
  DoubleSide,
  Mesh,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import type { TileType } from '../../types';

const TILE_HEIGHT = 0.18;        // visible thickness of each tile box
const TILE_INSET = 0.005;        // tiny gap so seams are readable

const TILE_COLORS: Record<TileType, Color> = {
  grass:  new Color('#86c25a'),
  soil:   new Color('#c99a63'),
  plowed: new Color('#8a5a30'),
  water:  new Color('#3a86c4'),  // unused — water tiles fall back to grass below the lake
  path:   new Color('#d8b683'),
};

function tileTint(gx: number, gy: number, type: TileType): Color {
  const base = TILE_COLORS[type];
  const seed = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
  const n = ((seed & 0xff) / 255 - 0.5) * 0.06;
  const c = base.clone();
  c.offsetHSL(0, 0, n);
  return c;
}

let land: InstancedMesh | null = null;
let waterMesh: Mesh | null = null;
let waterMat: MeshStandardMaterial | null = null;
// Per-instance cached tile type. The grid is small (324 entries) so
// a flat string[] beats a Map for cache locality.
let lastTypes: (TileType | '?')[] = [];

function indexOf(gx: number, gy: number): number {
  return gy * GRID_W + gx;
}

// Note: the mesh is passed in explicitly because the module-level
// `land` is still null while buildLand() is populating its instances
// — relying on it there silently no-op'd every initial write and
// left every tile stacked at the origin.
function writeInstance(mesh: InstancedMesh, idx: number, gx: number, gy: number, type: TileType, isWater: boolean): void {
  const obj = _scratch;
  const topY = isWater ? -0.5 : 0;
  obj.position.set(gx + 0.5, topY - TILE_HEIGHT / 2, gy + 0.5);
  obj.rotation.set(0, 0, 0);
  obj.scale.set(1, 1, 1);
  obj.updateMatrix();
  mesh.setMatrixAt(idx, obj.matrix);
  mesh.setColorAt(idx, tileTint(gx, gy, type));
}

const _scratch = new Object3D();

function buildLand(): InstancedMesh {
  const tiles = GRID_W * GRID_H;
  const geom = new BoxGeometry(1 - TILE_INSET * 2, TILE_HEIGHT, 1 - TILE_INSET * 2);
  const mat = new MeshLambertMaterial({
    vertexColors: false,
    flatShading: true,
  });
  // Per-instance color keeps the whole grid in one draw call.
  const mesh = new InstancedMesh(geom, mat, tiles);
  mesh.receiveShadow = true;
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
  // Single plane covering the world extents at near-ground height.
  const geom = new PlaneGeometry(GRID_W, GRID_H, 1, 1);
  geom.rotateX(-Math.PI / 2);
  // Water surface sits a fingernail below ground level so the
  // shoreline tile-boxes around it form a believable bank.
  geom.translate(GRID_W / 2, -0.04, GRID_H / 2);
  waterMat = new MeshStandardMaterial({
    color: new Color('#5fc1eb'),
    transparent: true,
    opacity: 0.92,
    roughness: 0.25,
    metalness: 0.08,
    side: DoubleSide,
    flatShading: true,
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
    (land.material as MeshLambertMaterial).dispose();
    land.dispose();
    land = null;
  }
  land = buildLand();
  terrain.add(land);
  waterMesh = buildWater();
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
  if (waterMat) {
    const h = (Math.sin(timeS * 0.6) * 0.5 + 0.5) * 0.04;
    waterMat.color.setHSL(0.56 + h * 0.05, 0.6, 0.55);
  }
  void waterMesh;
}
