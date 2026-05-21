// =============================================================
//  DEBUG TOOLS — Phase 0 of the roadmap. Dev-only helpers to
//  exercise the new systems quickly. Exposed via window.dbg
//  when ?debug=1 is on the URL.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { addItem } from './inventory';
import { addXP } from './xp';
import { markBuildingTiles } from './grid';
import { toast } from '../ui/toasts';
import { tickStall } from './market-stall';
import { tickBoat } from './boat';
import { tickTrain } from './train';
import { tickBalloon } from './balloon';
import { maybeRolloverGazette } from './gazette';
import { saveGame } from '../save';

declare global {
  interface Window {
    dbg?: ReturnType<typeof makeDbg>;
  }
}

function makeDbg() {
  return {
    coins(n = 5000) { state.coins += n; toast(`+${n}💰 (dbg)`); },
    xp(n = 500) { addXP(n); toast(`+${n} XP (dbg)`); },
    item(key: string, n = 5) { addItem(key, n); toast(`+${n}× ${key}`); },
    mat(n = 5) {
      const mats = ['plank', 'nail', 'screw', 'hinge', 'paint', 'panel', 'bolt', 'rope', 'tarp', 'deed', 'stake', 'map', 'mallet', 'axe', 'saw', 'shovel', 'pickaxe'];
      for (const m of mats) addItem(m, n);
      toast(`+${n}× all materials (dbg)`);
    },
    skip(hours = 1) {
      tickStall(hours * 60);
      // Advance boat/train/balloon by manipulating their times.
      if (state.boat) {
        if (state.boat.departsAt > 0) state.boat.departsAt -= hours * 3600;
        if (state.boat.arrivesAt > 0) state.boat.arrivesAt -= hours * 3600;
      }
      if (state.train) {
        if (state.train.returnsAt > 0) state.train.returnsAt -= hours * 3600;
      }
      if (state.balloon) {
        if (state.balloon.nextAt > 0) state.balloon.nextAt -= hours * 3600;
        if (state.balloon.leavesAt > 0) state.balloon.leavesAt -= hours * 3600;
      }
      tickBoat();
      tickTrain();
      tickBalloon();
      toast(`Skipped ${hours}h (dbg)`);
    },
    refreshGazette() {
      maybeRolloverGazette();
      toast('Forced gazette refresh');
    },
    save() { saveGame(); toast('Saved'); },
    level(n: number) {
      state.level = n;
      toast(`Level set to ${n}`);
    },
    /** Force-place a building at tile (gx, gy). Bypasses cost/lock. */
    build(type: string, gx: number, gy: number) {
      const def = BUILDINGS[type];
      if (!def) { toast(`No such building: ${type}`); return; }
      const id = 'dbg_' + type + '_' + Date.now();
      state.buildings.push({ id, type, x: gx, y: gy, smokeT: 0 });
      for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
        const t = state.grid[gy + dy]?.[gx + dx];
        if (t) { t.type = 'soil'; t.crop = null; }
      }
      markBuildingTiles();
      if (def.kind === 'pen') state.penAnimals[id] = [];
      if (def.kind === 'production') state.prodQueues[id] = [];
      toast(`Built ${def.name} at (${gx},${gy})`);
    },
    /** Show a sample farm for visual testing. */
    sampleFarm() {
      this.build('henhouse', 13, 1);
      this.build('cowpen', 13, 5);
      this.build('bakery', 11, 10);
      this.build('windmill', 6, 11);
      this.build('dairy', 14, 13);
      this.build('pigpen', 6, 1);
      // Mature apple trees in the SW orchard zone
      const treeT = Date.now() / 1000 - 3600 * 24;
      state.trees.push({ id: 't1', type: 'appletree', x: 2, y: 12, plantedAt: treeT, lastHarvested: 0 });
      state.trees.push({ id: 't2', type: 'appletree', x: 4, y: 12, plantedAt: treeT, lastHarvested: 0 });
      state.trees.push({ id: 't3', type: 'appletree', x: 2, y: 14, plantedAt: treeT, lastHarvested: 0 });
      toast('Sample farm placed');
    },
  };
}

export function maybeEnableDebug(): void {
  try {
    const flag = new URLSearchParams(window.location.search).get('debug');
    if (flag === '1' || flag === 'true') {
      window.dbg = makeDbg();
      // eslint-disable-next-line no-console
      console.info('[Sunny Acres] dbg enabled — try dbg.coins(1000), dbg.skip(2), dbg.mat(), dbg.level(20)');
    }
  } catch { /* SSR / no-window */ }
}
