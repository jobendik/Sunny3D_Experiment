// =============================================================
//  FEATURED EVENTS COORDINATOR
//
//  Keeps Phase-8 calendar events initialized/ticked together and
//  exposes compact helpers for the QEB, feature gate, world bubbles,
//  and generic live-event action hook.
// =============================================================

import {
  initSkyRace,
  tickSkyRace,
  recordSkyRaceAction,
  skyRaceActive,
  skyRaceHasAttention,
} from './sky-race';
import {
  initCountyFair,
  tickCountyFair,
  countyFairActive,
  countyFairHasAttention,
} from './county-fair';
import {
  initCountryCamping,
  tickCountryCamping,
  recordCountryCampingAction,
  countryCampingActive,
  countryCampingHasAttention,
} from './country-camping';
import {
  initFishingTournament,
  tickFishingTournament,
  recordFishingTournamentAction,
  fishingTournamentActive,
  fishingTournamentHasAttention,
} from './fishing-tournament';

export interface FeaturedEventEntry {
  id: string;
  icon: string;
  label: string;
  active: boolean;
  attention: boolean;
}

export function initFeaturedEvents(): void {
  initSkyRace();
  initCountyFair();
  initCountryCamping();
  initFishingTournament();
}

export function tickFeaturedEvents(): void {
  tickSkyRace();
  tickCountyFair();
  tickCountryCamping();
  tickFishingTournament();
}

export function recordFeaturedEventAction(actionId: string, itemKey?: string, qty = 1): void {
  recordSkyRaceAction(actionId, itemKey, qty);
  recordCountryCampingAction(actionId, itemKey, qty);
  recordFishingTournamentAction(actionId, itemKey, qty);
}

export function featuredEventEntries(): FeaturedEventEntry[] {
  initFeaturedEvents();
  return [
    {
      id: 'sky-race',
      icon: '\u{1F3C1}',
      label: 'Sky Race',
      active: skyRaceActive(),
      attention: skyRaceHasAttention(),
    },
    {
      id: 'county-fair',
      icon: '\u{1F3A1}',
      label: 'County Fair',
      active: countyFairActive(),
      attention: countyFairHasAttention(),
    },
    {
      id: 'country-camping',
      icon: '\u{1F3D5}\uFE0F',
      label: 'Camping',
      active: countryCampingActive(),
      attention: countryCampingHasAttention(),
    },
    {
      id: 'fishing-tournament',
      icon: '\u{1F3A3}',
      label: 'Fishing',
      active: fishingTournamentActive(),
      attention: fishingTournamentHasAttention(),
    },
  ];
}

export function featuredEventsHaveAttention(): boolean {
  return featuredEventEntries().some(e => e.active && e.attention);
}

export function anyFeaturedEventActive(): boolean {
  return featuredEventEntries().some(e => e.active);
}
