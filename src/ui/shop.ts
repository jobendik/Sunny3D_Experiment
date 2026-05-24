import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { ORCHARDS } from '../data/orchards';
import { sprites } from '../sprites';
import { sfx } from '../audio/sfx';
import { openModal, closeModal } from './modal';
import { toast } from './toasts';
import { updateHUD } from './hud';
import { setTool, updateSeedBtnLabel } from './tools';
import { addItem, removeItem } from '../systems/inventory';
import { questProgress } from '../systems/quests';
import { dailyChallengeProgress } from '../systems/daily';
import { addWeeklyPoints } from '../systems/weekly';
import { checkAchievements } from '../systems/achievements';
import { isEvent } from '../systems/events';
import { priceMultiplier } from '../systems/market';
import { specEffects } from '../systems/specializations';
import { activeEffects as weatherGridEffects } from '../systems/weather-grid';
import { collectionBonuses } from '../systems/collection';
import { perkValue } from '../systems/prestige';
import { track } from '../systems/telemetry';
import { comboHit } from '../systems/combo';
import {
  addPassPoints, passDaysLeft, isEliteUnlocked, isPlatinumUnlocked, PASS_TIERS,
  PASS_BUNDLES, passBundleStatus, claimPassBundle,
} from '../systems/season-pass';
import { spawnHUDBurst } from '../systems/flyers';
import { piggyOnCoinSpend } from '../systems/piggy-bank';
import { initDailyDeal, dailyDealAvailable, dailyDealDiscount, buyDailyDeal } from '../systems/daily-deal';
import { hasPendingBox, SURPRISE_NATURAL_RARITY_ODDS } from '../systems/surprise-box';
import {
  initMaggieOffers, initWeeklyShop, maggieVisitActive, maggieDaysRemaining,
  weeklyShopDaysRemaining, buyMaggieOffer, buyWeeklyShopOffer,
  markOfferSystemsSeen, MAGGIE_LEVEL,
} from '../systems/maggie-offers';

export function openShop(defaultTab?: string): void {
  openModal('🛒 Shop', [
    { key: 'seeds',    label: 'Seeds',    render: renderShopSeeds },
    { key: 'trees',    label: 'Trees',    render: renderShopTrees },
    { key: 'sell',     label: 'Sell',     render: renderShopSell },
    { key: 'feed',     label: 'Buy',      render: renderShopFeed },
    { key: 'supplies', label: 'Supplies', render: renderShopSupplies },
    { key: 'offers',   label: 'Offers',   render: renderShopOffers },
    { key: 'pass',     label: 'Pass',     render: renderShopPass },
  ], defaultTab ?? 'seeds');
}

/** Re-export for HUD's offer-pill — opens the shop with the Offers tab focused. */
export function openShopOffers(): void { openShop('offers'); }

function renderShopTrees(container: HTMLElement): void {
  container.innerHTML = `<p style="font-size:13px;color:#666;margin:0 0 8px 0">
    Plant fruit trees on soil tiles. They grow once and produce indefinitely!
  </p><div class="shop-grid"></div>`;
  const grid = container.querySelector<HTMLElement>('.shop-grid')!;
  for (const k of Object.keys(ORCHARDS)) {
    const def = ORCHARDS[k]!;
    const locked = state.level < def.level;
    const canAfford = state.coins >= def.seedCost;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.orchard[k]![3]!.toDataURL()}" style="height:60px;width:auto">
      <div class="name">${def.name}${locked ? ' 🔒' : ''}</div>
      <div style="font-size:11px;color:#666">+${def.yieldMin}-${def.yieldMax} ${ITEMS[def.fruit]!.name} every ${def.cycle}s</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${def.seedCost}</div>
      <button ${locked || !canAfford ? 'disabled' : ''}>${locked ? `Lv ${def.level}` : 'Plant'}</button>
    `;
    div.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      if (locked || !canAfford) return;
      state.placing = { tree: k };
      closeModal();
      toast(`Tap a soil tile to plant the ${def.name}`, 'xp');
      sfx.click();
    });
    grid.appendChild(div);
  }
}

function renderShopSeeds(container: HTMLElement): void {
  container.innerHTML = `<div class="shop-grid"></div>`;
  const grid = container.querySelector<HTMLElement>('.shop-grid')!;
  for (const k in CROPS) {
    const c = CROPS[k]!;
    const div = document.createElement('div');
    div.className = 'shop-item';
    const locked = state.level < c.level;
    div.innerHTML = `
      <img class="ico" src="${sprites.item[c.item]!.toDataURL()}">
      <div class="name">${ITEMS[c.item]!.name} Seed</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${c.seedCost}</div>
      <button>Select</button>
      ${locked ? `<div class="locked">🔒 Lv ${c.level}</div>` : ''}
    `;
    div.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      if (locked) { sfx.error(); return; }
      state.selectedSeed = k;
      state.selectedTool = 'seed';
      updateSeedBtnLabel();
      setTool('seed');
      toast(`Selected: ${ITEMS[c.item]!.name} seeds`);
      closeModal();
    });
    grid.appendChild(div);
  }
}

function renderShopSell(container: HTMLElement): void {
  const keys = Object.keys(state.inv);
  if (keys.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Your barn is empty. Plant crops and harvest!</div>';
    return;
  }
  container.innerHTML = `<div class="shop-grid"></div>`;
  const grid = container.querySelector<HTMLElement>('.shop-grid')!;
  for (const k of keys) {
    const it = ITEMS[k];
    if (!it) continue;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.item[k]!.toDataURL()}">
      <div class="name">${it.name}</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${it.sell}/ea</div>
      <button class="sell">Sell 1</button>
      <button class="sell">Sell all (${state.inv[k]})</button>
      <div class="qty">×${state.inv[k]}</div>
    `;
    const [b1, ball] = Array.from(div.querySelectorAll<HTMLButtonElement>('button'));
    b1!.addEventListener('click', () => sellItem(k, 1));
    ball!.addEventListener('click', () => sellItem(k, state.inv[k]!));
    grid.appendChild(div);
  }
}

export function sellItem(k: string, qty: number): void {
  if (!state.inv[k] || state.inv[k]! < qty) return;
  const it = ITEMS[k]!;
  removeItem(k, qty);
  let unitPrice = it.sell;
  // Market dynamics
  unitPrice = Math.floor(unitPrice * priceMultiplier(k));
  if (isEvent('market_rush')) unitPrice = Math.floor(unitPrice * 1.5);
  // Specialization + weather grid + collection
  const sp = specEffects();
  const eff = weatherGridEffects();
  const cb = collectionBonuses();
  let mult = 1 + (sp.produceValue && (k === 'bread' || k === 'cookie' || k === 'cheese' || k === 'butter' || k === 'cake' || k === 'juice' || k === 'jam' || k === 'cloth' || k === 'ribs' || k === 'pie') ? sp.produceValue : 0);
  mult *= 1 + (sp.fishingValue && (k === 'bluefish' || k === 'trout' || k === 'goldfish') ? sp.fishingValue : 0);
  mult *= 1 + eff.sellBonus;
  mult *= 1 + cb.sellMult;
  mult *= 1 + perkValue('sellBoost');
  unitPrice = Math.max(1, Math.floor(unitPrice * mult));
  // Combo applies to sell value too
  const combo = comboHit();
  const total = Math.floor(unitPrice * qty * combo.mult);
  state.coins += total;
  state.stats.sold += qty;
  state.stats.earned += total;
  sfx.coin();
  toast(`+${total}${isEvent('market_rush') ? ' (+50%!)' : ''}`, 'gold');
  spawnHUDBurst('coin', Math.min(8, 2 + Math.floor(total / 30)));
  updateHUD();
  renderShopSell(document.getElementById('modal-body')!);
  questProgress('sell', k, qty);
  questProgress('earn', null, total);
  dailyChallengeProgress('sell', k, qty);
  dailyChallengeProgress('earn', null, total);
  addWeeklyPoints(qty * 3, 'craft');
  addPassPoints(qty * 2);
  track('sell', { item: k, qty, total });
  checkAchievements();
}

function renderShopFeed(container: HTMLElement): void {
  container.innerHTML = `<div class="shop-grid"></div>`;
  const grid = container.querySelector<HTMLElement>('.shop-grid')!;
  const buyable = [{ item: 'feed', cost: 15, desc: 'Animal feed' }];
  for (const b of buyable) {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.item[b.item]!.toDataURL()}">
      <div class="name">${ITEMS[b.item]!.name}</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${b.cost}</div>
      <button>Buy 1</button>
      <button>Buy 5</button>
    `;
    const [b1, b5] = Array.from(div.querySelectorAll<HTMLButtonElement>('button'));
    b1!.addEventListener('click', () => buyShopItem(b.item, 1, b.cost));
    b5!.addEventListener('click', () => buyShopItem(b.item, 5, b.cost));
    grid.appendChild(div);
  }
}

function buyShopItem(key: string, qty: number, unit: number): void {
  const total = unit * qty;
  if (state.coins < total) { sfx.cantAfford(); toast('Not enough coins!', 'error'); return; }
  state.coins -= total;
  piggyOnCoinSpend(total);
  addItem(key, qty);
  sfx.coin();
  toast(`+${qty} ${ITEMS[key]!.name}`);
  updateHUD();
  renderShopFeed(document.getElementById('modal-body')!);
}

// =============================================================
//  OFFERS TAB — FV3-grammar: Daily Deal · Surprise Box ·
//  Piggy Bank · Maggie · Gem Packs (no real IAP).
// =============================================================
function renderShopOffers(container: HTMLElement): void {
  initDailyDeal();
  initMaggieOffers();
  initWeeklyShop();
  const d = state.dailyDeal;
  const dealReady = dailyDealAvailable();
  const dealDiscount = dealReady ? dailyDealDiscount() : 0;
  const surprisePending = hasPendingBox();
  const pb = state.piggyBank;
  const piggyPct = pb ? Math.min(100, Math.round((pb.gems / Math.max(1, pb.cap)) * 100)) : 0;
  const maggie = state.maggieOffers;
  const weekly = state.weeklyShop;
  const maggieActive = maggieVisitActive();
  markOfferSystemsSeen();

  container.innerHTML = `
    <p style="font-size:12px;color:#666;margin:0 0 12px 0">
      Limited-time deals and curated bundles. Hay-Day-style — earned, not bought.
    </p>
    <div class="offers-grid"></div>
    <div class="maggie-offers-section"></div>
    <div class="weekly-shop-section"></div>
    <h4 style="margin:18px 0 8px 0;font-family:var(--font-display);">💎 Diamonds — Earn Through Play</h4>
    <p style="font-size:12px;color:#666;margin:0 0 8px 0">
      Sunny Acres does not sell diamonds. Earn them by completing achievements,
      levelling up, spinning the Daily Wheel, and finishing the Season Pass.
    </p>
    <div class="gem-packs-grid"></div>
  `;

  const grid = container.querySelector<HTMLElement>('.offers-grid')!;

  // ----- Daily Deal card -----
  if (d) {
    const card = document.createElement('div');
    card.className = 'offer-card';
    const it = ITEMS[d.itemKey];
    card.innerHTML = `
      <div class="offer-card-tag">DAILY DEAL${dealDiscount > 0 ? ` · -${dealDiscount}%` : ''}</div>
      <img class="ico" src="${sprites.item[d.itemKey]?.toDataURL() ?? ''}" style="height:54px;width:auto">
      <div class="offer-card-name">${it?.name ?? d.itemKey} ×${d.qty}</div>
      <div class="offer-card-price">💎 <b>${d.diamondCost}</b> <s>${d.baseCost}</s></div>
      <button ${!dealReady || state.gems < d.diamondCost ? 'disabled' : ''}>
        ${d.bought ? 'Bought today' : (state.gems < d.diamondCost ? 'Need diamonds' : 'Claim')}
      </button>
    `;
    card.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      if (buyDailyDeal()) renderShopOffers(container);
    });
    grid.appendChild(card);
  }

  // ----- Surprise Box -----
  const surpriseCard = document.createElement('div');
  surpriseCard.className = 'offer-card';
  surpriseCard.innerHTML = `
    <div class="offer-card-tag">SURPRISE BOX</div>
    <div style="font-size:54px;line-height:1">📦</div>
    <div class="offer-card-name">Mystery Rewards</div>
    <div class="offer-card-price">${surprisePending ? '🎁 Ready to open!' : `Natural: ${SURPRISE_NATURAL_RARITY_ODDS.epic}% epic`}</div>
    <button>${surprisePending ? 'Open box' : 'View details'}</button>
  `;
  surpriseCard.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
    closeModal();
    document.getElementById('open-surprise')?.click();
  });
  grid.appendChild(surpriseCard);

  // ----- Piggy Bank -----
  if (pb) {
    const piggyCard = document.createElement('div');
    piggyCard.className = 'offer-card';
    piggyCard.innerHTML = `
      <div class="offer-card-tag">PIGGY BANK</div>
      <div style="font-size:54px;line-height:1">🐷</div>
      <div class="offer-card-name">${pb.gems} 💎 saved</div>
      <div class="offer-card-meta">${piggyPct}% full · breaks at season end</div>
      <button>${pb.broken ? 'Broken — restart' : 'View piggy'}</button>
    `;
    piggyCard.querySelector<HTMLButtonElement>('button')!.addEventListener('click', () => {
      closeModal();
      document.getElementById('open-piggy')?.click();
    });
    grid.appendChild(piggyCard);
  }

  // Maggie + weekly offers render into dedicated sections below.
  const maggieCard = document.createElement('div');
  maggieCard.className = 'offer-card offer-card--coming';
  maggieCard.innerHTML = `
    <div class="offer-card-tag">MAGGIE'S OFFERS</div>
    <div style="font-size:54px;line-height:1">🧺</div>
    <div class="offer-card-name">Rotating bundles</div>
    <div class="offer-card-meta">Coming in a future update</div>
    <button disabled>Soon</button>
  `;
  maggieCard.style.display = 'none';
  grid.appendChild(maggieCard);
  renderMaggieAndWeeklyOffers(container, maggie, weekly, maggieActive);

  // ----- Gem Packs (Phase 2.3) -----
  const gemGrid = container.querySelector<HTMLElement>('.gem-packs-grid')!;
  const packs: Array<{ icon: string; name: string; gems: number; how: string }> = [
    { icon: '🛒', name: 'Cart of Gems',  gems: 10,  how: 'Spin the Daily Wheel' },
    { icon: '🔒', name: 'Safe of Gems',  gems: 50,  how: 'Claim Achievement milestones' },
    { icon: '📦', name: 'Chest of Gems', gems: 200, how: 'Reach Platinum Pass tier' },
    { icon: '🏆', name: 'Vault of Gems', gems: 800, how: 'Win the weekly leaderboard' },
  ];
  for (const p of packs) {
    const card = document.createElement('div');
    card.className = 'gem-pack-card';
    card.innerHTML = `
      <div class="gem-pack-icon">${p.icon}</div>
      <div class="gem-pack-name">${p.name}</div>
      <div class="gem-pack-amount">+${p.gems} 💎</div>
      <div class="gem-pack-how">${p.how}</div>
      <span class="gem-pack-bonus">EARN</span>
    `;
    gemGrid.appendChild(card);
  }
}

// =============================================================
//  PASS TAB — FV3-grammar Free / Elite / Platinum summary card,
//  plus a "Next bundles" lookahead that names the upcoming themes.
// =============================================================
function renderMaggieAndWeeklyOffers(
  container: HTMLElement,
  maggie: NonNullable<typeof state.maggieOffers> | undefined,
  weekly: NonNullable<typeof state.weeklyShop> | undefined,
  maggieActive: boolean,
): void {
  const maggieHost = container.querySelector<HTMLElement>('.maggie-offers-section')!;
  if (state.level < MAGGIE_LEVEL) {
    maggieHost.innerHTML = `
      <div class="maggie-locked">
        <div class="maggie-portrait">🧺</div>
        <div><b>Maggie's Offers</b><span>Recurring visitor bundles unlock at Level ${MAGGIE_LEVEL}.</span></div>
      </div>
    `;
  } else if (maggie && maggieActive) {
    const days = maggieDaysRemaining();
    maggieHost.innerHTML = `
      <div class="offer-section-head">
        <div>
          <h4>🧺 Maggie's Offers</h4>
          <p>${maggie.themeName} · leaves in ${days} day${days === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div class="maggie-bundles-grid">
        ${maggie.offers.map(offer => `
          <div class="maggie-bundle-card ${offer.bought ? 'is-bought' : ''}">
            <div class="maggie-bundle-emoji">${offer.emoji}</div>
            <div class="offer-card-tag">-${offer.discountPct}%</div>
            <div class="maggie-bundle-name">${offer.title}</div>
            <div class="maggie-bundle-tagline">${offer.tagline}</div>
            <div class="offer-item-chips">${itemChips(offer.items)}</div>
            <div class="maggie-bundle-cost">${currencyLine(offer.costCoins, offer.costGems)}</div>
            <button data-maggie-offer="${offer.id}" ${offer.bought || state.coins < offer.costCoins || state.gems < offer.costGems ? 'disabled' : ''}>
              ${offer.bought ? 'Bought' : 'Claim bundle'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
  } else if (maggie) {
    maggieHost.innerHTML = `
      <div class="maggie-locked">
        <div class="maggie-portrait">🧺</div>
        <div><b>Maggie is restocking</b><span>Next visit: Day ${maggie.nextVisitDay}.</span></div>
      </div>
    `;
  }
  maggieHost.querySelectorAll<HTMLButtonElement>('button[data-maggie-offer]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (buyMaggieOffer(btn.dataset.maggieOffer!)) renderShopOffers(container);
    }),
  );

  const weeklyHost = container.querySelector<HTMLElement>('.weekly-shop-section')!;
  if (!weekly) return;
  const days = weeklyShopDaysRemaining();
  weeklyHost.innerHTML = `
    <div class="offer-section-head">
      <div>
        <h4>⏳ This Week Only</h4>
        <p>Rotating coin offers reset in ${days} day${days === 1 ? '' : 's'}.</p>
      </div>
    </div>
    <div class="weekly-offers-grid">
      ${weekly.offers.map(offer => {
        const item = ITEMS[offer.itemKey];
        const soldOut = offer.bought >= offer.maxBuys;
        return `
          <div class="weekly-offer-card ${soldOut ? 'is-bought' : ''}">
            <div class="weekly-offer-emoji">${offer.emoji}</div>
            <img class="ico" src="${sprites.item[offer.itemKey]?.toDataURL() ?? ''}">
            <div class="offer-card-tag">-${offer.discountPct}%</div>
            <div class="weekly-offer-name">${offer.title}</div>
            <div class="weekly-offer-meta">${offer.qty}× ${item?.name ?? offer.itemKey}</div>
            <div class="weekly-offer-price">${offer.costCoins}💰</div>
            <button data-weekly-offer="${offer.id}" ${soldOut || state.coins < offer.costCoins ? 'disabled' : ''}>
              ${soldOut ? 'Sold out' : `Buy ${offer.bought}/${offer.maxBuys}`}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
  weeklyHost.querySelectorAll<HTMLButtonElement>('button[data-weekly-offer]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (buyWeeklyShopOffer(btn.dataset.weeklyOffer!)) renderShopOffers(container);
    }),
  );
}

function itemChips(items: Record<string, number>): string {
  return Object.keys(items).map(key => `
    <span class="offer-item-chip">
      <img class="ico-mini" src="${sprites.item[key]?.toDataURL() ?? ''}">
      ${items[key]}× ${ITEMS[key]?.name ?? key}
    </span>
  `).join('');
}

function currencyLine(coins: number, gems: number): string {
  const parts: string[] = [];
  if (coins > 0) parts.push(`${coins}💰`);
  if (gems > 0) parts.push(`${gems}💎`);
  return parts.length ? parts.join(' + ') : 'Free';
}

function renderShopPass(container: HTMLElement): void {
  const p = state.pass;
  const daysLeft = passDaysLeft();
  const eliteOn = isEliteUnlocked();
  const platOn = isPlatinumUnlocked();

  container.innerHTML = `
    <div class="pass-shop-card">
      <div class="pass-shop-head">
        <div class="pass-shop-title">🎖️ 28-Day Harvest Pass</div>
        <div class="pass-shop-meta">⏳ ${daysLeft} day${daysLeft === 1 ? '' : 's'} left</div>
      </div>
      <div class="pass-shop-tracks">
        <div class="pass-shop-track ${'is-active'}">
          <div class="pass-shop-track-name">Free</div>
          <div class="pass-shop-track-status">Always on</div>
        </div>
        <div class="pass-shop-track ${eliteOn ? 'is-active' : 'is-locked'}">
          <div class="pass-shop-track-name">Elite 🏅</div>
          <div class="pass-shop-track-status">${eliteOn ? 'Earned' : 'Earn via 3 Order-Board cycles'}</div>
        </div>
        <div class="pass-shop-track ${platOn ? 'is-active' : 'is-locked'}">
          <div class="pass-shop-track-name">Platinum 💎</div>
          <div class="pass-shop-track-status">${platOn ? 'Earned' : 'Earn via 8 Order-Board cycles'}</div>
        </div>
      </div>
      <div class="pass-shop-progress">
        Current tier <b>${p?.tier ?? 0}</b> / ${PASS_TIERS.length}
      </div>
      <button class="pass-shop-open" id="pass-shop-open">Open Pass</button>
    </div>

    <h4 style="margin:18px 0 8px 0;font-family:var(--font-display);">🌟 Earnable Pass Bundles</h4>
    <p style="font-size:12px;color:#666;margin:0 0 8px 0">
      Bundle cards unlock from pass tiers and earned Elite / Platinum tracks.
    </p>
    <div class="pass-bundles-grid"></div>
  `;

  document.getElementById('pass-shop-open')!.addEventListener('click', () => {
    closeModal();
    document.getElementById('open-pass')?.click();
  });

  // Earnable pass bundles (Phase 6.4)
  const bundleGrid = container.querySelector<HTMLElement>('.pass-bundles-grid')!;
  for (const b of PASS_BUNDLES) {
    const status = passBundleStatus(b.id);
    const card = document.createElement('div');
    card.className = `pass-bundle-card ${status.claimed ? 'is-claimed' : ''}`;
    card.innerHTML = `
      <div class="pass-bundle-icon">${b.icon}</div>
      <div class="pass-bundle-name">${b.name}</div>
      <div class="pass-bundle-sub">${b.subtitle}</div>
      <div class="pass-bundle-reward">${b.rewardLabel}</div>
      <button data-pass-bundle="${b.id}" ${status.unlocked && !status.claimed ? '' : 'disabled'}>
        ${status.claimed ? 'Claimed' : status.unlocked ? 'Claim' : status.reason}
      </button>
      <span class="pass-bundle-tag">${b.requiredTrack.toUpperCase()}</span>
    `;
    bundleGrid.appendChild(card);
  }
  bundleGrid.querySelectorAll<HTMLButtonElement>('button[data-pass-bundle]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (claimPassBundle(btn.dataset.passBundle!)) renderShopPass(container);
    }),
  );
}

function renderShopSupplies(container: HTMLElement): void {
  container.innerHTML = `<p style="font-size:12px;color:#666;margin:0 0 8px 0">
    Catalysts, fertilizers, and bait. Spend coins to invest in efficiency.</p>
    <div class="shop-grid"></div>`;
  const grid = container.querySelector<HTMLElement>('.shop-grid')!;
  const buyable: Array<{ item: string; cost: number; level: number; note?: string }> = [
    { item: 'fertilizer', cost: 30,  level: 3, note: 'Use on a tile to boost fertility' },
    { item: 'speedup',    cost: 80,  level: 4, note: 'Cut current production -30%' },
    { item: 'priority',   cost: 150, level: 5, note: 'Bump a queue job to front' },
    { item: 'qualityink', cost: 250, level: 6, note: 'Next produced item is Perfect quality' },
    { item: 'worm',       cost: 5,   level: 3, note: 'Bait — basic' },
    { item: 'fly',        cost: 25,  level: 5, note: 'Bait — bias rare' },
    { item: 'lure',       cost: 80,  level: 7, note: 'Bait — best rare bias' },
  ];
  for (const b of buyable) {
    const it = ITEMS[b.item]!;
    const locked = state.level < b.level;
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img class="ico" src="${sprites.item[b.item]!.toDataURL()}">
      <div class="name">${it.name}</div>
      <div style="font-size:11px;color:#666">${b.note ?? ''}</div>
      <div class="price"><img class="ico-mini" src="${sprites.item.coin!.toDataURL()}">${b.cost}</div>
      <button ${locked ? 'disabled' : ''}>Buy 1</button>
      <button ${locked ? 'disabled' : ''}>Buy 5</button>
      ${locked ? `<div class="locked">🔒 Lv ${b.level}</div>` : ''}
    `;
    const [b1, b5] = Array.from(div.querySelectorAll<HTMLButtonElement>('button'));
    b1!.addEventListener('click', () => buyShopItem(b.item, 1, b.cost));
    b5!.addEventListener('click', () => buyShopItem(b.item, 5, b.cost));
    grid.appendChild(div);
  }
}
