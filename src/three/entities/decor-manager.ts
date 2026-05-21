// =============================================================
//  DECOR MANAGER
//
//  Decorations are small static objects with one factory per type
//  so each silhouette reads clearly. Footprint comes from
//  DECORATIONS[type] (w, h). A pinwheel spins, a fountain ripples;
//  the rest are purely static.
// =============================================================

import { Group, Mesh, MathUtils } from 'three';
import { state } from '../../state';
import { DECORATIONS } from '../../data/decorations';
import { getSceneRoot } from '../scene-root';
import { box, cyl, cone, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';

interface DecorMounted {
  id: string;
  type: string;
  root: Group;
}
const mounted = new Map<string, DecorMounted>();

function makeFlowerbed(): Group {
  const g = new Group();
  const dirt = new Mesh(box(0.7, 0.08, 0.7), mat('#6e4a28'));
  dirt.position.y = 0.04;
  g.add(dirt);
  for (let i = 0; i < 6; i++) {
    const stem = new Mesh(cyl(0.012, 0.012, 0.18, 6), mat('#3a7a30'));
    const x = -0.25 + Math.random() * 0.5;
    const z = -0.25 + Math.random() * 0.5;
    stem.position.set(x, 0.13, z);
    const head = new Mesh(sphere(0.06, 8, 6), mat(['#e64030', '#f4d160', '#a070d4', '#ff9ed4'][i % 4]!));
    head.position.set(x, 0.24, z);
    g.add(stem, head);
  }
  return g;
}

function makeLamppost(): Group {
  const g = new Group();
  const base = new Mesh(cyl(0.10, 0.10, 0.10, 8), mat('#3a2a18'));
  base.position.y = 0.05;
  g.add(base);
  const pole = new Mesh(cyl(0.030, 0.030, 1.0, 8), mat('#2a1a10'));
  pole.position.y = 0.55;
  pole.castShadow = true;
  g.add(pole);
  // Bigger emissive lamp box + a soft outer halo box for cozy glow
  const lampHalo = new Mesh(box(0.30, 0.30, 0.30), mat('#ffe9a8', { transparent: true, opacity: 0.28, emissive: '#ffae3a' }));
  lampHalo.position.y = 1.10;
  g.add(lampHalo);
  const lamp = new Mesh(box(0.20, 0.22, 0.20), mat('#fff2c0', { emissive: '#ffae3a' }));
  lamp.position.y = 1.10;
  g.add(lamp);
  const cap = new Mesh(cone(0.16, 0.13, 8), mat('#2a1a10'));
  cap.position.y = 1.30;
  g.add(cap);
  // Decorative arm + finial on top for a "real lantern" silhouette
  const finial = new Mesh(sphere(0.04, 8, 6), mat('#3a2a18'));
  finial.position.y = 1.40;
  g.add(finial);
  return g;
}

function makeBench(): Group {
  const g = new Group();
  // Slat-style park bench: 3 stacked planks for the seat + back so
  // the silhouette reads as a wooden bench from above, not a brown
  // slab. Iron legs ground it visually.
  const slatColors = ['#a06840', '#8a5530', '#a06840'];
  for (let i = 0; i < 3; i++) {
    const slat = new Mesh(box(1.4, 0.06, 0.10), mat(slatColors[i]!));
    slat.position.set(0, 0.32, -0.12 + i * 0.11);
    slat.castShadow = true;
    g.add(slat);
  }
  for (let i = 0; i < 3; i++) {
    const slat = new Mesh(box(1.4, 0.08, 0.04), mat(slatColors[i]!));
    slat.position.set(0, 0.42 + i * 0.10, -0.18);
    g.add(slat);
  }
  // Iron legs (curved at the top — approximated with two boxes)
  for (let i = 0; i < 2; i++) {
    const legX = -0.55 + i * 1.1;
    const leg = new Mesh(box(0.05, 0.32, 0.34), mat('#2a2a2a'));
    leg.position.set(legX, 0.16, -0.04);
    g.add(leg);
    const armrest = new Mesh(box(0.05, 0.06, 0.30), mat('#2a2a2a'));
    armrest.position.set(legX, 0.36, -0.05);
    g.add(armrest);
  }
  return g;
}

function makeScarecrow(): Group {
  const g = new Group();
  const cross = new Mesh(box(0.06, 0.9, 0.06), mat('#6e4a28'));
  cross.position.y = 0.45;
  g.add(cross);
  const arms = new Mesh(box(0.6, 0.06, 0.06), mat('#6e4a28'));
  arms.position.y = 0.65;
  g.add(arms);
  // Plaid shirt body (hay-stuffed)
  const body = new Mesh(box(0.36, 0.34, 0.18), mat('#c8423a'));
  body.position.y = 0.55;
  g.add(body);
  // Hay sticking out of sleeves & collar
  for (let i = 0; i < 3; i++) {
    const hay = new Mesh(box(0.05, 0.08, 0.02), mat('#e8c64a'));
    hay.position.set(-0.22 + i * 0.22, 0.74, 0.0);
    hay.rotation.z = (i - 1) * 0.4;
    g.add(hay);
  }
  const head = new Mesh(sphere(0.14, 12, 10), mat('#e8c878'));
  head.position.y = 0.95;
  head.castShadow = true;
  g.add(head);
  // Burlap-sack stripe stitch around the head
  const stitch = new Mesh(box(0.30, 0.012, 0.01), mat('#8a6740'));
  stitch.position.set(0, 0.88, 0.13);
  g.add(stitch);
  const hat = new Mesh(cone(0.18, 0.22, 14), mat('#7a5524'));
  hat.position.y = 1.16;
  g.add(hat);
  // Hat band
  const band = new Mesh(cyl(0.13, 0.13, 0.04, 14), mat('#4a3018'));
  band.position.y = 1.05;
  g.add(band);
  // Eyes (button-style)
  const eyeL = new Mesh(sphere(0.022, 6, 4), mat('#1a1a1a'));
  eyeL.position.set(-0.05, 0.97, 0.13);
  const eyeR = eyeL.clone();
  eyeR.position.set(0.05, 0.97, 0.13);
  g.add(eyeL, eyeR);
  // Stitched smile (dark line)
  const mouth = new Mesh(box(0.08, 0.012, 0.01), mat('#3a2010'));
  mouth.position.set(0, 0.90, 0.14);
  g.add(mouth);
  return g;
}

function makeFountain(): Group {
  const g = new Group();
  // Stylized 3-tier marble fountain with brighter, more inviting
  // water and a tall central plume.
  const basin = new Mesh(cyl(0.72, 0.72, 0.22, 28), mat('#cfd2d8'));
  basin.position.y = 0.11;
  basin.castShadow = true;
  basin.receiveShadow = true;
  g.add(basin);
  const basinTrim = new Mesh(cyl(0.78, 0.78, 0.04, 28), mat('#9aa0a8'));
  basinTrim.position.y = 0.23;
  g.add(basinTrim);
  const water = new Mesh(cyl(0.64, 0.64, 0.04, 28), mat('#5fb6de', { transparent: true, opacity: 0.85 }));
  water.position.y = 0.20;
  g.add(water);
  const stem = new Mesh(cyl(0.14, 0.14, 0.4, 14), mat('#c4c8cf'));
  stem.position.y = 0.42;
  g.add(stem);
  const top = new Mesh(cyl(0.38, 0.38, 0.08, 22), mat('#cfd2d8'));
  top.position.y = 0.66;
  g.add(top);
  // Upper bowl pool
  const topWater = new Mesh(cyl(0.32, 0.32, 0.025, 22), mat('#5fb6de', { transparent: true, opacity: 0.85 }));
  topWater.position.y = 0.71;
  g.add(topWater);
  // Tall central plume + a couple of side dribbles
  const plume = new Mesh(sphere(0.16, 12, 10), mat('#cfeefc', { transparent: true, opacity: 0.75, emissive: '#9ed0e8' }));
  plume.scale.set(0.5, 1.9, 0.5);
  plume.position.y = 0.95;
  plume.name = 'fountain-plume';
  g.add(plume);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const drop = new Mesh(sphere(0.05, 8, 6), mat('#cfeefc', { transparent: true, opacity: 0.7 }));
    drop.position.set(Math.cos(ang) * 0.18, 0.75, Math.sin(ang) * 0.18);
    drop.name = 'fountain-drop';
    g.add(drop);
  }
  g.name = 'fountain';
  return g;
}

function makeStatue(): Group {
  const g = new Group();
  const base = new Mesh(box(0.5, 0.16, 0.5), mat('#888'));
  base.position.y = 0.08;
  g.add(base);
  const body = new Mesh(cyl(0.16, 0.18, 0.6, 14), mat('#d0d0d4'));
  body.position.y = 0.46;
  body.castShadow = true;
  g.add(body);
  const head = new Mesh(sphere(0.14, 12, 10), mat('#d0d0d4'));
  head.position.y = 0.88;
  g.add(head);
  return g;
}

function makeGazebo(): Group {
  const g = new Group();
  // 4 corner pillars at 1.7 unit area
  for (const [x, z] of [[0.15, 0.15], [1.85, 0.15], [0.15, 1.85], [1.85, 1.85]] as const) {
    const p = new Mesh(cyl(0.06, 0.06, 1.1, 8), mat('#f4ecd0'));
    p.position.set(x, 0.55, z);
    p.castShadow = true;
    g.add(p);
  }
  // Pyramid roof
  const roof = new Mesh(cone(1.4, 0.5, 4), mat('#8a3a2a'));
  roof.rotation.y = Math.PI / 4;
  roof.position.set(1.0, 1.35, 1.0);
  roof.castShadow = true;
  g.add(roof);
  // Floor
  const floor = new Mesh(box(2.0, 0.06, 2.0), mat('#a07040'));
  floor.position.set(1.0, 0.03, 1.0);
  g.add(floor);
  return g;
}

function makePinwheel(): Group {
  const g = new Group();
  const pole = new Mesh(cyl(0.022, 0.022, 0.85, 6), mat('#3a2a18'));
  pole.position.y = 0.42;
  g.add(pole);
  const wheel = new Group();
  wheel.name = 'pinwheel-wheel';
  const colors = ['#ff80c0', '#80c0ff', '#ffe080', '#80e080'];
  for (let i = 0; i < 4; i++) {
    const blade = new Mesh(box(0.18, 0.08, 0.02), mat(colors[i]!));
    blade.position.set(0.09, 0, 0);
    const b = new Group();
    b.add(blade);
    b.rotation.z = i * Math.PI / 2;
    wheel.add(b);
  }
  wheel.position.set(0, 0.84, 0.04);
  g.add(wheel);
  return g;
}

function makeCherryTree(): Group {
  const g = new Group();
  const trunk = new Mesh(cyl(0.07, 0.09, 0.55, 8), mat('#5a3a20'));
  trunk.position.y = 0.27;
  trunk.castShadow = true;
  g.add(trunk);
  // Layered pink cherry blossom canopy — a darker rose under, two
  // brighter pink puffs above, plus a sprinkle of paler-pink "flowers"
  const darkPink = '#e575a8';
  const pink = '#ff9ed4';
  const palePink = '#ffd0e8';
  const back = new Mesh(sphere(0.40, 12, 10), mat(darkPink));
  back.position.set(-0.06, 0.68, -0.04);
  g.add(back);
  const mid = new Mesh(sphere(0.34, 12, 10), mat(pink));
  mid.position.set(0.08, 0.72, 0.06);
  g.add(mid);
  const top = new Mesh(sphere(0.30, 12, 10), mat(pink));
  top.position.set(-0.02, 0.84, 0.0);
  top.castShadow = true;
  g.add(top);
  // Bright pale-pink "petals" highlights
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const petal = new Mesh(sphere(0.07, 8, 6), mat(palePink));
    petal.position.set(Math.cos(ang) * 0.34, 0.78 + (i % 2 ? 0.05 : -0.04), Math.sin(ang) * 0.34);
    g.add(petal);
  }
  return g;
}

function makePetalPath(): Group {
  const g = new Group();
  const base = new Mesh(box(0.9, 0.05, 0.9), mat('#f4cfe0'));
  base.position.y = 0.025;
  g.add(base);
  for (let i = 0; i < 8; i++) {
    const petal = new Mesh(sphere(0.04, 6, 4), mat('#ff80c0'));
    petal.position.set(-0.35 + Math.random() * 0.7, 0.06, -0.35 + Math.random() * 0.7);
    g.add(petal);
  }
  return g;
}

function makeBeachChair(): Group {
  const g = new Group();
  const seat = new Mesh(box(0.55, 0.06, 0.5), mat('#3a78c8'));
  seat.position.set(0, 0.18, 0);
  seat.rotation.x = -0.3;
  g.add(seat);
  const back = new Mesh(box(0.55, 0.5, 0.06), mat('#5a9ad8'));
  back.position.set(0, 0.42, -0.2);
  back.rotation.x = -0.3;
  g.add(back);
  for (let i = 0; i < 4; i++) {
    const leg = new Mesh(cyl(0.018, 0.018, 0.2, 6), mat('#f4ecd0'));
    leg.position.set(-0.22 + (i % 2) * 0.44, 0.1, -0.18 + Math.floor(i / 2) * 0.32);
    g.add(leg);
  }
  return g;
}

function makeTikiTorch(): Group {
  const g = new Group();
  const pole = new Mesh(cyl(0.04, 0.04, 0.95, 8), mat('#3a2a10'));
  pole.position.y = 0.47;
  g.add(pole);
  // Carved tiki head
  const head = new Mesh(box(0.18, 0.22, 0.16), mat('#6e4a28'));
  head.position.y = 1.04;
  g.add(head);
  const flame = new Mesh(cone(0.08, 0.18, 8), mat('#ff7a2a', { emissive: '#ff7a2a' }));
  flame.position.y = 1.25;
  g.add(flame);
  return g;
}

function makePumpkinStack(): Group {
  const g = new Group();
  const big = new Mesh(sphere(0.18, 14, 10), mat('#f47a20'));
  big.scale.set(1, 0.7, 1);
  big.position.y = 0.13;
  g.add(big);
  const mid = new Mesh(sphere(0.13, 14, 10), mat('#f4942a'));
  mid.scale.set(1, 0.7, 1);
  mid.position.y = 0.34;
  g.add(mid);
  const small = new Mesh(sphere(0.09, 12, 8), mat('#f4a83a'));
  small.scale.set(1, 0.7, 1);
  small.position.y = 0.5;
  g.add(small);
  return g;
}

function makeFestiveHat(): Group {
  const g = new Group();
  const brim = new Mesh(cyl(0.3, 0.3, 0.03, 16), mat('#3a2010'));
  brim.position.y = 0.05;
  g.add(brim);
  const top = new Mesh(cyl(0.18, 0.2, 0.3, 14), mat('#5a3018'));
  top.position.y = 0.22;
  g.add(top);
  const band = new Mesh(cyl(0.21, 0.21, 0.05, 16), mat('#f4c842'));
  band.position.y = 0.1;
  g.add(band);
  return g;
}

function makeSnowman(): Group {
  const g = new Group();
  const base = new Mesh(sphere(0.24, 14, 12), mat('#fafafa'));
  base.position.y = 0.22;
  g.add(base);
  const mid = new Mesh(sphere(0.18, 14, 12), mat('#fafafa'));
  mid.position.y = 0.56;
  g.add(mid);
  const head = new Mesh(sphere(0.13, 14, 12), mat('#fafafa'));
  head.position.y = 0.8;
  g.add(head);
  // Carrot nose
  const nose = new Mesh(cone(0.025, 0.12, 6), mat('#f48a2a'));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.82, 0.13);
  g.add(nose);
  // Eyes
  const e1 = new Mesh(sphere(0.022, 6, 4), mat('#000'));
  e1.position.set(-0.04, 0.86, 0.12);
  const e2 = e1.clone();
  e2.position.set(0.04, 0.86, 0.12);
  g.add(e1, e2);
  // Top hat
  const brim = new Mesh(cyl(0.13, 0.13, 0.025, 12), mat('#2a2a2a'));
  brim.position.y = 0.92;
  g.add(brim);
  const top = new Mesh(cyl(0.09, 0.09, 0.16, 12), mat('#2a2a2a'));
  top.position.y = 1.02;
  g.add(top);
  return g;
}

function makeLanternIce(): Group {
  const g = new Group();
  const base = new Mesh(box(0.16, 0.16, 0.16), mat('#bcd8ec', { transparent: true, opacity: 0.85, emissive: '#4a8ac8' }));
  base.position.y = 0.1;
  g.add(base);
  const top = new Mesh(cone(0.11, 0.08, 14), mat('#bcd8ec'));
  top.position.y = 0.22;
  g.add(top);
  return g;
}

const FACTORIES: Record<string, () => Group> = {
  flowerbed: makeFlowerbed,
  lamppost: makeLamppost,
  bench: makeBench,
  scarecrow: makeScarecrow,
  fountain: makeFountain,
  statue: makeStatue,
  gazebo: makeGazebo,
  pinwheel: makePinwheel,
  cherrytree: makeCherryTree,
  petalpath: makePetalPath,
  beachchair: makeBeachChair,
  tikitorch: makeTikiTorch,
  pumpkinstack: makePumpkinStack,
  scarecrowhat: makeFestiveHat,
  snowman: makeSnowman,
  lanternice: makeLanternIce,
};

export function updateDecor(timeS: number): void {
  const { entities } = getSceneRoot();
  const seen = new Set<string>();
  for (const d of state.decor) {
    seen.add(d.id);
    let m = mounted.get(d.id);
    if (!m || m.type !== d.type) {
      if (m) entities.remove(m.root);
      const factory = FACTORIES[d.type] ?? FACTORIES.flowerbed!;
      const root = factory();
      const def = DECORATIONS[d.type];
      // Center the decoration over its footprint
      root.position.set(d.x + (def?.w ?? 1) / 2, 0, d.y + (def?.h ?? 1) / 2);
      entities.add(root);
      m = { id: d.id, type: d.type, root };
      mounted.set(d.id, m);
    }
    if (d.type === 'pinwheel') {
      const wheel = m.root.getObjectByName('pinwheel-wheel');
      if (wheel) wheel.rotation.z = timeS * 2.2;
    }
    if (d.type === 'fountain') {
      // Gentle plume bob + side-drop drift so the fountain reads
      // "alive" without spawning particles every frame.
      const plume = m.root.getObjectByName('fountain-plume') as Mesh | null;
      if (plume) {
        const pulse = 1.0 + 0.08 * Math.sin(timeS * 2.6);
        plume.scale.set(0.5 * pulse, 1.9 * pulse, 0.5 * pulse);
        plume.position.y = 0.95 + Math.sin(timeS * 1.6) * 0.025;
      }
      m.root.children.forEach((c, idx) => {
        if (c.name === 'fountain-drop') {
          c.position.y = 0.75 + Math.sin(timeS * 3 + idx) * 0.07;
        }
      });
    }
    if (d.type === 'tikitorch') {
      // Flicker the tiki flame so torches feel alive.
      const flame = m.root.children.find(c => (c as Mesh).material && (c as Mesh).name !== 'tiki-pole');
      void flame; // simple per-frame nudge below works on the cone mesh
      const top = m.root.children[m.root.children.length - 1] as Mesh | undefined;
      if (top) {
        const flick = 1.0 + 0.10 * Math.sin(timeS * 11 + d.x * 0.7);
        top.scale.set(flick, flick * 0.92 + 0.08, flick);
      }
    }
    void MathUtils;
  }
  for (const [id, m] of mounted) {
    if (!seen.has(id)) {
      entities.remove(m.root);
      mounted.delete(id);
    }
  }
}
