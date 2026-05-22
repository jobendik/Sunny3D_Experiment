// =============================================================
//  BOAT AT DOCK — Phase 1.2 diegetic 3D world object.
//
//  Visual presence for the boat-delivery system. Always renders the
//  wooden dock platform jutting into the NW lake. The boat itself is
//  visible only while state.boat.state === 'docked', and gently
//  bobs against the dock. World bubbles (see world-bubbles.ts) carry
//  the hub icon + the per-crate "need" indicators.
//
//  Lake geometry: see src/three/terrain/world-gen.ts pass 2.
//  The east shoreline at row HOME_Y0+2 makes a natural dock slot.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_X0, HOME_Y0 } from '../../constants';
import { box, cyl, cone, sphere, plane } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

/** Where the dock platform centers (shore-side end on dry land). */
export const DOCK_X = HOME_X0 + 4.5;     // 11.5
export const DOCK_Z = HOME_Y0 + 2.5;     // 9.5
/** Where the docked boat sits (one unit further into the lake). */
export const BOAT_X = HOME_X0 + 2.5;     // 9.5
export const BOAT_Z = HOME_Y0 + 2.5;     // 9.5
/** Height for the world bubble pinned above the boat. */
export const BOAT_BUBBLE_Y = 2.4;
/** Height for per-crate bubbles. */
export const BOAT_CRATE_BUBBLE_Y = 1.6;

let dockGroup: Group | null = null;
let boatGroup: Group | null = null;

function buildDock(): Group {
  const g = new Group();
  g.name = 'boat-dock';

  // Deck planks (along the boat's long axis = X axis)
  for (let i = 0; i < 5; i++) {
    const plank = new Mesh(box(0.34, 0.06, 1.6), mat('#8a5530'));
    plank.position.set(-0.8 + i * 0.34, 0.20, 0);
    plank.castShadow = true;
    plank.receiveShadow = true;
    g.add(plank);
  }
  // Cross-beam at the shore end
  const beamShore = new Mesh(box(1.85, 0.05, 0.12), mat('#6a3a1c'));
  beamShore.position.set(0, 0.16, 0.78);
  g.add(beamShore);
  // Cross-beam at the water end
  const beamWater = new Mesh(box(1.85, 0.05, 0.12), mat('#6a3a1c'));
  beamWater.position.set(0, 0.16, -0.78);
  g.add(beamWater);

  // Stilts (cyls) — 6 of them descending into the water
  const stiltColor = '#5a3018';
  const stiltPositions: Array<[number, number]> = [
    [-0.85,  0.7], [ 0.85,  0.7],
    [-0.85,  0.0], [ 0.85,  0.0],
    [-0.85, -0.7], [ 0.85, -0.7],
  ];
  for (const [x, z] of stiltPositions) {
    const stilt = new Mesh(cyl(0.05, 0.06, 0.4, 8), mat(stiltColor));
    stilt.position.set(x, 0.0, z);
    g.add(stilt);
  }

  // Mooring posts at the water end (taller, with rope coil suggestion)
  for (const x of [-0.95, 0.95]) {
    const post = new Mesh(cyl(0.07, 0.07, 0.55, 8), mat('#4a2814'));
    post.position.set(x, 0.45, -0.78);
    post.castShadow = true;
    g.add(post);
    const cap = new Mesh(sphere(0.08, 10, 8), mat('#3a2010'));
    cap.position.set(x, 0.74, -0.78);
    g.add(cap);
    // Rope coil — a tiny squashed cyl
    const rope = new Mesh(cyl(0.10, 0.10, 0.04, 12), mat('#caa074'));
    rope.position.set(x, 0.50, -0.78);
    g.add(rope);
  }

  // Small lantern at the water end for night ambience
  const lampPole = new Mesh(cyl(0.025, 0.025, 0.7, 6), mat('#3a2010'));
  lampPole.position.set(0, 0.55, -0.78);
  g.add(lampPole);
  const lamp = new Mesh(box(0.14, 0.14, 0.14), mat('#fff2c0', { emissive: '#ffae3a' }));
  lamp.position.set(0, 0.95, -0.78);
  g.add(lamp);

  return g;
}

function buildBoat(): Group {
  const g = new Group();
  g.name = 'boat-hull';

  // Hull (longer along X)
  const hull = new Mesh(box(2.0, 0.32, 0.85), mat('#a05a30'));
  hull.position.y = 0.18;
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);
  // Lower hull (darker, narrower) — gives a 2-tone waterline
  const keel = new Mesh(box(1.85, 0.18, 0.70), mat('#5a2a14'));
  keel.position.y = 0.03;
  g.add(keel);
  // Bow (pointed front) — cone tilted to fit the hull
  const bow = new Mesh(cone(0.42, 0.65, 4), mat('#a05a30'));
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(1.10, 0.18, 0);
  g.add(bow);
  // Stern board
  const stern = new Mesh(box(0.06, 0.40, 0.85), mat('#6a3a1c'));
  stern.position.set(-1.02, 0.30, 0);
  g.add(stern);

  // Cabin (small box near the stern)
  const cabin = new Mesh(box(0.55, 0.34, 0.55), mat('#f4ecd0'));
  cabin.position.set(-0.55, 0.51, 0);
  cabin.castShadow = true;
  g.add(cabin);
  const cabinRoof = new Mesh(box(0.62, 0.06, 0.62), mat('#7a3a24'));
  cabinRoof.position.set(-0.55, 0.71, 0);
  g.add(cabinRoof);
  // Tiny window on the cabin
  const win = new Mesh(box(0.02, 0.10, 0.16), mat('#a6d8f0', { emissive: '#5fb6de' }));
  win.position.set(-0.27, 0.55, 0);
  g.add(win);

  // Mast + sail
  const mast = new Mesh(cyl(0.04, 0.04, 1.3, 8), mat('#5a3018'));
  mast.position.set(0.20, 0.83, 0);
  g.add(mast);
  // Sail (slightly bowed): a thin tilted box
  const sail = new Mesh(box(0.04, 0.85, 0.65), mat('#fffbe4'));
  sail.position.set(0.18, 1.05, 0);
  sail.rotation.x = -0.08;
  g.add(sail);
  // Flag at the top of the mast
  const flag = new Mesh(box(0.02, 0.14, 0.22), mat('#e54a5e'));
  flag.position.set(0.20, 1.55, 0.11);
  flag.name = 'boat-flag';
  g.add(flag);

  // Three crates on deck. Positions are also returned via getCrateWorldPositions
  // so world bubbles can pin "need" icons above each crate.
  const cratePositionsLocal: Array<[number, number]> = [
    [ 0.55, -0.22],
    [ 0.55,  0.22],
    [ 0.85,  0.00],
  ];
  for (let i = 0; i < cratePositionsLocal.length; i++) {
    const [lx, lz] = cratePositionsLocal[i]!;
    const crate = new Mesh(box(0.26, 0.26, 0.26), mat('#c8853a'));
    crate.position.set(lx, 0.46, lz);
    crate.name = `boat-crate-${i}`;
    crate.castShadow = true;
    g.add(crate);
    // Cross-strap
    const strap = new Mesh(box(0.27, 0.02, 0.03), mat('#5a3018'));
    strap.position.set(lx, 0.59, lz);
    g.add(strap);
  }

  // Slight water-surface plane under the hull so the boat reads as
  // sitting in water even when the lake mesh tint changes. Subtle.
  const wake = new Mesh(plane(2.4, 1.2), mat('#5fb6de', { transparent: true, opacity: 0.32 }));
  wake.rotation.x = -Math.PI / 2;
  wake.position.y = 0.02;
  g.add(wake);

  return g;
}

/** Compute the world position of crate `i` (0..2) on the docked boat. */
export function getCrateWorldPosition(i: number): { x: number; z: number } | null {
  if (!boatGroup || !boatGroup.visible) return null;
  const local: Array<[number, number]> = [
    [ 0.55, -0.22],
    [ 0.55,  0.22],
    [ 0.85,  0.00],
  ];
  const p = local[i];
  if (!p) return null;
  // Boat group has rotation.y = 0 (oriented along X already); no rotation math needed.
  return { x: BOAT_X + p[0], z: BOAT_Z + p[1] };
}

/** Install dock + boat. Idempotent. */
export function installBoatAtDock(): void {
  if (dockGroup) return;
  const { entities } = getSceneRoot();
  dockGroup = buildDock();
  dockGroup.position.set(DOCK_X, 0, DOCK_Z);
  entities.add(dockGroup);

  boatGroup = buildBoat();
  boatGroup.position.set(BOAT_X, 0, BOAT_Z);
  boatGroup.visible = false;
  entities.add(boatGroup);
}

/** Per-frame: bob the boat, gate visibility on boat state. */
export function updateBoatAtDock(timeS: number): void {
  if (!boatGroup) return;
  const docked = state.boat?.unlocked && state.boat?.state === 'docked';
  boatGroup.visible = !!docked;
  if (!docked) return;
  // Gentle vertical bob + roll
  boatGroup.position.y = Math.sin(timeS * 1.1) * 0.04;
  boatGroup.rotation.z = Math.sin(timeS * 0.8) * 0.02;
  boatGroup.rotation.y = Math.sin(timeS * 0.4) * 0.015;
  // Flag flutter
  const flag = boatGroup.getObjectByName('boat-flag');
  if (flag) flag.rotation.y = Math.sin(timeS * 4.0) * 0.5;
}
