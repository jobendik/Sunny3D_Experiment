// =============================================================
//  TREASURE CHESTS
//
//  Surprise reward chests sit on grid tiles. The 2D version drew
//  them as a bobbing sprite with a halo; here they're a small
//  Group with a wood box, gold trim, and a soft point-light glow.
// =============================================================

import { Group, Mesh, PointLight } from 'three';
import { state } from '../../state';
import { getSceneRoot } from '../scene-root';
import { box } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface ChestMounted {
  id: string;
  root: Group;
}
const mounted = new Map<string, ChestMounted>();

function makeChestMesh(rare: boolean): Group {
  const g = new Group();
  const base = new Mesh(box(0.4, 0.22, 0.3), mat(rare ? '#5a2080' : '#a06028'));
  base.position.y = 0.13;
  base.castShadow = true;
  g.add(base);
  const lid = new Mesh(box(0.42, 0.08, 0.32), mat(rare ? '#c890ff' : '#d8a060'));
  lid.position.y = 0.27;
  g.add(lid);
  const lock = new Mesh(box(0.06, 0.08, 0.04), mat('#f4d160'));
  lock.position.set(0, 0.2, 0.17);
  g.add(lock);
  // Soft point light
  const light = new PointLight(rare ? 0xc890ff : 0xffd060, rare ? 1.2 : 0.9, 4, 2);
  light.position.set(0, 0.6, 0);
  g.add(light);
  return g;
}

export function updateTreasureChests(timeS: number): void {
  const { fx } = getSceneRoot();
  const treasures = state.treasures;
  if (!treasures) return;
  const seen = new Set<string>();
  for (const ch of treasures.chests) {
    seen.add(ch.id);
    let m = mounted.get(ch.id);
    if (!m) {
      const root = makeChestMesh(!!ch.rare);
      root.position.set(ch.gx + 0.5, 0, ch.gy + 0.5);
      fx.add(root);
      m = { id: ch.id, root };
      mounted.set(ch.id, m);
    }
    // Bob
    m.root.position.y = 0.05 + Math.sin(timeS * 2.2 + ch.gx + ch.gy) * 0.04;
    m.root.rotation.y = Math.sin(timeS * 0.8) * 0.15;
  }
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      fx.remove(m.root);
      mounted.delete(id);
    }
  }
}
