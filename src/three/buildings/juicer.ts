// Juice Press — green walls with an apple-shaped sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane } from '../procgen/building-kit';
import { sphere, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeJuicer(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.15, color: '#c4e8a4', trim: '#3a6024' }));
  g.add(gableRoof({ w, d, baseY: 1.15, pitch: 0.7, color: '#2e8a2e', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.8 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.8 }));

  // Apple sign on top
  const apple = new Mesh(sphere(0.18, 12, 10), mat('#e63a3a'));
  apple.position.set(w / 2, 2.0, d / 2);
  apple.castShadow = true;
  g.add(apple);
  const stem = new Mesh(cyl(0.025, 0.025, 0.1, 6), mat('#3a2010'));
  stem.position.set(w / 2, 2.22, d / 2);
  g.add(stem);
  const leaf = new Mesh(sphere(0.06, 6, 4), mat('#3a8a30'));
  leaf.scale.set(1.5, 0.5, 1);
  leaf.position.set(w / 2 + 0.08, 2.22, d / 2);
  g.add(leaf);
  return g;
}
