import { state } from '../state';
import { BUILDINGS } from '../data/buildings';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { openModal } from './modal';
import { toast } from './toasts';
import { addItem, hasItems, removeItem } from '../systems/inventory';
import { addXP } from '../systems/xp';
import { questProgress } from '../systems/quests';
import { checkAchievements } from '../systems/achievements';
import type { BuildingInstance } from '../types';

export function openProductionPanel(b: BuildingInstance): void {
  const def = BUILDINGS[b.type]!;
  const recipes = def.recipes!;
  const queue = state.prodQueues[b.id] ?? (state.prodQueues[b.id] = []);
  const maxQueue = 4;
  openModal(def.name, null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;

  function render(): void {
    const recipesHTML = recipes.map((r, idx) => {
      const ok = state.level >= (r.lvl ?? 0) && hasItems(r.in) && queue.length < maxQueue;
      const inHTML = Object.entries(r.in).map(([k, q]) => {
        const have = state.inv[k] ?? 0;
        const meet = have >= q;
        return `<img class="ico" src="${sprites.item[k]!.toDataURL()}" style="${meet ? '' : 'filter:grayscale(80%)'}">×${q}<small style="opacity:0.6">(${have})</small>`;
      }).join('');
      const outHTML = Object.entries(r.out).map(([k, q]) =>
        `<img class="ico" src="${sprites.item[k]!.toDataURL()}">×${q}`
      ).join('');
      return `
        <div class="recipe">
          <div class="in">${inHTML}</div>
          <div class="arrow">→</div>
          <div class="out">${outHTML}</div>
          <div class="recipe-info">
            <div class="name">${Object.keys(r.out).map(k => ITEMS[k]!.name).join(', ')}</div>
            <div class="time">${r.time}s · +${r.xp} XP</div>
          </div>
          <button ${ok ? '' : 'disabled'} data-idx="${idx}">Produce</button>
        </div>
      `;
    }).join('');

    let queueHTML = '<div class="queue">';
    for (let i = 0; i < maxQueue; i++) {
      const job = queue[i];
      if (job) {
        const left = Math.max(0, job.doneAt - nowSeconds());
        const ready = left <= 0;
        const out = Object.keys(recipes[job.recipeIdx]!.out)[0]!;
        queueHTML += `<div class="queue-slot">
          <img class="ico" src="${sprites.item[out]!.toDataURL()}">
          ${ready ? '<div class="ready-mark">✓</div>' : `<div class="timer">${Math.ceil(left)}s</div>`}
        </div>`;
      } else {
        queueHTML += '<div class="queue-slot empty"></div>';
      }
    }
    queueHTML += '</div>';

    body.innerHTML = `
      <div class="recipe-list">${recipesHTML}</div>
      <div style="margin-top:10px;font-size:13px"><b>Queue (${queue.length}/${maxQueue}):</b></div>
      ${queueHTML}
      <div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn primary" id="collect-ready">Collect Ready</button>
      </div>
    `;
    body.querySelectorAll<HTMLButtonElement>('.recipe button[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx!, 10);
        const r = recipes[idx]!;
        if (queue.length >= maxQueue) { toast('Queue full!', 'error'); sfx.error(); return; }
        if (!hasItems(r.in)) { sfx.error(); return; }
        for (const k in r.in) removeItem(k, r.in[k]!);
        queue.push({ recipeIdx: idx, startTime: nowSeconds(), doneAt: nowSeconds() + r.time });
        sfx.click();
        render();
      });
    });
    document.getElementById('collect-ready')!.addEventListener('click', () => {
      let collected = 0;
      while (queue.length > 0 && queue[0]!.doneAt <= nowSeconds()) {
        const job = queue.shift()!;
        const r = recipes[job.recipeIdx]!;
        for (const k in r.out) {
          addItem(k, r.out[k]!);
          state.stats.itemsProduced[k] = (state.stats.itemsProduced[k] ?? 0) + r.out[k]!;
          questProgress('produce', k, r.out[k]!);
        }
        addXP(r.xp);
        state.stats.produced++;
        collected++;
      }
      if (collected > 0) {
        sfx.harvest();
        toast(`Collected ${collected} item${collected > 1 ? 's' : ''}`);
        checkAchievements();
      } else {
        sfx.error();
      }
      render();
    });
  }
  render();

  const interval = window.setInterval(() => {
    if (!document.getElementById('modal')!.classList.contains('open')) {
      clearInterval(interval);
      return;
    }
    if (!body.querySelector('.queue')) {
      clearInterval(interval);
      return;
    }
    render();
  }, 1000);
}
