import { state } from '../state';
import { SEASONS, SEASON_INFO, WEATHER } from '../data/seasons';
import { DAY_SECONDS } from '../constants';
import { rand, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { track } from './telemetry';
import { activeRemainingSeconds } from './weather-grid';
import type { Season, Weather } from '../types';

export function getSeasonIcon(season: Season): string {
  return ({ spring: '🌷', summer: '☀️', autumn: '🍂', winter: '❄️' } as const)[season];
}

export function pickSeasonForDay(day: number): Season {
  const safeDay = Math.max(1, day | 0);
  const raw = Math.floor((safeDay - 1) / 3) % SEASONS.length;
  const idx = ((raw % SEASONS.length) + SEASONS.length) % SEASONS.length;
  return SEASONS[idx]!;
}

export function pickWeatherForSeason(season: Season): Weather {
  const tableSpring: Weather[] = ['sunny', 'sunny', 'cloudy', 'rainy', 'windy'];
  const tableSummer: Weather[] = ['sunny', 'sunny', 'sunny', 'cloudy', 'storm', 'windy'];
  const tableAutumn: Weather[] = ['cloudy', 'rainy', 'windy', 'sunny', 'rainy'];
  const tableWinter: Weather[] = ['snowy', 'snowy', 'cloudy', 'windy', 'sunny'];
  const map: Record<Season, Weather[]> = {
    spring: tableSpring, summer: tableSummer, autumn: tableAutumn, winter: tableWinter,
  };
  const table = map[season] ?? tableSpring;
  return table[Math.floor(Math.random() * table.length)]!;
}

export function updateWeatherAndSeason(): void {
  const newSeason = pickSeasonForDay(state.day);
  if (newSeason !== state.season) {
    const prevSeason = state.season;
    state.season = newSeason;
    toast(`${getSeasonIcon(newSeason)} ${SEASON_INFO[newSeason].name} has arrived!`, 'xp');
    sfx.bell();
    track('season_change', { from: prevSeason, to: newSeason });
    triggerSeasonalArc(newSeason);
  }
  if (nowSeconds() >= state.weatherUntil) {
    const newW = pickWeatherForSeason(state.season);
    if (newW !== state.weather) {
      state.weather = newW;
      toast(`${WEATHER[newW].emoji} Weather: ${WEATHER[newW].name}`, '');
      if (newW === 'storm') sfx.thunder();
    }
    state.weatherUntil = nowSeconds() + DAY_SECONDS * 0.7 + rand(DAY_SECONDS * 0.4);
  }
  const wEl = document.getElementById('weather-emoji');
  const wNm = document.getElementById('weather-name');
  const sEl = document.getElementById('season-emoji');
  const sNm = document.getElementById('season-name');
  if (wEl) wEl.textContent = WEATHER[state.weather].emoji;
  if (wNm) wNm.textContent = WEATHER[state.weather].name;
  if (sEl) sEl.textContent = getSeasonIcon(state.season);
  if (sNm) sNm.textContent = SEASON_INFO[state.season].name;
  // Reflect current weather/season on the HUD chips so CSS can tint them.
  document.getElementById('weather-badge')?.setAttribute('data-weather', state.weather);
  document.getElementById('season-badge')?.setAttribute('data-season', state.season);
  // Glow + label badge when Weather Grid effects are active. This is the
  // signature feedback that makes a cast feel "alive" past the cast moment.
  const wb = document.getElementById('weather-badge');
  if (wb) {
    const remain = activeRemainingSeconds();
    if (remain > 0) {
      wb.classList.add('grid-active');
      const remStr = remain > 60 ? `${Math.ceil(remain / 60)}m` : `${Math.ceil(remain)}s`;
      wb.title = `Weather Grid active — ${remStr} left`;
    } else {
      wb.classList.remove('grid-active');
      wb.title = 'Weather';
    }
  }
}

// Seasonal arc events — strategic, set the tone for the new season.
function triggerSeasonalArc(season: Season): void {
  const banner = document.getElementById('event-banner');
  let msg = '';
  switch (season) {
    case 'spring':
      msg = '🌱 Spring Flood! Soil is rich — crops grow 30% faster this season.';
      break;
    case 'summer':
      msg = '🌤️ Summer Drought watch — irrigate when possible. Sun bonuses apply.';
      break;
    case 'autumn':
      msg = '🍂 Autumn Fair! Orchards and pumpkin crops earn +20% this season.';
      break;
    case 'winter':
      msg = '❄️ Winter Storm! Crop growth slowed, but cheese/bread sell at +25%.';
      break;
  }
  if (banner) {
    banner.textContent = msg;
    banner.classList.add('show');
    window.setTimeout(() => banner.classList.remove('show'), 6000);
  }
  track('seasonal_arc', { season });
}
