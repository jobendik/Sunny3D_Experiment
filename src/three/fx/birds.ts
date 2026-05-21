// =============================================================
//  BIRDS
//
//  V-formations of small bird billboards crossing the sky at varying
//  altitudes. Cheap, atmospheric — a flock takes ~30s to cross the
//  view and despawns. We have at most one flock + one solo bird at
//  any time so they never crowd the scene.
//
//  Each "bird" is a flat triangle pair rotated to look like an
//  upside-down V — that silhouette reads at any distance.
// =============================================================

import {
  Group,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  MeshBasicMaterial,
  Color,
  DoubleSide,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import type { LightingSnapshot } from '../lighting';

interface Flock {
  group: Group;
  /** World-space velocity in units/sec. */
  vx: number;
  vz: number;
  altitude: number;
  /** -1 → not alive, time until next spawn. */
  ttl: number;
  /** Each bird gets a phase used for the wing flap. */
  birds: { mesh: Mesh; phase: number; offsetX: number; offsetZ: number }[];
}

let flock: Flock | null = null;
let group: Group | null = null;
let nextSpawnAt = 4;          // seconds — first flock appears ~4s in

function makeBirdGeom(): BufferGeometry {
  // Two triangles meeting at a point, forming a "V" silhouette.
  const positions = new Float32Array([
    // left wing
    -0.5, 0,  0,
     0,   0,  0,
    -0.3, 0.04, 0.3,
    // right wing
     0,   0,  0,
     0.5, 0,  0,
     0.3, 0.04, 0.3,
  ]);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function makeBird(): Mesh {
  const m = new Mesh(
    makeBirdGeom(),
    new MeshBasicMaterial({ color: new Color('#222831'), side: DoubleSide }),
  );
  m.scale.setScalar(0.7);
  m.renderOrder = 5;
  return m;
}

export function installBirds(): void {
  if (group) return;
  const { sky } = getSceneRoot();
  group = new Group();
  group.name = 'birds';
  sky.add(group);
}

function spawnFlock(): void {
  if (!group) return;
  const f: Flock = {
    group: new Group(),
    vx: 0, vz: 0,
    altitude: 0,
    ttl: 60,
    birds: [],
  };
  // Start from a random edge, fly across the world
  const fromAngle = Math.random() * Math.PI * 2;
  const cx = GRID_W / 2, cz = GRID_H / 2;
  const startR = 22;
  const startX = cx + Math.cos(fromAngle) * startR;
  const startZ = cz + Math.sin(fromAngle) * startR;
  const speed = 2.5 + Math.random() * 1.5;
  f.vx = -Math.cos(fromAngle) * speed;
  f.vz = -Math.sin(fromAngle) * speed;
  f.altitude = 8 + Math.random() * 4;
  f.group.position.set(startX, f.altitude, startZ);
  // V-formation: 1 leader + 4-6 trailing
  const count = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const bird = makeBird();
    // Position offset in V-shape relative to leader
    const side = i === 0 ? 0 : ((i % 2) ? -1 : 1);
    const back = Math.floor((i + 1) / 2);
    const ox = side * back * 0.7;
    const oz = back * 0.9;
    bird.position.set(ox, 0, oz);
    f.group.add(bird);
    f.birds.push({ mesh: bird, phase: Math.random() * Math.PI * 2, offsetX: ox, offsetZ: oz });
  }
  // Face along motion vector
  f.group.rotation.y = Math.atan2(-f.vx, -f.vz);
  group.add(f.group);
  flock = f;
}

export function updateBirds(timeS: number, dt: number, light: LightingSnapshot): void {
  if (!group) return;
  // Only spawn flocks during daylight
  const dayWeight = 1 - Math.min(1, light.nightTint * 2);
  if (!flock && dayWeight > 0.5) {
    nextSpawnAt -= dt;
    if (nextSpawnAt <= 0) {
      spawnFlock();
      nextSpawnAt = 25 + Math.random() * 25;
    }
  }
  if (!flock) return;

  flock.ttl -= dt;
  flock.group.position.x += flock.vx * dt;
  flock.group.position.z += flock.vz * dt;
  // Gentle altitude bob
  flock.group.position.y = flock.altitude + Math.sin(timeS * 0.7) * 0.4;

  for (const b of flock.birds) {
    // Wing flap = small Z-axis rotation around the bird's local origin.
    b.mesh.rotation.x = Math.sin(timeS * 9 + b.phase) * 0.35;
    // V-formation drift
    b.mesh.position.x = b.offsetX + Math.sin(timeS * 0.6 + b.phase) * 0.1;
    b.mesh.position.z = b.offsetZ + Math.cos(timeS * 0.5 + b.phase) * 0.1;
  }

  // Despawn when off-screen or TTL ran out
  const cx = GRID_W / 2, cz = GRID_H / 2;
  const r = Math.hypot(flock.group.position.x - cx, flock.group.position.z - cz);
  if (r > 30 || flock.ttl <= 0) {
    group.remove(flock.group);
    flock.birds.forEach(b => {
      b.mesh.geometry.dispose();
      (b.mesh.material as { dispose?: () => void }).dispose?.();
    });
    flock = null;
  }
}
