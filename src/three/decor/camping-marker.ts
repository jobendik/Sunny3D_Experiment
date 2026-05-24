// =============================================================
//  COUNTRY CAMPING MARKER -- Phase 8 featured event world anchor.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_X0, HOME_Y0 } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const CAMPING_MARKER_X = HOME_X0 - 1.3;
export const CAMPING_MARKER_Z = HOME_Y0 + 2.1;
export const CAMPING_MARKER_BUBBLE_Y = 2.2;

let mounted: Group | null = null;
let smoke: Group | null = null;

function buildCampingMarker(): Group {
  const g = new Group();
  g.name = 'camping-marker';

  const ground = new Mesh(cyl(0.85, 0.95, 0.08, 16), mat('#6e8b49'));
  ground.position.y = 0.04;
  ground.castShadow = true;
  g.add(ground);

  const tentLeft = new Mesh(box(0.72, 0.08, 1.05), mat('#5fb6de'));
  tentLeft.position.set(-0.18, 0.45, 0);
  tentLeft.rotation.z = 0.78;
  tentLeft.castShadow = true;
  g.add(tentLeft);

  const tentRight = new Mesh(box(0.72, 0.08, 1.05), mat('#7fb957'));
  tentRight.position.set(0.18, 0.45, 0);
  tentRight.rotation.z = -0.78;
  tentRight.castShadow = true;
  g.add(tentRight);

  const tentDoor = new Mesh(box(0.28, 0.42, 0.04), mat('#2d4e68'));
  tentDoor.position.set(0, 0.34, 0.54);
  g.add(tentDoor);

  const signPost = new Mesh(cyl(0.035, 0.035, 1.1, 6), mat('#5a3018'));
  signPost.position.set(-0.82, 0.58, -0.12);
  g.add(signPost);
  const sign = new Mesh(box(0.62, 0.28, 0.06), mat('#fff7e1'));
  sign.position.set(-0.82, 1.0, -0.12);
  sign.rotation.y = -0.18;
  g.add(sign);
  const mark = new Mesh(cone(0.07, 0.16, 3), mat('#e54a5e'));
  mark.position.set(-0.58, 1.02, -0.08);
  mark.rotation.z = -Math.PI / 2;
  g.add(mark);

  for (const x of [-0.18, 0.18]) {
    const log = new Mesh(cyl(0.045, 0.045, 0.5, 6), mat('#6e4520'));
    log.position.set(x, 0.15, 0.82);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = x < 0 ? 0.55 : -0.55;
    g.add(log);
  }
  const fire = new Mesh(cone(0.12, 0.28, 8), mat('#ff7a2a', { emissive: '#ff7a2a' }));
  fire.position.set(0, 0.31, 0.82);
  g.add(fire);

  smoke = new Group();
  smoke.name = 'camping-smoke';
  for (let i = 0; i < 3; i++) {
    const puff = new Mesh(sphere(0.08 + i * 0.025, 8, 6), mat('#d9d6c8', { transparent: true, opacity: 0.64 }));
    puff.position.set(0.02 * i, 0.55 + i * 0.22, 0.82);
    smoke.add(puff);
  }
  g.add(smoke);

  return g;
}

export function installCampingMarker(): void {
  if (mounted) return;
  mounted = buildCampingMarker();
  mounted.position.set(CAMPING_MARKER_X, 0, CAMPING_MARKER_Z);
  mounted.rotation.y = Math.PI * 0.2;
  mounted.visible = false;
  getSceneRoot().entities.add(mounted);
}

export function updateCampingMarker(timeS: number): void {
  if (!mounted) return;
  mounted.visible = state.level >= 8;
  if (!mounted.visible || !smoke) return;
  smoke.children.forEach((c, i) => {
    const s = 1 + Math.sin(timeS * 1.8 + i) * 0.12;
    c.position.y = 0.55 + i * 0.22 + Math.sin(timeS * 1.3 + i) * 0.04;
    c.scale.set(s, s, s);
  });
}
