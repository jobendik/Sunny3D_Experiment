import { BUILDINGS } from '../data/buildings';
import { openPenPanel } from './pen-panel';
import { openProductionPanel } from './production-panel';
import { openFishingPanel } from './fishing-panel';
import type { BuildingInstance } from '../types';

export function openBuildingPanel(b: BuildingInstance): void {
  const def = BUILDINGS[b.type]!;
  if (def.kind === 'pen') openPenPanel(b);
  else if (def.kind === 'production') openProductionPanel(b);
  else if (def.kind === 'fishing') openFishingPanel();
}
