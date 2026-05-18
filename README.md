# Sunny Acres — A Farming Adventure

A canvas-based farming game with procedurally generated sprites, audio, weather, quests, and orders. Originally a single ~5,600-line HTML file, now refactored into a modular TypeScript codebase built with Vite.

Live demo: **https://jobendik.github.io/sunnyacres/** (deployed automatically on every push to `main`).

## Quick start

```bash
npm install
npm run dev        # development server at http://localhost:5173/
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
npm run typecheck  # run tsc without emit
```

## Project layout

```
src/
├── main.ts                # entry point — init() and the requestAnimationFrame loop
├── style.css              # all global styles
├── types.ts               # cross-cutting TypeScript interfaces
├── utils.ts               # rand, clamp, lerp, nowSeconds, xpForLevel, ...
├── constants.ts           # TILE, GRID_W/H, DAY_SECONDS, SAVE_KEY
├── canvas.ts              # canvas element, 2D context, resize/DPR
├── state.ts               # the singleton GameState object
├── save.ts                # localStorage serialization
├── input.ts               # pointer/touch/wheel/keyboard handlers
├── decor.ts               # background decoration trees
├── render.ts              # the render() function (depth-sorted draw)
├── loop.ts                # update(dt) — particles, weather, events, autosave
├── audio/
│   ├── sfx.ts             # ensureAudio, playTone/playNoise, sfx.* presets
│   └── music.ts           # procedural pentatonic ambient music
├── data/                  # static game data tables (typed)
│   ├── items.ts           # ITEMS — sell prices, level requirements
│   ├── crops.ts           # CROPS — grow time, seed cost, yields
│   ├── animals.ts         # ANIMALS — produce, feed cost, sprite body shape
│   ├── buildings.ts       # BUILDINGS — pens, production, fishing dock + recipes
│   ├── decorations.ts     # DECORATIONS
│   ├── orchards.ts        # ORCHARDS — fruit trees
│   ├── fish.ts            # FISH species
│   ├── seasons.ts         # SEASONS, SEASON_INFO, WEATHER
│   └── achievements.ts    # ACHIEVEMENTS list with check predicates
├── sprites/               # procedural canvas-based sprite generation
│   ├── index.ts           # buildSprites(); shared sprites cache
│   ├── tiles.ts           # grass / soil / plowed / path / water
│   ├── crops.ts           # spriteCropStage()
│   ├── items.ts           # spriteItem() — all item icons + tool icons
│   ├── animals.ts         # spriteAnimal() — per-kind body styling
│   ├── buildings.ts       # spriteBuilding() + spriteDuckPondOverride()
│   ├── decorations.ts     # spriteDecoration()
│   ├── orchards.ts        # spriteOrchard() — sapling → mature → fruiting
│   └── entities.ts        # spriteCrow, spriteDog, spriteDecorTree
├── systems/               # gameplay logic — pure-ish state mutations
│   ├── grid.ts            # initGrid, tileAt, canPlaceBuilding, ...
│   ├── camera.ts          # worldToScreen / screenToWorld / clampCamera
│   ├── crops.ts           # cropStage, isWithered, isWilting, growthMultiplier
│   ├── inventory.ts       # addItem, removeItem, hasItems
│   ├── xp.ts              # addXP — with level-up effects
│   ├── particles.ts       # spawnParticles, floatText
│   ├── orders.ts          # generateOrder, fulfillOrder, renderOrders
│   ├── quests.ts          # generate/refill/claim quests
│   ├── achievements.ts    # checkAchievements + popup
│   ├── weather.ts         # season + weather rotation
│   ├── events.ts          # random events (crows, merchant, lucky, ...)
│   ├── crows.ts           # crow AI and shooing
│   ├── dog.ts              # pet dog AI (unlocked at level 4)
│   ├── fishing.ts         # fishing minigame
│   ├── trees.ts           # orchard tree growth + harvest
│   ├── pens.ts            # pen feed level (hunger) system
│   └── actions.ts         # tryPlow, tryPlant, tryHarvest, tryPlaceDecoration
└── ui/                    # DOM-driven UI panels
    ├── hud.ts             # top HUD numbers
    ├── tools.ts           # tool buttons + icon attach
    ├── toasts.ts          # toast + toastXP notifications
    ├── tooltip.ts         # hover tooltip over tiles
    ├── modal.ts           # generic modal + tabs
    ├── shop.ts            # seeds / trees / sell / feed tabs
    ├── inventory-panel.ts
    ├── build-menu.ts      # building list + tryPlaceBuilding
    ├── building-panel.ts  # dispatch to pen / production / fishing
    ├── pen-panel.ts       # animal pen UI
    ├── production-panel.ts# recipes + queue
    ├── decor-menu.ts
    ├── achievements-panel.ts
    ├── news.ts            # daily news bulletin
    └── help.ts            # controls & tutorial modal
```

## Architecture

- **Single mutable state**: `src/state.ts` exports a `state: GameState` singleton. Every system imports it and mutates fields directly.
- **No external dependencies**: gameplay, sprites and audio all use vanilla browser APIs (`<canvas>`, Web Audio, `localStorage`, `requestAnimationFrame`).
- **Procedural sprites**: every visible asset is drawn into an offscreen `<canvas>` at boot via `buildSprites()` and cached. No image files.
- **Save**: serialized to `localStorage` under `sunnyacres-save-v2`. Timers are rebased on load so growth/production resume cleanly.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow runs on every push to `main`:
1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. Publishes `dist/` to the `github-pages` environment via `actions/deploy-pages`.

Before the first deploy, enable Pages with **Source: GitHub Actions** in **Settings → Pages**.

The asset base path is `/sunnyacres/` (configured in `vite.config.ts`). For forks with a different repo name, set `VITE_BASE=/your-repo/` in the workflow env or override in `vite.config.ts`.

## Controls

| Key / Gesture | Action |
| ------------- | ------ |
| `1` / `2` / `3` | Hand / Plow / Seed tool |
| Drag | Pan the camera |
| Scroll | Zoom |
| Tap building | Open its panel |
| Tap crow | Shoo it away |
| `Esc` | Cancel placement / close modal |
