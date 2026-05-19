// =============================================================
//  WEATHER CARDS — programmable modifiers slotted onto the
//  Weather Mastery Grid. Each card alters the next weather
//  rotation or the active weather's effect.
// =============================================================

import type { Weather } from '../types';

export interface WeatherCardDef {
  id: string;
  name: string;
  desc: string;
  rarity: 'common' | 'rare' | 'epic';
  level: number;        // unlock level
  cost: number;         // gold cost to craft
  duration: number;     // seconds when slotted
  effect: WeatherCardEffect;
}

export interface WeatherCardEffect {
  // Force the next weather to a specific kind.
  forceWeather?: Weather;
  // Add a global growth bonus while slotted.
  growthBonus?: number;
  // Add a yield bonus on harvest while slotted.
  yieldBonus?: number;
  // Apply a sell-price bonus while slotted.
  sellBonus?: number;
  // Reduce crow chance to zero while slotted.
  noCrows?: boolean;
  // Reduce production time.
  productionSpeed?: number;
  // Animal mood floor — prevents anxiety.
  moodFloor?: number;
  // Fishing rare bias.
  fishingRareBonus?: number;
}

export const WEATHER_CARDS: Record<string, WeatherCardDef> = {
  sunbeam:     { id: 'sunbeam',    name: 'Sunbeam',       desc: 'Force sunny weather and +10% yields',
                 rarity: 'common', level: 3, cost: 200, duration: 240,
                 effect: { forceWeather: 'sunny', yieldBonus: 0.10 } },
  rainmaker:   { id: 'rainmaker',  name: 'Rainmaker',     desc: 'Force rain and +25% crop growth speed',
                 rarity: 'common', level: 3, cost: 250, duration: 240,
                 effect: { forceWeather: 'rainy', growthBonus: 0.25 } },
  breeze:      { id: 'breeze',     name: 'Calming Breeze', desc: 'Force windy. Crows give up, animals stay calm.',
                 rarity: 'common', level: 4, cost: 220, duration: 200,
                 effect: { forceWeather: 'windy', noCrows: true, moodFloor: 60 } },
  thaw:        { id: 'thaw',       name: 'Spring Thaw',   desc: 'Force sunny + nullify any winter penalties',
                 rarity: 'rare',   level: 6, cost: 700, duration: 300,
                 effect: { forceWeather: 'sunny', growthBonus: 0.35, yieldBonus: 0.10 } },
  bountiful:   { id: 'bountiful',  name: 'Bountiful Aura', desc: '+30% yields globally regardless of weather',
                 rarity: 'rare',   level: 5, cost: 800, duration: 220,
                 effect: { yieldBonus: 0.30 } },
  marketwind:  { id: 'marketwind', name: 'Market Wind',   desc: '+25% sell prices and -10% production time',
                 rarity: 'rare',   level: 6, cost: 900, duration: 200,
                 effect: { sellBonus: 0.25, productionSpeed: 0.10 } },
  thunderhead: { id: 'thunderhead',name: 'Thunderhead',   desc: 'Force storm. Risky: yields swing wild.',
                 rarity: 'rare',   level: 7, cost: 600, duration: 200,
                 effect: { forceWeather: 'storm', yieldBonus: 0.20, growthBonus: 0.10 } },
  goldenhour:  { id: 'goldenhour', name: 'Golden Hour',   desc: '+40% yield AND +25% growth — short duration',
                 rarity: 'epic',   level: 8, cost: 2000, duration: 140,
                 effect: { forceWeather: 'sunny', yieldBonus: 0.40, growthBonus: 0.25 } },
  hightide:    { id: 'hightide',   name: 'High Tide',     desc: 'Rare fish bonus +75% and sell +15%',
                 rarity: 'epic',   level: 9, cost: 2400, duration: 200,
                 effect: { fishingRareBonus: 0.75, sellBonus: 0.15 } },
  serenity:    { id: 'serenity',   name: 'Serenity',      desc: 'No crows, animals at peak mood',
                 rarity: 'epic',   level: 8, cost: 1800, duration: 260,
                 effect: { noCrows: true, moodFloor: 100, growthBonus: 0.10 } },
};

export const ALL_CARD_IDS = Object.keys(WEATHER_CARDS);
