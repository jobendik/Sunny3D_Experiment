// =============================================================
//  THREE.JS RENDERER
//  Wraps the WebGLRenderer attached to the world canvas. Input,
//  CSS, and DOM consumers keep using the original #world element
//  — we just give it a GL context instead of a 2D one.
// =============================================================

import { WebGLRenderer, PCFSoftShadowMap, NoToneMapping, SRGBColorSpace } from 'three';
import { cv } from '../canvas';

let renderer: WebGLRenderer | null = null;

export function getRenderer(): WebGLRenderer {
  if (renderer) return renderer;

  renderer = new WebGLRenderer({
    canvas: cv,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x9ed3f5, 1);

  window.addEventListener('resize', () => {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  return renderer;
}
