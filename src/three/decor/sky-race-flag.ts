// =============================================================
//  SKY RACE FLAG -- Phase 8 featured event world anchor.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_CENTER_X, HOME_Y1 } from '../../constants';
import { box, cyl, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const SKY_RACE_FLAG_X = HOME_CENTER_X + 2.8;
export const SKY_RACE_FLAG_Z = HOME_Y1 + 1.4;
export const SKY_RACE_FLAG_BUBBLE_Y = 2.9;

let mounted: Group | null = null;
let flagPanel: Group | null = null;

function buildSkyRaceFlag(): Group {
  const g = new Group();
  g.name = 'sky-race-flag';

  const base = new Mesh(cyl(0.28, 0.38, 0.16, 12), mat('#6e4520'));
  base.position.y = 0.08;
  base.castShadow = true;
  g.add(base);

  const pole = new Mesh(cyl(0.035, 0.045, 2.2, 8), mat('#f8f1d8'));
  pole.position.y = 1.12;
  pole.castShadow = true;
  g.add(pole);

  const finial = new Mesh(cone(0.08, 0.18, 8), mat('#f4b942'));
  finial.position.y = 2.28;
  g.add(finial);

  flagPanel = new Group();
  flagPanel.name = 'sky-race-flag-panel';
  const colors = ['#fffdf2', '#20242a'];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 4; x++) {
      const tile = new Mesh(box(0.22, 0.18, 0.025), mat(colors[(x + y) % 2]!));
      tile.position.set(0.16 + x * 0.21, 1.88 - y * 0.17, 0);
      flagPanel.add(tile);
    }
  }
  const redTail = new Mesh(box(0.12, 0.56, 0.03), mat('#e54a5e'));
  redTail.position.set(0.02, 1.70, 0);
  flagPanel.add(redTail);
  g.add(flagPanel);

  const rope = new Mesh(cyl(0.012, 0.012, 1.72, 6), mat('#5a3018'));
  rope.position.set(0.09, 1.24, -0.03);
  g.add(rope);

  return g;
}

export function installSkyRaceFlag(): void {
  if (mounted) return;
  mounted = buildSkyRaceFlag();
  mounted.position.set(SKY_RACE_FLAG_X, 0, SKY_RACE_FLAG_Z);
  mounted.rotation.y = Math.PI * 0.12;
  mounted.visible = false;
  getSceneRoot().entities.add(mounted);
}

export function updateSkyRaceFlag(timeS: number): void {
  if (!mounted) return;
  mounted.visible = state.level >= 8;
  if (!mounted.visible || !flagPanel) return;
  flagPanel.rotation.z = Math.sin(timeS * 3.1) * 0.05;
  flagPanel.rotation.y = Math.sin(timeS * 2.6) * 0.12;
}
