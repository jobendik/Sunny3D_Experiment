// =============================================================
//  HOVER TILE HIGHLIGHT
//
//  Small rectangle drawn on top of the tile beneath the cursor.
//  Critical 3D UX — without this, the player can't tell which
//  tile their click will land on once the world is tilted.
//
//  Highlight colour adapts to the currently-selected tool +
//  tile validity:
//   - amber (default) — informational hover, no action context
//   - green  — current action is valid on this tile
//   - red    — current action is blocked (obstacle, locked, water…)
//
//  This is how the player gets "the visual state always matches the
//  gameplay state" affordance the new terrain model needs.
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
import { canPlow, canPlant, canClear, isTileUnlocked } from '../terrain/world-data';
import type { Tile } from '../../types';

let group: Group | null = null;
let fillMesh: Mesh | null = null;
let fillMat: MeshBasicMaterial | null = null;
let ringMesh: Mesh | null = null;
let ringMat: MeshBasicMaterial | null = null;

const C_OK = new Color('#5cf263');
const C_OK_FILL = new Color('#a8ffb0');
const C_BAD = new Color('#ff5252');
const C_BAD_FILL = new Color('#ffb0b0');
const C_NEUTRAL = new Color('#ffd470');
const C_NEUTRAL_FILL = new Color('#ffe09a');

export function installHoverTile(): void {
  const { fx } = getSceneRoot();
  group = new Group();
  group.name = 'hover-tile';

  // Soft fill — gentle warm tint over the hovered tile.
  const fillGeom = new PlaneGeometry(0.94, 0.94);
  fillGeom.rotateX(-Math.PI / 2);
  fillMat = new MeshBasicMaterial({
    color: C_NEUTRAL_FILL,
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
    color: C_NEUTRAL,
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

/** Decide whether the current tool/tile combination is valid (green),
 *  blocked (red), or just informational (amber/neutral). */
function classifyTile(t: Tile | undefined | null): 'ok' | 'bad' | 'neutral' {
  if (!t) return 'neutral';
  // While a building/decor/tree placement is active, the placement
  // preview already owns colour feedback — fall through to neutral so
  // we don't double-up.
  if (state.placing) return 'neutral';
  // If the tile is locked (a region the player hasn't unlocked), the
  // tap will be rejected for any tool.
  if (!isTileUnlocked(t)) return 'bad';
  const tool = state.selectedTool;
  if (tool === 'plow') {
    // Plow toggles plowed↔grass, so an already-plowed tile is "ok".
    if (t.type === 'plowed' && !t.obstacle && !t.building && !t.crop && !t.tree) return 'ok';
    return canPlow(t) ? 'ok' : 'bad';
  }
  if (tool === 'seed') {
    return canPlant(t) ? 'ok' : 'bad';
  }
  // Hand tool — show 'ok' for ready-to-harvest crops or clearable obstacles.
  if (canClear(t)) return 'ok';
  if (t.crop || t.tree || t.building) return 'neutral';
  return 'neutral';
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

  // Classify and tint.
  const tile = state.grid[gy]?.[gx];
  const cls = classifyTile(tile);
  const ringColor = cls === 'ok' ? C_OK : cls === 'bad' ? C_BAD : C_NEUTRAL;
  const fillColor = cls === 'ok' ? C_OK_FILL : cls === 'bad' ? C_BAD_FILL : C_NEUTRAL_FILL;
  ringMat.color.copy(ringColor);
  fillMat.color.copy(fillColor);

  // Soft pulse so the highlight is alive — fill and ring breathe
  // slightly out of phase so the eye reads "rim of light" + "pool
  // of light", not "one strobing rectangle". Bad-state pulses faster
  // and harder, like a warning.
  const speed = cls === 'bad' ? 5.0 : 3.0;
  const p = timeS * speed;
  const baseFill = cls === 'bad' ? 0.22 : 0.16;
  const baseRing = cls === 'bad' ? 0.70 : 0.55;
  fillMat.opacity = baseFill + 0.10 * (0.5 + 0.5 * Math.sin(p));
  ringMat.opacity = baseRing + 0.22 * (0.5 + 0.5 * Math.sin(p + 0.6));
  const ringScale = 1.0 + 0.06 * Math.sin(p + 1.0);
  ringMesh.scale.setScalar(ringScale);
}
