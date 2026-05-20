// Fishing Dock — a short pier of planks extending into water, with a
// rod leaning over the end. Footprint typically 3×2.
import { Group, Mesh } from 'three';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeFishingDock(w: number, d: number): Group {
  const g = new Group();
  // Plank deck
  const deck = new Mesh(box(w - 0.2, 0.08, d - 0.2), mat('#a07040'));
  deck.position.set(w / 2, 0.06, d / 2);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);
  // Planks (lines)
  for (let i = 1; i < 4; i++) {
    const seam = new Mesh(box(w - 0.2, 0.082, 0.02), mat('#6e4a28'));
    seam.position.set(w / 2, 0.063, 0.2 + (i / 4) * (d - 0.4));
    g.add(seam);
  }
  // Pilings under the four corners
  for (const [x, z] of [[0.2, 0.2], [w - 0.2, 0.2], [0.2, d - 0.2], [w - 0.2, d - 0.2]] as const) {
    const piling = new Mesh(cyl(0.08, 0.08, 0.4, 8), mat('#6e4a28'));
    piling.position.set(x, -0.16, z);
    g.add(piling);
  }
  // Fishing rod leaning off the north edge
  const rod = new Mesh(cyl(0.025, 0.012, 1.0, 6), mat('#c4a070'));
  rod.position.set(w / 2, 0.5, d - 0.2);
  rod.rotation.x = -0.6;
  g.add(rod);
  // Bobber on the line (visible above water)
  const bob = new Mesh(cyl(0.05, 0.05, 0.06, 10), mat('#e64030'));
  bob.position.set(w / 2, 0.04, d + 0.3);
  g.add(bob);
  return g;
}
