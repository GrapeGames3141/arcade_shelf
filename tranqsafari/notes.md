# Tranq Safari: design notes

## Pitch
You ride shotgun in an open safari jeep through a prehistoric valley. Dot drives; you hold the tranquilizer dart rifle.
Nothing gets hurt: every dinosaur you dart stumbles, yawns and dozes off where it falls. Keep them off the jeep, rack up
a combo, and when something enormous comes down the river behind you, turn around and put it to sleep.

## Design calls (made without asking; the run was unattended)
- **The first route is about 3.5 minutes**, built as a 2.6 km rail with eight sections. The timeline is keyed to distance along
  the rail, not to time, so set pieces always line up with the jeep.
- **The driver is Dot**, on the intercom, with Base (the ranger station) on the radio. Lines show as captions with a
  squelch; the title and pause cards have a "Radio voice: Captions / Spoken" switch for browser speech. Light humour,
  no franchise references.
- **Darts lock on** to the spot under the reticle when fired, so aimed shots land even on moving targets. A shot that
  hits nothing is a miss and resets the combo, which keeps accuracy meaningful.
- **Magazine of 6, 1.35 s reload.** Holding fire keeps shooting at the bolt rate; firing an empty rifle starts the reload,
  and the reticle shows a reload ring.
- **Weak spots count double** (heads; Rumblejaw's throat counts triple and is best exposed when it roars). Bigger animals
  need more darts: raptor, glider and nipper 1, crestrunner 2, hornback 4, Clubtail 14, long-neck 18, Rumblejaw 50, Sailback 72.
- **The camera turns toward the reticle** (aim parallax up to 30 degrees, more in portrait), looks up at the long-neck
  as the jeep passes under it, and turns all the way around for the river chase.
- **Raptors climb on the jeep** at five visible points (hood, fenders, rear in the chase). A red ring with a shrinking arc
  shows how long you have before one climbs in. Darting a clinging raptor is a "close call" bonus.
- **Duct tape** patches the jeep between sections (+12, +15 before the chase), so a rough first half doesn't end the run.
- **Rumblejaw can be escaped**: if the jeep reaches the outpost gate first, the run still completes ("Made it out"), just
  without the 5,000-point doze bonus.
- **Original cast** with invented names and looks: Raptor (striped, sickle claw, small red quills), Crestrunner (teal with
  a yellow crest), Hornback (terracotta, banded frill, back knobs), Long-neck (grey-green mottled sauropod), Glider
  (pterosaur with a red and teal crest), Rumblejaw (charcoal-green big predator with rust stripes and red quills).
- **Difficulty** Easy / Normal / Hard changes damage, cling time and Rumblejaw's pace. Touch adds aim speed and an
  optional auto-fire (fires when the reticle is on an awake animal).
- **Settings are buttons**: difficulty, quality (Low, Med, High, Max), sound, music, radio voice, touch aim speed and
  auto-fire. URL flags exist only for headless tests.

## Route 2: Dusk Delta (added on request: "add another level and improve graphics a bit")
Design calls made for it:
- **A second route, not a longer first one.** The title card has a Route switch (1 Valley Run, 2 Dusk Delta); the picked
  route is remembered, each route keeps its own best score, and the results card offers the other route.
- **It is the night drive from the ideas list**, told as one evening: sunset in a cypress mire, last light on the
  mudflats, lava fields after dark, then a lagoon by moonlight. The light changes with distance along the rail, so the
  scenery and the sky always agree.
- **Headlights and a torch on the rifle** fade in as the sun goes down. The torch follows the reticle, and animals' eyes
  shine back when a lamp is on them, which is how you spot nippers in the dark.
- **New cast, new rules** rather than more raptors: Nippers (small pack hunters, one dart each, up to seven at a time
  on ten small perches), the Clubtail (armoured roadblock: the jeep has to stop, darts glance off the shell, the head
  and legs are soft, and its tail club swings unless you interrupt it), and the Sailback (it swims beside the sand
  bar, so only what is above water can be hit; it rears out of the shallows to bite, and its open mouth counts triple).
- **Three long-necks wade on the mudflats** as scenery and optional 18-dart targets; nothing on this route crosses the
  road the way the valley long-neck does.
- **The Sailback can be escaped** like Rumblejaw: reach the lighthouse station and the run completes without the bonus.
- **Rank bars are slightly lower** on this route (S 50k, A 32k, B 18k, C 9k) because it has fewer targets.

| distance | section | what happens |
|---|---|---|
| 0-110 m | Dock | Dot's evening briefing; low sun through the trees |
| 110-520 m | Cypress mire | causeway through swamp water; nipper packs of 5, 7 and 6, gliders, raptors; fireflies as the light drops |
| 520-920 m | Mudflats | three long-necks wading; a small crestrunner herd crosses; gliders, raptors, more nippers |
| 920-1335 m | Ember fields | lava channels, burnt trees, steam vents, ash; raptors in the headlights; the Clubtail roadblock at 1150 m with nippers harassing the stopped jeep |
| 1335-2430 m | Moon lagoon | the road runs along a sand bar; the Sailback stalks alongside, rears up and lunges; glowing plankton in its wake; nippers and gliders as mop-up |
| 2430-2500 m | Lighthouse station | results |

## Graphics pass (both routes)
- Light shafts from the sun or moon through trees and clouds; split-tone grading and a little more contrast.
- Derivative bump on terrain, rock and dinosaur scales; wet sheen on ground near water and on hides below the water line.
- Grass tufts and base-to-tip gradients on blades; palms, cypresses with hanging moss, lily pads, burnt snags.
- Spot lamps (headlights, torch) lighting terrain, plants, animals, water and dust; eyeshine.
- Stars, a moon, a glowing crater and lava after dark; water that carries flow, murk and depth per vertex.
- The jeep got a windscreen pane, grille, headlamp rims, tow hooks and lit gauges.

## Route 1: Valley Run, section by section
| distance | section | what happens |
|---|---|---|
| 0-90 m | Ranger gate | Dot introduces herself; three practice boards (bullseye counts extra) |
| 90-440 m | Tall grass | raptor waves of 1, 2, 3, 2 burst out of the grass and try to jump on the hood and fenders |
| 440-620 m | Meadow | a long-neck walks across the road; the jeep slows to 4 m/s and passes under its belly between its legs; two gliders perched on its back take off and dive; optional 18-dart bonus doze |
| 620-1000 m | Fern forest | five raptor waves of 2-4 from the ferns, dappled canopy shadow |
| 1000-1290 m | Gorge | cliff walls; four waves of circling gliders dive at the jeep |
| 1290-1640 m | Plain | a herd of crestrunners and hornbacks crosses the road; five hornbacks charge the jeep |
| 1640-2500 m | Riverbed | Rumblejaw bursts from the bank, roars and chases the jeep through the shallows; the camera faces backward; helper raptors climb on the rear, gliders dive |
| 2500-2600 m | Outpost | huts, fence and flag; results |

## Rumblejaw
- Follows the rail behind the jeep, weaving, at a gap that closes toward 9.5 m. Inside 12.5 m it rears up and roars
  (windup, throat exposed, "THROAT!" under its ring), then lunges for the tailgate.
- Three dose during the windup or lunge interrupts the bite (+150). Bites cost 20 health.
- At a third and two thirds of its sleepiness bar it staggers back and roars; at full it wobbles, collapses into the
  river with a big splash and snores.

## Scoring
Hit 25, weak spot +50, doze bonus by species, close call +100, stopped charger +100, interrupted bite +150, all times the
combo multiplier (x1 to x5, +1 per four hits in a row). Results add accuracy x 2000 and jeep health x 15. Ranks S / A / B
/ C / D at 55k / 35k / 20k / 10k.

## Look
Painterly Gaussian-splat grass, ferns and foliage (SPLAT-GUIDE recipe: lobed daubs, blade splats with anchored bases and
tip sway, translucent backlit leaves, alpha-to-coverage), lit mesh terrain with brush noise, SDF-skinned dinosaurs meshed
with surface nets (mytharium's approach), a smoking volcano and ridges in the sky, HDR with ACES and bloom, a
canvas-weave overlay.

## Ideas for later
- A third route (a canyon in the rain, or a snowfield) reusing the level system; see "Adding a route" in AGENTS.md.
- Tracker darts on the long-neck for a photo bonus; a photo mode.
- Hand-placed vegetation clearings along the rail so the stampede reads from farther away.
- Copy the findings in AGENTS.md into SPLAT-GUIDE.md (shared root file; left for a session that may edit it).
