import { state } from '../state';
import { sprites } from '../sprites';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { sfx } from '../audio/sfx';
import { setBgImage } from './modal';
import type { ToolKind } from '../types';

export function setTool(t: ToolKind): void {
  state.selectedTool = t;
  state.placing = null;
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === t);
  });
  sfx.click();
}

export function updateSeedBtnLabel(): void {
  const c = CROPS[state.selectedSeed]!;
  const label = document.getElementById('seed-btn-label')!;
  label.innerHTML = `Seeds<small>${ITEMS[c.item]!.name} ($${c.seedCost})</small>`;
}

export function checkSelectedSeedValid(): void {
  if (CROPS[state.selectedSeed]!.level > state.level) {
    state.selectedSeed = 'wheat';
    updateSeedBtnLabel();
  }
}

export function attachToolButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => {
    b.addEventListener('click', () => setTool(b.dataset.tool as ToolKind));
  });
  setBgImage('ico-hand',   sprites.item.hand!);
  setBgImage('ico-plow',   sprites.item.plow!);
  setBgImage('ico-seed',   sprites.item.seed!);
  setBgImage('ico-shop',   sprites.item.shop!);
  setBgImage('ico-inv',    sprites.item.inv!);
  setBgImage('ico-build',  sprites.item.build!);
  setBgImage('ico-decor',  sprites.item.decor!);
  setBgImage('ico-trophy', sprites.item.trophy!);
  setBgImage('ico-news',   sprites.item.news!);
  setBgImage('ico-save',   sprites.item.save!);
  setBgImage('ico-help',   sprites.item.help!);
  setBgImage('coin-ico',   sprites.item.coin!);
}
