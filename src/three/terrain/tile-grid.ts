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
//  Rebuilds when the grid signature changes (plow, harvest, dig).
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
let waterMesh: import('three').Mesh | null = null;
let waterMat: MeshStandardMaterial | null = null;
let lastGridSignature = '';

function gridSignature(): string {
  let s = '';
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const t = state.grid[y]?.[x]?.type;
      s += t ? t[0] : '?';
    }
  }
  return s;
}

function buildLand(): InstancedMesh {
  const tiles = GRID_W * GRID_H;
  const geom = new BoxGeometry(1 - TILE_INSET * 2, TILE_HEIGHT, 1 - TILE_INSET * 2);
  const mat = new MeshLambertMaterial({
    vertexColors: false,
    flatShading: true,
  });
  // We use per-instance color so we still get one draw call.
  const mesh = new InstancedMesh(geom, mat, tiles);
  mesh.receiveShadow = true;
  mesh.name = 'land';

  const obj = new Object3D();
  let idx = 0;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const tile = state.grid[gy]?.[gx];
      const isWater = tile?.type === 'water';
      // For water tiles, drop the land box well below the water
      // surface so the water plane visually replaces it.
      // Non-water tiles: position so the box TOP sits at y=0, which
      // means entities placed at y=0 sit cleanly on the ground.
      const topY = isWater ? -0.5 : 0;
      const type = (isWater ? 'soil' : (tile?.type ?? 'grass')) as TileType;
      obj.position.set(gx + 0.5, topY - TILE_HEIGHT / 2, gy + 0.5);
      obj.rotation.set(0, 0, 0);
      obj.scale.set(1, 1, 1);
      obj.updateMatrix();
      mesh.setMatrixAt(idx, obj.matrix);
      mesh.setColorAt(idx, tileTint(gx, gy, type));
      idx++;
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.count = tiles;
  return mesh;
}

function buildWater(): Mesh {
  // Single plane covering the world extents at near-ground height.
  // Non-water tiles are land boxes that sit above this plane, so
  // only true water tiles read as water (the land elsewhere occludes).
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
  rebuildIfChanged(true);
  waterMesh = buildWater();
  terrain.add(waterMesh);
}

function rebuildIfChanged(force = false): void {
  const sig = gridSignature();
  if (!force && sig === lastGridSignature) return;
  lastGridSignature = sig;
  const { terrain } = getSceneRoot();
  if (land) {
    terrain.remove(land);
    land.geometry.dispose();
    (land.material as MeshLambertMaterial).dispose();
    land.dispose();
  }
  land = buildLand();
  terrain.add(land);
}

export function updateTerrain(timeS: number): void {
  rebuildIfChanged();
  if (waterMat) {
    const h = (Math.sin(timeS * 0.6) * 0.5 + 0.5) * 0.04;
    waterMat.color.setHSL(0.56 + h * 0.05, 0.6, 0.55);
  }
}
