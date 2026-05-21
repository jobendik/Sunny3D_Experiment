// =============================================================
//  BUILDING KIT
//
//  Small reusable parts (walls, roofs, windows, doors, chimneys,
//  fences) that every building procedure draws from. A building's
//  job is to compose these parts — not to write geometry from
//  scratch — so styling stays consistent across the farm.
//
//  Everything is positioned in *local* coords where (0,0,0) is the
//  southwest-bottom corner of the building footprint (in tile
//  units, 1 unit = 1 tile).
// =============================================================

import {
  Mesh,
  Group,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ShapeGeometry,
  Shape,
  Color,
  MeshLambertMaterial,
} from 'three';
import { box, cyl, cone } from './geometries';
import { mat } from './materials';

// Shared window-glass material — all window panes across all 21
// buildings use this single material so a one-line emissive update
// in buildings-manager lights up the whole farm at night.
const _glassDayColor = new Color('#b8d4e8');
const _glassNightColor = new Color('#fff0b0');
const _glassEmissive = new Color('#000000');
const windowGlassMat = new MeshLambertMaterial({
  color: _glassDayColor.clone(),
  emissive: _glassEmissive.clone(),
  flatShading: true,
});

/** Drive window glow from outside (called once per frame). */
export function setWindowGlow(intensity: number): void {
  const t = Math.max(0, Math.min(1, intensity));
  // Color: cool-blue daylight → warm-yellow lamplight.
  windowGlassMat.color.copy(_glassDayColor).lerp(_glassNightColor, t);
  // Emissive: only "on" once it's actually night, then ramps up.
  const e = t * t; // gentle ease
  windowGlassMat.emissive.setRGB(e * 0.95, e * 0.7, e * 0.25);
}

export interface WallOpts {
  w: number;            // tile-units along x
  d: number;            // tile-units along z
  h?: number;           // height in units (default 1.0)
  color?: string;       // wall color
  trim?: string;        // base/window-frame trim color
}

/** Plain box-shaped walls with optional foundation trim. */
export function walls(o: WallOpts): Group {
  const g = new Group();
  const h = o.h ?? 1.0;
  const color = o.color ?? '#e7d6b5';
  const trim = o.trim ?? '#8a6740';
  const body = new Mesh(box(o.w, h, o.d), mat(color));
  body.position.set(o.w / 2, h / 2, o.d / 2);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Foundation stripe (slightly larger, slightly taller).
  const baseH = 0.12;
  const baseInset = -0.04;
  const baseM = new Mesh(box(o.w - baseInset * 2, baseH, o.d - baseInset * 2), mat(trim));
  baseM.position.set(o.w / 2, baseH / 2, o.d / 2);
  baseM.castShadow = true;
  baseM.receiveShadow = true;
  g.add(baseM);
  return g;
}

export interface GableRoofOpts {
  w: number;
  d: number;
  baseY: number;       // y where the roof sits on top of the walls
  pitch?: number;       // roof height
  color?: string;
  axis?: 'x' | 'z';     // long axis of the ridge
  overhang?: number;
}

/** Gable roof made from two leaning slabs meeting at a ridge. */
export function gableRoof(o: GableRoofOpts): Group {
  const g = new Group();
  const pitch = o.pitch ?? 0.7;
  const color = o.color ?? '#a23628';
  const axis = o.axis ?? 'x';
  const overhang = o.overhang ?? 0.12;

  // We approximate a gable as a triangular prism: a thin box
  // rotated 90° around its long axis, plus another mirror copy.
  // Simpler: extrude a 2D triangle along the ridge.
  const shape = new Shape();
  if (axis === 'x') {
    // Triangle in z-y plane; we extrude along x
    shape.moveTo(-(o.d / 2 + overhang), 0);
    shape.lineTo((o.d / 2 + overhang), 0);
    shape.lineTo(0, pitch);
    shape.closePath();
  } else {
    shape.moveTo(-(o.w / 2 + overhang), 0);
    shape.lineTo((o.w / 2 + overhang), 0);
    shape.lineTo(0, pitch);
    shape.closePath();
  }
  // ShapeGeometry is flat — we use ExtrudeGeometry would be ideal but
  // a flat shape + a thin slab beneath gives a clean stylized look.
  // We'll fake the prism by adding two slanted boxes — cheap & robust.

  if (axis === 'x') {
    const slabLen = o.w + overhang * 2;
    const slabW = Math.sqrt((o.d / 2) ** 2 + pitch ** 2) + overhang;
    const slabThick = 0.05;
    const angle = Math.atan2(pitch, o.d / 2);
    const left = new Mesh(box(slabLen, slabThick, slabW), mat(color));
    left.rotation.x = -angle;
    left.position.set(o.w / 2, o.baseY + pitch / 2, o.d / 4);
    left.castShadow = true; left.receiveShadow = true;
    const right = new Mesh(box(slabLen, slabThick, slabW), mat(color));
    right.rotation.x = angle;
    right.position.set(o.w / 2, o.baseY + pitch / 2, o.d * 3 / 4);
    right.castShadow = true; right.receiveShadow = true;
    g.add(left, right);
    // Gable end triangles (flat) so the inside of the roof reads as solid
    const triShape = new Shape();
    triShape.moveTo(-o.d / 2, 0);
    triShape.lineTo(o.d / 2, 0);
    triShape.lineTo(0, pitch);
    const triGeom = new ShapeGeometry(triShape);
    const triA = new Mesh(triGeom, mat(color));
    triA.rotation.y = -Math.PI / 2;
    triA.position.set(0, o.baseY, o.d / 2);
    triA.scale.set(1, 1, 1);
    const triB = triA.clone();
    triB.position.set(o.w, o.baseY, o.d / 2);
    g.add(triA, triB);
  } else {
    const slabLen = o.d + overhang * 2;
    const slabW = Math.sqrt((o.w / 2) ** 2 + pitch ** 2) + overhang;
    const slabThick = 0.05;
    const angle = Math.atan2(pitch, o.w / 2);
    const left = new Mesh(box(slabW, slabThick, slabLen), mat(color));
    left.rotation.z = angle;
    left.position.set(o.w / 4, o.baseY + pitch / 2, o.d / 2);
    left.castShadow = true; left.receiveShadow = true;
    const right = new Mesh(box(slabW, slabThick, slabLen), mat(color));
    right.rotation.z = -angle;
    right.position.set(o.w * 3 / 4, o.baseY + pitch / 2, o.d / 2);
    right.castShadow = true; right.receiveShadow = true;
    g.add(left, right);
    const triShape = new Shape();
    triShape.moveTo(-o.w / 2, 0);
    triShape.lineTo(o.w / 2, 0);
    triShape.lineTo(0, pitch);
    const triGeom = new ShapeGeometry(triShape);
    const triA = new Mesh(triGeom, mat(color));
    triA.position.set(o.w / 2, o.baseY, 0);
    triA.scale.set(1, 1, 1);
    const triB = triA.clone();
    triB.position.set(o.w / 2, o.baseY, o.d);
    g.add(triA, triB);
  }
  return g;
}

/** Flat hipped/pyramid roof (used for square buildings & towers). */
export function pyramidRoof(w: number, d: number, baseY: number, pitch = 0.7, color = '#a23628'): Mesh {
  // ConeGeometry with 4 radial segments approximates a pyramid.
  const radius = Math.hypot(w / 2, d / 2);
  const geom = new ConeGeometry(radius, pitch, 4);
  geom.rotateY(Math.PI / 4);
  const m = new Mesh(geom, mat(color));
  m.position.set(w / 2, baseY + pitch / 2, d / 2);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export interface DoorOpts {
  w?: number;       // door width (units)
  h?: number;       // door height
  faceX?: number;   // local x position of door (default: building center)
  faceZ: number;    // wall z (0 = south wall, d = north wall)
  color?: string;
  facing?: 'south' | 'north';
}

/** Door panel + small step. */
export function door(o: DoorOpts): Group {
  const g = new Group();
  const w = o.w ?? 0.36;
  const h = o.h ?? 0.55;
  const color = o.color ?? '#5a3414';
  const x = o.faceX ?? 0.5;
  const z = o.faceZ;
  const facing = o.facing ?? (z < 0.5 ? 'south' : 'north');

  const panel = new Mesh(box(w, h, 0.04), mat(color));
  panel.position.set(x, h / 2 + 0.12, z + (facing === 'south' ? -0.005 : 0.005));
  panel.castShadow = true;
  g.add(panel);
  // Step
  const step = new Mesh(box(w + 0.12, 0.06, 0.18), mat('#777'));
  step.position.set(x, 0.03, z + (facing === 'south' ? -0.09 : 0.09));
  step.receiveShadow = true;
  g.add(step);
  // Door handle dot
  const handle = new Mesh(cyl(0.018, 0.018, 0.02, 8), mat('#f4d160'));
  handle.rotation.x = Math.PI / 2;
  handle.position.set(x + w / 2 - 0.06, h / 2 + 0.12, z + (facing === 'south' ? -0.025 : 0.025));
  g.add(handle);
  return g;
}

export interface WindowOpts {
  faceZ: number;     // z of the wall
  faceX: number;     // x along the wall
  y?: number;        // window center y
  w?: number;
  h?: number;
  color?: string;
  glow?: number;     // 0..1, how lit the window is at night
  facing?: 'south' | 'north';
}

/** Window pane — frame + glass. The glass mesh uses a shared
 *  module-level material (windowGlassMat) so setWindowGlow() can
 *  light up every window on every building in one assignment. */
export function windowPane(o: WindowOpts): Group {
  const g = new Group();
  const w = o.w ?? 0.22;
  const h = o.h ?? 0.22;
  const y = o.y ?? 0.65;
  const frameColor = o.color ?? '#3a2a18';
  const facing = o.facing ?? (o.faceZ < 0.5 ? 'south' : 'north');

  const frame = new Mesh(box(w + 0.04, h + 0.04, 0.04), mat(frameColor));
  frame.position.set(o.faceX, y, o.faceZ + (facing === 'south' ? -0.01 : 0.01));
  g.add(frame);
  const glass = new Mesh(box(w, h, 0.03), windowGlassMat);
  glass.position.set(o.faceX, y, o.faceZ + (facing === 'south' ? -0.022 : 0.022));
  g.add(glass);
  // Cross-frame
  const vbar = new Mesh(box(0.018, h, 0.015), mat(frameColor));
  vbar.position.set(o.faceX, y, o.faceZ + (facing === 'south' ? -0.032 : 0.032));
  g.add(vbar);
  const hbar = new Mesh(box(w, 0.018, 0.015), mat(frameColor));
  hbar.position.set(o.faceX, y, o.faceZ + (facing === 'south' ? -0.032 : 0.032));
  g.add(hbar);
  return g;
}

/** Brick chimney with a small ember glow. */
export function chimney(x: number, z: number, baseY: number, h = 0.55): Group {
  const g = new Group();
  const body = new Mesh(box(0.16, h, 0.16), mat('#8a4a2a'));
  body.position.set(x, baseY + h / 2, z);
  body.castShadow = true;
  g.add(body);
  const cap = new Mesh(box(0.22, 0.05, 0.22), mat('#b88060'));
  cap.position.set(x, baseY + h + 0.025, z);
  g.add(cap);
  const ember = new Mesh(box(0.1, 0.04, 0.1), mat('#1a0e08', { emissive: '#f46428' }));
  ember.position.set(x, baseY + h + 0.06, z);
  g.add(ember);
  return g;
}

/** A short fence around a footprint (used by pens). Caller picks
 *  which sides to fence by passing { n, s, e, w }. */
export interface FenceOpts {
  w: number;
  d: number;
  color?: string;
  height?: number;
  sides?: { n?: boolean; s?: boolean; e?: boolean; w?: boolean };
}
export function fence(o: FenceOpts): Group {
  const g = new Group();
  const color = o.color ?? '#a07040';
  const h = o.height ?? 0.32;
  const sides = o.sides ?? { n: true, s: true, e: true, w: true };
  const postR = 0.05;
  const rail = 0.03;
  function addRail(x0: number, z0: number, x1: number, z1: number): void {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const m = new Mesh(box(len, rail, rail * 1.3), mat(color));
    m.position.set((x0 + x1) / 2, h * 0.55, (z0 + z1) / 2);
    m.rotation.y = -angle;
    g.add(m);
    const m2 = m.clone();
    m2.position.set((x0 + x1) / 2, h * 0.9, (z0 + z1) / 2);
    g.add(m2);
  }
  function addPost(x: number, z: number): void {
    const p = new Mesh(cyl(postR, postR, h, 6), mat(color));
    p.position.set(x, h / 2, z);
    p.castShadow = true;
    g.add(p);
  }
  // Posts at corners always.
  addPost(0, 0); addPost(o.w, 0); addPost(o.w, o.d); addPost(0, o.d);
  if (sides.s) addRail(0, 0, o.w, 0);
  if (sides.n) addRail(0, o.d, o.w, o.d);
  if (sides.w) addRail(0, 0, 0, o.d);
  if (sides.e) addRail(o.w, 0, o.w, o.d);
  return g;
}

/** Drop a generic "rooftop sign" — a small box pointing up so each
 *  building has a quick-read identity tag in the air. */
export function rooftopSign(x: number, y: number, z: number, color: string, height = 0.18): Mesh {
  const m = new Mesh(box(0.2, height, 0.2), mat(color));
  m.position.set(x, y + height / 2, z);
  m.castShadow = true;
  return m;
}

/** Small smoke puff used to suggest active production. The position
 *  is local to the building. */
export function smokePuff(x: number, y: number, z: number, scale = 1, alpha = 0.6): Mesh {
  const m = new Mesh(
    new BoxGeometry(0.2 * scale, 0.2 * scale, 0.2 * scale),
    mat('#d8d8d8', { transparent: true, opacity: alpha }),
  );
  m.position.set(x, y, z);
  return m;
}

/** Simple cylindrical silo body — convenience helper. */
export function silo(x: number, z: number, radius = 0.4, height = 1.2, color = '#c8c8c8'): Group {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(radius, radius, height, 14), mat(color));
  body.position.set(x, height / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  const cap = new Mesh(new ConeGeometry(radius + 0.02, 0.28, 14), mat('#8a8a8a'));
  cap.position.set(x, height + 0.14, z);
  g.add(body, cap);
  return g;
}
