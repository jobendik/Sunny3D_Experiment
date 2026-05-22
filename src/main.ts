// =============================================================
//  SUNNY ACRES — Entry point.
//  Wires up sprites, input, save/load and starts the loop.
// =============================================================

import './style.css';
import { state } from './state';
import { SW, SH } from './canvas';
import {
  TILE, GRID_W, GRID_H, DAY_SECONDS,
  HOME_CENTER_X, HOME_CENTER_Y, HOME_W, HOME_H,
} from './constants';
import { clamp, nowSeconds } from './utils';
import { ensureAudio, sfx } from './audio/sfx';
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
import { init3d, render3d } from './three';
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
import { applyFeatureVisibility, bindFeatureVisibilityIntercept } from './systems/feature-visibility';
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
// Roadmap expansion systems
import { initStorage } from './systems/storage';
import { initMarketStall, rebaseStallOnLoad, tickStall } from './systems/market-stall';
import { initGazette, maybeRolloverGazette } from './systems/gazette';
import { initBoat, tickBoat } from './systems/boat';
import { initTrain, tickTrain } from './systems/train';
import { initLandmarks } from './systems/landmarks';
import { initFriendship } from './systems/friendship';
import { initBuildingMastery } from './systems/building-mastery';
import { openMarketStall } from './ui/market-stall-panel';
import { openGazette } from './ui/gazette-panel';
import { openBoatPanel } from './ui/boat-panel';
import { openTrainPanel } from './ui/train-panel';
import { openLandmarkPanel } from './ui/landmark-panel';
import { openFriendshipPanel } from './ui/friendship-panel';
// Phase 4-15 expansion systems
import { initBalloon } from './systems/balloon';
import { initFestivalCart, maybeRolloverCart } from './systems/festival-cart';
import { initExpansion, syncRegionUnlocks } from './systems/expansion';
import { initClub, maybeRolloverClub } from './systems/club';
import { initVillage } from './systems/village';
import { initExpeditions } from './systems/expeditions';
import { initContest, maybeRolloverContest } from './systems/contest';
import { initLiveEvent, tickLiveEvent } from './systems/live-events';
import { initCompost } from './systems/compost';
import { initGreenhouse, unlockGreenhouse } from './systems/greenhouse';
import { initBreeds } from './systems/breeds';
import { initVisitorsV2 } from './systems/visitors-v2';
import { initReputation } from './systems/reputation';
import { initCardFusion } from './systems/card-fusion';
import { initForecast, refreshForecast } from './systems/forecast';
import { initHelpers } from './systems/helpers';
import { initJournal, checkMilestones as checkJournalMilestones } from './systems/journal';
import { initContracts } from './systems/contracts';
import { initHazards } from './systems/hazards';
import { initFriendCodes } from './systems/friend-codes';
import { initToolShed } from './systems/tool-shed';
import { initBuildingUpgrades } from './systems/building-upgrades';
import { initDecorSets, refreshSetsAndAnnounce } from './systems/decor-sets';
import { maybeEnableDebug } from './systems/debug';
import { openBalloonPanel } from './ui/balloon-panel';
import { openFestivalCartPanel } from './ui/festival-cart-panel';
import { openClubPanel } from './ui/club-panel';
import { openVillagePanel } from './ui/village-panel';
import { openExpeditionsPanel } from './ui/expeditions-panel';
import { openLiveEventsPanel } from './ui/live-events-panel';
import { openExpansionPanel } from './ui/expansion-panel';
import { openRecipeBook } from './ui/recipe-book-panel';
import { openMuseum } from './ui/museum-panel';
// Hay Day-grammar additions (v7)
import { initMailbox, mailboxTick, unreadCount } from './systems/mailbox';
import { initSurpriseBox, tickSurpriseBox, hasPendingBox } from './systems/surprise-box';
import { initPiggyBank, piggyPct } from './systems/piggy-bank';
import { initDailyDeal } from './systems/daily-deal';
import { initSanctuary, tickSanctuary } from './systems/sanctuary';
import { initSettings } from './systems/settings';
import { toggleEditMode, isEditMode, setEditMode } from './systems/edit-mode';
import { setScenicMode } from './systems/settings';
import { openMailboxPanel } from './ui/mailbox-panel';
import { openSurpriseBoxPanel } from './ui/surprise-box-panel';
import { openSanctuaryPanel } from './ui/sanctuary-panel';
import { openPiggyPanel } from './ui/piggy-panel';
import { openSettingsPanel } from './ui/settings-panel';
// FV3 grammar: screen-space speech bubble overlay (object-pooled,
// camera-projected). See src/ui/world-bubbles.ts.
import {
  installWorldBubbles, tickWorldBubbles, refreshWorldBubbleTargets,
} from './ui/world-bubbles';

// Note: starting farm layout (lake, paths, soil hints, pre-plowed
// patch) is now built by `generateWorld()` in three/terrain/world-gen.ts
// — see initGrid() in systems/grid.ts. setupInitialFarm() has been
// retired in favour of that single deterministic generator.

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
  document.getElementById('open-stall')!.addEventListener('click', openMarketStall);
  document.getElementById('open-gazette')!.addEventListener('click', openGazette);
  document.getElementById('open-boat')!.addEventListener('click', openBoatPanel);
  document.getElementById('open-train')!.addEventListener('click', openTrainPanel);
  document.getElementById('open-landmark')!.addEventListener('click', openLandmarkPanel);
  document.getElementById('open-friendship')!.addEventListener('click', openFriendshipPanel);
  document.getElementById('open-balloon')?.addEventListener('click', openBalloonPanel);
  document.getElementById('open-cart')?.addEventListener('click', openFestivalCartPanel);
  document.getElementById('open-club')?.addEventListener('click', openClubPanel);
  document.getElementById('open-village')?.addEventListener('click', openVillagePanel);
  document.getElementById('open-expeditions')?.addEventListener('click', openExpeditionsPanel);
  document.getElementById('open-events')?.addEventListener('click', openLiveEventsPanel);
  document.getElementById('open-expansion')?.addEventListener('click', openExpansionPanel);
  document.getElementById('open-recipe-book')?.addEventListener('click', openRecipeBook);
  document.getElementById('open-museum')?.addEventListener('click', openMuseum);
  // Hay Day-grammar additions
  document.getElementById('open-mailbox')?.addEventListener('click', openMailboxPanel);
  document.getElementById('open-surprise')?.addEventListener('click', openSurpriseBoxPanel);
  document.getElementById('open-sanctuary')?.addEventListener('click', openSanctuaryPanel);
  document.getElementById('open-piggy')?.addEventListener('click', openPiggyPanel);
  document.getElementById('open-settings')?.addEventListener('click', openSettingsPanel);
  document.getElementById('toggle-edit-mode')?.addEventListener('click', () => toggleEditMode());
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
let bubbleT = 0;
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  tickCameraIntro(dt);
  update(dt);
  render3d(dt);
  updateHUD();
  updatePlacingBanner();
  // World-anchored bubble layer is re-projected each frame so it
  // stays glued to its 3D entities while panning. The target list
  // itself only changes a few times a second, so we recompute it
  // at ~6 Hz.
  bubbleT += dt;
  if (bubbleT > 0.16) {
    bubbleT = 0;
    refreshWorldBubbleTargets();
  }
  tickWorldBubbles();
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
    applyFeatureVisibility();
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
  // Intercept clicks on locked toolbar buttons so they show a friendly
  // "unlocks at Lv X" toast instead of opening a confusing empty panel.
  bindFeatureVisibilityIntercept(toast, () => sfx.error());

  const loaded = loadGame();
  if (!loaded) {
    // generateWorld() inside initGrid() already laid down the lake,
    // path network, soil hint zones and a small pre-plowed starter
    // patch — no additional setup needed for a brand-new save.
    maybeUnlockOrders();
  }
  markBuildingTiles();
  init3d();
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
  // Roadmap expansion systems
  initStorage();
  initMarketStall();
  initGazette();
  initBoat();
  initTrain();
  initLandmarks();
  initFriendship();
  initBuildingMastery();
  // Phase 4-15 systems
  initBalloon();
  initFestivalCart(); maybeRolloverCart();
  initExpansion();
  syncRegionUnlocks();
  initClub(); maybeRolloverClub();
  initVillage();
  initExpeditions();
  initContest(); maybeRolloverContest();
  initLiveEvent(); tickLiveEvent();
  initCompost();
  initGreenhouse();
  // Greenhouse landmark already complete? auto-unlock its feature.
  if (state.landmarks?.projects['greenhouse']?.completed) unlockGreenhouse();
  initBreeds();
  initVisitorsV2();
  initReputation();
  initCardFusion();
  initForecast(); refreshForecast();
  initHelpers();
  initJournal(); checkJournalMilestones();
  initContracts();
  initHazards();
  initFriendCodes();
  initToolShed();
  initBuildingUpgrades();
  initDecorSets(); refreshSetsAndAnnounce();
  // Hay Day-grammar additions
  initSettings();
  initMailbox();
  initSurpriseBox();
  initPiggyBank();
  initDailyDeal();
  initSanctuary();
  installWorldBubbles();
  maybeEnableDebug();
  // Rebase market stall offline sales.
  if (loaded && state.lastSessionEndedAt) {
    const awayS = Math.max(0, (Date.now() - state.lastSessionEndedAt) / 1000);
    rebaseStallOnLoad(awayS);
  }
  maybeRolloverGazette();
  track(loaded ? 'session_resume' : 'session_new', { level: state.level });

  // Centre the camera on the home zone (the playable starting area)
  // and choose a default zoom that frames roughly the home block plus
  // a one-tile peek of locked land on each side — locked regions feel
  // present without dominating the screen.
  state.camX = HOME_CENTER_X * TILE;
  state.camY = HOME_CENTER_Y * TILE;
  const framePx = (Math.max(HOME_W, HOME_H) + 4) * TILE;
  state.camScale = Math.min(SW() / framePx, SH() / framePx) * 0.95;
  state.camScale = clamp(state.camScale, 0.45, 1.8);

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
  // First-frame visibility pass so the player never sees a flash of all
  // 30+ buttons before the gates kick in.
  applyFeatureVisibility();

  if (!loaded) {
    // Splash overlay + cinematic camera intro for fresh sessions
    bindSplash(() => {
      startCameraIntro();
      setTimeout(openHelp, 1600);
    });
    // Drop a starter chest near the entrance plot so the new player gets an
    // immediate "wow" moment within the first 30 seconds of play. We pick
    // the first tile of the pre-plowed starter patch which world-gen
    // lays just east of the south-entrance path, one tile below the
    // east/west branch.
    setTimeout(() => {
      const tx = Math.floor(HOME_CENTER_X) + 1;
      const ty = 11;          // matches world-gen's starter-patch row
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
