// =============================================================
//  FESTIVAL CART — Phase 1.11 diegetic 3D world object.
//
//  Colourful covered wagon parked centre-south of the home when
//  state.festivalCart.active. Bunting flags wave gently.
// =============================================================

import { Group, Mesh } from 'three';
import { state } from '../../state';
import { nowSeconds } from '../../utils';
import { HOME_CENTER_X, HOME_Y1 } from '../../constants';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';

export const CART_X = HOME_CENTER_X;              // 16
export const CART_Z = HOME_Y1 + 2.2;              // 26.2
export const CART_BUBBLE_Y = 2.6;

let mounted: Group | null = null;
let buntingPivot: Group | null = null;

function buildFestivalCart(): Group {
  const g = new Group();
  g.name = 'festival-cart';

  // Wagon body
  const body = new Mesh(box(1.8, 0.5, 1.0), mat('#c8423a'));
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  // Floor under body (darker rim)
  const rim = new Mesh(box(1.85, 0.08, 1.05), mat('#5a2a18'));
  rim.position.y = 0.27;
  g.add(rim);
  // Colourful side panels
  for (let i = 0; i < 3; i++) {
    const panel = new Mesh(box(0.5, 0.32, 0.04), mat(['#f4d160', '#7fb957', '#5fb6de'][i]!));
    panel.position.set(-0.55 + i * 0.55, 0.55, 0.51);
    g.add(panel);
  }

  // Canopy — gable + striped fabric (approximated with alternating
  // coloured boxes)
  for (let i = 0; i < 4; i++) {
    const stripe = new Mesh(box(0.42, 0.04, 1.0), mat(i % 2 === 0 ? '#e54a5e' : '#fff7e1'));
    stripe.position.set(-0.66 + i * 0.44, 1.0, 0);
    stripe.rotation.z = i < 2 ? -0.45 : 0.45;
    g.add(stripe);
  }
  // Canopy support poles
  for (const [x, z] of [[-0.85, -0.45], [0.85, -0.45], [-0.85, 0.45], [0.85, 0.45]] as const) {
    const post = new Mesh(cyl(0.03, 0.03, 0.55, 6), mat('#5a3018'));
    post.position.set(x, 1.07, z);
    g.add(post);
  }

  // Wheels
  for (const [x, z] of [[-0.7, -0.55], [0.7, -0.55], [-0.7, 0.55], [0.7, 0.55]] as const) {
    const wheel = new Mesh(cyl(0.26, 0.26, 0.08, 14), mat('#3a2010'));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.26, z);
    wheel.castShadow = true;
    g.add(wheel);
    const hub = new Mesh(sphere(0.06, 10, 8), mat('#e0a020'));
    hub.position.set(x, 0.26, z);
    g.add(hub);
  }

  // Bunting flags string between two poles in front
  for (const x of [-1.0, 1.0]) {
    const post = new Mesh(cyl(0.025, 0.025, 1.6, 6), mat('#5a3018'));
    post.position.set(x, 0.8, 0.85);
    g.add(post);
    const cap = new Mesh(cone(0.04, 0.10, 8), mat('#e0a020'));
    cap.position.set(x, 1.65, 0.85);
    g.add(cap);
  }
  buntingPivot = new Group();
  buntingPivot.name = 'festival-bunting';
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const droop = Math.sin(t * Math.PI) * 0.18;
    const flag = new Mesh(box(0.16, 0.18, 0.02), mat(['#e54a5e', '#f4b942', '#7fb957', '#5fb6de', '#9b54c8'][i % 5]!));
    flag.position.set(-0.9 + t * 1.8, 1.55 - droop, 0.85);
    flag.rotation.z = Math.PI;
    buntingPivot.add(flag);
  }
  g.add(buntingPivot);

  return g;
}

export function installFestivalCart(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildFestivalCart();
  mounted.position.set(CART_X, 0, CART_Z);
  mounted.rotation.y = Math.PI;
  mounted.visible = false;
  entities.add(mounted);
}

export function updateFestivalCart(timeS: number): void {
  if (!mounted) return;
  const c = state.festivalCart;
  mounted.visible = !!(c?.unlocked && c.endsAt > nowSeconds());
  if (!mounted.visible || !buntingPivot) return;
  // Gentle bunting wave
  buntingPivot.children.forEach((c, i) => {
    c.rotation.x = Math.sin(timeS * 2.5 + i * 0.7) * 0.18;
  });
}
