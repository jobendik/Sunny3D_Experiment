// Duck pond — small hut next to a circular pond.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door } from '../procgen/building-kit';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeDuckPond(w: number, d: number): Group {
  const g = new Group();
  // Hut occupies the SW corner.
  const hutW = w * 0.45;
  const hutD = d * 0.45;
  const hutG = walls({ w: hutW, d: hutD, h: 0.8, color: '#f4ecdc', trim: '#5a3a1c' });
  hutG.position.set(0.15, 0, 0.15);
  g.add(hutG);
  const roof = gableRoof({ w: hutW, d: hutD, baseY: 0.8, pitch: 0.5, color: '#f49020', axis: 'x' });
  roof.position.set(0.15, 0, 0.15);
  g.add(roof);
  g.add(door({ faceZ: 0.15, faceX: 0.15 + hutW / 2 }));

  // Beak sign on roof
  const beak = new Mesh(box(0.16, 0.08, 0.16), mat('#f49020'));
  beak.position.set(0.15 + hutW / 2, 1.3, 0.15 + hutD / 2);
  g.add(beak);

  // Pond in the NE area
  const pondR = Math.min(w, d) * 0.4;
  const pondCx = w * 0.65;
  const pondCz = d * 0.65;
  const pond = new Mesh(cyl(pondR, pondR, 0.05, 22), mat('#3a86c4', { transparent: true, opacity: 0.85 }));
  pond.position.set(pondCx, 0.03, pondCz);
  g.add(pond);
  // Lily pads
  for (let i = 0; i < 3; i++) {
    const lp = new Mesh(cyl(0.18, 0.18, 0.02, 8), mat('#3a7a30'));
    lp.position.set(pondCx + Math.cos(i * 2) * pondR * 0.5, 0.07, pondCz + Math.sin(i * 2) * pondR * 0.5);
    g.add(lp);
  }
  return g;
}
