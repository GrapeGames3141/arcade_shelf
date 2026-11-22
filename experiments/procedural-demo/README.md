# Volcanic Island Walk

Open [procedural-demo.html](procedural-demo.html) directly in a current WebGL 2 browser. It is an offline, code-only scene with no downloads or runtime assets.

It opens in Walk mode on the beach. Use WASD to move, Shift to move faster, Arrow keys or drag to look, and the MOVE/LOOK pads on touch devices. Swimming begins automatically in deep enough water. The outer reef permits lagoon and shallow-sea swimming but smoothly blocks travel into the deep ocean. Aerial, Strand, Reef, Falls, Stream, and Lava are composed orbit and landmark buttons. Walk or `R` resumes first-person play at the current position. SOUND is gesture-gated and then toggles mute. GROWN TREES switches the broadleaf trees between the grown trees and the classic ones. QUALITY steps through low, medium, high and max: the island regenerates, and the device remembers the choice. The button also shows the frame rate.

The scene generates eroded volcanic terrain, a reef shelf, coastal and forest plants, forked broadleaf trees, shore objects, wildlife, animated water, waterfall and lava landmarks, moving weather, contact and sun shadows, and synthesized surf, wind, landmark and footstep audio at runtime. A compact generated signed shoreline-distance/normal field is shared by CPU walking, wet-sand history, mark removal, audio, and the water shaders: it guides short incoming swash, sheltered lagoon water, outer-reef breaks, thin torn foam at advancing fronts, and draining afterwash. Sand is procedural carbonate/mineral grain with restrained beach ripples and a polished wet swash zone. Bare footprints and kicked sand follow the terrain; a wetting wave erases a contacted mark in about 0.11 seconds while dry marks persist. `?view=0`, `?view=1`, and `?view=2` open orbit views. `?test=swim`, `?test=falls`, `?test=stream`, and `?test=lava` provide deterministic test positions. `?test=forest` and GROVE open the canopy review. `window.ISLAND.state()` exposes current play state and `window.ISLAND.testSpawn(x,z)` supports local testing.

See the optional [island tour](evidence/island-tour.mp4), [shore surf](evidence/shore-surf.mp4), [wave wash](evidence/wave-wash.jpg), and [tree approach](evidence/tree-approach.mp4). Coastal sediment colour and carbonate/sand-bar variation were checked against [USGS Honokōhau sediment Fig. 16](https://pubs.usgs.gov/of/2008/1191/).

The current systems comparison is available as [island systems](evidence/island-systems.jpg).

## Coastal sand and surf

Beach material uses a small mipmapped procedural field. Multiscale pale carbonate grains, sparse darker volcanic chips, locally sorted coarse inclusions, and shadowed shell edges sit in interrupted wind-ripple patches. The ripples occupy dry backshore, while the signed shoreline field compacts and darkens the foreshore into a smooth damp sheen.

Incoming exposed-shore sets use three connected, coastline-following crest ribbons with ten cross-profile vertices. A shared shoreline phase drives the rounded shoal, forward-curled lip, collapse, water height, footprint wash, and surf audio. The lip occupies the final 7 m offshore, and the water surface carries its aerated trail shoreward. In a console, `ISLAND.state().surf` reports the static ribbon topology, phase period, and active shore band for a quick clear-weather check.

[Start at the surf](procedural-demo.html?test=wave) opens a walk-height side-on breaker check beside the starting beach. The accompanying [sand and surf evidence](evidence/sand-and-surf.webp) shows the procedural grain, interrupted ripple patches, rolling green face, and soft foam touchdown.

[Start at the lagoon](procedural-demo.html?test=lagoon) frames the enclosed eastern water from its sheltered bank. The [lagoon and outer surf comparison](evidence/lagoon-and-outer-surf.webp) records its gentle wind ripples beside the exposed break.

## Grove and lava landmarks

GROVE opens a walk-height grassy lowland, and `?test=forest` opens the same reachable clearing. LAVA frames the sea entry, while VENT opens the source headland. `?test=lava` and `?test=vent` provide those deterministic landmark views. The lava follows the sampled terrain continuously from its fissure to the shoreline.

Clearings use dense, wind-animated folded grass clumps while canopy cover leaves warm litter visible beneath the trees. Broadleaf crowns are assembled from deterministic reusable trunk and arm modules, placed by seeded root graphs with tiered socket heights, varied azimuths, terminal tip arms, tapered twiglets, petioles, and cambered blades.

Individual cambered, petioled blades have raised midribs, varied pitch and roll, common-shoot flutter, and diffuse backlighting. Deterministic module and root variation adds mature olive and deep greens alongside a restrained young yellow- and copper-green flush. The state report exposes active module/root counts and current detail/far representation state.

The shared low-poly modules are driven per root by the same seeded branching grammar: arm count and tier spacing determine real parent-to-socket arm placement. Thus neighboring trees do not resolve to the same normalized silhouette, while trunks, foliage, and the far representation remain aligned to the same generated structure. Detail selection uses the active camera FOV and projected distance, never a nearest-tree count cap. Rich foliage overlaps its own directional arm atlas while subpixel blades dither out; every far atlas frame is rasterized from the active arm geometry rather than being a separately painted crown. `ISLAND.state().canopy` reports actual generated counts, representative grammar parameters, and the active detail, far, culled-detail, and transition-continuity state.

## Island systems pass

A shared world-space gust train travels continuously along the trade wind with calm gaps. The identical field drives lagoon ripple detail, palm leaflets, near and far broadleaf motion, grass, their shadow geometry, and the wind/rustle mix. `ISLAND.state().islandSystems.gust` samples its CPU counterpart.

Before branch sockets are grown, a compact root-density light field is baked from the seeded forest. Each arm compares local left/right opening samples, turns only toward the brighter local gap, and rescales after that choice; the exact arm list supplies both detailed geometry and far cards. The same light sample favors upright three-leaf seedlings and grass in clearings, while shaded roots receive clustered folded leaf litter.

The shoreline field supplies zero-coast samples for a 4.1-second reconstructed swash history. It records maximum run-up across representative 35--60 second incoming sets and seeds that strandline with clustered 1--3 cm shell/charcoal grit plus connected seaweed wrack; sparse intertidal basalt bakes directional lee receivers for retained foam and deposits. The water pass carries a finite, seaward-advected afterwash with sideways tears, rather than coating the whole beach.

The reef remains the same analytic movement barrier but is visibly a shallow shelf only below the signed coast and within its irregular outer limit. Its common angular channel function cuts gaps through both the breaker ribbon and reef habitat. Cached colony cells bake the broad relief; close refracted water adds lobed coral tips, dark crevices, pale sand channels, and restrained reef-only caustic glints. `?test=wind` frames grass, palms, and lagoon for the common gust-field check. `ISLAND.state().islandSystems` reports generated deposits, outcrops, seedlings, and a live gust/light sample.

Evidence: [forest](evidence/forest.jpg), [lava](evidence/lava.jpg), [vent](evidence/vent.jpg), [tree comparison](evidence/tree-comparison.jpg), [leaf closeup](evidence/leaves.jpg), and [tree approach](evidence/tree-approach.mp4).

Canopy references: [Runions, Lane & Prusinkiewicz (2007)](https://www.algorithmicbotany.org/papers/colonization.egwnp2007.pdf), [Bentley et al. (2013)](https://pubmed.ncbi.nlm.nih.gov/23800188/), [NParks ketapang](https://biodiversitysg.nparks.gov.sg/our-biodiversity/flowering-plants/trees/ketapang-/), [NParks Calophyllum](https://www.nparks.gov.sg/florafaunaweb/flora/2/7/2774), and [UF/IFAS tropical almond](https://ask.ifas.ufl.edu/publication/ST626).

## Coastal weather and botanical pass

Press STORM in any camera mode to roll in the squall without changing the selected view. It builds over several seconds with stronger wind, slanted rain, water ringlets, skybox-only lightning, and directional thunder. Lightning remains behind foreground terrain and never illuminates the landscape. SOUND controls all weather audio. `ISLAND.state().weather` reports the current blend, active rain and ringlets, and strike information for local checks. Broadleaf sockets follow the exact bent trunk-and-leader path. Bark uses a small periodic height and normal tile with branch-local coordinates. Palms use connected tapered trunk rings, integrated leaf-scar relief, and hinged feathered fronds. See [coastal weather](evidence/coastal-weather.jpg), [coastal trees](evidence/coastal-trees.jpg), and [trade wind](evidence/trade-wind.webp). Coconut frond form is cross-checked against [UF/IFAS coconut palm](https://gardeningsolutions.ifas.ufl.edu/mastergardener/resources/plantid/fruits-and-nuts/coconut/).


## Freshwater drainage

The upper creek runs 40 m from the spring to the waterfall as a step-pool cascade. Water leaves the plunge pool through a winding 33 m channel that opens onto the beach. The pools, chutes, bed, banks and the walker all share one water profile. Cobbles and boulders line both reaches, and incoming swash covers the sandy mouth. Select **STREAM** or open `?test=stream` to start on the upper bank. `ISLAND.state().landmarks.stream` reports the spring, lip, pool, mouth and reach lengths.

Stream and storm checks are recorded in [stream to sea](evidence/stream-to-sea.jpg) and [sky lightning](evidence/sky-lightning.jpg).

## Realism pass

The renderer works in linear HDR: a 4x multisampled RGBA16F scene target, an ACES tone curve, bloom, and eye adaptation that meters the lower part of the view. Without float render targets, or with `?hdr=0`, each shader tone-maps into an 8-bit target instead. The QUALITY button (or `?q=low`, `?q=medium`, `?q=high` and `?q=max` in tests) picks the quality tier; phones and small windows default to low, which drops the volumetric clouds, the planar reflection, SSAO and contact-hardening shadows, and thins the plants.

All light comes from one physical sky. A single-scattering Rayleigh, Mie and ozone model is baked into a small table that drives the sky dome, the sun colour, spherical-harmonic sky and ground-bounce ambient, and the height fog, so distant land takes on blue haze. Sun shadows harden at contact (PCSS), the terrain carries baked horizon occlusion, and half-resolution SSAO darkens only the ambient light. Surfaces use GGX highlights; wet sand, rock and leaves pick up the sky and the planar sea reflection.

Trade cumulus is raymarched through a baked Perlin-Worley volume between 220 and 430 m, a cloud cap clings to the summit, and both shade the island. STORM fades the sun and its shadows, wets every surface, and hangs rain curtains in the fog.

The sea takes fine normals from a 40-wave spectrum and reflects the island and sky through a half-resolution planar reflection. Surf foam is lit lace with spray, crests glow with light scattered through the water, and the swash edge is a thin glassy sheet behind a lace front. The reef outline is irregular. The falls throw mist, and the creek carries foam streaks and reflections.

The terrain is eroded at load: 48,000 water droplets and talus settling on a 0.75 m grid, kept clear of the lava route, the streams and the landmarks. It is shaded from a 0.83 m mesh with soil, moss, cinder and fresh basalt layers. Boulders, scree and sea stacks are lumpy meshes. Lava flows as thick, rounded lobes with a glassy crust, heat shimmer and glow, and fresh black basalt lines its banks.

Plants follow strand zonation and are drawn from a painted leaf atlas. Coconut palms have bowed, sea-leaning trunks, spiral fronds of hanging leaflets, dead fronds and nuts. Naupaka hedges and beach morning glory hold the dunes, pandanus stands on stilt roots, and hau sprawls along the water. Inland grow banana, heliconia, tree ferns, ferns, shrubs, leaf litter and lianas. Cut-out leaves use alpha-to-coverage, broadleaf blades have leaf-shaped edges and the odd red leaf, and far crown impostors close the canopy. Grass is denser near the eye on high quality.

Frigatebirds soar in banked circles over the coast and terns work the reef. Ghost crabs bolt sideways into their burrows when you come near and come back out once it is quiet. A few coconuts drift on the swell.

Test hooks: `ISLAND.setStorm(blend, wet)`, `ISLAND.look(yaw, pitch)`, `ISLAND.orbit(az, el, dist, target)`, `ISLAND.viewAt(x, z, dist, az, pitch)`, `ISLAND.plantSamples()`, `ISLAND.crabs()`, `ISLAND.floaters()`, `ISLAND.lookAtBird(0|1)`, `ISLAND.aimAtBird(0|1)`, `ISLAND.releaseLife()`, `ISLAND.holdCrabs(on)` and `ISLAND.groundAt(x, z)`. `ISLAND.state()` adds `render`, `generationMs`, `erosion`, `plants`, `vegetationTris` and `life`. Agent notes are in [AGENTS.md](AGENTS.md). Evidence: [before and after](evidence/realism-before-after.jpg), [plants](evidence/realism-plants.jpg) and [life](evidence/realism-life.jpg).

## Surf, creek and sea life

Broken waves are no longer glassy. The breaking face carries sand drawn off the bottom, the throwing lip and everything after the collapse are aerated white water, and each break rolls ashore as a white bore. Behind it the inner surf zone stays milky and sand-green, with bubble lacework, as shore break does in photos. Caustics on the lagoon floor are finer and move faster.

The creek drops about 20 m in 40 m, so it is a step-pool cascade. Its steps differ: most are 0.3 to 1.1 m, a few bunch into runs of small ones, and steep reaches get short pools rather than tall steps. Each step pours through a notch in a rock sill, off-centre and mostly alternating sides, so the white water zig-zags down. A jumble of boulders sits on each sill beside the notch, and the step faces are rough wet rock. The channel bends smoothly. It is cut into the hillside so that both banks stand above the water, and the bank lining meets the ground instead of standing on it like a curb. The lower stream is graded the same way. At the bottom of the creek a basalt bench ends in a cliff. The water spills off the lip in front of the cliff face and falls its full 4.4 m into an amphitheatre pool, so no rock cuts through the falls. You stand on the creek bed and wade in the pools.

The lagoon has schools of yellow tang, convict tang (manini) and bigeye scad (akule), plus parrotfish, blacktip reef sharks whose dorsal fins break the surface in the shallows, green sea turtles that come up to breathe, and spotted eagle rays. A pod of spinner dolphins travels round the island just outside the reef, surfacing in arcs and now and then spinning out of the water. The fish shoal with bursts and glides, and they scatter from sharks and from you when you swim near. The animals are drawn after the sea surface and fade by the real depth of water along your line of sight, so they are clear when you look down from the water or the air and disappear at a low angle, as real fish do. Their bodies, fins and colours were checked against photos on Wikimedia Commons. The terns over the reef are now brown noddies, and the ghost crabs stand on longer legs.

Test hooks: `ISLAND.seaLife()`, `ISLAND.lookAtSea(kind, dist)` and `ISLAND.aimAtSea(kind)`, where kind is 0 yellow tang, 1 convict tang, 2 bigeye scad, 3 parrotfish, 4 shark, 5 dolphin, 6 turtle or 7 eagle ray, plus `ISLAND.creekProfile()` and `ISLAND.streamBanks()` (water level and the ground on both banks every metre). `ISLAND.state().sea` counts the animals, leaps and breaths, and `ISLAND.state().landmarks.stream` reports the pools, chutes and boulders. Evidence: [surf, creek and sea life](evidence/surf-creek-sea.jpg).

## Grown trees and beach morning glory

The broadleaf trees now grow instead of repeating one arm around a pole. Every tree grows for eight seasons in one shared light grid, following Palubicki and others, "Self-organizing tree models for image synthesis" (SIGGRAPH 2009). Each bud shades a pyramid of voxels below it and reads its own light from the grid. Light is summed toward the base, and the extended Borchert-Honda rule hands vigour back out, favouring the leader. A bud grows as many new shoots as its vigour allows, bent toward the brightest neighbouring voxel. A branch that gathers too little light for its size is shed, and limb thickness follows the pipe model. So a tree in the open spreads wide and low, crowded trees grow tall with high crowns, neighbours leave gaps between their crowns, and saplings under the canopy stay small. Tropical almond (Terminalia catappa) grows tiers of near-horizontal limbs from a straight trunk, and kamani (Calophyllum inophyllum) forks low into ascending limbs. Every shoot end carries a leafy spray, and outer shoots carry side sprays too. Leaf size stays the same on small and large trees. GROWN TREES switches back to the classic trees for comparison. Growing all 2,200 trees takes about 1.5 s of the load in a headless browser.

Beach morning glory (Ipomoea pes-caprae) no longer floats above the sand. Its runners lie on the sand, its goat's-foot leaves and pink flowers stand up on their stalks and cast their own small shadows, and the sand under each mat is a little darker.

Test hooks: `ISLAND.setTrees("grown" | "classic")`, `ISLAND.treeStats()`, `ISLAND.listTrees(minHeight)`, `ISLAND.viewTree(index, dist, az, pitch)` and `ISLAND.canopyLoad()`. Evidence: [grown trees and morning glory](evidence/grown-trees.jpg).

Evidence for the creek and falls rework: [falls, creek steps and banks](evidence/creek-falls.jpg).

## Quality tiers and smoother frames

MAX draws everything at full detail and at the screen's native resolution. HIGH looks the same at a glance but runs lighter, in two ways:

- Leaves more than 6 to 8.5 m away use a light version of each leaf spray, with about 40% of the triangles: simpler leaf outlines, no leaf-stalk tubes and three-sided twigs. The two versions cross-fade with complementary dithering, so there is no pop. Shadows and water reflections also use the light sprays, so trees still show in the reflections.
- The 3D view is drawn at up to 2.4 million pixels and the browser upscales it, while the buttons stay sharp. When frames take longer than about 21 ms, the render scale steps down, no lower than 70%. It climbs back when frames are quick.

Medium and low also use the light sprays, with budgets of 1.7 and 1.1 million pixels and floors of 60% and 50%. In the grove, HIGH draws about 1.9 million leaf and branch triangles against 2.8 million on MAX, and about 1.4 million against 2.8 million in the shadow and reflection passes. Test hooks: `ISLAND.perf()` (tier, render scale, canvas size, frame rate) and `ISLAND.canopyLoad()`. `?scale=1` pins the render scale for headless tests.
