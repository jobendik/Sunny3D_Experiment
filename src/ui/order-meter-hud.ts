// =============================================================
//  ORDER METER HUD — top-center macro-progress bar.
//  Tap = open the Order Board side-panel (same surface QEB uses).
// =============================================================

import { state } from '../state';
import { meterPercent, initOrderMeter } from '../systems/order-meter';
import { openSidePanel } from './mobile-shell';

let lastPct = -1;
let lastCycle = -1;
let bound = false;

export function bindOrderMeter(): void {
  if (bound) return;
  bound = true;
  document.getElementById('order-meter')?.addEventListener('click', () => {
    openSidePanel();
  });
}

export function renderOrderMeter(): void {
  initOrderMeter();
  const m = state.orderMeter!;
  const pct = meterPercent();
  if (pct === lastPct && m.totalCycles === lastCycle) return;
  // Trigger a small "complete" pop only when the cycle increments.
  const justCompleted = m.totalCycles !== lastCycle && lastCycle !== -1;
  lastPct = pct;
  lastCycle = m.totalCycles;

  const fill = document.getElementById('order-meter-fill');
  if (fill) fill.style.width = (pct * 100).toFixed(1) + '%';
  const label = document.getElementById('order-meter-label');
  if (label) label.textContent = `${m.progress} / ${m.threshold}`;

  const root = document.getElementById('order-meter');
  if (root && justCompleted) {
    root.classList.add('order-meter--burst');
    setTimeout(() => root.classList.remove('order-meter--burst'), 1100);
  }
}
