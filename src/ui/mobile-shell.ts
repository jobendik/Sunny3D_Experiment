// =============================================================
//  MOBILE SHELL  — More-menu bottom sheet, Quests FAB drawer,
//  placing banner, and re-center helper.
// =============================================================

import { state } from '../state';
import { SW, SH } from '../canvas';
import { GRID_W, GRID_H, TILE, HOME_CENTER_X, HOME_CENTER_Y, HOME_W, HOME_H } from '../constants';
import { clamp } from '../utils';
import { sprites } from '../sprites';
import { setBgImage } from './modal';
import { sfx } from '../audio/sfx';
import { haptic } from '../input';
import { applyFeatureVisibility, gateForButton, gateStatus, teaserMessageFor } from '../systems/feature-visibility';
import { toast } from './toasts';

// ---------------- MORE SHEET ----------------
export function openMoreSheet(): void {
  const sheet = document.getElementById('more-sheet')!;
  const scrim = document.getElementById('more-scrim')!;
  // Re-evaluate feature visibility every time the sheet opens — player
  // could have just hit a level-up that changes the gate state.
  applyFeatureVisibility();
  sheet.classList.add('open');
  scrim.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  haptic(8);
}
export function closeMoreSheet(): void {
  const sheet = document.getElementById('more-sheet')!;
  const scrim = document.getElementById('more-scrim')!;
  sheet.classList.remove('open');
  scrim.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
}

// ---------------- SIDE PANEL (Quests/Orders) ----------------
export function openSidePanel(): void {
  const panel = document.getElementById('side-panel')!;
  const scrim = document.getElementById('side-panel-scrim')!;
  panel.classList.add('open');
  scrim.classList.add('open');
  haptic(8);
}
export function closeSidePanel(): void {
  const panel = document.getElementById('side-panel')!;
  const scrim = document.getElementById('side-panel-scrim')!;
  panel.classList.remove('open');
  scrim.classList.remove('open');
}

// ---------------- PLACING BANNER ----------------
let lastPlacingState: string = '';
export function updatePlacingBanner(): void {
  const banner = document.getElementById('placing-banner')!;
  const text = document.getElementById('placing-text')!;
  const cur = state.placing;
  if (!cur) {
    if (lastPlacingState !== '') {
      banner.setAttribute('hidden', '');
      lastPlacingState = '';
    }
    return;
  }
  let label = 'Tap a tile to place';
  if (cur.decor) label = 'Tap grass to place decoration';
  else if (cur.tree) label = 'Tap soil to plant tree';
  else if (cur.type) label = 'Tap to place building';
  const key = (cur.type ?? '') + (cur.tree ?? '') + (cur.decor ? 'd' : '');
  if (key === lastPlacingState) return;
  lastPlacingState = key;
  text.textContent = label;
  banner.removeAttribute('hidden');
}

// ---------------- FAB BADGE COUNT ----------------
export function updateQuestsFabBadge(): void {
  const badge = document.getElementById('quests-fab-badge')!;
  const claimable = state.quests.filter(q => q.complete).length;
  const fulfillable = state.orders.filter(o => {
    for (const k in o.items) {
      const need = o.items[k]!;
      const have = state.inv[k] ?? 0;
      if (have < need) return false;
    }
    return true;
  }).length;
  const n = claimable + fulfillable;
  if (n > 0) {
    badge.removeAttribute('hidden');
    badge.textContent = String(n);
  } else {
    badge.setAttribute('hidden', '');
  }
  // Also refresh the gazette unread pip on the More-sheet button.
  const pip = document.getElementById('gazette-pip');
  if (pip) {
    const unread = !!state.gazette && state.gazette.lastReadDay !== state.day;
    if (unread) pip.removeAttribute('hidden');
    else pip.setAttribute('hidden', '');
  }
}

// ---------------- RE-CENTER CAMERA ----------------
export function recenterCamera(): void {
  // Centre on the home zone so re-centering reliably returns the
  // player to "their farm" regardless of how far they've panned out
  // toward the locked expansion regions.
  state.camX = HOME_CENTER_X * TILE;
  state.camY = HOME_CENTER_Y * TILE;
  const framePx = (Math.max(HOME_W, HOME_H) + 4) * TILE;
  state.camScale = clamp(
    Math.min(SW() / framePx, SH() / framePx) * 0.95,
    0.6,
    1.8,
  );
  sfx.click();
  haptic(8);
}

// ---------------- WIRE UP HANDLERS ----------------
export function bindMobileShell(): void {
  // More menu
  const moreBtn = document.getElementById('open-more');
  const scrim = document.getElementById('more-scrim');
  if (moreBtn) moreBtn.addEventListener('click', openMoreSheet);
  if (scrim) scrim.addEventListener('click', closeMoreSheet);

  // Each .sheet-btn closes the sheet then triggers the real button.
  // Teaser-state buttons short-circuit to a friendly toast instead of
  // opening a panel the player can't use yet.
  document.querySelectorAll<HTMLElement>('.sheet-btn[data-more]').forEach(b => {
    b.addEventListener('click', () => {
      const targetId = b.dataset.more!;
      const gate = gateForButton(targetId);
      if (gate && gateStatus(gate) === 'teaser') {
        const msg = teaserMessageFor(targetId);
        if (msg) toast(msg);
        sfx.error();
        return;
      }
      closeMoreSheet();
      // Small delay so the sheet animation feels natural
      setTimeout(() => {
        const real = document.getElementById(targetId);
        if (real) real.click();
      }, 80);
    });
  });

  // Re-center
  const reBtn = document.getElementById('recenter-btn');
  if (reBtn) {
    reBtn.addEventListener('click', () => {
      closeMoreSheet();
      recenterCamera();
    });
  }

  // Music toggle inside sheet → triggers the real one
  const musicSheet = document.getElementById('music-toggle-sheet');
  if (musicSheet) {
    musicSheet.addEventListener('click', () => {
      const real = document.getElementById('music-toggle');
      if (real) real.click();
      const icon = document.getElementById('music-toggle-sheet-icon')!;
      icon.textContent = state.musicOn ? '🎵' : '🔇';
    });
  }

  // Quests FAB
  const fab = document.getElementById('open-quests-fab');
  if (fab) fab.addEventListener('click', openSidePanel);
  const sideScrim = document.getElementById('side-panel-scrim');
  if (sideScrim) sideScrim.addEventListener('click', closeSidePanel);
  const sideClose = document.getElementById('side-panel-close');
  if (sideClose) sideClose.addEventListener('click', closeSidePanel);

  // Placing banner cancel
  const placeCancel = document.getElementById('placing-cancel');
  if (placeCancel) {
    placeCancel.addEventListener('click', () => {
      state.placing = null;
      updatePlacingBanner();
      sfx.click();
    });
  }

  // Attach the same sprite backgrounds for sheet icons
  setBgImage('ico-inv-m',    sprites.item.inv!);
  setBgImage('ico-decor-m',  sprites.item.decor!);
  setBgImage('ico-trophy-m', sprites.item.trophy!);
  setBgImage('ico-news-m',   sprites.item.news!);
  setBgImage('ico-save-m',   sprites.item.save!);
  setBgImage('ico-help-m',   sprites.item.help!);

  // Initial music icon in sheet
  const ic = document.getElementById('music-toggle-sheet-icon');
  if (ic) ic.textContent = state.musicOn ? '🎵' : '🔇';
}
