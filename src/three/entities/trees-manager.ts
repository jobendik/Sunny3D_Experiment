// =============================================================
//  ORCHARD TREES MANAGER
//
//  state.trees holds planted orchard trees. Each has 4 visible
//  stages (sapling / young / mature / fruiting) which we mirror
//  with a procedurally-built mesh group.
// =============================================================

import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture, DoubleSide, Color } from 'three';
import { state } from '../../state';
import { getSceneRoot } from '../scene-root';
import { ORCHARDS } from '../../data/orchards';
import { getTreeStage } from '../../systems/trees';
import { cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

let _shadowTex: CanvasTexture | null = null;
function shadowTex(): CanvasTexture {
  if (_shadowTex) return _shadowTex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.15)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _shadowTex = new CanvasTexture(c);
  return _shadowTex;
}

function makeTreeShadow(stage: number): Mesh {
  const r = stage >= 2 ? 1.1 : stage === 1 ? 0.75 : 0.35;
  const geom = new PlaneGeometry(r, r);
  geom.rotateX(-Math.PI / 2);
  const m = new Mesh(geom, new MeshBasicMaterial({
    map: shadowTex(),
    color: new Color('#ffffff'),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  }));
  m.position.y = 0.03;
  return m;
}

interface TreeMounted {
  id: string;
  stage: number;
  type: string;
  root: Group;
}

const mounted = new Map<string, TreeMounted>();

function fruitColor(type: string): string {
  return ORCHARDS[type]?.fruit === 'pear' ? '#c8e070' : '#e63a3a';
}
function trunkColor(_type: string): string { return '#5a3a20'; }

// Per-tree leaf color variation so an orchard row reads as an
// actual orchard, not a clone-stamped grid. We pick from a tight
// green palette using the orchard type + tile coords as a seed.
const LEAF_PALETTE = ['#3a8a30', '#4a9a40', '#3e7a2a', '#52a648', '#43913a'];
function leafColor(seed: number, mature: boolean): string {
  if (!mature) return '#4a9a40';
  const i = ((seed * 2654435761) >>> 0) % LEAF_PALETTE.length;
  return LEAF_PALETTE[i]!;
}

// Darker secondary leaf shade used for an inner "shadow blob" so
// stylized canopies read with depth instead of as flat hemispheres.
function darkenLeaf(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((v >> 16) & 0xff) - 30);
  const g = Math.max(0, ((v >> 8) & 0xff) - 36);
  const b = Math.max(0, (v & 0xff) - 24);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function makeTreeMesh(type: string, stage: number, seed = 0): Group {
  const g = new Group();
  const trunkC = trunkColor(type);
  const leafC = leafColor(seed, stage >= 1);
  const leafDarkC = darkenLeaf(leafC);
  // Drop a soft round shadow under every tree so it grounds visually.
  g.add(makeTreeShadow(stage));
  if (stage === 0) {
    const sap = new Mesh(cyl(0.025, 0.025, 0.18, 6), mat(trunkC));
    sap.position.y = 0.09;
    g.add(sap);
    const top = new Mesh(sphere(0.1, 8, 6), mat(leafC));
    top.position.y = 0.22;
    g.add(top);
  } else if (stage === 1) {
    const t = new Mesh(cyl(0.06, 0.07, 0.5, 8), mat(trunkC));
    t.position.y = 0.25;
    t.castShadow = true;
    g.add(t);
    // Two-blob canopy: a slightly darker inner sphere reads as
    // shadow under the dominant lit hemisphere.
    const cBack = new Mesh(sphere(0.30, 10, 8), mat(leafDarkC));
    cBack.position.set(-0.05, 0.62, -0.04);
    g.add(cBack);
    const c = new Mesh(sphere(0.32, 12, 10), mat(leafC));
    c.position.set(0.04, 0.68, 0.04);
    c.castShadow = true;
    g.add(c);
  } else if (stage === 2) {
    const t = new Mesh(cyl(0.08, 0.1, 0.7, 8), mat(trunkC));
    t.position.y = 0.35;
    t.castShadow = true;
    g.add(t);
    // Layered canopy puff cluster for premium silhouette.
    const cBack = new Mesh(sphere(0.42, 10, 8), mat(leafDarkC));
    cBack.position.set(-0.07, 0.88, -0.06);
    g.add(cBack);
    const cMid = new Mesh(sphere(0.36, 12, 10), mat(leafC));
    cMid.position.set(0.10, 0.84, 0.06);
    g.add(cMid);
    const c = new Mesh(sphere(0.46, 12, 10), mat(leafC));
    c.position.set(0.0, 0.95, 0.0);
    c.scale.set(1.05, 1.0, 1.05);
    c.castShadow = true;
    g.add(c);
  } else {
    const t = new Mesh(cyl(0.09, 0.11, 0.7, 8), mat(trunkC));
    t.position.y = 0.35;
    t.castShadow = true;
    g.add(t);
    // Dense layered canopy at fruiting stage.
    const cBack = new Mesh(sphere(0.46, 10, 8), mat(leafDarkC));
    cBack.position.set(-0.08, 0.90, -0.07);
    g.add(cBack);
    const cSide = new Mesh(sphere(0.36, 10, 8), mat(leafC));
    cSide.position.set(0.18, 0.88, 0.10);
    g.add(cSide);
    const c = new Mesh(sphere(0.5, 14, 12), mat(leafC));
    c.position.y = 0.97;
    c.castShadow = true;
    g.add(c);
    // Scatter fruit — slightly larger spheres + a few highlights so
    // the orchard reads as "look, fruit!" from above.
    const fruit = fruitColor(type);
    for (let i = 0; i < 7; i++) {
      const f = new Mesh(sphere(0.085, 8, 6), mat(fruit));
      const ang = (i / 7) * Math.PI * 2 + 0.3;
      const ry = 0.95 + (i % 2 ? 0.12 : -0.10);
      f.position.set(Math.cos(ang) * 0.42, ry, Math.sin(ang) * 0.42);
      g.add(f);
    }
  }
  return g;
}

export function updateTrees(timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  for (const tr of state.trees) {
    seen.add(tr.id);
    const stage = getTreeStage(tr);
    let m = mounted.get(tr.id);
    if (!m || m.stage !== stage || m.type !== tr.type) {
      if (m) entities.remove(m.root);
      // Seed: tile coords ensure same tree always picks same palette.
      const root = makeTreeMesh(tr.type, stage, tr.x * 73856093 ^ tr.y * 19349663);
      root.position.set(tr.x + 0.5, 0, tr.y + 0.5);
      // A tiny per-tree rotation so an orchard row doesn't look stamped.
      root.rotation.y = ((tr.x * 17 + tr.y * 31) % 7) * 0.15;
      entities.add(root);
      m = { id: tr.id, stage, type: tr.type, root };
      mounted.set(tr.id, m);
    }
    // Gentle sway — stronger on stage 2/3, almost nothing on saplings
    const swayStrength = stage >= 2 ? 0.025 : 0.012;
    m.root.rotation.z = Math.sin(timeS * 0.7 + tr.x * 0.3) * swayStrength;
    // Tiny lift on fruiting trees so the orchard reads "alive with
    // fruit waiting to be picked".
    if (stage === 3) {
      m.root.position.y = Math.sin(timeS * 1.4 + tr.x * 0.5 + tr.y * 0.3) * 0.018;
    } else {
      m.root.position.y = 0;
    }
  }
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      entities.remove(m.root);
      mounted.delete(id);
    }
  }
}
