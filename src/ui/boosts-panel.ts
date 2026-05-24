// =============================================================
//  BOOSTS PANEL — rewarded-ad bonus rewards.
//  Three opt-in choices: +1 wheel spin, -30 min boat, 2× harvest.
//  Visible only when the CrazyGames SDK is active; otherwise the
//  panel renders a friendly "available on CrazyGames" placeholder.
// =============================================================

import { openModal } from './modal';
import { state } from '../state';
import {
  canOfferAd,
  adCooldownMs,
  offerRewardedAd,
  hasBonusSpin,
  hasHarvestBoost,
} from '../systems/ad-rewards';
import { crazyGamesActive } from '../systems/crazygames';
import { canSpin } from '../systems/wheel';

export function openBoosts(): void {
  openModal('🎬 Bonus Boosts', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  render(body);
}

function render(body: HTMLElement): void {
  if (!crazyGamesActive()) {
    body.innerHTML = `
      <div style="text-align:center;padding:24px;color:#666">
        <div style="font-size:48px;margin-bottom:12px">🎬</div>
        <h3>Available on CrazyGames</h3>
        <p>Bonus boosts use opt-in rewarded video. They're enabled when
           Sunny Acres is hosted on the CrazyGames platform.</p>
      </div>`;
    return;
  }

  const cooldownMs = adCooldownMs();
  const cdLabel = cooldownMs > 0
    ? `<div style="text-align:center;color:#999;font-size:12px;margin-top:6px">
         Next ad in ${Math.ceil(cooldownMs / 1000)}s</div>`
    : '';

  const banked: string[] = [];
  if (hasBonusSpin()) banked.push('🎡 Bonus spin ready');
  if (hasHarvestBoost()) banked.push(`🌾 ${state.adRewards?.harvestBoostUses ?? 0}× harvest boost banked`);
  const bankedRow = banked.length
    ? `<div style="background:#fff8e8;border:1px solid #e8c468;border-radius:8px;
                  padding:10px;margin-bottom:14px;text-align:center;font-weight:600">
         ${banked.join(' &nbsp;·&nbsp; ')}
       </div>`
    : '';

  const wheelDisabled = !canOfferAd() || canSpin();
  const harvestDisabled = !canOfferAd();
  const boatDisabled = !canOfferAd() || !state.boat?.unlocked;

  body.innerHTML = `
    <p style="text-align:center;color:#555;margin:0 0 14px">
      Watch a short ad to earn an opt-in bonus. Nothing here costs money.
    </p>
    ${bankedRow}
    <div class="boosts-grid">
      <button class="btn boost-card" id="boost-wheel" ${wheelDisabled ? 'disabled' : ''}>
        <div class="boost-card-ico">🎡</div>
        <div class="boost-card-title">+1 Wheel Spin</div>
        <div class="boost-card-sub">
          ${canSpin() ? "You already have a spin ready" : "Spin the wheel again today"}
        </div>
      </button>
      <button class="btn boost-card" id="boost-boat" ${boatDisabled ? 'disabled' : ''}>
        <div class="boost-card-ico">⛵</div>
        <div class="boost-card-title">Skip 30 min</div>
        <div class="boost-card-sub">
          ${state.boat?.unlocked ? "Fast-forward the boat timer" : "Unlocks with Boat Deliveries"}
        </div>
      </button>
      <button class="btn boost-card" id="boost-harvest" ${harvestDisabled ? 'disabled' : ''}>
        <div class="boost-card-ico">🌾</div>
        <div class="boost-card-title">2× Next Harvest</div>
        <div class="boost-card-sub">Doubles the yield of your next crop tap</div>
      </button>
    </div>
    ${cdLabel}
  `;

  document.getElementById('boost-wheel')?.addEventListener('click', () => offer('wheel', body));
  document.getElementById('boost-boat')?.addEventListener('click', () => offer('boat', body));
  document.getElementById('boost-harvest')?.addEventListener('click', () => offer('harvest', body));
}

async function offer(
  scope: 'wheel' | 'boat' | 'harvest',
  body: HTMLElement,
): Promise<void> {
  const btn = document.getElementById(`boost-${scope}`) as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
  await offerRewardedAd(scope);
  render(body);
}
