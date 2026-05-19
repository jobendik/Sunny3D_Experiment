// =============================================================
//  TUNING CONFIG  — every balance constant lives here so that
//  live tuning, experimentation, and A/B testing stays trivial.
// =============================================================

export const CONFIG = {
  daily: {
    rolloverHourLocal: 4,               // a "day" ends at 4am local
    streakRewardCoinsBase: 50,
    streakRewardCoinsPerDay: 25,        // +25 each successive day
    streakRewardXpBase: 5,
    streakRewardXpPerDay: 3,
    streakCap: 7,                       // ladder repeats after 7
    challengeCount: 3,
    challengeRerollsPerDay: 1,
    graceTokensStart: 1,                // free streak-saves per week
    returnGiftCapHours: 24,             // soft cap on absence value
    returnGiftRateCoinsPerHour: 80,
    returnGiftRateXpPerHour: 6,
    timedClaimMinutes: 30,              // come-back-in-X timer length
  },
  weekly: {
    pointsForLevel: [0, 200, 500, 1000, 2000, 4000, 8000],
    rewardEveryTier: { coins: 250, xp: 30 },
  },
  market: {
    overstockThreshold: 30,             // qty in barn before penalty
    overstockMaxPenalty: 0.4,           // -40% at extreme overstock
    scarcityWindowMinutes: 15,          // boosted demand window
    scarcityMaxBonus: 0.5,              // +50% during scarcity
    festivalBonusByDay: [0.05, -0.05, 0.10, 0, -0.10, 0.15, 0],
  },
  weatherGrid: {
    slots: 4,                           // grid size
    chargesStart: 3,                    // free programmable casts
    chargesPerDay: 2,                   // regen daily
    chargeMaxStore: 8,
  },
  specializations: {
    pickAtLevel: 5,                     // first specialization choice
    secondaryAtLevel: 15,               // optional minor branch
  },
  prestige: {
    minLevel: 25,                       // required to prestige
    talentPerLevelOverMin: 1,
    talentBonus: 5,
  },
  soil: {
    moistureDecay: 0.02,                // per second
    moistureBoost: 0.25,                // max growth boost from moisture
    fertilityBoost: 0.30,               // max yield boost from fertility
    fertilityDrain: 0.1,                // per harvest
  },
  adjacency: {
    bonusPerNeighbor: 0.08,             // production speed per neighbor
    maxBonus: 0.32,
  },
  events: {
    cooldownMin: 90,
    cooldownMaxAdd: 120,
    triggerChance: 0.002,               // per frame baseline
  },
  beautification: {
    perDecorTier: [1, 3, 5, 8, 12],     // score per decor tier
    yieldBonusMax: 0.10,                // +10% global yield cap
  },
} as const;

// Player-facing tuning knobs (mirror the above for quick reads)
export type FeatureKey =
  | 'dailyStreak'
  | 'dailyChallenges'
  | 'objectiveRail'
  | 'weatherGrid'
  | 'specializations'
  | 'collection'
  | 'prestige'
  | 'marketDynamics'
  | 'eventChoices'
  | 'tutorial'
  | 'soilQuality'
  | 'adjacencyBuffs'
  | 'animalMood'
  | 'fishingBiomes'
  | 'beautification'
  | 'comeback'
  | 'weeklyTrack'
  | 'landmarks'
  | 'leaderboard'
  | 'telemetry';
