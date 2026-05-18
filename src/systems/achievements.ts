import { state } from '../state';
import { ACHIEVEMENTS } from '../data/achievements';
import { nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import type { AchievementDef } from '../types';

export function checkAchievements(): void {
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements[ach.id]) continue;
    if (ach.check(state)) {
      state.achievements[ach.id] = nowSeconds();
      showAchievementPopup(ach);
      sfx.achievement();
    }
  }
}

export function showAchievementPopup(ach: AchievementDef): void {
  let el = document.querySelector<HTMLElement>('.achievement-popup');
  if (!el) {
    el = document.createElement('div');
    el.className = 'achievement-popup';
    document.getElementById('game-root')!.appendChild(el);
  }
  el.innerHTML = `
    <div class="ach-icon">🏆</div>
    <div>
      <div class="ach-title">Achievement Unlocked</div>
      <div class="ach-name">${ach.name}</div>
      <div style="font-size:11px;color:#888">${ach.desc}</div>
    </div>
  `;
  el.classList.add('show');
  setTimeout(() => el!.classList.remove('show'), 4500);
}
