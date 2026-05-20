// Feed Mill — wooden silo with a hopper chute.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, silo } from '../procgen/building-kit';
import { box, cone, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeFeedMill(w: number, d: number): Group {
  const g = new Group();
  const houseW = w * 0.7;
  const houseG = walls({ w: houseW, d, h: 1.05, color: '#cab48a', trim: '#7a5530' });
  houseG.position.set(0.15, 0, 0);
  g.add(houseG);
  const roof = gableRoof({ w: houseW, d, baseY: 1.05, pitch: 0.55, color: '#5a3818', axis: 'x' });
  roof.position.set(0.15, 0, 0);
  g.add(roof);
  g.add(door({ faceZ: 0, faceX: 0.15 + houseW / 2 }));

  // Attached silo on the east side
  g.add(silo(w * 0.85, d / 2, 0.32, 1.6, '#dccba8'));

  // Hopper chute from silo down to ground
  const chute = new Mesh(cone(0.22, 0.4, 14), mat('#8a6740'));
  chute.position.set(w * 0.85, 0.7, d * 0.85);
  chute.rotation.x = 0.4;
  g.add(chute);
  // Pile of grain on the ground beside the chute
  const pile = new Mesh(cone(0.3, 0.18, 14), mat('#e8c878'));
  pile.position.set(w * 0.85, 0.09, d * 0.95);
  g.add(pile);
  void box; void cyl;
  return g;
}
