import { state } from '../state';
import { ACHIEVEMENTS } from '../data/achievements';
import { openModal } from './modal';
import {
  habitatAcres, habitatNextMilestone, habitatPrevMilestone,
  habitatContributionTotals, markHabitatMilestoneSeen,
  HABITAT_MILESTONES,
} from '../systems/habitat-partner';
import {
  imperfectProduceActive, imperfectProduceDaysLeft, imperfectProduceNextStartIn,
  imperfectSellBonusPct, imperfectImperfectCount, markImperfectProduceSeen,
  IMPERFECT_PRODUCE_NAME,
} from '../systems/imperfect-produce';

export function openAchievements(): void {
  markHabitatMilestoneSeen();
  markImperfectProduceSeen();
  openModal('🏆 Awards', [
    { key: 'medals',  label: 'Medals',  render: renderMedals },
    { key: 'habitat', label: 'Habitat', render: renderHabitat },
    { key: 'csr',     label: 'Hero',    render: renderImperfectHero },
  ], 'medals');
}

function renderMedals(body: HTMLElement): void {
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

function renderHabitat(body: HTMLElement): void {
  const acres = habitatAcres();
  const prev = habitatPrevMilestone();
  const next = habitatNextMilestone();
  const span = Math.max(1, next - prev);
  const pct = Math.min(100, Math.max(0, ((acres - prev) / span) * 100));
  const totals = habitatContributionTotals();
  const milestoneRow = HABITAT_MILESTONES.map(m => {
    const hit = acres >= m;
    return `<span class="habitat-pip ${hit ? 'on' : ''}" title="${m} acres">${m}</span>`;
  }).join('');
  body.innerHTML = `
    <div class="csr-card habitat-card">
      <div class="csr-header">
        <div class="csr-emoji">🌲</div>
        <div>
          <div class="csr-title">Habitat Restoration Partnership</div>
          <div class="csr-sub">A symbolic tracker of progress across the Sunny Acres community.</div>
        </div>
      </div>
      <div class="habitat-acres"><b>${acres.toFixed(2)}</b> symbolic acres restored</div>
      <div class="habitat-bar"><div class="habitat-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="habitat-bar-meta">
        <span>${prev} acres</span>
        <span>next: ${next} acres</span>
      </div>
      <div class="habitat-pips">${milestoneRow}</div>
      <h4 class="csr-subhead">How you contributed</h4>
      <ul class="csr-list">
        <li>🌾 ${totals.harvest} crops harvested</li>
        <li>📋 ${totals.order} orders fulfilled</li>
        <li>🎣 ${totals.fish} fish landed</li>
        <li>💱 ${totals.sale} sales at the Shop</li>
        <li>🏗️ ${totals.landmark} landmark${totals.landmark === 1 ? '' : 's'} completed</li>
        <li>🗺️ ${totals.expedition} expedition node${totals.expedition === 1 ? '' : 's'} cleared</li>
        <li>🌦️ ${totals.weatherCast} weather casts</li>
      </ul>
      <p class="csr-footnote">
        This number is symbolic and represents your in-game contribution only.
        If you'd like to support real habitat restoration, search for an
        accredited conservation charity in your country.
      </p>
    </div>
  `;
}

function renderImperfectHero(body: HTMLElement): void {
  const root = state.imperfectProduce;
  const active = imperfectProduceActive();
  const left = imperfectProduceDaysLeft();
  const nextIn = imperfectProduceNextStartIn();
  const onHand = imperfectImperfectCount();
  const bonusPct = Math.round(imperfectSellBonusPct() * 100);
  const statusLine = active
    ? `<span class="csr-status on">Active</span> · ${left} day${left === 1 ? '' : 's'} left`
    : `<span class="csr-status off">Resting</span> · returns in ${nextIn} day${nextIn === 1 ? '' : 's'}`;
  body.innerHTML = `
    <div class="csr-card hero-card">
      <div class="csr-header">
        <div class="csr-emoji">🥕</div>
        <div>
          <div class="csr-title">${IMPERFECT_PRODUCE_NAME}</div>
          <div class="csr-sub">A weekly food-waste campaign. Wonky carrots and lopsided tomatoes sell for +${bonusPct}% when listed at the Shop.</div>
        </div>
      </div>
      <div class="csr-status-line">${statusLine}</div>
      <h4 class="csr-subhead">This campaign so far</h4>
      <ul class="csr-list">
        <li>🥕 ${root?.totalImperfectFlagged ?? 0} imperfect crops flagged</li>
        <li>📦 ${onHand} waiting in your barn</li>
        <li>💱 ${root?.totalImperfectSold ?? 0} imperfect crops sold</li>
        <li>💰 +${root?.totalBonusEarned ?? 0} bonus coins from the campaign</li>
        <li>🌍 ${root?.lifetimeImperfect ?? 0} lifetime imperfect harvests</li>
      </ul>
      <p class="csr-footnote">
        Inspired by real-world "Ugly Fruit" campaigns. Crops are still
        perfectly good to sell or process — they just look a little
        less photogenic.
      </p>
    </div>
  `;
}
