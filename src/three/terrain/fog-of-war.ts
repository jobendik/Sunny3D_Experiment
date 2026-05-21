// =============================================================
//  FOG OF WAR
//
//  The outer world (the 60×60 ring around the playable 18×18 farm)
//  is covered by a soft volumetric-looking shroud — drifting low
//  clouds that read as "unexplored land" from the iso camera. As the
//  player completes expansion plots, the shroud thins out over the
//  corresponding direction.
//
//  Implementation: one ring of low cloud patches around the play
//  area, with per-direction alpha that the expansion system can
//  modulate. The patches sway and drift gently so the world feels
//  alive even where the player can't yet build.
//
//  We deliberately keep this purely visual — clearing a plot in
//  game terms still uses the expansion system; the shroud retracts
//  as a *response* to that, it doesn't gate it.
// =============================================================

import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  Color,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { state } from '../../state';
import type { LightingSnapshot } from '../lighting';

interface CloudPatch {
  mesh: Mesh;
  driftX: number;
  driftZ: number;
  baseAlpha: number;
  baseY: number;
  phase: number;
  /** Which expansion direction this patch covers (-1 = ambient). */
  region: 'east' | 'west' | 'north' | 'south' | 'ne' | 'nw' | 'se' | 'sw' | 'ambient';
}

const PATCHES: CloudPatch[] = [];
let texture: CanvasTexture | null = null;
let mounted = false;

function makeFogTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  // Radial-gradient blob with internal mottling so a single patch
  // doesn't look like a perfect circle.
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Mottle: small random alpha bumps.
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 30;
    const a = (Math.random() - 0.5) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return new CanvasTexture(c);
}

function pickRegion(x: number, z: number): CloudPatch['region'] {
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  const dx = x - cx;
  const dz = z - cz;
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  if (ax < 4 && az < 4) return 'ambient';
  if (ax > az * 2) return dx > 0 ? 'east' : 'west';
  if (az > ax * 2) return dz > 0 ? 'south' : 'north';
  if (dx > 0 && dz > 0) return 'se';
  if (dx > 0 && dz < 0) return 'ne';
  if (dx < 0 && dz > 0) return 'sw';
  return 'nw';
}

function placePatches(group: Group): void {
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  texture = makeFogTexture();
  // Three concentric rings of patches: closest = thin/wispy so the
  // outer world peeks through, middle = denser, far ring = thick
  // mist that hides the deep forest until the player expands.
  const rings = [
    { radius: 11.5, count: 22, scale: 5.0, alpha: 0.55 },
    { radius: 15, count: 28, scale: 6.0, alpha: 0.82 },
    { radius: 19, count: 30, scale: 7.0, alpha: 0.92 },
    { radius: 25, count: 28, scale: 8.0, alpha: 0.85 },
    { radius: 31, count: 22, scale: 9.0, alpha: 0.7 },
  ];
  let patchIdx = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const baseTheta = (i / ring.count) * Math.PI * 2;
      const jitterTheta = (Math.random() - 0.5) * 0.18;
      const jitterR = (Math.random() - 0.5) * 2.5;
      const theta = baseTheta + jitterTheta;
      const r = ring.radius + jitterR;
      const x = cx + Math.cos(theta) * r;
      const z = cz + Math.sin(theta) * r;
      const region = pickRegion(x, z);
      const mat = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: ring.alpha,
        depthWrite: false,
      });
      const geom = new PlaneGeometry(ring.scale, ring.scale);
      const m = new Mesh(geom, mat);
      m.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.05;
      m.rotation.z = Math.random() * Math.PI * 2;
      m.position.set(x, 0.7 + Math.random() * 0.7, z);
      m.renderOrder = 4;
      group.add(m);
      PATCHES.push({
        mesh: m,
        driftX: (Math.random() - 0.5) * 0.08,
        driftZ: (Math.random() - 0.5) * 0.08,
        baseAlpha: ring.alpha,
        baseY: m.position.y,
        phase: patchIdx * 0.7,
        region,
      });
      patchIdx++;
    }
  }
}

let group: Group | null = null;

export function installFogOfWar(): void {
  if (mounted) return;
  mounted = true;
  const { weather } = getSceneRoot();
  group = new Group();
  group.name = 'fog-of-war';
  placePatches(group);
  weather.add(group);
}

/** Read expansion progress for a side and return a fog-thinning
 *  factor (0 = fully foggy, 1 = fully cleared). */
function regionVisibility(region: CloudPatch['region']): number {
  if (region === 'ambient') return 0.9;        // central fog never fully clears
  const plots = state.expansion?.plots;
  if (!plots) return 1;
  // Map plot ids to compass directions — east_meadow east, old_orchard SW,
  // river_bend NW (toward lake), windy_hill north, forest_edge SE.
  const plotForRegion: Record<string, string> = {
    east: 'east_meadow',
    ne:   'east_meadow',
    se:   'forest_edge',
    south:'forest_edge',
    sw:   'old_orchard',
    west: 'old_orchard',
    nw:   'river_bend',
    north:'windy_hill',
  };
  const id = plotForRegion[region];
  if (!id) return 1;
  const p = plots[id];
  if (!p) return 1;
  if (p.status === 'unlocked') return 0;        // fully cleared
  if (p.status === 'clearing') {
    const total = p.obstacles.length || 1;
    const cleared = p.obstacles.filter(o => o.cleared).length;
    return 1 - cleared / total * 0.8;            // partial thinning
  }
  return 1;
}

const _color = new Color();

export function updateFogOfWar(timeS: number, light: LightingSnapshot): void {
  if (!group) return;
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  // Skyhue-shift the fog so it tints with sunrise/sunset.
  _color.setHex(light.skyColor);
  for (const p of PATCHES) {
    // Drift
    p.mesh.position.x += p.driftX * (1 / 60);
    p.mesh.position.z += p.driftZ * (1 / 60);
    // Loop drift around the center so patches don't wander off.
    const dx = p.mesh.position.x - cx;
    const dz = p.mesh.position.z - cz;
    const r = Math.hypot(dx, dz);
    if (r > 32) {
      p.mesh.position.x = cx + (dx / r) * 12;
      p.mesh.position.z = cz + (dz / r) * 12;
    }
    p.mesh.position.y = p.baseY + Math.sin(timeS * 0.3 + p.phase) * 0.18;
    p.mesh.rotation.z += 0.02 * (1 / 60);
    const visibility = regionVisibility(p.region);
    const target = p.baseAlpha * visibility;
    const m = p.mesh.material as MeshBasicMaterial;
    m.opacity += (target - m.opacity) * 0.04;
    // Apply the sky tint so dawn fog goes peach, evening fog goes rose.
    m.color.copy(_color).lerp(new Color('#ffffff'), 0.35);
  }
}
