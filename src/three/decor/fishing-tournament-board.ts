// =============================================================
//  FISHING TOURNAMENT BOARD -- Phase 8 featured event world anchor.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_X0, HOME_Y0 } from '../../constants';
import { box, cyl, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const FISHING_BOARD_X = HOME_X0 - 1.5;
export const FISHING_BOARD_Z = HOME_Y0 + 5.3;
export const FISHING_BOARD_BUBBLE_Y = 2.4;

let mounted: Group | null = null;
let bobber: Mesh | null = null;

function buildFishingBoard(): Group {
  const g = new Group();
  g.name = 'fishing-tournament-board';

  const postA = new Mesh(cyl(0.04, 0.05, 1.35, 6), mat('#5a3018'));
  postA.position.set(-0.44, 0.68, 0);
  g.add(postA);
  const postB = new Mesh(cyl(0.04, 0.05, 1.35, 6), mat('#5a3018'));
  postB.position.set(0.44, 0.68, 0);
  g.add(postB);

  const board = new Mesh(box(1.15, 0.78, 0.08), mat('#fff7e1'));
  board.position.y = 1.05;
  board.castShadow = true;
  g.add(board);

  const header = new Mesh(box(1.0, 0.16, 0.09), mat('#4a9fd2'));
  header.position.set(0, 1.34, 0.02);
  g.add(header);

  for (let i = 0; i < 3; i++) {
    const line = new Mesh(box(0.72 - i * 0.08, 0.035, 0.095), mat('#6e8b49'));
    line.position.set(-0.06, 1.16 - i * 0.13, 0.03);
    g.add(line);
  }

  const hook = new Mesh(cone(0.08, 0.18, 8), mat('#8898a8'));
  hook.position.set(0.42, 0.78, 0.05);
  hook.rotation.z = Math.PI;
  g.add(hook);

  const rod = new Mesh(cyl(0.018, 0.018, 1.05, 6), mat('#6e4520'));
  rod.position.set(-0.78, 0.82, 0.08);
  rod.rotation.z = -0.65;
  g.add(rod);

  bobber = new Mesh(cyl(0.08, 0.08, 0.16, 12), mat('#e54a5e'));
  bobber.position.set(-1.02, 0.32, 0.2);
  bobber.rotation.x = Math.PI / 2;
  g.add(bobber);

  return g;
}

export function installFishingTournamentBoard(): void {
  if (mounted) return;
  mounted = buildFishingBoard();
  mounted.position.set(FISHING_BOARD_X, 0, FISHING_BOARD_Z);
  mounted.rotation.y = Math.PI * 0.35;
  mounted.visible = false;
  getSceneRoot().entities.add(mounted);
}

export function updateFishingTournamentBoard(timeS: number): void {
  if (!mounted) return;
  mounted.visible = state.level >= 8;
  if (!mounted.visible || !bobber) return;
  bobber.position.y = 0.32 + Math.sin(timeS * 2.5) * 0.05;
}
