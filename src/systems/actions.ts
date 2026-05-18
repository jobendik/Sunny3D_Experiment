import { state } from '../state';
import { TILE, GRID_W, GRID_H } from '../constants';
import { CROPS } from '../data/crops';
import { DECORATIONS } from '../data/decorations';
import { ITEMS } from '../data/items';
import { randi, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { spawnParticles, floatText } from './particles';
import { addItem } from './inventory';
import { addXP } from './xp';
import { questProgress } from './quests';
import { checkAchievements } from './achievements';
import { cropStage, isWithered } from './crops';
import { isEvent } from './events';

export function tryPlaceDecoration(gx: number, gy: number): void {
  const placing = state.placing!;
  const type = placing.type!;
  const def = DECORATIONS[type]!;
  for (let dy = 0; dy < def.h; dy++) {
    for (let dx = 0; dx < def.w; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) {
        toast('Out of bounds', 'error');
        sfx.error();
        return;
      }
      const tile = state.grid[y]![x]!;
      if (tile.type !== 'grass' || tile.crop || tile.building || tile.tree) {
        toast('Need clear grass', 'error');
        sfx.error();
        return;
      }
      if (state.decor.some(d => d.x === x && d.y === y)) {
        toast('Already decorated here', 'error');
        sfx.error();
        return;
      }
    }
  }
  if (state.coins < def.price) {
    toast('Not enough coins!', 'error');
    sfx.cantAfford();
    return;
  }
  state.coins -= def.price;
  state.decor.push({
    id: 'd' + Date.now() + randi(1e6),
    type, x: gx, y: gy,
  });
  state.stats.decorsPlaced += 1;
  state.placing = null;
  sfx.build();
  spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#ff80c0', 16);
  toast(`Placed ${def.name}!`, 'xp');
  updateHUD();
  checkAchievements();
}

export function tryPlow(gx: number, gy: number): void {
  const t = state.grid[gy]![gx]!;
  if (t.building || t.crop || t.tree) { sfx.error(); return; }
  if (t.type === 'plowed') {
    t.type = 'grass';
    sfx.plow();
    spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#6e4520', 6);
    return;
  }
  if (t.type === 'grass' || t.type === 'soil') {
    t.type = 'plowed';
    state.stats.plowed += 1;
    sfx.plow();
    spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#8b5a2b', 10);
    checkAchievements();
  }
}

export function tryPlant(gx: number, gy: number): void {
  const t = state.grid[gy]![gx]!;
  if (t.type !== 'plowed' || t.crop || t.building) { sfx.error(); return; }
  const cropKey = state.selectedSeed;
  const crop = CROPS[cropKey]!;
  if (state.level < crop.level) {
    toast(`Need level ${crop.level}`, 'error');
    sfx.error();
    return;
  }
  if (state.coins < crop.seedCost) {
    toast('Not enough coins for seed', 'error');
    sfx.cantAfford();
    return;
  }
  state.coins -= crop.seedCost;
  t.crop = cropKey;
  t.plantedAt = nowSeconds();
  state.stats.planted++;
  sfx.plant();
  spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#7ec850', 8);
  floatText(gx * TILE + TILE / 2, gy * TILE + TILE / 2 - 12, `-${crop.seedCost}`, '#c44040');
  updateHUD();
}

export function tryHarvestOrInteract(gx: number, gy: number): void {
  const t = state.grid[gy]![gx]!;
  if (t.crop && cropStage(t) === 3) {
    const crop = CROPS[t.crop]!;
    if (isWithered(t)) {
      t.crop = null;
      t.plantedAt = 0;
      t.type = 'soil';
      toast('Crop withered!', 'error');
      floatText(gx * TILE + TILE / 2, gy * TILE + TILE / 2 - 12, 'Withered!', '#9a4040');
      sfx.error();
      return;
    }
    let yieldAmt = randi(crop.yieldMax - crop.yieldMin + 1) + crop.yieldMin;
    if (isEvent('lucky')) yieldAmt *= 2;
    addItem(crop.item, yieldAmt);
    addXP(crop.xp);
    state.stats.harvested += yieldAmt;
    sfx.harvest();
    spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#ffe080', 14);
    floatText(
      gx * TILE + TILE / 2,
      gy * TILE + TILE / 2 - 12,
      `+${yieldAmt} ${ITEMS[crop.item]!.name}`,
      '#3a8020',
    );
    t.crop = null;
    t.plantedAt = 0;
    t.type = 'soil';
    questProgress('harvest', crop.item, yieldAmt);
    checkAchievements();
  }
}
