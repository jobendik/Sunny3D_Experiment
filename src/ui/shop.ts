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
import { addPassPoints } from '../systems/season-pass';
import { spawnHUDBurst } from '../systems/flyers';
import { piggyOnCoinSpend } from '../systems/piggy-bank';

export function openShop(): void {
  openModal('🛒 Shop', [
    { key: 'seeds', label: 'Seeds', render: renderShopSeeds },
    { key: 'trees', label: 'Trees', render: renderShopTrees },
    { key: 'sell',  label: 'Sell',  render: renderShopSell },
    { key: 'feed',  label: 'Buy',   render: renderShopFeed },
    { key: 'supplies', label: 'Supplies', render: renderShopSupplies },
  ], 'seeds');
}

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
