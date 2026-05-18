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

function setupInitialFarm(): void {
  for (let gx = 0; gx < GRID_W; gx++) {
    state.grid[Math.floor(GRID_H / 2)]![gx]!.type = 'path';
  }
  const ponds = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
  for (const p of ponds) state.grid[p.y]![p.x]!.type = 'water';
}

function bindToolbarHandlers(): void {
  document.getElementById('modal-close')!.addEventListener('click', closeModal);
  document.getElementById('open-shop')!.addEventListener('click', openShop);
  document.getElementById('open-inventory')!.addEventListener('click', openInventory);
  document.getElementById('open-buildings')!.addEventListener('click', openBuildMenu);
  document.getElementById('open-decor')!.addEventListener('click', openDecorMenu);
  document.getElementById('open-achievements')!.addEventListener('click', openAchievements);
  document.getElementById('open-news')!.addEventListener('click', openNews);
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
function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  updateHUD();
  updatePlacingBanner();
  badgeT += dt;
  if (badgeT > 0.5) {
    badgeT = 0;
    updateQuestsFabBadge();
  }
  requestAnimationFrame(frame);
}

function init(): void {
  buildSprites();
  initGrid();
  attachInput();
  attachToolButtons();
  bindToolbarHandlers();
  bindMobileShell();

  const loaded = loadGame();
  if (!loaded) {
    setupInitialFarm();
    for (let x = 4; x <= 6; x++) {
      state.grid[3]![x]!.type = 'plowed';
    }
    maybeUnlockOrders();
  }
  markBuildingTiles();
  initDecor();
  setTool('hand');
  updateSeedBtnLabel();

  state.camX = (GRID_W * TILE) / 2;
  state.camY = (GRID_H * TILE) / 2;
  state.camScale = Math.min(SW() / (GRID_W * TILE), SH() / (GRID_H * TILE)) * 0.85;
  state.camScale = clamp(state.camScale, 0.6, 1.6);

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
    setTimeout(openHelp, 500);
  } else {
    toast('Welcome back!');
  }

  lastTime = performance.now();
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', saveGame);
}

init();
