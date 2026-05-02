const { logLinkVisit, checkLinkRateLimit } = require('../models/visitModel');
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (origin && origin !== 'null' && !originAllowed) {
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
    const { limited, retryAfter } = await checkLinkRateLimit(ip);

    if (limited) {
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }

    const count = await logLinkVisit(country, language);
    return res.status(200).json({ count });
  } catch (err) {
    Sentry.captureException(err);
    await Sentry.flush(2000);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
