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
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getRenderer } from './renderer';
import { getSceneRoot } from './scene-root';
import { getCamera } from './camera-rig';

// Cozy color grade: soft vignette, warm sunset-ish tint in the
// corners, a kiss of saturation, a touch of lift+gain S-curve, and
// a subtle warm highlight push. Keeps the cinematic feel without
// crushing midtones.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.34 },
    uWarmth: { value: 0.05 },
    uSat: { value: 1.10 },
    uLift: { value: 0.012 },          // raise blacks slightly
    uHighlightWarm: { value: 0.018 }, // gently warm the highlights
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uWarmth;
    uniform float uSat;
    uniform float uLift;
    uniform float uHighlightWarm;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // Vignette: darken corners, leave center untouched. Slightly
      // softer falloff so the player's eye isn't drawn to a hard
      // ring at the edges.
      float d = length(vUv - vec2(0.5)) * 1.42;
      float v = smoothstep(0.50, 1.05, d);
      c.rgb *= 1.0 - v * uStrength;
      // Warm corners — sells "afternoon sun".
      c.r += uWarmth * v;
      c.g += uWarmth * 0.55 * v;
      c.b -= uWarmth * 0.35 * v;
      // Lift shadows a hair so dark crevices don't crush black.
      c.rgb += vec3(uLift);
      // Warm-highlight push: bright pixels pull toward honey, which
      // makes sun-lit rooftops feel "lit by golden hour" without
      // bleeding tint into midtones.
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      float hi = smoothstep(0.55, 1.0, lum);
      c.r += hi * uHighlightWarm;
      c.g += hi * uHighlightWarm * 0.4;
      c.b -= hi * uHighlightWarm * 0.6;
      // Saturation
      vec3 grey = vec3(lum);
      c.rgb = mix(grey, c.rgb, uSat);
      gl_FragColor = c;
    }
  `,
};

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

  // Bloom: strength / radius / threshold. Threshold ~0.82 lets
  // bright sun highlights, ripe-crop sparkles, treasure chest
  // glow, and emissive materials all pick up a gentle halo
  // without the rest of the scene smearing.
  bloomPass = new UnrealBloomPass(new Vector2(w, h), 0.48, 0.85, 0.82);
  composer.addPass(bloomPass);

  // SMAAPass auto-sizes from its composer in r155+.
  smaa = new SMAAPass();
  composer.addPass(smaa);

  // Vignette + slight grade. Runs before OutputPass so it operates
  // in linear-ish HDR space.
  composer.addPass(new ShaderPass(VignetteShader));

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
