// =============================================================
//  DAILY WHEEL STAND — Phase 1.9 diegetic 3D world object.
//
//  Fairground-style wheel of fortune on a stand near the south
//  entrance, west of the order truck. Spins idly; spins faster
//  when the player can claim their daily spin.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_X0, HOME_Y1 } from '../../constants';
import { box, cyl, sphere, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';
import { canSpin } from '../../systems/wheel';

export const WHEEL_X = HOME_X0 + 0.5;             // 7.5
export const WHEEL_Z = HOME_Y1 + 1.4;             // 25.4
export const WHEEL_BUBBLE_Y = 2.5;

let mounted: Group | null = null;
let wheelPivot: Group | null = null;

function buildWheelStand(): Group {
  const g = new Group();
  g.name = 'wheel-stand';

  // Base platform
  const base = new Mesh(box(0.9, 0.16, 0.6), mat('#5a3018'));
  base.position.y = 0.08;
  g.add(base);
  // Decorative skirt
  const skirt = new Mesh(box(0.95, 0.08, 0.65), mat('#c8423a'));
  skirt.position.y = 0.04;
  g.add(skirt);

  // Two pillars holding the wheel axle
  for (const x of [-0.32, 0.32]) {
    const pillar = new Mesh(cyl(0.05, 0.05, 1.2, 8), mat('#5a3018'));
    pillar.position.set(x, 0.76, 0);
    pillar.castShadow = true;
    g.add(pillar);
    const cap = new Mesh(sphere(0.07, 10, 8), mat('#e0a020'));
    cap.position.set(x, 1.38, 0);
    g.add(cap);
  }

  // The wheel itself — pivots around its centre. Composed of a cyl
  // back disc + coloured wedge "slices" (boxes) attached at angles.
  wheelPivot = new Group();
  wheelPivot.name = 'wheel-pivot';
  wheelPivot.position.set(0, 0.95, 0);
  const backDisc = new Mesh(cyl(0.48, 0.48, 0.04, 24), mat('#f4ecd0'));
  backDisc.rotation.x = Math.PI / 2;
  wheelPivot.add(backDisc);
  // 8 coloured slice "spokes" — narrow boxes pointing outward
  const sliceColors = [
    '#e54a5e', '#f4b942', '#7fb957', '#5fb6de',
    '#9b54c8', '#f48a2a', '#e9d23a', '#3a7a30',
  ];
  for (let i = 0; i < 8; i++) {
    const slice = new Mesh(box(0.10, 0.04, 0.42), mat(sliceColors[i]!));
    const ang = (i / 8) * Math.PI * 2;
    slice.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, 0.04);
    slice.rotation.z = ang;
    wheelPivot.add(slice);
  }
  // Centre hub
  const hub = new Mesh(cyl(0.08, 0.08, 0.06, 16), mat('#e0a020'));
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.05;
  wheelPivot.add(hub);
  g.add(wheelPivot);

  // Pointer at the top
  const pointer = new Mesh(cone(0.06, 0.16, 8), mat('#e54a5e'));
  pointer.position.set(0, 1.48, 0.04);
  pointer.rotation.x = Math.PI;
  g.add(pointer);

  return g;
}

export function installWheelStand(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildWheelStand();
  mounted.position.set(WHEEL_X, 0, WHEEL_Z);
  mounted.rotation.y = Math.PI;
  entities.add(mounted);
}

/** Per-frame: spin the wheel. Faster when a daily spin is available. */
export function updateWheelStand(timeS: number): void {
  if (!wheelPivot) return;
  const speed = canSpin() ? 1.6 : 0.4;
  wheelPivot.rotation.z = timeS * speed;
}
