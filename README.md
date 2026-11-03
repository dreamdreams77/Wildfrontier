# Wild Frontier

A wildlife rescue and conservation simulation with a handcrafted, claymation-inspired 3D art direction.

## Current playable slice
- Full-viewport 3D woodland with sculpted terrain, creek, layered foliage, ranger hut and a walkable-looking recovery yard
- Seven named wildlife residents across six species: white-tailed deer, cottontails, red fox, barred owl, gray squirrel and Carolina wren; each has a habitat niche and daily rhythm\n- Custom modeled woodland creatures with autonomous wandering, hopping, idle poses, sleep states and social proximity\n- Controllable ranger avatar with keyboard movement and a follow camera\n- Walk-in sanctuary and treatment wing with separated care bays, alongside the quiet recovery yard\n- Multi-step rescue and wildlife survey assignments with completion conditions
- Orbit camera, zoom, WASD / arrow-key movement, and clickable animal records
- Individual animal profiles: health, hydration, nutrition, stress, energy, social comfort, personality and daily routine
- Ranger-led rescue progression: sighting → assessment → stabilization → transport → rehabilitation → release evaluation
- Rehabilitation actions: measured feed, fresh water, quiet time and species-appropriate enrichment
- Release standards include health, stress, hydration, nutrition and energy
- Simulated day/night cycle, changing weather, dynamic woodland lighting and visible rain\n- Seasonal ecology shifts, seasonal forage pressure, habitat quality and biodiversity feedback\n- Nocturnal fox and owl routines, dawn songbird calls and species-specific recovery diets
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
