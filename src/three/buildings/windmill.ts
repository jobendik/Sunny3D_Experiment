// Windmill (landmark) — tall round tower with rotating sails.
// Footprint 3×4. The sail group rotates each frame; we expose a
// helper so the building manager can drive it from updateScene().
import { Group, Mesh } from 'three';
import { cyl, box, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { door, windowPane } from '../procgen/building-kit';

export function makeWindmill(w: number, d: number): Group {
  const g = new Group();
  const cx = w / 2;
  const cz = d / 2;
  // Tower body (slightly tapered cylinder)
  const tower = new Mesh(cyl(0.55, 0.7, 2.4, 16), mat('#e8d8b8'));
  tower.position.set(cx, 1.2, cz);
  tower.castShadow = true;
  tower.receiveShadow = true;
  g.add(tower);
  // Cone cap
  const cap = new Mesh(cone(0.7, 0.55, 16), mat('#5a3a20'));
  cap.position.set(cx, 2.65, cz);
  cap.castShadow = true;
  g.add(cap);
  // Sail axle pointing south (toward viewer)
  const sails = new Group();
  sails.name = 'windmill-sails';
  sails.position.set(cx, 2.1, cz - 0.55);
  // 4 sail blades arranged like a cross
  for (let i = 0; i < 4; i++) {
    const arm = new Mesh(box(0.06, 1.1, 0.05), mat('#4a3018'));
    arm.position.y = 0.55 + 0.0001;
    arm.rotation.z = i * Math.PI / 2;
    // Rotate so the blade lies in the X-Y plane spinning around Z
    const blade = new Mesh(box(0.2, 1.0, 0.03), mat('#f4ecd0'));
    blade.position.y = 0.5;
    blade.position.x = 0.15;
    const armGroup = new Group();
    armGroup.add(arm, blade);
    armGroup.rotation.z = i * Math.PI / 2;
    sails.add(armGroup);
  }
  g.add(sails);
  // Door + window on tower
  g.add(door({ faceZ: cz - 0.55, faceX: cx, w: 0.4, h: 0.7, color: '#5a3a20' }));
  g.add(windowPane({ faceZ: cz - 0.55, faceX: cx - 0.4, y: 1.7, w: 0.2, h: 0.25 }));
  g.add(windowPane({ faceZ: cz - 0.55, faceX: cx + 0.4, y: 1.7, w: 0.2, h: 0.25 }));
  return g;
}
