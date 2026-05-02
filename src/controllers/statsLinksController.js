const { getLinkStats } = require('../models/visitModel');
const { ALLOWED_ORIGINS } = require('../config/cors');
const Sentry = require('../config/sentry');

module.exports = async function handler(req, res) {
  const origin = req.headers['origin'];
  const referer = req.headers['referer'] || '';

  const originAllowed = origin && origin !== 'null' && ALLOWED_ORIGINS.includes(origin);
  const refererAllowed = ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (refererAllowed) {
    const matchedOrigin = ALLOWED_ORIGINS.find((o) => referer.startsWith(o));
    res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (origin && origin !== 'null' && !originAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const stats = await getLinkStats();
    return res.status(200).json(stats);
  } catch (err) {
    Sentry.captureException(err);
    await Sentry.flush(2000);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
