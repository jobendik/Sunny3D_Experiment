// =============================================================
//  SANCTUARY EASEL — Phase 1.10 diegetic 3D world object.
//
//  Open field journal on an artist's easel near the lake's east
//  shoreline. Anchors the Sanctuary collection book bubble.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_X0, HOME_Y0 } from '../../constants';
import { box, cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';
import { state } from '../../state';

export const EASEL_X = HOME_X0 + 5.5;             // 12.5
export const EASEL_Z = HOME_Y0 + 4.5;             // 11.5
export const EASEL_BUBBLE_Y = 1.9;

let mounted: Group | null = null;
let pagePivot: Group | null = null;

function buildEasel(): Group {
  const g = new Group();
  g.name = 'sanctuary-easel';

  // Tripod legs (3 cyls, tilted)
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new Mesh(cyl(0.025, 0.025, 1.1, 6), mat('#5a3018'));
    leg.position.set(Math.cos(ang) * 0.18, 0.55, Math.sin(ang) * 0.18);
    leg.rotation.z = Math.cos(ang) * 0.22;
    leg.rotation.x = Math.sin(ang) * 0.22;
    leg.castShadow = true;
    g.add(leg);
  }

  // Cross-brace
  const brace = new Mesh(cyl(0.025, 0.025, 0.36, 6), mat('#3a2010'));
  brace.rotation.z = Math.PI / 2;
  brace.position.y = 0.35;
  g.add(brace);

  // The "book" / open journal — two slightly tilted pages
  pagePivot = new Group();
  pagePivot.position.y = 1.05;
  pagePivot.rotation.x = -0.3;
  const left = new Mesh(box(0.35, 0.02, 0.40), mat('#fff7e1'));
  left.position.set(-0.18, 0, 0);
  left.rotation.y = -0.05;
  pagePivot.add(left);
  const right = new Mesh(box(0.35, 0.02, 0.40), mat('#fff7e1'));
  right.position.set(0.18, 0, 0);
  right.rotation.y = 0.05;
  pagePivot.add(right);
  // Page binding (spine)
  const spine = new Mesh(box(0.03, 0.03, 0.42), mat('#5a3018'));
  spine.position.set(0, 0.005, 0);
  pagePivot.add(spine);
  // Sketch lines
  for (let i = 0; i < 4; i++) {
    const line = new Mesh(box(0.24, 0.005, 0.015), mat('#5a4028'));
    line.position.set(-0.18, 0.014, -0.10 + i * 0.07);
    pagePivot.add(line);
  }
  // Little flower sketch (sphere on the right page)
  const flower = new Mesh(sphere(0.04, 8, 6), mat('#e54a5e'));
  flower.position.set(0.18, 0.025, -0.08);
  pagePivot.add(flower);
  g.add(pagePivot);

  // A field bouquet at the base of the easel
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const stem = new Mesh(cyl(0.014, 0.014, 0.22, 6), mat('#3a7a30'));
    stem.position.set(Math.cos(ang) * 0.10 + 0.28, 0.11, Math.sin(ang) * 0.10);
    g.add(stem);
    const head = new Mesh(sphere(0.05, 8, 6), mat(['#e64030', '#f4d160', '#a070d4', '#ff9ed4'][i]!));
    head.position.set(Math.cos(ang) * 0.10 + 0.28, 0.24, Math.sin(ang) * 0.10);
    g.add(head);
  }

  return g;
}

export function installSanctuaryEasel(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildEasel();
  mounted.position.set(EASEL_X, 0, EASEL_Z);
  mounted.rotation.y = -Math.PI / 2;
  entities.add(mounted);
}

/** Per-frame: gentle book breathing when sanctuary is active. */
export function updateSanctuaryEasel(timeS: number): void {
  if (!pagePivot) return;
  const active = !!state.sanctuary?.active;
  pagePivot.rotation.z = active ? Math.sin(timeS * 1.8) * 0.04 : 0;
}
