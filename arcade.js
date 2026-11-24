(() => {
  const cards = [...document.querySelectorAll('#game-grid .game-card')];
  const filters = [...document.querySelectorAll('.filter')];
  const search = document.querySelector('#search');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  const grid = document.querySelector('#game-grid');
  const labels = Object.fromEntries(filters.map(b => [b.dataset.filter, b.childNodes[0].textContent.trim()]));
  let category = 'all';
  let recent = '';
  try { recent = localStorage.getItem('grapegames-last-played') || ''; } catch (_) { /* Storage is optional. */ }

  // Everything a player might type: title, category, tags and picture description.
  const text = card => [card.dataset.search, card.dataset.category, labels[card.dataset.category] || '',
    card.querySelector('h3')?.textContent || '', card.querySelector('img')?.alt || ''].join(' ').toLowerCase();
  const haystack = new Map(cards.map(card => [card, text(card)]));
  const SYN = { kid: 'kids', children: 'kids', child: 'kids', toddler: 'kids', learning: 'kids', learn: 'kids', education: 'kids', shooter: 'action', shooting: 'action', rts: 'strategy', tower: 'strategy', farm: 'farm', math: 'brain', maths: 'brain', mental: 'brain', logic: 'brain', teaser: 'brain', brainteaser: 'brain', thinking: 'brain' };
  const matches = (card, query) => query.split(/\s+/).filter(Boolean).every(word => {
    const h = haystack.get(card); return h.includes(word) || (SYN[word] && h.includes(SYN[word]));
  });

  // On phones, the unfiltered library is a set of sideways-scrolling shelves, one per category.
  const shelves = document.createElement('div'); shelves.className = 'shelves'; shelves.id = 'shelves';
  grid.before(shelves);
  for (const b of filters) {
    const slug = b.dataset.filter; if (slug === 'all') continue;
    const mine = cards.filter(c => c.dataset.category === slug); if (!mine.length) continue;
    const sec = document.createElement('section'); sec.className = 'shelf';
    sec.innerHTML = `<div class="shelf-head"><h3>${labels[slug]} <span>${mine.length}</span></h3><button type="button" class="see-all" data-filter="${slug}">See all ↗</button></div><div class="shelf-row"></div>`;
    const row = sec.querySelector('.shelf-row'); mine.forEach(c => row.append(c.cloneNode(true)));
    sec.querySelector('.see-all').addEventListener('click', () => { category = slug; update(); document.querySelector('.tools').scrollIntoView({ block: 'start' }); });
    shelves.append(sec);
  }

  function update() {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const visible = (category === 'all' || card.dataset.category === category) && matches(card, query);
      card.hidden = !visible;
      if (visible) shown++;
    });
    filters.forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.body.classList.toggle('browsing', category === 'all' && !query);
    count.textContent = `SHOWING ${shown === cards.length ? 'ALL ' : ''}${String(shown).padStart(2, '0')} ${shown === 1 ? 'GAME' : 'GAMES'}${category !== 'all' ? ' · ' + (labels[category] || '').toUpperCase() : ''}${query ? ` · “${query.toUpperCase()}”` : ''}`;
    empty.hidden = shown !== 0;
  }

  function playRandom() {
    const visible = cards.filter(card => !card.hidden);
    const withoutRecent = visible.filter(card => card.dataset.id !== recent);
    const pool = withoutRecent.length ? withoutRecent : (visible.length ? visible : cards);
    const link = pool[Math.floor(Math.random() * pool.length)].querySelector('.play-link');
    if (link) link.click();
  }

  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; update(); }));
  search.addEventListener('input', update);
  document.querySelector('#reset-filters').addEventListener('click', () => { category = 'all'; search.value = ''; update(); search.focus(); });
  document.querySelectorAll('.play-link').forEach(link => link.addEventListener('click', () => {
    try { localStorage.setItem('grapegames-last-played', link.dataset.game); } catch (_) { /* Playing does not depend on storage. */ }
  }));
  document.querySelector('#random-game').addEventListener('click', playRandom);
  document.querySelector('#hero-random').addEventListener('click', playRandom);
  if (recent) {
    document.querySelectorAll(`.game-card[data-id="${CSS.escape(recent)}"] .category`).forEach(label => label.append(document.createTextNode(' · LAST PLAYED')));
  }
  update();
})();
