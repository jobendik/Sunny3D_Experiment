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
import { triggerFlash, triggerShake } from './juice';
import { spawnParticles } from './particles';
import { SW, SH } from '../canvas';
import { screenToWorld } from './camera';
import { recordEventAction as recordEventActionStub } from './live-events';
import { addClubProgress as addClubProgressStub } from './club';
import { checkMilestones as checkJournalMilestonesStub } from './journal';
import { recordHabitatContribution } from './habitat-partner';

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
    // Two-stage announcement: first the headline, then a follow-up that
    // tells the player exactly how to engage. Otherwise the signature
    // mechanic launches with zero in-game guidance (audit issue #11).
    toast('🌦️ Weather Mastery Grid unlocked!', 'gold');
    sfx.bell();
    setTimeout(() => {
      toast('Open ⋯ More → Grid to craft your first Weather Card.');
    }, 2200);
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
  // Casting is the signature beat — flash + shake + farm-wide particle storm
  // and a clear toast naming the cards so the player remembers what they did.
  sfx.bell();
  triggerFlash('#cfe9ff', 0.45, 0.55);
  triggerShake(5, 0.35);
  // Spawn a wash of weather-themed particles across the visible world.
  const colors = ['#a6d8f0', '#fff5c0', '#7fb957', '#efdcff'];
  for (let i = 0; i < 80; i++) {
    const sx = Math.random() * SW();
    const sy = Math.random() * SH();
    const w = screenToWorld(sx, sy);
    const col = colors[Math.floor(Math.random() * colors.length)]!;
    spawnParticles(w.x, w.y, col, 1, true);
  }
  const cardNames = slotted.map(id => WEATHER_CARDS[id]!.name).join(' + ');
  toast(`🌦️ Cast: ${cardNames}`, 'gold');
  track('weather_grid_cast', { slotted: slotted.length, charges_left: g.charges });
  // Live-event + club hooks
  recordEventActionStub('card_cast', undefined, slotted.length);
  addClubProgressStub('card_cast', slotted.length);
  recordHabitatContribution('weatherCast', 1);
  checkJournalMilestonesStub();
  updateHUD();
  return true;
}

/** Total seconds remaining on the longest active activation, or 0. */
export function activeRemainingSeconds(): number {
  const g = state.weatherGrid;
  if (!g) return 0;
  const now = nowSeconds();
  let best = 0;
  for (const a of g.activations) {
    if (a.until > now) best = Math.max(best, a.until - now);
  }
  return best;
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
