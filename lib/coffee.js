const seed = require('../data/coffee_rating_seed.json');
const store = require('./store');

// Leaderboard uses a weighted score so a roast with 3 votes can't outrank
// one with 150 on a lucky 5.0:  (v / (v + M)) * R + (M / (v + M)) * C
// R = the roast's average, C = the average across all roasts, M = confidence votes.
const M = 50;

function decorate(stats) {
  const rows = seed.map((c) => ({ c, s: stats[c.id] || { votes: c.votes, sum: c.rating * c.votes } }));
  const totalVotes = rows.reduce((n, r) => n + r.s.votes, 0);
  const totalSum = rows.reduce((n, r) => n + r.s.sum, 0);
  const mean = totalSum / totalVotes;

  const coffees = rows.map(({ c, s }) => {
    const rating = s.votes ? s.sum / s.votes : 0;
    const score = (s.votes / (s.votes + M)) * rating + (M / (s.votes + M)) * mean;
    return {
      id: c.id, name: c.name, origin: c.origin, roast: c.roast,
      votes: s.votes, rating: +rating.toFixed(2), score: +score.toFixed(3),
    };
  });

  coffees.sort((a, b) => b.score - a.score || b.votes - a.votes);
  coffees.forEach((c, i) => { c.rank = i + 1; });
  return { coffees, meta: { mean: +mean.toFixed(2), m: M, totalVotes } };
}

async function snapshot() {
  return { ...decorate(await store.getAll()), storage: store.kind };
}

const exists = (id) => seed.some((c) => c.id === id);

module.exports = { snapshot, exists, store };
