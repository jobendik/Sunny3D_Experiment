// =============================================================
//  SAVE / LOAD  (localStorage) — with version migration safety
//  for the roadmap expansion's new subsystem state.
// =============================================================

import { state } from './state';
import { SAVE_KEY, GRID_W, GRID_H, WORLD_SEED } from './constants';
import { nowSeconds, rand } from './utils';
import { generateWorld, embedLegacyGrid } from './three/terrain/world-gen';
import { regionForCoord } from './three/terrain/world-data';
import type { GameState, Tile } from './types';

// v6 introduces the 32×32 world with regions + tile obstacles. v5
// saves stored an 18×18 grid; the migration generates a fresh 32×32
// world and embeds the old grid into the centre (see embedLegacyGrid).
const CURRENT_SAVE_VERSION = 6;

interface SaveData {
  saveVersion?: number;
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
  // Roadmap expansion
  storage?: GameState['storage'];
  marketStall?: GameState['marketStall'];
  gazette?: GameState['gazette'];
  boat?: GameState['boat'];
  train?: GameState['train'];
  landmarks?: GameState['landmarks'];
  friendship?: GameState['friendship'];
  buildingMastery?: GameState['buildingMastery'];
  // Phase 4-15 expansion (v5+)
  balloon?: GameState['balloon'];
  festivalCart?: GameState['festivalCart'];
  expansion?: GameState['expansion'];
  club?: GameState['club'];
  village?: GameState['village'];
  expeditions?: GameState['expeditions'];
  contest?: GameState['contest'];
  liveEvent?: GameState['liveEvent'];
  compost?: GameState['compost'];
  breeds?: GameState['breeds'];
  visitorsV2?: GameState['visitorsV2'];
  reputation?: GameState['reputation'];
  cardFusion?: GameState['cardFusion'];
  forecast?: GameState['forecast'];
  helpers?: GameState['helpers'];
  journal?: GameState['journal'];
  contracts?: GameState['contracts'];
  hazards?: GameState['hazards'];
  friendCodes?: GameState['friendCodes'];
  greenhouse?: GameState['greenhouse'];
  toolShed?: GameState['toolShed'];
  buildingUpgrades?: GameState['buildingUpgrades'];
  decorSets?: GameState['decorSets'];
  // Transient migration hints (not stored in localStorage; set by
  // migrateSave() and read by loadGame() to shift entity coords).
  _migrateOffsetX?: number;
  _migrateOffsetY?: number;
}

export function saveGame(): void {
  const data: SaveData = {
    saveVersion: CURRENT_SAVE_VERSION,
    coins: state.coins,
    xp: state.xp,
    level: state.level,
    day: state.day,
    selectedSeed: state.selectedSeed,
    grid: state.grid.map(row => row.map(t => ({
      type: t.type, crop: t.crop, plantedAt: t.plantedAt,
      watered: false, building: t.building, tree: t.tree,
      region: t.region, unlocked: t.unlocked, obstacle: t.obstacle ?? null,
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
    storage: state.storage,
    marketStall: state.marketStall,
    gazette: state.gazette,
    boat: state.boat,
    train: state.train,
    landmarks: state.landmarks,
    friendship: state.friendship,
    buildingMastery: state.buildingMastery,
    balloon: state.balloon,
    festivalCart: state.festivalCart,
    expansion: state.expansion,
    club: state.club,
    village: state.village,
    expeditions: state.expeditions,
    contest: state.contest,
    liveEvent: state.liveEvent,
    compost: state.compost,
    breeds: state.breeds,
    visitorsV2: state.visitorsV2,
    reputation: state.reputation,
    cardFusion: state.cardFusion,
    forecast: state.forecast,
    helpers: state.helpers,
    journal: state.journal,
    contracts: state.contracts,
    hazards: state.hazards,
    friendCodes: state.friendCodes,
    greenhouse: state.greenhouse,
    toolShed: state.toolShed,
    buildingUpgrades: state.buildingUpgrades,
    decorSets: state.decorSets,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('save failed', e);
  }
}

/** Up-version old saves. Each migration is pure: in -> out. */
function migrateSave(data: SaveData): SaveData {
  if (!data.saveVersion) data.saveVersion = 1;
  if (data.saveVersion < 4) {
    // v4: roadmap expansion fields default to undefined; subsystems init() on first use.
    data.saveVersion = 4;
  }
  if (data.saveVersion < 5) {
    // v5: Phase 4-15 expansion fields default to undefined; init() handles defaults.
    data.saveVersion = 5;
  }
  if (data.saveVersion < 6) {
    // v6: world grew from 18×18 to 32×32. Embed the old grid into a
    // freshly-generated world, centred. Building/tree/decor coords
    // are shifted in the loadGame() flow below (we don't know the
    // offset here, so we tag it on the data object for the loader).
    const oldH = data.grid.length;
    const oldW = data.grid[0]?.length ?? 0;
    if (oldW !== GRID_W || oldH !== GRID_H) {
      const fresh = generateWorld(WORLD_SEED);
      const { offsetX, offsetY } = embedLegacyGrid(fresh, data.grid);
      data.grid = fresh;
      data._migrateOffsetX = offsetX;
      data._migrateOffsetY = offsetY;
    }
    data.saveVersion = 6;
  }
  return data;
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    let data: SaveData;
    try {
      data = JSON.parse(raw) as SaveData;
    } catch (e) {
      console.warn('save JSON parse failed, ignoring', e);
      return false;
    }
    data = migrateSave(data);

    state.coins = data.coins;
    state.xp = data.xp;
    state.level = data.level;
    state.day = data.day;
    state.selectedSeed = data.selectedSeed || 'wheat';
    // Load the grid, but ALWAYS backfill region/unlocked so any older
    // save data without those fields still answers the predicates in
    // world-data.ts correctly. Tiles in the home region default to
    // unlocked; expansion-region tiles default to locked and will be
    // flipped by `syncRegionUnlocks()` if the player has already
    // unlocked their containing plot.
    state.grid = data.grid.map((row, gy) => row.map((t, gx) => {
      const region = t.region ?? regionForCoord(gx, gy);
      return {
        ...t,
        watered: false,
        region,
        unlocked: t.unlocked ?? (region === 'home'),
        obstacle: t.obstacle ?? null,
      };
    }));
    // Apply migration offset to entity coords if the grid was resized.
    const dx = data._migrateOffsetX ?? 0;
    const dy = data._migrateOffsetY ?? 0;
    if (dx !== 0 || dy !== 0) {
      for (const b of (data.buildings ?? [])) { b.x += dx; b.y += dy; }
      for (const t of (data.trees ?? []))     { t.x += dx; t.y += dy; }
      for (const d of (data.decor ?? []))     { d.x += dx; d.y += dy; }
    }
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
    // Safe restore — each system's init() function defends against missing fields.
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
    if (data.storage) state.storage = data.storage;
    if (data.marketStall) state.marketStall = data.marketStall;
    if (data.gazette) state.gazette = data.gazette;
    if (data.boat) state.boat = data.boat;
    if (data.train) state.train = data.train;
    if (data.landmarks) state.landmarks = data.landmarks;
    if (data.friendship) state.friendship = data.friendship;
    if (data.buildingMastery) state.buildingMastery = data.buildingMastery;
    if (data.balloon) state.balloon = data.balloon;
    if (data.festivalCart) state.festivalCart = data.festivalCart;
    if (data.expansion) state.expansion = data.expansion;
    if (data.club) state.club = data.club;
    if (data.village) state.village = data.village;
    if (data.expeditions) state.expeditions = data.expeditions;
    if (data.contest) state.contest = data.contest;
    if (data.liveEvent) state.liveEvent = data.liveEvent;
    if (data.compost) state.compost = data.compost;
    if (data.breeds) state.breeds = data.breeds;
    if (data.visitorsV2) state.visitorsV2 = data.visitorsV2;
    if (data.reputation) state.reputation = data.reputation;
    if (data.cardFusion) state.cardFusion = data.cardFusion;
    if (data.forecast) state.forecast = data.forecast;
    if (data.helpers) state.helpers = data.helpers;
    if (data.journal) state.journal = data.journal;
    if (data.contracts) state.contracts = data.contracts;
    if (data.hazards) state.hazards = data.hazards;
    if (data.friendCodes) state.friendCodes = data.friendCodes;
    if (data.greenhouse) state.greenhouse = data.greenhouse;
    if (data.toolShed) state.toolShed = data.toolShed;
    if (data.buildingUpgrades) state.buildingUpgrades = data.buildingUpgrades;
    if (data.decorSets) state.decorSets = data.decorSets;
    state.saveVersion = data.saveVersion ?? CURRENT_SAVE_VERSION;

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
    // Rebase boat/train deadlines too.
    if (state.boat) {
      if (state.boat.arrivesAt) state.boat.arrivesAt += delta;
      if (state.boat.departsAt) state.boat.departsAt += delta;
    }
    if (state.train) {
      if (state.train.returnsAt) state.train.returnsAt += delta;
    }
    if (state.marketStall) {
      // Slot timestamps live in game-time too.
      for (const s of state.marketStall.slots) {
        s.listedAt += delta;
      }
    }
    if (state.balloon) {
      if (state.balloon.leavesAt) state.balloon.leavesAt += delta;
      if (state.balloon.nextAt) state.balloon.nextAt += delta;
    }
    if (state.festivalCart) {
      if (state.festivalCart.endsAt) state.festivalCart.endsAt += delta;
    }
    if (state.expeditions) {
      state.expeditions.energyLastRegen += delta;
    }
    if (state.contracts) {
      for (const c of state.contracts.active) c.expiresAt += delta;
      for (const o of state.contracts.offers) o.expiresAt += delta;
      state.contracts.nextOfferAt += delta;
    }
    if (state.compost) {
      if (state.compost.fermentDoneAt) state.compost.fermentDoneAt += delta;
    }
    if (state.greenhouse) {
      for (const slot of state.greenhouse.slots) {
        slot.plantedAt += delta;
        slot.doneAt += delta;
      }
    }
    if (state.helpers) {
      for (const h of state.helpers.hired) h.hiredUntil += delta;
    }
    if (state.visitorsV2) {
      for (const v of state.visitorsV2.active) {
        v.arrivedAt += delta;
        v.expiresAt += delta;
      }
      state.visitorsV2.nextSpawnAt += delta;
    }
    return true;
  } catch (e) {
    console.warn('load failed', e);
    return false;
  }
}
