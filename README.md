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
- **Touch controls**: drag to look, pinch to zoom, tap an animal for its record, on-screen joystick to walk.

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
