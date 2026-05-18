import { state } from '../state';
import { FISH } from '../data/fish';
import { ITEMS } from '../data/items';
import { rand, clamp } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { addItem } from './inventory';
import { addXP } from './xp';
import { questProgress } from './quests';
import { checkAchievements } from './achievements';

export function startFishing(): void {
  if (state.level < 3) {
    toast('Need level 3 to fish!', 'error');
    sfx.error();
    return;
  }
  const eligible = Object.entries(FISH).filter(([, f]) => f.level <= state.level);
  const total = eligible.reduce((a, [, f]) => a + f.weight, 0);
  let r = rand(total);
  let chosenKind = eligible[0]![0];
  for (const [k, f] of eligible) {
    r -= f.weight;
    if (r <= 0) { chosenKind = k; break; }
  }
  const fish = FISH[chosenKind]!;
  const zoneWidth = 80 - fish.weight * 0.3;
  const zoneStart = 60 + rand(120);
  state.fishing = {
    active: true,
    fishKind: chosenKind,
    pos: 0,
    dir: 1,
    speed: 180 + rand(120),
    zoneStart,
    zoneWidth: clamp(zoneWidth, 28, 80),
  };
  const overlay = document.getElementById('fishing-overlay')!;
  overlay.classList.add('open');
  const zone = document.getElementById('fishing-zone') as HTMLElement;
  zone.style.left = zoneStart + 'px';
  zone.style.width = state.fishing.zoneWidth + 'px';
  requestAnimationFrame(animateFishingMarker);
}

export function animateFishingMarker(): void {
  if (!state.fishing || !state.fishing.active) return;
  const f = state.fishing;
  f.pos += f.dir * f.speed * (1 / 60);
  if (f.pos > 280) { f.pos = 280; f.dir = -1; }
  if (f.pos < 0) { f.pos = 0; f.dir = 1; }
  const m = document.getElementById('fishing-marker');
  if (m) (m as HTMLElement).style.left = f.pos + 'px';
  requestAnimationFrame(animateFishingMarker);
}

export function tryHookFish(): void {
  if (!state.fishing) return;
  const f = state.fishing;
  const inZone = f.pos >= f.zoneStart - 3 && f.pos <= f.zoneStart + f.zoneWidth + 3;
  const overlay = document.getElementById('fishing-overlay')!;
  overlay.classList.remove('open');
  f.active = false;
  if (inZone) {
    addItem(f.fishKind, 1);
    addXP(FISH[f.fishKind]!.xp);
    state.stats.fishCaught++;
    sfx.fishCatch();
    toast(`Caught a ${ITEMS[f.fishKind]!.name}!`, 'xp');
    questProgress('fish', f.fishKind, 1);
    checkAchievements();
  } else {
    toast('The fish got away!', 'error');
    sfx.splash();
  }
  state.fishing = null;
}

export function cancelFishing(): void {
  state.fishing = null;
  document.getElementById('fishing-overlay')!.classList.remove('open');
}
