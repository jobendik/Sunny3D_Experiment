import { state } from '../state';
import { rand, randi, choice, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { spawnCrows } from './crows';
import { updateWeatherAndSeason } from './weather';
import { openNews } from '../ui/news';
import type { EventKind } from '../types';

const EVENT_TYPES: readonly EventKind[] = ['crows', 'merchant', 'lucky', 'rain_blessing', 'market_rush'];

export function tryTriggerEvent(dt: number): void {
  if (state.event) return;
  state.eventCooldown -= dt;
  if (state.eventCooldown > 0) return;
  if (Math.random() < 0.0008 * dt * 60 + 0.002) {
    triggerEvent(choice(EVENT_TYPES));
    state.eventCooldown = 90 + rand(120);
  }
}

export function triggerEvent(kind: EventKind): void {
  const banner = document.getElementById('event-banner');
  let msg = '';
  let duration = 60;
  switch (kind) {
    case 'crows':
      msg = '🐦 Crows are attacking! Click them to scare them away!';
      duration = 30;
      spawnCrows(3 + randi(3));
      break;
    case 'merchant':
      msg = '🚐 Traveling merchant has arrived! Click News for special deals.';
      duration = 90;
      break;
    case 'lucky':
      msg = '🍀 Lucky Day! Crop yields are doubled for the next 60 seconds!';
      duration = 60;
      break;
    case 'rain_blessing':
      msg = '🌧️ Sudden rain! Crops growing faster for a minute.';
      duration = 60;
      state.weather = 'rainy';
      updateWeatherAndSeason();
      break;
    case 'market_rush':
      msg = '💰 Market rush! Sell prices boosted 50% for 60 seconds!';
      duration = 60;
      break;
  }
  state.event = { kind, until: nowSeconds() + duration, msg };
  if (banner) {
    banner.textContent = msg;
    banner.classList.add('show');
    banner.onclick = (): void => {
      if (kind === 'merchant') openNews();
      else if (kind === 'crows') sfx.click();
    };
  }
  sfx.bell();
}

export function updateEvent(_dt: number): void {
  if (!state.event) return;
  if (nowSeconds() >= state.event.until) {
    if (state.event.kind === 'crows') {
      state.crows.length = 0;
    }
    state.event = null;
    const banner = document.getElementById('event-banner');
    if (banner) {
      banner.classList.remove('show');
      banner.onclick = null;
    }
  }
}

export function isEvent(kind: EventKind): boolean {
  return state.event !== null && state.event.kind === kind;
}
