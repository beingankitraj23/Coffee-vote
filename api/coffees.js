const { snapshot } = require('../lib/coffee');

// GET /api/coffees -> every blend with live rating, vote count, rank
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await snapshot());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load coffees' });
  }
};
