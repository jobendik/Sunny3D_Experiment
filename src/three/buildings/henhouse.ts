// Small wooden chicken coop. Footprint 3×3.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane, fence, flowerBox } from '../procgen/building-kit';
import { box, sphere, cone, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeHenHouse(w: number, d: number): Group {
  const g = new Group();
  // The coop occupies the south half; the north half is fenced run.
  const coopD = Math.max(1.2, d * 0.55);
  const coopX0 = 0.15;
  const coopX1 = w - 0.15;
  const coopW = coopX1 - coopX0;
  const wallsG = walls({ w: coopW, d: coopD, h: 0.9, color: '#d99464', trim: '#6e3a1c' });
  wallsG.position.set(coopX0, 0, 0.1);
  g.add(wallsG);
  const roofG = gableRoof({ w: coopW, d: coopD, baseY: 0.9, pitch: 0.55, color: '#5a2a18', axis: 'x' });
  roofG.position.set(coopX0, 0, 0.1);
  g.add(roofG);
  // Door + small entry hole
  const doorG = door({ faceZ: 0.1, faceX: coopX0 + coopW / 2, w: 0.3, h: 0.5 });
  g.add(doorG);
  // Small egg-shaped sign on top so it reads as a chicken coop
  const egg = new Mesh(sphere(0.13, 12, 10), mat('#fff8dc'));
  egg.scale.set(0.85, 1, 0.85);
  egg.position.set(coopX0 + coopW / 2, 1.7, 0.1 + coopD / 2);
  egg.castShadow = true;
  g.add(egg);

  // Fenced yard to the north
  const yardZ0 = 0.1 + coopD;
  const yard = fence({
    w, d: d - yardZ0,
    color: '#a07040',
    sides: { n: true, e: true, w: true, s: false },
  });
  yard.position.set(0, 0, yardZ0);
  g.add(yard);

  // Scatter a few "pebbles" (food bits) on the yard floor
  for (let i = 0; i < 4; i++) {
    const pebble = new Mesh(sphere(0.05, 6, 4), mat('#e8c878'));
    const px = 0.3 + Math.random() * (w - 0.6);
    const pz = yardZ0 + 0.2 + Math.random() * (d - yardZ0 - 0.3);
    pebble.position.set(px, 0.05, pz);
    g.add(pebble);
  }

  // Small windows on coop south wall
  g.add(windowPane({
    faceZ: 0.1, faceX: coopX0 + 0.35, y: 0.6,
    w: 0.18, h: 0.18, color: '#3a2a18',
  }));
  g.add(windowPane({
    faceZ: 0.1, faceX: coopX0 + coopW - 0.35, y: 0.6,
    w: 0.18, h: 0.18, color: '#3a2a18',
  }));

  // Weathervane: small rooster silhouette
  const pole = new Mesh(cyl(0.025, 0.025, 0.4, 6), mat('#3a2a18'));
  pole.position.set(coopX0 + coopW / 2, 1.9, 0.1 + coopD / 2);
  g.add(pole);
  const rooster = new Mesh(cone(0.08, 0.18, 4), mat('#c34020'));
  rooster.rotation.x = Math.PI / 2;
  rooster.position.set(coopX0 + coopW / 2 + 0.08, 2.06, 0.1 + coopD / 2);
  g.add(rooster);
  // Window flowerboxes for that cozy coop feel
  g.add(flowerBox(coopX0 + 0.35, 0.40, 0.04, 0.30));
  g.add(flowerBox(coopX0 + coopW - 0.35, 0.40, 0.04, 0.30));
  void box;
  return g;
}
