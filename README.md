# HTML Games

Portable GitHub source collection for the standalone HTML games in this folder. Branch `main` at `https://github.com/GrapeGames3141/HTML-Games` tracks every game as ordinary files, so fresh clones need no submodule setup. On this machine, Appalachian Eagle and Prism Swarm retain old local Git histories inside their folders; those histories are not required by GitHub clones.

Each game’s editable entry point is named after its folder: `<game>/<game>.html` (for example `splat/splat.html`). The root `index.html` is The Arcade Shelf lobby, an intentional exception to that per-game rule. With the local server, open `http://127.0.0.1:8000/<game>/<game>.html`. Read [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md) before any iteration. Technique guides such as [SPLAT-GUIDE.md](SPLAT-GUIDE.md) record how the splat games are built and tested.

| Game | Source | Local URL |
| --- | --- | --- |
| Appalachian Eagle | `appalachian-eagle/appalachian-eagle.html` | `http://127.0.0.1:8000/appalachian-eagle/appalachian-eagle.html` |
| Ashgrove | `ashgrove/ashgrove.html` | `http://127.0.0.1:8000/ashgrove/ashgrove.html` |
| Broadside | `broadside/broadside.html` | `http://127.0.0.1:8000/broadside/broadside.html` |
| Buccaneer | `buccaneer/buccaneer.html` | `http://127.0.0.1:8000/buccaneer/buccaneer.html` |
| First Light | `firstlight/firstlight.html` | `http://127.0.0.1:8000/firstlight/firstlight.html` |
| TrickType | `tricktype/tricktype.html` | `http://127.0.0.1:8000/tricktype/tricktype.html` |
| Deckvolution: Ascent | `deckvolution/deckvolution.html` | `http://127.0.0.1:8000/deckvolution/deckvolution.html` |
| Ridiculous Wars | `ridiculous-wars/ridiculous-wars.html` | `http://127.0.0.1:8000/ridiculous-wars/ridiculous-wars.html` |
| Dust Devil | `dustdevil/dustdevil.html` | `http://127.0.0.1:8000/dustdevil/dustdevil.html` |
| Castle Defense | `castle-defense/castle-defense.html` | `http://127.0.0.1:8000/castle-defense/castle-defense.html` |
| Merlin's Tower Defense | `merlin/merlin.html` | `http://127.0.0.1:8000/merlin/merlin.html` |
| Prism Swarm | `prism-swarm/prism-swarm.html` | `http://127.0.0.1:8000/prism-swarm/prism-swarm.html` |
| Bug Splatter | `splat/splat.html` | `http://127.0.0.1:8000/splat/splat.html` |
| Splatcraft | `splatcraft/splatcraft.html` | `http://127.0.0.1:8000/splatcraft/splatcraft.html` |
| Spearfish | `spearfish/spearfish.html` | `http://127.0.0.1:8000/spearfish/spearfish.html` |
| Slingshot | `slingshot/slingshot.html` | `http://127.0.0.1:8000/slingshot/slingshot.html` |
| Heroes Sold Separately | `guildmaster/guildmaster.html` | `http://127.0.0.1:8000/guildmaster/guildmaster.html` |
| Empire Rush | `empire-rush/empire-rush.html` | `http://127.0.0.1:8000/empire-rush/empire-rush.html` |
| Axolotl Aquarium | `aquarium/aquarium.html` | `http://127.0.0.1:8000/aquarium/aquarium.html` |
| Reef Aquarium | `saltaquarium/saltaquarium.html` | `http://127.0.0.1:8000/saltaquarium/saltaquarium.html` |
| Wool Rampage | `woolrampage/woolrampage.html` | `http://127.0.0.1:8000/woolrampage/woolrampage.html` |
| Mytharium | `mytharium/mytharium.html` | `http://127.0.0.1:8000/mytharium/mytharium.html` |
| Lawnchair Aces | `lawnchairaces/lawnchairaces.html` | `http://127.0.0.1:8000/lawnchairaces/lawnchairaces.html` |
| Kindred Crossing | `kindred-crossing/kindred-crossing.html` | `http://127.0.0.1:8000/kindred-crossing/kindred-crossing.html` |
| Volcanic Island Walk | `experiments/procedural-demo/procedural-demo.html` | `http://127.0.0.1:8000/experiments/procedural-demo/procedural-demo.html` |
| Pop Quiz | `popquiz/popquiz.html` | `http://127.0.0.1:8000/popquiz/popquiz.html` |
| Buzz Words | `buzzwords/buzzwords.html` | `http://127.0.0.1:8000/buzzwords/buzzwords.html` |
| Unicorn Meadow | `unicornmeadow/unicornmeadow.html` | `http://127.0.0.1:8000/unicornmeadow/unicornmeadow.html` |
| Barnyard Count | `barncount/barncount.html` | `http://127.0.0.1:8000/barncount/barncount.html` |
| Mitten Mountain | `mittenmountain/mittenmountain.html` | `http://127.0.0.1:8000/mittenmountain/mittenmountain.html` |
| Quilt Hill Roll | `quilthill/quilthill.html` | `http://127.0.0.1:8000/quilthill/quilthill.html` |
| Cartastrophe | `cartastrophe/cartastrophe.html` | `http://127.0.0.1:8000/cartastrophe/cartastrophe.html` |

`splatcraft/snapshots/splatcraft-early.html` is a historical snapshot, not a playable entry point.

## Experiments

Development prototypes live under [`experiments/`](experiments/), outside the arcade catalog and Pages package unless explicitly curated. `experiments/Astra-demo/Astra-demo.html`, `experiments/demo/demo.html`, and `experiments/procedural-demo/procedural-demo.html` are the three curated nested experiment entrypoints. The [Humanoid Model Experiment](experiments/humanoid-model-experiment/README.md) remains intentionally excluded.

## Arcade website

The root `index.html` is The Arcade Shelf: a screenshot-led hero and card shelf for playable games, with search, category filters, two random-game controls, and a last-played marker. Approved production art lives in `assets/arcade/`; each game opens directly for its own keyboard, pointer and audio controls. High Country requires a WebGPU-capable browser over HTTPS or localhost.

Castle Defense / Bastion of the Four Roads is based on `GrapeGames3141/castle-defense`, commit `1e0db1147e56025d28960f2e059e19bc6212f74a`. The arcade retains its phone landscape HUD adjustment and the upstream Tailwind CDN reference.

### GitHub Pages

The `Publish arcade to GitHub Pages` workflow publishes on pushes to `main` and can also be run manually. In repository **Settings → Pages**, set **Source** to **GitHub Actions**. A private repository requires a GitHub plan that supports Pages for private repositories; the workflow does not change repository visibility.

Expected project URL: <https://grapegames3141.github.io/arcade_shelf/>.

Add a new top-level game folder containing `<folder>/<folder>.html` and push it to `main`: the next Pages build discovers it, adds a card, and publishes its runtime assets. The source lobby is a curated fallback; serve `work/pages/` to see every discovered game. The three explicitly curated nested experiment entrypoints are packaged as standalone HTML pages only; their evidence, plans, and sibling prototypes remain excluded. Optional `game.json` in a top-level game folder can set string fields `entry` (a different, meaningful HTML filename in that folder), `title`, `description`, `category`, `controls`, and `requirements`. Without metadata, the card uses the HTML title, an Arcade category, and generic details. Existing curated cards retain their designed descriptions and category. The build copies common web runtime files (HTML, JS, CSS, JSON, images, audio, video, fonts, WASM, and glTF/bin assets); hidden files, tools, snapshots, references, and other source-only directories are excluded. External assets remain the game's responsibility. Local HTML links must resolve within the packaged site and use relative paths. Add the game to the source tables in this README and CLAUDE.md as required by repository instructions.

Validate and package locally with `node --check arcade.js`, `python -m unittest discover -s tools -p test_build_pages.py`, and `python tools/build-pages.py`. The generated `work/pages/` directory contains playable site files, excluding source snapshots, research references, local tools, and all experiments except the three explicit curated entrypoints. It includes generated compatibility aliases for the prior five `/game/index.html` URLs; source-game folders never regain `index.html`. Serve it with `python -m http.server 8000 --directory work/pages`.

Use this prompt for Claude Code:

> Work in `E:\html games` on `<game>`. Read `CLAUDE.md`, `AGENTS.md`, and any `<game>\AGENTS.md` first. Inspect root and target Git status, diffs, staged diffs, and `rev-parse --show-toplevel`; preserve unrelated work. Implement only: `<requested change>`. Validate it appropriately, including `git diff --check` and the Appalachian Eagle size-stamp command if applicable. Commit only explicit intended source paths following the documented local-child-then-root flow when a child repository exists; otherwise commit at the root. Do not use Git submodules. Commit at each working milestone and push the root main branch to origin after each commit. Do not update the Drive release unless I explicitly ask. Report the files changed, validation, commit hash(es), and remaining dirty files.
