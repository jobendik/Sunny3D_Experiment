// =============================================================
//  HOVER TILE HIGHLIGHT
//
//  Small rectangle drawn on top of the tile beneath the cursor.
//  Critical 3D UX — without this, the player can't tell which
//  tile their click will land on once the world is tilted.
// =============================================================

import { Mesh, PlaneGeometry, MeshBasicMaterial, Color, DoubleSide } from 'three';
import { state } from '../../state';
import { TILE, GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { screenToWorld } from '../../systems/camera';
import { mousePos } from '../../input';

let mesh: Mesh | null = null;
let mat: MeshBasicMaterial | null = null;

export function installHoverTile(): void {
  const { fx } = getSceneRoot();
  const geom = new PlaneGeometry(0.96, 0.96);
  geom.rotateX(-Math.PI / 2);
  mat = new MeshBasicMaterial({
    color: new Color('#ffffff'),
    transparent: true,
    opacity: 0.18,
    side: DoubleSide,
    depthWrite: false,
  });
  mesh = new Mesh(geom, mat);
  // Render slightly above ground level so it isn't z-fought by tiles.
  mesh.position.y = 0.02;
  mesh.renderOrder = 5;
  mesh.visible = false;
  fx.add(mesh);
}

export function updateHoverTile(timeS: number): void {
  if (!mesh || !mat) return;
  // Hide while placing — the placement preview shows its own outline.
  if (state.placing) { mesh.visible = false; return; }
  const w = screenToWorld(mousePos.x, mousePos.y);
  const gx = Math.floor(w.x / TILE);
  const gy = Math.floor(w.y / TILE);
  if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.x = gx + 0.5;
  mesh.position.z = gy + 0.5;
  // Soft pulse so the highlight is alive
  mat.opacity = 0.16 + 0.08 * Math.sin(timeS * 3.5);
}
