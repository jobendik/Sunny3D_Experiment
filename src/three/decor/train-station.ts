// =============================================================
//  TRAIN STATION + ENGINE — Phase 1.12 diegetic world object.
//
//  Small wooden station building at the east edge with a visible
//  rail line. The train engine animates onto the platform when
//  state.train.status === 'returned', else slides off-screen east.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_X1, HOME_CENTER_Y } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const STATION_X = HOME_X1 + 1.6;           // 25.6
export const STATION_Z = HOME_CENTER_Y;           // 16
export const STATION_BUBBLE_Y = 2.8;
export const RAIL_Z = HOME_CENTER_Y + 1.2;        // tracks just south of the station

const ENGINE_PARKED_X = STATION_X + 0.1;
const ENGINE_OFFSCREEN_X = STATION_X + 8;

let mounted: Group | null = null;
let enginePivot: Group | null = null;

function buildStation(): Group {
  const g = new Group();
  g.name = 'train-station';

  // Platform
  const platform = new Mesh(box(2.4, 0.18, 0.7), mat('#a87248'));
  platform.position.set(0, 0.09, 0);
  platform.castShadow = true;
  g.add(platform);
  const platformTrim = new Mesh(box(2.5, 0.05, 0.78), mat('#5a3018'));
  platformTrim.position.set(0, 0.05, 0);
  g.add(platformTrim);

  // Station house at the back
  const house = new Mesh(box(1.4, 0.7, 0.5), mat('#f4ecd0'));
  house.position.set(0, 0.55, -0.5);
  house.castShadow = true;
  g.add(house);
  const houseRoof = new Mesh(box(1.5, 0.1, 0.6), mat('#7a3a24'));
  houseRoof.position.set(0, 0.95, -0.5);
  g.add(houseRoof);
  // Slanted overhang above the platform
  const overhang = new Mesh(box(2.4, 0.06, 0.6), mat('#7a3a24'));
  overhang.position.set(0, 1.0, -0.2);
  overhang.rotation.x = -0.18;
  g.add(overhang);
  // Roof supports
  for (const x of [-1.05, -0.35, 0.35, 1.05]) {
    const post = new Mesh(cyl(0.03, 0.03, 0.85, 6), mat('#5a3018'));
    post.position.set(x, 0.52, 0.2);
    g.add(post);
  }

  // Station sign
  const sign = new Mesh(box(0.6, 0.18, 0.06), mat('#5a3018'));
  sign.position.set(0, 0.7, -0.22);
  g.add(sign);
  const signFace = new Mesh(box(0.52, 0.12, 0.02), mat('#fff7e1'));
  signFace.position.set(0, 0.7, -0.19);
  g.add(signFace);
  // 4 dark dots to imply "SUNNY ACRES" letters without a texture
  for (let i = 0; i < 4; i++) {
    const dot = new Mesh(sphere(0.012, 6, 4), mat('#3a2010'));
    dot.position.set(-0.18 + i * 0.12, 0.7, -0.18);
    g.add(dot);
  }

  // Window
  const win = new Mesh(box(0.32, 0.22, 0.04), mat('#a6d8f0', { emissive: '#5fb6de' }));
  win.position.set(0.45, 0.55, -0.5 + 0.26);
  g.add(win);

  // Door
  const door = new Mesh(box(0.20, 0.42, 0.04), mat('#5a3018'));
  door.position.set(-0.35, 0.31, -0.5 + 0.26);
  g.add(door);

  return g;
}

function buildRails(): Group {
  // Two rails running E-W along the south edge of the platform.
  // Long enough to clearly show the train enters/exits sideways.
  const g = new Group();
  g.name = 'train-rails';
  const length = 14;
  for (const dz of [-0.12, 0.12]) {
    const rail = new Mesh(box(length, 0.04, 0.04), mat('#5a4028'));
    rail.position.set(0, 0.04, dz);
    g.add(rail);
  }
  // Sleepers
  for (let i = 0; i < 22; i++) {
    const sleeper = new Mesh(box(0.10, 0.04, 0.40), mat('#3a2010'));
    sleeper.position.set(-length / 2 + 0.30 + i * 0.62, 0.02, 0);
    g.add(sleeper);
  }
  return g;
}

function buildEngine(): Group {
  const g = new Group();
  g.name = 'train-engine';

  // Locomotive body
  const body = new Mesh(box(1.4, 0.42, 0.42), mat('#5a2a18'));
  body.position.y = 0.34;
  body.castShadow = true;
  g.add(body);
  // Boiler (cyl on the front half)
  const boiler = new Mesh(cyl(0.22, 0.22, 0.95, 14), mat('#3a2010'));
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0.30, 0.46, 0);
  g.add(boiler);
  // Smokestack
  const stack = new Mesh(cyl(0.07, 0.10, 0.20, 10), mat('#1a1a1a'));
  stack.position.set(0.60, 0.78, 0);
  g.add(stack);
  // Cab
  const cab = new Mesh(box(0.40, 0.42, 0.46), mat('#7a3a24'));
  cab.position.set(-0.40, 0.65, 0);
  g.add(cab);
  // Window on cab
  const cabWin = new Mesh(box(0.04, 0.18, 0.24), mat('#a6d8f0', { emissive: '#5fb6de' }));
  cabWin.position.set(-0.20, 0.66, 0);
  g.add(cabWin);
  // Cow-catcher
  const catcher = new Mesh(box(0.10, 0.20, 0.45), mat('#2c1c0e'));
  catcher.position.set(0.75, 0.20, 0);
  g.add(catcher);

  // 4 driving wheels
  for (const x of [-0.4, 0.0, 0.30]) {
    const wheel = new Mesh(cyl(0.16, 0.16, 0.06, 14), mat('#1a1a1a'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.14, 0.21);
    g.add(wheel);
    const wheelR = wheel.clone();
    wheelR.position.set(x, 0.14, -0.21);
    g.add(wheelR);
  }

  // Coal tender behind cab
  const tender = new Mesh(box(0.7, 0.34, 0.42), mat('#3a2010'));
  tender.position.set(-1.0, 0.30, 0);
  g.add(tender);
  for (let i = 0; i < 6; i++) {
    const coal = new Mesh(sphere(0.06, 8, 6), mat('#1a1a1a'));
    coal.position.set(
      -1.0 + (Math.random() - 0.5) * 0.5,
      0.50 + (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.3,
    );
    g.add(coal);
  }

  return g;
}

export function installTrainStation(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  // Station
  mounted = new Group();
  mounted.name = 'train-station-root';
  const station = buildStation();
  station.position.set(STATION_X, 0, STATION_Z);
  station.rotation.y = -Math.PI / 2;
  mounted.add(station);
  // Rails (along world Z is the wrong direction; align with X)
  const rails = buildRails();
  rails.position.set(STATION_X - 2.4, 0, RAIL_Z);
  mounted.add(rails);
  // Engine (off-screen east by default)
  enginePivot = buildEngine();
  enginePivot.position.set(ENGINE_OFFSCREEN_X, 0, RAIL_Z);
  enginePivot.visible = false;
  mounted.add(enginePivot);
  entities.add(mounted);
}

export function updateTrainStation(timeS: number): void {
  if (!enginePivot) return;
  const t = state.train;
  if (!t || !t.unlocked) {
    enginePivot.visible = false;
    return;
  }
  enginePivot.visible = true;
  // Target position: parked when 'returned', else far east (off-screen).
  const targetX = t.status === 'returned'
    ? ENGINE_PARKED_X
    : ENGINE_OFFSCREEN_X;
  // Smooth interpolation
  enginePivot.position.x += (targetX - enginePivot.position.x) * 0.04;
  // Small wheel-driven rocking when moving
  if (Math.abs(targetX - enginePivot.position.x) > 0.1) {
    enginePivot.position.y = Math.abs(Math.sin(timeS * 7)) * 0.02;
  } else {
    enginePivot.position.y = 0;
  }
}
