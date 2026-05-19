// =============================================================
//  ASYNC VISITORS — simulated peer farmers visit and leave
//  bonus tips. Triggered daily after rollover.
// =============================================================

import { state } from '../state';
import { addItem } from './inventory';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { rand, randi, choice } from '../utils';
import { localDayIndex } from './daily';

const VISITOR_NAMES = ['Holly', 'Marsh', 'River', 'Oat', 'Pip', 'Sage', 'Clover', 'Wren'];

interface VisitorState {
  lastVisitDay: number;
}

declare module '../types' {
  interface GameState {
    visitors?: VisitorState;
  }
}

export function tickVisitors(): void {
  if (!state.visitors) state.visitors = { lastVisitDay: 0 };
  const today = localDayIndex();
  if (state.visitors.lastVisitDay === today) return;
  if (state.visitors.lastVisitDay !== 0) {
    // A visitor has stopped by since last login.
    const name = choice(VISITOR_NAMES);
    const coins = 30 + randi(80) + state.level * 6;
    state.coins += coins;
    state.stats.earned += coins;
    if (rand(1) < 0.4) {
      const gifts = ['fertilizer', 'worm', 'feed'];
      const g = choice(gifts);
      addItem(g, 1);
      toast(`${name} visited! +${coins}💰 +1 ${g}`, 'gold');
    } else {
      toast(`${name} dropped by and left ${coins}💰`, 'gold');
    }
    sfx.coin();
    track('visitor', { name, coins });
  }
  state.visitors.lastVisitDay = today;
}
