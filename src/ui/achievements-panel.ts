import { state } from '../state';
import { ACHIEVEMENTS } from '../data/achievements';
import { openModal } from './modal';

export function openAchievements(): void {
  openModal('🏆 Achievements', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  const unlockedCount = Object.keys(state.achievements).length;
  body.innerHTML = `
    <div style="font-size:14px;margin-bottom:10px;color:#5a3d0c;text-align:center">
      <b>${unlockedCount} / ${ACHIEVEMENTS.length}</b> achievements unlocked
    </div>
    <div class="ach-grid"></div>
  `;
  const grid = body.querySelector<HTMLElement>('.ach-grid')!;
  for (const ach of ACHIEVEMENTS) {
    const unlocked = !!state.achievements[ach.id];
    const div = document.createElement('div');
    div.className = 'ach-item' + (unlocked ? ' unlocked' : '');
    div.innerHTML = `
      <div class="ach-medal">${unlocked ? '🏆' : '🔒'}</div>
      <div class="ach-name">${ach.name}</div>
      <div class="ach-desc">${ach.desc}</div>
    `;
    grid.appendChild(div);
  }
}
