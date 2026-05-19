// =============================================================
//  BAIT TYPES — buyable consumables that bias fishing odds
//  toward rarer or more valuable catches.
// =============================================================

export interface BaitDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  rareBonus: number;        // pct bias toward rare fish weights
  valueBonus: number;       // pct sell-price bonus for caught fish
  level: number;
}

export const BAITS: Record<string, BaitDef> = {
  worm:  { id: 'worm',  name: 'Earthworm',   desc: 'Basic bait. Cheap.',
           price: 5, rareBonus: 0.10, valueBonus: 0, level: 3 },
  fly:   { id: 'fly',   name: 'Mayfly',      desc: 'Trout love mayflies.',
           price: 25, rareBonus: 0.25, valueBonus: 0.05, level: 5 },
  lure:  { id: 'lure',  name: 'Goldlure',    desc: 'Glitters — attracts rare fish.',
           price: 80, rareBonus: 0.50, valueBonus: 0.12, level: 7 },
};

export type BiomeId = 'pond' | 'river' | 'deep';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  desc: string;
  // weight bias by fish kind
  fishWeights: Record<string, number>;
  // unlock requirement
  level: number;
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  pond:  { id: 'pond',  name: 'Pond',  desc: 'Lazy still water. Common catches.',
           fishWeights: { bluefish: 70, trout: 25, goldfish: 5 },  level: 3 },
  river: { id: 'river', name: 'River', desc: 'Faster currents. Trout-heavy.',
           fishWeights: { bluefish: 30, trout: 55, goldfish: 15 }, level: 5 },
  deep:  { id: 'deep',  name: 'Deep Lake', desc: 'Mysterious depths. Goldfish!',
           fishWeights: { bluefish: 20, trout: 30, goldfish: 50 }, level: 7 },
};
