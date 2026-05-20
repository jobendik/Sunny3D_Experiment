// =============================================================
//  BUILDING REGISTRY
//
//  Maps each BUILDINGS[type] key to a procedural factory function
//  that returns a Group at local origin (0,0,0 = SW corner of the
//  footprint, on the ground plane).
//
//  Factories receive the building's footprint (w, d) so they can
//  scale parts to fit. Add a new building by writing a new file
//  next to this one and registering it below.
// =============================================================

import { Group } from 'three';
import { makeHenHouse } from './henhouse';
import { makeCowPen } from './cowpen';
import { makeSheepPen } from './sheeppen';
import { makePigPen } from './pigpen';
import { makeGoatPen } from './goatpen';
import { makeDuckPond } from './duckpond';
import { makeBakery } from './bakery';
import { makeDairy } from './dairy';
import { makeFeedMill } from './feedmill';
import { makeSugarMill } from './sugarmill';
import { makeJuicer } from './juicer';
import { makeLoom } from './loom';
import { makeBbq } from './bbq';
import { makePerfumery } from './perfumery';
import { makeApiary } from './apiary';
import { makeCandleshop } from './candleshop';
import { makeSmoothieBar } from './smoothiebar';
import { makeFishingDock } from './fishingdock';
import { makeWindmill } from './windmill';
import { makeGreatBarn } from './greatbarn';
import { makeFishery } from './fishery';
import { makeGenericProduction } from './generic';

export type BuildingFactory = (w: number, d: number) => Group;

const REGISTRY: Record<string, BuildingFactory> = {
  henhouse: makeHenHouse,
  cowpen: makeCowPen,
  sheeppen: makeSheepPen,
  pigpen: makePigPen,
  goatpen: makeGoatPen,
  duckpond: makeDuckPond,
  bakery: makeBakery,
  dairy: makeDairy,
  feedmill: makeFeedMill,
  sugarmill: makeSugarMill,
  juicer: makeJuicer,
  loom: makeLoom,
  bbq: makeBbq,
  perfumery: makePerfumery,
  apiary: makeApiary,
  candleshop: makeCandleshop,
  smoothiebar: makeSmoothieBar,
  fishingdock: makeFishingDock,
  windmill: makeWindmill,
  greatbarn: makeGreatBarn,
  fishery: makeFishery,
};

export function makeBuildingMesh(type: string, w: number, d: number): Group {
  const factory = REGISTRY[type] ?? makeGenericProduction;
  return factory(w, d);
}
