// =============================================================
//  BUILDINGS MANAGER
//
//  Keeps the entity scene-graph in sync with state.buildings.
//  Each frame we walk the building array; new entries get a Group
//  added; removed entries get cleaned up. Animated decoration
//  (windmill sails, BBQ smoke, lit windows) is poked through each
//  tick.
// =============================================================

import { Group } from 'three';
import { state } from '../../state';
import { BUILDINGS } from '../../data/buildings';
import { getSceneRoot } from '../scene-root';
import { makeBuildingMesh } from '../buildings';
import type { LightingSnapshot } from '../lighting';
import { setWindowGlow } from '../procgen/building-kit';

interface MountedBuilding {
  id: string;
  root: Group;
  type: string;
}

const mounted = new Map<string, MountedBuilding>();

export function updateBuildings(light: LightingSnapshot): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();

  // Single-assignment night glow on every window across every
  // building — the shared windowGlassMat handles the rest.
  setWindowGlow(light.windows);

  for (const b of state.buildings) {
    seen.add(b.id);
    let m = mounted.get(b.id);
    if (!m) {
      const def = BUILDINGS[b.type];
      if (!def) continue;
      const g = makeBuildingMesh(b.type, def.w, def.h);
      // Place at world position (gx, gz) where each tile = 1 unit.
      g.position.set(b.x, 0, b.y);
      entities.add(g);
      m = { id: b.id, root: g, type: b.type };
      mounted.set(b.id, m);
    }
    // Per-frame animation hooks
    const sails = m.root.getObjectByName('windmill-sails');
    if (sails) {
      // Rotate around the world Z axis (local axle direction).
      sails.rotation.z += 0.4 * (1 / 60);
    }
  }

  // Remove buildings that no longer exist.
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      entities.remove(m.root);
      disposeTree(m.root);
      mounted.delete(id);
    }
  }
}

function disposeTree(root: Group): void {
  root.traverse(obj => {
    const m = obj as unknown as { geometry?: { dispose?: () => void }; material?: { dispose?: () => void } | Array<{ dispose?: () => void }> };
    if (m.geometry && m.geometry.dispose) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach(mm => mm.dispose && mm.dispose());
      else if (m.material.dispose) m.material.dispose();
    }
  });
}
