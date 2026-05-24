// =============================================================
//  SETTINGS — accessibility & display preferences.
//
//  Centralizes user toggles for:
//   - Reduced motion (slow/disable animations)
//   - Large text (boosts base font size)
//   - High contrast (heavier outlines + bolder color use)
//   - Family-friendly mode (hide chat-like surfaces, soft-filter
//     visitor labels)
//   - Scenic Mode (hide HUD to admire farm; tap anywhere to restore)
//   - Haptic feedback (mobile vibrations)
//
//  Each toggle is persisted in the save and applied via body class
//  + CSS variables. The reduced-motion preference also honours the
//  OS-level `prefers-reduced-motion` media query.
// =============================================================

import { state } from '../state';
import { track } from './telemetry';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';

export function initSettings(): void {
  if (!state.settings) {
    // Detect OS prefers-reduced-motion as default
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.settings = {
      reducedMotion: prefersReduced,
      largeText: false,
      highContrast: false,
      familyFriendly: false,
      notificationsOn: false,
      scenicMode: false,
      hapticOn: true,
    };
  }
  state.settings.notificationsOn = !!state.settings.notificationsOn;
  applySettings();
}

export function applySettings(): void {
  if (!state.settings) return;
  const body = document.body;
  body.classList.toggle('reduced-motion', !!state.settings.reducedMotion);
  body.classList.toggle('large-text', !!state.settings.largeText);
  body.classList.toggle('high-contrast', !!state.settings.highContrast);
  body.classList.toggle('family-friendly', !!state.settings.familyFriendly);
  body.classList.toggle('scenic-mode', !!state.settings.scenicMode);
}

export type SettingsBoolKey =
  | 'reducedMotion' | 'largeText' | 'highContrast'
  | 'familyFriendly' | 'notificationsOn' | 'scenicMode' | 'hapticOn';

export function toggleSetting(key: SettingsBoolKey): void {
  initSettings();
  const s = state.settings!;
  s[key] = !s[key];
  applySettings();
  sfx.click();
  track('settings_toggle', { key, value: !!s[key] });
}

export function setScenicMode(on: boolean): void {
  initSettings();
  state.settings!.scenicMode = on;
  applySettings();
  if (on) {
    toast('Scenic Mode — tap anywhere to exit.', 'xp');
  }
}

export function isScenicMode(): boolean {
  initSettings();
  return !!state.settings!.scenicMode;
}

export function isReducedMotion(): boolean {
  initSettings();
  return !!state.settings!.reducedMotion;
}

export function isFamilyFriendly(): boolean {
  initSettings();
  return !!state.settings!.familyFriendly;
}

export function hapticEnabled(): boolean {
  initSettings();
  return !!state.settings!.hapticOn;
}

/** Pace multiplier — slows crop growth and day length proportionally.
 *  1 = fast (default), 2 = cozy, 3 = relaxed. Settings panel writes
 *  `state.settings.gamePace`; everywhere else queries this helper so
 *  the value can be changed mid-session without sprinkling presets. */
export function paceMultiplier(): number {
  const p = state.settings?.gamePace ?? 'fast';
  if (p === 'cozy') return 2;
  if (p === 'relaxed') return 3;
  return 1;
}

export function setGamePace(pace: 'fast' | 'cozy' | 'relaxed'): void {
  initSettings();
  state.settings!.gamePace = pace;
  sfx.click();
  track('game_pace_set', { pace });
}
