// =============================================================
//  SPECIALIZATIONS — branch choices that define a player's
//  strategic identity. Each branch has minor perks at the
//  choice level and a major perk later.
// =============================================================

export type SpecBranch = 'crop' | 'ranch' | 'artisan' | 'fisher';

export interface SpecBranchDef {
  id: SpecBranch;
  name: string;
  desc: string;
  icon: string;
  effects: SpecEffects;
  fantasy: string;     // one-liner identity
}

export interface SpecEffects {
  cropGrowth?: number;    // +growth speed multiplier
  cropYield?: number;     // +yield multiplier
  animalSpeed?: number;   // -produce time
  animalYield?: number;   // produce volume
  produceSpeed?: number;  // production time reduction
  produceValue?: number;  // produced item sell bonus
  fishingRare?: number;   // rare fish bias
  fishingValue?: number;  // sell price multiplier on fish
  globalSell?: number;    // global sell bonus
  eventChance?: number;   // event trigger multiplier
}

export const SPECIALIZATIONS: Record<SpecBranch, SpecBranchDef> = {
  crop: {
    id: 'crop', name: 'Crop Baron', icon: '🌾',
    desc: 'Specializes in fields. Faster growth, bigger harvests.',
    effects: { cropGrowth: 0.20, cropYield: 0.15 },
    fantasy: 'Endless rolling fields swaying with grain.',
  },
  ranch: {
    id: 'ranch', name: 'Ranch Keeper', icon: '🐄',
    desc: 'Tames animals. Faster produce cycles and bigger pens.',
    effects: { animalSpeed: 0.20, animalYield: 0.15 },
    fantasy: 'A bustling farmyard of friendly animals.',
  },
  artisan: {
    id: 'artisan', name: 'Artisan Producer', icon: '🥐',
    desc: 'Master of crafted goods. Faster production and richer outputs.',
    effects: { produceSpeed: 0.18, produceValue: 0.18 },
    fantasy: 'Steaming bakeries, dairies, and looms.',
  },
  fisher: {
    id: 'fisher', name: 'Fisher Guild', icon: '🎣',
    desc: 'Lord of the lakes. Rare catches and richer fish sales.',
    effects: { fishingRare: 0.30, fishingValue: 0.25 },
    fantasy: 'Coastal trawlers and shimmering pearls.',
  },
};
