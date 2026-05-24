// =============================================================
//  HABITAT PARTNERSHIP TRACKER — Phase 10.2 (Real-World CSR)
//
//  Pure cosmetic + narrative tracker, in the spirit of FV3's
//  Vital Ground / Dots.eco style partnerships. The number is
//  symbolic — it accrues from in-game progression milestones
//  and never represents real currency. The Awards panel uses it
//  to show the player they've contributed to a virtual habitat
//  restoration goal.
//
//  No outbound network calls, no real donation prompts.
// =============================================================

import { state } from '../state';
import { track } from './telemetry';
import type { HabitatPartnerRoot } from '../types';

const MILESTONES: number[] = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

// Each contribution source converts player activity into "symbolic
// acres restored". Small numbers so a few sessions of play take a
// player to a meaningful milestone without trivializing it.
const CONTRIBUTION_WEIGHTS: Record<HabitatSource, number> = {
  harvest: 0.02,
  order: 0.15,
  fish: 0.05,
  sale: 0.03,
  landmark: 4,
  expedition: 1.2,
  weatherCast: 0.4,
  donate: 0.6,
};

export type HabitatSource = 'harvest' | 'order' | 'fish' | 'sale' | 'landmark' | 'expedition' | 'weatherCast' | 'donate';

export function initHabitatPartner(): void {
  if (!state.habitatPartner) {
    state.habitatPartner = {
      acresRestored: 0,
      lastMilestoneShown: 0,
      contributions: {
        harvest: 0,
        order: 0,
        fish: 0,
        sale: 0,
        landmark: 0,
        expedition: 0,
        weatherCast: 0,
        donate: 0,
      },
    };
  } else if (!state.habitatPartner.contributions) {
    state.habitatPartner.contributions = {
      harvest: 0, order: 0, fish: 0, sale: 0,
      landmark: 0, expedition: 0, weatherCast: 0, donate: 0,
    };
  }
}

export function recordHabitatContribution(source: HabitatSource, n = 1): number {
  if (n <= 0) return 0;
  initHabitatPartner();
  const root = state.habitatPartner!;
  const weight = CONTRIBUTION_WEIGHTS[source] ?? 0;
  const gain = +(n * weight).toFixed(3);
  if (gain <= 0) return 0;
  root.acresRestored = +(root.acresRestored + gain).toFixed(3);
  root.contributions[source] = (root.contributions[source] ?? 0) + n;
  return gain;
}

export function habitatAcres(): number {
  initHabitatPartner();
  return state.habitatPartner!.acresRestored;
}

export function habitatNextMilestone(): number {
  initHabitatPartner();
  const acres = state.habitatPartner!.acresRestored;
  for (const m of MILESTONES) {
    if (acres < m) return m;
  }
  return MILESTONES[MILESTONES.length - 1]!;
}

export function habitatPrevMilestone(): number {
  initHabitatPartner();
  const acres = state.habitatPartner!.acresRestored;
  let prev = 0;
  for (const m of MILESTONES) {
    if (acres >= m) prev = m;
    else break;
  }
  return prev;
}

/** True if the player has reached a milestone they haven't seen yet. */
export function habitatHasNewMilestone(): boolean {
  initHabitatPartner();
  const root = state.habitatPartner!;
  const prev = habitatPrevMilestone();
  return prev > 0 && prev > root.lastMilestoneShown;
}

export function markHabitatMilestoneSeen(): void {
  initHabitatPartner();
  const root = state.habitatPartner!;
  const prev = habitatPrevMilestone();
  if (prev > root.lastMilestoneShown) {
    root.lastMilestoneShown = prev;
    track('habitat_milestone_seen', { acres: prev });
  }
}

export function habitatContributionTotals(): HabitatPartnerRoot['contributions'] {
  initHabitatPartner();
  return state.habitatPartner!.contributions;
}

export { MILESTONES as HABITAT_MILESTONES };
