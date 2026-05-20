// Sugar Mill — red-roofed building with a tall cane pile + crystal sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, chimney } from '../procgen/building-kit';
import { box, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeSugarMill(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.15, color: '#e8d8c0', trim: '#5a3a20' }));
  g.add(gableRoof({ w, d, baseY: 1.15, pitch: 0.75, color: '#b04030', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.8 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.8 }));
  g.add(chimney(w * 0.25, d * 0.4, 1.5, 0.5));

  // Crystal cube sign on the roof (white sugar)
  const crystal = new Mesh(box(0.28, 0.28, 0.28), mat('#fafafa'));
  crystal.rotation.y = Math.PI / 4;
  crystal.position.set(w / 2, 2.05, d / 2);
  g.add(crystal);

  // Cane pile beside the building (south side)
  for (let i = 0; i < 4; i++) {
    const cane = new Mesh(cone(0.04, 0.6, 6), mat('#8ac86a'));
    cane.rotation.z = (Math.random() - 0.5) * 0.5;
    cane.position.set(0.4 + i * 0.07, 0.3, -0.25);
    g.add(cane);
  }
  return g;
}
