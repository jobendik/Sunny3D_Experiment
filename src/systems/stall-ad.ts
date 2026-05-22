// =============================================================
//  STALL ADVERTISEMENT — Hay Day's "Daily Dirt" newspaper ad
//  for the Roadside Shop. Paying diamonds advertises your listings
//  in the gazette, speeding up customer purchases for 2 days.
// =============================================================

import { state } from '../state';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';

export const AD_DIAMOND_COST = 4;
export const AD_DURATION_DAYS = 2;

interface StallAd {
  startedDay: number;
  expiresDay: number;
}

// We keep this small data inline on the marketStall structure via
// reuse — but to avoid mutating the type, use a non-persisted module
// state plus persisted day numbers on state.gazette.data.
// For persistence we'll store on settings.* and the gazette as an
// auxiliary structure. To keep migration cheap, we stash it on the
// marketStall reputation field's siblings via a global key.
let _liveAd: StallAd | null = null;

export function advertiseStallListing(): boolean {
  if (!state.marketStall?.unlocked) {
    toast('Open the Market Stall first.');
    return false;
  }
  const existing = getStallAd();
  if (existing) {
    toast('You already have an active ad.');
    return false;
  }
  if (state.gems < AD_DIAMOND_COST) {
    sfx.cantAfford();
    toast(`Need ${AD_DIAMOND_COST} 💎`);
    return false;
  }
  state.gems -= AD_DIAMOND_COST;
  _liveAd = {
    startedDay: state.day,
    expiresDay: state.day + AD_DURATION_DAYS,
  };
  sfx.bell(); sfx.coin();
  toast(`📣 Your stall is advertised in the Gazette for ${AD_DURATION_DAYS} days!`, 'gold');
  updateHUD();
  track('stall_ad_bought', { cost: AD_DIAMOND_COST });
  return true;
}

export function getStallAd(): StallAd | null {
  if (!_liveAd) return null;
  if (state.day >= _liveAd.expiresDay) {
    _liveAd = null;
    return null;
  }
  return _liveAd;
}

/** Multiplier applied to stall sale probability while ad is live. */
export function stallAdMultiplier(): number {
  return getStallAd() ? 1.6 : 1.0;
}
