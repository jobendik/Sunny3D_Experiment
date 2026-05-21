// =============================================================
//  CAMERA RIG  (locked-iso perspective + optional snap-rotate)
//
//  Hay-Day-style: the camera is locked to a cozy 3/4 iso angle.
//  Players pan and zoom; they do NOT free-orbit. A dedicated
//  "rotate view" button cycles through the 4 cardinal iso angles
//  via a smooth lerp (rotateView() below) — that is the only way
//  yaw changes during play. Pitch is fixed.
//
//  State convention (kept from the prior version so save format
//  is untouched):
//    state.camX, state.camY  — target ground position in PIXELS
//    state.camYaw            — radians around world-Y; default π/4
//    state.camPitch          — radians from horizon; locked at ~40°
//    state.camScale          — zoom; distance = BASE_DISTANCE / scale
// =============================================================

import { PerspectiveCamera, Vector3 } from 'three';
import { state } from '../state';
import { TILE } from '../constants';
import { SW, SH } from '../canvas';

// Slightly tighter FOV (32°) compresses the iso framing toward a
// premium "mobile farm hero shot" look — silhouettes flatten in a
// pleasant way and individual buildings read crisper.
const FOV_DEG = 32;
const NEAR = 0.1;
const FAR = 200;

// Camera distance at camScale = 1. Tuned to roughly match the
// legacy iso framing so existing UI/build-menu offsets line up.
const BASE_DISTANCE = 22;

// Locked iso angle — the cozy 3/4 view. Yaw is one of 4 cardinal
// snaps (DEFAULT_YAW + k·π/2); pitch never moves.
// Pitch raised slightly to 36° from horizon — the playable ground
// plane still spreads attractively across the screen, but the
// buildings have a hair more "presence" (taller silhouettes catch
// the sun better at this angle than they did at 33°).
export const DEFAULT_YAW = Math.PI * 0.25;       // 45° around Y
export const DEFAULT_PITCH = 0.64;               // ~37° from horizon

// A snap-rotate tween in progress, if any. The driver is
// tickCameraTween() (called from loop.ts each frame).
let yawTweenTarget: number | null = null;

let cam: PerspectiveCamera | null = null;
const tmpTarget = new Vector3();

export function getCamera(): PerspectiveCamera {
  if (cam) return cam;
  cam = new PerspectiveCamera(FOV_DEG, 1, NEAR, FAR);
  // Migration: saves from the previous free-cam build may have any
  // yaw/pitch. Snap to the nearest cardinal iso facing on first
  // construct so the player lands on a clean view, never mid-orbit.
  const k = Math.round((state.camYaw - DEFAULT_YAW) / (Math.PI / 2));
  state.camYaw = DEFAULT_YAW + k * (Math.PI / 2);
  state.camPitch = DEFAULT_PITCH;
  return cam;
}

/** Snap to the next cardinal iso angle (clockwise from current).
 *  Smoothly lerped by tickCameraTween() over ~0.4s. */
export function rotateView(): void {
  const base = yawTweenTarget ?? state.camYaw;
  yawTweenTarget = base + Math.PI / 2;
}

/** Snap back to the default iso facing. */
export function resetView(): void {
  // Pick the equivalent of DEFAULT_YAW nearest the current yaw so
  // we lerp the short way around instead of unwinding 7π.
  const k = Math.round((state.camYaw - DEFAULT_YAW) / (Math.PI / 2));
  yawTweenTarget = DEFAULT_YAW + k * (Math.PI / 2);
  // Reset orientation index too — back to "north" at the default.
  if (yawTweenTarget !== state.camYaw) {
    yawTweenTarget = DEFAULT_YAW;
  }
}

/** Drive any active yaw tween. Called once per frame from loop.ts. */
export function tickCameraTween(dt: number): void {
  // Pitch is permanently locked — clamp every frame so legacy saves
  // (or any errant mutation) snap back without a one-frame glitch.
  state.camPitch = DEFAULT_PITCH;

  if (yawTweenTarget === null) return;
  const diff = yawTweenTarget - state.camYaw;
  if (Math.abs(diff) < 0.0015) {
    state.camYaw = yawTweenTarget;
    yawTweenTarget = null;
    return;
  }
  // Critically-damped feel: ~0.4s to converge from a quarter turn.
  state.camYaw += diff * Math.min(1, dt * 7);
}

/** True while a snap-rotate is in flight. UI uses this to disable
 *  the rotate button mid-tween (otherwise spamming the button
 *  stacks rotations and overshoots). */
export function isRotating(): boolean {
  return yawTweenTarget !== null;
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

  // Spherical position around the target.
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
