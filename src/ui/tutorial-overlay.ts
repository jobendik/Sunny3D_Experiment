// =============================================================
//  TUTORIAL OVERLAY — non-blocking bubble at top + spotlight glow
//  + bouncing arrow over the current target button so the player
//  always knows exactly where to tap next.
// =============================================================

import { currentStep, dismissTutorial, tutorialAdvance, TUTORIAL_STEPS } from '../systems/tutorial';

let lastStepId: string | null = null;

/** Each tutorial step's target DOM selector (the button to highlight).
 *  When the player is on mobile and the orders side-panel is closed, the
 *  Orders FAB (#open-quests-fab) is the right target; on desktop the panel
 *  is always docked open so we fall back to the FAB too — the spotlight is
 *  off-screen safely when the element isn't visible. */
const STEP_TARGETS: Record<string, string> = {
  plow:    '[data-tool="plow"]',
  plant:   '[data-tool="seed"]',
  harvest: '[data-tool="hand"]',
  sell:    '#open-shop',
  orders:  '#open-quests-fab',
  build:   '#open-buildings',
};

function placeSpotlightAndArrow(targetSel: string): void {
  const spot = document.getElementById('tutorial-spotlight') as HTMLElement | null;
  const arrow = document.getElementById('tutorial-arrow') as HTMLElement | null;
  if (!spot || !arrow) return;
  const target = document.querySelector(targetSel) as HTMLElement | null;
  if (!target) {
    spot.setAttribute('hidden', '');
    arrow.setAttribute('hidden', '');
    return;
  }
  const r = target.getBoundingClientRect();
  // Center the spotlight on the target with some padding
  const pad = 8;
  spot.style.left = `${r.left - pad}px`;
  spot.style.top = `${r.top - pad}px`;
  spot.style.width = `${r.width + pad * 2}px`;
  spot.style.height = `${r.height + pad * 2}px`;
  spot.removeAttribute('hidden');
  // Arrow centered above the target
  arrow.style.left = `${r.left + r.width / 2}px`;
  arrow.style.top = `${r.top - 14}px`;
  arrow.removeAttribute('hidden');
}

function hideSpotlight(): void {
  document.getElementById('tutorial-spotlight')?.setAttribute('hidden', '');
  document.getElementById('tutorial-arrow')?.setAttribute('hidden', '');
}

export function renderTutorialBubble(): void {
  tutorialAdvance();
  const step = currentStep();
  const el = document.getElementById('tutorial-bubble')!;
  if (!step) {
    if (lastStepId !== null) {
      lastStepId = null;
      el.setAttribute('hidden', '');
      hideSpotlight();
    }
    return;
  }
  // Update spotlight every tick (in case target moves due to layout/resize)
  const sel = STEP_TARGETS[step.id];
  if (sel) placeSpotlightAndArrow(sel);
  else hideSpotlight();
  if (step.id === lastStepId) return;
  lastStepId = step.id;
  el.removeAttribute('hidden');
  const stepEl = document.getElementById('tutorial-step')!;
  const textEl = document.getElementById('tutorial-text')!;
  const stepIdx = TUTORIAL_STEPS.findIndex(s => s.id === step.id);
  stepEl.textContent = `Step ${stepIdx + 1} of ${TUTORIAL_STEPS.length}`;
  textEl.textContent = step.text;
}

export function bindTutorial(): void {
  const skip = document.getElementById('tutorial-skip');
  if (skip) skip.addEventListener('click', () => {
    dismissTutorial();
    document.getElementById('tutorial-bubble')!.setAttribute('hidden', '');
    hideSpotlight();
  });
  // Reposition on resize so the spotlight stays glued to the target
  window.addEventListener('resize', () => {
    const step = currentStep();
    if (!step) return;
    const sel = STEP_TARGETS[step.id];
    if (sel) placeSpotlightAndArrow(sel);
  });
}
