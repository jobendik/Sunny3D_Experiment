# Sunny Acres — Full Expansion Roadmap

**Document type:** Product / design / implementation roadmap  
**Game:** Sunny Acres  
**Genre:** Cozy browser farming, production-chain, idle/return, order-fulfillment game  
**Primary inspiration:** Hay Day-style farming and production games, expanded with Sunny Acres' own weather, season, soil, and procedural-code identity  
**Core direction:** Make Sunny Acres feel like a complete, living, long-term farming game — not just a large list of isolated systems.

---

## 0. Executive Summary

Sunny Acres already has a strong foundation: crops, animals, production chains, fishing, orchards, weather, seasons, Weather Mastery Grid, orders, quests, dailies, weeklies, season pass, specializations, prestige, collections, random events, dynamic market, achievements, decorations, pet dog, crows, consumables, combo meter, treasure chests, offline income, async visitors, XP progression, save/persistence, procedural audio, procedural rendering, and telemetry hooks.

The next stage should not be random feature bloat. The next stage should transform Sunny Acres into a richer, more physical, more social, more expandable, more emotionally engaging farming game. The missing layer is not merely “more systems”; it is the classic farming-game feeling of:

- a farm that visibly grows over time,
- storage pressure and meaningful inventory decisions,
- a lively market economy,
- physical deliveries by truck, boat, train, and special vehicles,
- land expansion and obstacle clearing,
- building upgrades and mastery,
- large construction projects,
- neighbor help and community flavor,
- a small village/world around the farm,
- event maps and expeditions,
- long-term collection and decoration goals,
- better retention hooks,
- stronger progression pacing,
- and a clearer unique identity centered on weather mastery.

This roadmap lists every major system that should be added or expanded, in a practical implementation order.

---

## 1. Design Pillars

### 1.1 Cozy Clarity

The player should always understand what they can do, what they are working toward, and why it matters.

Sunny Acres can become deep, but it must never feel like a spreadsheet. Every system should be visual, tactile, and emotionally understandable.

### 1.2 Physical Economy

Orders, deliveries, storage, trade, production, and expansion should feel like they exist in the world.

Instead of abstract panels only, use:

- roadside stalls,
- delivery trucks,
- boats at the dock,
- trains at a station,
- market newspapers,
- crates,
- packages,
- construction sites,
- locked land plots,
- visible upgrade states,
- customers and neighbors.

### 1.3 “I Want to Check Back Tomorrow”

The game should create anticipation rather than stress.

Examples:

- apple trees will be ready tomorrow,
- the boat leaves in 7 hours,
- the merchant refreshes tomorrow,
- rainy weather is forecast,
- the player’s market stall may sell goods while away,
- the next land plot will unlock a new area,
- a landmark project is one delivery away from completion,
- weekly festival progress continues.

### 1.4 Weather as the Signature Identity

The Weather Mastery Grid should remain Sunny Acres’ unique identity. New systems should connect to weather, seasons, soil, animals, fishing, markets, and production where possible.

Sunny Acres should not merely copy Hay Day. It should feel like:

> A cozy farming game where the player learns to master weather, seasons, soil, animals, markets, and production chains to build the perfect living farm.

### 1.5 Implement Wide Systems Carefully

The user wants to implement everything in this roadmap. That is possible, but it must be phased. Many farming games collapse under too many currencies, timers, panels, and event layers.

Each new system should be:

- introduced gradually,
- level-gated,
- visually clear,
- integrated into existing loops,
- save-compatible,
- telemetry-tracked,
- and balanced carefully.

---

## 2. Current Foundation to Preserve

Sunny Acres already has many systems. These should be preserved and integrated, not replaced.

### 2.1 Existing Core Loop

Current core loop:

```text
Plant → Grow → Harvest → Sell / Process → Earn → Upgrade
```

This should remain the spine of the game.

### 2.2 Existing Systems

Preserve and build upon:

- Farming system
- Crop varieties
- Crop growth stages
- Withering/wilting
- Plowing
- Soil moisture and fertility
- Animal pens
- Animal hunger
- Animal mood
- Production buildings
- Production queues
- Adjacency bonuses
- Item quality tiers
- Fishing minigame
- Fishing biomes
- Bait system
- Orchard system
- Weather and seasons
- Weather Mastery Grid
- Orders
- Quests
- Daily system
- Weekly system
- Season pass
- Specializations
- Prestige
- Collections/mastery encyclopedias
- Random events
- Dynamic market
- Achievements
- Decorations and beautification score
- Pet dog
- Crow AI
- Catalyst consumables
- Combo meter
- Treasure chests
- Offline income
- Async visitors
- XP and level progression
- LocalStorage save/persistence
- Procedural audio
- Procedural rendering
- Telemetry hooks

### 2.3 Integration Principle

Every new major system should connect back to at least one of these existing systems.

Examples:

- Market Stall uses inventory, item quality, dynamic market, offline income.
- Truck Deliveries use orders, quests, XP, daily/weekly, season pass.
- Barn/Silo uses inventory and expansion materials.
- Land Expansion uses tools, treasures, achievements, decoration, landmarks.
- Building Upgrades use production queues, item quality, recipes, mastery.
- Expedition Maps use crops, crafted goods, tools, weather cards, characters.

---

## 3. Recommended Phase Order

This is the safest full implementation order.

```text
Phase 0: Technical foundation and migration safety
Phase 1: Storage pressure: Barn, Silo, upgrade materials
Phase 2: Roadside Shop / Market Stall
Phase 3: Sunny Gazette / newspaper / market feed
Phase 4: Physical delivery systems: Truck, Boat, Train, Balloon, Festival Cart
Phase 5: Land expansion and obstacle clearing
Phase 6: Building upgrades and mastery stars
Phase 7: Landmark construction projects
Phase 8: Neighbor help and simulated social economy
Phase 9: Farming Club / co-op simulation
Phase 10: Village / town area
Phase 11: Event islands and expeditions
Phase 12: Expedition energy, tools, and map progression
Phase 13: Advanced decorations, contests, photo/share layer
Phase 14: Live-ops calendar and seasonal event framework
Phase 15: Economy, balance, UX, performance, and telemetry hardening
```

Each phase should be playable and stable before moving on.

---

# PHASE 0 — Technical Foundation and Migration Safety

## 0.1 Goal

Prepare the codebase so that many new long-term systems can be added without corrupting saves, overwhelming UI, or breaking existing loops.

## 0.2 Why This Matters

Sunny Acres already has a large save state. Adding storage caps, market listings, delivery timers, land plots, expansion materials, buildings upgrades, social visitors, expeditions, and event states will significantly increase save complexity.

Before adding everything, the game needs a safe extensible structure.

## 0.3 Required Work

### Add Save Versioning and Migration

Current save slot appears to be versioned as `sunnyacres-save-v2`. Before adding large systems:

- Add explicit save schema version.
- Add migration functions.
- Add defaults for missing fields.
- Never assume a field exists.
- Add safe reset/fallback for corrupted subsystem states.

Example:

```js
const CURRENT_SAVE_VERSION = 3;

function migrateSave(save) {
  if (!save.version) save.version = 1;
  if (save.version < 2) migrateToV2(save);
  if (save.version < 3) migrateToV3(save);
  save.version = CURRENT_SAVE_VERSION;
  return save;
}
```

### Add Central System Registry

Create a lightweight registry for major feature modules:

```js
systems.storage
systems.marketStall
systems.gazette
systems.delivery
systems.expansion
systems.buildingUpgrades
systems.landmarks
systems.neighbors
systems.club
systems.village
systems.expeditions
systems.events
```

This reduces hidden coupling.

### Add Unified Timer Rebase Utility

Many new systems need offline timers:

- market stall sales,
- delivery returns,
- boat departure,
- train arrival,
- neighbor help timers,
- construction timers,
- expedition timers,
- event refreshes.

Create one canonical timer utility:

```js
rebaseTimestampTimer(startedAt, durationMs, now)
getRemainingMs(endAt, now)
isTimerComplete(endAt, now)
advanceOfflineTimer(timer, now)
```

### Add Telemetry Events

Expand telemetry hooks before adding systems.

Track:

- storage_full_event
- barn_upgrade
- silo_upgrade
- market_listing_created
- market_listing_sold
- market_listing_expired
- truck_order_completed
- boat_crate_filled
- train_returned
- expansion_plot_unlocked
- obstacle_cleared
- building_upgraded
- mastery_star_earned
- landmark_stage_completed
- neighbor_help_requested
- neighbor_help_received
- club_milestone_claimed
- village_order_completed
- expedition_started
- expedition_node_cleared
- expedition_completed
- energy_spent
- energy_refilled

### Add Debug Tools

For development and balancing, add a debug panel only available in dev mode:

- add coins
- add XP
- add random goods
- add upgrade materials
- advance time by 1h / 6h / 24h
- reset daily
- force market refresh
- force boat arrival
- force train arrival
- unlock all land
- unlock all buildings
- simulate offline return

## 0.4 Acceptance Criteria

- Existing saves load safely.
- New missing fields get default values.
- Offline timers can be tested consistently.
- Dev tools allow rapid testing.
- New feature modules can be added without rewriting the whole game.

---

# PHASE 1 — Barn, Silo, Storage Pressure, and Upgrade Materials

## 1.1 Goal

Add the classic farming-game storage layer: the player must manage limited inventory capacity and upgrade storage over time.

## 1.2 Why This System Matters

Storage capacity is one of the most important friction systems in Hay Day-style games.

It creates meaningful decisions:

- Should I sell this item?
- Should I keep it for a future order?
- Should I use it in production?
- Should I upgrade my storage?
- Should I trade/sell excess crops?
- Should I buy missing materials?

Without storage pressure, farming games can become too flat because hoarding has no consequence.

## 1.3 Design

Add two main storage buildings:

### Silo

Stores raw agricultural goods:

- wheat
- corn
- carrot
- tomato
- pumpkin
- strawberry
- sugarcane
- lavender
- blueberry
- apples
- pears
- possibly future orchard crops

### Barn

Stores produced goods, animal goods, fish, tools, expansion materials, and special items:

- eggs
- milk
- wool
- bacon
- yogurt
- feathers
- bread
- flour
- butter
- cheese
- sugar
- jam
- honey
- candles
- smoothies
- fish
- bait
- fertilizer
- speed boosts
- quality ink
- priority tokens
- nails
- planks
- screws
- hinges
- paint
- deeds
- mallets
- stakes
- axes
- saws
- shovels
- pickaxes

## 1.4 Capacity Rules

Start with generous early capacity so the first session is not frustrating.

Example:

```text
Silo Level 1: 50 crop capacity
Barn Level 1: 40 item capacity
```

Storage should become relevant around level 5–7, not minute 1.

## 1.5 Upgrade Materials

Add upgrade materials as rare rewards:

### Barn Upgrade Materials

- Plank
- Nail
- Screw
- Hinge
- Paint Bucket

### Silo Upgrade Materials

- Wood Panel
- Metal Bolt
- Rope
- Tarpaulin

### Land Expansion Materials

- Land Deed
- Marker Stake
- Survey Map
- Mallet

### Clearing Tools

- Axe
- Saw
- Shovel
- Pickaxe

## 1.6 Sources of Upgrade Materials

Upgrade materials should come from:

- order rewards,
- treasure chests,
- daily rewards,
- weekly milestones,
- season pass,
- train returns,
- boat crates,
- market stall purchases,
- neighbor gifts,
- expedition nodes,
- pet dog discoveries,
- rare harvest drops,
- landmark project milestones.

## 1.7 UX Requirements

When inventory is full:

- show a clear, friendly message,
- highlight Barn/Silo upgrade option,
- offer ways to free space: sell, produce, complete order, upgrade storage,
- do not simply block the player with no explanation.

Add storage UI:

```text
Silo: 42 / 50
Barn: 37 / 40
```

Use warning colors or icons when over 85% full.

## 1.8 Risks

Storage pressure can become annoying. It must create decisions, not punishment.

Avoid:

- too little starting capacity,
- too many different upgrade materials too early,
- blocking basic actions constantly,
- making upgrade materials too rare,
- making players sell valuable items unintentionally.

## 1.9 Acceptance Criteria

- Player understands Silo vs Barn.
- Full storage state is clear.
- Upgrading storage feels rewarding.
- Upgrade materials create long-term goals.
- Early game remains smooth.
- Storage pressure increases gradually.

---

# PHASE 2 — Roadside Shop / Sunny Market Stall

## 2.1 Goal

Add a market stall where players can list items for sale and earn coins over time, creating the feeling of a living economy.

## 2.2 Why This System Matters

A roadside shop is one of the most important missing classic farming-game systems.

It gives the player:

- a reason to manage surplus inventory,
- a more interesting alternative to instant selling,
- social flavor even without multiplayer,
- offline reward anticipation,
- a place to use dynamic prices,
- a reason to produce high-value goods.

## 2.3 Core Design

Create a visible market stall near the road.

Player can:

- open stall UI,
- choose item from inventory,
- choose quantity,
- choose price within allowed range,
- list item in a stall slot,
- wait for simulated buyers,
- collect coins when sold.

## 2.4 Stall Slots

Start with 2 slots.

Unlock more via:

- player level,
- coin purchase,
- landmark upgrades,
- prestige perks,
- maybe special event rewards.

Example:

```text
Level 4: Market Stall unlocks with 2 slots
Level 8: Slot 3 available
Level 14: Slot 4 available
Level 20: Slot 5 available
```

## 2.5 Pricing

Allow the player to set price:

```text
Minimum: 70% of current market value
Recommended: 100% of current market value
Maximum: 150% of current market value
```

High-quality goods can sell for more.

Perfect-quality goods should show a premium label.

## 2.6 Simulated Buyer Logic

Without backend, use a fake async economy.

Each listed item gets a sale probability based on:

- price fairness,
- item rarity,
- current market demand,
- seasonality,
- active events,
- item quality,
- daily “hot item” modifiers,
- player reputation.

Example:

```js
saleChancePerMinute = baseDemand * priceFactor * qualityFactor * seasonFactor * eventFactor;
```

## 2.7 Buyer Flavor

When an item sells, show:

- “Emma bought 3 eggs.”
- “Finn bought 1 trout.”
- “Maple bought 2 bread.”
- “The Village Café bought 4 milk.”
- “A traveling chef bought your Perfect Cake!”

This adds emotional life.

## 2.8 Offline Behavior

When the player returns:

```text
While You Were Away:
- 2 market stall listings sold
- +340 coins earned
- Daisy left a thank-you note
```

## 2.9 Expansion: Reputation

Add a simple Market Reputation score:

- increases when items sell,
- increases with fair pricing,
- increases with high-quality goods,
- unlocks more buyers and faster sales,
- can give small bonuses.

## 2.10 Risks

Market Stall must not destroy the order system.

If stall selling is always better than orders, players will ignore orders.

Balance:

- orders give better XP and progression,
- stall gives flexible coin income,
- transport deliveries give rare materials,
- merchant gives bargain buying.

## 2.11 Acceptance Criteria

- Player can list items for sale.
- Items sell over time.
- Offline sales work.
- Selling feels social and rewarding.
- Orders remain valuable.
- Storage pressure and stall system work together.

---

# PHASE 3 — Sunny Gazette / Newspaper / Market Feed

## 3.1 Goal

Add a newspaper-style panel that unifies market news, item listings, visitor requests, event announcements, weather forecasts, and daily opportunities.

## 3.2 Why This System Matters

A gazette/newspaper is a perfect UI wrapper for many systems:

- market stall,
- simulated neighbor shops,
- daily merchant,
- weather forecast,
- seasonal price spikes,
- help requests,
- festival events,
- rare deals,
- expedition rumors,
- village news.

It makes the world feel alive.

## 3.3 Core Design

Create a `Sunny Gazette` button or physical mailbox/newspaper stand.

The Gazette contains pages/cards:

1. Market Deals
2. Neighbor Shops
3. Weather Forecast
4. Hot Item of the Day
5. Help Wanted
6. Festival News
7. Merchant Ad
8. Expansion Rumor
9. Special Delivery Notice
10. Expedition Teaser

## 3.4 Example Gazette Entries

```text
SUNNY GAZETTE
Today’s Forecast: Rainy
Carrots and wheat will grow faster today.

HOT MARKET:
Pumpkins +25% until midnight.

HELP WANTED:
Finn needs 2 bread for his fishing trip.
Reward: 120 coins + 1 worm bait.

NEIGHBOR SALE:
Emma’s Farm is selling 3 milk at a discount.

FESTIVAL NOTICE:
Baking Bonanza starts tomorrow.
Prepare flour, sugar, and eggs.
```

## 3.5 Integration with Dynamic Market

The Gazette should make dynamic market modifiers understandable.

Instead of hidden price changes, show:

- “Scarcity: Wool is in demand today.”
- “Autumn Festival: Pumpkins sell for more.”
- “Overstock Warning: Too many carrots in the region.”

## 3.6 Simulated Neighbor Shops

Generate daily NPC shop listings:

- small quantities,
- rotating prices,
- sometimes rare tools,
- sometimes bait,
- sometimes expansion materials,
- limited purchases per day.

Example neighbors:

- Emma’s Orchard
- Finn’s Dock
- Maple Bakery
- Daisy’s Ranch
- Bruno’s Depot
- Hazel’s Weather Stand

## 3.7 Acceptance Criteria

- Gazette gives useful daily information.
- Gazette reduces confusion about market/weather/events.
- Gazette creates reasons to check daily.
- Gazette adds world flavor without requiring complex story.

---

# PHASE 4 — Physical Delivery Systems

## 4.1 Goal

Expand the order system into multiple physical delivery channels, each with a distinct role.

## 4.2 Why This System Matters

Orders become much stronger when they feel physical and varied.

Instead of “complete abstract order,” the player should feel:

- I loaded the truck.
- I filled the boat crates.
- I sent the train away.
- I prepared a festival cart.
- I launched a special balloon delivery.

## 4.3 Delivery Types Overview

| System | Unlock | Role | Reward Type |
|---|---:|---|---|
| Truck Orders | Early | Fast small orders | Coins + XP |
| Boat Deliveries | Mid | Large crate-based deliveries | Coins + XP + rare materials |
| Train Deliveries | Mid/Late | Long return timer | Upgrade/expansion materials |
| Hot Air Balloon | Event/Special | Rare premium orders | High-value rewards |
| Festival Cart | Event | Themed weekly orders | Event points + special rewards |

---

## 4.4 Truck Orders

### Design

Truck Orders are the fast, familiar order system.

Player sees a delivery truck near the road.

Truck board shows 3–5 orders.

Each order:

- requests 1–3 item types,
- gives coins,
- gives XP,
- may give small bonus material,
- refreshes after completion or timer.

### UX

When completed:

- goods fly into truck,
- truck honks,
- truck drives off briefly,
- coins/XP fly to HUD,
- new order appears.

### Role

Truck orders are the main active progression loop.

---

## 4.5 Boat Deliveries

### Design

A boat arrives at the dock with crates.

Each boat has:

- 6–12 crates,
- each crate requests one item type and quantity,
- player fills crates over several hours,
- partial completion gives partial rewards,
- full completion gives bonus reward.

### Unlock

Recommended: Level 9–12, after production chains are established.

### Example

```text
River Boat: Harvest Moon
Departs in: 7h 42m
Crates:
- 4 Bread
- 3 Cheese
- 8 Corn
- 2 Jam
- 5 Eggs
- 1 Perfect Smoothie
Full Boat Bonus: 1 Land Deed + 500 coins + 90 XP
```

### Help Mechanic

Allow player to request help on 1–3 crates per boat.

In single-player mode, simulated neighbors can fill help crates after a delay.

### Role

Boat deliveries are medium-term planning goals.

They create “come back before departure” retention.

---

## 4.6 Train Deliveries

### Design

The train is a long-cycle logistics system.

Player loads train crates. When sent, train returns after a long timer with rare materials.

### Unlock

Recommended: Level 13–16.

### Train Role

Train should be the best source of:

- Barn materials,
- Silo materials,
- expansion materials,
- construction materials,
- rare decorations,
- expedition supplies.

### Example

```text
Sunny Valley Train
Load 5 crates and send the train.
Returns in 6 hours.
Possible returns:
- Plank
- Screw
- Land Deed
- Survey Map
- Axe
- Paint Bucket
```

### Upgrade Path

Train Station upgrades:

- more crates,
- faster return,
- better rare material odds,
- special route unlocks.

---

## 4.7 Hot Air Balloon

### Design

A rare premium delivery event.

A hot air balloon appears occasionally and requests valuable goods.

It offers:

- high coin payouts,
- rare decorations,
- weather cards,
- quality ink,
- special tokens.

### Role

Surprise/delight and optional high-value challenge.

### Example

```text
Balloon Visitor: The Sky Chef
Needs: 1 Cake, 2 Honey, 3 Strawberries
Reward: 850 coins + 1 Golden Sun weather card
Leaves in: 45 minutes
```

---

## 4.8 Festival Cart

### Design

During weekly events, a Festival Cart appears.

It requests themed goods.

Examples:

- Baking Bonanza: bread, flour, cookies, cake
- Orchard Week: apples, pears, juice, pie
- Ranchers Week: milk, eggs, wool, bacon
- Fishing Festival: fish, bait, fish recipes
- Craft Carnival: candles, perfume, cloth

### Role

Connects weekly events to physical production.

## 4.9 Acceptance Criteria

- Orders feel physical and varied.
- Each delivery system has a clear role.
- Rewards do not overlap too heavily.
- Delivery timers create healthy return motivation.
- The player can understand which delivery to prioritize.

---

# PHASE 5 — Land Expansion and Obstacle Clearing

## 5.1 Goal

Make the farm visibly grow over time by adding locked land plots, expansion materials, and obstacle clearing.

## 5.2 Why This System Matters

A farming game needs visible spatial progression.

The player should feel:

> “My farm started tiny, but now it is becoming a real place.”

## 5.3 Core Design

Divide the farm map into plots.

Some plots start unlocked. Others are locked.

Locked plots require:

- level requirement,
- coins,
- expansion materials,
- maybe a short clearing/construction timer.

Example:

```text
Unlock East Meadow
Requires:
- Level 7
- 1 Land Deed
- 2 Marker Stakes
- 1 Mallet
- 500 coins
```

## 5.4 Obstacle Types

Add removable obstacles:

- small rocks,
- large rocks,
- bushes,
- old logs,
- dead trees,
- brambles,
- stumps,
- abandoned crates,
- broken fences,
- muddy patches.

Each obstacle requires a tool:

| Obstacle | Tool |
|---|---|
| Bush | Axe |
| Dead Tree | Saw |
| Rock | Pickaxe |
| Mud Patch | Shovel |
| Old Crate | Crowbar / Hammer |
| Brambles | Gloves / Axe |

## 5.5 Obstacle Rewards

Clearing obstacles can drop:

- coins,
- XP,
- seeds,
- upgrade materials,
- bait,
- weather card fragments,
- treasure chests,
- decorative fragments,
- expedition clues.

## 5.6 Special Land Areas

Land expansion should not only give more empty tiles. It should reveal new possibilities.

Possible areas:

### East Meadow

- more crop space,
- flower decorations,
- better animal mood.

### Old Orchard

- more tree slots,
- fruit bonuses,
- orchard quests.

### River Bend

- fishing improvements,
- boat access,
- water decorations.

### Windy Hill

- Weather Tower site,
- wind-themed weather cards,
- production speed bonuses.

### Forest Edge

- expedition entrance,
- rare wood/tools,
- animal visitors.

### Market Road

- more market stall slots,
- truck upgrades,
- visitor frequency bonuses.

## 5.7 UX

Locked plots should show:

- beautiful fog/outline,
- required level,
- required materials,
- preview of what unlocks there,
- “coming soon” anticipation.

## 5.8 Acceptance Criteria

- The farm visibly expands over time.
- Expansion feels like a major milestone.
- Clearing obstacles is satisfying.
- Expansion materials have a clear use.
- New land unlocks meaningful new goals.

---

# PHASE 6 — Building Upgrades and Mastery Stars

## 6.1 Goal

Add long-term progression for production buildings.

## 6.2 Why This System Matters

Production buildings are central to the economy. If they never improve, mid-game progression can feel flat.

Building upgrades give players a reason to invest in their farm layout and production identity.

## 6.3 Building Upgrade Levels

Each production building should have levels.

Example:

```text
Bakery Level 1
- 2 queue slots
- base production speed
- basic recipes

Bakery Level 2
- +1 queue slot
- -5% production time
- unlocks Cookie

Bakery Level 3
- +1 queue slot
- +5% Good quality chance
- unlocks Cake

Bakery Level 4
- -10% production time
- improved visual appearance

Bakery Level 5
- +2% Perfect quality chance
- mastery badge
```

## 6.4 Upgrade Requirements

Building upgrades can require:

- coins,
- planks,
- screws,
- paint,
- crafted goods,
- specific mastery count,
- player level.

## 6.5 Visual Upgrade States

Buildings should look better after upgrades:

- more details,
- brighter trim,
- small flags,
- lights,
- smoke/steam,
- decorative props,
- larger sign.

Since Sunny Acres uses procedural rendering, upgrades can be represented procedurally:

- additional roof detail,
- glowing windows,
- animated chimney,
- extra barrels/crates,
- color accents,
- upgrade stars on sign.

## 6.6 Mastery Stars

Add usage-based mastery for each building.

Example:

```text
Bakery Mastery
Star 1: Produce 25 bakery items → -3% production time
Star 2: Produce 100 bakery items → +3% Good quality chance
Star 3: Produce 300 bakery items → +2% Perfect quality chance
```

Mastery should feel like “this building is becoming part of my farm’s identity.”

## 6.7 Integration with Specializations

Specializations can interact with building mastery:

- Artisan Producer gains mastery faster.
- Crop Baron gets crop-related recipe bonuses.
- Ranch Keeper gets dairy/animal recipe bonuses.
- Fisher Guild gets fishery bonuses.

## 6.8 Acceptance Criteria

- Production buildings have meaningful long-term progression.
- Upgrades feel visible and useful.
- Mastery rewards repeated use without feeling grindy.
- Building upgrades create new goals beyond simply buying new buildings.

---

# PHASE 7 — Large Landmark Construction Projects

## 7.1 Goal

Add multi-stage construction projects that create major farm milestones.

## 7.2 Why This System Matters

Large construction projects give the player a long-term purpose.

They are different from normal buildings because they feel like restoring or building something important in the world.

## 7.3 Core Design

Each landmark has multiple stages.

Each stage requires deliveries of goods/materials.

After each stage:

- visual construction progress updates,
- small reward is given,
- story/world flavor is shown,
- next stage unlocks.

When finished:

- landmark becomes functional,
- unlocks a new system or passive bonus,
- creates major celebration.

## 7.4 Proposed Landmarks

### Weather Tower

Purpose: Deepens Weather Mastery Grid.

Stages:

1. Clear old tower ruins.
2. Deliver wood, stone, and metal parts.
3. Craft weather instruments.
4. Install crystal/weather vane.
5. Activate tower.

Rewards:

- extra Weather Grid slot,
- better forecast accuracy,
- rare weather card crafting,
- new weather animations.

### Market Pier

Purpose: Unlocks Boat Deliveries and river trade.

Stages:

1. Repair dock planks.
2. Clear river debris.
3. Build crate platform.
4. Install market bell.
5. First boat arrives.

Rewards:

- boat deliveries,
- fish bonuses,
- river merchant.

### Old Bridge

Purpose: Unlocks new land / expedition area.

Stages:

1. Inspect bridge.
2. Deliver planks and ropes.
3. Clear brambles.
4. Reinforce with metal bolts.
5. Cross into Forest Edge.

Rewards:

- new land area,
- obstacle clearing area,
- expedition entrance.

### Village Bakery

Purpose: Adds village orders and recipe prestige.

Stages:

1. Clean abandoned bakery.
2. Deliver flour and wood.
3. Restore oven.
4. Supply first festival order.
5. Open village bakery.

Rewards:

- special bakery orders,
- recipe mastery bonuses,
- event access.

### Sunny Station

Purpose: Unlocks train delivery system.

Stages:

1. Clear old tracks.
2. Build platform.
3. Repair signal post.
4. Load test cargo.
5. Train service begins.

Rewards:

- train deliveries,
- rare material routes,
- station upgrades.

### Greenhouse

Purpose: Advanced crop/weather system.

Stages:

1. Clear broken glass.
2. Repair frame.
3. Add irrigation.
4. Install weather regulator.
5. Start greenhouse crops.

Rewards:

- off-season crop growing,
- rare flowers,
- crop quality bonuses,
- weather card synergy.

## 7.5 UX

Landmarks should appear as construction sites on the farm.

The player should see:

- current stage,
- required materials,
- progress bar,
- visual changes,
- final reward preview.

## 7.6 Acceptance Criteria

- Landmark projects create major long-term goals.
- Construction progress is visible.
- Each landmark unlocks meaningful gameplay.
- The world feels more alive and permanent.

---

# PHASE 8 — Neighbor Help and Simulated Social Economy

## 8.1 Goal

Create the feeling of social play even without real multiplayer.

## 8.2 Why This System Matters

Farming games thrive on neighbor interaction:

- visiting farms,
- buying goods,
- helping with orders,
- leaving gifts,
- requesting items,
- contributing to events.

Sunny Acres can simulate this first, then later evolve into real social features if needed.

## 8.3 Neighbor Profiles

Create recurring NPC neighbors:

| Neighbor | Role | Personality | Gameplay Function |
|---|---|---|---|
| Emma | Orchard farmer | Warm, practical | Fruit trades, crop tips |
| Finn | Fisherman | Calm, humorous | Fish requests, bait gifts |
| Daisy | Rancher | Animal lover | Animal goods, feed trades |
| Maple | Baker | Cheerful | Bakery orders |
| Bruno | Delivery driver | Energetic | Truck/transport guidance |
| Hazel | Weather expert | Wise, strange | Weather Grid/cards |
| Milo | Farm dog | Playful | Finds gifts |
| Nora | Carpenter | Direct | Upgrades, construction |
| Otto | Merchant | Opportunistic | Deals, rare materials |
| Lila | Festival organizer | Excited | Weekly events |

## 8.4 Help Requests

Neighbors can request goods:

```text
Emma needs 5 carrots.
Reward: 80 coins + 1 apple + friendship XP.
```

Help request types:

- item request,
- crate help,
- construction help,
- festival help,
- market trade,
- weather card request,
- bait/fishing request.

## 8.5 Asking for Help

Player can ask neighbors for help on:

- boat crates,
- train crates,
- landmark construction stages,
- missing upgrade material,
- urgent order.

Limit help requests per day to keep balance.

Example:

```text
Ask Neighbor for Help: 2 / 3 daily helps remaining
Emma may fill this crate in 20–40 minutes.
```

## 8.6 Friendship Levels

Each neighbor can have a friendship level.

Friendship increases when player:

- completes their requests,
- buys/sells from them,
- helps them during events,
- sends gifts.

Friendship unlocks:

- better rewards,
- discounts,
- special orders,
- decoration gifts,
- story snippets,
- unique weather cards,
- special recipes.

## 8.7 Visiting Simulated Neighbor Farms

Create simple static/procedural neighbor farm screens.

The player can:

- view a neighbor’s farm,
- collect one daily gift,
- buy from their stall,
- fulfill one help request,
- get inspiration.

This does not require real multiplayer.

## 8.8 Acceptance Criteria

- The game feels less lonely.
- Neighbor help adds useful utility.
- NPCs become recognizable.
- Social systems do not require backend.
- Daily return motivation improves.

---

# PHASE 9 — Farming Club / Co-op Simulation

## 9.1 Goal

Add a simulated group/community system that gives players weekly shared goals.

## 9.2 Why This System Matters

Guilds, co-ops, neighborhoods, and teams are important in farming games because they create belonging and recurring objectives.

Sunny Acres can start with a simulated club instead of real multiplayer.

## 9.3 Core Design

Player joins the `Sunny Acres Farming Club`.

The club has:

- weekly progress bar,
- club tasks,
- simulated member contributions,
- player contribution score,
- milestone rewards,
- club level,
- club theme each week.

## 9.4 Weekly Club Themes

Examples:

- Harvest Club Week
- Bakery Club Week
- Fishing Derby
- Ranch Roundup
- Orchard Fair
- Market Masters
- Weather Festival
- Construction Drive

## 9.5 Club Tasks

Examples:

```text
Harvest 100 crops
Complete 20 truck orders
Fill 12 boat crates
Produce 15 bakery items
Catch 10 fish
Clear 5 obstacles
Cast Weather Grid 3 times
Sell 20 items through Market Stall
```

## 9.6 Simulated Member Contributions

NPC club members contribute gradually.

The player sees:

- “Emma contributed 12 harvest points.”
- “Finn completed a fishing task.”
- “Daisy helped with animal goods.”

This creates community illusion.

## 9.7 Rewards

Club milestones give:

- coins,
- XP,
- upgrade materials,
- weather card fragments,
- decoration tokens,
- festival tickets,
- cosmetic club banners.

## 9.8 Future Real Multiplayer Path

Keep data model compatible with future backend.

Design club member entries as objects:

```js
{
  id,
  name,
  avatar,
  contributionPoints,
  isSimulated,
  lastContributionAt
}
```

Later, real players can replace simulated members.

## 9.9 Acceptance Criteria

- Weekly club goals feel meaningful.
- Simulated community feels alive enough.
- Player gets shared-progress motivation.
- No backend is required initially.

---

# PHASE 10 — Village / Town Area

## 10.1 Goal

Add a small village/town hub around the farm to provide context, characters, special orders, and long-term world expansion.

## 10.2 Why This System Matters

Many farming games become stronger when the farm is connected to a larger place.

A village gives meaning to:

- customers,
- market prices,
- orders,
- festivals,
- construction projects,
- characters,
- landmarks,
- story snippets.

## 10.3 Scope Control

Do not turn Sunny Acres into a full Township clone.

The village should start as a lightweight hub, not a massive city-building system.

## 10.4 Village Areas

Possible village nodes:

### Village Square

- daily notice board,
- festival events,
- visitor requests.

### Bakery Corner

- special bakery orders,
- recipe challenges,
- Maple’s requests.

### Fisherman’s Dock

- fishing quests,
- bait shop,
- boat deliveries.

### Weather Tower

- Weather Grid upgrades,
- forecasts,
- rare cards.

### Carpenter’s Yard

- building upgrades,
- land expansion tools,
- construction projects.

### Market Street

- Sunny Gazette,
- market stall upgrades,
- NPC shop listings.

### Train Station

- train deliveries,
- rare material routes.

### Animal Fairground

- animal mood contests,
- ranch events,
- special feed.

## 10.5 Village Reputation

Add a simple Village Reputation stat.

Reputation increases through:

- completing village orders,
- helping neighbors,
- finishing landmark projects,
- contributing to festivals,
- completing weekly club goals.

Reputation unlocks:

- new village nodes,
- better order rewards,
- decorations,
- market discounts,
- character stories.

## 10.6 UI

Village can be accessed via:

- map button,
- road sign,
- delivery truck route,
- town gate.

Keep it visually simple.

## 10.7 Acceptance Criteria

- Village gives the farm world context.
- Characters feel more grounded.
- Orders feel more meaningful.
- Village remains lightweight and not overwhelming.

---

# PHASE 11 — Event Islands and Expeditions

## 11.1 Goal

Add occasional exploration/event maps that use farm goods and tools to unlock rewards.

## 11.2 Why This System Matters

Games like Family Island and Klondike Adventures use expedition areas to add variety, story, and event excitement.

Sunny Acres can borrow this carefully without ruining the cozy farm loop.

## 11.3 Scope Principle

Expeditions should be optional side content.

They should not replace farming. They should consume farm-produced goods and reward rare materials, decorations, weather cards, and story moments.

## 11.4 Expedition Map Types

### Forest Clearing

Theme: clearing brambles, logs, and hidden crates.

Rewards:

- wood,
- axes,
- seeds,
- decorations,
- weather fragments.

### Old Orchard

Theme: restoring abandoned fruit trees.

Rewards:

- rare fruit,
- orchard decorations,
- tree boosters,
- apple/pear bonuses.

### Misty Lake

Theme: fishing and water exploration.

Rewards:

- bait,
- rare fish,
- fishing decorations,
- boat upgrades.

### Storm Valley

Theme: weather mastery challenge.

Rewards:

- rare weather cards,
- Weather Tower parts,
- storm-themed decorations.

### Festival Island

Theme: limited-time event map.

Rewards:

- festival tokens,
- unique decorations,
- season pass points,
- special recipes.

### Abandoned Greenhouse

Theme: repair and unlock rare crops.

Rewards:

- greenhouse parts,
- rare seeds,
- off-season crop ability.

## 11.5 Node-Based Exploration

Use a node map, not a fully complex RPG map.

Each node can require:

- energy,
- tools,
- goods,
- coins,
- weather cards,
- previous node completion.

Node types:

- clear obstacle,
- open chest,
- repair bridge,
- gather resource,
- talk to character,
- complete mini-order,
- solve weather puzzle,
- fish spot,
- harvest special plant.

## 11.6 Expedition Rewards

Rewards can include:

- expansion materials,
- building materials,
- rare decorations,
- weather card fragments,
- unique recipes,
- character friendship,
- club points,
- event currency,
- XP/coins.

## 11.7 Acceptance Criteria

- Expeditions add variety.
- Expeditions use existing farm economy.
- Expeditions do not overwhelm the core farm loop.
- Event islands create periodic excitement.

---

# PHASE 12 — Expedition Energy, Tools, and Map Progression

## 12.1 Goal

Add an energy system only for expeditions/clearing, not for ordinary farming.

## 12.2 Why This System Needs Care

Energy systems can feel predatory or frustrating if they block the core game.

Sunny Acres should remain cozy. Therefore:

- no energy cost for basic farming,
- no energy cost for harvesting normal crops,
- no energy cost for feeding animals,
- no energy cost for production,
- no energy cost for normal orders.

Energy should only apply to optional expedition/clearing actions.

## 12.3 Energy Design

Example:

```text
Max Energy: 50
Regen: 1 energy every 3 minutes
Daily bonus: +25 energy
Food items can restore small energy amounts
```

## 12.4 Energy Sources

Energy can come from:

- natural regeneration,
- daily rewards,
- festival rewards,
- food items,
- neighbor gifts,
- season pass,
- milestone chests,
- sleep/overnight bonus,
- weather card effects.

## 12.5 Expedition Tools

Add special expedition tools:

- axe,
- saw,
- pickaxe,
- shovel,
- rope,
- lantern,
- gloves,
- compass,
- weather charm.

Tools can be earned from:

- train deliveries,
- treasure chests,
- market purchases,
- club rewards,
- expedition nodes,
- daily/weekly rewards.

## 12.6 Food as Energy Items

Produced goods can have expedition use.

Example:

- Bread restores 3 energy.
- Smoothie restores 6 energy.
- Pie restores 10 energy.
- Honey restores 4 energy.

But be careful: this must not distort the normal economy too much.

## 12.7 Acceptance Criteria

- Energy only affects optional exploration.
- Core farming remains free and cozy.
- Energy creates pacing for expeditions.
- Food goods gain additional use.

---

# PHASE 13 — Advanced Decoration, Beautification, Contests, and Photo Layer

## 13.1 Goal

Make decoration more meaningful, expressive, and long-term.

## 13.2 Why This System Matters

In farming games, decoration is not just cosmetic. It gives players ownership.

Players return because the farm becomes “mine.”

## 13.3 Decoration Categories

Expand decoration categories:

- paths,
- fences,
- flower beds,
- lamps,
- benches,
- fountains,
- gazebos,
- statues,
- seasonal decorations,
- animal decorations,
- water decorations,
- orchard decorations,
- weather-themed decorations,
- festival decorations,
- prestige decorations.

## 13.4 Functional Decoration Bonuses

Keep bonuses modest.

Examples:

- decorations near animal pens improve mood,
- scarecrows reduce crow events,
- lamps increase night market visitor chance,
- fountains improve beauty score,
- wind chimes slightly improve Weather Grid duration,
- flower beds slightly improve bee/honey output,
- paths improve visitor tip chance.

Avoid making decoration mandatory for power players.

## 13.5 Farm Beauty Score 2.0

Current beautification gives yield bonuses. Expand with tiers:

```text
Beauty Level 1: Cozy Plot
Beauty Level 2: Charming Farm
Beauty Level 3: Sunny Homestead
Beauty Level 4: Village Favorite
Beauty Level 5: Legendary Acres
```

Rewards:

- small global bonuses,
- visitor tips,
- market reputation,
- photo frame cosmetics,
- special decorations.

## 13.6 Decoration Sets

Add sets:

- Spring Bloom Set
- Summer Picnic Set
- Autumn Harvest Set
- Winter Lantern Set
- Fisherman’s Dock Set
- Weather Mage Set
- Bakery Festival Set
- Ranch Comfort Set
- Forest Expedition Set

Completing a set gives a small bonus or cosmetic badge.

## 13.7 Beauty Contests

Weekly simulated contest:

```text
Sunny Acres Beauty Contest
Theme: Autumn Orchard
Place orchard decorations and harvest fruit to earn points.
```

Rewards:

- decorations,
- coins,
- XP,
- season pass points,
- special titles.

## 13.8 Photo / Share Layer

Add an in-game photo mode:

- hide UI,
- center camera,
- frame farm,
- add logo/watermark optionally,
- export screenshot if feasible,
- share prompt.

For browser games, this can be useful for marketing and player pride.

## 13.9 Acceptance Criteria

- Decoration becomes a long-term motivator.
- Farm identity becomes stronger.
- Bonuses are useful but not oppressive.
- Visual ownership increases.

---

# PHASE 14 — Live-Ops Calendar and Seasonal Event Framework

## 14.1 Goal

Create a reusable framework for recurring events.

## 14.2 Why This System Matters

A farming game lives through repeated reasons to return.

A structured event framework allows Sunny Acres to rotate content without hardcoding everything.

## 14.3 Event Categories

### Weekly Production Events

- Baking Bonanza
- Fishing Festival
- Orchard Week
- Ranchers Week
- Harvest Hustle
- Craft Carnival
- Weather Festival
- Market Madness

### Seasonal Events

- Spring Bloom Festival
- Summer Fair
- Autumn Harvest Fair
- Winter Lantern Festival

### Limited-Time Expeditions

- Misty Lake Weekend
- Storm Valley Challenge
- Old Orchard Restoration
- Festival Island

### Market Events

- Double Coin Hour
- Hot Item Week
- Perfect Quality Bonus
- Visitor Rush

### Community/Club Events

- Club Harvest Drive
- Village Construction Week
- Sunny Co-op Fair

## 14.4 Event Data Model

Create data-driven events:

```js
{
  id: 'baking_bonanza',
  name: 'Baking Bonanza',
  startAt,
  endAt,
  pointRules: [
    { action: 'produce', itemCategory: 'bakery', points: 3 },
    { action: 'completeOrder', containsCategory: 'bakery', points: 10 }
  ],
  rewards: [...],
  visualTheme: 'bakery',
  modifiers: {...}
}
```

## 14.5 Event UI

Event panel should show:

- event name,
- remaining time,
- how to earn points,
- reward ladder,
- current progress,
- special shop if applicable.

## 14.6 Event Shop

Use event tokens to buy:

- decorations,
- upgrade materials,
- weather card fragments,
- energy,
- bait,
- cosmetics.

## 14.7 Acceptance Criteria

- Events are data-driven.
- Events can be reused and rotated.
- Players understand event goals.
- Events connect to existing systems.

---

# PHASE 15 — Additional Systems Worth Considering

The user asked to implement everything listed and more if useful. The following are additional systems that can strengthen Sunny Acres if implemented carefully.

---

## 15.1 Recipe Book and Cooking Requests

### Goal

Make production chains more readable and satisfying.

### Design

Add a recipe book with:

- all recipes,
- ingredients,
- unlock level,
- production building,
- base value,
- quality odds,
- mastery status,
- where item is used.

### Why

As production chains grow, players need clarity.

---

## 15.2 Tool Shed

### Goal

Separate tools from Barn storage or give them their own management layer.

### Design

Tools:

- axe,
- saw,
- shovel,
- pickaxe,
- hammer,
- rope,
- paint brush,
- watering can.

Tool Shed can be upgraded to store more tools or improve clearing speed.

---

## 15.3 Greenhouse / Off-Season Farming

### Goal

Make seasons more strategic.

### Design

Greenhouse allows limited off-season crop growing.

Rules:

- small number of greenhouse slots,
- grow any crop regardless of season,
- better quality chance,
- uses compost/fertilizer,
- interacts with Weather Grid.

---

## 15.4 Compost System

### Goal

Add a use for surplus crops and withered crops.

### Design

Player can compost:

- low-value crops,
- withered crops,
- excess fruit,
- plant waste.

Compost becomes:

- fertility boost,
- greenhouse fuel,
- special crop quality enhancer.

---

## 15.5 Seed Breeding / Crop Variants

### Goal

Add late-game crop depth.

### Design

Rare crop variants:

- Golden Wheat
- Sweet Corn
- Giant Pumpkin
- Frost Lavender
- Blue Moon Berry

Unlock via:

- mastery,
- weather events,
- greenhouse,
- expedition discoveries,
- seasonal festivals.

Keep this late-game only.

---

## 15.6 Animal Breeds and Animal Care

### Goal

Add personality and long-term progression to animals.

### Design

Animal pens can contain different breeds:

- basic chicken,
- speckled chicken,
- golden hen,
- jersey cow,
- alpine goat,
- merino sheep.

Breeds can affect:

- production speed,
- yield,
- quality chance,
- mood sensitivity,
- special products.

Add light care actions:

- brush,
- pet,
- clean pen,
- decorate pen.

Do not make this too demanding.

---

## 15.7 Visitor System 2.0

### Goal

Make visitors more visible and useful.

### Design

Visitors walk onto the farm and request goods.

Visitor types:

- hungry child wants cookie,
- chef wants perfect goods,
- merchant wants bulk crops,
- tourist wants decoration photo,
- fisherman wants bait,
- carpenter wants planks.

Visitors can:

- buy goods,
- give tips,
- trigger events,
- leave reviews,
- increase village reputation.

---

## 15.8 Farm Rating / Reputation

### Goal

Create a broad long-term status measure.

### Design

Farm Reputation combines:

- order completion,
- market sales,
- beauty score,
- visitor happiness,
- village help,
- club contribution,
- event participation.

Reputation tiers:

- Unknown Farm
- Local Favorite
- Sunny Supplier
- Village Hero
- Legendary Acres

Rewards:

- more visitors,
- better prices,
- special orders,
- cosmetic banners.

---

## 15.9 Weather Card Collection and Fusion

### Goal

Deepen the signature Weather Grid system.

### Design

Players collect card fragments and combine them.

Card levels:

- Level 1: basic effect
- Level 2: stronger effect
- Level 3: added secondary effect
- Level 4: visual upgrade
- Level 5: mastery bonus

Fusion examples:

- Gentle Rain + Fertile Soil = Bloom Shower
- Golden Sun + Market Wind = Harvest Sale
- Animal Harmony + Clear Skies = Pasture Blessing
- Fisher’s Moon + Mist = Rare Catch Night

Keep fusion simple and understandable.

---

## 15.10 Weather Forecast Planning

### Goal

Make tomorrow’s weather matter.

### Design

Show forecast for next 2–3 in-game days.

Player can plan:

- plant crops that benefit from rain,
- protect animals from storm/snow,
- use cards at right time,
- prepare market goods for seasonal price shifts.

Add forecast accuracy upgrades through Weather Tower.

---

## 15.11 Farm Layout Planner

### Goal

Help players organize farms as they grow.

### Design

Add layout edit mode:

- move buildings/decorations freely,
- grid overlay,
- rotate decorations if supported,
- highlight adjacency bonuses,
- show animal mood radius,
- show scarecrow radius,
- show beauty coverage.

This is important as the farm becomes larger.

---

## 15.12 Bulk Actions and Quality-of-Life Upgrades

### Goal

Reduce late-game repetition.

### Design

Unlockable QOL features:

- plant same crop across multiple plowed tiles,
- harvest all ready crops in selected area,
- collect all animal products,
- refill feed pens,
- repeat last production job,
- claim all completed productions,
- sell selected surplus.

Unlock these gradually through level, landmarks, or prestige.

---

## 15.13 Assistants / Farm Helpers

### Goal

Give late-game automation without removing gameplay.

### Design

NPC helpers can be assigned to limited tasks:

- collect animal products,
- restock production queue,
- water crops,
- sell market stall goods,
- gather from trees,
- collect finished goods.

Helpers require:

- coins,
- food,
- friendship,
- limited duration.

This should be a late-game comfort feature.

---

## 15.14 Farm Journal / Story Album

### Goal

Create emotional memory and progression history.

### Design

Journal tracks:

- first harvest,
- first chicken,
- first boat completed,
- first weather card cast,
- first landmark restored,
- first festival won,
- before/after farm snapshots,
- character notes.

This makes the player’s journey feel personal.

---

## 15.15 Museum / Collection Hall

### Goal

Give collections a physical home.

### Design

Build a Collection Hall or Farm Museum.

Displays:

- crops discovered,
- fish caught,
- recipes mastered,
- trees grown,
- weather cards collected,
- decorations earned,
- animal breeds found.

Completing displays gives passive bonuses.

---

## 15.16 Seasonal Crop Rotation and Soil Exhaustion

### Goal

Add strategic farming depth, but only if not too punishing.

### Design

Soil fertility already exists. Expand gently:

- repeated same crop reduces fertility faster,
- rotating crop families restores balance,
- compost/fertilizer helps,
- weather cards mitigate.

This should be optional optimization, not a harsh requirement.

---

## 15.17 Market Contracts

### Goal

Add medium-term production goals.

### Design

Contracts request a batch of goods over 24–72 hours.

Example:

```text
Village Café Contract
Deliver within 48h:
- 12 Bread
- 8 Milk
- 5 Jam
Reward: 2,000 coins + 1 Paint Bucket + 200 XP
```

Contracts are bigger than orders but smaller than landmark projects.

---

## 15.18 Seasonal Recipe Variants

### Goal

Make seasons feel special.

### Design

Limited-time recipes:

- Pumpkin Pie
- Winter Cocoa
- Summer Berry Smoothie
- Spring Honey Tart
- Autumn Apple Jam
- Snowberry Candle

Seasonal recipes feed into events, orders, and collections.

---

## 15.19 Weather Hazards and Preparation

### Goal

Give weather more gameplay meaning.

### Design

Hazards should be mild, readable, and preventable:

- storm lowers animal mood,
- snow slows crops,
- heat drains moisture,
- wind speeds windmill but may affect fishing,
- frost risks delicate crops unless protected.

Preparation tools:

- barn heater,
- crop covers,
- irrigation,
- storm charm,
- shelter decorations,
- weather cards.

Avoid making weather feel unfair.

---

## 15.20 Friend Codes / Future Real Social Layer

### Goal

Prepare for optional real social features later.

### Design

Even if backend is not implemented now, design systems so they can support:

- friend code,
- visiting real farms,
- buying from real stalls,
- helping crates,
- gifting once per day,
- club membership,
- leaderboards.

Single-player simulated versions should use similar interfaces.

---

# 16. UX Roadmap

## 16.1 System Unlock Pacing

Do not show every system immediately.

Recommended unlock rhythm:

```text
Level 1: Crops, plow, harvest, first order
Level 2: Feed Mill
Level 3: Chickens, fishing dock preview
Level 4: Market Stall, apple tree, pet dog
Level 5: Weather Mastery Grid, specialization primary
Level 6: Barn/Silo upgrade introduction
Level 7: Land expansion introduction
Level 8: Building upgrades
Level 9: Boat delivery preview
Level 10: First landmark construction
Level 12: Boat deliveries fully active
Level 13: Train station construction
Level 15: Secondary specialization, club system
Level 16: Train deliveries
Level 18: Village hub expansion
Level 20: Expeditions
Level 25: Greenhouse
Level 30: Advanced mastery/prestige loop
```

## 16.2 Panel Priority

Avoid too many HUD buttons.

Group systems logically:

- Farm tasks
- Orders/deliveries
- Market/Gazette
- Weather
- Social/Village
- Events
- Inventory/storage
- Build/decorate

## 16.3 Next Best Action System

As complexity grows, a “next best action” helper becomes essential.

It should recommend:

- plant needed crop,
- harvest ready crop,
- finish order,
- upgrade storage,
- fill boat crate,
- clear land,
- cast weather card,
- check Gazette,
- collect market coins,
- send train.

## 16.4 Notification Style

Use gentle, cozy reminders:

- “The boat is almost ready to leave.”
- “Your market stall sold two items.”
- “Rain is coming tomorrow.”
- “You have enough materials to upgrade the Barn.”
- “The East Meadow can now be unlocked.”

Avoid aggressive pressure.

---

# 17. Economy Roadmap

## 17.1 Currencies

Keep currencies limited.

Recommended:

- Coins: main currency
- XP: progression
- Talent: prestige currency
- Event Tokens: temporary event currency
- Weather Fragments: card upgrade currency
- Energy: expeditions only

Avoid adding too many permanent currencies.

## 17.2 Reward Roles

Each reward source should have a role:

| Source | Primary Reward |
|---|---|
| Crops | raw goods, XP |
| Animals | animal goods |
| Production | high-value goods |
| Orders | coins + XP |
| Market Stall | flexible coins |
| Truck | active progression |
| Boat | large rewards + rare materials |
| Train | upgrade/expansion materials |
| Expeditions | rare items + decorations |
| Events | tokens + special rewards |
| Club | milestone rewards |
| Land clearing | materials + surprises |
| Landmark projects | feature unlocks |
| Prestige | permanent meta bonuses |

## 17.3 Balance Rule

No one system should be universally best.

- Market Stall should not make orders irrelevant.
- Orders should not make market irrelevant.
- Boat should not replace truck.
- Train should not replace treasure chests.
- Energy should not block core game.
- Prestige should not trivialize progression.

---

# 18. Data Model Suggestions

These are suggested system objects. Actual implementation should adapt to the existing codebase.

## 18.1 Storage

```js
storage: {
  barn: {
    level: 1,
    capacity: 40,
    upgradeRequirements: {...}
  },
  silo: {
    level: 1,
    capacity: 50,
    upgradeRequirements: {...}
  }
}
```

## 18.2 Market Stall

```js
marketStall: {
  level: 1,
  reputation: 0,
  slots: [
    {
      id,
      itemId,
      quantity,
      pricePerUnit,
      listedAt,
      soldAt: null,
      buyerId: null,
      status: 'listed'
    }
  ]
}
```

## 18.3 Gazette

```js
gazette: {
  currentIssueDate,
  articles: [
    { type: 'weather', title, body, data },
    { type: 'market_hot_item', itemId, modifier },
    { type: 'neighbor_sale', neighborId, itemId, price },
    { type: 'help_request', neighborId, requestId }
  ]
}
```

## 18.4 Delivery

```js
deliveries: {
  truck: { orders: [...] },
  boat: {
    activeBoatId,
    arrivesAt,
    departsAt,
    crates: [...],
    helpRequestsUsed: 0
  },
  train: {
    status: 'idle' | 'loading' | 'away' | 'returned',
    returnsAt,
    crates: [...],
    routeId
  },
  balloon: {
    active: false,
    leavesAt,
    request
  }
}
```

## 18.5 Expansion

```js
expansion: {
  plots: {
    east_meadow_1: {
      status: 'locked' | 'unlockable' | 'clearing' | 'unlocked',
      unlockRequirements,
      obstacles: [...],
      unlocks: [...]
    }
  }
}
```

## 18.6 Building Upgrades

```js
buildingProgression: {
  bakery: {
    level: 1,
    masteryCount: 0,
    masteryStars: 0,
    upgradeInProgress: null
  }
}
```

## 18.7 Landmark Projects

```js
landmarks: {
  weatherTower: {
    stage: 1,
    completed: false,
    stageRequirements: [...],
    contributedItems: {...}
  }
}
```

## 18.8 Neighbors

```js
neighbors: {
  emma: {
    friendshipLevel: 1,
    friendshipXp: 0,
    dailyGiftClaimed: false,
    activeRequest: null,
    shopListings: []
  }
}
```

## 18.9 Club

```js
club: {
  level: 1,
  weeklyTheme: 'harvest_week',
  playerContribution: 0,
  totalContribution: 0,
  milestonesClaimed: [],
  members: [...]
}
```

## 18.10 Expeditions

```js
expeditions: {
  energy: {
    current: 50,
    max: 50,
    lastRegenAt
  },
  activeMap: {
    id,
    nodes: {...},
    progress,
    expiresAt
  }
}
```

---

# 19. Technical Risk Register

## 19.1 Save Complexity

Risk: Save data becomes too large or fragile.

Mitigation:

- version migrations,
- default constructors,
- subsystem reset fallbacks,
- robust load validation.

## 19.2 UI Overload

Risk: Too many systems create too many buttons/panels.

Mitigation:

- level gating,
- grouped navigation,
- next best action helper,
- progressive tutorial.

## 19.3 Economy Collapse

Risk: Rewards become too generous or too stingy.

Mitigation:

- telemetry,
- debug simulation,
- balance spreadsheet/data table,
- economy roles per system.

## 19.4 Performance

Risk: More animations, panels, timers, maps, and simulations hurt browser performance.

Mitigation:

- cached procedural sprites,
- limited particles,
- batched UI updates,
- no per-frame heavy calculations for inactive systems,
- timer-based updates for market/social systems.

## 19.5 Feature Bloat

Risk: The game becomes big but confusing.

Mitigation:

- implement in phases,
- test fresh-player experience after every phase,
- remove/merge redundant systems,
- prioritize clarity over quantity.

---

# 20. Quality Assurance Checklist

After each phase, test:

## 20.1 Fresh Save

- Can a new player understand the loop?
- Are new systems hidden until relevant?
- Does onboarding still work?

## 20.2 Mid-Game Save

- Does the player have too many goals?
- Is inventory manageable?
- Are rewards balanced?
- Are delivery timers understandable?

## 20.3 Offline Return

- Did crops rebase correctly?
- Did production finish correctly?
- Did market stall sales process correctly?
- Did boat/train timers update correctly?
- Did neighbor help resolve correctly?
- Did expedition energy regenerate correctly?

## 20.4 Save/Load

- Save loads after refresh.
- Old saves migrate.
- Missing fields get defaults.
- Corrupt subsystem data does not kill the whole save.

## 20.5 Economy

- Coins do not explode too early.
- Storage pressure is present but not punishing.
- Upgrade materials are rare but not impossible.
- Orders remain useful.
- Market Stall remains useful.
- Train/boat rewards feel worth it.

## 20.6 UX

- Player understands what each new system does.
- Buttons are not overwhelming.
- Notifications are helpful.
- Important timers are visible.
- Next goals are clear.

## 20.7 Performance

- Stable FPS on desktop.
- Stable FPS on mobile browser if relevant.
- No excessive memory growth.
- No runaway timers.
- No massive save bloat.

---

# 21. Final Prioritized Feature List

This is the full list of major additions recommended in this roadmap.

## Must-Have Expansion Systems

1. Barn and Silo capacity
2. Upgrade materials
3. Roadside Shop / Sunny Market Stall
4. Sunny Gazette / newspaper feed
5. Truck orders as physical deliveries
6. Boat deliveries with crates
7. Train deliveries for rare materials
8. Hot Air Balloon special deliveries
9. Festival Cart event orders
10. Land expansion
11. Obstacle clearing
12. Building upgrades
13. Building mastery stars
14. Landmark construction projects
15. Neighbor help
16. Simulated neighbor shops
17. Friendship levels
18. Farming Club / co-op simulation
19. Village / town hub
20. Event islands / expeditions
21. Expedition energy only for optional exploration
22. Advanced decoration and beauty contests
23. Seasonal/live-ops event framework

## Strong Optional Systems

24. Recipe book
25. Tool Shed
26. Greenhouse
27. Compost
28. Seed breeding / crop variants
29. Animal breeds
30. Visitor system 2.0
31. Farm reputation
32. Weather card collection/fusion
33. Weather forecast planning
34. Farm layout planner
35. Bulk actions / QOL unlocks
36. Farm helpers
37. Farm journal
38. Museum / collection hall
39. Crop rotation depth
40. Market contracts
41. Seasonal recipe variants
42. Weather hazards/preparation
43. Future friend-code architecture

---

# 22. Recommended Immediate Next Implementation Prompt

If giving this roadmap to a coding agent, start with this instruction:

```text
Read roadmap.md carefully.
Do not implement the entire roadmap in one pass.
Start with Phase 0 and Phase 1 only:
- save migration safety,
- storage model,
- Barn/Silo capacity,
- upgrade materials,
- basic UI for storage,
- inventory-full behavior,
- reward sources for materials,
- telemetry hooks.

Keep the implementation modular and save-compatible.
Do not rewrite unrelated systems.
After completing Phase 0 and Phase 1, provide a summary of files changed, save migration notes, balancing assumptions, and recommended next phase.
```

After that:

```text
Implement Phase 2 and Phase 3:
- Sunny Market Stall,
- simulated buyers,
- offline stall sales,
- market reputation,
- Sunny Gazette with weather, market news, neighbor listings, help requests, and event notices.
```

Then continue phase by phase.

---

# 23. Final Product Vision

Sunny Acres should become a browser farming game where the player starts with a small plot and gradually builds a beautiful, productive, living farm connected to a warm village economy.

The long-term game should feel like:

- a cozy farming loop,
- a satisfying production-chain optimizer,
- a gentle idle/return game,
- a light social/neighbor simulation,
- a seasonal market strategy game,
- and a unique weather-mastery farming experience.

The final player fantasy:

> “I built this farm. I know my crops, animals, customers, neighbors, weather patterns, market cycles, and production chains. Tomorrow there will be new deliveries, new weather, new market opportunities, and something good waiting for me.”

That is the direction Sunny Acres should grow toward.

---

# 24. Implementation Checklist

Status legend: ✅ implemented, 🟡 partial, ⬜ missing.

## Phase 0 — Technical Foundation
- [x] ✅ Save versioning (`saveVersion = 4`, `migrateSave`) — `src/save.ts`
- [x] ✅ Default constructors per subsystem (`initX()` pattern) — every system file
- [x] ✅ Unified timer rebase utility — `src/systems/timer.ts`
- [x] ✅ Telemetry events — `src/systems/telemetry.ts`
- [x] ✅ Central system registry (init wiring) — `src/main.ts`
- [x] ✅ Debug tools — `src/systems/debug.ts` (dev panel: skip time, grant coins/XP/materials, unlock all)

## Phase 1 — Storage Pressure
- [x] ✅ Barn (raw goods → silo, produced → barn) — `src/systems/storage.ts`
- [x] ✅ Silo separation, level caps, warn levels — `src/systems/storage.ts`
- [x] ✅ Upgrade materials defined (plank/nail/screw/hinge/paint/panel/bolt/rope/tarp/deed/stake/map/mallet) — `src/data/items.ts`
- [x] ✅ Material sources (orders, train, boat, gazette, treasures, daily, weekly, prestige) — multiple systems
- [x] ✅ Full-storage UX (toast, panel warning) — `src/systems/storage.ts`, `src/ui/inventory-panel.ts`

## Phase 2 — Roadside Shop / Sunny Market Stall
- [x] ✅ Stall slots (2..5 by level) — `src/systems/market-stall.ts`
- [x] ✅ Pricing band (70%/100%/150%) — `src/systems/market-stall.ts`
- [x] ✅ Simulated buyer probabilities — `src/systems/market-stall.ts`
- [x] ✅ Offline sales rebase — `src/systems/market-stall.ts` (`rebaseStallOnLoad`)
- [x] ✅ Buyer flavor / villager pick — `src/systems/market-stall.ts`
- [x] ✅ Market reputation (0..1000 tiered) — `src/systems/market-stall.ts`

## Phase 3 — Sunny Gazette
- [x] ✅ Forecast article — `src/systems/gazette.ts`
- [x] ✅ Hot item with bonus — `src/systems/gazette.ts`
- [x] ✅ Neighbor sale offers — `src/systems/gazette.ts`
- [x] ✅ Help requests — `src/systems/gazette.ts`
- [x] ✅ Event notice + Tip — `src/systems/gazette.ts`
- [x] ✅ Daily rollover — `src/systems/gazette.ts`

## Phase 4 — Physical Delivery Systems
- [x] ✅ Truck orders (villagers, deliveries) — `src/systems/orders.ts`
- [x] ✅ Boat deliveries (crate fill, bonus material, departure timer) — `src/systems/boat.ts`
- [x] ✅ Train deliveries (loaded crates, route, return rewards, station upgrades) — `src/systems/train.ts`
- [x] ✅ Hot Air Balloon (rare premium delivery, leaves timer) — `src/systems/balloon.ts`
- [x] ✅ Festival Cart (weekly themed cart, points integration) — `src/systems/festival-cart.ts`

## Phase 5 — Land Expansion & Obstacle Clearing
- [x] ✅ Plot system (locked → unlockable → clearing → unlocked) — `src/systems/expansion.ts`
- [x] ✅ Obstacle types (rocks, bushes, logs, mud, brambles, stumps) — `src/systems/expansion.ts`
- [x] ✅ Clearing tools (axe, saw, pickaxe, shovel) — `src/data/items.ts`, `src/systems/expansion.ts`
- [x] ✅ Obstacle rewards (coins, XP, materials, treasures) — `src/systems/expansion.ts`
- [x] ✅ Special areas (East Meadow, Old Orchard, River Bend, Windy Hill, Forest Edge) — `src/systems/expansion.ts`
- [x] ✅ Land-expansion materials integrated (deed, stake, map, mallet) — `src/systems/expansion.ts`

## Phase 6 — Building Upgrades & Mastery Stars
- [x] ✅ Mastery counter per building type — `src/systems/building-mastery.ts`
- [x] ✅ Star thresholds (25 / 100 / 300) — `src/systems/building-mastery.ts`
- [x] ✅ Mastery speed + quality buffs — `src/systems/building-mastery.ts`
- [x] ✅ Per-building level upgrades (capacity / queue slots / speed) — `src/systems/building-upgrades.ts`

## Phase 7 — Landmark Construction
- [x] ✅ Multi-stage projects (Weather Tower, Market Pier, Sunny Station, Great Barn) — `src/systems/landmarks.ts`
- [x] ✅ Stage rewards and unlock effects (storage +30, train level boost) — `src/systems/landmarks.ts`
- [x] ✅ Greenhouse landmark (off-season crops once built) — `src/systems/landmarks.ts`, `src/systems/greenhouse.ts`

## Phase 8 — Neighbor Help & Social Economy
- [x] ✅ Friendship XP/level per villager — `src/systems/friendship.ts`
- [x] ✅ Daily friendship gifts — `src/systems/friendship.ts`
- [x] ✅ Help requests via Gazette — `src/systems/gazette.ts`
- [x] ✅ Neighbor sale listings via Gazette — `src/systems/gazette.ts`
- [x] ✅ Visit-a-neighbor screen (procedural farms, daily gift + buy) — `src/ui/friendship-panel.ts`

## Phase 9 — Farming Club / Co-op
- [x] ✅ Weekly themed club tasks — `src/systems/club.ts`
- [x] ✅ Simulated member contributions — `src/systems/club.ts`
- [x] ✅ Milestone rewards — `src/systems/club.ts`
- [x] ✅ Club level + cosmetic banner — `src/systems/club.ts`
- [x] ✅ Co-op chat panel with simulated peer messages, unread attention state, capped rolling buffer, and quick player replies — `src/systems/club.ts`, `src/ui/club-panel.ts`
- [x] ✅ Club donation / request board with player requests, simulated peer fills, daily give/receive caps, notifications opt-in, and board attention pips — `src/systems/request-board.ts`, `src/ui/request-board-panel.ts`
- [x] ✅ Daily friendship gift caps and clearer gift-cap UI — `src/systems/friendship.ts`, `src/ui/friendship-panel.ts`
- [x] ✅ Family-friendly social text filtering for chat/request surfaces — `src/systems/family-filter.ts`

## Phase 10 — Village / Town Hub
- [x] ✅ Village hub map with nodes (Square, Bakery, Dock, Tower, Carpenter, Market, Station, Fairground) — `src/systems/village.ts`
- [x] ✅ Village reputation stat — `src/systems/village.ts`
- [x] ✅ Hub UI panel — `src/ui/village-panel.ts`

## Phase 11 — Event Islands / Expeditions
- [x] ✅ Expedition map types (Forest Clearing, Misty Lake, Storm Valley, Festival Island, Old Orchard) — `src/systems/expeditions.ts`
- [x] ✅ Node-based exploration (clear / chest / repair / gather) — `src/systems/expeditions.ts`
- [x] ✅ Expedition rewards (materials, weather fragments, decor, tools) — `src/systems/expeditions.ts`
- [x] ✅ Expedition UI panel — `src/ui/expeditions-panel.ts`

## Phase 12 — Expedition Energy & Tools
- [x] ✅ Energy meter (regen 1/3min, cap 50) — `src/systems/expeditions.ts`
- [x] ✅ Energy from food (bread/smoothie/pie/honey/cookie/cake) — `src/systems/expeditions.ts`
- [x] ✅ Tool inventory (axe/saw/shovel/pickaxe/lantern/rope) — `src/data/items.ts`
- [x] ✅ Daily energy bonus — `src/systems/expeditions.ts`

## Phase 13 — Advanced Decoration & Beauty Contests
- [x] ✅ Beauty Score tiers (Cozy Plot → Legendary Acres) — `src/systems/beautification.ts`
- [x] ✅ Decoration sets (Spring Bloom / Autumn Harvest / Weather Mage / etc.) — `src/data/decorations.ts`, `src/systems/decor-sets.ts`
- [x] ✅ Weekly beauty contest — `src/systems/contest.ts`
- [x] ✅ Photo/share mode — `src/ui/snapshot-panel.ts`

## Phase 14 — Live-Ops Calendar & Seasonal Event Framework
- [x] ✅ Data-driven event registry — `src/systems/live-events.ts`
- [x] ✅ Weekly production events (Baking Bonanza, Fishing Festival, Orchard Week, etc.) — `src/systems/live-events.ts`
- [x] ✅ Event point rules + reward ladder — `src/systems/live-events.ts`
- [x] ✅ Event shop (tokens) — `src/ui/live-events-panel.ts`

## Phase 15 — Strong Optional Systems
- [x] ✅ Recipe Book — `src/ui/recipe-book-panel.ts`
- [x] ✅ Tool Shed (categorized tool inventory + bonuses) — `src/systems/tool-shed.ts`
- [x] ✅ Greenhouse / off-season farming — `src/systems/greenhouse.ts`
- [x] ✅ Compost (turn surplus/withered into fertilizer) — `src/systems/compost.ts`
- [x] ✅ Seed traits / breeding hooks — `src/data/seed-traits.ts`, `src/systems/breeding.ts`
- [x] ✅ Animal breeds — `src/data/animals.ts`, `src/systems/breeds.ts`
- [x] ✅ Visitor 2.0 (walk-on visitors with item requests + tips) — `src/systems/visitors.ts`
- [x] ✅ Farm Reputation — `src/systems/reputation.ts`
- [x] ✅ Weather Card Collection / Fusion — `src/systems/card-fusion.ts`
- [x] ✅ Weather forecast planning (2-3 days ahead) — `src/systems/forecast.ts`
- [x] ✅ Farm layout planner (move mode) — `src/systems/layout-planner.ts`
- [x] ✅ Bulk actions (plant area, harvest area, collect all production) — `src/systems/bulk-actions.ts`
- [x] ✅ Farm helpers / assistants — `src/systems/helpers.ts`
- [x] ✅ Farm Journal / Story Album — `src/systems/journal.ts`
- [x] ✅ Museum / Collection Hall — `src/ui/museum-panel.ts`
- [x] ✅ Crop rotation depth — `src/systems/soil.ts` (rotation penalties)
- [x] ✅ Market contracts (24-72h batch deliveries) — `src/systems/contracts.ts`
- [x] ✅ Seasonal recipe variants (Pumpkin Pie, Winter Cocoa, etc.) — `src/data/seasonal-recipes.ts`
- [x] ✅ Weather hazards & preparation — `src/systems/hazards.ts`
- [x] ✅ Friend codes / future social architecture — `src/systems/friend-codes.ts`

## Section 16-22 — UX, Economy, Data, Risk, QA Notes

These are guidance sections rather than discrete features. The codebase reflects them:

- [x] ✅ System unlock pacing (level-gated unlocks via `unlocks.ts`)
- [x] ✅ Grouped navigation (More sheet) — `index.html`, `mobile-shell.ts`
- [x] ✅ Next-best-action helper — `src/ui/objective-rail.ts`, `src/systems/objectives.ts`
- [x] ✅ Notification style (toasts, ready-notifier) — `src/ui/toasts.ts`, `src/systems/ready-notifier.ts`
- [x] ✅ Limited currencies (coins, XP, talent, event tokens, weather fragments, energy)
- [x] ✅ Save/load migration safety — `src/save.ts`
- [x] ✅ Telemetry hooks — `src/systems/telemetry.ts`

---

# 25. Future Stretch (post-roadmap)

The polish pass on 2026-05-24 closed two of the three v3-stretch items:

- ✅ **3D / isometric scene parallax** — the project now ships with a full
  Three.js pipeline (`src/three/`) using procedural meshes, post-FX
  bloom, day/night lighting, and a sky dome.
- ✅ **Realtime push notifications for boat departures, train returns,
  contracts** — `src/systems/notifications.ts` exposes a
  `notifyEvent(key, …)` rising-edge helper that fires desktop
  notifications when the tab is hidden. Boat docks, train returns, and
  contracts within 15 minutes of expiry now ping the player. Opt-in via
  the Settings panel (browser permission required).

Still open:

- ⬜ **Real multiplayer backend** — the friend-codes module
  (`src/systems/friend-codes.ts`) remains architecture-only. Clubs and
  the leaderboard use simulated peers. The CrazyGames SDK shim added in
  the 2026-05-24 pass exposes `crazyGamesGetUser()` and could be the
  on-ramp for a future real-leaderboard backend.

All other items in Phases 0–15 of this roadmap are implemented.

---

# 26. Recent Development Log

- 2026-05-24 — First-impression polish pass closing the residual items from `nextJob.md`. Non-destructive prestige (preserves buildings/animals/trees/decor by default; legacy hard reset opt-in via a checkbox). Game-pace selector in Settings (Fast 1× / Cozy 2× / Relaxed 3×) divides into `growthMultiplier()` so casual players preserve the "come back tomorrow" loop. Multi-phase fishing minigame: rare fish (Lv 4+) chain 3 phases with 35% shrinking safe zones, 25% speed ramps, and 8 s per-phase timer; common fish stay single-phase. Web Share API integration on Farm Snapshot. Event-specific rising-edge desktop notifications for boat-arrived, train-returned, contract-expiring (only fires while tab hidden, 10–30 min cooldowns). CG-SDK `getUser()` wiring shows the real CrazyGames username on the leaderboard when the SDK is active. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-24 — CrazyGames load-optimisation pass. Lazy-load helper at `src/ui/lazy-panels.ts`; ~40 panel modules converted from static to dynamic imports. Vite `manualChunks` splits `three` into a 182 KB vendor chunk. Music module also deferred (loads on first audio gesture). MP3 tracks re-encoded 192 kbps stereo → 96 kbps mono (16.2 MB → 8.1 MB total). Initial JS gzipped: 389 KB → 163 KB (−58%). Opt-in CrazyGames SDK shim at `src/systems/crazygames.ts` (activates with `?cg=1` or a localStorage flag; default stays offline-first). Verified with `npm run typecheck` and `npm run build`; all 4 commits pushed to origin/main.
- 2026-05-24 — Completed forward-roadmap Phase 10 real-world CSR campaigns. Imperfect Hero Week (~22% of harvested crops flagged, +25% Shop bonus) and the Habitat Restoration tracker (symbolic acres-restored accruing from harvests/orders/sales/fishing/weather casts/landmarks). Awards modal now tabbed (Medals / Habitat / Hero). Save schema bumped to v11. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-24 — Completed Phase 9.2 timer gating. Added `src/ui/visible-ticker.ts` and moved Order Meter, Boat, Train, Balloon, Production, Daily Timer, and Surprise Box refresh loops behind IntersectionObserver-aware visibility checks. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-24 — Continued performance work with Phase 9.1 virtualized lists. Added `src/ui/virtual-list.ts`, switched long Inventory/Barn + Silo sections to fixed-row virtualization, added virtualized Gazette neighbor/help lists with delegated actions, and expanded/virtualized simulated Leaderboard rows. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-24 — Completed forward-roadmap Phase 8 live-ops calendar parity. Added save-backed Sky Race, County Fair, Country Camping, and Fishing Tournament systems; a Featured tab in the Event Board; per-event QEB entries; action-hook integration for balloons, harvests, production, orders, animal goods, weather cards, and fishing; save schema v10; and four dedicated 3D event props with world bubbles. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-23 — Continued forward-roadmap development through Phase 6 and Phase 7. Added Maggie's recurring offer visits, weekly "This Week Only" shop offers, Roadside Stall daily listing caps, earnable Season Pass bundle claims, and Surprise Box odds disclosure. Then added animal-care depth: per-pen auto-feed upgrades, full-pen and mood world bubbles, baby grow-up celebrations, and bulk sell controls. Save schema is now v9 for offer and animal-care roots. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-23 — Continued post-roadmap polish with Farming Club co-op chat. Added save-compatible optional `club.chat` state, simulated peer messages, unread pips in feature visibility / QEB / club world bubble, a two-tab Club panel, capped message history, and canned quick replies to avoid open-text moderation risk. Verified with `npm run typecheck` and `npm run build`.
- 2026-05-23 — Completed the rest of forward-roadmap Phase 3 social work. Added Club donation/request board, one active player request, simulated peer request generation/filling, daily donated/received caps, filled-request toasts + opt-in Notifications API, friendship daily gift caps, and family-friendly filtering for social text. Request Board now has its own hidden trigger, Book entry, world-bubble route, QEB attention, and feature gate. Verified with `npm run build`.
- 2026-05-23 — Continued into onboarding polish. Tutorial now starts with farm naming, Alfred narrates the early steps, the HUD profile shows the saved farm name, level-up milestones open a data-driven unlock celebration, Level 5 includes a Weather Grid contextual tip, and Welcome Back now teases filled Club requests plus the next major unlock. Verified with `npm run build`.
