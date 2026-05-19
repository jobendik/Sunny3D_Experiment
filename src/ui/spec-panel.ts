// =============================================================
//  SPECIALIZATION PANEL — pick your branch identity.
// =============================================================

import { state } from '../state';
import { SPECIALIZATIONS, type SpecBranch } from '../data/specializations';
import {
  initSpecializations, pickPrimary, pickSecondary,
  canPickPrimary, canPickSecondary,
} from '../systems/specializations';
import { CONFIG } from '../config';
import { openModal } from './modal';

export function openSpecialization(): void {
  initSpecializations();
  openModal('🌟 Specialization', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  render(document.getElementById('modal-body')!);
}

function render(body: HTMLElement): void {
  const s = state.specialization!;
  const branches: SpecBranch[] = ['crop', 'ranch', 'artisan', 'fisher'];
  const canPick = canPickPrimary();
  const canSwap = state.level >= CONFIG.specializations.pickAtLevel && !!s.primary;
  const canSec = canPickSecondary();
  body.innerHTML = `
    <div class="spec-intro">
      <p style="text-align:center">Pick a branch at <b>Level ${CONFIG.specializations.pickAtLevel}</b>. A minor secondary unlocks at Level ${CONFIG.specializations.secondaryAtLevel}.</p>
      <p style="text-align:center;font-size:13px;color:#666">
        Primary: <b>${s.primary ? SPECIALIZATIONS[s.primary].name : 'None'}</b>
        ${s.secondary ? ` • Secondary: <b>${SPECIALIZATIONS[s.secondary].name}</b>` : ''}
      </p>
    </div>
    <div class="spec-grid">
      ${branches.map(b => renderBranch(b, s.primary === b, s.secondary === b, canPick || canSwap, canSec)).join('')}
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = btn.dataset.pick as SpecBranch;
      if (btn.dataset.kind === 'secondary') pickSecondary(b);
      else pickPrimary(b);
      render(body);
    });
  });
}

function renderBranch(b: SpecBranch, isPrimary: boolean, isSecondary: boolean, canPickPrim: boolean, canPickSec: boolean): string {
  const def = SPECIALIZATIONS[b];
  const eff = def.effects;
  const effHTML: string[] = [];
  if (eff.cropGrowth) effHTML.push(`+${Math.round(eff.cropGrowth * 100)}% crop growth`);
  if (eff.cropYield) effHTML.push(`+${Math.round(eff.cropYield * 100)}% crop yield`);
  if (eff.animalSpeed) effHTML.push(`+${Math.round(eff.animalSpeed * 100)}% animal speed`);
  if (eff.animalYield) effHTML.push(`+${Math.round(eff.animalYield * 100)}% animal yield`);
  if (eff.produceSpeed) effHTML.push(`+${Math.round(eff.produceSpeed * 100)}% production speed`);
  if (eff.produceValue) effHTML.push(`+${Math.round(eff.produceValue * 100)}% produced item value`);
  if (eff.fishingRare) effHTML.push(`+${Math.round(eff.fishingRare * 100)}% rare fish bias`);
  if (eff.fishingValue) effHTML.push(`+${Math.round(eff.fishingValue * 100)}% fish value`);
  return `
    <div class="spec-card ${isPrimary ? 'primary' : ''} ${isSecondary ? 'secondary' : ''}">
      <div class="spec-icon">${def.icon}</div>
      <div class="spec-name">${def.name}</div>
      <div class="spec-fantasy">${def.fantasy}</div>
      <ul class="spec-effects">${effHTML.map(e => `<li>${e}</li>`).join('')}</ul>
      <div class="spec-actions">
        <button data-pick="${b}" data-kind="primary" ${canPickPrim ? '' : 'disabled'}>${isPrimary ? 'Primary ✓' : 'Pick Primary'}</button>
        <button data-pick="${b}" data-kind="secondary" ${canPickSec && !isPrimary ? '' : 'disabled'}>${isSecondary ? 'Secondary ✓' : 'Pick Secondary'}</button>
      </div>
    </div>
  `;
}
