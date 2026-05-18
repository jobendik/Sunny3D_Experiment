import { state } from '../state';
import { clamp, xpForLevel } from '../utils';

export function updateHUD(): void {
  document.getElementById('coin-amount')!.textContent = String(state.coins);
  document.getElementById('level-num')!.textContent = String(state.level);
  document.getElementById('day-num')!.textContent = `Day ${state.day}`;
  const need = xpForLevel(state.level);
  const pct = clamp((state.xp / need) * 100, 0, 100);
  (document.getElementById('xp-fill') as HTMLElement).style.width = pct + '%';
  document.getElementById('xp-label')!.textContent = `${state.xp} / ${need} XP`;
}
