import type { BuildingDef } from '../types';

export const BUILDINGS: Record<string, BuildingDef> = {
  henhouse:    { name: 'Hen House',  kind: 'pen', animal: 'chicken', capacity: 4, w: 3, h: 3, price: 50,   level: 3 },
  cowpen:      { name: 'Cow Pen',    kind: 'pen', animal: 'cow',     capacity: 4, w: 4, h: 3, price: 300,  level: 4 },
  sheeppen:    { name: 'Sheep Pen',  kind: 'pen', animal: 'sheep',   capacity: 4, w: 3, h: 3, price: 800,  level: 6 },
  pigpen:      { name: 'Pig Pen',    kind: 'pen', animal: 'pig',     capacity: 3, w: 3, h: 3, price: 1500, level: 8 },
  bakery:      {
    name: 'Bakery', kind: 'production', w: 3, h: 3, price: 240, level: 3,
    recipes: [
      { in: { wheat: 3 }, out: { bread: 1 }, time: 25, xp: 4 },
      { in: { wheat: 5 }, out: { flour: 1 }, time: 30, xp: 5 },
      { in: { flour: 2, sugar: 1, egg: 1 }, out: { cookie: 1 }, time: 50, xp: 9 },
      { in: { flour: 3, sugar: 2, butter: 1, egg: 2 }, out: { cake: 1 }, time: 110, xp: 22 },
    ],
  },
  dairy:       {
    name: 'Dairy', kind: 'production', w: 3, h: 3, price: 600, level: 5,
    recipes: [
      { in: { milk: 2 }, out: { butter: 1 }, time: 35, xp: 6 },
      { in: { milk: 3 }, out: { cheese: 1 }, time: 60, xp: 9 },
    ],
  },
  feedmill:    {
    name: 'Feed Mill', kind: 'production', w: 3, h: 3, price: 30, level: 2,
    recipes: [
      { in: { wheat: 2 }, out: { feed: 3 }, time: 12, xp: 1 },
      { in: { corn: 1, wheat: 1 }, out: { feed: 4 }, time: 18, xp: 2 },
    ],
  },
  sugarmill:   {
    name: 'Sugar Mill', kind: 'production', w: 3, h: 3, price: 800, level: 6,
    recipes: [
      { in: { sugarcane: 3 }, out: { sugar: 1 }, time: 60, xp: 8 },
    ],
  },
  goatpen:     { name: 'Goat Pen',  kind: 'pen', animal: 'goat', capacity: 4, w: 3, h: 3, price: 500, level: 5 },
  duckpond:    { name: 'Duck Pond', kind: 'pen', animal: 'duck', capacity: 4, w: 3, h: 3, price: 180, level: 4 },
  juicer:      {
    name: 'Juice Press', kind: 'production', w: 3, h: 3, price: 450, level: 5,
    recipes: [
      { in: { apple: 2 }, out: { juice: 1 }, time: 45, xp: 7 },
      { in: { strawberry: 4 }, out: { jam: 1 }, time: 70, xp: 12, lvl: 6 },
    ],
  },
  loom:        {
    name: 'Loom', kind: 'production', w: 3, h: 3, price: 1100, level: 7,
    recipes: [
      { in: { wool: 2 }, out: { cloth: 1 }, time: 80, xp: 14 },
    ],
  },
  bbq:         {
    name: 'BBQ Pit', kind: 'production', w: 3, h: 3, price: 1600, level: 9,
    recipes: [
      { in: { bacon: 2, sugar: 1 }, out: { ribs: 1 }, time: 120, xp: 22 },
      { in: { apple: 2, flour: 2, sugar: 1, butter: 1 }, out: { pie: 1 }, time: 100, xp: 20, lvl: 8 },
    ],
  },
  fishingdock: { name: 'Fishing Dock', kind: 'fishing', w: 3, h: 2, price: 300, level: 3 },
};
