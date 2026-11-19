const catalogue = globalThis.ellaCatalogue;
const engine = globalThis.ellaElo.createEngine(catalogue);
const storageKey = 'ella.elo.v1';
const byId = id => document.getElementById(id);
const categoryPicker = byId('category');
const choices = [...document.querySelectorAll('.choice')];
const labels = {all:'Øll', ...catalogue.categories};
const number = new Intl.NumberFormat('fo', {maximumFractionDigits:0});

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isSafeInteger(saved.count) && saved.count >= 0 &&
        saved.ratings && typeof saved.ratings === 'object' && Array.isArray(saved.recent)) return saved;
  } catch {
    // Start a fresh session if browser storage is unavailable.
  }
  return globalThis.ellaElo.emptyState();
}

let state = readState();
let pair = null;
let highlightCategory = null;

for (const [id, label] of Object.entries(labels)) {
  categoryPicker.add(new Option(label, id));
}

function showPair() {
  pair = engine.nextPair(pair);
  byId('pair').hidden = byId('skip').hidden = !pair;
  byId('highlight').hidden = true;
  byId('vote-count').textContent = number.format(state.count) + (state.count === 1 ? ' atkvøða' : ' atkvøður');
  if (!pair) {
    byId('scopes').textContent = 'Minst tvey valevni skulu vera í spælinum.';
    return;
  }
  byId('scopes').textContent = 'Elo broytist í hesum bólkum · ' + engine.scopes(...pair).map(id => labels[id]).join(' · ');
  choices.forEach((button, index) => {
    const item = pair[index];
    button.querySelector('.choice-name').textContent = item.name;
    button.querySelector('.choice-tags').textContent = item.categories.map(id => labels[id]).join(' · ');
    button.setAttribute('aria-label', 'Vel ' + item.name);
  });
}

function showHighlight() {
  const highlight = engine.highlight(state);
  if (!highlight) return;
  highlightCategory = highlight.category;
  const label = labels[highlight.category];
  byId('highlight-title').textContent = highlight.gain
    ? 'Á veg upp · ' + label + ' · +' + number.format(highlight.gain) + ' Elo'
    : 'Á odda · ' + label;
  byId('highlight-name').textContent = highlight.item.name;
  byId('highlight').hidden = false;
}

function castVote(index) {
  if (!pair) return;
  const winner = pair[index];
  const loser = pair[1 - index];
  state = engine.vote(state, winner.id, loser.id);
  let status = 'Tú valdi ' + winner.name + '.';
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    status += ' Atkvøðan verður bert goymd, meðan síðan er opin.';
  }
  showPair();
  byId('status').textContent = status;
  if (state.count % 5 === 0) showHighlight();
}

function showStandings() {
  const rankings = byId('rankings');
  const fragment = document.createDocumentFragment();
  const rows = engine.standings(state, categoryPicker.value);
  rows.forEach(({item, elo, played}, index) => {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = item.name;
    row.insertCell().textContent = number.format(index + 1);
    row.append(name);
    for (const value of [elo, played]) {
      const cell = row.insertCell();
      cell.className = 'number';
      cell.textContent = number.format(value);
    }
    fragment.append(row);
  });
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = 'Einki valevni í hesum bólki.';
    fragment.append(row);
  }
  rankings.replaceChildren(fragment);
}

function showView() {
  const standings = location.hash === '#topplistar';
  byId('game').hidden = standings;
  byId('standings').hidden = !standings;
  byId('game-link').setAttribute('aria-current', standings ? 'false' : 'page');
  byId('standings-link').setAttribute('aria-current', standings ? 'page' : 'false');
  if (standings) showStandings();
}

choices.forEach((button, index) => button.addEventListener('click', () => castVote(index)));
byId('skip').addEventListener('click', () => {
  showPair();
  byId('status').textContent = 'Nýtt par.';
});
byId('highlight-link').addEventListener('click', () => {
  categoryPicker.value = highlightCategory;
  location.hash = 'topplistar';
});
categoryPicker.addEventListener('change', showStandings);
window.addEventListener('hashchange', showView);
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  state = readState();
  byId('vote-count').textContent = number.format(state.count) + (state.count === 1 ? ' atkvøða' : ' atkvøður');
  byId('highlight').hidden = true;
  if (!byId('standings').hidden) showStandings();
});

showPair();
showView();
