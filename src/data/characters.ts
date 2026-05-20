// =============================================================
//  VILLAGERS — the recurring characters who place orders, write
//  the daily news, and give the farm its emotional texture.
//  Each villager prefers certain item categories so their orders
//  feel like real requests instead of random shopping lists.
// =============================================================

export type ItemCategory = 'crop' | 'animal' | 'bake' | 'craft' | 'fish' | 'fruit' | 'sweet';

export interface VillagerDef {
  id: string;
  name: string;
  role: string;
  emoji: string;          // portrait stand-in
  accent: string;         // border / tint color (hex)
  preferred: ItemCategory[];
  greet: string[];        // short lines used in order cards
  thanks: string[];       // short lines shown on delivery
  tip?: string;           // optional flavor line for daily news
}

export const VILLAGERS: Record<string, VillagerDef> = {
  emma: {
    id: 'emma',
    name: 'Emma',
    role: 'Neighbor',
    emoji: '👩‍🌾',
    accent: '#ef8aa6',
    preferred: ['crop', 'fruit'],
    greet: [
      'A handful of fresh produce, please?',
      'My garden basket is empty again — help a neighbor?',
      'Anything from the field will do!',
    ],
    thanks: ['Thank you, dear!', 'You always come through.', 'Bless you!'],
    tip: 'Emma swears her tomatoes always taste better after a rainy morning.',
  },
  finn: {
    id: 'finn',
    name: 'Old Finn',
    role: 'Fisherman',
    emoji: '🎣',
    accent: '#5aa6c8',
    preferred: ['fish', 'bake'],
    greet: [
      'Need bait — and breakfast.',
      'Lake\'s biting today. Care to trade?',
      'I row at dawn. Pack me something hot.',
    ],
    thanks: ['Smooth sailing!', 'You\'re a champion.', 'I owe you one.'],
    tip: 'Finn says the fish bite best when the wind is calm.',
  },
  hazel: {
    id: 'hazel',
    name: 'Hazel',
    role: 'Weather Reader',
    emoji: '🌦️',
    accent: '#9a7ccc',
    preferred: ['sweet', 'craft', 'fruit'],
    greet: [
      'A small luxury before the rain comes.',
      'For tea-leaf reading — bring the sweet things.',
      'I pay extra for craft work made with care.',
    ],
    thanks: ['The clouds approve.', 'A fair trade.', 'Wonderful.'],
    tip: 'Hazel claims a Rainmaker card cast at sunrise doubles its luck.',
  },
  bruno: {
    id: 'bruno',
    name: 'Bruno',
    role: 'Delivery Driver',
    emoji: '🚚',
    accent: '#c8862e',
    preferred: ['bake', 'animal', 'crop'],
    greet: [
      'Loading the truck — what have you got?',
      'Town\'s waiting on this haul. Hurry!',
      'Same route, same crates. Fill \'em up!',
    ],
    thanks: ['On the road again!', 'Town will be thrilled.', 'Easy run today.'],
    tip: 'Bruno\'s truck rumbles by every afternoon — keep stock ready.',
  },
  daisy: {
    id: 'daisy',
    name: 'Daisy',
    role: 'Animal Caretaker',
    emoji: '🐮',
    accent: '#7fb957',
    preferred: ['animal', 'crop'],
    greet: [
      'The little ones need their treats.',
      'For the herd — only the freshest!',
      'Animals know quality. Don\'t skimp.',
    ],
    thanks: ['They\'ll be so happy.', 'You\'re a friend to all creatures.', 'Thank you kindly.'],
    tip: 'Daisy says decorated pens hold their feed almost a quarter longer.',
  },
  maple: {
    id: 'maple',
    name: 'Maple',
    role: 'Village Baker',
    emoji: '🥐',
    accent: '#d27a45',
    preferred: ['bake', 'sweet', 'crop'],
    greet: [
      'Flour, butter, eggs — the holy trio!',
      'Big order from the inn tonight. Help?',
      'My oven is hungry too, you know.',
    ],
    thanks: ['Smell that crust!', 'You saved my morning.', 'Pop in for a pastry.'],
    tip: 'Maple\'s bakery pays a fair price for sugar even when prices dip.',
  },
  milo: {
    id: 'milo',
    name: 'Milo',
    role: 'Curious Kid',
    emoji: '🧒',
    accent: '#f4b942',
    preferred: ['fruit', 'sweet', 'fish'],
    greet: [
      'A little something for an adventurer?',
      'Mama said I could trade — look, real coins!',
      'Make it shiny! And tasty!',
    ],
    thanks: ['Wow, thanks!', 'I\'ll tell everyone!', 'Best farmer ever!'],
    tip: 'Milo found a coin near the old apple tree. Says it\'s lucky.',
  },
  willow: {
    id: 'willow',
    name: 'Willow',
    role: 'Inn Cook',
    emoji: '👩‍🍳',
    accent: '#a7c66e',
    preferred: ['bake', 'animal', 'craft'],
    greet: [
      'Feast night — need everything!',
      'Inn\'s packed. Bring the good stuff.',
      'My stew won\'t make itself.',
    ],
    thanks: ['The guests will rave.', 'A toast to you!', 'Saved the menu.'],
    tip: 'Willow\'s inn pays double for produce when a festival is on.',
  },
};

export const VILLAGER_IDS: readonly string[] = Object.keys(VILLAGERS);

// ---- Item → category mapping. Used to choose order items that match a
//      villager's taste, and to drive flavor lines.
const CATEGORY_BY_ITEM: Record<string, ItemCategory> = {
  // Raw crops
  wheat: 'crop', corn: 'crop', carrot: 'crop', tomato: 'crop',
  pumpkin: 'crop', strawberry: 'fruit', sugarcane: 'sweet',
  lavender: 'craft', blueberry: 'fruit',
  // Animal produce
  egg: 'animal', milk: 'animal', wool: 'animal', bacon: 'animal',
  yogurt: 'animal', feather: 'animal',
  // Processed bake / craft / sweet
  bread: 'bake', flour: 'bake', cookie: 'sweet', cake: 'sweet',
  butter: 'bake', cheese: 'bake', sugar: 'sweet', feed: 'animal',
  juice: 'sweet', jam: 'sweet', cloth: 'craft', ribs: 'animal',
  pie: 'sweet', perfume: 'craft', honey: 'sweet', candle: 'craft',
  smoothie: 'sweet',
  // Orchard fruits
  apple: 'fruit', pear: 'fruit',
  // Fish
  bluefish: 'fish', trout: 'fish', goldfish: 'fish',
};

export function itemCategory(itemKey: string): ItemCategory | null {
  return CATEGORY_BY_ITEM[itemKey] ?? null;
}

/** Pick a villager whose taste overlaps the items in the order.
 *  Falls back to a random villager if no match. */
export function pickVillagerFor(items: ReadonlyArray<string>): VillagerDef {
  const scores: Array<{ v: VillagerDef; s: number }> = [];
  for (const id of VILLAGER_IDS) {
    const v = VILLAGERS[id]!;
    let s = 0;
    for (const k of items) {
      const cat = itemCategory(k);
      if (cat && v.preferred.includes(cat)) s += 1;
    }
    scores.push({ v, s });
  }
  scores.sort((a, b) => b.s - a.s);
  const top = scores[0]!;
  if (top.s === 0) return VILLAGERS[VILLAGER_IDS[Math.floor(Math.random() * VILLAGER_IDS.length)]!]!;
  // Among the top tier of equally-fit villagers, pick randomly so variety stays high.
  const best = scores.filter(x => x.s === top.s);
  return best[Math.floor(Math.random() * best.length)]!.v;
}

export function pickRandomVillager(): VillagerDef {
  return VILLAGERS[VILLAGER_IDS[Math.floor(Math.random() * VILLAGER_IDS.length)]!]!;
}
