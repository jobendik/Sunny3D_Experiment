// =============================================================
//  UTILITY HELPERS
// =============================================================

export const rand = (a = 1): number => Math.random() * a;

export const randi = (a: number): number => Math.floor(Math.random() * a);

export const choice = <T>(a: readonly T[]): T => a[randi(a.length)]!;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const dist2 = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

export const nowSeconds = (): number => performance.now() / 1000;

// XP needed to reach the next level from `lvl`. Soft curve.
export const xpForLevel = (lvl: number): number =>
  Math.floor(10 + (lvl - 1) * 8 + Math.pow(lvl, 1.6) * 3);
