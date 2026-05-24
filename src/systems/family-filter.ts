// =============================================================
//  FAMILY FILTER - soft text filtering for player-visible social UI.
//
//  The game currently avoids open chat by using quick replies, but
//  player-entered names and future social strings still need a small
//  guard when Family-Friendly Mode is enabled.
// =============================================================

import { isFamilyFriendly } from './settings';

const BLOCKED_WORDS = [
  'ass',
  'bastard',
  'bitch',
  'crap',
  'damn',
  'dick',
  'fuck',
  'hell',
  'piss',
  'shit',
  'slut',
  'whore',
];

const SOFT_REPLACEMENTS: Record<string, string> = {
  ass: 'silly',
  bastard: 'rascal',
  bitch: 'grump',
  crap: 'oops',
  damn: 'darn',
  dick: 'goof',
  fuck: 'fudge',
  hell: 'heck',
  piss: 'peeve',
  shit: 'stuff',
  slut: 'neighbor',
  whore: 'neighbor',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsBlockedWord(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_WORDS.some(w => new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i').test(lower));
}

export function filterFamilyText(value: string): string {
  if (!isFamilyFriendly()) return value;
  let out = value;
  for (const word of BLOCKED_WORDS) {
    const replacement = SOFT_REPLACEMENTS[word] ?? 'friend';
    out = out.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'), replacement);
  }
  return out;
}

export function familySafeName(value: string, fallback = 'Neighbor'): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const filtered = filterFamilyText(trimmed);
  return containsBlockedWord(filtered) ? fallback : filtered;
}
