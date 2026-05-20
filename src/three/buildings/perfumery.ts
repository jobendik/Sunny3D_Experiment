// Perfumery — fancy purple shop with a perfume-bottle sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane } from '../procgen/building-kit';
import { box, cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makePerfumery(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.2, color: '#c8a0d8', trim: '#683878' }));
  g.add(gableRoof({ w, d, baseY: 1.2, pitch: 0.85, color: '#5a2a78', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, color: '#3a1a4a' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.9 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.9 }));

  // Perfume bottle on roof
  const bottle = new Mesh(box(0.22, 0.32, 0.18), mat('#e8c0f0', { transparent: true, opacity: 0.85 }));
  bottle.position.set(w / 2, 2.0, d / 2);
  bottle.castShadow = true;
  g.add(bottle);
  const cap = new Mesh(cyl(0.08, 0.08, 0.1, 12), mat('#f4d160'));
  cap.position.set(w / 2, 2.21, d / 2);
  g.add(cap);
  // Tiny scent puff
  const puff = new Mesh(sphere(0.07, 8, 6), mat('#f0d8f8', { transparent: true, opacity: 0.6 }));
  puff.position.set(w / 2 + 0.15, 2.4, d / 2);
  g.add(puff);
  return g;
}
