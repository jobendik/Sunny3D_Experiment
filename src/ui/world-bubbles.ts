// =============================================================
//  WORLD BUBBLES — FarmVille-3-style screen-space talk bubbles
//  pinned to 3D entities each frame via camera.project().
//
//  Architecture (per the FV3 research doc):
//   • Lives on its own Screen-Space-Overlay DOM layer
//     (`#bubble-layer`) so HUD canvas rebuilds don't blow up.
//   • Object-pooled — POOL_SIZE pre-allocated <div>s, taken
//     from / returned to the pool. No GC pressure.
//   • Each visible target maps to one pool entry by key. Frame-
//     by-frame we re-anchor the entry to its updated 3D point.
//   • Raycast disabled by default (pointer-events:none) so the
//     player can drag through them; opt-in for tappable bubbles
//     (e.g. "feed me" → opens pen).
//   • Math: tmpVec.set(wx,wy,wz).project(camera) yields NDC
//     coordinates. NDC.z>1 means behind camera → hide.
// =============================================================

import { Vector3 } from 'three';
import { state } from '../state';
import { TILE } from '../constants';
import { BUILDINGS } from '../data/buildings';
import { getCamera } from '../three/camera-rig';
import { cropStage } from '../systems/crops';
import { siloUsage, barnUsage } from '../systems/storage';
import { nowSeconds } from '../utils';
import { ANIMALS } from '../data/animals';
import { feedPen } from '../systems/pens';
import { openProductionPanel } from './production-panel';
import { openPenPanel } from './pen-panel';

const POOL_SIZE = 28;
const tmpVec = new Vector3();

export type BubbleKind = 'feed' | 'ready' | 'full' | 'emote' | 'love';

export interface BubbleTarget {
  key: string;
  wx: number;
  wy: number;        // world height above ground
  wz: number;
  icon: string;       // emoji or single char
  kind: BubbleKind;
  tap?: () => void;
  pulse?: boolean;
}

interface Entry { el: HTMLElement; }

let layer: HTMLElement | null = null;
const pool: HTMLElement[] = [];
const active = new Map<string, Entry>();

function ensureLayer(): HTMLElement {
  if (layer) return layer;
  let el = document.getElementById('bubble-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bubble-layer';
    el.className = 'bubble-layer';
    document.body.appendChild(el);
  }
  layer = el;
  return layer;
}

function ensurePool(): void {
  if (pool.length >= POOL_SIZE) return;
  const root = ensureLayer();
  while (pool.length < POOL_SIZE) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'world-bubble';
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
    root.appendChild(el);
    pool.push(el);
  }
}

function take(): HTMLElement | null {
  ensurePool();
  for (const el of pool) {
    if (el.style.display === 'none') return el;
  }
  return null;
}

/** Lay down the DOM layer + pool. Safe to call multiple times. */
export function installWorldBubbles(): void {
  ensureLayer();
  ensurePool();
}

/** Project (wx,wy,wz) → screen-px. Returns null if behind cam. */
function projectToScreen(wx: number, wy: number, wz: number): { x: number; y: number } | null {
  const cam = getCamera();
  tmpVec.set(wx, wy, wz);
  tmpVec.project(cam);
  if (tmpVec.z > 1) return null;
  return {
    x: (tmpVec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-tmpVec.y * 0.5 + 0.5) * window.innerHeight,
  };
}

/** Drive one frame of the bubble layer. Pass freshly computed targets. */
export function renderWorldBubblesFrame(targets: BubbleTarget[]): void {
  ensurePool();
  const seen = new Set<string>();

  for (const t of targets) {
    seen.add(t.key);
    let entry = active.get(t.key);
    if (!entry) {
      const el = take();
      if (!el) continue;
      el.style.display = '';
      el.className = `world-bubble world-bubble--${t.kind}${t.pulse ? ' world-bubble--pulse' : ''}`;
      el.innerHTML = `<span class="world-bubble-ico">${t.icon}</span>`;
      el.classList.add('world-bubble--in');
      // Force reflow so the CSS transition runs even on the first frame.
      void el.offsetWidth;
      entry = { el };
      active.set(t.key, entry);
    }
    const el = entry.el;
    // Cheap to re-assign each frame; CSS handles diffing.
    if (t.tap) {
      el.style.pointerEvents = 'auto';
      el.onclick = (e) => { e.stopPropagation(); t.tap!(); };
    } else {
      el.style.pointerEvents = 'none';
      el.onclick = null;
    }

    const p = projectToScreen(t.wx, t.wy, t.wz);
    if (!p) {
      el.style.opacity = '0';
      continue;
    }
    el.style.opacity = '';
    el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  // Recycle stale entries
  for (const [key, entry] of active) {
    if (!seen.has(key)) {
      entry.el.classList.add('world-bubble--out');
      // Defer hiding so the fade-out plays. Cheap: a microtask.
      const el = entry.el;
      setTimeout(() => {
        if (!active.has(key)) {
          el.style.display = 'none';
          el.classList.remove('world-bubble--in', 'world-bubble--out');
          el.onclick = null;
          el.style.pointerEvents = 'none';
        }
      }, 220);
      active.delete(key);
    }
  }
}

/** Inspect game state and return the list of bubbles that should
 *  be visible *right now*. Called from main.ts each frame at ~10 Hz. */
export function computeBubbleTargets(): BubbleTarget[] {
  const out: BubbleTarget[] = [];
  const now = nowSeconds();

  // -------- Pens: hungry animals + ready-to-collect ---------
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def) continue;

    // Pen center (in world units = tile-units)
    const cx = b.x + def.w / 2;
    const cz = b.y + def.h / 2;

    if (def.kind === 'pen') {
      const feedLvl = state.penFeed[b.id] ?? 100;
      const animals = state.penAnimals[b.id] ?? [];
      const aniDef = def.animal ? ANIMALS[def.animal] : null;
      // Hungry bubble — show a "wheat" icon over the pen when feed
      // is low and there ARE animals inside. Tapping spends feed.
      if (feedLvl < 35 && animals.length > 0) {
        out.push({
          key: `feed:${b.id}`,
          wx: cx, wy: 2.0, wz: cz,
          icon: '🌾',
          kind: 'feed',
          pulse: feedLvl < 15,
          tap: () => feedPen(b.id, 10),
        });
      }
      // Ready-to-collect — counts adults whose produce cooldown
      // has elapsed. One bubble per pen for clarity.
      let ready = 0;
      if (aniDef) {
        for (const a of animals) {
          if (now - a.lastProduced >= aniDef.produceTime) ready++;
        }
      }
      if (ready > 0) {
        out.push({
          key: `ready:${b.id}`,
          wx: cx, wy: 2.0, wz: cz,
          icon: '✓',
          kind: 'ready',
          tap: () => openPenPanel(b),
        });
      }
    } else if (def.kind === 'production') {
      // Production buildings: bubble when at least one job is done.
      const q = state.prodQueues[b.id] ?? [];
      let done = 0;
      for (const j of q) if (j.doneAt <= now) done++;
      if (done > 0) {
        out.push({
          key: `prod:${b.id}`,
          wx: cx, wy: 2.0, wz: cz,
          icon: '✓',
          kind: 'ready',
          tap: () => openProductionPanel(b),
        });
      }
    }
  }

  // -------- Crops: cluster ready bubbles per 4x4 sector --------
  // Showing one bubble per crop would obliterate the screen. Bucket
  // ready tiles into coarse cells and emit one "ready" bubble per
  // cell with the tile count rolled into the icon.
  const sector = 5;            // tiles per cell
  const buckets = new Map<string, { cx: number; cz: number; n: number }>();
  for (let y = 0; y < state.grid.length; y++) {
    const row = state.grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const t = row[x]!;
      if (!t.crop) continue;
      if (cropStage(t) !== 3) continue;
      const bx = Math.floor(x / sector);
      const bz = Math.floor(y / sector);
      const k = `${bx}:${bz}`;
      const e = buckets.get(k);
      if (e) {
        e.n++;
        e.cx += x; e.cz += y;
      } else {
        buckets.set(k, { cx: x, cz: y, n: 1 });
      }
    }
  }
  for (const [k, b] of buckets) {
    if (b.n < 2) continue;     // single ripe tile = beacon does the job
    const cx = (b.cx / b.n) + 0.5;
    const cz = (b.cz / b.n) + 0.5;
    out.push({
      key: `crop:${k}`,
      wx: cx, wy: 1.4, wz: cz,
      icon: b.n > 9 ? '9+' : `${b.n}`,
      kind: 'ready',
    });
  }

  // -------- Storage warnings (barn/silo) --------
  // Anchor over the nearest visible storage building if we have one,
  // otherwise pin to the home centre. We only show when over 100%.
  const su = siloUsage();
  const bu = barnUsage();
  if (su.used > su.cap || bu.used > bu.cap) {
    // Find a silo/barn building if present; else fallback to (0,0).
    let cx = 0, cz = 0, found = false;
    for (const b of state.buildings) {
      const def = BUILDINGS[b.type];
      if (def && (b.type === 'silo' || b.type === 'barn' || b.type === 'greatbarn')) {
        cx = b.x + def.w / 2;
        cz = b.y + def.h / 2;
        found = true;
        break;
      }
    }
    if (found) {
      out.push({
        key: 'storage-full',
        wx: cx, wy: 3.0, wz: cz,
        icon: '!',
        kind: 'full',
        pulse: true,
      });
    }
  }

  return out;
}

// Cached target list so we don't iterate the world every frame.
let cachedTargets: BubbleTarget[] = [];

/** Recompute the bubble target *set* (which bubbles exist) — call at
 *  a low frequency (~6 Hz). */
export function refreshWorldBubbleTargets(): void {
  cachedTargets = computeBubbleTargets();
}

/** Re-project cached bubbles to screen — call every frame so the
 *  bubbles stay glued to their entities during camera pan/zoom. */
export function tickWorldBubbles(): void {
  renderWorldBubblesFrame(cachedTargets);
}
