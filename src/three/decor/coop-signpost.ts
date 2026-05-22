// =============================================================
//  CO-OP SIGNPOST — Phase 1.8 diegetic 3D world object.
//
//  Wooden post with several arrow-shaped planks fanning out, each
//  carrying a neighbour-village name and accent colour. Replaces
//  the bare world-bubble proxy at HOME_CENTER_X - 5, Z - 3.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_CENTER_X, HOME_CENTER_Y } from '../../constants';
import { box, cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const SIGNPOST_X = HOME_CENTER_X - 4;            // 12
export const SIGNPOST_Z = HOME_CENTER_Y - 3;            // 13
export const SIGNPOST_BUBBLE_Y = 2.4;

let mounted: Group | null = null;

function buildSignpost(): Group {
  const g = new Group();
  g.name = 'coop-signpost';

  // Tall post
  const post = new Mesh(cyl(0.06, 0.08, 1.7, 8), mat('#5a3018'));
  post.position.y = 0.85;
  post.castShadow = true;
  g.add(post);

  // Three arrow planks pointing different directions
  const arrows: Array<{ y: number; rotY: number; color: string }> = [
    { y: 1.45, rotY:  0.4, color: '#7fb957' },
    { y: 1.20, rotY: -0.9, color: '#e54a5e' },
    { y: 0.95, rotY:  2.1, color: '#5fb6de' },
  ];
  for (const a of arrows) {
    const arrow = new Group();
    // Plank
    const plank = new Mesh(box(0.46, 0.10, 0.04), mat('#caa074'));
    plank.position.x = 0.20;
    arrow.add(plank);
    // Pointed end — small triangle wedge approximated with a thinner box
    const tip = new Mesh(box(0.08, 0.14, 0.04), mat('#a87248'));
    tip.position.x = 0.46;
    tip.rotation.z = 0;
    arrow.add(tip);
    // Coloured accent stripe
    const stripe = new Mesh(box(0.40, 0.04, 0.02), mat(a.color));
    stripe.position.set(0.22, 0, 0.025);
    arrow.add(stripe);
    arrow.position.y = a.y;
    arrow.rotation.y = a.rotY;
    g.add(arrow);
  }

  // Finial — a small ball + flag
  const cap = new Mesh(sphere(0.07, 10, 8), mat('#3a2010'));
  cap.position.y = 1.74;
  g.add(cap);
  const flagPole = new Mesh(cyl(0.018, 0.018, 0.34, 6), mat('#3a2010'));
  flagPole.position.y = 1.94;
  g.add(flagPole);
  const flag = new Mesh(box(0.02, 0.14, 0.20), mat('#e54a5e'));
  flag.position.set(0, 2.04, 0.10);
  flag.name = 'signpost-flag';
  g.add(flag);

  return g;
}

export function installCoopSignpost(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildSignpost();
  mounted.position.set(SIGNPOST_X, 0, SIGNPOST_Z);
  entities.add(mounted);
}

/** Per-frame: gentle flag flutter. */
export function updateCoopSignpost(timeS: number): void {
  if (!mounted) return;
  const flag = mounted.getObjectByName('signpost-flag');
  if (flag) flag.rotation.y = Math.sin(timeS * 3.0) * 0.3;
}
