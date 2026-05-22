// =============================================================
//  DECORATIVE SCATTER
//
//  Tiny purely-decorative props sprinkled on the meadow that the
//  player can never interact with: mushroom clumps and pebble dots.
//  These exist OUTSIDE the tile-state grid by design — they never
//  block plowing, building, or anything else.
//
//  Anything that should actually block gameplay (rocks, bushes,
//  stumps, logs, brambles, mud) lives in `tile.obstacle` and is
//  rendered by obstacle-meshes.ts. This separation is the fix for
//  the old "plow ate the rock" bug — visible decorations no longer
//  fight with tile state.
//
//  Density is sparse and deterministic per tile coord so the layout
//  stays stable across reloads.
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

const mushroomCap = new MeshLambertMaterial({ color: new Color('#d3492f'), flatShading: true });
const mushroomCapSpot = new MeshLambertMaterial({ color: new Color('#fff4e0'), flatShading: true });
const mushroomStem = new MeshLambertMaterial({ color: new Color('#f4ecd6'), flatShading: true });
const pebbleMat = new MeshLambertMaterial({ color: new Color('#a8a298'), flatShading: true });
const pebbleDarkMat = new MeshLambertMaterial({ color: new Color('#8a8478'), flatShading: true });

const mushCapGeom = new SphereGeometry(0.07, 8, 6);
const mushStemGeom = new CylinderGeometry(0.022, 0.022, 0.07, 6);
const pebbleSmGeom = new IcosahedronGeometry(0.06, 0);
const pebbleMdGeom = new IcosahedronGeometry(0.09, 0);

function makeMushroomClump(rand: () => number): Group {
  const g = new Group();
  const clumpSize = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < clumpSize; i++) {
    const m = new Group();
    const stem = new Mesh(mushStemGeom, mushroomStem);
    stem.position.y = 0.035;
    const cap = new Mesh(mushCapGeom, mushroomCap);
    cap.position.y = 0.085;
    cap.scale.set(1.05, 0.62, 1.05);
    m.add(stem, cap);
    for (let s = 0; s < 2; s++) {
      const spot = new Mesh(new SphereGeometry(0.012, 6, 4), mushroomCapSpot);
      const ang = rand() * Math.PI * 2;
      spot.position.set(Math.cos(ang) * 0.035, 0.115, Math.sin(ang) * 0.035);
      m.add(spot);
    }
    m.position.set((rand() - 0.5) * 0.18, 0, (rand() - 0.5) * 0.18);
    m.scale.setScalar(0.7 + rand() * 0.55);
    g.add(m);
  }
  return g;
}

function makePebbleScatter(rand: () => number): Group {
  // Tiny loose pebbles — purely cosmetic, easy to walk over, will
  // never confuse a player into thinking they need to be cleared.
  const g = new Group();
  const count = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const m = new Mesh(rand() < 0.5 ? pebbleSmGeom : pebbleMdGeom, rand() < 0.5 ? pebbleMat : pebbleDarkMat);
    m.position.set((rand() - 0.5) * 0.35, 0.03, (rand() - 0.5) * 0.35);
    m.rotation.set(rand() * 6, rand() * 6, rand() * 6);
    m.scale.set(1, 0.55 + rand() * 0.25, 1);
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
      // Skip tiles that already have a tile-level obstacle — the
      // obstacle mesh is the visual feature of that tile.
      if (t.obstacle) continue;
      const r = smoothHash(gx, gy, 333);
      if (r > 0.10) continue;          // ~10% of free grass tiles
      let seed = (gx * 73856093) ^ (gy * 19349663);
      const rand = (): number => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0xffff;
      };
      // 60% pebble, 40% mushroom — mushrooms feel like a magical
      // delight when found, so they should remain rare.
      const k = rand();
      const prop = k < 0.60 ? makePebbleScatter(rand) : makeMushroomClump(rand);
      prop.position.set(
        gx + 0.30 + rand() * 0.40,
        groundHeight(gx, gy) + 0.001,
        gy + 0.30 + rand() * 0.40,
      );
      prop.rotation.y = rand() * Math.PI * 2;
      const s = 0.85 + rand() * 0.35;
      prop.scale.setScalar(s);
      mounted.add(prop);
    }
  }
}
