# Salvage Run — design notes

Brief (user, 2026-11-27, scheduled build): on-rails space shooter. You're the gunner on a junky salvage tug flying a fixed
route through a drifting debris field: a ship graveyard, an asteroid belt, an ice ring. The tug flies itself; the player only
aims and fires. Targets: debris, rocks, other salvage, and some kind of alien monster. Signature mechanic: a lock-on volley
(sweep up to 8 targets, release to fire homing shots, longer chains score more) plus normal rapid fire. One level of 3-4 minutes
with a climax, score, chain/combo multiplier, hull health, results screen and retry. Grumpy tug pilot on the radio.
Look: Gaussian-splat nebulae, dust and gas; lit meshes for rocks, hulls and the tug; HDR with bloom. Original art only.

## Design calls made in the unattended run
- **Camera**: third person, behind and above the tug, so the hero tug (a lit mesh) is always in shot. The camera leans a few
  degrees toward the reticle. During the climax it rises and frames the wreck.
- **Tug and crew**: the tug is the *Second Mortgage*; the pilot is **Gus**, who calls the player "kid". The last wreck is the
  freighter *Corvina Sunrise*. The creature is **Old Grabby** ("I thought Old Grabby was a bar story!"). All names invented.
- **Score = credits.** Hazards give points; salvage bursts into glowing pickups that a tractor pulls to the tug, and each one
  pays its value times the combo multiplier at the moment it reaches the tug.
- **Two multipliers**: a combo multiplier (×1 to ×8, +1 per 6 kills, kills must come within 2.6 s, a hull hit resets it) and the
  volley chain (k-th kill of one volley scores ×k, up to ×8; 8 kills from one volley = FULL HOUSE +1000 × combo).
- **Mouse**: left button rapid fire, right button hold-and-sweep lock (default). A settings button switches to "hold left"
  (tap fires, hold > 0.22 s paints locks), because the brief can be read either way.
- **Touch**: drag anywhere for relative aim (×1.55 × drag speed setting), FIRE (hold) and LOCK (hold) under the right thumb,
  AUTO toggle (fires whenever the reticle sits on a target; on by default on touch devices). Lock pad is wider on touch (44 px).
- **Fixed run**: the route, waves and ambient trickle are the same every run (seed 1), so the level is learnable and scores
  comparable. `?test&seed=N` changes it for tests only.
- **Difficulty**: no difficulty select. Hull 100; damage 5-20 per hit; patch kits drop from about 1 in 5 cargo pods (+15 hull,
  or 200 cr if the hull is full). Red brackets mark anything on a collision course.
- **Hull mites** ride debris (they leap at 100-110 m) and fly in swarms that break up 85 m out. Engine cores explode with a
  30 m blast that chains through nearby junk ("CHAIN REACTION").
- **Climax**: the tug stops 140 m from the wreck and strafes. Phase 1: four tentacles, three glowing nodes each (6 hp); they
  wind up (nodes flare, warning sound) and slap the tug, or throw hull plates. Killing a node makes the tentacle recoil; all
  three severs it. Phase 2: the head rises from the breach; six eyes (12 hp, blink shut and are immune while closed); it spits
  bile globs and releases mite swarms. Phase 3: the maw opens on a glowing core (64 hp) and inhales — a PULLING US IN bar fills
  in 13 s; full = chomp (22 damage), bar drops to 35%. Kill the core: explosions, then a 40-gem jackpot (5,000 cr) and +5,000
  boss bonus plus 25 cr per hull point.
- **Ranks** (wins only): thresholds measured from headless bot runs, see AGENTS.md. A lost tug shows "—".
- **Sound**: all procedural WebAudio (no files). Music is a small step sequencer: chords, bass, arpeggio; kick and hats join
  in the belt; the boss gets a faster, driving pattern. The pilot voice (speech synthesis) is off by default.

## Campaign update (user, 2026-11-27)
Request: "Add levels and upgrades between levels. Maybe alternative fire modes on a toggle as upgrade etc." Asked about the
structure, the user chose **today's run + new levels**: keep the first run as level 1 unchanged and add new areas after it,
each with a boss.

Design calls:
- **Four levels**, each 3 zones and a boss: 1 the Corvina run (unchanged), 2 **Kessler Breaker Yard** (an abandoned automated
  scrapyard station: conveyor lines, crushers, a girder spine to fly through, a turning habitat wheel; mines, sentry drones,
  red tanks, vaults), 3 **the Comet Tail** (the bright coma with dirty ice and crystals, then low over the crust of comet
  Halvard with gas jets that throw rocks), 4 **the Nest** (the hollow asteroid Grabby came from: egg-covered rocks, spitters,
  a flesh tunnel, the brood chamber). Gus explains each one on the radio.
- **Bosses**: the Foreman (a breaker robot whose glowing joints are the weak points, then a reactor that vents open and shut
  while a magnet drags the tug in), the Gulper (a worm that leaps out of the crust with a warning ring; shoot the gills while
  it is in the air, then it rears up), the Matriarch (Grabby's mother: six tentacles, eight eyes, throws eggs).
- **Money = score.** A win pays the full score into the wallet, a loss pays half ("insurance"), so a failed run still helps
  and the hangar is never a dead end. Level bests stay per level; the campaign total is their sum.
- **Upgrades** are tiered and priced so one good run buys two or three things and the whole hangar takes the campaign plus
  some replays (about 2 million credits in all). Fire modes are one-off purchases that stay toggleable in flight; the cannon
  is always fitted. The starting mode is whatever was used last (or EQUIP in the hangar).
- **Fire modes** each have a job: scatter for swarms and close junk, the beam for one tough target (but it overheats), flak for
  clusters at range. Toggle: Q / E / Tab / 1-4, mouse wheel, middle click, touch MODE, gamepad Y.
- **Shield** is an upgrade, not a pickup: it eats one hit and recharges, and a shielded hit does not break the combo.
- **Level select** replays any unlocked level; NEW CAMPAIGN asks twice and keeps the bests.
- **Balance**: levels 2-4 assume some upgrades. Measured with the headless bot (AGENTS.md): a good bot wins every level with
  no upgrades; a slow bot needs plating and the deflector for level 2 and more for level 4.
- **Bug fixes found on the way** (also in level 1): the boss reset deleted its own hit and kill hooks; the camera moved twice
  with the boss pull and ended up in front of the tug.

## Ideas not built (ask before adding)
- Route branches chosen by shooting a beacon; more levels (a ring city, a dying star).
- Co-pilot banter tied to the player's score; a photo mode; online leaderboard via the arcade relay.
- Sell-back or respec in the hangar; a hard mode with no insurance.
