// =============================================================
//  ORCHARD TREES MANAGER
//
//  state.trees holds planted orchard trees. Each has 4 visible
//  stages (sapling / young / mature / fruiting) which we mirror
//  with a procedurally-built mesh group.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { getSceneRoot } from '../scene-root';
import { ORCHARDS } from '../../data/orchards';
import { getTreeStage } from '../../systems/trees';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface TreeMounted {
  id: string;
  stage: number;
  type: string;
  root: Group;
}

const mounted = new Map<string, TreeMounted>();

function fruitColor(type: string): string {
  return ORCHARDS[type]?.fruit === 'pear' ? '#c8e070' : '#e63a3a';
}
function trunkColor(_type: string): string { return '#5a3a20'; }

function makeTreeMesh(type: string, stage: number): Group {
  const g = new Group();
  const trunkC = trunkColor(type);
  const leafC = stage >= 1 ? '#3a8a30' : '#4a9a40';
  if (stage === 0) {
    const sap = new Mesh(cyl(0.025, 0.025, 0.18, 6), mat(trunkC));
    sap.position.y = 0.09;
    g.add(sap);
    const top = new Mesh(sphere(0.1, 8, 6), mat(leafC));
    top.position.y = 0.22;
    g.add(top);
  } else if (stage === 1) {
    const t = new Mesh(cyl(0.06, 0.07, 0.5, 8), mat(trunkC));
    t.position.y = 0.25;
    t.castShadow = true;
    g.add(t);
    const c = new Mesh(sphere(0.32, 12, 10), mat(leafC));
    c.position.y = 0.65;
    c.castShadow = true;
    g.add(c);
  } else if (stage === 2) {
    const t = new Mesh(cyl(0.08, 0.1, 0.7, 8), mat(trunkC));
    t.position.y = 0.35;
    t.castShadow = true;
    g.add(t);
    const c = new Mesh(sphere(0.46, 12, 10), mat(leafC));
    c.position.y = 0.92;
    c.scale.set(1.0, 1.0, 1.0);
    c.castShadow = true;
    g.add(c);
  } else {
    const t = new Mesh(cyl(0.09, 0.11, 0.7, 8), mat(trunkC));
    t.position.y = 0.35;
    t.castShadow = true;
    g.add(t);
    const c = new Mesh(sphere(0.5, 14, 12), mat(leafC));
    c.position.y = 0.95;
    c.castShadow = true;
    g.add(c);
    // Scatter fruit
    const fruit = fruitColor(type);
    for (let i = 0; i < 6; i++) {
      const f = new Mesh(sphere(0.07, 8, 6), mat(fruit));
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      f.position.set(Math.cos(ang) * 0.4, 0.95 + (i % 2 ? 0.1 : -0.1), Math.sin(ang) * 0.4);
      g.add(f);
    }
  }
  return g;
}

export function updateTrees(timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  for (const tr of state.trees) {
    seen.add(tr.id);
    const stage = getTreeStage(tr);
    let m = mounted.get(tr.id);
    if (!m || m.stage !== stage || m.type !== tr.type) {
      if (m) entities.remove(m.root);
      const root = makeTreeMesh(tr.type, stage);
      root.position.set(tr.x + 0.5, 0, tr.y + 0.5);
      entities.add(root);
      m = { id: tr.id, stage, type: tr.type, root };
      mounted.set(tr.id, m);
    }
    // Gentle sway
    m.root.rotation.z = Math.sin(timeS * 0.7 + tr.x * 0.3) * 0.02;
  }
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      entities.remove(m.root);
      mounted.delete(id);
    }
  }
}
