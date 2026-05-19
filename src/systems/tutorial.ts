// =============================================================
//  GUIDED ONBOARDING — a 4-step playable tutorial that runs
//  in the first 3 minutes. Non-blocking; adaptive prompts.
// =============================================================

import { state } from '../state';
import { track } from './telemetry';

export interface TutorialStep {
  id: string;
  text: string;
  done: (s: typeof state) => boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'plow', text: 'Tap the Plow tool, then tap a green tile to plow it.',
    done: s => s.stats.plowed >= 1 },
  { id: 'plant', text: 'Tap the Seeds tool, then tap plowed soil to plant.',
    done: s => s.stats.planted >= 1 },
  { id: 'harvest', text: 'Wait for crops to mature, then tap them with Hand.',
    done: s => s.stats.harvested >= 1 },
  { id: 'sell', text: 'Open Shop → Sell to convert harvest into coins.',
    done: s => s.stats.sold >= 1 },
];

export function initTutorial(): void {
  if (!state.tutorial) {
    state.tutorial = { stepIdx: 0, completed: false, dismissed: false };
  }
}

export function tutorialAdvance(): void {
  initTutorial();
  const t = state.tutorial!;
  if (t.completed || t.dismissed) return;
  while (t.stepIdx < TUTORIAL_STEPS.length && TUTORIAL_STEPS[t.stepIdx]!.done(state)) {
    track('tutorial_step_complete', { step: TUTORIAL_STEPS[t.stepIdx]!.id });
    t.stepIdx += 1;
  }
  if (t.stepIdx >= TUTORIAL_STEPS.length) {
    t.completed = true;
    track('tutorial_complete');
  }
}

export function currentStep(): TutorialStep | null {
  initTutorial();
  const t = state.tutorial!;
  if (t.completed || t.dismissed) return null;
  return TUTORIAL_STEPS[t.stepIdx] ?? null;
}

export function dismissTutorial(): void {
  initTutorial();
  state.tutorial!.dismissed = true;
}
