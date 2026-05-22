// =============================================================
//  EDIT MODE — Hay Day-style "edit" mode for decorations.
//  When active, tapping a decoration removes it (refunds 50% of
//  its cost). Swipe-drag also erases everything swept over.
// =============================================================

import { state } from '../state';
import { DECORATIONS } from '../data/decorations';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';

let _editMode = false;

export function isEditMode(): boolean {
  return _editMode;
}

export function setEditMode(on: boolean): void {
  _editMode = on;
  document.body.classList.toggle('edit-mode', on);
  if (on) {
    toast('✂️ Edit Mode — tap or swipe over decor to remove it.', 'xp');
  } else {
    toast('Edit Mode off.');
  }
}

export function toggleEditMode(): void {
  setEditMode(!_editMode);
}

/** Attempt to erase a decoration at a grid tile. Returns true if removed. */
export function eraseDecorAt(gx: number, gy: number): boolean {
  if (!_editMode) return false;
  const idx = state.decor.findIndex(d => {
    const def = DECORATIONS[d.type];
    if (!def) return d.x === gx && d.y === gy;
    return gx >= d.x && gx < d.x + def.w && gy >= d.y && gy < d.y + def.h;
  });
  if (idx < 0) return false;
  const d = state.decor[idx]!;
  const def = DECORATIONS[d.type];
  const refund = def ? Math.floor(def.price * 0.5) : 0;
  state.decor.splice(idx, 1);
  state.coins += refund;
  state.stats.earned += refund;
  sfx.click();
  toast(`Removed ${def?.name ?? 'decoration'} (+${refund}💰)`);
  updateHUD();
  track('decor_erased', { type: d.type, refund });
  return true;
}
