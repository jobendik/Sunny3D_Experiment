// =============================================================
//  NEIGHBOURHOOD REQUEST BOARD — Phase 1.6 diegetic world object.
//
//  Tall pole with a birdhouse on top and a small corkboard with
//  pinned cards just below. Sits near the home centre as the
//  neighbourhood social hub. World bubble routes to the club panel
//  until Phase 3 introduces a dedicated request-board panel.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_CENTER_X, HOME_CENTER_Y } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const REQUEST_BOARD_X = HOME_CENTER_X - 5;       // 11
export const REQUEST_BOARD_Z = HOME_CENTER_Y - 3;       // 13
export const REQUEST_BOARD_BUBBLE_Y = 2.4;

let mounted: Group | null = null;

function buildBoard(): Group {
  const g = new Group();
  g.name = 'request-board';

  // Tall pole
  const pole = new Mesh(cyl(0.06, 0.08, 1.7, 8), mat('#5a3018'));
  pole.position.y = 0.85;
  pole.castShadow = true;
  g.add(pole);

  // Corkboard
  const cork = new Mesh(box(0.04, 0.46, 0.6), mat('#a87248'));
  cork.position.set(0, 1.05, 0);
  cork.castShadow = true;
  g.add(cork);
  const corkFace = new Mesh(box(0.02, 0.40, 0.54), mat('#d4a674'));
  corkFace.position.set(0.03, 1.05, 0);
  g.add(corkFace);
  // Pinned request cards
  for (let i = 0; i < 3; i++) {
    const card = new Mesh(box(0.02, 0.14, 0.14), mat(['#fff7e1', '#f8d089', '#d8ffaa'][i]!));
    card.position.set(0.045, 1.18 - i * 0.12, -0.18 + i * 0.18);
    card.rotation.z = (i - 1) * 0.08;
    g.add(card);
    const pin = new Mesh(sphere(0.012, 6, 4), mat('#e54a5e'));
    pin.position.set(0.055, 1.24 - i * 0.12, -0.18 + i * 0.18);
    g.add(pin);
  }

  // Birdhouse on top
  const houseBase = new Mesh(box(0.36, 0.28, 0.32), mat('#f4ecd0'));
  houseBase.position.y = 1.86;
  houseBase.castShadow = true;
  g.add(houseBase);
  // Slanted roof — pyramid-ish via two tilted boxes
  const roofL = new Mesh(box(0.04, 0.30, 0.34), mat('#7a3a24'));
  roofL.position.set(-0.10, 2.06, 0);
  roofL.rotation.z = 0.55;
  g.add(roofL);
  const roofR = new Mesh(box(0.04, 0.30, 0.34), mat('#7a3a24'));
  roofR.position.set(0.10, 2.06, 0);
  roofR.rotation.z = -0.55;
  g.add(roofR);
  // Door hole
  const hole = new Mesh(cyl(0.06, 0.06, 0.04, 14), mat('#2c1c0e'));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, 1.86, 0.17);
  g.add(hole);
  // Perch
  const perch = new Mesh(cyl(0.012, 0.012, 0.08, 6), mat('#3a2010'));
  perch.rotation.x = Math.PI / 2;
  perch.position.set(0, 1.80, 0.21);
  g.add(perch);
  // Roof finial
  const finial = new Mesh(sphere(0.045, 8, 6), mat('#e54a5e'));
  finial.position.y = 2.20;
  g.add(finial);

  return g;
}

export function installRequestBoard(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildBoard();
  mounted.position.set(REQUEST_BOARD_X, 0, REQUEST_BOARD_Z);
  entities.add(mounted);
}
