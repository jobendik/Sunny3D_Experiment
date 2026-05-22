// =============================================================
//  ROADSIDE STAND — Phase 1.4 diegetic 3D world object.
//
//  A small thatched stand at the western farm edge. The player's
//  market-stall listings live here visually: each occupied slot
//  gets its own little crate of goods on the counter, plus a
//  world bubble showing the item icon. A "SOLD!" pulse appears
//  over slots whose listing has sold and is waiting to be claimed.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_X0, HOME_CENTER_Y } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const STAND_X = HOME_X0 - 1.5;            // 5.5 — just outside the W edge
export const STAND_Z = HOME_CENTER_Y + 3;        // 19
export const STAND_BUBBLE_Y = 2.6;
export const STAND_SLOT_BUBBLE_Y = 1.6;

let mounted: Group | null = null;

function buildStand(): Group {
  const g = new Group();
  g.name = 'roadside-stand';

  // Counter
  const counter = new Mesh(box(1.8, 0.32, 0.5), mat('#8a5530'));
  counter.position.y = 0.4;
  counter.castShadow = true;
  counter.receiveShadow = true;
  g.add(counter);
  // Counter face (lighter band)
  const face = new Mesh(box(1.85, 0.06, 0.52), mat('#caa074'));
  face.position.y = 0.56;
  g.add(face);

  // Side posts
  for (const x of [-0.85, 0.85]) {
    const post = new Mesh(cyl(0.05, 0.05, 1.3, 8), mat('#5a3018'));
    post.position.set(x, 0.95, 0);
    post.castShadow = true;
    g.add(post);
  }

  // Back wall (low, for the price chalkboard)
  const back = new Mesh(box(1.8, 0.5, 0.04), mat('#a87248'));
  back.position.set(0, 0.85, -0.22);
  g.add(back);
  // Chalkboard
  const chalk = new Mesh(box(1.0, 0.35, 0.02), mat('#214a32'));
  chalk.position.set(0, 0.95, -0.21);
  g.add(chalk);
  // Chalkboard scribbles (3 white lines)
  for (let i = 0; i < 3; i++) {
    const line = new Mesh(box(0.7, 0.02, 0.005), mat('#fff7e1'));
    line.position.set(0, 1.10 - i * 0.07, -0.205);
    g.add(line);
  }

  // Thatched roof — a pyramid of cones for that "haystack" thatched feel
  for (let i = 0; i < 3; i++) {
    const r = 1.4 - i * 0.18;
    const cone1 = new Mesh(cone(r, 0.4, 8), mat(['#c4a26a', '#a87a40', '#8a5530'][i]!));
    cone1.position.y = 1.42 + i * 0.10;
    cone1.castShadow = true;
    g.add(cone1);
  }
  // Roof finial
  const finial = new Mesh(sphere(0.08, 10, 8), mat('#e0a020'));
  finial.position.y = 1.95;
  g.add(finial);

  // Slot crates on the counter (3 slots; up to 5 for high-level play)
  // We always render 3 — the world bubbles dynamically attach to
  // whichever slots are actually used.
  const slotPositionsLocal: Array<[number, number]> = [
    [-0.55, 0.05],
    [ 0.00, 0.05],
    [ 0.55, 0.05],
  ];
  for (let i = 0; i < slotPositionsLocal.length; i++) {
    const [lx, lz] = slotPositionsLocal[i]!;
    const crate = new Mesh(box(0.36, 0.20, 0.36), mat('#c8853a'));
    crate.position.set(lx, 0.70, lz);
    crate.name = `stand-slot-${i}`;
    g.add(crate);
    // Strap
    const strap = new Mesh(box(0.37, 0.018, 0.04), mat('#5a3018'));
    strap.position.set(lx, 0.80, lz);
    g.add(strap);
    // Subtle "goods" puff inside — visible from the front when no slot
    const goods = new Mesh(sphere(0.10, 10, 8), mat('#e6c87a'));
    goods.position.set(lx, 0.82, lz);
    goods.name = `stand-slot-goods-${i}`;
    g.add(goods);
  }

  // Tiny apple bin off to the side (decoration)
  const bin = new Mesh(cyl(0.18, 0.20, 0.22, 14), mat('#7a4928'));
  bin.position.set(0.95, 0.18, 0.30);
  g.add(bin);
  for (let i = 0; i < 5; i++) {
    const apple = new Mesh(sphere(0.06, 10, 8), mat('#e64030'));
    apple.position.set(
      0.95 + (Math.random() - 0.5) * 0.18,
      0.32 + Math.random() * 0.05,
      0.30 + (Math.random() - 0.5) * 0.18,
    );
    g.add(apple);
  }

  return g;
}

/** Return the world-XZ position of a stall slot crate by index. */
export function getStandSlotWorldPosition(i: number): { x: number; z: number } | null {
  const local: Array<[number, number]> = [
    [-0.55, 0.05],
    [ 0.00, 0.05],
    [ 0.55, 0.05],
  ];
  const p = local[i];
  if (!p) return null;
  // Stand is rotated by Math.PI/2 (faces east). After Y-rotation:
  //   worldX = STAND_X + (local cos - local sin)
  //   worldZ = STAND_Z + (local sin + local cos)
  // Math.PI/2: cos=0, sin=1 → worldX = STAND_X - lz, worldZ = STAND_Z + lx
  return { x: STAND_X - p[1], z: STAND_Z + p[0] };
}

/** Install the stand. Idempotent. */
export function installRoadsideStand(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildStand();
  mounted.position.set(STAND_X, 0, STAND_Z);
  // Face east into the farm.
  mounted.rotation.y = Math.PI / 2;
  entities.add(mounted);
}

/** Per-frame: hide goods puffs on slots that are currently empty. */
export function updateRoadsideStand(_timeS: number): void {
  if (!mounted) return;
  const stall = state.marketStall;
  for (let i = 0; i < 3; i++) {
    const goods = mounted.getObjectByName(`stand-slot-goods-${i}`);
    if (!goods) continue;
    const slot = stall?.slots[i];
    goods.visible = !!slot && slot.status === 'listed';
  }
}
