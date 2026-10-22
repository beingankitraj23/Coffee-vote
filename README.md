# Roast Ratings: live coffee voting

Item grid, POST vote endpoint backed by a database, live UI updates (no page reload), and a top-rated leaderboard.

## Structure
```
api/coffees.js       GET  /api/coffees      all roasts with live rating, votes, rank
api/vote.js          POST /api/vote         { id, stars } -> increments counters, returns new standings
api/leaderboard.js   GET  /api/leaderboard  ?limit=5
lib/store.js         storage: Upstash Redis (Vercel) / JSON file (local) / memory fallback
lib/coffee.js        weighted-score ranking
data/                coffee_rating_seed.json (initial ratings and votes)
public/index.html    the whole frontend
server.js            local dev server only
```

## Run locally
```
npm install
npm run dev        # http://localhost:3000
```
Votes persist to `.data/votes.json`.

## Deploy to Vercel
1. Push this folder to GitHub and import it at vercel.com/new (framework preset: Other).
2. In the project: Storage (or Marketplace) -> add Upstash Redis -> connect it to the project. This injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Redeploy. The first request seeds Redis from `coffee_rating_seed.json`; every vote after that is an atomic `HINCRBY` / `HINCRBYFLOAT`.

Without step 2 the app still runs, but votes live in memory and reset on cold starts (the UI shows a warning).

## Notes
- Each roast stores `votes` and `sum of stars`; average = sum / votes.
- Leaderboard score = `(v/(v+50))*avg + (50/(v+50))*overallMean`, so roasts with very few votes can't top the board.
- "One vote per roast" is enforced in the browser (localStorage) only. For real protection add auth or IP rate limiting.

Working link - https://coffee-vote-iota.vercel.app/
