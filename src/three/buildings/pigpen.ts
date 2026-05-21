// Pig pen — low wooden shelter beside a muddy patch.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, fence } from '../procgen/building-kit';
import { box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makePigPen(w: number, d: number): Group {
  const g = new Group();
  const hutW = Math.min(w * 0.55, 1.5);
  const hutD = Math.max(1.0, d * 0.45);
  const hutX0 = 0.15;
  const hutZ0 = 0.15;
  const hutG = walls({ w: hutW, d: hutD, h: 0.75, color: '#a07054', trim: '#5a3a20' });
  hutG.position.set(hutX0, 0, hutZ0);
  g.add(hutG);
  const roof = gableRoof({ w: hutW, d: hutD, baseY: 0.75, pitch: 0.4, color: '#4a2810', axis: 'x' });
  roof.position.set(hutX0, 0, hutZ0);
  g.add(roof);
  const doorG = door({ faceZ: hutZ0, faceX: hutX0 + hutW / 2, w: 0.36, h: 0.45 });
  g.add(doorG);

  // Pig snout sign (pink disc with two black dots)
  const snout = new Mesh(cyl(0.13, 0.13, 0.05, 14), mat('#f6b8c0'));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(hutX0 + hutW / 2, 1.05, hutZ0 + 0.02);
  g.add(snout);
  const nostril1 = new Mesh(box(0.03, 0.05, 0.02), mat('#5a3030'));
  nostril1.position.set(hutX0 + hutW / 2 - 0.04, 1.05, hutZ0 + 0.005);
  const nostril2 = nostril1.clone();
  nostril2.position.set(hutX0 + hutW / 2 + 0.04, 1.05, hutZ0 + 0.005);
  g.add(nostril1, nostril2);

  // Mud puddle with reflective center (a brighter ring around a
  // darker pool reads as wet, satisfying, "pig-friendly" mud).
  const mud = new Mesh(cyl(0.62, 0.62, 0.03, 18), mat('#5a3220'));
  mud.position.set(hutX0 + hutW + 0.7, 0.01, d / 2 + 0.2);
  g.add(mud);
  const mudCore = new Mesh(cyl(0.42, 0.42, 0.02, 18), mat('#3a2010'));
  mudCore.position.set(hutX0 + hutW + 0.7, 0.025, d / 2 + 0.2);
  g.add(mudCore);
  // A few hay tufts scattered in the yard
  for (let i = 0; i < 4; i++) {
    const hay = new Mesh(box(0.10, 0.04, 0.10), mat('#e8c64a'));
    const hx = 0.4 + (i / 4) * (w - 0.8) + (Math.random() - 0.5) * 0.1;
    const hz = 0.5 + (i % 2) * 0.8 + (Math.random() - 0.5) * 0.1;
    hay.position.set(hx, 0.025, hz);
    g.add(hay);
  }

  // Fenced yard around the whole footprint
  const fenceG = fence({ w, d, color: '#7a5530', sides: { n: true, e: true, w: true, s: true } });
  // Cut a gap on south wall for the player to "enter"
  g.add(fenceG);
  return g;
}
