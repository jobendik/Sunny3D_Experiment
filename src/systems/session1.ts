// =============================================================
//  SESSION-1 TELEMETRY  — measures the first 90 seconds of play.
//
//  Why this exists: "polish the first 90 seconds" is impossible to
//  do honestly without data. This module records when a brand-new
//  player completes each step of the core loop (plow → plant →
//  harvest → first coin) AND whether they were still around at
//  the 30 / 60 / 90 second marks. Each event fires AT MOST ONCE
//  per fresh save; resumed sessions don't fire any of these.
//
//  All events flow through the existing telemetry buffer in
//  `telemetry.ts` (localStorage-only, no network). Inspect via:
//    window.saTel.metricsSummary()
//    window.saTel.getEvents().filter(e => e.e.startsWith('s1_'))
// =============================================================

import { track } from './telemetry';

const FIRED = new Set<string>();
let bootMs = 0;
let splashDismissedMs = 0;
let isFreshSession = false;

/**
 * Call once during init(), with `freshSession = !loaded`. Establishes
 * the boot timestamp and schedules the 30/60/90 s "still alive" pings.
 * No-op for resumed sessions — we only care about the first session.
 */
export function initSession1(freshSession: boolean): void {
  isFreshSession = freshSession;
  bootMs = performance.now();
  if (!freshSession) return;
  track('s1_boot');
  // "Still alive at T" pings. These fire only if the page is still
  // open at the milestone — if the player closes the tab earlier,
  // these never fire, and that absence IS the signal we want.
  schedulePing(30_000, 's1_30s');
  schedulePing(60_000, 's1_60s');
  schedulePing(90_000, 's1_90s');
}

function schedulePing(delayMs: number, event: string): void {
  window.setTimeout(() => {
    if (document.visibilityState === 'hidden') {
      // Player tabbed away — don't count this as alive-at-T.
      return;
    }
    track(event, { ms: Math.round(performance.now() - bootMs) });
  }, delayMs);
}

/** Record that the branded splash CTA was tapped / dismissed. */
export function markSplashDismissed(): void {
  if (!isFreshSession) return;
  splashDismissedMs = performance.now();
  markFirst('s1_splash_dismissed', { ms_from_boot: Math.round(splashDismissedMs - bootMs) });
}

/**
 * Fire a first-of-its-kind event once per fresh session.
 * Subsequent calls with the same name are dropped.
 */
export function markFirst(
  event: string,
  extra?: Record<string, string | number | boolean | null>,
): void {
  if (!isFreshSession) return;
  if (FIRED.has(event)) return;
  FIRED.add(event);
  const nowMs = performance.now();
  const props: Record<string, string | number | boolean | null> = {
    ms_from_boot: Math.round(nowMs - bootMs),
    ...(splashDismissedMs > 0
      ? { ms_from_splash: Math.round(nowMs - splashDismissedMs) }
      : {}),
    ...(extra ?? {}),
  };
  track(event, props);
}
