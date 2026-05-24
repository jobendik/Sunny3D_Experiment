// =============================================================
//  BALLOON PANEL — view the active Hot Air Balloon delivery.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initBalloon, tickBalloon, balloonLeavesInS, balloonNextInS,
  canServeBalloon, serveBalloon,
} from '../systems/balloon';
import { formatDuration } from '../systems/timer';
import { startVisibleTicker } from './visible-ticker';

export function openBalloonPanel(): void {
  initBalloon();
  tickBalloon();
  openModal('🎈 Hot Air Balloon', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render();
  startVisibleTicker({
    root: body,
    intervalMs: 1000,
    tick: render,
    stopWhen: () => !document.getElementById('modal')!.classList.contains('open'),
  });
}

function render(): void {
  const body = document.getElementById('modal-body')!;
  const b = state.balloon!;
  if (!b.active) {
    body.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px">🎈</div>
        <h3>No balloon in sight</h3>
        <p>Premium balloon visits arrive every few hours. Next in <b>${formatDuration(balloonNextInS())}</b>.</p>
      </div>`;
    return;
  }
  const reqs = b.requests.map(r => {
    const have = state.inv[r.itemKey] ?? 0;
    const ok = have >= r.qty;
    return `<div class="landmark-req ${ok ? 'done' : ''}">
      <img class="ico" src="${sprites.item[r.itemKey]?.toDataURL() ?? ''}">
      <div class="landmark-req-name">${ITEMS[r.itemKey]?.name ?? r.itemKey}</div>
      <div class="landmark-req-progress">${have} / ${r.qty}</div>
    </div>`;
  }).join('');
  const can = canServeBalloon();
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">🎈</div>
        <div class="landmark-meta">
          <h3>The Sky Chef</h3>
          <p>Leaves in <b>${formatDuration(balloonLeavesInS())}</b> — premium pay.</p>
        </div>
      </div>
      <div class="landmark-reqs">${reqs}</div>
      <p class="landmark-rewards">Reward: <b>${b.rewardCoins}💰</b> + ${b.rewardFragments} fragment(s)${b.rewardMaterial ? ` + 1 ${ITEMS[b.rewardMaterial]?.name}` : ''}</p>
      <button class="btn primary" id="balloon-serve" ${can ? '' : 'disabled'}>${can ? 'Hand over the goods' : 'Need more items'}</button>
    </div>
  `;
  document.getElementById('balloon-serve')?.addEventListener('click', () => {
    serveBalloon();
    render();
  });
}
