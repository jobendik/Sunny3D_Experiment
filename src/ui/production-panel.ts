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
import { dailyChallengeProgress } from '../systems/daily';
import { addWeeklyPoints, currentTheme } from '../systems/weekly';
import { checkAchievements } from '../systems/achievements';
import { recordDiscovery } from '../systems/collection';
import { adjacencyBonus } from '../systems/adjacency';
import { specEffects } from '../systems/specializations';
import { activeEffects as weatherGridEffects } from '../systems/weather-grid';
import { collectionBonuses } from '../systems/collection';
import {
  speedupQueue, nextQualityFlag, consumeQualityFlag, QUALITY_VALUE,
  instantQueue, instantQueueCost, cancelQueueWithDiamonds, CANCEL_QUEUE_COST,
} from '../systems/catalysts';
import { track } from '../systems/telemetry';
import { recordProduction, masteryBadge, masterySpeedBuff, masteryQualityBuff, masteryProgress } from '../systems/building-mastery';
import { recordEventAction } from '../systems/live-events';
import { addClubProgress } from '../systems/club';
import { checkMilestones as checkJournalMilestones } from '../systems/journal';
import type { BuildingInstance } from '../types';

import { seasonalRecipesFor } from '../data/seasonal-recipes';
import { buildingLevel, buildingQueueBonus, buildingSpeedMod, buildingUpgradeCost, upgradeBuildingInstance } from '../systems/building-upgrades';

export function openProductionPanel(b: BuildingInstance): void {
  const def = BUILDINGS[b.type]!;
  // Combine baseline recipes with any current seasonal recipes.
  const seasonal = seasonalRecipesFor(b.type, state.season).map(r => r.recipe);
  const recipes = [...(def.recipes ?? []), ...seasonal];
  const queue = state.prodQueues[b.id] ?? (state.prodQueues[b.id] = []);
  const maxQueue = 4 + buildingQueueBonus(b.id);
  const badge = masteryBadge(b.type);
  openModal(badge ? `${def.name} ${badge}` : def.name, null);
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
        queueHTML += `<div class="queue-slot" data-q-idx="${i}">
          <img class="ico" src="${sprites.item[out]!.toDataURL()}">
          ${ready ? '<div class="ready-mark">✓</div>' : `<div class="timer">${Math.ceil(left)}s</div>`}
          ${!ready && i > 0 ? `<button class="queue-cancel" title="Cancel for ${CANCEL_QUEUE_COST}💎" data-cancel-idx="${i}">×</button>` : ''}
        </div>`;
      } else {
        queueHTML += '<div class="queue-slot empty"></div>';
      }
    }
    queueHTML += '</div>';
    const iqCost = instantQueueCost(b.id);

    body.innerHTML = `
      <div class="recipe-list">${recipesHTML}</div>
      <div style="margin-top:10px;font-size:13px"><b>Queue (${queue.length}/${maxQueue}):</b></div>
      ${queueHTML}
      <div class="prod-bonus">
        ${(() => {
          const sp = specEffects();
          const eff = weatherGridEffects();
          const cb = collectionBonuses();
          const adj = adjacencyBonus({ id: b.id, type: b.type, x: b.x, y: b.y });
          const mast = masterySpeedBuff(b.type);
          const speed = (sp.produceSpeed ?? 0) + eff.productionSpeed + cb.speedMult + adj + mast;
          return speed > 0
            ? `<span class="prod-bonus-chip">⚡ ${(speed * 100).toFixed(0)}% speed bonus${mast > 0 ? ' (incl. ⭐ mastery)' : ''}</span>`
            : '';
        })()}
        ${(() => {
          const mp = masteryProgress(b.type);
          const stars = mp.stars;
          const next = mp.nextAt;
          if (stars === 0 && next) {
            return `<span class="prod-bonus-chip" style="background:#fff7e1;color:#7a5828">⭐ ${mp.produced}/${next} to first star</span>`;
          }
          if (next) {
            return `<span class="prod-bonus-chip" style="background:#fff7e1;color:#7a5828">${'★'.repeat(stars)} ${mp.produced}/${next} next star</span>`;
          }
          return `<span class="prod-bonus-chip" style="background:#fff3c4;color:#7a5828">${'★'.repeat(stars)} Mastery maxed!</span>`;
        })()}
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn primary" id="collect-ready">Collect Ready</button>
        <button class="btn" id="speed-boost">⚡ Speed Boost (${state.inv.speedup ?? 0})</button>
        <button class="btn" id="quality-ink">★ Quality Ink (${state.inv.qualityink ?? 0})</button>
        ${iqCost > 0 ? `<button class="btn diamond-btn" id="instant-queue" title="Finish entire queue with diamonds">💎 ${iqCost} Finish All</button>` : ''}
      </div>
    `;
    body.querySelectorAll<HTMLButtonElement>('.recipe button[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx!, 10);
        const r = recipes[idx]!;
        if (queue.length >= maxQueue) { toast('Queue full!', 'error'); sfx.error(); return; }
        if (!hasItems(r.in)) { sfx.error(); return; }
        for (const k in r.in) removeItem(k, r.in[k]!);
        // Apply speed reductions to the time
        const sp = specEffects();
        const eff = weatherGridEffects();
        const cb = collectionBonuses();
        const adj = adjacencyBonus({ id: b.id, type: b.type, x: b.x, y: b.y });
        const mast = masterySpeedBuff(b.type);
        const speedReduction = Math.min(0.7, (sp.produceSpeed ?? 0) + eff.productionSpeed + cb.speedMult + adj + mast);
        const time = Math.max(2, r.time * (1 - speedReduction) * buildingSpeedMod(b.id));
        queue.push({ recipeIdx: idx, startTime: nowSeconds(), doneAt: nowSeconds() + time });
        sfx.click();
        render();
      });
    });
    document.getElementById('collect-ready')!.addEventListener('click', () => {
      let collected = 0;
      while (queue.length > 0 && queue[0]!.doneAt <= nowSeconds()) {
        const job = queue.shift()!;
        const r = recipes[job.recipeIdx]!;
        const quality = consumeQualityFlag(b.id, masteryQualityBuff(b.type));
        const qMult = QUALITY_VALUE[quality];
        for (const k in r.out) {
          const outQty = Math.max(1, Math.round(r.out[k]! * (quality === 'normal' ? 1 : qMult)));
          addItem(k, outQty);
          state.stats.itemsProduced[k] = (state.stats.itemsProduced[k] ?? 0) + outQty;
          questProgress('produce', k, outQty);
          dailyChallengeProgress('produce', k, outQty);
          recordDiscovery('recipe', b.type + ':' + k, outQty);
          // weekly theme bonus
          const t = currentTheme();
          const isBakeryProduct = b.type === 'bakery';
          if ((t.focus === 'bakery' && isBakeryProduct) || (t.focus === 'craft')) {
            addWeeklyPoints(8, t.focus);
          } else {
            addWeeklyPoints(5, 'craft');
          }
          if (quality === 'perfect') {
            toast(`✨ Perfect ${k} produced!`, 'gold');
          } else if (quality === 'good') {
            toast(`★ Good ${k}`, 'xp');
          }
        }
        addXP(r.xp);
        state.stats.produced++;
        collected++;
        recordProduction(b.type, 1);
        // Live-event + club + journal hooks for production
        for (const outKey in r.out) {
          recordEventAction('produce', outKey, r.out[outKey]!);
        }
        if (b.type === 'bakery') {
          addClubProgress('produce_bake', 1);
        }
      }
      if (collected > 0) {
        sfx.harvest();
        toast(`Collected ${collected} item${collected > 1 ? 's' : ''}`);
        track('production_collected', { count: collected, building: b.type });
        checkAchievements();
        checkJournalMilestones();
      } else {
        sfx.error();
      }
      render();
    });
    document.getElementById('speed-boost')!.addEventListener('click', () => {
      if (speedupQueue(b.id)) render();
    });
    document.getElementById('quality-ink')!.addEventListener('click', () => {
      if (nextQualityFlag(b.id)) render();
    });
    const iqBtn = document.getElementById('instant-queue');
    if (iqBtn) {
      iqBtn.addEventListener('click', () => {
        if (instantQueue(b.id)) render();
      });
    }
    // Diamond cancel buttons on individual queue slots
    body.querySelectorAll<HTMLButtonElement>('.queue-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.cancelIdx!, 10);
        const job = queue[idx];
        if (!job) return;
        const r = recipes[job.recipeIdx]!;
        if (cancelQueueWithDiamonds(b.id, idx, r.in)) render();
      });
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
