// =============================================================
//  DAILY WHEEL — a free spin every local day. Variable reward
//  distribution to hit the dopamine sweet spot.
// =============================================================

import { state } from '../state';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { addXP } from './xp';
import { addItem } from './inventory';
import { track } from './telemetry';
import { localDayIndex } from './daily';
import { consumeBonusSpin, hasBonusSpin } from './ad-rewards';

export interface WheelSlice {
  label: string;
  weight: number;
  color: string;
  apply: () => void;
}

export interface WheelState {
  lastSpinDay: number;
  spinning: boolean;
  pendingResult: number | null;
}

export function initWheel(): void {
  if (!state.wheel) state.wheel = { lastSpinDay: 0, spinning: false, pendingResult: null };
}

export function canSpin(): boolean {
  initWheel();
  if (state.wheel!.lastSpinDay !== localDayIndex()) return true;
  // The free daily spin is used; bonus spins (from rewarded ads)
  // keep the wheel spinnable until they run out.
  return hasBonusSpin();
}

export function getSlices(): WheelSlice[] {
  const lvl = Math.max(1, state.level);
  return [
    { label: `+${50 + lvl * 8}💰`, weight: 30, color: '#f4c542',
      apply: () => { const c = 50 + lvl * 8; state.coins += c; state.stats.earned += c; toast(`+${c} 💰`, 'gold'); } },
    { label: `+${10 + lvl * 2} XP`, weight: 22, color: '#3c8dbc',
      apply: () => { addXP(10 + lvl * 2); } },
    { label: `+${120 + lvl * 18}💰`, weight: 15, color: '#e87018',
      apply: () => { const c = 120 + lvl * 18; state.coins += c; state.stats.earned += c; toast(`+${c} 💰`, 'gold'); } },
    { label: '+3 Feed', weight: 12, color: '#7ec850',
      apply: () => { addItem('feed', 3); toast('+3 feed', 'xp'); } },
    { label: '+1 Fertilizer', weight: 8, color: '#3a8020',
      apply: () => { addItem('fertilizer', 1); toast('+1 fertilizer', 'xp'); } },
    { label: '+1 Speedup', weight: 6, color: '#a85ac0',
      apply: () => { addItem('speedup', 1); toast('+1 speed boost', 'xp'); } },
    { label: 'JACKPOT!', weight: 4, color: '#ff4040',
      apply: () => {
        const c = 500 + lvl * 60;
        state.coins += c; state.stats.earned += c;
        addXP(20 + lvl * 4);
        toast(`💎 JACKPOT! +${c}💰 +${20 + lvl * 4}XP`, 'gold');
      },
    },
    { label: 'Treasure!', weight: 3, color: '#c890ff',
      apply: () => {
        addItem('qualityink', 1);
        addItem('priority', 1);
        toast('Rare loot! +1 ink, +1 priority', 'gold');
      },
    },
  ];
}

export function spinWheel(): number | null {
  initWheel();
  if (!canSpin()) return null;
  const slices = getSlices();
  const total = slices.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  let picked = 0;
  for (let i = 0; i < slices.length; i++) {
    r -= slices[i]!.weight;
    if (r <= 0) { picked = i; break; }
  }
  // Consume the free daily spin first; if it's already been used
  // today, drain a bonus spin from the rewarded-ad pool instead.
  if (state.wheel!.lastSpinDay !== localDayIndex()) {
    state.wheel!.lastSpinDay = localDayIndex();
  } else {
    consumeBonusSpin();
  }
  state.wheel!.pendingResult = picked;
  state.wheel!.spinning = true;
  sfx.click();
  return picked;
}

export function applySpinResult(): void {
  initWheel();
  const w = state.wheel!;
  if (w.pendingResult === null) return;
  const slice = getSlices()[w.pendingResult]!;
  slice.apply();
  sfx.coin(); sfx.bell();
  track('wheel_spun', { slice: slice.label });
  w.pendingResult = null;
  w.spinning = false;
  updateHUD();
}
