// =============================================================
//  SEASON PASS — a 28-day track with daily-points required to
//  reach each tier. Free track always available; missing tiers
//  are recovered with talent / coin nudges. Critical for D2-D14
//  retention because each unclaimed tier is a visible loss.
// =============================================================

import { state } from '../state';
import { addXP } from './xp';
import { addItem } from './inventory';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { updateHUD } from '../ui/hud';
import { localDayIndex } from './daily';

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
}

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

export function initPass(): void {
  if (!state.pass) {
    state.pass = {
      startDay: localDayIndex(),
      durationDays: PASS_LENGTH_DAYS,
      points: 0,
      tier: 0,
      claimed: [],
    };
  }
  rolloverIfExpired();
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

export function claimPassTier(tier: number): boolean {
  const p = state.pass!;
  if (tier > p.tier) return false;
  if (p.claimed.includes(tier)) return false;
  const def = PASS_TIERS[tier - 1];
  if (!def) return false;
  def.reward();
  p.claimed.push(tier);
  sfx.bell(); sfx.coin();
  track('pass_tier_claimed', { tier });
  updateHUD();
  return true;
}
