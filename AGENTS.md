# HTML games workspace

This repository lives at `E:\html games`. Keep durable source, assets, outputs, and validation evidence on `E:`.

Each game keeps its source entry point as `<game>/<game>.html`, named after its folder (for example `splat/splat.html`), so files are easy to tell apart. Do not add an `index.html`. The root `index.html` is the intentional arcade lobby, not a game entry point. Every new game gets its own folder with a meaningful name and a meaningfully named main file (default `<game>/<game>.html`). Commit at each working milestone and push the root `main` branch to origin after each commit. Files such as `aliens.html` and `horror.html` are named release copies; do not rename a source entry point to match a release filename.

Work with one writer at a time. Before changing a game, read this file, `CLAUDE.md`, and any `AGENTS.md` in that game's directory. Preserve unrelated modified and staged files. Never use `git reset --hard`, `git clean`, or bulk formatting against a game unless the user explicitly requests it.

The root repository tracks every game's source files directly. On this machine, `appalachian-eagle` and `prism-swarm` also retain their old nested Git histories; GitHub clones do not contain nested repositories. Never initialize child repositories in a fresh clone. Use `git -C '<game path>' rev-parse --show-toplevel` to discover whether a local child repository exists. When it does, commit its focused change there first, then commit the same changed source file from the root repository so GitHub records the updated file content. `ashgrove`, `splat`, `dustdevil`, and `merlin` are root-owned game folders. Development prototypes live under `experiments/`; never auto-list them in the arcade or include them in the Pages build unless the user explicitly promotes one.

When replacing existing Arcade Shelf card art, keep the card's canonical asset path and update its lobby `<img src>` with `?v=<hash>`, using the first eight lowercase hexadecimal characters of the new file's SHA-256. Confirm the packaged lobby references that exact URL and, after publishing, that the live image matches the file.

For Codex work that requires implementation, the primary Sol agent must inspect and plan first, then delegate the implementation to one Terra implementer. Claude does not have this delegation requirement; it should follow the iteration workflow in `CLAUDE.md`.

`appalachian-eagle/AGENTS.md` adds a required post-edit command: after every `appalachian-eagle.html` edit, run `node tools/update-size.cjs`.

Technique guides live as Markdown in this root folder (for example `SPLAT-GUIDE.md` for Gaussian-splat games). Read them instead of inspecting other games, and extend them when you learn something reusable.
