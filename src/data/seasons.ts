import type { Season, SeasonInfo, Weather, WeatherInfo } from '../types';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: { tint: '#fff4d8', ambient: 'rgba(255,220,180,0.0)', name: 'Spring', growthMod: 1.1 },
  summer: { tint: '#fffbe0', ambient: 'rgba(255,230,160,0.0)', name: 'Summer', growthMod: 1.0 },
  autumn: { tint: '#ffe5c0', ambient: 'rgba(220,150,80,0.08)', name: 'Autumn', growthMod: 0.9 },
  winter: { tint: '#e8eef8', ambient: 'rgba(180,210,255,0.15)', name: 'Winter', growthMod: 0.7 },
};

export const WEATHER: Record<Weather, WeatherInfo> = {
  sunny:  { name: 'Sunny',  growthMod: 1.0,  emoji: '☀️' },
  cloudy: { name: 'Cloudy', growthMod: 0.95, emoji: '⛅' },
  rainy:  { name: 'Rainy',  growthMod: 1.5,  emoji: '🌧️' },
  storm:  { name: 'Storm',  growthMod: 1.2,  emoji: '⛈️' },
  windy:  { name: 'Windy',  growthMod: 1.0,  emoji: '🍃' },
  snowy:  { name: 'Snowy',  growthMod: 0.4,  emoji: '❄️' },
};
