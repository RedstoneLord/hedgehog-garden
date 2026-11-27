# Hedgehog Garden 0.7.0 — Power and research proposal

## Baseline

0.6.0 already has local house inventories, coal mining, workshop-made fuel, road freight, provisions, saved crews, and 30 hire perks across six rarities. 0.7.0 should put those systems to work in one clear sequence: **mine coal → refine fuel → generate electricity → run research → improve the garden and its hedgehogs**. The design below is a proposal. Costs, timings and balance targets are open decisions.

## Recommended launch scope

| System | Proposed first version |
| --- | --- |
| Unlock | Once the player finishes a fuel batch, show a Power project in Хозяйство. Preview its costs, the first generator, and the first lab project. Show a checklist that survives closing the panel. |
| Generation | One small coal-era generator burns existing workshop fuel delivered into a local buffer. The player can bring the first load by hand. A generator can feed multiple buildings, and the build preview shows connection, draw, and expected fuel use. |
| Distribution | Place short pole links between a generator and consumers. Color connected areas by available capacity and flag disconnected or overloaded buildings. Show output, demand, fuel in reserve and the next expected shortage. Give the player three priority levels. |
| Outages | Use deterministic priority rules when demand exceeds supply. Unpowered equipment pauses safely and resumes the same job when power returns. Manual cooking, ordinary farm watering, and existing manual work remain available. Existing factories can continue using fuel directly, with an optional electric conversion later in the tree. |
| Research | One powered field lab with a visible project queue. A researcher hedgehog runs projects. Each project needs a specific delivered item set and a powered work period. Reserve materials on start and preserve progress through outages and reloads. Use a separate research tree with branches for farming, industry and workforce. Keep current upgrade points for the existing tree. |
| First payoff | Make the first project powered irrigation. It should water berries and wheat in a visible radius, conserve soil spacing rules, and pause when disconnected. Existing orchard sprinklers keep their current effect. Following projects unlock workforce training and industrial efficiency. |
| Hedgehogs | Add capped post-hire stat training, a separate cosmetic reroll with a preview, and a targeted perk-training choice. Preserve names and assignments. Start with one active perk slot. Keep Unique perks outside random recruitment and rerolls. |
| Improvements | Add clear power and freight warnings at the source, preserve crew presets, and show lab progress in Хозяйство. Make the first irrigation and training results visible on the map and in worker profiles. |

## Brainstorm

1. **Irrigation that earns its footprint.** Powered pumps water multiple crops. Placement overlays show coverage, electricity, and soil quality together. Watering by hand remains a useful fallback.
2. **A training yard for familiar hedgehogs.** Train endurance, carrying, or search in short courses with defined caps. Show the expected new stat and temporarily take the worker off their usual job. Let a saved crew fill the gap.
3. **Three perk candidates.** Offer a choice from a job-related training pool with visible rarity odds and trade-offs. The player can keep the current perk. Cosmetic changes use a separate flow and preserve the hedgehog’s identity.
4. **Unique perks earned through milestones.** Possible rewards include *Bridgekeeper* for basket trips from the original orchard, *First Harvest* for revitalizing the first farm, *Grid Keeper* for keeping several facilities powered, *Night Shift* for running a research project through repeated outages, and *Long Hauler* for supplying distant stations. Start with one or two after the progression loop is proven.
5. **Factory conversions with two paths.** Keep the existing fuel automation, then let the player research an electric retrofit. A retrofit can trade fuel logistics for grid capacity and give factories another meaningful upgrade choice.
6. **Provision recipes for research.** Use apples, berries, or existing workshop products in field trials and meals for researching hedgehogs. Let the first orchard and farm contribute something that stays useful after their first harvest milestone.
7. **An outage drill as a tutorial.** Introduce the grid with one generator, one lab, and one pump. When capacity is tight, show how to prioritize the lab or pump. Teach delivered fuel and disconnects alongside the familiar freight interface.
8. **Grid expansion as a later layer.** Consider a small battery or river waterwheel once the fuel-to-power loop works. Storage would smooth interruptions. River generation would reward a different layout. Defer both if the first generator and lab still need balancing.

## Development order

1. Implement generator fuel buffers, pole connections, per-network power accounting, priorities and a power overlay. Make the first hand-carried fuel load work with zero electricity.
2. Add the lab, staffed research jobs, material reservation, a small research tree and the first powered pump. Complete the coal-to-irrigation tutorial end to end.
3. Add stat training and perk training, then a cosmetic preview and reroll. Add one or two Unique milestones if they can be tested without opening a second random economy.
4. Add factory efficiency projects, practical uses for early crops, animations and feedback. Test at normal speed with one compact garden and one spread-out production save with roughly 18 hedgehogs.

## Acceptance checks

- A player can build the first generator, supply it manually, and complete the first lab project from a migrated 0.6.0 save using the in-game prompts.
- Clicking a stopped station explains whether the problem is fuel delivery, a disconnected pole, overload, power priority, a missing researcher or missing materials.
- Saving during an outage or removing a pole causes no duplicate research materials, lost progress or accidental fuel charges. Restored power resumes work predictably.
- Cosmetic rerolls preserve names, roles, stats and perks. Training respects caps, grants its reward once and cannot silently replace an existing perk. Unique perks never enter recruitment or ordinary reroll pools.
- Verify inventory conservation and station responsiveness with several networks and existing tractor trips. Existing unlocked recipes, factories, crews and crop workflows survive migration.

## Questions to decide before implementation

1. What should reveal electricity: the first fuel batch, a coin purchase, a contract, or a combination?
2. Should the first generator burn workshop-made fuel, raw coal, or support both at different efficiencies?
3. Should players place every pole link, or should buildings inside a powered radius connect automatically?
4. Should a shortage temporarily stop lower-priority buildings, slow them down, or use a mix by machine type?
5. Should fuel burn whenever the generator is on, or only in proportion to demand?
6. Should the first lab require a staffed researcher, allow manual research, or run automatically once supplied?
7. Should research be paid with delivered materials and time alone, or also grant and spend separate research points?
8. How many projects should launch, and should powered irrigation be the first required project?
9. Should existing factories be optionally retrofitted for electricity, or should electricity only power new machines at first?
10. How far should a hedgehog train past their original stats, and should training temporarily remove them from their job?
11. Should perk training give a choice of three, a guaranteed job-specific perk, or a reroll with visible odds?
12. Should a hedgehog have one perk slot or be able to keep an original perk alongside a learned one?
13. Should cosmetic rerolls allow direct selection, present previews from random rolls, or support both?
14. Should Unique perks ship in 0.7.0, and should their milestones be visible from the beginning or discovered through play?
15. Should the first power expansion be a battery, a river waterwheel, or a larger coal-era generator?
16. What should late trade look like after electricity: larger caravan contracts, river ports, or more uses for goods inside the garden first?
