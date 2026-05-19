// =============================================================
//  TELEMETRY  — lightweight, local-first event log.
//  Survives reloads in localStorage, capped to MAX_EVENTS.
//  Use track('event', { props }) anywhere.
//  No network calls; perfectly safe for browser-only deployment.
// =============================================================

import { flag } from './flags';

const KEY = 'sunnyacres-telemetry-v1';
const MAX_EVENTS = 500;
const SCHEMA_VERSION = 'v1';

export interface TelemetryEvent {
  t: number;
  v: string;
  e: string;
  p?: Record<string, string | number | boolean | null>;
}

let buffer: TelemetryEvent[] | null = null;
let flushTimer: number | null = null;

function load(): TelemetryEvent[] {
  if (buffer) return buffer;
  try {
    const raw = localStorage.getItem(KEY);
    buffer = raw ? JSON.parse(raw) : [];
  } catch {
    buffer = [];
  }
  return buffer!;
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(buffer ?? []));
    } catch { /* storage full — drop */ }
  }, 1000);
}

export function track(
  e: string,
  p?: Record<string, string | number | boolean | null>,
): void {
  if (!flag('telemetry')) return;
  const buf = load();
  buf.push({ t: Date.now(), v: SCHEMA_VERSION, e, ...(p ? { p } : {}) });
  if (buf.length > MAX_EVENTS) buf.splice(0, buf.length - MAX_EVENTS);
  scheduleFlush();
}

export function getEvents(): TelemetryEvent[] {
  return load().slice();
}

export function clearTelemetry(): void {
  buffer = [];
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// quick diagnostic snapshot
export function metricsSummary(): Record<string, number> {
  const evs = load();
  const out: Record<string, number> = {};
  for (const ev of evs) out[ev.e] = (out[ev.e] ?? 0) + 1;
  return out;
}

// console exposure
if (typeof window !== 'undefined') {
  (window as unknown as { saTel?: unknown }).saTel = {
    track, getEvents, clearTelemetry, metricsSummary,
  };
}
