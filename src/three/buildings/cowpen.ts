// Classic red barn for the cow pen. Footprint 4×3.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, fence, chimney, wallLantern, flowerBox } from '../procgen/building-kit';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeCowPen(w: number, d: number): Group {
  const g = new Group();
  // Barn occupies south 60% of footprint; fenced run to the north.
  const barnD = Math.max(1.6, d * 0.6);
  g.add(walls({ w, d: barnD, h: 1.2, color: '#b8312a', trim: '#6e1c14' }));
  // Big white X-cross on the south wall (signature barn motif)
  const xBoard1 = new Mesh(box(0.06, 1.0, 0.02), mat('#f4f0e0'));
  xBoard1.position.set(w / 2 - 0.5, 0.7, -0.01);
  xBoard1.rotation.z = Math.PI / 8;
  g.add(xBoard1);
  const xBoard2 = xBoard1.clone();
  xBoard2.rotation.z = -Math.PI / 8;
  xBoard2.position.set(w / 2 + 0.5, 0.7, -0.01);
  g.add(xBoard2);
  const beamH = new Mesh(box(1.4, 0.06, 0.02), mat('#f4f0e0'));
  beamH.position.set(w / 2, 0.7, -0.01);
  g.add(beamH);

  g.add(gableRoof({ w, d: barnD, baseY: 1.2, pitch: 0.9, color: '#5a1c14', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, w: 0.55, h: 0.85, color: '#3a1810' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 1.1, y: 0.8, w: 0.26, h: 0.26 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 1.1, y: 0.8, w: 0.26, h: 0.26 }));

  // Hay loft window on the gable
  const loft = new Mesh(box(0.4, 0.32, 0.04), mat('#3a1810'));
  loft.position.set(w / 2, 1.55, -0.005);
  g.add(loft);
  const hay = new Mesh(box(0.32, 0.22, 0.05), mat('#e8c64a'));
  hay.position.set(w / 2, 1.5, 0.01);
  g.add(hay);

  // Cute small cupola on the ridge
  const cup = new Mesh(box(0.3, 0.18, 0.3), mat('#f4f0e0'));
  cup.position.set(w / 2, 2.2, barnD / 2);
  g.add(cup);
  const cupRoof = new Mesh(box(0.32, 0.04, 0.32), mat('#5a1c14'));
  cupRoof.position.set(w / 2, 2.32, barnD / 2);
  g.add(cupRoof);
  const pole = new Mesh(cyl(0.02, 0.02, 0.25, 6), mat('#3a2a18'));
  pole.position.set(w / 2, 2.45, barnD / 2);
  g.add(pole);

  // Fenced run to the north
  const yardZ0 = barnD;
  const yard = fence({
    w, d: d - yardZ0,
    color: '#8a6740',
    sides: { n: true, e: true, w: true, s: false },
  });
  yard.position.set(0, 0, yardZ0);
  g.add(yard);

  // Small water trough in the yard
  const trough = new Mesh(box(0.6, 0.16, 0.22), mat('#888'));
  trough.position.set(0.8, 0.08, yardZ0 + 0.4);
  trough.castShadow = true;
  g.add(trough);
  // Porch lanterns + flowerboxes
  g.add(wallLantern(w / 2 - 0.45, 0.95, -0.06));
  g.add(wallLantern(w / 2 + 0.45, 0.95, -0.06));
  g.add(flowerBox(w / 2 - 1.1, 0.55, -0.05, 0.40));
  g.add(flowerBox(w / 2 + 1.1, 0.55, -0.05, 0.40));
  void chimney;
  return g;
}
