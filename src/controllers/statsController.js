const { getStats } = require('../models/visitModel');
const Sentry = require('../config/sentry');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stats = await getStats();
    return res.status(200).json(stats);
  } catch (err) {
    Sentry.captureException(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
