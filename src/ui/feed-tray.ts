// =============================================================
//  FEED TRAY — FV3-style drag-and-drop feeding.
//
//  A small inline tray (above the bottom tool dock) shows the
//  player's draggable items (currently just "feed"). Touch / mouse
//  drag onto a pen's 3D tile feeds it. Lifts the existing tap-
//  feedPen() flow into the more tactile FV3 grammar described in
//  the research doc ("drag a grain icon onto a cow").
// =============================================================

import { state } from '../state';
import { screenToWorld } from '../systems/camera';
import { tileAt, buildingAt } from '../systems/grid';
import { BUILDINGS } from '../data/buildings';
import { feedPen } from '../systems/pens';
import { toast } from './toasts';
import { sfx } from '../audio/sfx';
import { haptic } from '../input';

interface TrayItem {
  key: string;
  ico: string;
  label: string;
}

const TRAY_ITEMS: TrayItem[] = [
  { key: 'feed', ico: '🌾', label: 'Feed' },
];

let trayEl: HTMLElement | null = null;
let ghostEl: HTMLElement | null = null;
let dragItem: TrayItem | null = null;

function ensureTray(): HTMLElement {
  if (trayEl) return trayEl;
  const el = document.createElement('div');
  el.id = 'feed-tray';
  el.className = 'feed-tray';
  el.setAttribute('aria-label', 'Drag items onto animals to feed them');
  document.getElementById('game-root')?.appendChild(el);
  trayEl = el;
  return el;
}

function ensureGhost(): HTMLElement {
  if (ghostEl) return ghostEl;
  const el = document.createElement('div');
  el.className = 'feed-tray-ghost';
  el.setAttribute('hidden', '');
  document.body.appendChild(el);
  ghostEl = el;
  return el;
}

function refreshTray(): void {
  const tray = ensureTray();
  // Only render items the player owns. If none, hide the tray.
  const visible = TRAY_ITEMS.filter(it => (state.inv[it.key] ?? 0) > 0);
  if (visible.length === 0) {
    tray.classList.remove('feed-tray--open');
    tray.innerHTML = '';
    return;
  }
  tray.classList.add('feed-tray--open');
  tray.innerHTML = visible.map(it => `
    <button class="feed-tray-item" data-key="${it.key}" type="button"
            title="Drag onto an animal to feed it" aria-label="${it.label}">
      <span class="feed-tray-item-ico">${it.ico}</span>
      <span class="feed-tray-item-count">${state.inv[it.key] ?? 0}</span>
    </button>
  `).join('');
  // Bind pointerdown for drag start on every item.
  tray.querySelectorAll<HTMLButtonElement>('button.feed-tray-item').forEach(btn => {
    const key = btn.dataset.key!;
    const it = TRAY_ITEMS.find(i => i.key === key);
    if (!it) return;
    btn.addEventListener('pointerdown', e => onDragStart(e, it));
  });
}

function onDragStart(e: PointerEvent, item: TrayItem): void {
  e.preventDefault();
  e.stopPropagation();
  dragItem = item;
  const ghost = ensureGhost();
  ghost.textContent = item.ico;
  ghost.removeAttribute('hidden');
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  haptic(8);

  const move = (ev: PointerEvent): void => {
    ghost.style.left = ev.clientX + 'px';
    ghost.style.top = ev.clientY + 'px';
  };
  const up = (ev: PointerEvent): void => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    ghost.setAttribute('hidden', '');
    if (!dragItem) return;
    handleDrop(ev.clientX, ev.clientY);
    dragItem = null;
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
}

function handleDrop(sx: number, sy: number): void {
  if (!dragItem) return;
  // Only "feed" is wired today — drop on a pen tile to feed.
  if (dragItem.key !== 'feed') return;
  const world = screenToWorld(sx, sy);
  const tile = tileAt(world.x, world.y);
  if (!tile) {
    sfx.error();
    return;
  }
  const b = buildingAt(tile.gx, tile.gy);
  if (!b) {
    toast('Drop on an animal pen to feed', '');
    sfx.error();
    return;
  }
  const def = BUILDINGS[b.type];
  if (!def || def.kind !== 'pen') {
    toast('Drop on an animal pen to feed', '');
    sfx.error();
    return;
  }
  // Reuse the existing feedPen path so XP / mood / animations all
  // run identically to the tap-feed flow.
  feedPen(b.id, 10);
}

let bound = false;
export function bindFeedTray(): void {
  if (bound) return;
  bound = true;
  ensureTray();
  ensureGhost();
  // Refresh whenever HUD updates fire. We do it on a low cadence
  // since item counts change rarely relative to frame time.
  refreshTray();
}

/** Called from main.ts ~2 Hz so the count badge stays in sync. */
export function tickFeedTray(): void {
  refreshTray();
}
