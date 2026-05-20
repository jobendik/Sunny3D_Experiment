// =============================================================
//  CAMERA RIG
//
//  Classic iso 3/4 view, like cozy-acres.html: camera positioned
//  at (R, H, R) looking at the target on the ground plane. That's
//  effectively 45° yaw + ~40° pitch.
//
//  Coordinate mapping:
//    state.camX, state.camY : world position in PIXELS
//    1 tile (TILE pixels)    = 1 world unit in 3D space
//    state.camScale = 1      ⇒ a tile occupies ~TILE*ZOOM_GAIN
//                               screen pixels
// =============================================================

import { OrthographicCamera, Vector3 } from 'three';
import { state } from '../state';
import { TILE } from '../constants';
import { SW, SH } from '../canvas';

// Iso offset from target. Match the inspiration's (10, 12, 10).
// Distance ~18, pitch ~40°, yaw 45°.
const ISO_OFFSET = new Vector3(10, 12, 10);
// Multiplier applied to the ortho frustum so that 1 unit of
// state.camScale gives a nice "Hay-Day-like" tile size on screen.
// Higher = more zoomed in.
export const ZOOM_GAIN = 1.5;

let cam: OrthographicCamera | null = null;
const tmpTarget = new Vector3();

export function getCamera(): OrthographicCamera {
  if (cam) return cam;
  cam = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  return cam;
}

export function syncCameraFromState(): void {
  const c = getCamera();
  const tx = state.camX / TILE;
  const tz = state.camY / TILE;
  tmpTarget.set(tx, 0, tz);

  const halfW = SW() / (state.camScale * TILE * ZOOM_GAIN) * 0.5;
  const halfH = SH() / (state.camScale * TILE * ZOOM_GAIN) * 0.5;
  c.left = -halfW;
  c.right = halfW;
  c.top = halfH;
  c.bottom = -halfH;
  c.near = 0.1;
  c.far = 100;

  c.position.set(
    tmpTarget.x + ISO_OFFSET.x,
    ISO_OFFSET.y,
    tmpTarget.z + ISO_OFFSET.z,
  );
  c.up.set(0, 1, 0);
  c.lookAt(tmpTarget);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
}
