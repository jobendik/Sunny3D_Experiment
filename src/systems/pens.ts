import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { clamp } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { removeItem } from './inventory';
import { track } from './telemetry';

export function initAnimalCare(): void {
  if (!state.animalCare) state.animalCare = { autoFeedPens: {} };
  if (!state.animalCare.autoFeedPens) state.animalCare.autoFeedPens = {};
}

export function hasAutoFeed(buildingId: string): boolean {
  initAnimalCare();
  return !!state.animalCare!.autoFeedPens[buildingId];
}

export function autoFeedUpgradeCost(buildingId: string): { coins: number; feed: number } {
  const b = state.buildings.find(x => x.id === buildingId);
  const def = b ? BUILDINGS[b.type] : null;
  const cap = def?.capacity ?? 3;
  return {
    coins: 180 + cap * 40,
    feed: 6 + cap,
  };
}

export function buyAutoFeedUpgrade(buildingId: string): boolean {
  initAnimalCare();
  if (hasAutoFeed(buildingId)) {
    toast('Auto-feed is already installed.');
    return false;
  }
  const cost = autoFeedUpgradeCost(buildingId);
  if (state.coins < cost.coins || (state.inv.feed ?? 0) < cost.feed) {
    sfx.cantAfford();
    toast(`Need ${cost.coins} coins and ${cost.feed} feed.`);
    return false;
  }
  state.coins -= cost.coins;
  removeItem('feed', cost.feed);
  state.animalCare!.autoFeedPens[buildingId] = true;
  sfx.bell();
  toast('Auto-feed installed for this pen!', 'gold');
  updateHUD();
  track('animal_auto_feed_upgrade', { buildingId, coins: cost.coins, feed: cost.feed });
  return true;
}

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
  initAnimalCare();
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const animals = state.penAnimals[b.id] ?? [];
    if (animals.length === 0) continue;
    if (state.penFeed[b.id] === undefined) state.penFeed[b.id] = 100;
    state.penFeed[b.id] = clamp(state.penFeed[b.id]! - dt * animals.length * 0.18, 0, 100);
    if (hasAutoFeed(b.id) && state.penFeed[b.id]! < 35 && (state.inv.feed ?? 0) > 0) {
      const needed = Math.ceil((70 - state.penFeed[b.id]!) / 10);
      const toUse = Math.max(0, Math.min(state.inv.feed ?? 0, needed));
      if (toUse > 0) {
        removeItem('feed', toUse);
        state.penFeed[b.id] = clamp(state.penFeed[b.id]! + toUse * 10, 0, 100);
        toast(`Auto-fed ${def.name} with ${toUse} feed.`);
        track('animal_auto_feed_used', { buildingId: b.id, qty: toUse });
      }
    }
  }
}
