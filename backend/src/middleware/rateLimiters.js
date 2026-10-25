const rateLimit = require('express-rate-limit');
const environment = require('../config/environment');

function createLimiter(windowMinutes, maxRequests, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => environment.nodeEnv === 'test',
    handler: (req, res) => res.status(429).json({ success: false, message, code: 'TOO_MANY_REQUESTS' }),
  });
}

module.exports = {
  authLimiter: createLimiter(15, 20, 'Too many login attempts. Please try again later.'),
  paymentLimiter: createLimiter(15, 60, 'Too many payment requests. Please slow down.'),
  tryOnLimiter: createLimiter(60, 30, 'Too many try-on requests. Please try again later.'),
};
