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
  const trunkPal = ['#4a2a18', '#3a2010', '#5a3a1f'];
  const trunkC = trunkPal[Math.floor(Math.random() * trunkPal.length)]!;
  const trunk = new Mesh(cyl(0.12, 0.16, h, 8), mat(trunkC));
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  // Two coordinated greens per tree → layered canopy with depth.
  const lightPal = ['#5cb44b', '#6dc25a', '#79c965', '#5fa54a', '#82d06e'];
  const darkPal  = ['#3e7f30', '#427a32', '#3a702a', '#34692a', '#4a8c3a'];
  const idx = Math.floor(Math.random() * lightPal.length);
  const lightC = lightPal[idx]!;
  const darkC = darkPal[idx]!;
  // 3 stacked canopy spheres — first is the darker "shadow" half,
  // the next two are the bright sun-facing puffs.
  const shape = [
    { r: 0.62, dy: 0,    dx: -0.04, dz: -0.04, c: darkC  },
    { r: 0.52, dy: 0.48, dx:  0.04, dz:  0.04, c: lightC },
    { r: 0.40, dy: 0.92, dx: -0.02, dz:  0.02, c: lightC },
  ];
  for (const s of shape) {
    const blob = new Mesh(sphere(s.r, 12, 10), mat(s.c));
    blob.position.set(s.dx, h + s.dy - 0.2, s.dz);
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
  // The 32×32 playable world already has forest_edge tile obstacles
  // hugging its corners, so the background-tree ring sits one band
  // beyond that: a sparse inner stripe just past the world border +
  // a denser outer stripe that fills toward the fog.
  place(inner, 1.0, 4.0, 0.85, 1.15);   // just past the playable border
  place(outer, 5.0, 9.0, 0.95, 1.35);   // farther band — taller silhouettes
}
