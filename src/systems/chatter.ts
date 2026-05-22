// =============================================================
//  AMBIENT VILLAGER CHATTER  (FV3 narrative-bubble surface).
//
//  Periodically emits a small "talk" bubble somewhere on the farm
//  with a flavour line — sourced from the active customer / event /
//  weather context so it feels reactive rather than canned.
//
//  Bubbles render through the existing world-bubbles pool (kind:
//  'visitor'), so they share the screen-space-overlay infrastructure
//  with the rest of the FV3 talk-bubble grammar.
// =============================================================

import { state } from '../state';
import { HOME_CENTER_X, HOME_CENTER_Y } from '../constants';
import { nowSeconds } from '../utils';
import { activeVisitors } from './visitors-v2';

export interface Chatter {
  id: string;
  text: string;
  wx: number;
  wz: number;
  expiresAt: number;
}

export interface ChatterRoot {
  active: Chatter[];
  nextAt: number;
}

declare module '../types' {
  interface GameState {
    chatter?: ChatterRoot;
  }
}

const LINES_SUNNY = [
  '☀️ Lovely day!',
  '✨ Smells like fresh hay',
  '🌻 Your farm shines!',
];
const LINES_RAINY = [
  '☔ Good for the crops',
  '🌱 Let it grow',
  '💧 Stay dry!',
];
const LINES_FARM_FULL = [
  '🐄 So many animals!',
  '🐔 You\'re busy!',
  '🌾 Bumper season',
];
const LINES_LOW = [
  '👋 Howdy, neighbor',
  '🌾 Anything new today?',
  '🐝 Have you seen the bees?',
];
const LINES_QUEST = [
  '⭐ Big plans today?',
  '📋 Got any orders ready?',
  '💰 Coins from a thousand crops!',
];
const LINES_HARVEST = [
  '🌽 What a harvest!',
  '🥕 Smells delicious!',
  '🍓 Save some for me!',
];

const CHATTER_INTERVAL_MIN = 14;
const CHATTER_INTERVAL_MAX = 28;
const BUBBLE_LIFETIME = 6;

export function initChatter(): void {
  if (!state.chatter) {
    state.chatter = {
      active: [],
      nextAt: nowSeconds() + 8,
    };
  }
}

export function tickChatter(): void {
  initChatter();
  const c = state.chatter!;
  const now = nowSeconds();
  // Reap expired bubbles
  if (c.active.length > 0) {
    c.active = c.active.filter(b => b.expiresAt > now);
  }
  // Throttle — never more than 2 ambient chatter bubbles at once.
  if (now < c.nextAt) return;
  if (c.active.length >= 2) {
    c.nextAt = now + 5;
    return;
  }
  // Pick a line bucket by context.
  const pool = pickPool();
  const text = pool[Math.floor(Math.random() * pool.length)]!;
  // Anchor near a random visible building or near home centre.
  const anchor = pickAnchor();
  c.active.push({
    id: `chat_${now.toFixed(0)}_${Math.floor(Math.random() * 1000)}`,
    text,
    wx: anchor.wx,
    wz: anchor.wz,
    expiresAt: now + BUBBLE_LIFETIME,
  });
  c.nextAt = now + CHATTER_INTERVAL_MIN + Math.random() * (CHATTER_INTERVAL_MAX - CHATTER_INTERVAL_MIN);
}

function pickPool(): string[] {
  const visitorCount = activeVisitors().length;
  if (visitorCount > 0) return LINES_QUEST;
  if (state.weather === 'rainy' || state.weather === 'storm') return LINES_RAINY;
  if (state.weather === 'sunny') return LINES_SUNNY;
  if (state.buildings.length >= 6) return LINES_FARM_FULL;
  if (state.stats.harvested > 50) return LINES_HARVEST;
  return LINES_LOW;
}

function pickAnchor(): { wx: number; wz: number } {
  // Prefer a random non-pen building (farmhouse/landmark feel)
  const candidates = state.buildings.filter(b => b.type !== 'fishingdock');
  if (candidates.length > 0 && Math.random() < 0.7) {
    const b = candidates[Math.floor(Math.random() * candidates.length)]!;
    return { wx: b.x + 1.5, wz: b.y + 1.5 };
  }
  // Otherwise jitter around home centre
  const a = Math.random() * Math.PI * 2;
  const r = 3 + Math.random() * 4;
  return {
    wx: HOME_CENTER_X + Math.cos(a) * r,
    wz: HOME_CENTER_Y + Math.sin(a) * r,
  };
}

export function activeChatter(): Chatter[] {
  initChatter();
  return state.chatter!.active;
}
