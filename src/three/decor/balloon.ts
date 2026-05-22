// =============================================================
//  HOT-AIR BALLOON — Phase 1.13 diegetic 3D world object.
//
//  When state.balloon.active is true, a colourful balloon drifts
//  slowly above the farm. Hidden otherwise. World bubble 🎈 anchors
//  to its position.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { HOME_CENTER_X, HOME_CENTER_Y } from '../../constants';
import { box, cyl, sphere, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const BALLOON_X = HOME_CENTER_X;
export const BALLOON_Y = 8;                       // flight altitude
export const BALLOON_Z = HOME_CENTER_Y;
export const BALLOON_BUBBLE_Y = BALLOON_Y + 1.4;

let mounted: Group | null = null;
let driftPivot: Group | null = null;

function buildBalloon(): Group {
  const g = new Group();
  g.name = 'balloon';

  // Envelope — squashed sphere with vertical coloured "panels"
  const envelope = new Mesh(sphere(1.1, 18, 14), mat('#e54a5e'));
  envelope.scale.set(1, 1.2, 1);
  envelope.position.y = 1.7;
  envelope.castShadow = true;
  g.add(envelope);
  // Decorative coloured bands — thin discs stacked vertically
  const bandColors = ['#f4b942', '#7fb957', '#5fb6de', '#f4b942'];
  for (let i = 0; i < bandColors.length; i++) {
    const t = i / (bandColors.length - 1);
    const band = new Mesh(cyl(1.05 * Math.sin(Math.PI * (0.2 + t * 0.6)), 1.05 * Math.sin(Math.PI * (0.2 + t * 0.6)), 0.06, 24), mat(bandColors[i]!));
    band.position.y = 0.9 + t * 1.6;
    g.add(band);
  }

  // Basket
  const basket = new Mesh(box(0.7, 0.42, 0.7), mat('#a87248'));
  basket.position.y = 0.21;
  basket.castShadow = true;
  g.add(basket);
  // Basket weave (top rim)
  const rim = new Mesh(box(0.75, 0.06, 0.75), mat('#5a3018'));
  rim.position.y = 0.43;
  g.add(rim);

  // 4 ropes from basket to envelope
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]] as const) {
    const rope = new Mesh(cyl(0.012, 0.012, 0.7, 6), mat('#3a2010'));
    rope.position.set(x, 0.78, z);
    g.add(rope);
  }

  // Burner flame (sphere with emissive glow)
  const flame = new Mesh(sphere(0.10, 10, 8), mat('#ff7a2a', { emissive: '#ff7a2a', transparent: true, opacity: 0.85 }));
  flame.position.y = 0.65;
  flame.name = 'balloon-flame';
  g.add(flame);

  return g;
}

export function installBalloon(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  driftPivot = new Group();
  driftPivot.name = 'balloon-drift';
  const balloonMesh = buildBalloon();
  driftPivot.add(balloonMesh);
  mounted = new Group();
  mounted.add(driftPivot);
  mounted.position.set(BALLOON_X, BALLOON_Y, BALLOON_Z);
  mounted.visible = false;
  entities.add(mounted);
}

export function updateBalloon(timeS: number): void {
  if (!mounted || !driftPivot) return;
  const active = !!state.balloon?.active;
  mounted.visible = active;
  if (!active) return;
  // Slow circular drift, plus a vertical bob
  driftPivot.position.x = Math.cos(timeS * 0.15) * 2.5;
  driftPivot.position.z = Math.sin(timeS * 0.15) * 2.5;
  driftPivot.position.y = Math.sin(timeS * 0.5) * 0.3;
  // Flame flicker
  const flame = driftPivot.getObjectByName('balloon-flame');
  if (flame) {
    const f = 0.85 + 0.20 * Math.abs(Math.sin(timeS * 8));
    flame.scale.set(f, f * 1.2, f);
  }
}
