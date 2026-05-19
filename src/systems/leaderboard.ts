// =============================================================
//  LOCAL LEADERBOARD — single-player simulated ranks. We keep
//  the top entry locally and compare against pre-baked
//  fictitious peers so the player feels chasing.
// =============================================================

import { state } from '../state';
import { beautyScore } from './beautification';

const KEY = 'sunnyacres-lb-v1';

export interface LBSlice {
  category: 'coinsEarned' | 'ordersFulfilled' | 'fishCaught' | 'questsDone' | 'beautyScore';
  label: string;
  yours: number;
  rank: number;
  topPeers: Array<{ name: string; score: number }>;
}

// Persistent personal best tracked in localStorage.
interface PB {
  coinsEarned: number;
  ordersFulfilled: number;
  fishCaught: number;
  questsDone: number;
  beautyScore: number;
}

function loadPB(): PB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { coinsEarned: 0, ordersFulfilled: 0, fishCaught: 0, questsDone: 0, beautyScore: 0 };
}

function savePB(pb: PB): void {
  try { localStorage.setItem(KEY, JSON.stringify(pb)); } catch { /* ignore */ }
}

// Simulated peers grow weekly to keep pressure on.
const NAMES = ['Holly H.', 'Marsh M.', 'River R.', 'Oat O.', 'Pip P.', 'Sage S.', 'Clover C.', 'Wren W.'];
function simulatedPeers(category: keyof PB): Array<{ name: string; score: number }> {
  const week = Math.floor(Date.now() / (7 * 86400000));
  const base = {
    coinsEarned: 5000 + week * 750,
    ordersFulfilled: 30 + week * 8,
    fishCaught: 20 + week * 4,
    questsDone: 25 + week * 6,
    beautyScore: 30 + week * 3,
  }[category];
  return NAMES.map((n, i) => ({
    name: n,
    score: Math.floor(base * (1 + (i + 1) / 12) + (i % 3 === 0 ? base * 0.3 : 0)),
  })).sort((a, b) => b.score - a.score);
}

function valueFor(category: keyof PB): number {
  if (category === 'beautyScore') return beautyScore();
  if (category === 'coinsEarned') return state.stats.earned;
  if (category === 'ordersFulfilled') return state.stats.ordersFulfilled;
  if (category === 'fishCaught') return state.stats.fishCaught;
  return state.stats.questsDone;
}

export function refreshLeaderboards(): LBSlice[] {
  const cats: Array<keyof PB> = ['coinsEarned', 'ordersFulfilled', 'fishCaught', 'questsDone', 'beautyScore'];
  const labels: Record<keyof PB, string> = {
    coinsEarned: 'Coins Earned',
    ordersFulfilled: 'Orders Fulfilled',
    fishCaught: 'Fish Caught',
    questsDone: 'Quests Done',
    beautyScore: 'Farm Beauty',
  };
  const pb = loadPB();
  const out: LBSlice[] = [];
  for (const c of cats) {
    const yours = valueFor(c);
    if (yours > pb[c]) pb[c] = yours;
    const peers = simulatedPeers(c);
    const merged = [{ name: 'You', score: yours }, ...peers].sort((a, b) => b.score - a.score);
    const rank = merged.findIndex(m => m.name === 'You') + 1;
    out.push({
      category: c,
      label: labels[c],
      yours,
      rank,
      topPeers: merged.slice(0, 5),
    });
  }
  savePB(pb);
  return out;
}
