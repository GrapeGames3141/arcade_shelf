# Volcanic Island Walk

Open [procedural-demo.html](procedural-demo.html) directly in a current WebGL 2 browser. It is an offline, code-only scene with no downloads or runtime assets.

It opens in Walk mode on the beach. Use WASD to move, Shift to move faster, Arrow keys or drag to look, and the MOVE/LOOK pads on touch devices. Swimming begins automatically in deep enough water. The outer reef permits lagoon and shallow-sea swimming but smoothly blocks travel into the deep ocean. Aerial, Strand, Reef, Falls, Stream, and Lava are composed orbit and landmark buttons. Walk or `R` resumes first-person play at the current position. SOUND is gesture-gated and then toggles mute.

The scene generates volcanic terrain, a reef shelf, palms and forked broadleaf trees, shore objects, animated water, waterfall and lava landmarks, moving weather, contact and sun shadows, and synthesized surf, wind, landmark and footstep audio at runtime. A compact generated signed shoreline-distance/normal field is shared by CPU walking, wet-sand history, mark removal, audio, and the water shaders: it guides short incoming swash, sheltered lagoon water, outer-reef breaks, thin torn foam at advancing fronts, and draining afterwash. Sand is procedural carbonate/mineral grain with restrained beach ripples and a polished wet swash zone. Bare footprints and kicked sand follow the terrain; a wetting wave erases a contacted mark in about 0.11 seconds while dry marks persist. `?view=0`, `?view=1`, and `?view=2` open orbit views. `?test=swim`, `?test=falls`, `?test=stream`, and `?test=lava` provide deterministic test positions. `?test=forest` and GROVE open the canopy review. `window.ISLAND.state()` exposes current play state and `window.ISLAND.testSpawn(x,z)` supports local testing.

See the optional [island tour](evidence/island-tour.mp4), [shore surf](evidence/shore-surf.mp4), [wave wash](evidence/wave-wash.jpg), and [tree approach](evidence/tree-approach.mp4). Coastal sediment colour and carbonate/sand-bar variation were checked against [USGS Honokōhau sediment Fig. 16](https://pubs.usgs.gov/of/2008/1191/).

The current systems comparison is available as [island systems](evidence/island-systems.jpg).

## Coastal sand and surf

Beach material uses a small mipmapped procedural field. Multiscale pale carbonate grains, sparse darker volcanic chips, locally sorted coarse inclusions, and shadowed shell edges sit in interrupted wind-ripple patches. The ripples occupy dry backshore, while the signed shoreline field compacts and darkens the foreshore into a smooth damp sheen.

Incoming exposed-shore sets use three connected, coastline-following crest ribbons with ten cross-profile vertices. A shared shoreline phase drives the rounded shoal, forward-curled lip, collapse, water height, footprint wash, and surf audio. The lip occupies the final 7 m offshore, and the water surface carries its aerated trail shoreward. In a console, `ISLAND.state().surf` reports the static ribbon topology, phase period, and active shore band for a quick clear-weather check.

[Start at the surf](procedural-demo.html?test=wave) opens a walk-height side-on breaker check beside the starting beach. The accompanying [sand and surf evidence](evidence/sand-and-surf.webp) shows the procedural grain, interrupted ripple patches, rolling green face, and soft foam touchdown.

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

The upper creek runs 40 m from the spring to the waterfall. Water leaves the plunge pool through a winding 33 m channel that opens onto the beach. Both reaches use the same downhill water levels for rendering and movement. Basalt cobbles line the banks, and incoming swash covers the sandy mouth. Select **STREAM** or open `?test=stream` to start on the upper bank. `ISLAND.state().landmarks.stream` reports the spring, lip, pool, mouth and reach lengths.

Stream and storm checks are recorded in [stream to sea](evidence/stream-to-sea.jpg) and [sky lightning](evidence/sky-lightning.jpg).
