// Apiary — small honey hut with a hexagonal hive on the roof.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, flowerBox } from '../procgen/building-kit';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeApiary(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.0, color: '#f4e0a0', trim: '#5a4020' }));
  g.add(gableRoof({ w, d, baseY: 1.0, pitch: 0.6, color: '#a07028', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.85, y: 0.7 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.85, y: 0.7 }));

  // Hexagonal hive on roof (3 stacked rings) with a subtle golden glow
  for (let i = 0; i < 3; i++) {
    const ring = new Mesh(cyl(0.2 - i * 0.03, 0.2 - i * 0.03, 0.13, 6), mat('#e8a040', { emissive: '#3a1e08' }));
    ring.position.set(w / 2, 1.75 + i * 0.13, d / 2);
    ring.castShadow = true;
    g.add(ring);
  }
  // Tiny bee
  const bee = new Mesh(sphere(0.06, 8, 6), mat('#f4d160'));
  bee.position.set(w / 2 + 0.4, 2.0, d / 2);
  g.add(bee);
  const beeStripe = new Mesh(sphere(0.06, 8, 6), mat('#000000'));
  beeStripe.scale.set(0.5, 1, 1);
  beeStripe.position.set(w / 2 + 0.4, 2.0, d / 2);
  g.add(beeStripe);
  // Flower boxes — bees + flowers makes sense
  g.add(flowerBox(w / 2 - 0.85, 0.5, -0.05, 0.36));
  g.add(flowerBox(w / 2 + 0.85, 0.5, -0.05, 0.36));
  return g;
}
