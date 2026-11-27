# Hedgehog Garden 0.6.0 development plan

## Starting point

The 0.5.2.2 hotfix keeps the first 100-apple goal visible, gives the player a way to help with full baskets after hiring, explains placement and assignments, and shows recent sales. It slows growth of unspent upgrade points, fixes an active-batch workshop interruption and some duplicate or small tractor pickups, and corrects wheat and tractor sprites. Shared house stock, mining fuel at the mine, and the current hiring curve remain part of the 0.5.2.2 simulation.

The first-time player gave the game 7/10 after roughly 20 real minutes at nominal 6×. They nearly left before seeing the first hire goal. They remembered individual hedgehogs, decorated plots, and enjoyed named customers and the transition to staffed sales. At the last check they had 7 hedgehogs, 3 gardens, 1 farm, 1 stall, 1,019 coins and 585 unspent improvement points. The session ended before growing berries or trying production. The owner reported roughly 7,000 unspent points before production in their own play. Treat those as separate observations. Use 1× for retention and pacing tests. Use controlled simulation or 6× to explore longer states.

The hotfix validation covered manual and automatic basket contention, a 7,000-point save, sales recorded on completion, and a maker staying through an active batch. A desktop browser smoke test covered the opening goal, placement, sale history and the berry shortcut. The first-time log also notes one browser tab crash. The cause and the owner’s intermittent worker jumps still need a reproducible case. See the supplied `actions.log`, `thoughts.log` and `letter-to-developer.md` for the source observations.

## Build order

### 1. Put stock and deliveries at real locations

- Give the original house and each added home a separate physical inventory. Keep an aggregate view for the HUD, with per-house balances and in-transit amounts in Хозяйство. A house near a station reduces that local trip. It also leaves the goods elsewhere on the map until moved. Continue assigning hedgehogs their closest suitable home.
- Keep the global apple budget for orchard purchases where that preserves the original economy. Charge across actual eligible deposits, with visible balances and protected reserves. Recipes, customer orders, and fuel consume at their station or through an explicit delivery. Define what the player can carry by hand so manual play has a clear role and a finite capacity.
- Use site IDs and explicit reservations for pickup, in-transit cargo and drop-off. Track demand and available capacity after reservations. Prefer urgent commissions or stalled production over optional storage redistribution. Group compatible stops, apply a minimum useful load for routine runs, and allow small urgent runs when they unblock work. Show destination, cargo, trip cost, and the condition blocking pickup or delivery. Players can prioritize a destination, protect stock, and pause a route or station.
- Use one road graph for tractor logistics, including player-built connections, paved segments and configured driveway endpoints. Allow short final approaches from the network. Indicate when a station lacks a road connection and guide players through an example farm-to-workshop route. Use pixel-textured road surfaces, shoulders and joins that match the terrain. Worker movement needs shared fence geometry with visible gates and passability around actual blockers. Test these paths before changing existing planted layouts.
- Keep legacy stock in the original house during migration. Preserve workshop buffers, home locations, unopened and accepted orders, in-flight baskets, tractor cargo, XP, upgrades and staff assignments. An interrupted trip releases its reservations and recovers its physical cargo once. Deleting or moving stops, loading a save mid-trip and retrying an invalid route must conserve every item.

### 2. Make production useful and teach the loop

- Introduce a staged first project in Хозяйство. Before the 10,000-coin unlock, show what the first workshop can make, what ingredients are needed and where the result goes. After unlocking, guide the player through a first batch, staffing and delivery. Validate the price at 1× once the coin economy has meaningful intermediate purchases.
- Mines extract raw coal into a buffer. Fuel is made at workshops, including an early hand-started batch that requires raw coal and can bootstrap its own production. Migrate finished fuel as fuel and preserve coal from an unfinished batch. Existing recipe output and incoming cargo must survive the change. Add explicit status for full output, missing ingredients, no fuel, no worker, no route and a paused shift.
- Separate making, mining, purchasing and hauling. Makers and miners stay on-site unless the player explicitly enables a separate collection task. Give workshops and mines meaningful upgrade paths such as work time, batch output and buffers. Allow factory conversion after all workshop upgrade paths on that building are complete. A factory can operate without a maker when fueled, and has its own throughput, storage and efficiency upgrades.
- Keep apples and berries relevant at scale. Use apples for orchard projects and as recurring inputs to products the player uses. Expand the existing berry mulch use with provisions or other horticultural recipes that give cultivated berries a purpose inside the garden. Give the first orchard and farm local specializations so coming back to them still matters. Use coins for depot improvements, orders, roadwork and specialized stations. Model expenditures at each milestone to avoid long stretches of unspendable apples followed by one huge bill.
- Animate actual states. Show a driver in a moving tractor, a hedgehog working and a workshop reacting during a batch, and a miner throwing pixels of rock when extracting coal. Retain the visible basket crossings and other legible actions that testers enjoyed.

### 3. Rebalance staffing, perks and the upgrade tree

- Keep the first 100-apple hire as a visible milestone, with an active fallback during delivery gaps. Measure time to hire two and three under slow and fast starter stats, and measure how many jobs a normal garden needs at farm and production milestones. Rebalance the 25% compounding price and housing affordability together. The owner’s 18-worker bottleneck is a staffing and cost scenario to test, rather than a cap to hardcode. Ensure a broad garden can run apples, berries, a seller, purchasing, fuel, hauling and scouting without constantly dismantling its crews.
- Show a recruit’s stats, perk and suitable roles before purchase. Preserve the moment of choosing a name and a meaningful job, even when the player can afford several hires. Ship multi-select assignments and saved crews, including restore-to-previous-station behavior. Show the reason a worker could not join a bulk assignment. Preserve individual profiles, stats and existing jobs.
- Design at least five balanced, rollable perks per tier in Common, Uncommon, Rare, Epic, Legendary and Godly. Define explicit roll tables and display mechanical effects. Give the strongest perks meaningful drawbacks. A Godly prototype could multiply movement speed by three while halving stamina, with rest and route tests to ensure a fast courier stays legible. Reserve at least five Unique concepts for future one-off rewards, with no Unique perks in the random hire pool.
- Distinguish XP from spending points in the HUD and the tree. Grow subtrees out of the middle across orchards, field crops, staffing, trade, road logistics and industry. Show the next useful milestone before it is affordable. Balance routine delivery XP and milestone rewards against progression through each branch, including saves with 585 or 7,000 banked points. Do not confiscate unlocked upgrades or existing points.

### 4. Finish the player-facing details

- Keep the market’s named requests and guest gallery. Write alternate workshop-order lines by recipe family and unique guest lines that make those visitors recognizable. Retain the last-sales history with the identity, goods and payout after stalls sell automatically.
- Give camera shortcuts stable locations and keep zoom when jumping between established plots. Clarify **Лес** versus **Лесной сад**. Report what scouts found and how **Бодрость** helps. Preview irrigation range and effect before purchasing orchard equipment. Make the difference between farm watering today and researched irrigation clear.
- Review the eerie quality of the current music with sound enabled. Audition a warmer, low-volume ambient loop against the existing nature ambience and effects. Confirm looping, mix, source license and attribution before replacing the shipped track. The first-time playtest did not evaluate audio.

## Coverage and sequencing

| Owner or tester note | Delivery |
| --- | --- |
| Hidden first hire, repetitive early basket loop, slow first courier | Visible goal and manual send in 0.5.2.2. Confirm pacing at 1× and tune onboarding in 0.6.0. |
| Bulk buying, staffing shortages, difficulty moving carefully assigned staff | Recruiting and housing balance, candidate preview, saved crews and bulk moves in 0.6.0. |
| Apple glut and shortages, excessive XP, shallow branches | Slower late-point accrual in the hotfix. New branch depth, reviewed earnings and repeat spending in 0.6.0. |
| Shared houses, useless tractors, two-stop loops, fuel waste | Duplicate and small-trip mitigation in the hotfix. Local inventory, priorities, routing, batching and road art in 0.6.0. |
| Worker paths through fences or obstacles, off-road tractors, jumps or stalls | Tractor facing corrected and useful road guidance added. Gate-aware navigation, connected roads and save-based repros in 0.6.0. |
| Mine and workshop workers haul instead of producing, fuel refined in the wrong place, weak upgrade choices | Active-batch interruption fixed and stopped shifts labeled. Raw coal, workshop fuel, separated hauling, site and factory upgrade tracks in 0.6.0. |
| Sparse and weak perks, fixed stats and appearance | Rollable rarity catalog in 0.6.0. Unique perks, post-hire stat training, perk acquisition and appearance rerolls belong to research. |
| Berries and workshop goods mainly exist to sell. The original farm and orchard should stay meaningful | Production inputs, worker provisions, farm specialization, recurring improvements and spending in 0.6.0. |
| Misleading farm sprinklers, wheat cargo icon, building animations | Farm restriction and wheat icon fixed in 0.5.2.2. Working animations in 0.6.0. Irrigation automation belongs to research. |
| Offsetting track, too few lines, larger trade opportunities | Audio and dialogue pass in 0.6.0. Ports and carriage contracts follow reliable land logistics, with larger orders and permanent coin sinks. |
| Tester placement, quick assignments, berry guidance, invisible sales and production introduction | Placement, quick labels, berry shortcut and sales in 0.5.2.2. A playable production tutorial, steadier navigation and scouting feedback in 0.6.0. |

After 0.6.0, use the reliable coal and fuel chain as the foundation for power plants, then electricity, then research stations. Research can unlock powered farm irrigation and post-hire growth. Ports and carriage contracts should use the same reservation system established by road freight.

## Acceptance checks

- Play a fresh save at 1× through the first hire, staffing a stall, first berry order and first workshop. Track real time, active actions, waiting and mistakes separately. Interview a new player about their next goal and why they would return.
- Load the owner’s production save at 1× and replay the stuck mine, low-load fuel loop and jumping-worker cases. Capture the site, worker, job phase, reservation and waypoint when a case occurs. Verify that a compact layout and a spread-out layout around 18 hedgehogs both have workable staffing and transport. Compare throughput and fuel per delivered unit for road-connected tractors versus manual hauling.
- For migration, compare the pre- and post-update totals of each good across houses, stations, stalls and cargo. Test a save mid-craft, mid-delivery and mid-order, including moving or deleting a stop. Preserve pending sales, worker selections, existing traits and historical balances.
- Test touch and keyboard flows for placement, bulk assignments and the supply board. Check production, movement and map performance at 1×, then at 6× for stress. Track the reported tab crash separately from gameplay balance.
