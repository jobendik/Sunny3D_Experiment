// =============================================================
//  ORDER TRUCK  — Phase 1.1 diegetic 3D world object.
//
//  A wooden delivery cart parked at the farm's south entrance.
//  The board on its back ("ORDERS") is the player's mental anchor
//  for the truck Order Board panel. Tapping a world bubble pinned
//  above the truck (see world-bubbles.ts) opens the side panel.
//
//  Position is fixed and chosen to sit just outside the playable
//  home grid so it never blocks placement. The truck visually
//  faces north (toward the farm) — the order board catches the
//  player's eye as they pan around their land.
// =============================================================

import {
  Group, Mesh, CanvasTexture, MeshLambertMaterial, SRGBColorSpace,
} from 'three';
import { HOME_X0, HOME_Y1 } from '../../constants';
import { box, cyl, sphere, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

/** World-tile position the truck is parked at. Other systems
 *  (world-bubbles, expansion) can import these to anchor things
 *  above the same spot. */
export const ORDER_TRUCK_X = HOME_X0 + 5.5;        // 12.5
export const ORDER_TRUCK_Z = HOME_Y1 + 1.5;        // 25.5
/** Height above ground at which to pin the world bubble. */
export const ORDER_TRUCK_BUBBLE_Y = 2.4;

let mounted: Group | null = null;
let chalkboardTex: CanvasTexture | null = null;

function makeChalkboardTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  // Slate green chalkboard
  ctx.fillStyle = '#214a32';
  ctx.fillRect(0, 0, 256, 128);
  // Inner frame to imply a wooden border
  ctx.strokeStyle = '#0f2a1c';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 122);
  // Soft chalk dust speckle
  ctx.fillStyle = 'rgba(255, 247, 225, 0.08)';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 128, 2, 2);
  }
  // Header
  ctx.font = 'bold 40px "Fredoka", "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff7e1';
  ctx.fillText('ORDERS', 128, 52);
  // Stars/tap hint
  ctx.font = '20px "Nunito", system-ui, sans-serif';
  ctx.fillStyle = '#aed28a';
  ctx.fillText('★ tap to open ★', 128, 92);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

function makeWheel(): Mesh {
  // Cylinder oriented so its axis runs along X (axle = left/right).
  const wheel = new Mesh(cyl(0.28, 0.28, 0.08, 16), mat('#3a2418'));
  wheel.rotation.z = Math.PI / 2;
  wheel.castShadow = true;
  return wheel;
}

function makeOrderCard(angDeg: number, dy: number, dz: number): Mesh {
  // A thin paper card pinned to the back wall. Slightly tilted for
  // a "real corkboard" feel.
  const card = new Mesh(box(0.22, 0.28, 0.02), mat('#fff7e1'));
  card.position.set(0, dy, dz);
  card.rotation.z = (angDeg * Math.PI) / 180;
  return card;
}

function buildOrderTruck(): Group {
  const g = new Group();
  g.name = 'order-truck';

  // ----- Wagon bed -----
  const bed = new Mesh(box(1.6, 0.18, 1.0), mat('#8a5530'));
  bed.position.y = 0.55;
  bed.castShadow = true;
  bed.receiveShadow = true;
  g.add(bed);

  // Floor planks (subtle stripes via three thin boxes on top)
  const plankColors = ['#7a4928', '#8a5530', '#7a4928'];
  for (let i = 0; i < 3; i++) {
    const plank = new Mesh(box(1.55, 0.02, 0.30), mat(plankColors[i]!));
    plank.position.set(0, 0.65, -0.32 + i * 0.32);
    g.add(plank);
  }

  // ----- Side rails -----
  const railColor = '#6a3a1c';
  const railL = new Mesh(box(1.6, 0.34, 0.05), mat(railColor));
  railL.position.set(0, 0.76, -0.5);
  g.add(railL);
  const railR = new Mesh(box(1.6, 0.34, 0.05), mat(railColor));
  railR.position.set(0, 0.76, 0.5);
  g.add(railR);
  // Front rail (north side — the "back" of the truck visually)
  const railF = new Mesh(box(0.05, 0.5, 1.0), mat(railColor));
  railF.position.set(-0.8, 0.83, 0);
  g.add(railF);

  // ----- Hitch tongue (south side, pointing away from farm) -----
  const tongue = new Mesh(box(0.05, 0.05, 0.6), mat('#5a3018'));
  tongue.position.set(0.85, 0.4, 0);
  tongue.rotation.z = Math.PI / 2;
  g.add(tongue);
  // Tongue ring
  const ring = new Mesh(sphere(0.06, 10, 8), mat('#3a2418'));
  ring.position.set(1.12, 0.4, 0);
  g.add(ring);

  // ----- Wheels -----
  const wheelOffsets: Array<[number, number]> = [
    [-0.55, -0.55],
    [-0.55,  0.55],
    [ 0.55, -0.55],
    [ 0.55,  0.55],
  ];
  for (const [x, z] of wheelOffsets) {
    const w = makeWheel();
    w.position.set(x, 0.30, z);
    w.name = 'truck-wheel';
    g.add(w);
    // Tiny silver hub cap so the wheel reads "wheel" not "log"
    const hub = new Mesh(sphere(0.06, 10, 8), mat('#cfd2d8'));
    hub.position.set(x, 0.30, z);
    g.add(hub);
  }

  // ----- Sign pole + chalkboard -----
  const pole = new Mesh(cyl(0.04, 0.04, 1.2, 8), mat('#5a3018'));
  pole.position.set(-0.65, 1.2, 0);
  pole.castShadow = true;
  g.add(pole);

  // Wooden frame behind the chalkboard
  const frame = new Mesh(box(0.05, 0.85, 1.55), mat('#6a3a1c'));
  frame.position.set(-0.68, 1.65, 0);
  g.add(frame);

  // Chalkboard face (textured). Separate group so we can bob the
  // sign as a unit each frame.
  const signPivot = new Group();
  signPivot.name = 'orders-sign';
  if (!chalkboardTex) chalkboardTex = makeChalkboardTexture();
  const chalkMat = new MeshLambertMaterial({ map: chalkboardTex });
  const chalk = new Mesh(box(0.04, 0.72, 1.4), chalkMat);
  chalk.position.set(-0.66, 0, 0);
  chalk.castShadow = true;
  signPivot.add(chalk);
  signPivot.position.set(0, 1.65, 0);
  g.add(signPivot);

  // Top finial — small cone on each end of the sign so it reads as
  // a proper announcement board.
  for (const z of [-0.78, 0.78]) {
    const finial = new Mesh(cone(0.06, 0.14, 8), mat('#f4b942'));
    finial.position.set(-0.68, 2.12, z);
    g.add(finial);
  }

  // ----- Order cards pinned to the front rail -----
  const cardPivot = new Group();
  cardPivot.name = 'orders-cards';
  cardPivot.add(makeOrderCard(-4, 0.95, -0.30));
  cardPivot.add(makeOrderCard( 3, 0.95,  0.00));
  cardPivot.add(makeOrderCard(-2, 0.95,  0.30));
  // Card pivot sits just inside the front rail
  cardPivot.position.set(-0.74, 0, 0);
  g.add(cardPivot);

  // ----- Bench seat at the south end -----
  const bench = new Mesh(box(0.32, 0.08, 0.7), mat('#5a3018'));
  bench.position.set(0.7, 0.78, 0);
  g.add(bench);
  const benchBack = new Mesh(box(0.04, 0.3, 0.7), mat('#5a3018'));
  benchBack.position.set(0.85, 0.92, 0);
  g.add(benchBack);

  return g;
}

/** Install the order truck. Idempotent. */
export function installOrderTruck(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildOrderTruck();
  mounted.position.set(ORDER_TRUCK_X, 0, ORDER_TRUCK_Z);
  // Face north — the back of the truck (where the orders board
  // hangs) catches the player's eye when looking at the farm.
  mounted.rotation.y = Math.PI;
  entities.add(mounted);
}

/** Per-frame: bob the orders sign, idle wheel turn. Cheap. */
export function updateOrderTruck(timeS: number): void {
  if (!mounted) return;
  const sign = mounted.getObjectByName('orders-sign');
  if (sign) {
    sign.position.y = 1.65 + Math.sin(timeS * 1.4) * 0.025;
    sign.rotation.z = Math.sin(timeS * 0.9) * 0.02;
  }
  const cards = mounted.getObjectByName('orders-cards');
  if (cards) {
    // Subtle paper-in-the-breeze flutter
    cards.children.forEach((c, i) => {
      c.rotation.x = Math.sin(timeS * 1.8 + i * 1.3) * 0.05;
    });
  }
  // Idle wheel turn — extremely slow so it reads as "parked but alive"
  for (const child of mounted.children) {
    if (child.name === 'truck-wheel') {
      child.rotation.x = (timeS * 0.12) % (Math.PI * 2);
    }
  }
}
