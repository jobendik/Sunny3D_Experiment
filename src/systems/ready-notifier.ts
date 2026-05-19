// =============================================================
//  READY NOTIFIER — flash the browser-tab title and favicon
//  when something interesting happens (production done,
//  crops ready, daily streak claimable). Works in background.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { cropStage } from './crops';
import { nowSeconds } from '../utils';
import { canClaimStreak, timedClaimReady } from './daily';

const ORIGINAL_TITLE = '🌾 Sunny Acres — A Farming Adventure';
let pinged = false;
let titleFlashTimer: number | null = null;
let titleToggle = false;

function readyCount(): number {
  let n = 0;
  for (const row of state.grid) {
    for (const t of row) if (t.crop && cropStage(t) === 3) n++;
  }
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def) continue;
    if (def.kind === 'pen' && state.penAnimals[b.id]) {
      const aniDef = ANIMALS[def.animal!];
      if (!aniDef) continue;
      for (const a of state.penAnimals[b.id]!) {
        if (nowSeconds() - a.lastProduced >= aniDef.produceTime) n++;
      }
    }
    if (def.kind === 'production' && state.prodQueues[b.id]) {
      for (const j of state.prodQueues[b.id]!) if (j.doneAt <= nowSeconds()) n++;
    }
  }
  return n;
}

export function tickReadyTitle(): void {
  if (typeof document === 'undefined') return;
  // Only do this when the tab is hidden
  if (!document.hidden) {
    if (titleFlashTimer !== null) {
      window.clearInterval(titleFlashTimer);
      titleFlashTimer = null;
    }
    if (document.title !== ORIGINAL_TITLE) document.title = ORIGINAL_TITLE;
    pinged = false;
    return;
  }
  const n = readyCount();
  const claimable = canClaimStreak() || timedClaimReady();
  const needPing = n > 0 || claimable;
  if (!needPing) {
    if (titleFlashTimer !== null) {
      window.clearInterval(titleFlashTimer);
      titleFlashTimer = null;
      document.title = ORIGINAL_TITLE;
    }
    pinged = false;
    return;
  }
  if (!pinged) {
    pinged = true;
    if (titleFlashTimer !== null) window.clearInterval(titleFlashTimer);
    titleFlashTimer = window.setInterval(() => {
      titleToggle = !titleToggle;
      if (claimable && n === 0) {
        document.title = titleToggle ? '🎁 Reward ready — Sunny Acres' : ORIGINAL_TITLE;
      } else {
        document.title = titleToggle ? `🌾 ${n} ready — Sunny Acres` : ORIGINAL_TITLE;
      }
    }, 1200);
  }
}

export function bindReadyNotifier(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', tickReadyTitle);
}
