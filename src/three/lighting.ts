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

// Cozy farm day cycle: brighter, warmer, more saturated midday +
// dramatic golden-hour bookends. Sunrise/sunset are emphasized to
// give the player a satisfying "golden farm" hero shot. Midday is
// still bright but pulled subtly toward a soft warm cream so the
// scene never reads as harsh white.
const LIGHT_FRAMES: LightFrameHex[] = [
  { t: 0.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.18, sun: 0, moon: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
  { t: 0.08, skyTop: '#1a2548', skyBottom: '#3a4868', shadow: 0.20, sun: 0, moon: 0.9, windows: 0.88, nightTint: 0.42, warmTint: 0 },
  { t: 0.12, skyTop: '#5a4870', skyBottom: '#b08280', shadow: 0.24, sun: 0.12, moon: 0.35, windows: 0.55, nightTint: 0.25, warmTint: 0.14 },
  { t: 0.18, skyTop: '#f0c8a0', skyBottom: '#ffd2a0', shadow: 0.32, sun: 0.55, moon: 0, windows: 0.18, nightTint: 0.06, warmTint: 0.32 },
  { t: 0.25, skyTop: '#bce0f4', skyBottom: '#fce8c8', shadow: 0.40, sun: 1.10, moon: 0, windows: 0, nightTint: 0, warmTint: 0.16 },
  { t: 0.50, skyTop: '#a8d6f0', skyBottom: '#e4f0d4', shadow: 0.44, sun: 1.15, moon: 0, windows: 0, nightTint: 0, warmTint: 0.06 },
  { t: 0.65, skyTop: '#b6dceb', skyBottom: '#f4e6c4', shadow: 0.42, sun: 1.05, moon: 0, windows: 0, nightTint: 0, warmTint: 0.14 },
  { t: 0.75, skyTop: '#ffcc98', skyBottom: '#ffd890', shadow: 0.34, sun: 0.78, moon: 0, windows: 0.05, nightTint: 0.04, warmTint: 0.28 },
  { t: 0.82, skyTop: '#e88060', skyBottom: '#f0c890', shadow: 0.28, sun: 0.32, moon: 0, windows: 0.30, nightTint: 0.12, warmTint: 0.34 },
  { t: 0.88, skyTop: '#6a4878', skyBottom: '#c87060', shadow: 0.23, sun: 0, moon: 0.25, windows: 0.68, nightTint: 0.3, warmTint: 0.18 },
  { t: 0.94, skyTop: '#1f2a4a', skyBottom: '#3e4a68', shadow: 0.19, sun: 0, moon: 0.7, windows: 0.88, nightTint: 0.42, warmTint: 0.04 },
  { t: 1.00, skyTop: '#0e1a36', skyBottom: '#22324f', shadow: 0.18, sun: 0, moon: 1.0, windows: 0.95, nightTint: 0.5, warmTint: 0 },
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

  // Warm ambient with a touch of honey — never pure white. Combined
  // with the hemisphere it gives the scene a soft "Hay-Day Sunday
  // afternoon" base tone before the sun even kicks in.
  amb = new AmbientLight(0xffeac8, 0.50);
  // Hemisphere: warm cream sky → sage-green ground bounce. The
  // green-tinted ground term gives every shadowed face a subtle
  // grass-bounced lift that reads as the meadow lighting itself.
  hemi = new HemisphereLight(0xfff2d4, 0x4f8a5a, 0.92);
  hemi.position.set(0, 50, 0);

  // Sun: brighter, warmer (tilted a hair toward honey rather than
  // neutral cream) so highlights pop golden on rooftops & crops.
  sun = new DirectionalLight(0xffe6b3, 1.7);
  sun.castShadow = true;
  // 2048² gives crisp shadow edges on the stylized geometry.
  // Combined with VSM shadow type in the renderer this looks like
  // baked AO around buildings & trees.
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  // Shadow frustum scaled to roughly the home zone (≈18 tiles across).
  // The frustum tracks the camera target in updateLighting() so a 24-
  // unit window always covers what the player is looking at, even on
  // the bigger 32-unit world.
  sc.left = -22;
  sc.right = 22;
  sc.top = 22;
  sc.bottom = -22;
  sc.near = 1;
  sc.far = 110;
  sun.shadow.bias = -0.00028;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 4.5;       // softer VSM penumbra → "baked" feel

  moon = new DirectionalLight(0xa8c0ff, 0);
  moon.castShadow = false;
  // Initial target; updateLighting() re-aims this each frame to
  // follow the camera so the shadow frustum stays where the player
  // is looking.
  sun.target.position.set(GRID_W / 2, 0, GRID_H / 2);
  moon.target.position.set(GRID_W / 2, 0, GRID_H / 2);

  // Fill light: cool blue-tinted bounce from the opposite side so
  // shadowed faces read as "lit by sky" rather than pitch-black. A
  // little stronger than before so the shaded sides of buildings &
  // trees don't go muddy under the punchier sun.
  fill = new DirectionalLight(0xc8defc, 0.48);
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
  // shadow camera's window always covers what the player is actually
  // looking at, so shadow texels stay crisp at any zoom level instead
  // of being wasted on off-screen land. Clamp slightly inside the
  // world bounds so the frustum still catches scenery beyond HOME.
  const tx = state.camX / TILE;
  const tz = state.camY / TILE;
  const cx = MathUtils.clamp(tx, 4, GRID_W - 4);
  const cz = MathUtils.clamp(tz, 4, GRID_H - 4);
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
  sun.intensity = s.sun * 1.65 * wMul;
  moon.intensity = s.moon * 0.42;
  // Drift the sun's color toward warm honey at golden hour. Reads
  // as proper "magic hour" light across the whole farm without
  // touching individual materials.
  const warmth = s.warmTint;
  sun.color.setRGB(
    1.0,
    0.90 - warmth * 0.18,
    0.70 - warmth * 0.30,
  );
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
  hemi.intensity = MathUtils.lerp(1.10, 0.26, Math.min(1, s.nightTint * 2));
  amb.intensity = MathUtils.lerp(0.68, 0.22, Math.min(1, s.nightTint * 2));

  // Update the scene's background + fog to match the sky bottom
  // (horizon color), not the top — that's what distant terrain
  // would blend into in real atmospheric perspective.
  const { scene } = getSceneRoot();
  const skyHex = rgbToHex(skyTop);
  const fogHex = rgbToHex(skyBottom);
  (scene.background as Color).setHex(skyHex);
  if (scene.fog) (scene.fog as { color: Color }).color.setHex(fogHex);

  return {
    windows: s.windows,
    nightTint: s.nightTint,
    shadow: s.shadow * weatherShadowMul(state.weather),
    dayElapsed,
    skyColor: skyHex,
    sunFactor: sun.intensity,
  };
}
