// Crows: state.crows[].x/y are in pixel coords (the wandering
// logic uses pixels). Convert to world units.
import { Group, Mesh } from 'three';
import { state } from '../../state';
import { TILE } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { box, sphere, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface CrowMounted {
  id: string;
  root: Group;
}
const mounted = new Map<string, CrowMounted>();

function makeCrowMesh(): Group {
  const g = new Group();
  const body = new Mesh(sphere(0.14, 12, 10), mat('#1a1a1a'));
  body.scale.set(1.2, 0.7, 0.85);
  body.castShadow = true;
  g.add(body);
  const head = new Mesh(sphere(0.08, 8, 6), mat('#1a1a1a'));
  head.position.set(0.16, 0.07, 0);
  g.add(head);
  const beak = new Mesh(cone(0.03, 0.07, 6), mat('#f4a02a'));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.24, 0.07, 0);
  g.add(beak);
  const wing = new Mesh(box(0.18, 0.04, 0.1), mat('#0a0a0a'));
  wing.position.set(0, 0.05, 0);
  g.add(wing);
  return g;
}

export function updateCrows(_timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  for (const c of state.crows) {
    seen.add(c.id);
    let m = mounted.get(c.id);
    if (!m) {
      const root = makeCrowMesh();
      entities.add(root);
      m = { id: c.id, root };
      mounted.set(c.id, m);
    }
    m.root.position.set(c.x / TILE, 0.45, c.y / TILE);
    // Wing flap = pitch
    m.root.rotation.x = Math.sin(c.frame * 0.5) * 0.2;
    // Slight transparency when scared (escaping)
    m.root.scale.setScalar(c.scared ? 0.9 : 1);
  }
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      entities.remove(m.root);
      mounted.delete(id);
    }
  }
}
