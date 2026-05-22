// =============================================================
//  MAILBOX — Phase 1.3 diegetic 3D world object.
//
//  Small rural-style mailbox on a post at the south entrance, just
//  west of the order truck. When there are unread letters, the
//  little red flag swings up to "raised" position to signal mail.
//  A world bubble pinned above also pulses when unread > 0.
// =============================================================

import { Group, Mesh } from 'three';
import { HOME_X0, HOME_Y1 } from '../../constants';
import { box, cyl, sphere } from '../procgen/geometries';
import { mat } from '../procgen/materials';
import { getSceneRoot } from '../scene-root';
import { unreadCount } from '../../systems/mailbox';

export const MAILBOX_X = HOME_X0 + 2.5;          // 9.5
export const MAILBOX_Z = HOME_Y1 + 1.4;          // 25.4
export const MAILBOX_BUBBLE_Y = 2.0;

let mounted: Group | null = null;
let flagPivot: Group | null = null;

function buildMailbox(): Group {
  const g = new Group();
  g.name = 'mailbox';

  // Post
  const post = new Mesh(cyl(0.06, 0.07, 1.1, 8), mat('#5a3018'));
  post.position.y = 0.55;
  post.castShadow = true;
  g.add(post);

  // Box bed (the bottom of the curved mailbox)
  const bed = new Mesh(box(0.42, 0.06, 0.24), mat('#4a4a4a'));
  bed.position.y = 1.06;
  g.add(bed);

  // Box body (rectangular)
  const body = new Mesh(box(0.42, 0.18, 0.24), mat('#c8423a'));
  body.position.y = 1.18;
  body.castShadow = true;
  g.add(body);

  // Curved top via a half-cylinder (axis along X, only top half visible)
  const top = new Mesh(cyl(0.12, 0.12, 0.42, 12), mat('#c8423a'));
  top.rotation.z = Math.PI / 2;
  top.position.y = 1.32;
  top.castShadow = true;
  g.add(top);

  // Door panel on the front
  const door = new Mesh(box(0.02, 0.16, 0.18), mat('#a02a24'));
  door.position.set(0.22, 1.20, 0);
  g.add(door);
  // Door knob
  const knob = new Mesh(sphere(0.022, 8, 6), mat('#f4b942'));
  knob.position.set(0.24, 1.20, 0.05);
  g.add(knob);

  // Number plate
  const plate = new Mesh(box(0.02, 0.06, 0.10), mat('#fff7e1'));
  plate.position.set(0.22, 1.30, 0);
  g.add(plate);

  // Flag (pivots up/down). Rendered "down" by default; updateMailbox
  // rotates this pivot when there's unread mail.
  flagPivot = new Group();
  flagPivot.name = 'mailbox-flag';
  flagPivot.position.set(-0.22, 1.20, 0.08);
  const flagPost = new Mesh(box(0.02, 0.22, 0.02), mat('#5a3018'));
  flagPost.position.y = 0.11;
  flagPivot.add(flagPost);
  const flag = new Mesh(box(0.02, 0.10, 0.12), mat('#e0a020'));
  flag.position.set(0, 0.18, 0.07);
  flagPivot.add(flag);
  // Default position: flag is horizontal (sleeping — no mail)
  flagPivot.rotation.z = -Math.PI / 2;
  g.add(flagPivot);

  // Decorative flowers at the base
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const r = 0.20 + Math.random() * 0.06;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const stem = new Mesh(cyl(0.012, 0.012, 0.16, 6), mat('#3a7a30'));
    stem.position.set(x, 0.08, z);
    g.add(stem);
    const head = new Mesh(sphere(0.05, 8, 6), mat(['#e64030', '#f4d160', '#a070d4', '#ff9ed4', '#f48a2a'][i]!));
    head.position.set(x, 0.18, z);
    g.add(head);
  }

  // Small dirt mound at the base
  const dirt = new Mesh(box(0.5, 0.05, 0.5), mat('#6e4a28'));
  dirt.position.y = 0.025;
  g.add(dirt);

  return g;
}

/** Install the mailbox. Idempotent. */
export function installMailbox(): void {
  if (mounted) return;
  const { entities } = getSceneRoot();
  mounted = buildMailbox();
  mounted.position.set(MAILBOX_X, 0, MAILBOX_Z);
  // Face east so the door + flag are visible from the player's
  // typical camera angle.
  mounted.rotation.y = -Math.PI / 2;
  entities.add(mounted);
}

/** Per-frame: raise the flag when there's unread mail; a tiny
 *  spring oscillation as it transitions for charm. */
export function updateMailbox(timeS: number): void {
  if (!flagPivot) return;
  const unread = unreadCount();
  // Target rotation: -90deg (horizontal/down) when no mail,
  // 0deg (straight up) when there's mail.
  const target = unread > 0 ? 0 : -Math.PI / 2;
  // Smoothly interpolate; add a tiny spring bob if there's mail.
  const cur = flagPivot.rotation.z;
  flagPivot.rotation.z = cur + (target - cur) * 0.08;
  if (unread > 0) {
    flagPivot.rotation.z += Math.sin(timeS * 4.5) * 0.04;
  }
}
