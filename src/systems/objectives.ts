// =============================================================
//  OBJECTIVE RAIL — the "next best action" hint surfaced
//  prominently in the HUD. Ranks the most fruitful action so
//  players always know what to do next.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ANIMALS } from '../data/animals';
import { ITEMS } from '../data/items';
import { nowSeconds } from '../utils';
import { cropStage, isWilting } from './crops';
import { canClaimStreak, timedClaimReady } from './daily';
import { canSpin } from './wheel';
import { getTreeStage } from './trees';
import { penFeedLevel } from './pens';

export interface ObjectiveSuggestion {
  text: string;
  icon: string;
  priority: number;
  actionId?: string;
  payload?: Record<string, string | number>;
}

// Return the top-K objectives ordered by priority (high → low).
export function rankObjectives(): ObjectiveSuggestion[] {
  const out: ObjectiveSuggestion[] = [];

  // -------- Critical: return gift --------
  if (state.daily?.pendingReturnGift && state.daily.pendingReturnGift.coins > 0 && !state.daily.returnGiftClaimed) {
    out.push({
      text: `Claim return gift (+${state.daily.pendingReturnGift.coins}💰)`,
      icon: '🎁', priority: 100, actionId: 'claimReturn',
    });
  }

  // -------- Critical: streak claim --------
  if (state.daily && canClaimStreak()) {
    out.push({
      text: `Claim daily streak (Day ${state.daily.streak})`,
      icon: '🔥', priority: 95, actionId: 'claimStreak',
    });
  }

  // -------- High: timed claim --------
  if (state.daily && timedClaimReady()) {
    out.push({
      text: 'Claim timed reward',
      icon: '⏱️', priority: 90, actionId: 'claimTimed',
    });
  }

  // -------- High: daily wheel spin --------
  if (canSpin()) {
    out.push({
      text: 'Spin the Daily Wheel',
      icon: '🎡', priority: 92, actionId: 'openWheel',
    });
  }

  // -------- High: completable daily challenge --------
  if (state.daily) {
    for (const c of state.daily.challenges) {
      if (c.complete && !c.claimed) {
        out.push({
          text: `Claim "${c.desc}"`,
          icon: '✅', priority: 88, actionId: 'claimChallenge',
          payload: { id: c.id },
        });
      }
    }
  }

  // -------- High: completable quest --------
  for (const q of state.quests) {
    if (q.complete) {
      out.push({
        text: `Claim quest: ${q.desc}`,
        icon: '⭐', priority: 85, actionId: 'claimQuest',
        payload: { id: q.id },
      });
    }
  }

  // -------- High: fulfillable order --------
  for (const o of state.orders) {
    let ok = true;
    for (const k in o.items) if ((state.inv[k] ?? 0) < o.items[k]!) { ok = false; break; }
    if (ok) {
      out.push({
        text: `Deliver order (+${o.reward}💰)`,
        icon: '📦', priority: 82, actionId: 'fulfillOrder',
        payload: { id: o.id },
      });
    }
  }

  // -------- Medium: ready crop tile --------
  let readyCropCount = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (t.crop && cropStage(t) === 3) readyCropCount++;
    }
  }
  if (readyCropCount > 0) {
    out.push({
      text: `Harvest ${readyCropCount} ready crop${readyCropCount > 1 ? 's' : ''}`,
      icon: '🌾', priority: 70, actionId: 'harvest',
    });
  }

  // -------- Medium: wilting crop --------
  for (const row of state.grid) {
    for (const t of row) {
      if (t.crop && isWilting(t)) {
        out.push({
          text: 'Save wilting crops!',
          icon: '⚠️', priority: 78, actionId: 'wilting',
        });
      }
    }
  }

  // -------- Medium: hungry pen --------
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const animals = state.penAnimals[b.id] ?? [];
    if (animals.length === 0) continue;
    if (penFeedLevel(b.id) < 25) {
      out.push({
        text: `Feed ${def.name} (low feed!)`,
        icon: '🍽️', priority: 76, actionId: 'feedPen',
        payload: { id: b.id },
      });
    }
  }

  // -------- Medium: pen produce ready --------
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'pen') continue;
    const aniDef = ANIMALS[def.animal!]!;
    const animals = state.penAnimals[b.id] ?? [];
    let n = 0;
    for (const a of animals) {
      if (nowSeconds() - a.lastProduced >= aniDef.produceTime) n++;
    }
    if (n > 0) {
      out.push({
        text: `Collect ${n} ${ITEMS[aniDef.produces]!.name}`,
        icon: '🥚', priority: 65, actionId: 'pen',
        payload: { id: b.id },
      });
    }
  }

  // -------- Medium: production done --------
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'production') continue;
    const q = state.prodQueues[b.id] ?? [];
    let n = 0;
    for (const j of q) if (j.doneAt <= nowSeconds()) n++;
    if (n > 0) {
      out.push({
        text: `Collect ${n} from ${def.name}`,
        icon: '🏭', priority: 62, actionId: 'production',
        payload: { id: b.id },
      });
    }
  }

  // -------- Medium: orchard ready --------
  let orchardReady = 0;
  for (const tr of state.trees) {
    if (getTreeStage(tr) === 3) orchardReady++;
  }
  if (orchardReady > 0) {
    out.push({
      text: `Harvest ${orchardReady} fruit tree${orchardReady > 1 ? 's' : ''}`,
      icon: '🍎', priority: 55, actionId: 'tree',
    });
  }

  // -------- Low: empty plowed tile --------
  let plowedEmpty = 0;
  for (const row of state.grid) {
    for (const t of row) {
      if (t.type === 'plowed' && !t.crop) plowedEmpty++;
    }
  }
  if (plowedEmpty > 0) {
    out.push({
      text: `Plant ${plowedEmpty} empty plot${plowedEmpty > 1 ? 's' : ''}`,
      icon: '🌱', priority: 35, actionId: 'plant',
    });
  }

  // -------- Low: idle production --------
  for (const b of state.buildings) {
    const def = BUILDINGS[b.type]!;
    if (def.kind !== 'production') continue;
    const q = state.prodQueues[b.id] ?? [];
    if (q.length === 0) {
      out.push({
        text: `Queue jobs in ${def.name}`,
        icon: '⚙️', priority: 30, actionId: 'queueProduction',
        payload: { id: b.id },
      });
      break; // only suggest one idle building
    }
  }

  // -------- Low: build first production (early game) --------
  if (state.level >= 2 && !state.buildings.some(b => BUILDINGS[b.type]!.kind === 'production')) {
    out.push({
      text: 'Build your first production!',
      icon: '🔨', priority: 50, actionId: 'openBuild',
    });
  }
  if (state.level >= 3 && !state.buildings.some(b => BUILDINGS[b.type]!.kind === 'pen')) {
    out.push({
      text: 'Build an animal pen',
      icon: '🐔', priority: 45, actionId: 'openBuild',
    });
  }
  if (state.level >= 3 && !state.buildings.some(b => b.type === 'fishingdock')) {
    out.push({
      text: 'Build a fishing dock by the lake',
      icon: '🎣', priority: 42, actionId: 'openBuild',
    });
  }

  // sort descending priority, take top 4
  out.sort((a, b) => b.priority - a.priority);
  return out.slice(0, 4);
}
