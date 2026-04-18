const redis = require('../config/redis');

const RATE_LIMIT_WINDOW = 60 * 10; // 10 minutos

async function getCount() {
  return (await redis.get('portfolio:visits')) || 0;
}

async function incrementCount() {
  return await redis.incr('portfolio:visits');
}

async function checkRateLimit(ip) {
  const key = `ratelimit:visit:${ip}`;
  const isNew = await redis.set(key, 1, { ex: RATE_LIMIT_WINDOW, nx: true });

  if (isNew === null) {
    const retryAfter = await redis.ttl(key);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

module.exports = { getCount, incrementCount, checkRateLimit };
