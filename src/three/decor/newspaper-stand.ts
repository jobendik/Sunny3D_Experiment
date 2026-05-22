// =============================================================
//  NEWSPAPER STAND — Phase 1.5 diegetic 3D world object.
//
//  Small A-frame newsstand at the south entrance, east of the
//  order truck. Tilted "DAILY ACRE" sign on top, rolled papers in
//  a tray. World bubble 📰 pulses when there's something unread in
//  the gazette (new day or open help request).
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_CENTER_X, HOME_Y1 } from '../../constants';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const NEWS_X = HOME_CENTER_X + 1.5;       // 17.5
export const NEWS_Z = HOME_Y1 + 1.3;             // 25.3
export const NEWS_BUBBLE_Y = 1.9;

let mounted: Group | null = null;

function buildNewsStand(): Group {
  const g = new Group();
  g.name = 'newspaper-stand';

  // A-frame legs (two pairs forming an X from the side)
  const leg1 = new Mesh(box(0.04, 1.0, 0.04), mat('#5a3018'));
  leg1.position.set(-0.18, 0.5, 0);
  leg1.rotation.z = 0.18;
  g.add(leg1);
  const leg2 = new Mesh(box(0.04, 1.0, 0.04), mat('#5a3018'));
  leg2.position.set(0.18, 0.5, 0);
  leg2.rotation.z = -0.18;
  g.add(leg2);
  // Cross-brace
  const brace = new Mesh(box(0.45, 0.04, 0.04), mat('#3a2010'));
  brace.position.y = 0.55;
  g.add(brace);

  // Sign board (tilted forward, wood)
  const sign = new Mesh(box(0.74, 0.42, 0.04), mat('#a87248'));
  sign.position.set(0, 1.05, 0.05);
  sign.rotation.x = -0.18;
  sign.castShadow = true;
  g.add(sign);
  // Sign border (lighter inset)
  const inset = new Mesh(box(0.66, 0.34, 0.02), mat('#fff7e1'));
  inset.position.set(0, 1.05, 0.075);
  inset.rotation.x = -0.18;
  g.add(inset);
  // "Headline" + "subhead" — dark stripes on the cream inset
  const headline = new Mesh(box(0.50, 0.06, 0.005), mat('#2c1c0e'));
  headline.position.set(0, 1.16, 0.087);
  headline.rotation.x = -0.18;
  g.add(headline);
  for (let i = 0; i < 3; i++) {
    const line = new Mesh(box(0.46, 0.02, 0.003), mat('#5a4028'));
    line.position.set(0, 1.04 - i * 0.04, 0.087);
    line.rotation.x = -0.18;
    g.add(line);
  }
  // Tiny "DAILY ACRE" header band on top
  const band = new Mesh(box(0.74, 0.06, 0.05), mat('#c8423a'));
  band.position.set(0, 1.30, 0.07);
  band.rotation.x = -0.18;
  g.add(band);

  // Newspaper tray below the sign (where rolled papers sit)
  const tray = new Mesh(box(0.58, 0.06, 0.34), mat('#7a4928'));
  tray.position.set(0, 0.78, 0);
  g.add(tray);
  // Rolled newspapers
  for (let i = 0; i < 4; i++) {
    const roll = new Mesh(cyl(0.05, 0.05, 0.34, 12), mat('#fff7e1'));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(-0.20 + i * 0.13, 0.86, 0);
    g.add(roll);
    // Brown twine around each roll
    const tie = new Mesh(cyl(0.052, 0.052, 0.02, 10), mat('#5a3018'));
    tie.rotation.z = Math.PI / 2;
    tie.position.set(-0.20 + i * 0.13, 0.86, 0);
    g.add(tie);
  }

  return g;
}

/** Install the news stand. Idempotent. */
export function installNewspaperStand(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildNewsStand();
  mounted.position.set(NEWS_X, 0, NEWS_Z);
  mounted.rotation.y = Math.PI;
  entities.add(mounted);
}
