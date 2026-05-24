// =============================================================
//  NEXT UNLOCKS — the curated list of meaningful level-gated
//  milestones the player will reach as they progress.
//
//  Hand-picked: anything purely numeric (a new crop only, a new
//  decoration) is omitted. We want player-meaningful systems —
//  the kind that change how the game feels — surfaced here.
//
//  Levels MUST match the real unlock conditions in the systems
//  they describe. If a system changes its UNLOCK_LEVEL, update
//  the matching entry below. The audit doc in /docs cross-refs
//  these numbers.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { ORCHARDS } from '../data/orchards';

export type UnlockCategory =
  | 'core' | 'market' | 'delivery' | 'social'
  | 'exploration' | 'progression' | 'advanced';

export interface UnlockHint {
  level: number;
  icon: string;
  label: string;
  description?: string;
  category?: UnlockCategory;
}

/** Hand-picked highlights — the unlocks that move the game forward most.
 *  Anything purely numeric (a new item only) is omitted; we want
 *  player-meaningful milestones here. */
const HIGHLIGHTS: UnlockHint[] = [
  { level: 2, icon: '🏭', label: 'Feed Mill', category: 'core',
    description: 'Turn wheat into livestock feed — opens the production chain.' },
  { level: 3, icon: '🥖', label: 'Bakery + Hen House', category: 'core',
    description: 'Bake bread and gather eggs — your first production loop.' },
  { level: 3, icon: '🎣', label: 'Fishing Dock', category: 'core',
    description: 'Cast lines from the lake to catch valuable fish.' },
  { level: 3, icon: '📰', label: 'Sunny Gazette', category: 'market',
    description: 'A daily paper with hot items, sales, and help requests.' },
  { level: 4, icon: '🛒', label: 'Market Stall', category: 'market',
    description: 'List goods at your stall — they sell while you farm.' },
  { level: 4, icon: '🍎', label: 'Apple Tree + Cow Pen', category: 'core',
    description: 'Passive orchard income and bigger animal pens.' },
  { level: 4, icon: '🐶', label: 'Pet Dog', category: 'core',
    description: 'A roaming dog who finds bonus coins for you.' },
  { level: 4, icon: '🏘️', label: 'Village Hub', category: 'social',
    description: 'Visit villagers, build reputation, unlock new requests.' },
  { level: 5, icon: '🌦️', label: 'Weather Mastery Grid', category: 'progression',
    description: 'The signature mechanic — slot cards to bend the weather.' },
  { level: 5, icon: '🌟', label: 'Specialization', category: 'progression',
    description: 'Pick a path: Crop Baron, Ranch Keeper, Artisan, or Fisher.' },
  { level: 5, icon: '🐝', label: 'Apiary (honey)', category: 'core' },
  { level: 5, icon: '👋', label: 'Walk-on Visitors', category: 'market',
    description: 'Tourists drop by with small requests and generous tips.' },
  { level: 6, icon: '🧪', label: 'Perfumery + Candle Shop', category: 'core',
    description: 'High-margin artisan goods open up.' },
  { level: 6, icon: '🎪', label: 'Festival Cart', category: 'delivery',
    description: 'A weekly themed cart with bonus rewards for delivering.' },
  { level: 6, icon: '🏛️', label: 'Museum Hall', category: 'progression',
    description: 'Display your collection and earn permanent buffs.' },
  { level: 7, icon: '🧵', label: 'Loom (cloth)', category: 'core' },
  { level: 7, icon: '🌄', label: 'Land Expansion — East Meadow', category: 'exploration',
    description: 'Buy and clear new plots of land for more farm space.' },
  { level: 7, icon: '🏗️', label: 'Landmark Projects', category: 'exploration',
    description: 'Build a Windmill, Old Mill, and other community landmarks.' },
  { level: 8, icon: '🐖', label: 'Pig Pen', category: 'core' },
  { level: 8, icon: '🎉', label: 'Live Events', category: 'delivery',
    description: 'Limited-time events with token rewards and themed challenges.' },
  { level: 9, icon: '🔥', label: 'BBQ Pit (ribs)', category: 'core' },
  { level: 9, icon: '⛵', label: 'Boat Deliveries', category: 'delivery',
    description: 'Fill crates on docked boats for big coin + material rewards.' },
  { level: 9, icon: '📜', label: 'Market Contracts', category: 'market',
    description: 'Multi-day bulk contracts with rare-material rewards.' },
  { level: 10, icon: '🌬️', label: 'Windmill Landmark', category: 'exploration' },
  { level: 10, icon: '🎈', label: 'Hot Air Balloon', category: 'delivery',
    description: 'Premium short-window deliveries — sky-high rewards.' },
  { level: 10, icon: '🔧', label: 'Tool Shed', category: 'progression',
    description: 'Build it to speed up expedition clearing and unlock helper roles.' },
  { level: 12, icon: '🏚️', label: 'Great Barn Landmark', category: 'exploration' },
  { level: 12, icon: '🌱', label: 'Greenhouse Landmark', category: 'exploration',
    description: 'Plant any crop, any season — needs compost to grow.' },
  { level: 13, icon: '🚂', label: 'Train Deliveries', category: 'delivery',
    description: 'Long-cycle cargo trips returning with rare materials.' },
  { level: 13, icon: '⚓', label: 'Fishery Landmark', category: 'exploration' },
  { level: 14, icon: '💡', label: 'Lighthouse Landmark', category: 'exploration' },
  { level: 14, icon: '🧬', label: 'Seed Breeding', category: 'progression',
    description: 'Cross-breed crops for unique trait combinations.' },
  { level: 15, icon: '🏆', label: 'Farming Club', category: 'social',
    description: 'Weekly shared goals with peer farmers and milestone rewards.' },
  { level: 15, icon: '🌟', label: 'Secondary Specialization', category: 'progression',
    description: 'Pick a second path — the perks stack.' },
  { level: 16, icon: '🗺️', label: 'Expeditions — Forest Clearing', category: 'exploration',
    description: 'Spend energy + tools to explore a graph of reward nodes.' },
  { level: 18, icon: '🤝', label: 'Helpers', category: 'progression',
    description: 'Hire collectors, restockers, waterers, and sellers.' },
  { level: 20, icon: '🌫️', label: 'Expedition — Misty Lake', category: 'exploration' },
  { level: 22, icon: '⛈️', label: 'Expedition — Storm Valley', category: 'exploration' },
  { level: 25, icon: '✨', label: 'Prestige', category: 'advanced',
    description: 'Reset progression for permanent Talent currency and perks.' },
];

/** Next N unlocks above the player's current level (ordered ascending). */
export function nextUnlocks(limit = 3): UnlockHint[] {
  const lvl = state.level;
  return HIGHLIGHTS.filter(u => u.level > lvl).slice(0, limit);
}

/** The single most exciting next unlock — used by the HUD chip tooltip
 *  and the level-up news. Picks the closest meaningful unlock. */
export function nextBigUnlock(): UnlockHint | null {
  return nextUnlocks(1)[0] ?? null;
}

/** Unlocks currently unlocked at the player's level OR earlier — useful
 *  for a "what you've earned" celebration view. */
export function unlocksForLevel(level: number): UnlockHint[] {
  return HIGHLIGHTS.filter(u => u.level === level);
}

export function alreadyUnlocked(): UnlockHint[] {
  const lvl = state.level;
  return HIGHLIGHTS.filter(u => u.level <= lvl);
}

/** Catch-all check that produces a deep list including dynamic content
 *  (new crops, items, animals, buildings, orchards) — useful for the
 *  Help panel or a future unlocks browser. */
export function allFutureUnlocks(): UnlockHint[] {
  const lvl = state.level;
  const out: UnlockHint[] = [];
  for (const k of Object.keys(CROPS)) {
    const c = CROPS[k]!;
    if (c.level > lvl) out.push({ level: c.level, icon: '🌱', label: `Crop: ${ITEMS[c.item]?.name ?? k}`, category: 'core' });
  }
  for (const k of Object.keys(ANIMALS)) {
    const a = ANIMALS[k]!;
    if (a.level > lvl) out.push({ level: a.level, icon: '🐾', label: `Animal: ${a.name}`, category: 'core' });
  }
  for (const k of Object.keys(BUILDINGS)) {
    const b = BUILDINGS[k]!;
    if (b.level > lvl) out.push({ level: b.level, icon: '🏗️', label: `Build: ${b.name}`, category: 'core' });
  }
  for (const k of Object.keys(ORCHARDS)) {
    const o = ORCHARDS[k]!;
    if (o.level > lvl) out.push({ level: o.level, icon: '🌳', label: `Tree: ${o.name}`, category: 'core' });
  }
  // Merge in the curated highlights so meta systems also show.
  for (const h of HIGHLIGHTS) if (h.level > lvl) out.push(h);
  out.sort((a, b) => a.level - b.level);
  return out;
}
