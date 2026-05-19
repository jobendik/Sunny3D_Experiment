// =============================================================
//  TUTORIAL OVERLAY — non-blocking bubble at top showing the
//  current adaptive tutorial step.
// =============================================================

import { currentStep, dismissTutorial, tutorialAdvance, TUTORIAL_STEPS } from '../systems/tutorial';

let lastStepId: string | null = null;

export function renderTutorialBubble(): void {
  tutorialAdvance();
  const step = currentStep();
  const el = document.getElementById('tutorial-bubble')!;
  if (!step) {
    if (lastStepId !== null) { lastStepId = null; el.setAttribute('hidden', ''); }
    return;
  }
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
  });
}
