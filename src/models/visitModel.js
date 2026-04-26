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

async function incrementCountry(country) {
  if (!country || country === 'XX') return;
  await redis.hincrby('portfolio:countries', country, 1);
}

async function incrementLanguage(language) {
  if (!language) return;
  await redis.hincrby('portfolio:languages', language, 1);
}

async function getStats() {
  const [count, countries, languages] = await Promise.all([
    redis.get('portfolio:visits'),
    redis.hgetall('portfolio:countries'),
    redis.hgetall('portfolio:languages'),
  ]);

  const sortTop = (obj, limit = 5) =>
    Object.entries(obj || {})
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, limit)
      .map(([key, val]) => ({ name: key, count: Number(val) }));

  return {
    total: Number(count) || 0,
    countries: sortTop(countries),
    languages: sortTop(languages),
  };
}

module.exports = { getCount, incrementCount, checkRateLimit, incrementCountry, incrementLanguage, getStats };
