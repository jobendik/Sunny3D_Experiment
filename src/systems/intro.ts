// =============================================================
//  INTRO — branded splash dismissal + cinematic camera entrance
//  on first session. Runs once and is harmless afterwards.
// =============================================================

import { state } from '../state';
import { SW, SH } from '../canvas';
import { TILE, GRID_W, GRID_H } from '../constants';
import { clamp } from '../utils';

interface CamTween {
  fromX: number; fromY: number; fromS: number;
  toX: number; toY: number; toS: number;
  duration: number;
  age: number;
  easing: (t: number) => number;
}

let tween: CamTween | null = null;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Begin a cinematic camera ride to the farm centre. */
export function startCameraIntro(): void {
  // Already-saved players keep their last camera — only intro on fresh start.
  const cx = (GRID_W * TILE) / 2;
  const cy = (GRID_H * TILE) / 2;
  // Pick a target scale that fills the screen comfortably
  const targetScale = clamp(
    Math.min(SW() / (GRID_W * TILE), SH() / (GRID_H * TILE)) * 0.95,
    0.5, 1.6,
  );
  // Start zoomed-out, slightly above, so the world "drops in"
  const startScale = targetScale * 0.62;
  state.camX = cx;
  state.camY = cy - 60;
  state.camScale = startScale;
  tween = {
    fromX: cx, fromY: cy - 60, fromS: startScale,
    toX: cx, toY: cy, toS: targetScale,
    duration: 2.2,
    age: 0,
    easing: easeOutCubic,
  };
}

export function tickCameraIntro(dt: number): void {
  if (!tween) return;
  tween.age += dt;
  const t = clamp(tween.age / tween.duration, 0, 1);
  const e = tween.easing(t);
  state.camX = tween.fromX + (tween.toX - tween.fromX) * e;
  state.camY = tween.fromY + (tween.toY - tween.fromY) * e;
  state.camScale = tween.fromS + (tween.toS - tween.fromS) * e;
  if (t >= 1) tween = null;
}

let splashDismissed = false;

/** Bind splash dismissal handlers. The CSS animates the fade. */
export function bindSplash(onDismiss: () => void): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const dismiss = (): void => {
    if (splashDismissed) return;
    splashDismissed = true;
    splash.classList.add('dismissing');
    onDismiss();
    setTimeout(() => splash.classList.add('hidden'), 750);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onPoint);
  };
  const onKey = (e: KeyboardEvent): void => { e.preventDefault(); dismiss(); };
  const onPoint = (): void => dismiss();
  document.getElementById('splash-cta')?.addEventListener('click', dismiss);
  splash.addEventListener('click', dismiss);
  document.addEventListener('keydown', onKey, { once: true });
  document.addEventListener('pointerdown', onPoint, { once: true });
  // Update the CTA subline for non-touch (already correct generic text)
}

export function isSplashUp(): boolean {
  return !splashDismissed;
}
