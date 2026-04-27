const redis = require('../config/redis');
const sql = require('../config/neon');

const RATE_LIMIT_WINDOW = 60 * 10; // 10 minutos

async function logVisit(country, language) {
  await sql`INSERT INTO visits (country, language) VALUES (${country || null}, ${language || null})`;
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM visits`;
  return count;
}

async function getCount() {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM visits`;
  return count;
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

async function getStats() {
  const [countResult, countries, languages] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM visits`,
    sql`SELECT country AS name, COUNT(*)::int AS count FROM visits WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 5`,
    sql`SELECT language AS name, COUNT(*)::int AS count FROM visits WHERE language IS NOT NULL GROUP BY language ORDER BY count DESC LIMIT 5`,
  ]);

  return {
    total: countResult[0].count,
    countries,
    languages,
  };
}

module.exports = { logVisit, getCount, checkRateLimit, getStats };
