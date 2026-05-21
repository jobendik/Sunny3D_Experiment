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

// Subtle vignette + warm/cool grade so the framing feels filmic
// rather than "raw renderer output". Strength is conservative —
// dark corners only, +1% saturation, +2% warmth at low light levels.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.28 },
    uWarmth: { value: 0.03 },
    uSat: { value: 1.05 },
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
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // Vignette: darken corners, leave center untouched.
      float d = length(vUv - vec2(0.5)) * 1.42;
      float v = smoothstep(0.55, 1.0, d);
      c.rgb *= 1.0 - v * uStrength;
      // Warm/cool tint
      c.r += uWarmth * (1.0 - v);
      c.b -= uWarmth * 0.5 * (1.0 - v);
      // Saturation
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, uSat);
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

  // Bloom: strength / radius / threshold. Threshold ~0.9 keeps
  // mid-tone surfaces from blooming; emissive materials and bright
  // sun highlights are the main contributors.
  bloomPass = new UnrealBloomPass(new Vector2(w, h), 0.42, 0.7, 0.85);
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
