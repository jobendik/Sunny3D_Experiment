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
import { canSpin } from '../systems/wheel';
import { toast } from './toasts';
import { unreadCount } from '../systems/mailbox';
import { hasPendingBox } from '../systems/surprise-box';
import { piggyPct } from '../systems/piggy-bank';
import { setScenicMode } from '../systems/settings';
import { toggleEditMode, isEditMode, setEditMode } from '../systems/edit-mode';

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

// ---------------- HUD MENU DRAWER (hamburger) ----------------
export function openHudDrawer(): void {
  const drawer = document.getElementById('hud-menu-drawer')!;
  const scrim = document.getElementById('hud-menu-scrim')!;
  drawer.classList.add('open');
  scrim.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  haptic(8);
}
export function closeHudDrawer(): void {
  const drawer = document.getElementById('hud-menu-drawer')!;
  const scrim = document.getElementById('hud-menu-scrim')!;
  drawer.classList.remove('open');
  scrim.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
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
  // Offer-bubble pip: lit when there's a free daily reward to claim
  // (Daily Wheel hasn't been spun today). This mirrors Hay Day's
  // gift bubble that hints "there's a freebie waiting".
  const offerPip = document.getElementById('offer-bubble-pip');
  if (offerPip) {
    if (canSpin()) offerPip.removeAttribute('hidden');
    else offerPip.setAttribute('hidden', '');
  }
  // Mailbox bubble — count of unread letters.
  const mailCount = unreadCount();
  const mailEl = document.getElementById('mailbox-bubble-count');
  if (mailEl) {
    if (mailCount > 0) {
      mailEl.removeAttribute('hidden');
      mailEl.textContent = mailCount > 99 ? '99+' : String(mailCount);
    } else {
      mailEl.setAttribute('hidden', '');
    }
  }
  // Mailbox pip in the More sheet
  const mailPip = document.getElementById('mailbox-pip');
  if (mailPip) {
    if (mailCount > 0) mailPip.removeAttribute('hidden');
    else mailPip.setAttribute('hidden', '');
  }
  // Surprise box bubble — visible only when one is pending.
  const surpriseBubble = document.getElementById('surprise-bubble');
  if (surpriseBubble) {
    if (hasPendingBox()) surpriseBubble.removeAttribute('hidden');
    else surpriseBubble.setAttribute('hidden', '');
  }
  const surprisePip = document.getElementById('surprise-pip');
  if (surprisePip) {
    if (hasPendingBox()) surprisePip.removeAttribute('hidden');
    else surprisePip.setAttribute('hidden', '');
  }
  // Piggy bank bubble — only show after the player has unlocked the
  // delivery loop and the piggy has begun to fill (>=1 gem stored).
  const piggyBubble = document.getElementById('piggy-bubble');
  const piggyCount = document.getElementById('piggy-bubble-count');
  if (piggyBubble && state.piggyBank) {
    if (state.piggyBank.gems > 0) {
      piggyBubble.removeAttribute('hidden');
      if (piggyCount) piggyCount.textContent = String(state.piggyBank.gems);
      // Pulse when can break
      if (piggyPct() >= 0.3) {
        piggyBubble.classList.add('piggy-bubble--ready');
      } else {
        piggyBubble.classList.remove('piggy-bubble--ready');
      }
    } else {
      piggyBubble.setAttribute('hidden', '');
    }
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

  // Hamburger menu (top-left)
  const menuBtn = document.getElementById('hud-menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', openHudDrawer);
  const drawerScrim = document.getElementById('hud-menu-scrim');
  if (drawerScrim) drawerScrim.addEventListener('click', closeHudDrawer);

  // Every .sheet-btn closes whichever sheet/drawer it belongs to, then
  // forwards to the real hidden trigger button. Teaser-state buttons
  // short-circuit to a friendly toast instead of opening a panel.
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
      closeHudDrawer();
      setTimeout(() => {
        const real = document.getElementById(targetId);
        if (real) real.click();
      }, 80);
    });
  });

  // Re-center (More sheet)
  const reBtn = document.getElementById('recenter-btn');
  if (reBtn) {
    reBtn.addEventListener('click', () => {
      closeMoreSheet();
      recenterCamera();
    });
  }
  // Re-center (Hamburger drawer)
  const reBtnD = document.getElementById('hud-menu-recenter');
  if (reBtnD) {
    reBtnD.addEventListener('click', () => {
      closeHudDrawer();
      recenterCamera();
    });
  }

  // Music toggle inside sheets → triggers the real one
  const musicSheet = document.getElementById('music-toggle-sheet');
  if (musicSheet) {
    musicSheet.addEventListener('click', () => {
      const real = document.getElementById('music-toggle');
      if (real) real.click();
      const icon = document.getElementById('music-toggle-sheet-icon')!;
      icon.textContent = state.musicOn ? '🎵' : '🔇';
    });
  }
  const musicDrawer = document.getElementById('hud-menu-music');
  if (musicDrawer) {
    musicDrawer.addEventListener('click', () => {
      const real = document.getElementById('music-toggle');
      if (real) real.click();
      const icon = document.getElementById('hud-menu-music-icon')!;
      icon.textContent = state.musicOn ? '🎵' : '🔇';
    });
  }

  // Quests / Social FAB (bottom-right corner)
  const fab = document.getElementById('open-quests-fab');
  if (fab) fab.addEventListener('click', openSidePanel);
  const sideScrim = document.getElementById('side-panel-scrim');
  if (sideScrim) sideScrim.addEventListener('click', closeSidePanel);
  const sideClose = document.getElementById('side-panel-close');
  if (sideClose) sideClose.addEventListener('click', closeSidePanel);

  // Offer / gift bubble (top-right) — routes to the Daily Wheel as a quick
  // gift surface. Mirrors Hay Day's gift bubble that opens deals/offers.
  const offerBtn = document.getElementById('offer-bubble');
  if (offerBtn) {
    offerBtn.addEventListener('click', () => {
      const wheel = document.getElementById('open-wheel');
      if (wheel) wheel.click();
      else {
        const daily = document.getElementById('open-daily');
        if (daily) daily.click();
      }
    });
  }
  // Mailbox bubble — opens mailbox panel.
  const mailBubble = document.getElementById('mailbox-bubble');
  if (mailBubble) {
    mailBubble.addEventListener('click', () => {
      const real = document.getElementById('open-mailbox');
      if (real) real.click();
    });
  }
  // Surprise box bubble — opens surprise box reveal.
  const surpriseBubble = document.getElementById('surprise-bubble');
  if (surpriseBubble) {
    surpriseBubble.addEventListener('click', () => {
      const real = document.getElementById('open-surprise');
      if (real) real.click();
    });
  }
  // Piggy bank bubble — opens piggy bank panel.
  const piggyBubble = document.getElementById('piggy-bubble');
  if (piggyBubble) {
    piggyBubble.addEventListener('click', () => {
      const real = document.getElementById('open-piggy');
      if (real) real.click();
    });
  }
  // Hamburger drawer: Scenic Mode toggle.
  const scenicBtn = document.getElementById('hud-menu-scenic');
  if (scenicBtn) {
    scenicBtn.addEventListener('click', () => {
      closeHudDrawer();
      setTimeout(() => setScenicMode(true), 200);
    });
  }
  // Hamburger drawer: Edit Mode toggle.
  const editBtn = document.getElementById('hud-menu-edit');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      closeHudDrawer();
      setTimeout(toggleEditMode, 200);
      updateEditBanner();
    });
  }
  // Edit Mode banner exit button.
  const editExit = document.getElementById('edit-banner-exit');
  if (editExit) {
    editExit.addEventListener('click', () => {
      setEditMode(false);
      updateEditBanner();
    });
  }
  // Observe edit-mode class changes to keep the banner in sync.
  const obs = new MutationObserver(updateEditBanner);
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Gem-pill leads to the shop (premium tab) as the simplest "spend gems"
  // affordance. Real games use this to open a gem store.
  const gemBtn = document.getElementById('gem-badge');
  if (gemBtn) {
    gemBtn.addEventListener('click', () => {
      toast('Diamonds — earned from Level-ups, Daily Wheel and Achievements.');
      sfx.click();
    });
  }
  // Coin-pill: same intent — quick info / route to shop's sell tab.
  const coinBtn = document.getElementById('coin-badge');
  if (coinBtn) {
    coinBtn.addEventListener('click', () => {
      const shop = document.getElementById('open-shop');
      if (shop) shop.click();
    });
  }

  // Placing banner cancel
  const placeCancel = document.getElementById('placing-cancel');
  if (placeCancel) {
    placeCancel.addEventListener('click', () => {
      state.placing = null;
      updatePlacingBanner();
      sfx.click();
    });
  }

  // Attach the same sprite backgrounds for sheet/drawer icons.
  setBgImage('ico-inv-m',    sprites.item.inv!);
  setBgImage('ico-decor-m',  sprites.item.decor!);
  setBgImage('ico-trophy-m', sprites.item.trophy!);
  setBgImage('ico-news-m',   sprites.item.news!);
  setBgImage('ico-save-m',   sprites.item.save!);
  setBgImage('ico-help-m',   sprites.item.help!);
  setBgImage('ico-inv-d',    sprites.item.inv!);
  setBgImage('ico-decor-d',  sprites.item.decor!);
  setBgImage('ico-trophy-d', sprites.item.trophy!);
  setBgImage('ico-news-d',   sprites.item.news!);
  setBgImage('ico-save-d',   sprites.item.save!);
  setBgImage('ico-help-d',   sprites.item.help!);

  // Initial music icon in sheet/drawer
  const ic = document.getElementById('music-toggle-sheet-icon');
  if (ic) ic.textContent = state.musicOn ? '🎵' : '🔇';
  const icD = document.getElementById('hud-menu-music-icon');
  if (icD) icD.textContent = state.musicOn ? '🎵' : '🔇';
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
