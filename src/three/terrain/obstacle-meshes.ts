// =============================================================
//  OBSTACLE MESHES
//
//  Renders the per-tile obstacles set by world-gen
//  (state.grid[y][x].obstacle). One Group per occupied tile; the mesh
//  factory dispatches on obstacle.kind.
//
//  Key invariant: the visual obstacle on a tile is ALWAYS driven by
//  state.grid[y][x].obstacle. When the player clears an obstacle, we
//  set obstacle = null and the next updateObstacles() pass removes
//  the mesh. This is what guarantees "visual state always matches
//  gameplay state" — the bug the old scatter.ts caused (plow over
//  rock → plowed soil under rock) cannot recur because plowing is
//  blocked while obstacle != null, and clearing nukes the mesh in
//  the same frame.
//
//  Performance: 1024-tile world, typical obstacle count after gen is
//  ~120-180. Cheap to manage with a Map keyed on "gx,gy".
// =============================================================

import {
  Group,
  Mesh,
  IcosahedronGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  BoxGeometry,
  MeshLambertMaterial,
  Color,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { groundHeight } from './tile-grid';
import type { ObstacleKind } from '../../types';

interface MountedObstacle {
  key: string;
  kind: ObstacleKind;
  variant: number;
  root: Group;
}

const mounted = new Map<string, MountedObstacle>();
let parent: Group | null = null;

// Shared materials so the obstacle meshes never allocate per-tile.
// flatShading reads as low-poly stylized props — matches the rest of
// the farm's procedurally-generated aesthetic.
const M_STONE_LIGHT = new MeshLambertMaterial({ color: new Color('#aaa498'), flatShading: true });
const M_STONE_MID   = new MeshLambertMaterial({ color: new Color('#8d8678'), flatShading: true });
const M_STONE_DARK  = new MeshLambertMaterial({ color: new Color('#6e685a'), flatShading: true });
const M_BUSH_LIGHT  = new MeshLambertMaterial({ color: new Color('#52a448'), flatShading: true });
const M_BUSH_DARK   = new MeshLambertMaterial({ color: new Color('#356a2a'), flatShading: true });
const M_BERRY       = new MeshLambertMaterial({ color: new Color('#e85068'), flatShading: true });
const M_BARK        = new MeshLambertMaterial({ color: new Color('#5a3a20'), flatShading: true });
const M_BARK_DARK   = new MeshLambertMaterial({ color: new Color('#3a2410'), flatShading: true });
const M_BARK_RING   = new MeshLambertMaterial({ color: new Color('#8a6840'), flatShading: true });
const M_BRAMBLE     = new MeshLambertMaterial({ color: new Color('#5a3e2a'), flatShading: true });
const M_BRAMBLE_LF  = new MeshLambertMaterial({ color: new Color('#7aa650'), flatShading: true });
const M_MUD         = new MeshLambertMaterial({ color: new Color('#5d4528'), flatShading: true });
const M_MUD_DARK    = new MeshLambertMaterial({ color: new Color('#3a2c1a'), flatShading: true });

// Shared geometries — built once.
const G_STONE_LG = new IcosahedronGeometry(0.34, 0);
const G_STONE_MD = new IcosahedronGeometry(0.22, 0);
const G_STONE_SM = new IcosahedronGeometry(0.14, 0);
const G_BUSH_LG = new SphereGeometry(0.38, 10, 8);
const G_BUSH_SM = new SphereGeometry(0.28, 8, 6);
const G_BERRY   = new SphereGeometry(0.045, 6, 4);
const G_LOG     = new CylinderGeometry(0.18, 0.18, 0.95, 10);
const G_LOG_END = new CylinderGeometry(0.18, 0.18, 0.025, 10);
const G_STUMP   = new CylinderGeometry(0.30, 0.34, 0.32, 12);
const G_STUMP_TOP = new CylinderGeometry(0.28, 0.30, 0.04, 12);
const G_BRAMBLE_KNOT = new IcosahedronGeometry(0.16, 0);
const G_THORN = new ConeGeometry(0.04, 0.16, 6);
const G_MUD_PUDDLE = new CylinderGeometry(0.42, 0.46, 0.04, 14);

function deterministic(gx: number, gy: number, salt: number): number {
  let h = (gx * 73856093) ^ (gy * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

function makeRock(gx: number, gy: number, variant: number): Group {
  const g = new Group();
  // Bigger central stone + two satellite stones. Variant controls
  // which materials lead — gives the field of rocks visible variety.
  const lead = [M_STONE_LIGHT, M_STONE_MID, M_STONE_DARK, M_STONE_MID][variant & 3]!;
  const off  = [M_STONE_MID, M_STONE_DARK, M_STONE_LIGHT, M_STONE_LIGHT][variant & 3]!;
  const big = new Mesh(G_STONE_LG, lead);
  big.position.set(0, 0.22, 0);
  big.rotation.set(deterministic(gx, gy, 1) * 6, deterministic(gx, gy, 2) * 6, deterministic(gx, gy, 3) * 6);
  big.scale.set(1, 0.78, 1);
  big.castShadow = true;
  g.add(big);
  if (deterministic(gx, gy, 4) < 0.75) {
    const med = new Mesh(G_STONE_MD, off);
    med.position.set(
      (deterministic(gx, gy, 5) - 0.5) * 0.42,
      0.12,
      (deterministic(gx, gy, 6) - 0.5) * 0.42,
    );
    med.rotation.set(deterministic(gx, gy, 7) * 6, deterministic(gx, gy, 8) * 6, deterministic(gx, gy, 9) * 6);
    med.scale.set(1, 0.7, 1);
    med.castShadow = true;
    g.add(med);
  }
  if (deterministic(gx, gy, 10) < 0.55) {
    const sm = new Mesh(G_STONE_SM, lead);
    sm.position.set(
      (deterministic(gx, gy, 11) - 0.5) * 0.38,
      0.07,
      (deterministic(gx, gy, 12) - 0.5) * 0.38,
    );
    sm.scale.set(1, 0.7, 1);
    g.add(sm);
  }
  return g;
}

function makeBush(gx: number, gy: number, variant: number): Group {
  const g = new Group();
  // Layered two-tone canopy.
  const base = new Mesh(G_BUSH_LG, M_BUSH_DARK);
  base.position.set(0, 0.32, 0);
  base.scale.set(1.12, 0.92, 1.12);
  base.castShadow = true;
  g.add(base);
  const lit = new Mesh(G_BUSH_LG, M_BUSH_LIGHT);
  lit.position.set(0.05, 0.38, 0.04);
  lit.scale.set(1.0, 0.86, 1.0);
  g.add(lit);
  if (deterministic(gx, gy, 22) < 0.55) {
    const sub = new Mesh(G_BUSH_SM, M_BUSH_LIGHT);
    sub.position.set(-0.18, 0.30, -0.10);
    sub.scale.set(0.95, 0.85, 0.95);
    g.add(sub);
  }
  // Berry highlights on a quarter of bushes — adds a beat of warm
  // colour without making bushes confusing with crops.
  if ((variant & 3) === 0) {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + deterministic(gx, gy, 30 + i) * 0.5;
      const berry = new Mesh(G_BERRY, M_BERRY);
      berry.position.set(
        Math.cos(ang) * 0.26,
        0.42 + deterministic(gx, gy, 40 + i) * 0.10,
        Math.sin(ang) * 0.26,
      );
      g.add(berry);
    }
  }
  return g;
}

function makeStump(gx: number, gy: number, _variant: number): Group {
  const g = new Group();
  const trunk = new Mesh(G_STUMP, M_BARK);
  trunk.position.y = 0.16;
  trunk.castShadow = true;
  g.add(trunk);
  // Lighter ring on top to read as the cut face.
  const ring = new Mesh(G_STUMP_TOP, M_BARK_RING);
  ring.position.y = 0.34;
  g.add(ring);
  // 2-3 tiny moss tufts on a third of stumps.
  if (deterministic(gx, gy, 51) < 0.4) {
    for (let i = 0; i < 3; i++) {
      const moss = new Mesh(G_BUSH_SM, M_BUSH_DARK);
      const ang = (i / 3) * Math.PI * 2;
      moss.position.set(Math.cos(ang) * 0.22, 0.32, Math.sin(ang) * 0.22);
      moss.scale.set(0.45, 0.30, 0.45);
      g.add(moss);
    }
  }
  return g;
}

function makeLog(gx: number, gy: number, variant: number): Group {
  const g = new Group();
  const log = new Mesh(G_LOG, M_BARK);
  log.position.y = 0.18;
  // Random spin around Y so logs aren't all aligned.
  log.rotation.z = Math.PI / 2;
  log.rotation.y = (variant & 1) ? 0.3 : -0.3;
  log.castShadow = true;
  g.add(log);
  // End caps to suggest cut wood — slightly lighter so they catch
  // the sun.
  const endA = new Mesh(G_LOG_END, M_BARK_RING);
  endA.rotation.z = Math.PI / 2;
  endA.position.set(-0.46, 0.18, 0);
  endA.rotation.y = log.rotation.y;
  g.add(endA);
  const endB = new Mesh(G_LOG_END, M_BARK_RING);
  endB.rotation.z = Math.PI / 2;
  endB.position.set(0.46, 0.18, 0);
  endB.rotation.y = log.rotation.y;
  g.add(endB);
  // 50% chance a smaller sub-log rests against the main one.
  if ((variant & 1) === 0) {
    const sub = new Mesh(new CylinderGeometry(0.10, 0.10, 0.5, 8), M_BARK_DARK);
    sub.rotation.z = Math.PI / 2;
    sub.rotation.y = log.rotation.y + 0.2;
    sub.position.set(0.1, 0.40, -0.20);
    g.add(sub);
  }
  return g;
}

function makeBramble(gx: number, gy: number, _variant: number): Group {
  const g = new Group();
  // Tangle of brown knots with a few green leaves and outward thorns.
  for (let i = 0; i < 4; i++) {
    const knot = new Mesh(G_BRAMBLE_KNOT, M_BRAMBLE);
    const ang = (i / 4) * Math.PI * 2 + deterministic(gx, gy, 60 + i) * 0.6;
    knot.position.set(
      Math.cos(ang) * 0.18 + (deterministic(gx, gy, 70 + i) - 0.5) * 0.1,
      0.10 + deterministic(gx, gy, 80 + i) * 0.06,
      Math.sin(ang) * 0.18 + (deterministic(gx, gy, 90 + i) - 0.5) * 0.1,
    );
    knot.scale.set(1.1, 0.9, 1.1);
    g.add(knot);
  }
  // A few leaves so the bramble doesn't read as just a pile of dirt.
  for (let i = 0; i < 6; i++) {
    const leaf = new Mesh(new SphereGeometry(0.06, 6, 4), M_BRAMBLE_LF);
    const ang = i * 1.04;
    leaf.position.set(Math.cos(ang) * 0.22, 0.18, Math.sin(ang) * 0.22);
    leaf.scale.set(1, 0.4, 1);
    g.add(leaf);
  }
  // Thorns
  for (let i = 0; i < 5; i++) {
    const thorn = new Mesh(G_THORN, M_STONE_DARK);
    const ang = i * 1.27;
    thorn.position.set(Math.cos(ang) * 0.22, 0.16, Math.sin(ang) * 0.22);
    thorn.rotation.set(deterministic(gx, gy, 100 + i) * 0.6 - 0.3, ang, 0);
    g.add(thorn);
  }
  return g;
}

function makeMud(gx: number, gy: number, _variant: number): Group {
  const g = new Group();
  const puddle = new Mesh(G_MUD_PUDDLE, M_MUD);
  puddle.position.y = 0.02;
  g.add(puddle);
  // Darker inner patch + 1-2 spatters.
  const inner = new Mesh(new CylinderGeometry(0.24, 0.28, 0.05, 12), M_MUD_DARK);
  inner.position.y = 0.045;
  g.add(inner);
  for (let i = 0; i < 2; i++) {
    const sp = new Mesh(new SphereGeometry(0.06, 6, 4), M_MUD_DARK);
    const ang = deterministic(gx, gy, 110 + i) * Math.PI * 2;
    sp.position.set(Math.cos(ang) * 0.30, 0.05, Math.sin(ang) * 0.30);
    sp.scale.set(1, 0.4, 1);
    g.add(sp);
  }
  return g;
}

function makeObstacleMesh(kind: ObstacleKind, gx: number, gy: number, variant: number): Group {
  switch (kind) {
    case 'rock':    return makeRock(gx, gy, variant);
    case 'bush':    return makeBush(gx, gy, variant);
    case 'stump':   return makeStump(gx, gy, variant);
    case 'log':     return makeLog(gx, gy, variant);
    case 'bramble': return makeBramble(gx, gy, variant);
    case 'mud':     return makeMud(gx, gy, variant);
  }
}

function placeObstacle(gx: number, gy: number, kind: ObstacleKind, variant: number): MountedObstacle {
  const root = makeObstacleMesh(kind, gx, gy, variant);
  // Centre the obstacle on the tile, sitting on top of the box. Mud
  // and brambles sit slightly flatter so they don't poke through
  // hover/placement highlights.
  const ground = groundHeight(gx, gy) + 0.005;
  root.position.set(gx + 0.5, ground, gy + 0.5);
  // Subtle per-tile rotation so adjacent same-kind obstacles never
  // look stamped.
  root.rotation.y = deterministic(gx, gy, 999) * Math.PI * 2;
  const s = 0.9 + deterministic(gx, gy, 1009) * 0.25;
  root.scale.setScalar(s);
  return { key: `${gx},${gy}`, kind, variant, root };
}

export function installObstacles(): void {
  if (parent) return;
  const { terrain } = getSceneRoot();
  parent = new Group();
  parent.name = 'tile-obstacles';
  terrain.add(parent);
  // Initial fill.
  refreshObstacles();
}

/** Walk the grid and add/remove meshes so the scene matches state. */
export function refreshObstacles(): void {
  if (!parent) return;
  const seen = new Set<string>();
  for (let gy = 0; gy < GRID_H; gy++) {
    const row = state.grid[gy];
    if (!row) continue;
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = row[gx];
      if (!t || !t.obstacle) continue;
      const key = `${gx},${gy}`;
      seen.add(key);
      const have = mounted.get(key);
      if (have && have.kind === t.obstacle.kind && have.variant === t.obstacle.variant) continue;
      // Type/variant changed (rare — usually obstacle is set once at
      // gen and only cleared, never mutated). Tear down and rebuild.
      if (have) {
        parent.remove(have.root);
      }
      const m = placeObstacle(gx, gy, t.obstacle.kind, t.obstacle.variant);
      parent.add(m.root);
      mounted.set(key, m);
    }
  }
  // Remove meshes whose tile obstacle has been cleared.
  for (const [key, m] of mounted) {
    if (seen.has(key)) continue;
    parent.remove(m.root);
    mounted.delete(key);
  }
}

// Public helper so action code can request a fast refresh after
// clearing an obstacle — otherwise the next animation frame will
// pick it up via updateObstacles().
export function clearObstacleVisualAt(gx: number, gy: number): void {
  const key = `${gx},${gy}`;
  const m = mounted.get(key);
  if (m && parent) {
    parent.remove(m.root);
    mounted.delete(key);
  }
}

let dirtyT = 0;
/** Called every frame; cheap — just polls for added/removed
 *  obstacles on a short interval so we don't iterate the grid every
 *  frame for an event that fires a handful of times per session. */
export function updateObstacles(timeS: number): void {
  if (!parent) return;
  if (timeS - dirtyT < 0.5) return;
  dirtyT = timeS;
  refreshObstacles();
}
