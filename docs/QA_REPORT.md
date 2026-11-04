# Milestone 6: QA and polish report

What was checked, what was found and fixed, and what was **not** verified.

## How it was tested

* `npm test`: pure-logic tests for every system, including two new suites:
  * `tests/soak.test.js` runs a fully staffed sanctuary (every system on) for **730 simulated days**, checking after every 25 days that no stat is NaN or out of range, stock is never negative, histories stay bounded, no animal vanishes and the save stays under 600 KB. It also checks that save, restore, save again is lossless.
  * `tests/saves.test.js` loads saves from older releases (no extension blocks, no energy/morale/condition, no equipment stock), saves with unknown future fields, and **deliberately damaged saves** (wrong types, nulls, missing animals, corrupt blocks).
* `tools/qa.cjs`: drives the real UI in headless Chromium on a **desktop (1280×800)**, an **iPhone-sized touch device (390×844)** and a **tablet (820×1180)**. 111 checks per run, including: boot, every HUD button visible and not covered, movement (keyboard or press-and-hold), tapping an animal, all ten sanctuary tabs rendering and fitting the screen, buying supplies and hiring through the UI, placing a structure by tapping the ground, missions tabs, journal, map, photo mode, speed control, reload persistence, GPU resource stability, and no page or console errors.
* `tools/visual-audit.cjs` and the screenshots in `docs/images/` for visual checks.

## Bugs found and fixed

| Found by | Problem | Fix |
| --- | --- | --- |
| Damaged-save tests | `restore()` threw on a wrong-typed or missing field and could leave the game half-restored | Restore now validates every field, repairs or drops bad parts, resets only a damaged extension block, and rolls the whole game back if anything still fails. A refused save is kept as `wildfrontier.sanctuary.v1.backup` |
| Damaged-save tests | A corrupt case list or journal entry crashed later gameplay | Management, operations, rescue, director, activities and journal restores all sanitise their data |
| Phone QA | The Map button was pushed off the right edge of the top bar and the date text was clipped | Compact top bar below 560 px |
| Phone QA | The page could be scrolled sideways (the hidden inspect panel was positioned outside the screen) | `#app` is now the positioning context and clips it |
| Phone QA | In build mode the camera target sat directly behind the build panel, so the natural place to tap was covered | The view shifts so the target stays visible above the panel on portrait screens |
| Tablet QA | The reserve rail, the tutorial card and the open record covered the Safari and Build buttons | Rail moves to the bottom-left and the tutorial moves below the quick bar between 761 and 1100 px; tutorial sits above the bottom bar on desktop |

## Measured (headless Chromium, software rendering)

| Measure | Result |
| --- | --- |
| Checks passed | 111 / 111 (desktop, phone, tablet) |
| Draw calls per frame | about 330 desktop Medium, about 170 phone Low, about 205 tablet |
| Triangles per frame | about 325k desktop, about 240k phone |
| Script cost per frame (rendering stubbed, 36 animals, 6 staff, 14 visitors) | about 2.2 ms on this machine |
| GPU resources while idle | stable (no growth after start-up) |

## Not verified

* **No real phone or tablet was used.** Touch was emulated, and rendering used a software GPU, so real frame rates, thermals, battery use and memory pressure are unknown. The script cost above is a CPU number on a desktop-class machine; a phone will be several times slower.
* High-tier post-processing was not exercised in the automated run.
* Audio was exercised for errors only; nobody has listened to it.
* Safari and Firefox were not tested (Chromium only).
* The tutorial and opening cinematic were checked lightly.

## Bug check and code clean-up (follow-up)

A lint pass (unused and undefined names, duplicate keys), a randomised action fuzz test (`tests/fuzz.test.js`, `FUZZ_SEEDS=50` for a longer run) and a random-input UI test (`tools/monkey.cjs`) were run over the whole code base.

Real bugs found and fixed:

| Found by | Problem | Fix |
| --- | --- | --- |
| Fuzz | Buying supplies with a non-numeric quantity, or setting a non-numeric ticket price, turned the funds into `NaN` and broke the economy permanently | `spend` and `earn` reject non-finite amounts; `buyFood` and `setPrice` validate their input |
| Fuzz | Importing a founder with an invalid sex charged the credits and then crashed | Input is validated before any credits are spent |
| Fuzz | Feeding an animal an unknown food, or interacting with an unknown field spot, threw | Both are handled |
| Lint | The journal restore declared the `behaviours` key twice | Removed the duplicate |
| Lint | A treated case restored without its starting severity could produce `NaN` severity | Restored with a safe default |

Clean-up: 60 unused imports, variables and write-only variables removed, plus about 10 unused exports (including two unused canvas textures, an unused skinned-mesh helper and a material-cache helper). Lint is now clean for `src/`.

Still not verified: real phones or tablets, Safari and Firefox, and audible audio.
