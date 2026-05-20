// =============================================================
//  PLACEMENT PREVIEW
//
//  When state.placing is set, draw a translucent ghost of the
//  thing being placed under the cursor, plus a colored footprint
//  outline (green = ok, red = blocked).
// =============================================================

import { Group, Mesh, LineSegments, BufferGeometry, BufferAttribute, LineBasicMaterial, Color } from 'three';
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
  outlineMat = new LineBasicMaterial({ color: new Color('#4ad84a'), linewidth: 2, transparent: true, opacity: 0.85 });
  outline = new LineSegments(makeOutlineGeom(1, 1), outlineMat);
  group.add(outline);
  fx.add(group);
}

function setOpacity(node: Group | Mesh, opacity: number): void {
  // We must NOT mutate the materials in place — they're cached and
  // shared across every other mesh that uses the same color. Clone
  // each material on the way down so the ghost has its own copy.
  node.traverse(obj => {
    const mesh = obj as Mesh & { isMesh?: boolean };
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(m => {
        const c = (m as { clone: () => typeof m }).clone();
        (c as unknown as { transparent: boolean }).transparent = true;
        (c as unknown as { opacity: number }).opacity = opacity;
        return c;
      });
    } else {
      const c = (mesh.material as { clone: () => typeof mesh.material }).clone();
      (c as unknown as { transparent: boolean }).transparent = true;
      (c as unknown as { opacity: number }).opacity = opacity;
      mesh.material = c;
    }
  });
}

export function updatePlacementPreview(): void {
  if (!group || !outline || !outlineMat) return;
  const p = state.placing;
  if (!p) {
    group.visible = false;
    if (ghost) {
      group.remove(ghost);
      ghost = null;
    }
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
  // Rebuild outline if footprint changed
  if (outline.geometry.attributes.position?.count !== 8 || lastSig !== sig + ',' + footprintW + 'x' + footprintD) {
    outline.geometry.dispose();
    outline.geometry = makeOutlineGeom(footprintW, footprintD);
  }
  outlineMat.color.setStyle(ok ? '#4ad84a' : '#e84040');

  // Build ghost mesh if missing or signature changed
  if (lastSig !== sig + ',' + footprintW + 'x' + footprintD) {
    if (ghost) { group.remove(ghost); ghost = null; }
    if (p.type && !p.decor && !p.tree) {
      ghost = makeBuildingMesh(p.type, footprintW, footprintD);
    }
    if (ghost) {
      setOpacity(ghost, 0.5);
      group.add(ghost);
    }
    lastSig = sig + ',' + footprintW + 'x' + footprintD;
  }
}
