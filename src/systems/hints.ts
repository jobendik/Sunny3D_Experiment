// =============================================================
//  ADAPTIVE HINTS — non-blocking, contextual tips that appear
//  briefly when the system detects an actionable insight.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { BUILDINGS } from '../data/buildings';
import { toast } from '../ui/toasts';

const COOLDOWN: Record<string, number> = {};

function fire(id: string, msg: string, secs = 60): void {
  const now = Date.now();
  if (COOLDOWN[id] && now < COOLDOWN[id]!) return;
  COOLDOWN[id] = now + secs * 1000;
  toast(msg, '');
}

export function maybeShowHints(): void {
  // Hint: rain bonus
  if (state.weather === 'rainy' && state.level <= 3) {
    fire('rain_growth', 'Rain speeds crop growth by 50%! Plant fast.', 120);
  }
  // Hint: storm warning
  if (state.weather === 'storm') {
    fire('storm_warning', 'Storms can spawn crows. Stay alert!', 90);
  }
  // Hint: barn near full
  const totalItems = Object.values(state.inv).reduce((a, n) => a + (n ?? 0), 0);
  if (totalItems > 60) {
    fire('barn_full', 'Inventory is filling up — sell or use items!', 180);
  }
  // Hint: idle production
  for (const b of state.buildings) {
    if (BUILDINGS[b.type]!.kind !== 'production') continue;
    const q = state.prodQueues[b.id] ?? [];
    if (q.length === 0 && state.coins > 100) {
      fire('idle_prod_' + b.id, `Your ${BUILDINGS[b.type]!.name} is idle — queue something!`, 120);
      break;
    }
  }
  // Hint: low coins early
  if (state.coins < 20 && state.stats.harvested < 5) {
    fire('low_coins', 'Wheat is your fastest cash crop early. Plant more!', 120);
  }
}
