// =============================================================
//  CORE TYPE DEFINITIONS
//  All cross-cutting types for game data, state, and entities.
// =============================================================

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'windy' | 'snowy';
export type ToolKind = 'hand' | 'plow' | 'seed';
export type TileType = 'grass' | 'soil' | 'plowed' | 'water' | 'path';
export type BuildingKind = 'pen' | 'production' | 'fishing';
export type EventKind = 'crows' | 'merchant' | 'lucky' | 'rain_blessing' | 'market_rush';

// ---- Static game data ----

export interface ItemDef {
  name: string;
  icon: string;
  sell: number;
  level: number;
}

export interface CropDef {
  item: string;
  grow: number;
  seedCost: number;
  yieldMin: number;
  yieldMax: number;
  level: number;
  xp: number;
}

export interface AnimalBody {
  w: number;
  h: number;
  color: string;
  accent: string;
  beak: string;
}

export interface AnimalDef {
  name: string;
  produces: string;
  feedCost: number;
  produceTime: number;
  price: number;
  level: number;
  xp: number;
  body: AnimalBody;
}

export interface Recipe {
  in: Record<string, number>;
  out: Record<string, number>;
  time: number;
  xp: number;
  lvl?: number;
}

export interface BuildingDef {
  name: string;
  kind: BuildingKind;
  w: number;
  h: number;
  price: number;
  level: number;
  animal?: string;
  capacity?: number;
  recipes?: Recipe[];
}

export interface DecorationDef {
  name: string;
  price: number;
  level: number;
  w: number;
  h: number;
  effect?: string;
}

export interface OrchardDef {
  name: string;
  fruit: string;
  seedCost: number;
  grow: number;
  cycle: number;
  yieldMin: number;
  yieldMax: number;
  level: number;
  xp: number;
}

export interface FishDef {
  weight: number;
  sell: number;
  xp: number;
  level: number;
}

export interface SeasonInfo {
  tint: string;
  ambient: string;
  name: string;
  growthMod: number;
}

export interface WeatherInfo {
  name: string;
  growthMod: number;
  emoji: string;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState) => boolean;
}

// ---- Runtime entities ----

export interface Tile {
  type: TileType;
  crop: string | null;
  plantedAt: number;
  watered: boolean;
  building: string | null;
  tree?: boolean;
}

export interface BuildingInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  smokeT?: number;
}

export interface PenAnimal {
  kind: string;
  lastProduced: number;
  ax: number;
  ay: number;
  tx: number;
  ty: number;
  frameT: number;
  frame: number;
}

export interface ProductionJob {
  recipeIdx: number;
  startTime: number;
  doneAt: number;
}

export interface OrderItem {
  [itemKey: string]: number;
}

export interface Order {
  id: string;
  items: OrderItem;
  reward: number;
  xp: number;
}

export interface QuestReward {
  coins: number;
  xp: number;
}

export type QuestKind = 'harvest' | 'sell' | 'produce' | 'earn' | 'orders' | 'fish';

export interface Quest {
  id: string;
  kind: QuestKind;
  item?: string;
  target: number;
  progress: number;
  desc: string;
  reward: QuestReward;
  complete?: boolean;
}

export interface Decoration {
  id: string;
  type: string;
  x: number;
  y: number;
}

export interface Tree {
  id: string;
  type: string;
  x: number;
  y: number;
  plantedAt: number;
  lastHarvested: number;
}

export interface Crow {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  targetTile: { x: number; y: number } | null;
  state: 'flying' | 'eating' | 'escaped';
  t: number;
  eatT: number;
  frame: number;
  frameT: number;
  scared: boolean;
  dx?: number;
}

export interface Dog {
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: string;
  t: number;
  frame: number;
  frameT: number;
  bonusTimer: number;
}

export interface FishingState {
  active: boolean;
  fishKind: string;
  pos: number;
  dir: number;
  speed: number;
  zoneStart: number;
  zoneWidth: number;
}

export interface ActiveEvent {
  kind: EventKind;
  until: number;
  msg: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: string;
  size: number;
  isRain?: boolean;
  isSnow?: boolean;
  isWind?: boolean;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
}

export interface PlacingState {
  type?: string;
  decor?: boolean;
  tree?: string;
}

export interface GameStats {
  harvested: number;
  sold: number;
  planted: number;
  produced: number;
  plowed: number;
  earned: number;
  animalsOwned: number;
  ordersFulfilled: number;
  questsDone: number;
  fishCaught: number;
  decorsPlaced: number;
  treesGrown: number;
  crowsShooed: number;
  itemsProduced: Record<string, number>;
}

export interface GameState {
  coins: number;
  xp: number;
  level: number;
  day: number;
  startTime: number;
  selectedTool: ToolKind;
  selectedSeed: string;
  grid: Tile[][];
  inv: Record<string, number>;
  buildings: BuildingInstance[];
  penAnimals: Record<string, PenAnimal[]>;
  prodQueues: Record<string, ProductionJob[]>;
  orders: Order[];
  camX: number;
  camY: number;
  camScale: number;
  particles: Particle[];
  floats: FloatText[];
  stats: GameStats;
  placing: PlacingState | null;
  quests: Quest[];
  achievements: Record<string, number>;
  season: Season;
  seasonDay: number;
  weather: Weather;
  weatherUntil: number;
  event: ActiveEvent | null;
  eventCooldown: number;
  penFeed: Record<string, number>;
  decor: Decoration[];
  trees: Tree[];
  crows: Crow[];
  dog: Dog | null;
  fishing: FishingState | null;
  musicOn: boolean;
  sfxOn: boolean;
  // Internal periodic timers
  _weatherPartT?: number;
  _orderTick?: number;
  _saveTick?: number;
}

// ---- Sprite cache shape ----

export interface SpriteCache {
  grass: HTMLCanvasElement;
  soil: HTMLCanvasElement;
  plowed: HTMLCanvasElement;
  path: HTMLCanvasElement;
  water: HTMLCanvasElement;
  crops: Record<string, HTMLCanvasElement[]>;
  item: Record<string, HTMLCanvasElement>;
  animal: Record<string, HTMLCanvasElement[]>;
  building: Record<string, HTMLCanvasElement>;
  decor: Record<string, HTMLCanvasElement>;
  orchard: Record<string, HTMLCanvasElement[]>;
  crow: HTMLCanvasElement[];
  dog: HTMLCanvasElement[];
}
