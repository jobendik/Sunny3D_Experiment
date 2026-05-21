// =============================================================
//  THREE.JS RENDERER
//  Wraps the WebGLRenderer attached to the world canvas. Input,
//  CSS, and DOM consumers keep using the original #world element
//  — we just give it a GL context instead of a 2D one.
//
//  Tone mapping is set to ACESFilmic so warm/cold lighting from the
//  day cycle reads cinematic rather than washed-out. Output color
//  space is sRGB so authored hex colors render as the artist sees
//  them. Bloom + SMAA live in post-fx.ts.
// =============================================================

import { WebGLRenderer, VSMShadowMap, ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { cv } from '../canvas';

let renderer: WebGLRenderer | null = null;

export function getRenderer(): WebGLRenderer {
  if (renderer) return renderer;

  renderer = new WebGLRenderer({
    canvas: cv,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  // VSM blurs shadow edges naturally and avoids the chunky PCF
  // checkerboard you get on stylized geometry.
  renderer.shadowMap.type = VSMShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x9ed3f5, 1);

  window.addEventListener('resize', () => {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  return renderer;
}
