# Reef Aquarium (saltaquarium) — notes for agents

`saltaquarium.html` is a single-file WebGL2 reef tank: corals, anemones, clams, rock and sand you can arrange, plus fish, shrimp,
crabs, snails, starfish, urchins, jellyfish and a mantis shrimp that all behave on their own. It started as a copy of
`aquarium\aquarium.html` (the axolotl tank) with the pet removed: every animal is treated the same, and the top-left card is a
**tank card** (Fed / Water / Corals) instead of a pet card.

Players never need URL flags. Everything (light preset, background, flow, quality incl. **MAX**, follow camera) is set from the
in-page buttons. URL flags (`?test`, `&seed=1`, `&q=`) are for headless tests only.

## Building

The HTML is generated. Edit the files in `parts\`, then run `python build.py` (it concatenates `parts\*` in name order into
`saltaquarium.html`). Never hand-edit `saltaquarium.html`.

| Part | What is in it |
|---|---|
| `00-head.html` | Page, CSS, HUD markup (tank card, view buttons, bottom bar, sheets, help) |
| `01-core.js` | Math, noise, `MB` mesh builder, `tube()`, `icosphere()`, logging (`[SA]` prefix), RNG |
| `02-shcommon.js` | Shared GLSL: uniforms (`C_UNI`), lighting, shadows (PCSS), caustics, water fog, `perturb()` bump |
| `03-shstd.js` | Standard surfaces: sand (`sandMat`), rock (`rockMat`), background, room, stand, LED fixture, powerheads |
| `04-shcoral.js` | `VS_CORAL` (sway, flow surge, xenia pulse, retraction, clownfish push) and `FS_CORAL` (one branch per species) |
| `06-shfish.js` | Fish vertex animation and per-species colour patterns (`uSp` 0–11) |
| `07-shcrit.js` | Shrimp, snails, food, crabs, stars, urchins, jellies, mantis (`kind`/`pat`) |
| `08-shpost.js` | Billboards (plankton, bubbles), surface, glass, post (SSAO, DOF, shafts, bloom, ACES) |
| `10-gencorals.js` | `TK` tank constants, `CSP` coral species ids, helpers (`blob`, `leaf`, `crs`, `tentPts`, `polypCrown`) and stony coral generators |
| `10b-gensoft.js` | Soft corals, anemones, algae, dusters, clams |
| `11-genrock.js` | Live / dry / shelf rock, rubble, arch, cavity AO |
| `13-gendecor.js`, `14-gentank.js` | Powerhead, overflow box, tank and stand |
| `16-genfish.js` | `FISHP` body/fin parameters per species and `genFish()` |
| `17`–`19` | Shrimp, snails, food, crabs, stars, urchins, jellies, mantis geometry |
| `20-world.js` | Sand height field, `CAT` catalogue (all placeable items, morphs), placement (`itemY`, `addItem`, `topH`) |
| `30-life.js` | Species tables (`FISHSP`, `SHRIMPSP`, `CRABSP`, `CRAWLSP`, `JELLYSP`, `MANTISSP`, `FOODS`), all behaviour, `TANK` care, `FLOW` |
| `40-render.js` | `QUAL` tiers, `LIGHTS` presets, programs, instancing, render passes |
| `50-ui.js` | Starter scape (`defaultTank`), save/load (`salt-aquarium.v1`), sheets, picking, follow camera, test API `window.SA` |

## Catalogue

* **Stony:** Acropora, Birdsnest, Montipora cap, Brain (Truchet maze), Torch, Hammer, Frogspawn, Candy cane, Goniopora, Chalice,
  Duncan, Acan, Sun coral, Elegance, Scroll (Turbinaria), Bubble, Plate.
* **Soft:** Zoanthids, Mushrooms (Discosoma / Ricordea / Rhodactis), Toadstool leather, Pulsing xenia, Green star polyps, Clove polyps,
  Kenya tree, Gorgonian fan.
* **Anemones & more:** Bubble-tip anemone (clownfish host), Carpet anemone (host), Rock flower anemone, Giant clam, Disco clam,
  Feather duster, Tube sponge.
* **Algae:** Seagrass, Halimeda, Red macroalgae.  **Rock:** Live, dry, shelf, rubble, arch.  **Equipment:** Wavemaker, overflow.
* **Fish:** Ocellaris clown, Green chromis, Yellow tang, Blue tang, Royal gramma, Firefish, Flame angel, Banggai cardinal,
  Six-line wrasse, Mandarin dragonet, Lawnmower blenny, Valentini puffer, Lyretail anthias, Copperband butterflyfish,
  Yellow watchman goby (15 species).
* **Inverts:** Skunk cleaner, fire, peppermint, coral-banded and tiger pistol shrimp; scarlet and blue-leg hermits, emerald crab; nerite, turbo,
  trochus and nassarius snails; blue Linckia, Fromia, sand-sifting and brittle stars; tuxedo and Diadema urchins; moon jelly,
  upside-down jelly (Cassiopea); peacock mantis shrimp.

## Attribute layouts

* Coral meshes: `aCol.rgb` = morph displacement (xenia pulse, duster and clam retraction, driven by `uMorph`), `aCol.a` = sway;
  `aExt` = (phase, species id, ao, part + 0.9·t) where t runs 0 at a strand's base to 1 at its tip. The shader reads
  `part = floor(aExt.w)` and `tf = fract(aExt.w)/0.9`. Colours come from per-item uniforms `uC1..uC3`, fluorescence from `uFl`
  (rgb + strength), and `uKind` picks a sub-type within a species.
* Instances (fish and critters): `mat4` + `iA` + `iB` vec4 per instance (see `setInst`).

## Adding a coral

1. Give it an id in `CSP` (`10-gencorals.js`).
2. Write `genX(seed)` that fills an `MB` with the attribute layout above (reuse `tube`, `leaf`, `polypCrown`, `blob`).
3. Add a branch `else if(sp==ID){...}` in `FS_CORAL` that sets `alb`, `h` (bump), `rough`, `spec`, `trans` and `fm`
   (fluorescence mask).
4. Add a `CAT` entry in `20-world.js` with `morphs:[M(name,c1,c2,c3,fluor,strength,kind)]` (sRGB hex).
5. Keep it under ~35 k triangles: every item is drawn again for the shadow map.

## Test recipe (headless)

The harness used during development is in `test\shot.js` (Playwright + SwiftShader; paths inside are for the cloud build box, so
adjust `require` and `executablePath` locally). It opens `saltaquarium.html?test&seed=1`, waits for `window.SA.ready`, runs a JSON
list of steps (`{"eval":"...uses A..."}`, `{"step":sec}`, `{"shot":"name"}`), writes PNGs and a `-log.txt`.

`window.SA` (test API): `state()`, `step(sec)`, `cam({target,yaw,pitch,dist})`, `snap()`, `add(kind,x,z,opts)`, `remove(id)`,
`clear()`, `items()`, `select(id)`, `feed(type,x,z)`, `glassTap(x,y,z)`, `mode(m)`, `view(v)`, `key(k,down)`, `fs()`,
`animals(kind,sp,n)`, `mantis(n)`, `place(list,kind,sp,pos)`, `follow()`, `set(k,v)` (incl. `set('q','max')`), `sandShape(s)`,
`frame()`, `thumb(kind)`, `pix(x,y)`, and `_eval(src)` in test mode.

A starter-tank frame is about 2.4 M triangles on High/MAX (incl. shadow pass); Medium leaves corals with a footprint under 7.5 cm
out of the shadow map (about 1.8 M) and Low leaves all corals out (about 1.6 M). Auto-downgrade at start-up never touches MAX. SwiftShader needs a long screenshot timeout (the harness uses 180 s).

## Behaviour notes

* Clownfish host in the nearest bubble-tip or carpet anemone; cleaner shrimp run cleaning stations; tangs and blennies graze rock;
  the puffer hunts snails and peeks at the camera; the mandarin hops; the mantis peeks from a burrow and strikes.
* Polyp corals with `nightClose` in `CAT` (green star polyps, clove polyps, Goniopora, bubble coral deflating its vesicles, the bubble-tip anemone drawing its tentacles in by about a third; xenia stops pulsing and folds) pull their polyps in at night: their
  stalk and tentacle vertices carry a displacement to the polyp base in `aCol.rgb`, driven by `it.retract` (`uMorph`), which
  `sessileUpdate` eases toward 1 under moonlight at about a quarter per second.
* The watchman goby gets a burrow on open sand near the rock foot (`findBurrow`, drawn as a dark hole with the wafer disc mesh,
  `iB.w=1`). It perches at the mouth, darts out for nearby food, hides (`f.hidden`, not drawn) when the glass is tapped or at
  night. A pistol shrimp shares the first goby's burrow and cycles out, bulldozing, and back in (`s.hidden` while inside).
* At night (Moonlight, or the auto day cycle) every fish except hosted clownfish picks a spot of open sand at the foot of a rock
  and hovers there almost still (`f.bed` in `fishUpdate`); brittle stars come out.
* Snails graze all four panes (on the back glass below 45 % and on the front below 60 % of the water height, so they do
  not seem to float in open water); sea stars and urchins use only the side glass. On the back glass they read as floating in open
  water against the background, and on the front pane a 14 cm star or an urchin's underside blocks the view.

## Realism notes (what the reference photos taught)

* **Live rock** is tan-brown stone, porous at every scale, with crisp-edged purple / rose / lilac coralline crusts on the upper faces
  and brown-olive turf elsewhere. Per-feature anti-alias fades (`FD(freq)`) keep distant pores; bump uses only features a few
  pixels wide (`FB`), finer ones turn into 2×2 derivative blocks.
* **Bump aliasing**: features whose edges are much sharper than their cell (pores, crust outlines) must fade out of the bump
  height at about three times their cell frequency (`FB(3*f)`), or their derivatives turn into dotted 2x2-block lines. Never call
  `smoothstep(e,e,x)` (an empty pore cell with size 0 did this): it is undefined in GLSL and drew dotted lines along Voronoi edges.
* Live rock carries a few stubs of old coral branches (`genRock`, variants 0 and 1), found by picking the vertex furthest along a
  random upward direction and growing a short noisy tube out of it.
* **Scape**: rock is stacked from medium pieces and capped at about two thirds of the water column; corals are placed on the front
  lip of a ledge at a chosen height (`P(kind,x,h)` in `defaultTank`) so they face the viewer.
* **Brain coral** uses Truchet quarter-arcs in a warped azimuthal mapping: even valley widths, loops, and septa from the arc angle.
* **Torch** tentacles are slender and swell slightly at a pale tip; **BTA** tentacles have the bulb near the end with a short
  glassy tip; **frogspawn** ends in knob clusters; **zoanthid** skirts are slim pointed tentacles cupped up around the disc.
