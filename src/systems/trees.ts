import { state } from '../state';
import { TILE } from '../constants';
import { ORCHARDS } from '../data/orchards';
import { ITEMS } from '../data/items';
import { randi, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { spawnParticles, floatText } from './particles';
import { addItem } from './inventory';
import { addXP } from './xp';
import { questProgress } from './quests';
import { dailyChallengeProgress } from './daily';
import { addWeeklyPoints, currentTheme } from './weekly';
import { checkAchievements } from './achievements';
import { isEvent } from './events';
import { recordDiscovery } from './collection';
import { specEffects } from './specializations';
import { activeEffects as weatherGridEffects } from './weather-grid';
import { beautyBonus } from './beautification';
import { sprites } from '../sprites';
import { spawnPopSized } from './pops';
import type { Tree } from '../types';

export function plantTree(type: string, gx: number, gy: number): boolean {
  const def = ORCHARDS[type]!;
  if (state.level < def.level) { toast('Level too low!', 'error'); return false; }
  if (state.coins < def.seedCost) { toast('Not enough coins!', 'error'); sfx.cantAfford(); return false; }
  const t = state.grid[gy]![gx]!;
  if (t.type !== 'plowed' && t.type !== 'soil') { toast('Must plant on soil!', 'error'); return false; }
  if (t.tree || t.building || t.crop) { toast('Tile occupied!', 'error'); return false; }
  state.coins -= def.seedCost;
  state.trees.push({
    id: 'tr' + Date.now() + randi(1e6),
    type, x: gx, y: gy,
    plantedAt: nowSeconds(),
    lastHarvested: 0,
  });
  t.type = 'soil';
  t.tree = true;
  sfx.plant();
  spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#3a8020', 12);
  updateHUD();
  return true;
}

export function getTreeStage(tree: Tree): number {
  const def = ORCHARDS[tree.type]!;
  const elapsed = nowSeconds() - tree.plantedAt;
  if (elapsed < def.grow * 0.4) return 0;
  if (elapsed < def.grow) return 1;
  if (tree.lastHarvested === 0 || (nowSeconds() - tree.lastHarvested) >= def.cycle) return 3;
  return 2;
}

export function tryHarvestTree(treeId: string): void {
  const tree = state.trees.find(t => t.id === treeId);
  if (!tree) return;
  if (getTreeStage(tree) !== 3) return;
  const def = ORCHARDS[tree.type]!;
  const yieldAmt = def.yieldMin + randi(def.yieldMax - def.yieldMin + 1);
  const sp = specEffects();
  const eff = weatherGridEffects();
  const mult = (isEvent('lucky') ? 2 : 1)
    * (1 + (sp.cropYield ?? 0))
    * (1 + eff.yieldBonus)
    * (1 + beautyBonus());
  const finalYield = Math.max(1, Math.round(yieldAmt * mult));
  addItem(def.fruit, finalYield);
  addXP(def.xp);
  tree.lastHarvested = nowSeconds();
  if (state.stats.treesGrown < state.trees.length) state.stats.treesGrown = state.trees.length;
  sfx.harvest();
  // Pop the fruit icon up and away — feels like picking it from the canopy.
  const fruitSprite = sprites.item[def.fruit];
  if (fruitSprite) {
    spawnPopSized(
      fruitSprite,
      tree.x * TILE + TILE / 2 - 18,
      tree.y * TILE - 12,
      36, 36,
    );
  }
  spawnParticles(tree.x * TILE + TILE / 2, tree.y * TILE + TILE / 2 - 30, '#d83030', 14);
  floatText(
    tree.x * TILE + TILE / 2,
    tree.y * TILE + TILE / 2 - 30,
    `+${finalYield} ${ITEMS[def.fruit]!.name}`,
    '#3a8020',
  );
  questProgress('harvest', def.fruit, finalYield);
  dailyChallengeProgress('harvest', def.fruit, finalYield);
  const t = currentTheme();
  addWeeklyPoints(finalYield * 2, t.focus === 'orchard' ? 'orchard' : 'crop');
  recordDiscovery('tree', tree.type, 1);
  checkAchievements();
}
