// =============================================================
//  NEXT UNLOCKS — surface the most exciting thing the player will
//  unlock in the next few levels so they always have anticipation.
//  Read-only; cheap to call from rail/news/welcome-back.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { ORCHARDS } from '../data/orchards';

export interface UnlockHint {
  level: number;
  icon: string;
  label: string;
}

/** Hand-picked highlights — the unlocks that move the game forward most.
 *  Anything that's purely numeric (a new item only) is omitted; we want
 *  player-meaningful milestones here. */
const HIGHLIGHTS: UnlockHint[] = [
  { level: 2, icon: '🏭', label: 'Feed Mill (build menu)' },
  { level: 3, icon: '🥖', label: 'Bakery + Hen House' },
  { level: 3, icon: '🎣', label: 'Fishing Dock' },
  { level: 4, icon: '🍎', label: 'Apple Tree + Cow Pen' },
  { level: 4, icon: '🐶', label: 'Pet Dog joins your farm' },
  { level: 5, icon: '🌦️', label: 'Weather Mastery Grid' },
  { level: 5, icon: '🌟', label: 'Specialization choice' },
  { level: 5, icon: '🐝', label: 'Apiary (honey)' },
  { level: 6, icon: '🧪', label: 'Perfumery + Candle Shop' },
  { level: 7, icon: '🧵', label: 'Loom (cloth)' },
  { level: 8, icon: '🐖', label: 'Pig Pen' },
  { level: 9, icon: '🔥', label: 'BBQ Pit (ribs)' },
  { level: 10, icon: '🌬️', label: 'Windmill landmark' },
  { level: 12, icon: '🏚️', label: 'Great Barn landmark' },
  { level: 13, icon: '⚓', label: 'Fishery landmark' },
  { level: 15, icon: '🌟', label: 'Secondary Specialization' },
  { level: 25, icon: '✨', label: 'Prestige unlocked' },
];

/** Next 1-3 unlocks above the player's current level. */
export function nextUnlocks(limit = 3): UnlockHint[] {
  const lvl = state.level;
  return HIGHLIGHTS.filter(u => u.level > lvl).slice(0, limit);
}

/** The single most exciting next unlock (used by the HUD chip). */
export function nextBigUnlock(): UnlockHint | null {
  const list = nextUnlocks(1);
  return list[0] ?? null;
}

/** Catch-all check that produces a deep list including dynamic content
 *  (new crops, items, animals, buildings, orchards) — useful for the
 *  Help panel or a future unlocks browser. Kept simple. */
export function allFutureUnlocks(): UnlockHint[] {
  const lvl = state.level;
  const out: UnlockHint[] = [];
  for (const k of Object.keys(CROPS)) {
    const c = CROPS[k]!;
    if (c.level > lvl) out.push({ level: c.level, icon: '🌱', label: `Crop: ${ITEMS[c.item]?.name ?? k}` });
  }
  for (const k of Object.keys(ANIMALS)) {
    const a = ANIMALS[k]!;
    if (a.level > lvl) out.push({ level: a.level, icon: '🐾', label: `Animal: ${a.name}` });
  }
  for (const k of Object.keys(BUILDINGS)) {
    const b = BUILDINGS[k]!;
    if (b.level > lvl) out.push({ level: b.level, icon: '🏗️', label: `Build: ${b.name}` });
  }
  for (const k of Object.keys(ORCHARDS)) {
    const o = ORCHARDS[k]!;
    if (o.level > lvl) out.push({ level: o.level, icon: '🌳', label: `Tree: ${o.name}` });
  }
  out.sort((a, b) => a.level - b.level);
  return out;
}
