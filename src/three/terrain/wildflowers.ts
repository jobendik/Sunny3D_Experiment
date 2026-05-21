// =============================================================
//  WILDFLOWERS
//
//  Tiny clusters of colored flower heads scattered on grass tiles.
//  Adds dabs of color to the meadow without overwhelming it.
//  One instanced mesh per flower color (3-4 colors total).
//
//  Density is sparse — about 1 in 4 grass tiles gets a small cluster
//  of 1-3 flowers, deterministic per tile coord so the layout stays
//  stable across reloads.
// =============================================================

import {
  InstancedMesh,
  Object3D,
  CylinderGeometry,
  SphereGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Color,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { groundHeight } from './tile-grid';

interface FlowerColor { name: string; head: Color; stem: Color; chance: number }
const PALETTE: FlowerColor[] = [
  { name: 'red',    head: new Color('#e64842'), stem: new Color('#4a8a40'), chance: 0.30 },
  { name: 'yellow', head: new Color('#f4cf42'), stem: new Color('#4a8a40'), chance: 0.30 },
  { name: 'white',  head: new Color('#ffffff'), stem: new Color('#4a8a40'), chance: 0.20 },
  { name: 'purple', head: new Color('#9070d4'), stem: new Color('#4a8a40'), chance: 0.20 },
];

let mounted: Group | null = null;

function smoothHash(x: number, y: number, salt = 0): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

function pickColorIndex(rand: number): number {
  let acc = 0;
  for (let i = 0; i < PALETTE.length; i++) {
    acc += PALETTE[i]!.chance;
    if (rand < acc) return i;
  }
  return PALETTE.length - 1;
}

export function installWildflowers(): void {
  if (mounted) return;
  const { terrain } = getSceneRoot();
  mounted = new Group();
  mounted.name = 'wildflowers';
  terrain.add(mounted);

  // Single instanced mesh per color
  const meshes: InstancedMesh[] = [];
  // Pre-build flower geometry as a combined Group → flatten to a
  // single InstancedMesh per color using a small combined geom.
  const stemGeo = new CylinderGeometry(0.012, 0.012, 0.12, 4);
  const headGeo = new SphereGeometry(0.04, 6, 4);
  for (let i = 0; i < PALETTE.length; i++) {
    const pal = PALETTE[i]!;
    const stemMat = new MeshLambertMaterial({ color: pal.stem, flatShading: true });
    const headMat = new MeshLambertMaterial({ color: pal.head, flatShading: true });
    // We need ONE InstancedMesh per geometry per material. Cheaper:
    // build a small Group of [stem + head] meshes per flower & mount
    // them under the wildflowers group directly. Volume is low
    // enough (a few hundred flowers max) that this is fine.
    void stemMat; void headMat;
    meshes.push(null as unknown as InstancedMesh);
  }
  // Use direct Mesh approach — total flower count stays well under
  // 500 even on a fully grass farm.
  let total = 0;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]?.[gx];
      if (!t || t.type !== 'grass') continue;
      const r = smoothHash(gx, gy, 41);
      if (r > 0.28) continue;        // ~28% of grass tiles get flowers
      const clusterSize = 1 + Math.floor(smoothHash(gx, gy, 7) * 3);
      for (let i = 0; i < clusterSize; i++) {
        const rx = smoothHash(gx, gy, 100 + i);
        const rz = smoothHash(gx, gy, 200 + i);
        const colorIdx = pickColorIndex(smoothHash(gx, gy, 300 + i));
        const pal = PALETTE[colorIdx]!;
        const g = new Group();
        const stem = new Mesh(stemGeo, new MeshLambertMaterial({ color: pal.stem, flatShading: true }));
        stem.position.y = 0.06;
        const head = new Mesh(headGeo, new MeshLambertMaterial({ color: pal.head, flatShading: true }));
        head.position.y = 0.14;
        g.add(stem, head);
        g.position.set(
          gx + 0.2 + rx * 0.6,
          groundHeight(gx, gy) + 0.001,
          gy + 0.2 + rz * 0.6,
        );
        g.scale.setScalar(0.7 + smoothHash(gx, gy, 400 + i) * 0.5);
        mounted.add(g);
        total++;
      }
    }
  }
  void total;
}

// No per-frame update — flowers are static.
