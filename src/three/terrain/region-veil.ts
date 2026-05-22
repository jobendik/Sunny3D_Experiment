// =============================================================
//  REGION VEIL
//
//  Soft mist overlay over locked regions INSIDE the playable 32×32
//  world. This is different from `fog-of-war.ts` which rings the
//  outer decorative landscape — region-veil sits directly over the
//  tiles the player will eventually unlock, signaling "this is yours
//  later, you can see it but can't yet farm it".
//
//  Implementation: one large textured plane per region (windy_hill,
//  east_meadow, old_orchard, river_bend, plus a separate plane per
//  forest corner). Each plane's opacity is driven by whether the
//  region's plot is unlocked — when unlocked, the veil fades out
//  cleanly.
//
//  The veil is *purely visual* — gameplay decisions still go through
//  `isTileUnlocked()`. Removing the veil mesh entirely would not
//  change which tiles are plowable.
// =============================================================

import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  Color,
  RepeatWrapping,
} from 'three';
import {
  GRID_W, GRID_H,
  HOME_X0, HOME_Y0, HOME_X1, HOME_Y1,
} from '../../constants';
import { getSceneRoot } from '../scene-root';
import { isRegionUnlocked, REGIONS } from './world-data';
import type { LightingSnapshot } from '../lighting';
import type { RegionId } from '../../types';

interface VeilPanel {
  mesh: Mesh;
  region: RegionId;
  baseOpacity: number;
}

const PANELS: VeilPanel[] = [];
let parent: Group | null = null;
let mistTexture: CanvasTexture | null = null;

function buildMistTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  // A soft cloudy noise pattern. We pick low-frequency blobs of mid
  // alpha so the veil reads as "drifting mist" not "checkerboard
  // squares".
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 50;
    const a = 0.10 + Math.random() * 0.18;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few darker "shadow" blobs so the mist isn't pure white.
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 24 + Math.random() * 40;
    const a = 0.05 + Math.random() * 0.12;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(80,110,130,${a})`);
    grad.addColorStop(1, 'rgba(80,110,130,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

function addPanel(parent: Group, region: RegionId, x0: number, y0: number, x1: number, y1: number, baseOpacity: number): void {
  const w = (x1 - x0) + 1;
  const d = (y1 - y0) + 1;
  const geom = new PlaneGeometry(w, d);
  geom.rotateX(-Math.PI / 2);
  const mat = new MeshBasicMaterial({
    map: mistTexture!,
    color: new Color('#dde8ec'),
    transparent: true,
    opacity: baseOpacity,
    depthWrite: false,
  });
  // Tile the mist texture so big regions don't show one stretched blob.
  const repeats = Math.max(1, Math.round(Math.max(w, d) / 6));
  mat.map = mistTexture;
  if (mat.map) {
    mat.map = mat.map.clone();
    mat.map.needsUpdate = true;
    mat.map.repeat.set(repeats, repeats);
    mat.map.wrapS = RepeatWrapping;
    mat.map.wrapT = RepeatWrapping;
  }
  const m = new Mesh(geom, mat);
  m.position.set(x0 + w / 2, 0.18, y0 + d / 2);
  m.renderOrder = 3;
  parent.add(m);
  PANELS.push({ mesh: m, region, baseOpacity });
}

export function installRegionVeil(): void {
  if (parent) return;
  const { weather } = getSceneRoot();
  parent = new Group();
  parent.name = 'region-veil';
  weather.add(parent);
  mistTexture = buildMistTexture();

  // North band → windy_hill
  addPanel(parent, 'windy_hill', HOME_X0, 0, HOME_X1, HOME_Y0 - 1, 0.50);
  // East band → east_meadow
  addPanel(parent, 'east_meadow', HOME_X1 + 1, HOME_Y0, GRID_W - 1, HOME_Y1, 0.50);
  // South band → old_orchard
  addPanel(parent, 'old_orchard', HOME_X0, HOME_Y1 + 1, HOME_X1, GRID_H - 1, 0.50);
  // West band → river_bend
  addPanel(parent, 'river_bend', 0, HOME_Y0, HOME_X0 - 1, HOME_Y1, 0.50);
  // Four corners → forest_edge (one panel each for clean rectangles)
  addPanel(parent, 'forest_edge', 0, 0, HOME_X0 - 1, HOME_Y0 - 1, 0.78);                       // NW
  addPanel(parent, 'forest_edge', HOME_X1 + 1, 0, GRID_W - 1, HOME_Y0 - 1, 0.78);              // NE
  addPanel(parent, 'forest_edge', 0, HOME_Y1 + 1, HOME_X0 - 1, GRID_H - 1, 0.78);              // SW
  addPanel(parent, 'forest_edge', HOME_X1 + 1, HOME_Y1 + 1, GRID_W - 1, GRID_H - 1, 0.78);     // SE
  void REGIONS;
}

const _color = new Color();

export function updateRegionVeil(timeS: number, light: LightingSnapshot): void {
  if (!parent) return;
  _color.setHex(light.skyColor);
  for (const p of PANELS) {
    const unlocked = isRegionUnlocked(p.region);
    const target = unlocked ? 0 : p.baseOpacity;
    const m = p.mesh.material as MeshBasicMaterial;
    m.opacity += (target - m.opacity) * 0.05;
    // Subtle drift on the mist texture — feels alive rather than
    // stamped. Texture offset rolls slowly with time.
    if (m.map) {
      m.map.offset.x = Math.sin(timeS * 0.04 + p.mesh.position.z * 0.1) * 0.05 + timeS * 0.005;
      m.map.offset.y = Math.cos(timeS * 0.03 + p.mesh.position.x * 0.1) * 0.05 + timeS * 0.004;
    }
    // Tint slightly toward the sky color so the veil dawn/dusk-shifts.
    m.color.lerp(_color, 0.02);   // very slow blend — the veil mostly keeps its cool grey
    // Once nearly faded, hide entirely so we save the alpha-blend cost.
    p.mesh.visible = m.opacity > 0.01;
  }
}
