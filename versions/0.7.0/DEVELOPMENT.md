# Hedgehog Garden 0.7.0 — Final design

0.7.0 adds research, a power grid, stronger hedgehog progression, and a larger visitor roster. Completing the scientist’s commission unlocks Research and the first lab. The lab tutorial introduces **Electricity** and **Irrigation** as two independent starting projects. Later projects turn the power grid into better farms, workshops, homes, and leisure facilities.

The commission quantities, coin thresholds, stat and perk limits, and retirement window below are release requirements. Other numbers are initial balance values for playtesting.

## Progression and unlocks

| Milestone | Requirements | What opens |
| --- | --- | --- |
| Scientist’s commission | Unlock production and reach 10,000 coins to trigger the encounter. Deliver the required goods and pay 25,000 coins to finish it. | Research and access to the first lab |
| First lab | Complete the commission. The player can then do manual research without electricity. | Introductory challenges and the two starting projects |
| Electricity | Complete the electrical tutorial project. The first generator uses coal, fuel or biofuel delivered into its own buffer. | Generators, poles, the grid overlay, and powered hedgehog research |
| Irrigation | Complete the agricultural tutorial project. It can be researched before Electricity. | Farm irrigation equipment. Powered pumps run after being connected to a working grid. |
| Later research | Complete the prerequisites for any available project. The player can develop one branch or switch among them. | Training, mating stations, wardrobes, efficiency, decoration, comfort, and coin-earning leisure |

Before the commission is complete, the locked Research tab points the player to the scientist and the remaining requirements. The existing production and freight systems can make and deliver the entire commission. Once it is complete, Research opens and the lab tutorial begins.

## The scientist’s commission

A scientist visits the **oldest existing stall** after production is unlocked and the player reaches **10,000 coins**. Determine stall age from its original placement and keep that age when it moves. Put an exclamation mark above the stall and have Картошка point out the visitor once. If the trigger is reached before any stall exists, show the encounter when one is placed. The scientist presents a permanent offer. After the player accepts it, the scientist leaves and returns once the commission is complete.

| Required good | Quantity |
| --- | ---: |
| Apples | 20,000 |
| Berries | 10,000 |
| Wheat | 10,000 |
| Flour | 5,000 |
| Coal | 1,000 |
| Fuel | 500 |
| Apple slices | 5,000 |
| Apple compote | 2,000 |
| Berry purée | 5,000 |
| Bread | 2,000 |
| Apple pies | 500 |
| Berry jam | 2,000 |
| Apple–berry jam | 500 |
| Berry compote | 2,000 |
| **Total goods** | **65,500** |
| **Payment on completion** | **25,000 coins** |

- Only the player can accept the commission and complete it. Acceptance starts freighting. The final action checks all delivered quantities and available coins, deducts the payment once, records completion, and unlocks Research.
- Hedgehogs and tractors can deliver accepted goods to the stall. The player can contribute manually. Deliveries use a separate intake area and do not consume ordinary shelf capacity. They respect existing freight reservations and retire from the queue as each target quantity is met.
- When the counter is clear of an ordinary customer, submitted goods transfer into the permanent remote commission account. Give intake a brief turn between serving ordinary shoppers, so a steady queue cannot starve the commission. The commission never takes shelf stock that was reserved for another order.
- Deleting or moving the stall does not affect goods already credited. Move pending intake to the oldest remaining stall. With no stall available, pause new deliveries and keep the checklist in Хозяйство. In-flight freight either retargets or returns its remaining cargo to storage once.
- The checklist shows the required amount, credited amount, in transit, and available stock by item. It also shows the 25,000-coin requirement from the first meeting. No additional goods such as jars, provisions or biofuel appear in this commission.

## Research and the grid

### How research works

- A lab site has one researcher slot. An assigned hedgehog earns research points (RP) over time at a powered lab. Partial power slows that work at the same rate as other machines on the network.
- The player can work manually with or without a researcher and with or without electricity. Offer separate difficulty choices for styled basic math, harder math, trivia, and logic puzzles. The first successful tutorial exercise grants enough RP to start a first project. A result is credited once and grants **RP only**.
- Manual and hedgehog research can run at the same time. Both contribute to the same RP balance. Unlocking a project spends its displayed materials, coins, and RP in one action. Starting a challenge costs no project materials. Use short, touch-friendly puzzles with visible feedback, readable answer choices, and no timing requirement on the easiest difficulty.
- Price the opening projects for a garden that already runs several production chains and completes large deliveries. Use a short order assembled from existing house and workshop stocks and a clearly previewed coin price. The commission covers the major entry cost. The player should be able to complete their chosen first project after one introductory challenge and a short restock, then use the first installation without saving through another commission-sized grind.
- Keep the two opening projects compatible with existing infrastructure. The first Electricity project uses 0.6.0 goods and can be completed through manual research. The first generator accepts already-stockpiled coal or refined fuel, and existing freight can supply its buffer. Irrigation covers a meaningful part of an established berry or wheat field. A player who researches Irrigation first can plan and place its equipment, then connect it once they have electricity.

### Match costs and benefits to the garden

| Stage | Expected player infrastructure | Balance target |
| --- | --- | --- |
| Opening projects | Working workshops, coal and fuel production, warehouses, and freight established by the commission | The first generator can power a lab plus one useful installation under normal load. The first pump can take over a noticeable share of watering on a mature farm. Show project and installation prices together so the player can plan before spending. |
| Mid-tree projects | A running lab and a working grid supplying at least one established district | Use goods the player is already producing at scale and ask for a few production batches, deliveries, or meaningful upgrades. Offer comparable payoffs in watering coverage, worker development, factory uptime, or freight throughput. |
| Late and shared projects | Several active facilities, established supply routes, and enough power to support extra demand | Require larger orders and combinations of goods from multiple branches. Give projects an operational payoff such as powering another district, relieving a freight bottleneck, or freeing a worker for a different role. Cosmetic-only projects can stay cheaper so decoration remains an independent choice. |

Tune against normal-speed saves immediately after the commission, including a compact garden and a spread-out garden with roughly 18 hedgehogs. Start with the actual coins and goods remaining **after** payment. Measure manual research time, restock time, installation cost, and the benefit of the first installation under load. Existing warehouses, roads, staff, and production should make research quicker to bring online and easier to sustain.

### Generation and distribution

- Generators have local fuel buffers and a player-selected fuel. Coal is the easiest to obtain. Refined fuel delivers more power per shipment. Workshop-made biofuel uses apples and berries and offers a way to power the garden with crops. The first fuel load can be inserted manually, or supplied by a hedgehog or tractor through the logistics system.
- Buildings connect automatically within the displayed range. Poles connect to each other automatically within their own range. A building belongs to only one connected network at a time. Before placement, show the expected links, connected consumers, available capacity, and projected speed.
- Each connected network distributes available power proportionally. A network supplying 8 units to 10 units of demand gives **every** active machine 80% speed. Zero supply pauses progress. Full supply returns it to normal speed. Unused generation burns zero fuel. Separate networks are accounted for independently.
- An unstaffed generator can run and can break after loaded operation. Any eligible hedgehog can be assigned to generator operation. An operator maintains that generator, while repairs require a manual action or an operator and the needed repair materials. Fuel and existing charge remain in the buffer while a generator is stopped. Show the difference between broken, empty, disconnected, idle, and overloaded.
- Every generator has a small built-in battery. Spare output can replenish it while the generator is serving an active load, and it covers only brief shortages. Larger batteries, waterwheels and wind turbines are research projects. Waterwheels need a valid riverside site. Wind turbines use a visible exposure overlay. Both are alternate in-game sources to help a garden restart after fuel runs out.
- The power view in Хозяйство shows output, requested load, actual operating speed, reserves and stored charge. Factories retain their existing fuel mode. An optional retrofit lets a factory run on electricity.

## Research tree

Use a radial map. Angle represents the branch. Distance from the hub represents the tier and normally rises with cost. Electricity and Irrigation sit near the hub on their own spokes. Shared projects sit between their contributing branches and visibly link to both prerequisites. Use separate labels and collision-free positions. A narrow screen opens node details in a bottom sheet. Include a branch list for touch and keyboard navigation. Reflow the existing overall upgrade tree with the same spacing and connector rules.

| Branch | Projects in progression order |
| --- | --- |
| Agricultural | **Irrigation** unlocks powered watering for berries and wheat. **Wide Spray** expands the watered area. **Orchard Care** improves watering coverage for trees. **Field Trials** adds late crop-yield upgrades. |
| Electrical | **Electricity** unlocks the basic generator and poles. **Grid Metering** adds load and runtime detail. **Battery Bank** expands storage. **Waterwheel** adds riverside generation. **Wind Turbine** adds an exposed-land option. **Reliable Bearings** reduces breakdowns. |
| Industry and logistics | **Factory Efficiency** reduces production costs. **Electric Retrofit** enables grid power at existing factories. **Modular Workshop** expands batch storage. **Freight Dispatch** improves regular station deliveries. **Lab Expansion** improves researcher throughput once the player has a powered lab. |
| Workforce and genetics | **Training Facility** unlocks courses. **Advanced Courses** unlocks higher-level training with materials. **Mating Station** unlocks offspring with hidden outcomes. **Rest and Recovery** improves time spent resting while off shift. |
| Decorative and comfort | **Garden Workshop** unlocks benches, planters, paths and lamps. **Market Frontage** unlocks shop signs and ornamental displays that attract visitors. **Workplace Comfort** unlocks shelters and break areas that modestly increase nearby work speed. **Landscape Collection** unlocks fences, statues, and flower beds for appearance. **Wardrobe** unlocks cosmetic previews. |
| Leisure | **Puzzle Table** unlocks skill-based coin-earning puzzles. **Garden Games** unlocks a rotation of other short games. **Chance Table** unlocks games with stakes and payouts using in-game coins. **Recreation Corner** unlocks furniture for leisure areas. |

### Shared projects

| Intersection | Prerequisites | Effect |
| --- | --- | --- |
| Efficient Pumps | Irrigation + Grid Metering | Reduces irrigation power draw |
| Fruit Biofuel | Field Trials + an operational workshop | Unlocks an apples-and-berries fuel recipe |
| Powered Loading | Grid Metering + Freight Dispatch | Reduces loading time at supplied freight stations |
| Recovery Lounge | Rest and Recovery + Workplace Comfort | Speeds recovery for workers in its radius |
| Illuminated Market | Electricity + Market Frontage | Increases demand when the stall’s lamps are powered |
| Festival Square | Landscape Collection + Garden Games | Attracts visitors near a decorated leisure area |
| Advanced Grid Controls | Reliable Bearings + Lab Expansion | Improves generator diagnostics and maintenance efficiency |

Decoration placement shows its footprint and effects before purchase. Attraction affects visitor arrivals and respects existing demand and queue limits. Comfort boosts apply to nearby jobs and have a cap so overlapping decorations stay readable and useful. Cosmetic objects are selectable separately for an uncluttered building catalogue.

## Sixteen additions to the overall upgrade tree

These upgrades use the existing upgrade-point currency. Unlocks and nodes already purchased retain their current effects. New-system upgrades show their research prerequisite. The values below are initial balance targets.

| Upgrade | Prerequisite | Effect |
| --- | --- | --- |
| Bridge Orchard Care | First-orchard yield branch | +1 fruit per harvest in the original orchard |
| Seed Exchange | Seed discount branch | Exchange surplus amber saplings for ordinary saplings |
| Basket Hooks | Loading branch | 10% less basket loading time |
| Forest Basket Lining | Forest gathering branch | +2 berries per wild gathering trip |
| Watering Tote | Farm watering branch | Manual watering reaches one extra nearby plant |
| Fruit Sorting | Harvest branch | 10% less time spent picking from fruit trees |
| House Dispatch | Freight capacity branch | +4 goods per porter trip |
| Queue Steward | Sales branch | +1 customer queue slot per stall |
| Returning Guests | Queue Steward | 5% shorter visitor interval at staffed stalls |
| Fuel Crates | Workshop output branch | +4 fuel units per funded freight load when capacity allows |
| Apprenticeship | Training Facility | 10% less time for courses up to level 10 |
| Instructor’s Bench | Advanced Courses | 10% fewer training materials, rounded up |
| Field Notes | Electricity or Irrigation | +5% RP from work in a powered lab |
| Insulated Poles | Grid Metering | +10% pole-to-pole range |
| Maintainer’s Kit | Reliable Bearings | 10% less time to repair a generator |
| Market Beautification | Market Frontage | +10% to the decoration-based portion of visitor attraction |

## Hedgehogs

### Recruiting and retirement

Recruit previews include **Reroll for apples**. A successful reroll charges the displayed amount and replaces the pending candidate. Track the apples spent on rerolls for this hire, and raise the price with that cumulative spend. Keep the count and candidate through reloads. Initial formula for tuning is 10% of the hire price plus 50% of apples already spent rerolling that candidate, rounded up. Hiring clears the pending reroll history.

Sending a worker to the retirement lodge frees their active housing slot immediately. Finish or safely return any cargo before they leave. The player has **15 minutes of elapsed time** to retrieve them if there is room. After the window expires, record the hedgehog’s name and increment the lodge’s permanent retirement count. Show those names in the lodge. Store a deadline that survives closing the game. Changing simulation speed leaves the recovery window intact.

### Courses, offspring and wardrobes

- Choose one training course for one stat at a time. A hedgehog leaves their normal assignment while training and remains at the facility afterward until reassigned. Every level takes longer than the previous one. Initial tuning uses a rising time curve with material costs from level 15 onward. Stats cap at **20**.
- Preserve original and current stats separately. For each offspring stat, compute the mean of the parents’ original stats plus half the mean of their trained gains. Roll the mutation and clamp to **1–20**. Common mutations move selected stats by ±1 or ±2. A rare mutation can create a **20 in one stat and 1 in all others** result. Mutations can also change appearance or add a random perk.
- The mating station shows parent eligibility and available housing. Reserve a slot for the offspring when the process starts. Roll the outcome once and persist it. Reveal the child’s actual stats, perks, and appearance at the end, with no family-preview panel or outcome ranges.
- A hedgehog has up to **three perks**. The game rolls inherited and additional perks and prevents duplicates. Unique perks can be inherited at much lower odds. Wardrobes offer three randomized appearance previews and the option to retain the current look. A wardrobe choice changes appearance only.

### Unique perks and reveal

Give every eligible job its own exceptionally rare Unique perk tied to successful work. Use different odds by job frequency and a single recorded roll per completed event. Ordinary recruiting and paid rerolls never generate these perks.

| Completed work | Example Unique | Example effect |
| --- | --- | --- |
| Picking fruit | Orchard Eye | Collects up to two extra fruit per trip when the basket has room |
| Watering crops | Rainmaker | Watering covers two extra eligible crops |
| Foraging | Berry Whisperer | Carries a larger haul of wild berries |
| Finding a flower while scouting | Woodland Sense | Greatly extends flower detection range |
| Selling an order | Silver Tongue | Adds a payout bonus to orders personally served |
| Delivering baskets | Bridgekeeper | Moves significantly faster with a loaded basket |
| Restocking a stall or station | Long Hauler | Increases the amount delivered per trip |
| Driving a tractor | Road Captain | Loading and unloading take substantially less time |
| Making a product | Batch Master | Gives finished batches a chance to produce additional units |
| Buying supplies | Sharp Buyer | Discounts supplies purchased by this worker |
| Mining | Stone Listener | Increases coal output per mining cycle |
| Researching | Bright Spark | Significantly increases RP while operating a powered lab |
| Maintaining or repairing a generator | Steady Current | Reduces repair time and breakdown risk on the operated unit |

When a hedgehog earns a Unique perk, darken the screen briefly, slowly zoom the camera to the worker at their job, and spotlight them. Type **“<NAME> HAS EARNED THE <PERK> PERK!”** with confetti. A reduced-motion setting uses a static spotlight and complete text. Queue the reveal when the player is in a dialog or outside the game. Restore the previous viewport afterward. If all three slots are occupied, put the earned perk in the profile until the player chooses which existing perk to replace.

### Presets and bulk work

Save full workforce presets containing each hedgehog’s workplace and role and the members of the favorite pile. A single action captures the current assignment. Players can name, rename, restore, and delete presets. Generator fuel settings and financial settings stay independent.

Use a searchable roster with site, role, and status filters. On desktop, show selections and assignment controls side by side. On mobile, show a bottom action bar with a count and one clear Apply button. Let players preview what will change. Queue changes for workers with cargo or active training, and show any assignments that refer to a missing station, retired worker, or incompatible role. Convert existing saved crews into presets for the workers they covered, preserving the rest of the current roster.

## Market visitors, decoration, and leisure

- Add a scientist and at least 11 other visitors. Give each a distinct portrait, map sprite, silhouette, palette, and outfit. The initial group can include a gardener, miller, baker, confectioner, beekeeper, courier, cook, café owner, park keeper, musician and machinist.
- Choose dialogue after the final order is known. Add at least three variants per product or mixed order type so pie, jam, compote, bread and other goods get lines about what was actually bought. Use visitor-specific phrasing for special guests. Retry or revisit lines should respect the current order and avoid immediate repetition. The scientist has separate arrival, commission, and completion dialogue.
- Decoration can attract customers, make nearby hedgehogs work faster, or change the look of a zone. Keep these purposes legible on each item card and in its placement preview.
- Minigame stations are for fun and can award ordinary in-game coins. Chance-based stations use only in-game coins, with stakes, odds and payouts visible before play. Save accepted rounds and payouts atomically. Research challenges award RP only, even when they reuse a puzzle format.

## Хозяйство, polish, and audio

| Area | Design |
| --- | --- |
| Строительство | Use a darkened garden background and building cards with a sprite, category, cost, purpose, and construction requirements. Separate ordinary construction, power, research, and decoration. Show the proposed site and relevant coverage before confirming. |
| Сводка | Include a live garden map with pan, zoom, and selectable zones. Show names and descriptions for residential, orchard, farm, industrial, market, power and research areas. Selecting a zone lists buildings, workers, current output, and blockers. A separate power view keeps the default map readable. |
| Склад | Present separate, styled cards for each house and station, with a global summary and filters for crops, ingredients, outputs and fuel. Show available, reserved and in-transit quantities. Keep the commission account distinct from ordinary warehouse stock. |
| Main menu | Add «Сбросить прогресс» in Settings with explicit confirmation and an export option. Clear the active browser or Android garden and prevent old autosave callbacks from restoring it. Keep audio preferences. |
| Basket label | Display the basket count on one line. Remove visible «Рейс» from the map badge. Keep delivery status available in the accessible label or details. |
| Audio mix | Lower the combined forest and river volume from 0.20 to 0.16 initially. Raise music from 0.08 to 0.10. Check the mix on phone speakers and headphones. |

## Implementation order and acceptance

1. **Commission and research foundations.** Implement the scientist, remote account, locked Research tab, unpowered tutorial lab, RP challenges, and the two opening projects. Verify that acceptance, partial delivery, and delivering all goods each leave Research locked. Verify that the final 25,000-coin payment unlocks it once, and that manual research starts without electricity. Exercise all 14 goods, full customer queues, interrupted deliveries, stall deletion and reloads.
2. **Power and irrigation.** Implement the three fuels, automatic links, proportional work rate, repairs and stored charge. Test two networks, idle fuel use, 80% supply, breakdown recovery and the first pump. Verify that a garden can restore power after an empty network save.
3. **Hedgehog and research branches.** Ship recruiting, retirement, training, genetics, wardrobes, and job-specific Unique perks with the reveal. Test both retirement outcomes, reopening a paid reroll, preservation of original stats, cap-20 training, all mutation types, three perk slots, deferred replacement, and export/import mid-course or mid-mating.
4. **Navigation and play.** Restyle Хозяйство, reflow both trees, ship presets, finish the visitor roster, add decoration and leisure, and apply the audio changes. Verify bulk work with an 18-worker garden, all original save assignments, touch and keyboard navigation, map labels at small widths, and browser and Android reset behaviour.
5. **Release checks.** Migrate an active 0.6.0 production save with in-flight freight and verify stock conservation. Run the tutorial and first power cycle at normal speed. Stress-test RP earning, grid splits and job rolls at 6×. Compare layouts in desktop and narrow mobile viewports.
