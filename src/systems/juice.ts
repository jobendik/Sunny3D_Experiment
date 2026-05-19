// =============================================================
//  JUICE — screen-shake + flash + glow utilities for snappy
//  feedback on level-ups and big rewards.
// =============================================================

import { state } from '../state';

export interface ShakeState {
  intensity: number;     // px
  duration: number;      // seconds
  age: number;
}

let shake: ShakeState | null = null;

export function triggerShake(intensity = 6, duration = 0.35): void {
  shake = { intensity, duration, age: 0 };
}

export function tickShake(dt: number): { dx: number; dy: number } {
  if (!shake) return { dx: 0, dy: 0 };
  shake.age += dt;
  if (shake.age >= shake.duration) { shake = null; return { dx: 0, dy: 0 }; }
  const t = 1 - shake.age / shake.duration;
  const amp = shake.intensity * t;
  return {
    dx: (Math.random() - 0.5) * amp * 2,
    dy: (Math.random() - 0.5) * amp * 2,
  };
}

export interface FlashState {
  color: string;
  duration: number;
  age: number;
  intensity: number;
}

let flash: FlashState | null = null;

export function triggerFlash(color = '#fff', intensity = 0.35, duration = 0.4): void {
  flash = { color, duration, age: 0, intensity };
}

export function tickFlash(dt: number): FlashState | null {
  if (!flash) return null;
  flash.age += dt;
  if (flash.age >= flash.duration) { flash = null; return null; }
  return flash;
}

// Convenience: full-impact celebration combo.
export function celebrate(): void {
  triggerShake(8, 0.45);
  triggerFlash('#ffd040', 0.4, 0.55);
}

// silence unused warning
void state;
