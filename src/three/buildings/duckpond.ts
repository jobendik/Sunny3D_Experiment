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

  // Pond in the NE area with a brighter shallow ring + deep core
  const pondR = Math.min(w, d) * 0.42;
  const pondCx = w * 0.65;
  const pondCz = d * 0.65;
  const pondRing = new Mesh(cyl(pondR, pondR, 0.04, 26), mat('#74c4e4', { transparent: true, opacity: 0.85 }));
  pondRing.position.set(pondCx, 0.03, pondCz);
  g.add(pondRing);
  const pondCore = new Mesh(cyl(pondR * 0.7, pondR * 0.7, 0.05, 26), mat('#2a72c2', { transparent: true, opacity: 0.85 }));
  pondCore.position.set(pondCx, 0.05, pondCz);
  g.add(pondCore);
  // Bright foam ring outline so the pond has a clear silhouette
  const pondFoam = new Mesh(cyl(pondR * 1.03, pondR * 1.03, 0.02, 26), mat('#ffffff', { transparent: true, opacity: 0.55 }));
  pondFoam.position.set(pondCx, 0.02, pondCz);
  g.add(pondFoam);
  // Lily pads with subtle pink flower
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.3;
    const lpx = pondCx + Math.cos(ang) * pondR * 0.55;
    const lpz = pondCz + Math.sin(ang) * pondR * 0.55;
    const lp = new Mesh(cyl(0.18, 0.18, 0.02, 10), mat('#4ba84a'));
    lp.position.set(lpx, 0.08, lpz);
    g.add(lp);
    if (i % 2 === 0) {
      const flower = new Mesh(cyl(0.05, 0.05, 0.02, 8), mat('#ff9ed4'));
      flower.position.set(lpx + 0.04, 0.10, lpz);
      g.add(flower);
    }
  }
  return g;
}
