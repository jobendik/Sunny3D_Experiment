// =============================================================
//  SKY — DOME, CLOUDS, STARS
//
//  We don't need a real skybox; the scene's background color
//  (driven by lighting.ts) already paints the sky. This file adds:
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

export function installSky(): void {
  const { sky } = getSceneRoot();

  // Clouds — soft white puff-groups high above the world. Kept small
  // and few so they don't crowd the iso view.
  clouds = new Group();
  clouds.name = 'clouds';
  for (let i = 0; i < 6; i++) {
    const cloud = new Group();
    const baseR = 0.35 + Math.random() * 0.25;
    for (let j = 0; j < 4; j++) {
      const puff = new Mesh(
        sphere(baseR * (0.6 + Math.random() * 0.4), 10, 8),
        mat('#ffffff', { transparent: true, opacity: 0.92 }),
      );
      puff.position.set((j - 2) * baseR * 0.5 + Math.random() * 0.15, Math.random() * 0.12, Math.random() * 0.12);
      cloud.add(puff);
    }
    cloud.position.set(
      -8 + Math.random() * (GRID_W + 16),
      14 + Math.random() * 4,
      -8 + Math.random() * (GRID_H + 16),
    );
    cloud.userData.driftSpeed = 0.04 + Math.random() * 0.06;
    clouds.add(cloud);
  }
  sky.add(clouds);

  // Stars — Points cloud across a hemisphere
  const starPos: number[] = [];
  const starN = 200;
  for (let i = 0; i < starN; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const r = 30;
    starPos.push(
      Math.cos(theta) * Math.cos(phi) * r + GRID_W / 2,
      Math.sin(phi) * r,
      Math.sin(theta) * Math.cos(phi) * r + GRID_H / 2,
    );
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new Float32BufferAttribute(starPos, 3));
  starMat = new PointsMaterial({
    color: new Color('#fff8dc'),
    size: 0.18,
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
  sunSprite.scale.set(3.5, 3.5, 1);
  sky.add(sunSprite);

  const moonTex = makeRadialTexture('rgba(255,250,220,1)', 'rgba(180,180,220,0)');
  const moonM = new SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false });
  moonSprite = new Sprite(moonM);
  moonSprite.scale.set(2.6, 2.6, 1);
  sky.add(moonSprite);
}

export function updateSky(): void {
  if (!clouds || !stars || !starMat || !sunSprite || !moonSprite) return;

  const dayElapsed = ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;

  // Cloud drift
  clouds.children.forEach(c => {
    c.position.x += c.userData.driftSpeed * (1 / 60);
    if (c.position.x > GRID_W + 12) c.position.x = -10;
  });
  // Clouds fade at night
  const dayWeight = 1 - Math.min(1, Math.abs(dayElapsed - 0.5) * 2.5);
  clouds.children.forEach(c => {
    c.traverse(obj => {
      const m = (obj as Mesh).material as { opacity?: number; transparent?: boolean } | undefined;
      if (m && m.transparent && typeof m.opacity === 'number') {
        m.opacity = 0.55 + 0.3 * dayWeight;
      }
    });
  });

  // Stars: visible when sun is below horizon. Use sun arc t.
  // 0.25 = mid-day, 0.75 = sunset. Stars peak 0.0 (midnight).
  const nightWeight = Math.max(0, 1 - dayWeight * 1.8);
  starMat.opacity = nightWeight * 0.9;

  // Sun position: arc from east to west across day phase 0.18..0.82.
  const sunPhase = Math.max(0, Math.min(1, (dayElapsed - 0.18) / 0.64));
  const sunArc = Math.sin(sunPhase * Math.PI);
  sunSprite.position.set(
    GRID_W / 2 - 16 + sunPhase * 32,
    18 + sunArc * 6,
    GRID_H / 2 - 14,
  );
  (sunSprite.material as SpriteMaterial).opacity = sunPhase > 0 && sunPhase < 1 ? sunArc : 0;

  // Moon: arc 0.82 → 1.18 (wrapping to morning)
  let mt = dayElapsed;
  if (mt < 0.5) mt += 1;
  const moonPhase = Math.max(0, Math.min(1, (mt - 0.82) / 0.36));
  const moonArc = Math.sin(moonPhase * Math.PI);
  moonSprite.position.set(
    GRID_W / 2 + 16 - moonPhase * 32,
    16 + moonArc * 5,
    GRID_H / 2 - 14,
  );
  (moonSprite.material as SpriteMaterial).opacity = moonPhase > 0 && moonPhase < 1 ? moonArc * 0.9 : 0;
}
