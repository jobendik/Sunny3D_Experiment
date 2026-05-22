// =============================================================
//  SURPRISE BOX — Hay Day-style random-outcome box.
//
//  A surprise box appears on the farm at random intervals (or via
//  level-up or weekly events). Tapping the box opens a reveal modal
//  with random reward from one of several outcome pools. Bigger
//  boxes (rare/epic) reward more.
//
//  Players can also pay diamonds to skip the cooldown and conjure
//  a new box immediately — Hay Day uses this as a friction monetization
//  point.
// =============================================================

import { state } from '../state';
import { rand, randi, choice, nowSeconds } from '../utils';
import { addItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';
import { ITEMS } from '../data/items';
import type { MaterialKey } from '../types';

const SPAWN_INTERVAL_MIN = 60 * 30;  // 30 min minimum between boxes
const SPAWN_INTERVAL_MAX = 60 * 90;  // 90 min maximum
const DIAMOND_INSTANT_COST = 8;       // diamond cost to instantly spawn a new box

export interface SurpriseReward {
  label: string;
  emoji: string;
  apply: () => void;
}

export function initSurpriseBox(): void {
  if (!state.surpriseBox) {
    state.surpriseBox = {
      pending: false,
      nextSpawnAt: nowSeconds() + SPAWN_INTERVAL_MIN + rand(SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN),
      lastOpenedDay: 0,
      totalOpened: 0,
      rarity: 'common',
    };
  }
}

function pickRarity(): 'common' | 'rare' | 'epic' {
  const r = Math.random();
  if (r < 0.06) return 'epic';
  if (r < 0.30) return 'rare';
  return 'common';
}

function buildRewardPool(rarity: 'common' | 'rare' | 'epic'): SurpriseReward[] {
  const lvl = Math.max(1, state.level);
  const mul = rarity === 'epic' ? 4 : rarity === 'rare' ? 2 : 1;
  const pool: SurpriseReward[] = [
    {
      label: `+${(40 + lvl * 8) * mul}💰`,
      emoji: '💰',
      apply: () => {
        const c = (40 + lvl * 8) * mul;
        state.coins += c;
        state.stats.earned += c;
        toast(`📦 Surprise! +${c}💰`, 'gold');
      },
    },
    {
      label: `+${(10 + lvl * 2) * mul} XP`,
      emoji: '⭐',
      apply: () => {
        addXP((10 + lvl * 2) * mul);
        toast(`📦 Surprise! +${(10 + lvl * 2) * mul} XP`, 'xp');
      },
    },
    {
      label: `+${2 * mul} Feed`,
      emoji: '🌾',
      apply: () => {
        addItem('feed', 2 * mul);
        toast(`📦 Surprise! +${2 * mul} feed`, 'xp');
      },
    },
    {
      label: `+${mul} Fertilizer`,
      emoji: '🪴',
      apply: () => {
        addItem('fertilizer', mul);
        toast(`📦 Surprise! +${mul} fertilizer`, 'xp');
      },
    },
  ];

  if (rarity !== 'common') {
    pool.push({
      label: `+1 💎`,
      emoji: '💎',
      apply: () => {
        state.gems += 1;
        toast('📦 Surprise! +1 diamond', 'gold');
      },
    });
    pool.push({
      label: `+${mul} Speed Boost`,
      emoji: '⚡',
      apply: () => {
        addItem('speedup', mul);
        toast(`📦 Surprise! +${mul} speed boost`, 'xp');
      },
    });
  }

  if (rarity === 'epic') {
    pool.push({
      label: '+3 💎',
      emoji: '💎',
      apply: () => {
        state.gems += 3;
        toast('📦 EPIC Surprise! +3 diamonds', 'gold');
      },
    });
    pool.push({
      label: '+1 Quality Ink',
      emoji: '✨',
      apply: () => {
        addItem('qualityink', 1);
        toast('📦 EPIC Surprise! +1 quality ink', 'gold');
      },
    });
    // Materials for landmarks
    const mats: MaterialKey[] = ['plank', 'screw', 'paint', 'panel', 'bolt', 'rope', 'stake', 'mallet'];
    const m = choice(mats);
    pool.push({
      label: `+2 ${ITEMS[m]?.name ?? m}`,
      emoji: '🔧',
      apply: () => {
        addItem(m, 2);
        toast(`📦 EPIC Surprise! +2 ${ITEMS[m]?.name ?? m}`, 'gold');
      },
    });
    // FV3 gacha grammar — exotic animal token. Tokens accumulate in
    // inventory and can be redeemed later via the Sanctuary / Codex.
    pool.push({
      label: '🐾 Exotic Animal Token',
      emoji: '🐾',
      apply: () => {
        addItem('exotictoken', 1);
        toast('📦 EPIC Surprise! Exotic animal token!', 'gold');
      },
    });
    // 1 Scout Favor — premium-pass tier currency, gameplay-earned.
    pool.push({
      label: '🧭 Scout Favor',
      emoji: '🧭',
      apply: () => {
        addItem('scoutfavor', 1);
        toast('📦 EPIC Surprise! Scout Favor token!', 'gold');
      },
    });
  }

  return pool;
}

/** Try to spawn a new box if cooldown elapsed. */
export function tickSurpriseBox(): void {
  initSurpriseBox();
  const sb = state.surpriseBox!;
  if (sb.pending) return;
  if (nowSeconds() >= sb.nextSpawnAt) {
    sb.pending = true;
    sb.rarity = pickRarity();
    const emoji = sb.rarity === 'epic' ? '🎁' : sb.rarity === 'rare' ? '🎀' : '📦';
    toast(`${emoji} A surprise box has appeared! Open it from the menu.`, 'gold');
    sfx.bell();
    track('surprise_box_spawned', { rarity: sb.rarity });
  }
}

export function hasPendingBox(): boolean {
  initSurpriseBox();
  return state.surpriseBox!.pending;
}

export function currentRarity(): 'common' | 'rare' | 'epic' {
  initSurpriseBox();
  return state.surpriseBox!.rarity;
}

export function openSurpriseBox(): SurpriseReward | null {
  initSurpriseBox();
  const sb = state.surpriseBox!;
  if (!sb.pending) return null;
  const pool = buildRewardPool(sb.rarity);
  const reward = choice(pool);
  reward.apply();
  sb.pending = false;
  sb.lastOpenedDay = localDayIndex();
  sb.totalOpened += 1;
  sb.nextSpawnAt = nowSeconds() + SPAWN_INTERVAL_MIN + rand(SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  sfx.coin(); sfx.bell();
  updateHUD();
  track('surprise_box_opened', { rarity: sb.rarity, label: reward.label });
  return reward;
}

/** Spend diamonds to instantly conjure a new box. */
export function instantSpawn(): boolean {
  initSurpriseBox();
  if (state.surpriseBox!.pending) {
    toast('A box is already waiting!');
    return false;
  }
  if (state.gems < DIAMOND_INSTANT_COST) {
    sfx.cantAfford();
    toast(`Need ${DIAMOND_INSTANT_COST} 💎`);
    return false;
  }
  state.gems -= DIAMOND_INSTANT_COST;
  state.surpriseBox!.pending = true;
  state.surpriseBox!.rarity = Math.random() < 0.4 ? 'rare' : 'epic'; // diamond skips never give common
  sfx.bell();
  updateHUD();
  track('surprise_box_instant', { cost: DIAMOND_INSTANT_COST });
  return true;
}

export function timeUntilNext(): number {
  initSurpriseBox();
  if (state.surpriseBox!.pending) return 0;
  return Math.max(0, state.surpriseBox!.nextSpawnAt - nowSeconds());
}

export const SURPRISE_INSTANT_COST = DIAMOND_INSTANT_COST;
