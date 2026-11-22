"""Build the project-relative Pages site from top-level game folders."""
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"work", "tools", "tests", "assets", "experiments", "design-review", "node_modules", "vendor", "build", "dist", "coverage", "references", "snapshots"}
SKIP_DIRS = EXCLUDED | {".git", "__pycache__", "source", "sources", "research"}
EXTENSIONS = {".html", ".htm", ".js", ".mjs", ".css", ".json", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico", ".mp3", ".ogg", ".wav", ".mp4", ".webm", ".woff", ".woff2", ".ttf", ".otf", ".wasm", ".glb", ".gltf", ".bin"}
CURATED = {"prism-swarm": "prism", "appalachian-eagle": "eagle", "splat": "splat", "ashgrove": "ashgrove", "castle-defense": "castle", "broadside": "broadside", "splatcraft": "splatcraft", "dustdevil": "dustdevil", "merlin": "merlin"}
PROMOTED_EXPERIMENTS = (
    Path("experiments/Astra-demo/Astra-demo.html"),
    Path("experiments/demo/demo.html"),
    Path("experiments/procedural-demo/procedural-demo.html"),
)

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.in_title = False
        self.title = ""
    def handle_starttag(self, tag, attrs):
        if tag == "title": self.in_title = True
        self.urls.extend(value for key, value in attrs if key in ("href", "src") and value)
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data

def entry_name(folder):
    config = folder / "game.json"
    entry = folder.name + ".html"
    if config.is_file() and not config.is_symlink():
        data = json.loads(config.read_text(encoding="utf-8-sig"))
        if not isinstance(data, dict): raise ValueError(f"Expected a JSON object in {config}")
        entry = data.get("entry", entry)
    if not isinstance(entry, str) or Path(entry).name != entry or "\\" in entry or entry.lower() == "index.html" or not entry.lower().endswith(".html"):
        raise ValueError(f"Invalid game entry in {config}")
    return entry

def discover(root):
    games = []
    for folder in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not folder.is_dir() or folder.is_symlink() or folder.name.startswith(".") or folder.name.lower() in EXCLUDED: continue
        entry = folder / entry_name(folder)
        if entry.is_file() and not entry.is_symlink(): games.append(folder)
    return games

def metadata(folder):
    parser = PageParser()
    parser.feed((folder / entry_name(folder)).read_text(encoding="utf-8-sig"))
    values = {}
    config = folder / "game.json"
    if config.exists():
        if config.is_symlink(): raise ValueError(f"Symlinked metadata is not supported: {config}")
        values = json.loads(config.read_text(encoding="utf-8-sig"))
        if not isinstance(values, dict): raise ValueError(f"Expected a JSON object in {config}")
    def field(name, default):
        value = values.get(name, default)
        if not isinstance(value, str) or not value.strip(): raise ValueError(f"{config}: {name} must be a nonempty string")
        return value.strip()
    return {"title": field("title", parser.title.strip() or folder.name.replace("-", " ").replace("_", " ").title()),
            "description": field("description", "A browser game ready to play."),
            "category": field("category", "Arcade"), "controls": field("controls", "Use the on-screen controls to play"),
            "requirements": field("requirements", "Browser game")}

def category_slug(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug: raise ValueError("Game category must contain a letter or number")
    return slug

def new_card(folder, data, number):
    e = lambda value: escape(str(value), quote=True)
    category = category_slug(data["category"])
    title, desc, controls, req = (e(data[k]) for k in ("title", "description", "controls", "requirements"))
    game_id = "game:" + folder.name
    search = " ".join([folder.name, *data.values()]).lower()
    href = quote(folder.name, safe="") + "/" + quote(entry_name(folder), safe="")
    return (f'<article class="game-card" data-id="{e(game_id)}" data-category="{e(category)}" data-search="{e(search)}">'
            f'<a class="play-link" data-game="{e(game_id)}" href="{href}">'
            f'<div class="art-generated"><span class="generated-symbol" aria-hidden="true">✳</span></div><div class="fade"></div>'
            f'<div class="card-copy"><p class="category">{number:02} · {e(data["category"].upper())}</p><h3>{title}</h3><span>Ready to play <b>↗</b></span></div>'
            '</a></article>')

def runtime_files(folder):
    for path in sorted(folder.rglob("*")):
        rel = path.relative_to(folder)
        if any(part.startswith(".") or part.lower() in SKIP_DIRS for part in rel.parts): continue
        if folder.name == "saltaquarium" and any(part.lower() in {"parts", "test"} for part in rel.parts): continue
        if path.is_symlink() or not path.is_file(): continue
        if path.suffix.lower() in EXTENSIONS and path.name.lower() != "game.json": yield path

def inject_quick_hide(html, runtime, game=""):
    if "arcade-quick-hide-injected" in html:
        raise ValueError("Quick hide is already present in a source page")
    if re.search(r"</script", runtime, flags=re.I):
        raise ValueError("Quick hide runtime must not contain a closing script tag")
    name = json.dumps(game, ensure_ascii=True).replace("<", "\\u003c")
    injection = f'<meta charset="utf-8"><script id="arcade-quick-hide-injected">window.__arcadeQuickHideGame={name};\n{runtime}\n</script>'
    head = re.search(r"<head(?:\s[^>]*)?>", html, flags=re.I)
    if head:
        return html[:head.end()] + "\n" + injection + html[head.end():]
    doctype = re.match(r"\s*<!doctype[^>]*>", html, flags=re.I)
    offset = doctype.end() if doctype else 0
    return html[:offset] + "\n<head>" + injection + "</head>\n" + html[offset:]

def build(root=ROOT):
    root = Path(root).resolve()
    out = root / "work" / "pages"
    if out.is_symlink() or (root / "work").is_symlink() or out.resolve() != root / "work" / "pages":
        raise ValueError("Refusing to replace an output outside the generated work/pages directory")
    games = discover(root)
    if not games: raise ValueError("No game folders with a named HTML entry found")
    runtime = (root / "assets/arcade/quick-hide.js").read_text(encoding="utf-8-sig")
    source = (root / "index.html").read_text(encoding="utf-8-sig")
    articles = re.findall(r'<article class="game-card".*?</article>', source, flags=re.S)
    # A hand-authored card is recognized by its actual link, not a hardcoded ID.
    by_path = {(g.name, entry_name(g)): g for g in games}
    promoted_paths = {tuple(path.parts) for path in PROMOTED_EXPERIMENTS}
    if promoted_paths & set(by_path): raise ValueError("Promoted experiment path collides with a discovered game")
    # Preserve every accepted source-card position.  This keeps a promoted
    # experiment in the intentional shelf order and means later automatic
    # discoveries never reuse its display number.
    cards = []
    seen_paths = set()
    for article in articles:
        parser = PageParser()
        parser.feed(article)
        for url in parser.urls:
            parts = urlsplit(url)
            path_parts = unquote(parts.path).split("/")
            if not parts.scheme and not parts.netloc and tuple(path_parts) in promoted_paths:
                key = tuple(path_parts)
                if key in seen_paths:
                    raise ValueError(f"Duplicate promoted experiment card for {'/'.join(key)}")
                seen_paths.add(key)
                cards.append(article)
                break
            if not parts.scheme and not parts.netloc and len(path_parts) == 2 and tuple(path_parts) in by_path:
                game = by_path[tuple(path_parts)]
                key = tuple(path_parts)
                if key in seen_paths:
                    raise ValueError(f"Duplicate lobby card for {game.name}")
                seen_paths.add(key)
                cards.append(article)
                break
    displayed_games = {key[0] for key in seen_paths if len(key) == 2}
    uncurated = [g for g in games if g.name not in displayed_games]
    categories = {"action": "Action", "explore": "Explore", "creative": "Creative", "puzzle": "Puzzle", "strategy": "Strategy", "kids": "Kids", "experiments": "Experiments"}
    for game in uncurated:
        data = metadata(game)
        slug = category_slug(data["category"])
        if slug in categories and categories[slug].lower() != data["category"].lower():
            raise ValueError(f"Conflicting category names for {slug}")
        categories[slug] = data["category"]
        cards.append(new_card(game, data, len(cards) + 1))
    used = {re.search(r'data-category="([^"]+)"', c).group(1) for c in cards}
    filters = [f'<button class="filter active" type="button" data-filter="all" aria-pressed="true">All games <span>{len(cards):02}</span></button>']
    filters += [f'<button class="filter" type="button" data-filter="{escape(slug, quote=True)}" aria-pressed="false">{escape(label)}</button>' for slug, label in categories.items() if slug in used]
    source = re.sub(r'(<div class="filters" role="group" aria-label="Filter games by category">).*?(</div><label class="search">)', lambda m: m.group(1) + ''.join(filters) + m.group(2), source, count=1, flags=re.S)
    source = re.sub(r'(<div class="game-grid" id="game-grid">).*?(</div><div id="empty-state")', lambda m: m.group(1) + '\n' + '\n'.join(cards) + '\n    ' + m.group(2), source, count=1, flags=re.S)
    source = re.sub(r'SHOWING ALL \d+ GAMES', f'SHOWING ALL {len(cards):02} {"GAME" if len(cards) == 1 else "GAMES"}', source)
    source = re.sub(r'(THE ARCADE SHELF · )\d+ PLAYABLE WORLDS', lambda m: f'{m.group(1)}{len(cards):02} PLAYABLE WORLDS', source)
    source = re.sub(r'\b(?:Six|Eight|Nine|Ten) different ways to get lost for a little while\.', 'Find a new way to get lost for a little while.', source)
    source = re.sub(r'FEATURED GAME <span class="feature-number">01 / \d+</span>', f'FEATURED GAME <span class="feature-number">01 / {len(cards):02}</span>', source)
    source = re.sub(r'content="Explore (?:\d+|six|eight|nine|ten|eleven) free browser games at The Arcade Shelf\."', f'content="Explore {len(cards)} free browser games at The Arcade Shelf."', source)
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / "index.html").write_text(inject_quick_hide(source, runtime), encoding="utf-8")
    if (root / "ads.txt").is_file():
        shutil.copyfile(root / "ads.txt", out / "ads.txt")
    for name in ("arcade.css", "arcade.js", ".nojekyll", "privacy.html"):
        shutil.copyfile(root / name, out / name)
    for game in games:
        for item in runtime_files(game):
            dest = out / item.relative_to(root)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(item, dest)
    for destination in PROMOTED_EXPERIMENTS:
        source = root / destination
        parents = [root / Path(*destination.parts[:depth]) for depth in range(1, len(destination.parts))]
        if source.is_symlink() or not source.is_file() or any(parent.is_symlink() for parent in parents):
            raise ValueError(f"Promoted experiment source is not a regular file in a regular folder: {destination}")
        page = out / destination
        page.parent.mkdir(parents=True, exist_ok=True)
        html = source.read_text(encoding="utf-8-sig")
        page.write_text(inject_quick_hide(html, runtime, destination.parent.as_posix()), encoding="utf-8")
    # Shared assets are optional and follow the same safe runtime allowlist.
    assets = root / "assets"
    if assets.is_dir() and not assets.is_symlink():
        for item in runtime_files(assets):
            dest = out / item.relative_to(root)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(item, dest)
    for game in games:
        page = out / game.name / entry_name(game)
        html = page.read_text(encoding="utf-8-sig")
        page.write_text(inject_quick_hide(html, runtime, game.name), encoding="utf-8")
    for game in games:
        if game.name in ("prism-swarm", "appalachian-eagle", "splat", "ashgrove", "castle-defense"):
            target = quote(entry_name(game), safe="")
            (out / game.name / "index.html").write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={target}"><title>Moved</title><p>This game moved to <a href="{target}">{escape(entry_name(game))}</a>.</p>', encoding="utf-8")
    pages = [Path("index.html"), Path("privacy.html")] + [Path(game.name) / entry_name(game) for game in games] + list(PROMOTED_EXPERIMENTS)
    for rel in pages:
        page = out / rel
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8-sig"))
        for url in parser.urls:
            parts = urlsplit(url)
            if parts.scheme or parts.netloc or not parts.path: continue
            if parts.path.startswith("/"): raise ValueError(f"Project-site link must be relative in {rel}: {url}")
            target = (page.parent / unquote(parts.path)).resolve()
            if not target.is_relative_to(out.resolve()) or not target.exists(): raise ValueError(f"Broken local link in {rel}: {url}")
    print(f"Packaged {len(games) + len(PROMOTED_EXPERIMENTS)} games and arcade; all local HTML links resolve.")
    return out

if __name__ == "__main__":
    build()
