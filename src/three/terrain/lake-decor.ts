// =============================================================
//  LAKE DECOR
//
//  Reeds at the shore + lily pads + occasional water flowers on the
//  lake itself. These are static at install time but bobble subtly
//  with the water in updateLakeDecor.
//
//  Reed positions are derived from the lake footprint in state.grid:
//  any grass/path tile that is adjacent to a water tile gets a few
//  reeds; lily pads scatter randomly on water tiles.
// =============================================================

import {
  Group,
  Mesh,
  Color,
  CircleGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  DoubleSide,
  MeshLambertMaterial,
} from 'three';
import { state } from '../../state';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { mat } from '../procgen/materials';

interface AnimatedItem {
  mesh: Mesh | Group;
  phase: number;
  baseY: number;
  kind: 'lily' | 'reed' | 'flower';
}
const ITEMS: AnimatedItem[] = [];
let group: Group | null = null;
let installed = false;

function isWater(gx: number, gy: number): boolean {
  return state.grid[gy]?.[gx]?.type === 'water';
}

function hasWaterNeighbor(gx: number, gy: number): boolean {
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]] as const) {
    if (isWater(gx + dx, gy + dy)) return true;
  }
  return false;
}

function makeLilyPad(): Group {
  const g = new Group();
  // Big flat oval pad
  const padGeom = new CircleGeometry(0.18, 16);
  padGeom.rotateX(-Math.PI / 2);
  // Cut a notch out of one side by clamping uv? Skip — a flat disk
  // reads as a lily pad fine.
  const padMat = new MeshLambertMaterial({
    color: new Color('#4ba84a'),
    side: DoubleSide,
    flatShading: true,
  });
  const pad = new Mesh(padGeom, padMat);
  pad.position.y = 0.01;
  pad.scale.set(1, 1, 0.85 + Math.random() * 0.3);
  g.add(pad);
  // Sometimes a flower (pink or white)
  if (Math.random() < 0.4) {
    const color = Math.random() < 0.5 ? '#ffd0e8' : '#ffffff';
    const petalGeom = new SphereGeometry(0.045, 8, 6);
    const petal = new Mesh(petalGeom, mat(color));
    petal.position.set(0.02, 0.045, 0);
    petal.scale.set(1, 0.7, 1);
    g.add(petal);
    const center = new Mesh(new SphereGeometry(0.022, 6, 4), mat('#f4d160'));
    center.position.set(0.02, 0.07, 0);
    g.add(center);
  }
  return g;
}

function makeReed(): Group {
  const g = new Group();
  // 3-5 stalks, varying heights
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const h = 0.32 + Math.random() * 0.3;
    const stalk = new Mesh(
      new CylinderGeometry(0.018, 0.022, h, 5),
      mat('#5aa850'),
    );
    stalk.position.set(
      (Math.random() - 0.5) * 0.16,
      h / 2 - 0.05,
      (Math.random() - 0.5) * 0.16,
    );
    stalk.rotation.z = (Math.random() - 0.5) * 0.18;
    g.add(stalk);
    // Brown reed-head at the top
    if (Math.random() < 0.7) {
      const head = new Mesh(
        new CylinderGeometry(0.035, 0.03, 0.09, 6),
        mat('#8a5a30'),
      );
      head.position.set(stalk.position.x, h + 0.04 - 0.05, stalk.position.z);
      g.add(head);
    }
  }
  return g;
}

function makeShoreFlower(): Mesh {
  // Single tall flower stalk at shore
  const g = new Group();
  const stalk = new Mesh(new CylinderGeometry(0.012, 0.012, 0.18, 5), mat('#3a7a30'));
  stalk.position.y = 0.09;
  g.add(stalk);
  const head = new Mesh(
    new PlaneGeometry(0.12, 0.12),
    new MeshLambertMaterial({ color: new Color('#ff80c0'), side: DoubleSide, transparent: true, alphaTest: 0.5 }),
  );
  head.position.y = 0.21;
  g.add(head);
  return head;        // caller wraps it
}

export function installLakeDecor(): void {
  if (installed) return;
  installed = true;
  const { terrain } = getSceneRoot();
  group = new Group();
  group.name = 'lake-decor';
  terrain.add(group);

  // Lily pads on water tiles
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (!isWater(gx, gy)) continue;
      // ~70% chance of a pad
      if (Math.random() < 0.6) {
        const pad = makeLilyPad();
        const px = gx + 0.2 + Math.random() * 0.6;
        const pz = gy + 0.2 + Math.random() * 0.6;
        pad.position.set(px, -0.16, pz);
        pad.rotation.y = Math.random() * Math.PI * 2;
        const s = 0.85 + Math.random() * 0.45;
        pad.scale.setScalar(s);
        group.add(pad);
        ITEMS.push({ mesh: pad, phase: Math.random() * Math.PI * 2, baseY: pad.position.y, kind: 'lily' });
      }
    }
  }

  // Reeds at shoreline (grass/path tiles adjacent to water)
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      const t = state.grid[gy]?.[gx];
      if (!t || t.type === 'water') continue;
      if (!hasWaterNeighbor(gx, gy)) continue;
      // 2-4 reed clumps per shoreline tile
      const clumps = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clumps; i++) {
        const reed = makeReed();
        // Push reeds toward the water edge — find which side has water
        let edgeX = gx + 0.5, edgeY = gy + 0.5;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
        for (const [dx, dy] of dirs) {
          if (isWater(gx + dx, gy + dy)) {
            edgeX = gx + 0.5 + dx * 0.3 + (Math.random() - 0.5) * 0.25;
            edgeY = gy + 0.5 + dy * 0.3 + (Math.random() - 0.5) * 0.25;
            break;
          }
        }
        reed.position.set(edgeX, 0, edgeY);
        group.add(reed);
        ITEMS.push({ mesh: reed, phase: Math.random() * Math.PI * 2, baseY: 0, kind: 'reed' });
      }
    }
  }
  void makeShoreFlower;
}

export function updateLakeDecor(timeS: number): void {
  for (const it of ITEMS) {
    if (it.kind === 'lily') {
      it.mesh.position.y = it.baseY + Math.sin(timeS * 0.9 + it.phase) * 0.015;
      it.mesh.rotation.z = Math.sin(timeS * 0.4 + it.phase) * 0.04;
    } else if (it.kind === 'reed') {
      it.mesh.rotation.x = Math.sin(timeS * 1.2 + it.phase) * 0.06;
      it.mesh.rotation.z = Math.cos(timeS * 0.9 + it.phase) * 0.05;
    }
  }
}
