// =============================================================
//  LANDMARK CONSTRUCTION UI — list of multi-stage projects.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  LANDMARKS, initLandmarks, isLandmarkUnlocked, landmarkProject,
  currentStage, landmarkProgressPct, contributeAll, contributeToLandmark,
} from '../systems/landmarks';

export function openLandmarkPanel(): void {
  initLandmarks();
  const ids = Object.keys(LANDMARKS);
  const tabs = ids.map(id => ({
    key: id,
    label: `${LANDMARKS[id]!.emoji} ${LANDMARKS[id]!.name.split(' ')[0]}`,
    render: (body: HTMLElement): void => renderLandmark(body, id),
  }));
  openModal('🏗️ Landmark Projects', tabs, ids[0]);
}

function renderLandmark(body: HTMLElement, id: string): void {
  const def = LANDMARKS[id]!;
  const p = landmarkProject(id);
  const unlocked = isLandmarkUnlocked(id);
  if (!unlocked) {
    body.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px">${def.emoji}</div>
        <h3>${def.name}</h3>
        <p>${def.blurb}</p>
        <p><b>Unlocks at Level ${def.unlockLevel}</b></p>
      </div>`;
    return;
  }
  if (!p) {
    body.innerHTML = '<div>Loading...</div>';
    return;
  }
  if (p.completed) {
    body.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px">${def.emoji}</div>
        <h3>${def.name}</h3>
        <p style="color:#3a8020"><b>✓ Complete!</b></p>
        <p>${def.reward}</p>
      </div>`;
    return;
  }
  const stage = currentStage(id);
  if (!stage) {
    body.innerHTML = '<div>...</div>';
    return;
  }
  const pct = landmarkProgressPct(id);
  let html = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${def.emoji}</div>
        <div class="landmark-meta">
          <h3>${def.name}</h3>
          <p style="margin:0;color:#5a4028">${def.blurb}</p>
          <p style="margin:4px 0;font-size:12px;color:#7a5828">Reward when complete: <b>${def.reward}</b></p>
        </div>
      </div>
      <div class="landmark-stages">
        Stage <b>${p.stageIdx + 1} / ${def.stages.length}</b> · ${stage.name}
      </div>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${pct}%"></div></div>
      <div class="landmark-reqs">
  `;
  for (const k of Object.keys(stage.reqs)) {
    const need = stage.reqs[k]!;
    const have = p.contributed[k] ?? 0;
    const inv = state.inv[k] ?? 0;
    const done = have >= need;
    html += `
      <div class="landmark-req ${done ? 'done' : ''}">
        <img class="ico" src="${sprites.item[k]?.toDataURL() ?? ''}">
        <div class="landmark-req-name">${ITEMS[k]?.name ?? k}</div>
        <div class="landmark-req-progress">${have} / ${need}</div>
        <div class="landmark-req-have">(barn: ${inv})</div>
        ${done
          ? '<span class="landmark-req-tick">✓</span>'
          : `<button class="btn small" data-contrib="${k}" ${inv === 0 ? 'disabled' : ''}>+1</button>
             <button class="btn small primary" data-contrib-all="${k}" ${inv === 0 ? 'disabled' : ''}>All</button>`}
      </div>`;
  }
  html += `
      </div>
      <div class="landmark-rewards">
        Stage reward: +${stage.rewardCoins}💰 +${stage.rewardXp}XP${stage.rewardMaterial ? ` + 1 ${ITEMS[stage.rewardMaterial]?.name}` : ''}
      </div>
    </div>
  `;
  body.innerHTML = html;
  body.querySelectorAll<HTMLButtonElement>('button[data-contrib]').forEach(btn =>
    btn.addEventListener('click', () => {
      contributeToLandmark(id, btn.dataset.contrib!, 1);
      renderLandmark(body, id);
    }),
  );
  body.querySelectorAll<HTMLButtonElement>('button[data-contrib-all]').forEach(btn =>
    btn.addEventListener('click', () => {
      contributeAll(id, btn.dataset.contribAll!);
      renderLandmark(body, id);
    }),
  );
}
