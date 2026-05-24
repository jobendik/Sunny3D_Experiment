// =============================================================
//  DAILY PANEL — login streak, challenges, rotating merchant,
//  weather forecast puzzle, and the come-back-in-X claim.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import {
  initDaily, dailyTick, canClaimStreak, claimStreak,
  streakRewardForDay, claimDailyChallenge, rerollOneChallenge,
  tryBuyFromMerchant, submitForecastGuess, timedClaimReady,
  claimTimedReward, claimReturnGift,
} from '../systems/daily';
import { openModal } from './modal';
import { CONFIG } from '../config';
import { startVisibleTicker } from './visible-ticker';

let timerTickerStop: (() => void) | null = null;

export function openDaily(): void {
  initDaily();
  dailyTick();
  openModal('🌅 Daily', [
    { key: 'streak',    label: 'Streak',    render: renderStreak },
    { key: 'challenges',label: 'Tasks',     render: renderChallenges },
    { key: 'merchant',  label: 'Merchant',  render: renderMerchant },
    { key: 'forecast',  label: 'Forecast',  render: renderForecast },
    { key: 'timer',     label: 'Timer',     render: renderTimer },
  ], 'streak');
}

function renderStreak(body: HTMLElement): void {
  const d = state.daily!;
  const today = d.streak;
  const ladderHTML: string[] = [];
  for (let i = 1; i <= CONFIG.daily.streakCap; i++) {
    const r = streakRewardForDay(i);
    const active = i === ((today - 1) % CONFIG.daily.streakCap) + 1;
    ladderHTML.push(`
      <div class="streak-day ${active ? 'active' : ''} ${i <= today ? 'claimed' : ''}">
        <div class="streak-day-num">Day ${i}</div>
        <div class="streak-day-reward">
          <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${r.coins}
        </div>
      </div>
    `);
  }
  const canClaim = canClaimStreak();
  body.innerHTML = `
    <div class="streak-header">
      <div class="streak-fire">🔥</div>
      <div class="streak-stats">
        <div class="streak-current">Day ${today} Streak</div>
        <div class="streak-meta">Best: ${d.longestStreak} • Grace tokens: ${d.graceTokens}</div>
      </div>
      <button id="streak-claim" class="btn primary" ${canClaim ? '' : 'disabled'}>${canClaim ? 'Claim' : 'Claimed'}</button>
    </div>
    <div class="streak-ladder">${ladderHTML.join('')}</div>
    <div class="streak-tip">Log in tomorrow to keep the streak alive. A grace token saves one missed day automatically.</div>
  `;
  const cb = document.getElementById('streak-claim')!;
  cb.addEventListener('click', () => {
    if (claimStreak()) renderStreak(body);
  });
}

function renderChallenges(body: HTMLElement): void {
  const d = state.daily!;
  const cards: string[] = [];
  d.challenges.forEach((c, i) => {
    const pct = Math.min(100, (c.progress / c.target) * 100);
    cards.push(`
      <div class="challenge-card ${c.complete ? 'complete' : ''}">
        <div class="qdesc">${c.desc}</div>
        <div class="qbar"><div class="qfill" style="width:${pct}%"></div></div>
        <div class="qreward">
          <span>${c.progress}/${c.target}</span>
          <img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">+${c.reward.coins}
          <img class="ico-mini" src="${sprites.item.xp!.toDataURL()}">+${c.reward.xp}
          ${c.bonusReward ? `<span class="bonus">+${c.bonusReward.coins}💰 bonus</span>` : ''}
        </div>
        <div class="challenge-actions">
          <button data-act="claim" data-id="${c.id}" ${c.complete && !c.claimed ? '' : 'disabled'}>${c.claimed ? 'Claimed' : 'Claim'}</button>
          ${c.bonusReward ? `<button data-act="bonus" data-id="${c.id}" ${c.complete && !c.claimed ? '' : 'disabled'}>Bonus</button>` : ''}
          <button data-act="reroll" data-idx="${i}" ${(c.complete || d.rerollsLeft <= 0) ? 'disabled' : ''}>🎲 (${d.rerollsLeft})</button>
        </div>
      </div>
    `);
  });
  body.innerHTML = `
    <div class="challenge-header">
      <div>Daily challenges reset at 4 AM. Bonus rewards if you push for a stretch goal.</div>
      <div class="rerolls">Rerolls left: <b>${d.rerollsLeft}</b></div>
    </div>
    <div class="challenge-list">${cards.join('')}</div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act!;
      if (act === 'claim') claimDailyChallenge(btn.dataset.id!, false);
      else if (act === 'bonus') claimDailyChallenge(btn.dataset.id!, true);
      else if (act === 'reroll') rerollOneChallenge(parseInt(btn.dataset.idx!, 10));
      renderChallenges(body);
    });
  });
}

function renderMerchant(body: HTMLElement): void {
  const d = state.daily!;
  if (d.merchantStock.length === 0) {
    body.innerHTML = '<div class="empty">No stock today. Check back tomorrow!</div>';
    return;
  }
  body.innerHTML = `
    <div class="merchant-header">
      <h3>🚐 Today's Rotating Stock</h3>
      <div>Limited daily supply. Prices typically beat the standard shop.</div>
    </div>
    <div class="shop-grid">
      ${d.merchantStock.map(s => `
        <div class="shop-item">
          <img class="ico" src="${sprites.item[s.item]!.toDataURL()}">
          <div class="name">${ITEMS[s.item]!.name}</div>
          <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${s.price}</div>
          <div class="qty">${s.stock - s.bought} left</div>
          <button data-item="${s.item}" ${s.bought >= s.stock ? 'disabled' : ''}>Buy 1</button>
        </div>
      `).join('')}
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (tryBuyFromMerchant(btn.dataset.item!)) renderMerchant(body);
    });
  });
}

function renderForecast(body: HTMLElement): void {
  const d = state.daily!;
  const choices: Array<{ key: typeof state.weather; emoji: string; name: string }> = [
    { key: 'sunny', emoji: '☀️', name: 'Sunny' },
    { key: 'cloudy', emoji: '⛅', name: 'Cloudy' },
    { key: 'rainy', emoji: '🌧️', name: 'Rainy' },
    { key: 'windy', emoji: '🍃', name: 'Windy' },
    { key: 'storm', emoji: '⛈️', name: 'Storm' },
    { key: 'snowy', emoji: '❄️', name: 'Snowy' },
  ];
  if (d.forecast.guessed) {
    body.innerHTML = `
      <div class="forecast-card ${d.forecast.correct ? 'correct' : 'wrong'}">
        <div class="forecast-result">${d.forecast.correct ? '🎯 Nailed it!' : 'Close, but not quite.'}</div>
        <div>You guessed and earned ${d.forecast.correct ? '+75💰 +8 XP' : 'nothing today'}.</div>
        <div class="forecast-sub">Forecast resets at 4 AM.</div>
      </div>
    `;
    return;
  }
  body.innerHTML = `
    <div class="forecast-header">
      <h3>🔮 Forecast Puzzle</h3>
      <div>Predict today's prevailing weather to score +75💰 +8 XP.</div>
    </div>
    <div class="forecast-grid">
      ${choices.map(c => `<button class="forecast-btn" data-weather="${c.key}"><span class="forecast-emoji">${c.emoji}</span><span>${c.name}</span></button>`).join('')}
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-weather]').forEach(btn => {
    btn.addEventListener('click', () => {
      submitForecastGuess(btn.dataset.weather as typeof state.weather);
      renderForecast(body);
    });
  });
}

function renderTimer(body: HTMLElement): void {
  if (timerTickerStop) {
    timerTickerStop();
    timerTickerStop = null;
  }
  const d = state.daily!;
  const ready = timedClaimReady();
  const msLeft = Math.max(0, d.timedClaim.readyAt - Date.now());
  const minLeft = Math.floor(msLeft / 60000);
  const secLeft = Math.floor((msLeft % 60000) / 1000);
  const returnGift = d.pendingReturnGift.coins > 0 && !d.returnGiftClaimed;
  body.innerHTML = `
    <div class="timer-section">
      <h3>⏱️ Timed Claim</h3>
      <div class="timer-display ${ready ? 'ready' : ''}">
        ${ready ? 'Ready!' : `${minLeft}m ${secLeft}s`}
      </div>
      <div>Auto-claims a small reward every ${CONFIG.daily.timedClaimMinutes} minutes. Come back for more.</div>
      <button id="timer-claim" class="btn primary" ${ready ? '' : 'disabled'}>Claim</button>
    </div>
    ${returnGift ? `
      <div class="timer-section return-gift">
        <h3>🎁 Welcome Back!</h3>
        <div>Absent for ${d.pendingReturnGift.hours.toFixed(1)}h. +${d.pendingReturnGift.coins}💰 +${d.pendingReturnGift.xp}XP waiting.</div>
        <button id="return-claim" class="btn primary">Claim Gift</button>
      </div>` : ''}
  `;
  const tc = document.getElementById('timer-claim');
  if (tc) tc.addEventListener('click', () => { if (claimTimedReward()) renderTimer(body); });
  const rg = document.getElementById('return-claim');
  if (rg) rg.addEventListener('click', () => { if (claimReturnGift()) renderTimer(body); });
  timerTickerStop = startVisibleTicker({
    root: body,
    intervalMs: 1000,
    tick: () => renderTimer(body),
    stopWhen: () => (
      !document.getElementById('modal')!.classList.contains('open')
      || !body.querySelector('.timer-section')
    ),
  });
}
