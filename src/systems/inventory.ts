import { state } from '../state';

export function addItem(key: string, qty: number): void {
  state.inv[key] = (state.inv[key] ?? 0) + qty;
}

export function removeItem(key: string, qty: number): boolean {
  if ((state.inv[key] ?? 0) < qty) return false;
  state.inv[key] = state.inv[key]! - qty;
  if (state.inv[key]! <= 0) delete state.inv[key];
  return true;
}

export function hasItems(reqs: Record<string, number>): boolean {
  for (const k in reqs) if ((state.inv[k] ?? 0) < reqs[k]!) return false;
  return true;
}
