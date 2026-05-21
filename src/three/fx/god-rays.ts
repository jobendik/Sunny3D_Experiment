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
  // Tall, very wide & soft cone. The cone shape stays but the edges
  // are dramatically feathered so it reads as a hazy "shaft of light
  // through dust" rather than a stage spotlight. Wider radius +
  // radial fade means individual rays blur into the sky instead of
  // painting visible silhouettes on the ground.
  const geom = new ConeGeometry(3.4, 16, 24, 1, true);
  // Translate so the apex is at origin and the cone opens downward.
  geom.translate(0, -8, 0);
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
      varying vec3 vLocal;
      void main() {
        vY = (position.y + 8.0) / 16.0;    // 0 at apex (top), 1 at base
        vNormal = normal;
        vLocal = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying float vY;
      varying vec3 vNormal;
      varying vec3 vLocal;
      void main() {
        // Vertical fade — barely visible at top, gone at bottom so
        // the shaft never paints the ground.
        float a = pow(1.0 - vY, 3.0) * 0.55;
        // Strong silhouette fade — when the cone face is edge-on to
        // the viewer, drop alpha to nothing. This is the key trick
        // for "looks like haze, not like a cone".
        float edge = pow(max(0.0, vNormal.y), 1.6);
        a *= edge;
        // Subtle volumetric shimmer
        a *= 0.75 + 0.25 * sin(uTime * 2.0 + vY * 8.0);
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
  // 3 rays scattered well outside the playable area so they never
  // land directly on buildings/crops as a "spotlight".
  for (let i = 0; i < 3; i++) {
    const r = makeRay();
    const ang = (i / 3) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 11 + Math.random() * 6;
    r.mesh.position.set(
      cx + Math.cos(ang) * dist,
      8,
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
  // Peak intensity dropped dramatically — these are atmospheric
  // haze hints, not spotlights. Bell curves further narrowed so the
  // effect only shows for a brief window around dawn & dusk.
  const intensity = Math.max(rise, set) * 0.18;
  for (const r of RAYS) {
    r.mat.uniforms.uTime.value = timeS + r.phase;
    r.mat.uniforms.uIntensity.value = intensity;
    // Warmer at sunset, cooler at sunrise.
    (r.mat.uniforms.uColor.value as Color).setHex(set > rise ? 0xffb888 : 0xfff0c0);
  }
}
