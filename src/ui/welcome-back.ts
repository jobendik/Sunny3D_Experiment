// =============================================================
//  WELCOME BACK — show an idle-income summary modal on return.
//  Highlights what's waiting so the player feels their farm has
//  been productive in their absence, and plants a tomorrow hook.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { WEATHER } from '../data/seasons';
import { sprites } from '../sprites';
import { computeIdleSummary, formatAway } from '../systems/idle-income';
import { VILLAGERS, pickRandomVillager } from '../data/characters';
import { choice } from '../utils';
import { openModal, closeModal } from './modal';

/** Build a short list of "what's good about coming back tomorrow" hooks. */
function buildTomorrowHooks(): string[] {
  const hooks: string[] = [];
  // Forecast hook
  const forecast = state.daily?.forecast;
  if (forecast && forecast.predicted) {
    const w = WEATHER[forecast.predicted];
    if (w) hooks.push(`${w.emoji} Forecast: <b>${w.name}</b> tomorrow — ${w.growthMod > 1 ? 'great for crops!' : w.growthMod < 1 ? 'plan accordingly.' : 'a normal farm day.'}`);
  }
  // Streak hook
  const streak = state.daily?.streak ?? 0;
  if (streak >= 1) {
    hooks.push(`🔥 Your streak is at <b>Day ${streak}</b> — log in tomorrow to keep it alive.`);
  }
  // Weather grid charges
  const g = state.weatherGrid;
  if (g && g.unlocked && g.charges < 4) {
    hooks.push(`⚡ Weather Grid: <b>${g.charges} charges</b> now — regenerates 2 each day.`);
  }
  // Merchant
  if (state.daily && state.daily.merchantStock.length > 0) {
    hooks.push(`🚐 The traveling merchant has fresh stock waiting.`);
  }
  // Pending orders waiting
  if (state.orders.length > 0) {
    const o = state.orders[0]!;
    const v = o.customerId && VILLAGERS[o.customerId] ? VILLAGERS[o.customerId]! : pickRandomVillager();
    hooks.push(`${v.emoji} <b>${v.name}</b> is hoping for a delivery.`);
  }
  return hooks;
}

export function maybeOpenWelcomeBack(): void {
  if (typeof state.lastSessionEndedAt !== 'number') return;
  const away = Date.now() - state.lastSessionEndedAt;
  // Only show after a meaningful absence (60s+)
  if (away < 60000) return;
  const summary = computeIdleSummary(away);
  const hooks = buildTomorrowHooks();
  if (summary.cropsReady + summary.treesReady === 0
    && Object.keys(summary.produceReady).length === 0
    && Object.keys(summary.recipesReady).length === 0
    && hooks.length === 0) {
    return;
  }
  openModal('🌅 Welcome Back!', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  const proRows = Object.entries(summary.produceReady).map(([k, n]) =>
    `<div class="wb-row"><img class="ico-mini" src="${sprites.item[k]!.toDataURL()}"><span>${n}× ${ITEMS[k]!.name}</span></div>`,
  ).join('');
  const recRows = Object.entries(summary.recipesReady).map(([k, n]) =>
    `<div class="wb-row"><img class="ico-mini" src="${sprites.item[k]!.toDataURL()}"><span>${n}× ${ITEMS[k]!.name}</span></div>`,
  ).join('');
  // Friendly greeting from a random villager — makes return feel cozy.
  const greeter = pickRandomVillager();
  const greetLines = [
    `${greeter.emoji} ${greeter.name}: "The farm missed you!"`,
    `${greeter.emoji} ${greeter.name}: "Look who's back — and just in time!"`,
    `${greeter.emoji} ${greeter.name}: "Couldn't keep away, could you?"`,
    `${greeter.emoji} ${greeter.name}: "Place looks lively today."`,
  ];
  const greeting = choice(greetLines);
  const anythingReady = summary.cropsReady + summary.treesReady > 0
    || Object.keys(summary.produceReady).length > 0
    || Object.keys(summary.recipesReady).length > 0;
  body.innerHTML = `
    <div class="welcome-back-card">
      <div class="wb-greet">${greeting}</div>
      <div class="wb-headline">You were away for <b>${formatAway(summary.awaySeconds)}</b></div>
      ${anythingReady
        ? `<div class="wb-subheadline">While you were gone, your farm got busy:</div>`
        : `<div class="wb-subheadline">The farm took a quiet rest. Here's what's next:</div>`}
      <div class="wb-grid">
        ${summary.cropsReady ? `<div class="wb-block"><div class="wb-big">${summary.cropsReady}</div><div class="wb-cap">Crops ready</div></div>` : ''}
        ${summary.treesReady ? `<div class="wb-block"><div class="wb-big">${summary.treesReady}</div><div class="wb-cap">Trees ready</div></div>` : ''}
        ${Object.keys(summary.produceReady).length ? `<div class="wb-block"><div class="wb-big">${Object.values(summary.produceReady).reduce((a, n) => a + n, 0)}</div><div class="wb-cap">From pens</div>${proRows}</div>` : ''}
        ${Object.keys(summary.recipesReady).length ? `<div class="wb-block"><div class="wb-big">${Object.values(summary.recipesReady).reduce((a, n) => a + n, 0)}</div><div class="wb-cap">From factories</div>${recRows}</div>` : ''}
      </div>
      ${summary.totalSellValue ? `<div class="wb-value">~${summary.totalSellValue.toLocaleString()}💰 if you sell it all</div>` : ''}
      ${hooks.length ? `
        <div class="wb-tomorrow">
          <div class="wb-tomorrow-title">Looking ahead</div>
          <ul class="wb-tomorrow-list">
            ${hooks.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>` : ''}
      <button id="wb-collect" class="btn primary">Let's Go!</button>
    </div>
  `;
  document.getElementById('wb-collect')!.addEventListener('click', closeModal);
}
