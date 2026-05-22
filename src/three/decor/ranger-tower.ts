// =============================================================
//  RANGER TOWER — Phase 1.7 diegetic world object.
//
//  Log cabin on stilts at the NW edge of the playable area,
//  overlooking the lake & forest. Replaces the old fishing-dock
//  piggyback for the Expeditions hub bubble.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_X0, HOME_Y0 } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const RANGER_X = HOME_X0 - 1.5;            // 5.5
export const RANGER_Z = HOME_Y0 - 1.5;            // 5.5
export const RANGER_BUBBLE_Y = 3.4;

let mounted: Group | null = null;

function buildTower(): Group {
  const g = new Group();
  g.name = 'ranger-tower';

  // 4 stilt legs forming a 0.9×0.9 footprint
  const stiltColor = '#5a3018';
  const stiltOffsets: Array<[number, number]> = [
    [-0.45, -0.45],
    [ 0.45, -0.45],
    [-0.45,  0.45],
    [ 0.45,  0.45],
  ];
  for (const [x, z] of stiltOffsets) {
    const stilt = new Mesh(cyl(0.06, 0.08, 1.4, 8), mat(stiltColor));
    stilt.position.set(x, 0.7, z);
    stilt.castShadow = true;
    g.add(stilt);
    // Diagonal brace
    const brace = new Mesh(box(0.04, 0.04, 0.6), mat(stiltColor));
    brace.position.set(x, 0.6, 0);
    brace.rotation.x = z > 0 ? 0.6 : -0.6;
    g.add(brace);
  }

  // Cabin floor
  const floor = new Mesh(box(1.1, 0.08, 1.1), mat('#7a4928'));
  floor.position.y = 1.4;
  floor.castShadow = true;
  g.add(floor);

  // Cabin walls (log style — slatted via thin boxes)
  const wallColor = '#a07248';
  for (let i = 0; i < 5; i++) {
    const yLevel = 1.50 + i * 0.16;
    // North wall
    const n = new Mesh(box(1.05, 0.12, 0.05), mat(wallColor));
    n.position.set(0, yLevel, -0.50);
    g.add(n);
    // South wall (with a door gap — leave middle empty for the first 3 levels)
    const s1 = new Mesh(box(0.35, 0.12, 0.05), mat(wallColor));
    s1.position.set(-0.35, yLevel, 0.50);
    g.add(s1);
    const s2 = new Mesh(box(0.35, 0.12, 0.05), mat(wallColor));
    s2.position.set(0.35, yLevel, 0.50);
    g.add(s2);
    // East/West walls
    const e = new Mesh(box(0.05, 0.12, 1.05), mat(wallColor));
    e.position.set(0.50, yLevel, 0);
    g.add(e);
    const w = new Mesh(box(0.05, 0.12, 1.05), mat(wallColor));
    w.position.set(-0.50, yLevel, 0);
    g.add(w);
  }

  // Window panes on E/W walls
  for (const wx of [-0.50, 0.50]) {
    const win = new Mesh(box(0.04, 0.18, 0.24), mat('#a6d8f0', { emissive: '#5fb6de' }));
    win.position.set(wx, 1.86, 0);
    g.add(win);
  }

  // Gable roof
  const roof = new Mesh(cone(0.85, 0.65, 4), mat('#5a2a18'));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.70;
  roof.castShadow = true;
  g.add(roof);

  // Observation flag on the roof
  const flagPole = new Mesh(cyl(0.022, 0.022, 0.5, 6), mat('#3a2010'));
  flagPole.position.y = 3.20;
  g.add(flagPole);
  const flag = new Mesh(box(0.02, 0.16, 0.24), mat('#5fb6de'));
  flag.position.set(0, 3.30, 0.13);
  flag.name = 'ranger-flag';
  g.add(flag);
  // Map icon on the flag
  const flagMark = new Mesh(sphere(0.04, 8, 6), mat('#fff7e1'));
  flagMark.position.set(0, 3.32, 0.20);
  g.add(flagMark);

  // Ladder rungs on the south side
  for (let i = 0; i < 6; i++) {
    const rung = new Mesh(box(0.20, 0.025, 0.025), mat('#3a2010'));
    rung.position.set(0, 0.20 + i * 0.20, 0.58);
    g.add(rung);
  }
  // Ladder rails
  for (const rx of [-0.10, 0.10]) {
    const rail = new Mesh(box(0.025, 1.25, 0.025), mat('#3a2010'));
    rail.position.set(rx, 0.62, 0.59);
    g.add(rail);
  }

  return g;
}

export function installRangerTower(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildTower();
  mounted.position.set(RANGER_X, 0, RANGER_Z);
  // Face south-east into the farm
  mounted.rotation.y = Math.PI * 0.25;
  entities.add(mounted);
}

/** Per-frame: flag flutter. */
export function updateRangerTower(timeS: number): void {
  if (!mounted) return;
  const flag = mounted.getObjectByName('ranger-flag');
  if (flag) flag.rotation.y = Math.sin(timeS * 3.0) * 0.4;
}
