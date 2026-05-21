// Fallback factory used when a building type has no dedicated file.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, wallLantern, flowerBox } from '../procgen/building-kit';
import { box } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeGenericProduction(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.1, color: '#d6c08c', trim: '#6e4f2a' }));
  g.add(gableRoof({ w, d, baseY: 1.1, pitch: 0.7, color: '#8a3a2a', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.55, y: 0.7 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.55, y: 0.7 }));
  // Unique marker so it doesn't look like the bakery
  const tag = new Mesh(box(0.3, 0.3, 0.3), mat('#f4c842', { emissive: '#3a2a08' }));
  tag.position.set(w / 2, 1.85, d / 2);
  g.add(tag);
  // Cozy front porch
  g.add(wallLantern(w / 2 - 0.30, 0.85, -0.06));
  g.add(wallLantern(w / 2 + 0.30, 0.85, -0.06));
  g.add(flowerBox(w / 2 - 0.55, 0.5, -0.05, 0.32));
  g.add(flowerBox(w / 2 + 0.55, 0.5, -0.05, 0.32));
  return g;
}
