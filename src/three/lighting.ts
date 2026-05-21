// =============================================================
//  LIGHTING
//
//  Smooth day/night profile driven by the same dayElapsed [0..1]
//  value the 2D renderer used. Three lights in concert:
//    - DirectionalLight (sun): casts shadows during the day
//    - DirectionalLight (moon): cool secondary light during night
//    - HemisphereLight (sky/ground): cheap ambient that follows the
//      sky color so shadows never feel pure-black
//    - Scene fog: tints distant decor and matches the sky color
//  Weather can overlay a tint on top (rainy / snowy / cloudy).
// =============================================================

import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  Color,
  MathUtils,
  Vector3,
} from 'three';
import { state } from '../state';
import { DAY_SECONDS, GRID_W, GRID_H, TILE } from '../constants';
import { nowSeconds } from '../utils';
import { getSceneRoot } from './scene-root';

type RGB = [number, number, number];

interface LightFrameHex {
  t: number;
  skyTop: string;
  skyBottom: string;
  shadow: number;
  sun: number;
  moon: number;
  windows: number;
  nightTint: number;
  warmTint: number;
}

// Ported verbatim from the original 2D renderer so the cycle has
// the same vibe in both pipelines.
const LIGHT_FRAMES: LightFrameHex[] = [
  { t: 0.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.16, sun: 0, moon: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
  { t: 0.08, skyTop: '#1a2548', skyBottom: '#3a4868', shadow: 0.18, sun: 0, moon: 0.9, windows: 0.85, nightTint: 0.42, warmTint: 0 },
  { t: 0.12, skyTop: '#5a4870', skyBottom: '#b08280', shadow: 0.22, sun: 0.1, moon: 0.35, windows: 0.55, nightTint: 0.25, warmTint: 0.1 },
  { t: 0.18, skyTop: '#f0c8a0', skyBottom: '#ffe0c0', shadow: 0.30, sun: 0.4, moon: 0, windows: 0.18, nightTint: 0.08, warmTint: 0.18 },
  { t: 0.25, skyTop: '#cfe8ff', skyBottom: '#e0f4d8', shadow: 0.36, sun: 1.0, moon: 0, windows: 0, nightTint: 0, warmTint: 0.04 },
  { t: 0.50, skyTop: '#bce8ff', skyBottom: '#d8f0c0', shadow: 0.40, sun: 1.0, moon: 0, windows: 0, nightTint: 0, warmTint: 0 },
  { t: 0.65, skyTop: '#c2e0f4', skyBottom: '#f0e6c0', shadow: 0.38, sun: 0.95, moon: 0, windows: 0, nightTint: 0, warmTint: 0.06 },
  { t: 0.75, skyTop: '#ffcc98', skyBottom: '#ffd890', shadow: 0.32, sun: 0.65, moon: 0, windows: 0.05, nightTint: 0.04, warmTint: 0.18 },
  { t: 0.82, skyTop: '#e88060', skyBottom: '#f0c890', shadow: 0.26, sun: 0.25, moon: 0, windows: 0.30, nightTint: 0.12, warmTint: 0.22 },
  { t: 0.88, skyTop: '#6a4878', skyBottom: '#c87060', shadow: 0.21, sun: 0, moon: 0.25, windows: 0.65, nightTint: 0.3, warmTint: 0.12 },
  { t: 0.94, skyTop: '#1f2a4a', skyBottom: '#3e4a68', shadow: 0.17, sun: 0, moon: 0.7, windows: 0.85, nightTint: 0.42, warmTint: 0.02 },
  { t: 1.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.16, sun: 0, moon: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
];

function hexToRgb(hex: string): RGB {
  const v = hex.startsWith('#') ? hex.slice(1) : hex;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function lerpN(a: number, b: number, t: number): number { return a + (b - a) * t; }
function rgbToHex(c: RGB): number { return (c[0] << 16) | (c[1] << 8) | c[2]; }

interface Sample {
  skyTop: RGB;
  skyBottom: RGB;
  shadow: number;
  sun: number;
  moon: number;
  windows: number;
  nightTint: number;
  warmTint: number;
}

function sample(dayElapsed: number): Sample {
  let lo = LIGHT_FRAMES[0]!, hi = LIGHT_FRAMES[LIGHT_FRAMES.length - 1]!;
  for (let i = 0; i < LIGHT_FRAMES.length - 1; i++) {
    if (dayElapsed >= LIGHT_FRAMES[i]!.t && dayElapsed <= LIGHT_FRAMES[i + 1]!.t) {
      lo = LIGHT_FRAMES[i]!;
      hi = LIGHT_FRAMES[i + 1]!;
      break;
    }
  }
  const span = hi.t - lo.t;
  const t = span > 0 ? (dayElapsed - lo.t) / span : 0;
  const e = t * t * (3 - 2 * t);
  return {
    skyTop: lerpRGB(hexToRgb(lo.skyTop), hexToRgb(hi.skyTop), e),
    skyBottom: lerpRGB(hexToRgb(lo.skyBottom), hexToRgb(hi.skyBottom), e),
    shadow: lerpN(lo.shadow, hi.shadow, e),
    sun: lerpN(lo.sun, hi.sun, e),
    moon: lerpN(lo.moon, hi.moon, e),
    windows: lerpN(lo.windows, hi.windows, e),
    nightTint: lerpN(lo.nightTint, hi.nightTint, e),
    warmTint: lerpN(lo.warmTint, hi.warmTint, e),
  };
}

function weatherShadowMul(w: string): number {
  if (w === 'storm') return 0.6;
  if (w === 'rainy') return 0.7;
  if (w === 'snowy') return 0.8;
  if (w === 'cloudy') return 0.85;
  return 1;
}
function weatherSky(w: string): { top: RGB; bottom: RGB; blend: number } | null {
  if (w === 'storm') return { top: hexToRgb('#5a6878'), bottom: hexToRgb('#7a8088'), blend: 0.85 };
  if (w === 'rainy') return { top: hexToRgb('#90a8b8'), bottom: hexToRgb('#a8b8c0'), blend: 0.75 };
  if (w === 'snowy') return { top: hexToRgb('#d8e0e8'), bottom: hexToRgb('#e8eef0'), blend: 0.55 };
  if (w === 'cloudy') return { top: hexToRgb('#b8d0e0'), bottom: hexToRgb('#d0d8d0'), blend: 0.45 };
  return null;
}

let sun: DirectionalLight | null = null;
let moon: DirectionalLight | null = null;
let hemi: HemisphereLight | null = null;
let amb: AmbientLight | null = null;
let fill: DirectionalLight | null = null;

export interface LightingSnapshot {
  windows: number;       // 0..1, window glow intensity at night
  nightTint: number;     // 0..1, deep-night strength
  shadow: number;        // 0..0.4 shadow alpha used by ground decals
  dayElapsed: number;    // 0..1 within the day cycle
  skyColor: number;      // hex (top) used by fog
  sunFactor: number;     // 0..1 daylight strength
}

export function initLighting(): LightingSnapshot {
  const { scene } = getSceneRoot();

  amb = new AmbientLight(0xffffff, 0.55);
  hemi = new HemisphereLight(0xfff6e0, 0x4a7c5a, 0.85);
  hemi.position.set(0, 50, 0);

  sun = new DirectionalLight(0xfff0cc, 1.2);
  sun.castShadow = true;
  // 1024² is plenty: the iso framing only ever has ~12-14 tiles
  // worth of land on screen, and we re-aim the shadow frustum
  // around the camera target each frame (see updateLighting).
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -14;
  sc.right = 14;
  sc.top = 14;
  sc.bottom = -14;
  sc.near = 1;
  sc.far = 80;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;

  moon = new DirectionalLight(0xa8c0ff, 0);
  moon.castShadow = false;
  // Initial target; updateLighting() re-aims this each frame to
  // follow the camera so the shadow frustum stays where the player
  // is looking.
  sun.target.position.set(GRID_W / 2, 0, GRID_H / 2);
  moon.target.position.set(GRID_W / 2, 0, GRID_H / 2);

  // Small fill light from the opposite side so shadowed faces
  // aren't pitch-black against the bright sun.
  fill = new DirectionalLight(0xfff0e0, 0.25);
  fill.position.set(GRID_W / 2 + 8, 6, GRID_H / 2 - 8);
  fill.target.position.set(GRID_W / 2, 0, GRID_H / 2);

  scene.add(amb, hemi, sun, sun.target, moon, moon.target, fill, fill.target);

  // Initial state so the very first frame isn't black
  return updateLighting();
}

const _sunDir = new Vector3();
const _moonDir = new Vector3();

export function updateLighting(): LightingSnapshot {
  if (!sun || !moon || !hemi || !amb) return { windows: 0, nightTint: 0, shadow: 0, dayElapsed: 0, skyColor: 0x9ed3f5, sunFactor: 1 };
  const dayElapsed = ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;
  const s = sample(dayElapsed);

  // Sun arcs from east horizon → zenith → west horizon across day half.
  // Map dayElapsed 0.18..0.82 → arc angle 0..π.
  const dayPhase = MathUtils.clamp((dayElapsed - 0.18) / 0.64, 0, 1);
  const sunAngle = dayPhase * Math.PI;
  _sunDir.set(Math.cos(sunAngle) * 30, Math.sin(sunAngle) * 35 + 10, -Math.sin(sunAngle) * 8);
  // Re-aim sun + shadow frustum to track the camera target. The
  // shadow camera's 28×28 unit window then always covers what the
  // player is actually looking at, so shadow texels stay crisp at
  // any zoom level instead of being wasted on off-screen land.
  const tx = state.camX / TILE;
  const tz = state.camY / TILE;
  const cx = MathUtils.clamp(tx, 0, GRID_W);
  const cz = MathUtils.clamp(tz, 0, GRID_H);
  sun.position.set(cx + _sunDir.x, _sunDir.y, cz + _sunDir.z);
  sun.target.position.set(cx, 0, cz);
  moon.target.position.set(cx, 0, cz);

  // Moon arcs across the night half.
  let mt = dayElapsed;
  if (mt < 0.5) mt += 1;
  const moonPhase = MathUtils.clamp((mt - 0.82) / 0.36, 0, 1);
  const moonAngle = moonPhase * Math.PI;
  _moonDir.set(-Math.cos(moonAngle) * 30, Math.sin(moonAngle) * 30 + 8, Math.sin(moonAngle) * 8);
  moon.position.set(cx + _moonDir.x, _moonDir.y, cz + _moonDir.z);

  // Intensities. Apply weather attenuation to sun (clouds/storm).
  const wMul =
    state.weather === 'storm' || state.weather === 'rainy' ? 0.4 :
    state.weather === 'snowy' ? 0.7 :
    state.weather === 'cloudy' ? 0.75 : 1;
  sun.intensity = s.sun * 1.3 * wMul;
  moon.intensity = s.moon * 0.35;
  // No point paying for a shadow pass once the sun is below the
  // horizon — the moonlight is too weak to cast meaningful shadows
  // in this style, and skipping it cuts a draw pass through every
  // castShadow mesh in the scene.
  sun.castShadow = sun.intensity > 0.05;

  // Hemisphere reads from the sky's top color so bounce light tracks
  // sunrise/sunset hue.
  const ws = weatherSky(state.weather);
  const skyTop = ws ? lerpRGB(s.skyTop, ws.top, ws.blend) : s.skyTop;
  const skyBottom = ws ? lerpRGB(s.skyBottom, ws.bottom, ws.blend) : s.skyBottom;
  hemi.color.setHex(rgbToHex(skyTop));
  hemi.groundColor.setHex(rgbToHex([
    Math.max(40, Math.round(skyBottom[0] * 0.35)),
    Math.max(50, Math.round(skyBottom[1] * 0.4)),
    Math.max(40, Math.round(skyBottom[2] * 0.3)),
  ]));
  // Brighter during the day, dimmer at night. nightTint = 0 → daytime.
  hemi.intensity = MathUtils.lerp(0.95, 0.22, Math.min(1, s.nightTint * 2));
  amb.intensity = MathUtils.lerp(0.6, 0.18, Math.min(1, s.nightTint * 2));

  // Update the scene's background + fog to match the sky.
  const { scene } = getSceneRoot();
  const skyHex = rgbToHex(skyTop);
  (scene.background as Color).setHex(skyHex);
  if (scene.fog) (scene.fog as { color: Color }).color.setHex(skyHex);

  return {
    windows: s.windows,
    nightTint: s.nightTint,
    shadow: s.shadow * weatherShadowMul(state.weather),
    dayElapsed,
    skyColor: skyHex,
    sunFactor: sun.intensity,
  };
}
