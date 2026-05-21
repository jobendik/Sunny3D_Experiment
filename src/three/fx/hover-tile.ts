// =============================================================
//  HOVER TILE HIGHLIGHT
//
//  Small rectangle drawn on top of the tile beneath the cursor.
//  Critical 3D UX — without this, the player can't tell which
//  tile their click will land on once the world is tilted.
// =============================================================

import {
  Mesh, PlaneGeometry, RingGeometry, MeshBasicMaterial, Color,
  DoubleSide, AdditiveBlending, Group,
} from 'three';
import { state } from '../../state';
import { TILE, GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { screenToWorld } from '../../systems/camera';
import { mousePos } from '../../input';

let group: Group | null = null;
let fillMesh: Mesh | null = null;
let fillMat: MeshBasicMaterial | null = null;
let ringMesh: Mesh | null = null;
let ringMat: MeshBasicMaterial | null = null;

export function installHoverTile(): void {
  const { fx } = getSceneRoot();
  group = new Group();
  group.name = 'hover-tile';

  // Soft amber fill — gentle warm tint over the hovered tile.
  const fillGeom = new PlaneGeometry(0.94, 0.94);
  fillGeom.rotateX(-Math.PI / 2);
  fillMat = new MeshBasicMaterial({
    color: new Color('#ffe09a'),
    transparent: true,
    opacity: 0.18,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  fillMesh = new Mesh(fillGeom, fillMat);
  fillMesh.position.y = 0.025;
  fillMesh.renderOrder = 5;
  group.add(fillMesh);

  // Glow ring — brighter outline so the player can see at a glance
  // where their tap will land even on dark tile types.
  const ringGeom = new RingGeometry(0.40, 0.50, 32);
  ringGeom.rotateX(-Math.PI / 2);
  ringMat = new MeshBasicMaterial({
    color: new Color('#ffd470'),
    transparent: true,
    opacity: 0.65,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  ringMesh = new Mesh(ringGeom, ringMat);
  ringMesh.position.y = 0.04;
  ringMesh.renderOrder = 6;
  group.add(ringMesh);

  group.visible = false;
  fx.add(group);
}

export function updateHoverTile(timeS: number): void {
  if (!group || !fillMat || !ringMat || !ringMesh) return;
  // Hide while placing — the placement preview shows its own outline.
  if (state.placing) { group.visible = false; return; }
  const w = screenToWorld(mousePos.x, mousePos.y);
  const gx = Math.floor(w.x / TILE);
  const gy = Math.floor(w.y / TILE);
  if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) {
    group.visible = false;
    return;
  }
  group.visible = true;
  group.position.x = gx + 0.5;
  group.position.z = gy + 0.5;
  // Soft pulse so the highlight is alive — fill and ring breathe
  // slightly out of phase so the eye reads "rim of light" + "pool
  // of light", not "one strobing rectangle".
  const p = timeS * 3.0;
  fillMat.opacity = 0.16 + 0.10 * (0.5 + 0.5 * Math.sin(p));
  ringMat.opacity = 0.55 + 0.20 * (0.5 + 0.5 * Math.sin(p + 0.6));
  const ringScale = 1.0 + 0.06 * Math.sin(p + 1.0);
  ringMesh.scale.setScalar(ringScale);
}
