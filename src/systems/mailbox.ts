// =============================================================
//  MAILBOX — Alfred letters, villager thank-yous, gift cards.
//
//  Hay Day's mailbox delivers up to 7 letters per day, capping at
//  40 in the mailbox total. Letters can be plain "thank you" notes,
//  gift cards with rewards (coins / xp / items), system letters,
//  or event notices.
//
//  Alfred (the mail carrier scarecrow) delivers a daily "thank-you"
//  letter when the player has done at least one delivery the prior
//  day. Friends send thank-you letters after fulfilled orders or
//  help requests at higher friendship levels.
// =============================================================

import { state } from '../state';
import { VILLAGERS, VILLAGER_IDS } from '../data/characters';
import { ITEMS } from '../data/items';
import { rand, randi, choice, nowSeconds } from '../utils';
import { addItem } from './inventory';
import { addXP } from './xp';
import { localDayIndex } from './daily';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { updateHUD } from '../ui/hud';
import { track } from './telemetry';
import type { MailLetter, MailKind } from '../types';

export const MAILBOX_CAP = 40;
export const DAILY_LETTER_CAP = 7;

const ALFRED = {
  id: 'alfred',
  name: 'Alfred',
  emoji: '🌾',
  role: 'Mail carrier',
};

const ALFRED_GREETINGS: ReadonlyArray<string> = [
  'A small token for keeping the farm so cheerful!',
  'Hope this brightens your morning.',
  'Just dropping off a little something — keep at it!',
  'Hello, friend! The breeze was lovely on my route today.',
  'For your kindness. The farm grows ever sunnier!',
  'Saw a rainbow over your wheat field — felt right to share.',
];

const GIFT_CARD_SENDERS: ReadonlyArray<string> = [
  'The Town Council',
  'A grateful traveler',
  'The Innkeeper',
  'The Sunny Acres Co-op',
];

export function initMailbox(): void {
  if (!state.mailbox) {
    state.mailbox = {
      letters: [],
      lastDeliveryDay: 0,
      lettersDeliveredToday: 0,
      totalReceived: 0,
    };
    // Welcome letter from Alfred
    deliverLetter({
      kind: 'system',
      senderId: 'alfred',
      title: 'Welcome to Sunny Acres!',
      body: "Alfred here, your local mail carrier. I'll drop letters and gift cards here. Up to 7 letters a day, and 40 in the box at a time. Don't let it overflow!",
      reward: { coins: 100, items: { feed: 2 } },
    });
  }
}

export function deliverLetter(opts: {
  kind: MailKind;
  senderId: string;
  title: string;
  body: string;
  reward?: MailLetter['reward'];
}): boolean {
  initMailbox();
  const box = state.mailbox!;
  // Cap daily deliveries
  const today = localDayIndex();
  if (box.lastDeliveryDay !== today) {
    box.lettersDeliveredToday = 0;
    box.lastDeliveryDay = today;
  }
  if (box.lettersDeliveredToday >= DAILY_LETTER_CAP) {
    return false;
  }
  // Cap mailbox total — drop oldest read+claimed letters first
  while (box.letters.length >= MAILBOX_CAP) {
    const oldestReadIdx = box.letters.findIndex(l => l.read && (!l.reward || l.claimed));
    if (oldestReadIdx >= 0) box.letters.splice(oldestReadIdx, 1);
    else box.letters.shift();
  }
  const letter: MailLetter = {
    id: 'mail' + Date.now() + randi(1e6),
    kind: opts.kind,
    senderId: opts.senderId,
    title: opts.title,
    body: opts.body,
    read: false,
    receivedAt: nowSeconds(),
    reward: opts.reward,
    claimed: false,
  };
  box.letters.unshift(letter);
  box.lettersDeliveredToday += 1;
  box.totalReceived += 1;
  track('mail_received', { kind: opts.kind, sender: opts.senderId });
  return true;
}

/** Daily Alfred letter: a small thank-you with a tiny reward. */
export function maybeDeliverAlfred(): void {
  initMailbox();
  const box = state.mailbox!;
  const today = localDayIndex();
  if (box.lastDeliveryDay === today && box.lettersDeliveredToday >= 1) {
    // already had a delivery today; check if Alfred specifically came
    const hasAlfredToday = box.letters.some(l =>
      l.senderId === 'alfred' && l.kind === 'letter' &&
      Math.floor((l.receivedAt) / 86400) === Math.floor(nowSeconds() / 86400),
    );
    if (hasAlfredToday) return;
  }
  // Reward scaled by level
  const lvl = Math.max(1, state.level);
  const coins = 20 + lvl * 4;
  deliverLetter({
    kind: 'letter',
    senderId: 'alfred',
    title: `Alfred's Daily Round`,
    body: choice(ALFRED_GREETINGS),
    reward: { coins },
  });
}

/** Send a thank-you letter from a villager after a delivery. */
export function maybeDeliverThanks(villagerId: string): void {
  const v = VILLAGERS[villagerId];
  if (!v) return;
  // 25% chance to send a thanks letter
  if (Math.random() > 0.25) return;
  const lvl = Math.max(1, state.level);
  const thank = choice(v.thanks);
  // Some thanks letters carry a small gift card
  const giftCard = Math.random() < 0.35;
  const reward: MailLetter['reward'] = giftCard
    ? { coins: 30 + lvl * 5, xp: 5 + Math.floor(lvl / 2) }
    : { coins: 10 + lvl * 2 };
  deliverLetter({
    kind: giftCard ? 'giftcard' : 'letter',
    senderId: villagerId,
    title: `${v.name} says hello`,
    body: `"${thank}"\n\n${giftCard ? 'A small gift for you, with my thanks.' : ''}`,
    reward,
  });
}

/** Random gift card from a "stranger" or system. */
export function maybeDeliverGiftCard(): void {
  initMailbox();
  // Rare — 5% chance per check
  if (Math.random() > 0.05) return;
  const sender = choice(GIFT_CARD_SENDERS);
  const lvl = Math.max(1, state.level);
  const reward: MailLetter['reward'] = Math.random() < 0.3
    ? { gems: 1, coins: 50 + lvl * 8 }
    : { coins: 75 + lvl * 10, items: { feed: 3 } };
  deliverLetter({
    kind: 'giftcard',
    senderId: sender.toLowerCase().replace(/\s+/g, '_'),
    title: `A gift from ${sender}`,
    body: `Hello, farmer! ${sender} sends this gift card. Enjoy and keep growing.`,
    reward,
  });
}

export function unreadCount(): number {
  initMailbox();
  return state.mailbox!.letters.filter(l => !l.read).length;
}

export function totalCount(): number {
  initMailbox();
  return state.mailbox!.letters.length;
}

export function markRead(letterId: string): void {
  initMailbox();
  const letter = state.mailbox!.letters.find(l => l.id === letterId);
  if (letter) letter.read = true;
}

export function claimReward(letterId: string): boolean {
  initMailbox();
  const letter = state.mailbox!.letters.find(l => l.id === letterId);
  if (!letter || !letter.reward || letter.claimed) return false;
  const r = letter.reward;
  if (r.coins) { state.coins += r.coins; state.stats.earned += r.coins; }
  if (r.gems) { state.gems += r.gems; }
  if (r.xp) { addXP(r.xp); }
  if (r.items) {
    for (const k in r.items) addItem(k, r.items[k]!);
  }
  letter.claimed = true;
  letter.read = true;
  sfx.coin(); sfx.bell();
  const parts: string[] = [];
  if (r.coins) parts.push(`+${r.coins}💰`);
  if (r.gems) parts.push(`+${r.gems}💎`);
  if (r.xp) parts.push(`+${r.xp}XP`);
  if (r.items) {
    for (const k in r.items) {
      const it = ITEMS[k];
      parts.push(`+${r.items[k]} ${it?.name ?? k}`);
    }
  }
  toast(`📬 Claimed: ${parts.join(', ')}`, 'gold');
  updateHUD();
  track('mail_claimed', { reward: parts.join(',') });
  return true;
}

export function deleteLetter(letterId: string): void {
  initMailbox();
  const idx = state.mailbox!.letters.findIndex(l => l.id === letterId);
  if (idx >= 0) state.mailbox!.letters.splice(idx, 1);
}

export function deleteRead(): number {
  initMailbox();
  const box = state.mailbox!;
  const before = box.letters.length;
  box.letters = box.letters.filter(l => !l.read || (l.reward && !l.claimed));
  return before - box.letters.length;
}

export function senderInfo(senderId: string): { name: string; emoji: string; role: string; accent?: string } {
  if (senderId === 'alfred') return ALFRED;
  const v = VILLAGERS[senderId];
  if (v) return { name: v.name, emoji: v.emoji, role: v.role, accent: v.accent };
  return { name: 'Sunny Acres', emoji: '✉️', role: 'Letter' };
}

/** Periodic check for new daily letters. Called once per ~5 minutes. */
export function mailboxTick(): void {
  initMailbox();
  const today = localDayIndex();
  if (state.mailbox!.lastDeliveryDay !== today) {
    state.mailbox!.lettersDeliveredToday = 0;
    state.mailbox!.lastDeliveryDay = today;
    // New day — deliver Alfred + maybe gift card.
    maybeDeliverAlfred();
    maybeDeliverGiftCard();
  }
  // Random thank-you from a recent friend (1% per tick)
  if (state.friendship && Math.random() < 0.01) {
    const friendIds = Object.keys(state.friendship.byNeighbor)
      .filter(id => state.friendship!.byNeighbor[id]!.totalDeliveries > 0);
    if (friendIds.length > 0) {
      maybeDeliverThanks(choice(friendIds));
    }
  }
}
