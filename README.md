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
