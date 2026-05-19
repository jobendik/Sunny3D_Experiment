// =============================================================
//  DAILY SYSTEM — login streak, daily challenges, rotating
//  merchant inventory, weather forecast bonus, and the
//  timed claim "come back in X" loop.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { CONFIG } from '../config';
import { addXP } from './xp';
import { addItem } from './inventory';
// quests integration handled in quests.ts; nothing to import here
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { rand, randi, choice } from '../utils';
import type { DailyChallenge, DailyState } from '../types';

// Compute a stable local-day index using CONFIG.daily.rolloverHourLocal.
export function localDayIndex(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(d.getHours() - CONFIG.daily.rolloverHourLocal);
  return Math.floor(d.getTime() / 86400000);
}

export function initDaily(): void {
  if (!state.daily) {
    state.daily = createInitialDailyState();
  }
  if (state.daily.lastSeenDay === 0) {
    state.daily.lastSeenDay = localDayIndex();
  }
}

function createInitialDailyState(): DailyState {
  return {
    lastSeenDay: 0,
    streak: 0,
    streakClaimedDay: 0,
    longestStreak: 0,
    graceTokens: CONFIG.daily.graceTokensStart,
    challenges: [],
    challengeDay: 0,
    rerollsLeft: CONFIG.daily.challengeRerollsPerDay,
    merchantDay: 0,
    merchantStock: [],
    timedClaim: { readyAt: 0, claimed: false },
    forecast: { day: 0, predicted: 'sunny' },
    lastVisitTime: Date.now(),
    pendingReturnGift: { coins: 0, xp: 0, hours: 0 },
  };
}

// Called on init + each frame on resume to advance the daily reset boundary.
export function dailyTick(): void {
  initDaily();
  const d = state.daily!;
  const today = localDayIndex();

  if (d.lastSeenDay !== today) {
    rolloverDaily(today);
  }

  // Surface return gift if absent for a meaningful window.
  if (d.pendingReturnGift.coins > 0 && !d.returnGiftClaimed) {
    // toast is fired only once via flag below in claimReturnGift
  }
}

function rolloverDaily(today: number): void {
  const d = state.daily!;
  const missedDays = today - d.lastSeenDay - 1;
  const absentMs = Date.now() - (d.lastVisitTime || Date.now());
  const absentHours = Math.min(CONFIG.daily.returnGiftCapHours, absentMs / 3600000);

  // ---- Streak handling ----
  if (missedDays <= 0) {
    // consecutive
    d.streak += 1;
  } else if (missedDays === 1 && d.graceTokens > 0) {
    // grace token saves the streak
    d.graceTokens -= 1;
    d.streak += 1;
    toast(`Streak saved! (${d.graceTokens} grace left)`, 'xp');
    track('streak_grace_used', { missed: missedDays });
  } else {
    if (d.streak > 0) track('streak_broken', { lost: d.streak, missed: missedDays });
    d.streak = 1;
  }
  d.longestStreak = Math.max(d.longestStreak, d.streak);

  // ---- Return gift after long absence ----
  if (absentHours >= 1) {
    const coins = Math.floor(absentHours * CONFIG.daily.returnGiftRateCoinsPerHour);
    const xp = Math.floor(absentHours * CONFIG.daily.returnGiftRateXpPerHour);
    d.pendingReturnGift = { coins, xp, hours: absentHours };
    d.returnGiftClaimed = false;
  }

  // ---- Refresh challenges, merchant stock, forecast ----
  rerollDailyChallenges(true);
  refreshMerchant();
  refreshForecast();

  // ---- Restore grace token weekly ----
  if (today % 7 === 0) d.graceTokens = Math.min(d.graceTokens + 1, 3);

  // ---- Reset timed claim ----
  d.timedClaim = {
    readyAt: Date.now() + CONFIG.daily.timedClaimMinutes * 60000,
    claimed: false,
  };

  // ---- Reset rerolls ----
  d.rerollsLeft = CONFIG.daily.challengeRerollsPerDay;

  d.lastSeenDay = today;
  d.lastVisitTime = Date.now();

  track('daily_rollover', { streak: d.streak, missed: missedDays });
}

// ---------------- STREAK CLAIM ----------------
export function streakRewardForDay(dayInStreak: number): { coins: number; xp: number } {
  const idx = ((dayInStreak - 1) % CONFIG.daily.streakCap);
  return {
    coins: CONFIG.daily.streakRewardCoinsBase + idx * CONFIG.daily.streakRewardCoinsPerDay,
    xp: CONFIG.daily.streakRewardXpBase + idx * CONFIG.daily.streakRewardXpPerDay,
  };
}

export function canClaimStreak(): boolean {
  const d = state.daily!;
  return d.streak > 0 && d.streakClaimedDay !== d.lastSeenDay;
}

export function claimStreak(): boolean {
  if (!canClaimStreak()) return false;
  const d = state.daily!;
  const reward = streakRewardForDay(d.streak);
  state.coins += reward.coins;
  state.stats.earned += reward.coins;
  addXP(reward.xp);
  d.streakClaimedDay = d.lastSeenDay;
  sfx.coin(); sfx.bell();
  toast(`Day ${d.streak} streak! +${reward.coins}💰 +${reward.xp}XP`, 'gold');
  track('streak_claimed', { day: d.streak, coins: reward.coins, xp: reward.xp });
  updateHUD();
  return true;
}

// ---------------- DAILY CHALLENGES ----------------
function generateChallenge(level: number, idx: number): DailyChallenge {
  // Use idx to bias category diversity.
  const lvl = Math.max(1, level);
  const cats: DailyChallenge['kind'][] = ['harvest', 'sell', 'produce', 'earn', 'orders', 'fish'];
  const kind = cats[idx % cats.length]!;

  if (kind === 'harvest') {
    const eligible = Object.keys(CROPS).filter(k => CROPS[k]!.level <= lvl);
    const k = choice(eligible.length ? eligible : ['wheat']);
    const target = 8 + randi(12) + lvl;
    return {
      id: 'dc' + Date.now() + randi(1e6),
      kind, item: k, target, progress: 0,
      desc: `Harvest ${target} ${ITEMS[CROPS[k]!.item]!.name}`,
      reward: { coins: target * 4 + lvl * 10, xp: 5 + lvl },
      bonusReward: { coins: target * 6 + lvl * 15, xp: 10 + lvl * 2 },
    };
  }
  if (kind === 'sell') {
    const sellable = Object.keys(ITEMS).filter(k => ITEMS[k]!.level <= lvl && k !== 'feed' && ITEMS[k]!.sell > 5);
    const k = choice(sellable.length ? sellable : ['wheat']);
    const target = 4 + randi(8) + lvl;
    return {
      id: 'dc' + Date.now() + randi(1e6),
      kind, item: k, target, progress: 0,
      desc: `Sell ${target} ${ITEMS[k]!.name}`,
      reward: { coins: target * 6 + lvl * 12, xp: 5 + lvl },
      bonusReward: { coins: target * 9 + lvl * 18, xp: 10 + lvl * 2 },
    };
  }
  if (kind === 'produce') {
    const items = ['flour', 'bread', 'feed', 'butter', 'cheese', 'juice', 'jam', 'sugar', 'cake', 'cloth']
      .filter(k => ITEMS[k] && ITEMS[k]!.level <= lvl);
    const k = items.length ? choice(items) : 'flour';
    const target = 3 + randi(4) + Math.floor(lvl / 2);
    return {
      id: 'dc' + Date.now() + randi(1e6),
      kind, item: k, target, progress: 0,
      desc: `Produce ${target} ${ITEMS[k]!.name}`,
      reward: { coins: target * 14 + lvl * 10, xp: target * 2 + lvl },
      bonusReward: { coins: target * 22 + lvl * 18, xp: target * 4 + lvl * 2 },
    };
  }
  if (kind === 'earn') {
    const target = 300 + randi(600) + lvl * 100;
    return {
      id: 'dc' + Date.now() + randi(1e6),
      kind, target, progress: 0,
      desc: `Earn ${target} coins today`,
      reward: { coins: Math.floor(target * 0.25), xp: 6 + lvl },
      bonusReward: { coins: Math.floor(target * 0.4), xp: 12 + lvl * 2 },
    };
  }
  if (kind === 'orders') {
    const target = 2 + randi(3) + Math.floor(lvl / 3);
    return {
      id: 'dc' + Date.now() + randi(1e6),
      kind, target, progress: 0,
      desc: `Fulfill ${target} truck orders`,
      reward: { coins: target * 75 + lvl * 12, xp: target * 6 + lvl },
      bonusReward: { coins: target * 110 + lvl * 20, xp: target * 10 + lvl * 2 },
    };
  }
  // fish
  const target = 2 + randi(4) + Math.floor(lvl / 2);
  return {
    id: 'dc' + Date.now() + randi(1e6),
    kind, target, progress: 0,
    desc: `Catch ${target} fish`,
    reward: { coins: target * 24, xp: target * 4 + lvl },
    bonusReward: { coins: target * 38, xp: target * 7 + lvl * 2 },
  };
}

export function rerollDailyChallenges(fullRoll = false): void {
  initDaily();
  const d = state.daily!;
  d.challenges = [];
  for (let i = 0; i < CONFIG.daily.challengeCount; i++) {
    d.challenges.push(generateChallenge(state.level, i));
  }
  d.challengeDay = d.lastSeenDay;
  if (fullRoll) track('daily_challenges_rolled', { count: d.challenges.length });
}

export function rerollOneChallenge(idx: number): boolean {
  const d = state.daily!;
  if (d.rerollsLeft <= 0) return false;
  if (!d.challenges[idx]) return false;
  d.challenges[idx] = generateChallenge(state.level, idx);
  d.rerollsLeft -= 1;
  track('daily_challenge_reroll_used');
  return true;
}

export function dailyChallengeProgress(
  kind: DailyChallenge['kind'],
  item: string | null,
  amt = 1,
): void {
  const d = state.daily;
  if (!d) return;
  for (const c of d.challenges) {
    if (c.complete) continue;
    if (c.kind === kind && (!c.item || c.item === item)) {
      c.progress = Math.min(c.target, c.progress + amt);
      if (c.progress >= c.target) {
        c.complete = true;
        track('daily_challenge_complete', { kind: c.kind });
      }
    }
  }
}

export function claimDailyChallenge(id: string, bonus: boolean): void {
  const d = state.daily!;
  const c = d.challenges.find(x => x.id === id);
  if (!c || !c.complete || c.claimed) return;
  const r = bonus && c.bonusReward ? c.bonusReward : c.reward;
  state.coins += r.coins;
  state.stats.earned += r.coins;
  addXP(r.xp);
  c.claimed = true;
  sfx.quest(); sfx.coin();
  toast(`+${r.coins}💰 +${r.xp}XP`, 'gold');
  track('daily_challenge_claimed', { kind: c.kind, bonus: !!bonus });
  updateHUD();
}

// ---------------- ROTATING MERCHANT ----------------
const MERCHANT_POOL: Array<{ item: string; basePrice: number }> = [
  { item: 'feed',   basePrice: 10 },
  { item: 'flour',  basePrice: 18 },
  { item: 'sugar',  basePrice: 56 },
  { item: 'butter', basePrice: 52 },
  { item: 'cheese', basePrice: 68 },
  { item: 'juice',  basePrice: 70 },
  { item: 'jam',    basePrice: 100 },
  { item: 'cloth',  basePrice: 130 },
  { item: 'apple',  basePrice: 30 },
  { item: 'pear',   basePrice: 42 },
];

function refreshMerchant(): void {
  const d = state.daily!;
  d.merchantDay = d.lastSeenDay;
  d.merchantStock = [];
  const pool = MERCHANT_POOL.filter(m => ITEMS[m.item] && ITEMS[m.item]!.level <= state.level + 1);
  for (let i = 0; i < 4 && pool.length > 0; i++) {
    const idx = randi(pool.length);
    const pick = pool.splice(idx, 1)[0]!;
    const qty = 1 + randi(3);
    const discount = 0.75 + rand(0.2); // 75-95% of base
    d.merchantStock.push({
      item: pick.item,
      price: Math.max(1, Math.floor(pick.basePrice * discount)),
      stock: qty,
      bought: 0,
    });
  }
}

export function tryBuyFromMerchant(itemKey: string): boolean {
  const d = state.daily!;
  const s = d.merchantStock.find(x => x.item === itemKey);
  if (!s) return false;
  if (s.bought >= s.stock) { toast('Sold out for today!', 'error'); sfx.error(); return false; }
  if (state.coins < s.price) { toast('Not enough coins!', 'error'); sfx.cantAfford(); return false; }
  state.coins -= s.price;
  addItem(itemKey, 1);
  s.bought += 1;
  sfx.coin();
  toast(`Bought ${ITEMS[itemKey]!.name}`, 'gold');
  track('daily_merchant_buy', { item: itemKey, price: s.price });
  updateHUD();
  return true;
}

// ---------------- WEATHER FORECAST PUZZLE ----------------
function refreshForecast(): void {
  const d = state.daily!;
  const choices: Array<typeof state.weather> = ['sunny', 'cloudy', 'rainy', 'windy', 'storm', 'snowy'];
  d.forecast = {
    day: d.lastSeenDay,
    predicted: choice(choices),
    guessed: false,
    correct: false,
  };
}

export function submitForecastGuess(guess: typeof state.weather): void {
  const d = state.daily!;
  if (d.forecast.guessed) return;
  d.forecast.guessed = true;
  d.forecast.correct = guess === state.weather;
  if (d.forecast.correct) {
    state.coins += 75;
    state.stats.earned += 75;
    addXP(8);
    toast('Forecast nailed! +75💰 +8XP', 'gold');
    sfx.bell();
    track('daily_forecast_win');
  } else {
    toast('Forecast was off — better luck tomorrow!', '');
    track('daily_forecast_miss', { guess, actual: state.weather });
  }
  updateHUD();
}

// ---------------- TIMED CLAIM ----------------
export function timedClaimReady(): boolean {
  const d = state.daily!;
  return !d.timedClaim.claimed && Date.now() >= d.timedClaim.readyAt;
}

export function claimTimedReward(): boolean {
  const d = state.daily!;
  if (!timedClaimReady()) return false;
  const coins = 80 + state.level * 15;
  const xp = 5 + state.level * 2;
  state.coins += coins;
  state.stats.earned += coins;
  addXP(xp);
  // Re-arm immediately for another loop today.
  d.timedClaim = {
    readyAt: Date.now() + CONFIG.daily.timedClaimMinutes * 60000,
    claimed: false,
  };
  sfx.coin();
  toast(`Timed reward! +${coins}💰 +${xp}XP`, 'gold');
  track('daily_timed_claimed', { coins, xp });
  updateHUD();
  return true;
}

// ---------------- COMEBACK ----------------
export function claimReturnGift(): boolean {
  const d = state.daily!;
  if (d.returnGiftClaimed || d.pendingReturnGift.coins <= 0) return false;
  state.coins += d.pendingReturnGift.coins;
  state.stats.earned += d.pendingReturnGift.coins;
  addXP(d.pendingReturnGift.xp);
  toast(`Welcome back! +${d.pendingReturnGift.coins}💰 +${d.pendingReturnGift.xp}XP`, 'gold');
  track('return_gift_claimed', {
    coins: d.pendingReturnGift.coins,
    xp: d.pendingReturnGift.xp,
    hours: d.pendingReturnGift.hours,
  });
  d.pendingReturnGift = { coins: 0, xp: 0, hours: 0 };
  d.returnGiftClaimed = true;
  updateHUD();
  return true;
}

// Forward integration hook for other systems
export function hookDailyProgress(): void {
  // No-op: integrations happen via dailyChallengeProgress at sites of action.
}
