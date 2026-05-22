// =============================================================
//  MOBILE SHELL  — FarmVille-3-grammar HUD plumbing.
//
//  Owns:
//   • More-sheet bottom drawer (Tertiary tier)
//   • Book sheet (Secondary tier — Collections gateway)
//   • Hamburger drawer (system / preferences)
//   • Quests + Order Board side panel (Primary tier)
//   • Quick Event Bar dynamic population (live-ops surfaces)
//   • Placing banner + Re-center helper
// =============================================================

import { state } from '../state';
import { SW, SH } from '../canvas';
import { TILE, HOME_CENTER_X, HOME_CENTER_Y, HOME_W, HOME_H } from '../constants';
import { clamp } from '../utils';
import { sprites } from '../sprites';
import { setBgImage } from './modal';
import { sfx } from '../audio/sfx';
import { haptic } from '../input';
import {
  applyFeatureVisibility, gateForButton, gateStatus, teaserMessageFor,
} from '../systems/feature-visibility';

function gateAllows(buttonId: string): boolean {
  const g = gateForButton(buttonId);
  if (!g) return true;
  const s = gateStatus(g);
  return s === 'unlocked' || s === 'attention';
}
import { canSpin } from '../systems/wheel';
import { toast } from './toasts';
import { unreadCount } from '../systems/mailbox';
import { hasPendingBox } from '../systems/surprise-box';
import { piggyPct } from '../systems/piggy-bank';
import { setScenicMode } from '../systems/settings';
import { toggleEditMode, setEditMode } from '../systems/edit-mode';

// =============================================================
//  SHEETS / DRAWERS
// =============================================================

export function openMoreSheet(): void {
  applyFeatureVisibility();
  showSheet('more-sheet', 'more-scrim');
}
export function closeMoreSheet(): void { hideSheet('more-sheet', 'more-scrim'); }

export function openBookSheet(): void {
  applyFeatureVisibility();
  showSheet('book-sheet', 'book-scrim');
}
export function closeBookSheet(): void { hideSheet('book-sheet', 'book-scrim'); }

export function openHudDrawer(): void { showSheet('hud-menu-drawer', 'hud-menu-scrim'); }
export function closeHudDrawer(): void { hideSheet('hud-menu-drawer', 'hud-menu-scrim'); }

function showSheet(sheetId: string, scrimId: string): void {
  const sheet = document.getElementById(sheetId);
  const scrim = document.getElementById(scrimId);
  if (!sheet || !scrim) return;
  sheet.classList.add('open');
  scrim.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  haptic(8);
}
function hideSheet(sheetId: string, scrimId: string): void {
  const sheet = document.getElementById(sheetId);
  const scrim = document.getElementById(scrimId);
  if (!sheet || !scrim) return;
  sheet.classList.remove('open');
  scrim.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
}

// =============================================================
//  ORDER BOARD / QUESTS SIDE PANEL
// =============================================================

export function openSidePanel(): void {
  document.getElementById('side-panel')?.classList.add('open');
  document.getElementById('side-panel-scrim')?.classList.add('open');
  haptic(8);
}
export function closeSidePanel(): void {
  document.getElementById('side-panel')?.classList.remove('open');
  document.getElementById('side-panel-scrim')?.classList.remove('open');
}

// =============================================================
//  PLACING BANNER
// =============================================================

let lastPlacingState = '';
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

// =============================================================
//  BADGE COUNT UPDATES — feeds Order Board + Book pip
// =============================================================

export function updateQuestsFabBadge(): void {
  // Hidden FAB still maintained for objective-rail to reference.
  const badge = document.getElementById('quests-fab-badge');
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
  if (badge) {
    if (n > 0) {
      badge.removeAttribute('hidden');
      badge.textContent = String(n);
    } else {
      badge.setAttribute('hidden', '');
    }
  }
  // Gazette pip on the More sheet
  const pip = document.getElementById('gazette-pip');
  if (pip) {
    const unread = !!state.gazette && state.gazette.lastReadDay !== state.day;
    if (unread) pip.removeAttribute('hidden');
    else pip.setAttribute('hidden', '');
  }
  // Book pip: lit when there is something fresh inside the
  // Collections gateway. Cheapest proxy: anything in the gazette
  // unread, or a still-pending surprise box — both surface as
  // book-discoverable content for now.
  const bookPip = document.getElementById('book-btn-pip');
  if (bookPip) {
    const gazetteUnread = !!state.gazette && state.gazette.lastReadDay !== state.day;
    const fresh = gazetteUnread || hasPendingBox();
    if (fresh) bookPip.removeAttribute('hidden');
    else bookPip.setAttribute('hidden', '');
  }
  // Refresh the Quick Event Bar (cheap: only emits new DOM when
  // the active-event set changes).
  refreshQuickEventBar();
}

// =============================================================
//  RE-CENTER CAMERA
// =============================================================

export function recenterCamera(): void {
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

// =============================================================
//  QUICK EVENT BAR  (FV3 hallmark — collapsible vertical rail)
// =============================================================

interface QEBEntry {
  id: string;
  icon: string;
  label: string;
  badge?: string | number;
  pulse?: boolean;
  open: () => void;
}

let lastQEBSig = '';

function buildQEBEntries(): QEBEntry[] {
  const out: QEBEntry[] = [];

  // Order Board (Primary) — always present, badge = fulfillable count
  const fulfillable = state.orders.filter(o => {
    for (const k in o.items) {
      const need = o.items[k]!;
      const have = state.inv[k] ?? 0;
      if (have < need) return false;
    }
    return true;
  }).length;
  const claimable = state.quests.filter(q => q.complete).length;
  const ordTotal = fulfillable + claimable;
  out.push({
    id: 'orders', icon: '📋', label: 'Orders',
    badge: ordTotal > 0 ? ordTotal : undefined,
    pulse: ordTotal > 0,
    open: () => openSidePanel(),
  });

  // Daily Wheel — only if spinnable today
  if (canSpin()) {
    out.push({
      id: 'wheel', icon: '🎡', label: 'Wheel',
      badge: '!', pulse: true,
      open: () => clickHidden('open-wheel'),
    });
  }

  // Season Pass — always once unlocked
  if (gateAllows('open-pass')) {
    out.push({
      id: 'pass', icon: '🎖️', label: 'Pass',
      open: () => clickHidden('open-pass'),
    });
  }

  // Live Events — only when one is active
  const liveActive = (state as { liveEvent?: { active?: boolean } }).liveEvent?.active;
  if (liveActive && gateAllows('open-events')) {
    out.push({
      id: 'events', icon: '🎉', label: 'Events',
      pulse: true,
      open: () => clickHidden('open-events'),
    });
  }

  // Festival Cart — when active
  if (gateAllows('open-cart')) {
    const cart = (state as { festivalCart?: { active?: boolean } }).festivalCart;
    if (cart?.active) {
      out.push({
        id: 'cart', icon: '🎪', label: 'Cart',
        open: () => clickHidden('open-cart'),
      });
    }
  }

  // Boat — when it's docked/loadable
  if (gateAllows('open-boat')) {
    out.push({
      id: 'boat', icon: '⛵', label: 'Boat',
      open: () => clickHidden('open-boat'),
    });
  }

  // Train — when waiting for cargo
  if (gateAllows('open-train')) {
    out.push({
      id: 'train', icon: '🚂', label: 'Train',
      open: () => clickHidden('open-train'),
    });
  }

  // Balloon — when available
  if (gateAllows('open-balloon')) {
    out.push({
      id: 'balloon', icon: '🎈', label: 'Balloon',
      open: () => clickHidden('open-balloon'),
    });
  }

  // Daily login (sky banner / streak)
  out.push({
    id: 'daily', icon: '🌅', label: 'Daily',
    open: () => clickHidden('open-daily'),
  });

  // Mailbox — when unread
  const mailN = unreadCount();
  if (mailN > 0) {
    out.push({
      id: 'mail', icon: '📬', label: 'Mail',
      badge: mailN > 99 ? '99+' : mailN,
      pulse: true,
      open: () => clickHidden('open-mailbox'),
    });
  }

  // Surprise box — when one is pending
  if (hasPendingBox()) {
    out.push({
      id: 'surprise', icon: '📦', label: 'Surprise',
      pulse: true,
      open: () => clickHidden('open-surprise'),
    });
  }

  // Piggy Bank — once gems are stored
  if (state.piggyBank && state.piggyBank.gems > 0) {
    out.push({
      id: 'piggy', icon: '🐷', label: 'Piggy',
      badge: state.piggyBank.gems,
      pulse: piggyPct() >= 0.3,
      open: () => clickHidden('open-piggy'),
    });
  }

  return out;
}

function clickHidden(id: string): void {
  document.getElementById(id)?.click();
}

export function refreshQuickEventBar(): void {
  const rail = document.getElementById('qeb-rail');
  if (!rail) return;
  const entries = buildQEBEntries();
  // Cheap diff: rebuild DOM only when the set/badges change.
  const sig = entries.map(e => `${e.id}:${e.badge ?? ''}:${e.pulse ? '!' : ''}`).join('|');
  if (sig === lastQEBSig) return;
  lastQEBSig = sig;

  rail.innerHTML = entries.map(e => `
    <button class="qeb-item${e.pulse ? ' qeb-item--pulse' : ''}" data-qeb="${e.id}"
            title="${e.label}" aria-label="${e.label}">
      <span class="qeb-item-ico" aria-hidden="true">${e.icon}</span>
      <span class="qeb-item-label">${e.label}</span>
      ${e.badge !== undefined ? `<span class="qeb-item-badge">${e.badge}</span>` : ''}
    </button>
  `).join('');

  rail.querySelectorAll<HTMLButtonElement>('button.qeb-item').forEach(btn => {
    const id = btn.dataset.qeb!;
    const entry = entries.find(e => e.id === id);
    if (entry) btn.addEventListener('click', entry.open);
  });
}

function toggleQuickEventBar(): void {
  const bar = document.getElementById('quick-event-bar');
  if (!bar) return;
  const collapsed = bar.classList.toggle('collapsed');
  const toggle = document.getElementById('qeb-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.setAttribute('aria-label', collapsed ? 'Expand event bar' : 'Collapse event bar');
  }
  sfx.click();
  haptic(8);
}

// =============================================================
//  WIRE UP HANDLERS
// =============================================================

export function bindMobileShell(): void {
  // More sheet ----------------------------------------------------
  document.getElementById('open-more')?.addEventListener('click', openMoreSheet);
  document.getElementById('more-scrim')?.addEventListener('click', closeMoreSheet);

  // Book sheet ----------------------------------------------------
  document.getElementById('book-btn')?.addEventListener('click', openBookSheet);
  document.getElementById('book-scrim')?.addEventListener('click', closeBookSheet);

  // Hamburger drawer ----------------------------------------------
  document.getElementById('hud-menu-btn')?.addEventListener('click', openHudDrawer);
  document.getElementById('hud-menu-scrim')?.addEventListener('click', closeHudDrawer);

  // Profile block opens the achievements/stats panel — closest meaning.
  document.getElementById('profile-block')?.addEventListener('click', () => {
    clickHidden('open-achievements');
  });

  // Every sheet-btn closes whichever sheet/drawer it belongs to,
  // then forwards to the real hidden trigger button. Teaser-state
  // buttons short-circuit to a friendly toast instead.
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
      closeBookSheet();
      closeHudDrawer();
      setTimeout(() => {
        const real = document.getElementById(targetId);
        if (real) real.click();
      }, 80);
    });
  });

  // Re-center buttons --------------------------------------------
  document.getElementById('recenter-btn')?.addEventListener('click', () => {
    closeMoreSheet();
    recenterCamera();
  });
  document.getElementById('hud-menu-recenter')?.addEventListener('click', () => {
    closeHudDrawer();
    recenterCamera();
  });

  // Music toggles within sheets -----------------------------------
  document.getElementById('music-toggle-sheet')?.addEventListener('click', () => {
    document.getElementById('music-toggle')?.click();
    const icon = document.getElementById('music-toggle-sheet-icon');
    if (icon) icon.textContent = state.musicOn ? '🎵' : '🔇';
  });
  document.getElementById('hud-menu-music')?.addEventListener('click', () => {
    document.getElementById('music-toggle')?.click();
    const icon = document.getElementById('hud-menu-music-icon');
    if (icon) icon.textContent = state.musicOn ? '🎵' : '🔇';
  });

  // Side panel close ---------------------------------------------
  document.getElementById('side-panel-scrim')?.addEventListener('click', closeSidePanel);
  document.getElementById('side-panel-close')?.addEventListener('click', closeSidePanel);

  // Currency taps -------------------------------------------------
  document.getElementById('gem-badge')?.addEventListener('click', () => {
    toast('Diamonds — earned from level-ups, Daily Wheel and Achievements.');
    sfx.click();
  });
  document.getElementById('coin-badge')?.addEventListener('click', () => {
    document.getElementById('open-shop')?.click();
  });

  // Build FAB (corner) → routes to the build menu
  document.getElementById('open-buildings-fab')?.addEventListener('click', () => {
    document.getElementById('open-buildings')?.click();
  });

  // Quick Event Bar — collapse toggle ----------------------------
  document.getElementById('qeb-toggle')?.addEventListener('click', toggleQuickEventBar);

  // Hamburger drawer scenic / edit-mode toggles
  document.getElementById('hud-menu-scenic')?.addEventListener('click', () => {
    closeHudDrawer();
    setTimeout(() => setScenicMode(true), 200);
  });
  document.getElementById('hud-menu-edit')?.addEventListener('click', () => {
    closeHudDrawer();
    setTimeout(toggleEditMode, 200);
    updateEditBanner();
  });
  document.getElementById('edit-banner-exit')?.addEventListener('click', () => {
    setEditMode(false);
    updateEditBanner();
  });
  const obs = new MutationObserver(updateEditBanner);
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // Placing banner cancel ----------------------------------------
  document.getElementById('placing-cancel')?.addEventListener('click', () => {
    state.placing = null;
    updatePlacingBanner();
    sfx.click();
  });

  // Attach the same sprite backgrounds for sheet/drawer icons.
  setBgImage('ico-inv-m',    sprites.item.inv!);
  setBgImage('ico-decor-m',  sprites.item.decor!);
  setBgImage('ico-news-m',   sprites.item.news!);
  setBgImage('ico-save-m',   sprites.item.save!);
  setBgImage('ico-help-m',   sprites.item.help!);
  setBgImage('ico-inv-d',    sprites.item.inv!);
  setBgImage('ico-decor-d',  sprites.item.decor!);
  setBgImage('ico-trophy-d', sprites.item.trophy!);
  setBgImage('ico-news-d',   sprites.item.news!);
  setBgImage('ico-save-d',   sprites.item.save!);
  setBgImage('ico-help-d',   sprites.item.help!);
  setBgImage('ico-trophy-b', sprites.item.trophy!);

  // Initial music icon in sheet/drawer
  const ic = document.getElementById('music-toggle-sheet-icon');
  if (ic) ic.textContent = state.musicOn ? '🎵' : '🔇';
  const icD = document.getElementById('hud-menu-music-icon');
  if (icD) icD.textContent = state.musicOn ? '🎵' : '🔇';

  // Prime the QEB now so it isn't empty on first paint.
  refreshQuickEventBar();
}

/** Sync the edit-mode banner visibility with the body class. */
function updateEditBanner(): void {
  const banner = document.getElementById('edit-banner');
  if (!banner) return;
  if (document.body.classList.contains('edit-mode')) {
    banner.removeAttribute('hidden');
  } else {
    banner.setAttribute('hidden', '');
  }
}
