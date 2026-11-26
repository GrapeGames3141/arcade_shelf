"""Regression tests for discovery, packaging, and generated lobby content."""
import importlib.util
import json
from pathlib import Path
import re
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_pages', ROOT / 'tools/build-pages.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class PagesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.byte_exact_payload = b'\xef\xbb\xbf<!doctype html>\r\n<title>Byte exact</title>\n<body>mixed newlines</body>'
        for name in ('index.html', 'arcade.css', 'arcade.js', '.nojekyll', 'privacy.html', '_headers'):
            shutil.copyfile(ROOT / name, self.root / name)
        for name in ('favicon.ico', 'favicon.svg', 'favicon-48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest'):
            shutil.copyfile(ROOT / name, self.root / name)
        shutil.copytree(ROOT / 'assets', self.root / 'assets')
        for name in builder.CURATED:
            folder = self.root / name
            folder.mkdir()
            (folder / (name + '.html')).write_text('<!doctype html><title>Game</title>', encoding='utf-8')
        for destination in builder.PROMOTED_EXPERIMENTS:
            source = self.root / destination
            source.parent.mkdir(parents=True, exist_ok=True)
            if destination in builder.BYTE_EXACT_EXPERIMENTS:
                source.write_bytes(self.byte_exact_payload)
            else:
                source.write_text('<!doctype html><title>Promoted experiment</title>', encoding='utf-8')
        opus = self.root / 'experiments' / 'opus'
        opus.mkdir(parents=True, exist_ok=True)
        (opus / 'opus.html').write_text('<!doctype html><title>Not promoted</title>', encoding='utf-8')
    def tearDown(self): self.temp.cleanup()
    def test_pages_do_not_inject_quick_hide(self):
        game = self.root / 'littles'
        game.mkdir()
        (game / 'littles.html').write_text('<!doctype html><html><head><title>Littles</title></head><body></body></html>', encoding='utf-8')
        (game / 'game.json').write_text(json.dumps({'category': 'Kids'}), encoding='utf-8')
        out = builder.build(self.root)
        pages = [out / 'index.html', out / 'littles/littles.html']
        pages += [out / name / (name + '.html') for name in builder.CURATED]
        pages += [out / destination for destination in builder.PROMOTED_EXPERIMENTS]
        pages += [out / 'splat/index.html']
        for page in pages:
            self.assertNotIn('arcade-quick-hide-injected', page.read_text(encoding='utf-8'))
    def test_every_game_page_gets_one_home_tab(self):
        game = self.root / 'littles'
        game.mkdir()
        (game / 'littles.html').write_text('<!doctype html><html><head><title>Littles</title></head><body><p>x</p></body></html>', encoding='utf-8')
        (game / 'game.json').write_text(json.dumps({'category': 'Kids'}), encoding='utf-8')
        out = builder.build(self.root)
        kid = (out / 'littles/littles.html').read_text(encoding='utf-8')
        self.assertEqual(kid.count('id="arcade-home"'), 1)
        self.assertIn('href="../index.html" data-kids="1"', kid)
        self.assertLess(kid.index('id="arcade-home"'), kid.index('</body>'))
        for name in builder.CURATED:
            self.assertEqual((out / name / (name + '.html')).read_text(encoding='utf-8').count('id="arcade-home"'), 1)
        for destination in builder.PROMOTED_EXPERIMENTS:
            page = (out / destination).read_text(encoding='utf-8-sig')
            if destination in builder.BYTE_EXACT_EXPERIMENTS:
                self.assertNotIn('arcade-home', page)
            else:
                self.assertIn('href="../../index.html"', page)
        self.assertNotIn('arcade-home', (out / 'index.html').read_text(encoding='utf-8'))
        for name in ('favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-512.png', 'site.webmanifest', 'assets/brand/share-card.jpg'):
            self.assertTrue((out / name).is_file(), name)
        builder.build(self.root)
        self.assertEqual((out / 'littles/littles.html').read_text(encoding='utf-8').count('id="arcade-home"'), 1)

    def test_byte_exact_experiment_and_no_transform_headers(self):
        destination = builder.BYTE_EXACT_EXPERIMENTS[0]
        source = self.root / destination
        source.write_bytes(self.byte_exact_payload)
        out = builder.build(self.root)
        self.assertEqual((out / destination).read_bytes(), self.byte_exact_payload)
        self.assertNotIn(b'arcade-home', (out / destination).read_bytes())
        headers = (out / '_headers').read_text(encoding='utf-8')
        for path in ('/experiments/rain-dragon-express/fable', '/experiments/rain-dragon-express/fable.html'):
            self.assertRegex(headers, re.escape(path) + r'\r?\n  Cache-Control: public, no-transform')
    def test_games_with_their_own_home_link_get_no_tab(self):
        game = self.root / 'homey'
        game.mkdir()
        (game / 'homey.html').write_text('<!doctype html><html><body><a data-arcade-home href="../index.html">Arcade Shelf</a></body></html>', encoding='utf-8')
        out = builder.build(self.root)
        self.assertNotIn('id="arcade-home"', (out / 'homey/homey.html').read_text(encoding='utf-8'))
    def test_discovery_metadata_assets_and_rebuild(self):
        game = self.root / 'future fields'
        (game / 'nested').mkdir(parents=True)
        (game / 'launch.html').write_text('<title>Fallback title</title><script src="nested/game.js"></script><img src="nested/art.png">', encoding='utf-8')
        (game / 'nested/game.js').write_text('window.gameReady = true;', encoding='utf-8')
        (game / 'nested/art.png').write_bytes(b'PNG fixture')
        (game / 'game.json').write_text(json.dumps({'entry':'launch.html', 'title':'Clouds <&> "Sky"', 'description':'Build & play', 'category':'Puzzle', 'controls':'Click <play>', 'requirements':'Modern browser'}), encoding='utf-8')
        (game / 'snapshots').mkdir()
        (game / 'snapshots/old.js').write_text('old')
        excluded = self.root / 'tools'
        excluded.mkdir()
        (excluded / 'tools.html').write_text('<title>Not a game</title>')
        experiment = self.root / 'experiments'
        experiment.mkdir(exist_ok=True)
        (experiment / 'experiments.html').write_text('<title>Not an arcade game</title>')
        out = builder.build(self.root)
        lobby = (out / 'index.html').read_text(encoding='utf-8')
        self.assertIn('Clouds &lt;&amp;&gt; &quot;Sky&quot;', lobby)
        self.assertIn('future%20fields/launch.html', lobby)
        self.assertIn('data-filter="puzzle"', lobby)
        self.assertIn('SHOWING ALL 15 GAMES', lobby)
        self.assertIn('THE ARCADE SHELF · 15 PLAYABLE WORLDS', lobby)
        self.assertIn('<title>The Arcade Shelf</title>', lobby)
        self.assertIn('href="privacy.html"', lobby)
        self.assertTrue((out / 'privacy.html').exists())
        self.assertIn('aria-label="The Arcade Shelf home"', lobby)
        self.assertIn('https://thearcadeshelf.com/', lobby)
        self.assertIn('content="Explore 15 free browser games at The Arcade Shelf."', lobby)
        self.assertIn('Littoral — Astra 6.2', lobby)
        self.assertIn('Beach to Cave — Fable 5.2', lobby)
        self.assertIn('data-filter="experiments"', lobby)
        self.assertIn('15 · PUZZLE', lobby)
        self.assertLess(lobby.index('Beach to Cave — Fable 5.2'), lobby.index('Clouds &lt;&amp;&gt; &quot;Sky&quot;'))
        self.assertNotIn('Not an arcade game', lobby)
        self.assertTrue((out / 'future fields/nested/game.js').exists())
        self.assertTrue((out / 'future fields/nested/art.png').exists())
        self.assertFalse((out / 'future fields/snapshots/old.js').exists())
        self.assertFalse((out / 'tools/tools.html').exists())
        self.assertTrue((out / 'experiments/Astra-demo/Astra-demo.html').exists())
        self.assertTrue((out / 'experiments/demo/demo.html').exists())
        self.assertTrue((out / 'experiments/procedural-demo/procedural-demo.html').exists())
        self.assertFalse((out / 'experiments/humanoid-model-experiment').exists())
        self.assertFalse((out / 'experiments/Astra-demo/evidence').exists())
        self.assertFalse((out / 'experiments/procedural-demo/evidence').exists())
        self.assertFalse((out / 'experiments/opus').exists())
        self.assertFalse((out / 'assets/arcade/quick-hide.js').exists())
        for page in [out / 'index.html', out / 'future fields/launch.html'] + [out / name / (name + '.html') for name in builder.CURATED] + [out / destination for destination in builder.PROMOTED_EXPERIMENTS]:
            html = page.read_text(encoding='utf-8')
            self.assertNotIn('arcade-quick-hide-injected', html)
        future_html = (out / 'future fields/launch.html').read_text(encoding='utf-8')
        self.assertIn('src="nested/game.js"', future_html)
        self.assertTrue((out / 'splat/index.html').exists())
        shutil.rmtree(game)
        builder.build(self.root)
        self.assertFalse((out / 'future fields').exists())
        self.assertIn('SHOWING ALL 14 GAMES', (out / 'index.html').read_text(encoding='utf-8'))

    def test_repository_castle_output_has_no_keytrain(self):
        out = builder.build(ROOT)
        castle = (out / 'castle-defense/castle-defense.html').read_text(encoding='utf-8').lower()
        self.assertNotIn('keytrain', castle)
        self.assertNotIn('workplacereader', castle)
    def test_gold_entry_and_new_curated_card(self):
        game = self.root / 'gold-rush'
        game.mkdir()
        (game / 'gold-rush.html').write_text('<title>Gold Rush</title>', encoding='utf-8')
        puzzle = self.root / 'kindred-crossing'
        puzzle.mkdir()
        (puzzle / 'kindred-crossing.html').write_text('<title>Kindred Crossing</title>', encoding='utf-8')
        index = self.root / 'index.html'
        source = index.read_text(encoding='utf-8')
        custom = '<article class="game-card" data-id="custom-id" data-category="action" data-search="gold"><a class="play-link" href="gold-rush/gold-rush.html">Custom Gold</a></article>'
        source = source.replace('</div><div id="empty-state"', custom + '</div><div id="empty-state"')
        index.write_text(source, encoding='utf-8')
        out = builder.build(self.root)
        self.assertTrue((out / 'gold-rush/gold-rush.html').exists())
        lobby = (out / 'index.html').read_text(encoding='utf-8')
        self.assertIn('Custom Gold', lobby)
        self.assertIn('data-id="custom-id"', lobby)
        self.assertIn('data-filter="puzzle"', lobby)
        self.assertIn('href="kindred-crossing/kindred-crossing.html"', lobby)
        self.assertEqual(lobby.count('href="gold-rush/gold-rush.html"'), 1)
        self.assertLess(lobby.index('Littoral — Astra 6.2'), lobby.index('Custom Gold'))
        self.assertLess(lobby.index('Beach to Cave — Fable 5.2'), lobby.index('Custom Gold'))

    def test_allowlisted_external_lobby_card_is_preserved_once(self):
        url = next(iter(builder.EXTERNAL_LOBBY_URLS))
        out = builder.build(self.root)
        lobby = (out / 'index.html').read_text(encoding='utf-8')
        self.assertEqual(lobby.count(f'href="{url}"'), 1)
        index = self.root / 'index.html'
        source = index.read_text(encoding='utf-8')
        article = next(item for item in re.findall(r'<article class="game-card".*?</article>', source, flags=re.S) if url in item)
        index.write_text(source.replace('</div><div id="empty-state"', article + '</div><div id="empty-state"'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Duplicate external lobby card'):
            builder.build(self.root)

    def test_title_fallback_and_invalid_entry(self):
        game = self.root / 'new-game'
        game.mkdir()
        (game / 'new-game.html').write_text('<title>A New Game</title>', encoding='utf-8')
        out = builder.build(self.root)
        lobby = (out / 'index.html').read_text(encoding='utf-8')
        self.assertIn('<h3>A New Game</h3>', lobby)
        self.assertIn('data-filter="arcade"', lobby)
        (game / 'game.json').write_text('{"entry":"../outside.html"}', encoding='utf-8')
        with self.assertRaises(ValueError): builder.build(self.root)
        (game / 'game.json').write_text(json.dumps({'entry': r'..\outside.html'}), encoding='utf-8')
        with self.assertRaises(ValueError): builder.build(self.root)

    def test_salt_aquarium_source_dirs_are_not_packaged(self):
        game = self.root / 'saltaquarium'
        (game / 'parts').mkdir(parents=True)
        (game / 'test').mkdir()
        (game / 'saltaquarium.html').write_text('<!doctype html><title>Reef Aquarium</title>', encoding='utf-8')
        (game / 'game.json').write_text(json.dumps({'title': 'Reef Aquarium', 'category': 'Creative'}), encoding='utf-8')
        (game / 'parts' / 'author.js').write_text('throw new Error()', encoding='utf-8')
        (game / 'test' / 'shot.js').write_text('throw new Error()', encoding='utf-8')
        out = builder.build(self.root)
        self.assertTrue((out / 'saltaquarium' / 'saltaquarium.html').exists())
        self.assertFalse((out / 'saltaquarium' / 'parts').exists())
        self.assertFalse((out / 'saltaquarium' / 'test').exists())

    def test_mytharium_authoring_dirs_are_not_packaged(self):
        game = self.root / 'mytharium'
        for name in ('parts', 'test', 'concepts', 'imagegen-jobs'):
            (game / name).mkdir(parents=True, exist_ok=True)
        (game / 'mytharium.html').write_text('<!doctype html><title>Mytharium</title>', encoding='utf-8')
        (game / 'game.json').write_text(json.dumps({'title': 'Mytharium', 'category': 'Creative'}), encoding='utf-8')
        (game / 'parts' / 'author.js').write_text('throw new Error()', encoding='utf-8')
        (game / 'test' / 'shot.js').write_text('throw new Error()', encoding='utf-8')
        (game / 'concepts' / 'target.png').write_bytes(b'not-a-runtime-image')
        (game / 'imagegen-jobs' / 'request.json').write_text('{}', encoding='utf-8')
        out = builder.build(self.root)
        self.assertTrue((out / 'mytharium' / 'mytharium.html').exists())
        for name in ('parts', 'test', 'concepts', 'imagegen-jobs'):
            self.assertFalse((out / 'mytharium' / name).exists())

    def test_felt_game_authoring_dirs_are_not_packaged(self):
        for game_name in ('mittenmountain', 'quilthill', 'alleyknights'):
            game = self.root / game_name
            (game / 'parts').mkdir(parents=True)
            (game / 'test').mkdir()
            (game / (game_name + '.html')).write_text('<!doctype html><title>Felt Game</title>', encoding='utf-8')
            (game / 'game.json').write_text(json.dumps({'title': 'Felt Game', 'category': 'Kids'}), encoding='utf-8')
            (game / 'parts' / 'author.js').write_text('throw new Error()', encoding='utf-8')
            (game / 'test' / 'shot.py').write_text('raise RuntimeError()', encoding='utf-8')
        out = builder.build(self.root)
        for game_name in ('mittenmountain', 'quilthill', 'alleyknights'):
            self.assertTrue((out / game_name / (game_name + '.html')).exists())
            self.assertFalse((out / game_name / 'parts').exists())
            self.assertFalse((out / game_name / 'test').exists())

if __name__ == '__main__': unittest.main()
