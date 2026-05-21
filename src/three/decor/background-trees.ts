// =============================================================
//  BACKGROUND DECORATION TREES
//
//  Scattered around the edge of the playable area to soften the
//  hard world border. Generated once at boot; no per-frame work.
// =============================================================

import { Group, Mesh } from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';
import { rand } from '../../utils';

function makeBackgroundTree(): Group {
  const g = new Group();
  const h = 1.4 + Math.random() * 1.2;
  const trunk = new Mesh(cyl(0.12, 0.16, h, 8), mat('#4a2a18'));
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  // 3 stacked canopy spheres for a stylized pine/maple silhouette
  const palette = ['#3a8a30', '#4a9a40', '#5aa850', '#6e8a30'];
  const c = palette[Math.floor(Math.random() * palette.length)]!;
  for (let i = 0; i < 3; i++) {
    const r = 0.55 - i * 0.12;
    const cy = h + i * 0.5 - 0.2;
    const blob = new Mesh(sphere(r, 12, 10), mat(c));
    blob.position.y = cy;
    blob.castShadow = true;
    g.add(blob);
  }
  return g;
}

let installed = false;

export function installBackgroundTrees(): void {
  if (installed) return;
  installed = true;
  const { decor } = getSceneRoot();
  // Two-layer ring: inner closer trees (denser) + outer scattered
  // trees that fill in toward the fog. Each tree gets a random
  // scale and rotation so the ring never looks stamped.
  const inner = 28;
  const outer = 22;
  const place = (count: number, marginIn: number, marginOut: number, scaleLo: number, scaleHi: number): void => {
    for (let i = 0; i < count; i++) {
      const tree = makeBackgroundTree();
      const side = i % 4;
      const t = marginIn + rand(marginOut - marginIn);
      let x = 0;
      let z = 0;
      if (side === 0) { x = -marginOut + rand(GRID_W + marginOut * 2); z = -t; }
      else if (side === 1) { x = -marginOut + rand(GRID_W + marginOut * 2); z = GRID_H + t; }
      else if (side === 2) { x = -t; z = -marginOut + rand(GRID_H + marginOut * 2); }
      else { x = GRID_W + t; z = -marginOut + rand(GRID_H + marginOut * 2); }
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const s = scaleLo + Math.random() * (scaleHi - scaleLo);
      tree.scale.set(s, s, s);
      decor.add(tree);
    }
  };
  place(inner, 0.5, 2.5, 0.85, 1.15);   // closer band
  place(outer, 3.0, 6.0, 0.95, 1.35);   // farther band — taller silhouettes
}
