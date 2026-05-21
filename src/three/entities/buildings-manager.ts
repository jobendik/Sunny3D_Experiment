// =============================================================
//  BUILDINGS MANAGER
//
//  Keeps the entity scene-graph in sync with state.buildings.
//  Each frame we walk the building array; new entries get a Group
//  added; removed entries get cleaned up. Animated decoration
//  (windmill sails, BBQ smoke, lit windows) is poked through each
//  tick.
// =============================================================

import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, Color, CanvasTexture, DoubleSide, Sprite, SpriteMaterial } from 'three';
import { state } from '../../state';
import { BUILDINGS } from '../../data/buildings';
import { getSceneRoot } from '../scene-root';
import { makeBuildingMesh } from '../buildings';
import type { LightingSnapshot } from '../lighting';
import { setWindowGlow } from '../procgen/building-kit';

// Shared soft-shadow texture: a radial gradient blob used as a
// contact shadow under every building. Cheaper than a real shadow
// map for the AO-style darkening at the building footprint, and it
// fills the "floating" look that orthographic-ish iso geometry can
// have when the sun is high.
let _shadowTex: CanvasTexture | null = null;
function shadowTex(): CanvasTexture {
  if (_shadowTex) return _shadowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _shadowTex = new CanvasTexture(c);
  return _shadowTex;
}

function makeContactShadow(w: number, d: number): Mesh {
  const geom = new PlaneGeometry(w + 0.6, d + 0.6);
  geom.rotateX(-Math.PI / 2);
  const mat = new MeshBasicMaterial({
    map: shadowTex(),
    color: new Color('#ffffff'),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    side: DoubleSide,
  });
  const m = new Mesh(geom, mat);
  m.position.set(w / 2, 0.04, d / 2);
  m.renderOrder = 1;
  m.name = 'contact-shadow';
  return m;
}

interface MountedBuilding {
  id: string;
  root: Group;
  type: string;
  smokeTimer: number;
}

const mounted = new Map<string, MountedBuilding>();

// Smoke puffs use a shared procedural canvas texture so we can
// recolor it for fires vs. cool steam. Sprites always face the
// camera so puffs read at any iso rotation.
let _smokeTex: CanvasTexture | null = null;
function smokeTex(): CanvasTexture {
  if (_smokeTex) return _smokeTex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _smokeTex = new CanvasTexture(c);
  return _smokeTex;
}

interface Smoke { sprite: Sprite; vy: number; vx: number; life: number; maxLife: number }
const smokePool: Smoke[] = [];

function spawnSmoke(parent: Group, x: number, y: number, z: number): void {
  const mat = new SpriteMaterial({
    map: smokeTex(),
    color: new Color('#ffffff'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const s = new Sprite(mat);
  s.scale.set(0.35, 0.35, 1);
  s.position.set(x + (Math.random() - 0.5) * 0.05, y, z + (Math.random() - 0.5) * 0.05);
  parent.add(s);
  smokePool.push({
    sprite: s,
    vy: 0.5 + Math.random() * 0.25,
    vx: (Math.random() - 0.5) * 0.15,
    life: 0,
    maxLife: 2.6 + Math.random() * 0.6,
  });
}

let lastFrame = 0;
function updateSmoke(timeS: number): void {
  const dt = lastFrame ? Math.min(0.1, timeS - lastFrame) : 0;
  lastFrame = timeS;
  for (let i = smokePool.length - 1; i >= 0; i--) {
    const s = smokePool[i]!;
    s.life += dt;
    s.sprite.position.y += s.vy * dt;
    s.sprite.position.x += s.vx * dt + Math.sin(s.life * 1.7) * 0.02;
    const t = s.life / s.maxLife;
    const grow = 0.35 + t * 0.6;
    s.sprite.scale.set(grow, grow, 1);
    (s.sprite.material as SpriteMaterial).opacity = (1 - t) * 0.65;
    if (s.life >= s.maxLife) {
      s.sprite.parent?.remove(s.sprite);
      (s.sprite.material as { dispose?: () => void }).dispose?.();
      smokePool.splice(i, 1);
    }
  }
}

const _smokeBuildings = new Set(['bakery', 'feedmill', 'sugarmill', 'juicer', 'bbq', 'candleshop', 'smoothiebar']);

export function updateBuildings(light: LightingSnapshot): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  const timeS = performance.now() / 1000;

  // Single-assignment night glow on every window across every
  // building — the shared windowGlassMat handles the rest.
  setWindowGlow(light.windows);
  updateSmoke(timeS);

  for (const b of state.buildings) {
    seen.add(b.id);
    let m = mounted.get(b.id);
    if (!m) {
      const def = BUILDINGS[b.type];
      if (!def) continue;
      const g = makeBuildingMesh(b.type, def.w, def.h);
      // Soft contact shadow flush with the ground around the
      // building footprint. Sells the "planted on the dirt" feel.
      g.add(makeContactShadow(def.w, def.h));
      // Place at world position (gx, gz) where each tile = 1 unit.
      g.position.set(b.x, 0, b.y);
      entities.add(g);
      m = { id: b.id, root: g, type: b.type, smokeTimer: 0 };
      mounted.set(b.id, m);
    }
    // Per-frame animation hooks
    const sails = m.root.getObjectByName('windmill-sails');
    if (sails) {
      // Rotate around the world Z axis (local axle direction).
      sails.rotation.z += 0.4 * (1 / 60);
    }
    // Chimney smoke — production buildings puff every ~1.5s. Position
    // is the top of the typical chimney spot for each type.
    if (_smokeBuildings.has(m.type)) {
      m.smokeTimer -= 1 / 60;
      if (m.smokeTimer <= 0) {
        m.smokeTimer = 1.2 + Math.random() * 0.8;
        const def = BUILDINGS[m.type];
        if (def) {
          spawnSmoke(m.root, def.w * 0.78, 2.3, def.h * 0.4);
        }
      }
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
