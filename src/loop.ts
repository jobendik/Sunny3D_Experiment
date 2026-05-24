// =============================================================
//  GAME LOOP  — update(dt) ticks logic each frame.
// =============================================================

import { state } from './state';
import { SW, SH } from './canvas';
import { tickCameraInput } from './input';
import { tickCameraTween } from './three/camera-rig';
import { TILE, DAY_SECONDS } from './constants';
import { BUILDINGS } from './data/buildings';
import { rand, nowSeconds } from './utils';
import { sfx } from './audio/sfx';
import { updateWeatherAndSeason } from './systems/weather';
import { tryTriggerEvent, updateEvent } from './systems/events';
import { updateCrows } from './systems/crows';
import { updateDog } from './systems/dog';
import { updateAmbient } from './systems/ambient';
import { updatePenFeed } from './systems/pens';
import { tickLifecycle } from './systems/lifecycle';
import { maybeUnlockOrders } from './systems/orders';
import { saveGame } from './save';
import { dailyTick } from './systems/daily';
import { weeklyTick } from './systems/weekly';
import { tickSoil } from './systems/soil';
import { tickMood } from './systems/animal-mood';
import { refreshMarketModifiers } from './systems/market';
import { regenerateCharges, pruneExpired } from './systems/weather-grid';
import { tickDeferredPayouts } from './systems/event-choices';
import { maybeShowHints } from './systems/hints';
import { tickVisitors } from './systems/visitors';
import { tickTreasures } from './systems/treasures';
import { rolloverIfExpired } from './systems/season-pass';
import { tickStall } from './systems/market-stall';
import { tickBoat } from './systems/boat';
import { tickTrain } from './systems/train';
import { maybeRolloverGazette } from './systems/gazette';
import { tickBalloon } from './systems/balloon';
import { maybeRolloverCart } from './systems/festival-cart';
import { tickClub, maybeRolloverClub } from './systems/club';
import { tickRequestBoard } from './systems/request-board';
import { regenerateEnergy, maybeDailyEnergyBonus } from './systems/expeditions';
import { tickContest, maybeRolloverContest } from './systems/contest';
import { tickLiveEvent } from './systems/live-events';
import { tickVisitorsV2 } from './systems/visitors-v2';
import { tickHelpers } from './systems/helpers';
import { tickContracts } from './systems/contracts';
import { refreshForecast } from './systems/forecast';
import { checkMilestones as checkJournalMilestones } from './systems/journal';
import { tickSurpriseBox } from './systems/surprise-box';
import { tickSanctuary } from './systems/sanctuary';
import { mailboxTick } from './systems/mailbox';
import { maybeRefreshOfferSystems } from './systems/maggie-offers';

let smokeT = 0;

export function update(dt: number): void {
  // Camera (held-key pan + any in-flight rotate-view tween)
  tickCameraInput(dt);
  tickCameraTween(dt);

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]!;
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.isRain && !p.isSnow && !p.isWind) {
      p.vy += 180 * dt;
      p.vx *= Math.pow(0.5, dt * 2);
    }
    if (p.age > p.life) state.particles.splice(i, 1);
  }

  // Floats
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i]!;
    f.age += dt;
    f.y -= 30 * dt;
    if (f.age > f.life) state.floats.splice(i, 1);
  }

  // Pen animal wander
  for (const id in state.penAnimals) {
    const b = state.buildings.find(b => b.id === id);
    if (!b) continue;
    const def = BUILDINGS[b.type]!;
    for (const a of state.penAnimals[id]!) {
      a.frameT += dt;
      // 4-frame walk cycle at ~5fps (0.2s per frame) — readable but lively.
      if (a.frameT > 0.2) {
        a.frame = (a.frame + 1) % 4;
        a.frameT = 0;
      }
      const dx = a.tx - a.ax;
      const dy = a.ty - a.ay;
      const d = Math.hypot(dx, dy);
      const speed = 18;
      if (d > 2) {
        a.ax += (dx / d) * speed * dt;
        a.ay += (dy / d) * speed * dt;
      } else if (Math.random() < dt * 0.5) {
        a.tx = 16 + rand(def.w * TILE - 56);
        a.ty = 16 + rand(def.h * TILE - 56);
      }
    }
  }

  // Smoke from production
  smokeT += dt;
  if (smokeT > 0.6) {
    smokeT = 0;
    for (const b of state.buildings) {
      const def = BUILDINGS[b.type]!;
      if (def.kind === 'production' && state.prodQueues[b.id] && state.prodQueues[b.id]!.length > 0) {
        const sx = b.x * TILE + def.w * TILE - 12;
        const sy = b.y * TILE + 14;
        state.particles.push({
          x: sx + rand(4) - 2,
          y: sy,
          vx: rand(20) - 10,
          vy: -25 - rand(10),
          life: 1.4 + rand(0.6),
          age: 0,
          color: '#c0c0c0',
          size: 5,
        });
      }
    }
  }

  // Day clock
  const elapsed = nowSeconds() - state.startTime;
  const prevDay = state.day;
  state.day = 1 + Math.floor(elapsed / DAY_SECONDS);

  // Day-over-day side effects (market refresh, deferred payouts, gazette, weekly cart/contest/club).
  if (state.day !== prevDay) {
    refreshMarketModifiers();
    tickDeferredPayouts();
    maybeRolloverGazette();
    maybeRolloverCart();
    maybeRolloverContest();
    maybeRolloverClub();
    maybeDailyEnergyBonus();
    refreshForecast();
    checkJournalMilestones();
    maybeRefreshOfferSystems();
  }

  updateWeatherAndSeason();
  tryTriggerEvent(dt);
  updateEvent(dt);
  updateAmbient(dt);

  if (state.crows.length > 0) updateCrows(dt);
  updateDog(dt);
  updatePenFeed(dt);
  // Lifecycle ticker (cheap; promotes babies → adults on a 1Hz budget).
  tickLifecycle();

  // New systems
  state._soilTick = (state._soilTick ?? 0) + dt;
  if (state._soilTick > 1) {
    state._soilTick = 0;
    tickSoil(1);
  }
  state._moodTick = (state._moodTick ?? 0) + dt;
  if (state._moodTick > 1.5) {
    state._moodTick = 0;
    tickMood(1.5);
  }
  state._dailyTick = (state._dailyTick ?? 0) + dt;
  if (state._dailyTick > 5) {
    state._dailyTick = 0;
    dailyTick();
    weeklyTick();
    regenerateCharges();
    pruneExpired();
    maybeShowHints();
    tickVisitors();
    tickTreasures();
    rolloverIfExpired();
  }

  // Weather particles
  state._weatherPartT = (state._weatherPartT ?? 0) + dt;
  if (state._weatherPartT > 0.05) {
    state._weatherPartT = 0;
    if (state.weather === 'rainy' || state.weather === 'storm') {
      for (let i = 0; i < 3; i++) {
        const wx = state.camX - SW() / state.camScale / 2 + rand(SW() / state.camScale);
        const wy = state.camY - SH() / state.camScale / 2 + rand(SH() / state.camScale * 0.7);
        state.particles.push({
          x: wx, y: wy,
          vx: -10, vy: 280,
          life: 1.0, age: 0,
          color: state.weather === 'storm' ? '#5a8acf' : '#7ac0ef',
          size: 2,
          isRain: true,
        });
      }
      if (state.weather === 'storm' && Math.random() < dt * 0.05) sfx.thunder();
    } else if (state.weather === 'snowy') {
      for (let i = 0; i < 2; i++) {
        const wx = state.camX - SW() / state.camScale / 2 + rand(SW() / state.camScale);
        const wy = state.camY - SH() / state.camScale / 2 + rand(SH() / state.camScale * 0.7);
        state.particles.push({
          x: wx, y: wy,
          vx: (Math.random() - 0.5) * 15, vy: 28,
          life: 4.0, age: 0,
          color: '#fff', size: 3,
          isSnow: true,
        });
      }
    } else if (state.weather === 'windy') {
      if (Math.random() < 0.3) {
        const wx = state.camX - SW() / state.camScale / 2 + rand(SW() / state.camScale);
        const wy = state.camY - SH() / state.camScale / 2 + rand(SH() / state.camScale);
        state.particles.push({
          x: wx, y: wy,
          vx: 80 + rand(40), vy: rand(20) - 10,
          life: 1.5, age: 0,
          color: '#c0e0a0', size: 3,
          isWind: true,
        });
      }
    }
  }

  // Periodic order generation
  state._orderTick = (state._orderTick ?? 0) + dt;
  if (state._orderTick > 30) {
    state._orderTick = 0;
    maybeUnlockOrders();
  }

  // Market stall — tick simulated buyers every minute of real time.
  state._stallTick = (state._stallTick ?? 0) + dt;
  if (state._stallTick > 8) {
    const mins = state._stallTick / 60;
    state._stallTick = 0;
    tickStall(mins);
  }

  // Boat/train — refresh state every 5s.
  state._boatTick = (state._boatTick ?? 0) + dt;
  if (state._boatTick > 5) {
    state._boatTick = 0;
    tickBoat();
  }
  state._trainTick = (state._trainTick ?? 0) + dt;
  if (state._trainTick > 5) {
    state._trainTick = 0;
    tickTrain();
  }
  // Balloon & visitors — every 10s.
  state._balloonTick = (state._balloonTick ?? 0) + dt;
  if (state._balloonTick > 10) {
    state._balloonTick = 0;
    tickBalloon();
    regenerateEnergy();
  }
  state._visitorTick = (state._visitorTick ?? 0) + dt;
  if (state._visitorTick > 12) {
    state._visitorTick = 0;
    tickVisitorsV2();
    tickContest();
  }
  // Contracts & live events — every 15s.
  state._contractsTick = (state._contractsTick ?? 0) + dt;
  if (state._contractsTick > 15) {
    state._contractsTick = 0;
    tickContracts();
  }
  state._liveEventTick = (state._liveEventTick ?? 0) + dt;
  if (state._liveEventTick > 20) {
    state._liveEventTick = 0;
    tickLiveEvent();
  }

  // Surprise box (Hay Day random reward) — check every 20s.
  state._surpriseBoxTick = (state._surpriseBoxTick ?? 0) + dt;
  if (state._surpriseBoxTick > 20) {
    state._surpriseBoxTick = 0;
    tickSurpriseBox();
  }
  // Sanctuary (wildlife spawns) — every 25s.
  state._sanctuaryTick = (state._sanctuaryTick ?? 0) + dt;
  if (state._sanctuaryTick > 25) {
    state._sanctuaryTick = 0;
    tickSanctuary();
  }
  // Mailbox — every 5 minutes.
  state._mailboxTick = (state._mailboxTick ?? 0) + dt;
  if (state._mailboxTick > 300) {
    state._mailboxTick = 0;
    mailboxTick();
  }
  // Club + helpers (lightweight, per-frame).
  tickClub(dt);
  state._requestBoardTick = (state._requestBoardTick ?? 0) + dt;
  if (state._requestBoardTick > 12) {
    state._requestBoardTick = 0;
    tickRequestBoard();
  }
  tickHelpers(dt);

  // Autosave
  state._saveTick = (state._saveTick ?? 0) + dt;
  if (state._saveTick > 20) {
    state._saveTick = 0;
    saveGame();
  }
}
