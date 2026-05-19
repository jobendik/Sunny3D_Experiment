// =============================================================
//  WEATHER MASTERY GRID — the signature mechanic.
//  Players craft Weather Cards and slot them into a small
//  programmable grid. Active cards reshape the weather and
//  apply gameplay bonuses for their duration.
// =============================================================

import { state } from '../state';
import { CONFIG } from '../config';
import { WEATHER_CARDS } from '../data/weather-cards';
import type { Weather } from '../types';
import { nowSeconds } from '../utils';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { localDayIndex } from './daily';

export function initWeatherGrid(): void {
  if (!state.weatherGrid) {
    state.weatherGrid = {
      slots: Array(CONFIG.weatherGrid.slots).fill(null),
      activations: [],
      charges: CONFIG.weatherGrid.chargesStart,
      lastRegenDay: localDayIndex(),
      ownedCards: [],
      unlocked: false,
    };
  }
}

// Should be unlocked at level 5 — but we render the panel anyway.
export function maybeUnlockGrid(): void {
  if (!state.weatherGrid) return;
  if (state.level >= 5 && !state.weatherGrid.unlocked) {
    state.weatherGrid.unlocked = true;
    toast('🌦️ Weather Mastery Grid unlocked!', 'gold');
    sfx.bell();
    track('weather_grid_unlocked');
  }
}

// Regenerate charges daily.
export function regenerateCharges(): void {
  const g = state.weatherGrid;
  if (!g) return;
  const today = localDayIndex();
  if (today !== g.lastRegenDay) {
    const days = Math.max(1, today - g.lastRegenDay);
    g.charges = Math.min(CONFIG.weatherGrid.chargeMaxStore, g.charges + days * CONFIG.weatherGrid.chargesPerDay);
    g.lastRegenDay = today;
  }
}

export function craftCard(cardId: string): boolean {
  const g = state.weatherGrid!;
  const def = WEATHER_CARDS[cardId];
  if (!def) return false;
  if (state.level < def.level) {
    toast(`Need Level ${def.level}!`, 'error');
    sfx.error();
    return false;
  }
  if (state.coins < def.cost) {
    toast('Not enough coins!', 'error');
    sfx.cantAfford();
    return false;
  }
  state.coins -= def.cost;
  g.ownedCards.push(cardId);
  sfx.bell();
  toast(`Crafted ${def.name}!`, 'gold');
  track('weather_card_crafted', { card: cardId });
  updateHUD();
  return true;
}

export function slotCard(slot: number, cardId: string | null): boolean {
  const g = state.weatherGrid!;
  if (slot < 0 || slot >= g.slots.length) return false;
  if (cardId === null) {
    g.slots[slot] = null;
    return true;
  }
  const owned = g.ownedCards.indexOf(cardId);
  if (owned < 0) return false;
  if (g.slots.includes(cardId)) return false;
  g.slots[slot] = cardId;
  return true;
}

export function castGrid(): boolean {
  const g = state.weatherGrid!;
  if (!g.unlocked) {
    toast('Weather Grid unlocks at Level 5', 'error');
    sfx.error();
    return false;
  }
  if (g.charges <= 0) {
    toast('No charges remaining!', 'error');
    sfx.error();
    return false;
  }
  const slotted = g.slots.filter(Boolean) as string[];
  if (slotted.length === 0) {
    toast('Slot at least one card!', 'error');
    sfx.error();
    return false;
  }
  g.charges -= 1;
  const now = nowSeconds();
  const earliestEnd = now + Math.max(...slotted.map(id => WEATHER_CARDS[id]!.duration));
  // Force weather if any slotted card forces.
  for (const id of slotted) {
    const eff = WEATHER_CARDS[id]!.effect;
    if (eff.forceWeather) {
      state.weather = eff.forceWeather;
      state.weatherUntil = Math.max(state.weatherUntil, earliestEnd);
    }
  }
  g.activations.push({
    slottedCards: slotted.slice(),
    until: earliestEnd,
    startedAt: now,
  });
  sfx.bell();
  toast(`Cast ${slotted.length} weather card${slotted.length > 1 ? 's' : ''}!`, 'gold');
  track('weather_grid_cast', { slotted: slotted.length, charges_left: g.charges });
  updateHUD();
  return true;
}

export function pruneExpired(): void {
  const g = state.weatherGrid;
  if (!g) return;
  const now = nowSeconds();
  g.activations = g.activations.filter(a => a.until > now);
}

// Aggregate currently-active effects.
export function activeEffects(): {
  growth: number;
  yieldBonus: number;
  sellBonus: number;
  noCrows: boolean;
  productionSpeed: number;
  moodFloor: number;
  fishingRareBonus: number;
} {
  const g = state.weatherGrid;
  const out = {
    growth: 0,
    yieldBonus: 0,
    sellBonus: 0,
    noCrows: false,
    productionSpeed: 0,
    moodFloor: 0,
    fishingRareBonus: 0,
  };
  if (!g) return out;
  pruneExpired();
  for (const a of g.activations) {
    for (const id of a.slottedCards) {
      const e = WEATHER_CARDS[id]!.effect;
      if (e.growthBonus) out.growth += e.growthBonus;
      if (e.yieldBonus) out.yieldBonus += e.yieldBonus;
      if (e.sellBonus) out.sellBonus += e.sellBonus;
      if (e.noCrows) out.noCrows = true;
      if (e.productionSpeed) out.productionSpeed += e.productionSpeed;
      if (e.moodFloor) out.moodFloor = Math.max(out.moodFloor, e.moodFloor);
      if (e.fishingRareBonus) out.fishingRareBonus += e.fishingRareBonus;
    }
  }
  return out;
}
