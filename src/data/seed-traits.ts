// =============================================================
//  SEED TRAITS — variants on standard crops you can win or
//  craft. Each trait modifies grow time / yield / resilience.
// =============================================================

export type SeedTrait = 'fast' | 'bountiful' | 'resilient' | 'hybrid';

export interface SeedTraitDef {
  id: SeedTrait;
  name: string;
  desc: string;
  // multipliers
  growMult: number;
  yieldMult: number;
  witherTolerance: number; // % extra time before wither
  icon: string;
}

export const SEED_TRAITS: Record<SeedTrait, SeedTraitDef> = {
  fast:       { id: 'fast',       name: 'Fast',       desc: '−25% grow time, −10% yield', icon: '⚡',
                growMult: 0.75, yieldMult: 0.9, witherTolerance: 0 },
  bountiful:  { id: 'bountiful',  name: 'Bountiful',  desc: '+50% yield, +20% grow time', icon: '🌟',
                growMult: 1.2, yieldMult: 1.5, witherTolerance: 0 },
  resilient: { id: 'resilient', name: 'Resilient', desc: '+150% wither tolerance, +5% yield', icon: '🛡️',
                growMult: 1.0, yieldMult: 1.05, witherTolerance: 1.5 },
  hybrid:     { id: 'hybrid',     name: 'Hybrid',     desc: '+15% yield and -5% time. Crossbred only.', icon: '🧬',
                growMult: 0.95, yieldMult: 1.15, witherTolerance: 0.25 },
};
