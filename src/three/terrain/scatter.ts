// =============================================================
//  SCATTER
//
//  Small static props scattered across the play-area to break up
//  the otherwise uniform meadow:
//   - Stones (groups of rounded rocks)
//   - Bushes (cluster of low spheres)
//   - Mushroom clumps
//
//  Density is sparse — about 1 in 12 grass tiles gets a scatter
//  item, deterministic per tile coord so the layout is stable.
//
//  These props are static (no per-frame updates) so they cost
//  nothing during gameplay. They're not interactable.
// =============================================================

import {
  Group,
  Mesh,
  IcosahedronGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshLambertMaterial,
  Color,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { groundHeight } from './tile-grid';

let mounted: Group | null = null;

function smoothHash(x: number, y: number, salt = 0): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

const stoneMat = new MeshLambertMaterial({ color: new Color('#9a948a'), flatShading: true });
const stoneDarkMat = new MeshLambertMaterial({ color: new Color('#7a7670'), flatShading: true });
const bushMat = new MeshLambertMaterial({ color: new Color('#3e8a2a'), flatShading: true });
const bushDarkMat = new MeshLambertMaterial({ color: new Color('#2d6a22'), flatShading: true });
const mushroomCap = new MeshLambertMaterial({ color: new Color('#c84030'), flatShading: true });
const mushroomStem = new MeshLambertMaterial({ color: new Color('#f0e8d0'), flatShading: true });

const stoneSmGeom = new IcosahedronGeometry(0.12, 0);
const stoneMdGeom = new IcosahedronGeometry(0.16, 0);
const stoneLgGeom = new IcosahedronGeometry(0.22, 0);
const bushSmGeom = new SphereGeometry(0.22, 8, 6);
const bushLgGeom = new SphereGeometry(0.30, 10, 8);
const mushCapGeom = new SphereGeometry(0.08, 8, 6);
const mushStemGeom = new CylinderGeometry(0.025, 0.025, 0.08, 6);

function makeStoneCluster(rand: () => number): Group {
  const g = new Group();
  const a = new Mesh(stoneLgGeom, stoneMat);
  a.position.set(0, 0.08, 0);
  a.rotation.set(rand() * 6, rand() * 4, rand() * 2);
  a.scale.set(1, 0.7, 1);
  g.add(a);
  if (rand() < 0.8) {
    const b = new Mesh(stoneMdGeom, stoneDarkMat);
    b.position.set(0.18 * (rand() - 0.5) * 2, 0.06, 0.18 * (rand() - 0.5) * 2);
    b.rotation.set(rand() * 6, rand() * 4, rand() * 2);
    b.scale.set(1, 0.6, 1);
    g.add(b);
  }
  if (rand() < 0.6) {
    const c = new Mesh(stoneSmGeom, stoneMat);
    c.position.set(0.16 * (rand() - 0.5) * 2, 0.04, 0.16 * (rand() - 0.5) * 2);
    c.rotation.set(rand() * 6, rand() * 4, rand() * 2);
    g.add(c);
  }
  return g;
}

function makeBush(rand: () => number): Group {
  const g = new Group();
  const a = new Mesh(bushLgGeom, bushMat);
  a.position.set(0, 0.22, 0);
  a.scale.set(1.1, 0.9, 1.1);
  g.add(a);
  const b = new Mesh(bushSmGeom, bushDarkMat);
  b.position.set(0.16, 0.20, 0.08);
  g.add(b);
  if (rand() < 0.4) {
    const c = new Mesh(bushSmGeom, bushMat);
    c.position.set(-0.14, 0.18, -0.06);
    c.scale.set(0.85, 0.85, 0.85);
    g.add(c);
  }
  return g;
}

function makeMushroomClump(rand: () => number): Group {
  const g = new Group();
  for (let i = 0; i < 3; i++) {
    const m = new Group();
    const stem = new Mesh(mushStemGeom, mushroomStem);
    stem.position.y = 0.04;
    const cap = new Mesh(mushCapGeom, mushroomCap);
    cap.position.y = 0.10;
    cap.scale.set(1, 0.6, 1);
    m.add(stem, cap);
    m.position.set((rand() - 0.5) * 0.16, 0, (rand() - 0.5) * 0.16);
    m.scale.setScalar(0.7 + rand() * 0.5);
    g.add(m);
  }
  return g;
}

export function installScatter(): void {
  if (mounted) return;
  const { terrain } = getSceneRoot();
  mounted = new Group();
  mounted.name = 'scatter';
  terrain.add(mounted);

  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]?.[gx];
      if (!t || t.type !== 'grass') continue;
      const r = smoothHash(gx, gy, 333);
      if (r > 0.18) continue;          // ~18% of grass tiles
      // Per-tile deterministic RNG
      let seed = (gx * 73856093) ^ (gy * 19349663);
      const rand = (): number => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0xffff;
      };
      // Pick a prop type
      const k = rand();
      let prop: Group;
      if (k < 0.45) prop = makeStoneCluster(rand);
      else if (k < 0.85) prop = makeBush(rand);
      else prop = makeMushroomClump(rand);
      prop.position.set(
        gx + 0.25 + rand() * 0.5,
        groundHeight(gx, gy) + 0.001,
        gy + 0.25 + rand() * 0.5,
      );
      prop.rotation.y = rand() * Math.PI * 2;
      const s = 0.85 + rand() * 0.35;
      prop.scale.setScalar(s);
      mounted.add(prop);
    }
  }
}
