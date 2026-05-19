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
import { addItem, removeItem } from './inventory';
import { applyFertilizer, tileGrowthBoost } from './soil';
import { addXP } from './xp';
import { questProgress } from './quests';
import { dailyChallengeProgress } from './daily';
import { addWeeklyPoints } from './weekly';
import { checkAchievements } from './achievements';
import { cropStage, isWithered } from './crops';
import { isEvent } from './events';
import { recordDiscovery } from './collection';
import { drainFertilityOnHarvest, tileYieldBoost } from './soil';
import { specEffects } from './specializations';
import { activeEffects as weatherGridEffects } from './weather-grid';
import { beautyBonus } from './beautification';
import { collectionBonuses } from './collection';
import { perkValue } from './prestige';
import { track } from './telemetry';
import { comboHit } from './combo';
import { maybeSpawnChest } from './treasures';
import { addPassPoints } from './season-pass';
import { spawnFlyerBurst } from './flyers';
import { triggerFlash, triggerShake } from './juice';
import { spawnPop } from './pops';
import { sprites } from '../sprites';

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
    // Apply fertilizer if held — otherwise just unplow
    if ((state.inv.fertilizer ?? 0) > 0) {
      removeItem('fertilizer', 1);
      applyFertilizer(gx, gy);
      toast('Fertilized!', 'xp');
      spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#3a8020', 12);
      return;
    }
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
    // Combo + spec / weather grid / beauty / collection / prestige multipliers
    const combo = comboHit();
    const sp = specEffects();
    const eff = weatherGridEffects();
    const cb = collectionBonuses();
    let mult = tileYieldBoost(gx, gy);
    mult *= 1 + (sp.cropYield ?? 0);
    mult *= 1 + eff.yieldBonus;
    mult *= 1 + beautyBonus();
    mult *= 1 + cb.yieldMult;
    mult *= combo.mult;
    yieldAmt = Math.max(1, Math.round(yieldAmt * mult));
    if (combo.count >= 3) {
      floatText(gx * TILE + TILE / 2, gy * TILE + TILE / 2 + 4, `COMBO ×${combo.count}!`, '#e87018');
    }
    const wasFirstHarvest = state.stats.harvested === 0;
    addItem(crop.item, yieldAmt);
    addXP(crop.xp);
    state.stats.harvested += yieldAmt;
    // Pop the crop sprite — scale up, drift, fade out — so the harvest
    // has a clean exit beat instead of vanishing instantly.
    const cropSprite = sprites.crops[t.crop]?.[3];
    if (cropSprite) spawnPop(cropSprite, gx * TILE, gy * TILE);
    if (wasFirstHarvest) {
      // First harvest — bigger sparkle, gold flash, the player remembers this beat.
      triggerFlash('#fff5c0', 0.32, 0.45);
      triggerShake(4, 0.28);
      spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#ffd040', 36, true);
      spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#fff5c0', 18, true);
      toast('🌟 First harvest! Sell it at the Shop for coins.', 'gold');
    }
    drainFertilityOnHarvest(gx, gy);
    recordDiscovery('crop', t.crop, 1);
    sfx.harvest();
    spawnParticles(gx * TILE + TILE / 2, gy * TILE + TILE / 2, '#ffe080', 14);
    // XP gem arcs up to the level badge — the real "you earned that" beat.
    spawnFlyerBurst(
      gx * TILE + TILE / 2,
      gy * TILE + TILE / 2,
      'xp',
      Math.min(4, Math.max(1, Math.ceil(crop.xp / 3))),
    );
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
    dailyChallengeProgress('harvest', crop.item, yieldAmt);
    addWeeklyPoints(yieldAmt * 2, 'crop');
    addPassPoints(yieldAmt);
    maybeSpawnChest();
    checkAchievements();
    track('harvest', { crop: crop.item, amt: yieldAmt });
  }
}
