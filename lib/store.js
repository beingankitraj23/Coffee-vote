// Storage layer. One interface, three backends:
//   redis  -> Upstash Redis over REST (used on Vercel; persistent)
//   file   -> .data/votes.json (local dev; persistent)
//   memory -> in-process object (Vercel without a DB; resets on cold start)
const fs = require('fs');
const path = require('path');
const seed = require('../data/coffee_rating_seed.json');

const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const kind = URL && TOKEN ? 'redis' : process.env.VERCEL ? 'memory' : 'file';

const initial = (c) => ({ votes: c.votes, sum: +(c.rating * c.votes).toFixed(2) });

/* ---------- Redis (Upstash REST pipeline, no dependencies) ---------- */
const HASH = 'coffee:stats';

async function redis(commands) {
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis request failed (${res.status})`);
  const out = await res.json();
  return out.map((o) => {
    if (o.error) throw new Error(o.error);
    return o.result;
  });
}

let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  const [exists] = await redis([['EXISTS', HASH]]);
  if (!exists) {
    // HSETNX never overwrites, so concurrent cold starts can't clobber live votes.
    const cmds = seed.flatMap((c) => {
      const s = initial(c);
      return [
        ['HSETNX', HASH, `v:${c.id}`, String(s.votes)],
        ['HSETNX', HASH, `s:${c.id}`, String(s.sum)],
      ];
    });
    await redis(cmds);
  }
  seeded = true;
}

const redisBackend = {
  async getAll() {
    await ensureSeeded();
    const [flat] = await redis([['HGETALL', HASH]]);
    const stats = {};
    for (let i = 0; i < flat.length; i += 2) {
      const [type, id] = flat[i].split(':');
      stats[id] = stats[id] || { votes: 0, sum: 0 };
      if (type === 'v') stats[id].votes = Number(flat[i + 1]);
      else stats[id].sum = Number(flat[i + 1]);
    }
    return stats;
  },
  async vote(id, stars) {
    await ensureSeeded();
    // Atomic server-side increments: safe under concurrent votes.
    await redis([
      ['HINCRBY', HASH, `v:${id}`, '1'],
      ['HINCRBYFLOAT', HASH, `s:${id}`, String(stars)],
    ]);
  },
};

/* ---------- File / memory ---------- */
const FILE = path.join(process.cwd(), '.data', 'votes.json');
let mem = null;

function load() {
  if (mem) return mem;
  if (kind === 'file') {
    try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { mem = null; }
  }
  if (!mem) {
    mem = {};
    seed.forEach((c) => { mem[c.id] = initial(c); });
  }
  return mem;
}

function persist() {
  if (kind !== 'file') return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(mem));
  } catch { /* read-only filesystem: stay in memory */ }
}

const localBackend = {
  async getAll() { return load(); },
  async vote(id, stars) {
    const s = load()[id];
    s.votes += 1;
    s.sum = +(s.sum + stars).toFixed(2);
    persist();
  },
};

const backend = kind === 'redis' ? redisBackend : localBackend;
module.exports = { kind, getAll: () => backend.getAll(), vote: (id, stars) => backend.vote(id, stars) };
