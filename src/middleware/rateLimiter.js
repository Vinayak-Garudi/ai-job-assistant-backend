const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for AI-powered endpoints
 * Limits requests to prevent excessive API usage and costs
 */
const aiEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: {
    success: false,
    message:
      'Too many AI analysis requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests in count (optional)
  skipSuccessfulRequests: false,
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        'Too many AI analysis requests from this IP, please try again after 15 minutes.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000), // seconds until reset
    });
  },
});

/**
 * Stricter rate limiter for expensive operations
 */
const strictAiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: {
    success: false,
    message: 'Hourly limit for AI analysis reached, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Hourly limit for AI analysis reached, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  aiEndpointLimiter,
  strictAiLimiter,
  generalLimiter,
};
