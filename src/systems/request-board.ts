// =============================================================
//  CLUB REQUEST BOARD - asynchronous donation surface.
//
//  This extends the Farming Club without adding another top-level
//  save field: all state lives under optional state.club.requestBoard.
//  Players donate items to simulated peers for XP + club progress,
//  and can keep one open request that simulated peers fill over time.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { choice, randi } from '../utils';
import {
  initClub,
  addClubProgress,
  clubTheme,
  postClubBoardMessage,
} from './club';
import { sendGameNotification } from './notifications';
import type {
  ClubDonationRequest,
  ClubMember,
  ClubRequestBoardRoot,
  ClubRequestStatus,
} from '../types';

export const DONATION_DAILY_CAP = 12;
export const RECEIVED_DAILY_CAP = 8;

const MAX_BOARD_REQUESTS = 8;
const MIN_SIM_REQUESTS = 3;
const SIM_REQUEST_INTERVAL_MIN = 170;
const SIM_REQUEST_INTERVAL_MAX = 320;
const SIM_FILL_INTERVAL_MIN = 110;
const SIM_FILL_INTERVAL_MAX = 230;
const REQUEST_LIFETIME_S = 36 * 60 * 60;

const REQUESTABLE_ITEMS = [
  'wheat', 'corn', 'carrot', 'tomato', 'pumpkin', 'strawberry',
  'egg', 'milk', 'feed', 'bread', 'flour', 'cookie', 'apple',
  'bluefish', 'worm', 'fertilizer', 'plank', 'nail', 'screw',
  'panel', 'bolt', 'rope', 'stake', 'mallet',
];

function wallSeconds(): number {
  return Date.now() / 1000;
}

function dayKey(): number {
  return state.day;
}

function nextIn(min: number, max: number): number {
  return wallSeconds() + min + Math.random() * (max - min);
}

function emptyBoard(): ClubRequestBoardRoot {
  return {
    requests: [],
    playerRequestId: null,
    donatedToday: 0,
    receivedToday: 0,
    lastGiftDay: dayKey(),
    nextSimRequestAt: nextIn(20, 45),
    nextSimFillAt: nextIn(SIM_FILL_INTERVAL_MIN, SIM_FILL_INTERVAL_MAX),
  };
}

export function initRequestBoard(): void {
  initClub();
  const club = state.club!;
  if (!club.requestBoard) {
    club.requestBoard = emptyBoard();
  }
  const b = club.requestBoard;
  b.requests = Array.isArray(b.requests) ? b.requests : [];
  b.playerRequestId = b.playerRequestId ?? null;
  b.donatedToday = Number.isFinite(b.donatedToday) ? b.donatedToday : 0;
  b.receivedToday = Number.isFinite(b.receivedToday) ? b.receivedToday : 0;
  b.lastGiftDay = Number.isFinite(b.lastGiftDay) ? b.lastGiftDay : dayKey();
  b.nextSimRequestAt = Number.isFinite(b.nextSimRequestAt) ? b.nextSimRequestAt : nextIn(20, 45);
  b.nextSimFillAt = Number.isFinite(b.nextSimFillAt) ? b.nextSimFillAt : nextIn(SIM_FILL_INTERVAL_MIN, SIM_FILL_INTERVAL_MAX);
  resetDailyCapsIfNeeded();
  trimBoard();
  if (club.unlocked && openSimRequests().length < MIN_SIM_REQUESTS) {
    while (openSimRequests().length < MIN_SIM_REQUESTS && b.requests.length < MAX_BOARD_REQUESTS) {
      b.requests.push(makeSimRequest());
    }
  }
}

export function tickRequestBoard(): void {
  const club = state.club;
  if (!club?.unlocked) return;
  initRequestBoard();
  expireOldRequests();
  maybeSpawnSimRequest();
  maybeFillPlayerRequest();
  trimBoard();
}

function board(): ClubRequestBoardRoot {
  initRequestBoard();
  return state.club!.requestBoard!;
}

function resetDailyCapsIfNeeded(): void {
  const b = state.club!.requestBoard!;
  const today = dayKey();
  if (b.lastGiftDay === today) return;
  b.lastGiftDay = today;
  b.donatedToday = 0;
  b.receivedToday = 0;
}

function openSimRequests(): ClubDonationRequest[] {
  return state.club!.requestBoard!.requests.filter(r => !r.isPlayerRequest && r.status === 'open');
}

function trimBoard(): void {
  const b = state.club!.requestBoard!;
  b.requests.sort((a, z) => {
    const rank = (r: ClubDonationRequest): number => {
      if (r.isPlayerRequest && r.status === 'filled') return 0;
      if (r.isPlayerRequest && r.status === 'open') return 1;
      if (!r.isPlayerRequest && r.status === 'open') return 2;
      if (r.status === 'filled') return 3;
      return 4;
    };
    const diff = rank(a) - rank(z);
    return diff !== 0 ? diff : z.createdAt - a.createdAt;
  });
  if (b.requests.length > MAX_BOARD_REQUESTS) {
    const keep = b.requests.slice(0, MAX_BOARD_REQUESTS);
    b.requests = keep;
  }
  const pr = b.playerRequestId ? b.requests.find(r => r.id === b.playerRequestId) : null;
  if (!pr || pr.status === 'claimed' || pr.status === 'expired') {
    b.playerRequestId = null;
  }
}

function expireOldRequests(): void {
  const now = wallSeconds();
  for (const r of board().requests) {
    if (r.status !== 'open') continue;
    if (r.expiresAt <= now) {
      r.status = 'expired';
      if (r.id === board().playerRequestId) board().playerRequestId = null;
    }
  }
}

function maybeSpawnSimRequest(): void {
  const b = board();
  const now = wallSeconds();
  if (now < b.nextSimRequestAt) return;
  if (b.requests.filter(r => r.status === 'open').length < MAX_BOARD_REQUESTS) {
    b.requests.push(makeSimRequest());
  }
  b.nextSimRequestAt = nextIn(SIM_REQUEST_INTERVAL_MIN, SIM_REQUEST_INTERVAL_MAX);
}

function maybeFillPlayerRequest(): void {
  const b = board();
  const now = wallSeconds();
  if (now < b.nextSimFillAt) return;
  b.nextSimFillAt = nextIn(SIM_FILL_INTERVAL_MIN, SIM_FILL_INTERVAL_MAX);
  const req = activePlayerRequest();
  if (!req || req.status !== 'open') return;
  const give = Math.min(req.qtyRequested - req.qtyFilled, 1 + randi(2));
  if (give <= 0) return;
  req.qtyFilled += give;
  const member = choice(state.club!.members);
  if (req.qtyFilled >= req.qtyRequested) {
    req.qtyFilled = req.qtyRequested;
    req.status = 'filled';
    toast(`🎁 ${member.name} filled your ${itemName(req.itemKey)} request!`, 'gold');
    postClubBoardMessage(`${member.name} filled a request for ${req.qtyRequested}x ${itemName(req.itemKey)}.`, member.emoji);
    sendGameNotification('Club gift ready', `${member.name} filled your ${itemName(req.itemKey)} request.`);
    track('club_request_filled', { item: req.itemKey, qty: req.qtyRequested });
  }
}

function makeSimRequest(): ClubDonationRequest {
  const member = choice(state.club!.members);
  const itemKey = pickRequestItem();
  const qtyRequested = requestQty(itemKey, false);
  return makeRequest(member, itemKey, qtyRequested, false);
}

function makeRequest(
  member: Pick<ClubMember, 'id' | 'name' | 'emoji'>,
  itemKey: string,
  qtyRequested: number,
  isPlayerRequest: boolean,
): ClubDonationRequest {
  const now = wallSeconds();
  return {
    id: `club_req_${now.toFixed(0)}_${randi(100000)}`,
    requesterId: isPlayerRequest ? 'player' : member.id,
    requesterName: isPlayerRequest ? (state.farmName || 'You') : member.name,
    emoji: isPlayerRequest ? '🌻' : member.emoji,
    itemKey,
    qtyRequested,
    qtyFilled: 0,
    status: 'open',
    isPlayerRequest,
    createdAt: now,
    expiresAt: now + REQUEST_LIFETIME_S,
  };
}

function pickRequestItem(): string {
  const eligible = REQUESTABLE_ITEMS.filter(k => {
    const item = ITEMS[k];
    if (!item) return false;
    if (item.level > Math.max(1, state.level)) return false;
    return item.sell <= 90 || ['plank', 'nail', 'screw', 'panel', 'bolt', 'rope'].includes(k);
  });
  return choice(eligible.length > 0 ? eligible : ['wheat']);
}

function requestQty(itemKey: string, player: boolean): number {
  const sell = Math.max(1, ITEMS[itemKey]?.sell ?? 10);
  const cap = player ? remainingReceiveToday() : 5;
  const base = sell <= 10 ? 5 : sell <= 30 ? 3 : 1;
  return Math.max(1, Math.min(cap, base + randi(2)));
}

export function requestableItems(): string[] {
  initRequestBoard();
  return REQUESTABLE_ITEMS.filter(k => {
    const item = ITEMS[k];
    return !!item && item.level <= state.level;
  });
}

export function requestBoardRequests(): ClubDonationRequest[] {
  initRequestBoard();
  expireOldRequests();
  trimBoard();
  return board().requests.slice();
}

export function activePlayerRequest(): ClubDonationRequest | null {
  const b = board();
  if (!b.playerRequestId) return null;
  return b.requests.find(r => r.id === b.playerRequestId) ?? null;
}

export function remainingDonationsToday(): number {
  initRequestBoard();
  return Math.max(0, DONATION_DAILY_CAP - board().donatedToday);
}

export function remainingReceiveToday(): number {
  initRequestBoard();
  return Math.max(0, RECEIVED_DAILY_CAP - board().receivedToday);
}

export function createPlayerRequest(itemKey: string, qty?: number): boolean {
  initRequestBoard();
  const club = state.club!;
  if (!club.unlocked) return false;
  const b = board();
  if (activePlayerRequest()) {
    toast('You already have a request on the board.', 'red');
    sfx.error();
    return false;
  }
  if (!requestableItems().includes(itemKey)) {
    toast('That item cannot be requested yet.', 'red');
    sfx.error();
    return false;
  }
  const maxQty = remainingReceiveToday();
  if (maxQty <= 0) {
    toast('Daily receive cap reached. Check the board tomorrow.', 'red');
    sfx.error();
    return false;
  }
  const finalQty = Math.max(1, Math.min(maxQty, qty ?? requestQty(itemKey, true)));
  const req = makeRequest({ id: 'player', name: state.farmName || 'You', emoji: '🌻' }, itemKey, finalQty, true);
  b.requests.unshift(req);
  b.playerRequestId = req.id;
  b.nextSimFillAt = nextIn(35, 85);
  toast(`📌 Requested ${finalQty}x ${itemName(itemKey)} from the Club.`, 'gold');
  postClubBoardMessage(`${state.farmName || 'The farm'} posted a request for ${finalQty}x ${itemName(itemKey)}.`, '📌', false);
  track('club_request_created', { item: itemKey, qty: finalQty });
  return true;
}

export function donateToRequest(requestId: string, qty = 1): boolean {
  initRequestBoard();
  const req = board().requests.find(r => r.id === requestId);
  if (!req || req.status !== 'open' || req.isPlayerRequest) return false;
  const remain = req.qtyRequested - req.qtyFilled;
  const giftRemain = remainingDonationsToday();
  const give = Math.max(0, Math.min(qty, remain, giftRemain, state.inv[req.itemKey] ?? 0));
  if (give <= 0) {
    toast(giftRemain <= 0 ? 'Daily donation cap reached.' : `Need ${itemName(req.itemKey)} to donate.`, 'red');
    sfx.error();
    return false;
  }
  if (!removeItem(req.itemKey, give)) return false;
  req.qtyFilled += give;
  board().donatedToday += give;
  addXP(4 * give);
  addClubProgress('club_donation', give);
  sfx.produce();
  toast(`🤝 Donated ${give}x ${itemName(req.itemKey)} to ${req.requesterName}. +${4 * give}XP`, 'gold');
  if (req.qtyFilled >= req.qtyRequested) {
    req.qtyFilled = req.qtyRequested;
    req.status = 'filled';
    req.claimedAt = wallSeconds();
    postClubBoardMessage(`${req.requesterName}'s ${itemName(req.itemKey)} request was filled.`, req.emoji);
  }
  track('club_request_donated', { item: req.itemKey, qty: give, filled: req.status === 'filled' });
  return true;
}

export function claimPlayerRequest(): boolean {
  initRequestBoard();
  const req = activePlayerRequest();
  if (!req || req.status !== 'filled') return false;
  const cap = remainingReceiveToday();
  if (cap < req.qtyFilled) {
    toast('Daily receive cap reached. Claim this tomorrow.', 'red');
    sfx.error();
    return false;
  }
  addItem(req.itemKey, req.qtyFilled);
  board().receivedToday += req.qtyFilled;
  req.status = 'claimed';
  req.claimedAt = wallSeconds();
  board().playerRequestId = null;
  sfx.bell();
  toast(`🎁 Claimed ${req.qtyFilled}x ${itemName(req.itemKey)} from the Club!`, 'gold');
  track('club_request_claimed', { item: req.itemKey, qty: req.qtyFilled });
  return true;
}

export function cancelPlayerRequest(): boolean {
  const req = activePlayerRequest();
  if (!req || req.status !== 'open') return false;
  req.status = 'expired';
  board().playerRequestId = null;
  toast('Club request cancelled.');
  track('club_request_cancelled', { item: req.itemKey });
  return true;
}

export function requestBoardHasAttention(): boolean {
  initRequestBoard();
  const player = activePlayerRequest();
  if (player?.status === 'filled') return true;
  if (remainingDonationsToday() <= 0) return false;
  return board().requests.some(r =>
    !r.isPlayerRequest &&
    r.status === 'open' &&
    r.qtyFilled < r.qtyRequested &&
    (state.inv[r.itemKey] ?? 0) > 0,
  );
}

export function requestBoardSummary(): {
  donatedToday: number;
  donationCap: number;
  receivedToday: number;
  receiveCap: number;
  openCount: number;
  theme: string;
} {
  initRequestBoard();
  return {
    donatedToday: board().donatedToday,
    donationCap: DONATION_DAILY_CAP,
    receivedToday: board().receivedToday,
    receiveCap: RECEIVED_DAILY_CAP,
    openCount: board().requests.filter(r => r.status === 'open').length,
    theme: clubTheme().name,
  };
}

export function itemName(itemKey: string): string {
  return ITEMS[itemKey]?.name ?? itemKey;
}

export function statusLabel(status: ClubRequestStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'filled': return 'Filled';
    case 'claimed': return 'Claimed';
    case 'expired': return 'Expired';
  }
}
