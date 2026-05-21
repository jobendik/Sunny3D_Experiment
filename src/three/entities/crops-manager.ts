// =============================================================
//  CROPS MANAGER
//
//  Walks state.grid each frame and ensures each plowed-with-crop
//  tile has a small mesh sitting on it. The mesh swaps between 4
//  growth stages mirroring cropStage() from the gameplay code.
//
//  Crop visual = a tuft scaled per stage, with a per-crop color.
//  Withered tiles get tilted & desaturated; wilting tiles bob.
// =============================================================

import {
  Group, Mesh, RingGeometry, MeshBasicMaterial, Color, DoubleSide,
  AdditiveBlending, Sprite, SpriteMaterial, CanvasTexture,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { cropStage, isWithered, isWilting } from '../../systems/crops';
import { sphere, cone, box, cyl } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface CropMounted {
  key: string;     // "gx,gy"
  crop: string;
  stage: number;
  root: Group;
  ring?: Mesh;
  sparkle?: Sprite;
}

const mounted = new Map<string, CropMounted>();

// Shared ripe-ready ring geometry & material — one for every crop,
// drawn under the plant when stage === 3. It pulses gently so the
// player's eye is drawn to harvestable rows at a glance.
let _ringGeom: RingGeometry | null = null;
let _ringMat: MeshBasicMaterial | null = null;
function ripeRing(): Mesh {
  if (!_ringGeom) {
    _ringGeom = new RingGeometry(0.30, 0.42, 24);
    _ringGeom.rotateX(-Math.PI / 2);
  }
  if (!_ringMat) {
    _ringMat = new MeshBasicMaterial({
      color: new Color('#ffe080'),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
  }
  const m = new Mesh(_ringGeom, _ringMat);
  m.renderOrder = 2;
  return m;
}

// Shared sparkle sprite texture — a small radial gradient that
// reads as a tiny "ready!" highlight floating above a ripe crop.
let _sparkleTex: CanvasTexture | null = null;
let _sparkleMat: SpriteMaterial | null = null;
function sparkleSprite(): Sprite {
  if (!_sparkleTex) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,220,1)');
    grad.addColorStop(0.35, 'rgba(255,220,130,0.7)');
    grad.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    _sparkleTex = new CanvasTexture(c);
  }
  if (!_sparkleMat) {
    _sparkleMat = new SpriteMaterial({
      map: _sparkleTex,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }
  // Per-sprite material clone so opacity can pulse independently.
  const m = _sparkleMat.clone();
  const s = new Sprite(m);
  s.scale.set(0.32, 0.32, 1);
  s.renderOrder = 6;
  return s;
}

const CROP_COLORS: Record<string, { stem: string; head: string }> = {
  wheat:      { stem: '#3a7a30', head: '#e8c64a' },
  corn:       { stem: '#3a7a30', head: '#f4d160' },
  carrot:     { stem: '#3a7a30', head: '#f48a2a' },
  tomato:     { stem: '#3a7a30', head: '#e63a3a' },
  pumpkin:    { stem: '#3a7a30', head: '#f4742a' },
  strawberry: { stem: '#3a7a30', head: '#e63a4a' },
  sugarcane:  { stem: '#5aa850', head: '#8ac86a' },
  lavender:   { stem: '#3a7a30', head: '#a070d4' },
  blueberry:  { stem: '#3a7a30', head: '#4a78c4' },
};

function makeCropMesh(crop: string, stage: number): Group {
  const g = new Group();
  const c = CROP_COLORS[crop] ?? CROP_COLORS.wheat!;
  if (stage === 0) {
    // Tiny seedling: two leaflets opening from a short stem. Reads
    // clearly at iso as a "just-planted" mark — a single squashed
    // sphere here looks like a UFO from above.
    const stem = new Mesh(cyl(0.015, 0.015, 0.06, 6), mat(c.stem));
    stem.position.y = 0.03;
    g.add(stem);
    for (let i = 0; i < 2; i++) {
      const leaf = new Mesh(sphere(0.05, 8, 6), mat(c.stem));
      leaf.scale.set(1, 0.35, 0.6);
      const ang = i === 0 ? -0.6 : 0.6;
      leaf.position.set(Math.cos(ang) * 0.05, 0.07, Math.sin(ang) * 0.05);
      leaf.rotation.y = ang;
      g.add(leaf);
    }
  } else if (stage === 1) {
    // Sprout: small stalk + bud
    const stem = new Mesh(cyl(0.02, 0.02, 0.18, 6), mat(c.stem));
    stem.position.y = 0.09;
    g.add(stem);
    const bud = new Mesh(sphere(0.06, 8, 6), mat(c.stem));
    bud.position.y = 0.21;
    g.add(bud);
  } else if (stage === 2) {
    // Growing: bigger stalk + leaves
    const stem = new Mesh(cyl(0.03, 0.03, 0.32, 6), mat(c.stem));
    stem.position.y = 0.16;
    g.add(stem);
    const leaves = new Mesh(sphere(0.13, 10, 8), mat(c.stem));
    leaves.scale.set(1.2, 0.8, 1.2);
    leaves.position.y = 0.32;
    g.add(leaves);
  } else {
    // Ripe: full plant + colored head
    if (crop === 'wheat') {
      // Wheat = 3 stalks with golden heads
      for (let i = 0; i < 3; i++) {
        const stalk = new Mesh(cyl(0.012, 0.012, 0.4, 6), mat('#9aa54a'));
        stalk.position.set(-0.08 + i * 0.08, 0.2, 0);
        const head = new Mesh(cone(0.04, 0.16, 6), mat(c.head));
        head.position.set(-0.08 + i * 0.08, 0.4, 0);
        g.add(stalk, head);
      }
    } else if (crop === 'corn') {
      const stalk = new Mesh(cyl(0.03, 0.03, 0.5, 6), mat('#5aa850'));
      stalk.position.y = 0.25;
      g.add(stalk);
      for (let i = 0; i < 2; i++) {
        const cob = new Mesh(cyl(0.07, 0.06, 0.18, 8), mat(c.head));
        cob.position.set(0.06, 0.28 + i * 0.13, 0);
        cob.rotation.z = -0.1;
        g.add(cob);
      }
    } else if (crop === 'pumpkin') {
      const pump = new Mesh(sphere(0.22, 12, 10), mat(c.head));
      pump.scale.set(1, 0.85, 1);
      pump.position.y = 0.2;
      g.add(pump);
      const stem = new Mesh(cyl(0.022, 0.022, 0.08, 6), mat(c.stem));
      stem.position.y = 0.42;
      g.add(stem);
    } else if (crop === 'sugarcane') {
      // 3 tall canes
      for (let i = 0; i < 3; i++) {
        const cane = new Mesh(cyl(0.025, 0.025, 0.55, 6), mat(c.head));
        cane.position.set(-0.06 + i * 0.06, 0.28, 0);
        g.add(cane);
      }
    } else if (crop === 'lavender') {
      for (let i = 0; i < 3; i++) {
        const stalk = new Mesh(cyl(0.015, 0.015, 0.32, 6), mat(c.stem));
        stalk.position.set(-0.06 + i * 0.06, 0.16, 0);
        const head = new Mesh(cone(0.04, 0.12, 6), mat(c.head));
        head.position.set(-0.06 + i * 0.06, 0.36, 0);
        g.add(stalk, head);
      }
    } else if (crop === 'tomato' || crop === 'strawberry' || crop === 'blueberry') {
      const bush = new Mesh(sphere(0.18, 12, 10), mat(c.stem));
      bush.scale.set(1.1, 0.8, 1.1);
      bush.position.y = 0.2;
      g.add(bush);
      for (let i = 0; i < 4; i++) {
        const fruit = new Mesh(sphere(0.06, 8, 6), mat(c.head));
        const angle = (i / 4) * Math.PI * 2;
        fruit.position.set(Math.cos(angle) * 0.13, 0.22, Math.sin(angle) * 0.13);
        g.add(fruit);
      }
    } else {
      // carrot: green tops only above ground
      const leaves = new Mesh(sphere(0.15, 10, 8), mat(c.stem));
      leaves.scale.set(1.2, 1.0, 1.2);
      leaves.position.y = 0.2;
      g.add(leaves);
      const tip = new Mesh(cone(0.05, 0.1, 6), mat(c.head));
      tip.position.y = 0.07;
      g.add(tip);
    }
  }
  return g;
}

export function updateCrops(timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  // Walk the 18×18 grid each frame, but bail fast on tiles without
  // a crop. At 324 cells this is far cheaper than mesh updates.
  for (let gy = 0; gy < GRID_H; gy++) {
    const row = state.grid[gy];
    if (!row) continue;
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = row[gx];
      if (!t || !t.crop) continue;
      const stage = cropStage(t);
      if (stage < 0) continue;
      const key = `${gx},${gy}`;
      seen.add(key);
      let m = mounted.get(key);
      if (!m || m.crop !== t.crop || m.stage !== stage) {
        if (m) entities.remove(m.root);
        const root = makeCropMesh(t.crop, stage);
        root.position.set(gx + 0.5, 0, gy + 0.5);
        entities.add(root);
        m = { key, crop: t.crop, stage, root };
        // Attach ripe-ring + sparkle on stage 3 so the player's eye
        // is drawn to harvestable tiles even at a quick glance.
        if (stage === 3) {
          const ring = ripeRing();
          ring.position.y = 0.03;
          root.add(ring);
          m.ring = ring;
          const spark = sparkleSprite();
          spark.position.y = 0.65;
          root.add(spark);
          m.sparkle = spark;
        }
        mounted.set(key, m);
      }
      // Animate state on top of the static base mesh
      const withered = isWithered(t);
      const wilting = !withered && isWilting(t);
      if (withered) {
        m.root.rotation.z = 0.4;
        m.root.position.y = -0.02;
      } else if (wilting) {
        m.root.rotation.z = 0.1 + 0.05 * Math.sin(timeS * 2 + gx + gy);
        m.root.position.y = 0;
      } else {
        m.root.rotation.z = 0;
        // Ripe stage gentle bob
        if (stage === 3) {
          m.root.position.y = Math.sin(timeS * 2 + gx + gy) * 0.02;
          // Pulse the "ready" ring + sparkle gently. The pulse phase
          // is offset per-tile so a row of ripe crops twinkles in a
          // soft wave rather than synchronously.
          const phase = timeS * 2.2 + gx * 0.41 + gy * 0.37;
          const pulse = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(phase));
          if (m.ring) {
            (m.ring.material as MeshBasicMaterial).opacity = pulse;
            const s = 0.95 + 0.10 * Math.sin(phase * 0.8);
            m.ring.scale.setScalar(s);
          }
          if (m.sparkle) {
            const mat = m.sparkle.material as SpriteMaterial;
            mat.opacity = 0.55 + 0.35 * Math.sin(phase + 1.2);
            const ss = 0.28 + 0.10 * Math.sin(phase * 1.3 + 0.6);
            m.sparkle.scale.set(ss, ss, 1);
            m.sparkle.position.y = 0.62 + Math.sin(phase * 0.7) * 0.04;
          }
        } else {
          m.root.position.y = 0;
        }
      }
    }
  }
  // Remove stale crops
  for (const [k, m] of mounted) {
    if (!seen.has(k)) {
      entities.remove(m.root);
      mounted.delete(k);
    }
  }
  void box;
}
