// =============================================================
//  SUNNY ACRES — Entry point.
//  Wires up sprites, input, save/load and starts the loop.
// =============================================================

import './style.css';
import { state } from './state';
import { SW, SH } from './canvas';
import { TILE, GRID_W, GRID_H, DAY_SECONDS } from './constants';
import { clamp, nowSeconds } from './utils';
import { ensureAudio } from './audio/sfx';
import { startMusic, stopMusic } from './audio/music';
import { buildSprites } from './sprites';
import { initGrid, markBuildingTiles } from './systems/grid';
import { refillQuests, renderQuests } from './systems/quests';
import { renderOrders, maybeUnlockOrders } from './systems/orders';
import { updateWeatherAndSeason } from './systems/weather';
import { spawnDog } from './systems/dog';
import { checkAchievements } from './systems/achievements';
import { tryHookFish, cancelFishing } from './systems/fishing';
import { attachInput } from './input';
import { saveGame, loadGame } from './save';
import { render } from './render';
import { update } from './loop';
import { updateHUD } from './ui/hud';
import { setTool, updateSeedBtnLabel, attachToolButtons } from './ui/tools';
import { toast } from './ui/toasts';
import { closeModal } from './ui/modal';
import { openShop } from './ui/shop';
import { openInventory } from './ui/inventory-panel';
import { openBuildMenu } from './ui/build-menu';
import { openDecorMenu } from './ui/decor-menu';
import { openAchievements } from './ui/achievements-panel';
import { openNews } from './ui/news';
import { openHelp } from './ui/help';
import {
  bindMobileShell,
  updateQuestsFabBadge,
  updatePlacingBanner,
} from './ui/mobile-shell';
import { initDecor } from './decor';
// Phase 0–4 retention/diff/meta systems
import { initDaily, dailyTick } from './systems/daily';
import { initWeekly, weeklyTick } from './systems/weekly';
import { initWeatherGrid, maybeUnlockGrid } from './systems/weather-grid';
import { initSpecializations } from './systems/specializations';
import { initCollection } from './systems/collection';
import { initMarket, refreshMarketModifiers } from './systems/market';
import { initSoil, tickSoil, ensureSoilGridFor } from './systems/soil';
import { initMood, tickMood } from './systems/animal-mood';
import { initBiome } from './systems/biome';
import { initPrestige } from './systems/prestige';
import { initTutorial } from './systems/tutorial';
import { track } from './systems/telemetry';
import { openDaily } from './ui/daily-panel';
import { openWeatherGrid } from './ui/weather-grid-panel';
import { openSpecialization } from './ui/spec-panel';
import { openCollection } from './ui/collection-panel';
import { openMarket } from './ui/market-panel';
import { openLeaderboard } from './ui/leaderboard-panel';
import { openPrestige } from './ui/prestige-panel';
import { openSnapshot } from './ui/snapshot-panel';
import { renderObjectiveRail } from './ui/objective-rail';
import { renderTutorialBubble, bindTutorial } from './ui/tutorial-overlay';
import { renderChoiceOverlay, bindChoice } from './ui/choice-overlay';
// CrazyGames-launch retention extras
import { initWheel } from './systems/wheel';
import { initCombo } from './systems/combo';
import { initTreasures, tickTreasures } from './systems/treasures';
import { initPass } from './systems/season-pass';
import { bindReadyNotifier, tickReadyTitle } from './systems/ready-notifier';
import { openWheel } from './ui/wheel-panel';
import { openPass } from './ui/pass-panel';
import { renderComboHud } from './ui/combo-hud';
import { maybeOpenWelcomeBack } from './ui/welcome-back';
import { bindSplash, startCameraIntro, tickCameraIntro } from './systems/intro';

function setupInitialFarm(): void {
  // Irregular lake in the upper-left — ~20 tiles, big enough to build
  // a fishing dock alongside and to make the corner feel like real water.
  const lake: ReadonlyArray<readonly [number, number]> = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [1, 3], [2, 3], [3, 3], [4, 3],
    [2, 4], [3, 4],
  ];
  for (const [x, y] of lake) state.grid[y]![x]!.type = 'water';

  // Cross-shaped path: south entrance up to the heart of the farm, with a
  // short west branch toward the lake that hints "this way to fish".
  const entranceX = Math.floor(GRID_W / 2);
  const branchY = 5;
  for (let gy = GRID_H - 1; gy >= branchY; gy--) {
    state.grid[gy]![entranceX]!.type = 'path';
  }
  for (let gx = entranceX - 3; gx < entranceX; gx++) {
    state.grid[branchY]![gx]!.type = 'path';
  }

  // Soil patches that subtly suggest gameplay zones: NE for animal pens,
  // SE for production buildings, SW for orchards. Soil is mechanically
  // equivalent to grass for placement — these are purely visual hints.
  const soilZones: ReadonlyArray<readonly [number, number]> = [
    // NE — pen zone
    [13, 1], [14, 1], [15, 1], [16, 1],
    [13, 2], [14, 2], [15, 2], [16, 2],
    [14, 3], [15, 3],
    // SE — production zone
    [11, 11], [12, 11], [13, 11], [14, 11],
    [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12],
    [11, 13], [12, 13], [13, 13], [14, 13],
    // SW — orchard zone
    [1, 12], [2, 12], [3, 12],
    [1, 13], [2, 13], [3, 13],
    [2, 14], [3, 14],
  ];
  for (const [x, y] of soilZones) state.grid[y]![x]!.type = 'soil';
}

function bindToolbarHandlers(): void {
  document.getElementById('modal-close')!.addEventListener('click', closeModal);
  document.getElementById('open-shop')!.addEventListener('click', openShop);
  document.getElementById('open-inventory')!.addEventListener('click', openInventory);
  document.getElementById('open-buildings')!.addEventListener('click', openBuildMenu);
  document.getElementById('open-decor')!.addEventListener('click', openDecorMenu);
  document.getElementById('open-achievements')!.addEventListener('click', openAchievements);
  document.getElementById('open-news')!.addEventListener('click', openNews);
  document.getElementById('open-daily')!.addEventListener('click', openDaily);
  document.getElementById('open-weather-grid')!.addEventListener('click', openWeatherGrid);
  document.getElementById('open-spec')!.addEventListener('click', openSpecialization);
  document.getElementById('open-collection')!.addEventListener('click', openCollection);
  document.getElementById('open-market')!.addEventListener('click', openMarket);
  document.getElementById('open-leaderboard')!.addEventListener('click', openLeaderboard);
  document.getElementById('open-prestige')!.addEventListener('click', openPrestige);
  document.getElementById('open-snapshot')!.addEventListener('click', openSnapshot);
  document.getElementById('open-wheel')!.addEventListener('click', openWheel);
  document.getElementById('open-pass')!.addEventListener('click', openPass);
  document.getElementById('save-btn')!.addEventListener('click', () => {
    saveGame();
    toast('Game saved!');
  });
  document.getElementById('help-btn')!.addEventListener('click', openHelp);
  document.getElementById('fishing-tap')!.addEventListener('click', tryHookFish);
  document.getElementById('fishing-cancel')!.addEventListener('click', cancelFishing);
  document.getElementById('music-toggle')!.addEventListener('click', () => {
    state.musicOn = !state.musicOn;
    const el = document.getElementById('music-toggle')!;
    el.classList.toggle('muted', !state.musicOn);
    el.textContent = state.musicOn ? '🎵' : '🔇';
    if (state.musicOn) {
      ensureAudio();
      startMusic();
    } else {
      stopMusic();
    }
  });
}

let lastTime = performance.now();
let badgeT = 0;
let railT = 0;
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  tickCameraIntro(dt);
  update(dt);
  render();
  updateHUD();
  updatePlacingBanner();
  badgeT += dt;
  if (badgeT > 0.5) {
    badgeT = 0;
    updateQuestsFabBadge();
  }
  railT += dt;
  if (railT > 0.75) {
    railT = 0;
    renderObjectiveRail();
    renderTutorialBubble();
    renderChoiceOverlay();
    tickReadyTitle();
  }
  renderComboHud();
  requestAnimationFrame(frame);
}

function init(): void {
  buildSprites();
  initGrid();
  attachInput();
  attachToolButtons();
  bindToolbarHandlers();
  bindMobileShell();

  // Wire tutorial + choice overlay buttons
  bindTutorial();
  bindChoice();

  const loaded = loadGame();
  if (!loaded) {
    setupInitialFarm();
    // Small starter plot tucked next to the path junction: 4×2 plowed soil
    // on the east side of the vertical path, just below the shore branch.
    const entranceX = Math.floor(GRID_W / 2);
    for (let y = 6; y <= 7; y++) {
      for (let x = entranceX + 1; x <= entranceX + 4; x++) {
        state.grid[y]![x]!.type = 'plowed';
      }
    }
    maybeUnlockOrders();
  }
  markBuildingTiles();
  initDecor();
  setTool('hand');
  updateSeedBtnLabel();

  // Init all retention systems
  initDaily(); dailyTick();
  initWeekly(); weeklyTick();
  initWeatherGrid(); maybeUnlockGrid();
  initSpecializations();
  initCollection();
  initMarket();
  if (state.market!.day !== state.day) refreshMarketModifiers();
  initSoil();
  // Ensure soil grid covers the world dims (in case save was older)
  ensureSoilGridFor(GRID_W, GRID_H);
  initMood();
  initBiome();
  initPrestige();
  initTutorial();
  // Retention extras
  initWheel();
  initCombo();
  initTreasures();
  initPass();
  bindReadyNotifier();
  track(loaded ? 'session_resume' : 'session_new', { level: state.level });

  state.camX = (GRID_W * TILE) / 2;
  state.camY = (GRID_H * TILE) / 2;
  state.camScale = Math.min(SW() / (GRID_W * TILE), SH() / (GRID_H * TILE)) * 0.9;
  state.camScale = clamp(state.camScale, 0.45, 1.6);

  if (state.quests.length === 0) refillQuests();
  renderQuests();

  if (!state.weatherUntil) state.weatherUntil = nowSeconds() + DAY_SECONDS;
  updateWeatherAndSeason();

  if (state.level >= 4 && !state.dog) spawnDog();

  const mt = document.getElementById('music-toggle');
  if (mt) {
    mt.classList.toggle('muted', !state.musicOn);
    mt.textContent = state.musicOn ? '🎵' : '🔇';
  }

  const startAudioOnce = (): void => {
    ensureAudio();
    if (state.musicOn) startMusic();
    document.removeEventListener('pointerdown', startAudioOnce);
    document.removeEventListener('keydown', startAudioOnce);
  };
  document.addEventListener('pointerdown', startAudioOnce);
  document.addEventListener('keydown', startAudioOnce);

  renderOrders();
  updateHUD();
  checkAchievements();

  if (!loaded) {
    // Splash overlay + cinematic camera intro for fresh sessions
    bindSplash(() => {
      startCameraIntro();
      setTimeout(openHelp, 1600);
    });
    // Drop a starter chest near the entrance plot so the new player gets an
    // immediate "wow" moment within the first 30 seconds of play.
    setTimeout(() => {
      const entrance = Math.floor(GRID_W / 2);
      const tx = entrance + 1, ty = 7;
      if (state.treasures && !state.treasures.chests.some(c => c.gx === tx && c.gy === ty)) {
        state.treasures.chests.push({
          id: 'startergift', gx: tx, gy: ty,
          spawnedAt: performance.now() / 1000,
          expiresAt: performance.now() / 1000 + 300,
          rare: true,
        });
        toast('A welcome chest appeared on your farm! Tap to open it.', 'gold');
      }
    }, 6500);
  } else {
    // Returning sessions skip the splash entirely
    document.getElementById('splash')?.remove();
    // Show a rich "while you were away" panel if applicable, else the toast
    setTimeout(maybeOpenWelcomeBack, 400);
    toast('Welcome back!');
  }

  lastTime = performance.now();
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', saveGame);
}

init();
