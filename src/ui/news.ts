import { state } from '../state';
import { ITEMS } from '../data/items';
import { SEASON_INFO, WEATHER } from '../data/seasons';
import { sprites } from '../sprites';
import { choice } from '../utils';
import { sfx } from '../audio/sfx';
import { openModal } from './modal';
import { toast } from './toasts';
import { updateHUD } from './hud';
import { addItem } from '../systems/inventory';
import { growthMultiplier } from '../systems/crops';
import { isEvent } from '../systems/events';
import { getSeasonIcon } from '../systems/weather';

export function openNews(): void {
  openModal('📰 The Daily Acre', null);
  document.getElementById('modal-tabs')!.innerHTML = '';
  const body = document.getElementById('modal-body')!;
  const seasonInfo = SEASON_INFO[state.season];
  const weatherInfo = WEATHER[state.weather];
  const todayQuests = state.quests.map(q => q.desc).join(' • ');

  let merchantHTML = '';
  if (isEvent('merchant')) {
    const merchantItems = [
      { item: 'sugar', price: 60 },
      { item: 'cloth', price: 130 },
      { item: 'juice', price: 75 },
    ].filter(m => ITEMS[m.item]);
    merchantHTML = `
      <div class="news-section" style="background:linear-gradient(180deg, #fff7da, #ffe9b0);border-color:#c6932a">
        <h4>🚐 Traveling Merchant — Special Deals!</h4>
        <p style="font-size:12px;color:#5a3d0c">Hurry, the merchant leaves soon!</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${merchantItems.map(m => `
            <div style="background:#fff;padding:6px;border-radius:6px;border:2px solid #c6932a">
              <img class="ico-mini" src="${sprites.item[m.item]!.toDataURL()}">
              ${ITEMS[m.item]!.name}
              <button data-merchant-item="${m.item}" data-merchant-price="${m.price}" style="background:var(--green-btn);color:white;border:none;border-radius:6px;padding:2px 8px;font-size:11px;margin-left:4px;cursor:pointer">${m.price}💰</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div class="news-content">
      <h2 style="text-align:center;margin-top:0">— Day ${state.day} —</h2>
      <div class="news-section">
        <h4>☁️ Weather & Season</h4>
        <p style="margin:4px 0;font-size:13px">
          ${getSeasonIcon(state.season)} ${seasonInfo.name} • ${weatherInfo.emoji} ${weatherInfo.name}
          <br><span style="color:#888;font-size:11px">
            Crop growth: ×${growthMultiplier().toFixed(2)}
          </span>
        </p>
      </div>
      ${state.event ? `<div class="news-section" style="background:linear-gradient(180deg, #fff0d0, #ffd890)">
        <h4>📢 Active Event</h4>
        <p style="margin:4px 0;font-size:13px">${state.event.msg}</p>
      </div>` : ''}
      ${merchantHTML}
      <div class="news-section">
        <h4>⭐ Today's Goals</h4>
        <p style="margin:4px 0;font-size:13px">${todayQuests || 'No active quests.'}</p>
      </div>
      <div class="news-section">
        <h4>💡 Tip of the Day</h4>
        <p style="margin:4px 0;font-size:13px">
          ${choice([
            'Rain speeds up crop growth by 50%!',
            'Build a scarecrow to scare away crows.',
            'Animals stop producing when their pen is hungry.',
            'Plant apple trees for long-term passive income.',
            'Complete quests for big rewards and XP.',
            'Fishing dock offers high-value catches!',
            'Look for the traveling merchant — they have rare items.',
            "Withered crops give no harvest. Don't leave them too long.",
            'Your dog finds bonus coins around the farm!',
            'Storm weather may slow growth but rewards bigger XP later.',
          ])}
        </p>
      </div>
    </div>
  `;
  body.querySelectorAll<HTMLButtonElement>('button[data-merchant-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.merchantItem!;
      const price = parseInt(btn.dataset.merchantPrice!, 10);
      if (state.coins < price) {
        sfx.cantAfford();
        toast('Not enough coins!', 'error');
        return;
      }
      state.coins -= price;
      addItem(item, 1);
      sfx.coin();
      toast(`Bought ${ITEMS[item]!.name}!`, 'xp');
      updateHUD();
    });
  });
}
