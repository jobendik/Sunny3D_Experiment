// =============================================================
//  COUNTY FAIR TENT -- Phase 8 featured event world anchor.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_CENTER_X, HOME_Y1 } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const COUNTY_FAIR_TENT_X = HOME_CENTER_X + 5.4;
export const COUNTY_FAIR_TENT_Z = HOME_Y1 + 1.2;
export const COUNTY_FAIR_TENT_BUBBLE_Y = 2.5;

let mounted: Group | null = null;
let pennants: Group | null = null;

function buildCountyFairTent(): Group {
  const g = new Group();
  g.name = 'county-fair-tent';

  const platform = new Mesh(box(2.2, 0.12, 1.6), mat('#b88456'));
  platform.position.y = 0.06;
  platform.castShadow = true;
  g.add(platform);

  const wallColors = ['#fff7e1', '#e54a5e', '#fff7e1', '#5fb6de'];
  for (let i = 0; i < 4; i++) {
    const stripe = new Mesh(box(0.5, 0.8, 1.45), mat(wallColors[i]!));
    stripe.position.set(-0.75 + i * 0.5, 0.54, 0);
    stripe.castShadow = true;
    g.add(stripe);
  }

  const roof = new Mesh(cone(1.35, 0.75, 4), mat('#f4b942'));
  roof.position.y = 1.32;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.78;
  roof.castShadow = true;
  g.add(roof);

  const peak = new Mesh(sphere(0.10, 10, 8), mat('#e54a5e'));
  peak.position.y = 1.75;
  g.add(peak);

  for (const x of [-1.05, 1.05]) {
    const post = new Mesh(cyl(0.035, 0.035, 1.0, 6), mat('#5a3018'));
    post.position.set(x, 0.58, 0.75);
    g.add(post);
  }

  const ribbonTable = new Mesh(box(1.1, 0.22, 0.38), mat('#fff7e1'));
  ribbonTable.position.set(0, 0.32, 0.96);
  g.add(ribbonTable);
  for (let i = 0; i < 3; i++) {
    const ribbon = new Mesh(box(0.16, 0.22, 0.03), mat(['#9b54c8', '#f4b942', '#5ea33c'][i]!));
    ribbon.position.set(-0.28 + i * 0.28, 0.48, 1.16);
    g.add(ribbon);
  }

  pennants = new Group();
  pennants.name = 'county-fair-pennants';
  for (let i = 0; i < 5; i++) {
    const flag = new Mesh(cone(0.09, 0.18, 3), mat(['#e54a5e', '#f4b942', '#5fb6de'][i % 3]!));
    flag.position.set(-0.9 + i * 0.45, 1.92, 0.05);
    flag.rotation.z = Math.PI;
    pennants.add(flag);
  }
  g.add(pennants);

  return g;
}

export function installCountyFairTent(): void {
  if (mounted) return;
  mounted = buildCountyFairTent();
  mounted.position.set(COUNTY_FAIR_TENT_X, 0, COUNTY_FAIR_TENT_Z);
  mounted.rotation.y = Math.PI;
  mounted.visible = false;
  getSceneRoot().entities.add(mounted);
}

export function updateCountyFairTent(timeS: number): void {
  if (!mounted) return;
  mounted.visible = state.level >= 8;
  if (!mounted.visible || !pennants) return;
  pennants.children.forEach((c, i) => {
    c.rotation.x = Math.sin(timeS * 2.8 + i) * 0.12;
  });
}
