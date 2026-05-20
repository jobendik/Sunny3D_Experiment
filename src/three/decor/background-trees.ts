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
  // Ring trees around the world margin, biased outward from the
  // playable area so they don't overlap farmland.
  const margin = 3;
  const count = 36;
  for (let i = 0; i < count; i++) {
    const tree = makeBackgroundTree();
    let x = 0;
    let z = 0;
    // Pick a band: north/south/east/west of the world.
    const side = i % 4;
    if (side === 0) { // south
      x = -margin + rand(GRID_W + margin * 2);
      z = -margin + rand(margin);
    } else if (side === 1) { // north
      x = -margin + rand(GRID_W + margin * 2);
      z = GRID_H + rand(margin);
    } else if (side === 2) { // west
      x = -margin + rand(margin);
      z = -margin + rand(GRID_H + margin * 2);
    } else { // east
      x = GRID_W + rand(margin);
      z = -margin + rand(GRID_H + margin * 2);
    }
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    decor.add(tree);
  }
}
