// Candle Shop — small orange building with a giant candle sign.
import { Group, Mesh } from 'three';
import { walls, gableRoof, door, windowPane } from '../procgen/building-kit';
import { cyl, cone } from '../procgen/geometries';
import { mat } from '../procgen/materials';

export function makeCandleshop(w: number, d: number): Group {
  const g = new Group();
  g.add(walls({ w, d, h: 1.15, color: '#f4cd90', trim: '#5a3a18' }));
  g.add(gableRoof({ w, d, baseY: 1.15, pitch: 0.7, color: '#c46428', axis: 'x' }));
  g.add(door({ faceZ: 0, faceX: w / 2 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 - 0.9, y: 0.85 }));
  g.add(windowPane({ faceZ: 0, faceX: w / 2 + 0.9, y: 0.85 }));

  // Tall candle on roof
  const candle = new Mesh(cyl(0.13, 0.13, 0.6, 14), mat('#f4ecd0'));
  candle.position.set(w / 2, 1.95, d / 2);
  candle.castShadow = true;
  g.add(candle);
  // Wick + flame with a soft halo
  const wick = new Mesh(cyl(0.012, 0.012, 0.06, 6), mat('#3a2a18'));
  wick.position.set(w / 2, 2.28, d / 2);
  g.add(wick);
  const flameHalo = new Mesh(cone(0.12, 0.22, 10), mat('#ffba50', { transparent: true, opacity: 0.45, emissive: '#ff8a3a' }));
  flameHalo.position.set(w / 2, 2.40, d / 2);
  g.add(flameHalo);
  const flame = new Mesh(cone(0.06, 0.16, 8), mat('#fff0c0', { emissive: '#ff8a2a' }));
  flame.position.set(w / 2, 2.38, d / 2);
  g.add(flame);
  return g;
}
