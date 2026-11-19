# Ella

A Faroese head-to-head voting demo. Open `index.html` with its three JavaScript files in the same directory. The demo stores votes and Elo ratings in browser local storage.

## Importing a catalogue

Replace the data in `catalogue.js`. Register each category once, then assign its ID to any number of items.

```js
globalThis.ellaCatalogue = {
  categories: {
    fish: 'Fiskar',
    animal: 'Dýr',
    sea: 'Í sjónum',
  },
  items: [
    {id: 'seidur', name: 'Seiður', categories: ['fish', 'animal', 'sea']},
    {id: 'toskur', name: 'Toskur', categories: ['fish', 'animal', 'sea']},
  ],
};
```

Use unique, stable item IDs and category IDs consisting of lowercase ASCII letters, digits, and hyphens, beginning with a letter. The reserved `all` category is generated automatically. Deduplicate scraped records before assigning IDs. Keep names separate from IDs so changes to names preserve voting history. Optional starting ratings belong in `initialElo`, for example `initialElo: {all: 1600, fish: 1550}`. Missing ratings start at 1500.

## Rating rules

A vote updates both items' overall ratings and the ratings for every category the items share. Seiður vs Toskur updates overall, fish, animal, and sea. Seiður vs Lundi updates overall and animal. Seiður vs Slættaratindur updates overall only. Each rating uses its own expected score with K = 32. Elo is stored at full precision and rounded for display.

The game mixes within-category and open pairings. Every fifth vote can show a category leader or a rising item. Rising items are ranked by net Elo gained in that category over the last ten votes. Skipping a pair leaves all ratings and vote counts unchanged.

`elo.js` contains the scoring and pairing logic. `app.js` handles the interface and persistence. Demo votes stay in the current browser. A public leaderboard shared by visitors would need a server to record votes and apply Elo updates in one transaction.
