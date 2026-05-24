> **STATUS — 2026-05-24:** This brief was the trigger for two waves of
> work. The structural clarity items (Phases 1–13 — feature visibility,
> objectives rewrite, unlock progression, system-fatigue audit, README
> rewrite, save QA, panel QA, balance pass, debug helpers, technical
> quality) all landed in earlier passes; see `docs/system-fatigue-audit.md`
> for the audit and `src/systems/feature-visibility.ts`,
> `src/systems/objectives.ts`, `src/systems/unlocks.ts` for the
> implementation. The "Prioritised Action Plan for CrazyGames" table at
> the end of this brief was closed on 2026-05-24:
>
> - 🔴 Tutorial spotlight overlay — done in `src/ui/tutorial-overlay.ts`
> - 🔴 Level-gated UI clutter — done via `src/systems/feature-visibility.ts`
> - 🔴 Mobile (pinch + long-press) — done in `src/input.ts`
> - 🟠 CrazyGames share — done via Web Share API in `src/systems/snapshot.ts`
> - 🟠 Real social via CG SDK getUser — done in `src/systems/crazygames.ts`
>   and surfaced on the leaderboard panel
> - 🟠 Non-destructive prestige — done in `src/systems/prestige.ts`
> - 🟠 Hunger warning + auto-feed — done in `src/systems/pens.ts`
> - 🟡 Fishing minigame phase escalation — done in `src/systems/fishing.ts`
> - 🟡 Day-pace slow mode — done via `paceMultiplier()` in `src/systems/settings.ts`
> - 🟢 Idle animations on animals + crop sway — done in
>   `src/three/entities/animals-manager.ts` and `crops-manager.ts`
>
> The remaining open items are browser-side QA (Lighthouse a11y + perf,
> manual playthroughs) — see `roadMapForward.md` Phase 11. This brief is
> kept verbatim below as historical context.

---

You are an expert browser game developer, TypeScript engineer, UX designer, systems designer, onboarding designer, and retention designer.

You are working on my browser farming/management game called “Sunny Acres”.

The game has recently grown very large. Many systems have now been implemented: farming, animals, production, fishing, weather, Weather Mastery Grid, orders, quests, daily systems, weekly systems, season pass, market stall, Sunny Gazette, boat/train/balloon/festival deliveries, land expansion, obstacles, building upgrades, landmarks, friendship, club, village, expeditions, live events, greenhouse, compost, helpers, contracts, hazards, museum, friend codes, and more.

This is impressive, but the current risk is feature overload.

Your task is NOT to add more features.

Your task is to perform a full “Sunny Acres Clarity, Pacing, UX, and First-Session Fix Pass”.

The goal is to make the game feel clear, playable, understandable, cozy, and commercially viable.

The player should never feel like they opened a spreadsheet or a giant debug dashboard. They should feel like they are starting a warm, understandable farming adventure that gradually reveals depth over time.

CRITICAL RULES:

- Do not add new major gameplay systems.
- Do not bloat the game further.
- Do not rewrite the architecture.
- Do not remove existing systems unless something is truly broken or unused.
- Do not make broad unrelated refactors.
- Do not break save/load compatibility.
- Do not introduce external dependencies unless absolutely necessary.
- Do not introduce image/audio assets; keep the existing procedural/code-generated direction.
- Keep changes modular, reviewable, and low-risk.
- Prioritize player clarity over showing every system.
- Prioritize the first 10 minutes of play over late-game completeness.
- The game already has enough systems. Now make them understandable.

MAIN PROBLEM TO SOLVE:

Sunny Acres now has many implemented systems, but too many may be visible too early. The player may be overwhelmed by the More menu, unclear unlocks, outdated guidance, and an Objective Rail that does not yet cover all the new systems.

Your job is to fix this.

============================================================
PHASE 1 — AUDIT THE CURRENT GAME
============================================================

First, inspect the current codebase carefully.

Pay special attention to:

- src/main.ts
- src/loop.ts
- src/types.ts
- src/save.ts
- src/systems/objectives.ts
- src/systems/unlocks.ts
- src/ui/objective-rail.ts
- src/ui/mobile-shell.ts
- index.html
- README.md
- all new roadmap systems:
  - market-stall
  - gazette
  - boat
  - train
  - balloon
  - festival cart
  - expansion
  - landmarks
  - friendship
  - club
  - village
  - expeditions
  - live-events
  - greenhouse
  - compost
  - visitors
  - reputation
  - card fusion
  - forecast
  - helpers
  - journal
  - contracts
  - hazards
  - museum
  - friend codes
  - building upgrades
  - tool shed
  - decor sets

Make a short internal inventory of:

1. Which systems are visible in the UI.
2. Which systems are level-gated.
3. Which systems are initialized from the start.
4. Which systems have buttons in the More menu.
5. Which systems are surfaced in Objective Rail.
6. Which systems are surfaced in unlock previews.
7. Which systems are mentioned in README.
8. Which systems can generate urgent actions.
9. Which systems can generate rewards waiting to be claimed.
10. Which systems may overwhelm new players.

Then implement the fix pass.

============================================================
PHASE 2 — REDUCE EARLY UI OVERLOAD
============================================================

The current More menu must not show every system at once to a new player.

Create a clean, progressive visibility model for the More menu.

The player should only see:

1. Core systems available now.
2. Important systems that are close to unlocking.
3. A small number of clearly labeled “Coming Soon” teasers.

Do not show 30+ buttons to a Level 1 player.

Recommended visibility philosophy:

Level 1–3:
- Shop
- Build
- Barn / Inventory
- Quests / Orders
- Help
- Save
- Basic Daily if available
- maybe Wheel if unlocked very early

Level 4–6:
- Daily
- Wheel
- Market Stall
- Gazette
- Weather Grid
- Collection / Codex if available
- Specialization if available

Level 7–10:
- Plots / Expansion
- Boat
- Landmarks
- Festival Cart if appropriate
- Market systems

Level 11–15:
- Train
- Village
- Balloon
- Building Mastery
- Friendship

Level 16–20:
- Club
- Expeditions
- Live Events
- Contracts
- Museum

Level 20+:
- Prestige
- Helpers
- Advanced systems
- Optional late-game systems

Do not blindly use this exact level schedule if the actual code uses different unlock levels. Inspect the existing unlock conditions and align the UI visibility with the actual game.

Implementation requirements:

- Create a single central helper that decides whether a UI/system button is:
  - visible
  - hidden
  - locked but teaser-visible
  - unlocked
  - claimable/attention-needed

Possible name:
- src/systems/system-visibility.ts
- src/systems/ui-gates.ts
- src/systems/feature-visibility.ts

Each system should have metadata like:

```ts
interface FeatureGate {
  id: string;
  label: string;
  icon: string;
  unlockLevel?: number;
  isUnlocked: () => boolean;
  isRelevantSoon?: () => boolean;
  hasAttention?: () => boolean;
  openButtonId: string;
  category: 'core' | 'daily' | 'market' | 'delivery' | 'social' | 'exploration' | 'progression' | 'advanced';
}

The More menu should be rendered/updated based on these gates, not as a giant always-visible static list.

If the current HTML uses static buttons, keep the existing structure if safer, but programmatically hide/show/disable them based on feature visibility.

Locked systems should show friendly copy:

“Unlocks at Level 7”
“Coming soon: Boat Deliveries”
“Reach Level 15 to join the Farming Club”
“Expeditions unlock later — keep growing your farm!”

Avoid clutter.

Acceptance criteria:

A fresh Level 1 player does not see an overwhelming wall of systems.
Systems appear gradually as the player levels up.
Late-game systems do not distract early players.
Locked systems can still create anticipation, but only when relevant.
More menu feels curated, not dumped.
============================================================
PHASE 3 — UPGRADE THE OBJECTIVE RAIL INTO THE GAME’S BRAIN

The Objective Rail is now one of the most important systems in the whole game.

Because Sunny Acres has many systems, the player needs the Objective Rail to tell them what matters right now.

Update src/systems/objectives.ts so it covers all important current and new systems.

The Objective Rail should prioritize:

HIGH PRIORITY / URGENT:

Return gift available
Daily streak available
Daily wheel spin available
Timed reward available
Quest reward claimable
Daily challenge claimable
Order fulfillable
Boat leaving soon with unfilled crates
Train returned with rewards
Market Stall sold items waiting to collect
Balloon leaving soon
Festival Cart reward claimable
Live Event reward claimable
Club milestone claimable
Contract expiring soon
Visitor request expiring soon
Crops wilting
Animals hungry
Ready production items
Greenhouse slots ready
Compost finished
Expedition energy full, if expeditions are unlocked
Expansion plot unlockable
Obstacle clearable
Landmark contribution possible
Weather Grid charge full and useful

MEDIUM PRIORITY:

Crops ready to harvest
Trees ready to harvest
Production building idle
Pen produce ready
Gazette unread/help request available
Boat docked with crates
Train loadable
Market hot item available
Contract offer available
Festival Cart progress possible
Active event progress possible
Weather hazard preparation needed
Storage near full or over capacity
Building upgrade available
Storage upgrade available
Card fusion available
Museum/collection reward available
Friendship gift available
Village daily visit available

LOW PRIORITY:

Plant empty plots
Build next useful building
Buy seeds
Decorate for beauty score
Check museum
Read journal
Visit village
Check forecast

The Objective Rail should not just list everything.

It should rank suggestions by:

urgency
reward readiness
time sensitivity
player level
current inventory
current unlock state
first-session relevance
whether the player can actually complete it now

Every objective should have:

short text
icon
priority
actionId
optional payload
optional urgency type
optional time remaining
optional disabled/locked state

Examples:

“Collect 340💰 from Market Stall”
“Boat leaves in 12m — fill 2 crates”
“Train returned with rare materials”
“Gazette has a help request you can complete”
“East Meadow can be unlocked”
“Clear 1 obstacle in Old Orchard”
“Festival Cart reward ready”
“Club milestone ready”
“Compost finished”
“Visitor leaves soon”
“Contract expires soon”
“Expedition energy full”
“Live event reward ready”
“Weather Grid charge ready”

Also update the Objective Rail UI so clicking/tapping an objective opens the relevant panel or focuses the relevant thing when possible.

Acceptance criteria:

At any moment, the top objective feels useful.
The Objective Rail covers old and new systems.
The player is never left wondering “what should I do now?”
Time-sensitive systems are surfaced before they expire.
Rewards waiting to be claimed are surfaced clearly.
Unlocked systems are introduced through objectives when relevant.
The Objective Rail does not overwhelm; show only 1–4 best suggestions.
============================================================
PHASE 4 — UPDATE UNLOCK PROGRESSION

src/systems/unlocks.ts appears to be outdated compared to the current implemented systems.

Update the unlock system so it reflects the real game.

It should include all major meaningful unlocks, such as:

Feed Mill
Bakery
Hen House
Fishing Dock
Market Stall
Sunny Gazette
Apple Tree
Pet Dog
Weather Mastery Grid
Specialization
Apiary
Perfumery
Candle Shop
Plots / Land Expansion
Boat Deliveries
Landmarks
Train Deliveries
Festival Cart
Hot Air Balloon
Village
Friendship
Building Mastery
Greenhouse
Club
Expeditions
Live Events
Contracts
Museum / Collection Hall
Helpers
Prestige
Advanced systems

Do not include every tiny item. Include only meaningful milestones.

The unlock system should support:

nextBigUnlock()
nextUnlocks(limit)
allFutureUnlocks()
unlocks available now
unlocks close to current level
UI labels/icons/descriptions
optional category
optional “why this matters” description

Example:

{
  level: 4,
  icon: '🛒',
  label: 'Sunny Market Stall',
  description: 'Sell items to simulated customers while you farm.',
  category: 'market'
}

Make sure the unlock list aligns with actual level gates in the systems.

Acceptance criteria:

Level-up messages tease the correct next major system.
Welcome Back / News / Help panels can show meaningful upcoming unlocks.
More menu teaser visibility can use this system.
No major implemented system is invisible from progression.
============================================================
PHASE 5 — FIRST 10-MINUTE EXPERIENCE PASS

The first session must be delightful, not confusing.

Test and improve the flow from a fresh save.

The ideal first 10-minute flow:

Splash / welcome
Clear first instruction
Plow / plant / harvest
Complete first order
Earn coins + XP
Build first production building
Start first production job
Claim visible reward
Understand next unlock
Feel reason to keep playing

Requirements:

Keep tutorial short and contextual.
Do not explain all systems upfront.
Do not open too many panels.
Avoid large text blocks.
Use visual highlights.
Use warm character/villager language.
Make the player complete a satisfying loop quickly.
First crops should grow quickly enough to teach the loop.
First order should be fulfillable.
First production building should be affordable.
First reward should feel good.
The player should see “coming soon” progression but not be overwhelmed.

Review and adjust:

starting coins
starting wheat/seeds
early grow times
early order requirements
first building costs
tutorial steps
early objective priorities
when daily/wheel/pass systems appear

Acceptance criteria:

A new player understands the core loop within 60 seconds.
A new player completes at least one satisfying action chain within 3 minutes.
A new player is not exposed to late-game systems.
The first 10 minutes feel like a cozy farm, not a giant systems dashboard.
The player has a clear reason to continue.
============================================================
PHASE 6 — SYSTEM FATIGUE AUDIT

Perform a “system fatigue” audit.

For every major system, classify it:

Core and always relevant
Important but should be unlocked gradually
Optional late-game
Passive/background
Should be hidden until attention is needed
Should be simplified in UI
Potentially redundant/confusing

For each major system, ask:

Does the player understand it in 5 seconds?
Does it connect to the core loop?
Does it create meaningful choices?
Does it reward the player clearly?
Is it visible too early?
Is it too similar to another system?
Should it be passive until it has something to claim?
Does it need better naming?
Does it need a clearer tooltip?
Does it need to be demoted in the UI?

Do not remove systems in this pass unless one is clearly broken or completely redundant. Prefer hiding, gating, simplifying, or reframing.

Create an internal markdown report if useful, for example:

docs/system-fatigue-audit.md

This report should list:

system name
current visibility
recommended visibility
risk level
action taken

Acceptance criteria:

The game feels calmer.
Players see fewer irrelevant buttons.
Advanced systems still exist but do not crowd the early game.
The most important systems are surfaced at the right time.
============================================================
PHASE 7 — UPDATE README

README.md is now likely outdated.

Update it so it accurately describes the current game.

README should include:

What Sunny Acres is.
Core gameplay loop.
Main systems.
Signature mechanic: Weather Mastery Grid.
Retention systems.
Market/delivery systems.
Progression systems.
Technical architecture.
How to run locally.
How to build.
How save/load works.
How procedural sprites/audio work.
How GitHub Pages deployment works.
Current development status.
Recommended testing checklist.

Keep README readable. Do not turn it into a huge design bible.

Also mention that the game is intentionally code-generated/procedural and uses no external game assets.

Acceptance criteria:

README matches current implemented systems.
A developer can understand the project quickly.
A reviewer sees that this is now a substantial farming/management game.
It does not overpromise real multiplayer if friend codes are only architecture/future-ready.
============================================================
PHASE 8 — SAVE/LOAD AND TIMER QA

Because the game now has many systems, save/load must be treated carefully.

Review save.ts and every system with timers.

Make sure save/load correctly handles:

crops
animals
production queues
trees
weather
market stall
boat
train
balloon
festival cart
expeditions energy
contracts
compost
greenhouse
helpers
visitors
live events
daily/weekly systems
pass
hazards
forecast
objective state

Do not change save format unless necessary.

If save migration is needed:

bump save version
add safe migration
add defaults for missing fields
do not crash older saves
do not erase player progress

Add defensive guards where needed.

Acceptance criteria:

Fresh save works.
Existing v5 save works.
Older save with missing new fields does not crash.
Returning after offline time does not create negative timers.
Expired timers resolve gracefully.
Undefined nested state does not crash panels.
============================================================
PHASE 9 — PANEL AND BUTTON QA

Audit every button and panel in the More menu and HUD.

For each panel:

Does it open?
Does it work at low level?
Does it explain why it is locked?
Does it explain what to do?
Does it show empty states gracefully?
Does it avoid console errors?
Does it work after save/load?
Does it work on mobile/touch?
Does it close correctly?
Does it show rewards clearly?

Important panels to test:

Shop
Build
Barn / Inventory
Orders / Quests
Daily
Wheel
Pass
Weather Grid
Specialization
Collection / Codex
Market
Market Stall
Gazette
Boat
Train
Landmarks
Friendship
Village
Club
Plots
Expeditions
Live Events
Balloon
Festival Cart
Recipes
Museum
Leaderboard
Prestige
Snapshot
Help

Acceptance criteria:

No dead buttons.
No hidden-but-required buttons.
No broken panel from locked state.
No panel opens to a confusing blank state.
All locked panels give a friendly explanation.
============================================================
PHASE 10 — BALANCE AND PACING SANITY PASS

Do not rebalance the entire game deeply yet, but perform a sanity pass.

Check:

early crop grow times
first order requirements
first building cost
first animal cost
first production queue time
early XP curve
early coin economy
storage capacity pressure
market stall unlock value
boat/train requirements
expansion material availability
expedition energy pacing
live event reward pacing
season pass progression
reward inflation from many overlapping systems

The game now has many reward sources. Be careful that the player is not flooded with coins/materials too quickly.

Also avoid the opposite: material-gated systems should not become impossible.

Acceptance criteria:

First 10 minutes are fast and satisfying.
First 30 minutes reveal depth gradually.
Early upgrades feel reachable.
Storage pressure is understandable but not annoying.
Delivery systems feel aspirational, not impossible.
Reward sources do not completely break the economy.
============================================================
PHASE 11 — DEBUG / QA HELPERS

The game already has debug helpers via ?debug=1.

Improve them only if necessary to support QA.

Useful debug helpers:

set level
grant coins
grant XP
grant item/material
skip time
reset save
unlock systems
complete active timers
force daily rollover
force boat arrival
force train return
force balloon arrival
force live event reward
fill market stall sale
simulate offline return

Do not expose these in normal play.

Acceptance criteria:

QA can test all major unlock tiers quickly.
Debug helpers do not affect normal players.
Debug helpers are guarded behind ?debug=1 or equivalent.
============================================================
PHASE 12 — TECHNICAL QUALITY

Keep technical changes disciplined.

Requirements:

TypeScript strict mode must pass.
Production build must pass.
No new console errors.
No broad rewrites.
No unnecessary dependency changes.
No mass formatting churn.
No dead imports.
No unreachable panels.
No circular logic that causes init/tick crashes.
No uncontrolled timer growth.
No huge localStorage bloat from unbounded arrays.

Check especially:

journal entries should not grow forever without cap
telemetry should remain capped
visitors/contracts/events should not accumulate forever
expired objects should be cleaned up
particles/floats should not leak
helper timers should not go negative
objective calculation should be cheap enough to run frequently

Acceptance criteria:

npm run typecheck passes.
npm run build passes.
Fresh game loads.
Existing game loads.
No obvious console errors.
Objective Rail runs without performance issues.
============================================================
PHASE 13 — FINAL DELIVERABLE

After implementing, provide:

Summary of the problem you fixed.
Files changed.
UI/menu visibility changes.
Objective Rail improvements.
Unlock progression changes.
README changes.
Save/load changes, if any.
Balance/pacing changes.
QA performed.
Known limitations.
Recommended next step.

Do not claim everything is perfect unless it was actually tested.

The final result should feel like:

Sunny Acres is still deep.
But the game no longer overwhelms new players.
The player always knows what to do next.
Systems unlock gradually.
The More menu feels curated.
The Objective Rail feels intelligent.
README matches the game.
The first 10 minutes are much stronger.
The game is more ready for real players.

REMEMBER:

Sunny Acres does not need more features right now.

It needs clarity, pacing, polish, and confidence.


Sunny Acres — Full Game Analysis
What's Already Excellent
Architecture & Tech

Zero-dependency stack (vanilla canvas, Web Audio, localStorage) — perfect for CrazyGames, loads instantly
Procedural sprites are smart: no CDN/asset pipeline, consistent art style, tiny bundle
Telemetry hooks baked in from day one — critical for data-driven balancing
Save/load with timer rebasing means offline progress actually works correctly
70+ systems with clean separation (data tables → systems → UI) — very maintainable
Gameplay Depth

The production chain (crop → mill → bakery → order) is the game's strongest loop — satisfying and well-layered
Weather Mastery Grid is a genuinely unique mechanic no other browser farming game has
Friendship/village/reputation system gives orders emotional weight (personalised toasts are a nice touch)
Prestige with perks gives long-term players a meta-progression reason to replay
Specializations, clubs, season pass, live events, expeditions — the retention toolkit is remarkably complete for a browser game
What Needs Improvement
1. First-Session Onboarding (Critical)
The tutorial is 6 text-string steps with no visual indicators on the actual canvas. CrazyGames players will quit in under 2 minutes if nothing highlights where to click.

Missing: Animated arrows or tile-glow on the specific tile/button to interact with
Missing: A "skip" that actually keeps context (right now dismiss just hides the step)
Missing: Secondary tutorial for key unlocks (Weather Grid at level 5 has zero guidance)
The tutorial's step 6 ("Build a Feed Mill") fires before the player even knows what feed does
2. UI Overload / HUD Clarity (High Priority)
The toolbar has 20+ buttons visible immediately. A new player has no idea what 70% of them are for before level 5.

Problem: Gazette, Boat, Train, Balloon, Club, Expedition, Market Stall, Live Events, Leaderboard, Snapshot, Recipe Book, Museum, Contracts, Hazards, Tool Shed — all visible and clickable from session 1
Fix: Progressive disclosure — only show buttons as their system unlocks at the relevant level
The HUD XP bar tooltip for "next unlock" is a great idea but the tooltip won't work on mobile (touchscreen has no hover)
No visual distinction between "available" and "locked-but-visible" buttons
3. Grid Size vs. Content (High Priority)
The farm is 18×18 = 324 tiles, but:

Lake takes ~21 tiles (upper-left)
Path takes ~18 tiles
Water + soil zones leave roughly 240 usable tiles
A 3×3 building uses 9 tiles; with 15 buildings that's 135 tiles consumed
Players who invest in buildings, pens, orchards, and decor run out of space very quickly at mid-level
Fix: Land expansion (system exists in expansion.ts) needs to unlock earlier and grant meaningful extra space, not just cosmetic plots.

4. Day Speed vs. Crop Timers (Balance)
DAY_SECONDS = 90 means one in-game day = 90 real seconds. But:

Wheat grows in 18 seconds (= 0.2 game-days) — too fast, no anticipation
Sugarcane grows in 280 seconds = 3.1 game-days — fine but late-game
The "I want to check back tomorrow" loop is broken for early crops — everything resolves within a single session
Fix: Either slow early crop timers so they span at least 1-2 real days for casual players, OR keep the fast loop but add a second "slow" crop tier that incentivises returning tomorrow.

5. Multiplayer / Social Layer (Big Gap)
The "leaderboard" is entirely simulated peers — simulated names, simulated scores, no actual sharing. The Club system uses SIM_NAMES bots. There is no real multiplayer at all.

For CrazyGames retention this is a significant missed opportunity:

Friend codes exist (friend-codes.ts) but there's no real sync mechanism — it's localStorage-only
Fix short-term: Add a CrazyGames SDK share button that posts a farm screenshot with the player's score — virality hook
Fix long-term: Use the CrazyGames SDK's user system for real leaderboards (just a top-10 weekly score POST)
6. Fishing Minigame
The minigame is a single bouncing marker on a 280px bar. That's it. For a game with a full fishingdock building and 3 fish species including a rare Goldfish, the minigame doesn't match the promise.

The zoneWidth is always 28-80px on a 280px bar — statistically guaranteed ~25-28% hit rate regardless of bait
No tension: the marker bounces at constant speed; there's no acceleration, no directional surprise
Fix: Multi-phase catch (hook → reel → land), or at minimum add random speed changes and a narrowing window under a time limit
7. Prestige Reset is Too Destructive
doPrestige() wipes: buildings, animals, trees, decorations, quests, achievements, inventory, and grid. Players who have spent hours decorating their farm lose everything for a modest talent currency bonus.

Hay Day (the stated inspiration) never resets the farm
Fix: Prestige should reset progression metrics (level, XP, coins) but keep the physical farm layout, buildings, and decorations. Or make it opt-in per category ("reset crops and coins, keep buildings")
8. Mobile UX Gaps
The mobile-shell.ts exists but there's no swipe-up gesture sheet for the bottom panels
Tool switching (hand/plow/seed) requires keyboard 1/2/3 — the DOM buttons exist but aren't prominently accessible on a small touch screen
Tooltip system relies on mousemove — on mobile no tooltip fires, so tile status is invisible
Pinch-to-zoom isn't implemented (only scroll wheel zoom)
9. Animal Feed Friction
The feed system requires: grow wheat → build feedmill → craft feed → open pen panel → feed animals. That's 5 steps, and if animals run out of feed their production just stops silently. A CrazyGames casual player will wonder why their chickens stopped producing eggs.

Fix: Add a visible hunger warning on the pen tile (sprite overlay) much earlier
Fix: Allow auto-feed as an unlockable pen upgrade so mid-game players don't micromanage
10. Economy Balance Issues
Wheat sells for 3 coins, but a cookie (3 wheat → flour → egg → cookie) sells for 50 — that's the right direction, but the intermediate items (flour: 12 coins, bread: 20 coins) actually lose money vs. just selling wheat raw once building costs are factored in early
Ribs (250 coins) and Pie (310 coins) are late-game but feel too similar in reward vs. the investment required
The hot-item gazette bonus (+25%) is the right idea but 25% is too small to meaningfully change player behaviour
11. Weather Grid Discoverability
The Weather Mastery Grid is the game's "signature identity" (per the roadmap) yet:

It unlocks at level 5 with no in-game tutorial
The charge system (limited activations per day) can silently prevent the player from using their cards
Weather Cards aren't explained anywhere in the help modal
No visual indicator on the main canvas that the grid is active
12. Visual Polish / Juice
The procedural sprite system is architecturally smart but visually the game looks like coloured rectangles compared to the CSS design system which is genuinely beautiful (honey/sage/cherry palette, bevels, paper textures).

The canvas farm tiles and sprites feel disconnected from the polished HTML UI
Buildings are indistinct rectangles with a label — hard to tell a Bakery from a Sugar Mill at a glance
No idle animations on animals or crops (slight sway, blinking)
Combo meter exists but the visual is minimal
Prioritised Action Plan for CrazyGames
Priority	Area	Change
🔴 Must	Tutorial	Add canvas-layer spotlight/arrow overlay on the exact tile/button for each step
🔴 Must	UI clutter	Gate buttons behind level unlock — show "🔒 Lv X" placeholder, not a clickable panel
🔴 Must	Mobile	Add pinch-to-zoom and long-press tooltip fallback
🟠 High	Onboarding	Add contextual tooltip bubbles for the Weather Grid, Season Pass, Specializations on first open
🟠 High	Social	Integrate CrazyGames SDK share (screenshot + score); even a static share button dramatically improves virality
🟠 High	Prestige	Make prestige keep physical farm (buildings + decor), only reset progression
🟠 High	Feed	Add hunger warning sprite overlay on pens; add auto-feed upgrade
🟡 Medium	Fishing	Add at least one difficulty escalation (speed ramp, time limit) to make goldfish feel earned
🟡 Medium	Grid size	Make land expansion unlock at level 6 (not deep into roadmap) with clear visual locked-plot indicators on the farm
🟡 Medium	Day speed	Add a "slow mode" toggle (longer crop timers) for players who don't want a speed-run pace
🟡 Medium	Economy	Adjust bread/flour sell prices to always beat raw wheat; ensure every processed item beats raw at the same input quantity
🟢 Low	Canvas juice	Add 1-frame idle bobbing on animals and a subtle wind-sway on mature crops
🟢 Low	Real social	Week 2+: hook into CrazyGames SDK getUser() for a real weekly top-10 board
The game's core loop and feature depth are genuinely impressive for a browser game. The biggest CrazyGames-specific risks are: new-player confusion in the first 2 minutes (too many unlocked buttons, text-only tutorial) and no real social/share hook. Fix those two and the retention foundation is already solid.



Make the game feel like a polished farming adventure, not a feature checklist.
