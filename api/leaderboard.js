const { snapshot } = require('../lib/coffee');

// GET /api/leaderboard?limit=5 -> top-rated blends
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20);
    const { coffees, meta, storage } = await snapshot();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ leaderboard: coffees.slice(0, limit), meta, storage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load leaderboard' });
  }
};
