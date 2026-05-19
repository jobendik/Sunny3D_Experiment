// =============================================================
//  EVENT CHOICES — narrative + risk events with A/B tradeoffs.
//  Triggered as variants of the existing event pipeline.
// =============================================================

import { state } from '../state';
import { ITEMS } from '../data/items';
import { addItem, removeItem, hasItems } from './inventory';
import { addXP } from './xp';
import { track } from './telemetry';
import { toast } from '../ui/toasts';
import { sfx } from '../audio/sfx';
import { updateHUD } from '../ui/hud';
import { rand, randi, choice as rchoice } from '../utils';

export interface EventChoice {
  label: string;
  desc: string;
  apply: () => void;
}

export interface ChoiceEvent {
  id: string;
  title: string;
  story: string;
  icon: string;
  choices: EventChoice[];
}

// Build a fresh choice event from a small catalog. Each call returns
// a self-contained event whose `apply` closures know what to do.
export function makeChoiceEvent(): ChoiceEvent {
  const lvl = state.level;
  const catalog: Array<() => ChoiceEvent> = [
    // Wandering chef — instant gold or delayed XP
    () => ({
      id: 'wandering_chef', title: 'Wandering Chef', icon: '👨‍🍳',
      story: 'A traveling chef wants 3 eggs and 1 milk for a feast. He offers two payment options.',
      choices: [
        {
          label: 'Take 150 coins now', desc: '+150 coins (if you have ingredients)',
          apply: () => {
            if (!hasItems({ egg: 3, milk: 1 })) { toast('Need 3 eggs + 1 milk', 'error'); return; }
            removeItem('egg', 3); removeItem('milk', 1);
            state.coins += 150; state.stats.earned += 150;
            sfx.coin(); toast('+150 coins', 'gold');
          },
        },
        {
          label: 'Take 280 coins next day', desc: 'Delayed but bigger payout',
          apply: () => {
            if (!hasItems({ egg: 3, milk: 1 })) { toast('Need 3 eggs + 1 milk', 'error'); return; }
            removeItem('egg', 3); removeItem('milk', 1);
            // store IOU
            state.deferredPayouts = state.deferredPayouts ?? [];
            state.deferredPayouts.push({ at: state.day + 1, coins: 280, xp: 8 });
            toast('Deal sealed. Returns tomorrow!', 'xp');
          },
        },
      ],
    }),
    // Mysterious merchant — risk card
    () => ({
      id: 'mystery_box', title: 'Mystery Box', icon: '🎁',
      story: 'A vendor offers a mystery box. It could be amazing — or junk.',
      choices: [
        {
          label: `Buy for ${30 + lvl * 6} coins`,
          desc: 'Random reward: junk, decent, or jackpot.',
          apply: () => {
            const cost = 30 + lvl * 6;
            if (state.coins < cost) { toast('Not enough coins', 'error'); sfx.cantAfford(); return; }
            state.coins -= cost;
            const r = rand(1);
            if (r < 0.20) {
              toast('Junk. Better luck next time!', '');
            } else if (r < 0.85) {
              const coins = 30 + randi(60) + lvl * 5;
              state.coins += coins; state.stats.earned += coins;
              toast(`Decent! +${coins} coins`, 'gold'); sfx.coin();
            } else {
              const coins = 200 + randi(400) + lvl * 30;
              state.coins += coins; state.stats.earned += coins;
              toast(`JACKPOT! +${coins} coins`, 'gold'); sfx.coin();
            }
          },
        },
        { label: 'Walk away', desc: 'Nothing ventured.', apply: () => toast('Wisely passed', '') },
      ],
    }),
    // Drought aid
    () => ({
      id: 'drought_aid', title: 'Drought Relief Fund', icon: '🏜️',
      story: 'A nearby farm is struggling. Donate or invest?',
      choices: [
        {
          label: 'Donate 200 coins', desc: '+30 XP & community goodwill (weekly +25 pts)',
          apply: () => {
            if (state.coins < 200) { toast('Not enough coins', 'error'); return; }
            state.coins -= 200; addXP(30);
            state.weekly!.communityProgress += 200;
            toast('Generous! +30 XP', 'gold');
          },
        },
        {
          label: 'Invest 500 in their orchard', desc: 'Larger long-term return',
          apply: () => {
            if (state.coins < 500) { toast('Not enough coins', 'error'); return; }
            state.coins -= 500;
            state.deferredPayouts = state.deferredPayouts ?? [];
            state.deferredPayouts.push({ at: state.day + 2, coins: 900, xp: 25 });
            toast('Invested! Returns in 2 days', 'xp');
          },
        },
      ],
    }),
    // Crop swap
    () => ({
      id: 'crop_swap', title: 'Crop Swap Festival', icon: '🌽',
      story: 'A festival lets you swap 5 of any harvested item for 3 of a rarer one.',
      choices: [
        {
          label: 'Trade 5 wheat → 3 corn', desc: 'Straightforward swap',
          apply: () => {
            if ((state.inv.wheat ?? 0) < 5) { toast('Need 5 wheat', 'error'); return; }
            removeItem('wheat', 5); addItem('corn', 3);
            sfx.coin(); toast('+3 corn', 'xp');
          },
        },
        {
          label: 'Trade 5 corn → 3 tomato', desc: 'Higher tier',
          apply: () => {
            if ((state.inv.corn ?? 0) < 5) { toast('Need 5 corn', 'error'); return; }
            removeItem('corn', 5); addItem('tomato', 3);
            sfx.coin(); toast('+3 tomato', 'xp');
          },
        },
      ],
    }),
    // Risk card — big reward, possible loss
    () => ({
      id: 'risky_deal', title: 'Speculator\'s Deal', icon: '💎',
      story: 'A speculator offers a high-stakes contract. Big reward — or a heavy fine.',
      choices: [
        {
          label: 'Accept (50/50)', desc: '+800 coins or −400 coins',
          apply: () => {
            const win = rand(1) >= 0.5;
            if (win) {
              state.coins += 800; state.stats.earned += 800;
              toast('Speculation paid off! +800', 'gold'); sfx.coin();
            } else {
              state.coins = Math.max(0, state.coins - 400);
              toast('It collapsed — lost 400', 'error'); sfx.error();
            }
          },
        },
        { label: 'Refuse', desc: 'Steady wins the race.', apply: () => toast('Played it safe', '') },
      ],
    }),
  ];
  return rchoice(catalog)();
}

// Process any deferred payouts each day rollover.
export function tickDeferredPayouts(): void {
  if (!state.deferredPayouts) return;
  const remaining: typeof state.deferredPayouts = [];
  for (const p of state.deferredPayouts) {
    if (state.day >= p.at) {
      state.coins += p.coins;
      state.stats.earned += p.coins;
      addXP(p.xp);
      toast(`Deferred payout: +${p.coins}💰 +${p.xp}XP`, 'gold');
      sfx.coin();
      updateHUD();
      track('deferred_payout', { coins: p.coins, xp: p.xp });
    } else remaining.push(p);
  }
  state.deferredPayouts = remaining;
}
