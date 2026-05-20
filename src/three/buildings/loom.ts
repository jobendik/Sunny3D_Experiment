// Loom — wooden shop with a weaving spindle on the roof.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane } from '../procgen/building-kit';
import { cyl, box } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeLoom(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.15, color: '#e0c890', trim: '#6e4a28' }));
  g.add(gableRoof({ w, d, baseY: 1.15, pitch: 0.75, color: '#4a3018', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.85 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.85 }));

  // Spindle of yarn on roof
  const spindleRod = new Mesh(cyl(0.04, 0.04, 0.5, 8), mat('#6e4a28'));
  spindleRod.rotation.z = Math.PI / 2;
  spindleRod.position.set(w / 2, 2.0, d / 2);
  g.add(spindleRod);
  for (let i = 0; i < 3; i++) {
    const yarn = new Mesh(cyl(0.1, 0.1, 0.12, 14), mat(['#d04060', '#3a78c8', '#f4c842'][i]!));
    yarn.rotation.z = Math.PI / 2;
    yarn.position.set(w / 2 - 0.15 + i * 0.15, 2.0, d / 2);
    g.add(yarn);
  }
  void box;
  return g;
}
