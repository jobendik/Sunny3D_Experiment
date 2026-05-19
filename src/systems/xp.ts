import { state } from '../state';
import { SW, SH } from '../canvas';
import { xpForLevel } from '../utils';
import { sfx } from '../audio/sfx';
import { toast, toastXP } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { checkSelectedSeedValid } from '../ui/tools';
import { spawnParticles } from './particles';
import { maybeUnlockOrders } from './orders';
import { spawnDog } from './dog';
import { checkAchievements } from './achievements';
import { celebrate } from './juice';
import { addPassPoints } from './season-pass';
import { perkValue } from './prestige';

export function addXP(amt: number): void {
  // Apply prestige XP boost
  const boosted = Math.max(1, Math.round(amt * (1 + perkValue('xpBoost'))));
  state.xp += boosted;
  // Pass earns 1 point per 5 XP
  addPassPoints(Math.max(1, Math.floor(boosted / 5)));
  let leveled = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    leveled = true;
    toast(`Level up! → ${state.level}`, 'xp');
    sfx.levelup();
    const reward = state.level * 20;
    state.coins += reward;
    state.stats.earned += reward;
    toast(`+${reward} coins reward`, 'gold');
    spawnParticles(SW() / 2, SH() / 2, '#ffd040', 60, true);
    celebrate();
    maybeUnlockOrders();
    if (state.level === 4 && !state.dog) spawnDog();
  }
  toastXP(`+${boosted} XP`);
  updateHUD();
  if (leveled) {
    checkSelectedSeedValid();
    checkAchievements();
  }
}
