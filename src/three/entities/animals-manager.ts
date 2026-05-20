// =============================================================
//  ANIMALS MANAGER
//
//  Animals live inside pen buildings. Each PenAnimal has (ax, ay)
//  position in pen-local PIXEL coords (see loop.ts wander code).
//  Convert to world units by dividing by TILE and offsetting by
//  the building's tile origin.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { TILE } from '../../constants';
import { BUILDINGS } from '../../data/buildings';
import { ANIMALS } from '../../data/animals';
import { getSceneRoot } from '../scene-root';
import { sphere, cyl, box } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface AnimalMounted {
  buildingId: string;
  index: number;
  root: Group;
  kind: string;
}

const mounted = new Map<string, AnimalMounted>();
const keyOf = (bId: string, i: number): string => `${bId}#${i}`;

function makeAnimalMesh(kind: string): Group {
  const def = ANIMALS[kind];
  const g = new Group();
  if (!def) return g;
  const body = def.body;
  // Body: stretched sphere
  const bodyM = new Mesh(sphere(0.22, 12, 10), mat(body.color));
  bodyM.scale.set(1.1, 0.7, 0.85);
  bodyM.position.y = 0.16;
  bodyM.castShadow = true;
  g.add(bodyM);
  // Head: smaller sphere offset forward
  const head = new Mesh(sphere(0.13, 10, 8), mat(body.color));
  head.position.set(0.22, 0.22, 0);
  head.castShadow = true;
  g.add(head);
  // 4 short legs
  for (const [dx, dz] of [[-0.13, -0.1], [-0.13, 0.1], [0.1, -0.1], [0.1, 0.1]] as const) {
    const leg = new Mesh(cyl(0.03, 0.03, 0.12, 6), mat(body.accent));
    leg.position.set(dx, 0.06, dz);
    g.add(leg);
  }
  // Distinguishing accents per species
  if (kind === 'chicken') {
    // Comb (red triangle on head)
    const comb = new Mesh(box(0.04, 0.06, 0.04), mat(body.accent));
    comb.position.set(0.22, 0.34, 0);
    g.add(comb);
    // Beak
    const beak = new Mesh(box(0.05, 0.03, 0.03), mat(body.beak));
    beak.position.set(0.3, 0.22, 0);
    g.add(beak);
  } else if (kind === 'cow') {
    // Black spots
    for (let i = 0; i < 4; i++) {
      const spot = new Mesh(sphere(0.07, 8, 6), mat(body.accent));
      spot.scale.set(1, 0.3, 0.9);
      spot.position.set(-0.1 + Math.random() * 0.2, 0.27 + Math.random() * 0.05, -0.1 + Math.random() * 0.2);
      g.add(spot);
    }
    // Horns
    const horn1 = new Mesh(cyl(0.018, 0.005, 0.07, 6), mat('#f4ecd0'));
    horn1.position.set(0.22, 0.34, 0.07);
    horn1.rotation.x = -0.4;
    const horn2 = horn1.clone();
    horn2.position.set(0.22, 0.34, -0.07);
    horn2.rotation.x = 0.4;
    g.add(horn1, horn2);
  } else if (kind === 'sheep') {
    // Wool fluff: cluster of small spheres
    for (let i = 0; i < 6; i++) {
      const fluff = new Mesh(sphere(0.1 + Math.random() * 0.04, 8, 6), mat(body.color));
      fluff.position.set(-0.1 + Math.random() * 0.2, 0.22 + Math.random() * 0.06, -0.1 + Math.random() * 0.2);
      g.add(fluff);
    }
  } else if (kind === 'pig') {
    // Snout
    const snout = new Mesh(cyl(0.055, 0.055, 0.04, 10), mat(body.beak));
    snout.rotation.z = Math.PI / 2;
    snout.position.set(0.34, 0.22, 0);
    g.add(snout);
    // Curly tail
    const tail = new Mesh(cyl(0.015, 0.015, 0.06, 6), mat(body.color));
    tail.position.set(-0.22, 0.24, 0);
    tail.rotation.z = -0.6;
    g.add(tail);
  } else if (kind === 'duck') {
    // Bill (orange flat block)
    const bill = new Mesh(box(0.08, 0.03, 0.06), mat(body.beak));
    bill.position.set(0.3, 0.22, 0);
    g.add(bill);
  } else if (kind === 'goat') {
    // Beard
    const beard = new Mesh(box(0.03, 0.06, 0.03), mat(body.accent));
    beard.position.set(0.32, 0.18, 0);
    g.add(beard);
  }
  return g;
}

export function updateAnimals(timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();

  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def || def.kind !== 'pen') continue;
    const list = state.penAnimals[b.id];
    if (!list) continue;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      const key = keyOf(b.id, i);
      seen.add(key);
      let m = mounted.get(key);
      if (!m || m.kind !== a.kind) {
        if (m) entities.remove(m.root);
        const root = makeAnimalMesh(a.kind);
        entities.add(root);
        m = { buildingId: b.id, index: i, root, kind: a.kind };
        mounted.set(key, m);
      }
      // Convert pen-local pixel coords to world units. Building's
      // tile origin is (b.x, b.y); ax/ay are in 0..(def.w*TILE).
      const wx = b.x + a.ax / TILE;
      const wz = b.y + a.ay / TILE;
      m.root.position.set(wx, 0, wz);
      // Face direction of travel
      const dx = a.tx - a.ax;
      const dz = a.ty - a.ay;
      if (Math.abs(dx) + Math.abs(dz) > 1) {
        m.root.rotation.y = -Math.atan2(dz, dx);
      }
      // Subtle bob from frame counter
      m.root.position.y = Math.sin((a.frame + timeS * 4) * 0.5) * 0.015;
    }
  }
  for (const [k, m] of mounted) {
    if (!seen.has(k)) {
      entities.remove(m.root);
      mounted.delete(k);
    }
  }
}
