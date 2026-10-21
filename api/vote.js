const { snapshot, exists, store } = require('../lib/coffee');

// POST /api/vote  { "id": 12, "stars": 5 }
// Increments the vote counter in the database and returns fresh standings.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { id, stars } = req.body || {};
    const coffeeId = Number(id);
    const rating = Number(stars);

    if (!Number.isInteger(coffeeId) || !exists(coffeeId)) {
      return res.status(400).json({ error: 'Unknown coffee id' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'stars must be a whole number from 1 to 5' });
    }

    await store.vote(coffeeId, rating);
    const data = await snapshot();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ...data, voted: data.coffees.find((c) => c.id === coffeeId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save your vote' });
  }
};
