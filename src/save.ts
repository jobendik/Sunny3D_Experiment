// =============================================================
//  SAVE / LOAD  (localStorage)
// =============================================================

import { state } from './state';
import { SAVE_KEY } from './constants';
import { nowSeconds, rand } from './utils';
import type { GameState, Tile } from './types';

interface SaveData {
  coins: number;
  xp: number;
  level: number;
  day: number;
  selectedSeed: string;
  grid: Tile[][];
  inv: Record<string, number>;
  buildings: GameState['buildings'];
  penAnimals: GameState['penAnimals'];
  prodQueues: GameState['prodQueues'];
  orders: GameState['orders'];
  stats: Partial<GameState['stats']>;
  quests: GameState['quests'];
  achievements: GameState['achievements'];
  season: GameState['season'];
  seasonDay: number;
  weather: GameState['weather'];
  weatherUntil: number;
  penFeed: Record<string, number>;
  decor: GameState['decor'];
  trees: GameState['trees'];
  musicOn: boolean;
  saveTime: number;
  // Retention / mastery
  daily?: GameState['daily'];
  weekly?: GameState['weekly'];
  weatherGrid?: GameState['weatherGrid'];
  specialization?: GameState['specialization'];
  collection?: GameState['collection'];
  market?: GameState['market'];
  soil?: GameState['soil'];
  mood?: GameState['mood'];
  biome?: GameState['biome'];
  prestige?: GameState['prestige'];
  tutorial?: GameState['tutorial'];
  deferredPayouts?: GameState['deferredPayouts'];
  tileTraits?: GameState['tileTraits'];
  farmName?: string;
  wheel?: GameState['wheel'];
  combo?: GameState['combo'];
  treasures?: GameState['treasures'];
  pass?: GameState['pass'];
  visitors?: GameState['visitors'];
  lastSessionEndedAt?: number;
}

export function saveGame(): void {
  const data: SaveData = {
    coins: state.coins,
    xp: state.xp,
    level: state.level,
    day: state.day,
    selectedSeed: state.selectedSeed,
    grid: state.grid.map(row => row.map(t => ({
      type: t.type, crop: t.crop, plantedAt: t.plantedAt,
      watered: false, building: t.building, tree: t.tree,
    }))),
    inv: state.inv,
    buildings: state.buildings,
    penAnimals: state.penAnimals,
    prodQueues: state.prodQueues,
    orders: state.orders,
    stats: state.stats,
    quests: state.quests,
    achievements: state.achievements,
    season: state.season,
    seasonDay: state.seasonDay,
    weather: state.weather,
    weatherUntil: state.weatherUntil,
    penFeed: state.penFeed,
    decor: state.decor,
    trees: state.trees,
    musicOn: state.musicOn,
    saveTime: nowSeconds(),
    daily: state.daily,
    weekly: state.weekly,
    weatherGrid: state.weatherGrid,
    specialization: state.specialization,
    collection: state.collection,
    market: state.market,
    soil: state.soil,
    mood: state.mood,
    biome: state.biome,
    prestige: state.prestige,
    tutorial: state.tutorial,
    deferredPayouts: state.deferredPayouts,
    tileTraits: state.tileTraits,
    farmName: state.farmName,
    wheel: state.wheel,
    combo: state.combo,
    treasures: state.treasures,
    pass: state.pass,
    visitors: state.visitors,
    lastSessionEndedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as SaveData;

    state.coins = data.coins;
    state.xp = data.xp;
    state.level = data.level;
    state.day = data.day;
    state.selectedSeed = data.selectedSeed || 'wheat';
    state.grid = data.grid.map(row => row.map(t => ({ ...t, watered: false })));
    state.inv = data.inv || {};
    state.buildings = data.buildings || [];
    state.penAnimals = data.penAnimals || {};
    state.prodQueues = data.prodQueues || {};
    state.orders = data.orders || [];
    state.stats = Object.assign({
      harvested: 0, sold: 0, planted: 0, produced: 0, plowed: 0,
      earned: 100, animalsOwned: 0, ordersFulfilled: 0, questsDone: 0,
      fishCaught: 0, decorsPlaced: 0, treesGrown: 0, crowsShooed: 0,
      itemsProduced: {},
    }, data.stats || {});
    state.quests = data.quests || [];
    state.achievements = data.achievements || {};
    state.season = data.season || 'spring';
    state.seasonDay = data.seasonDay || 1;
    state.weather = data.weather || 'sunny';
    state.weatherUntil = data.weatherUntil || 0;
    state.penFeed = data.penFeed || {};
    state.decor = data.decor || [];
    state.trees = data.trees || [];
    state.musicOn = data.musicOn !== undefined ? data.musicOn : true;
    if (data.daily) state.daily = data.daily;
    if (data.weekly) state.weekly = data.weekly;
    if (data.weatherGrid) state.weatherGrid = data.weatherGrid;
    if (data.specialization) state.specialization = data.specialization;
    if (data.collection) state.collection = data.collection;
    if (data.market) state.market = data.market;
    if (data.soil) state.soil = data.soil;
    if (data.mood) state.mood = data.mood;
    if (data.biome) state.biome = data.biome;
    if (data.prestige) state.prestige = data.prestige;
    if (data.tutorial) state.tutorial = data.tutorial;
    if (data.deferredPayouts) state.deferredPayouts = data.deferredPayouts;
    if (data.tileTraits) state.tileTraits = data.tileTraits;
    if (data.farmName) state.farmName = data.farmName;
    if (data.wheel) state.wheel = data.wheel;
    if (data.combo) state.combo = data.combo;
    if (data.treasures) state.treasures = data.treasures;
    if (data.pass) state.pass = data.pass;
    if (data.visitors) state.visitors = data.visitors;
    if (data.lastSessionEndedAt) state.lastSessionEndedAt = data.lastSessionEndedAt;

    const offset = data.saveTime || 0;
    const curNow = nowSeconds();
    const delta = curNow - offset;
    for (const row of state.grid) for (const t of row) if (t.plantedAt) t.plantedAt += delta;
    for (const id in state.penAnimals) {
      for (const a of state.penAnimals[id]!) {
        a.lastProduced = (a.lastProduced || 0) + delta;
        a.ax = a.ax ?? rand(120);
        a.ay = a.ay ?? rand(120);
        a.tx = a.tx ?? a.ax;
        a.ty = a.ty ?? a.ay;
        a.frame = 0;
        a.frameT = rand(2);
      }
    }
    for (const id in state.prodQueues) {
      for (const job of state.prodQueues[id]!) {
        job.startTime += delta;
        job.doneAt += delta;
      }
    }
    for (const tr of state.trees) {
      tr.plantedAt += delta;
      if (tr.lastHarvested) tr.lastHarvested += delta;
    }
    state.weatherUntil += delta;
    return true;
  } catch (e) {
    console.warn('load failed', e);
    return false;
  }
}
