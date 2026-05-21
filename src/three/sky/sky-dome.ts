// =============================================================
//  SKY — DOME, CLOUDS, STARS
//
//  We render the sky as a giant inverted sphere with a gradient
//  shader (top color → bottom color). The lighting system updates
//  the gradient colors every frame so dawn → midday → dusk → night
//  all bleed through. This replaces the boring solid background.
//
//  Above the sky dome we also add:
//   - Drifting cloud puffs (visible during the day)
//   - A starfield Point-cloud (visible at night)
//   - Sun & moon billboards that follow the day-cycle
// =============================================================

import {
  Group,
  Mesh,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  ShaderMaterial,
  SphereGeometry,
  BackSide,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';
import { state } from '../../state';
import { DAY_SECONDS } from '../../constants';
import { nowSeconds } from '../../utils';

let clouds: Group | null = null;
let stars: Points | null = null;
let starMat: PointsMaterial | null = null;
let sunSprite: Sprite | null = null;
let moonSprite: Sprite | null = null;
let skyDome: Mesh | null = null;
let skyUniforms: {
  uTop: { value: Color };
  uBottom: { value: Color };
  uHorizon: { value: Color };
  uSunPos: { value: { x: number; y: number; z: number } };
} | null = null;

function makeRadialTexture(inner: string, outer: string, size = 128): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx2d = c.getContext('2d')!;
  const g = ctx2d.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx2d.fillStyle = g;
  ctx2d.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

function makeSkyDome(): Mesh {
  // Big inverted sphere — far enough that even fully-zoomed-out the
  // camera can't see the edge. backSide so we see the inside.
  const geom = new SphereGeometry(180, 36, 18);
  skyUniforms = {
    uTop: { value: new Color('#3e76b5') },
    uBottom: { value: new Color('#bce0ff') },
    uHorizon: { value: new Color('#f5e5c8') },
    uSunPos: { value: { x: 0, y: 1, z: 0 } },
  };
  const m = new ShaderMaterial({
    uniforms: skyUniforms,
    depthWrite: false,
    side: BackSide,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uHorizon;
      uniform vec3 uSunPos;
      varying vec3 vWorldDir;
      void main() {
        // Vertical gradient: -1 at the bottom of the dome, +1 at top.
        float h = clamp((vWorldDir.y + 0.15) / 1.0, 0.0, 1.0);
        // Sharpen the horizon band so the sunset glow concentrates
        // there rather than smearing all over the sky.
        float horizonBand = smoothstep(0.0, 0.35, h) * (1.0 - smoothstep(0.25, 0.55, h));
        vec3 col = mix(uBottom, uTop, smoothstep(0.05, 0.95, h));
        col = mix(col, uHorizon, horizonBand * 0.6);
        // Sun bloom in the sky — if the camera looks toward the sun,
        // brighten the patch. We approximate sun pos via a unit dir.
        vec3 sunDir = normalize(uSunPos);
        float sunDot = max(0.0, dot(vWorldDir, sunDir));
        col += pow(sunDot, 32.0) * vec3(1.0, 0.85, 0.55) * 0.8;
        col += pow(sunDot, 4.0) * vec3(1.0, 0.6, 0.3) * 0.08;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new Mesh(geom, m);
  mesh.renderOrder = -10;       // always behind everything else
  mesh.frustumCulled = false;
  return mesh;
}

export function installSky(): void {
  const { sky, scene } = getSceneRoot();

  skyDome = makeSkyDome();
  // The dome lives on the scene directly so it doesn't get translated
  // by the sky group's children manipulating positions.
  scene.add(skyDome);
  // We no longer need the solid scene.background — the dome paints
  // it. Keep an opaque fallback in case anything strips the dome.
  // Leaving scene.background as-is is fine (it's only rendered when
  // nothing else covers that pixel; the dome always does).

  // Clouds — soft white puff-groups high above the world. Kept small
  // and few so they don't crowd the iso view.
  clouds = new Group();
  clouds.name = 'clouds';
  for (let i = 0; i < 10; i++) {
    const cloud = new Group();
    const baseR = 0.55 + Math.random() * 0.45;
    for (let j = 0; j < 5; j++) {
      const puff = new Mesh(
        sphere(baseR * (0.55 + Math.random() * 0.55), 12, 8),
        mat('#ffffff', { transparent: true, opacity: 0.85 }),
      );
      puff.position.set((j - 2) * baseR * 0.45 + Math.random() * 0.2, Math.random() * 0.18, Math.random() * 0.18);
      cloud.add(puff);
    }
    cloud.position.set(
      -12 + Math.random() * (GRID_W + 24),
      14 + Math.random() * 5,
      -12 + Math.random() * (GRID_H + 24),
    );
    cloud.scale.setScalar(0.9 + Math.random() * 0.7);
    cloud.userData.driftSpeed = 0.06 + Math.random() * 0.08;
    clouds.add(cloud);
  }
  sky.add(clouds);

  // Stars — Points cloud across a hemisphere
  const starPos: number[] = [];
  const starSize: number[] = [];
  const starN = 320;
  for (let i = 0; i < starN; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const r = 80;
    starPos.push(
      Math.cos(theta) * Math.cos(phi) * r + GRID_W / 2,
      Math.sin(phi) * r,
      Math.sin(theta) * Math.cos(phi) * r + GRID_H / 2,
    );
    starSize.push(0.08 + Math.random() * 0.25);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  starGeo.setAttribute('size', new Float32BufferAttribute(starSize, 1));
  starMat = new PointsMaterial({
    color: new Color('#fff8dc'),
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  stars = new Points(starGeo, starMat);
  sky.add(stars);

  // Sun + Moon as billboards (sprites)
  const sunTex = makeRadialTexture('rgba(255,245,200,1)', 'rgba(255,200,120,0)');
  const sunM = new SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false });
  sunSprite = new Sprite(sunM);
  sunSprite.scale.set(5.5, 5.5, 1);
  sky.add(sunSprite);

  const moonTex = makeRadialTexture('rgba(255,250,220,1)', 'rgba(180,180,220,0)');
  const moonM = new SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false });
  moonSprite = new Sprite(moonM);
  moonSprite.scale.set(3.4, 3.4, 1);
  sky.add(moonSprite);
}

// Sky color tables: explicit top/bottom/horizon picks for the
// day-cycle key frames. Sampled & interpolated each frame.
interface SkyFrame { t: number; top: string; bottom: string; horizon: string }
const SKY_FRAMES: SkyFrame[] = [
  { t: 0.00, top: '#0a1228', bottom: '#1a2548', horizon: '#142040' },
  { t: 0.12, top: '#2a2050', bottom: '#5a3878', horizon: '#a05870' },
  { t: 0.18, top: '#6a5078', bottom: '#f0c096', horizon: '#ff9a64' },
  { t: 0.25, top: '#5fa2dc', bottom: '#bce0ff', horizon: '#fce0b8' },
  { t: 0.50, top: '#3e76b5', bottom: '#bce0ff', horizon: '#f0f0e8' },
  { t: 0.70, top: '#4a86c2', bottom: '#d8e8f0', horizon: '#f4d8a0' },
  { t: 0.78, top: '#aa6a7a', bottom: '#ffce82', horizon: '#ff8a52' },
  { t: 0.86, top: '#3a2848', bottom: '#7a3856', horizon: '#c0506a' },
  { t: 0.94, top: '#162038', bottom: '#2a3250', horizon: '#1a2240' },
  { t: 1.00, top: '#0a1228', bottom: '#1a2548', horizon: '#142040' },
];

function sampleSky(t: number): { top: Color; bottom: Color; horizon: Color } {
  let lo = SKY_FRAMES[0]!, hi = SKY_FRAMES[SKY_FRAMES.length - 1]!;
  for (let i = 0; i < SKY_FRAMES.length - 1; i++) {
    if (t >= SKY_FRAMES[i]!.t && t <= SKY_FRAMES[i + 1]!.t) {
      lo = SKY_FRAMES[i]!;
      hi = SKY_FRAMES[i + 1]!;
      break;
    }
  }
  const span = hi.t - lo.t;
  const e = span > 0 ? (t - lo.t) / span : 0;
  const s = e * e * (3 - 2 * e);
  const loTop = new Color(lo.top), hiTop = new Color(hi.top);
  const loBot = new Color(lo.bottom), hiBot = new Color(hi.bottom);
  const loHor = new Color(lo.horizon), hiHor = new Color(hi.horizon);
  return {
    top: loTop.lerp(hiTop, s),
    bottom: loBot.lerp(hiBot, s),
    horizon: loHor.lerp(hiHor, s),
  };
}

export function updateSky(): void {
  if (!clouds || !stars || !starMat || !sunSprite || !moonSprite || !skyUniforms) return;

  const dayElapsed = ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;

  // Cloud drift
  clouds.children.forEach(c => {
    c.position.x += c.userData.driftSpeed * (1 / 60);
    if (c.position.x > GRID_W + 16) c.position.x = -14;
  });
  // Clouds fade at night
  const dayWeight = 1 - Math.min(1, Math.abs(dayElapsed - 0.5) * 2.5);
  clouds.children.forEach(c => {
    c.traverse(obj => {
      const m = (obj as Mesh).material as { opacity?: number; transparent?: boolean } | undefined;
      if (m && m.transparent && typeof m.opacity === 'number') {
        m.opacity = 0.5 + 0.32 * dayWeight;
      }
    });
  });

  // Stars: visible when sun is below horizon.
  const nightWeight = Math.max(0, 1 - dayWeight * 1.8);
  starMat.opacity = nightWeight * 0.95;

  // Sun position: arc from east to west across day phase 0.18..0.82.
  const sunPhase = Math.max(0, Math.min(1, (dayElapsed - 0.18) / 0.64));
  const sunArc = Math.sin(sunPhase * Math.PI);
  const sunX = GRID_W / 2 - 22 + sunPhase * 44;
  const sunY = 16 + sunArc * 12;
  const sunZ = GRID_H / 2 - 20;
  sunSprite.position.set(sunX, sunY, sunZ);
  (sunSprite.material as SpriteMaterial).opacity = sunPhase > 0 && sunPhase < 1 ? sunArc : 0;

  // Moon: arc 0.82 → 1.18 (wrapping to morning)
  let mt = dayElapsed;
  if (mt < 0.5) mt += 1;
  const moonPhase = Math.max(0, Math.min(1, (mt - 0.82) / 0.36));
  const moonArc = Math.sin(moonPhase * Math.PI);
  moonSprite.position.set(
    GRID_W / 2 + 22 - moonPhase * 44,
    14 + moonArc * 7,
    GRID_H / 2 - 20,
  );
  (moonSprite.material as SpriteMaterial).opacity = moonPhase > 0 && moonPhase < 1 ? moonArc * 0.9 : 0;

  // Update sky dome gradient + sun direction.
  const s = sampleSky(dayElapsed);
  skyUniforms.uTop.value = s.top;
  skyUniforms.uBottom.value = s.bottom;
  skyUniforms.uHorizon.value = s.horizon;
  // Sun position passed to the dome as a unit vector. Subtract camera
  // target (sky center) to get a clean direction.
  const cx = GRID_W / 2, cz = GRID_H / 2;
  const sx = sunX - cx;
  const sy = Math.max(0.1, sunY - 0);
  const sz = sunZ - cz;
  const slen = Math.hypot(sx, sy, sz) || 1;
  skyUniforms.uSunPos.value = { x: sx / slen, y: sy / slen, z: sz / slen };
}
