# Wild Frontier visual audit

This audit was produced by `tools/visual-audit.cjs`, which loads the running game in headless Chromium, walks the
three.js scene graph and classifies every mesh. The raw before/after data is in `docs/visual-audit-before.json` and
`docs/visual-audit-after.json`.

## What was actually 3D, and what was not (before)

Everything in the game was already rendered by WebGL, but **none of it was modelled**. The scene was assembled from
primitive solids with flat colours.

| Measure (whole scene) | Before |
| --- | --- |
| Meshes | 4,216 |
| Geometry types | 2,056 spheres, 737 cylinders, 710 dodecahedra, 460 cones, 147 boxes, 81 circles, 13 capsules |
| Skinned meshes / bones | 0 / 0 |
| Textured materials | 0 (421 untextured materials) |
| Textures in memory | 1 |
| Normal / bump maps | none |
| Draw calls per frame | 1,492 |
| Animation | per-part `rotation` sine waves on loose spheres; no skeleton, no blending |
| Water | flat translucent plane |
| Sky | single flat background colour |

| Asset | Before | Verdict |
| --- | --- | --- |
| Woodland animals (18 species) | 16–54 spheres and cylinders each, hard-coded colours | Placeholder geometry |
| Safari animals (8 species) | 50–122 primitives each | Placeholder geometry |
| Ranger | ~10 primitives | Placeholder geometry |
| Staff and visitors | ~10 primitives each, one shared look | Placeholder geometry |
| Trees | trunk cylinders plus dodecahedron "leaves" | Placeholder geometry |
| Buildings (cabin, clinic, lodge, yard, gate, deck) | `BoxGeometry` walls and roofs, no textures | Placeholder geometry |
| Buildable structures (11) | 3–8 boxes/cones each | Placeholder geometry |
| Ground | one vertex-coloured plane with flat circles for patches | Flat |
| Water, sky, clouds, distant landscape | flat plane, flat colour, none, none | Flat |
| HUD portraits and icons | emoji glyphs and CSS gradients (flat) | Flat artwork |
| World map | 2D canvas | Intentionally 2D (it is a map) |
| Photo camera | captures the 3D view | Real 3D |

## What changed

Every asset above was replaced rather than restyled:

* **Animals** are one continuous lofted mesh per animal, skinned to a skeleton (23 bones for mammals, 17–18 for birds),
  with painted per-species coats, bump-mapped fur, ears, tails, trunks, manes, horns, tusks and eyes that blink.
  All 26 species are generated from the data in `src/art/creature-specs.js`.
* **People** (ranger, three staff roles and visitors) share one rigged humanoid with clothing, hats, hair, face and gear.
* **Vegetation** uses bark-textured lofted trunks and branches, displaced painted leaf clumps, wind-animated instanced
  grass and flowers, ferns, reeds, bamboo, acacia and baobab.
* **Buildings and structures** use plank, shingle, thatch, plaster and stone textures, stone footings, framed windows
  and painted signs. All eleven buildable structures were remodelled.
* **Environment**: a two-biome painted terrain with hills beyond the playable area, animated reflective water, a gradient
  sky with sun glow, painted drifting clouds, distant ridges and a treeline, and an environment map for reflections.
* **Lighting**: warm key sun with soft shadows, cool sky fill, hemisphere bounce, time-of-day and season grading, and on
  the high tier ambient occlusion, gentle bloom and a painterly colour grade.
* **Interface art**: animal portraits, journal cards, species lists and build-palette icons are now renders of the real 3D
  models.

## Measured result (Medium tier, headless Chromium, software GL)

| Measure | Before | After |
| --- | --- | --- |
| Meshes in scene | 4,216 | 526 |
| Skinned meshes / bones | 0 / 0 | 37 / 795 |
| Instanced meshes | 0 | 4 (grass, flowers, distant trees) |
| Textured materials | 0 | 71 |
| Textures in memory | 1 | 96 |
| Draw calls per frame | 1,492 | 293 |
| Triangles in scene | 989,863 | 714,835 |
| Triangles rendered in a frame (incl. shadow pass) | 394,053 | 480,179 |

Rendered triangles went **up**: the models are far more detailed. Draw calls, which are the usual mobile bottleneck, went
down by about 80%. Low tier cuts grass, foliage, shadow resolution and pixel ratio further.

## Honest limits

* The models are generated procedurally in code (lofted, skinned, painted) rather than sculpted in a DCC tool. They are
  real meshes with skeletons, textures and animation, but they will not match a studio's hand-sculpted assets.
* No third-party assets are bundled, so there are no extra licences to track.
* Performance was measured in headless Chromium with software rendering. That validates draw calls, triangles and
  correctness, but **not** frame rate on real phone GPUs. The quality governor exists so real devices can step down
  automatically; it needs checking on hardware.
