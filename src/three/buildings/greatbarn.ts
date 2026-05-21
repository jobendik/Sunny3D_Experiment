// Great Barn (landmark) — huge red barn with cupola. Footprint 4×3.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, wallLantern, flowerBox } from '../procgen/building-kit';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeGreatBarn(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.6, color: '#b8281e', trim: '#5a0c08' }));
  // Big white X-cross on south wall
  const xBoard1 = new Mesh(box(0.08, 1.3, 0.02), mat('#f4f0e0'));
  xBoard1.position.set(w / 2 - 0.6, 0.95, -0.01);
  xBoard1.rotation.z = Math.PI / 8;
  const xBoard2 = xBoard1.clone();
  xBoard2.position.set(w / 2 + 0.6, 0.95, -0.01);
  xBoard2.rotation.z = -Math.PI / 8;
  const beamH = new Mesh(box(1.6, 0.08, 0.02), mat('#f4f0e0'));
  beamH.position.set(w / 2, 0.95, -0.01);
  g.add(xBoard1, xBoard2, beamH);

  g.add(gableRoof({ w, d, baseY: 1.6, pitch: 1.15, color: '#4a0c08', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, w: 0.7, h: 1.1, color: '#2a0c08' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 1.3, y: 0.95, w: 0.32, h: 0.32 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 1.3, y: 0.95, w: 0.32, h: 0.32 }));

  // Hay loft on gable
  const loft = new Mesh(box(0.5, 0.4, 0.05), mat('#3a0c08'));
  loft.position.set(w / 2, 2.0, -0.005);
  g.add(loft);
  const hay = new Mesh(box(0.42, 0.3, 0.05), mat('#e8c64a'));
  hay.position.set(w / 2, 2.0, 0.015);
  g.add(hay);

  // Cupola (signature landmark detail)
  const cup = new Mesh(box(0.5, 0.32, 0.5), mat('#f4f0e0'));
  cup.position.set(w / 2, 2.95, d / 2);
  g.add(cup);
  const cupRoof = new Mesh(box(0.55, 0.06, 0.55), mat('#4a0c08'));
  cupRoof.position.set(w / 2, 3.13, d / 2);
  g.add(cupRoof);
  const pole = new Mesh(cyl(0.025, 0.025, 0.5, 6), mat('#3a2a18'));
  pole.position.set(w / 2, 3.4, d / 2);
  g.add(pole);
  // Landmark warmth — flanking lanterns + flowerboxes under the windows
  g.add(wallLantern(w / 2 - 0.6, 1.20, -0.06, 1.3));
  g.add(wallLantern(w / 2 + 0.6, 1.20, -0.06, 1.3));
  g.add(flowerBox(w / 2 - 1.3, 0.65, -0.05, 0.45));
  g.add(flowerBox(w / 2 + 1.3, 0.65, -0.05, 0.45));
  return g;
}
