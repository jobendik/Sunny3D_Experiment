// =============================================================
//  GOAL BEACON
//
//  The objective system surfaces a "next thing to do" location.
//  The 2D version drew a soft glow over the tile; in 3D we show a
//  thin pulsing column of light + a ground ring.
// =============================================================

import { Group, Mesh, PointLight } from 'three';
import { getSceneRoot } from '../scene-root';
import { currentBeacon } from '../../systems/goal-beacon';
import { TILE } from '../../constants';
import { cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

let group: Group | null = null;
let column: Mesh | null = null;
let ring: Mesh | null = null;
let light: PointLight | null = null;

export function installBeacon(): void {
  const { fx } = getSceneRoot();
  group = new Group();
  column = new Mesh(cyl(0.06, 0.06, 2.5, 10), mat('#fff5b0', { transparent: true, opacity: 0.65, emissive: '#f4c542' }));
  column.position.y = 1.25;
  ring = new Mesh(cyl(0.5, 0.5, 0.02, 24), mat('#f4c542', { transparent: true, opacity: 0.55 }));
  ring.position.y = 0.02;
  light = new PointLight(0xf4c542, 0.8, 5, 2);
  light.position.y = 1.5;
  group.add(column, ring, light);
  group.visible = false;
  fx.add(group);
}

export function updateBeacon(timeS: number): void {
  if (!group || !column || !ring) return;
  const b = currentBeacon();
  if (!b) {
    group.visible = false;
    return;
  }
  group.visible = true;
  group.position.set(b.x / TILE, 0, b.y / TILE);
  const pulse = 0.55 + 0.25 * Math.sin(timeS * 2);
  (column.material as { opacity: number }).opacity = pulse;
  ring.scale.setScalar(1 + 0.15 * Math.sin(timeS * 2));
}
