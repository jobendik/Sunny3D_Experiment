// =============================================================
//  SEASON PASS — a 28-day track with daily-points required to
//  reach each tier. Free track always available; missing tiers
//  are recovered with talent / coin nudges. Critical for D2-D14
//  retention because each unclaimed tier is a visible loss.
//
//  Multi-tier (FV3-grammar) — Free, Elite, Platinum tracks.
//  ALL THREE TRACKS ARE EARNED THROUGH GAMEPLAY (CrazyGames
//  prohibits real-money monetization). Elite unlocks after the
//  player completes 3 Order-Board cycles in this pass; Platinum
//  unlocks after 8 cycles. Premium tiers cannot be purchased.
// =============================================================

import { state } from '../state';
import { addXP } from './xp';
import { addItem } from './inventory';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { updateHUD } from '../ui/hud';
import { localDayIndex } from './daily';

export type PassTrack = 'free' | 'elite' | 'platinum';

export interface PassTier {
  tier: number;
  pointsRequired: number;
  rewardLabel: string;
  reward: () => void;
}

export interface SeasonPassState {
  startDay: number;
  durationDays: number;
  points: number;
  tier: number;
  claimed: number[];
  /** Premium-tier claim ledger, keyed by track. */
  claimedElite?: number[];
  claimedPlatinum?: number[];
  /** Order-Board cycles completed during this pass (drives unlocks). */
  cyclesThisPass?: number;
}

/** Cycle thresholds at which the elite + platinum tracks earn their
 *  gameplay unlock. Tweakable; chosen so a moderately engaged player
 *  unlocks Elite mid-pass and Platinum near the end. */
export const ELITE_CYCLES_REQUIRED = 3;
export const PLATINUM_CYCLES_REQUIRED = 8;

export const PASS_LENGTH_DAYS = 28;
export const POINTS_PER_TIER = 90; // ~ a full day of play per tier

const REWARDS: Array<Omit<PassTier, 'tier'>> = [
  { pointsRequired: POINTS_PER_TIER * 1, rewardLabel: '+250💰',
    reward: () => { state.coins += 250; state.stats.earned += 250; toast('Pass: +250💰', 'gold'); } },
  { pointsRequired: POINTS_PER_TIER * 2, rewardLabel: '+25 XP',
    reward: () => { addXP(25); toast('Pass: +25 XP', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 3, rewardLabel: '+3 Feed',
    reward: () => { addItem('feed', 3); toast('Pass: +3 Feed', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 4, rewardLabel: '+500💰',
    reward: () => { state.coins += 500; state.stats.earned += 500; toast('Pass: +500💰', 'gold'); } },
  { pointsRequired: POINTS_PER_TIER * 5, rewardLabel: '+1 Fertilizer',
    reward: () => { addItem('fertilizer', 1); toast('Pass: +1 fertilizer', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 6, rewardLabel: '+50 XP',
    reward: () => { addXP(50); toast('Pass: +50 XP', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 7, rewardLabel: '+1 Speed Boost',
    reward: () => { addItem('speedup', 1); toast('Pass: +1 Speed Boost', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 8, rewardLabel: '+1000💰',
    reward: () => { state.coins += 1000; state.stats.earned += 1000; toast('Pass: +1000💰', 'gold'); } },
  { pointsRequired: POINTS_PER_TIER * 9, rewardLabel: '+1 Quality Ink',
    reward: () => { addItem('qualityink', 1); toast('Pass: +1 Quality Ink', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 10, rewardLabel: '+100 XP',
    reward: () => { addXP(100); toast('Pass: +100 XP', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 12, rewardLabel: '+1 Priority',
    reward: () => { addItem('priority', 1); toast('Pass: +1 Priority', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 14, rewardLabel: '+2000💰',
    reward: () => { state.coins += 2000; state.stats.earned += 2000; toast('Pass: +2000💰', 'gold'); } },
  { pointsRequired: POINTS_PER_TIER * 17, rewardLabel: '+200 XP',
    reward: () => { addXP(200); toast('Pass: +200 XP', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 20, rewardLabel: '+3 Quality Ink',
    reward: () => { addItem('qualityink', 3); toast('Pass: +3 Quality Ink', 'xp'); } },
  { pointsRequired: POINTS_PER_TIER * 24, rewardLabel: '+5000💰',
    reward: () => { state.coins += 5000; state.stats.earned += 5000; toast('Pass: HUGE +5000💰', 'gold'); } },
  { pointsRequired: POINTS_PER_TIER * 28, rewardLabel: '+500 XP, +5 Priority',
    reward: () => { addXP(500); addItem('priority', 5); toast('🏆 PASS COMPLETE!', 'gold'); } },
];

export const PASS_TIERS: PassTier[] = REWARDS.map((r, i) => ({ ...r, tier: i + 1 }));

/** Elite track — earned via 3 Order-Board cycles. Rewards lean toward
 *  growth-accelerators (XP, materials, boosts). */
const ELITE_REWARDS: Array<Omit<PassTier, 'tier'>> = REWARDS.map((r, i) => ({
  pointsRequired: r.pointsRequired,
  rewardLabel: i % 2 === 0 ? `+50 XP · +1 Fert` : `+1 Speed · +1 Ink`,
  reward: i % 2 === 0
    ? (): void => { addXP(50); addItem('fertilizer', 1); toast('Elite Pass: +50 XP, +1 fertilizer', 'gold'); }
    : (): void => { addItem('speedup', 1); addItem('qualityink', 1); toast('Elite Pass: +1 speed, +1 ink', 'gold'); },
}));
export const PASS_TIERS_ELITE: PassTier[] = ELITE_REWARDS.map((r, i) => ({ ...r, tier: i + 1 }));

/** Platinum track — earned via 8 Order-Board cycles. Rare materials,
 *  bigger coin lumps and signature "Scout Favor" event tokens. */
const PLATINUM_REWARDS: Array<Omit<PassTier, 'tier'>> = REWARDS.map((r, i) => ({
  pointsRequired: r.pointsRequired,
  rewardLabel: i % 3 === 0 ? `+800💰 · +1 Priority` : i % 3 === 1 ? `+100 XP · +2 Ink` : `+3 Speed · +2 Fert`,
  reward: i % 3 === 0
    ? (): void => { state.coins += 800; state.stats.earned += 800; addItem('priority', 1); toast('Platinum Pass: +800💰, +1 Priority', 'gold'); }
    : i % 3 === 1
    ? (): void => { addXP(100); addItem('qualityink', 2); toast('Platinum Pass: +100 XP, +2 ink', 'gold'); }
    : (): void => { addItem('speedup', 3); addItem('fertilizer', 2); toast('Platinum Pass: +3 speed, +2 fertilizer', 'gold'); },
}));
export const PASS_TIERS_PLATINUM: PassTier[] = PLATINUM_REWARDS.map((r, i) => ({ ...r, tier: i + 1 }));

export function initPass(): void {
  if (!state.pass) {
    state.pass = {
      startDay: localDayIndex(),
      durationDays: PASS_LENGTH_DAYS,
      points: 0,
      tier: 0,
      claimed: [],
      claimedElite: [],
      claimedPlatinum: [],
      cyclesThisPass: 0,
    };
  }
  // Backfill the new fields on old saves.
  if (!state.pass.claimedElite) state.pass.claimedElite = [];
  if (!state.pass.claimedPlatinum) state.pass.claimedPlatinum = [];
  if (state.pass.cyclesThisPass === undefined) state.pass.cyclesThisPass = 0;
  rolloverIfExpired();
}

export function isEliteUnlocked(): boolean {
  initPass();
  return (state.pass!.cyclesThisPass ?? 0) >= ELITE_CYCLES_REQUIRED;
}

export function isPlatinumUnlocked(): boolean {
  initPass();
  return (state.pass!.cyclesThisPass ?? 0) >= PLATINUM_CYCLES_REQUIRED;
}

/** Called by the order-meter when a cycle completes. Auto-announces
 *  premium-track unlocks on the rising edge. */
export function recordOrderCycle(): void {
  initPass();
  const p = state.pass!;
  const before = p.cyclesThisPass ?? 0;
  p.cyclesThisPass = before + 1;
  if (before < ELITE_CYCLES_REQUIRED && p.cyclesThisPass >= ELITE_CYCLES_REQUIRED) {
    toast('🏅 Elite Pass track unlocked!', 'gold');
    sfx.achievement();
  }
  if (before < PLATINUM_CYCLES_REQUIRED && p.cyclesThisPass >= PLATINUM_CYCLES_REQUIRED) {
    toast('💎 Platinum Pass track unlocked!', 'gold');
    sfx.achievement();
  }
}

export function rolloverIfExpired(): void {
  if (!state.pass) return;
  const today = localDayIndex();
  if (today >= state.pass.startDay + state.pass.durationDays) {
    state.pass = {
      startDay: today,
      durationDays: PASS_LENGTH_DAYS,
      points: 0,
      tier: 0,
      claimed: [],
      claimedElite: [],
      claimedPlatinum: [],
      cyclesThisPass: 0,
    };
    track('pass_rolled');
  }
}

export function passDaysLeft(): number {
  if (!state.pass) return PASS_LENGTH_DAYS;
  return Math.max(0, state.pass.startDay + state.pass.durationDays - localDayIndex());
}

export function addPassPoints(n: number): void {
  initPass();
  state.pass!.points += n;
  recomputeTier();
}

function recomputeTier(): void {
  const p = state.pass!;
  for (let i = PASS_TIERS.length - 1; i >= 0; i--) {
    if (p.points >= PASS_TIERS[i]!.pointsRequired) {
      p.tier = i + 1;
      return;
    }
  }
  p.tier = 0;
}

export function claimPassTier(tier: number, passTrack: PassTrack = 'free'): boolean {
  initPass();
  const p = state.pass!;
  if (tier > p.tier) return false;
  if (passTrack === 'elite' && !isEliteUnlocked()) return false;
  if (passTrack === 'platinum' && !isPlatinumUnlocked()) return false;
  const ledger = passTrack === 'free' ? p.claimed
    : passTrack === 'elite' ? (p.claimedElite ??= [])
    : (p.claimedPlatinum ??= []);
  if (ledger.includes(tier)) return false;
  const list = passTrack === 'free' ? PASS_TIERS
    : passTrack === 'elite' ? PASS_TIERS_ELITE
    : PASS_TIERS_PLATINUM;
  const def = list[tier - 1];
  if (!def) return false;
  def.reward();
  ledger.push(tier);
  sfx.bell(); sfx.coin();
  track('pass_tier_claimed', { tier, track: passTrack });
  updateHUD();
  return true;
}
