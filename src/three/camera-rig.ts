// =============================================================
//  CAMERA RIG  (constrained-orbit perspective)
//
//  Perspective camera that orbits around a ground target. State:
//    state.camX, state.camY  — target ground position in PIXELS
//                              (same convention as before)
//    state.camYaw            — rotation around world-Y, radians
//                              (π/4 = classic iso facing)
//    state.camPitch          — tilt from horizon, radians
//                              (clamped to [PITCH_MIN, PITCH_MAX])
//    state.camScale          — zoom; mapped to camera distance via
//                              distance = BASE_DISTANCE / camScale
//
//  Pan, rotate, and zoom are all driven by state mutations from
//  input.ts. This module is a pure projector.
// =============================================================

import { PerspectiveCamera, Vector3 } from 'three';
import { state } from '../state';
import { TILE } from '../constants';
import { SW, SH } from '../canvas';

const FOV_DEG = 34;
const NEAR = 0.1;
const FAR = 200;

// Camera distance from target at camScale = 1. Roughly matches the
// old iso framing so existing UI/build-menu offsets still look right.
const BASE_DISTANCE = 22;

// Free-cam: open the pitch range almost end-to-end. We still clamp
// just shy of horizon-skim and pole to avoid the lookAt() singularity
// (camera up vector flips when pitch crosses ±π/2).
export const PITCH_MIN = Math.PI / 30;        // ~6°   (near horizon)
export const PITCH_MAX = Math.PI * 0.49;      // ~88°  (just shy of straight down)

let cam: PerspectiveCamera | null = null;
const tmpTarget = new Vector3();

export function getCamera(): PerspectiveCamera {
  if (cam) return cam;
  cam = new PerspectiveCamera(FOV_DEG, 1, NEAR, FAR);
  return cam;
}

export function syncCameraFromState(): void {
  const c = getCamera();

  // Target = ground point in world (tile) units.
  const tx = state.camX / TILE;
  const tz = state.camY / TILE;
  tmpTarget.set(tx, 0, tz);

  const distance = BASE_DISTANCE / state.camScale;
  const yaw = state.camYaw;
  const pitch = state.camPitch;

  // Spherical coordinates around the target. yaw=π/4 + pitch≈40°
  // reproduces the legacy iso-3/4 framing.
  const horiz = Math.cos(pitch) * distance;
  const cx = tmpTarget.x + Math.cos(yaw) * horiz;
  const cy = tmpTarget.y + Math.sin(pitch) * distance;
  const cz = tmpTarget.z + Math.sin(yaw) * horiz;

  c.aspect = SW() / Math.max(1, SH());
  c.position.set(cx, cy, cz);
  c.up.set(0, 1, 0);
  c.lookAt(tmpTarget);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
}
