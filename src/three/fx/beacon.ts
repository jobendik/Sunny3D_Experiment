// =============================================================
//  GOAL BEACON
//
//  The objective system surfaces a "next thing to do" location.
//  The 2D version drew a soft glow over the tile; in 3D we show a
//  thin pulsing column of light + a ground ring.
// =============================================================

import { Group, Mesh, PointLight, MeshBasicMaterial } from 'three';
import { getSceneRoot } from '../scene-root';
import { currentBeacon } from '../../systems/goal-beacon';
import { TILE } from '../../constants';
import { cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

let group: Group | null = null;
let column: Mesh | null = null;
let columnOuter: Mesh | null = null;
let ring: Mesh | null = null;
let ringMat: MeshBasicMaterial | null = null;
let light: PointLight | null = null;

export function installBeacon(): void {
  const { fx } = getSceneRoot();
  group = new Group();
  // Inner bright column + softer wider halo column for a real "shaft
  // of golden light" feel that picks up the bloom pass.
  column = new Mesh(
    cyl(0.06, 0.10, 2.8, 12),
    mat('#fff5b0', { transparent: true, opacity: 0.78, emissive: '#f4c542' }),
  );
  column.position.y = 1.4;
  columnOuter = new Mesh(
    cyl(0.18, 0.28, 2.8, 12),
    mat('#ffdb8a', { transparent: true, opacity: 0.18, emissive: '#f4c542' }),
  );
  columnOuter.position.y = 1.4;
  // Use a thin disk-like ring on the ground with strong emissive.
  ring = new Mesh(cyl(0.55, 0.55, 0.01, 32), mat('#f4c542', { transparent: true, opacity: 0.65, emissive: '#f4c542' }));
  ring.position.y = 0.025;
  ringMat = ring.material as MeshBasicMaterial;
  light = new PointLight(0xf4c542, 1.0, 6, 2);
  light.position.y = 1.6;
  group.add(column, columnOuter, ring, light);
  group.visible = false;
  fx.add(group);
}

export function updateBeacon(timeS: number): void {
  if (!group || !column || !columnOuter || !ring) return;
  const b = currentBeacon();
  if (!b) {
    group.visible = false;
    return;
  }
  group.visible = true;
  group.position.set(b.x / TILE, 0, b.y / TILE);
  const pulse = 0.55 + 0.30 * Math.sin(timeS * 2.4);
  (column.material as { opacity: number }).opacity = pulse;
  (columnOuter.material as { opacity: number }).opacity = pulse * 0.32;
  ring.scale.setScalar(1 + 0.20 * Math.sin(timeS * 2.4));
  if (ringMat) ringMat.opacity = 0.55 + 0.20 * Math.sin(timeS * 2.4);
}
