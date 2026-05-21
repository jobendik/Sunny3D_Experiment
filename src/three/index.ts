// =============================================================
//  THREE.JS ENTRY
//
//  init3d() — call once at boot to set up renderer, scene, lights,
//             terrain, sky, weather, beacons, etc.
//  render3d(dt) — call every frame from main.ts; syncs the camera
//                 from game state, ticks per-entity managers, and
//                 draws the scene through the post-fx composer.
// =============================================================

import { getRenderer } from './renderer';
import { getSceneRoot } from './scene-root';
import { getCamera, syncCameraFromState } from './camera-rig';
import { initLighting, updateLighting } from './lighting';
import { initTerrain, updateTerrain } from './terrain/tile-grid';
import { installGrassBlades, updateGrassBlades } from './terrain/grass-blades';
import { installOuterWorld, updateOuterWorld } from './terrain/outer-world';
import { installFogOfWar, updateFogOfWar } from './terrain/fog-of-war';
import { installLakeDecor, updateLakeDecor } from './terrain/lake-decor';
import { installWildflowers } from './terrain/wildflowers';
import { installScatter } from './terrain/scatter';
import { installBirds, updateBirds } from './fx/birds';
import { installGodRays, updateGodRays } from './fx/god-rays';
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
import { installAmbientLife, updateAmbientLife } from './fx/ambient-life';
import { getComposer, setBloomStrength } from './post-fx';

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
  installOuterWorld();
  installBackgroundTrees();
  installGrassBlades();
  installSky();
  installWeather();
  installBeacon();
  installPlacementPreview();
  installHoverTile();
  installAmbientLife();
  installFogOfWar();
  installLakeDecor();
  installWildflowers();
  installScatter();
  installBirds();
  installGodRays();
  // Prime the composer so its first frame isn't a stutter.
  getComposer();
}

export function render3d(dt: number): void {
  if (!inited) init3d();
  timeS += dt;
  syncCameraFromState();
  const light = updateLighting();
  updateTerrain(timeS);
  updateGrassBlades(timeS, light);
  updateOuterWorld(timeS);
  updateFogOfWar(timeS, light);
  updateLakeDecor(timeS);
  updateBirds(timeS, dt, light);
  updateGodRays(timeS, light);
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
  updateAmbientLife(timeS, light);
  updatePlacementPreview();

  // Bloom shines brightest at dusk when lamps & windows start to
  // come on. During full daylight we keep a gentle base so sun
  // highlights and ripe-crop sparkles still register as "glowy";
  // at full night we ease back so the warm window halos don't
  // bleed into giant suns.
  setBloomStrength(0.38 + light.nightTint * 0.34);

  getComposer().render(dt);
}
