// Sheep pen — small wool-themed hut with a fenced run.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, fence, wallLantern, flowerBox } from '../procgen/building-kit';
import { sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeSheepPen(w: number, d: number): Group {
  const g = new Group();
  const hutD = Math.max(1.2, d * 0.55);
  g.add(walls({ w, d: hutD, h: 1.05, color: '#f4ecdc', trim: '#6e5a3a' }));
  g.add(gableRoof({ w, d: hutD, baseY: 1.05, pitch: 0.55, color: '#7a8a6a', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, color: '#5a3a1c' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.72 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.72 }));

  // Fluffy wool cloud as the rooftop sign
  const cloud = new Group();
  for (let i = 0; i < 5; i++) {
    const blob = new Mesh(sphere(0.13 + Math.random() * 0.05, 10, 8), mat('#f8f4e8'));
    blob.position.set(Math.cos(i / 5 * Math.PI * 2) * 0.16, Math.sin(i) * 0.04, Math.sin(i / 5 * Math.PI * 2) * 0.16);
    cloud.add(blob);
  }
  cloud.position.set(w / 2, 1.85, hutD / 2);
  g.add(cloud);

  // Fenced yard
  const yardZ0 = hutD;
  const yard = fence({ w, d: d - yardZ0, color: '#a07040', sides: { n: true, e: true, w: true, s: false } });
  yard.position.set(0, 0, yardZ0);
  g.add(yard);
  // Porch lanterns + flowerboxes
  g.add(wallLantern(w / 2 - 0.30, 0.82, -0.06, 0.85));
  g.add(wallLantern(w / 2 + 0.30, 0.82, -0.06, 0.85));
  g.add(flowerBox(w / 2 - 0.9, 0.5, -0.05, 0.32));
  g.add(flowerBox(w / 2 + 0.9, 0.5, -0.05, 0.32));
  return g;
}
