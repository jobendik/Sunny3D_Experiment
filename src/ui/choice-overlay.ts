// =============================================================
//  CHOICE OVERLAY — modal-style A/B/C event with tradeoffs.
// =============================================================

import type { ChoiceEvent } from '../systems/event-choices';

let pending: ChoiceEvent | null = null;

export function showChoiceEvent(e: ChoiceEvent): void {
  pending = e;
  const overlay = document.getElementById('choice-event-overlay')!;
  document.getElementById('choice-icon')!.textContent = e.icon;
  document.getElementById('choice-title')!.textContent = e.title;
  document.getElementById('choice-story')!.textContent = e.story;
  const actions = document.getElementById('choice-actions')!;
  actions.innerHTML = '';
  e.choices.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<div class="choice-label">${c.label}</div><div class="choice-sub">${c.desc}</div>`;
    btn.addEventListener('click', () => {
      try { c.apply(); } catch { /* ignore */ }
      hideChoice();
    });
    actions.appendChild(btn);
  });
  overlay.removeAttribute('hidden');
}

export function hideChoice(): void {
  const overlay = document.getElementById('choice-event-overlay')!;
  overlay.setAttribute('hidden', '');
  pending = null;
}

export function renderChoiceOverlay(): void {
  // no-op tick handler — used to satisfy the wiring in main.
}

export function bindChoice(): void {
  const skip = document.getElementById('choice-skip');
  if (skip) skip.addEventListener('click', hideChoice);
}
