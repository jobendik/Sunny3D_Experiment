// =============================================================
//  AD REWARDS — CrazyGames rewarded-video bonus rewards.
//
//  When the CrazyGames SDK is active, the player can opt to watch
//  a short rewarded video in exchange for one of:
//   • +1 Daily Wheel spin            (scope: 'wheel')
//   • -30 minutes on the active boat timer  (scope: 'boat')
//   • 2× yield on the next harvested crop   (scope: 'harvest')
//
//  When the SDK is inactive (default offline build, dev preview,
//  GitHub-Pages copy), every offer returns false immediately and
//  the call sites fall back to the standard timed loop. Nothing
//  in this module ever blocks gameplay or makes network calls
//  unless the SDK has already been activated by the host page.
//
//  All state survives saves so a primed harvest boost or queued
//  bonus spin doesn't evaporate if the player closes the tab.
// =============================================================

import { state } from '../state';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from './../ui/hud';
import { track } from './telemetry';
import {
  crazyGamesActive,
  crazyGamesRewardedAd,
  crazyGamesPause,
  crazyGamesResume,
} from './crazygames';

export type AdScope = 'wheel' | 'boat' | 'harvest';

// 30 s cooldown between any two ad watches. CG's own SDK enforces
// its own platform-side cap, but this keeps the UI honest and
// stops accidental double-tap from queuing two ads.
const COOLDOWN_MS = 30_000;

export function initAdRewards(): void {
  if (!state.adRewards) {
    state.adRewards = {
      bonusSpins: 0,
      harvestBoostUses: 0,
      lastAdAt: 0,
      totalWatched: 0,
    };
  }
}

/** True when an ad is actually showable right now. Used by panels
 *  to decide whether to render the "Watch ad" button at all. */
export function canOfferAd(): boolean {
  if (!crazyGamesActive()) return false;
  initAdRewards();
  return Date.now() - state.adRewards!.lastAdAt >= COOLDOWN_MS;
}

/** ms until the next ad can be shown (0 if ready). */
export function adCooldownMs(): number {
  initAdRewards();
  return Math.max(0, COOLDOWN_MS - (Date.now() - state.adRewards!.lastAdAt));
}

/**
 * Show the rewarded ad. If the player completes it, apply the
 * scope's reward and return true. Returns false on any failure
 * (SDK unavailable, user skipped, cooldown active).
 */
export async function offerRewardedAd(scope: AdScope): Promise<boolean> {
  if (!canOfferAd()) return false;
  initAdRewards();
  // Pause the in-game loop hint to CG so the SDK doesn't double-count
  // session time during the ad break.
  crazyGamesPause();
  const ok = await crazyGamesRewardedAd();
  crazyGamesResume();
  if (!ok) {
    track('ad_cancelled', { scope });
    return false;
  }
  state.adRewards!.lastAdAt = Date.now();
  state.adRewards!.totalWatched += 1;
  applyReward(scope);
  track('ad_completed', { scope });
  return true;
}

function applyReward(scope: AdScope): void {
  initAdRewards();
  switch (scope) {
    case 'wheel': {
      state.adRewards!.bonusSpins += 1;
      toast('🎁 Bonus wheel spin unlocked!', 'gold');
      sfx.bell();
      break;
    }
    case 'boat': {
      const b = state.boat;
      if (!b) return;
      const skipS = 30 * 60;
      // Skip whichever timer the boat is currently waiting on. The
      // timer values are wall-clock seconds (nowSeconds()), so we
      // shift them backward to fast-forward.
      if (b.state === 'arriving' && b.arrivesAt > 0) {
        b.arrivesAt = Math.max(0, b.arrivesAt - skipS);
      } else if (b.state === 'docked' && b.departsAt > 0) {
        b.departsAt = Math.max(0, b.departsAt - skipS);
      } else if (b.state === 'departed' && b.arrivesAt > 0) {
        b.arrivesAt = Math.max(0, b.arrivesAt - skipS);
      }
      toast('⛵ Boat timer -30 minutes', 'gold');
      sfx.bell();
      break;
    }
    case 'harvest': {
      state.adRewards!.harvestBoostUses += 1;
      toast('🌾 Next harvest will be 2× yield!', 'gold');
      sfx.bell();
      break;
    }
  }
  updateHUD();
}

/**
 * Consume one queued 2×-yield boost. Returns the yield multiplier
 * to use (2 if a boost was banked, 1 otherwise). Call exactly once
 * per harvest event so the counter doesn't get drained prematurely.
 */
export function consumeHarvestBoost(): number {
  initAdRewards();
  if (state.adRewards!.harvestBoostUses > 0) {
    state.adRewards!.harvestBoostUses -= 1;
    return 2;
  }
  return 1;
}

/** Spend one banked bonus wheel spin. Returns true if one was consumed. */
export function consumeBonusSpin(): boolean {
  initAdRewards();
  if (state.adRewards!.bonusSpins > 0) {
    state.adRewards!.bonusSpins -= 1;
    return true;
  }
  return false;
}

/** True when at least one bonus spin is banked. */
export function hasBonusSpin(): boolean {
  initAdRewards();
  return state.adRewards!.bonusSpins > 0;
}

/** True when at least one harvest boost is queued. */
export function hasHarvestBoost(): boolean {
  initAdRewards();
  return state.adRewards!.harvestBoostUses > 0;
}
