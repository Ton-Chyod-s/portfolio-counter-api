const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT_WINDOW = 60 * 10;
const VISIT_SECRET = process.env.VISIT_SECRET;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Autenticação por token
  if (VISIT_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${VISIT_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
