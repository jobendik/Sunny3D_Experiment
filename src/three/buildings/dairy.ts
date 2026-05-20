// Dairy — clean white walls with a chrome milk can on the roof.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane } from '../procgen/building-kit';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeDairy(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.2, color: '#f4f0e8', trim: '#8aa8c8' }));
  g.add(gableRoof({ w, d, baseY: 1.2, pitch: 0.7, color: '#5a8ac8', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, color: '#3a4a6a' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.85, y: 0.85, w: 0.3, h: 0.3 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.85, y: 0.85, w: 0.3, h: 0.3 }));

  // Milk can on roof
  const can = new Mesh(cyl(0.18, 0.15, 0.45, 14), mat('#d4d8dc'));
  can.position.set(w / 2, 2.1, d / 2);
  can.castShadow = true;
  g.add(can);
  const lid = new Mesh(cyl(0.13, 0.13, 0.07, 14), mat('#a4a8ac'));
  lid.position.set(w / 2, 2.36, d / 2);
  g.add(lid);
  // Drop of milk falling from spout
  const drop = new Mesh(sphere(0.05, 8, 6), mat('#f8f8f0'));
  drop.position.set(w / 2 + 0.18, 2.18, d / 2);
  g.add(drop);
  return g;
}
