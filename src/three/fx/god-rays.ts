// =============================================================
//  GOD RAYS
//
//  Cheap fake volumetric light: a handful of long, additive-blended
//  cones angled to match the sun direction. Each cone is fully
//  transparent except for a thin "pillar" of light along its
//  vertical axis. From the iso camera these read as shafts of
//  sunlight breaking through clouds.
//
//  Visibility ramps up during dawn/dusk and fades out at noon (so
//  we don't overstate the effect) and overnight.
// =============================================================

import {
  Group,
  Mesh,
  ConeGeometry,
  ShaderMaterial,
  Color,
  AdditiveBlending,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import type { LightingSnapshot } from '../lighting';

interface Ray { mesh: Mesh; mat: ShaderMaterial; phase: number }
const RAYS: Ray[] = [];
let group: Group | null = null;

function makeRay(): Ray {
  // Tall narrow cone — the cone shape inherently fakes the
  // "spreading shaft" silhouette of a light ray.
  const geom = new ConeGeometry(2.2, 14, 18, 1, true);
  // Translate so the apex is at origin and the cone opens downward.
  geom.translate(0, -7, 0);
  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color('#ffe8b0') },
      uIntensity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: 2, // DoubleSide
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vNormal;
      void main() {
        vY = (position.y + 7.0) / 14.0;    // 0 at apex, 1 at base
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying float vY;
      varying vec3 vNormal;
      void main() {
        // Fade from bright apex to invisible base.
        float a = pow(1.0 - vY, 2.2);
        // Edge fade — softer at the silhouette so the cone doesn't
        // look like a hard-edged cone.
        float edge = pow(max(0.0, vNormal.y), 0.5);
        a *= 0.55 + 0.45 * edge;
        // Subtle shimmer
        a *= 0.85 + 0.15 * sin(uTime * 3.0 + vY * 12.0);
        gl_FragColor = vec4(uColor, a * uIntensity);
      }
    `,
  });
  const mesh = new Mesh(geom, mat);
  return { mesh, mat, phase: Math.random() * Math.PI * 2 };
}

export function installGodRays(): void {
  if (group) return;
  const { fx } = getSceneRoot();
  group = new Group();
  group.name = 'god-rays';
  fx.add(group);
  const cx = GRID_W / 2, cz = GRID_H / 2;
  // 5 rays scattered around the play area + outer ring.
  for (let i = 0; i < 5; i++) {
    const r = makeRay();
    const ang = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 4 + Math.random() * 8;
    r.mesh.position.set(
      cx + Math.cos(ang) * dist,
      7,
      cz + Math.sin(ang) * dist,
    );
    // Tilt rays toward the sun's general direction — we don't need
    // to track precisely; a fixed forward lean reads as "from above"
    // at the iso angle.
    r.mesh.rotation.set(0.18, ang, 0.12);
    group.add(r.mesh);
    RAYS.push(r);
  }
}

export function updateGodRays(timeS: number, light: LightingSnapshot): void {
  if (!group) return;
  // Strongest at sunrise/sunset; muted at midday and overnight.
  // dayElapsed goes 0 (midnight) → 0.5 (noon) → 1 (midnight).
  // Sunrise ~0.20, sunset ~0.80. Bell curves around those.
  const t = light.dayElapsed;
  const rise = Math.max(0, 1 - Math.abs((t - 0.21) * 12));
  const set = Math.max(0, 1 - Math.abs((t - 0.80) * 12));
  const intensity = Math.max(rise, set) * 0.55;
  for (const r of RAYS) {
    r.mat.uniforms.uTime.value = timeS + r.phase;
    r.mat.uniforms.uIntensity.value = intensity;
    // Warmer at sunset, cooler at sunrise.
    (r.mat.uniforms.uColor.value as Color).setHex(set > rise ? 0xffb888 : 0xfff0c0);
  }
}
