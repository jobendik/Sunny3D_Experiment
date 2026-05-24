import { state } from '../state';
import { FISH } from '../data/fish';
import { ITEMS } from '../data/items';
import { rand, clamp, nowSeconds } from '../utils';
import { sfx } from '../audio/sfx';
import { toast } from '../ui/toasts';
import { addItem } from './inventory';
import { addXP } from './xp';
import { questProgress } from './quests';
import { dailyChallengeProgress } from './daily';
import { addWeeklyPoints } from './weekly';
import { checkAchievements } from './achievements';
import { recordDiscovery } from './collection';
import { effectiveFishWeights, baitValueMultiplier } from './biome';
import { activeEffects as weatherGridEffects } from './weather-grid';
import { specEffects } from './specializations';
import { track } from './telemetry';
import { recordEventAction } from './live-events';
import { addClubProgress } from './club';
import { checkMilestones as checkJournalMilestones } from './journal';
import { recordHabitatContribution } from './habitat-partner';

export function startFishing(): void {
  if (state.level < 3) {
    toast('Need level 3 to fish!', 'error');
    sfx.error();
    return;
  }
  const eligible = Object.entries(FISH).filter(([, f]) => f.level <= state.level);
  // Apply biome/bait/time-window weights
  const w = effectiveFishWeights();
  // Apply weather grid + spec rare bonus
  const eff = weatherGridEffects();
  const sp = specEffects();
  const rareBonus = eff.fishingRareBonus + (sp.fishingRare ?? 0);
  for (const k of Object.keys(w)) {
    const baseLevel = ITEMS[k]?.level ?? 0;
    if (baseLevel >= 5) w[k] = (w[k] ?? 0) * (1 + rareBonus);
  }
  const filtered = eligible.filter(([k]) => w[k] !== undefined);
  const total = filtered.reduce((a, [k]) => a + (w[k] ?? 0), 0);
  let r = rand(total);
  let chosenKind = filtered[0]?.[0] ?? eligible[0]![0];
  for (const [k] of filtered) {
    r -= w[k] ?? 0;
    if (r <= 0) { chosenKind = k; break; }
  }
  const fish = FISH[chosenKind]!;
  // Rare fish (level ≥ 4) demand multi-phase catches: hook once on the
  // first wide zone, the zone narrows + speeds up for phase 2, narrows
  // again for phase 3. Common fish stay single-phase so early players
  // aren't punished.
  const totalPhases = (fish.level ?? 1) >= 4 ? 3 : (fish.level ?? 1) >= 2 ? 2 : 1;
  const zoneWidth = 80 - fish.weight * 0.3;
  const zoneStart = 60 + rand(120);
  // 10-second timeout per phase — narrows the "perfect-window grind"
  // exploit and creates real tension on hook-now decisions.
  const phaseTimeout = 10;
  state.fishing = {
    active: true,
    fishKind: chosenKind,
    pos: 0,
    dir: 1,
    speed: 180 + rand(120),
    zoneStart,
    zoneWidth: clamp(zoneWidth, 28, 80),
    phase: 1,
    totalPhases,
    expiresAt: nowSeconds() + phaseTimeout,
  };
  const overlay = document.getElementById('fishing-overlay')!;
  overlay.classList.add('open');
  renderPhasePill();
  const zone = document.getElementById('fishing-zone') as HTMLElement;
  zone.style.left = zoneStart + 'px';
  zone.style.width = state.fishing.zoneWidth + 'px';
  requestAnimationFrame(animateFishingMarker);
}

/** Show the current phase + countdown above the fishing track. */
function renderPhasePill(): void {
  const f = state.fishing;
  if (!f) return;
  const pill = document.getElementById('fishing-phase-pill');
  if (!pill) return;
  const total = f.totalPhases ?? 1;
  const phase = f.phase ?? 1;
  if (total <= 1) {
    pill.textContent = '';
    pill.style.display = 'none';
    return;
  }
  const remain = Math.max(0, (f.expiresAt ?? nowSeconds()) - nowSeconds());
  pill.style.display = '';
  pill.textContent = `Phase ${phase} / ${total} · ${remain.toFixed(1)}s`;
}

export function animateFishingMarker(): void {
  if (!state.fishing || !state.fishing.active) return;
  const f = state.fishing;
  // Timeout check — fish flees if the player stalls.
  if (f.expiresAt !== undefined && nowSeconds() > f.expiresAt) {
    const overlay = document.getElementById('fishing-overlay');
    overlay?.classList.remove('open');
    toast('The fish got away — too slow!', 'error');
    sfx.splash();
    state.fishing = null;
    return;
  }
  f.pos += f.dir * f.speed * (1 / 60);
  if (f.pos > 280) { f.pos = 280; f.dir = -1; }
  if (f.pos < 0) { f.pos = 0; f.dir = 1; }
  const m = document.getElementById('fishing-marker');
  if (m) (m as HTMLElement).style.left = f.pos + 'px';
  renderPhasePill();
  requestAnimationFrame(animateFishingMarker);
}

export function tryHookFish(): void {
  if (!state.fishing) return;
  const f = state.fishing;
  const inZone = f.pos >= f.zoneStart - 3 && f.pos <= f.zoneStart + f.zoneWidth + 3;
  const overlay = document.getElementById('fishing-overlay')!;
  const total = f.totalPhases ?? 1;
  const phase = f.phase ?? 1;

  // Multi-phase rare catches: a successful hook advances to the next
  // (narrower, faster) phase. Only after the final phase do we award.
  if (inZone && phase < total) {
    f.phase = phase + 1;
    // Each phase: zone shrinks 35%, speed +25%, timer resets to 8s.
    f.zoneWidth = Math.max(18, f.zoneWidth * 0.65);
    f.zoneStart = 60 + rand(160);
    f.speed *= 1.25;
    f.pos = 0;
    f.dir = 1;
    f.expiresAt = nowSeconds() + 8;
    const zone = document.getElementById('fishing-zone') as HTMLElement | null;
    if (zone) {
      zone.style.left = f.zoneStart + 'px';
      zone.style.width = f.zoneWidth + 'px';
    }
    sfx.click();
    toast(`Phase ${phase} → ${phase + 1}!`, 'xp');
    renderPhasePill();
    return;
  }

  overlay.classList.remove('open');
  f.active = false;
  if (inZone) {
    addItem(f.fishKind, 1);
    addXP(FISH[f.fishKind]!.xp);
    state.stats.fishCaught++;
    recordHabitatContribution('fish', 1);
    sfx.fishCatch();
    const bm = baitValueMultiplier();
    // Rare catch event chain: every 10th catch grants a bonus
    if (state.stats.fishCaught % 10 === 0) {
      const bonus = 50 + state.level * 10;
      state.coins += bonus;
      state.stats.earned += bonus;
      addXP(10);
      toast(`🎣 Lucky streak! +${bonus}💰 +10XP`, 'gold');
    } else {
      toast(`Caught a ${ITEMS[f.fishKind]!.name}!${bm > 1 ? ' (bait bonus active)' : ''}`, 'xp');
    }
    questProgress('fish', f.fishKind, 1);
    dailyChallengeProgress('fish', f.fishKind, 1);
    addWeeklyPoints(15, 'fish');
    recordDiscovery('fish', f.fishKind, 1);
    track('fish_caught', { kind: f.fishKind });
    checkAchievements();
    // Live-event + club + journal
    recordEventAction('fish_caught', f.fishKind, 1);
    addClubProgress('fish', 1);
    checkJournalMilestones();
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
