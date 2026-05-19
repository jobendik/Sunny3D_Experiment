import type { SpriteCache } from '../types';
import { CROPS } from '../data/crops';
import { ITEMS } from '../data/items';
import { ANIMALS } from '../data/animals';
import { BUILDINGS } from '../data/buildings';
import { DECORATIONS } from '../data/decorations';
import { ORCHARDS } from '../data/orchards';
import { spriteGrassTile, spriteSoilTile, spritePathTile, spriteWaterFrames } from './tiles';
import { spriteCropStage } from './crops';
import { spriteItem } from './items';
import { spriteAnimal } from './animals';
import { spriteBuilding, spriteDuckPondOverride } from './buildings';
import { spriteDecoration } from './decorations';
import { spriteOrchard } from './orchards';
import { spriteCrow, spriteDog } from './entities';

// Lazily filled at init via buildSprites().
export const sprites = {
  crops: {},
  item: {},
  animal: {},
  building: {},
  decor: {},
  orchard: {},
  crow: [],
  dog: [],
} as unknown as SpriteCache;

const HUD_ICONS = ['hand', 'plow', 'seed', 'shop', 'inv', 'build', 'save', 'help', 'decor', 'trophy', 'news'] as const;

export function buildSprites(): void {
  sprites.grass = spriteGrassTile();
  sprites.soil = spriteSoilTile(false);
  sprites.plowed = spriteSoilTile(true);
  sprites.path = spritePathTile();
  sprites.waterFrames = spriteWaterFrames();
  sprites.water = sprites.waterFrames[0]!;

  sprites.crops = {};
  for (const k of Object.keys(CROPS)) {
    sprites.crops[k] = [
      spriteCropStage(k, 0),
      spriteCropStage(k, 1),
      spriteCropStage(k, 2),
      spriteCropStage(k, 3),
    ];
  }

  sprites.item = {};
  for (const k of Object.keys(ITEMS)) sprites.item[k] = spriteItem(k);
  sprites.item.coin = spriteItem('coin');
  sprites.item.xp = spriteItem('xp');
  for (const t of HUD_ICONS) sprites.item[t] = spriteItem(t);

  sprites.animal = {};
  for (const k of Object.keys(ANIMALS)) {
    sprites.animal[k] = [spriteAnimal(k, 0), spriteAnimal(k, 1)];
  }

  sprites.building = {};
  for (const k of Object.keys(BUILDINGS)) sprites.building[k] = spriteBuilding(k);
  sprites.building.duckpond = spriteDuckPondOverride();

  sprites.decor = {};
  for (const k of Object.keys(DECORATIONS)) sprites.decor[k] = spriteDecoration(k);

  sprites.orchard = {};
  for (const k of Object.keys(ORCHARDS)) {
    sprites.orchard[k] = [
      spriteOrchard(k, 0, false),
      spriteOrchard(k, 1, false),
      spriteOrchard(k, 2, false),
      spriteOrchard(k, 2, true),
    ];
  }

  sprites.crow = [spriteCrow(0), spriteCrow(1)];
  sprites.dog = [spriteDog(0), spriteDog(1)];
}
