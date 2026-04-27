const { logVisit, checkRateLimit } = require('../models/visitModel');
const { ALLOWED_ORIGINS } = require('../config/cors');
const Sentry = require('../config/sentry');

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

  const country = req.headers['x-vercel-ip-country'] || null;

  const acceptLanguage = req.headers['accept-language'] || '';
  const language = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase() || null;

  try {
    const { limited, retryAfter } = await checkRateLimit(ip);

    if (limited) {
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }

    const count = await logVisit(country, language);
    return res.status(200).json({ count });
  } catch (err) {
    Sentry.captureException(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
