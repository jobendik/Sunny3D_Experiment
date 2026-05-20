// =============================================================
//  LANDMARK CONSTRUCTION — Phase 7 of the roadmap. Multi-stage
//  community-style projects that give the farm long-term goals
//  and unlock world flavor when complete.
// =============================================================

import { state } from '../state';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { spawnHUDBurst } from './flyers';
import type { LandmarkProject, LandmarkStage } from '../types';

export interface LandmarkDef {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
  blurb: string;
  reward: string; // human-readable
  stages: LandmarkStage[];
}

export const LANDMARKS: Record<string, LandmarkDef> = {
  weatherTower: {
    id: 'weatherTower',
    name: 'Weather Tower',
    emoji: '🗼',
    unlockLevel: 7,
    blurb: 'Restore the old observatory to deepen your weather mastery.',
    reward: '+1 Weather Grid slot + forecast bonus',
    stages: [
      { name: 'Clear the ruins',  reqs: { plank: 2, nail: 3 },                  rewardCoins: 200, rewardXp: 20, rewardMaterial: 'rope' },
      { name: 'Raise the frame',  reqs: { plank: 4, screw: 3, panel: 2 },       rewardCoins: 400, rewardXp: 40, rewardMaterial: 'hinge' },
      { name: 'Install vane',     reqs: { hinge: 2, paint: 1, candle: 2 },      rewardCoins: 700, rewardXp: 70, rewardMaterial: 'paint' },
      { name: 'Activate beacon',  reqs: { perfume: 1, honey: 2, paint: 1 },     rewardCoins: 1200, rewardXp: 110 },
    ],
  },
  marketPier: {
    id: 'marketPier',
    name: 'Market Pier',
    emoji: '⚓',
    unlockLevel: 9,
    blurb: 'A real river pier so larger boats can dock and trade.',
    reward: 'Boats arrive more often, +rare crate items',
    stages: [
      { name: 'Repair dock planks',  reqs: { plank: 4, nail: 4 },                  rewardCoins: 350, rewardXp: 30, rewardMaterial: 'plank' },
      { name: 'Build crate platform', reqs: { plank: 5, screw: 3, rope: 2 },        rewardCoins: 700, rewardXp: 55, rewardMaterial: 'stake' },
      { name: 'Install market bell',  reqs: { hinge: 2, bolt: 3, paint: 1, cloth: 2 }, rewardCoins: 1200, rewardXp: 110 },
    ],
  },
  sunnyStation: {
    id: 'sunnyStation',
    name: 'Sunny Station',
    emoji: '🚉',
    unlockLevel: 13,
    blurb: 'A proper train station unlocks faster routes and bigger cargo loads.',
    reward: '+1 train crate slot, -10m trip time',
    stages: [
      { name: 'Clear the tracks',   reqs: { plank: 5, nail: 5, rope: 2 },         rewardCoins: 500, rewardXp: 50 },
      { name: 'Build platform',     reqs: { plank: 6, screw: 4, panel: 3 },       rewardCoins: 900, rewardXp: 80, rewardMaterial: 'paint' },
      { name: 'Signal post',        reqs: { hinge: 2, bolt: 3, paint: 1 },        rewardCoins: 1500, rewardXp: 130 },
      { name: 'Inaugurate the line', reqs: { ribs: 1, pie: 1, cake: 1, juice: 2 }, rewardCoins: 2500, rewardXp: 220 },
    ],
  },
  greatBarn: {
    id: 'greatBarn',
    name: 'Great Barn',
    emoji: '🏚️',
    unlockLevel: 12,
    blurb: 'Build a grand barn at the heart of the farm. Bigger storage, prouder farm.',
    reward: 'Permanent +30 Barn capacity',
    stages: [
      { name: 'Frame the walls',    reqs: { plank: 6, nail: 6 },                  rewardCoins: 600, rewardXp: 60, rewardMaterial: 'plank' },
      { name: 'Raise the roof',     reqs: { plank: 5, screw: 5, rope: 3 },        rewardCoins: 1100, rewardXp: 90, rewardMaterial: 'hinge' },
      { name: 'Paint and polish',   reqs: { paint: 2, hinge: 3, candle: 3 },      rewardCoins: 1800, rewardXp: 160 },
    ],
  },
};

export function initLandmarks(): void {
  if (!state.landmarks) {
    state.landmarks = { projects: {} };
  }
  for (const id of Object.keys(LANDMARKS)) {
    if (!state.landmarks.projects[id]) {
      state.landmarks.projects[id] = {
        id, stageIdx: 0, contributed: {}, completed: false,
      };
    }
  }
}

export function isLandmarkUnlocked(id: string): boolean {
  const def = LANDMARKS[id];
  return !!def && state.level >= def.unlockLevel;
}

export function landmarkProject(id: string): LandmarkProject | null {
  initLandmarks();
  return state.landmarks!.projects[id] ?? null;
}

export function currentStage(id: string): LandmarkStage | null {
  const def = LANDMARKS[id];
  const p = landmarkProject(id);
  if (!def || !p || p.completed) return null;
  return def.stages[p.stageIdx] ?? null;
}

/** Contribute one (or more) of an item toward the current stage. */
export function contributeToLandmark(id: string, itemKey: string, qty = 1): boolean {
  const stage = currentStage(id);
  const p = landmarkProject(id);
  if (!stage || !p) return false;
  const need = stage.reqs[itemKey];
  if (!need) return false;
  const have = p.contributed[itemKey] ?? 0;
  if (have >= need) return false;
  const room = need - have;
  const give = Math.min(qty, room, state.inv[itemKey] ?? 0);
  if (give <= 0) {
    sfx.error();
    toast('Not enough in your inventory.');
    return false;
  }
  if (!removeItem(itemKey, give)) return false;
  p.contributed[itemKey] = have + give;
  sfx.order();
  if (isStageComplete(id)) {
    completeStage(id);
  }
  return true;
}

export function contributeAll(id: string, itemKey: string): boolean {
  const stage = currentStage(id);
  const p = landmarkProject(id);
  if (!stage || !p) return false;
  const need = stage.reqs[itemKey];
  if (!need) return false;
  const have = p.contributed[itemKey] ?? 0;
  const room = need - have;
  if (room <= 0) return false;
  const myCount = state.inv[itemKey] ?? 0;
  const give = Math.min(room, myCount);
  if (give <= 0) {
    sfx.error();
    toast('Not enough in your inventory.');
    return false;
  }
  return contributeToLandmark(id, itemKey, give);
}

function isStageComplete(id: string): boolean {
  const stage = currentStage(id);
  const p = landmarkProject(id);
  if (!stage || !p) return false;
  for (const k in stage.reqs) {
    if ((p.contributed[k] ?? 0) < stage.reqs[k]!) return false;
  }
  return true;
}

function completeStage(id: string): void {
  const def = LANDMARKS[id]!;
  const p = state.landmarks!.projects[id]!;
  const stage = def.stages[p.stageIdx]!;
  state.coins += stage.rewardCoins;
  state.stats.earned += stage.rewardCoins;
  addXP(stage.rewardXp);
  if (stage.rewardMaterial) addItem(stage.rewardMaterial, 1);
  spawnHUDBurst('coin', Math.min(8, 3 + Math.floor(stage.rewardCoins / 100)));
  track('landmark_stage_completed', { id, stage: p.stageIdx });
  toast(`${def.emoji} ${def.name}: stage complete! +${stage.rewardCoins}💰 +${stage.rewardXp}XP`, 'gold');
  // Advance stage / complete project.
  p.contributed = {};
  p.stageIdx += 1;
  if (p.stageIdx >= def.stages.length) {
    p.completed = true;
    track('landmark_completed', { id });
    setTimeout(() => {
      toast(`🎉 ${def.name} is complete! ${def.reward}`, 'gold');
      onLandmarkComplete(id);
    }, 600);
  }
  updateHUD();
}

/** Permanent unlock effects. */
function onLandmarkComplete(id: string): void {
  if (id === 'greatBarn' && state.storage) {
    state.storage.barn.capacity += 30;
  }
  if (id === 'sunnyStation' && state.train) {
    state.train.level = Math.max(state.train.level, 2);
  }
}

export function landmarkProgressPct(id: string): number {
  const stage = currentStage(id);
  const p = landmarkProject(id);
  if (!stage || !p) return 100;
  let needed = 0, have = 0;
  for (const k in stage.reqs) {
    needed += stage.reqs[k]!;
    have += Math.min(stage.reqs[k]!, p.contributed[k] ?? 0);
  }
  return needed === 0 ? 100 : Math.round((have / needed) * 100);
}
