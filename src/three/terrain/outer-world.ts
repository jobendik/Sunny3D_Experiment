// =============================================================
//  OUTER WORLD
//
//  The playable farm is 18×18, but a Hay-Day-style farm needs to
//  feel like the player is at the heart of a much bigger landscape.
//  This module paints a 60×60 ring of land *around* the playable
//  grid: rolling hills, scattered forest clusters, hidden ponds,
//  far-off mountains. It is purely visual — game logic still operates
//  on the inner 18×18 only.
//
//  The ring is one InstancedMesh of low-poly hex prisms with subtle
//  height variation. Decoration (forests, ponds, rocks) is sprinkled
//  on top using deterministic noise so it stays consistent across
//  page loads (the player remembers "their" view).
// =============================================================

import {
  InstancedMesh,
  Object3D,
  Color,
  Group,
  Mesh,
  CylinderGeometry,
  CircleGeometry,
  ConeGeometry,
  IcosahedronGeometry,
  MeshLambertMaterial,
  MeshStandardMaterial,
  DoubleSide,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { mat } from '../procgen/materials';
import { sphere, cyl } from '../procgen/geometries';

// Outer ring centered on the playable 32×32 grid. The playable world
// is now half-extents 16; we extend the decorative ring another ~30
// units beyond it so the player feels they are in a wider landscape.
const OUTER_RANGE = 42;
const OUTER_STEP = 1.6;
// Density of hex prism instances per row/col.
const OUTER_ROWS = Math.floor((OUTER_RANGE * 2) / OUTER_STEP);

let outerLand: InstancedMesh | null = null;
let outerDecor: Group | null = null;
let outerWater: Mesh | null = null;
let outerWaterMat: MeshStandardMaterial | null = null;

function smoothHash(x: number, y: number, salt = 0): number {
  let h = (Math.floor(x * 131) * 73856093) ^ (Math.floor(y * 131) * 19349663) ^ (salt * 83492791);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}
function rolling(x: number, z: number): number {
  // Smooth multi-octave noise that produces lazy rolling-hill shapes.
  const a = Math.sin(x * 0.14) * Math.cos(z * 0.12);
  const b = Math.sin((x + z) * 0.07) * 0.6;
  const c = smoothHash(Math.floor(x * 0.5), Math.floor(z * 0.5), 7);
  return a * 0.4 + b * 0.5 + (c - 0.5) * 0.6;
}

function isInsidePlayArea(worldX: number, worldZ: number): boolean {
  // Skip the playable grid (the tile-grid mesh already covers it).
  // Leave a 1-unit gap so the outer ring nestles up against the
  // playable border without overlapping the edge tiles.
  return worldX > -0.5 && worldX < GRID_W + 0.5 && worldZ > -0.5 && worldZ < GRID_H + 0.5;
}

// Per-cell biome — we use the height + a noise channel to decide
// what color a cell gets. This bakes a forest belt around the edges
// and meadow biome near the play area.
function biomeColor(worldX: number, worldZ: number, height: number): Color {
  const distFromCenter = Math.max(
    Math.abs(worldX - GRID_W / 2),
    Math.abs(worldZ - GRID_H / 2),
  );
  if (height < -0.2) return new Color('#3a82c8');                // pond
  if (height < -0.05) return new Color('#b8d894');               // marsh
  if (distFromCenter > 32) return new Color('#62956a');          // deep forest floor
  // Meadow palette tuned to match the inner tile palette so the
  // playable grid blends into the outer ring instead of standing
  // out as a different-colored island.
  const t = smoothHash(worldX, worldZ, 3);
  if (t < 0.33) return new Color('#7ccc60');
  if (t < 0.66) return new Color('#8ad36e');
  return new Color('#73c258');
}

function buildOuterLand(): InstancedMesh {
  // Each cell is a hex prism — gives the outer ring an organic
  // tessellation that doesn't visually clash with the square grid
  // inside (different shape = clearly "background").
  const geom = new CylinderGeometry(OUTER_STEP * 0.65, OUTER_STEP * 0.7, 0.4, 6);
  const m = new MeshLambertMaterial({ flatShading: true });
  const totalCells = OUTER_ROWS * OUTER_ROWS;
  const mesh = new InstancedMesh(geom, m, totalCells);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'outer-land';

  const obj = new Object3D();
  let written = 0;
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  for (let row = 0; row < OUTER_ROWS; row++) {
    for (let col = 0; col < OUTER_ROWS; col++) {
      const worldX = cx + (col - OUTER_ROWS / 2) * OUTER_STEP + ((row & 1) ? OUTER_STEP / 2 : 0);
      const worldZ = cz + (row - OUTER_ROWS / 2) * OUTER_STEP;
      if (isInsidePlayArea(worldX, worldZ)) continue;

      const h = rolling(worldX, worldZ);
      // Squish ponds way down so they sit below the visible plane and
      // get covered by the water sheet below.
      const yOffset = h < -0.2 ? -0.6 : h * 0.55;
      const scaleY = h < -0.2 ? 0.4 : 1 + Math.abs(h) * 0.6;
      obj.position.set(worldX, yOffset - 0.2, worldZ);
      obj.rotation.set(0, (col * 0.13 + row * 0.07) % (Math.PI / 3), 0);
      obj.scale.set(1, scaleY, 1);
      obj.updateMatrix();
      mesh.setMatrixAt(written, obj.matrix);
      mesh.setColorAt(written, biomeColor(worldX, worldZ, h));
      written++;
    }
  }
  mesh.count = written;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function buildOuterDecor(): Group {
  const g = new Group();
  g.name = 'outer-decor';

  // Scattered forest clumps. Density tapers with distance — closest
  // ring is sparse (so the player can see distant hills past it),
  // further out is dense.
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  const seedRand = (i: number, salt: number): number => smoothHash(i * 7.31, salt * 2.39, salt);

  // Forest clumps — push the inner radius out past the new 32×32
  // playable world so they don't overlap any expansion region.
  for (let i = 0; i < 280; i++) {
    const r = 19 + seedRand(i, 1) * 26;
    const theta = seedRand(i, 2) * Math.PI * 2;
    const x = cx + Math.cos(theta) * r;
    const z = cz + Math.sin(theta) * r;
    if (isInsidePlayArea(x, z)) continue;
    const h = rolling(x, z);
    if (h < -0.05) continue;       // skip in marsh / pond
    const clumpSize = 2 + Math.floor(seedRand(i, 3) * 4);
    for (let j = 0; j < clumpSize; j++) {
      const jitterX = (seedRand(i, 4 + j) - 0.5) * 1.6;
      const jitterZ = (seedRand(i, 5 + j) - 0.5) * 1.6;
      g.add(makeForestTree(x + jitterX, h * 0.55, z + jitterZ, seedRand(i, 6 + j)));
    }
  }

  // Rocks
  for (let i = 0; i < 80; i++) {
    const r = 20 + seedRand(i, 11) * 24;
    const theta = seedRand(i, 12) * Math.PI * 2;
    const x = cx + Math.cos(theta) * r;
    const z = cz + Math.sin(theta) * r;
    if (isInsidePlayArea(x, z)) continue;
    const h = rolling(x, z);
    if (h < -0.05) continue;
    g.add(makeRock(x, h * 0.55, z, seedRand(i, 13)));
  }

  // Distant mountains — a low ring of tall cones way out so the
  // horizon never just stops at flat grass. Pushed out to keep the
  // ridge well behind the playable + expansion area.
  for (let i = 0; i < 36; i++) {
    const r = 42 + seedRand(i, 21) * 8;
    const theta = (i / 36) * Math.PI * 2 + seedRand(i, 22) * 0.1;
    const x = cx + Math.cos(theta) * r;
    const z = cz + Math.sin(theta) * r;
    g.add(makeMountain(x, z, seedRand(i, 23)));
  }

  return g;
}

function makeForestTree(x: number, y: number, z: number, r: number): Group {
  const g = new Group();
  const h = 1.1 + r * 1.5;
  const trunkColor = ['#4a2a18', '#3a2010', '#5a3a20'][Math.floor(r * 3)] ?? '#4a2a18';
  const palette = ['#3a8a30', '#4a9a40', '#5aa850', '#3e7a2a', '#2d6a22'];
  const leafColor = palette[Math.floor(r * palette.length)] ?? '#3a8a30';
  const trunk = new Mesh(cyl(0.1, 0.14, h, 6), mat(trunkColor));
  trunk.position.y = h / 2;
  trunk.castShadow = false;
  g.add(trunk);
  // 1-3 stacked canopy spheres — coniferous (cone) for the deep
  // forest, broadleaf (spheres) for nearer trees.
  if (r < 0.45) {
    // Pine — stacked cones
    for (let i = 0; i < 3; i++) {
      const conR = 0.6 - i * 0.13;
      const conH = 0.55;
      const c = new Mesh(new ConeGeometry(conR, conH, 6), mat(leafColor));
      c.position.y = h + i * 0.32 - 0.2;
      g.add(c);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const blob = new Mesh(sphere(0.55 - i * 0.12, 8, 6), mat(leafColor));
      blob.position.y = h + i * 0.42 - 0.2;
      g.add(blob);
    }
  }
  g.position.set(x, y, z);
  const s = 0.85 + r * 0.5;
  g.scale.set(s, s, s);
  g.rotation.y = r * Math.PI * 2;
  return g;
}

function makeRock(x: number, y: number, z: number, r: number): Mesh {
  const m = new Mesh(new IcosahedronGeometry(0.35 + r * 0.4, 0), mat('#8a8a8a'));
  m.position.set(x, y + 0.1, z);
  m.rotation.set(r * 6, r * 4, r * 2);
  m.scale.set(1, 0.5 + r * 0.4, 1);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

function makeMountain(x: number, z: number, r: number): Group {
  const g = new Group();
  const h = 7 + r * 5;
  // Slightly cooler, more atmospheric mountains so they read as
  // "far away" rather than competing with the warm farm tones.
  const palette = ['#7d8caf', '#849ab4', '#8090ad'];
  const c = palette[Math.floor(r * palette.length)] ?? palette[0]!;
  const base = new Mesh(new ConeGeometry(2.2 + r * 1.1, h, 6), mat(c));
  base.position.y = h / 2 - 0.5;
  g.add(base);
  // A secondary cone offset to one side adds silhouette interest —
  // ridges feel more "real mountain" with the broken shape.
  if (r > 0.4) {
    const sub = new Mesh(new ConeGeometry(1.6 + r * 0.8, h * 0.75, 6), mat(c));
    sub.position.set(0.9 * (r - 0.5) * 2, h * 0.32 - 0.5, 0.7 * (r - 0.5) * 2);
    g.add(sub);
  }
  const snowCap = new Mesh(new ConeGeometry(0.95, h * 0.27, 6), mat('#f6f9ff'));
  snowCap.position.y = h - h * 0.10;
  g.add(snowCap);
  g.position.set(x, 0, z);
  g.rotation.y = r * Math.PI * 2;
  return g;
}

function buildOuterWater(): Mesh {
  // A single large plane *below* the outer land, recessed enough that
  // only the marsh/pond hex prisms cut through it. Extended out so
  // the player can see distant water rim at far zoom levels.
  const geom = new CircleGeometry(OUTER_RANGE + 12, 48);
  geom.rotateX(-Math.PI / 2);
  outerWaterMat = new MeshStandardMaterial({
    color: new Color('#4a92d0'),
    transparent: true,
    opacity: 0.78,
    roughness: 0.30,
    metalness: 0.12,
    side: DoubleSide,
  });
  const m = new Mesh(geom, outerWaterMat);
  m.position.set(GRID_W / 2, -0.36, GRID_H / 2);
  m.receiveShadow = false;
  m.name = 'outer-water';
  return m;
}

export function installOuterWorld(): void {
  if (outerLand) return;
  const { terrain, decor } = getSceneRoot();
  outerLand = buildOuterLand();
  terrain.add(outerLand);
  outerWater = buildOuterWater();
  terrain.add(outerWater);
  outerDecor = buildOuterDecor();
  decor.add(outerDecor);
}

let waterT = 0;
export function updateOuterWorld(timeS: number): void {
  if (outerWaterMat) {
    waterT = timeS;
    // Very slow hue wobble: lake reads "alive" but never distracts.
    outerWaterMat.color.setHSL(0.58, 0.5, 0.48 + Math.sin(waterT * 0.3) * 0.02);
  }
}
