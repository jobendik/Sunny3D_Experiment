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
import { HOME_CENTER_X, HOME_CENTER_Y } from '../constants';
import { BUILDINGS } from '../data/buildings';
import { getCamera } from '../three/camera-rig';
import { cropStage } from '../systems/crops';
import { siloUsage, barnUsage } from '../systems/storage';
import { nowSeconds } from '../utils';
import { ANIMALS } from '../data/animals';
import { feedPen } from '../systems/pens';
import { activeVisitors } from '../systems/visitors-v2';
import { activeChatter } from '../systems/chatter';
import { gateForButton, gateStatus } from '../systems/feature-visibility';
import { openProductionPanel } from './production-panel';
import { openPenPanel } from './pen-panel';
import { openStoragePanel } from './storage-panel';
import { openSidePanel } from './mobile-shell';
import {
  ORDER_TRUCK_X, ORDER_TRUCK_Z, ORDER_TRUCK_BUBBLE_Y,
} from '../three/decor/order-truck';
import {
  BOAT_X, BOAT_Z, BOAT_BUBBLE_Y, BOAT_CRATE_BUBBLE_Y,
  getCrateWorldPosition,
} from '../three/decor/boat-at-dock';
import {
  MAILBOX_X, MAILBOX_Z, MAILBOX_BUBBLE_Y,
} from '../three/decor/mailbox';
import {
  STAND_X, STAND_Z, STAND_BUBBLE_Y, STAND_SLOT_BUBBLE_Y,
  getStandSlotWorldPosition,
} from '../three/decor/roadside-stand';
import {
  NEWS_X, NEWS_Z, NEWS_BUBBLE_Y,
} from '../three/decor/newspaper-stand';
import { ITEMS } from '../data/items';
import { unreadCount as mailboxUnreadCount } from '../systems/mailbox';

const POOL_SIZE = 28;
const tmpVec = new Vector3();

export type BubbleKind = 'feed' | 'ready' | 'full' | 'emote' | 'love' | 'visitor' | 'hub' | 'chatter';

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
        tap: () => document.getElementById('open-inventory')?.click(),
      });
    }
  }

  // -------- NPC visitor talk bubbles --------
  // Visitors don't carry a 3D position — we anchor them in a small
  // arc near the home centre so multiple visitors fan out instead of
  // stacking on top of each other.
  const visitors = activeVisitors();
  if (visitors.length > 0) {
    const radius = 4.5;
    visitors.slice(0, 4).forEach((v, i) => {
      const ang = -Math.PI / 2 + (i - (visitors.length - 1) / 2) * 0.8;
      const cx = HOME_CENTER_X + Math.cos(ang) * radius;
      const cz = HOME_CENTER_Y + Math.sin(ang) * radius;
      out.push({
        key: `visitor:${v.id}`,
        wx: cx, wy: 1.8, wz: cz,
        icon: v.emoji,
        kind: 'visitor',
        pulse: !v.served,
        tap: () => document.querySelector<HTMLElement>('button[data-qeb="orders"]')?.click(),
      });
    });
  }

  // -------- Animal "love" / mature lifecycle bubble --------
  // Lightweight: any animal whose lastProduced is older than a long
  // produce interval AND whose feed is healthy gets a small heart
  // bubble. Tap routes to the pen so the player can collect / breed.
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def || def.kind !== 'pen') continue;
    const list = state.penAnimals[b.id];
    if (!list || list.length === 0) continue;
    const feed = state.penFeed[b.id] ?? 100;
    if (feed < 40) continue;            // hungry animals don't show love
    const aniDef = def.animal ? ANIMALS[def.animal] : null;
    if (!aniDef) continue;
    // Show when the entire pen has produced at least N times and is
    // not currently in the ready window (otherwise the ✓ bubble wins).
    let matureCount = 0;
    for (const a of list) {
      // "Mature" proxy: produced recently enough to be alive >2 cycles
      const elapsed = now - a.lastProduced;
      if (elapsed >= aniDef.produceTime * 0.4 && elapsed < aniDef.produceTime) {
        matureCount++;
      }
    }
    if (matureCount >= Math.max(2, list.length - 1)) {
      const cx = b.x + def.w / 2;
      const cz = b.y + def.h / 2;
      out.push({
        key: `love:${b.id}`,
        wx: cx, wy: 2.4, wz: cz,
        icon: '❤️',
        kind: 'love',
        tap: () => openPenPanel(b),
      });
    }
  }

  // -------- 3D-anchored interaction hubs --------
  // Greatbarn → tap to upgrade storage (FV3 "tap the world, not a menu").
  for (const b of state.buildings) {
    if (b.type !== 'greatbarn') continue;
    const def = BUILDINGS[b.type];
    if (!def) continue;
    const cx = b.x + def.w / 2;
    const cz = b.y + def.h / 2;
    out.push({
      key: `hub:storage:${b.id}`,
      wx: cx, wy: 4.0, wz: cz,
      icon: '⚒️',
      kind: 'hub',
      tap: () => openStoragePanel(),
    });
  }
  // Fishing Dock → Ranger-Tower-style hub for Expeditions when unlocked.
  for (const b of state.buildings) {
    if (b.type !== 'fishingdock') continue;
    const expGate = gateForButton('open-expeditions');
    if (!expGate) break;
    const status = gateStatus(expGate);
    if (status !== 'unlocked' && status !== 'attention') break;
    const def = BUILDINGS[b.type];
    if (!def) break;
    const cx = b.x + def.w / 2;
    const cz = b.y + def.h / 2;
    out.push({
      key: `hub:expeditions:${b.id}`,
      wx: cx, wy: 2.6, wz: cz,
      icon: '🗺️',
      kind: 'hub',
      tap: () => document.getElementById('open-expeditions')?.click(),
    });
    break;
  }
  // -------- Boat at Dock (Phase 1.2) --------
  // Hub bubble when the boat is docked. Plus a per-crate "need" bubble
  // for every unfilled crate, mirroring Hay Day's crate icons. The
  // per-crate icon shows the requested item's emoji; we mark crates the
  // player can't currently fill with a pulsing "!" instead.
  if (state.boat?.unlocked && state.boat.state === 'docked') {
    out.push({
      key: 'hub:boat',
      wx: BOAT_X, wy: BOAT_BUBBLE_Y, wz: BOAT_Z,
      icon: '⛵',
      kind: 'hub',
      tap: () => document.getElementById('open-boat')?.click(),
    });
    const crates = state.boat.crates;
    for (let i = 0; i < Math.min(crates.length, 3); i++) {
      const c = crates[i]!;
      if (c.filled >= c.needed) continue;
      const pos = getCrateWorldPosition(i);
      if (!pos) continue;
      const have = state.inv[c.itemKey] ?? 0;
      const room = c.needed - c.filled;
      const canFill = have >= room;
      const itemIcon = ITEMS[c.itemKey]?.icon ?? '📦';
      out.push({
        key: `boat-crate:${i}`,
        wx: pos.x, wy: BOAT_CRATE_BUBBLE_Y, wz: pos.z,
        icon: canFill ? itemIcon : '!',
        kind: canFill ? 'feed' : 'full',
        pulse: !canFill,
        tap: () => document.getElementById('open-boat')?.click(),
      });
    }
  }

  // -------- Roadside Stand (Phase 1.4) --------
  // Hub bubble (cart icon) on top of the thatched stand, plus a
  // per-slot bubble for each slot that's listed (shows the item)
  // or sold (pulses a coin icon — tap to claim).
  if (state.marketStall?.unlocked) {
    const slots = state.marketStall.slots;
    const anySold = slots.some(s => s.status === 'sold');
    out.push({
      key: 'hub:stand',
      wx: STAND_X, wy: STAND_BUBBLE_Y, wz: STAND_Z,
      icon: anySold ? '💰' : '🛒',
      kind: anySold ? 'ready' : 'hub',
      pulse: anySold,
      tap: () => document.getElementById('open-stall')?.click(),
    });
    for (let i = 0; i < Math.min(slots.length, 3); i++) {
      const s = slots[i]!;
      const pos = getStandSlotWorldPosition(i);
      if (!pos) continue;
      if (s.status === 'sold') {
        out.push({
          key: `stand-slot:${i}:sold`,
          wx: pos.x, wy: STAND_SLOT_BUBBLE_Y, wz: pos.z,
          icon: '💰',
          kind: 'ready',
          pulse: true,
          tap: () => document.getElementById('open-stall')?.click(),
        });
      } else if (s.status === 'listed') {
        const itemIcon = ITEMS[s.itemKey]?.icon ?? '📦';
        out.push({
          key: `stand-slot:${i}:listed`,
          wx: pos.x, wy: STAND_SLOT_BUBBLE_Y, wz: pos.z,
          icon: itemIcon,
          kind: 'feed',
          tap: () => document.getElementById('open-stall')?.click(),
        });
      }
    }
  }

  // -------- Newspaper Stand (Phase 1.5) --------
  // Pulses when there's something fresh: a new day's edition or an
  // open gazette help request the player can fulfill.
  {
    const g = state.gazette;
    if (g) {
      const newEdition = g.lastReadDay !== state.day;
      const helpFulfillable = g.helpRequests.some(
        hr => !hr.done && (state.inv[hr.itemKey] ?? 0) >= hr.qty,
      );
      const pulse = newEdition || helpFulfillable;
      out.push({
        key: 'hub:news',
        wx: NEWS_X, wy: NEWS_BUBBLE_Y, wz: NEWS_Z,
        icon: '📰',
        kind: pulse ? 'ready' : 'hub',
        pulse,
        tap: () => document.getElementById('open-gazette')?.click(),
      });
    }
  }

  // -------- Mailbox (Phase 1.3) --------
  // Pinned above the rural mailbox. Visible only when there's unread
  // mail — Alfred's flag in 3D already telegraphs presence/absence,
  // so the bubble is the explicit "tap to read" affordance.
  {
    const unread = mailboxUnreadCount();
    if (unread > 0) {
      out.push({
        key: 'hub:mailbox',
        wx: MAILBOX_X, wy: MAILBOX_BUBBLE_Y, wz: MAILBOX_Z,
        icon: '📬',
        kind: 'hub',
        pulse: true,
        tap: () => document.getElementById('open-mailbox')?.click(),
      });
    }
  }

  // -------- Order Truck hub (Phase 1.1) --------
  // Pinned above the wooden cart parked at the south entrance.
  // Badge counts orders the player can fulfill right now +
  // claimable quest rewards. Tapping opens the Quests/Orders side
  // panel (same surface as the QEB "Orders" entry).
  {
    const fulfillable = state.orders.filter(o => {
      for (const k in o.items) {
        const need = o.items[k]!;
        const have = state.inv[k] ?? 0;
        if (have < need) return false;
      }
      return true;
    }).length;
    const claimable = state.quests.filter(q => q.complete).length;
    const total = fulfillable + claimable;
    out.push({
      key: 'hub:orders',
      wx: ORDER_TRUCK_X, wy: ORDER_TRUCK_BUBBLE_Y, wz: ORDER_TRUCK_Z,
      icon: total > 0 ? (total > 9 ? '9+' : `${total}`) : '📋',
      kind: total > 0 ? 'ready' : 'hub',
      pulse: total > 0,
      tap: () => openSidePanel(),
    });
  }

  // Co-Op signpost near the home centre when the Club is unlocked.
  {
    const clubGate = gateForButton('open-club');
    const status = clubGate ? gateStatus(clubGate) : 'hidden';
    if (status === 'unlocked' || status === 'attention') {
      out.push({
        key: 'hub:club',
        wx: HOME_CENTER_X - 5, wy: 2.0, wz: HOME_CENTER_Y - 3,
        icon: '🤝',
        kind: 'hub',
        tap: () => document.getElementById('open-club')?.click(),
      });
    }
  }

  // -------- Ambient villager chatter --------
  // Periodic "narrative" speech bubbles emitted from chatter.ts. We
  // strip the leading emoji into the bubble icon so the talk bubble
  // can display a compact glyph instead of full-text content (the
  // rest of the line goes into the title attribute so curious
  // players hovering get the full quip).
  for (const c of activeChatter()) {
    const trimmed = c.text.trim();
    const firstChar = [...trimmed][0] ?? '💬';
    out.push({
      key: `chat:${c.id}`,
      wx: c.wx, wy: 2.6, wz: c.wz,
      icon: firstChar,
      kind: 'chatter',
    });
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
