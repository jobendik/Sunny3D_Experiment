// =============================================================
//  GEOMETRY CACHE
//
//  Cached primitives (boxes, cylinders, spheres, cones). Each
//  cached geometry can be reused by an arbitrary number of meshes
//  via different `position`/`scale` transforms.
// =============================================================

import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  PlaneGeometry,
} from 'three';

const boxCache = new Map<string, BoxGeometry>();
const cylCache = new Map<string, CylinderGeometry>();
const sphereCache = new Map<string, SphereGeometry>();
const coneCache = new Map<string, ConeGeometry>();
const planeCache = new Map<string, PlaneGeometry>();

const k3 = (a: number, b: number, c: number): string => `${a.toFixed(3)},${b.toFixed(3)},${c.toFixed(3)}`;
const k4 = (a: number, b: number, c: number, d: number): string =>
  `${a.toFixed(3)},${b.toFixed(3)},${c.toFixed(3)},${d}`;

export function box(w: number, h: number, d: number): BoxGeometry {
  const k = k3(w, h, d);
  let g = boxCache.get(k);
  if (!g) {
    g = new BoxGeometry(w, h, d);
    boxCache.set(k, g);
  }
  return g;
}

export function cyl(radiusTop: number, radiusBottom: number, height: number, radial = 12): CylinderGeometry {
  const k = k4(radiusTop, radiusBottom, height, radial);
  let g = cylCache.get(k);
  if (!g) {
    g = new CylinderGeometry(radiusTop, radiusBottom, height, radial);
    cylCache.set(k, g);
  }
  return g;
}

export function sphere(radius: number, w = 12, h = 10): SphereGeometry {
  const k = k4(radius, w, h, 0);
  let g = sphereCache.get(k);
  if (!g) {
    g = new SphereGeometry(radius, w, h);
    sphereCache.set(k, g);
  }
  return g;
}

export function cone(radius: number, height: number, radial = 8): ConeGeometry {
  const k = k4(radius, height, radial, 0);
  let g = coneCache.get(k);
  if (!g) {
    g = new ConeGeometry(radius, height, radial);
    coneCache.set(k, g);
  }
  return g;
}

export function plane(w: number, h: number): PlaneGeometry {
  const k = `${w.toFixed(3)},${h.toFixed(3)}`;
  let g = planeCache.get(k);
  if (!g) {
    g = new PlaneGeometry(w, h);
    planeCache.set(k, g);
  }
  return g;
}
