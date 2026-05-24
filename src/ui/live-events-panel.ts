// =============================================================
//  LIVE EVENTS PANEL -- current event progress, featured calendar
//  events, and the token shop.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { sprites } from '../sprites';
import { openModal } from './modal';
import {
  initLiveEvent,
  tickLiveEvent,
  currentLiveEvent,
  liveEventProgressPct,
  EVENT_SHOP,
  buyEventShopItem,
} from '../systems/live-events';
import { initFeaturedEvents, tickFeaturedEvents, featuredEventsHaveAttention } from '../systems/featured-events';
import {
  SKY_RACE_MILESTONES,
  claimSkyRaceMilestone,
  claimSkyRaceTask,
  skyRaceDaysLeft,
  skyRaceHasAttention,
  skyRaceLeaderboard,
  skyRaceProgressPct,
  skyRaceTaskRewardText,
} from '../systems/sky-race';
import {
  FAIR_CATEGORY_LABELS,
  claimCountyFairReward,
  countyFairActive,
  countyFairDaysLeft,
  countyFairDaysUntilNext,
  countyFairEligibleItems,
  countyFairHasAttention,
  countyFairLeaderboard,
  countyFairRewardFor,
  countyFairRibbonLabel,
  submitCountyFairItem,
} from '../systems/county-fair';
import {
  CAMPING_CHAPTERS,
  campingChapterIndex,
  campingDaysLeft,
  campingRewardText,
  claimCampingChapter,
  countryCampingHasAttention,
  countryCampingProgressPct,
} from '../systems/country-camping';
import {
  FISHING_TOURNAMENT_REWARDS,
  claimFishingTournamentReward,
  fishingTournamentDaysLeft,
  fishingTournamentHasAttention,
  fishingTournamentLeaderboard,
  fishingTournamentProgressPct,
} from '../systems/fishing-tournament';

export function openLiveEventsPanel(): void {
  initLiveEvent();
  tickLiveEvent();
  initFeaturedEvents();
  tickFeaturedEvents();
  openModal('\u{1F389} Events', [
    { key: 'event', label: 'Active', render: renderEvent },
    { key: 'featured', label: 'Featured', render: renderFeatured },
    { key: 'shop', label: 'Event Shop', render: renderShop },
  ], featuredEventsHaveAttention() ? 'featured' : 'event');
}

function renderEvent(body: HTMLElement): void {
  const def = currentLiveEvent();
  const e = state.liveEvent!;
  if (!def) {
    body.innerHTML = '<p>No active event. Check back soon!</p>';
    return;
  }
  const rewards = def.rewards.map((r, i) => {
    const claimed = e.rewardsClaimed.includes(i);
    return `<div class="landmark-req ${claimed ? 'done' : ''}">
      <div class="landmark-req-name">${escapeHtml(r.label)}</div>
      <div class="landmark-req-progress">${r.pts} pts</div>
      <div class="landmark-req-have">+${r.coins} coins +${r.tokens} tokens${r.material ? ` + 1 ${escapeHtml(ITEMS[r.material]?.name ?? r.material)}` : ''}</div>
      ${claimed ? '<span class="landmark-req-tick">OK</span>' : ''}
    </div>`;
  }).join('');
  const rules = def.pointRules.map(r => {
    const item = r.itemKey ? ITEMS[r.itemKey]?.name ?? r.itemKey : '';
    return `<li>${escapeHtml(prettyAction(r.actionId))}${item ? ` ${escapeHtml(item)}` : ''}: +${r.points} pts</li>`;
  }).join('');
  body.innerHTML = `
    <div class="landmark-card">
      <div class="landmark-head">
        <div class="landmark-emoji">${def.emoji}</div>
        <div class="landmark-meta">
          <h3>${escapeHtml(def.name)}</h3>
          <p>${escapeHtml(def.blurb)}</p>
        </div>
      </div>
      <p><b>Your points: ${e.points}</b> &middot; Tokens: ${e.tokens}</p>
      <div class="landmark-bar"><div class="landmark-fill" style="width:${liveEventProgressPct()}%"></div></div>
      <p class="featured-section-title"><b>Rewards</b></p>
      <div class="landmark-reqs">${rewards}</div>
      <p class="featured-section-title"><b>Point Sources</b></p>
      <ul class="featured-rule-list">${rules}</ul>
    </div>
  `;
}

function prettyAction(id: string): string {
  switch (id) {
    case 'produce': return 'Produce';
    case 'harvest': return 'Harvest';
    case 'sell': return 'Sell';
    case 'order_contains': return 'Order with';
    case 'fish_caught': return 'Catch fish';
    case 'animal_produce': return 'Animal produce';
    case 'tree_harvest': return 'Harvest tree';
    case 'card_cast': return 'Cast a Weather Card';
    case 'balloon_served': return 'Serve a Balloon';
    default: return id;
  }
}

function renderFeatured(body: HTMLElement): void {
  initFeaturedEvents();
  tickFeaturedEvents();
  body.innerHTML = `
    <div class="featured-events-grid">
      ${renderSkyRaceCard()}
      ${renderCountyFairCard()}
      ${renderCampingCard()}
      ${renderFishingCard()}
    </div>
  `;
  bindFeaturedButtons(body);
}

function renderSkyRaceCard(): string {
  const race = state.skyRace!;
  const tasks = race.tasks.map(task => {
    const done = task.progress >= task.target;
    const pct = Math.min(100, (task.progress / task.target) * 100);
    return `<div class="featured-task ${task.claimed ? 'done' : done ? 'ready' : ''}">
      <div class="featured-task-main">
        <div class="featured-task-title">${escapeHtml(task.label)}</div>
        <div class="featured-task-sub">${task.progress}/${task.target} &middot; ${escapeHtml(skyRaceTaskRewardText(task))}</div>
        <div class="featured-mini-bar"><span style="width:${pct}%"></span></div>
      </div>
      <button class="btn small primary" data-sky-task="${task.id}" ${done && !task.claimed ? '' : 'disabled'}>
        ${task.claimed ? 'Claimed' : 'Claim'}
      </button>
    </div>`;
  }).join('');
  const milestones = SKY_RACE_MILESTONES.map((reward, idx) => {
    const claimed = race.rewardsClaimed.includes(idx);
    const ready = race.points >= reward.points && !claimed;
    return `<div class="featured-reward ${claimed ? 'done' : ready ? 'ready' : ''}">
      <div>
        <b>${escapeHtml(reward.label)}</b>
        <span>${reward.points} pts &middot; ${reward.coins} coins &middot; ${reward.xp} XP${reward.itemKey ? ` &middot; ${reward.qty ?? 1}x ${escapeHtml(ITEMS[reward.itemKey]?.name ?? reward.itemKey)}` : ''}</span>
      </div>
      <button class="btn small primary" data-sky-reward="${idx}" ${ready ? '' : 'disabled'}>${claimed ? 'Claimed' : 'Claim'}</button>
    </div>`;
  }).join('');
  return `<section class="featured-card featured-card--sky ${skyRaceHasAttention() ? 'featured-card--attention' : ''}">
    <div class="featured-card-head">
      <div class="featured-event-icon">\u{1F3C1}</div>
      <div>
        <h3>Sky Race</h3>
        <p>${skyRaceDaysLeft()} day${skyRaceDaysLeft() === 1 ? '' : 's'} left &middot; ${race.points} pts</p>
      </div>
    </div>
    <div class="featured-progress"><span style="width:${skyRaceProgressPct()}%"></span></div>
    <div class="featured-two-col">
      <div>
        <p class="featured-section-title"><b>Race Tasks</b></p>
        <div class="featured-stack">${tasks}</div>
      </div>
      <div>
        <p class="featured-section-title"><b>Crates</b></p>
        <div class="featured-stack">${milestones}</div>
        ${renderLeaderboard(skyRaceLeaderboard())}
      </div>
    </div>
  </section>`;
}

function renderCountyFairCard(): string {
  const fair = state.countyFair!;
  const active = countyFairActive();
  const submitted = fair.submitted;
  const category = FAIR_CATEGORY_LABELS[fair.category];
  let body = '';
  if (!active) {
    body = `<p class="featured-empty">Next fair opens in ${countyFairDaysUntilNext()} days.</p>`;
  } else if (submitted) {
    const reward = countyFairRewardFor(submitted.ribbon);
    body = `<div class="featured-fair-result">
      ${itemBadge(submitted.itemKey)}
      <div>
        <b>${countyFairRibbonLabel(submitted.ribbon)}</b>
        <span>${escapeHtml(ITEMS[submitted.itemKey]?.name ?? submitted.itemKey)} scored ${submitted.score}</span>
        <span>${reward.coins} coins &middot; ${reward.xp} XP${reward.itemKey ? ` &middot; ${reward.qty ?? 1}x ${escapeHtml(ITEMS[reward.itemKey]?.name ?? reward.itemKey)}` : ''}</span>
      </div>
      <button class="btn small primary" data-fair-claim ${fair.rewardClaimed ? 'disabled' : ''}>${fair.rewardClaimed ? 'Claimed' : 'Claim'}</button>
    </div>`;
  } else {
    const eligible = countyFairEligibleItems().slice(0, 6);
    body = eligible.length === 0
      ? '<p class="featured-empty">No matching items in storage yet.</p>'
      : `<div class="featured-submit-list">${eligible.map(it => `
        <button class="featured-submit" data-fair-submit="${it.itemKey}">
          ${itemBadge(it.itemKey)}
          <span>${escapeHtml(ITEMS[it.itemKey]?.name ?? it.itemKey)}</span>
          <small>${it.score} pts &middot; owned ${it.qty}</small>
        </button>
      `).join('')}</div>`;
  }
  return `<section class="featured-card featured-card--fair ${countyFairHasAttention() ? 'featured-card--attention' : ''}">
    <div class="featured-card-head">
      <div class="featured-event-icon">\u{1F3A1}</div>
      <div>
        <h3>County Fair</h3>
        <p>${active ? `${countyFairDaysLeft()} days left` : 'between fairs'} &middot; ${escapeHtml(category)}</p>
      </div>
    </div>
    ${body}
    ${submitted ? renderLeaderboard(countyFairLeaderboard()) : ''}
  </section>`;
}

function renderCampingCard(): string {
  const camp = state.countryCamping!;
  const chapterIdx = campingChapterIndex();
  const chapters = CAMPING_CHAPTERS.map((chapter, idx) => {
    const unlocked = idx <= chapterIdx;
    const claimed = camp.claimedChapters.includes(idx);
    const ready = unlocked && camp.points >= chapter.threshold && !claimed;
    return `<div class="featured-chapter ${claimed ? 'done' : ready ? 'ready' : unlocked ? '' : 'locked'}">
      <div>
        <b>${escapeHtml(chapter.title)}</b>
        <span>${escapeHtml(chapter.body)}</span>
        <small>${chapter.threshold} pts &middot; ${escapeHtml(campingRewardText(chapter))}</small>
      </div>
      <button class="btn small primary" data-camp-claim="${idx}" ${ready ? '' : 'disabled'}>
        ${claimed ? 'Done' : unlocked ? 'Claim' : 'Soon'}
      </button>
    </div>`;
  }).join('');
  return `<section class="featured-card featured-card--camp ${countryCampingHasAttention() ? 'featured-card--attention' : ''}">
    <div class="featured-card-head">
      <div class="featured-event-icon">\u{1F3D5}\uFE0F</div>
      <div>
        <h3>Country Camping</h3>
        <p>${campingDaysLeft()} days left &middot; chapter ${chapterIdx + 1}/4 &middot; ${camp.points} pts</p>
      </div>
    </div>
    <div class="featured-progress"><span style="width:${countryCampingProgressPct()}%"></span></div>
    <div class="featured-stack">${chapters}</div>
  </section>`;
}

function renderFishingCard(): string {
  const tourney = state.fishingTournament!;
  const rewards = FISHING_TOURNAMENT_REWARDS.map((reward, idx) => {
    const claimed = tourney.rewardsClaimed.includes(idx);
    const ready = tourney.points >= reward.points && !claimed;
    return `<div class="featured-reward ${claimed ? 'done' : ready ? 'ready' : ''}">
      <div>
        <b>${escapeHtml(reward.label)}</b>
        <span>${reward.points} pts &middot; ${reward.coins} coins &middot; ${reward.xp} XP${reward.itemKey ? ` &middot; ${reward.qty ?? 1}x ${escapeHtml(ITEMS[reward.itemKey]?.name ?? reward.itemKey)}` : ''}</span>
      </div>
      <button class="btn small primary" data-fish-reward="${idx}" ${ready ? '' : 'disabled'}>${claimed ? 'Claimed' : 'Claim'}</button>
    </div>`;
  }).join('');
  return `<section class="featured-card featured-card--fish ${fishingTournamentHasAttention() ? 'featured-card--attention' : ''}">
    <div class="featured-card-head">
      <div class="featured-event-icon">\u{1F3A3}</div>
      <div>
        <h3>Fishing Tournament</h3>
        <p>${fishingTournamentDaysLeft()} days left &middot; ${tourney.catches} catches &middot; ${tourney.points} pts</p>
      </div>
    </div>
    <div class="featured-progress"><span style="width:${fishingTournamentProgressPct()}%"></span></div>
    <div class="featured-two-col">
      <div>
        <p class="featured-section-title"><b>Tackle Rewards</b></p>
        <div class="featured-stack">${rewards}</div>
      </div>
      <div>
        <p class="featured-section-title"><b>Leaderboard</b></p>
        ${renderLeaderboard(fishingTournamentLeaderboard())}
      </div>
    </div>
  </section>`;
}

function renderLeaderboard(entries: ReturnType<typeof skyRaceLeaderboard>): string {
  return `<ol class="featured-leaderboard">
    ${entries.slice(0, 5).map((e, idx) => `<li class="${e.isPlayer ? 'is-player' : ''}">
      <span>${idx + 1}</span>
      <b>${e.emoji} ${escapeHtml(e.name)}</b>
      <em>${e.points} pts</em>
    </li>`).join('')}
  </ol>`;
}

function bindFeaturedButtons(body: HTMLElement): void {
  body.querySelectorAll<HTMLButtonElement>('button[data-sky-task]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimSkyRaceTask(btn.dataset.skyTask!)) renderFeatured(body);
    });
  });
  body.querySelectorAll<HTMLButtonElement>('button[data-sky-reward]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimSkyRaceMilestone(parseInt(btn.dataset.skyReward!, 10))) renderFeatured(body);
    });
  });
  body.querySelectorAll<HTMLButtonElement>('button[data-fair-submit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (submitCountyFairItem(btn.dataset.fairSubmit!)) renderFeatured(body);
    });
  });
  body.querySelector<HTMLButtonElement>('button[data-fair-claim]')?.addEventListener('click', () => {
    if (claimCountyFairReward()) renderFeatured(body);
  });
  body.querySelectorAll<HTMLButtonElement>('button[data-camp-claim]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimCampingChapter(parseInt(btn.dataset.campClaim!, 10))) renderFeatured(body);
    });
  });
  body.querySelectorAll<HTMLButtonElement>('button[data-fish-reward]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (claimFishingTournamentReward(parseInt(btn.dataset.fishReward!, 10))) renderFeatured(body);
    });
  });
}

function renderShop(body: HTMLElement): void {
  const e = state.liveEvent!;
  const list = EVENT_SHOP.map((it, i) => {
    const enabled = e.tokens >= it.costTokens;
    return `<div class="landmark-req">
      ${itemBadge(it.itemKey)}
      <div class="landmark-req-name">${it.qty}x ${escapeHtml(ITEMS[it.itemKey]?.name ?? it.itemKey)}</div>
      <div class="landmark-req-progress">${it.costTokens} tokens</div>
      <button class="btn small primary" data-buy="${i}" ${enabled ? '' : 'disabled'}>Buy</button>
    </div>`;
  }).join('');
  body.innerHTML = `
    <p><b>Festival Tokens: ${e.tokens}</b></p>
    <div class="landmark-reqs">${list}</div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-buy]').forEach(b =>
    b.addEventListener('click', () => { buyEventShopItem(parseInt(b.dataset.buy!, 10)); renderShop(body); }),
  );
}

function itemBadge(itemKey: string): string {
  const src = sprites.item[itemKey]?.toDataURL();
  if (src) return `<img class="ico featured-item-ico" src="${src}" alt="">`;
  return `<span class="featured-item-fallback">${escapeHtml((ITEMS[itemKey]?.name ?? itemKey)[0] ?? '?')}</span>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}
