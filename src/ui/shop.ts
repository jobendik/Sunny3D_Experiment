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
import { checkAchievements } from '../systems/achievements';
import { isEvent } from '../systems/events';

export function openShop(): void {
  openModal('🛒 Shop', [
    { key: 'seeds', label: 'Seeds', render: renderShopSeeds },
    { key: 'trees', label: 'Trees', render: renderShopTrees },
    { key: 'sell',  label: 'Sell',  render: renderShopSell },
    { key: 'feed',  label: 'Buy',   render: renderShopFeed },
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
  if (isEvent('market_rush')) unitPrice = Math.floor(unitPrice * 1.5);
  const total = unitPrice * qty;
  state.coins += total;
  state.stats.sold += qty;
  state.stats.earned += total;
  sfx.coin();
  toast(`+${total}${isEvent('market_rush') ? ' (+50%!)' : ''}`, 'gold');
  updateHUD();
  renderShopSell(document.getElementById('modal-body')!);
  questProgress('sell', k, qty);
  questProgress('earn', null, total);
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
  addItem(key, qty);
  sfx.coin();
  toast(`+${qty} ${ITEMS[key]!.name}`);
  updateHUD();
  renderShopFeed(document.getElementById('modal-body')!);
}
