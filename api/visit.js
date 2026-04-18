const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT_WINDOW = 60 * 10;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ton-chyod-s.github.io')
  .split(',')
  .map((s) => s.trim());

module.exports = async function handler(req, res) {
  const origin = req.headers['origin'];

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const rateLimitKey = `ratelimit:visit:${ip}`;

  try {
    const isNew = await redis.set(rateLimitKey, 1, { ex: RATE_LIMIT_WINDOW, nx: true });

    if (isNew === null) {
      const ttl = await redis.ttl(rateLimitKey);
      return res.status(429).json({ error: 'Too many requests', retryAfter: ttl });
    }

    const count = await redis.incr('portfolio:visits');
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
