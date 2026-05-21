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
  { name: 'red',    head: new Color('#ea4d4d'), stem: new Color('#4a8a40'), chance: 0.24 },
  { name: 'yellow', head: new Color('#f8d650'), stem: new Color('#4a8a40'), chance: 0.28 },
  { name: 'white',  head: new Color('#fff8e8'), stem: new Color('#4a8a40'), chance: 0.18 },
  { name: 'purple', head: new Color('#a07adc'), stem: new Color('#4a8a40'), chance: 0.16 },
  { name: 'pink',   head: new Color('#ff8ac0'), stem: new Color('#4a8a40'), chance: 0.14 },
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

  // Pre-build shared per-color materials (one stem mat + one head
  // mat per color) so we never allocate per-flower. Geometry is
  // reused across all flowers in the same color.
  const stemGeo = new CylinderGeometry(0.014, 0.014, 0.16, 5);
  const headGeo = new SphereGeometry(0.055, 8, 6);
  const stemMats: MeshLambertMaterial[] = [];
  const headMats: MeshLambertMaterial[] = [];
  for (let i = 0; i < PALETTE.length; i++) {
    const pal = PALETTE[i]!;
    stemMats.push(new MeshLambertMaterial({ color: pal.stem, flatShading: true }));
    headMats.push(new MeshLambertMaterial({ color: pal.head, flatShading: true }));
  }
  // Use direct Mesh approach — total flower count stays well under
  // 500 even on a fully grass farm. Slightly larger heads at this
  // scale read clearly from the iso camera.
  let total = 0;
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]?.[gx];
      if (!t || t.type !== 'grass') continue;
      const r = smoothHash(gx, gy, 41);
      if (r > 0.32) continue;        // ~32% of grass tiles get flowers
      const clusterSize = 1 + Math.floor(smoothHash(gx, gy, 7) * 4);
      for (let i = 0; i < clusterSize; i++) {
        const rx = smoothHash(gx, gy, 100 + i);
        const rz = smoothHash(gx, gy, 200 + i);
        const colorIdx = pickColorIndex(smoothHash(gx, gy, 300 + i));
        const g = new Group();
        const stem = new Mesh(stemGeo, stemMats[colorIdx]!);
        stem.position.y = 0.08;
        const head = new Mesh(headGeo, headMats[colorIdx]!);
        head.position.y = 0.18;
        g.add(stem, head);
        g.position.set(
          gx + 0.2 + rx * 0.6,
          groundHeight(gx, gy) + 0.001,
          gy + 0.2 + rz * 0.6,
        );
        g.scale.setScalar(0.75 + smoothHash(gx, gy, 400 + i) * 0.55);
        mounted.add(g);
        total++;
      }
    }
  }
  void total;
}

// No per-frame update — flowers are static.
