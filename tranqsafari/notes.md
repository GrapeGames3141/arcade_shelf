# Tranq Safari: design notes

## Pitch
You ride shotgun in an open safari jeep through a prehistoric valley. Dot drives; you hold the tranquilizer dart rifle.
Nothing gets hurt: every dinosaur you dart stumbles, yawns and dozes off where it falls. Keep them off the jeep, rack up
a combo, and when something enormous comes down the river behind you, turn around and put it to sleep.

## Design calls (made without asking; the run was unattended)
- **One level, about 3.5 minutes**, built as a 2.6 km rail with eight sections. The timeline is keyed to distance along
  the rail, not to time, so set pieces always line up with the jeep.
- **The driver is Dot**, on the intercom, with Base (the ranger station) on the radio. Lines show as captions with a
  squelch; the title and pause cards have a "Radio voice: Captions / Spoken" switch for browser speech. Light humour,
  no franchise references.
- **Darts lock on** to the spot under the reticle when fired, so aimed shots land even on moving targets. A shot that
  hits nothing is a miss and resets the combo, which keeps accuracy meaningful.
- **Magazine of 6, 1.35 s reload.** Holding fire keeps shooting at the bolt rate; firing an empty rifle starts the reload,
  and the reticle shows a reload ring.
- **Weak spots count double** (heads; Rumblejaw's throat counts triple and is best exposed when it roars). Bigger animals
  need more darts: raptor and glider 1, crestrunner 2, hornback 4, long-neck 18, Rumblejaw 50.
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

## The run, section by section
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
- A second route (night drive with spotlights) reusing the same rail system.
- Tracker darts on the long-neck for a photo bonus; a photo mode.
- Hand-placed vegetation clearings along the rail so the stampede reads from farther away.
- Copy the findings in AGENTS.md into SPLAT-GUIDE.md (shared root file; left for a session that may edit it).
