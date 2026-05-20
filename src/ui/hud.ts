import { state } from '../state';
import { clamp, xpForLevel } from '../utils';
import { nextBigUnlock } from '../systems/unlocks';

export function updateHUD(): void {
  document.getElementById('coin-amount')!.textContent = String(state.coins);
  document.getElementById('level-num')!.textContent = String(state.level);
  document.getElementById('day-num')!.textContent = `Day ${state.day}`;
  const need = xpForLevel(state.level);
  const pct = clamp((state.xp / need) * 100, 0, 100);
  (document.getElementById('xp-fill') as HTMLElement).style.width = pct + '%';
  document.getElementById('xp-label')!.textContent = `${state.xp} / ${need} XP`;
  // Surface the next unlock as a tooltip on the level badge so curious
  // players can hover to see "what's next" without opening a panel.
  const lvlBadge = document.getElementById('level-badge');
  if (lvlBadge) {
    const next = nextBigUnlock();
    lvlBadge.title = next
      ? `Lv ${state.level}\nNext unlock at Lv ${next.level}: ${next.label}`
      : `Lv ${state.level} — All major content unlocked!`;
  }
}
