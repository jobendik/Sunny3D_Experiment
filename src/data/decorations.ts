import type { DecorationDef } from '../types';

export const DECORATIONS: Record<string, DecorationDef> = {
  flowerbed: { name: 'Flower Bed',   price: 30,   level: 2, w: 1, h: 1 },
  lamppost:  { name: 'Lamp Post',    price: 60,   level: 3, w: 1, h: 1 },
  bench:     { name: 'Garden Bench', price: 120,  level: 4, w: 2, h: 1 },
  scarecrow: { name: 'Scarecrow',    price: 200,  level: 3, w: 1, h: 1, effect: 'scarecrow' },
  fountain:  { name: 'Fountain',     price: 600,  level: 5, w: 2, h: 2 },
  statue:    { name: 'Statue',       price: 1200, level: 7, w: 1, h: 1 },
  gazebo:    { name: 'Gazebo',       price: 2000, level: 8, w: 2, h: 2 },
  pinwheel:  { name: 'Pinwheel',     price: 80,   level: 3, w: 1, h: 1 },
};
