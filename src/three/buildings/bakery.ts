// Bakery — warm stone walls, big brick chimney, bread loaf sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, chimney, wallLantern, flowerBox } from '../procgen/building-kit';
import { box, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeBakery(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.2, color: '#f0d8a8', trim: '#a0764a' }));
  g.add(gableRoof({ w, d, baseY: 1.2, pitch: 0.85, color: '#8a3a2a', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2, w: 0.45, h: 0.7, color: '#5a2f14' }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.85, y: 0.85, w: 0.3, h: 0.3 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.85, y: 0.85, w: 0.3, h: 0.3 }));
  // Big brick chimney
  g.add(chimney(w * 0.78, d * 0.4, 1.6, 0.7));

  // Bread loaf sign hanging over the door
  const loaf = new Mesh(box(0.42, 0.18, 0.22), mat('#c98c44'));
  loaf.position.set(w / 2, 1.05, -0.05);
  loaf.castShadow = true;
  g.add(loaf);
  // Decorative bun on top
  const bun = new Mesh(sphere(0.1, 10, 8), mat('#dba560'));
  bun.scale.set(1.2, 0.6, 1);
  bun.position.set(w / 2, 1.18, -0.05);
  g.add(bun);

  // Porch lanterns flanking the door + flower boxes under windows
  g.add(wallLantern(w / 2 - 0.35, 0.9, -0.06));
  g.add(wallLantern(w / 2 + 0.35, 0.9, -0.06));
  g.add(flowerBox(w / 2 - 0.85, 0.6, -0.05, 0.4));
  g.add(flowerBox(w / 2 + 0.85, 0.6, -0.05, 0.4));

  return g;
}
