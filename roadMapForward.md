# Sunny Acres — Forward Roadmap (Hay Day + FarmVille 3 Parity)

**Document type:** Self-contained implementation guide for cross-session continuity.
**Goal:** Bring Sunny Acres to full Hay Day + FarmVille 3 feature parity.
**Owner:** Claude (the assistant). The user (`jobendik@gmail.com`) may start fresh chats — this doc is the memory.
**Branch:** `claude/affectionate-bohr-T0gNH` (commit and push every meaningful step).

---

## How to Use This Document (READ FIRST IN EVERY NEW SESSION)

1. Scan **Section 1 (Mission)** so you remember the destination.
2. Read **Section 2 (Architecture Cheatsheet)** to orient on file layout and conventions.
3. Read **Section 3 (Implementation Patterns)** so new code matches the existing style.
4. Jump to the **Master Checklist (Section 15)** at the bottom — find the first unchecked item.
5. Open the phase that contains that item and read its acceptance criteria.
6. Implement, run `npm run typecheck && npm run build` (must pass), then commit + push.
7. **Check the box in the Master Checklist** and push the doc update in the same commit.
8. Repeat.

**Rules of engagement:**
- Do **not** rewrite this document. Only edit the checkbox state and add notes under "Session Log" (Section 16).
- Do **not** introduce external dependencies. The game stays zero-dependency.
- Do **not** break save/load. Bump `SAVE_VERSION` in `src/save.ts` only with a defensive migration.
- Do **not** invent new model identifiers. Don't put model IDs into commits, PRs, or code.
- The user previously asked for FV3 + Hay Day parity. This doc treats those research notes (`de3b182d-...txt` and `293f408d-...md`) as the canonical spec.

---

## Section 1 — Mission

Sunny Acres must feel like a **complete, polished cozy farming game**, indistinguishable in UX quality from Hay Day or FarmVille 3. Every interaction that those two games provide should have a Sunny-Acres equivalent. Specifically:

1. **Diegetic-first grammar.** The 3D world is the primary menu. Tap the truck for orders, the boat for sea deliveries, the mailbox for letters. Flat DOM panels are secondary, opened by tapping the world object.
2. **Corner-anchored global HUD.** Profile + XP top-left; coins + diamonds + offers top-right; Quick Event Bar collapsible left edge; Book + Build/Shop right edge; tool dock bottom-center. Centre stays clear.
3. **Live-ops surfaces stack vertically in the QEB.** Every season pass, daily wheel, surprise box, mailbox, piggy bank, festival, sky race, county fair, etc. surfaces here when active; collapsible so it never clutters.
4. **World bubbles for state.** Hungry animals, ready crops, full storage, visitors, NPC chatter, hub prompts — all object-pooled, screen-space, fade in/out, raycast off by default. Already implemented at `src/ui/world-bubbles.ts` — extend, never replace.
5. **Progressive disclosure.** A Lv-1 player sees ~8 buttons; a Lv-25 player sees everything. Driven by `src/systems/feature-visibility.ts`.
6. **Time-gated loops + variable rewards.** Daily Deal, Wheel, Surprise Box, Sky Race, County Fair, Country Camping, Maggie Offers, Farm Pass roads.
7. **Social asynchronicity.** Co-op chat, donation board, daily gift caps, simulated peer milestones, leaderboard.
8. **Accessibility.** Reduced motion ✓, high contrast ✓, ARIA labels (in progress), focus trap (todo), sr-only (todo), keyboard nav (todo).
9. **Zero external assets.** Procedural 3D meshes, procedural canvas sprites, Web Audio synthesis.

The end-state is: a returning Hay Day player should pick up Sunny Acres and feel at home within 30 seconds.

---

## Section 2 — Architecture Cheatsheet

### Repo
```
/home/user/Sunny3D_Experiment/
├── index.html                # All HUD anchors, panels, modal scaffolding
├── src/
│   ├── main.ts               # init() + RAF loop
│   ├── loop.ts               # update(dt) — ticks every system
│   ├── state.ts              # singleton GameState (mutated directly)
│   ├── types.ts              # all interfaces
│   ├── save.ts               # localStorage serialization + migration
│   ├── input.ts              # pointer/touch/pinch/long-press
│   ├── style.css             # 7k lines, design tokens at top
│   ├── three/
│   │   ├── camera-rig.ts     # orthographic-isometric camera + rotate/reset
│   │   ├── buildings/        # one mesh-factory per building (24 today)
│   │   ├── decor/            # decorative-only meshes (sparse — extend here)
│   │   ├── entities/         # *-manager.ts files that spawn/update meshes
│   │   ├── fx/               # particles
│   │   ├── lighting.ts       # day/night sun + hemi rig
│   │   ├── post-fx.ts        # bloom + colour grade
│   │   ├── procgen/          # building-kit (walls, roofs, doors, etc.)
│   │   ├── sky/              # sky dome + clouds
│   │   └── terrain/          # ground + paths
│   ├── systems/              # 95+ gameplay logic files (one per system)
│   ├── ui/                   # 56 DOM panel files (one per panel)
│   ├── data/                 # static typed game data (crops, animals, items, ...)
│   ├── sprites/              # procedural canvas sprites (icons in HUD)
│   └── audio/                # synthesized SFX + ambient
└── docs/
    └── system-fatigue-audit.md  # previous clarity pass (kept for reference)
```

### Key files to know cold

| Concern | File |
|---|---|
| World bubble pool + camera projection | `src/ui/world-bubbles.ts` |
| Top HUD (currencies, XP, level) | `src/ui/hud.ts` |
| Mobile shell (sheets, drawers, QEB, side panel) | `src/ui/mobile-shell.ts` |
| Feature visibility / gating | `src/systems/feature-visibility.ts` |
| Modal harness | `src/ui/modal.ts` |
| Shop | `src/ui/shop.ts` |
| Side panel (Quests + Order Board) | `src/ui/mobile-shell.ts` + HTML at `index.html:198-205` |
| Tutorial spotlight | `src/ui/tutorial-overlay.ts` + `src/systems/tutorial.ts` |
| Season Pass (3 tiers) | `src/systems/season-pass.ts` |
| Camera rig (rotate/reset/scenic) | `src/three/camera-rig.ts` |
| Edit Mode | `src/systems/edit-mode.ts` |
| Scenic Mode | `src/systems/settings.ts` |
| Mailbox / Surprise / Piggy | `src/systems/mailbox.ts`, `surprise-box.ts`, `piggy-bank.ts` |
| Daily Deal in Gazette | `src/systems/daily-deal.ts` + `src/ui/gazette-panel.ts` |
| Club (no chat yet) | `src/systems/club.ts` + `src/ui/club-panel.ts` |
| Friendship | `src/systems/friendship.ts` |
| Save serialization | `src/save.ts` |

### Constants
- `HOME_CENTER_X`, `HOME_CENTER_Y`, `HOME_W`, `HOME_H`, `TILE` in `src/constants.ts`
- `SAVE_KEY = 'sunnyacres-save-v3'`, `SAVE_VERSION` (currently `5`) in `src/save.ts`
- Camera reference: `getCamera()` from `src/three/camera-rig.ts`

### Visual identity tokens (already in `style.css:13-189`)
- Honey accent: `--honey-400` (`#f4b942`)
- Sage secondary: `--sage-500` (`#5ea33c`)
- Cherry danger: `--cherry-500` (`#e54a5e`)
- Sky info: `--sky-500` (`#4a9fd2`)
- Plum prestige: `--plum-500` (`#9b54c8`)
- Paper surface: `--paper-100` (`#fff7e1`)
- Fonts: `--font-display` = Fredoka, `--font-body` = Nunito (already imported in `index.html`)

---

## Section 3 — Implementation Patterns / Conventions

### Adding a new 3D world object (Phase 1 will use this a lot)

1. Create `src/three/decor/<name>.ts` (decorative) or `src/three/buildings/<name>.ts` (functional with footprint).
2. Use `procgen/building-kit.ts` helpers (`walls`, `gableRoof`, `door`, `windowPane`, `fence`, `flowerBox`) and `procgen/geometries.ts` (`box`, `sphere`, `cone`, `cyl`). No textures.
3. Export `make<Name>(w?: number, d?: number): Group` matching the existing factory signature.
4. Spawn it from `src/three/entities/decor-manager.ts` (decorative) or `buildings-manager.ts` (functional), passing a fixed world position derived from `HOME_CENTER_X/Y`.
5. Add a world-bubble hub in `computeBubbleTargets()` (`src/ui/world-bubbles.ts:357+`). Use `kind: 'hub'`, give it an `icon`, and route `tap` to the corresponding panel opener (`document.getElementById('open-<panel>')?.click()`).
6. The mesh handles visual presence; the world bubble handles interaction. Together they form the Hay Day diegetic grammar.

### Adding a new system

1. Create `src/systems/<name>.ts` with an `init<Name>()` and either a `tick<Name>(now)` or event-driven entry point.
2. Add types to `src/types.ts`. State lives under `state.<name>` (no extra stores).
3. If persistent, add to `serialize()` and `deserialize()` in `src/save.ts` with safe defaults.
4. Add a `FeatureGate` to `src/systems/feature-visibility.ts` with `unlockLevel`, `isUnlocked`, optional `hasAttention`.
5. Add a hidden trigger button to `index.html`'s bottom block (id pattern: `open-<name>`), then a `.sheet-btn[data-more="open-<name>"]` to the More sheet.
6. Add the panel to `src/ui/<name>-panel.ts` using `openModal()` from `src/ui/modal.ts`.
7. Wire the listener in `src/main.ts` (`document.getElementById('open-<name>')!.addEventListener('click', open<Name>Panel);`).

### Adding to the Quick Event Bar

Edit `buildQEBEntries()` in `src/ui/mobile-shell.ts:197-317`. Push an entry with `id`, `icon`, `label`, optional `badge`, optional `pulse`, and an `open()` that calls `clickHidden('open-<panel>')`. The diff loop handles DOM rebuild only when the signature changes.

### Adding a world bubble

Edit `computeBubbleTargets()` in `src/ui/world-bubbles.ts:171+`. Push a `BubbleTarget` with `key`, `wx`, `wy`, `wz`, `icon`, `kind`, optional `pulse`, optional `tap`. The pool/projection/fade are handled automatically.

### Toast / haptic / SFX

- `toast(msg, 'gold'|'red'|undefined)` from `src/ui/toasts.ts`
- `sfx.click()`, `sfx.error()`, `sfx.pop()`, etc. from `src/audio/sfx.ts`
- `haptic(8)` from `src/input.ts`

### Modal pattern

```ts
import { openModal } from './modal';
openModal('🏆 Title', tabs /* or null */);
document.getElementById('modal-body')!.innerHTML = '...';
```

### Accessibility checklist for every new UI

- `aria-label` on every interactive element
- `aria-hidden="true"` on purely decorative emoji/svg children
- `role="dialog"` on modals (helper to be added in Phase 4)
- Min touch target 44×44 CSS px
- Test with `body.reduced-motion` class — must not break visuals
- Test with `body.high-contrast` class — must remain legible

### Testing protocol after every change

```bash
npm run typecheck   # must pass
npm run build       # must pass
```

Then load in browser (the dev server runs at `http://localhost:5173/`), play through:
- Fresh save (`localStorage.removeItem('sunnyacres-save-v3')`)
- Existing save (no console errors)
- Mobile viewport (Chrome DevTools, iPhone 14 emulation)

---

## Section 4 — Phase Order & Estimated Sequencing

Phases are ordered by impact-on-Hay-Day-parity. Each phase is independently shippable: typecheck + build pass, branch pushed, draft PR open, then move on.

| Phase | Theme | Risk | Estimated commits |
|---|---|---|---|
| 1 | Diegetic 3D world objects (the big gap) | medium | 10–14 |
| 2 | Shop taxonomy + Offer Bubble + Gem Packs | low | 3–5 |
| 3 | Co-op chat + donations + gift caps | medium | 6–8 |
| 4 | Accessibility finish (focus trap, sr-only, keyboard) | low | 3–4 |
| 5 | Onboarding polish (farm name, scarecrow, Lv-5 tip) | low | 4–5 |
| 6 | Monetization-grammar completeness (Maggie, bundles, time-gated shop) | low | 3–4 |
| 7 | Animal husbandry depth (capacity, auto-feed, mood UI) | low | 3–4 |
| 8 | Live-ops calendar parity (Sky Race, County Fair, Country Camping) | medium | 6–8 |
| 9 | Performance & polish (virtualization, IntersectionObserver, atlas) | low | 3–5 |
| 10 | Real-world CSR campaigns (Green Game Jam, habitat partner) | low | 2–3 |
| 11 | Comprehensive QA & polish pass | low | open-ended |

---

## Section 5 — Phase 1: Diegetic 3D World Objects

**Goal:** Every major system that opens via a panel must have a tappable 3D world object that anchors it.

### 1.1 — 3D Truck Order Board
- File: `src/three/decor/order-truck.ts` (new). Export `makeOrderTruck(): Group`.
- Components: small wooden cart (cyl wheels, box bed, vertical chalkboard "Orders" sign, paper cards pinned to the bed). Animate the sign with a tiny up-down bob.
- Spawn: `src/three/entities/decor-manager.ts` — place at `HOME_CENTER_X - 4, ground, HOME_CENTER_Y + 6` (adjust to find an unobstructed spot near the farmhouse).
- World bubble: hub bubble with icon `📋`, `tap` opens side panel (`openSidePanel()` from `mobile-shell.ts`). Badge count = fulfillable orders + claimable quests.
- Replace the "Order Board" entry in QEB with this hub when it's visible on-screen (don't remove the QEB entry — Hay Day shows both: the world object AND the rail).

### 1.2 — 3D Boat at Dock
- File: `src/three/decor/dock-boat.ts` (new). Export `makeDockBoat(state: 'docked'|'sailing'|'returning'): Group`.
- Components: hull (box with sloped front via cone), mast (cyl), small sail (plane), 3 visible crates on deck (boxes). Animate gentle vertical bob (sin wave).
- Animate sail across the water when `state === 'sailing'` — interpolate position from dock to a point ~10 tiles offshore over the trip duration.
- Spawn from `buildings-manager.ts` or a new dock manager. Place at the lake edge (use existing lake coords in the terrain system).
- World bubble: when `state.boat.state === 'docked'`, show `⛵` hub bubble. Tap → opens `boat-panel`. Add crates with individual feed-style bubbles for each unfilled crate (similar to pen feed bubbles).

### 1.3 — 3D Mailbox
- File: `src/three/decor/mailbox.ts` (new).
- Components: post (cyl), rectangular mailbox (box with curved top via half-cyl), flag (small plane on a stick), flowers at base.
- Spawn at the front of the farmhouse, near the path edge.
- Behaviour: when `state.mailbox.letters.some(l => !l.read)`, raise the flag (rotate flag mesh +90°). Show world bubble `📬` with pulse.
- Tap → `openMailboxPanel()`.

### 1.4 — 3D Roadside Shop Stand
- File: `src/three/decor/roadside-stand.ts` (new).
- Components: thatched roof (cone), wooden counter (box), 3 stacked-crate slots in front, chalkboard with price tags (use procedural text via a small canvas-to-texture, OR keep it abstract and let the bubble carry the info).
- Spawn near the farm road edge.
- World bubble: `🛒` hub. Tap → `openMarketStall()` panel. Per-slot bubble showing item + count when a slot has stock, similar to crop-cluster bubbles.

### 1.5 — 3D Newspaper Stand
- File: `src/three/decor/newspaper-stand.ts` (new).
- Components: small wooden A-frame with a "DAILY ACRE" sign on top, rolled newspapers stacked inside.
- Spawn near the home centre.
- World bubble: `📰` hub with `attention` pulse when `state.gazette.lastReadDay !== state.day`. Tap → `openGazettePanel()`.

### 1.6 — 3D Neighbourhood Request Board (birdhouse style)
- File: `src/three/decor/request-board.ts` (new).
- Components: tall pole, birdhouse-style box on top with a slanted roof, request cards pinned to a corkboard below.
- Spawn near where the Co-Op signpost world bubble currently lives (`HOME_CENTER_X - 5, HOME_CENTER_Y - 3`).
- World bubble: `🤝` hub. Tap → opens a NEW panel `request-board-panel.ts` (created in Phase 3). Until Phase 3 lands, fall back to opening the existing club panel.

### 1.7 — 3D Ranger Tower (Expeditions hub)
- File: `src/three/decor/ranger-tower.ts` (new).
- Components: log cabin on stilts (4 thin cyl legs, box cabin, gable roof, ladder of horizontal box rungs, observation flag on the roof).
- Spawn near the lake/forest border. Stop using `fishingdock` as the expedition hub — give it its own tower mesh.
- World bubble: `🗺️` hub when `state.expeditions.unlocked`. Tap → `openExpeditionsPanel()`.

### 1.8 — 3D Co-Op Signpost
- File: `src/three/decor/coop-signpost.ts` (new).
- Components: wooden post, multiple plank arrows pointing different directions, each with a different friend's emoji.
- Spawn near the home centre adjacent to the request board.
- World bubble: `🏆` hub when Club unlocked. Tap → `openClubPanel()`.

### 1.9 — 3D Daily Wheel (Fairground prop)
- File: `src/three/decor/wheel-stand.ts` (new).
- Components: vertical wheel of fortune (cyl with coloured segments), pointer at top, base stand.
- Spawn near the entrance/path area.
- World bubble: `🎡` hub with pulse when `canSpin()` returns true. Tap → `openWheelPanel()`.

### 1.10 — 3D Sanctuary Book / Easel
- File: `src/three/decor/sanctuary-easel.ts` (new).
- Components: artist's easel + open book stand, with a small pond/river decoration around it.
- Spawn near the lake/river area.
- World bubble: `📖` hub when sanctuary unlocked. Tap → `openSanctuaryPanel()`.

### 1.11 — 3D Festival Cart (when active)
- File: `src/three/decor/festival-cart.ts` (new).
- Components: covered wagon, colourful flags, decorated lanterns.
- Spawn only when `state.festivalCart.active`. Use the entity-manager pattern of conditional add/remove.
- World bubble: `🎪` hub. Tap → `openFestivalCartPanel()`.

### 1.12 — 3D Train Station (when unlocked)
- File: `src/three/decor/train-station.ts` (new) + `train-engine.ts` for the rolling train mesh.
- Components: platform, station roof, signpost; train is a 3-car set on a small visible rail loop. Animate the train rolling onto the platform when `state.train.status === 'returned'`.
- World bubble: `🚂` hub when train returned. Tap → `openTrainPanel()`.

### 1.13 — 3D Hot-Air Balloon (when active)
- File: `src/three/decor/balloon.ts` (new).
- Components: balloon envelope (sphere scaled vertically), basket (small box with rope-cyl tethers), flame flicker (small cone particle).
- When `state.balloon.active`, animate it floating gently above the farm, drifting slowly across the sky.
- World bubble: `🎈` hub. Tap → `openBalloonPanel()`.

### 1.14 — Cleanup: deprecate the right-edge `corner-build` and `corner-shop` FABs
- After every system has a world-anchored entry point, the Build and Shop corner FABs are still required (Hay Day keeps the hammer + cash-register in the corners). Don't remove them — but verify they don't visually overlap with the new 3D objects when the camera centres on them.

### Phase 1 Acceptance Criteria
- Each system above has a visible 3D mesh in the scene at the correct moment (gated by `feature-visibility` where needed).
- Tapping the mesh's world bubble opens the corresponding panel.
- The world bubbles use the existing pool — no new DOM per object.
- Camera rotate (Q key) keeps bubbles correctly anchored.
- Scenic Mode hides ALL world bubbles (already handled by `bubble-layer` opacity in `style.css` — verify).
- No console errors. `npm run typecheck && npm run build` passes.
- Each major mesh shipped in its own commit with a screenshot in the PR.

---

## Section 6 — Phase 2: Shop Taxonomy + Offer Bubble + Gem Packs

**Goal:** Match FV3's 5-tab shop and the top-right offer bubble.

### 2.1 — Restructure `src/ui/shop.ts`
Current tabs at `shop.ts:29-35`: Seeds / Trees / Sell / Buy / Supplies.

Refactor to FV3 grammar:
- **Buildings** — pulls from `data/buildings.ts`; player can browse and tap to enter placement mode (`state.placing = { type }`).
- **Decor** — pulls from `data/decorations.ts`; similar.
- **Offers** — surfaces Daily Deal, Surprise Box, Maggie Offers, Festival bundles, Gem Packs (new).
- **Pass** — embeds the Season Pass road (currently its own panel; keep `pass-panel.ts` but also surface a summary card here, linking out).
- **Helpers** — hired helpers (Tool Shed system). Embed the helpers panel here.

Keep the **legacy tabs as a sub-menu inside Buildings** ("Seeds & Crops" — sub-tab) so existing seed-shop flow doesn't regress. Or fork: rename old shop to `crop-shop.ts` and tie it to a sub-button on the Buildings tab.

### 2.2 — Live Offer Bubble in top-right
- HTML: add a third `currency-pill`-style button to `.currency-stack` in `index.html:101-126`. Class: `offer-pill`. Show a gift icon + an optional "NEW" pip.
- CSS for `.offer-bubble` already exists at `style.css:450-477`; reuse the visual style.
- Logic: a new helper `src/systems/active-offer.ts` returns the highest-priority unread offer (Daily Deal > Surprise Box > Maggie > Festival). Tap → opens its panel directly.
- Update from `loop.ts` tick (cheap).

### 2.3 — Gem Pack panel under Offers
- File: `src/ui/gem-packs-panel.ts` (new).
- Visual: 4–5 stacked gem-pack cards ("Cart of Gems", "Safe of Gems", "Chest of Gems") with a placeholder "+10% WEB BONUS" chip on the largest one. The game is a coding showcase, not real monetization, so the buttons just read "Earn through play" and link to the activity that grants gems (Daily Wheel, Achievements, Pass).
- Don't add real IAP. The brief calls out the *layout slot*, not the transaction.

### 2.4 — Multi-season Pass Bundles
- Inside the Pass tab, surface a small "Bundle" card showing the next two upcoming season pass themes (placeholder names — generate seasonally from `data/seasons.ts`).
- Cosmetic only; no purchase action.

### Phase 2 Acceptance Criteria
- Shop modal renders 5 top-level tabs in the FV3 order.
- Top-right has 3 chips: gems, coins, offer bubble.
- Offer bubble pulses when a new daily deal is available.
- Gem Pack panel opens, looks like the FV3 store, no real IAP.
- Existing tutorial step that opens the Shop still works.
- Pass tab embeds or links to the existing season pass panel.

---

## Section 7 — Phase 3: Co-op Chat + Donation Board + Gift Caps

**Goal:** Hay Day's social loop — chat, donation board, daily gift caps, push-notification feel.

### 3.1 — Co-op chat panel
- File: `src/ui/club-chat-panel.ts` (new) or extend `club-panel.ts` with a `Chat` tab.
- Visual: persistent left-aligned chat overlay when open (Hay Day grammar — see research doc citation). Use the `.bottom-sheet` for mobile narrow, but layout as a sidebar on landscape.
- Messages: simulated peer chatter (use `data/characters.ts` for personality). Player can post text — sanitized (strip HTML, allow only `[A-Za-z0-9 .,!?'-]{1,80}`).
- Pre-seed with thematic messages: "Need 5 wheat for boat order, anyone?", "Anybody got spare planks?", "Daily wheel landed on gems, lucky!"
- Maintain a 60-message rolling buffer in `state.club.chat` (add to types + save).
- The chat ticks via `src/systems/club.ts` — emit a simulated message every 2–5 minutes from a random member.

### 3.2 — Donation / Request Board
- File: `src/ui/request-board-panel.ts` (new).
- Mechanic: 3 slots. Player can `Request` an item (consume 0 coins, set a timer of e.g. 30 min). Simulated members may "donate" — at the timer's end, with probability p (scale with club level), the request is fulfilled and the item arrives in inventory.
- Reverse: player can `Donate` from inventory to a fake simulated peer request. Reward: club points + reputation.
- Persistent state under `state.requestBoard` (add to types + save).
- World object: the birdhouse request board mesh built in Phase 1.6 opens this panel.

### 3.3 — Daily gift caps in Friendship
- In `src/systems/friendship.ts`, add a `giftsTodayByItem` map keyed by item, capped at 3 per item per day.
- UI: friendship panel renders a small "🎁 2 / 3 today" badge per item.
- Reset at `localDayIndex` rollover.

### 3.4 — Notification-style toast when a gift arrives
- When a donation is fulfilled (3.2), or a friendship gift is delivered (3.3), trigger a special toast `'gift'` variant with a sparkle SFX and a small badge animation.
- Stretch: use the Notifications API gated behind explicit user opt-in in settings ("Tell me when help arrives even if I tab away") — fallback gracefully if denied.

### 3.5 — Family-friendly chat mode
- Setting toggle in `src/systems/settings.ts`: `familyFriendlyChat`. When on:
  - Chat input rejects messages matching a small profanity wordlist (hardcoded — keep it tiny and obvious).
  - Simulated peers always use child-safe phrasing.
- Surface in `src/ui/settings-panel.ts`.

### Phase 3 Acceptance Criteria
- Co-op chat opens from the signpost mesh and via the Book → Club path.
- Donation board lets the player request and donate; rewards flow.
- Daily gift cap blocks a 4th gift of the same item per day with a friendly toast.
- Family-friendly toggle in Settings actually filters chat content.
- Save round-trip preserves chat buffer + request board.
- Typecheck + build pass.

---

## Section 8 — Phase 4: Accessibility Finish

**Goal:** WCAG-leaning: focus trap, sr-only labels, full keyboard nav, ARIA roles.

### 4.1 — Focus trap helper
- File: `src/ui/focus-trap.ts` (new).
- Export `trapFocus(rootEl: HTMLElement): () => void` returning a release function.
- Find all `:focus-visible` candidates inside the modal (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`).
- On Tab/Shift+Tab, cycle within those.
- Restore previously focused element on release.

### 4.2 — Apply focus trap everywhere
- `openModal()` in `src/ui/modal.ts`: call `trapFocus(modal)` on open, `release()` on close.
- Bottom sheets in `mobile-shell.ts`: same pattern for `more-sheet`, `book-sheet`, `hud-menu-drawer`, `side-panel`.

### 4.3 — `.sr-only` utility
- Add to `style.css` (near the top of the layout section):
```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  margin: -1px; padding: 0; border: 0;
  overflow: hidden; clip: rect(0 0 0 0);
}
```
- Convert `xp-label` text node to an additional `.sr-only` companion ("Level 12, 240 of 500 XP").
- Audit every icon-only button (`book-btn`, currency pills, etc.) — they should already have `aria-label`. Add `.sr-only` text where labels are decorative-only.

### 4.4 — Keyboard navigation pass
- Verify Tab order across HUD → QEB → tool dock → Order Meter → Build/Shop FABs → Book button.
- Add `tabindex="0"` to interactive `div`s that aren't `button`s.
- Add `role="dialog"` and `aria-modal="true"` to modals and bottom sheets.
- Add `role="tablist"` + `role="tab"` to `.modal-tabs`.

### 4.5 — High-contrast / reduced-motion verification
- Already wired in `style.css:5911,5951`. Pass: load every panel with each mode and confirm no broken visuals.
- Document the keyboard shortcuts in the Help panel (`src/ui/help.ts`).

### Phase 4 Acceptance Criteria
- Open any modal → Tab cycles within it, Shift+Tab works both ways, focus restores on close.
- Screen reader (Mac VoiceOver, Chrome ChromeVox) reads currency values, level, XP, and the active panel title.
- WCAG AA contrast pass for the honey palette (run a tool — Lighthouse a11y score ≥ 90).
- All bottom sheets are reachable via keyboard.
- `npm run typecheck` clean.

---

## Section 9 — Phase 5: Onboarding Polish

**Goal:** A new player feels welcomed, knows the farm's name, has a friendly narrator, and gets a tip at Lv 5.

### 5.1 — Farm naming during tutorial
- Tutorial step 1 (currently "Plow") — insert a NEW step 0: name your farm.
- File changes: `src/systems/tutorial.ts` (insert `TUTORIAL_STEPS[0]`) + `src/ui/tutorial-overlay.ts` (render an input prompt instead of a target arrow).
- Persist `state.farmName` (add to types + save). Default: "Sunny Acres".
- Display the name in the profile pill (`hud.ts`) and on the snapshot.

### 5.2 — Alfred the Scarecrow as narrator
- `src/systems/mailbox.ts` already defines Alfred. Promote him to the tutorial narrator role.
- File: `src/ui/tutorial-overlay.ts` — show a small Alfred avatar (scarecrow emoji `🦃` or `🌾🧑‍🌾`) next to each tutorial text bubble.
- Add 6 short Alfred quips in `src/systems/tutorial.ts` (e.g. "Welcome, friend!", "That soil's ripe for plowin'.").
- Reuse the existing `welcome-back-card` greeter visual style.

### 5.3 — Contextual Lv 5 Weather Grid tip
- Trigger: when `state.level` transitions to 5 and `state.weatherGrid.unlocked` becomes true.
- File: `src/systems/weather-grid.ts` (or wherever the unlock fires) — emit a special tutorial overlay step.
- Content: "Your weather mastery is awakening. Craft a card, slot it, and cast on a tough day."
- Surface a one-time pulse on the Grid button + a 5-second arrow pointing to it.

### 5.4 — Unlock celebrations
- For each major unlock (Boat L9, Train L13, Club L15, Expeditions L20, etc.), trigger a small fanfare:
  - Confetti particle burst at the centre.
  - A celebratory toast with the unlock's emoji.
  - A short Alfred quip via the tutorial bubble for 4 seconds.
- File: extend `src/systems/unlocks.ts` with `celebrate(unlockId)`.

### 5.5 — Improved welcome-back card
- Currently a card with hooks and a greeter. Add:
  - A summary row of what happened offline: "While you were away — 12 crops grew, Boat departed, 2 stall items sold."
  - An "Open offline summary" CTA that scrolls into a longer breakdown.
- File: `src/ui/welcome-back.ts`.

### Phase 5 Acceptance Criteria
- Fresh save shows a farm-naming step BEFORE the plow step.
- Tutorial text bubbles include Alfred's avatar.
- Lv-5 grid unlock triggers a one-time tip.
- Each major unlock has a celebratory moment, not a silent toast.
- Welcome-back card summarises offline events.

---

## Section 10 — Phase 6: Monetization-Grammar Completeness

**Goal:** Surface every monetization slot from the research docs, without real IAP.

### 6.1 — Maggie's Offers (recurring time-gated offers)
- File: `src/systems/maggie-offers.ts` (new).
- Visiting character: every 8 hours, Maggie appears on the farm road with a basket. Her offer is a small bundle (e.g., 100 coins + 1 fertilizer for 5 diamonds, or "earn through 1 boat order").
- World presence: a wandering character mesh (procgen NPC + speech bubble).
- UI: bubble icon `🧺` over her head. Tap opens a small dialog modal.

### 6.2 — Roadside Shop daily limits
- In `src/systems/market-stall.ts`, add a `slotsRefilledToday` counter, reset at `localDayIndex` rollover. Cap at 6 free listings/day; further listings cost 1 diamond each.
- UI: roadside-stand panel shows "4 / 6 free listings today".

### 6.3 — Time-limited shop section
- Inside the Shop's `Offers` tab (Phase 2), add a "This week only" row with rotating decor + cosmetics from `data/decorations.ts`. Rotate weekly via `weekIndex()`.

### 6.4 — Season Pass Bundles UI
- Already covered in Phase 2.4 — confirm it lists the next 2 upcoming seasons in a small panel within the Pass tab.

### 6.5 — Surprise Box odds disclosure
- Inside `src/ui/surprise-box-panel.ts`, render an "Odds" sub-section showing the loot table percentages. Required by app stores when randomized rewards are involved; good practice even without IAP.

### Phase 6 Acceptance Criteria
- Maggie appears periodically with a unique offer dialog.
- Roadside Shop respects a free-listing cap.
- Shop "Offers" tab includes a weekly rotating bundle.
- Surprise Box modal discloses odds.

---

## Section 11 — Phase 7: Animal Husbandry Depth

**Goal:** Match Hay Day's pen-management feel.

### 7.1 — Pen-full capacity warning bubble
- When `state.penAnimals[penId].length >= def.capacity`, emit a `kind: 'full'` bubble with icon `🏠` over the pen.
- Tap → opens the pen panel pre-scrolled to the "Sell" section.

### 7.2 — Auto-feed pen upgrade
- File: `src/data/buildings.ts` — add an upgrade level "Auto-Feeder" for each pen kind. Cost: 5 planks + 200 coins.
- Effect: when enabled, the pen consumes feed from the silo automatically until silo runs out. No need to tap the feed bubble.
- UI: toggle in the pen panel, visible after upgrade.

### 7.3 — Improved animal mood UI
- `src/systems/animal-mood.ts` already exists. Add a small heart/cloud icon overlay over each animal mesh proportional to mood.
- File: extend `src/three/entities/animals-manager.ts` to attach a small floating mood icon (use the world bubble pool — `kind: 'love'` or a new `kind: 'mood'`).

### 7.4 — Baby animal sync feedback
- When a baby animal ages up while another adult is producing, fire a small celebratory animation + toast: "🍼 → 🐮 — baby grew up and Bessie's milk is ready!"
- Already partially handled in `src/systems/lifecycle.ts`; surface the moment more visibly.

### 7.5 — Bulk sell flow
- Pen panel: add a "Sell all aged adults" shortcut to clear capacity quickly.
- Confirmation dialog with the gain preview.

### Phase 7 Acceptance Criteria
- Pen-full bubble appears when housing maxes.
- Auto-feed upgrade tested across day rollover and offline.
- Mood icons render correctly without bubble pool exhaustion.
- Bulk sell respects confirmations and updates inventory.

---

## Section 12 — Phase 8: Live-Ops Calendar Parity

**Goal:** Match FV3's seasonal-event UI — Sky Race, County Fair, Country Camping, Fishing Tournament.

### 8.1 — Sky Race
- File: `src/systems/sky-race.ts` (new).
- Weekly event. Player earns points by sending balloons. Reach milestones → rewards.
- UI: new panel `sky-race-panel.ts`. Quick Event Bar entry with `🏁` icon when active.
- World: a checkered flag mesh near the balloon launch area.

### 8.2 — County Fair
- File: `src/systems/county-fair.ts` (new).
- Monthly event. Player submits their best crop/animal in a category; receives ribbon + bonus reward.
- UI: panel + Quick Event Bar entry with `🎡` icon.
- World: a small fairground tent mesh.

### 8.3 — Country Camping season
- File: `src/systems/country-camping.ts` (new).
- Seasonal narrative — 4-week story arc with progressive milestones.
- UI: panel + Quick Event Bar entry with `🏕️` icon. Persistent storyline display.

### 8.4 — Fishing Tournament
- File: `src/systems/fishing-tournament.ts` (new).
- Weekly. Catch as many fish as possible. Leaderboard against simulated peers.
- UI: panel + Quick Event Bar entry with `🎣` icon.
- Tie into existing `src/systems/fishing.ts`.

### 8.5 — Event Board enhancement
- The existing event board (`live-events`) is the host. Extend `src/ui/live-events-panel.ts` to render the 4 new event types as separate cards in a "Featured" section.

### Phase 8 Acceptance Criteria
- Each event activates on its own schedule.
- Each appears in the QEB and on the Event Board.
- Each has a dedicated world mesh (small footprint).
- Rewards flow correctly + save-roundtrip safe.

---

## Section 13 — Phase 9: Performance & Polish

**Goal:** No frame drops on low-end mobile; battery friendly.

### 9.1 — Virtualized lists for Inventory + Gazette + Leaderboard
- File: `src/ui/virtual-list.ts` (new). Lightweight (no deps).
- Apply to `src/ui/inventory-panel.ts` once inventory > 50 slots, otherwise fall back to plain rendering.
- Apply to `src/ui/gazette-panel.ts` for the help-request list.

### 9.2 — IntersectionObserver for timer ticks
- In `src/ui/order-meter-hud.ts`, `boat-panel.ts`, `train-panel.ts`, `balloon-panel.ts` and any other panel with countdown timers, gate the per-frame tick on `IntersectionObserver` — only tick when the element is visible.

### 9.3 — Sprite atlas for procedural icons
- Currently each sprite is its own canvas in `src/sprites/`. Add a `buildAtlas()` step that bakes them into one shared `OffscreenCanvas`, then UI consumers use `background-position` instead of full sprite URLs.
- Optional / low priority — only if profiling shows DOM cost.

### 9.4 — IndexedDB for very large data
- Move telemetry events + journal to IndexedDB if they exceed 100 KB serialized.
- Helper: `src/save.ts` adds a `largeBucket` API. Backward compatible — `localStorage` first, IDB fallback.

### 9.5 — Bubble layer profiling
- Verify the world-bubble RAF loop runs at < 1 ms/frame with 28 active bubbles. If not, lower `POOL_SIZE` to 20 (current is 28) and re-evaluate.

### Phase 9 Acceptance Criteria
- Lighthouse Performance ≥ 85 on a 4G throttled mobile profile.
- No 60fps drop during pinch-zoom or camera pan with full farm.
- IntersectionObserver gating verified via DevTools.

---

## Section 14 — Phase 10: Real-World CSR (Optional)

**Goal:** Match FV3's Green Game Jam / Dots.eco / Vital Ground integrations.

### 10.1 — Imperfect produce campaign
- File: `src/systems/imperfect-produce.ts` (new). Weekly window.
- Mechanic: a small percentage of harvested crops are flagged as "imperfect" (visually slightly off — a wonky carrot, a lopsided tomato). Players get a +25% sell bonus when selling imperfect crops during the campaign.
- UI: a "🥕 Imperfect Hero" badge in the gazette during the event.

### 10.2 — Habitat partnership tracker
- File: `src/systems/habitat-partner.ts` (new). Pure cosmetic + narrative.
- Tracker: "Players have helped restore X acres of grizzly habitat." Increment X based on aggregate player progression milestones.
- UI: a small panel in the Book → Awards section with a fake-real progress bar. Tap → a friendly "this is symbolic, but if you'd like to support real conservation, here's a link to..." (placeholder URL, not active).

### Phase 10 Acceptance Criteria
- Both campaigns appear during their event window only.
- Visuals match the cozy aesthetic.
- No persistent UI clutter when inactive.

---

## Section 15 — Master Checklist

Track every meaningful task. Tick the box when committed AND pushed AND the typecheck + build pass.

### Phase 1 — Diegetic 3D World Objects
- [x] 1.1 — 3D Truck Order Board mesh + bubble hub
- [x] 1.2 — 3D Boat at Dock (docked / sailing / returning states)
- [x] 1.3 — 3D Mailbox with flag animation
- [x] 1.4 — 3D Roadside Shop Stand
- [x] 1.5 — 3D Newspaper Stand
- [ ] 1.6 — 3D Neighbourhood Request Board (birdhouse)
- [ ] 1.7 — 3D Ranger Tower (replace fishingdock-piggyback)
- [ ] 1.8 — 3D Co-Op Signpost
- [ ] 1.9 — 3D Daily Wheel fairground prop
- [ ] 1.10 — 3D Sanctuary Easel
- [ ] 1.11 — 3D Festival Cart (conditional)
- [ ] 1.12 — 3D Train Station + rolling train
- [ ] 1.13 — 3D Hot-Air Balloon (active animation)
- [ ] 1.14 — FAB / camera-overlap cleanup pass

### Phase 2 — Shop Taxonomy + Offer Bubble + Gem Packs
- [ ] 2.1 — Refactor shop into Buildings / Decor / Offers / Pass / Helpers
- [ ] 2.2 — Live Offer Bubble in top-right currency stack
- [ ] 2.3 — Gem Pack panel under Offers (no real IAP)
- [ ] 2.4 — Multi-season Pass Bundles card

### Phase 3 — Co-op Chat + Donations + Gift Caps
- [ ] 3.1 — Co-op chat panel (simulated peer messages, rolling buffer)
- [ ] 3.2 — Donation / Request board (`src/ui/request-board-panel.ts`)
- [ ] 3.3 — Daily gift caps in friendship
- [ ] 3.4 — Notification-style "gift arrived" toast + opt-in Notifications API
- [ ] 3.5 — Family-friendly chat mode + profanity filter

### Phase 4 — Accessibility Finish
- [ ] 4.1 — `src/ui/focus-trap.ts` helper
- [ ] 4.2 — Apply focus trap to modal + every bottom sheet + side panel
- [ ] 4.3 — `.sr-only` utility class + audit usage
- [ ] 4.4 — Tab order + ARIA roles audit (dialog, tablist, tab)
- [ ] 4.5 — Lighthouse a11y ≥ 90 verified

### Phase 5 — Onboarding Polish
- [ ] 5.1 — Farm naming as tutorial step 0
- [ ] 5.2 — Alfred avatar in tutorial bubbles + quips
- [ ] 5.3 — Lv 5 Weather Grid contextual tip
- [ ] 5.4 — Unlock celebrations for every major milestone
- [ ] 5.5 — Welcome-back card offline summary

### Phase 6 — Monetization-Grammar Completeness
- [ ] 6.1 — Maggie's Offers (recurring NPC visitor with bundles)
- [ ] 6.2 — Roadside Shop daily listing cap
- [ ] 6.3 — Time-limited shop section ("This week only")
- [ ] 6.4 — Season Pass bundles UI
- [ ] 6.5 — Surprise Box odds disclosure

### Phase 7 — Animal Husbandry Depth
- [ ] 7.1 — Pen-full capacity warning bubble
- [ ] 7.2 — Auto-feed pen upgrade
- [ ] 7.3 — Animal mood floating icons
- [ ] 7.4 — Baby-ages-up celebratory moment
- [ ] 7.5 — Bulk sell flow

### Phase 8 — Live-Ops Calendar Parity
- [ ] 8.1 — Sky Race weekly event
- [ ] 8.2 — County Fair monthly event
- [ ] 8.3 — Country Camping seasonal arc
- [ ] 8.4 — Fishing Tournament weekly event
- [ ] 8.5 — Event Board featured section enhancement

### Phase 9 — Performance & Polish
- [ ] 9.1 — Virtualized lists (inventory, gazette, leaderboard)
- [ ] 9.2 — IntersectionObserver for timer ticks
- [ ] 9.3 — Sprite atlas for procedural icons (optional)
- [ ] 9.4 — IndexedDB for telemetry + journal (optional, when needed)
- [ ] 9.5 — Bubble-layer RAF profiling under load

### Phase 10 — Real-World CSR
- [ ] 10.1 — Imperfect produce campaign
- [ ] 10.2 — Habitat partnership tracker

### Phase 11 — Final QA Pass
- [ ] 11.1 — Fresh-save full playthrough Lv 1 → 25
- [ ] 11.2 — Existing v5 save loads without console errors
- [ ] 11.3 — Mobile viewport (iPhone 14, Pixel 7) full panel sweep
- [ ] 11.4 — VoiceOver / NVDA pass on every modal
- [ ] 11.5 — Lighthouse mobile ≥ 85 Perf, ≥ 90 a11y, ≥ 90 best-practices
- [ ] 11.6 — Final README update

---

## Section 16 — Session Log

Append a one-line entry per session here. Keep newest at top. Don't delete entries.

```
YYYY-MM-DD  Phase X.Y started / completed — commit <sha> — note
```

- 2026-05-22  Phase 1.5 complete — A-frame newspaper stand at (17.5, 0, 25.3), east of the south entrance. Tilted "DAILY ACRE" sign + 4 rolled papers in a tray. World bubble 📰 pulses when there's a new edition unread OR a help request the player can fulfill. Tap → opens gazette. Files: src/three/decor/newspaper-stand.ts (new), three/index.ts, world-bubbles.ts. Typecheck + build green.
- 2026-05-22  Phase 1.4 complete — Thatched roadside stand at (5.5, 0, 19) just outside the W home edge, facing east. Counter, chalkboard with white scribbles, layered-cone thatched roof, 3 goods crates, apple bin. Goods puffs visible only when the corresponding stall slot status === 'listed'. World bubbles: 🛒 hub (becomes 💰 when any slot is sold), per-slot item icon when listed, pulsing 💰 when sold. Files: src/three/decor/roadside-stand.ts (new), three/index.ts, world-bubbles.ts. Typecheck + build green.
- 2026-05-22  Phase 1.3 complete — Rural mailbox on a post at (9.5, 0, 25.4), west of the order truck, facing east. Curved-top red box, gold flag on a pivot that smoothly rotates up when unreadCount() > 0 (with a tiny spring oscillation). Flowers + dirt mound at the base. World bubble 📬 only appears when there's unread mail. Files: src/three/decor/mailbox.ts (new), three/index.ts, world-bubbles.ts. Typecheck + build green.
- 2026-05-22  Phase 1.2 complete — Boat dock platform + boat hull mesh at the NW lake shoreline. Dock always visible; boat visible only when state.boat.state==='docked', bobs gently with sail flutter + flag wiggle. World bubbles: hub ⛵ above the boat, plus one per-crate bubble showing item emoji (or pulsing "!" when player lacks inventory). All bubbles open the boat panel. Files: src/three/decor/boat-at-dock.ts (new), src/three/index.ts (wiring), src/ui/world-bubbles.ts (hub + crate bubbles). Typecheck + build green.
- 2026-05-22  Phase 1.1 complete — Order Truck 3D mesh at (12.5, 0, 25.5), facing north. Chalkboard-textured sign reads "ORDERS · tap to open". World-bubble hub anchored at y=2.4, badge shows fulfillable+claimable count, tap → side panel. Files: src/three/decor/order-truck.ts (new), src/three/index.ts (install+update wiring), src/ui/world-bubbles.ts (hub bubble). Typecheck + build green.
- 2026-05-22  Roadmap forward doc authored. Audit complete; 75% of Hay Day/FV3 grammar already implemented. Phase 1 is the largest gap. No code yet.

---

## Section 17 — Known Risks / Gotchas

- `state.placing` and the placement banner have edge cases when entering placement mode from a modal. Test every "Build via Shop tab" flow against the existing tap-grass-to-place flow.
- The bubble pool currently has 28 entries. Phase 1 adds ~10 hub bubbles + active state bubbles (mood, capacity). Watch for pool exhaustion — bump to 40 if needed.
- Saving structure has migrations to v5. Bump to v6 only when adding new state shapes that older saves don't have; always provide safe defaults.
- The bubble layer DOM grows with the pool. Avoid creating a second pool — always reuse `installWorldBubbles()`.
- Procedural mesh additions cost memory. Each Phase-1 mesh should be capped to ~10 primitives; reuse `procgen/geometries.ts` cached factories.
- Don't introduce real money IAP. Don't ship anything that could be confused for a Loot Box gambling mechanic in EU/UK app stores.
- Don't put model identifiers, hostnames, internal session IDs, or assistant-identity strings into commits or PRs.

---

## Section 18 — Resuming in a Fresh Chat — Quickstart Prompt

When the user starts a new chat, they can paste this to get me up to speed:

> Resume Sunny Acres development. Read `/home/user/Sunny3D_Experiment/roadMapForward.md` end-to-end. Find the first unchecked item in the Master Checklist. Read its phase section + the Architecture Cheatsheet + Implementation Patterns. Implement it on branch `claude/affectionate-bohr-T0gNH`. Commit, push, open/update the draft PR. Tick the box in the checklist in the same commit. Update the Session Log. Stop when typecheck + build pass.

---
