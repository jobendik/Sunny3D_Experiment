// =============================================================
//  WEATHER PARTICLES
//
//  Two persistent particle systems (rain & snow) live above the
//  whole farm. We toggle them based on state.weather and adjust
//  density per frame. Particle positions wrap as they fall out
//  of the bottom of the column.
//
//  Smoke from production buildings is handled separately because
//  it needs to track per-building positions.
// =============================================================

import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Color,
} from 'three';
import { GRID_W, GRID_H } from '../../constants';
import { getSceneRoot } from '../scene-root';
import { state } from '../../state';

let rain: Points | null = null;
let snow: Points | null = null;
let rainMat: PointsMaterial | null = null;
let snowMat: PointsMaterial | null = null;
const RAIN_COUNT = 1200;
const SNOW_COUNT = 800;

function makePointCloud(n: number, area: number, height: number, color: string, size: number): Points {
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3 + 0] = Math.random() * area;
    positions[i * 3 + 1] = Math.random() * height;
    positions[i * 3 + 2] = Math.random() * area;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const m = new PointsMaterial({
    color: new Color(color),
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  return new Points(geo, m);
}

export function installWeather(): void {
  const { weather } = getSceneRoot();
  rain = makePointCloud(RAIN_COUNT, GRID_W + 6, 14, '#aedbf3', 0.06);
  rainMat = rain.material as PointsMaterial;
  rain.position.set(-3, 0, -3);
  weather.add(rain);

  snow = makePointCloud(SNOW_COUNT, GRID_W + 6, 14, '#fffeff', 0.11);
  snowMat = snow.material as PointsMaterial;
  snow.position.set(-3, 0, -3);
  weather.add(snow);
}

export function updateWeather(dt: number): void {
  if (!rain || !snow || !rainMat || !snowMat) return;
  const w = state.weather;
  const showRain = (w === 'rainy' || w === 'storm') ? 1 : 0;
  const showSnow = (w === 'snowy') ? 1 : 0;

  // Smooth fade
  rainMat.opacity += (showRain * 0.85 - rainMat.opacity) * 0.08;
  snowMat.opacity += (showSnow * 0.85 - snowMat.opacity) * 0.08;
  rainMat.color.setStyle(w === 'storm' ? '#5a8acf' : '#7ac0ef');

  if (rainMat.opacity > 0.01) {
    const pos = rain.geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = pos.array as Float32Array;
    const speed = 22;
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= speed * dt;
      arr[i * 3 + 0] -= 4 * dt;
      if (arr[i * 3 + 1]! < 0) {
        arr[i * 3 + 1] = 14;
        arr[i * 3 + 0] = Math.random() * (GRID_W + 6);
        arr[i * 3 + 2] = Math.random() * (GRID_H + 6);
      }
    }
    pos.needsUpdate = true;
  }
  if (snowMat.opacity > 0.01) {
    const pos = snow.geometry.getAttribute('position') as Float32BufferAttribute;
    const arr = pos.array as Float32Array;
    const speed = 2.5;
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3 + 1] -= speed * dt;
      arr[i * 3 + 0] += Math.sin(i + arr[i * 3 + 1]!) * 0.5 * dt;
      if (arr[i * 3 + 1]! < 0) {
        arr[i * 3 + 1] = 14;
        arr[i * 3 + 0] = Math.random() * (GRID_W + 6);
        arr[i * 3 + 2] = Math.random() * (GRID_H + 6);
      }
    }
    pos.needsUpdate = true;
  }
}
