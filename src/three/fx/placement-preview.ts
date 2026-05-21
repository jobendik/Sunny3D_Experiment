// =============================================================
//  PLACEMENT PREVIEW
//
//  When state.placing is set, draw a translucent ghost of the
//  thing being placed under the cursor, plus a colored footprint
//  outline (green = ok, red = blocked).
//
//  The ghost mesh clones each material so it can render translucent
//  without mutating the shared (cached) materials used by the real
//  buildings. We track the clones and dispose them when the ghost
//  is rebuilt or hidden — without this, every placement attempt
//  leaks a handful of materials.
// =============================================================

import { Group, Mesh, LineSegments, BufferGeometry, BufferAttribute, LineBasicMaterial, Color, Material } from 'three';
import { state } from '../../state';
import { TILE } from '../../constants';
import { BUILDINGS } from '../../data/buildings';
import { DECORATIONS } from '../../data/decorations';
import { getSceneRoot } from '../scene-root';
import { makeBuildingMesh } from '../buildings';
import { canPlaceBuilding } from '../../systems/grid';
import { screenToWorld } from '../../systems/camera';
import { mousePos } from '../../input';

let group: Group | null = null;
let outline: LineSegments | null = null;
let outlineMat: LineBasicMaterial | null = null;
let lastSig = '';
let ghost: Group | null = null;
// Material clones owned by the ghost. We dispose these when the
// ghost is removed (rebuild or hide), since shared cached materials
// from procgen/materials.ts must not be disposed.
let ghostMats: Material[] = [];

function makeOutlineGeom(w: number, d: number): BufferGeometry {
  const v: number[] = [];
  const y = 0.05;
  // Closed rectangle
  v.push(0, y, 0, w, y, 0);
  v.push(w, y, 0, w, y, d);
  v.push(w, y, d, 0, y, d);
  v.push(0, y, d, 0, y, 0);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
  return g;
}

export function installPlacementPreview(): void {
  const { fx } = getSceneRoot();
  group = new Group();
  group.visible = false;
  outlineMat = new LineBasicMaterial({ color: new Color('#5cf263'), linewidth: 3, transparent: true, opacity: 0.95 });
  outline = new LineSegments(makeOutlineGeom(1, 1), outlineMat);
  group.add(outline);
  fx.add(group);
}

function disposeGhost(): void {
  if (!ghost || !group) return;
  group.remove(ghost);
  for (const m of ghostMats) {
    m.dispose();
  }
  ghostMats = [];
  ghost = null;
}

function makeGhostTranslucent(node: Group, opacity: number): void {
  // Clone each material so the ghost's transparency doesn't bleed
  // into the cached materials shared by real buildings. Track the
  // clones so we can dispose them later.
  node.traverse(obj => {
    const mesh = obj as Mesh & { isMesh?: boolean };
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(m => {
        const c = (m as Material).clone();
        c.transparent = true;
        c.opacity = opacity;
        ghostMats.push(c);
        return c;
      });
    } else {
      const c = (mesh.material as Material).clone();
      c.transparent = true;
      c.opacity = opacity;
      ghostMats.push(c);
      mesh.material = c;
    }
  });
}

export function updatePlacementPreview(): void {
  if (!group || !outline || !outlineMat) return;
  const p = state.placing;
  if (!p) {
    group.visible = false;
    disposeGhost();
    lastSig = '';
    return;
  }
  const w = screenToWorld(mousePos.x, mousePos.y);
  const gx = Math.floor(w.x / TILE);
  const gy = Math.floor(w.y / TILE);

  let footprintW = 1;
  let footprintD = 1;
  let ok = false;
  let sig = '';
  if (p.type && !p.decor && !p.tree) {
    const def = BUILDINGS[p.type];
    if (def) {
      footprintW = def.w;
      footprintD = def.h;
      ok = canPlaceBuilding(p.type, gx, gy);
      sig = `B:${p.type}`;
    }
  } else if (p.decor && p.type) {
    const def = DECORATIONS[p.type];
    if (def) {
      footprintW = def.w;
      footprintD = def.h;
      ok = true; // grid validation happens on commit
      sig = `D:${p.type}`;
    }
  } else if (p.tree) {
    footprintW = 1;
    footprintD = 1;
    const tile = state.grid[gy]?.[gx];
    ok = !!tile && (tile.type === 'plowed' || tile.type === 'soil') && !tile.tree && !tile.crop && !tile.building;
    sig = `T:${p.tree}`;
  }

  group.visible = true;
  group.position.set(gx, 0, gy);

  const fullSig = sig + ',' + footprintW + 'x' + footprintD;
  if (lastSig !== fullSig) {
    outline.geometry.dispose();
    outline.geometry = makeOutlineGeom(footprintW, footprintD);
    disposeGhost();
    if (p.type && !p.decor && !p.tree) {
      ghost = makeBuildingMesh(p.type, footprintW, footprintD);
      makeGhostTranslucent(ghost, 0.5);
      group.add(ghost);
    }
    lastSig = fullSig;
  }
  outlineMat.color.setStyle(ok ? '#5cf263' : '#ff5252');
}
