// =============================================================
//  FEATURE VISIBILITY — single source of truth for whether a
//  More-menu / toolbar button should be visible, teaser-visible
//  (locked but anticipated), or hidden.
//
//  Every system in the game registers a FeatureGate here. The
//  More menu calls applyFeatureVisibility() each time it opens.
//
//  Visibility model:
//    'hidden'     → display: none. Player at Lv 1 sees ~8 buttons.
//    'teaser'     → visible but dimmed and showing "Unlocks at Lv X".
//                   Builds anticipation without inviting a tap.
//    'unlocked'   → normal interactive button.
//    'attention'  → unlocked + a pip indicator (something to claim).
//
//  A gate is shown as teaser when `state.level >= unlockLevel - 2`,
//  i.e. up to 2 levels before it unlocks. We deliberately do NOT
//  surface late-game systems early — Prestige (L25) stays hidden
//  until L20+, not at L1.
// =============================================================

import { state } from '../state';
import { BUILDINGS } from './../data/buildings';
import { localDayIndex } from './daily';

export type FeatureCategory =
  | 'core'        // always visible (shop/build/help/save)
  | 'daily'       // daily rituals (wheel/pass/streak)
  | 'market'      // selling/buying/customers
  | 'delivery'    // boat/train/balloon/cart
  | 'social'      // village/friendship/club/leaderboard
  | 'exploration' // expansion/plots/expeditions/landmarks
  | 'progression' // grid/spec/codex/museum
  | 'advanced';   // prestige/snapshot

export type GateStatus = 'hidden' | 'teaser' | 'unlocked' | 'attention';

export interface FeatureGate {
  id: string;                    // unique slug
  label: string;                 // short display label
  icon: string;                  // emoji icon
  category: FeatureCategory;
  unlockLevel: number;           // teaser starts at unlockLevel - revealAt
  revealAt?: number;             // overrides default 2 (e.g. Prestige reveals at 5)
  openButtonId: string;          // DOM id of the hidden trigger button
  /** Sheet button selector — `.sheet-btn[data-more="<openButtonId>"]`. */
  sheetSelector?: string;
  /** True if the system is in fact unlocked / interactive. Default: level >= unlockLevel. */
  isUnlocked?: () => boolean;
  /** True if there's something to claim or attend to (drives the attention pip). */
  hasAttention?: () => boolean;
  /** True if it's worth seeing as a teaser even if isUnlocked is false. */
  isRelevantSoon?: () => boolean;
}

/** The full registry. Order here is also the rendering order in the More sheet. */
export const FEATURE_GATES: FeatureGate[] = [
  // ---- Core daily rituals (always visible) ----
  { id: 'daily', label: 'Daily', icon: '🌅', category: 'daily',
    unlockLevel: 1, openButtonId: 'open-daily',
    hasAttention: () => {
      const d = state.daily;
      if (!d) return false;
      if (d.pendingReturnGift && d.pendingReturnGift.coins > 0 && !d.returnGiftClaimed) return true;
      if (d.timedClaim && d.timedClaim.readyAt > 0 && !d.timedClaim.claimed) return true;
      for (const c of d.challenges) if (c.complete && !c.claimed) return true;
      return false;
    },
  },
  { id: 'wheel', label: 'Wheel', icon: '🎡', category: 'daily',
    unlockLevel: 1, openButtonId: 'open-wheel',
    hasAttention: () => {
      const w = state.wheel;
      if (!w) return false;
      return w.lastSpinDay !== localDayIndex();
    },
  },
  { id: 'pass', label: 'Pass', icon: '🎖️', category: 'daily',
    unlockLevel: 2, revealAt: 1, openButtonId: 'open-pass',
    hasAttention: () => {
      const p = state.pass;
      if (!p) return false;
      // Has unclaimed tier(s)?
      let highest = 0;
      // Approximate using points / POINTS_PER_TIER (90); checking 16 tiers is enough.
      for (let i = 16; i >= 1; i--) {
        if (p.points >= 90 * i) { highest = i; break; }
      }
      for (let i = 1; i <= highest; i++) {
        if (!p.claimed.includes(i)) return true;
      }
      return false;
    },
  },

  // ---- Progression-tied unlocks ----
  { id: 'grid', label: 'Grid', icon: '🌦️', category: 'progression',
    unlockLevel: 5, openButtonId: 'open-weather-grid',
    isUnlocked: () => !!state.weatherGrid?.unlocked || state.level >= 5,
    hasAttention: () => {
      const g = state.weatherGrid;
      if (!g || !g.unlocked) return false;
      // Have at least one slotted card AND charges available AND no active cast.
      const slotted = g.slots.filter(Boolean).length;
      if (slotted === 0) return false;
      if (g.charges <= 0) return false;
      const now = Date.now() / 1000;
      const active = g.activations.some(a => a.until > now);
      return !active;
    },
  },
  { id: 'spec', label: 'Path', icon: '🌟', category: 'progression',
    unlockLevel: 5, openButtonId: 'open-spec',
    isUnlocked: () => state.level >= 5,
    hasAttention: () => state.level >= 5 && !state.specialization?.primary,
  },
  { id: 'codex', label: 'Codex', icon: '📖', category: 'progression',
    unlockLevel: 3, revealAt: 1, openButtonId: 'open-collection' },
  { id: 'museum', label: 'Museum', icon: '🏛️', category: 'progression',
    unlockLevel: 6, openButtonId: 'open-museum' },

  // ---- Market layer ----
  { id: 'market', label: 'Market', icon: '💱', category: 'market',
    unlockLevel: 4, openButtonId: 'open-market',
    hasAttention: () => {
      const g = state.gazette;
      if (!g || !g.hotItem) return false;
      return (state.inv[g.hotItem.itemKey] ?? 0) > 0;
    },
  },
  { id: 'stall', label: 'Stall', icon: '🛒', category: 'market',
    unlockLevel: 4, openButtonId: 'open-stall',
    isUnlocked: () => !!state.marketStall?.unlocked || state.level >= 4,
    hasAttention: () => !!state.marketStall?.slots.some(s => s.status === 'sold'),
  },
  { id: 'gazette', label: 'Gazette', icon: '📰', category: 'market',
    unlockLevel: 3, revealAt: 1, openButtonId: 'open-gazette',
    hasAttention: () => {
      const g = state.gazette;
      if (!g) return false;
      if (g.lastReadDay !== state.day) return true;
      // Open help requests the player can fulfill?
      for (const hr of g.helpRequests) {
        if (!hr.done && (state.inv[hr.itemKey] ?? 0) >= hr.qty) return true;
      }
      return false;
    },
  },
  { id: 'recipes', label: 'Recipes', icon: '📖', category: 'market',
    unlockLevel: 2, openButtonId: 'open-recipe-book',
    isUnlocked: () => state.buildings.some(b => BUILDINGS[b.type]?.kind === 'production'),
  },

  // ---- Social ----
  { id: 'friendship', label: 'Friends', icon: '🤝', category: 'social',
    unlockLevel: 3, revealAt: 1, openButtonId: 'open-friendship',
    hasAttention: () => {
      const f = state.friendship;
      if (!f) return false;
      // Any neighbor at level >=1 not gifted today?
      const today = state.day;
      for (const id in f.byNeighbor) {
        const e = f.byNeighbor[id]!;
        if (e.level >= 1 && e.lastGiftDay !== today) return true;
      }
      return false;
    },
  },
  { id: 'village', label: 'Village', icon: '🏘️', category: 'social',
    unlockLevel: 4, openButtonId: 'open-village',
    hasAttention: () => {
      const v = state.village;
      if (!v) return false;
      return v.lastVisitDay !== state.day;
    },
  },
  { id: 'club', label: 'Club', icon: '🏆', category: 'social',
    unlockLevel: 15, revealAt: 3, openButtonId: 'open-club',
    isUnlocked: () => !!state.club?.unlocked || state.level >= 15 },
  { id: 'ranks', label: 'Ranks', icon: '🏅', category: 'social',
    unlockLevel: 5, openButtonId: 'open-leaderboard' },

  // ---- Delivery ----
  { id: 'boat', label: 'Boat', icon: '⛵', category: 'delivery',
    unlockLevel: 9, revealAt: 2, openButtonId: 'open-boat',
    isUnlocked: () => !!state.boat?.unlocked || state.level >= 9,
    hasAttention: () => state.boat?.state === 'docked',
  },
  { id: 'train', label: 'Train', icon: '🚂', category: 'delivery',
    unlockLevel: 13, revealAt: 3, openButtonId: 'open-train',
    isUnlocked: () => !!state.train?.unlocked || state.level >= 13,
    hasAttention: () => state.train?.status === 'returned',
  },
  { id: 'balloon', label: 'Balloon', icon: '🎈', category: 'delivery',
    unlockLevel: 10, revealAt: 2, openButtonId: 'open-balloon',
    isUnlocked: () => state.level >= 10,
    hasAttention: () => !!state.balloon?.active,
  },
  { id: 'cart', label: 'Cart', icon: '🎪', category: 'delivery',
    unlockLevel: 6, revealAt: 2, openButtonId: 'open-cart',
    isUnlocked: () => !!state.festivalCart?.unlocked || state.level >= 6,
    hasAttention: () => {
      const c = state.festivalCart;
      if (!c || !c.unlocked) return false;
      // Has at least one request the player can deliver from inventory?
      for (const r of c.requests) {
        if ((state.inv[r.itemKey] ?? 0) >= 1) return true;
      }
      return false;
    },
  },
  { id: 'events', label: 'Events', icon: '🎉', category: 'delivery',
    unlockLevel: 8, revealAt: 2, openButtonId: 'open-events',
    hasAttention: () => {
      const e = state.liveEvent;
      if (!e || !e.activeId) return false;
      // Unclaimed tier?
      return e.points > 0; // approximate; full check would need LIVE_EVENTS def
    },
  },

  // ---- Exploration ----
  { id: 'plots', label: 'Plots', icon: '🌄', category: 'exploration',
    unlockLevel: 7, revealAt: 2, openButtonId: 'open-expansion',
    isUnlocked: () => state.level >= 7,
    hasAttention: () => {
      const ex = state.expansion;
      if (!ex) return false;
      for (const id in ex.plots) {
        const p = ex.plots[id]!;
        if (p.status === 'unlockable') return true;
      }
      return false;
    },
  },
  { id: 'landmark', label: 'Builds', icon: '🏗️', category: 'exploration',
    unlockLevel: 7, revealAt: 2, openButtonId: 'open-landmark',
    isUnlocked: () => state.level >= 7,
  },
  { id: 'expeditions', label: 'Maps', icon: '🗺️', category: 'exploration',
    unlockLevel: 16, revealAt: 3, openButtonId: 'open-expeditions',
    isUnlocked: () => !!state.expeditions?.unlocked || state.level >= 20,
    hasAttention: () => {
      const e = state.expeditions;
      if (!e || !e.unlocked) return false;
      return e.energy >= e.energyMax;
    },
  },

  // ---- Always-on auxiliary (kept on the sheet, not gated) ----
  { id: 'inventory', label: 'Barn', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'open-inventory' },
  { id: 'decor', label: 'Decor', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'open-decor' },
  { id: 'awards', label: 'Awards', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'open-achievements' },
  { id: 'news', label: 'News', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'open-news' },
  { id: 'save', label: 'Save', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'save-btn' },
  { id: 'help', label: 'Help', icon: '', category: 'core',
    unlockLevel: 1, openButtonId: 'help-btn' },

  // ---- Late-game ----
  { id: 'prestige', label: 'Prestige', icon: '✨', category: 'advanced',
    unlockLevel: 25, revealAt: 5, openButtonId: 'open-prestige',
    isUnlocked: () => state.level >= 25,
  },
  { id: 'share', label: 'Share', icon: '🖼️', category: 'advanced',
    unlockLevel: 8, openButtonId: 'open-snapshot' },

  // ---- Hay Day-grammar additions (v7) ----
  { id: 'mailbox', label: 'Mail', icon: '📬', category: 'daily',
    unlockLevel: 1, openButtonId: 'open-mailbox',
    hasAttention: () => {
      const m = state.mailbox;
      if (!m) return false;
      return m.letters.some(l => !l.read);
    },
  },
  { id: 'surprise', label: 'Surprise', icon: '📦', category: 'daily',
    unlockLevel: 2, revealAt: 1, openButtonId: 'open-surprise',
    hasAttention: () => state.surpriseBox?.pending === true,
  },
  { id: 'piggy', label: 'Piggy', icon: '🐷', category: 'daily',
    unlockLevel: 3, revealAt: 1, openButtonId: 'open-piggy',
    hasAttention: () => {
      const pb = state.piggyBank;
      if (!pb) return false;
      return pb.gems > 0 && (pb.gems / Math.max(1, pb.cap)) >= 0.3 && !pb.broken;
    },
  },
  { id: 'sanctuary', label: 'Sanctuary', icon: '📖', category: 'progression',
    unlockLevel: 6, revealAt: 2, openButtonId: 'open-sanctuary',
    isUnlocked: () => !!state.sanctuary?.unlocked || state.level >= 6,
    hasAttention: () => !!state.sanctuary?.active,
  },
  { id: 'settings', label: 'Settings', icon: '⚙️', category: 'core',
    unlockLevel: 1, openButtonId: 'open-settings' },
  { id: 'edit-mode', label: 'Edit', icon: '✂️', category: 'core',
    unlockLevel: 2, openButtonId: 'toggle-edit-mode' },
];

/** Map by openButtonId for fast lookup. */
const GATES_BY_BTN: Record<string, FeatureGate> = (() => {
  const m: Record<string, FeatureGate> = {};
  for (const g of FEATURE_GATES) m[g.openButtonId] = g;
  return m;
})();

export function gateForButton(buttonId: string): FeatureGate | null {
  return GATES_BY_BTN[buttonId] ?? null;
}

export function gateStatus(g: FeatureGate): GateStatus {
  const unlocked = g.isUnlocked ? g.isUnlocked() : state.level >= g.unlockLevel;
  if (unlocked) {
    if (g.hasAttention && g.hasAttention()) return 'attention';
    return 'unlocked';
  }
  const reveal = g.revealAt ?? 2;
  const showTeaser = state.level >= g.unlockLevel - reveal
    || (g.isRelevantSoon ? g.isRelevantSoon() : false);
  if (showTeaser) return 'teaser';
  return 'hidden';
}

/** Apply visibility classes to a single button element. */
function applyToButton(btn: HTMLElement, s: GateStatus, unlockLevel: number): void {
  btn.classList.remove('gate-hidden', 'gate-teaser', 'gate-attention');
  btn.removeAttribute('data-lock-msg');
  if (s === 'hidden') {
    btn.classList.add('gate-hidden');
  } else if (s === 'teaser') {
    btn.classList.add('gate-teaser');
    btn.setAttribute('data-lock-msg', `Lv ${unlockLevel}`);
  } else if (s === 'attention') {
    btn.classList.add('gate-attention');
  }
}

/** Apply visibility classes to More-sheet AND toolbar buttons. Safe to call repeatedly. */
export function applyFeatureVisibility(): void {
  for (const g of FEATURE_GATES) {
    const s = gateStatus(g);
    // More-sheet button
    const sheetBtn = document.querySelector<HTMLElement>(
      `.sheet-btn[data-more="${g.openButtonId}"]`,
    );
    if (sheetBtn) applyToButton(sheetBtn, s, g.unlockLevel);
    // Visible toolbar button by id (desktop) — only if the system has a
    // matching toolbar button. Core systems (shop/build/inventory/etc.)
    // are always visible and don't need gating; the registry uses
    // category 'core' to opt them in regardless.
    if (g.category !== 'core') {
      const toolbarBtn = document.getElementById(g.openButtonId);
      if (toolbarBtn && toolbarBtn.classList.contains('btn')) {
        applyToButton(toolbarBtn, s, g.unlockLevel);
      }
    }
  }
}

/** Show a friendly explanation toast when a teaser/locked button is tapped. */
export function teaserMessageFor(buttonId: string): string | null {
  const g = gateForButton(buttonId);
  if (!g) return null;
  const s = gateStatus(g);
  if (s !== 'teaser') return null;
  const need = g.unlockLevel - state.level;
  return need > 0
    ? `${g.icon} ${g.label} unlocks at Level ${g.unlockLevel} (${need} more to go)`
    : `${g.icon} ${g.label} unlocks soon — keep playing!`;
}

/** Intercept clicks on teaser-state toolbar buttons before they reach the
 *  panel's open handler. Returns true if the click was handled (caller
 *  should stop). Wired via document-level capture listener at startup. */
export function bindFeatureVisibilityIntercept(
  notify: (msg: string) => void,
  errSound: () => void,
): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('.btn, .sheet-btn') as HTMLElement | null;
    if (!btn) return;
    // Sheet buttons are handled inside mobile-shell already.
    if (btn.classList.contains('sheet-btn')) return;
    if (!btn.classList.contains('gate-teaser')) return;
    const id = btn.id;
    const msg = teaserMessageFor(id);
    if (!msg) return;
    e.stopPropagation();
    e.preventDefault();
    notify(msg);
    errSound();
  }, true);
}
