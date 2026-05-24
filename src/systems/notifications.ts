// =============================================================
//  NOTIFICATIONS - opt-in browser notification helper.
//
//  Normal play only uses toasts. This helper asks permission from a
//  user click and quietly falls back to in-game feedback when the
//  browser does not support the Notifications API.
// =============================================================

import { state } from '../state';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { initSettings } from './settings';

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function notificationsEnabled(): boolean {
  initSettings();
  return !!state.settings?.notificationsOn &&
    notificationSupported() &&
    Notification.permission === 'granted';
}

export async function requestGameNotifications(): Promise<boolean> {
  initSettings();
  if (!notificationSupported()) {
    toast('Browser notifications are not available here.', 'red');
    track('notifications_unavailable');
    return false;
  }
  if (Notification.permission === 'denied') {
    state.settings!.notificationsOn = false;
    toast('Notifications are blocked in the browser settings.', 'red');
    track('notifications_denied');
    return false;
  }
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  const enabled = permission === 'granted';
  state.settings!.notificationsOn = enabled;
  toast(enabled ? 'Gift alerts enabled.' : 'Gift alerts left off.', enabled ? 'gold' : undefined);
  track('notifications_permission', { permission });
  return enabled;
}

export function setGameNotifications(on: boolean): void {
  initSettings();
  state.settings!.notificationsOn = on && notificationSupported() && Notification.permission === 'granted';
  track('notifications_toggle', { on: !!state.settings!.notificationsOn });
}

export function sendGameNotification(title: string, body: string): void {
  if (!notificationsEnabled()) return;
  try {
    const n = new Notification(title, {
      body,
      tag: 'sunny-acres-club',
      silent: true,
    });
    window.setTimeout(() => n.close(), 6500);
  } catch {
    state.settings!.notificationsOn = false;
  }
}
