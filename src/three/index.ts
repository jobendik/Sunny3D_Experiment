// =============================================================
//  THREE.JS ENTRY
//
//  init3d() — call once at boot to set up renderer, scene, lights,
//             terrain, sky, weather, beacons, etc.
//  render3d(dt) — call every frame from main.ts; syncs the camera
//                 from game state, ticks per-entity managers, and
//                 draws the scene.
// =============================================================

import { getRenderer } from './renderer';
import { getSceneRoot } from './scene-root';
import { getCamera, syncCameraFromState } from './camera-rig';
import { initLighting, updateLighting } from './lighting';
import { initTerrain, updateTerrain } from './terrain/tile-grid';
import { updateBuildings } from './entities/buildings-manager';
import { updateCrops } from './entities/crops-manager';
import { updateTrees } from './entities/trees-manager';
import { updateAnimals } from './entities/animals-manager';
import { updateDecor } from './entities/decor-manager';
import { updateCrows } from './entities/crows-manager';
import { updateDog } from './entities/dog-manager';
import { installBackgroundTrees } from './decor/background-trees';
import { installSky, updateSky } from './sky/sky-dome';
import { installWeather, updateWeather } from './fx/weather-particles';
import { updateTreasureChests } from './fx/treasure-chests';
import { installBeacon, updateBeacon } from './fx/beacon';
import { installPlacementPreview, updatePlacementPreview } from './fx/placement-preview';
import { installHoverTile, updateHoverTile } from './fx/hover-tile';

let inited = false;
let timeS = 0;

export function init3d(): void {
  if (inited) return;
  inited = true;
  getRenderer();
  getSceneRoot();
  getCamera();
  initLighting();
  initTerrain();
  installBackgroundTrees();
  installSky();
  installWeather();
  installBeacon();
  installPlacementPreview();
  installHoverTile();
}

export function render3d(dt: number): void {
  if (!inited) init3d();
  timeS += dt;
  syncCameraFromState();
  const light = updateLighting();
  updateTerrain(timeS);
  updateBuildings(light);
  updateCrops(timeS);
  updateTrees(timeS);
  updateAnimals(timeS);
  updateDecor(timeS);
  updateCrows(timeS);
  updateDog(timeS);
  updateSky();
  updateWeather(dt);
  updateTreasureChests(timeS);
  updateBeacon(timeS);
  updateHoverTile(timeS);
  updatePlacementPreview();

  const renderer = getRenderer();
  const { scene } = getSceneRoot();
  renderer.render(scene, getCamera());
}
