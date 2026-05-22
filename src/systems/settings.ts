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
      scenicMode: false,
      hapticOn: true,
    };
  }
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

export function toggleSetting(key: keyof NonNullable<typeof state.settings>): void {
  initSettings();
  state.settings![key] = !state.settings![key];
  applySettings();
  sfx.click();
  track('settings_toggle', { key, value: state.settings![key] });
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
