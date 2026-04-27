const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ton-chyod-s.github.io')
  .split(',')
  .map((s) => s.trim());

module.exports = { ALLOWED_ORIGINS };
