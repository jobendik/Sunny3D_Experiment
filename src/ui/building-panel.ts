import { BUILDINGS } from '../data/buildings';
import { lazy } from './lazy-panels';
import type { BuildingInstance } from '../types';

const lazyPen = lazy(() => import('./pen-panel'));
const lazyProduction = lazy(() => import('./production-panel'));
const lazyFishing = lazy(() => import('./fishing-panel'));

export function openBuildingPanel(b: BuildingInstance): void {
  const def = BUILDINGS[b.type]!;
  if (def.kind === 'pen') lazyPen.call('openPenPanel', b);
  else if (def.kind === 'production') lazyProduction.call('openProductionPanel', b);
  else if (def.kind === 'fishing') lazyFishing.call('openFishingPanel');
}
