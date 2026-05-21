// =============================================================
//  POST-PROCESSING PIPELINE
//
//  Render flow:  Scene -> RenderPass -> UnrealBloomPass -> SMAA -> Output
//
//  Bloom is tuned conservatively — we want the windowsill lamps,
//  treasure chests, and goal beacon to glow softly without nuking
//  the sunny-day look. The bloom selectively picks up emissive
//  materials & values above ~1.0; everything else passes through.
//
//  SMAA is used over FXAA because the stylized flat-shaded geometry
//  has very crisp silhouettes that benefit from subpixel resolution.
// =============================================================

import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getRenderer } from './renderer';
import { getSceneRoot } from './scene-root';
import { getCamera } from './camera-rig';

let composer: EffectComposer | null = null;
let bloomPass: UnrealBloomPass | null = null;
let smaa: SMAAPass | null = null;

function size(): { w: number; h: number } {
  return { w: window.innerWidth, h: window.innerHeight };
}

export function getComposer(): EffectComposer {
  if (composer) return composer;
  const renderer = getRenderer();
  const { scene } = getSceneRoot();
  const camera = getCamera();
  const { w, h } = size();

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(w, h);

  composer.addPass(new RenderPass(scene, camera));

  // Bloom: strength / radius / threshold. Threshold ~0.9 keeps
  // mid-tone surfaces from blooming; emissive materials and bright
  // sun highlights are the main contributors.
  bloomPass = new UnrealBloomPass(new Vector2(w, h), 0.42, 0.7, 0.85);
  composer.addPass(bloomPass);

  // SMAAPass auto-sizes from its composer in r155+.
  smaa = new SMAAPass();
  composer.addPass(smaa);

  // OutputPass applies tone mapping & sRGB conversion at the very
  // end so the intermediate ping-pong textures stay in linear space.
  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    if (!composer || !bloomPass) return;
    const s = size();
    composer.setSize(s.w, s.h);
    bloomPass.resolution.set(s.w, s.h);
  });

  return composer;
}

/** Adjust bloom strength at runtime (e.g. boost at night). */
export function setBloomStrength(v: number): void {
  if (bloomPass) bloomPass.strength = v;
}
