import { state } from '../state';
import { SW, SH } from '../canvas';
import { xpForLevel } from '../utils';
import { sfx } from '../audio/sfx';
import { toast, toastXP } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { checkSelectedSeedValid } from '../ui/tools';
import { spawnParticles } from './particles';
import { screenToWorld } from './camera';
import { maybeUnlockOrders } from './orders';
import { spawnDog } from './dog';
import { checkAchievements } from './achievements';
import { celebrate } from './juice';
import { addPassPoints } from './season-pass';
import { perkValue } from './prestige';
import { spawnHUDBurst } from './flyers';
import { nextBigUnlock } from './unlocks';

/** Rain confetti streamers from the top of the screen — celebratory burst. */
function spawnConfetti(count: number): void {
  const palette = ['#f4b942', '#7fb957', '#f48ac0', '#a6d8f0', '#fffae8', '#ef6a7c'];
  for (let i = 0; i < count; i++) {
    // Spread across screen width, top
    const sx = Math.random() * SW();
    const sy = -10 + Math.random() * -40;
    // Convert screen coords to world coords so the confetti follows the camera
    const w = screenToWorld(sx, sy);
    state.particles.push({
      x: w.x, y: w.y,
      vx: (Math.random() - 0.5) * 90,
      vy: 50 + Math.random() * 70,
      life: 1.6 + Math.random() * 1.0,
      age: 0,
      color: palette[Math.floor(Math.random() * palette.length)]!,
      size: 4 + Math.random() * 3,
    });
  }
}

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
    spawnHUDBurst('coin', 10);
    spawnConfetti(60);
    celebrate();
    maybeUnlockOrders();
    if (state.level === 4 && !state.dog) spawnDog();
    // Tease the next big unlock so each level-up plants curiosity.
    const next = nextBigUnlock();
    if (next) {
      setTimeout(() => {
        toast(`Coming at Lv ${next.level}: ${next.icon} ${next.label}`, 'xp');
      }, 1100);
    }
  }
  toastXP(`+${boosted} XP`);
  updateHUD();
  if (leveled) {
    checkSelectedSeedValid();
    checkAchievements();
  }
}
