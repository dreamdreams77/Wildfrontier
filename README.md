# Wild Frontier

A wildlife rescue and conservation simulation with a handcrafted, claymation-inspired 3D art direction.

## Current playable slice
- Full-viewport, real-time 3D woodland with sculpted terrain, creek, layered foliage and a field station
- Custom modeled deer and rabbits, with gentle autonomous rabbit wandering and idle animation
- Orbit camera (drag), zoom (wheel), and keyboard movement (WASD / arrows)
- Clickable wildlife records with individual welfare values: health, hydration, nutrition and stress
- Ranger-led rescue workflow: sighting → assessment → stabilization → transport → rehabilitation → release evaluation
- Release checks enforce welfare thresholds rather than granting an instant reward
- Recovery care actions for measured feed and fresh water
- Habitat management for creekside water quality and native meadow cover
- Field journal, restoration score and responsive mobile/desktop HUD

## Run locally
```bash
npm install
npm test
npm run dev
```

Create a production build with:
```bash
npm run build
```

GitHub Actions runs the simulation tests and production build on pushes to `main` and pull requests.

## Art direction
The goal is a tactile miniature world: soft forms, imperfect silhouettes, warm directional light, matte materials, layered depth and individually composed environments. Kenney-style simplicity is a useful modelling reference, not the final visual identity.

## Next systems
1. More detailed animal rigs, species-specific behavior and social needs
2. Deeper rescue transport and rehabilitation spaces with visible world-state changes
3. Habitat food webs, seasonal needs and population balance
4. Soundscape, day/night cycle and weather that affect animal behavior
5. More species with distinct movement, care plans and release requirements
