// =============================================================
//  SPECIALIZATIONS — strategic branch picks. First pick at level 5
//  (the player can switch but it costs coins after the first
//  free pick). A secondary minor branch unlocks at level 15.
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { SPECIALIZATIONS, type SpecBranch, type SpecEffects } from '../data/specializations';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';

export function initSpecializations(): void {
  if (!state.specialization) {
    state.specialization = { primary: null, secondary: null, switches: 0 };
  }
}

export function canPickPrimary(): boolean {
  return state.level >= CONFIG.specializations.pickAtLevel && !state.specialization?.primary;
}

export function canPickSecondary(): boolean {
  if (state.level < CONFIG.specializations.secondaryAtLevel) return false;
  if (!state.specialization?.primary) return false;
  return !state.specialization.secondary;
}

export function pickPrimary(branch: SpecBranch, free = false): boolean {
  initSpecializations();
  const s = state.specialization!;
  if (s.primary === branch) return false;
  // First pick is free; subsequent switches cost gold scaled by level.
  if (s.primary && !free) {
    const cost = 500 + state.level * 100;
    if (state.coins < cost) {
      toast(`Switch costs ${cost} coins`, 'error');
      sfx.cantAfford();
      return false;
    }
    state.coins -= cost;
    s.switches += 1;
  }
  s.primary = branch;
  sfx.bell();
  toast(`Specialization: ${SPECIALIZATIONS[branch].name}!`, 'gold');
  track('spec_picked_primary', { branch, switched: !free });
  updateHUD();
  return true;
}

export function pickSecondary(branch: SpecBranch): boolean {
  initSpecializations();
  const s = state.specialization!;
  if (branch === s.primary) return false; // disallow same branch
  s.secondary = branch;
  sfx.bell();
  toast(`Secondary path: ${SPECIALIZATIONS[branch].name}`, 'gold');
  track('spec_picked_secondary', { branch });
  return true;
}

// Combined effects from primary (full) + secondary (half).
export function specEffects(): SpecEffects {
  const s = state.specialization;
  if (!s) return {};
  const eff: SpecEffects = {};
  const add = (src: SpecEffects | undefined, mult: number): void => {
    if (!src) return;
    for (const k of Object.keys(src) as Array<keyof SpecEffects>) {
      const v = src[k];
      if (typeof v === 'number') eff[k] = (eff[k] ?? 0) + v * mult;
    }
  };
  if (s.primary) add(SPECIALIZATIONS[s.primary].effects, 1.0);
  if (s.secondary) add(SPECIALIZATIONS[s.secondary].effects, 0.5);
  return eff;
}
