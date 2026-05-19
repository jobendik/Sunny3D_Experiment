// =============================================================
//  CATALYSTS — consumable items that can be used on production
//  queues to speed them up, or "priority" them to the front.
// =============================================================

import { state } from '../state';
import { nowSeconds } from '../utils';
import { removeItem } from './inventory';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';

export const CATALYST_DEFS = [
  { id: 'fertilizer',   name: 'Fertilizer',    price: 30,  level: 3,
    desc: 'Boost a tile\'s soil fertility instantly.' },
  { id: 'speedup',      name: 'Speed Boost',   price: 80,  level: 4,
    desc: 'Cut current production job time by 30%.' },
  { id: 'priority',     name: 'Priority Token',price: 150, level: 5,
    desc: 'Move a queue job to the front.' },
  { id: 'qualityink',   name: 'Quality Ink',   price: 250, level: 6,
    desc: 'Upgrade next produced item to higher quality.' },
];

export function speedupQueue(buildingId: string): boolean {
  if ((state.inv.speedup ?? 0) <= 0) {
    toast('No Speed Boosts!', 'error');
    sfx.error();
    return false;
  }
  const q = state.prodQueues[buildingId];
  if (!q || q.length === 0) {
    toast('Queue is empty', 'error');
    sfx.error();
    return false;
  }
  removeItem('speedup', 1);
  const now = nowSeconds();
  for (const job of q) {
    const remaining = job.doneAt - now;
    if (remaining > 0) job.doneAt = now + remaining * 0.7;
  }
  toast('Production sped up!', 'gold');
  sfx.bell();
  return true;
}

export function priorityToken(buildingId: string, queueIdx: number): boolean {
  if ((state.inv.priority ?? 0) <= 0) {
    toast('No Priority Tokens!', 'error');
    sfx.error();
    return false;
  }
  const q = state.prodQueues[buildingId];
  if (!q || queueIdx <= 0 || !q[queueIdx]) return false;
  removeItem('priority', 1);
  const job = q.splice(queueIdx, 1)[0]!;
  q.unshift(job);
  toast('Bumped to front!', 'gold');
  sfx.bell();
  return true;
}

export function nextQualityFlag(buildingId: string): boolean {
  if ((state.inv.qualityink ?? 0) <= 0) {
    toast('No Quality Ink!', 'error');
    sfx.error();
    return false;
  }
  removeItem('qualityink', 1);
  state.qualityFlags = state.qualityFlags ?? {};
  state.qualityFlags[buildingId] = true;
  toast('Next item will be Perfect quality!', 'gold');
  sfx.bell();
  return true;
}

export function consumeQualityFlag(buildingId: string): 'normal' | 'good' | 'perfect' {
  state.qualityFlags = state.qualityFlags ?? {};
  if (state.qualityFlags[buildingId]) {
    delete state.qualityFlags[buildingId];
    return 'perfect';
  }
  // Random 70/25/5 distribution by default.
  const r = Math.random();
  if (r < 0.05) return 'perfect';
  if (r < 0.30) return 'good';
  return 'normal';
}

export const QUALITY_VALUE: Record<'normal' | 'good' | 'perfect', number> = {
  normal: 1.0, good: 1.4, perfect: 2.0,
};
