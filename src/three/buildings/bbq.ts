// BBQ Pit — small black-roofed building with a smoker barrel out front.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, chimney } from '../procgen/building-kit';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeBbq(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.05, color: '#bca890', trim: '#2a1810' }));
  g.add(gableRoof({ w, d, baseY: 1.05, pitch: 0.65, color: '#1a1410', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, color: '#1a0e08' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.75 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.75 }));
  g.add(chimney(w * 0.78, d * 0.4, 1.45, 0.55));

  // Smoker barrel out front
  const barrel = new Mesh(cyl(0.22, 0.22, 0.55, 16), mat('#3a2010'));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(w / 2, 0.32, -0.4);
  barrel.castShadow = true;
  g.add(barrel);
  const legL = new Mesh(cyl(0.025, 0.025, 0.32, 6), mat('#1a1410'));
  legL.position.set(w / 2 - 0.25, 0.16, -0.4);
  const legR = legL.clone();
  legR.position.set(w / 2 + 0.25, 0.16, -0.4);
  g.add(legL, legR);
  // Glowing coal sphere inside
  const coal = new Mesh(sphere(0.08, 8, 6), mat('#1a0e08', { emissive: '#f4502a' }));
  coal.position.set(w / 2, 0.4, -0.4);
  g.add(coal);
  return g;
}
