// =============================================================
//  SCENE ROOT
//
//  Owns the THREE.Scene and the top-level groups it contains.
//  Each subsystem (terrain, buildings, weather, …) appends its
//  meshes to one of these groups so the scene tree stays tidy
//  and easy to clear.
//
//  Fog is set far back — most of the playable area and the close
//  outer-world ring stay fully crisp; only the distant mountains &
//  fog-of-war wisps blend with it. The sky-dome shader is also
//  fog-aware-friendly because the fog color is updated each frame
//  to track the horizon hue.
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
  // Fog pushed out to ~90 because we now have a 60×60 outer world
  // ring beyond the playable grid. Distant mountains & fog-of-war
  // wisps live at 90+ where the fog softens them into the horizon.
  scene.fog = new Fog(0xcfeefc, 65, 140);

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
