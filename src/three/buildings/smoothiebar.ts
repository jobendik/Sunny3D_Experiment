// Smoothie Bar — tropical roof, glass cup on top.
import { Group, Mesh } from 'three';
import { walls, door, windowPane } from '../procgen/building-kit';
import { box, cyl, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeSmoothieBar(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.1, color: '#f8e8a0', trim: '#3a8a30' }));
  // Thatched roof = cone tiles + ridge brown
  const thatch = new Mesh(box(w + 0.25, 0.18, d + 0.25), mat('#a0744a'));
  thatch.position.set(w / 2, 1.22, d / 2);
  g.add(thatch);
  const ridge = new Mesh(cyl(0.08, 0.08, w + 0.2, 8), mat('#5a3a20'));
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(w / 2, 1.34, d / 2);
  g.add(ridge);

  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.8, y: 0.8 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.8, y: 0.8 }));

  // Smoothie cup on roof
  const cup = new Mesh(cyl(0.16, 0.12, 0.35, 14), mat('#fce8b8', { transparent: true, opacity: 0.85 }));
  cup.position.set(w / 2, 1.65, d / 2);
  g.add(cup);
  const drink = new Mesh(cyl(0.15, 0.11, 0.3, 14), mat('#d63a4a'));
  drink.position.set(w / 2, 1.65, d / 2);
  g.add(drink);
  // Straw
  const straw = new Mesh(cyl(0.018, 0.018, 0.3, 6), mat('#f4f4f4'));
  straw.rotation.z = 0.15;
  straw.position.set(w / 2 + 0.05, 1.92, d / 2);
  g.add(straw);
  // Mini umbrella
  const umb = new Mesh(cone(0.08, 0.04, 12), mat('#ff5a8a'));
  umb.position.set(w / 2 - 0.08, 1.92, d / 2);
  g.add(umb);
  return g;
}
