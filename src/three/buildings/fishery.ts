// Fishery (landmark) — stone building with a big fish sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, wallLantern, flowerBox } from '../procgen/building-kit';
import { box, sphere, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeFishery(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.4, color: '#a8b8c4', trim: '#3a4a58' }));
  g.add(gableRoof({ w, d, baseY: 1.4, pitch: 0.9, color: '#3a6a8a', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, w: 0.5, h: 0.85, color: '#1a2a3a' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 1.0, y: 0.9 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 1.0, y: 0.9 }));

  // Big stylized fish sign on roof (ellipse + tail)
  const body = new Mesh(sphere(0.35, 12, 10), mat('#5a8ad8'));
  body.scale.set(1.6, 0.7, 1);
  body.position.set(w / 2, 2.3, d / 2);
  body.castShadow = true;
  g.add(body);
  const tail = new Mesh(cone(0.22, 0.32, 6), mat('#5a8ad8'));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(w / 2 - 0.6, 2.3, d / 2);
  g.add(tail);
  // Eye
  const eye = new Mesh(sphere(0.04, 8, 6), mat('#000'));
  eye.position.set(w / 2 + 0.4, 2.42, d / 2 + 0.18);
  g.add(eye);

  // Anchor leaning against south wall
  const anchorBase = new Mesh(box(0.15, 0.05, 0.04), mat('#3a3a3a'));
  anchorBase.position.set(0.4, 0.05, -0.18);
  g.add(anchorBase);
  const anchorShaft = new Mesh(box(0.04, 0.4, 0.04), mat('#3a3a3a'));
  anchorShaft.position.set(0.4, 0.25, -0.18);
  g.add(anchorShaft);
  // Lanterns + flowerboxes
  g.add(wallLantern(w / 2 - 0.40, 1.05, -0.06, 1.2));
  g.add(wallLantern(w / 2 + 0.40, 1.05, -0.06, 1.2));
  g.add(flowerBox(w / 2 - 1.0, 0.6, -0.05, 0.4));
  g.add(flowerBox(w / 2 + 1.0, 0.6, -0.05, 0.4));
  return g;
}
