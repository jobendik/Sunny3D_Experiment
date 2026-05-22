# Sunny Acres — A Farming Adventure

A cozy, browser-only 3D farming/management game with procedurally generated
meshes, sprites, music, and SFX. Plant crops, raise animals, fish, run
production chains, deliver to a small town, and master the weather itself
with the signature **Weather Mastery Grid**.

Built in TypeScript, rendered with **Three.js** (orthographic-isometric
camera + bloom + soft contact shadows) and a 2D **screen-space-overlay
DOM** for HUD and world-anchored speech bubbles. Every 3D mesh and every
HUD sprite is generated procedurally at boot; every sound is synthesized
via the Web Audio API. **Zero external game assets, zero CDN, zero
network calls.**

Live demo: **https://jobendik.github.io/sunnyacres/** (deploys automatically
on every push to `main`).

## Quick start

```bash
npm install
npm run dev        # development server at http://localhost:5173/
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
npm run typecheck  # run tsc without emit
```

## Core gameplay loop

1. **Plow** grass → **plant** seeds → wait for growth → **harvest**.
2. Sell crops at the **Shop** or list them at the **Market Stall** for
   passive sales while you play.
3. Build **production buildings** (Feed Mill, Bakery, Hen House, …) that
   turn raw goods into finished products worth far more than raw items.
4. **Deliver** to local customers, the **Boat**, the **Train**, the
   **Balloon**, and the **Festival Cart** for big rewards.
5. **Specialize** at Lv 5 and start **casting Weather Cards** to bend the
   weather to your needs.
6. **Expand** your land (Lv 7+), build **Landmark** projects, join the
   **Farming Club** (Lv 15), and run **Expeditions** (Lv 16+) at endgame.

The first 10 minutes deliberately surface only the core loop. New systems
unlock and appear in the More menu as you level up — see
[`docs/system-fatigue-audit.md`](docs/system-fatigue-audit.md) for the full
tier breakdown.

## Diegetic 3D world objects (Hay Day / FarmVille-3 grammar)

The 3D world is the player's primary menu. Every major system has a
tappable mesh that anchors a screen-space "world bubble" with the
relevant state:

| Mesh | Location | Routes to |
|---|---|---|
| Order Truck | South entrance | Quests + Order Board |
| Boat at Dock + crates | NW lakeshore | Boat delivery panel |
| Mailbox (raises flag on unread mail) | South entrance, west | Mailbox |
| Roadside Stand (per-slot crates) | West edge | Market Stall |
| Newspaper Stand | South entrance, east | Sunny Gazette |
| Request Board (birdhouse) | Near home centre | Friendship |
| Co-op Signpost | Near home centre | Farming Club |
| Ranger Tower | NW corner | Expeditions |
| Daily Wheel (spins faster when claimable) | South entrance | Daily Wheel |
| Sanctuary Easel | East lakeshore | Sanctuary book |
| Festival Cart (conditional) | South-centre | Festival deliveries |
| Train Station + engine (slides in on return) | East edge | Train deliveries |
| Hot-Air Balloon (drifting overhead) | Above the farm | Balloon |

World bubbles are object-pooled, raycast-disabled by default, and
projected each frame via `camera.project()` so they stay anchored to
their 3D entity through camera pan / zoom / rotate. See
`src/ui/world-bubbles.ts`.

The HUD itself follows the FV3 corner-anchored grammar: profile + XP
top-left, coins + diamonds + an **Offer Pill** top-right, collapsible
Quick Event Bar on the left edge, Book button + Hammer Build FAB +
cash-register Shop FAB on the right/bottom edges, tool dock
bottom-centre. The center is intentionally empty so the world
breathes.

## Signature mechanic: Weather Mastery Grid

Unlocks at Lv 5. Players craft **Weather Cards** (sunbeam, rainmaker,
thunderhead, marketwind, serenity, …) and slot them into a small
programmable grid. Activating the grid spends a daily charge and overlays
the chosen effects — faster growth, +sell prices, no crows, animal mood
floor, rare fish bias — for that activation's duration.

Cards can be **fused** with Weather Fragments (won from balloons,
expeditions, and obstacle clearing) into stronger composite cards.

## Major systems

**Core (Lv 1–4)**
- Plow / Plant / Harvest, Shop, Build, Decor
- Quests, Orders, Achievements, News, Help
- Daily streak, Daily Wheel, Season Pass, Tutorial

**Market & Logistics (Lv 3–13)**
- Market Stall (passive simulated buyers, offline sales)
- Sunny Gazette (daily paper: hot item, sales, help requests)
- Boat / Train / Balloon / Festival Cart deliveries
- Market Contracts (Lv 9, multi-day bulk orders)
- Walk-on Visitors (Lv 5, short-window tippers)

**Progression & Mastery (Lv 5+)**
- Weather Mastery Grid + Card Fusion
- Specializations (primary at Lv 5, secondary at Lv 15)
- Collection Codex (passive perks per discovery)
- Building Mastery (per-building star ranks)
- Building Upgrades (per-instance levels)

**Social (Lv 3–15)**
- Friendship with named villagers (gifts, deliveries)
- Village Hub (visit nodes, reputation)
- Farming Club (Lv 15, weekly shared goal w/ peers)
- Simulated leaderboard (5 categories)

**Exploration (Lv 7+)**
- Land Expansion (Lv 7+, 5 plots with obstacle clearing)
- Landmark Projects (Windmill, Old Mill, Greenhouse, Great Barn, Fishery,
  Lighthouse)
- Expeditions (Lv 16+, energy-gated exploration on 5 maps)
- Greenhouse (any crop any season, needs compost)
- Compost (recycle low-value crops into fertilizer)

**Endgame (Lv 18+)**
- Helpers (Lv 18, hire collectors / restockers / waterers / sellers)
- Tool Shed (Lv 10, expedition speed bonus)
- Prestige (Lv 25, reset for permanent Talent perks)

**Live ops / events**
- Live Events (weekly themed events with token rewards)
- Beauty Contest (weekly farm-decoration scoring)
- Weather Hazards (preparation challenges)
- Idle income on return (welcome-back screen with summary)

## Technical architecture

- **Single mutable state**: `src/state.ts` exports a `state: GameState`
  singleton. Every system imports it and mutates fields directly.
  See [`src/types.ts`](src/types.ts) for the full schema.
- **One runtime dep (Three.js)**: 3D rendering uses Three.js
  (Lambert materials + cached primitives + a post-FX composer).
  Gameplay, HUD, sprites, and audio still use vanilla browser APIs
  (Web Audio, `localStorage`, `requestAnimationFrame`).
- **Procedural everything**: every 3D mesh in `src/three/buildings/`,
  `src/three/decor/`, and `src/three/entities/` is built from cached
  primitives (`procgen/geometries.ts`) and Lambert materials
  (`procgen/materials.ts`). Every HUD sprite is drawn into an
  offscreen `<canvas>` at boot via `buildSprites()` and cached.
  **No image files, no GLB/GLTF, no audio assets.**
- **World-bubble overlay**: `src/ui/world-bubbles.ts` runs a single
  object-pooled DOM layer above the 3D canvas. Each frame the
  visible bubble set is projected via `camera.project()` and
  positioned with `transform: translate3d(...)`. Behind-camera
  culling via `NDC.z > 1`. Raycast off by default.
- **Save**: serialized to `localStorage` under `sunnyacres-save-v4`
  with an internal schema version (currently v5). Timers are rebased
  on load so growth/production/boats/balloons/etc. resume cleanly
  across reloads and offline sessions.
- **Progressive disclosure**: `src/systems/feature-visibility.ts` is
  the single source of truth for which More-menu buttons appear at
  each level. New players see a small curated set; late-game players
  see everything.
- **Objective Rail**: `src/systems/objectives.ts` ranks the top 1–4
  next-best actions across every implemented system, surfaced at the
  top of the screen so the player always knows what to do next.
- **Accessibility**: focus trap (`src/ui/focus-trap.ts`) applied to
  every modal + bottom sheet + side panel. `.sr-only` companion text
  on the XP bar. `:focus-visible` honey-tinted ring (yellow under
  `body.high-contrast`). Reduced-motion mode honours OS preference
  and a Settings toggle.

For the full Hay Day + FarmVille 3 parity plan and ongoing checklist,
see [`roadMapForward.md`](roadMapForward.md).

## Project layout

```
src/
├── main.ts                # entry — init() + requestAnimationFrame loop
├── state.ts               # singleton GameState
├── types.ts               # cross-cutting TypeScript interfaces
├── save.ts                # localStorage serialization + migration
├── loop.ts                # update(dt) — ticks all systems
├── input.ts               # pointer / touch / pinch / long-press
├── canvas.ts              # screen-size helpers (SW/SH)
├── constants.ts           # world grid + tile constants
├── style.css              # all global styles + design tokens
├── data/                  # static game data tables (typed)
├── sprites/               # procedural canvas sprite generation (HUD)
├── audio/                 # synthesized sfx + ambient music
├── systems/               # gameplay logic (95+ files, one per system)
├── three/                 # Three.js 3D pipeline
│   ├── index.ts           # init3d() + render3d(dt)
│   ├── renderer.ts        # WebGL renderer + DPR
│   ├── scene-root.ts      # scene + grouped layers
│   ├── camera-rig.ts      # orthographic-iso camera + rotate/reset
│   ├── lighting.ts        # day/night sun + hemi + bloom drive
│   ├── post-fx.ts         # bloom + colour grade composer
│   ├── procgen/           # cached primitive + material helpers
│   ├── buildings/         # per-building factories (24 today)
│   ├── decor/             # diegetic world props (order truck, boat,
│   │                      #   mailbox, ranger tower, …)
│   ├── entities/          # *-manager.ts files driving meshes
│   ├── terrain/           # tile grid, lake, paths, outer world
│   ├── sky/               # sky dome + clouds
│   └── fx/                # particles, birds, beacons, weather
└── ui/                    # DOM-driven HUD + panels + world-bubble
                          #   overlay (one file per surface)
docs/
└── system-fatigue-audit.md   # the clarity/pacing pass design doc
roadMapForward.md             # full Hay Day + FV3 parity roadmap
```

## Save / load

The game autosaves every ~20 seconds and on `beforeunload`. The save key
is `sunnyacres-save-v4` (defined in `src/constants.ts`). Each subsystem's `init*()` function is defensive
against missing fields, so older saves load cleanly even after new
systems are added. Timer fields (crop growth, production jobs, boat
docking, expedition energy, contracts, balloons, visitors, …) are all
rebased by `Δt = nowSeconds() - saveTime` so offline progress resolves
correctly.

If you want to nuke a save during development:

```js
localStorage.removeItem('sunnyacres-save-v4')
```

## Debug helpers

Append `?debug=1` to the URL to expose `window.dbg` with helpers:

```js
dbg.coins(5000)     // add coins
dbg.xp(500)         // add XP
dbg.item('wheat', 50)
dbg.mat(5)          // grant 5× of every material
dbg.skip(2)         // skip 2 hours (advances boat/train/balloon/stall)
dbg.level(15)       // jump to a level for testing the unlock tier
dbg.refreshGazette()
```

These do not affect normal play.

## GitHub Pages deployment

`.github/workflows/deploy.yml` runs on every push to `main`:
1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. Publishes `dist/` via `actions/deploy-pages`.

Before the first deploy, enable Pages with **Source: GitHub Actions** in
**Settings → Pages**.

The asset base path is `/sunnyacres/` (configured in `vite.config.ts`).
For forks with a different repo name, set `VITE_BASE=/your-repo/` in the
workflow env or override in `vite.config.ts`.

## Controls

| Key / Gesture | Action |
| ------------- | ------ |
| `1` / `2` / `3` | Hand / Plow / Seed tool |
| Drag | Pan the camera |
| `W` `A` `S` `D` | Pan with the keyboard |
| Scroll / Pinch | Zoom |
| `Q` / Tap ↻ | Rotate the view 90° |
| Tap building | Open its panel |
| Tap crow | Shoo it away |
| `Esc` | Cancel placement / close modal |
| Tap ⋯ (More) | Reveal the level-gated system menu |
| Tap 📋 (Quests) | Open Quests & Orders side panel |

## Testing checklist

Manual smoke test for new builds:
- [ ] Fresh save: splash → tutorial spotlight on Plow → can plow, plant,
      harvest, sell, deliver an order, build a Bakery.
- [ ] Lv 1 More menu shows ≤ 12 items (no boat/train/club/prestige).
- [ ] Lv 5 More menu shows Grid + Path teasers / unlocked.
- [ ] Lv 10 More menu shows Boat (unlocked), Balloon (unlocked), Train teaser.
- [ ] Objective Rail surfaces a relevant action every 0.75s; no duplicates.
- [ ] Existing v5 save loads without console errors.
- [ ] `npm run typecheck` and `npm run build` pass.

## Current status

The game is feature-complete for the Phase-1 through Phase-15 roadmap.
The most recent commit ("Visual + game-feel overhaul") added identity,
world polish, juice, and onboarding improvements. This pass adds clarity,
progressive UI disclosure, and a richer Objective Rail without removing
any systems.

The game is **intentionally code-generated and procedural** — no external
game assets, no CDN, no analytics, no network calls. It loads in under a
second and runs offline.

Real multiplayer (friend codes) is architecturally scaffolded but not
networked; the leaderboard and clubs use simulated peers.
