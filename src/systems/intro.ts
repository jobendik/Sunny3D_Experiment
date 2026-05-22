// =============================================================
//  INTRO — branded splash dismissal + cinematic camera entrance
//  on first session. Runs once and is harmless afterwards.
// =============================================================

import { state } from '../state';
import { SW, SH } from '../canvas';
import { TILE, HOME_CENTER_X, HOME_CENTER_Y, HOME_W, HOME_H } from '../constants';
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

// Hero camera intro: glide *down and in* from a slightly off-center
// vantage to the farm centre, ending with a satisfying soft-landing
// zoom. The off-axis start gives the player a half-second of
// "ahh, look at this place" before the playable framing settles in.
/** Begin a cinematic camera ride to the home zone. */
export function startCameraIntro(): void {
  const cx = HOME_CENTER_X * TILE;
  const cy = HOME_CENTER_Y * TILE;
  const framePx = (Math.max(HOME_W, HOME_H) + 4) * TILE;
  const targetScale = clamp(
    Math.min(SW() / framePx, SH() / framePx) * 0.95,
    0.5, 1.8,
  );
  // Start farther back and offset to the south so the entrance path
  // is visible — gives a real "you're approaching your farm" feel.
  const startScale = targetScale * 0.55;
  state.camX = cx + 20;
  state.camY = cy + 80;
  state.camScale = startScale;
  tween = {
    fromX: cx + 20, fromY: cy + 80, fromS: startScale,
    toX: cx, toY: cy, toS: targetScale,
    duration: 2.6,
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
