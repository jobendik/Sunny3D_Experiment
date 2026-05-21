// =============================================================
//  SCENE ROOT
//
//  Owns the THREE.Scene and the top-level groups it contains.
//  Each subsystem (terrain, buildings, weather, …) appends its
//  meshes to one of these groups so the scene tree stays tidy
//  and easy to clear.
// =============================================================

import { Scene, Group, Fog, Color } from 'three';

interface SceneRoot {
  scene: Scene;
  terrain: Group;        // ground, water, shore
  decor: Group;          // background ambient decoration trees
  entities: Group;       // buildings, animals, crops, trees, decor items
  fx: Group;             // particles, beacons, treasure, floats
  sky: Group;            // sun/moon/clouds (in-scene)
  weather: Group;        // rain/snow systems
}

let cached: SceneRoot | null = null;

export function getSceneRoot(): SceneRoot {
  if (cached) return cached;
  const scene = new Scene();
  scene.background = new Color(0xcfeefc);
  // Fog tuned for the perspective iso framing. At max zoom-out the
  // camera sits ~50 world units from the target, so the far world
  // edge is at ~60 — we want it fully crisp. Fog kicks in only
  // beyond the playable area to soften the background tree ring.
  scene.fog = new Fog(0xcfeefc, 55, 120);

  const terrain = new Group(); terrain.name = 'terrain';
  const decor = new Group(); decor.name = 'decor';
  const entities = new Group(); entities.name = 'entities';
  const fx = new Group(); fx.name = 'fx';
  const sky = new Group(); sky.name = 'sky';
  const weather = new Group(); weather.name = 'weather';

  scene.add(terrain, decor, entities, fx, sky, weather);

  cached = { scene, terrain, decor, entities, fx, sky, weather };
  return cached;
}
