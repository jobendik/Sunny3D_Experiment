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

const stoneMat = new MeshLambertMaterial({ color: new Color('#a8a298'), flatShading: true });
const stoneDarkMat = new MeshLambertMaterial({ color: new Color('#8a8478'), flatShading: true });
const bushMat = new MeshLambertMaterial({ color: new Color('#52a448'), flatShading: true });
const bushDarkMat = new MeshLambertMaterial({ color: new Color('#386e2c'), flatShading: true });
const bushBerryMat = new MeshLambertMaterial({ color: new Color('#e85068'), flatShading: true });
const mushroomCap = new MeshLambertMaterial({ color: new Color('#d3492f'), flatShading: true });
const mushroomCapSpot = new MeshLambertMaterial({ color: new Color('#fff4e0'), flatShading: true });
const mushroomStem = new MeshLambertMaterial({ color: new Color('#f4ecd6'), flatShading: true });

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
  // Two-tone layered bush: a darker base + a lighter "lit hemisphere"
  // offset on top so the silhouette has clear depth.
  const base = new Mesh(bushLgGeom, bushDarkMat);
  base.position.set(0, 0.20, 0);
  base.scale.set(1.15, 0.92, 1.15);
  g.add(base);
  const lit = new Mesh(bushLgGeom, bushMat);
  lit.position.set(0.05, 0.26, 0.04);
  lit.scale.set(1.0, 0.85, 1.0);
  g.add(lit);
  if (rand() < 0.55) {
    const c = new Mesh(bushSmGeom, bushMat);
    c.position.set(-0.16, 0.20, -0.08);
    c.scale.set(0.95, 0.85, 0.95);
    g.add(c);
  }
  // 25% chance of berry highlights
  if (rand() < 0.25) {
    for (let i = 0; i < 4; i++) {
      const berry = new Mesh(new SphereGeometry(0.03, 6, 4), bushBerryMat);
      const ang = (i / 4) * Math.PI * 2 + rand() * 0.5;
      berry.position.set(
        Math.cos(ang) * 0.22,
        0.30 + rand() * 0.08,
        Math.sin(ang) * 0.22,
      );
      g.add(berry);
    }
  }
  return g;
}

function makeMushroomClump(rand: () => number): Group {
  const g = new Group();
  const clumpSize = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < clumpSize; i++) {
    const m = new Group();
    const stem = new Mesh(mushStemGeom, mushroomStem);
    stem.position.y = 0.04;
    const cap = new Mesh(mushCapGeom, mushroomCap);
    cap.position.y = 0.10;
    cap.scale.set(1.05, 0.62, 1.05);
    m.add(stem, cap);
    // Add 2 tiny cream spots on top of the cap for a fairytale feel
    for (let s = 0; s < 2; s++) {
      const spot = new Mesh(new SphereGeometry(0.012, 6, 4), mushroomCapSpot);
      const ang = rand() * Math.PI * 2;
      spot.position.set(Math.cos(ang) * 0.04, 0.135, Math.sin(ang) * 0.04);
      m.add(spot);
    }
    m.position.set((rand() - 0.5) * 0.16, 0, (rand() - 0.5) * 0.16);
    m.scale.setScalar(0.7 + rand() * 0.55);
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
