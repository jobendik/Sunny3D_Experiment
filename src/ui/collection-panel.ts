// =============================================================
//  COLLECTION PANEL — encyclopedia tabs for crops, fish,
//  trees, and recipes with first-discovery rewards.
// =============================================================

import { state } from '../state';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { FISH } from '../data/fish';
import { ORCHARDS } from '../data/orchards';
import { BUILDINGS } from '../data/buildings';
import { sprites } from '../sprites';
import {
  initCollection, isDiscovered, discoveryCount,
  totalEntries, collectionBonuses,
} from '../systems/collection';
import { openModal } from './modal';

export function openCollection(): void {
  initCollection();
  openModal('📖 Collection', [
    { key: 'crops',   label: 'Crops',   render: b => renderCrops(b) },
    { key: 'fish',    label: 'Fish',    render: b => renderFish(b) },
    { key: 'trees',   label: 'Trees',   render: b => renderTrees(b) },
    { key: 'recipes', label: 'Recipes', render: b => renderRecipes(b) },
    { key: 'bonus',   label: 'Bonuses', render: b => renderBonus(b) },
  ], 'crops');
}

function entryCard(title: string, discovered: boolean, qty: number, iconUrl: string, sub: string): string {
  return `
    <div class="collection-card ${discovered ? 'unlocked' : 'locked'}">
      <img class="ico" src="${iconUrl}" style="${discovered ? '' : 'filter:brightness(0)'}">
      <div class="name">${discovered ? title : '???'}</div>
      <div class="sub">${discovered ? sub : 'Undiscovered'}</div>
      ${discovered ? `<div class="qty">${qty}x found</div>` : ''}
    </div>
  `;
}

function renderCrops(body: HTMLElement): void {
  const { found, total } = totalEntries('crop');
  body.innerHTML = `
    <div class="collection-progress">Crops: <b>${found}/${total}</b></div>
    <div class="collection-grid">
      ${Object.keys(CROPS).map(k => {
        const c = CROPS[k]!;
        const d = isDiscovered('crop', k);
        return entryCard(
          ITEMS[c.item]!.name, d, discoveryCount('crop', k),
          sprites.crops[k]![3]!.toDataURL(),
          `Grow ${c.grow}s · Yields ${c.yieldMin}-${c.yieldMax}`,
        );
      }).join('')}
    </div>
  `;
}

function renderFish(body: HTMLElement): void {
  const { found, total } = totalEntries('fish');
  body.innerHTML = `
    <div class="collection-progress">Fish: <b>${found}/${total}</b></div>
    <div class="collection-grid">
      ${Object.keys(FISH).map(k => {
        const f = FISH[k]!;
        const d = isDiscovered('fish', k);
        return entryCard(
          ITEMS[k]!.name, d, discoveryCount('fish', k),
          sprites.item[k]!.toDataURL(),
          `Sells ${f.sell}💰 · ${f.xp}XP`,
        );
      }).join('')}
    </div>
  `;
}

function renderTrees(body: HTMLElement): void {
  const { found, total } = totalEntries('tree');
  body.innerHTML = `
    <div class="collection-progress">Trees: <b>${found}/${total}</b></div>
    <div class="collection-grid">
      ${Object.keys(ORCHARDS).map(k => {
        const o = ORCHARDS[k]!;
        const d = isDiscovered('tree', k);
        return entryCard(
          o.name, d, discoveryCount('tree', k),
          sprites.orchard[k]![3]!.toDataURL(),
          `Yields ${o.yieldMin}-${o.yieldMax} every ${o.cycle}s`,
        );
      }).join('')}
    </div>
  `;
}

function renderRecipes(body: HTMLElement): void {
  const { found, total } = totalEntries('recipe');
  // Build list of all recipes across buildings
  const items: Array<{ id: string; building: string; out: string; in: Record<string, number>; time: number }> = [];
  for (const [bk, b] of Object.entries(BUILDINGS)) {
    for (const r of (b.recipes ?? [])) {
      const outKey = Object.keys(r.out)[0]!;
      items.push({ id: bk + ':' + outKey, building: b.name, out: outKey, in: r.in, time: r.time });
    }
  }
  body.innerHTML = `
    <div class="collection-progress">Recipes: <b>${found}/${total}</b></div>
    <div class="collection-grid">
      ${items.map(r => {
        const d = isDiscovered('recipe', r.id);
        const sub = `${r.building} · ${r.time}s`;
        return entryCard(ITEMS[r.out]!.name, d, discoveryCount('recipe', r.id), sprites.item[r.out]!.toDataURL(), sub);
      }).join('')}
    </div>
  `;
}

function renderBonus(body: HTMLElement): void {
  const b = collectionBonuses();
  body.innerHTML = `
    <div class="news-content">
      <h2>Mastery Bonuses</h2>
      <p>Discovering items unlocks passive farm-wide multipliers:</p>
      <ul style="text-align:left;font-size:14px">
        <li>🌾 Crop yield: <b>+${(b.yieldMult * 100).toFixed(1)}%</b> (from crop discoveries)</li>
        <li>🐟 Fish sell value: <b>+${(b.sellMult * 100).toFixed(1)}%</b> (from fish discoveries)</li>
        <li>🏭 Production speed: <b>+${(b.speedMult * 100).toFixed(1)}%</b> (from recipe discoveries)</li>
      </ul>
      <p>First-time discoveries grant immediate coin + XP rewards.</p>
    </div>
  `;
}
