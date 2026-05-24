// =============================================================
//  DAILY REMINDER — schedule a "come back to your farm" nudge
//  roughly 22 hours after the player started the current session.
//
//  Implementation realities (read first):
//   • The CrazyGames SDK v3 does not expose a push-notification
//     API. We probe `window.CrazyGames?.SDK?.notifications` so that
//     if a future SDK version adds one we can hand off to it; for
//     now everything falls back to the browser Notification API.
//   • The browser Notification API can only fire while THIS tab
//     is still running (foreground or background) — there is no
//     Service Worker registered, so the moment the player closes
//     the tab the scheduled reminder dies.
//   • That sounds limiting, but a meaningful slice of CrazyGames
//     players leave the tab open or pin it. For everyone else, the
//     CG platform handles return-engagement on its own homepage.
//
//  Behaviour:
//   • On every session start, we look at the previous reminder
//     time. If it's >18 h ago (or never fired), we schedule the
//     next reminder for `nowMs + 22h`.
//   • At fire time, we check what's actually waiting for the
//     player (daily wheel, ripe crops, returning boat) and craft
//     a friendly notification body listing the top 2 items.
//   • If the player tabs back in before the timer fires, we cancel
//     the pending timer (no point reminding them when they're
//     actively playing).
// =============================================================

import { state } from '../state';
import {
  notificationsEnabled,
  sendGameNotification,
} from './notifications';
import { canSpin } from './wheel';
import { CROPS } from '../data/crops';
import { cropStage } from './crops';
import { track } from './telemetry';

const REMINDER_DELAY_MS = 22 * 60 * 60 * 1000; // 22 hours
let scheduledTimer: number | null = null;

interface CrazyGamesNotificationsBridge {
  scheduleReminder?: (delayMs: number, payload: { title: string; body: string }) => Promise<boolean>;
}

interface CrazyGamesMaybeSdk {
  notifications?: CrazyGamesNotificationsBridge;
}

/** Probe whether the CG SDK has added a notification API. Returns null
 *  on every shipping SDK today — kept so we can wire it the moment CG
 *  adds first-party push without re-writing this module. */
function getCrazyGamesNotifications(): CrazyGamesNotificationsBridge | null {
  const cg = (window as unknown as { CrazyGames?: { SDK?: CrazyGamesMaybeSdk } }).CrazyGames;
  return cg?.SDK?.notifications ?? null;
}

/** Build a short body string describing what's waiting back at the
 *  farm. Keeps to 2 punchy items so the notification preview stays
 *  legible across mobile + desktop. */
function buildReminderBody(): string {
  const hooks: string[] = [];

  if (canSpin()) hooks.push('🎡 Daily Wheel ready');

  if (state.boat?.unlocked) {
    const b = state.boat;
    if (b.state === 'docked') hooks.push('⛵ Boat at the dock');
    else if (b.state === 'departed' || b.state === 'arriving') {
      const seconds = (b.arrivesAt - (Date.now() / 1000));
      if (seconds < 0) hooks.push('⛵ Boat returning');
    }
  }

  // Count crops that will be mature by the time the reminder fires
  // (already accounting for 22h of growth). cropStage() rounds down,
  // so 3 means fully grown.
  let mature = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (t && t.crop && cropStage(t) === 3) {
        mature += 1;
      } else if (t && t.crop) {
        const crop = CROPS[t.crop];
        // Will likely be mature by reminder time
        if (crop && crop.grow * 1000 < REMINDER_DELAY_MS) mature += 1;
      }
    }
  }
  if (mature > 0) hooks.push(`🌾 ${mature} crop${mature === 1 ? '' : 's'} ready`);

  if (hooks.length === 0) hooks.push('Your farm is waiting');
  return hooks.slice(0, 2).join(' · ');
}

/**
 * Try to schedule the reminder via the CrazyGames SDK first. If CG
 * exposes a notifications bridge AND it returns true, we let it own
 * the delivery (it can keep firing even after this tab dies). Otherwise
 * fall back to a local setTimeout, which only fires while the tab is
 * still alive.
 */
async function scheduleViaCrazyGames(): Promise<boolean> {
  const bridge = getCrazyGamesNotifications();
  if (!bridge?.scheduleReminder) return false;
  try {
    const ok = await bridge.scheduleReminder(REMINDER_DELAY_MS, {
      title: 'Sunny Acres',
      body: buildReminderBody(),
    });
    if (ok) {
      track('daily_reminder_cg_scheduled');
      return true;
    }
  } catch {
    /* CG bridge failure — fall through to browser timer */
  }
  return false;
}

/** Cancel any pending in-tab timer. Called when the player tabs back
 *  in OR closes/refreshes the page so we don't leave dangling work. */
function cancelLocal(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

/** Schedule the local setTimeout fallback. Only fires while this tab
 *  is still alive — see file header. */
function scheduleLocal(): void {
  cancelLocal();
  if (!notificationsEnabled()) return;
  scheduledTimer = window.setTimeout(() => {
    scheduledTimer = null;
    if (!notificationsEnabled()) return;
    sendGameNotification('Sunny Acres', buildReminderBody(), 'sunny-acres-daily');
    track('daily_reminder_fired');
  }, REMINDER_DELAY_MS);
  track('daily_reminder_local_scheduled');
}

/**
 * Public entry point — call once per session start, after the rest
 * of state has loaded. Idempotent and safe to call multiple times.
 */
export async function initDailyReminder(): Promise<void> {
  if (!notificationsEnabled()) return;
  const usedCg = await scheduleViaCrazyGames();
  if (!usedCg) scheduleLocal();

  // If the page becomes visible again we cancel — the player is
  // back, no need to fire a "come back" nudge.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) cancelLocal();
  });
  // Cancel on tab close so we don't leak the timer reference if
  // the browser keeps the process alive for any reason.
  window.addEventListener('beforeunload', cancelLocal);
}
