// =============================================================
//  CHAMFERED TILE GEOMETRY
//
//  A box with the top edges bevelled inward — gives every ground
//  tile a soft rim that catches the rim-light at sunrise/sunset
//  without paying for a true rounded mesh. Bottom stays flat
//  because we never see it.
//
//  Layout (top half, cross-section):
//
//     top:        ____
//                /    \      ← bevel face (slanted)
//        sides: |      |     ← straight vertical
//                ‾‾‾‾‾‾
//
//  Built by hand because BoxGeometry doesn't bevel and pulling in
//  three-bvh-csg for one shape is overkill.
// =============================================================

import { BufferGeometry, BufferAttribute } from 'three';

interface Cache { key: string; geom: BufferGeometry }
const cache: Cache[] = [];

export function chamferedTileGeometry(w: number, h: number, d: number, bevel: number): BufferGeometry {
  const key = `${w.toFixed(4)},${h.toFixed(4)},${d.toFixed(4)},${bevel.toFixed(4)}`;
  for (const c of cache) if (c.key === key) return c.geom;

  const hw = w / 2;
  const hd = d / 2;
  const top = h / 2;
  const bot = -h / 2;
  // Bevel sits just below the top, pulling the corners in by `bevel`.
  const topInY = top - bevel;
  const inHW = hw - bevel;
  const inHD = hd - bevel;

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  function quad(a: number[], b: number[], c: number[], d: number[], n: number[]): void {
    const i0 = positions.length / 3;
    positions.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) normals.push(...n);
    indices.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }

  // BOTTOM (flat)
  quad(
    [-hw, bot, -hd], [ hw, bot, -hd], [ hw, bot, hd], [-hw, bot, hd],
    [0, -1, 0],
  );
  // SIDES — vertical strips from bottom up to the bevel start.
  // +X
  quad(
    [ hw, bot, -hd], [ hw, bot, hd], [ hw, topInY, hd], [ hw, topInY, -hd],
    [1, 0, 0],
  );
  // -X
  quad(
    [-hw, bot, hd], [-hw, bot, -hd], [-hw, topInY, -hd], [-hw, topInY, hd],
    [-1, 0, 0],
  );
  // +Z
  quad(
    [ hw, bot, hd], [-hw, bot, hd], [-hw, topInY, hd], [ hw, topInY, hd],
    [0, 0, 1],
  );
  // -Z
  quad(
    [-hw, bot, -hd], [ hw, bot, -hd], [ hw, topInY, -hd], [-hw, topInY, -hd],
    [0, 0, -1],
  );

  // BEVEL ring — 4 slanted strips between the vertical side top and
  // the inset top edge. Normal is the bisector between up and side.
  const s = Math.SQRT1_2;
  // +X bevel
  quad(
    [ hw, topInY, -hd], [ hw, topInY, hd], [ inHW, top, inHD], [ inHW, top, -inHD],
    [s, s, 0],
  );
  // -X bevel
  quad(
    [-hw, topInY, hd], [-hw, topInY, -hd], [-inHW, top, -inHD], [-inHW, top, inHD],
    [-s, s, 0],
  );
  // +Z bevel
  quad(
    [ hw, topInY, hd], [-hw, topInY, hd], [-inHW, top, inHD], [ inHW, top, inHD],
    [0, s, s],
  );
  // -Z bevel
  quad(
    [-hw, topInY, -hd], [ hw, topInY, -hd], [ inHW, top, -inHD], [-inHW, top, -inHD],
    [0, s, -s],
  );

  // TOP (flat, inset)
  quad(
    [-inHW, top, -inHD], [ inHW, top, -inHD], [ inHW, top, inHD], [-inHW, top, inHD],
    [0, 1, 0],
  );

  const geom = new BufferGeometry();
  geom.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geom.setIndex(indices);
  geom.computeBoundingSphere();
  cache.push({ key, geom });
  return geom;
}
