# Wild Frontier

A wildlife rescue and conservation simulation with a handcrafted, claymation-inspired 3D art direction.

## Current playable slice
- Full-viewport 3D woodland with sculpted terrain, creek, layered foliage, ranger hut and a walkable-looking recovery yard
- Sixteen named wildlife residents across thirteen species: white-tailed deer, cottontails, red fox, barred owl, gray squirrel, Carolina wren, raccoon, beaver, striped skunk, eastern box turtle and northern cardinal
- Custom modeled woodland creatures with autonomous wandering, hopping, idle poses, sleep states and social proximity
- Controllable ranger avatar with keyboard movement and a follow camera
- Walk-in sanctuary and treatment wing with separated care bays, alongside the quiet recovery yard
- Multi-step rescue and wildlife survey assignments with completion conditions
- Species-specific movement profiles: bounding mammals, low-to-ground turtle travel, tail motion and bird body/wing motion
- Walkable ranger avatar with animated arm and leg gait
- Furnished treatment wing with examination benches, supply cabinet, wash basin and task lights
- Clinical examination, wound dressing and guided rehabilitation sessions gate the final release assessment
- Population ecology model tracks small herbivores, predators, wetland birds, beaver-like wetland engineers and breeding pairs
- Seasonal migration status and spring breeding feedback respond to forage, cover, wetland health and disturbance
- Expanded habitat landmarks: berry thicket, creek boardwalk, sedge margin and pollinator meadow
- More articulated mammal gaits and proximity-driven social movement
- Active riparian restoration and nest-box projects visibly change the reserve and improve habitat metrics
- Critically endangered red wolves and endangered whooping cranes join the managed conservation roster
- Per-animal daily feeding schedules use species-appropriate rations; direct feeding of free-ranging wildlife remains prohibited
- Managed endangered-species breeding programme checks habitat readiness and distinct genetic lines, with specialist oversight required
- Restoration progress visibly matures willow plantings and nest installations
- Whooping cranes use articulated wing pivots, circling flight paths and tucked-leg flight poses; beavers animate waterline swimming and paddling
- Wildlife show natural forage and rest cycles, expressive eye blinks, and species-specific head and ear motion
- Rescue handling animates the ranger approaching a stabilized animal, followed by a careful transfer into the recovery sequence
- Feeding, quiet-rest and guided-rehabilitation actions trigger visible animal responses
- Orbit camera, zoom, WASD / arrow-key movement, and clickable animal records
- Individual animal profiles: health, hydration, nutrition, stress, energy, social comfort, personality and daily routine
- Ranger-led rescue progression: sighting → assessment → stabilization → transport → rehabilitation → release evaluation
- Rehabilitation actions: measured feed, fresh water, quiet time and species-appropriate enrichment
- Release standards include health, stress, hydration, nutrition and energy
- Simulated day/night cycle, changing weather, dynamic woodland lighting and visible rain
- Seasonal ecology shifts, seasonal forage pressure, habitat quality and biodiversity feedback
- Nocturnal fox and owl routines, dawn songbird calls and species-specific recovery diets
- Wildlife daily routines: wild animals rest at night; recovery animals settle into quiet sleep; needs evolve with time
- Habitat ecology: water quality, native cover, forage, biodiversity and disturbance affect habitat health
- Restoration tasks are one-time projects rather than endlessly repeatable score buttons
- Field journal and responsive mobile/desktop HUD

## Safari sanctuary (new)
A second reserve east of the woodland: walk through the gate (or tap **Safari Sanctuary → Go to safari gate**) onto a savanna with an acacia grove, waterhole, soda lake, lion kopje, bamboo thicket for the tigers and a rhino wallow.

- **Eight managed species with heritage-appropriate names**: African lions (Swahili names such as Jabari, Nala), Bengal tigers (Hindi/Sanskrit: Rudra, Anika), African elephants, reticulated giraffes, plains zebras, cheetahs, greater one-horned rhinos (Assamese/Sanskrit: Bhima, Gauri) and greater flamingos. The woodland residents now carry names from their native North American languages too.
- **Feeding**: every species has its own diet (meat, hay, browse, aquatic mix; produce is a treat). Wrong food is refused, stock is spent, and hungry animals lose health.
- **Economy**: funds, daily grants driven by reputation and welfare, supplies to buy, veterinary stock, keepers who feed hungry residents each day (wages apply), and a water supply that runs down and must be refilled.
- **Breeding programme**: pairs must be mature, healthy, calm, well fed and unrelated; gestation is tracked, litters are born with parents and genetic lines recorded, young grow visibly from newborn to adult. Inbreeding is blocked, habitats have capacity limits, surplus adults can be transferred to partner reserves for conservation credits, and credits import unrelated founders.
- **Management panel** with Overview, Residents, Supplies and Breeding tabs, goals, a family record, and a game-speed control (pause / ×1 / ×4 / ×12).
- **Staff who walk and work**: hire keepers, a veterinarian and educators. They start at the supply shed, work 06:00–20:00, walk to hungry or sick residents and feed or treat them, gain skill with experience and draw daily wages (unpaid staff stop working).
- **Habitat building**: tap **Build** to place shade trees, ponds, wallows, shelters, rock outcrops, bamboo, feeding stations, boardwalks, flower beds, viewing platforms and an education centre. Each species needs specific features within reach of its enclosure; the score reflects needs, not looks. Poor habitats stress animals and block breeding. Items can be rotated, moved and removed for a half refund.
- **Visitors & education**: open or close the sanctuary, set ticket prices, close habitats to protect sensitive species (cheetahs, tigers and rhinos are disturbed most), and let educators give talks for awareness, donations and credits. Visitors walk the boardwalk in the 3D world.
- **Journal, camera and map**: photograph animals in Camera mode (zoom, frame, shutter) for journal photos and funds; first photos, rare species and new behaviours (young, playing, foraging) pay more. The journal lists woodland and safari species with details. The world map starts mostly hidden and reveals as you explore; discovered places can be fast-travelled to.
- **Saving**: the safari sanctuary is saved in your browser and restored on reload. The woodland rescue missions are not saved yet.
- **Touch controls**: drag to look, pinch to zoom, tap an animal for its record, press and hold the ground to walk toward your finger.

## Art direction and rendering (visual overhaul)
Wild Frontier is a hand-painted 3D world. Nothing in the scene is a flat sprite or a primitive solid any more:

- **Rigged animals**: all 26 species are lofted, skinned meshes on real skeletons with painted coats, bump-mapped fur, blinking eyes and procedural gaits (walk, trot, bound, wade, hop), grazing, drinking-style head poses, sleeping, alert posture, tail and ear life. Specs live in `src/art/creature-specs.js`.
- **Rigged people**: the ranger, keepers, vets, educators and visitors share a humanoid rig with walk, work, talk, carry and photo animations (`src/art/human.js`).
- **Handcrafted environment**: bark-textured trees, painted leaf canopies, wind-animated grass, flowers, ferns, reeds, bamboo, acacia and baobab; timber, thatch, shingle and stone buildings with painted signs; reflective animated water; painted terrain with hills, a drifting-cloud sky, a distant treeline and an environment map.
- **Lighting**: soft-shadowed key sun, sky fill and bounce, time-of-day, weather and season grading; lit windows at night. High quality adds ambient occlusion, soft bloom and a painterly colour grade.
- **3D interface art**: animal portraits, journal cards and build icons are renders of the real models (`src/art/portraits.js`).
- **Quality tiers**: Low, Medium and High are chosen from the device, or with `?quality=low|medium|high`. A governor steps down automatically if frames are slow. See `docs/VISUAL_AUDIT.md` for what changed and the measured numbers.
- Dev tools: `showcase.html` (run `npm run dev`, open `/Wildfrontier/showcase.html?grid=1`) previews every species and person; `tools/visual-audit.cjs` audits the live scene; `tools/smoke-creatures.mjs` builds and animates every model in Node.

## Animal minds and enrichment
- **Needs-driven AI** (`src/ai.js`): every animal decides what to do from its hunger, thirst, energy, boredom, fear, social need, personality and trust. Priorities are real: fear beats hunger, rain sends sensitive species to shelter, thirst sends animals to water, and bored captives use enrichment or pace.
- **Species profiles** for all 26 species: activity pattern, social structure, how easily startled, flee distance, predator/prey relationships. Prey flee predators, herds warn each other (contagion), herd animals regroup, nocturnal animals rest by day.
- **Individuals**: stable per-animal temperament (bold/shy, sociable, inquisitive, calm) and a bond with people. Trusting, curious animals walk up to keepers; shy ones bolt. Animals keep a short history.
- **Movement**: smooth acceleration and braking, running when fleeing, drinking, foraging, grooming, scratching and play-bow animations in the rig, plus individual size variation.
- **Enrichment**: climbing frame, digging pit, puzzle feeder, scratching post and scent station, with species-specific suitability. Boredom is a welfare stat that builds, causes stress and is relieved when animals actually use the objects. Water features count as swimming enrichment for swimmers.

## Rescues and dynamic missions
- **Rescue cases** (`src/rescue.js`): reports arrive by radio, scaled to reputation, up to two at a time, across four difficulty tiers (stunned songbird to wounded predator to a storm-stranded pair), with deadlines, equipment requirements (net, crate, first aid, sedation) and multi-animal cases such as an orphaned litter.
- The chain is playable end to end: accept the call, follow a trail of clue markers in the world (the animal is hidden until you find it), get close to assess, choose an approach (quiet, net or sedation, each with different odds, stress and cost), secure each animal, load and transport it, rehabilitate and release. Failures have consequences: a botched capture hurts the animal and it bolts, a missed deadline loses the animal and costs reputation. Good handling pays more.
- **Equipment** is bought in Supplies; durable gear is kept, consumables are used up. Older saves migrate automatically.
- **Director** (`src/director.js`): missions raised from real simulation state and completed by real conditions: treat a sick animal, restock supplies, welcome a newborn, improve an inadequate habitat, protect a species from visitors, document a rare species, turn welfare around. They expire if ignored.
- **Mission journal** with rescues, operations and history, a badge on the HUD, search areas and clues on the 3D world and the map.

## Run locally
```bash
npm install
npm test
npm run dev
```

Production build:
```bash
npm run build
```

GitHub Actions runs the simulation tests and production build on pushes to `main` and pull requests.

## Art direction
The goal is a tactile miniature world: soft forms, imperfect silhouettes, warm directional light, matte materials, layered depth and individually composed environments. Kenney-style simplicity is a useful modelling reference, not the final visual identity.

## Next systems
1. More species with distinct locomotion, habitat and care plans
2. Visible player avatar and direct interaction with the reserve
3. Deeper food-web and population dynamics
4. More detailed animal rigs, rescue equipment and rehabilitation interiors
5. Save/load progression and longer-term seasonal ecology


### Field research expansion
- Passive pine-corridor camera traps unlock a delayed evidence-review assignment after three simulated hours, rewarding patient, non-invasive wildlife monitoring.
- A prepared meadow can be surveyed for native bees, butterflies and hoverflies; the transect increases pollinator activity, biodiversity and the reserve research score.
- Long simulation steps now process every crossed weather, season and ecosystem interval rather than silently dropping elapsed cycles.

## Milestone 5: exploration, opening, movement and sound

- **Regions and field activities** (`src/activities.js`): regions unlock by reputation; field spots offer tracks quizzes, planting, water testing and research notes. Research unlocks perks (scope at 20, bulk purchasing at 45, lab at 80, network at 130) and 12 milestones. Everything is saved in the `ext` block.
- **Movement and camera** (`src/motion.js`): acceleration-limited ranger motion and a damped follow camera with obstacle avoidance.
- **Procedural sound** (`src/audio.js`): WebAudio ambience (wind, rain, water, day/night), footsteps, animal calls and event cues with distance gain and panning. Starts on the first user gesture.
- **Opening and tutorial** (`src/intro.js`): a four-card cinematic flyover on first launch (skip anytime; `?intro` replays it, `?nointro` skips it), then an eight-step tutorial driven by real game state (moving, looking, selecting, feeding, building, photos, missions, activities).

Not verified: real phone hardware, audible audio output, or High-tier post-processing. Regions are labels, unlocks and activities rather than new 3D terrain.

## Milestone 4: sanctuary management depth

New pure-logic module `src/management.js` (hooks into the sanctuary and operations; everything is saved in its own `mgmt` block, so old saves load unchanged).

- **Veterinary care:** five conditions (parasites, respiratory infection, digestive upset, injury, mange). Risk rises with stress, dirt, rain and poor diet. Cases are first only *symptoms*; a vet or check-up notices them, a diagnosis names them, and treatment spends veterinary supplies. Treating without a diagnosis can miss. Contagious illness spreads within a species unless the patient is isolated; vaccines protect for 40 days. Sick animals visibly move slower and rest more in the world.
- **Hygiene and wear:** every enclosure gets dirtier with its residents (elephants most). Dirt raises stress and illness risk. Build items wear down daily; below 25% they stop counting toward habitat needs until repaired.
- **Staff:** new Groundskeeper (cleans and repairs) and Researcher roles. Staff have energy and morale: tired or unhappy staff walk and work slower and take breaks at the shed. Wages rise with skill; staff can be trained.
- **Research:** five projects (rapid diagnostics, hygiene protocols, long-lasting vaccines, welfare science, conservation outreach) funded with money and advanced by researchers studying at the supply shed.
- **Visitors:** four segments (families, photographers, school groups, conservation donors) with different tastes, a daily feedback summary, and new Café and Gift shop buildings that earn extra per visitor.
- **Resource management:** a categorised ledger (tickets, donations, grants, wages, supplies, building, upkeep, research), a 7-day chart and a runway warning. New Health, Budget and Research tabs plus staff energy/morale and visitor segments in the sanctuary panel.

## Milestone 2 and graphics pass: water, shorelines and atmosphere

- **Water** is now a depth-graded, soft-edged shader with animated foam, glints and ripples where the ranger, animals and visitors move through it.
- **Savanna detail** (`src/art/detail.js`): wet shorelines, lily pads, reeds and stones around pools, trampled earth trails, bare dust patches, termite mounds, pebbles, thorn scrub and dead branches, merged so they add very few draw calls. Visitors no longer walk through the ponds.
- **Atmosphere** (`src/art/atmosphere.js`): drifting cloud shadows across the ground, sunlit pollen and dust motes that follow the ranger, and birds soaring over the reserve. All fade out at night and in rain.
- New models for the Café and Gift shop, and looks for the two new staff roles.

Not verified: real phone hardware, the High tier's post-processing, or audible audio. Animal species, buildings and vegetation were already rebuilt in the earlier visual overhaul; this pass did not remodel them.

## Creek falls, cliffs and bridges

- **Waterfall** at the head of the creek: a stepped rock cascade with an animated falling-water sheet (streaks, foam), a plunge pool with the shader water and drifting mist. It is a journal landmark ("Creek falls").
- **Cliff ridges** along the reserve's north and east edges: tiers of weathered boulders with strata colours, built from the same boulder generator as the kopje and merged into one mesh.
- **Plank bridges** across the creek use the Kenney Nature Kit models (CC0, https://kenney.nl; `src/assets/kenney/`), re-tinted to the reserve's timber.

I first tried the Kenney cliff and waterfall blocks as well, but next to the rest of the art they read as flat cardboard boxes, so only the bridges stayed Kenney. Layout is pure data in `src/art/kenney-layout.js` and is tested.

## Milestone 6: QA and polish

Save loading is now defensive (damaged or older saves are repaired, never crash the game), layout was fixed for phones and tablets, and there is an end-to-end QA script (`node tools/qa.cjs <url> <outdir>`) plus a two-year soak test. See [`docs/QA_REPORT.md`](docs/QA_REPORT.md) for what was found, fixed and still unverified.

### Testing tools

* `npm test`: all logic tests, including the two-year soak test, save-compatibility tests and a randomised action fuzz test (`FUZZ_SEEDS=50 npm test` for a longer hunt).
* `node tools/qa.cjs <url> <outdir>`: scripted end-to-end pass on desktop, phone and tablet sizes.
* `node tools/monkey.cjs <url> [seconds] [phone]`: random taps, drags and key presses against the real UI, failing on any page error.

## Claymation look

Inspired by Hollow Tide's "lit clay", `src/art/clay.js` turns every solid surface into hand-pressed plasticine at runtime:

* a procedural fingerprint texture (whorls, thumb dents, tool drags, grit) projected from three axes, as both bump and colour; painted textures are softened toward their average colour so they read as tinted clay
* **boil**: surfaces re-roll a tiny lumpy displacement at 12 fps, and animals and people pose on twos (12 fps) while still moving smoothly
* warm cream key light, violet-tinted shadows, a warm bounce on undersides, a soft rim and slightly wet glints
* big googly clay eyes on every animal
* a film finish over the view: stop-motion grain that re-rolls at 12 fps, a dusky split tone and a vignette

`?clay=0` turns it off for comparison. The Low tier samples the clay texture once instead of three times. In software
rendering the full pass costs about a fifth of the frame; real GPUs should pay less, but this was not measured on a phone.

Diorama pass (closer to Hollow Tide): lumpy clay clouds hung in a storybook sky (periwinkle and peach by day, violet and coral at dusk, indigo at night), a thumb-dented clay moon at night, round "lollipop" clay trees on the horizon, fat rounded clay grass leaves, and banded, saturated clay water (`src/art/claydiorama.js`).
