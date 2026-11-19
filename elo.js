(() => {
  const BASE = 1500;
  const K = 32;
  const ALL = 'all';

  function createEngine(catalogue) {
    const {categories, items} = catalogue;
    const byId = new Map();
    const groups = new Map([[ALL, items]]);
    for (const category of Object.keys(categories)) {
      if (category === ALL || !/^[a-z][a-z0-9-]*$/.test(category)) {
        throw new Error('Invalid category ID: ' + category);
      }
      groups.set(category, []);
    }
    for (const item of items) {
      if (!/^[a-z][a-z0-9-]*$/.test(item.id) || byId.has(item.id) ||
          typeof item.name !== 'string' || !item.name.trim() ||
          !Array.isArray(item.categories) || new Set(item.categories).size !== item.categories.length) {
        throw new Error('Invalid or duplicate item: ' + item.id);
      }
      byId.set(item.id, item);
      for (const category of item.categories) {
        if (category === ALL || !groups.has(category)) throw new Error('Unknown category: ' + category);
        groups.get(category).push(item);
      }
    }

    function scopes(a, b) {
      return [ALL, ...a.categories.filter(category => b.categories.includes(category))];
    }

    function rating(state, item, category) {
      const entry = state.ratings[item.id]?.[category];
      const seed = item.initialElo?.[category];
      return {
        elo: Number.isFinite(entry?.elo) ? entry.elo : Number.isFinite(seed) ? seed : BASE,
        played: Number.isSafeInteger(entry?.played) && entry.played > 0 ? entry.played : 0,
      };
    }

    function vote(state, winnerId, loserId) {
      const winner = byId.get(winnerId);
      const loser = byId.get(loserId);
      if (!winner || !loser || winner === loser) throw new Error('Invalid matchup');
      const ratings = {...state.ratings, [winnerId]: {...state.ratings[winnerId]}, [loserId]: {...state.ratings[loserId]}};
      const changes = {};
      for (const category of scopes(winner, loser)) {
        const win = rating(state, winner, category);
        const loss = rating(state, loser, category);
        const expected = 1 / (1 + 10 ** ((loss.elo - win.elo) / 400));
        const delta = K * (1 - expected);
        ratings[winnerId][category] = {elo: win.elo + delta, played: win.played + 1};
        ratings[loserId][category] = {elo: loss.elo - delta, played: loss.played + 1};
        changes[category] = delta;
      }
      return {
        ratings,
        count: state.count + 1,
        recent: [...state.recent.slice(-9), {winnerId, loserId, changes}],
      };
    }

    function standings(state, category) {
      return (groups.get(category) ?? []).map(item => ({item, ...rating(state, item, category)}))
        .sort((a, b) => b.elo - a.elo || b.played - a.played || a.item.name.localeCompare(b.item.name, 'fo'));
    }

    const playableGroups = [...groups.entries()].filter(([id, members]) => id !== ALL && members.length >= 2);
    function nextPair(previous, random = Math.random) {
      if (items.length < 2) return null;
      const pickIndex = length => Math.floor(random() * length);
      if (items.length === 2) return random() < .5 ? [...items] : [items[1], items[0]];
      // Mix within-category comparisons with open comparisons. Avoid immediate repeats.
      for (let attempt = 0; attempt < 8; attempt++) {
        const pool = playableGroups.length && random() < .65
          ? playableGroups[pickIndex(playableGroups.length)][1] : items;
        const left = pickIndex(pool.length);
        const right = pickIndex(pool.length - 1);
        const pair = [pool[left], pool[right >= left ? right + 1 : right]];
        if (!previous || !pair.every(item => previous.includes(item))) return pair;
      }
      return [previous[0], items.find(item => !previous.includes(item))];
    }

    function highlight(state) {
      const playedCategories = [...groups.keys()].filter(category =>
        category !== ALL && groups.get(category).some(item => rating(state, item, category).played)
      );
      if (!playedCategories.length) return null;
      const turn = Math.floor(state.count / 5) - 1;
      const category = playedCategories[Math.floor(turn / 2) % playedCategories.length];
      const ranked = standings(state, category).filter(row => row.played);
      if (turn % 2 === 1) {
        const gains = new Map();
        for (const {winnerId, loserId, changes} of state.recent) {
          const delta = Object.hasOwn(changes, category) ? changes[category] : 0;
          gains.set(winnerId, (gains.get(winnerId) ?? 0) + delta);
          gains.set(loserId, (gains.get(loserId) ?? 0) - delta);
        }
        const rising = ranked.reduce((best, row) =>
          (gains.get(row.item.id) ?? 0) > (gains.get(best.item.id) ?? 0) ? row : best
        );
        const gain = gains.get(rising.item.id) ?? 0;
        if (gain >= 1) return {...rising, category, gain};
      }
      return {...ranked[0], category};
    }

    return {scopes, vote, standings, nextPair, highlight};
  }

  globalThis.ellaElo = {createEngine, emptyState: () => ({ratings:{}, count:0, recent:[]})};
})();
