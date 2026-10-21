// Local dev server. On Vercel, /api/*.js run as serverless functions and
// public/ is served statically, so this file is not used there.
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/coffees', require('./api/coffees'));
app.get('/api/leaderboard', require('./api/leaderboard'));
app.post('/api/vote', require('./api/vote'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Coffee vote running at http://localhost:${port}`));
