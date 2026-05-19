// =============================================================
//  MARKET PANEL — dynamic price snapshot, scarcity highlight,
//  weekly track, and community goal.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { dailyMarketSnapshot, scarcityActive, refreshMarketModifiers } from '../systems/market';
import { currentTheme, claimWeeklyTier, communityComplete, claimCommunityReward } from '../systems/weekly';
import { CONFIG } from '../config';
import { openModal } from './modal';

export function openMarket(): void {
  refreshMarketModifiers();
  openModal('💱 Market & Weekly', [
    { key: 'market',    label: 'Market',    render: renderMarket },
    { key: 'weekly',    label: 'Weekly',    render: renderWeekly },
    { key: 'community', label: 'Community', render: renderCommunity },
  ], 'market');
}

function renderMarket(body: HTMLElement): void {
  const snap = dailyMarketSnapshot();
  const sc = scarcityActive();
  body.innerHTML = `
    <div class="market-header">
      <h3>Today's Market</h3>
      <p style="color:#666;font-size:12px">Prices shift daily. Overstock penalty kicks in past ${CONFIG.market.overstockThreshold} units.</p>
    </div>
    ${sc ? `<div class="scarcity-banner">⚠️ Scarcity: <b>${ITEMS[sc.item]!.name}</b> selling at +${Math.round(CONFIG.market.scarcityMaxBonus * 100)}% for ${(sc.remaining / 60).toFixed(1)}m</div>` : ''}
    <div class="market-grid">
      ${snap.map(s => `
        <div class="market-row">
          <img class="ico-mini" src="${sprites.item[s.key]!.toDataURL()}">
          <span>${ITEMS[s.key]!.name}</span>
          <span class="market-mod ${s.mod >= 0 ? 'up' : 'down'}">${(s.mod >= 0 ? '+' : '') + Math.round(s.mod * 100)}%</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderWeekly(body: HTMLElement): void {
  const w = state.weekly!;
  const theme = currentTheme();
  const tiers = CONFIG.weekly.pointsForLevel;
  body.innerHTML = `
    <div class="weekly-header">
      <div class="weekly-theme">${theme.icon} ${theme.name}</div>
      <div>Points: <b>${w.points}</b></div>
    </div>
    <div class="weekly-ladder">
      ${tiers.map((req, i) => {
        const reached = w.points >= req;
        const claimed = w.claimedTiers.includes(i);
        return `
          <div class="weekly-tier ${reached ? 'reached' : ''} ${claimed ? 'claimed' : ''}">
            <div>Tier ${i + 1}</div>
            <div class="weekly-req">${req}pts</div>
            <button data-tier="${i}" ${reached && !claimed ? '' : 'disabled'}>
              ${claimed ? 'Claimed' : (reached ? 'Claim' : 'Locked')}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <div class="weekly-tip">Tip: actions matching the theme (${theme.focus}) earn 25% bonus points.</div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-tier]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimWeeklyTier(parseInt(btn.dataset.tier!, 10))) renderWeekly(body);
    });
  });
}

function renderCommunity(body: HTMLElement): void {
  const w = state.weekly!;
  const pct = Math.min(100, (w.communityProgress / w.communityTarget) * 100);
  const done = communityComplete();
  body.innerHTML = `
    <div class="community-goal">
      <h3>Community Goal</h3>
      <p>Players around you (and you) contribute to a weekly target. When the bar fills, everyone gets a prize.</p>
      <div class="qbar"><div class="qfill" style="width:${pct}%"></div></div>
      <div class="qreward">${w.communityProgress.toLocaleString()} / ${w.communityTarget.toLocaleString()}</div>
      <button class="btn primary" id="claim-community" ${done && !w.communityClaimed ? '' : 'disabled'}>
        ${w.communityClaimed ? 'Claimed' : (done ? 'Claim Reward' : 'In Progress')}
      </button>
    </div>
  `;
  const c = document.getElementById('claim-community')!;
  c.addEventListener('click', () => { if (claimCommunityReward()) renderCommunity(body); });
}
