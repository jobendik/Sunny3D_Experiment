// Companion dog. state.dog has x/y in PIXEL coords.
import { Group, Mesh } from 'three';
import { state } from '../../state';
import { TILE } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { sphere, cyl, box } from '../procgen/geometries';
import { mat } from '../procgen/materials';

let mounted: Group | null = null;

function makeDogMesh(): Group {
  const g = new Group();
  const body = new Mesh(sphere(0.22, 12, 10), mat('#c89060'));
  body.scale.set(1.3, 0.7, 0.85);
  body.position.y = 0.18;
  body.castShadow = true;
  g.add(body);
  const head = new Mesh(sphere(0.14, 10, 8), mat('#c89060'));
  head.position.set(0.26, 0.24, 0);
  g.add(head);
  // Ears
  const earL = new Mesh(box(0.05, 0.12, 0.04), mat('#8a5e30'));
  earL.position.set(0.22, 0.36, 0.08);
  earL.rotation.x = 0.3;
  const earR = earL.clone();
  earR.position.set(0.22, 0.36, -0.08);
  earR.rotation.x = -0.3;
  g.add(earL, earR);
  // Nose
  const nose = new Mesh(sphere(0.025, 6, 4), mat('#1a1a1a'));
  nose.position.set(0.4, 0.24, 0);
  g.add(nose);
  // Tail
  const tail = new Mesh(cyl(0.02, 0.02, 0.18, 6), mat('#c89060'));
  tail.position.set(-0.26, 0.22, 0);
  tail.rotation.z = 0.6;
  g.add(tail);
  // Legs
  for (const [dx, dz] of [[-0.14, -0.1], [-0.14, 0.1], [0.12, -0.1], [0.12, 0.1]] as const) {
    const leg = new Mesh(cyl(0.025, 0.025, 0.16, 6), mat('#8a5e30'));
    leg.position.set(dx, 0.08, dz);
    g.add(leg);
  }
  return g;
}

export function updateDog(timeS: number): void {
  const { entities } = getSceneRoot();
  if (!state.dog) {
    if (mounted) {
      entities.remove(mounted);
      mounted = null;
    }
    return;
  }
  if (!mounted) {
    mounted = makeDogMesh();
    entities.add(mounted);
  }
  mounted.position.set(state.dog.x / TILE, 0, state.dog.y / TILE);
  // Face heading (very rough — based on target delta)
  const dx = state.dog.tx - state.dog.x;
  const dz = state.dog.ty - state.dog.y;
  if (Math.abs(dx) + Math.abs(dz) > 1) {
    mounted.rotation.y = -Math.atan2(dz, dx);
  }
  // Trot bob + tiny squish so the pup feels happy and alive.
  const moving = Math.hypot(dx, dz) > 2;
  const speed = moving ? 10 : 5;
  const amp = moving ? 0.025 : 0.014;
  mounted.position.y = Math.sin(timeS * speed) * amp;
  mounted.scale.set(1, 1 + Math.sin(timeS * speed * 2) * 0.04, 1);
}
