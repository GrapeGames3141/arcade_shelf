# Claude instructions for `E:\html games`

Start every session by reading this file, the root `AGENTS.md`, and the target game's `AGENTS.md` when it exists. If Claude is opened inside a child folder, explicitly read `..\CLAUDE.md` and `..\AGENTS.md` first.

## Repository layout

The root repository uses branch `main` and has origin `https://github.com/GrapeGames3141/HTML-Games`. It tracks every game as ordinary files, so GitHub `main` holds all source and a fresh clone works as a plain monorepo. On this machine only, `appalachian-eagle` and `prism-swarm` retain their old nested repositories on `master`; they are not submodules. `ashgrove`, `splat`, `dustdevil`, `merlin`, `spearfish`, `firstlight`, `tricktype`, `deckvolution`, `guildmaster`, `empire-rush`, `aquarium`, `saltaquarium`, `woolrampage`, `kindred-crossing`, `popquiz`, `buzzwords`, `unicornmeadow`, `barncount`, `mathtricks`, `dailybrain`, `bramblebear`, `blindfire`, and `flockfortress` are root-owned game folders. Development prototypes live under `experiments/`; never auto-list them in the arcade or include them in the Pages build unless the user explicitly promotes one. Local commits are useful history, not an off-machine backup.

| Source game | Source file | Drive release copy |
| --- | --- | --- |
| Prism Swarm | `prism-swarm\prism-swarm.html` | `aliens.html` |
| Appalachian Eagle | `appalachian-eagle\appalachian-eagle.html` | `eagle.html` |
| Bug Splatter | `splat\splat.html` | `bughunt.html` |
| Ashgrove | `ashgrove\ashgrove.html` | `horror.html` |
| Splatcraft | `splatcraft\splatcraft.html` | none yet |
| Broadside | `broadside\broadside.html` | none yet |
| Buccaneer | `buccaneer\buccaneer.html` | none yet |
| Dust Devil | `dustdevil\dustdevil.html` | none yet |
| Castle Defense | `castle-defense\castle-defense.html` | none yet |
| Merlin's Tower Defense | `merlin\merlin.html` | none yet |
| Spearfish | `spearfish\spearfish.html` | none yet |
| First Light | `firstlight\firstlight.html` | none yet |
| TrickType | `tricktype\tricktype.html` | none yet |
| Deckvolution: Ascent | `deckvolution\deckvolution.html` | none yet |
| Slingshot | `slingshot\slingshot.html` | none yet |
| Ridiculous Wars | `ridiculous-wars\ridiculous-wars.html` | none yet |
| Heroes Sold Separately | `guildmaster\guildmaster.html` | none yet |
| Empire Rush | `empire-rush\empire-rush.html` | none yet |
| Axolotl Aquarium | `aquarium\aquarium.html` | none yet |
| Reef Aquarium | `saltaquarium\saltaquarium.html` | none yet |
| Wool Rampage | `woolrampage\woolrampage.html` | none yet |
| Mytharium | `mytharium\mytharium.html` | none yet |
| Lawnchair Aces | `lawnchairaces\lawnchairaces.html` | none yet |
| Kindred Crossing | `kindred-crossing\kindred-crossing.html` | none yet |
| Volcanic Island Walk | `experiments\procedural-demo\procedural-demo.html` | none yet |
| Pop Quiz | `popquiz\popquiz.html` | none yet |
| Buzz Words | `buzzwords\buzzwords.html` | none yet |
| Unicorn Meadow | `unicornmeadow\unicornmeadow.html` | none yet |
| Barnyard Count | `barncount\barncount.html` | none yet |
| Mitten Mountain | `mittenmountain\mittenmountain.html` | none yet |
| Quilt Hill Roll | `quilthill\quilthill.html` | none yet |
| Alley Knights | `alleyknights\alleyknights.html` | none yet |
| Cartastrophe | `cartastrophe\cartastrophe.html` | none yet |
| Math Tricks | `mathtricks\mathtricks.html` | none yet |
| Daily Brain | `dailybrain\dailybrain.html` | none yet |
| Bramble Bear | `bramblebear\bramblebear.html` | none yet |
| Blindfire | `blindfire\blindfire.html` | none yet |
| Flock & Fortress | `flockfortress\flockfortress.html` | none yet |
| Turkey Escape | `turkey-escape\turkey-escape.html` | none yet |
| Doorbusters | `doorbusters\doorbusters.html` | none yet |
| Sleigh Run | `sleighrun\sleighrun.html` | none yet |
| Peregrine | `peregrine\peregrine.html` | none yet |
| Pigeon | `pigeon\pigeon.html` | none yet |
| Fetch | `leaffetch\leaffetch.html` | none yet |

`experiments\Astra-demo\Astra-demo.html`, `experiments\demo\demo.html`, and `experiments\procedural-demo\procedural-demo.html` are explicitly curated nested arcade and Pages entrypoints. Their evidence, plans, build notes, and sibling experiments stay excluded. `experiments\humanoid-model-experiment\humanoid-model-experiment.html` remains a development prototype, not an arcade entry. Its historical Drive export is `human.html`; do not update that copy unless the user asks.

Drive releases belong in `H:\My Drive\AI Projects\Prism Swarm`. Do not publish or update Drive copies unless the user asks. When asked, copy the source file to the mapped release name, then verify both byte length and SHA-256. Each game's source file is named after its folder, `<game>\<game>.html`; keep that name and do not add an `index.html`. The root `index.html` is the intentional arcade lobby, not a game source.

## Guides

Technique guides live as Markdown in this root folder. Read the matching guide instead of reverse-engineering another game, and add new findings to it when you learn something reusable.

- `SPLAT-GUIDE.md`: Gaussian-splat renderer, splat generation, water, particles, performance budgets, and the headless test setup (Playwright + SwiftShader, `?test` hooks).
- `techniques-ideas.md`: twelve light, shadow, water and transparency techniques. All twelve are built in `experiments\demo\demo.html`; working notes are in the "Multi-pass techniques" section of `SPLAT-GUIDE.md`.

## New games

- Every new game gets its own folder: `E:\html games\<game>\`, with a short, meaningful folder name.
- Name the main file meaningfully, never `index.html`. The default is the folder name: `<game>\<game>.html`.
- Add the new game to the table above (and to the root `README.md`) in the first commit. The Pages build auto-discovers valid top-level game folders; run it after an arcade-ready game to verify the generated lobby. Experiments follow the separate exclusion rule above.
- Every arcade-ready game gets a curated lobby card in the same check-in that publishes it; never leave the build's placeholder icon. Add `assets/arcade/<game>.webp` (800x560, a real gameplay screenshot that shows the player character in action, HUD hidden) and an `<article class="game-card">` in the root `index.html` after the newest card, with the next display number, a lobby category, search terms, descriptive alt text and a short tagline. Then run `python tools/build-pages.py` and confirm the built card points at the image. Playwright is not installed on this machine; capture with headless Edge over the DevTools protocol from a throwaway harness page, then crop with Pillow.
- New games are root-owned. Never initialize a child repository for one.
- Commit as you go: check in at each working milestone (first playable scaffold, each feature that works, each fix) rather than one large commit at the end, and push `main` to origin after each check-in.

## Iteration workflow

1. Read the instructions and inspect all relevant work before editing. For a target, run:

   ```powershell
   git -C 'E:\html games' status --short
   git -C 'E:\html games' diff --check
   git -C 'E:\html games\<game>' rev-parse --show-toplevel
   git -C 'E:\html games\<game>' status --short
   git -C 'E:\html games\<game>' diff
   git -C 'E:\html games\<game>' diff --cached
   ```

   On this machine, a result of `E:/html games/<game>` means a retained local child repository exists. A result of `E:/html games` means the root owns the target, which is always true in a fresh clone. For a root-owned target, inspect the exact paths with `git -C 'E:\html games' status --short -- <game>`, `diff -- <game>`, and `diff --cached -- <game>`.

2. Make only the requested focused edit. Preserve unrelated edits and staged work. The games are self-contained HTML unless their local instructions say otherwise. Do not add a build system or external dependencies without a user request.

3. Validate in proportion to the change. Run `git diff --check` for the repository that owns the change. Test through localhost when it helps validate behavior; report what was actually tested. A simple local server and example URL are:

   ```powershell
   python -m http.server 8000 --bind 127.0.0.1 --directory 'E:\html games'
   # Then open http://127.0.0.1:8000/splat/splat.html for E:\html games\splat\splat.html.
   ```

   For every Appalachian Eagle `appalachian-eagle.html` edit, also run:

   ```powershell
   node 'E:\html games\appalachian-eagle\tools\update-size.cjs'
   ```

4. Stage only the files made for this iteration. Never sweep in another task's staged work. Before committing, inspect `git diff --cached --name-only` and confirm that no existing staged or unstaged hunks overlap a file you intend to commit. `git add` and `git commit --only` commit the whole named file, so coordinate with the owner and leave the file untouched if another task has changes in it. Use `--only` with explicit paths; never run a bare `git commit` while unrelated staged paths exist.

   For a root-owned game:

   ```powershell
   git -C 'E:\html games' add -- '<game>\<game>.html'
   git -C 'E:\html games' diff --cached --check
   git -C 'E:\html games' commit --only -m 'Improve <game> <feature>' -- '<game>\<game>.html'
   ```

   On this machine, if `appalachian-eagle` or `prism-swarm` has a retained child repository (confirmed by step 1), commit it first, then capture the actual source file in the root repository:

   ```powershell
   git -C 'E:\html games\<game>' add -- '<game>.html'
   git -C 'E:\html games\<game>' diff --cached --check
   git -C 'E:\html games\<game>' commit --only -m 'Improve <feature>' -- '<game>.html'
   git -C 'E:\html games' add -- '<game>\<game>.html'
   git -C 'E:\html games' diff --cached --check
   git -C 'E:\html games' commit --only -m 'Update <game> source' -- '<game>\<game>.html'
   ```

   Replace `<game>` and paths with the actual target. Never use `git submodule` commands or stage a Git link. In a fresh clone, skip the child-commit block and use the root-owned command block for every game. Check `git diff --cached --name-only` before every commit so only intended paths are included.

5. Push after each check-in so work is backed up off this machine as it progresses; on longer tasks, commit and push at each working milestone rather than once at the end. Push only the validated root branch. Do not sync to Drive unless asked. Report the changed files, validation performed, local child and root commit hashes where applicable, and remaining modified or staged files.

   ```powershell
   git -C 'E:\html games' push origin main
   ```

   Never push from a retained child repository and never force-push. If the push is rejected, fetch, inspect, and reconcile the divergence without discarding work.

Do not use `git reset --hard` or `git clean`; do not delete source snapshots, media, or references without explicit user direction.
