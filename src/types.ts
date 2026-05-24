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

// Tile-level obstacle that physically blocks plowing/planting/building.
// Distinct from purely decorative items (wildflowers, mushrooms) which
// live in their own scatter system and do not block gameplay.
//
// `kind` mirrors the ObstacleKind enum used by the expansion plot
// system so the per-tile obstacle and the abstract "plot has N rocks"
// view share vocabulary.
export interface TileObstacle {
  kind: ObstacleKind;
  variant: number;       // 0..3 — for visual variety, deterministic per tile
}

// Region ids carved into the world by world-gen. The five expansion
// region ids match the existing `state.expansion.plots` keys so the
// expansion system can flip whole regions unlocked atomically.
export type RegionId =
  | 'home'           // central starting farm — always unlocked
  | 'east_meadow'
  | 'old_orchard'
  | 'river_bend'
  | 'windy_hill'
  | 'forest_edge'    // 4 corner natural border — unlocks at L16
  ;

export interface Tile {
  type: TileType;
  crop: string | null;
  plantedAt: number;
  watered: boolean;
  building: string | null;
  tree?: boolean;
  // Region & unlock state. `region` is set once by world-gen and never
  // changes during play. `unlocked` is flipped by the expansion system
  // when its containing plot completes. Both are optional so legacy
  // saves load cleanly — initGrid()/migration backfills them.
  region?: RegionId;
  unlocked?: boolean;
  // Tile-level obstacle. When set, the tile is rendered with the
  // obstacle's mesh and plowing/planting/building is blocked until the
  // obstacle is cleared.
  obstacle?: TileObstacle | null;
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
  // FV3 lifecycle. Legacy saves omit these; the lifecycle ticker
  // backfills them as 'adult' so the existing herd is untouched.
  bornAt?: number;                      // timestamp of spawn
  stage?: 'baby' | 'adult' | 'mature';
  produceCount?: number;                 // increments on each successful collect
  /** True while the player has marked this animal for sale (clears
   *  a housing slot once the current production cycle completes). */
  pendingSell?: boolean;
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
  // Customer info — set by generator. Legacy saves may omit and we hydrate
  // a default on load so renderers can rely on it.
  customerId?: string;
  greet?: string;
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
  /** Multi-phase difficulty: phases 1..N alternate marker direction and
   *  shrink the safe zone. Player must time the hook on the *current*
   *  phase. */
  phase?: number;
  totalPhases?: number;
  /** Wall-clock deadline (seconds) — once exceeded the fish flees. */
  expiresAt?: number;
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

// ---- Retention / progression / mastery sub-states ----

export interface DailyChallenge {
  id: string;
  kind: QuestKind;
  item?: string;
  target: number;
  progress: number;
  desc: string;
  reward: QuestReward;
  bonusReward?: QuestReward;
  complete?: boolean;
  claimed?: boolean;
}

export interface MerchantSlot {
  item: string;
  price: number;
  stock: number;
  bought: number;
}

export interface DailyState {
  lastSeenDay: number;
  streak: number;
  streakClaimedDay: number;
  longestStreak: number;
  graceTokens: number;
  challenges: DailyChallenge[];
  challengeDay: number;
  rerollsLeft: number;
  merchantDay: number;
  merchantStock: MerchantSlot[];
  timedClaim: { readyAt: number; claimed: boolean };
  forecast: { day: number; predicted: Weather; guessed?: boolean; correct?: boolean };
  lastVisitTime: number;
  pendingReturnGift: { coins: number; xp: number; hours: number };
  returnGiftClaimed?: boolean;
}

export interface WeeklyTheme {
  id: string;
  name: string;
  icon: string;
  focus: 'orchard' | 'fish' | 'bakery' | 'pen' | 'crop' | 'craft';
}

export interface WeeklyState {
  week: number;
  points: number;
  tier: number;
  themeIdx: number;
  claimedTiers: number[];
  communityTarget: number;
  communityProgress: number;
  communityClaimed: boolean;
}

export interface WeatherGridState {
  slots: Array<string | null>;
  activations: Array<{
    slottedCards: string[];
    until: number;
    startedAt: number;
  }>;
  charges: number;
  lastRegenDay: number;
  ownedCards: string[];
  unlocked: boolean;
}

export interface SpecializationState {
  primary: 'crop' | 'ranch' | 'artisan' | 'fisher' | null;
  secondary: 'crop' | 'ranch' | 'artisan' | 'fisher' | null;
  switches: number;
}

export interface CollectionRoot {
  discovered: Record<string, Record<string, number>>;
  firstRewardClaimed: Record<string, true>;
}

export interface MarketState {
  day: number;
  modifiers: Record<string, number>;
  scarcityItem: string | null;
  scarcityUntil: number;
}

export interface SoilState {
  grid: Array<Array<{ moisture: number; fertility: number }>>;
  lastTick: number;
}

export interface MoodRoot {
  mood: Record<string, number>;
  lastTick: number;
}

export interface AnimalCareRoot {
  autoFeedPens: Record<string, true>;
}

export interface BiomeRoot {
  current: 'pond' | 'river' | 'deep';
  activeBait: string | null;
  baitUntil: number;
}

export interface PrestigeRoot {
  prestigeCount: number;
  talents: number;
  perks: Record<string, number>;
  totalLifetimeXP: number;
  totalLifetimeCoins: number;
}

export interface TutorialRoot {
  stepIdx: number;
  completed: boolean;
  dismissed: boolean;
}

export interface DeferredPayout {
  at: number;
  coins: number;
  xp: number;
}

export interface WheelRoot {
  lastSpinDay: number;
  spinning: boolean;
  pendingResult: number | null;
}

export interface ComboRoot {
  count: number;
  lastAt: number;
  highest: number;
}

export interface TreasuresRoot {
  chests: Array<{
    id: string;
    gx: number;
    gy: number;
    spawnedAt: number;
    expiresAt: number;
    rare: boolean;
  }>;
  lastSpawnAt: number;
}

export interface PassRoot {
  startDay: number;
  durationDays: number;
  points: number;
  tier: number;
  claimed: number[];
  /** Premium-tier ledgers — only populated once the matching track
   *  is unlocked via Order-Board cycles (CrazyGames-safe: no
   *  real-money tier). */
  claimedElite?: number[];
  claimedPlatinum?: number[];
  /** Order-Board cycles completed in the current pass window. */
  cyclesThisPass?: number;
  /** Gameplay-earned bundle cards claimed from the shop Pass tab. */
  claimedBundles?: string[];
}

export interface VisitorRoot {
  lastVisitDay: number;
}

// ---- Roadmap expansion: storage, market stall, gazette, deliveries,
//      landmarks, friendship, mastery ----

export interface StorageRoot {
  barn: { level: number; capacity: number };
  silo: { level: number; capacity: number };
}

export interface MarketStallSlot {
  id: string;
  itemKey: string;
  qty: number;
  pricePerUnit: number;
  listedAt: number;   // seconds (game time)
  saleProb: number;   // 0..1 per minute baseline
  buyerName?: string; // populated when sold
  status: 'listed' | 'sold';
}

export interface MarketStallRoot {
  unlocked: boolean;
  slots: MarketStallSlot[];
  maxSlots: number;
  reputation: number; // 0..1000
  lifetimeSales: number;
  lastTick: number;   // seconds
  pendingCoins: number; // coins from sales that finished while away
  listedToday?: number;
  lastListingDay?: number;
}

export type GazetteArticleType =
  | 'forecast'
  | 'hot_item'
  | 'help_request'
  | 'neighbor_sale'
  | 'event_notice'
  | 'tip';

export interface GazetteArticle {
  type: GazetteArticleType;
  title: string;
  body: string;
  data?: Record<string, string | number>;
}

export interface NeighborSaleOffer {
  neighborId: string;
  itemKey: string;
  qty: number;
  pricePerUnit: number;
  bought: boolean;
}

export interface HelpRequestOffer {
  id: string;
  neighborId: string;
  itemKey: string;
  qty: number;
  rewardCoins: number;
  rewardXp: number;
  rewardMaterial?: string;
  done: boolean;
}

export interface GazetteRoot {
  day: number;
  articles: GazetteArticle[];
  hotItem: { itemKey: string; bonus: number } | null;
  neighborSales: NeighborSaleOffer[];
  helpRequests: HelpRequestOffer[];
  lastReadDay: number;
}

export interface BoatCrate {
  itemKey: string;
  needed: number;
  filled: number;
}

export interface BoatRoot {
  unlocked: boolean;
  arrivesAt: number;   // seconds (game time)
  departsAt: number;
  crates: BoatCrate[];
  boatName: string;
  bonusMaterial?: string;
  state: 'arriving' | 'docked' | 'departed';
}

export interface TrainCrate {
  itemKey: string;
  qty: number;
}

export interface TrainRoot {
  unlocked: boolean;
  status: 'idle' | 'loaded' | 'away' | 'returned';
  returnsAt: number; // seconds (game time)
  loadedCrates: TrainCrate[];   // what player loaded for next trip
  pendingRewards: Record<string, number>; // materials waiting to be claimed
  routeId: string;
  level: number;
}

export interface LandmarkStage {
  name: string;
  reqs: Record<string, number>; // item key -> qty
  rewardCoins: number;
  rewardXp: number;
  rewardMaterial?: string;
}

export interface LandmarkProject {
  id: string;
  stageIdx: number;
  contributed: Record<string, number>; // ongoing contributions for current stage
  completed: boolean;
}

export interface LandmarksRoot {
  projects: Record<string, LandmarkProject>;
}

export interface FriendshipEntry {
  level: number;
  xp: number;
  lastGiftDay: number;
  totalDeliveries: number;
}

export interface FriendshipRoot {
  byNeighbor: Record<string, FriendshipEntry>;
  giftsClaimedToday?: number;
  lastGiftCapDay?: number;
}

export interface BuildingMasteryEntry {
  produced: number; // total recipe completions for this building type
  stars: number;    // 0..3
}

export interface BuildingMasteryRoot {
  byBuildingType: Record<string, BuildingMasteryEntry>;
}

export type MaterialKey =
  | 'plank' | 'nail' | 'screw' | 'hinge' | 'paint'   // barn materials
  | 'panel' | 'bolt' | 'rope' | 'tarp'                // silo materials
  | 'deed' | 'stake' | 'map' | 'mallet'              // expansion materials
  | 'axe' | 'saw' | 'shovel' | 'pickaxe' | 'lantern' // clearing/expedition tools
  | 'fragment' | 'token' | 'compost'                 // misc rewards
  ;

// ---- Phase 4 expansion: Balloon & Festival Cart ----

export interface BalloonRequest {
  itemKey: string;
  qty: number;
}
export interface BalloonRoot {
  active: boolean;
  leavesAt: number;       // seconds (game time)
  nextAt: number;
  requests: BalloonRequest[];
  rewardCoins: number;
  rewardMaterial?: string;
  rewardFragments: number;
}

export interface FestivalCartRoot {
  unlocked: boolean;
  themeId: string;        // e.g. 'baking', 'orchard', 'ranching', 'fishing', 'craft'
  weekIndex: number;
  requests: BalloonRequest[];
  delivered: Record<string, number>;
  points: number;
  pointGoal: number;
  rewardClaimed: boolean;
  endsAt: number;
}

// ---- Phase 5: Land Expansion & Obstacles ----

export type PlotStatus = 'locked' | 'unlockable' | 'clearing' | 'unlocked';
export type ObstacleKind = 'bush' | 'log' | 'rock' | 'mud' | 'bramble' | 'stump';

export interface PlotObstacle {
  id: string;
  kind: ObstacleKind;
  cleared: boolean;
}

export interface PlotState {
  id: string;
  status: PlotStatus;
  unlockLevel: number;
  obstacles: PlotObstacle[];
}

export interface ExpansionRoot {
  plots: Record<string, PlotState>;
}

// ---- Phase 9: Farming Club ----

export interface ClubMember {
  id: string;
  name: string;
  emoji: string;
  isSimulated: boolean;
  contribution: number;
  lastContributionAt: number;
}

export type ClubChatKind = 'system' | 'sim' | 'player';

export interface ClubChatMessage {
  id: string;
  kind: ClubChatKind;
  authorId: string;
  authorName: string;
  emoji: string;
  text: string;
  createdAt: number; // epoch ms; no save rebase needed
}

export interface ClubChatRoot {
  messages: ClubChatMessage[];
  unread: number;
  lastReadAt: number;
  nextSimAt: number; // epoch seconds
}

export type ClubRequestStatus = 'open' | 'filled' | 'claimed' | 'expired';

export interface ClubDonationRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  emoji: string;
  itemKey: string;
  qtyRequested: number;
  qtyFilled: number;
  status: ClubRequestStatus;
  isPlayerRequest: boolean;
  createdAt: number; // epoch seconds
  expiresAt: number; // epoch seconds
  claimedAt?: number;
}

export interface ClubRequestBoardRoot {
  requests: ClubDonationRequest[];
  playerRequestId: string | null;
  donatedToday: number;
  receivedToday: number;
  lastGiftDay: number;
  nextSimRequestAt: number; // epoch seconds
  nextSimFillAt: number; // epoch seconds
}

export interface ClubRoot {
  unlocked: boolean;
  level: number;
  weekIndex: number;
  themeId: string;
  playerContribution: number;
  totalContribution: number;
  goal: number;
  milestonesClaimed: number[];
  members: ClubMember[];
  bannerCount: number;
  chat?: ClubChatRoot;
  requestBoard?: ClubRequestBoardRoot;
}

// ---- Phase 10: Village Hub ----

export interface VillageRoot {
  reputation: number;     // 0..1000
  visitedToday: Record<string, boolean>; // node id -> visited
  lastVisitDay: number;
}

// ---- Phase 11-12: Expeditions & Energy ----

export interface ExpeditionNode {
  id: string;
  kind: 'clear' | 'chest' | 'gather' | 'repair' | 'fish' | 'puzzle';
  label: string;
  costEnergy: number;
  costItems?: Record<string, number>;
  rewardCoins: number;
  rewardXp: number;
  rewardItems?: Record<string, number>;
  completed: boolean;
}

export interface ExpeditionMap {
  id: string;
  name: string;
  emoji: string;
  unlockLevel: number;
  nodes: ExpeditionNode[];
  expiresAt: number;  // for limited-time maps; 0 = perm
}

export interface ExpeditionsRoot {
  unlocked: boolean;
  energy: number;
  energyMax: number;
  energyLastRegen: number;
  activeMapId: string | null;
  maps: Record<string, ExpeditionMap>;
  dailyBonusDay: number;
}

// ---- Phase 13: Beauty Contest ----

export interface ContestRoot {
  weekIndex: number;
  themeId: string;
  points: number;
  rewardClaimed: boolean;
}

// ---- Phase 14: Live-Ops Events ----

export interface LiveEventRoot {
  activeId: string | null;
  weekIndex: number;
  points: number;
  rewardsClaimed: number[];
  tokens: number;        // event currency
  history: string[];     // event ids completed
}

// ---- Phase 8: Featured live-ops calendar events ----

export type FeaturedEventAction =
  | 'harvest'
  | 'produce'
  | 'order_contains'
  | 'fish_caught'
  | 'animal_produce'
  | 'tree_harvest'
  | 'card_cast'
  | 'balloon_served';

export interface FeaturedLeaderboardEntry {
  id: string;
  name: string;
  emoji: string;
  points: number;
  isPlayer?: boolean;
}

export interface SkyRaceTask {
  id: string;
  label: string;
  actionId: FeaturedEventAction;
  itemKey?: string;
  target: number;
  progress: number;
  points: number;
  rewardCoins: number;
  rewardXp: number;
  rewardItem?: string;
  rewardQty?: number;
  claimed: boolean;
}

export interface SkyRaceRoot {
  weekIndex: number;
  points: number;
  tasks: SkyRaceTask[];
  rewardsClaimed: number[];
  leaderboard: FeaturedLeaderboardEntry[];
}

export type CountyFairCategory = 'crop' | 'animal' | 'bake' | 'fish' | 'fruit';
export type CountyFairRibbon = 'none' | 'bronze' | 'silver' | 'gold' | 'blue';

export interface CountyFairSubmission {
  itemKey: string;
  score: number;
  ribbon: CountyFairRibbon;
  submittedDay: number;
}

export interface CountyFairRoot {
  monthIndex: number;
  category: CountyFairCategory;
  submitted: CountyFairSubmission | null;
  rewardClaimed: boolean;
  peerScores: FeaturedLeaderboardEntry[];
}

export interface CampingChapterState {
  id: string;
  title: string;
  body: string;
  threshold: number;
  rewardCoins: number;
  rewardXp: number;
  rewardItem?: string;
  rewardQty?: number;
}

export interface CountryCampingRoot {
  seasonIndex: number;
  points: number;
  claimedChapters: number[];
  journal: string[];
}

export interface FishingTournamentRoot {
  weekIndex: number;
  points: number;
  catches: number;
  heaviest: number;
  rewardsClaimed: number[];
  leaderboard: FeaturedLeaderboardEntry[];
}

// ---- Phase 15.4: Compost ----

export interface CompostRoot {
  bin: number;            // current compost stored
  binCap: number;
  ferment: number;        // amount currently fermenting
  fermentDoneAt: number;
}

// ---- Phase 15.6: Animal breeds ----

export interface AnimalBreedRoot {
  byPen: Record<string, string>; // building id -> breed key
  unlocked: Record<string, true>;
}

// ---- Phase 15.7: Visitor 2.0 ----

export interface ActiveVisitor {
  id: string;
  name: string;
  emoji: string;
  itemKey: string;
  qty: number;
  reward: number;
  tipChance: number;
  arrivedAt: number;
  expiresAt: number;
  served: boolean;
}

export interface VisitorsRootV2 {
  active: ActiveVisitor[];
  nextSpawnAt: number;
  totalServed: number;
}

// ---- Phase 15.8: Farm Reputation ----

export interface ReputationRoot {
  score: number;
  tier: number;          // 0..4
  lastUpdate: number;
}

// ---- Phase 15.9: Card Fusion ----

export interface CardFusionRoot {
  fragments: number;
  fusedCards: string[];  // fused card ids
}

// ---- Phase 15.10: Forecast Planning ----

export interface ForecastRoot {
  days: Array<{ day: number; weather: Weather }>;
}

// ---- Phase 15.13: Helpers ----

export interface Helper {
  id: string;
  role: 'collector' | 'restocker' | 'waterer' | 'seller';
  hiredUntil: number;
}
export interface HelpersRoot {
  hired: Helper[];
}

// ---- Phase 15.14: Journal ----

export interface JournalEntry {
  id: string;
  at: number;            // game seconds when recorded
  title: string;
  body: string;
  icon: string;
}
export interface JournalRoot {
  entries: JournalEntry[];
  flags: Record<string, true>;   // which milestone flags fired
}

// ---- Phase 15.17: Market Contracts ----

export interface ContractDef {
  id: string;
  customerId: string;
  items: Record<string, number>;
  delivered: Record<string, number>;
  rewardCoins: number;
  rewardXp: number;
  rewardMaterial?: string;
  expiresAt: number;
  signedAt: number;
}
export interface ContractsRoot {
  active: ContractDef[];
  offers: ContractDef[];
  nextOfferAt: number;
}

// ---- Phase 15.19: Weather Hazards ----

export interface HazardsRoot {
  active: Array<{ kind: string; until: number }>;
  preparedFlags: Record<string, true>; // 'heater', 'cover', 'irrigation', etc.
}

// ---- Phase 15.20: Friend codes ----

export interface FriendCodeRoot {
  myCode: string;
  added: Array<{ code: string; name: string; addedAt: number }>;
}

// ---- Greenhouse functional ----

export interface GreenhouseSlot {
  cropKey: string;
  plantedAt: number;
  doneAt: number;
}
export interface GreenhouseRoot {
  unlocked: boolean;
  slots: GreenhouseSlot[];
  cap: number;
}

// ---- Tool Shed ----

export interface ToolShedRoot {
  unlocked: boolean;
  bonusSpeed: number;    // multiplier (e.g. 0.05 = +5% expedition clearing speed)
}

// ---- Building per-instance upgrades ----

export interface BuildingUpgradeRoot {
  byBuildingId: Record<string, number>; // building id -> level
}

// ---- Decoration sets ----

export interface DecorSetsRoot {
  collectedSets: Record<string, true>;  // set id -> collected
}

// ---- Mailbox & Alfred letters / gift cards (Hay Day-style) ----

export type MailKind = 'letter' | 'giftcard' | 'system' | 'event';

export interface MailLetter {
  id: string;
  kind: MailKind;
  senderId: string;       // villager id, "alfred", or "system"
  title: string;
  body: string;
  read: boolean;
  receivedAt: number;     // game seconds
  reward?: {
    coins?: number;
    gems?: number;
    xp?: number;
    items?: Record<string, number>;
  };
  claimed?: boolean;      // for letters with rewards
}

export interface MailboxRoot {
  letters: MailLetter[];          // up to MAILBOX_CAP (40)
  lastDeliveryDay: number;
  lettersDeliveredToday: number;  // resets daily, max 7
  totalReceived: number;
}

// ---- Surprise Box (daily random-outcome box) ----

export interface SurpriseBoxRoot {
  pending: boolean;          // a box is available right now
  nextSpawnAt: number;       // when next box will spawn
  lastOpenedDay: number;
  totalOpened: number;
  rarity: 'common' | 'rare' | 'epic';
}

// ---- Piggy Bank (Hay Day-style seasonal token storage) ----

export interface PiggyBankRoot {
  gems: number;              // accumulating bonus gems unlocked when broken
  cap: number;               // max gems it can hold this season
  seasonStartDay: number;    // when this season's piggy started filling
  broken: boolean;           // can claim and reset
  fillSinceLastBreak: number;
}

// ---- Daily Deal (newspaper front-page premium offer) ----

export interface DailyDealRoot {
  day: number;
  itemKey: string;
  qty: number;
  diamondCost: number;
  baseCost: number;         // for showing discount %
  bought: boolean;
}

// ---- Phase 6: offer grammar / Maggie / weekly shop ----

export interface MaggieOffer {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  items: Record<string, number>;
  costCoins: number;
  costGems: number;
  discountPct: number;
  bought: boolean;
}

export interface MaggieOffersRoot {
  visitId: string;
  themeId: string;
  themeName: string;
  dayStarted: number;
  activeUntilDay: number;
  nextVisitDay: number;
  offers: MaggieOffer[];
  lastSeenVisitId?: string;
}

export interface WeeklyShopOffer {
  id: string;
  title: string;
  emoji: string;
  itemKey: string;
  qty: number;
  costCoins: number;
  discountPct: number;
  bought: number;
  maxBuys: number;
}

export interface WeeklyShopRoot {
  weekIndex: number;
  startDay: number;
  endsDay: number;
  offers: WeeklyShopOffer[];
  lastSeenWeek?: number;
}

// ---- Sanctuary (wildlife sightings book) ----

export interface SanctuarySpecies {
  id: string;
  name: string;
  emoji: string;
  category: 'bird' | 'mammal' | 'reptile' | 'insect' | 'mythic';
  habitat: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface SanctuaryRoot {
  unlocked: boolean;
  sightings: Record<string, { firstSeen: number; count: number }>;
  active: { id: string; spawnedAt: number; expiresAt: number; gx: number; gy: number } | null;
  nextSpawnAt: number;
  totalSightings: number;
}

// ---- Phase 10.1: Imperfect Produce CSR campaign ----

export interface ImperfectProduceRoot {
  unlocked: boolean;
  windowStartDay: number;
  windowEndsDay: number;
  nextWindowDay: number;
  /** Imperfect units waiting in the barn, keyed by item id. */
  imperfectByItem: Record<string, number>;
  totalImperfectFlagged: number;
  totalImperfectSold: number;
  totalBonusEarned: number;
  lifetimeImperfect: number;
  lastShownStartDay: number;
}

// ---- Phase 10.2: Habitat partnership cosmetic tracker ----

export interface HabitatPartnerRoot {
  /** Symbolic "acres restored" — never real currency. */
  acresRestored: number;
  lastMilestoneShown: number;
  contributions: {
    harvest: number;
    order: number;
    fish: number;
    sale: number;
    landmark: number;
    expedition: number;
    weatherCast: number;
    donate: number;
  };
}

// ---- CrazyGames rewarded ads — opt-in bonus rewards ----

export interface AdRewardsRoot {
  /** Free extra Daily Wheel spins purchased with ad views (today only). */
  bonusSpins: number;
  /** Remaining 2× harvest yields the player has banked. Consumed on
   *  the next successful harvest each. */
  harvestBoostUses: number;
  /** ms-since-epoch of the last successful ad watch — used to throttle
   *  back-to-back ad offers and avoid abusive spam patterns. */
  lastAdAt: number;
  /** Total rewarded ads watched, lifetime. Telemetry / debug only. */
  totalWatched: number;
}

// ---- Settings (accessibility / scenic mode preferences) ----

export interface SettingsRoot {
  reducedMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
  familyFriendly: boolean;
  notificationsOn?: boolean;
  scenicMode: boolean;       // toggle to hide HUD
  hapticOn: boolean;
  /** Game-pace preset. 'fast' = default (1×), 'cozy' = slower crop growth
   *  and day cycle (2×), 'relaxed' = even slower (3×). Lets casual players
   *  preserve the "come back tomorrow" anticipation that fast crops break. */
  gamePace?: 'fast' | 'cozy' | 'relaxed';
}

export interface GameState {
  coins: number;
  gems: number;
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
  camYaw: number;
  camPitch: number;
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
  // Retention systems
  daily?: DailyState;
  weekly?: WeeklyState;
  weatherGrid?: WeatherGridState;
  specialization?: SpecializationState;
  collection?: CollectionRoot;
  market?: MarketState;
  soil?: SoilState;
  mood?: MoodRoot;
  animalCare?: AnimalCareRoot;
  biome?: BiomeRoot;
  prestige?: PrestigeRoot;
  tutorial?: TutorialRoot;
  deferredPayouts?: DeferredPayout[];
  qualityFlags?: Record<string, boolean>;
  // Seed traits per planted tile (keyed by gx,gy concatenation)
  tileTraits?: Record<string, string>;
  // Identity & cosmetics
  farmName?: string;
  // CrazyGames-launch retention extras
  wheel?: WheelRoot;
  combo?: ComboRoot;
  treasures?: TreasuresRoot;
  pass?: PassRoot;
  visitors?: VisitorRoot;
  lastSessionEndedAt?: number;
  // Roadmap expansion
  storage?: StorageRoot;
  marketStall?: MarketStallRoot;
  gazette?: GazetteRoot;
  boat?: BoatRoot;
  train?: TrainRoot;
  landmarks?: LandmarksRoot;
  friendship?: FriendshipRoot;
  buildingMastery?: BuildingMasteryRoot;
  // Phase 4-15 expansion (v5+)
  balloon?: BalloonRoot;
  festivalCart?: FestivalCartRoot;
  expansion?: ExpansionRoot;
  club?: ClubRoot;
  village?: VillageRoot;
  expeditions?: ExpeditionsRoot;
  contest?: ContestRoot;
  liveEvent?: LiveEventRoot;
  skyRace?: SkyRaceRoot;
  countyFair?: CountyFairRoot;
  countryCamping?: CountryCampingRoot;
  fishingTournament?: FishingTournamentRoot;
  compost?: CompostRoot;
  breeds?: AnimalBreedRoot;
  visitorsV2?: VisitorsRootV2;
  reputation?: ReputationRoot;
  cardFusion?: CardFusionRoot;
  forecast?: ForecastRoot;
  helpers?: HelpersRoot;
  journal?: JournalRoot;
  contracts?: ContractsRoot;
  hazards?: HazardsRoot;
  friendCodes?: FriendCodeRoot;
  greenhouse?: GreenhouseRoot;
  toolShed?: ToolShedRoot;
  buildingUpgrades?: BuildingUpgradeRoot;
  decorSets?: DecorSetsRoot;
  // Hay Day-grammar additions (v7+)
  mailbox?: MailboxRoot;
  surpriseBox?: SurpriseBoxRoot;
  piggyBank?: PiggyBankRoot;
  dailyDeal?: DailyDealRoot;
  maggieOffers?: MaggieOffersRoot;
  weeklyShop?: WeeklyShopRoot;
  sanctuary?: SanctuaryRoot;
  settings?: SettingsRoot;
  // Phase 10: real-world CSR campaigns
  imperfectProduce?: ImperfectProduceRoot;
  habitatPartner?: HabitatPartnerRoot;
  // CrazyGames rewarded-ad rewards. Survives reloads so a primed
  // harvest-boost doesn't evaporate if the player closes the tab.
  adRewards?: AdRewardsRoot;
  saveVersion?: number;
  // Internal periodic timers
  _weatherPartT?: number;
  _orderTick?: number;
  _saveTick?: number;
  _dailyTick?: number;
  _moodTick?: number;
  _soilTick?: number;
  _stallTick?: number;
  _boatTick?: number;
  _trainTick?: number;
  _balloonTick?: number;
  _visitorTick?: number;
  _contractsTick?: number;
  _liveEventTick?: number;
  _surpriseBoxTick?: number;
  _sanctuaryTick?: number;
  _mailboxTick?: number;
  _requestBoardTick?: number;
}

// ---- Sprite cache shape ----

export interface SpriteCache {
  grass: HTMLCanvasElement;
  soil: HTMLCanvasElement;
  plowed: HTMLCanvasElement;
  path: HTMLCanvasElement;
  water: HTMLCanvasElement;
  waterFrames: HTMLCanvasElement[];
  crops: Record<string, HTMLCanvasElement[]>;
  item: Record<string, HTMLCanvasElement>;
  animal: Record<string, HTMLCanvasElement[]>;
  building: Record<string, HTMLCanvasElement>;
  decor: Record<string, HTMLCanvasElement>;
  orchard: Record<string, HTMLCanvasElement[]>;
  crow: HTMLCanvasElement[];
  dog: HTMLCanvasElement[];
}
