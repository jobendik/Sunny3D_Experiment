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

export function addXP(amt: number): void {
  state.xp += amt;
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
    spawnParticles(SW() / 2, SH() / 2, '#ffd040', 40, true);
    maybeUnlockOrders();
    if (state.level === 4 && !state.dog) spawnDog();
  }
  toastXP(`+${amt} XP`);
  updateHUD();
  if (leveled) {
    checkSelectedSeedValid();
    checkAchievements();
  }
}
