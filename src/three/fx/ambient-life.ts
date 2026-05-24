// =============================================================
//  AMBIENT LIFE
//
//  Tiny creatures and dust motes that flit around the farm just to
//  give it life. None of them are interactable — they're pure
//  atmosphere. The whole system is one Points cloud for dust motes
//  + a sprinkle of sprite-billboard butterflies/bees.
//
//  Visibility is tied to the day cycle:
//   - Bees/butterflies fly during the day (peak at midday)
//   - Fireflies float at night, near buildings & lamps
//   - Dust motes drift continuously, denser when the sun is bright
// =============================================================

import {
  Group,
  Mesh,
  Points,
  PointsMaterial,
  BufferGeometry,
  BufferAttribute,
  Color,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  DoubleSide,
  AdditiveBlending,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import type { LightingSnapshot } from '../lighting';

interface Critter {
  mesh: Mesh;
  homeX: number;
  homeZ: number;
  baseY: number;
  speed: number;
  phaseA: number;
  phaseB: number;
  kind: 'butterfly' | 'bee' | 'firefly';
}

const CRITTERS: Critter[] = [];
let dustPoints: Points | null = null;
let dustMat: PointsMaterial | null = null;
let group: Group | null = null;

function makeWingTexture(kind: 'butterfly' | 'bee' | 'firefly'): CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (kind === 'butterfly') {
    // 4 wing blobs with a thin body, in a random palette.
    const palettes = [
      ['#ffd25a', '#f4922a', '#3a2210'],
      ['#f4a0c8', '#e85aa0', '#3a1a30'],
      ['#a0d0ff', '#5a8acf', '#1a2a4a'],
      ['#e8f070', '#a0c83a', '#2a3a10'],
      ['#fff0e0', '#d0a070', '#3a2010'],
    ];
    const pal = palettes[Math.floor(Math.random() * palettes.length)]!;
    // Wings (oval pairs)
    ctx.fillStyle = pal[0]!;
    ctx.beginPath(); ctx.ellipse(20, 22, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(44, 22, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 44, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(42, 44, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Wing accent rims
    ctx.fillStyle = pal[1]!;
    ctx.beginPath(); ctx.ellipse(20, 22, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(44, 22, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = pal[2]!;
    ctx.fillRect(31, 18, 2, 30);
  } else if (kind === 'bee') {
    ctx.fillStyle = '#f4d160';
    ctx.beginPath(); ctx.ellipse(32, 32, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(22, 22, 4, 20);
    ctx.fillRect(34, 22, 4, 20);
    // Wings
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    ctx.beginPath(); ctx.ellipse(28, 22, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(36, 22, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // Firefly — radial glow with a bright core
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
    grad.addColorStop(0, 'rgba(255,250,180,1)');
    grad.addColorStop(0.4, 'rgba(255,220,90,0.7)');
    grad.addColorStop(1, 'rgba(255,160,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(c);
}

function makeCritter(kind: 'butterfly' | 'bee' | 'firefly'): Mesh {
  const tex = makeWingTexture(kind);
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    ...(kind === 'firefly' ? { blending: AdditiveBlending } : {}),
  });
  const geom = new PlaneGeometry(kind === 'firefly' ? 0.34 : 0.30, kind === 'firefly' ? 0.34 : 0.30);
  const m = new Mesh(geom, mat);
  m.renderOrder = 5;
  return m;
}

function spawnCritters(): void {
  const cx = GRID_W / 2;
  const cz = GRID_H / 2;
  // Butterflies — more of them, scattered across the meadow at
  // varying altitudes so the eye always catches one.
  for (let i = 0; i < 12; i++) {
    const m = makeCritter('butterfly');
    const x = cx + (Math.random() - 0.5) * (GRID_W - 4);
    const z = cz + (Math.random() - 0.5) * (GRID_H - 4);
    m.position.set(x, 0.5 + Math.random() * 0.7, z);
    CRITTERS.push({
      mesh: m,
      homeX: x, homeZ: z,
      baseY: 0.5 + Math.random() * 0.7,
      speed: 0.6 + Math.random() * 0.4,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      kind: 'butterfly',
    });
    group!.add(m);
  }
  // Bees — buzz near specific spots (we don't know building positions
  // at install time, so just give them a "hive" home each).
  for (let i = 0; i < 7; i++) {
    const m = makeCritter('bee');
    const x = cx + (Math.random() - 0.5) * (GRID_W - 4);
    const z = cz + (Math.random() - 0.5) * (GRID_H - 4);
    m.position.set(x, 0.7, z);
    CRITTERS.push({
      mesh: m,
      homeX: x, homeZ: z,
      baseY: 0.6 + Math.random() * 0.3,
      speed: 1.8 + Math.random() * 0.6,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      kind: 'bee',
    });
    group!.add(m);
  }
  // Fireflies — show up at night, slightly denser cluster
  for (let i = 0; i < 22; i++) {
    const m = makeCritter('firefly');
    const x = cx + (Math.random() - 0.5) * (GRID_W - 2);
    const z = cz + (Math.random() - 0.5) * (GRID_H - 2);
    m.position.set(x, 0.6 + Math.random() * 0.5, z);
    CRITTERS.push({
      mesh: m,
      homeX: x, homeZ: z,
      baseY: 0.4 + Math.random() * 0.7,
      speed: 0.4 + Math.random() * 0.3,
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      kind: 'firefly',
    });
    group!.add(m);
  }
}

function spawnDustMotes(): void {
  const N = 380;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3 + 0] = Math.random() * GRID_W;
    positions[i * 3 + 1] = 0.4 + Math.random() * 2.8;
    positions[i * 3 + 2] = Math.random() * GRID_H;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  dustMat = new PointsMaterial({
    color: new Color('#fff4c2'),
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.40,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  dustPoints = new Points(g, dustMat);
  dustPoints.name = 'dust-motes';
  group!.add(dustPoints);
}

export function installAmbientLife(): void {
  if (group) return;
  const { fx } = getSceneRoot();
  group = new Group();
  group.name = 'ambient-life';
  fx.add(group);
  spawnCritters();
  spawnDustMotes();
}

export function updateAmbientLife(timeS: number, light: LightingSnapshot): void {
  if (!group) return;
  const dayWeight = 1 - Math.min(1, light.nightTint * 2);   // 1 day, 0 night
  const nightWeight = 1 - dayWeight;

  for (const c of CRITTERS) {
    // Wandering: two sin waves offset by the critter's phases.
    const sp = c.speed;
    const x = c.homeX + Math.cos(timeS * 0.5 * sp + c.phaseA) * 1.4
                       + Math.cos(timeS * 0.25 + c.phaseB) * 0.8;
    const z = c.homeZ + Math.sin(timeS * 0.42 * sp + c.phaseA) * 1.4
                       + Math.sin(timeS * 0.22 + c.phaseB) * 0.8;
    const y = c.baseY + Math.sin(timeS * (c.kind === 'bee' ? 6 : 2.8) + c.phaseB) * 0.12;
    c.mesh.position.set(x, y, z);
    // Face direction of travel.
    const lookAtX = c.mesh.position.x;
    const lookAtZ = c.mesh.position.z;
    void lookAtX; void lookAtZ;
    // Visibility per kind
    const m = c.mesh.material as MeshBasicMaterial;
    if (c.kind === 'firefly') {
      m.opacity = nightWeight * (0.55 + 0.35 * Math.sin(timeS * 3 + c.phaseA));
    } else if (c.kind === 'butterfly') {
      m.opacity = dayWeight * 0.95;
    } else {
      m.opacity = dayWeight * 0.9;
    }
    // Slight billboard rotation toward the camera could go here, but
    // the iso camera is fixed-ish; instead we tilt slightly along
    // motion for a flap effect.
    c.mesh.rotation.z = Math.sin(timeS * (c.kind === 'bee' ? 16 : 6) + c.phaseA) * 0.18;
  }

  if (dustMat) {
    // Dust visible during the day, dimmer at night.
    dustMat.opacity = 0.18 + dayWeight * 0.28 * Math.max(0.4, light.sunFactor);
  }
  if (dustPoints) {
    // Slowly drift the dust geometry; we don't need per-point updates
    // since the eye doesn't track individual motes.
    dustPoints.position.x = Math.sin(timeS * 0.05) * 0.6;
    dustPoints.position.z = Math.cos(timeS * 0.05) * 0.6;
    dustPoints.rotation.y = timeS * 0.02;
  }
}
