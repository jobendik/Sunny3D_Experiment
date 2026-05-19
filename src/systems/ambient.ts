// =============================================================
//  AMBIENT LIFE — butterflies, fireflies, birds, falling leaves
//  Spawns lightweight creatures that drift across the farm to
//  make the world feel alive and cozy.
// =============================================================

import { state } from '../state';
import { TILE, GRID_W, GRID_H, DAY_SECONDS } from '../constants';
import { rand, nowSeconds } from '../utils';
import { SW, SH } from '../canvas';

export interface AmbientCreature {
  kind: 'butterfly' | 'firefly' | 'bird' | 'leaf';
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  phase: number;      // used for sine-wave flutter
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

const ambients: AmbientCreature[] = [];

const BUTTERFLY_COLORS = ['#ff9ed4', '#ffd070', '#a0d8ff', '#c8a0ff', '#ffb0b0', '#a0ffb0'];
const LEAF_COLORS = ['#e8a030', '#d87020', '#c04818', '#b8a030', '#a08818'];
const BIRD_COLOR = '#4a3828';

function worldInView(): { x0: number; y0: number; x1: number; y1: number } {
  const hw = SW() / state.camScale / 2;
  const hh = SH() / state.camScale / 2;
  return {
    x0: state.camX - hw - 80,
    y0: state.camY - hh - 80,
    x1: state.camX + hw + 80,
    y1: state.camY + hh + 80,
  };
}

function dayFraction(): number {
  return ((nowSeconds() - state.startTime) % DAY_SECONDS) / DAY_SECONDS;
}

function isNight(): boolean {
  const d = dayFraction();
  return d > 0.85 || d < 0.1;
}

function isDusk(): boolean {
  const d = dayFraction();
  return d > 0.7 && d <= 0.85;
}

function spawnButterfly(): void {
  const view = worldInView();
  ambients.push({
    kind: 'butterfly',
    x: view.x0 + rand(view.x1 - view.x0),
    y: view.y0 + rand(view.y1 - view.y0),
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 12,
    age: 0,
    life: 8 + rand(12),
    phase: rand(Math.PI * 2),
    size: 3 + rand(3),
    color: BUTTERFLY_COLORS[Math.floor(Math.random() * BUTTERFLY_COLORS.length)]!,
    alpha: 1,
    rotation: 0,
    rotSpeed: 0,
  });
}

function spawnFirefly(): void {
  const view = worldInView();
  ambients.push({
    kind: 'firefly',
    x: view.x0 + rand(view.x1 - view.x0),
    y: view.y0 + rand(view.y1 - view.y0),
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    age: 0,
    life: 6 + rand(8),
    phase: rand(Math.PI * 2),
    size: 2 + rand(2),
    color: '#ffe880',
    alpha: 1,
    rotation: 0,
    rotSpeed: 0,
  });
}

function spawnBird(): void {
  const view = worldInView();
  const fromLeft = Math.random() > 0.5;
  ambients.push({
    kind: 'bird',
    x: fromLeft ? view.x0 - 40 : view.x1 + 40,
    y: view.y0 + rand((view.y1 - view.y0) * 0.5),
    vx: fromLeft ? 60 + rand(30) : -(60 + rand(30)),
    vy: (Math.random() - 0.5) * 10,
    age: 0,
    life: 6 + rand(4),
    phase: rand(Math.PI * 2),
    size: 4 + rand(3),
    color: BIRD_COLOR,
    alpha: 0.8,
    rotation: 0,
    rotSpeed: 0,
  });
}

function spawnLeaf(): void {
  const view = worldInView();
  ambients.push({
    kind: 'leaf',
    x: view.x0 + rand(view.x1 - view.x0),
    y: view.y0,
    vx: 15 + rand(25),
    vy: 20 + rand(15),
    age: 0,
    life: 5 + rand(5),
    phase: rand(Math.PI * 2),
    size: 3 + rand(3),
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)]!,
    alpha: 0.85,
    rotation: rand(Math.PI * 2),
    rotSpeed: 1 + rand(3),
  });
}

let spawnTimer = 0;

export function updateAmbient(dt: number): void {
  // Update existing creatures
  for (let i = ambients.length - 1; i >= 0; i--) {
    const a = ambients[i]!;
    a.age += dt;
    a.phase += dt * 3;

    if (a.kind === 'butterfly') {
      // Flutter path: sine wave with random drift
      a.x += a.vx * dt + Math.sin(a.phase) * 12 * dt;
      a.y += a.vy * dt + Math.cos(a.phase * 0.7) * 8 * dt;
      // Gentle direction changes
      a.vx += (Math.random() - 0.5) * 20 * dt;
      a.vy += (Math.random() - 0.5) * 15 * dt;
      a.vx *= 0.98;
      a.vy *= 0.98;
    } else if (a.kind === 'firefly') {
      a.x += a.vx * dt + Math.sin(a.phase) * 6 * dt;
      a.y += a.vy * dt + Math.cos(a.phase * 1.3) * 4 * dt;
      a.alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(a.phase * 2));
      a.vx += (Math.random() - 0.5) * 8 * dt;
      a.vy += (Math.random() - 0.5) * 8 * dt;
    } else if (a.kind === 'bird') {
      a.x += a.vx * dt;
      a.y += a.vy * dt + Math.sin(a.phase * 2) * 5 * dt;
    } else if (a.kind === 'leaf') {
      a.x += a.vx * dt + Math.sin(a.phase * 1.5) * 15 * dt;
      a.y += a.vy * dt;
      a.rotation += a.rotSpeed * dt;
      a.alpha = Math.max(0, 0.85 * (1 - a.age / a.life));
    }

    // Fade out near end of life
    if (a.kind !== 'firefly' && a.kind !== 'leaf') {
      if (a.age > a.life * 0.8) {
        a.alpha = Math.max(0, 1 - (a.age - a.life * 0.8) / (a.life * 0.2));
      }
    }

    if (a.age > a.life) {
      ambients.splice(i, 1);
    }
  }

  // Spawn new creatures based on season/time
  spawnTimer += dt;
  if (spawnTimer < 0.8) return;
  spawnTimer = 0;

  const night = isNight();
  const dusk = isDusk();
  const maxAmbients = 25;
  if (ambients.length >= maxAmbients) return;

  // Butterflies: spring/summer daytime
  if (!night && !dusk && (state.season === 'spring' || state.season === 'summer')) {
    if (Math.random() < 0.3 && ambients.filter(a => a.kind === 'butterfly').length < 8) {
      spawnButterfly();
    }
  }

  // Fireflies: dusk and night (spring/summer/autumn)
  if ((night || dusk) && state.season !== 'winter') {
    if (Math.random() < 0.4 && ambients.filter(a => a.kind === 'firefly').length < 12) {
      spawnFirefly();
    }
  }

  // Birds: daytime, any season except heavy rain/storm
  if (!night && state.weather !== 'storm' && state.weather !== 'snowy') {
    if (Math.random() < 0.1 && ambients.filter(a => a.kind === 'bird').length < 3) {
      spawnBird();
    }
  }

  // Falling leaves: autumn
  if (state.season === 'autumn' && !night) {
    if (Math.random() < 0.35 && ambients.filter(a => a.kind === 'leaf').length < 10) {
      spawnLeaf();
    }
  }
}

export function getAmbientCreatures(): readonly AmbientCreature[] {
  return ambients;
}
