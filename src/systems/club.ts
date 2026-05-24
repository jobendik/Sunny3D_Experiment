// =============================================================
//  FARMING CLUB — Phase 9 of the roadmap. Weekly shared goal
//  with simulated peer farmers contributing alongside the player.
//  Milestones reward coins, materials, and a cosmetic banner.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { choice, randi, nowSeconds } from '../utils';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { weekIndex } from './weekly';
import { addJournalEntry } from './journal';
import type { ClubRoot, ClubMember, ClubChatMessage, ClubChatRoot, MaterialKey } from '../types';

const UNLOCK_LEVEL = 15;

const SIM_NAMES: Array<{ name: string; emoji: string }> = [
  { name: 'Ferny', emoji: '🌿' },
  { name: 'Robin', emoji: '🦝' },
  { name: 'Mossy', emoji: '🍄' },
  { name: 'Beel', emoji: '🐝' },
  { name: 'Hollow', emoji: '🦉' },
  { name: 'Sprout', emoji: '🌱' },
  { name: 'Otter', emoji: '🦦' },
];

const THEMES: Array<{ id: string; name: string; emoji: string; goalMul: number }> = [
  { id: 'harvest',    name: 'Harvest Club Week',    emoji: '🌾', goalMul: 1.0 },
  { id: 'baking',     name: 'Bakery Club Week',     emoji: '🥐', goalMul: 0.8 },
  { id: 'fishing',    name: 'Fishing Derby',        emoji: '🎣', goalMul: 0.6 },
  { id: 'ranching',   name: 'Ranch Roundup',        emoji: '🐮', goalMul: 0.9 },
  { id: 'orchard',    name: 'Orchard Fair',         emoji: '🍎', goalMul: 0.7 },
  { id: 'market',     name: 'Market Masters',       emoji: '💱', goalMul: 1.2 },
  { id: 'weather',    name: 'Weather Festival',     emoji: '🌦️', goalMul: 0.5 },
  { id: 'build',      name: 'Construction Drive',   emoji: '🏗️', goalMul: 0.6 },
];

const MILESTONE_PCT = [25, 50, 75, 100];
const MILESTONE_MATERIAL: MaterialKey[] = ['nail', 'plank', 'screw', 'paint'];
const CHAT_MAX_MESSAGES = 40;
const CHAT_INTERVAL_MIN = 95;
const CHAT_INTERVAL_MAX = 190;

const QUICK_CHAT_LINES = [
  'Nice work this week!',
  'I can help with the next milestone.',
  'Saving goods for the club board.',
  'Great pace, team!',
  'I will focus on today\'s theme.',
];

const THEME_TIPS: Record<string, string[]> = {
  harvest: [
    'I am planting extra wheat for the club goal.',
    'Fresh harvest points are easy wins today.',
    'A tidy field makes this week fly by.',
  ],
  baking: [
    'The bakery is warm and ready.',
    'I am keeping flour moving for the club.',
    'Bread batches count nicely this week.',
  ],
  fishing: [
    'I packed bait for the fishing derby.',
    'The dock should be busy today.',
    'One rare catch could push us forward.',
  ],
  ranching: [
    'The animals are fed and happy.',
    'Milk and eggs will keep the score climbing.',
    'I am checking pens between orders.',
  ],
  orchard: [
    'The orchard trees are almost ready.',
    'Apples for the club, jam for the road.',
    'Tree harvests feel perfect for this theme.',
  ],
  market: [
    'Fair prices should bring customers fast.',
    'I listed some extras at the roadside stand.',
    'Market week loves a full stall.',
  ],
  weather: [
    'A good Weather Card could help everyone.',
    'Saving a charge for the right forecast.',
    'Weather mastery is our secret advantage.',
  ],
  build: [
    'I am gathering boards and nails.',
    'Landmark work gives big club points.',
    'Construction week needs steady supplies.',
  ],
};

export function initClub(): void {
  if (!state.club) {
    state.club = {
      unlocked: state.level >= UNLOCK_LEVEL,
      level: 1,
      weekIndex: weekIndex(),
      themeId: 'harvest',
      playerContribution: 0,
      totalContribution: 0,
      goal: 0,
      milestonesClaimed: [],
      members: makeSimulatedMembers(),
      bannerCount: 0,
      chat: makeClubChat(),
    };
    rolloverClub(true);
  }
  ensureClubDefaults();
  if (!state.club.unlocked && state.level >= UNLOCK_LEVEL) {
    state.club.unlocked = true;
    rolloverClub(true);
    toast('🏆 The Sunny Acres Farming Club has invited you in!', 'gold');
  }
}

function makeSimulatedMembers(): ClubMember[] {
  return SIM_NAMES.slice(0, 5).map((s, i) => ({
    id: `m${i}`,
    name: s.name,
    emoji: s.emoji,
    isSimulated: true,
    contribution: 0,
    lastContributionAt: 0,
  }));
}

function wallSeconds(): number {
  return Date.now() / 1000;
}

function makeClubChat(): ClubChatRoot {
  const now = wallSeconds();
  return {
    messages: [],
    unread: 0,
    lastReadAt: 0,
    nextSimAt: now + CHAT_INTERVAL_MIN + Math.random() * 35,
  };
}

function ensureClubDefaults(): void {
  const c = state.club!;
  if (!Array.isArray(c.members) || c.members.length === 0) {
    c.members = makeSimulatedMembers();
  }
  ensureClubChat();
}

function ensureClubChat(): ClubChatRoot {
  const c = state.club!;
  if (!c.chat) c.chat = makeClubChat();
  c.chat.messages = Array.isArray(c.chat.messages) ? c.chat.messages : [];
  c.chat.unread = Number.isFinite(c.chat.unread) ? c.chat.unread : 0;
  c.chat.lastReadAt = Number.isFinite(c.chat.lastReadAt) ? c.chat.lastReadAt : 0;
  c.chat.nextSimAt = Number.isFinite(c.chat.nextSimAt)
    ? c.chat.nextSimAt
    : wallSeconds() + CHAT_INTERVAL_MIN;
  if (c.chat.messages.length === 0) {
    const createdAt = Date.now();
    c.chat.messages.push({
      id: `club_chat_welcome_${createdAt}`,
      createdAt,
      kind: 'system',
      authorId: 'club_board',
      authorName: 'Club Board',
      emoji: '🏆',
      text: 'Welcome to the Sunny Acres Farming Club. Work together each week to reach shared milestones.',
    });
  }
  if (c.chat.messages.length > CHAT_MAX_MESSAGES) {
    c.chat.messages.splice(0, c.chat.messages.length - CHAT_MAX_MESSAGES);
  }
  return c.chat;
}

function appendClubChatMessage(
  msg: Omit<ClubChatMessage, 'id' | 'createdAt'>,
  countUnread: boolean,
): void {
  const chat = ensureClubChat();
  const createdAt = Date.now();
  chat.messages.push({
    id: `club_chat_${createdAt}_${Math.floor(Math.random() * 10000)}`,
    createdAt,
    ...msg,
  });
  if (chat.messages.length > CHAT_MAX_MESSAGES) {
    chat.messages.splice(0, chat.messages.length - CHAT_MAX_MESSAGES);
  }
  if (countUnread && state.club?.unlocked) {
    chat.unread = Math.min(99, (chat.unread ?? 0) + 1);
  }
}

function rolloverClub(force: boolean): void {
  const c = state.club!;
  const wk = weekIndex();
  if (!force && c.weekIndex === wk) return;
  c.weekIndex = wk;
  const theme = choice(THEMES);
  c.themeId = theme.id;
  c.goal = Math.max(150, Math.floor(200 * theme.goalMul * (1 + c.level * 0.1)));
  c.playerContribution = 0;
  c.totalContribution = 0;
  c.milestonesClaimed = [];
  for (const m of c.members) m.contribution = 0;
  appendClubChatMessage({
    kind: 'system',
    authorId: 'club_board',
    authorName: 'Club Board',
    emoji: theme.emoji,
    text: `${theme.name} has started. Earn ${c.goal} points together before the week ends.`,
  }, c.unlocked);
  track('club_week_rolled', { theme: theme.id });
}

export function maybeRolloverClub(): void {
  initClub();
  rolloverClub(false);
}

export function clubTheme(): { id: string; name: string; emoji: string } {
  initClub();
  const t = THEMES.find(t => t.id === state.club!.themeId)!;
  return { id: t.id, name: t.name, emoji: t.emoji };
}

/** Match-action against current theme. Returns points contributed. */
export function pointsForAction(actionId: string): number {
  if (actionId === 'club_donation') return 1;
  const id = state.club?.themeId;
  if (!id) return 0;
  switch (id) {
    case 'harvest':  return actionId === 'harvest'      ? 1 : 0;
    case 'baking':   return actionId === 'produce_bake' ? 2 : 0;
    case 'fishing':  return actionId === 'fish'         ? 2 : 0;
    case 'ranching': return actionId === 'animal_produce' ? 1 : 0;
    case 'orchard':  return actionId === 'tree_harvest' ? 2 : 0;
    case 'market':   return actionId === 'stall_sale'   ? 2 : 0;
    case 'weather':  return actionId === 'card_cast'    ? 5 : 0;
    case 'build':    return actionId === 'landmark_stage' ? 8 : 0;
    default: return 0;
  }
}

/** Player records progress toward the current theme. */
export function addClubProgress(actionId: string, count = 1): void {
  initClub();
  const c = state.club!;
  if (!c.unlocked) return;
  const ppu = pointsForAction(actionId);
  if (ppu <= 0) return;
  const pts = ppu * count;
  c.playerContribution += pts;
  c.totalContribution += pts;
  // Check milestone claims.
  checkMilestones();
}

function checkMilestones(): void {
  const c = state.club!;
  for (let i = 0; i < MILESTONE_PCT.length; i++) {
    const pct = MILESTONE_PCT[i]!;
    if (c.milestonesClaimed.includes(i)) continue;
    const need = Math.floor(c.goal * pct / 100);
    if (c.totalContribution >= need) {
      claimMilestone(i);
    }
  }
}

function claimMilestone(idx: number): void {
  const c = state.club!;
  c.milestonesClaimed.push(idx);
  const coins = 150 * (idx + 1);
  const xp = 40 + idx * 20;
  state.coins += coins;
  state.stats.earned += coins;
  addXP(xp);
  addItem(MILESTONE_MATERIAL[idx]!, 1);
  addItem('token', 5);
  sfx.bell(); sfx.coin();
  toast(`🏆 Club milestone ${MILESTONE_PCT[idx]}% reached! +${coins}💰 +1 ${ITEMS[MILESTONE_MATERIAL[idx]!]?.name} + 5 Tokens`, 'gold');
  track('club_milestone_claimed', { idx });
  if (idx === MILESTONE_PCT.length - 1) {
    c.bannerCount += 1;
    c.level += 1;
    addJournalEntry({
      id: `club_lvl_${c.level}`,
      title: `Club Level ${c.level}!`,
      body: `Sunny Acres Farming Club is now Lv ${c.level} — a new banner waves in the village.`,
      icon: '🏆',
    });
  }
}

/** Background tick — simulated members contribute small amounts. */
export function tickClub(dt: number): void {
  const c = state.club;
  if (!c || !c.unlocked) return;
  ensureClubDefaults();
  // ~ 1 contribution every 90-180s per member, scaled.
  for (const m of c.members) {
    if (Math.random() < dt / 120) {
      const add = 1 + randi(3);
      m.contribution += add;
      c.totalContribution += add;
      m.lastContributionAt = nowSeconds();
    }
  }
  tickClubChat();
  checkMilestones();
}

function tickClubChat(): void {
  const c = state.club;
  if (!c || !c.unlocked) return;
  const chat = ensureClubChat();
  const now = wallSeconds();
  if (now < chat.nextSimAt) return;
  const member = choice(c.members);
  const theme = clubTheme();
  const pct = clubProgressPct();
  const tips = THEME_TIPS[theme.id] ?? ['I am helping with the weekly goal.'];
  const pool = [
    choice(tips),
    `I added a few points to ${theme.name}.`,
    pct >= 75 ? 'The last milestone is close now.' : 'Saving supplies for the next milestone.',
    pct >= 100 ? 'That new club banner looks earned.' : 'Steady progress, team.',
  ];
  appendClubChatMessage({
    kind: 'sim',
    authorId: member.id,
    authorName: member.name,
    emoji: member.emoji,
    text: choice(pool),
  }, true);
  chat.nextSimAt = now + CHAT_INTERVAL_MIN + Math.random() * (CHAT_INTERVAL_MAX - CHAT_INTERVAL_MIN);
  track('club_chat_simulated', { theme: theme.id });
}

export function clubProgressPct(): number {
  const c = state.club;
  if (!c || c.goal === 0) return 0;
  return Math.min(100, (c.totalContribution / c.goal) * 100);
}

export function clubPlayerSharePct(): number {
  const c = state.club;
  if (!c || c.totalContribution === 0) return 0;
  return Math.min(100, (c.playerContribution / c.totalContribution) * 100);
}

export function clubChatMessages(): ClubChatMessage[] {
  initClub();
  return ensureClubChat().messages.slice();
}

export function clubChatUnread(): number {
  const c = state.club;
  return c?.chat?.unread ?? 0;
}

export function markClubChatRead(): void {
  initClub();
  const chat = ensureClubChat();
  chat.unread = 0;
  chat.lastReadAt = Date.now();
}

export function clubQuickMessages(): readonly string[] {
  return QUICK_CHAT_LINES;
}

export function postClubQuickMessage(text: string): boolean {
  initClub();
  const c = state.club!;
  if (!c.unlocked) return false;
  if (!QUICK_CHAT_LINES.includes(text)) return false;
  appendClubChatMessage({
    kind: 'player',
    authorId: 'player',
    authorName: state.farmName || 'You',
    emoji: '🌻',
    text,
  }, false);
  track('club_chat_player_quick', { text });
  return true;
}

export function postClubBoardMessage(text: string, emoji = '🏆', countUnread = true): void {
  initClub();
  appendClubChatMessage({
    kind: 'system',
    authorId: 'club_board',
    authorName: 'Club Board',
    emoji,
    text,
  }, countUnread);
}
