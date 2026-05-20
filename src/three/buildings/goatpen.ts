// Goat pen — small hut with a rocky climbing block.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, fence } from '../procgen/building-kit';
import { box, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeGoatPen(w: number, d: number): Group {
  const g = new Group();
  const hutD = Math.max(1.2, d * 0.55);
  g.add(walls({ w, d: hutD, h: 1.0, color: '#cab48a', trim: '#5a4028' }));
  g.add(gableRoof({ w, d: hutD, baseY: 1.0, pitch: 0.55, color: '#3a2818', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.85, y: 0.7 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.85, y: 0.7 }));

  // Two horns as the rooftop motif
  const horn1 = new Mesh(box(0.04, 0.18, 0.04), mat('#3a2010'));
  horn1.rotation.z = -0.3;
  horn1.position.set(w / 2 - 0.08, 1.8, hutD / 2);
  const horn2 = horn1.clone();
  horn2.rotation.z = 0.3;
  horn2.position.set(w / 2 + 0.08, 1.8, hutD / 2);
  g.add(horn1, horn2);

  // Fenced yard with a climbing rock
  const yardZ0 = hutD;
  const yard = fence({ w, d: d - yardZ0, color: '#7a5530', sides: { n: true, e: true, w: true, s: false } });
  yard.position.set(0, 0, yardZ0);
  g.add(yard);

  const rock = new Mesh(sphere(0.35, 8, 6), mat('#7a807a'));
  rock.scale.set(1.2, 0.7, 1);
  rock.position.set(w * 0.5, 0.2, yardZ0 + (d - yardZ0) * 0.55);
  rock.castShadow = true;
  g.add(rock);
  return g;
}
