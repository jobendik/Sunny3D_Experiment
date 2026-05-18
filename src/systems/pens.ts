import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { clamp } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { removeItem } from './inventory';

export function penFeedLevel(buildingId: string): number {
  return state.penFeed[buildingId] !== undefined ? state.penFeed[buildingId]! : 100;
}

export function feedPen(buildingId: string, _amount: number): void {
  const cur = penFeedLevel(buildingId);
  const have = state.inv.feed ?? 0;
  const toUse = Math.min(have, Math.max(0, Math.ceil((100 - cur) / 10)));
  if (toUse === 0) { toast('Pen is full!', ''); return; }
  removeItem('feed', toUse);
  state.penFeed[buildingId] = clamp(cur + toUse * 10, 0, 100);
  sfx.click();
  toast(`Used ${toUse} feed`, '');
  updateHUD();
}

export function updatePenFeed(dt: number): void {
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const animals = state.penAnimals[b.id] ?? [];
    if (animals.length === 0) continue;
    if (state.penFeed[b.id] === undefined) state.penFeed[b.id] = 100;
    state.penFeed[b.id] = clamp(state.penFeed[b.id]! - dt * animals.length * 0.18, 0, 100);
  }
}
