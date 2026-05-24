// =============================================================
//  ANIMAL LIFECYCLE  (FV3 "continuous lifecycle mini-game")
//
//  Stages:
//    baby   — just born; cannot produce; grows for BABY_GROW_S real-time
//             seconds, then auto-promotes to adult.
//    adult  — produces normally.
//    mature — has produced MATURE_PRODUCE_THRESHOLD times; eligible
//             for breeding via the pen panel.
//
//  Save migration: any PenAnimal lacking `bornAt`/`stage` is
//  back-filled at load time as `adult` with bornAt - BABY_GROW_S
//  so the existing herd skips the baby phase.
//
//  Capacity tension: when an empty slot is needed (breeding into a
//  full pen) the oldest mature animal is auto-listed for sale — this
//  is the friction the research doc describes as the heart of FV3's
//  retention loop.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { TILE } from '../constants';
import { nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { addItem, removeItem } from './inventory';
import { floatText } from './particles';

/** Real-world seconds for a baby to grow into an adult. */
export const BABY_GROW_S = 90;
/** How many successful collects before an adult becomes "mature"
 *  and breeding-eligible. */
export const MATURE_PRODUCE_THRESHOLD = 3;
/** Coin + feed cost of a breeding action (per pen). */
export const BREED_COIN_COST = 50;
export const BREED_FEED_COST = 3;

/** One-shot backfill of legacy PenAnimal entries on save load. */
export function migrateLifecycle(): void {
  const now = nowSeconds();
  for (const list of Object.values(state.penAnimals)) {
    for (const a of list) {
      if (a.bornAt === undefined) a.bornAt = now - BABY_GROW_S - 1;
      if (a.stage === undefined) a.stage = 'adult';
      if (a.produceCount === undefined) a.produceCount = 0;
    }
  }
}

/** Periodic tick — promotes babies → adults when grown. Called from
 *  loop.ts on a cheap cadence (~1 Hz is plenty). */
export function tickLifecycle(): void {
  const now = nowSeconds();
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def || def.kind !== 'pen') continue;
    const list = state.penAnimals[b.id];
    if (!list) continue;
    for (const a of list) {
      if (a.stage === 'baby' && a.bornAt !== undefined) {
        if (now - a.bornAt >= BABY_GROW_S) {
          a.stage = 'adult';
          a.lastProduced = now;
          const aniDef = def.animal ? ANIMALS[def.animal] : null;
          toast(`A baby ${aniDef?.name ?? 'animal'} grew up!`, 'gold');
          sfx.bell?.();
          floatText(
            b.x * TILE + def.w * TILE / 2,
            b.y * TILE + def.h * TILE / 2,
            'Grew up!',
            '#d7832f',
          );
        }
      }
    }
  }
}

/** Bump an animal's produce count after a successful collect; promote
 *  to 'mature' once the threshold is reached. */
export function recordProduce(buildingId: string, idx: number): void {
  const list = state.penAnimals[buildingId];
  if (!list) return;
  const a = list[idx];
  if (!a) return;
  a.produceCount = (a.produceCount ?? 0) + 1;
  if (a.stage === 'adult' && a.produceCount >= MATURE_PRODUCE_THRESHOLD) {
    a.stage = 'mature';
  }
}

/** True if a pen has at least 2 mature animals — eligible to breed. */
export function canBreedPen(buildingId: string): boolean {
  const list = state.penAnimals[buildingId] ?? [];
  let mature = 0;
  for (const a of list) if (a.stage === 'mature') mature++;
  return mature >= 2;
}

export interface BreedResult {
  ok: boolean;
  reason?: string;
}

/** Spend the breeding cost and add a baby to the pen, if there's room.
 *  When the pen is at capacity, returns ok:false with a helpful reason
 *  — the player must sell an animal first. (We never auto-sell, since
 *   that would surprise the player; capacity tension is intentional.) */
export function tryBreed(buildingId: string): BreedResult {
  if (!canBreedPen(buildingId)) {
    return { ok: false, reason: 'Need 2 mature animals to breed.' };
  }
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return { ok: false, reason: 'Pen not found.' };
  const def = BUILDINGS[b.type];
  if (!def || !def.animal) return { ok: false, reason: 'Not a pen.' };
  const list = state.penAnimals[buildingId] ?? (state.penAnimals[buildingId] = []);
  if (list.length >= def.capacity!) {
    return { ok: false, reason: 'Pen is full — sell an animal first.' };
  }
  if (state.coins < BREED_COIN_COST) {
    return { ok: false, reason: `Need ${BREED_COIN_COST}💰 to breed.` };
  }
  if ((state.inv.feed ?? 0) < BREED_FEED_COST) {
    return { ok: false, reason: `Need ${BREED_FEED_COST} feed to breed.` };
  }
  // Spend resources.
  state.coins -= BREED_COIN_COST;
  removeItem('feed', BREED_FEED_COST);
  // Spawn a baby.
  const aniDef = ANIMALS[def.animal];
  const now = nowSeconds();
  list.push({
    kind: def.animal,
    lastProduced: now,           // will not produce until promoted to adult
    ax: 12 + Math.random() * 24,
    ay: 12 + Math.random() * 24,
    tx: 12 + Math.random() * 24,
    ty: 12 + Math.random() * 24,
    frameT: Math.random() * 2,
    frame: 0,
    bornAt: now,
    stage: 'baby',
    produceCount: 0,
  });
  state.stats.animalsOwned += 1;
  sfx.bell?.();
  toast(`👶 A baby ${aniDef?.name ?? 'animal'} was born!`, 'gold');
  return { ok: true };
}

/** Sell an animal — clears its slot, refunds half its species price. */
export function sellAnimal(buildingId: string, idx: number): boolean {
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return false;
  const def = BUILDINGS[b.type];
  if (!def || !def.animal) return false;
  const list = state.penAnimals[buildingId];
  if (!list || !list[idx]) return false;
  const aniDef = ANIMALS[def.animal];
  if (!aniDef) return false;
  const refund = Math.floor(aniDef.price * 0.5);
  list.splice(idx, 1);
  state.coins += refund;
  state.stats.earned += refund;
  sfx.coin?.();
  toast(`Sold ${aniDef.name} for ${refund}💰`, 'gold');
  return true;
}

export function sellMatureOverflow(buildingId: string, keepMature = 2): { sold: number; coins: number } {
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return { sold: 0, coins: 0 };
  const def = BUILDINGS[b.type];
  if (!def || !def.animal) return { sold: 0, coins: 0 };
  const list = state.penAnimals[buildingId];
  if (!list) return { sold: 0, coins: 0 };
  const matureIndexes = list
    .map((a, idx) => ({ a, idx }))
    .filter(row => row.a.stage === 'mature')
    .map(row => row.idx);
  const toSell = Math.max(0, matureIndexes.length - keepMature);
  if (toSell <= 0) return { sold: 0, coins: 0 };
  let sold = 0;
  let coins = 0;
  for (const idx of matureIndexes.slice(0, toSell).sort((a, b) => b - a)) {
    const before = state.coins;
    if (sellAnimal(buildingId, idx)) {
      sold++;
      coins += state.coins - before;
    }
  }
  if (sold > 1) toast(`Sold ${sold} mature animals for ${coins} coins.`, 'gold');
  return { sold, coins };
}

export function sellAllAdults(buildingId: string): { sold: number; coins: number } {
  const b = state.buildings.find(x => x.id === buildingId);
  if (!b) return { sold: 0, coins: 0 };
  const def = BUILDINGS[b.type];
  if (!def || !def.animal) return { sold: 0, coins: 0 };
  const list = state.penAnimals[buildingId];
  if (!list) return { sold: 0, coins: 0 };
  const indexes = list
    .map((a, idx) => ({ a, idx }))
    .filter(row => row.a.stage !== 'baby')
    .map(row => row.idx)
    .sort((a, b) => b - a);
  let sold = 0;
  let coins = 0;
  for (const idx of indexes) {
    const before = state.coins;
    if (sellAnimal(buildingId, idx)) {
      sold++;
      coins += state.coins - before;
    }
  }
  if (sold > 1) toast(`Bulk sold ${sold} animals for ${coins} coins.`, 'gold');
  return { sold, coins };
}

/** Visual scale for an animal in the 3D scene. Babies render smaller. */
export function visualScale(a: { stage?: 'baby' | 'adult' | 'mature'; bornAt?: number }): number {
  if (a.stage !== 'baby') return 1;
  // Gentle grow-in: 0.55 → 0.95 over BABY_GROW_S.
  if (a.bornAt === undefined) return 0.65;
  const age = nowSeconds() - a.bornAt;
  const t = Math.max(0, Math.min(1, age / BABY_GROW_S));
  return 0.55 + 0.4 * t;
}
