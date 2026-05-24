// =============================================================
//  SURPRISE BOX PANEL — open the pending box, see the reveal,
//  or pay diamonds to summon a new one.
// =============================================================

import { state } from '../state';
import { openModal } from './modal';
import {
  initSurpriseBox, hasPendingBox, currentRarity, openSurpriseBox,
  instantSpawn, timeUntilNext, SURPRISE_INSTANT_COST,
  SURPRISE_NATURAL_RARITY_ODDS, SURPRISE_INSTANT_RARITY_ODDS,
  SURPRISE_REWARD_DISCLOSURE,
} from '../systems/surprise-box';

let revealTimer: number | null = null;

export function openSurpriseBoxPanel(): void {
  initSurpriseBox();
  openModal('📦 Surprise Box', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function formatHMS(s: number): string {
  if (s <= 0) return 'now';
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function render(body: HTMLElement): void {
  const has = hasPendingBox();
  const rarity = currentRarity();
  const timeLeft = timeUntilNext();

  body.innerHTML = `
    <div class="surprise-shell">
      <div class="surprise-box-art surprise-box-art--${rarity} ${has ? 'is-pending' : 'is-waiting'}">
        ${has ? '<div class="surprise-box-icon">🎁</div>' : `<div class="surprise-box-icon waiting">⌛</div>`}
        <div class="surprise-box-rarity">${rarity.toUpperCase()}</div>
      </div>

      ${has
        ? `<p class="surprise-tagline">A ${rarity} surprise is waiting!<br>Tap below to open it.</p>
           <button class="btn primary big" id="surprise-open">🎁 Open Box</button>`
        : `<p class="surprise-tagline">Next box in <b>${formatHMS(timeLeft)}</b>.<br>Boxes appear naturally as you play.</p>
           <button class="btn diamond-btn big" id="surprise-instant" ${state.gems < SURPRISE_INSTANT_COST ? 'disabled' : ''}>
             💎 ${SURPRISE_INSTANT_COST} — Open a box now
           </button>`
      }
      <div class="surprise-odds-card">
        <div class="surprise-odds-title">Odds disclosure</div>
        <div class="surprise-odds-grid">
          <div>
            <b>Natural boxes</b>
            ${renderOdds(SURPRISE_NATURAL_RARITY_ODDS)}
          </div>
          <div>
            <b>Diamond instant boxes</b>
            ${renderOdds(SURPRISE_INSTANT_RARITY_ODDS)}
          </div>
        </div>
        <div class="surprise-reward-disclosure">
          ${(['common', 'rare', 'epic'] as const).map(r => `
            <div><b>${r}</b><span>${SURPRISE_REWARD_DISCLOSURE[r].join(' · ')}</span></div>
          `).join('')}
        </div>
        <p>After rarity is chosen, one reward is picked evenly from that rarity's reward pool.</p>
      </div>
    </div>
  `;

  const openBtn = document.getElementById('surprise-open');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const reward = openSurpriseBox();
      if (!reward) return;
      // Reveal animation
      body.querySelector('.surprise-box-art')?.classList.add('is-revealing');
      const art = body.querySelector('.surprise-box-art') as HTMLElement | null;
      if (art) {
        art.innerHTML = `<div class="surprise-reveal-icon">${reward.emoji}</div><div class="surprise-reveal-label">${reward.label}</div>`;
      }
      if (revealTimer !== null) clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => render(body), 2200);
    });
  }
  const instantBtn = document.getElementById('surprise-instant');
  if (instantBtn) {
    instantBtn.addEventListener('click', () => {
      if (instantSpawn()) {
        render(body);
      }
    });
  }
}

function renderOdds(odds: Record<'common' | 'rare' | 'epic', number>): string {
  return `
    <span>Common <b>${odds.common}%</b></span>
    <span>Rare <b>${odds.rare}%</b></span>
    <span>Epic <b>${odds.epic}%</b></span>
  `;
}
