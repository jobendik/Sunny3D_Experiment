// =============================================================
//  SANCTUARY — wildlife sightings book by the river.
//
//  Mirrors Hay Day's Sanctuary: rare wildlife appears around the
//  farm at random intervals, and tapping the animal records a
//  sighting in the Sanctuary book. Complete catalogs of each
//  category award milestone bonuses.
// =============================================================

import { state } from '../state';
import { GRID_W, GRID_H } from '../constants';
import { rand, randi, choice, nowSeconds } from '../utils';
import { addItem } from './inventory';
import { addXP } from './xp';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';
import type { SanctuarySpecies } from '../types';

const UNLOCK_LEVEL = 6;
const SPAWN_INTERVAL_MIN = 60 * 8;   // 8 min min
const SPAWN_INTERVAL_MAX = 60 * 25;  // 25 min max
const VISIBLE_DURATION_S = 90;       // visible for 90s before flying away

export const SPECIES: ReadonlyArray<SanctuarySpecies> = [
  { id: 'sparrow',    name: 'Sparrow',     emoji: '🐦',  category: 'bird',   habitat: 'fields',   rarity: 1, description: 'A cheerful little bird that loves a freshly plowed field.' },
  { id: 'robin',      name: 'Robin',       emoji: '🐦‍🔥', category: 'bird',   habitat: 'trees',    rarity: 2, description: 'A red-breasted bird that signals warm days ahead.' },
  { id: 'butterfly',  name: 'Butterfly',   emoji: '🦋',  category: 'insect', habitat: 'flowers',  rarity: 1, description: 'Floats through the spring breeze. Loves wildflowers.' },
  { id: 'bee',        name: 'Honeybee',    emoji: '🐝',  category: 'insect', habitat: 'flowers',  rarity: 2, description: 'Pollinates your crops and signals a healthy farm.' },
  { id: 'squirrel',   name: 'Squirrel',    emoji: '🐿️',  category: 'mammal', habitat: 'trees',    rarity: 2, description: 'Always busy gathering acorns.' },
  { id: 'fox',        name: 'Red Fox',     emoji: '🦊',  category: 'mammal', habitat: 'forest',   rarity: 3, description: 'Sly and elegant — sneaks through at dusk.' },
  { id: 'deer',       name: 'White-tail Deer', emoji: '🦌', category: 'mammal', habitat: 'forest', rarity: 3, description: 'Quiet and watchful at the edge of the meadow.' },
  { id: 'frog',       name: 'Green Frog',  emoji: '🐸',  category: 'reptile', habitat: 'pond',    rarity: 1, description: 'Sings every evening from the lily pad.' },
  { id: 'turtle',     name: 'Pond Turtle', emoji: '🐢',  category: 'reptile', habitat: 'pond',    rarity: 3, description: 'Slow and steady, basking on a log in the sun.' },
  { id: 'owl',        name: 'Barn Owl',    emoji: '🦉',  category: 'bird',   habitat: 'night',    rarity: 3, description: 'Silent hunter — bringer of wisdom and luck.' },
  { id: 'rabbit',     name: 'Cottontail',  emoji: '🐇',  category: 'mammal', habitat: 'meadow',   rarity: 2, description: 'Hops through the wildflowers at dawn.' },
  { id: 'dragonfly',  name: 'Dragonfly',   emoji: '🪲',  category: 'insect', habitat: 'pond',    rarity: 2, description: 'Iridescent wings catch the sun over the pond.' },
  { id: 'unicorn',    name: 'Unicorn',     emoji: '🦄',  category: 'mythic', habitat: 'rainbow',  rarity: 5, description: 'Legend says it appears only to the kindest farmers.' },
  { id: 'dragon',     name: 'Tiny Dragon', emoji: '🐉',  category: 'mythic', habitat: 'forest',   rarity: 5, description: 'A tiny, sneezy dragon. Definitely real.' },
];

const SPECIES_BY_ID: Record<string, SanctuarySpecies> =
  Object.fromEntries(SPECIES.map(s => [s.id, s]));

export function initSanctuary(): void {
  if (!state.sanctuary) {
    state.sanctuary = {
      unlocked: state.level >= UNLOCK_LEVEL,
      sightings: {},
      active: null,
      nextSpawnAt: nowSeconds() + SPAWN_INTERVAL_MIN,
      totalSightings: 0,
    };
  }
  if (!state.sanctuary.unlocked && state.level >= UNLOCK_LEVEL) {
    state.sanctuary.unlocked = true;
    toast('🌳 The Sanctuary book has appeared by the river — wildlife sightings will start to come!', 'gold');
    track('sanctuary_unlocked');
  }
}

function pickSpecies(): SanctuarySpecies {
  // Rarer species roll harder
  const r = Math.random();
  let target: 1 | 2 | 3 | 4 | 5;
  if (r < 0.55) target = 1;
  else if (r < 0.85) target = 2;
  else if (r < 0.96) target = 3;
  else target = 5;
  const pool = SPECIES.filter(s => s.rarity === target);
  return pool.length > 0 ? choice(pool) : choice(SPECIES);
}

function spawnVisitor(): void {
  initSanctuary();
  const s = state.sanctuary!;
  if (!s.unlocked) return;
  if (s.active) return;
  const sp = pickSpecies();
  const gx = randi(GRID_W);
  const gy = randi(GRID_H);
  s.active = {
    id: sp.id,
    spawnedAt: nowSeconds(),
    expiresAt: nowSeconds() + VISIBLE_DURATION_S,
    gx, gy,
  };
  toast(`${sp.emoji} A ${sp.name} has been spotted near your farm!`, sp.rarity >= 3 ? 'gold' : 'xp');
  sfx.bell();
}

export function tickSanctuary(): void {
  initSanctuary();
  const s = state.sanctuary!;
  if (!s.unlocked) return;
  const now = nowSeconds();
  if (s.active && now > s.active.expiresAt) {
    s.active = null;
    s.nextSpawnAt = now + SPAWN_INTERVAL_MIN + rand(SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  }
  if (!s.active && now >= s.nextSpawnAt) {
    spawnVisitor();
  }
}

export function recordSighting(speciesId: string): boolean {
  initSanctuary();
  const s = state.sanctuary!;
  const sp = SPECIES_BY_ID[speciesId];
  if (!sp) return false;
  const existing = s.sightings[speciesId];
  const isFirst = !existing;
  s.sightings[speciesId] = {
    firstSeen: existing?.firstSeen ?? nowSeconds(),
    count: (existing?.count ?? 0) + 1,
  };
  s.totalSightings += 1;
  // Reward
  const xp = sp.rarity * 8;
  const coins = sp.rarity * 20;
  addXP(xp);
  state.coins += coins;
  state.stats.earned += coins;
  if (sp.rarity === 5) {
    state.gems += 2;
    toast(`✨ Legendary sighting! ${sp.emoji} ${sp.name} (+${coins}💰 +${xp}XP +2💎)`, 'gold');
  } else if (isFirst) {
    toast(`📖 New species: ${sp.emoji} ${sp.name} (+${coins}💰 +${xp}XP)`, 'gold');
  } else {
    toast(`📖 ${sp.emoji} ${sp.name} sighted (+${coins}💰 +${xp}XP)`, 'xp');
  }
  sfx.coin();
  s.active = null;
  s.nextSpawnAt = nowSeconds() + SPAWN_INTERVAL_MIN + rand(SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  updateHUD();
  track('sanctuary_sighting', { species: speciesId, first: isFirst });
  return true;
}

/** Tap from anywhere (UI button) — observes the currently visible visitor. */
export function observeActive(): boolean {
  initSanctuary();
  const s = state.sanctuary!;
  if (!s.active) {
    toast('No wildlife currently visible.');
    return false;
  }
  return recordSighting(s.active.id);
}

export function discoveredCount(): number {
  initSanctuary();
  return Object.keys(state.sanctuary!.sightings).length;
}

export function activeVisitor(): { species: SanctuarySpecies; expiresAt: number; gx: number; gy: number } | null {
  initSanctuary();
  const s = state.sanctuary!;
  if (!s.active) return null;
  const sp = SPECIES_BY_ID[s.active.id];
  if (!sp) return null;
  return { species: sp, expiresAt: s.active.expiresAt, gx: s.active.gx, gy: s.active.gy };
}

export function sightingFor(speciesId: string): { firstSeen: number; count: number } | null {
  initSanctuary();
  return state.sanctuary!.sightings[speciesId] ?? null;
}
